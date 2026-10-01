import hashlib
import hmac
import os
import re
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
from django.db import IntegrityError, connection, transaction
from django.utils.text import get_valid_filename


# ============================================================
# CONFIG
# ============================================================

JWT_SECRET = os.getenv("JWT_SECRET") or settings.SECRET_KEY
JWT_ALGORITHM = "HS256"

WAREHOUSE_OTP_EXPIRATION_SECONDS = 10 * 60
WAREHOUSE_OTP_RESEND_COOLDOWN_SECONDS = 60
WAREHOUSE_OTP_MAX_ATTEMPTS = 5

MAX_WAREHOUSE_DOCUMENT_SIZE = 5 * 1024 * 1024
ALLOWED_WAREHOUSE_DOCUMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_WAREHOUSE_DOCUMENT_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}

WAREHOUSE_DOCUMENT_TYPES = {
    "government_issued_id": {
        "label": "Valid Government-Issued ID",
        "filename_prefix": "government_id",
    },
    "business_permit": {
        "label": "Mayor's / Business Permit",
        "filename_prefix": "business_permit",
    },
    "business_registration": {
        "label": "DTI / SEC / CDA Registration",
        "filename_prefix": "business_registration",
    },
    "warehouse_license": {
        "label": "BPI License to Operate / Warehouse License",
        "filename_prefix": "warehouse_license",
    },
}

WAREHOUSE_OCR_AUTOFILL_FIELDS = {
    "business_name",
    "organization_name",
    "province",
    "municipality",
    "postal_code",
    "barangay",
    "street_address",
    "official_email",
    "official_contact_number",
}


# ============================================================
# BASIC HELPERS
# ============================================================


def _optional_text(value):
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _required_text(value, field_name):
    cleaned = str(value or "").strip()
    if not cleaned:
        raise ValueError(f"{field_name} is required.")
    return cleaned


def _normalize_email(value):
    return str(value or "").strip().lower()


