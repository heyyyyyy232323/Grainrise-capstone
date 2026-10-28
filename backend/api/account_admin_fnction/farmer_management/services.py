import smtplib

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from ...models import PartnershipInquiry
from .selectors import get_farmer_account_summary


# ============================================================
# CONSTANTS
# ============================================================

FARMER_ROLE = "farmer"

MAX_ARCHIVE_REASON_LENGTH = 1000


# ============================================================
# DATABASE HELPERS (MySQL-compatible)
# ============================================================

def _table_exists(table_name):
    normalized_name = str(table_name or "").strip().lower()
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
            [normalized_name],
        )
        row = cursor.fetchone()

    return bool(row and row[0])


def _require_table(table_name, friendly_name):
    if not _table_exists(table_name):
        raise ValueError(
            f"{friendly_name} is not available in the current database."
        )


# ============================================================
# ARCHIVE REASON VALIDATION
# ============================================================

def _clean_archive_reason(reason):
    cleaned = str(reason or "").strip()
    if not cleaned:
        raise ValueError("Archive reason is required.")
    if len(cleaned) > MAX_ARCHIVE_REASON_LENGTH:
        raise ValueError("Archive reason must not exceed 1000 characters.")
    return cleaned


# ============================================================
# FARMER DISPLAY NAME
# ============================================================

def _build_farmer_display_name(farmer):
    parts = [
        farmer.get("first_name"),
        farmer.get("middle_initial"),
        farmer.get("last_name"),
        farmer.get("suffix"),
    ]
    cleaned_parts = [
        str(part).strip()
        for part in parts
        if str(part or "").strip()
    ]
    return " ".join(cleaned_parts) or "Farmer Partner"


# ============================================================
# CONFIRMATION EMAIL
# ============================================================

def _send_farmer_confirmation_email(farmer):
    recipient = str(farmer.get("email") or "").strip().lower()
    if not recipient or recipient.endswith("@grainrise.local"):
        raise ValueError("The Farmer account does not have a valid external email address.")

    display_name = _build_farmer_display_name(farmer)
    safe_display_name = escape(display_name)
    subject = "GrainRise Farmer Application Confirmed"

    text_message = (
        f"Hello {display_name},\n\n"
        "Your GrainRise Farmer application has been confirmed.\n\n"
        "Your account is now active and ready to access the Farmer modules.\n\n"
        "GrainRise Administration Team"
    )

    html_message = f"""
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #064e1e;">GrainRise Farmer Application Approved</h2>
        <p>Hello <strong>{safe_display_name}</strong>,</p>
        <p>Your GrainRise Farmer application has been confirmed and your account is now active.</p>
        <p style="margin-top: 28px; color: #6b7280; font-size: 13px;">GrainRise Account Administration</p>
    </div>
    """

    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [recipient],
    )
    message.attach_alternative(html_message, "text/html")

    try:
        sent_count = message.send(fail_silently=False)
    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Gmail rejected the configured EMAIL_USER / EMAIL_APP_PASSWORD. Use a valid Google App Password for the configured sender account."
        ) from exc

    if sent_count < 1:
        raise RuntimeError("The confirmation email could not be sent.")

    return True


# ============================================================
# CONFIRM FARMER APPLICATION
# ============================================================

def confirm_farmer_application(user_id):
    """
    Confirm Farmer registration.
    Allowed: inactive -> active (or inquiry to_review -> active)
    """
    # 1. Check if user_id is a PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        from ..partner_account_service import create_partner_user_from_inquiry
        return create_partner_user_from_inquiry(inquiry_id=user_id, expected_role="farmer")

    # 2. Existing user in users table
    farmer = get_farmer_account_summary(user_id)
    if not farmer:
        raise ValueError("Farmer account was not found.")

    current_status = str(farmer.get("status") or "").strip().lower()
    if current_status == "active":
        raise ValueError("This Farmer account is already active.")
    if current_status != "inactive":
        raise ValueError("Only Farmer applications currently under review can be confirmed.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND user_role = %s
                  AND status = 'inactive'
                """,
                [user_id, FARMER_ROLE],
            )
            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Farmer application could not be confirmed because its account status changed before the update completed."
                )

            cursor.execute(
                """
                SELECT user_id, status, updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )
            updated = cursor.fetchone()

    email_sent = False
    email_error = None
    try:
        email_sent = _send_farmer_confirmation_email(farmer)
    except Exception as exc:
        email_error = str(exc)

    return {
        "user_id": int(updated[0]),
        "farmer_name": _build_farmer_display_name(farmer),
        "status": updated[1],
        "updated_at": updated[2],
        "email_sent": email_sent,
        "email_error": email_error,
        "sms_sent": False,
        "sms_error": None,
        "message": (
            "Farmer application confirmed successfully."
            if email_sent
            else "Farmer application confirmed, but the confirmation email could not be sent."
        ),
    }


