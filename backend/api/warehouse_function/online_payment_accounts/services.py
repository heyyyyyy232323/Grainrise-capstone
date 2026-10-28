import hashlib
import hmac
import logging
import os
import re
import secrets
import tempfile
import time
import uuid
from datetime import datetime, timedelta, timezone

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.core.cache import cache
from django.core.cache.backends.filebased import FileBasedCache
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction, IntegrityError

from .selectors import (
    get_warehouse_employee_payment_account_detail,
    get_warehouse_user_info,
)

logger = logging.getLogger(__name__)

# Config
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_RESEND_COOLDOWN_SECONDS = 60  # 60-second cooldown
OTP_MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
ACTION_TOKEN_SALT = "grainrise_warehouse_action_auth_salt"
ACTION_TOKEN_MAX_AGE = 300  # 5 minutes


# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================

class PaymentSecurityError(Exception):
    """Base exception for payment security operations."""
    pass

class PaymentSecurityEmailError(PaymentSecurityError):
    pass

class SecurityAlreadyConfiguredError(PaymentSecurityError):
    pass

class SecurityNotConfiguredError(PaymentSecurityError):
    pass

class SecurityLockedError(PaymentSecurityError):
    pass

class InvalidPasswordError(PaymentSecurityError):
    pass

class OtpExpiredOrInvalidError(PaymentSecurityError):
    pass

class OtpCooldownError(PaymentSecurityError):
    pass

class DuplicateAccountError(PaymentSecurityError):
    pass

class AccountValidationError(PaymentSecurityError):
    pass

class AccountNotFoundError(PaymentSecurityError):
    pass


# ============================================================
# OTP & ACTION CACHE HELPERS
# ============================================================

def _get_security_cache():
    default_backend = getattr(settings, "CACHES", {}).get("default", {}).get("BACKEND", "")
    if "locmem" in default_backend.lower():
        cache_dir = os.path.join(tempfile.gettempdir(), "grainrise_warehouse_payment_security_cache")
        try:
            os.makedirs(cache_dir, exist_ok=True)
            return FileBasedCache(cache_dir, {"TIMEOUT": OTP_EXPIRY_SECONDS})
        except Exception as exc:
            logger.warning("Could not initialize FileBasedCache at %s: %s", cache_dir, exc)
    return cache


# ============================================================
# ACTION AUTHORIZATION TOKEN HELPERS
# ============================================================

def issue_action_auth_token(user_id: int, action: str, account_id: any) -> str:
    payload = {
        "user_id": int(user_id),
        "action": str(action),
        "account_id": str(account_id),
        "nonce": str(uuid.uuid4()),
        "ts": time.time(),
    }
    return signing.dumps(payload, salt=ACTION_TOKEN_SALT)


def consume_action_auth_token(token: str, user_id: int, action: str, account_id: any) -> None:
    if not token:
        raise InvalidPasswordError("Action authorization token is required.")

    sec_cache = _get_security_cache()
    token_sig = hashlib.sha256(token.encode("utf-8")).hexdigest()
    consumed_key = f"wh_consumed_action_token:{token_sig}"

    if sec_cache.get(consumed_key):
        raise InvalidPasswordError("Authorization token has already been used.")

    try:
        data = signing.loads(token, salt=ACTION_TOKEN_SALT, max_age=ACTION_TOKEN_MAX_AGE)
    except signing.SignatureExpired:
        raise InvalidPasswordError("Authorization session has expired. Please verify your password again.")
    except Exception:
        raise InvalidPasswordError("Invalid authorization token.")

    if int(data.get("user_id")) != int(user_id):
        raise InvalidPasswordError("Token user mismatch.")
    if str(data.get("action")) != str(action):
        raise InvalidPasswordError("Token action mismatch.")
    if str(data.get("account_id")) != str(account_id):
        raise InvalidPasswordError("Token target mismatch.")

    sec_cache.set(consumed_key, True, timeout=ACTION_TOKEN_MAX_AGE)


# ============================================================
# SECURITY PASSWORD & OTP SERVICES
# ============================================================

