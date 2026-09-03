import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db import connection, transaction
from django.utils.html import escape

from .selectors import (
    RECIPIENT_ALL_USERS,
    RECIPIENT_FARMER,
    RECIPIENT_LABELS,
    RECIPIENT_MILLER,
    RECIPIENT_RETAILER,
    RECIPIENT_SPECIFIC,
    RECIPIENT_WAREHOUSE,
    VALID_RECIPIENT_TYPES,
    get_admin_email_sender,
    get_broadcast_email_recipients,
    get_specific_email_recipient,
    get_user_by_email,
)


# ============================================================
# CONSTANTS
# ============================================================

MAX_SUBJECT_LENGTH = 255
MAX_MESSAGE_LENGTH = 1000


# ============================================================
# TEXT HELPERS
# ============================================================

def _clean_text(
    value,
    field_name,
    max_length=None,
):
    """
    Clean and validate required text.
    """

    cleaned = str(
        value or ""
    ).strip()

    if not cleaned:
        raise ValueError(
            f"{field_name} is required."
        )

    if (
        max_length is not None
        and len(cleaned) > max_length
    ):
        raise ValueError(
            f"{field_name} must not exceed "
            f"{max_length} characters."
        )

    return cleaned


def _clean_optional_text(value):
    """
    Clean optional text without requiring a value.
    """

    return str(
        value or ""
    ).strip()


def _normalize_email(value):
    """
    Normalize an email string.
    """

    return str(
        value or ""
    ).strip().lower()


# ============================================================
# RECIPIENT TYPE
# ============================================================

def _validate_recipient_type(
    recipient_type,
):
    """
    Validate frontend recipient type.
    """

    normalized = str(
        recipient_type or ""
    ).strip().lower()

    if normalized not in VALID_RECIPIENT_TYPES:
        raise ValueError(
            "Invalid email recipient type."
        )

    return normalized


# ============================================================
# ADMIN SENDER
# ============================================================

def _get_sender_admin(
    admin_id,
):
    """
    Validate the Account Admin responsible
    for sending the email.
    """

    if not admin_id:
        raise ValueError(
            "Authenticated administrator ID is required."
        )

    admin = get_admin_email_sender(
        admin_id
    )

    if not admin:
        raise ValueError(
            "Authenticated administrator account was not found."
        )

    return admin


# ============================================================
# SPECIFIC RECIPIENT
# ============================================================

def _resolve_specific_recipient(
    recipient_user_id=None,
    recipient_email=None,
):
    """
    Resolve a direct GrainRise user.

    Priority:
        1. user_id
        2. email fallback

    The email stored in the database is used as
    the actual destination whenever possible.
    """

    user = None

    if recipient_user_id:
        user = (
            get_specific_email_recipient(
                recipient_user_id
            )
        )

    if (
        not user
        and recipient_email
    ):
        user = (
            get_user_by_email(
                recipient_email
            )
        )

    if not user:
        raise ValueError(
            "The selected email recipient was not found."
        )

    email = _normalize_email(
        user.get(
            "email"
        )
    )

    if not email:
        raise ValueError(
            "The selected user does not have a valid email address."
        )

    full_name = str(
        user.get(
            "full_name"
        )
        or ""
    ).strip()

    if not full_name:
        full_name = email

    return {
        "user_id":
            user.get(
                "user_id"
            ),

        "name":
            full_name,

        "email":
            email,

        "role":
            user.get(
                "user_role"
            ),

        "status":
            user.get(
                "status"
            ),
    }


# ============================================================
# BROADCAST RECIPIENTS
# ============================================================

def _resolve_broadcast_recipients(
    recipient_type,
):
    """
    Resolve active GrainRise users for group email.
    """

    rows = (
        get_broadcast_email_recipients(
            recipient_type
        )
    )

    recipients = []

    seen_emails = set()

    for row in rows:
        email = _normalize_email(
            row.get(
                "email"
            )
        )

        if not email:
            continue

        if email in seen_emails:
            continue

        seen_emails.add(
            email
        )

        recipients.append(
            {
                "user_id":
                    row.get(
                        "user_id"
                    ),

                "name":
                    str(
                        row.get(
                            "full_name"
                        )
                        or email
                    ).strip(),

                "email":
                    email,

                "role":
                    row.get(
                        "user_role"
                    ),

                "status":
                    row.get(
                        "status"
                    ),
            }
        )

    if not recipients:
        raise ValueError(
            "There are no eligible users for the selected recipient group."
        )

    return recipients


# ============================================================
# EMAIL BODY
# ============================================================

def _build_plain_message(
    message_plain,
):
    """
    Plain-text email body.
    """

    return message_plain