# ============================================================
# ARCHIVE FARMER ACCOUNT
# ============================================================

def archive_farmer_account(user_id, reason):
    cleaned_reason = _clean_archive_reason(reason)
    _require_table("farmer_archive_reasons", "Farmer archive history")

    farmer = get_farmer_account_summary(user_id)
    if not farmer:
        raise ValueError("Farmer account was not found.")

    current_status = str(farmer.get("status") or "").strip().lower()
    if current_status == "archived":
        raise ValueError("This Farmer account is already archived.")
    if current_status != "active":
        raise ValueError("Only active Farmer accounts can be archived.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET status = 'archived',
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND user_role = %s
                  AND status = 'active'
                """,
                [user_id, FARMER_ROLE],
            )
            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Farmer account could not be archived because its status changed before the update completed."
                )

            cursor.execute(
                """
                SELECT user_id, status, updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )
            updated = cursor.fetchone()

            cursor.execute(
                """
                INSERT INTO farmer_archive_reasons (user_id, reason, created_at)
                VALUES (%s, %s, CURRENT_TIMESTAMP)
                """,
                [user_id, cleaned_reason],
            )
            archive_id = cursor.lastrowid
            cursor.execute(
                """
                SELECT farmer_archive_reason_id, reason, created_at
                FROM farmer_archive_reasons
                WHERE farmer_archive_reason_id = %s
                """,
                [archive_id],
            )
            archive_row = cursor.fetchone()

    return {
        "user_id": int(updated[0]),
        "farmer_name": _build_farmer_display_name(farmer),
        "status": updated[1],
        "updated_at": updated[2],
        "archive_reason_id": int(archive_row[0]),
        "archive_reason": archive_row[1],
        "archived_at": archive_row[2],
        "message": "Farmer account archived successfully.",
    }


# ============================================================
# RESTORE FARMER ACCOUNT
# ============================================================

def restore_farmer_account(user_id):
    farmer = get_farmer_account_summary(user_id)
    if not farmer:
        raise ValueError("Farmer account was not found.")

    current_status = str(farmer.get("status") or "").strip().lower()
    if current_status == "active":
        raise ValueError("This Farmer account is already active.")
    if current_status == "inactive":
        raise ValueError("This Farmer application is still under review and cannot be restored.")
    if current_status not in {"archived", "deactivated"}:
        raise ValueError("Only archived or deactivated Farmer accounts can be restored.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE users
                SET status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                  AND user_role = %s
                  AND status IN ('archived', 'deactivated')
                """,
                [user_id, FARMER_ROLE],
            )
            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Farmer account could not be restored because its status changed before the update completed."
                )

            cursor.execute(
                """
                SELECT user_id, status, updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )
            updated = cursor.fetchone()

    return {
        "user_id": int(updated[0]),
        "farmer_name": _build_farmer_display_name(farmer),
        "status": updated[1],
        "updated_at": updated[2],
        "message": "Farmer account restored successfully.",
    }


# ============================================================
# DELETE FARMER ACCOUNT
# ============================================================

def delete_farmer_account(user_id):
    farmer = get_farmer_account_summary(user_id)
    if not farmer:
        raise ValueError("Farmer account was not found.")

    current_status = str(farmer.get("status") or "").strip().lower()
    if current_status == "active":
        raise ValueError("Archive the Farmer account before permanently deleting it.")
    if current_status == "inactive":
        raise ValueError("Farmer applications under review cannot be permanently deleted through the Management Inactive action.")
    if current_status not in {"archived", "deactivated"}:
        raise ValueError("Only archived or deactivated Farmer accounts can be permanently deleted.")

    farmer_name = _build_farmer_display_name(farmer)
    farmer_email = str(farmer.get("email") or "").strip()

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM users
                WHERE user_id = %s
                  AND user_role = %s
                  AND status IN ('archived', 'deactivated')
                """,
                [user_id, FARMER_ROLE],
            )
            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Farmer account could not be permanently deleted because its status changed before the deletion completed."
                )

    return {
        "user_id": int(user_id),
        "farmer_name": farmer_name,
        "email": farmer_email,
        "message": "Farmer account permanently deleted successfully.",
    }
