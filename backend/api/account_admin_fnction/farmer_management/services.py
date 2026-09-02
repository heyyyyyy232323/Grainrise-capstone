import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from .selectors import get_farmer_account_summary


# ============================================================
# CONSTANTS
# ============================================================

FARMER_ROLE = "farmer"

MAX_ARCHIVE_REASON_LENGTH = 1000


# ============================================================
# DATABASE HELPERS
# ============================================================

def _table_exists(table_name):
    """
    Check whether a PostgreSQL table exists.
    """

    normalized_name = str(
        table_name or ""
    ).strip()

    if not normalized_name:
        return False


    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT to_regclass(%s)
            """,
            [
                f"public.{normalized_name}",
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
    Require a supporting database table.
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
    Validate the reason used when archiving
    a Farmer account.
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
# FARMER DISPLAY NAME
# ============================================================

def _build_farmer_display_name(
    farmer,
):
    """
    Build Farmer full name.
    """

    parts = [
        farmer.get(
            "first_name"
        ),

        farmer.get(
            "middle_initial"
        ),

        farmer.get(
            "last_name"
        ),

        farmer.get(
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
        or "Farmer Partner"
    )


# ============================================================
# CONFIRMATION EMAIL
# ============================================================

def _send_farmer_confirmation_email(
    farmer,
):
    """
    Send confirmation email after the Farmer
    application has been approved.
    """

    recipient = str(
        farmer.get(
            "email"
        )
        or ""
    ).strip().lower()


    if not recipient:
        raise ValueError(
            "The Farmer account does not have a valid email address."
        )


    display_name = (
        _build_farmer_display_name(
            farmer
        )
    )


    safe_display_name = escape(
        display_name
    )


    subject = (
        "GrainRise Farmer Application Confirmed"
    )


    text_message = (
        f"Hello {display_name},\n\n"
        "Your GrainRise Farmer application has been confirmed.\n\n"
        "Your GrainRise account is now active. "
        "You may now sign in and access the available Farmer features.\n\n"
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
        <div
            style="
                margin-bottom: 24px;
            "
        >
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
                Farmer Account Verification
            </p>
        </div>


        <h3
            style="
                margin-bottom: 16px;
            "
        >
            Application Confirmed
        </h3>


        <p>
            Hello
            <strong>
                {safe_display_name}
            </strong>,
        </p>


        <p>
            Your GrainRise Farmer application has been
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
                Your GrainRise Farmer account is now active.
            </p>
        </div>


        <p>
            You may now sign in and use the available
            Farmer features in GrainRise.
        </p>


        <p
            style="
                margin-top: 28px;
            "
        >
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
# CONFIRM FARMER APPLICATION
# ============================================================

def confirm_farmer_application(
    user_id,
):
    """
    Confirm Farmer registration.

    Allowed:
        inactive -> active

    The account update is committed before the email
    is attempted. Email failure does not roll back
    account activation.
    """

    farmer = (
        get_farmer_account_summary(
            user_id
        )
    )


    if not farmer:

        raise ValueError(
            "Farmer account was not found."
        )


    current_status = str(
        farmer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "This Farmer account is already active."
        )


    if current_status != "inactive":

        raise ValueError(
            "Only Farmer applications currently under review "
            "can be confirmed."
        )


    # ========================================================
    # DATABASE UPDATE
    # ========================================================

    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status =
                        'active'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role =
                        %s::user_role_enum

                    AND status =
                        'inactive'::user_status_enum

                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                    FARMER_ROLE,
                ],
            )


            updated = cursor.fetchone()


            if not updated:

                raise RuntimeError(
                    "The Farmer application could not be confirmed "
                    "because its account status changed before "
                    "the update completed."
                )


    # ========================================================
    # SEND EMAIL AFTER SUCCESSFUL UPDATE
    # ========================================================

    email_sent = False

    email_error = None


    try:

        email_sent = (
            _send_farmer_confirmation_email(
                farmer
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

        "farmer_name":
            _build_farmer_display_name(
                farmer
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
            "Farmer application confirmed successfully."
            if email_sent
            else (
                "Farmer application confirmed, but the "
                "confirmation email could not be sent."
            )
        ),
    }


# ============================================================
# ARCHIVE FARMER ACCOUNT
# ============================================================

def archive_farmer_account(
    user_id,
    reason,
):
    """
    Archive active Farmer account.

    Allowed:
        active -> archived

    Archive reason is required.
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )


    _require_table(
        "farmer_archive_reasons",
        "Farmer archive history",
    )


    farmer = (
        get_farmer_account_summary(
            user_id
        )
    )


    if not farmer:

        raise ValueError(
            "Farmer account was not found."
        )


    current_status = str(
        farmer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "archived":

        raise ValueError(
            "This Farmer account is already archived."
        )


    if current_status != "active":

        raise ValueError(
            "Only active Farmer accounts can be archived."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            # =================================================
            # ARCHIVE ACCOUNT
            # =================================================

            cursor.execute(
                """
                UPDATE users

                SET
                    status =
                        'archived'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role =
                        %s::user_role_enum

                    AND status =
                        'active'::user_status_enum

                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                    FARMER_ROLE,
                ],
            )


            updated = cursor.fetchone()


            if not updated:

                raise RuntimeError(
                    "The Farmer account could not be archived "
                    "because its status changed before "
                    "the update completed."
                )


            # =================================================
            # ARCHIVE REASON
            # =================================================

            cursor.execute(
                """
                INSERT INTO farmer_archive_reasons
                (
                    user_id,
                    reason
                )

                VALUES
                (
                    %s,
                    %s
                )

                RETURNING

                    farmer_archive_reason_id,

                    reason,

                    created_at
                """,
                [
                    user_id,
                    cleaned_reason,
                ],
            )


            archive_row = (
                cursor.fetchone()
            )


            if not archive_row:

                raise RuntimeError(
                    "The Farmer archive reason could not be saved."
                )


    return {
        "user_id":
            int(
                updated[0]
            ),

        "farmer_name":
            _build_farmer_display_name(
                farmer
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
            "Farmer account archived successfully.",
    }


# ============================================================
# RESTORE FARMER ACCOUNT
# ============================================================

def restore_farmer_account(
    user_id,
):
    """
    Restore Farmer account from Management Inactive.

    Allowed:
        archived -> active
        deactivated -> active

    Registration-pending inactive accounts must stay
    in To Review.
    """

    farmer = (
        get_farmer_account_summary(
            user_id
        )
    )


    if not farmer:

        raise ValueError(
            "Farmer account was not found."
        )


    current_status = str(
        farmer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "This Farmer account is already active."
        )


    if current_status == "inactive":

        raise ValueError(
            "This Farmer application is still under review "
            "and cannot be restored."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:

        raise ValueError(
            "Only archived or deactivated Farmer accounts "
            "can be restored."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status =
                        'active'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role =
                        %s::user_role_enum

                    AND status IN (
                        'archived'::user_status_enum,
                        'deactivated'::user_status_enum
                    )

                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                    FARMER_ROLE,
                ],
            )


            updated = cursor.fetchone()


            if not updated:

                raise RuntimeError(
                    "The Farmer account could not be restored "
                    "because its status changed before "
                    "the update completed."
                )


    return {
        "user_id":
            int(
                updated[0]
            ),

        "farmer_name":
            _build_farmer_display_name(
                farmer
            ),

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "message":
            "Farmer account restored successfully.",
    }


# ============================================================
# DELETE FARMER ACCOUNT
# ============================================================

def delete_farmer_account(
    user_id,
):
    """
    Permanently delete Farmer account.

    Allowed:
        archived
        deactivated

    Not allowed:
        active
        inactive / To Review

    Related farmer_compliance and farmer_farms rows
    are removed through ON DELETE CASCADE.
    """

    farmer = (
        get_farmer_account_summary(
            user_id
        )
    )


    if not farmer:

        raise ValueError(
            "Farmer account was not found."
        )


    current_status = str(
        farmer.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "Archive the Farmer account before permanently deleting it."
        )


    if current_status == "inactive":

        raise ValueError(
            "Farmer applications under review cannot be permanently "
            "deleted through the Management Inactive action."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:

        raise ValueError(
            "Only archived or deactivated Farmer accounts "
            "can be permanently deleted."
        )


    farmer_name = (
        _build_farmer_display_name(
            farmer
        )
    )


    farmer_email = str(
        farmer.get(
            "email"
        )
        or ""
    ).strip()


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM users

                WHERE

                    user_id = %s

                    AND user_role =
                        %s::user_role_enum

                    AND status IN (
                        'archived'::user_status_enum,
                        'deactivated'::user_status_enum
                    )

                RETURNING
                    user_id
                """,
                [
                    user_id,
                    FARMER_ROLE,
                ],
            )


            deleted = cursor.fetchone()


            if not deleted:

                raise RuntimeError(
                    "The Farmer account could not be permanently deleted "
                    "because its status changed before "
                    "the deletion completed."
                )


    return {
        "user_id":
            int(
                deleted[0]
            ),

        "farmer_name":
            farmer_name,

        "email":
            farmer_email,

        "message":
            "Farmer account permanently deleted successfully.",
    }