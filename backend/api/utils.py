import hashlib
import hmac
import os
import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from .services.email_sender import send_grainrise_email
from django.db import connection
from django.utils.text import get_valid_filename


# ============================================================
# JWT CONFIGURATION
# ============================================================

JWT_SECRET = (
    os.getenv("JWT_SECRET")
    or settings.SECRET_KEY
)

JWT_ALGORITHM = "HS256"


# ============================================================
# PASSWORD
# ============================================================

def hash_password(password):
    """
    Convert plain password into a secure Django password hash.

    Saved into:
        users.password_hash
    """
    return make_password(password)


def verify_password(
    plain_password,
    password_hash,
):
    """
    Verify password against users.password_hash.
    """

    if not password_hash:
        return False

    try:
        return check_password(
            plain_password,
            password_hash,
        )

    except Exception:
        return False


# ============================================================
# JWT
# ============================================================

def create_access_token(
    data,
    expires_delta=None,
):

    payload = dict(data)

    now = datetime.now(
        timezone.utc
    )

    expiration = (
        now
        + (
            expires_delta
            or timedelta(hours=8)
        )
    )

    payload.update(
        {
            "iat": now,
            "exp": expiration,
        }
    )

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token):

    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[
            JWT_ALGORITHM
        ],
    )


# ============================================================
# EMAIL VERIFICATION TOKEN
# ============================================================

def create_email_verification_token(
    email,
):

    normalized_email = (
        email
        .strip()
        .lower()
    )

    return create_access_token(
        {
            "sub": normalized_email,
            "type":
                "retailer_email_verification",

            "nonce":
                secrets.token_urlsafe(16),
        },

        expires_delta=timedelta(
            minutes=15
        ),
    )


def verify_email_verification_token(
    token,
    expected_email,
):

    try:

        payload = (
            decode_access_token(
                token
            )
        )

    except jwt.PyJWTError:
        return False


    normalized_email = (
        expected_email
        .strip()
        .lower()
    )


    return (
        payload.get("type")
        == "retailer_email_verification"

        and payload.get("sub")
        == normalized_email
    )


# ============================================================
# OTP HASHING
# ============================================================

def _otp_hash(
    email,
    otp,
):

    normalized_email = (
        email
        .strip()
        .lower()
    )

    raw_value = (
        f"{normalized_email}:{otp}"
    )

    return hmac.new(
        JWT_SECRET.encode("utf-8"),
        raw_value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


# ============================================================
# SEND EMAIL OTP
# ============================================================

def issue_email_otp(email):
    """
    Generate and send a real 6-digit OTP through Gmail SMTP.

    OTP lifetime:
        10 minutes

    Resend cooldown:
        60 seconds

    Maximum failed attempts:
        5
    """

    normalized_email = (
        email
        .strip()
        .lower()
    )


    cooldown_key = (
        f"retailer_otp_cooldown:"
        f"{normalized_email}"
    )


    # --------------------------------------------------------
    # Prevent resend spam
    # --------------------------------------------------------

    if cache.get(
        cooldown_key
    ):

        return 0


    # --------------------------------------------------------
    # Generate secure 6-digit OTP
    # --------------------------------------------------------

    otp = (
        f"{secrets.randbelow(1000000):06d}"
    )


    # --------------------------------------------------------
    # Prepare email
    # --------------------------------------------------------

    subject = (
        "GrainRise Retailer "
        "Email Verification"
    )


    text_message = (
        "Your GrainRise retailer "
        "verification code is:\n\n"
        f"{otp}\n\n"
        "This code expires in 10 minutes.\n"
        "Do not share this verification "
        "code with anyone."
    )


    html_message = f"""
    <div
        style="
            font-family: Arial, sans-serif;
            max-width: 560px;
            margin: 0 auto;
            color: #1f2937;
            padding: 24px;
        "
    >

        <h2
            style="
                color: #08511f;
                margin-bottom: 8px;
            "
        >
            GrainRise
        </h2>

        <h3>
            Retailer Email Verification
        </h3>

        <p>
            Use the verification code below
            to continue your retailer
            registration.
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
            This verification code will
            expire in <strong>10 minutes</strong>.
        </p>

        <p>
            If you did not request this code,
            you may safely ignore this email.
        </p>

    </div>
    """


    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [
            normalized_email
        ],
    )


    message.attach_alternative(
        html_message,
        "text/html",
    )


    # --------------------------------------------------------
    # REAL EMAIL SEND
    # --------------------------------------------------------

    # Gmail App Passwords are 16 characters. settings.py already
    # removes spaces copied from Google's grouped display. Fail with a
    # useful message before contacting Gmail if the configured value is
    # clearly not an App Password.
    if (
        settings.EMAIL_HOST.lower() == "smtp.gmail.com"
        and settings.EMAIL_HOST_PASSWORD
        and len(settings.EMAIL_HOST_PASSWORD) != 16
    ):
        raise RuntimeError(
            "Gmail EMAIL_APP_PASSWORD must be the 16-character App "
            "Password created for EMAIL_USER. The configured value has "
            f"{len(settings.EMAIL_HOST_PASSWORD)} characters after spaces "
            "were removed."
        )

    try:
        message.send(
            fail_silently=False
        )

    except smtplib.SMTPAuthenticationError as exc:
        # Do not expose the credential itself. 535 means Gmail was
        # reached successfully but rejected the account/App Password.
        raise RuntimeError(
            "Gmail rejected EMAIL_USER / EMAIL_APP_PASSWORD (SMTP 535). "
            "Use an App Password generated while signed in to the exact "
            "EMAIL_USER account; the normal Gmail password will not work."
        ) from exc


    # --------------------------------------------------------
    # Store HASHED OTP only after successful email send
    # --------------------------------------------------------

    cache.set(
        (
            f"retailer_otp:"
            f"{normalized_email}"
        ),

        _otp_hash(
            normalized_email,
            otp,
        ),

        timeout=10 * 60,
    )


    # Failed attempt counter
    cache.set(
        (
            f"retailer_otp_attempts:"
            f"{normalized_email}"
        ),

        0,

        timeout=10 * 60,
    )


    # 60-second resend cooldown
    cache.set(
        cooldown_key,
        True,
        timeout=60,
    )


    return 60


