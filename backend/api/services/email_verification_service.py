import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from .email_sender import send_grainrise_email


# ============================================================
# CONFIG
# ============================================================

JWT_SECRET = (
    os.getenv("JWT_SECRET")
    or settings.SECRET_KEY
)

JWT_ALGORITHM = "HS256"

OTP_LENGTH = 6
OTP_EXPIRY_SECONDS = 10 * 60
OTP_RESEND_SECONDS = 60
OTP_MAX_ATTEMPTS = 5

VERIFICATION_TOKEN_EXPIRY_MINUTES = 15


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_email(email):
    return (
        str(email or "")
        .strip()
        .lower()
    )


def normalize_purpose(purpose):
    return (
        str(purpose or "verification")
        .strip()
        .lower()
        .replace(" ", "_")
    )


# ============================================================
# CACHE KEYS
# ============================================================

def _otp_key(email, purpose):
    return (
        f"email_otp:"
        f"{normalize_purpose(purpose)}:"
        f"{normalize_email(email)}"
    )


def _attempts_key(email, purpose):
    return (
        f"email_otp_attempts:"
        f"{normalize_purpose(purpose)}:"
        f"{normalize_email(email)}"
    )


def _cooldown_key(email, purpose):
    return (
        f"email_otp_cooldown:"
        f"{normalize_purpose(purpose)}:"
        f"{normalize_email(email)}"
    )


# ============================================================
# OTP HASH
# ============================================================