def _build_html_message(
    message_html,
    message_plain,
):
    """
    Use RichTextEditor HTML when available.

    If HTML is unavailable, generate safe HTML
    from the plain-text content.
    """

    cleaned_html = str(
        message_html or ""
    ).strip()

    if cleaned_html:
        content = cleaned_html

    else:
        escaped_plain = escape(
            message_plain
        ).replace(
            "\n",
            "<br>"
        )

        content = (
            f"<p>{escaped_plain}</p>"
        )

    return f"""
    <div
        style="
            font-family: Arial, sans-serif;
            color: #1f2937;
            line-height: 1.6;
            max-width: 680px;
            margin: 0 auto;
            padding: 24px;
        "
    >
        <div
            style="
                margin-bottom: 24px;
            "
        >
            <h2
                style="
                    margin: 0;
                    color: #08511f;
                "
            >
                GrainRise
            </h2>

            <p
                style="
                    margin: 4px 0 0 0;
                    color: #6b7280;
                    font-size: 13px;
                "
            >
                Official GrainRise Communication
            </p>
        </div>

        <div>
            {content}
        </div>

        <div
            style="
                margin-top: 32px;
                padding-top: 16px;
                border-top: 1px solid #e5e7eb;
                color: #9ca3af;
                font-size: 12px;
            "
        >
            This message was sent through GrainRise.
        </div>
    </div>
    """


# ============================================================
# SEND EMAILS
# ============================================================

def _send_to_recipients(
    subject,
    message_plain,
    message_html,
    recipients,
):
    """
    Send one email per recipient using one SMTP connection.

    Important:
    Individual messages prevent recipients from seeing
    other users' email addresses.

    Returns:
        successful recipients
        failed recipients
    """

    if not recipients:
        raise ValueError(
            "No email recipients were provided."
        )

    from_email = str(
        getattr(
            settings,
            "DEFAULT_FROM_EMAIL",
            ""
        )
        or ""
    ).strip()

    if not from_email:
        from_email = str(
            getattr(
                settings,
                "EMAIL_HOST_USER",
                ""
            )
            or ""
        ).strip()

    if not from_email:
        raise RuntimeError(
            "GrainRise email sender is not configured."
        )

    plain_body = (
        _build_plain_message(
            message_plain
        )
    )

    html_body = (
        _build_html_message(
            message_html,
            message_plain,
        )
    )

    successful = []

    failed = []


    try:
        email_connection = (
            get_connection(
                fail_silently=False
            )
        )

        email_connection.open()

        try:
            for recipient in recipients:
                email = recipient.get(
                    "email"
                )

                try:
                    message = (
                        EmailMultiAlternatives(
                            subject=
                                subject,

                            body=
                                plain_body,

                            from_email=
                                from_email,

                            to=[
                                email,
                            ],

                            connection=
                                email_connection,
                        )
                    )

                    message.attach_alternative(
                        html_body,
                        "text/html",
                    )

                    sent_count = (
                        message.send(
                            fail_silently=False
                        )
                    )

                    if sent_count > 0:
                        successful.append(
                            recipient
                        )

                    else:
                        failed.append(
                            {
                                **recipient,
                                "error":
                                    "Email was not accepted for delivery.",
                            }
                        )

                except Exception as exc:
                    failed.append(
                        {
                            **recipient,
                            "error":
                                str(exc),
                        }
                    )

        finally:
            email_connection.close()

    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Gmail authentication failed. Check the configured "
            "EMAIL_HOST_USER and Google App Password."
        ) from exc

    except smtplib.SMTPException as exc:
        raise RuntimeError(
            f"Gmail could not send the email: {exc}"
        ) from exc

    except OSError as exc:
        raise RuntimeError(
            "Unable to connect to the configured email server."
        ) from exc


    if not successful:
        first_error = (
            failed[0].get(
                "error"
            )
            if failed
            else None
        )

        if first_error:
            raise RuntimeError(
                "The email could not be delivered to any recipient. "
                f"{first_error}"
            )

        raise RuntimeError(
            "The email could not be delivered to any recipient."
        )


    return {
        "successful":
            successful,

        "failed":
            failed,

        "successful_count":
            len(
                successful
            ),

        "failed_count":
            len(
                failed
            ),
    }


# ============================================================
# SAVE SENT HISTORY
# ============================================================