# ============================================================
# VERIFY OTP
# ============================================================

def verify_email_otp(
    email,
    otp,
):

    normalized_email = (
        email
        .strip()
        .lower()
    )


    otp_key = (
        f"retailer_otp:"
        f"{normalized_email}"
    )


    attempts_key = (
        f"retailer_otp_attempts:"
        f"{normalized_email}"
    )


    stored_hash = (
        cache.get(
            otp_key
        )
    )


    # OTP expired / nonexistent
    if not stored_hash:
        return False


    attempts = int(
        cache.get(
            attempts_key,
            0,
        )
    )


    # --------------------------------------------------------
    # Maximum 5 incorrect attempts
    # --------------------------------------------------------

    if attempts >= 5:

        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return False


    entered_hash = (
        _otp_hash(
            normalized_email,
            otp,
        )
    )


    is_valid = (
        hmac.compare_digest(
            stored_hash,
            entered_hash,
        )
    )


    # --------------------------------------------------------
    # Correct OTP
    # --------------------------------------------------------

    if is_valid:

        # OTP can only be used once.
        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return True


    # --------------------------------------------------------
    # Wrong OTP
    # --------------------------------------------------------

    cache.set(
        attempts_key,
        attempts + 1,
        timeout=10 * 60,
    )


    return False


# ============================================================
# DATABASE — DUPLICATE CHECK
# ============================================================

ALLOWED_UNIQUE_FIELDS = {
    "email",
    "username",
    "contact_number",
}


def user_value_exists(
    field,
    value,
):

    if field not in ALLOWED_UNIQUE_FIELDS:

        raise ValueError(
            f"Unsupported users field: {field}"
        )


    if value is None:
        return False


    normalized_value = (
        str(value)
        .strip()
    )


    if not normalized_value:
        return False


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT 1

            FROM users

            WHERE LOWER(
                CAST({field} AS TEXT)
            ) = LOWER(%s)

            LIMIT 1
            """,

            [
                normalized_value
            ],
        )


        return (
            cursor.fetchone()
            is not None
        )


# ============================================================
# CREATE RETAILER USER
# ============================================================

def create_retailer_user(data):
    """
    INSERT directly into EXISTING PostgreSQL users table.

    Exact GrainRise columns:

        first_name
        middle_initial
        last_name
        suffix
        gender

        province
        municipality
        postal_code
        barangay
        street_address

        email
        contact_number
        username
        password_hash

        user_role
        status

    Newly registered retailer:
        user_role = retailer
        status    = inactive

    Admin approval later changes:
        inactive -> active
    """


    password_hash = (
        hash_password(
            data["password"]
        )
    )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO users
            (
                first_name,
                middle_initial,
                last_name,
                suffix,
                gender,

                province,
                municipality,
                postal_code,
                barangay,
                street_address,

                email,
                contact_number,
                username,
                password_hash,

                user_role,
                status
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
                %s,
                %s,

                %s,
                %s,
                %s,
                %s,

                'retailer',
                'inactive'
            )
            """,

            [
                data["first_name"].strip(),

                (
                    data.get(
                        "middle_initial",
                        "",
                    ).strip()
                    or None
                ),

                data["last_name"].strip(),

                (
                    data.get(
                        "suffix",
                        "",
                    ).strip()
                    or None
                ),

                data["gender"].strip(),

                data["province"].strip(),

                data["municipality"].strip(),

                (
                    data.get(
                        "postal_code",
                        "",
                    ).strip()
                    or None
                ),

                data["barangay"].strip(),

                data["street_address"].strip(),

                data["email"]
                .strip()
                .lower(),

                data["contact_number"]
                .strip(),

                data["username"]
                .strip(),

                password_hash,
            ],
        )


        user_id = cursor.lastrowid


    if not user_id:

        raise RuntimeError(
            "Failed to retrieve the newly created retailer user_id."
        )


    return int(user_id)