def _generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def _send_otp_email(email: str, recipient_name: str, otp_code: str, flow_title: str) -> None:
    subject = f"Your GrainRise Security Code: {otp_code}"
    text_content = (
        f"Hello {recipient_name},\n\n"
        f"Your verification code for {flow_title} is:\n\n"
        f"    {otp_code}\n\n"
        f"This code will expire in 5 minutes.\n"
        f"If you did not request this code, please secure your account immediately.\n\n"
        f"Best regards,\nGrainRise Security Team"
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px; margin: 0;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0b5d1e; font-size: 20px; font-weight: 700; margin: 0;">GrainRise Payment Security</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">{flow_title}</p>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">Hello <strong>{recipient_name}</strong>,</p>
        <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0;">Use the single-use verification code below to complete your payment security verification:</p>
        <div style="background-color: #f0fdf4; border: 1px dashed #22c55e; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0b5d1e; font-family: monospace;">{otp_code}</span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0 0 8px 0;">⏰ This code is valid for <strong>5 minutes</strong>. Never share this code with anyone.</p>
        <p style="color: #94a3b8; font-size: 11px; line-height: 1.5; margin: 16px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">If you did not request this verification, please contact GrainRise support immediately.</p>
      </div>
    </body>
    </html>
    """

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "GrainRise <no-reply@grainrise.com>")
    msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
    msg.attach_alternative(html_content, "text/html")
    try:
        msg.send()
    except Exception as exc:
        logger.exception("Failed to send OTP email to %s: %s", email, exc)
        raise PaymentSecurityEmailError(f"Failed to deliver OTP email: {str(exc)}")


def send_first_time_setup_otp(user_id: int, is_employee: bool = True) -> dict:
    """Send OTP for first-time Payment Security Password configuration."""
    table = "warehouse_employee_payment_account_security" if is_employee else "warehouse_payment_account_security"
    id_col = "warehouse_employee_id" if is_employee else "user_id"

    with connection.cursor() as cursor:
        cursor.execute(
            f"SELECT security_id, password_hash FROM {table} WHERE {id_col} = %s LIMIT 1",
            [user_id],
        )
        row = cursor.fetchone()

    if row and row[1]:
        raise SecurityAlreadyConfiguredError(
            "Payment security password is already configured. Use the forgot-password flow if you need to reset it."
        )

    user_info = get_warehouse_user_info(user_id, is_employee=is_employee)
    email = user_info.get("email")
    if not email:
        raise PaymentSecurityError("No registered email address found for this account. Contact your branch manager.")

    sec_cache = _get_security_cache()
    cooldown_key = f"wh_otp_setup_cooldown:{user_id}"
    if sec_cache.get(cooldown_key):
        raise OtpCooldownError("Please wait 60 seconds before requesting another verification code.")

    otp = _generate_otp()
    otp_key = f"wh_otp_setup_data:{user_id}"
    sec_cache.set(otp_key, {"otp": otp, "attempts": 0}, timeout=OTP_EXPIRY_SECONDS)
    sec_cache.set(cooldown_key, True, timeout=OTP_RESEND_COOLDOWN_SECONDS)

    _send_otp_email(email, user_info.get("full_name") or "User", otp, "Payment Security Setup")

    return {
        "success": True,
        "message": f"Verification code sent to {user_info.get('masked_email')}.",
        "expires_in_seconds": OTP_EXPIRY_SECONDS,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
    }


def setup_security_password(user_id: int, otp_code: str, password: str, confirm_password: str, is_employee: bool = True) -> dict:
    """Validate OTP and persist initial Payment Security Password."""
    if not otp_code or not str(otp_code).strip():
        raise OtpExpiredOrInvalidError("Verification code is required.")
    if not password:
        raise AccountValidationError("Payment security password is required.")
    if len(str(password)) < 6:
        raise AccountValidationError("Payment security password must be at least 6 characters.")
    if password != confirm_password:
        raise AccountValidationError("Passwords do not match.")

    sec_cache = _get_security_cache()
    otp_key = f"wh_otp_setup_data:{user_id}"
    cached = sec_cache.get(otp_key)
    if not cached:
        raise OtpExpiredOrInvalidError("Verification code has expired. Please request a new one.")

    attempts = cached.get("attempts", 0) + 1
    if attempts > OTP_MAX_ATTEMPTS:
        sec_cache.delete(otp_key)
        raise OtpExpiredOrInvalidError("Too many failed attempts. Please request a new code.")

    if not hmac.compare_digest(str(cached.get("otp")).strip(), str(otp_code).strip()):
        cached["attempts"] = attempts
        sec_cache.set(otp_key, cached, timeout=OTP_EXPIRY_SECONDS)
        raise OtpExpiredOrInvalidError("Invalid verification code. Please check and try again.")

    sec_cache.delete(otp_key)

    hashed = make_password(password)
    user_info = get_warehouse_user_info(user_id, is_employee=is_employee)
    wh_profile_id = user_info.get("warehouse_profile_id") or 1

    table = "warehouse_employee_payment_account_security" if is_employee else "warehouse_payment_account_security"
    id_col = "warehouse_employee_id" if is_employee else "user_id"

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            INSERT INTO {table} ({id_col}, warehouse_profile_id, password_hash, failed_attempts, locked_until, created_at, updated_at)
            VALUES (%s, %s, %s, 0, NULL, NOW(), NOW())
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), failed_attempts = 0, locked_until = NULL, updated_at = NOW()
            """,
            [user_id, wh_profile_id, hashed],
        )

    logger.info("Warehouse payment security password successfully set for user_id=%s (is_employee=%s)", user_id, is_employee)
    return {
        "success": True,
        "message": "Payment security password configured successfully.",
    }