def _save_sent_email_history(
    *,
    recipient_type,
    recipient_label,
    recipient_user_id,
    recipient_email,
    recipient_count,
    subject,
    message_html,
    message_plain,
    sent_by_admin_id,
):
    """
    Persist one successfully sent email event.

    Group emails generate one history record with
    recipient_count representing successfully delivered
    individual messages.

    Specific-user emails generate one history record.
    """

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO email_sent_history
                (
                    recipient_type,
                    recipient_label,
                    recipient_user_id,
                    recipient_email,
                    recipient_count,
                    subject,
                    message_html,
                    message_plain,
                    sent_by_admin_id
                )

                VALUES
                (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    %s
                )

                RETURNING
                    email_history_id,
                    recipient_type,
                    recipient_label,
                    recipient_user_id,
                    recipient_email,
                    recipient_count,
                    subject,
                    message_plain,
                    sent_by_admin_id,
                    sent_at
                """,
                [
                    recipient_type,
                    recipient_label,
                    recipient_user_id,
                    recipient_email,
                    recipient_count,
                    subject,
                    message_html,
                    message_plain,
                    sent_by_admin_id,
                ],
            )

            row = cursor.fetchone()

    if not row:
        raise RuntimeError(
            "The email was sent, but its Sent History record "
            "could not be created."
        )

    return {
        "email_history_id":
            row[0],

        "recipient_type":
            row[1],

        "recipient_label":
            row[2],

        "recipient_user_id":
            row[3],

        "recipient_email":
            row[4],

        "recipient_count":
            row[5],

        "subject":
            row[6],

        "message_plain":
            row[7],

        "sent_by_admin_id":
            row[8],

        "sent_at":
            row[9],
    }


# ============================================================
# SEND ACCOUNT ADMIN EMAIL
# ============================================================

def send_account_admin_email(
    *,
    admin_id,
    recipient_type,
    subject,
    message_plain,
    message_html="",
    recipient_user_id=None,
    recipient_email=None,
    recipient_name=None,
):
    """
    Complete Email Users send flow.

    Steps:
        1. Validate authenticated admin.
        2. Validate email content.
        3. Resolve recipient(s).
        4. Send through configured GrainRise Gmail.
        5. Save successful send to PostgreSQL.
        6. Return delivery result.

    A Sent History record is never created when
    zero recipients receive the email.
    """

    admin = (
        _get_sender_admin(
            admin_id
        )
    )

    normalized_type = (
        _validate_recipient_type(
            recipient_type
        )
    )

    cleaned_subject = (
        _clean_text(
            subject,
            "Subject",
            MAX_SUBJECT_LENGTH,
        )
    )

    cleaned_plain = (
        _clean_text(
            message_plain,
            "Message",
            MAX_MESSAGE_LENGTH,
        )
    )

    cleaned_html = (
        _clean_optional_text(
            message_html
        )
    )


    # ========================================================
    # SPECIFIC USER
    # ========================================================

    if (
        normalized_type ==
        RECIPIENT_SPECIFIC
    ):
        recipient = (
            _resolve_specific_recipient(
                recipient_user_id=
                    recipient_user_id,

                recipient_email=
                    recipient_email,
            )
        )

        recipients = [
            recipient,
        ]

        recipient_label = str(
            recipient.get(
                "name"
            )
            or recipient_name
            or recipient.get(
                "email"
            )
            or "Specific User"
        ).strip()

        history_user_id = (
            recipient.get(
                "user_id"
            )
        )

        history_email = (
            recipient.get(
                "email"
            )
        )


    # ========================================================
    # BROADCAST GROUP
    # ========================================================

    else:
        recipients = (
            _resolve_broadcast_recipients(
                normalized_type
            )
        )

        recipient_label = (
            RECIPIENT_LABELS.get(
                normalized_type,
                "Users",
            )
        )

        history_user_id = None
        history_email = None


    # ========================================================
    # SEND
    # ========================================================

    delivery = (
        _send_to_recipients(
            subject=
                cleaned_subject,

            message_plain=
                cleaned_plain,

            message_html=
                cleaned_html,

            recipients=
                recipients,
        )
    )


    # ========================================================
    # SAVE HISTORY AFTER SUCCESSFUL DELIVERY
    # ========================================================

    history = (
        _save_sent_email_history(
            recipient_type=
                normalized_type,

            recipient_label=
                recipient_label,

            recipient_user_id=
                history_user_id,

            recipient_email=
                history_email,

            recipient_count=
                delivery[
                    "successful_count"
                ],

            subject=
                cleaned_subject,

            message_html=
                cleaned_html,

            message_plain=
                cleaned_plain,

            sent_by_admin_id=
                admin[
                    "admin_id"
                ],
        )
    )


    # ========================================================
    # RESULT MESSAGE
    # ========================================================

    successful_count = (
        delivery[
            "successful_count"
        ]
    )

    failed_count = (
        delivery[
            "failed_count"
        ]
    )


    if (
        failed_count > 0
    ):
        result_message = (
            f"Email sent to {successful_count} "
            f"recipient{'s' if successful_count != 1 else ''}. "
            f"{failed_count} recipient"
            f"{'s' if failed_count != 1 else ''} could not be reached."
        )

    elif (
        normalized_type ==
        RECIPIENT_SPECIFIC
    ):
        result_message = (
            "Email sent successfully."
        )

    else:
        result_message = (
            f"Email sent successfully to {successful_count} "
            f"recipient{'s' if successful_count != 1 else ''}."
        )


    return {
        "message":
            result_message,

        "history":
            history,

        "delivery": {
            "successful_count":
                successful_count,

            "failed_count":
                failed_count,

            "failed_recipients": [
                {
                    "user_id":
                        item.get(
                            "user_id"
                        ),

                    "email":
                        item.get(
                            "email"
                        ),

                    "error":
                        item.get(
                            "error"
                        ),
                }
                for item in delivery[
                    "failed"
                ]
            ],
        },

        "sent_by": {
            "admin_id":
                admin.get(
                    "admin_id"
                ),

            "name":
                admin.get(
                    "full_name"
                ),

            "email":
                admin.get(
                    "email"
                ),
        },
    }