# ============================================================
# SAVE UPLOADED FILE
# ============================================================

def save_retailer_file(
    uploaded_file,
    user_id,
    document_type,
):

    safe_original_name = (
        get_valid_filename(
            Path(
                uploaded_file.name
            ).name
        )
    )


    extension = (
        Path(
            safe_original_name
        ).suffix.lower()
    )


    generated_filename = (
        f"{document_type}_"
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


    relative_directory = (
        Path(
            "retailer_documents"
        )
        / str(user_id)
    )


    relative_path = (
        relative_directory
        / generated_filename
    )


    absolute_path = (
        Path(
            settings.MEDIA_ROOT
        )
        / relative_path
    )


    absolute_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )


    with absolute_path.open(
        "wb"
    ) as destination:

        for chunk in (
            uploaded_file.chunks()
        ):

            destination.write(
                chunk
            )


    return (
        relative_path
        .as_posix()
    )


# ============================================================
# CREATE RETAILER DOCUMENTS
# ============================================================

def create_retailer_documents(
    user_id,
    barangay_permit,
    valid_id,
):

    """
    Exact existing table:

        retailer_documents
        --------------------------
        retailer_document_id
        user_id
        barangay_permit TEXT
        valid_id TEXT
        created_at
        updated_at

    Files themselves are stored under:
        backend/media/retailer_documents/<user_id>/

    PostgreSQL stores the relative paths.
    """


    barangay_permit_path = (
        save_retailer_file(
            barangay_permit,
            user_id,
            "barangay_permit",
        )
    )


    valid_id_path = (
        save_retailer_file(
            valid_id,
            user_id,
            "valid_id",
        )
    )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO retailer_documents
            (
                user_id,
                barangay_permit,
                valid_id
            )

            VALUES
            (
                %s,
                %s,
                %s
            )
            """,

            [
                user_id,
                barangay_permit_path,
                valid_id_path,
            ],
        )


        doc_id = cursor.lastrowid


    if not doc_id:

        raise RuntimeError(
            "Failed to save the retailer documents."
        )


    return int(doc_id)


# ============================================================
# BUSINESS USER LOGIN
# ============================================================

def get_business_user(identifier):

    normalized_identifier = (
        identifier
        .strip()
        .lower()
    )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                user_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                email,
                contact_number,
                username,
                password_hash,
                user_role,
                status

            FROM users

            WHERE
                LOWER(email) = %s

                OR

                LOWER(
                    COALESCE(
                        username,
                        ''
                    )
                ) = %s

            LIMIT 1
            """,

            [
                normalized_identifier,
                normalized_identifier,
            ],
        )


        row = (
            cursor.fetchone()
        )


    if not row:
        return None


    return {
        "id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "email": row[5],
        "contact_number": row[6],
        "username": row[7],
        "password_hash": row[8],
        "role": row[9],
        "status": row[10],
    }


# ============================================================
# LOGIN STATUS
# ============================================================

def status_is_login_allowed(status_value):

    return (
        str(
            status_value
            or ""
        )
        .strip()
        .lower()
        == "active"
    )


# ============================================================
# LIST ALL RETAILERS
# ============================================================

