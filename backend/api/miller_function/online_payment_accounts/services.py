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
    get_branch_payment_account_detail,
    get_employee_payment_account_detail,
    get_manager_user_info,
)

logger = logging.getLogger(__name__)

# Config
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_RESEND_COOLDOWN_SECONDS = 60  # 60-second cooldown
OTP_MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
JWT_SECRET = getattr(settings, "JWT_SECRET", settings.SECRET_KEY)
ACTION_TOKEN_SALT = "grainrise_miller_action_auth_salt"
ACTION_TOKEN_MAX_AGE = 300  # 5 minutes


# ============================================================
# CUSTOM EXCEPTIONS
# ============================================================

class PaymentSecurityError(Exception):
    """Base exception for payment security operations."""
    pass

class PaymentSecurityEmailError(PaymentSecurityError):
    """Raised when OTP email delivery fails."""
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
# OTP & ACTION CACHE HELPERS (CROSS-WORKER SHARED)
# ============================================================

def _get_security_cache():
    """
    Return a shared cache backend.
    If settings.CACHES['default'] uses LocMemCache (which is process-local),
    we use FileBasedCache so that multiple worker processes (e.g. on Render)
    reliably share OTP tokens, attempt counters, and cooldowns.
    """
    default_backend = getattr(settings, "CACHES", {}).get("default", {}).get("BACKEND", "")
    if "locmem" in default_backend.lower():
        cache_dir = os.path.join(tempfile.gettempdir(), "grainrise_payment_security_cache")
        try:
            os.makedirs(cache_dir, exist_ok=True)
            return FileBasedCache(cache_dir, {"TIMEOUT": OTP_EXPIRY_SECONDS})
        except Exception as exc:
            logger.warning("Could not initialize FileBasedCache at %s: %s. Falling back to default cache.", cache_dir, exc)
    return cache


# ============================================================
# ACTION AUTHORIZATION TOKEN HELPERS
# ============================================================

def issue_action_auth_token(user_id: int, action: str, account_id: any) -> str:
    """
    Issue a cryptographically signed, single-use, short-lived authorization token
    scoped strictly to user_id, action, and account_id.
    """
    payload = {
        "user_id": int(user_id),
        "action": str(action),
        "account_id": str(account_id),
        "nonce": str(uuid.uuid4()),
        "ts": time.time(),
    }
    return signing.dumps(payload, salt=ACTION_TOKEN_SALT)


def consume_action_auth_token(token: str, user_id: int, action: str, account_id: any) -> None:
    """
    Validate and consume a single-use action authorization token.
    Raises InvalidPasswordError on any tampering, expiration, scope mismatch, or replay.
    """
    if not token or not isinstance(token, str):
        raise InvalidPasswordError("Action authorization token is required.")

    try:
        payload = signing.loads(token, salt=ACTION_TOKEN_SALT, max_age=ACTION_TOKEN_MAX_AGE)
    except signing.SignatureExpired:
        raise InvalidPasswordError("Authorization has expired. Please re-enter your security password.")
    except (signing.BadSignature, Exception):
        raise InvalidPasswordError("Invalid authorization token. Please re-enter your security password.")

    if int(payload.get("user_id", 0)) != int(user_id):
        raise InvalidPasswordError("Authorization user mismatch.")

    if str(payload.get("action", "")) != str(action):
        raise InvalidPasswordError("Authorization action mismatch.")

    if str(payload.get("account_id", "")) != str(account_id):
        raise InvalidPasswordError("Authorization account mismatch.")

    nonce = payload.get("nonce")
    if not nonce:
        raise InvalidPasswordError("Malformed authorization token.")

    sec_cache = _get_security_cache()
    cache_key = f"consumed_action_token_{nonce}"
    if sec_cache.get(cache_key):
        raise InvalidPasswordError("This authorization has already been used. Please re-enter your security password.")

    sec_cache.set(cache_key, True, timeout=ACTION_TOKEN_MAX_AGE)


def _authenticate_action(user_id: int, action: str, account_id: int, password: str = None, auth_token: str = None) -> bool:
    """
    Authenticate sensitive operations via either single-use action auth_token
    or directly via plain Payment Security Password.
    """
    if auth_token:
        consume_action_auth_token(auth_token, user_id=user_id, action=action, account_id=account_id)
        return True
    if password:
        return verify_security_password(user_id, password)
    raise InvalidPasswordError("Payment security password or authorization token is required.")


def _otp_key(user_id: int, purpose: str) -> str:
    return f"pay_sec_otp:{purpose}:{user_id}"

