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
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction, IntegrityError
from django.utils.text import get_valid_filename


# ============================================================
# FARMER REGISTRATION CONFIGURATION
# ============================================================

JWT_SECRET = (
    os.getenv("JWT_SECRET")
    or settings.SECRET_KEY
)

JWT_ALGORITHM = "HS256"


FARMER_OTP_EXPIRATION_SECONDS = (
    10 * 60
)

FARMER_OTP_RESEND_COOLDOWN_SECONDS = (
    60
)

FARMER_OTP_MAX_ATTEMPTS = (
    5
)


ALLOWED_RSBSA_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".pdf",
}


ALLOWED_RSBSA_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}


MAX_RSBSA_FILE_SIZE = (
    10 * 1024 * 1024
)


# ============================================================
# GENERAL HELPERS
# ============================================================

def _optional_text(value):
    """
    Convert blank optional values to None.
    """

    if value is None:
        return None

    cleaned = str(
        value
    ).strip()

    return (
        cleaned
        or None
    )


def _normalize_email(email):
    """
    Normalize an email address.
    """

    return (
        str(
            email
            or ""
        )
        .strip()
        .lower()
    )


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_farmer_password(
    password
):
    """
    Hash Farmer password using Django's
    built-in password hasher.

    Saved into:
        users.password_hash
    """

    return make_password(
        password
    )


# ============================================================
# FARMER JWT
# ============================================================

def create_farmer_access_token(
    data,
    expires_delta=None,
):
    """
    Create JWT specifically for Farmer
    registration-related verification.
    """

    payload = dict(
        data
    )

    now = datetime.now(
        timezone.utc
    )

    expiration = (
        now
        + (
            expires_delta
            or timedelta(
                hours=8
            )
        )
    )

    payload.update(
        {
            "iat":
                now,

            "exp":
                expiration,
        }
    )

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


def decode_farmer_access_token(
    token
):
    """
    Decode Farmer JWT.
    """

    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=[
            JWT_ALGORITHM
        ],
    )


# ============================================================
# FARMER EMAIL VERIFICATION TOKEN
# ============================================================

def create_farmer_email_verification_token(
    email
):
    """
    Created only after the Farmer successfully
    verifies the emailed OTP.

    Token lifetime:
        15 minutes
    """

    normalized_email = (
        _normalize_email(
            email
        )
    )

    return create_farmer_access_token(
        {
            "sub":
                normalized_email,

            "type":
                "farmer_email_verification",

            "nonce":
                secrets.token_urlsafe(
                    16
                ),
        },

        expires_delta=timedelta(
            minutes=15
        ),
    )


def verify_farmer_email_verification_token(
    token,
    expected_email,
):
    """
    Confirm that the verification token belongs
    to the Farmer email attempting registration.
    """

    try:

        payload = (
            decode_farmer_access_token(
                token
            )
        )

    except jwt.PyJWTError:
        return False


    normalized_email = (
        _normalize_email(
            expected_email
        )
    )


    return (
        payload.get(
            "type"
        )
        == "farmer_email_verification"

        and payload.get(
            "sub"
        )
        == normalized_email
    )


# ============================================================
# FARMER OTP HASH
# ============================================================

def _farmer_otp_hash(
    email,
    otp,
):
    """
    Hash OTP before storing it in Django cache.

    Plain OTP is never stored.
    """

    normalized_email = (
        _normalize_email(
            email
        )
    )

    raw_value = (
        f"{normalized_email}:"
        f"{otp}"
    )

    return hmac.new(
        JWT_SECRET.encode(
            "utf-8"
        ),

        raw_value.encode(
            "utf-8"
        ),

        hashlib.sha256,
    ).hexdigest()


# ============================================================
# SEND FARMER EMAIL OTP
# ============================================================