def list_retailers():

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                user_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                gender,

                province,
                municipality,
                postal_code,
                barangay,
                street_address,

                email,
                contact_number,
                username,

                user_role,
                status,

                created_at,
                updated_at

            FROM users

            WHERE
                user_role = 'retailer'

            ORDER BY
                created_at DESC
            """
        )


        rows = (
            cursor.fetchall()
        )


    return [
        {
            "id": row[0],

            "first_name": row[1],

            "middle_initial": row[2],

            "last_name": row[3],

            "suffix": row[4],

            "gender": row[5],

            "province": row[6],

            "municipality": row[7],

            "postal_code": row[8],

            "barangay": row[9],

            "street_address": row[10],

            "email": row[11],

            "contact_number": row[12],

            "username": row[13],

            "role": row[14],

            "status": row[15],

            "created_at": row[16],

            "updated_at": row[17],
        }

        for row in rows
    ]


# ============================================================
# UPDATE RETAILER STATUS
# ============================================================

ALLOWED_USER_STATUSES = {
    "active",
    "inactive",
    "deactivated",
    "archived",
}


def update_retailer_status(
    user_id,
    new_status,
):

    normalized_status = (
        str(
            new_status
        )
        .strip()
        .lower()
    )


    if (
        normalized_status
        not in ALLOWED_USER_STATUSES
    ):

        raise ValueError(
            "Invalid account status."
        )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            UPDATE users

            SET
                status = %s,
                updated_at = CURRENT_TIMESTAMP

            WHERE
                user_id = %s
                AND user_role = 'retailer'
            """,

            [
                normalized_status,
                user_id,
            ],
        )

        cursor.execute(
            """
            SELECT
                user_id,
                status
            FROM users
            WHERE
                user_id = %s
                AND user_role = 'retailer'
            """,
            [user_id],
        )

        row = (
            cursor.fetchone()
        )


    if not row:

        raise RuntimeError(
            "Retailer account was not found."
        )


    return str(
        row[1]
    )


# ============================================================
# GET RETAILER DOCUMENT
# ============================================================