def _attempts_key(user_id: int, purpose: str) -> str:
    return f"pay_sec_attempts:{purpose}:{user_id}"

def _cooldown_key(user_id: int, purpose: str) -> str:
    return f"pay_sec_cooldown:{purpose}:{user_id}"

def _hash_otp(user_id: int, email: str, otp: str, purpose: str) -> str:
    raw = f"{user_id}:{email.strip().lower()}:{purpose}:{otp}"
    return hmac.new(JWT_SECRET.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()


def send_payment_security_otp(user_id: int, email: str, recipient_name: str, purpose: str) -> dict:
    """
    Generate and send a 6-digit OTP to the Manager's registered email.
    Enforces 60-second cooldown, 5-minute expiry, and hashes plain OTP in cache.
    CRITICAL: OTP and cooldown are stored in cache ONLY AFTER successful email delivery.
    If sending fails, no active OTP/cooldown is left in cache.
    """
    if not email:
        raise AccountValidationError("User does not have a registered email address.")

    clean_email = email.strip().lower()
    sec_cache = _get_security_cache()
    cooldown_k = _cooldown_key(user_id, purpose)

    if sec_cache.get(cooldown_k):
        raise OtpCooldownError(
            f"Please wait before requesting another verification code (cooldown {OTP_RESEND_COOLDOWN_SECONDS}s)."
        )

    # Generate 6-digit OTP
    otp = f"{secrets.randbelow(1000000):06d}"
    otp_k = _otp_key(user_id, purpose)
    att_k = _attempts_key(user_id, purpose)

    # Compose Branded Email
    purpose_label = "Payment Security Setup" if purpose == "payment_security_setup" else "Payment Security Password Reset"
    subject = f"GrainRise — {purpose_label} Verification Code"
    greeting = f"Hello {recipient_name}," if recipient_name else "Hello Miller Manager,"

    text_body = (
        f"{greeting}\n\n"
        f"Your verification code for {purpose_label} is: {otp}\n\n"
        f"This code will expire in 5 minutes. Do not share this code with anyone.\n\n"
        f"If you did not make this request, please review your account security immediately.\n\n"
        f"GrainRise Security Team"
    )

    html_body = f"""
    <div style="max-width: 560px; margin: 0 auto; padding: 24px; font-family: Arial, sans-serif; color: #1f2937;">
        <h2 style="color: #08511f; margin-bottom: 4px;">GrainRise</h2>
        <h3 style="color: #1e293b; margin-top: 0;">{purpose_label}</h3>
        <p>{greeting}</p>
        <p>Use the 6-digit verification code below to authorize your payment security password action.</p>
        <div style="margin: 24px 0; padding: 18px; background: #f0f8f2; border: 1px solid #cce5d1; border-radius: 12px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #08511f;">
            {otp}
        </div>
        <p style="font-size: 13px; color: #64748b;">
            This code expires in <strong>5 minutes</strong> and can only be used once. Never share this code with anyone.
        </p>
        <p style="font-size: 13px; color: #64748b;">
            If you did not request this verification code, please ensure your account credentials are secure.
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">GrainRise Miller Management System</p>
    </div>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[clean_email],
        )
        msg.attach_alternative(html_body, "text/html")
        sent_count = msg.send(fail_silently=False)
        if sent_count == 0:
            raise PaymentSecurityEmailError("Email delivery returned zero recipients.")
    except Exception as exc:
        logger.exception("Failed to send payment security OTP to %s: %s", clean_email, exc)
        # Clean any stale keys to allow immediate retry
        sec_cache.delete(otp_k)
        sec_cache.delete(att_k)
        sec_cache.delete(cooldown_k)
        raise PaymentSecurityEmailError(
            "Unable to deliver verification email to your registered email address. Please check your network connection and try again."
        ) from exc

    # Store hashed OTP and activate cooldown ONLY AFTER successful email send
    hashed_otp = _hash_otp(user_id, clean_email, otp, purpose)
    sec_cache.set(otp_k, hashed_otp, timeout=OTP_EXPIRY_SECONDS)
    sec_cache.set(att_k, 0, timeout=OTP_EXPIRY_SECONDS)
    sec_cache.set(cooldown_k, True, timeout=OTP_RESEND_COOLDOWN_SECONDS)

    return {
        "sent": True,
        "retry_after": OTP_RESEND_COOLDOWN_SECONDS,
        "expires_in": OTP_EXPIRY_SECONDS,
    }


def verify_payment_security_otp(user_id: int, email: str, incoming_otp: str, purpose: str) -> bool:
    """
    Verify the 6-digit OTP. Enforces max 5 attempts and single-use deletion upon success.
    """
    if not incoming_otp or not email:
        raise OtpExpiredOrInvalidError("Verification code and email are required.")

    clean_email = email.strip().lower()
    sec_cache = _get_security_cache()
    otp_k = _otp_key(user_id, purpose)
    att_k = _attempts_key(user_id, purpose)

    stored_hash = sec_cache.get(otp_k)
    if not stored_hash:
        raise OtpExpiredOrInvalidError("Verification code has expired or was not requested. Please request a new code.")

    attempts = int(sec_cache.get(att_k, 0))
    if attempts >= OTP_MAX_ATTEMPTS:
        sec_cache.delete(otp_k)
        sec_cache.delete(att_k)
        raise OtpExpiredOrInvalidError("Too many failed attempts. This code is invalidated. Please request a new code.")

    incoming_hash = _hash_otp(user_id, clean_email, str(incoming_otp).strip(), purpose)
    is_valid = hmac.compare_digest(stored_hash, incoming_hash)

    if not is_valid:
        new_attempts = attempts + 1
        sec_cache.set(att_k, new_attempts, timeout=OTP_EXPIRY_SECONDS)
        remaining = max(0, OTP_MAX_ATTEMPTS - new_attempts)
        if remaining == 0:
            sec_cache.delete(otp_k)
            sec_cache.delete(att_k)
            raise OtpExpiredOrInvalidError("Incorrect verification code. Maximum attempts reached. Please request a new code.")
        raise OtpExpiredOrInvalidError(f"Incorrect verification code. {remaining} attempt(s) remaining.")

    # Successful: delete OTP immediately (single-use)
    sec_cache.delete(otp_k)
    sec_cache.delete(att_k)
    return True


# ============================================================
# PAYMENT SECURITY PASSWORD MANAGEMENT
# ============================================================

def send_first_time_setup_otp(user_id: int) -> dict:
    """
    Send OTP for first-time Payment Security Password configuration.
    """
    # 1. Check if security password already exists
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT security_id FROM miller_payment_account_security WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        if cursor.fetchone():
            raise SecurityAlreadyConfiguredError("Payment security password has already been configured for this account.")

    # 2. Get user info
    user_info = get_manager_user_info(user_id)
    if not user_info.get("email"):
        raise AccountValidationError("User does not have an active registered email address.")

    res = send_payment_security_otp(
        user_id=user_id,
        email=user_info["email"],
        recipient_name=user_info["full_name"],
        purpose="payment_security_setup",
    )
    res["masked_email"] = user_info["masked_email"]
    return res


def setup_security_password(user_id: int, otp: str, new_password: str, confirm_password: str) -> dict:
    """
    Configure the initial Payment Security Password for the Manager.
    ONE password applies to ALL branches owned by this user.
    """
    # 1. Check already configured
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT security_id FROM miller_payment_account_security WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        if cursor.fetchone():
            raise SecurityAlreadyConfiguredError("Payment security password is already set up.")

    # 2. Validate passwords
    if not new_password or not confirm_password:
        raise AccountValidationError("New password and confirm password are required.")
    if new_password != confirm_password:
        raise AccountValidationError("New password and confirmation password do not match.")
    if len(new_password) < 12:
        raise AccountValidationError("Payment security password must be at least 12 characters long.")

    # 3. Check against login password
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT password_hash, email FROM users WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        u_row = cursor.fetchone()
        if not u_row:
            raise AccountValidationError("Manager account not found.")
        login_hash, email = u_row

    if login_hash and check_password(new_password, login_hash):
        raise AccountValidationError("Payment security password cannot be identical to your GrainRise login password.")

    # 4. Verify OTP
    verify_payment_security_otp(
        user_id=user_id,
        email=email,
        incoming_otp=otp,
        purpose="payment_security_setup",
    )

    # 5. Fetch representative supplier_profile_id (earliest branch owned by manager)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT supplier_profile_id
            FROM supplier_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC, supplier_profile_id ASC
            LIMIT 1
            """,
            [user_id],
        )
        sp_row = cursor.fetchone()
        if not sp_row:
            raise AccountValidationError("Cannot setup payment security: no branch profile found for this Manager.")
        rep_supplier_profile_id = sp_row[0]

    # 6. Insert security record atomically
    hashed = make_password(new_password)
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO miller_payment_account_security (
                    supplier_profile_id,
                    user_id,
                    password_hash,
                    failed_attempts,
                    locked_until,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, 0, NULL, NOW(), NOW())
                """,
                [rep_supplier_profile_id, user_id, hashed],
            )

    return {
        "success": True,
        "message": "Payment security password configured successfully. You may now manage online payment accounts.",
    }


def verify_security_password(user_id: int, plain_password: str) -> bool:
    """
    Authenticate the Manager's Payment Security Password.
    Enforces lockout after 5 failed attempts (15-minute lock).
    """
    if not plain_password:
        raise InvalidPasswordError("Payment security password is required.")

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT security_id, password_hash, failed_attempts, locked_until
            FROM miller_payment_account_security
            WHERE user_id = %s
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()

    if not row:
        raise SecurityNotConfiguredError(
            "Payment security password has not been configured. Please complete setup first."
        )

    sec_id, stored_hash, failed_attempts, locked_until = row
    failed_attempts = int(failed_attempts or 0)
    now_dt = datetime.now()

    # Check lockout
    if locked_until:
        if hasattr(locked_until, "tzinfo") and locked_until.tzinfo:
            now_dt = datetime.now(timezone.utc)
        if locked_until > now_dt:
            mins_left = max(1, int((locked_until - now_dt).total_seconds() // 60) + 1)
            raise SecurityLockedError(
                f"Payment security is temporarily locked due to multiple failed attempts. Try again in {mins_left} minute(s)."
            )
        else:
            # Lock has expired, reset
            failed_attempts = 0
            with connection.cursor() as cursor:
                cursor.execute(
                    "UPDATE miller_payment_account_security SET failed_attempts = 0, locked_until = NULL WHERE security_id = %s",
                    [sec_id],
                )

    # Test password
    if not check_password(plain_password, stored_hash):
        new_attempts = failed_attempts + 1
        with connection.cursor() as cursor:
            if new_attempts >= OTP_MAX_ATTEMPTS:
                lock_time = datetime.now() + timedelta(minutes=LOCKOUT_MINUTES)
                cursor.execute(
                    "UPDATE miller_payment_account_security SET failed_attempts = %s, locked_until = %s WHERE security_id = %s",
                    [new_attempts, lock_time, sec_id],
                )
                raise SecurityLockedError(
                    f"Incorrect password. Payment security is now locked for {LOCKOUT_MINUTES} minutes."
                )
            else:
                cursor.execute(
                    "UPDATE miller_payment_account_security SET failed_attempts = %s WHERE security_id = %s",
                    [new_attempts, sec_id],
                )
                remaining = OTP_MAX_ATTEMPTS - new_attempts
                raise InvalidPasswordError(
                    f"Incorrect payment security password. {remaining} attempt(s) remaining."
                )

    # Password correct: reset failed attempts
    if failed_attempts > 0 or locked_until:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE miller_payment_account_security SET failed_attempts = 0, locked_until = NULL WHERE security_id = %s",
                [sec_id],
            )

    return True


def send_forgot_security_password_otp(user_id: int) -> dict:
    """
    Send OTP to reset forgotten Payment Security Password.
    """
    # 1. Check security record exists
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT security_id, locked_until FROM miller_payment_account_security WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        row = cursor.fetchone()
        if not row:
            raise SecurityNotConfiguredError("Payment security password is not configured.")
        sec_id, locked_until = row

    if locked_until:
        now_dt = datetime.now()
        if hasattr(locked_until, "tzinfo") and locked_until.tzinfo:
            now_dt = datetime.now(timezone.utc)
        if locked_until > now_dt:
            mins_left = max(1, int((locked_until - now_dt).total_seconds() // 60) + 1)
            raise SecurityLockedError(
                f"Payment security is temporarily locked. Please wait {mins_left} minute(s) before requesting a reset."
            )

    user_info = get_manager_user_info(user_id)
    if not user_info.get("email"):
        raise AccountValidationError("User email not found.")

    res = send_payment_security_otp(
        user_id=user_id,
        email=user_info["email"],
        recipient_name=user_info["full_name"],
        purpose="payment_security_forgot",
    )
    res["masked_email"] = user_info["masked_email"]
    return res


def reset_security_password(user_id: int, otp: str, new_password: str, confirm_password: str) -> dict:
    """
    Reset Payment Security Password using verified OTP.
    Sends confirmation email and unlocks the security record.
    """
    # 1. Check record exists
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT security_id FROM miller_payment_account_security WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        row = cursor.fetchone()
        if not row:
            raise SecurityNotConfiguredError("Payment security password is not configured.")
        sec_id = row[0]

    # 2. Validate passwords
    if not new_password or not confirm_password:
        raise AccountValidationError("New password and confirm password are required.")
    if new_password != confirm_password:
        raise AccountValidationError("New password and confirmation password do not match.")
    if len(new_password) < 12:
        raise AccountValidationError("Payment security password must be at least 12 characters long.")

    # 3. Check against login password
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT password_hash, email, first_name FROM users WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        u_row = cursor.fetchone()
        if not u_row:
            raise AccountValidationError("Manager account not found.")
        login_hash, email, first_name = u_row

    if login_hash and check_password(new_password, login_hash):
        raise AccountValidationError("Payment security password cannot be identical to your GrainRise login password.")

    # 4. Verify OTP
    verify_payment_security_otp(
        user_id=user_id,
        email=email,
        incoming_otp=otp,
        purpose="payment_security_forgot",
    )

    # 5. Update security record
    new_hash = make_password(new_password)
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_payment_account_security
                SET password_hash = %s, failed_attempts = 0, locked_until = NULL, updated_at = NOW()
                WHERE security_id = %s
                """,
                [new_hash, sec_id],
            )

    # 6. Send password reset notification email
    try:
        greeting = f"Hello {first_name}," if first_name else "Hello Miller Manager,"
        msg = EmailMultiAlternatives(
            subject="GrainRise — Payment Security Password Changed",
            body=(
                f"{greeting}\n\n"
                f"Your GrainRise Payment Security Password has been successfully changed.\n\n"
                f"If you did not perform this change, please contact support and secure your account immediately.\n\n"
                f"GrainRise Security Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email],
        )
        msg.send(fail_silently=True)
    except Exception as exc:
        logger.warning("Failed to send password-reset confirmation email: %s", exc)

    return {
        "success": True,
        "message": "Payment security password has been reset successfully.",
    }


# ============================================================
# BRANCH ONLINE PAYMENT ACCOUNT SERVICES
# ============================================================

def check_duplicate_payment_account(
    user_id: int,
    account_type: str,
    account_number: str,
    bank_name: str = None,
    exclude_id: int = None,
) -> dict:
    """
    Check if a GCash or Bank payment account already exists across any of the
    Miller Manager's authorized branches (active or archived).
    Matches Type + Bank/Platform + Account Number (ignoring formatting differences).
    """
    clean_type = str(account_type or "").strip().lower()
    if clean_type not in ("gcash", "bank"):
        return {"is_duplicate": False}

    raw_num = str(account_number or "").strip()
    if clean_type == "gcash":
        clean_num = re.sub(r"\D", "", raw_num)
        if len(clean_num) != 11 or not clean_num.startswith("09"):
            return {"is_duplicate": False}
        clean_bank = None
    else:
        clean_num = re.sub(r"[\s\-\.]", "", raw_num)
        if len(clean_num) < 6:
            return {"is_duplicate": False}
        clean_bank = str(bank_name or "").strip()
        if not clean_bank:
            return {"is_duplicate": False}

    with connection.cursor() as cursor:
        exclude_clause = ""
        params = [user_id]
        if exclude_id is not None:
            try:
                ex_id = int(exclude_id)
                exclude_clause = " AND c.credentials_id != %s"
                params.append(ex_id)
            except (ValueError, TypeError):
                pass

        params.append(user_id)
        params.extend([clean_type, clean_num])

        bank_clause = ""
        if clean_type == "bank":
            bank_clause = " AND (LOWER(TRIM(COALESCE(combined.bank_name, combined.platform_name, %s))) = LOWER(TRIM(%s)))"
            params.extend(["", clean_bank])

        query = f"""
            SELECT credentials_id, business_name, account_name, status
            FROM (
                SELECT c.credentials_id, sp.business_name, c.account_name, c.status, c.type, c.bank_name, c.platform_name, c.account_number
                FROM miller_online_transaction_credentials c
                JOIN supplier_profiles sp ON c.supplier_profile_id = sp.supplier_profile_id
                WHERE sp.user_id = %s {exclude_clause}
                UNION ALL
                SELECT c.credentials_id, sp.business_name, c.account_name, c.status, c.type, c.bank_name, c.platform_name, c.account_number
                FROM miller_employee_online_transaction_credentials c
                JOIN supplier_profiles sp ON c.supplier_profile_id = sp.supplier_profile_id
                WHERE sp.user_id = %s
            ) combined
            WHERE LOWER(combined.type) = %s
              AND REPLACE(REPLACE(REPLACE(combined.account_number, ' ', ''), '-', ''), '.', '') = %s
              {bank_clause}
            LIMIT 1
        """
        cursor.execute(query, params)
        row = cursor.fetchone()

    if row:
        return {
            "is_duplicate": True,
            "message": "This payment account is already registered in GRAINRISE.",
            "existing": {
                "credentials_id": row[0],
                "branch_name": row[1],
                "account_name": row[2],
                "status": row[3],
            },
        }

    return {"is_duplicate": False}


def validate_account_fields(acc_type: str, data: dict) -> dict:
    """
    Validate and normalize input fields for an online payment account.
    """
    clean_type = str(acc_type or data.get("account_type") or data.get("type") or "").strip().lower()
    if clean_type not in ("gcash", "bank"):
        raise AccountValidationError("Account type must be either 'GCash' or 'Bank'.")

    account_name = str(data.get("account_name", "")).strip()
    if not account_name:
        raise AccountValidationError("Account Name is required.")
    if len(account_name) > 60:
        raise AccountValidationError("Account Name cannot exceed 60 characters.")

    account_number = str(data.get("account_number", "")).strip()
    if not account_number:
        raise AccountValidationError("Account Number is required.")

    if clean_type == "gcash":
        # Strictly enforce exactly 11 numeric digits starting with 09; prevent letters, symbols, and excess input
        if not account_number.isdigit():
            raise AccountValidationError("GCash account number must contain only numeric digits.")
        if not re.fullmatch(r"09\d{9}", account_number):
            raise AccountValidationError("GCash account number must be exactly 11 numeric digits starting with 09.")
        return {
            "type": "gcash",
            "account_name": account_name,
            "account_number": account_number,
            "platform_name": "GCash",
            "bank_name": None,
            "card_expiry": None,
            "card_last4": None,
        }
    else:
        bank_name = str(data.get("bank_name", "")).strip()
        if not bank_name:
            raise AccountValidationError("Bank Name is required for Bank accounts.")
        if len(bank_name) > 100:
            raise AccountValidationError("Bank Name cannot exceed 100 characters.")

        # Account number: 8 to 20 digits/characters, spaces and dashes removed
        clean_acc_num = re.sub(r"[\s\-]", "", account_number)
        if len(clean_acc_num) < 6 or len(clean_acc_num) > 30:
            raise AccountValidationError("Bank account number must be between 6 and 30 characters.")

        card_expiry = str(data.get("card_expiry", "")).strip() or None
        if card_expiry:
            card_expiry = card_expiry.replace(" ", "")
            if not re.match(r"^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$", card_expiry):
                raise AccountValidationError("Card expiry must be in MM/YY or MM/YYYY format (e.g. 12/28).")

        card_last4 = str(data.get("card_last4", "")).strip() or None
        if card_last4:
            if not (len(card_last4) == 4 and card_last4.isdigit()):
                raise AccountValidationError("Card's last four digits must be exactly 4 numeric digits.")

        return {
            "type": "bank",
            "account_name": account_name,
            "account_number": clean_acc_num,
            "platform_name": bank_name,
            "bank_name": bank_name,
            "card_expiry": card_expiry,
            "card_last4": card_last4,
        }


def create_branch_payment_account(user_id: int, data: dict) -> dict:
    """
    Create a new Branch Online Payment Account.
    Enforces Manager branch ownership, duplicate checks, and always sets verification_status='unverified'.
    """
    raw_sp_id = data.get("supplier_profile_id")
    if not raw_sp_id:
        raise AccountValidationError("Please select a branch.")
    try:
        sp_id = int(raw_sp_id)
    except (ValueError, TypeError):
        raise AccountValidationError("Invalid branch selected.")

    # Validate branch ownership
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT supplier_profile_id, business_name FROM supplier_profiles WHERE supplier_profile_id = %s AND user_id = %s LIMIT 1",
            [sp_id, user_id],
        )
        sp_row = cursor.fetchone()
        if not sp_row:
            raise AccountValidationError("Selected branch does not belong to your authorized accounts.")
        branch_name = sp_row[1]

    # Validate fields
    validated = validate_account_fields(data.get("type"), data)

    # Duplicate check across Manager's authorized branches (active and archived)
    dup = check_duplicate_payment_account(
        user_id=user_id,
        account_type=validated["type"],
        account_number=validated["account_number"],
        bank_name=validated.get("bank_name"),
    )
    if dup.get("is_duplicate"):
        raise DuplicateAccountError("This payment account is already registered in GRAINRISE.")

    # Insert atomically with IntegrityError protection against race conditions
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO miller_online_transaction_credentials (
                        supplier_profile_id,
                        type,
                        platform_name,
                        bank_name,
                        account_number,
                        account_name,
                        card_expiry,
                        card_last4,
                        provider_name,
                        provider_account_id,
                        verification_status,
                        is_default,
                        status,
                        archive_reason,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, NULL, NULL, 'unverified', 0, 'active', NULL, NOW(), NOW()
                    )
                    """,
                    [
                        sp_id,
                        validated["type"],
                        validated["platform_name"],
                        validated["bank_name"],
                        validated["account_number"],
                        validated["account_name"],
                        validated["card_expiry"],
                        validated["card_last4"],
                    ],
                )
                created_id = cursor.lastrowid
    except IntegrityError:
        raise DuplicateAccountError("This payment account is already registered in GRAINRISE.")

    return {
        "credentials_id": created_id,
        "supplier_profile_id": sp_id,
        "branch_name": branch_name,
        "account_name": validated["account_name"],
        "type": validated["type"],
        "verification_status": "unverified",
        "status": "active",
    }


def update_branch_payment_account(user_id: int, credentials_id: int, data: dict, password: str = None, auth_token: str = None) -> dict:
    """
    Update an existing Branch Online Payment Account.
    Requires server-side Payment Security Password verification or action auth token.
    Resets verification_status to 'unverified' if identifying details change.
    """
    # 1. Authorize action
    token_to_use = auth_token or data.get("auth_token")
    _authenticate_action(user_id, "edit_branch_account", credentials_id, password=password, auth_token=token_to_use)

    # 2. Verify account exists and belongs to Manager
    existing = get_branch_payment_account_detail(user_id, credentials_id, include_unmasked=True)
    if not existing:
        raise AccountNotFoundError("Account record not found or does not belong to your branches.")

    # 3. Validate new fields
    new_type = data.get("account_type") or data.get("type") or existing["type"]
    if not data.get("account_number") and existing.get("account_number"):
        data = {**data, "account_number": existing["account_number"]}
    if not data.get("bank_name") and existing.get("bank_name"):
        data = {**data, "bank_name": existing["bank_name"]}
    validated = validate_account_fields(new_type, data)

    # Check duplicate across Manager's authorized branches if identifying details changed
    if (
        validated["account_number"] != existing["account_number"]
        or validated["type"] != existing["type"]
        or validated.get("bank_name") != existing.get("bank_name")
    ):
        dup = check_duplicate_payment_account(
            user_id=user_id,
            account_type=validated["type"],
            account_number=validated["account_number"],
            bank_name=validated.get("bank_name"),
            exclude_id=credentials_id,
        )
        if dup.get("is_duplicate"):
            raise DuplicateAccountError("This payment account is already registered in GRAINRISE.")

    # 4. Check if identifying details changed -> reset to unverified
    details_changed = (
        validated["account_number"] != existing["account_number"]
        or validated["type"] != existing["type"]
        or validated["bank_name"] != existing["bank_name"]
        or validated["account_name"].strip().lower() != existing["account_name"].strip().lower()
    )

    new_verif_status = "unverified" if details_changed else existing["verification_status"]

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_online_transaction_credentials
                    SET type = %s,
                        platform_name = %s,
                        bank_name = %s,
                        account_number = %s,
                        account_name = %s,
                        card_expiry = %s,
                        card_last4 = %s,
                        verification_status = %s,
                        updated_at = NOW()
                    WHERE credentials_id = %s
                    """,
                    [
                        validated["type"],
                        validated["platform_name"],
                        validated["bank_name"],
                        validated["account_number"],
                        validated["account_name"],
                        validated["card_expiry"],
                        validated["card_last4"],
                        new_verif_status,
                        credentials_id,
                    ],
                )
    except IntegrityError:
        raise DuplicateAccountError("This payment account is already registered in GRAINRISE.")

    return {
        "credentials_id": credentials_id,
        "verification_status": new_verif_status,
        "message": "Account details updated successfully.",
    }


