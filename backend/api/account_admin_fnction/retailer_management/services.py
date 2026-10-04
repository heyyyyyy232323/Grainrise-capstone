import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from .selectors import get_retailer_account_summary


# ============================================================
# CONSTANTS
# ============================================================

RETAILER_ROLE = "retailer"

MAX_ARCHIVE_REASON_LENGTH = 1000


# ============================================================
# DATABASE HELPERS
# ============================================================

def _table_exists(table_name):
    """
    Return True when the given table exists in the MySQL database.
    """

    normalized_name = str(
        table_name or ""
    ).strip()

    if not normalized_name:
        return False


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = %s
            LIMIT 1
            """,
            [
                normalized_name,
            ],
        )

        row = cursor.fetchone()


    return bool(
        row
        and row[0]
    )


def _require_table(
    table_name,
    friendly_name,
):
    """
    Require a support table before performing
    an operation that depends on it.
    """

    if not _table_exists(
        table_name
    ):
        raise ValueError(
            f"{friendly_name} is not available in the current database."
        )


# ============================================================
# ARCHIVE REASON VALIDATION
# ============================================================

def _clean_archive_reason(
    reason,
):
    """
    Normalize and validate archive reason.
    """

    cleaned = str(
        reason or ""
    ).strip()


    if not cleaned:
        raise ValueError(
            "Archive reason is required."
        )


    if (
        len(cleaned) >
        MAX_ARCHIVE_REASON_LENGTH
    ):
        raise ValueError(
            "Archive reason must not exceed 1000 characters."
        )


    return cleaned


# ============================================================
# RETAILER DISPLAY NAME
# ============================================================

def _build_retailer_display_name(
    retailer,
):
    """
    Build full Retailer name.
    """

    parts = [
        retailer.get(
            "first_name"
        ),
        retailer.get(
            "middle_initial"
        ),
        retailer.get(
            "last_name"
        ),
        retailer.get(
            "suffix"
        ),
    ]


    cleaned_parts = [
        str(part).strip()
        for part in parts
        if str(
            part or ""
        ).strip()
    ]


    return (
        " ".join(
            cleaned_parts
        )
        or "Retailer Partner"
    )


# ============================================================
# RETAILER CONFIRMATION EMAIL
# ============================================================

def _send_retailer_confirmation_email(
    retailer,
):
    """
    Send confirmation email after the Retailer
    registration has been successfully approved.
    """

    recipient = str(
        retailer.get(
            "email"
        )
        or ""
    ).strip().lower()


    if not recipient:
        raise ValueError(
            "The Retailer account does not have a valid email address."
        )


    display_name = (
        _build_retailer_display_name(
            retailer
        )
    )


    safe_display_name = escape(
        display_name
    )


    subject = (
        "GrainRise Retailer Application Confirmed"
    )


    text_message = (
        f"Hello {display_name},\n\n"
        "Your GrainRise Retailer application has been confirmed.\n\n"
        "Your GrainRise account is now active. "
        "You may now sign in and use the available Retailer functions.\n\n"
        "Thank you for joining GrainRise.\n\n"
        "GrainRise Account Administration"
    )


    html_message = f"""
    <div
        style="
            font-family: Arial, sans-serif;
            max-width: 620px;
            margin: 0 auto;
            color: #1f2937;
            padding: 24px;
        "
    >
        <div style="margin-bottom: 24px;">
            <h2
                style="
                    color: #08511f;
                    margin: 0 0 8px 0;
                "
            >
                GrainRise
            </h2>

            <p
                style="
                    margin: 0;
                    color: #6b7280;
                "
            >
                Retailer Account Verification
            </p>
        </div>

        <h3 style="margin-bottom: 16px;">
            Application Confirmed
        </h3>

        <p>
            Hello
            <strong>{safe_display_name}</strong>,
        </p>

        <p>
            Your GrainRise Retailer application has been
            confirmed by the Account Administrator.
        </p>

        <div
            style="
                margin: 24px 0;
                padding: 18px;
                background: #f0f8f2;
                border: 1px solid #cce5d1;
                border-radius: 12px;
            "
        >
            <p
                style="
                    margin: 0;
                    color: #08511f;
                    font-weight: 700;
                "
            >
                Your GrainRise account is now active.
            </p>
        </div>

        <p>
            You may now sign in and use the available
            GrainRise Retailer functions.
        </p>

        <p style="margin-top: 28px;">
            Thank you for joining GrainRise.
        </p>

        <p
            style="
                margin-top: 28px;
                color: #6b7280;
                font-size: 13px;
            "
        >
            GrainRise Account Administration
        </p>
    </div>
    """


    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [
            recipient,
        ],
    )


    message.attach_alternative(
        html_message,
        "text/html",
    )


    try:
        sent_count = message.send(
            fail_silently=False
        )

    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Gmail rejected the configured EMAIL_USER / "
            "EMAIL_APP_PASSWORD. Use a valid Google App "
            "Password for the configured sender account."
        ) from exc


    if sent_count < 1:
        raise RuntimeError(
            "The confirmation email could not be sent."
        )


    return True


# ============================================================
# CONFIRM RETAILER APPLICATION
# ============================================================

def confirm_retailer_application(
    user_id,
):
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None
    if inquiry:
        from ..partner_account_service import create_partner_user_from_inquiry
        return create_partner_user_from_inquiry(inquiry_id=user_id, expected_role="retailer")
    """
    Confirm a Retailer application.

    Allowed:
        inactive -> active

    The database update is committed first.

    If the confirmation email fails,
    the account remains active.
    """

    retailer = (
        get_retailer_account_summary(
            user_id
        )
    )


    if not retailer:
        raise ValueError(
            "Retailer account was not found."
        )


    current_status = str(
        retailer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "This Retailer account is already active."
        )


    if current_status != "inactive":
        raise ValueError(
            "Only Retailer applications currently under review "
            "can be confirmed."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status = 'active',

                    updated_at = CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role = %s

                    AND status = 'inactive'
                """,
                [
                    user_id,
                    RETAILER_ROLE,
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Retailer application could not be confirmed "
                    "because its account status changed before the "
                    "update completed."
                )

            cursor.execute(
                """
                SELECT
                    user_id,
                    status,
                    updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )

            updated = cursor.fetchone()


    # ========================================================
    # EMAIL AFTER DATABASE COMMIT
    # ========================================================

    email_sent = False

    email_error = None


    try:
        email_sent = (
            _send_retailer_confirmation_email(
                retailer
            )
        )

    except Exception as exc:
        email_error = str(
            exc
        )


    return {
        "user_id":
            int(
                updated[0]
            ),

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "email_sent":
            email_sent,

        "email_error":
            email_error,

        "message": (
            "Retailer application confirmed successfully."
            if email_sent
            else (
                "Retailer application confirmed, but the "
                "confirmation email could not be sent."
            )
        ),
    }


# ============================================================
# ARCHIVE RETAILER ACCOUNT
# ============================================================

def archive_retailer_account(
    user_id,
    reason,
):
    """
    Archive an active Retailer account.

    Allowed:
        active -> archived

    Archive reason is required.
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )

    # 1. Check actual users record FIRST.
    retailer = None
    numeric_user_id = None
    try:
        numeric_user_id = int(user_id)
        retailer = get_retailer_account_summary(numeric_user_id)
    except (ValueError, TypeError):
        retailer = None

    # 2. If confirmed user exists:
    if retailer:
        _require_table(
            "retailer_archive_reasons",
            "Retailer archive history",
        )

        current_status = str(
            retailer.get(
                "status"
            )
            or ""
        ).strip().lower()

        if current_status == "archived":
            raise ValueError(
                "This Retailer account is already archived."
            )

        if current_status != "active":
            raise ValueError(
                "Only active Retailer accounts can be archived."
            )

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE users

                    SET
                        status = 'archived',

                        updated_at = CURRENT_TIMESTAMP

                    WHERE

                        user_id = %s

                        AND user_role = %s

                        AND status = 'active'
                    """,
                    [
                        numeric_user_id,
                        RETAILER_ROLE,
                    ],
                )

                if cursor.rowcount == 0:
                    raise RuntimeError(
                        "The Retailer account could not be archived "
                        "because its status changed before the update completed."
                    )

                cursor.execute(
                    """
                    SELECT
                        user_id,
                        status,
                        updated_at
                    FROM users
                    WHERE user_id = %s
                    """,
                    [numeric_user_id],
                )

                updated = cursor.fetchone()

                cursor.execute(
                    """
                    INSERT INTO retailer_archive_reasons
                    (
                        user_id,
                        reason
                    )

                    VALUES
                    (
                        %s,
                        %s
                    )
                    """,
                    [
                        numeric_user_id,
                        cleaned_reason,
                    ],
                )

                archive_reason_id = cursor.lastrowid

                cursor.execute(
                    """
                    SELECT
                        retailer_archive_reason_id,
                        reason,
                        created_at
                    FROM retailer_archive_reasons
                    WHERE retailer_archive_reason_id = %s
                    """,
                    [archive_reason_id],
                )

                archive_row = cursor.fetchone()

                if not archive_row:
                    raise RuntimeError(
                        "The Retailer archive reason could not be saved."
                    )

        return {
            "user_id":
                int(
                    updated[0]
                ),

            "retailer_name":
                _build_retailer_display_name(
                    retailer
                ),

            "status":
                updated[1],

            "updated_at":
                updated[2],

            "archive_reason_id":
                int(
                    archive_row[0]
                ),

            "archive_reason":
                archive_row[1],

            "archived_at":
                archive_row[2],

            "message":
                "Retailer account archived successfully.",
        }

    # 3. Only if no user exists, archive pending inquiry:
    #    - filter correct partner_role
    #    - status='to_review'
    #    - set inquiry.status = inactive
    # IMPORTANT: partnership_inquiries has NO archive_reason field.
    # Do not use inquiry.archive_reason.
    # Do not delete inquiries or documents.
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(
            partnership_inquiry_id=user_id,
            partner_role="retailer",
            status=PartnershipInquiry.Status.TO_REVIEW,
        ).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        inquiry.status = PartnershipInquiry.Status.INACTIVE
        inquiry.save(update_fields=["status", "updated_at"])
        return {
            "user_id": str(inquiry.partnership_inquiry_id),
            "retailer_name": inquiry.name,
            "status": "inactive",
            "updated_at": inquiry.updated_at,
            "archive_reason_id": None,
            "archive_reason": None,
            "archived_at": inquiry.updated_at,
            "message": "Retailer application archived successfully.",
        }

    raise ValueError(
        "Retailer account was not found."
    )


# ============================================================
# RESTORE RETAILER ACCOUNT
# ============================================================

def restore_retailer_account(
    user_id,
):
    """
    Restore Retailer from Management Inactive.

    Allowed:
        archived -> active
        deactivated -> active

    Registration status:
        inactive

    must NOT be restored through this action.
    """

    retailer = (
        get_retailer_account_summary(
            user_id
        )
    )


    if not retailer:
        raise ValueError(
            "Retailer account was not found."
        )


    current_status = str(
        retailer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "This Retailer account is already active."
        )


    if current_status == "inactive":
        raise ValueError(
            "This Retailer application is still under review "
            "and cannot be restored."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:
        raise ValueError(
            "Only archived or deactivated Retailer accounts "
            "can be restored."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status = 'active',

                    updated_at = CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role = %s

                    AND status IN (
                        'archived',
                        'deactivated'
                    )
                """,
                [
                    user_id,
                    RETAILER_ROLE,
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Retailer account could not be restored "
                    "because its status changed before the update completed."
                )

            cursor.execute(
                """
                SELECT
                    user_id,
                    status,
                    updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )

            updated = cursor.fetchone()


    return {
        "user_id":
            int(
                updated[0]
            ),

        "retailer_name":
            _build_retailer_display_name(
                retailer
            ),

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "message":
            "Retailer account restored successfully.",
    }


# ============================================================
# DELETE RETAILER ACCOUNT
# ============================================================

def delete_retailer_account(
    user_id,
):
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        current_status = str(inquiry.status or "").strip().lower()
        if current_status not in {"inactive", "archived"}:
            raise ValueError(
                "Only archived or inactive Retailer inquiries can be permanently deleted."
            )
        r_name = inquiry.name or "Retailer Applicant"
        inquiry.delete()
        return {
            "user_id": str(user_id),
            "retailer_name": r_name,
            "email": inquiry.email or "",
            "message": "Retailer inquiry deleted permanently.",
        }

    """
    Permanently delete a Retailer account.

    Allowed:
        archived
        deactivated

    Active accounts must be archived first.
    Registration-pending inactive accounts cannot be
    deleted using the Management Inactive action.
    """

    retailer = (
        get_retailer_account_summary(
            user_id
        )
    )

    if not retailer:
        raise ValueError(
            "Retailer account was not found."
        )

    current_status = str(
        retailer.get(
            "status"
        )
        or ""
    ).strip().lower()

    if current_status == "active":
        raise ValueError(
            "Archive the Retailer account before permanently deleting it."
        )

    if current_status == "inactive":
        raise ValueError(
            "Retailer applications under review cannot be permanently deleted "
            "through the Management Inactive action."
        )

    if current_status not in {
        "archived",
        "deactivated",
    }:
        raise ValueError(
            "Only archived or deactivated Retailer accounts "
            "can be permanently deleted."
        )

    retailer_name = (
        _build_retailer_display_name(
            retailer
        )
    )

    retailer_email = str(
        retailer.get(
            "email"
        )
        or ""
    ).strip()

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Retailer documents
            if _table_exists("retailer_documents"):
                cursor.execute(
                    """
                    DELETE FROM retailer_documents
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 2. Retailer archive reasons
            if _table_exists("retailer_archive_reasons"):
                cursor.execute(
                    """
                    DELETE FROM retailer_archive_reasons
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 3. Miller ratings / reports where retailer was reviewer / reporter
            if _table_exists("miller_ratings"):
                cursor.execute(
                    """
                    DELETE FROM miller_ratings
                    WHERE reviewer_user_id = %s
                    """,
                    [user_id],
                )
            if _table_exists("miller_reports"):
                cursor.execute(
                    """
                    DELETE FROM miller_reports
                    WHERE reported_by_user_id = %s
                    """,
                    [user_id],
                )

            # 4. Warehouse ratings / reports where retailer was reviewer / reporter
            if _table_exists("warehouse_ratings"):
                cursor.execute(
                    """
                    DELETE FROM warehouse_ratings
                    WHERE reviewer_user_id = %s
                    """,
                    [user_id],
                )
            if _table_exists("warehouse_reports"):
                cursor.execute(
                    """
                    DELETE FROM warehouse_reports
                    WHERE reported_by_user_id = %s
                    """,
                    [user_id],
                )

            # 5. News comments (break parent hierarchy first, then delete)
            if _table_exists("news_comments"):
                cursor.execute(
                    """
                    UPDATE news_comments
                    SET parent_comment_id = NULL
                    WHERE parent_comment_id IN (
                        SELECT c.comment_id FROM (
                            SELECT comment_id FROM news_comments WHERE user_id = %s
                        ) c
                    )
                    """,
                    [user_id],
                )
                cursor.execute(
                    """
                    DELETE FROM news_comments
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 6. News reactions
            if _table_exists("news_reactions"):
                cursor.execute(
                    """
                    DELETE FROM news_reactions
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 7. Admin notifications
            if _table_exists("admin_notifications"):
                cursor.execute(
                    """
                    UPDATE admin_notifications
                    SET related_user_id = NULL
                    WHERE related_user_id = %s
                    """,
                    [user_id],
                )

            # 8. System activity logs
            if _table_exists("system_activity_logs"):
                cursor.execute(
                    """
                    UPDATE system_activity_logs
                    SET related_user_id = NULL
                    WHERE related_user_id = %s
                    """,
                    [user_id],
                )

            # 9. Email sent history
            if _table_exists("email_sent_history"):
                cursor.execute(
                    """
                    UPDATE email_sent_history
                    SET recipient_user_id = NULL
                    WHERE recipient_user_id = %s
                    """,
                    [user_id],
                )

            # 10. Users
            cursor.execute(
                """
                DELETE FROM users
                WHERE
                    user_id = %s
                    AND user_role = %s
                    AND status IN (
                        'archived',
                        'deactivated'
                    )
                """,
                [
                    user_id,
                    RETAILER_ROLE,
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Retailer account could not be permanently deleted "
                    "because its status changed before the deletion completed."
                )

            deleted = (user_id,)

    return {
        "user_id": int(deleted[0]),
        "retailer_name": retailer_name,
        "email": retailer_email,
        "message": "Retailer account permanently deleted successfully.",
    }