def get_retailer_document(
    user_id,
    document_type,
):

    if document_type not in {
        "barangay_permit",
        "valid_id",
    }:

        raise ValueError(
            "Invalid document type."
        )


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT
                {document_type}

            FROM retailer_documents

            WHERE
                user_id = %s

            LIMIT 1
            """,

            [
                user_id
            ],
        )


        row = (
            cursor.fetchone()
        )


    if not row:
        raise FileNotFoundError(
            "Retailer document record "
            "was not found."
        )


    stored_relative_path = (
        row[0]
    )


    if not stored_relative_path:

        raise FileNotFoundError(
            "Retailer document "
            "has no stored file path."
        )


    absolute_path = (
        Path(
            settings.MEDIA_ROOT
        )
        / stored_relative_path
    )


    if not (
        absolute_path.exists()
        and absolute_path.is_file()
    ):

        raise FileNotFoundError(
            "Retailer document file "
            "was not found on the server."
        )


    return absolute_path


# ============================================================
# STATUS EMAIL
# ============================================================

def send_retailer_status_email(
    email,
    name,
    new_status,
):

    normalized_status = (
        str(
            new_status
        )
        .strip()
        .lower()
    )


    if normalized_status == "active":

        subject = (
            "GrainRise Retailer "
            "Registration Approved"
        )

        body = (
            f"Hello {name},\n\n"
            "Your GrainRise retailer "
            "registration has been approved.\n\n"
            "Your account is now ACTIVE "
            "and you may log in using your "
            "registered credentials.\n\n"
            "GrainRise"
        )


    elif normalized_status == "deactivated":

        subject = (
            "GrainRise Retailer "
            "Account Deactivated"
        )

        body = (
            f"Hello {name},\n\n"
            "Your GrainRise retailer "
            "account has been deactivated.\n\n"
            "Please contact the GrainRise "
            "administrator if you need "
            "assistance.\n\n"
            "GrainRise"
        )


    elif normalized_status == "archived":

        subject = (
            "GrainRise Retailer "
            "Account Archived"
        )

        body = (
            f"Hello {name},\n\n"
            "Your GrainRise retailer "
            "account has been archived.\n\n"
            "GrainRise"
        )


    else:

        subject = (
            "GrainRise Retailer "
            "Registration Status"
        )

        body = (
            f"Hello {name},\n\n"
            "Your GrainRise retailer account "
            "is currently inactive and "
            "awaiting administrator approval.\n\n"
            "GrainRise"
        )


    email_message = (
        EmailMultiAlternatives(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [
                email
            ],
        )
    )


    email_message.send(
        fail_silently=False
    )


# ============================================================
# AUTHORIZATION
# ============================================================

def authorization_payload(request):

    header = (
        request.headers.get(
            "Authorization",
            "",
        )
    )


    if not header.startswith(
        "Bearer "
    ):

        return None


    token = (
        header
        .split(
            " ",
            1,
        )[1]
        .strip()
    )


    if not token:
        return None


    try:

        return decode_access_token(
            token
        )

    except jwt.PyJWTError:

        return None


# ============================================================
# ADMIN AUTHORIZATION
# ============================================================

def require_admin(request):

    payload = (
        authorization_payload(
            request
        )
    )


    return bool(
        payload

        and payload.get(
            "role"
        ) == "admin"

        and payload.get(
            "auth_source"
        ) == "django_admin"
    )


# ============================================================
# FORGOT PASSWORD — OTP UTILITIES
# ============================================================
# Uses a separate cache namespace to avoid collisions with
# the registration OTP flow.
# ============================================================

def issue_forgot_password_otp(email):
    """
    Generate and send a 6-digit OTP for password reset.

    OTP lifetime:    10 minutes
    Resend cooldown: 60 seconds
    """

    normalized_email = email.strip().lower()

    cooldown_key = f"forgot_pw_otp_cooldown:{normalized_email}"

    if cache.get(cooldown_key):
        return 0

    otp = f"{secrets.randbelow(1000000):06d}"

    subject = "GrainRise Password Reset"

    text_message = (
        f"Your GrainRise password reset code is:\n\n"
        f"{otp}\n\n"
        "This code expires in 10 minutes.\n"
        "Do not share this code with anyone."
    )

    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; padding: 24px;">
        <h2 style="color: #08511f; margin-bottom: 8px;">GrainRise</h2>
        <h3>Password Reset</h3>
        <p>Use the verification code below to reset your GrainRise password.</p>
        <div style="margin: 24px 0; padding: 18px; background: #f0f8f2; border: 1px solid #cce5d1; border-radius: 12px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #08511f;">
            {otp}
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you did not request a password reset, you may safely ignore this email.</p>
    </div>
    """

    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [normalized_email],
    )

    message.attach_alternative(html_message, "text/html")
    email_sent, email_err = send_grainrise_email(
        subject=subject,
        text_content=text_message,
        html_content=html_message,
        recipient_email=normalized_email,
    )

    if not email_sent:
        raise RuntimeError(email_err or 'Failed to send password reset email.')

    cache.set(
        f"forgot_pw_otp:{normalized_email}",
        _otp_hash(normalized_email, otp),
        timeout=10 * 60,
    )

    cache.set(
        f"forgot_pw_otp_attempts:{normalized_email}",
        0,
        timeout=10 * 60,
    )

    cache.set(cooldown_key, True, timeout=60)

    return 60


def verify_forgot_password_otp(email, otp):
    """
    Verify the 6-digit OTP for password reset.
    Returns True on success, False on failure.
    """

    normalized_email = email.strip().lower()
    otp_key = f"forgot_pw_otp:{normalized_email}"
    attempts_key = f"forgot_pw_otp_attempts:{normalized_email}"

    stored_hash = cache.get(otp_key)

    if not stored_hash:
        return False

    attempts = int(cache.get(attempts_key, 0))

    if attempts >= 5:
        cache.delete(otp_key)
        cache.delete(attempts_key)
        return False

    entered_hash = _otp_hash(normalized_email, otp)
    is_valid = hmac.compare_digest(stored_hash, entered_hash)

    if is_valid:
        cache.delete(otp_key)
        cache.delete(attempts_key)
        return True

    cache.set(attempts_key, attempts + 1, timeout=10 * 60)
    return False


def create_forgot_password_reset_token(email):
    """
    Create a short-lived token (15 min) that authorises the
    password reset step after OTP verification.
    """

    normalized_email = email.strip().lower()
    token = secrets.token_urlsafe(32)

    cache.set(
        f"forgot_pw_token:{normalized_email}",
        token,
        timeout=15 * 60,
    )

    return token


def verify_forgot_password_reset_token(email, token):
    """
    Verify the reset token and delete it (single-use).
    Returns True if valid, False otherwise.
    """

    normalized_email = email.strip().lower()
    key = f"forgot_pw_token:{normalized_email}"

    stored_token = cache.get(key)

    if not stored_token:
        return False

    is_valid = hmac.compare_digest(stored_token, token)

    if is_valid:
        cache.delete(key)

    return is_valid