def archive_branch_payment_account(user_id: int, credentials_id: int, archive_reason: str, password: str = None, auth_token: str = None) -> dict:
    """
    Archive a Branch Online Payment Account.
    Requires Payment Security Password or action auth token, and mandatory archive reason.
    Unsets default flag if active.
    """
    _authenticate_action(user_id, "archive_branch_account", credentials_id, password=password, auth_token=auth_token)

    reason = str(archive_reason or "").strip()
    if not reason:
        raise AccountValidationError("Archive reason is required.")
    if len(reason) < 3:
        raise AccountValidationError("Please provide a detailed archive reason (minimum 3 characters).")

    existing = get_branch_payment_account_detail(user_id, credentials_id)
    if not existing:
        raise AccountNotFoundError("Account record not found.")

    if existing["status"] == "archived":
        raise AccountValidationError("Account is already archived.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_online_transaction_credentials
                SET status = 'archived', archive_reason = %s, is_default = 0, updated_at = NOW()
                WHERE credentials_id = %s
                """,
                [reason, credentials_id],
            )

    return {
        "credentials_id": credentials_id,
        "status": "archived",
        "message": "Branch payment account archived successfully.",
    }


def restore_branch_payment_account(user_id: int, credentials_id: int, password: str = None, auth_token: str = None) -> dict:
    """
    Restore an archived Branch Online Payment Account.
    Requires Payment Security Password or action auth token.
    Clears archive_reason; does NOT automatically mark verified.
    """
    _authenticate_action(user_id, "restore_branch_account", credentials_id, password=password, auth_token=auth_token)

    existing = get_branch_payment_account_detail(user_id, credentials_id)
    if not existing:
        raise AccountNotFoundError("Account record not found.")

    if existing["status"] == "active":
        raise AccountValidationError("Account is already active.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_online_transaction_credentials
                SET status = 'active', archive_reason = NULL, updated_at = NOW()
                WHERE credentials_id = %s
                """,
                [credentials_id],
            )

    return {
        "credentials_id": credentials_id,
        "status": "active",
        "message": "Branch payment account restored successfully.",
    }