def _hash_otp(
    email,
    otp,
    purpose,
):

    raw = (
        f"{normalize_email(email)}:"
        f"{normalize_purpose(purpose)}:"
        f"{otp}"
    )

    return hmac.new(
        JWT_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ============================================================
# EMAIL CONTENT
# ============================================================

def _purpose_title(purpose):

    value = normalize_purpose(
        purpose
    )

    titles = {
        "registration":
            "Account Registration",

        "forgot_password":
            "Password Reset",

        "password_reset":
            "Password Reset",

        "email_change":
            "Email Change",

        "login_verification":
            "Login Verification",
    }

    return titles.get(
        value,
        "Email Verification",
    )


# ============================================================
# SEND OTP
# ============================================================

def send_email_otp(
    email,
    purpose="registration",
    recipient_name="",
):
    """
    Send a real 6-digit OTP using Django email settings.

    Reusable for any GrainRise account/process.

    Example:
        send_email_otp(
            "sample@gmail.com",
            purpose="registration"
        )

    Returns:
        {
            "sent": True,
            "retry_after": 60,
            "expires_in": 600
        }
    """

    normalized_email = (
        normalize_email(
            email
        )
    )

    normalized_purpose = (
        normalize_purpose(
            purpose
        )
    )


    if not normalized_email:

        raise ValueError(
            "Email address is required."
        )


    cooldown_key = (
        _cooldown_key(
            normalized_email,
            normalized_purpose,
        )
    )


    # --------------------------------------------------------
    # RESEND COOLDOWN
    # --------------------------------------------------------

    if cache.get(
        cooldown_key
    ):

        return {
            "sent": False,
            "retry_after":
                OTP_RESEND_SECONDS,

            "expires_in":
                OTP_EXPIRY_SECONDS,
        }


    # --------------------------------------------------------
    # GENERATE SECURE OTP
    # --------------------------------------------------------

    otp = (
        f"{secrets.randbelow(1000000):06d}"
    )


    purpose_title = (
        _purpose_title(
            normalized_purpose
        )
    )


    greeting = (
        f"Hello {recipient_name},"
        if recipient_name
        else "Hello,"
    )


    subject = (
        f"GrainRise {purpose_title} "
        "Verification Code"
    )


    text_message = (
        f"{greeting}\n\n"
        f"Your GrainRise verification code is:\n\n"
        f"{otp}\n\n"
        "This code expires in 10 minutes.\n"
        "Do not share this code with anyone.\n\n"
        "GrainRise"
    )


    html_message = f"""
    <div
        style="
            max-width: 560px;
            margin: 0 auto;
            padding: 24px;
            font-family: Arial, sans-serif;
            color: #1f2937;
        "
    >

        <h2
            style="
                color: #08511f;
                margin-bottom: 4px;
            "
        >
            GrainRise
        </h2>

        <h3>
            {purpose_title}
        </h3>

        <p>
            {greeting}
        </p>

        <p>
            Use the verification code below
            to continue.
        </p>

        <div
            style="
                margin: 24px 0;
                padding: 18px;
                background: #f0f8f2;
                border: 1px solid #cce5d1;
                border-radius: 12px;
                text-align: center;
                font-size: 32px;
                font-weight: 700;
                letter-spacing: 8px;
                color: #08511f;
            "
        >
            {otp}
        </div>

        <p>
            This code expires in
            <strong>10 minutes</strong>.
        </p>

        <p>
            Do not share this verification
            code with anyone.
        </p>

        <p>
            If you did not request this,
            you may safely ignore this email.
        </p>

        <hr
            style="
                border: none;
                border-top: 1px solid #e5e7eb;
                margin: 24px 0;
            "
        />

        <p
            style="
                color: #6b7280;
                font-size: 12px;
            "
        >
            GrainRise
        </p>

    </div>
    """


    email_message = (
        EmailMultiAlternatives(
            subject,
            text_message,
            settings.DEFAULT_FROM_EMAIL,
            [
                normalized_email
            ],
        )
    )


    email_message.attach_alternative(
        html_message,
        "text/html",
    )


    # --------------------------------------------------------
    # REAL SEND (GMAIL REST API HTTPS IN PROD, SMTP FALLBACK)
    # --------------------------------------------------------

    email_sent, email_err = send_grainrise_email(
        subject,
        text_message,
        html_message,
        normalized_email,
    )
    if not email_sent:
        raise RuntimeError(email_err or "Failed to send verification email.")



    # --------------------------------------------------------
    # STORE HASHED OTP
    # --------------------------------------------------------
    #
    # Important:
    # Plain OTP is never stored.
    # --------------------------------------------------------

    cache.set(
        _otp_key(
            normalized_email,
            normalized_purpose,
        ),

        _hash_otp(
            normalized_email,
            otp,
            normalized_purpose,
        ),

        timeout=
            OTP_EXPIRY_SECONDS,
    )


    cache.set(
        _attempts_key(
            normalized_email,
            normalized_purpose,
        ),

        0,

        timeout=
            OTP_EXPIRY_SECONDS,
    )


    cache.set(
        cooldown_key,
        True,
        timeout=
            OTP_RESEND_SECONDS,
    )


    return {
        "sent": True,

        "retry_after":
            OTP_RESEND_SECONDS,

        "expires_in":
            OTP_EXPIRY_SECONDS,
    }


# ============================================================
# VERIFY OTP
# ============================================================

def verify_email_otp(
    email,
    otp,
    purpose="registration",
):
    """
    Verify an OTP.

    Returns:
        True  = correct
        False = incorrect / expired
    """

    normalized_email = (
        normalize_email(
            email
        )
    )

    normalized_purpose = (
        normalize_purpose(
            purpose
        )
    )


    if (
        not normalized_email
        or not otp
    ):

        return False


    otp_key = (
        _otp_key(
            normalized_email,
            normalized_purpose,
        )
    )


    attempts_key = (
        _attempts_key(
            normalized_email,
            normalized_purpose,
        )
    )


    stored_hash = (
        cache.get(
            otp_key
        )
    )


    # Expired or nonexistent OTP
    if not stored_hash:

        return False


    attempts = int(
        cache.get(
            attempts_key,
            0,
        )
    )


    # --------------------------------------------------------
    # MAXIMUM ATTEMPTS
    # --------------------------------------------------------

    if attempts >= OTP_MAX_ATTEMPTS:

        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return False


    incoming_hash = (
        _hash_otp(
            normalized_email,
            otp,
            normalized_purpose,
        )
    )


    is_valid = (
        hmac.compare_digest(
            stored_hash,
            incoming_hash,
        )
    )


    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    if is_valid:

        # OTP is one-time-use only.

        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return True


    # --------------------------------------------------------
    # FAILED ATTEMPT
    # --------------------------------------------------------

    cache.set(
        attempts_key,
        attempts + 1,
        timeout=
            OTP_EXPIRY_SECONDS,
    )


    return False


# ============================================================
# EMAIL VERIFICATION TOKEN
# ============================================================

def create_email_verification_token(
    email,
    purpose="registration",
):
    """
    Generated AFTER successful OTP verification.

    The registration endpoint should require this token before
    creating the actual account.
    """

    normalized_email = (
        normalize_email(
            email
        )
    )

    normalized_purpose = (
        normalize_purpose(
            purpose
        )
    )


    now = datetime.now(
        timezone.utc
    )


    payload = {

        "email":
            normalized_email,

        "purpose":
            normalized_purpose,

        "type":
            "email_verification",

        "nonce":
            secrets.token_urlsafe(
                16
            ),

        "iat":
            now,

        "exp":
            now + timedelta(
                minutes=
                    VERIFICATION_TOKEN_EXPIRY_MINUTES
            ),
    }


    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=
            JWT_ALGORITHM,
    )


# ============================================================
# VERIFY EMAIL VERIFICATION TOKEN
# ============================================================

def verify_email_verification_token(
    token,
    email,
    purpose="registration",
):
    """
    Confirms that:
      - token is valid
      - token is not expired
      - email matches
      - purpose matches
    """

    if not token:

        return False


    try:

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[
                JWT_ALGORITHM
            ],
        )


    except jwt.PyJWTError:

        return False


    return (

        payload.get("type")
        == "email_verification"

        and normalize_email(
            payload.get("email")
        )
        == normalize_email(
            email
        )

        and normalize_purpose(
            payload.get("purpose")
        )
        == normalize_purpose(
            purpose
        )

    )


# ============================================================
# CLEAR OTP MANUALLY
# ============================================================

def clear_email_otp(
    email,
    purpose="registration",
):

    normalized_email = (
        normalize_email(
            email
        )
    )

    normalized_purpose = (
        normalize_purpose(
            purpose
        )
    )


    cache.delete_many(
        [
            _otp_key(
                normalized_email,
                normalized_purpose,
            ),

            _attempts_key(
                normalized_email,
                normalized_purpose,
            ),

            _cooldown_key(
                normalized_email,
                normalized_purpose,
            ),
        ]
    )