def issue_farmer_email_otp(
    email
):
    """
    Generate and send a real 6-digit
    Farmer registration OTP.

    Expiration:
        10 minutes

    Resend cooldown:
        60 seconds

    Maximum incorrect attempts:
        5
    """

    normalized_email = (
        _normalize_email(
            email
        )
    )


    if not normalized_email:
        raise ValueError(
            "Email address is required."
        )


    cooldown_key = (
        "farmer_otp_cooldown:"
        f"{normalized_email}"
    )


    # --------------------------------------------------------
    # RESEND COOLDOWN
    # --------------------------------------------------------

    if cache.get(
        cooldown_key
    ):
        return 0


    # --------------------------------------------------------
    # GENERATE OTP
    # --------------------------------------------------------

    otp = (
        f"{secrets.randbelow(1000000):06d}"
    )


    # --------------------------------------------------------
    # EMAIL CONTENT
    # --------------------------------------------------------

    subject = (
        "GrainRise Farmer "
        "Email Verification"
    )


    text_message = (
        "Your GrainRise farmer "
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
            Farmer Email Verification
        </h3>

        <p>
            Use the verification code below
            to continue your Farmer registration.
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
            This verification code will expire
            in <strong>10 minutes</strong>.
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
    # VALIDATE GMAIL APP PASSWORD
    # --------------------------------------------------------

    if (
        settings.EMAIL_HOST.lower()
        == "smtp.gmail.com"

        and settings.EMAIL_HOST_PASSWORD

        and len(
            settings.EMAIL_HOST_PASSWORD
        ) != 16
    ):

        raise RuntimeError(
            "Gmail EMAIL_APP_PASSWORD must be "
            "the 16-character App Password created "
            "for EMAIL_USER."
        )


    # --------------------------------------------------------
    # SEND REAL EMAIL
    # --------------------------------------------------------

    try:

        message.send(
            fail_silently=False
        )

    except smtplib.SMTPAuthenticationError as exc:

        raise RuntimeError(
            "Gmail rejected EMAIL_USER / "
            "EMAIL_APP_PASSWORD. Use a valid "
            "Google App Password for the "
            "configured EMAIL_USER account."
        ) from exc


    # --------------------------------------------------------
    # STORE HASHED OTP ONLY AFTER EMAIL SUCCESS
    # --------------------------------------------------------

    otp_key = (
        "farmer_otp:"
        f"{normalized_email}"
    )


    attempts_key = (
        "farmer_otp_attempts:"
        f"{normalized_email}"
    )


    cache.set(
        otp_key,

        _farmer_otp_hash(
            normalized_email,
            otp,
        ),

        timeout=
            FARMER_OTP_EXPIRATION_SECONDS,
    )


    cache.set(
        attempts_key,
        0,

        timeout=
            FARMER_OTP_EXPIRATION_SECONDS,
    )


    cache.set(
        cooldown_key,
        True,

        timeout=
            FARMER_OTP_RESEND_COOLDOWN_SECONDS,
    )


    return (
        FARMER_OTP_RESEND_COOLDOWN_SECONDS
    )


# ============================================================
# VERIFY FARMER EMAIL OTP
# ============================================================

def verify_farmer_email_otp(
    email,
    otp,
):
    """
    Verify Farmer's emailed OTP.

    OTP is single-use.
    """

    normalized_email = (
        _normalize_email(
            email
        )
    )


    normalized_otp = (
        str(
            otp
            or ""
        )
        .strip()
    )


    if not normalized_email:
        return False


    if (
        len(
            normalized_otp
        )
        != 6
        or not normalized_otp.isdigit()
    ):
        return False


    otp_key = (
        "farmer_otp:"
        f"{normalized_email}"
    )


    attempts_key = (
        "farmer_otp_attempts:"
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
    # MAXIMUM FAILED ATTEMPTS
    # --------------------------------------------------------

    if (
        attempts
        >= FARMER_OTP_MAX_ATTEMPTS
    ):

        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return False


    entered_hash = (
        _farmer_otp_hash(
            normalized_email,
            normalized_otp,
        )
    )


    valid = hmac.compare_digest(
        stored_hash,
        entered_hash,
    )


    # --------------------------------------------------------
    # CORRECT OTP
    # --------------------------------------------------------

    if valid:

        cache.delete(
            otp_key
        )

        cache.delete(
            attempts_key
        )

        return True


    # --------------------------------------------------------
    # WRONG OTP
    # --------------------------------------------------------

    cache.set(
        attempts_key,
        attempts + 1,

        timeout=
            FARMER_OTP_EXPIRATION_SECONDS,
    )


    return False


# ============================================================
# CENTRALIZED USERS — DUPLICATE CHECK
# ============================================================

FARMER_ALLOWED_UNIQUE_FIELDS = {
    "email",
    "username",
    "contact_number",
}


def farmer_user_value_exists(
    field,
    value,
):
    """
    Check centralized users table.

    This checks ALL GrainRise users,
    not Farmers only.

    Important because email / username
    are centralized account credentials.
    """

    if (
        field
        not in FARMER_ALLOWED_UNIQUE_FIELDS
    ):

        raise ValueError(
            f"Unsupported users field: "
            f"{field}"
        )


    normalized_value = (
        _optional_text(
            value
        )
    )


    if not normalized_value:
        return False


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT 1

            FROM users

            WHERE LOWER(
                CAST(
                    {field}
                    AS TEXT
                )
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
# CREATE FARMER USER
# ============================================================

def create_farmer_user(
    data
):
    """
    Insert Farmer into centralized users table.

    Existing table:
        users

    New Farmer:
        user_role = farmer
        status    = inactive

    Username:
        optional
    """

    password_hash = (
        hash_farmer_password(
            data[
                "password"
            ]
        )
    )


    username = (
        _optional_text(
            data.get(
                "username"
            )
        )
    )


    middle_initial = (
        _optional_text(
            data.get(
                "middle_initial"
            )
        )
    )


    suffix = (
        _optional_text(
            data.get(
                "suffix"
            )
        )
    )


    postal_code = (
        _optional_text(
            data.get(
                "postal_code"
            )
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

                'farmer'::user_role_enum,
                'inactive'::user_status_enum
            )

            RETURNING
                user_id
            """,

            [
                data[
                    "first_name"
                ].strip(),

                middle_initial,

                data[
                    "last_name"
                ].strip(),

                suffix,

                data[
                    "gender"
                ].strip(),

                data[
                    "province"
                ].strip(),

                data[
                    "municipality"
                ].strip(),

                postal_code,

                data[
                    "barangay"
                ].strip(),

                data[
                    "street_address"
                ].strip(),

                _normalize_email(
                    data[
                        "email"
                    ]
                ),

                data[
                    "contact_number"
                ].strip(),

                username,

                password_hash,
            ],
        )


        row = (
            cursor.fetchone()
        )


    if not row:

        raise RuntimeError(
            "PostgreSQL did not return "
            "the newly created Farmer user_id."
        )


    return int(
        row[0]
    )


# ============================================================
# CREATE FARMER FARM INFORMATION
# ============================================================

def create_farmer_farm(
    user_id,
    data,
):
    """
    Insert Farmer's initial Farm Information.

    Table:
        farmer_farms

    One Farmer can later have multiple farms.
    """

    with connection.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO farmer_farms
            (
                user_id,

                farm_name,

                province,
                municipality,
                postal_code,
                barangay,
                street_address,

                total_farm_area,

                land_ownership_status,
                rice_variety_currently_planted,
                cropping_cycles_per_year,

                farm_status
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

                'active'
            )

            RETURNING
                farm_id
            """,

            [
                user_id,

                _optional_text(
                    data.get(
                        "farm_name"
                    )
                ),

                data[
                    "farm_province"
                ].strip(),

                data[
                    "farm_municipality"
                ].strip(),

                _optional_text(
                    data.get(
                        "farm_postal_code"
                    )
                ),

                data[
                    "farm_barangay"
                ].strip(),

                data[
                    "farm_street_address"
                ].strip(),

                data[
                    "total_farm_area"
                ],

                data[
                    "land_ownership_status"
                ].strip(),

                data[
                    "rice_variety_currently_planted"
                ].strip(),

                data[
                    "cropping_cycles_per_year"
                ],
            ],
        )


        row = (
            cursor.fetchone()
        )


    if not row:

        raise RuntimeError(
            "PostgreSQL did not save "
            "the Farmer's Farm Information."
        )


    return int(
        row[0]
    )


# ============================================================
# VALIDATE RSBSA FILE
# ============================================================

def validate_farmer_rsbsa_file(
    uploaded_file
):
    """
    Accepted:
        JPG
        JPEG
        PNG
        WEBP
        PDF

    Maximum:
        10 MB
    """

    if not uploaded_file:

        raise ValueError(
            "RSBSA ID/photo is required."
        )


    filename = (
        get_valid_filename(
            Path(
                uploaded_file.name
            ).name
        )
    )


    extension = (
        Path(
            filename
        )
        .suffix
        .lower()
    )


    if (
        extension
        not in ALLOWED_RSBSA_EXTENSIONS
    ):

        raise ValueError(
            "Invalid RSBSA file type. "
            "Allowed formats are JPG, JPEG, "
            "PNG, WEBP, and PDF."
        )


    content_type = (
        getattr(
            uploaded_file,
            "content_type",
            None,
        )
    )


    if (
        content_type

        and content_type
        not in ALLOWED_RSBSA_CONTENT_TYPES
    ):

        raise ValueError(
            "Invalid RSBSA document format."
        )


    file_size = int(
        getattr(
            uploaded_file,
            "size",
            0,
        )
        or 0
    )


    if (
        file_size
        > MAX_RSBSA_FILE_SIZE
    ):

        raise ValueError(
            "RSBSA file must not exceed 10 MB."
        )


    return True


# ============================================================
# SAVE FARMER RSBSA FILE
# ============================================================

def save_farmer_rsbsa_file(
    uploaded_file,
    user_id,
):
    """
    Save file into:

        backend/media/
        farmer_compliance/
        <user_id>/
        rsbsa_<uuid>.<extension>

    Database stores only the relative path.
    """

    validate_farmer_rsbsa_file(
        uploaded_file
    )


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
        )
        .suffix
        .lower()
    )


    generated_filename = (
        "rsbsa_"
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )


    relative_directory = (
        Path(
            "farmer_compliance"
        )
        / str(
            user_id
        )
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


    try:

        uploaded_file.seek(
            0
        )

    except Exception:
        pass


    return (
        relative_path
        .as_posix()
    )


# ============================================================
# DELETE SAVED RSBSA FILE
# ============================================================

def delete_saved_farmer_rsbsa_file(
    relative_path
):
    """
    transaction.atomic() can rollback PostgreSQL,
    but it cannot rollback files saved on disk.

    This removes an uploaded RSBSA file when the
    overall Farmer registration later fails.
    """

    if not relative_path:
        return


    absolute_path = (
        Path(
            settings.MEDIA_ROOT
        )
        / relative_path
    )


    try:

        if (
            absolute_path.exists()
            and absolute_path.is_file()
        ):

            absolute_path.unlink()


        parent_directory = (
            absolute_path.parent
        )


        if (
            parent_directory.exists()

            and not any(
                parent_directory.iterdir()
            )
        ):

            parent_directory.rmdir()


    except Exception:
        # Do not hide the actual database
        # registration error.
        pass


# ============================================================
# CREATE FARMER COMPLIANCE / RSBSA
# ============================================================

def create_farmer_compliance(
    user_id,
    submission_method,
    rsbsa_number=None,
    rsbsa_document_path=None,
):
    """
    Table:
        farmer_compliance

    Two supported methods:

    MANUAL
        rsbsa_number   = required
        rsbsa_document = NULL

    UPLOAD
        rsbsa_document = required
        rsbsa_number   = optional

    This allows OCR to be added later without
    changing the database structure.
    """

    method = (
        str(
            submission_method
            or ""
        )
        .strip()
        .lower()
    )


    number = (
        _optional_text(
            rsbsa_number
        )
    )


    document_path = (
        _optional_text(
            rsbsa_document_path
        )
    )


    if method not in {
        "manual",
        "upload",
    }:

        raise ValueError(
            "Invalid RSBSA submission method."
        )


    # --------------------------------------------------------
    # MANUAL
    # --------------------------------------------------------

    if method == "manual":

        if not number:

            raise ValueError(
                "RSBSA Registration Number "
                "is required."
            )


        document_path = None


    # --------------------------------------------------------
    # UPLOAD
    # --------------------------------------------------------

    if method == "upload":

        if not document_path:

            raise ValueError(
                "RSBSA ID/photo is required."
            )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            INSERT INTO farmer_compliance
            (
                user_id,
                rsbsa_number,
                rsbsa_document,
                submission_method
            )

            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )

            RETURNING
                farmer_compliance_id
            """,

            [
                user_id,
                number,
                document_path,
                method,
            ],
        )


        row = (
            cursor.fetchone()
        )


    if not row:

        raise RuntimeError(
            "PostgreSQL did not save "
            "the Farmer's RSBSA information."
        )


    return int(
        row[0]
    )


# ============================================================
# COMPLETE FARMER REGISTRATION
# ============================================================

def create_farmer_registration(
    data,
    rsbsa_document=None,
):
    """
    COMPLETE FARMER REGISTRATION.

    One PostgreSQL transaction:

        1. users
        2. farmer_farms
        3. farmer_compliance

    If one INSERT fails:

        ROLLBACK ALL DATABASE INSERTS.

    If an uploaded RSBSA file was already
    written to MEDIA_ROOT before failure:

        DELETE THE SAVED FILE.
    """

    submission_method = (
        str(
            data.get(
                "submission_method",
                ""
            )
        )
        .strip()
        .lower()
    )


    saved_rsbsa_path = None


    try:

        with transaction.atomic():

            # =================================================
            # DUPLICATE CHECKS
            # =================================================

            email = (
                _normalize_email(
                    data.get(
                        "email"
                    )
                )
            )


            username = (
                _optional_text(
                    data.get(
                        "username"
                    )
                )
            )


            if farmer_user_value_exists(
                "email",
                email,
            ):

                raise ValueError(
                    "This email address is "
                    "already registered."
                )


            if (
                username

                and farmer_user_value_exists(
                    "username",
                    username,
                )
            ):

                raise ValueError(
                    "This username is "
                    "already registered."
                )


            # =================================================
            # 1. CENTRALIZED USER
            # =================================================

            user_id = (
                create_farmer_user(
                    data
                )
            )


            # =================================================
            # 2. INITIAL FARM
            # =================================================

            farm_id = (
                create_farmer_farm(
                    user_id,
                    data,
                )
            )


            # =================================================
            # 3. RSBSA
            # =================================================

            if (
                submission_method
                == "upload"
            ):

                if not rsbsa_document:

                    raise ValueError(
                        "Please upload your "
                        "RSBSA ID/photo."
                    )


                saved_rsbsa_path = (
                    save_farmer_rsbsa_file(
                        rsbsa_document,
                        user_id,
                    )
                )


            elif (
                submission_method
                == "manual"
            ):

                if rsbsa_document:

                    raise ValueError(
                        "Do not upload an RSBSA "
                        "document when manual "
                        "entry is selected."
                    )


            else:

                raise ValueError(
                    "Please select either "
                    "Upload RSBSA ID or "
                    "Enter Manually."
                )


            farmer_compliance_id = (
                create_farmer_compliance(
                    user_id=
                        user_id,

                    submission_method=
                        submission_method,

                    rsbsa_number=
                        data.get(
                            "rsbsa_number"
                        ),

                    rsbsa_document_path=
                        saved_rsbsa_path,
                )
            )


            # =================================================
            # SUCCESS
            # =================================================

            return {
                "user_id":
                    user_id,

                "farm_id":
                    farm_id,

                "farmer_compliance_id":
                    farmer_compliance_id,

                "user_role":
                    "farmer",

                "status":
                    "inactive",
            }


    # ========================================================
    # POSTGRESQL CONSTRAINT ERROR
    # ========================================================

    except IntegrityError as exc:

        delete_saved_farmer_rsbsa_file(
            saved_rsbsa_path
        )


        error_text = (
            str(
                exc
            )
            .lower()
        )


        if "email" in error_text:

            raise ValueError(
                "This email address is "
                "already registered."
            ) from exc


        if "username" in error_text:

            raise ValueError(
                "This username is "
                "already registered."
            ) from exc


        if "rsbsa_number" in error_text:

            raise ValueError(
                "This RSBSA Registration Number "
                "is already registered."
            ) from exc


        raise RuntimeError(
            "Farmer registration could not "
            "be saved because of a database "
            "constraint."
        ) from exc


    # ========================================================
    # OTHER ERROR
    # ========================================================

    except Exception:

        delete_saved_farmer_rsbsa_file(
            saved_rsbsa_path
        )

        raise