def reveal_branch_account_number(user_id: int, credentials_id: int, password: str = None, auth_token: str = None) -> dict:
    """
    Reveal the full, unmasked account number for a Branch Account.
    Requires Payment Security Password or action auth token.
    """
    _authenticate_action(user_id, "reveal_branch_account", credentials_id, password=password, auth_token=auth_token)

    existing = get_branch_payment_account_detail(user_id, credentials_id, include_unmasked=True)
    if not existing:
        raise AccountNotFoundError("Account record not found.")

    return {
        "credentials_id": credentials_id,
        "account_number": existing["account_number"],
    }


# ============================================================
# EMPLOYEE ONLINE PAYMENT ACCOUNT SERVICES
# ============================================================

def archive_employee_payment_account(user_id: int, credentials_id: int, archive_reason: str, password: str = None, auth_token: str = None) -> dict:
    """
    Archive an Employee Online Payment Account.
    Requires Payment Security Password or action auth token, and mandatory archive reason.
    """
    _authenticate_action(user_id, "archive_employee_account", credentials_id, password=password, auth_token=auth_token)

    reason = str(archive_reason or "").strip()
    if not reason:
        raise AccountValidationError("Archive reason is required.")
    if len(reason) < 3:
        raise AccountValidationError("Please provide a detailed archive reason (minimum 3 characters).")

    existing = get_employee_payment_account_detail(user_id, credentials_id)
    if not existing:
        raise AccountNotFoundError("Employee account record not found.")

    if existing["status"] == "archived":
        raise AccountValidationError("Employee account is already archived.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_employee_online_transaction_credentials
                SET status = 'archived', archive_reason = %s, is_default = 0, updated_at = NOW()
                WHERE credentials_id = %s
                """,
                [reason, credentials_id],
            )

    return {
        "credentials_id": credentials_id,
        "status": "archived",
        "message": "Employee payment account archived successfully.",
    }


def restore_employee_payment_account(user_id: int, credentials_id: int, password: str = None, auth_token: str = None) -> dict:
    """
    Restore an archived Employee Online Payment Account.
    Requires Payment Security Password or action auth token.
    """
    _authenticate_action(user_id, "restore_employee_account", credentials_id, password=password, auth_token=auth_token)

    existing = get_employee_payment_account_detail(user_id, credentials_id)
    if not existing:
        raise AccountNotFoundError("Employee account record not found.")

    if existing["status"] == "active":
        raise AccountValidationError("Employee account is already active.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_employee_online_transaction_credentials
                SET status = 'active', archive_reason = NULL, updated_at = NOW()
                WHERE credentials_id = %s
                """,
                [credentials_id],
            )

    return {
        "credentials_id": credentials_id,
        "status": "active",
        "message": "Employee payment account restored successfully.",
    }


def reveal_employee_account_number(user_id: int, credentials_id: int, password: str = None, auth_token: str = None) -> dict:
    """
    Reveal the full, unmasked account number for an Employee Account.
    Requires Payment Security Password or action auth token.
    """
    _authenticate_action(user_id, "reveal_employee_account", credentials_id, password=password, auth_token=auth_token)

    existing = get_employee_payment_account_detail(user_id, credentials_id, include_unmasked=True)
    if not existing:
        raise AccountNotFoundError("Employee account record not found.")

    return {
        "credentials_id": credentials_id,
        "account_number": existing["account_number"],
    }