def _normalize_whitespace(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _normalize_ocr_text(value):
    text = str(value or "").replace("\r", "\n")
    lines = []
    for line in text.split("\n"):
        line = _normalize_whitespace(line)
        if line:
            lines.append(line)
    return "\n".join(lines)


# ============================================================
# PASSWORD / JWT
# ============================================================


def hash_warehouse_password(password):
    return make_password(password)


def create_warehouse_access_token(data, expires_delta=None):
    payload = dict(data)
    now = datetime.now(timezone.utc)
    payload.update(
        {
            "iat": now,
            "exp": now + (expires_delta or timedelta(hours=8)),
        }
    )
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_warehouse_access_token(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def create_warehouse_email_verification_token(email):
    return create_warehouse_access_token(
        {
            "sub": _normalize_email(email),
            "type": "warehouse_email_verification",
            "nonce": secrets.token_urlsafe(16),
        },
        expires_delta=timedelta(minutes=15),
    )


def verify_warehouse_email_verification_token(token, expected_email):
    try:
        payload = decode_warehouse_access_token(token)
    except jwt.PyJWTError:
        return False

    return (
        payload.get("type") == "warehouse_email_verification"
        and payload.get("sub") == _normalize_email(expected_email)
    )


# ============================================================
# EMAIL OTP
# ============================================================


def _warehouse_otp_hash(email, otp):
    raw = f"{_normalize_email(email)}:{otp}"
    return hmac.new(
        JWT_SECRET.encode("utf-8"),
        raw.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def issue_warehouse_email_otp(email):
    normalized_email = _normalize_email(email)
    if not normalized_email:
        raise ValueError("Email address is required.")

    cooldown_key = f"warehouse_otp_cooldown:{normalized_email}"
    if cache.get(cooldown_key):
        return 0

    otp = f"{secrets.randbelow(1000000):06d}"
    subject = "GrainRise Warehouse Manager Email Verification"
    text_message = (
        "Your GrainRise Warehouse Manager verification code is:\n\n"
        f"{otp}\n\n"
        "This code expires in 10 minutes.\n"
        "Do not share this verification code with anyone."
    )
    html_message = f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937;padding:24px;">
      <h2 style="color:#08511f;margin-bottom:8px;">GrainRise</h2>
      <h3>Warehouse Manager Email Verification</h3>
      <p>Use the verification code below to continue your Warehouse Manager registration.</p>
      <div style="margin:24px 0;padding:18px;background:#f0f8f2;border:1px solid #cce5d1;border-radius:12px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#08511f;">
        {otp}
      </div>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this code, you may safely ignore this email.</p>
    </div>
    """

    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [normalized_email],
    )
    message.attach_alternative(html_message, "text/html")

    try:
        message.send(fail_silently=False)
    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Gmail rejected EMAIL_USER / EMAIL_APP_PASSWORD. "
            "Use a valid Google App Password for the configured EMAIL_USER account."
        ) from exc

    otp_key = f"warehouse_otp:{normalized_email}"
    attempts_key = f"warehouse_otp_attempts:{normalized_email}"

    cache.set(
        otp_key,
        _warehouse_otp_hash(normalized_email, otp),
        timeout=WAREHOUSE_OTP_EXPIRATION_SECONDS,
    )
    cache.set(attempts_key, 0, timeout=WAREHOUSE_OTP_EXPIRATION_SECONDS)
    cache.set(
        cooldown_key,
        True,
        timeout=WAREHOUSE_OTP_RESEND_COOLDOWN_SECONDS,
    )

    return WAREHOUSE_OTP_RESEND_COOLDOWN_SECONDS


def verify_warehouse_email_otp(email, otp):
    normalized_email = _normalize_email(email)
    normalized_otp = str(otp or "").strip()

    if not normalized_email or not re.fullmatch(r"\d{6}", normalized_otp):
        return False

    otp_key = f"warehouse_otp:{normalized_email}"
    attempts_key = f"warehouse_otp_attempts:{normalized_email}"
    stored_hash = cache.get(otp_key)

    if not stored_hash:
        return False

    attempts = int(cache.get(attempts_key, 0))
    if attempts >= WAREHOUSE_OTP_MAX_ATTEMPTS:
        cache.delete(otp_key)
        cache.delete(attempts_key)
        return False

    entered_hash = _warehouse_otp_hash(normalized_email, normalized_otp)
    if hmac.compare_digest(stored_hash, entered_hash):
        cache.delete(otp_key)
        cache.delete(attempts_key)
        return True

    cache.set(
        attempts_key,
        attempts + 1,
        timeout=WAREHOUSE_OTP_EXPIRATION_SECONDS,
    )
    return False


# ============================================================
# CENTRAL USERS
# ============================================================

WAREHOUSE_ALLOWED_UNIQUE_USER_FIELDS = {"email", "username", "contact_number"}


def warehouse_user_value_exists(field, value):
    if field not in WAREHOUSE_ALLOWED_UNIQUE_USER_FIELDS:
        raise ValueError(f"Unsupported users field: {field}")

    normalized_value = _optional_text(value)
    if not normalized_value:
        return False

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT 1
            FROM users
            WHERE LOWER(CAST({field} AS TEXT)) = LOWER(%s)
            LIMIT 1
            """,
            [normalized_value],
        )
        return cursor.fetchone() is not None


def create_warehouse_user(data):
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
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                'warehouse_manager',
                'inactive'
            )
            """,
            [
                _required_text(data.get("first_name"), "First name"),
                _optional_text(data.get("middle_initial")),
                _required_text(data.get("last_name"), "Last name"),
                _optional_text(data.get("suffix")),
                _required_text(data.get("gender"), "Gender"),
                _required_text(data.get("province"), "Province"),
                _required_text(data.get("municipality"), "Municipality"),
                _optional_text(data.get("postal_code")),
                _required_text(data.get("barangay"), "Barangay"),
                _required_text(data.get("street_address"), "Street address"),
                _normalize_email(data.get("email")),
                _required_text(data.get("contact_number"), "Contact number"),
                _optional_text(data.get("username")),
                hash_warehouse_password(data["password"]),
            ],
        )
        user_id = cursor.lastrowid

    if not user_id:
        raise RuntimeError("Failed to create Warehouse Manager user account.")
    return int(user_id)


# ============================================================
# WAREHOUSE PROFILE
# ============================================================


def create_warehouse_profile(user_id, data):
    """Save the final Step 4 values after OCR review/editing."""

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO warehouse_profiles
            (
                user_id,
                business_name,
                organization_name,
                province,
                municipality,
                postal_code,
                barangay,
                street_address,
                official_email,
                official_contact_number
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                user_id,
                _required_text(data.get("business_name"), "Business name"),
                _optional_text(data.get("organization_name")),
                _required_text(data.get("business_province"), "Business province"),
                _required_text(
                    data.get("business_municipality"),
                    "Business municipality",
                ),
                _optional_text(data.get("business_postal_code")),
                _required_text(data.get("business_barangay"), "Business barangay"),
                _required_text(
                    data.get("business_street_address"),
                    "Business street address",
                ),
                _normalize_email(data.get("official_email")),
                _required_text(
                    data.get("official_contact_number"),
                    "Official contact number",
                ),
            ],
        )
        profile_id = cursor.lastrowid

    if not profile_id:
        raise RuntimeError("Failed to save the Warehouse business information.")
    return int(profile_id)


# ============================================================
# DOCUMENT VALIDATION / STORAGE
# ============================================================


def validate_warehouse_document(uploaded_file, document_type):
    if document_type not in WAREHOUSE_DOCUMENT_TYPES:
        raise ValueError("Invalid Warehouse document type.")

    label = WAREHOUSE_DOCUMENT_TYPES[document_type]["label"]
    if not uploaded_file:
        raise ValueError(f"{label} is required.")

    filename = get_valid_filename(Path(uploaded_file.name).name)
    extension = Path(filename).suffix.lower()
    if extension not in ALLOWED_WAREHOUSE_DOCUMENT_EXTENSIONS:
        raise ValueError(f"{label} must be JPG, JPEG, PNG, WEBP, or PDF.")

    content_type = getattr(uploaded_file, "content_type", "") or ""
    if content_type and content_type not in ALLOWED_WAREHOUSE_DOCUMENT_CONTENT_TYPES:
        raise ValueError(f"{label} has an unsupported file format.")

    if int(getattr(uploaded_file, "size", 0) or 0) > MAX_WAREHOUSE_DOCUMENT_SIZE:
        raise ValueError(f"{label} must not exceed 5MB.")

    return True


def save_warehouse_document(uploaded_file, user_id, document_type):
    validate_warehouse_document(uploaded_file, document_type)

    extension = Path(get_valid_filename(Path(uploaded_file.name).name)).suffix.lower()
    prefix = WAREHOUSE_DOCUMENT_TYPES[document_type]["filename_prefix"]
    filename = f"{prefix}_{uuid.uuid4().hex}{extension}"
    relative_path = Path("warehouse_documents") / str(user_id) / filename
    absolute_path = Path(settings.MEDIA_ROOT) / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)

    with absolute_path.open("wb") as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    try:
        uploaded_file.seek(0)
    except Exception:
        pass

    return relative_path.as_posix()


def delete_saved_warehouse_document(relative_path):
    if not relative_path:
        return

    absolute_path = Path(settings.MEDIA_ROOT) / relative_path
    try:
        if absolute_path.exists() and absolute_path.is_file():
            absolute_path.unlink()

        parent = absolute_path.parent
        if parent.exists() and not any(parent.iterdir()):
            parent.rmdir()
    except Exception:
        pass


def save_warehouse_documents(user_id, documents):
    saved_paths = {}
    try:
        for document_type in WAREHOUSE_DOCUMENT_TYPES:
            saved_paths[document_type] = save_warehouse_document(
                documents.get(document_type),
                user_id,
                document_type,
            )
        return saved_paths
    except Exception:
        for path in saved_paths.values():
            delete_saved_warehouse_document(path)
        raise


def create_warehouse_document_record(user_id, document_paths):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO warehouse_documents
            (
                user_id,
                government_issued_id,
                business_permit,
                business_registration,
                warehouse_license
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            [
                user_id,
                document_paths["government_issued_id"],
                document_paths["business_permit"],
                document_paths["business_registration"],
                document_paths["warehouse_license"],
            ],
        )
        doc_id = cursor.lastrowid

    if not doc_id:
        raise RuntimeError("Failed to save the Warehouse verification documents.")
    return int(doc_id)


# ============================================================
# OCR ENGINE
# ============================================================


def _load_ocr_dependencies():
    """Lazy import so Django can start even before OCR packages are installed."""

    try:
        import pymupdf
        import pytesseract
        from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    except ImportError as exc:
        raise RuntimeError(
            "Warehouse OCR dependencies are not installed yet. "
            "Required Python packages: pytesseract, Pillow, and PyMuPDF."
        ) from exc

    tesseract_cmd = os.getenv("TESSERACT_CMD")
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    return pymupdf, pytesseract, Image, ImageEnhance, ImageFilter, ImageOps


def _prepare_image_for_ocr(image):
    """Upscale and clean small screenshots/scans before Tesseract reads them."""

    _, _, Image, ImageEnhance, ImageFilter, ImageOps = _load_ocr_dependencies()

    image = image.convert("RGB")
    longest_side = max(image.width, image.height)

    if longest_side < 700:
        scale = 4
    elif longest_side < 1200:
        scale = 3
    elif longest_side < 1800:
        scale = 2
    else:
        scale = 1

    if scale > 1:
        image = image.resize(
            (image.width * scale, image.height * scale),
            Image.Resampling.LANCZOS,
        )

    image = ImageOps.grayscale(image)
    image = ImageOps.autocontrast(image)
    image = ImageEnhance.Contrast(image).enhance(1.6)
    return image.filter(ImageFilter.SHARPEN)


def _ocr_pil_image(image):
    """Read form-like documents using two useful Tesseract page layouts."""

    _, pytesseract, _, _, _, _ = _load_ocr_dependencies()
    image = _prepare_image_for_ocr(image)
    results = []

    for psm in (6, 11):
        text = pytesseract.image_to_string(
            image,
            config=f"--oem 3 --psm {psm}",
        )
        text = _normalize_ocr_text(text)
        if text:
            results.append(text)

    # Keep both outputs. PSM 6 usually keeps "Label: Value" on one line,
    # while PSM 11 can recover sparse text that PSM 6 misses.
    return "\n".join(results)


def _ocr_image_file(uploaded_file):
    _, _, Image, _, _, _ = _load_ocr_dependencies()

    try:
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)
        image.load()
        return _ocr_pil_image(image)
    finally:
        try:
            uploaded_file.seek(0)
        except Exception:
            pass


def _ocr_pdf_file(uploaded_file):
    pymupdf, _, Image, _, _, _ = _load_ocr_dependencies()

    try:
        uploaded_file.seek(0)
        pdf_bytes = uploaded_file.read()
        document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        extracted_pages = []

        for page in document:
            embedded_text = _normalize_ocr_text(page.get_text("text"))

            if embedded_text and len(embedded_text) >= 80:
                extracted_pages.append(embedded_text)
                continue

            matrix = pymupdf.Matrix(3, 3)
            pixmap = page.get_pixmap(matrix=matrix, alpha=False)
            image = Image.frombytes(
                "RGB",
                [pixmap.width, pixmap.height],
                pixmap.samples,
            )
            text = _ocr_pil_image(image) or embedded_text

            if text:
                extracted_pages.append(text)

        document.close()
        return "\n".join(extracted_pages)
    finally:
        try:
            uploaded_file.seek(0)
        except Exception:
            pass


def extract_text_from_warehouse_document(uploaded_file, document_type):
    validate_warehouse_document(uploaded_file, document_type)
    extension = Path(str(uploaded_file.name or "")).suffix.lower()

    if extension == ".pdf":
        return _ocr_pdf_file(uploaded_file)
    return _ocr_image_file(uploaded_file)


# ============================================================
# OCR FIELD EXTRACTION
# ============================================================


def _first_regex_value(text, patterns, flags=re.IGNORECASE):
    for pattern in patterns:
        match = re.search(pattern, text, flags)
        if match:
            value = _normalize_whitespace(match.group(1))
            if value:
                return value
    return None


def _find_email(text):
    match = re.search(
        r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        text,
        re.IGNORECASE,
    )
    return match.group(0).lower() if match else None


def _find_mobile_number(text):
    match = re.search(
        r"(?<!\d)(?:\+63|0)\s*9\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)",
        text,
    )
    if not match:
        return None

    value = re.sub(r"[\s-]", "", match.group(0))
    if value.startswith("+63"):
        value = "0" + value[3:]
    return value


def _clean_ocr_field_value(value):
    if not value:
        return None

    value = _normalize_whitespace(value)
    value = re.sub(r"^[\s_:;=\-–—]+", "", value)
    value = re.sub(r"[\s_:;=\-–—]+$", "", value)
    return value.strip() or None


def _extract_labeled_line(text, labels):
    """
    Require a real separator after a label.

    This prevents headings like "Business Name Registration"
    from being misread as Business Name = "Registration".
    """

    for label in labels:
        escaped = re.escape(label)
        value = _first_regex_value(
            text,
            [
                rf"(?im)^\s*{escaped}\s*[_\-.]?\s*[:=]\s*(.+?)\s*$",
                rf"(?im)^\s*{escaped}\s+[–—-]\s+(.+?)\s*$",
            ],
        )
        value = _clean_ocr_field_value(value)
        if value:
            return value

    return None


def _extract_city_from_permit_heading(text):
    value = _first_regex_value(
        text,
        [
            r"(?im)^\s*CITY\s+OF\s+([A-Z][A-Z .'\-]+?)\s*(?:[-–—=]|MAYOR)",
        ],
    )
    value = _clean_ocr_field_value(value)
    return value.title() if value else None


def _infer_province_from_city(city):
    if not city:
        return None

    metro_manila_cities = {
        "caloocan", "las piñas", "makati", "malabon", "mandaluyong",
        "manila", "marikina", "muntinlupa", "navotas", "parañaque",
        "pasay", "pasig", "pateros", "quezon city", "san juan",
        "taguig", "valenzuela",
    }

    return (
        "Metro Manila (NCR)"
        if city.strip().lower() in metro_manila_cities
        else None
    )


def _extract_business_fields_from_text(text, document_type=None):
    """
    Conservative label-based parsing.

    OCR only suggests Step 4 values. Missing fields stay blank so the
    user can review and enter data that is not present in the documents.
    """

    text = _normalize_ocr_text(text)
    if not text:
        return {}

    result = {
        "business_name": _extract_labeled_line(
            text,
            [
                "Business Name",
                "Name of Business",
                "Trade Name",
                "Warehouse Name",
                "Establishment Name",
            ],
        ),
        "organization_name": _extract_labeled_line(
            text,
            [
                "Corporate Name",
                "Company Name",
                "Organization Name",
                "Entity Name",
                "Registered Business Name",
            ],
        ),
        "province": _extract_labeled_line(text, ["Province"]),
        "municipality": _extract_labeled_line(
            text,
            ["Municipality", "City/Municipality", "Municipality/City"],
        ),
        "barangay": _extract_labeled_line(text, ["Barangay", "Brgy", "Brgy."]),
        "postal_code": _first_regex_value(
            text,
            [
                r"(?im)^\s*(?:ZIP|ZIP Code|Postal Code)\s*[_\-.]?\s*[:=]\s*(\d{4})\s*$",
            ],
        ),
        "street_address": _extract_labeled_line(
            text,
            [
                "Business Address",
                "Warehouse Address",
                "Registered Address",
                "Office Address",
                "Address",
            ],
        ),
        "official_email": _find_email(text),
        "official_contact_number": _find_mobile_number(text),
    }

    if not result["municipality"] and document_type == "business_permit":
        result["municipality"] = _extract_city_from_permit_heading(text)

    if not result["province"] and result["municipality"]:
        result["province"] = _infer_province_from_city(result["municipality"])

    return {
        key: _clean_ocr_field_value(value)
        for key, value in result.items()
        if key in WAREHOUSE_OCR_AUTOFILL_FIELDS and _optional_text(value)
    }


def _merge_ocr_fields(target, candidate):
    """Keep the first non-empty OCR suggestion for each field."""

    for field in WAREHOUSE_OCR_AUTOFILL_FIELDS:
        if not target.get(field) and candidate.get(field):
            target[field] = candidate[field]


def extract_warehouse_documents_ocr(documents):
    """
    OCR all four Step 3 documents and return editable Step 4 suggestions.

    Nothing is written to PostgreSQL here.
    """

    extracted = {}

    # Business documents are more useful for Step 4 than the ID, so
    # process them first when choosing the first detected value.
    priority = (
        "business_permit",
        "business_registration",
        "warehouse_license",
        "government_issued_id",
    )

    for document_type in priority:
        uploaded_file = documents.get(document_type)
        validate_warehouse_document(uploaded_file, document_type)
        raw_text = extract_text_from_warehouse_document(uploaded_file, document_type)
        candidate = _extract_business_fields_from_text(raw_text, document_type=document_type)
        _merge_ocr_fields(extracted, candidate)

    # Organization Name is optional. Do not copy Business Name into it;
    # only autofill it when an uploaded document explicitly provides one.
    return extracted


# ============================================================
# COMPLETE REGISTRATION
# ============================================================


def create_warehouse_registration(data, documents):
    """
    One transaction:
        users
        warehouse_profiles
        warehouse_documents

    Filesystem writes are cleaned up if the DB transaction later fails.
    """

    saved_document_paths = {}

    try:
        with transaction.atomic():
            email = _normalize_email(data.get("email"))
            username = _optional_text(data.get("username"))

            if warehouse_user_value_exists("email", email):
                raise ValueError("This email address is already registered.")

            if username and warehouse_user_value_exists("username", username):
                raise ValueError("This username is already registered.")

            user_id = create_warehouse_user(data)
            warehouse_profile_id = create_warehouse_profile(user_id, data)
            saved_document_paths = save_warehouse_documents(user_id, documents)
            warehouse_document_id = create_warehouse_document_record(
                user_id,
                saved_document_paths,
            )

            return {
                "user_id": user_id,
                "warehouse_profile_id": warehouse_profile_id,
                "warehouse_document_id": warehouse_document_id,
                "user_role": "warehouse_manager",
                "status": "inactive",
            }

    except IntegrityError as exc:
        for path in saved_document_paths.values():
            delete_saved_warehouse_document(path)

        error_text = str(exc).lower()
        if "email" in error_text:
            raise ValueError("This email address is already registered.") from exc
        if "username" in error_text:
            raise ValueError("This username is already registered.") from exc

        raise RuntimeError(
            "Warehouse Manager registration could not be saved because of a database constraint."
        ) from exc

    except Exception:
        for path in saved_document_paths.values():
            delete_saved_warehouse_document(path)
        raise