def verify_security_password(user_id: int, password: str, is_employee: bool = True) -> bool:
    """Verify security password with failed attempts tracking and 15-minute lockout."""
    if not password:
        raise InvalidPasswordError("Payment security password is required.")

    table = "warehouse_employee_payment_account_security" if is_employee else "warehouse_payment_account_security"
    id_col = "warehouse_employee_id" if is_employee else "user_id"

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT security_id, password_hash, failed_attempts, locked_until
            FROM {table}
            WHERE {id_col} = %s
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()

        if not row and not is_employee:
            cursor.execute(
                """
                SELECT security_id, password_hash, failed_attempts, locked_until
                FROM warehouse_employee_payment_account_security
                WHERE warehouse_employee_id = %s
                LIMIT 1
                """,
                [user_id],
            )
            row = cursor.fetchone()

    if not row or not row[1]:
        raise SecurityNotConfiguredError(
            "Payment security password has not been set up. Please configure it first."
        )

    security_id, password_hash, failed_attempts, locked_until = row

    if locked_until:
        now_dt = datetime.now()
        if hasattr(locked_until, "tzinfo") and locked_until.tzinfo:
            now_dt = datetime.now(timezone.utc)
        if locked_until > now_dt:
            diff_secs = (locked_until - now_dt).total_seconds()
            mins_left = max(1, int(diff_secs // 60) + 1)
            raise SecurityLockedError(
                f"Too many failed attempts. Payment operations are temporarily locked for {mins_left} minute(s)."
            )

    if not check_password(password, password_hash):
        new_attempts = int(failed_attempts or 0) + 1
        lock_until_str = None
        if new_attempts >= 5:
            lock_until_dt = datetime.now() + timedelta(minutes=LOCKOUT_MINUTES)
            lock_until_str = lock_until_dt.strftime("%Y-%m-%d %H:%M:%S")

        with connection.cursor() as cursor:
            if lock_until_str:
                cursor.execute(
                    f"UPDATE {table} SET failed_attempts = %s, locked_until = %s, updated_at = NOW() WHERE security_id = %s",
                    [new_attempts, lock_until_str, security_id],
                )
            else:
                cursor.execute(
                    f"UPDATE {table} SET failed_attempts = %s, updated_at = NOW() WHERE security_id = %s",
                    [new_attempts, security_id],
                )

        if new_attempts >= 5:
            raise SecurityLockedError(
                f"Incorrect password. Maximum attempts exceeded. Locked for {LOCKOUT_MINUTES} minutes."
            )
        rem = 5 - new_attempts
        raise InvalidPasswordError(
            f"Incorrect payment security password. {rem} attempt(s) remaining before temporary lockout."
        )

    # Success: reset failed attempts
    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE security_id = %s",
            [security_id],
        )

    return True


def send_forgot_security_password_otp(user_id: int, is_employee: bool = True) -> dict:
    """Send OTP to reset a forgotten Payment Security Password."""
    user_info = get_warehouse_user_info(user_id, is_employee=is_employee)
    email = user_info.get("email")
    if not email:
        raise PaymentSecurityError("No registered email address found for this account.")

    sec_cache = _get_security_cache()
    cooldown_key = f"wh_otp_forgot_cooldown:{user_id}"
    if sec_cache.get(cooldown_key):
        raise OtpCooldownError("Please wait 60 seconds before requesting another reset code.")

    otp = _generate_otp()
    otp_key = f"wh_otp_forgot_data:{user_id}"
    sec_cache.set(otp_key, {"otp": otp, "attempts": 0}, timeout=OTP_EXPIRY_SECONDS)
    sec_cache.set(cooldown_key, True, timeout=OTP_RESEND_COOLDOWN_SECONDS)

    _send_otp_email(email, user_info.get("full_name") or "User", otp, "Payment Security Password Reset")

    return {
        "success": True,
        "message": f"Password reset code sent to {user_info.get('masked_email')}.",
        "expires_in_seconds": OTP_EXPIRY_SECONDS,
        "cooldown_seconds": OTP_RESEND_COOLDOWN_SECONDS,
    }


def reset_security_password(user_id: int, otp_code: str, new_password: str, confirm_password: str, is_employee: bool = True) -> dict:
    """Verify reset OTP and update Payment Security Password."""
    if not otp_code or not str(otp_code).strip():
        raise OtpExpiredOrInvalidError("Reset code is required.")
    if not new_password:
        raise AccountValidationError("New security password is required.")
    if len(str(new_password)) < 6:
        raise AccountValidationError("Security password must be at least 6 characters.")
    if new_password != confirm_password:
        raise AccountValidationError("Passwords do not match.")

    sec_cache = _get_security_cache()
    otp_key = f"wh_otp_forgot_data:{user_id}"
    cached = sec_cache.get(otp_key)
    if not cached:
        raise OtpExpiredOrInvalidError("Reset code has expired. Please request a new one.")

    attempts = cached.get("attempts", 0) + 1
    if attempts > OTP_MAX_ATTEMPTS:
        sec_cache.delete(otp_key)
        raise OtpExpiredOrInvalidError("Too many failed attempts. Please request a new reset code.")

    if not hmac.compare_digest(str(cached.get("otp")).strip(), str(otp_code).strip()):
        cached["attempts"] = attempts
        sec_cache.set(otp_key, cached, timeout=OTP_EXPIRY_SECONDS)
        raise OtpExpiredOrInvalidError("Invalid reset code. Please check and try again.")

    sec_cache.delete(otp_key)

    hashed = make_password(new_password)
    table = "warehouse_employee_payment_account_security" if is_employee else "warehouse_payment_account_security"
    id_col = "warehouse_employee_id" if is_employee else "user_id"

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE {table}
            SET password_hash = %s, failed_attempts = 0, locked_until = NULL, updated_at = NOW()
            WHERE {id_col} = %s
            """,
            [hashed, user_id],
        )

    logger.info("Warehouse payment security password successfully reset for user_id=%s", user_id)
    return {
        "success": True,
        "message": "Payment security password reset successfully.",
    }


# ============================================================
# ACCOUNT MANAGEMENT SERVICES
# ============================================================

def check_duplicate_payment_account(warehouse_profile_id: int, employee_id: int, account_number: str, exclude_id: int = None) -> bool:
    """
    Check if an active or unarchived payment account with this number exists for this employee.
    Returns True if a duplicate exists.
    """
    if not account_number:
        return False

    clean_num = str(account_number).strip().replace("-", "").replace(" ", "")
    sql = """
        SELECT credentials_id
        FROM warehouse_employee_online_transaction_credentials
        WHERE warehouse_employee_id = %s
          AND REPLACE(REPLACE(account_number, '-', ''), ' ', '') = %s
          AND status = 'active'
    """
    params = [employee_id, clean_num]
    if exclude_id:
        sql += " AND credentials_id != %s"
        params.append(exclude_id)

    sql += " LIMIT 1"
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.fetchone() is not None


def archive_employee_payment_account(credentials_id: int, warehouse_profile_ids, reason: str = None) -> dict:
    account = get_warehouse_employee_payment_account_detail(credentials_id, warehouse_profile_ids)
    if not account:
        raise AccountNotFoundError("Payment account not found or not in your branch.")

    clean_reason = (reason or "Archived by manager").strip()
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET status = 'archived', archive_reason = %s, updated_at = NOW()
            WHERE credentials_id = %s
            """,
            [clean_reason, credentials_id],
        )
    return {"success": True, "message": "Payment account archived successfully."}


def restore_employee_payment_account(credentials_id: int, warehouse_profile_ids) -> dict:
    account = get_warehouse_employee_payment_account_detail(credentials_id, warehouse_profile_ids)
    if not account:
        raise AccountNotFoundError("Payment account not found or not in your branch.")

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET status = 'active', archive_reason = NULL, updated_at = NOW()
            WHERE credentials_id = %s
            """,
            [credentials_id],
        )
    return {"success": True, "message": "Payment account restored successfully."}


def reveal_employee_account_number(credentials_id: int, warehouse_profile_ids) -> str:
    account = get_warehouse_employee_payment_account_detail(credentials_id, warehouse_profile_ids)
    if not account:
        raise AccountNotFoundError("Payment account not found or not in your branch.")

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT account_number FROM warehouse_employee_online_transaction_credentials WHERE credentials_id = %s LIMIT 1",
            [credentials_id],
        )
        row = cursor.fetchone()
    if not row or not row[0]:
        raise AccountNotFoundError("Account number record not found.")
    return row[0]
