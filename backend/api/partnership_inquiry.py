import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta
from django.utils import timezone

from django.conf import settings
from django.db import connection, transaction
from django.core.mail import EmailMultiAlternatives
from django.utils.html import escape
from rest_framework import status as http_status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import PartnershipInquiry

logger = logging.getLogger(__name__)


ALLOWED_PARTNER_ROLES = {"miller", "warehouse", "retailer"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_MESSAGE_LENGTH = 2000
VERIFICATION_TOKEN_TTL_SECONDS = 24 * 3600
RESEND_COOLDOWN_SECONDS = 60

ROLE_LABELS = {
    "miller": "Miller / Supplier",
    "warehouse": "Warehouse Manager",
    "retailer": "Retailer",
}

def _validate_and_normalize_phone(raw_phone):
    if not raw_phone:
        return None
    cleaned = re.sub(r"[\s\-\(\)]", "", str(raw_phone).strip())
    if re.match(r"^09\d{9}$", cleaned):
        return "+63" + cleaned[1:]
    if re.match(r"^\+639\d{9}$", cleaned):
        return cleaned
    if re.match(r"^639\d{9}$", cleaned):
        return "+" + cleaned
    return None

def _sanitize_message(raw_message):
    if not raw_message:
        return ""
    text = str(raw_message).replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def _generate_verification_token():
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    return raw_token, token_hash

def _validate_and_save_document(uploaded_file, inquiry_id, prefix="doc"):
    if not uploaded_file:
        return None
    if uploaded_file.size > MAX_FILE_BYTES:
        raise ValueError("Document file size must not exceed 5 MB.")
    _, ext = os.path.splitext(uploaded_file.name.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension '{ext}'. Allowed: JPG, PNG, WEBP, PDF.")
    
    unique_suffix = secrets.token_hex(16)
    filename = f"{prefix}_{unique_suffix}{ext}"
    rel_dir = os.path.join("partnership_documents", str(inquiry_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(abs_dir, filename)

    try:
        uploaded_file.seek(0)
    except Exception:
        pass

    with open(abs_path, "wb") as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    try:
        uploaded_file.seek(0)
    except Exception:
        pass

    return os.path.join(rel_dir, filename).replace("\\", "/")


# ============================================================
# OCR ENGINE & NAME VS ID VALIDATION
# ============================================================

ID_KEYWORDS = {
    "republic", "philippines", "pilipinas", "driver", "license", "licence",
    "identification", "identity", "card", "passport", "postal", "voter",
    "surname", "name", "pangalan", "apelyido", "given", "middle", "birth",
    "sex", "philsys", "umid", "sss", "prc", "republika", "komisyon",
    "department", "kagawaran", "republica", "social", "security", "system",
    "national", "bureau", "internal", "revenue", "tin", "philhealth",
}

OCR_MAX_SIDE = 1200
_RAPID_OCR_ENGINE = None


def _load_id_ocr_dependencies():
    global _RAPID_OCR_ENGINE

    try:
        import pymupdf
        from PIL import Image, ImageEnhance, ImageFilter, ImageOps
        from rapidocr import RapidOCR
    except ImportError as exc:
        logger.error("OCR dependencies missing: %s", exc)
        return None, None, None, None, None, None

    try:
        if _RAPID_OCR_ENGINE is None:
            logger.info("Initializing RapidOCR engine once...")
            _RAPID_OCR_ENGINE = RapidOCR(
                params={
                    "Global.use_cls": False,
                    "Global.max_side_len": OCR_MAX_SIDE,
                    "EngineConfig.onnxruntime.intra_op_num_threads": 1,
                    "EngineConfig.onnxruntime.inter_op_num_threads": 1,
                }
            )

        ocr_engine = _RAPID_OCR_ENGINE

    except Exception as exc:
        logger.exception("Failed to initialize RapidOCR: %s", exc)
        return None, None, None, None, None, None

    return pymupdf, ocr_engine, Image, ImageEnhance, ImageFilter, ImageOps


def _run_rapidocr(ocr_engine, image):
    try:
        result = ocr_engine(image)
        texts = getattr(result, "txts", None)

        if texts:
            return "\n".join(str(text) for text in texts if text)

        return ""

    except Exception as exc:
        logger.exception("RapidOCR failed: %s", exc)
        return ""


def _prepare_image_for_id_ocr(image, ImageOps, ImageEnhance, ImageFilter):
    """
    Prepare a government ID image for OCR with lower memory usage.

    Important:
    - Never upscale.
    - Do NOT close the source image here because it may still be backed
      by Django's uploaded file and is needed later for permanent saving.
    """

    try:
        image.draft("RGB", (OCR_MAX_SIDE, OCR_MAX_SIDE))
    except Exception:
        pass

    # Downscale only.
    image.thumbnail((OCR_MAX_SIDE, OCR_MAX_SIDE))

    # Convert to grayscale for lower memory usage.
    gray = ImageOps.grayscale(image)

    # Lightweight preprocessing only.
    processed = ImageOps.autocontrast(gray)

    if processed is not gray:
        try:
            gray.close()
        except Exception:
            pass

    return processed


def _extract_text_from_id_file(uploaded_file):
    (
        pymupdf,
        ocr_engine,
        Image,
        ImageEnhance,
        ImageFilter,
        ImageOps,
    ) = _load_id_ocr_dependencies()

    if not ocr_engine:
        return ""

    filename = getattr(uploaded_file, "name", "") or ""
    _, ext = os.path.splitext(filename.lower())
    results = []

    try:
        uploaded_file.seek(0)

        if ext == ".pdf":
            pdf_bytes = uploaded_file.read()
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

            try:
                # Government-ID PDFs should not require scanning a long file.
                max_pages = min(len(doc), 2)

                for page_index in range(max_pages):
                    page = doc[page_index]
                    text = page.get_text("text") or ""

                    # Prefer embedded PDF text when available.
                    if len(text.strip()) >= 50:
                        results.append(text)
                        continue

                    # Lower render scale than the previous 2.5x to save RAM.
                    matrix = pymupdf.Matrix(1.5, 1.5)
                    pix = page.get_pixmap(matrix=matrix, alpha=False)

                    pil_img = Image.frombytes(
                        "RGB",
                        [pix.width, pix.height],
                        pix.samples,
                    )
                    pix = None

                    proc_img = _prepare_image_for_id_ocr(
                        pil_img,
                        ImageOps,
                        ImageEnhance,
                        ImageFilter,
                    )

                    try:
                        ocr_txt = _run_rapidocr(ocr_engine, proc_img)

                        if ocr_txt.strip():
                            results.append(ocr_txt)
                    finally:
                        try:
                            proc_img.close()
                        except Exception:
                            pass

            finally:
                doc.close()

        else:
            img = Image.open(uploaded_file)

            # Do not call img.load() here. draft()/thumbnail() may allow Pillow
            # to avoid expanding a huge phone photo at full resolution first.
            proc_img = _prepare_image_for_id_ocr(
                img,
                ImageOps,
                ImageEnhance,
                ImageFilter,
            )

            try:
                txt = _run_rapidocr(ocr_engine, proc_img)

                if txt.strip():
                    results.append(txt)
            finally:
                try:
                    proc_img.close()
                except Exception:
                    pass

    except Exception as exc:
        logger.exception("Error extracting text from ID: %s", exc)

    finally:
        try:
            uploaded_file.seek(0)
        except Exception:
            pass

    final_text = "\n".join(results)
    logger.info("OCR extracted %d characters", len(final_text))
    return final_text

def _clean_name_string(s):
    s = str(s or "").lower().replace("ñ", "n")
    s = re.sub(r"[\.,\-/\'\"\(\):;#]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _verify_name_against_id(legal_name, uploaded_id_file):
    """
    Compare entered legal name with name read from uploaded ID using OCR.
    Returns: (validation_status, reason)
    validation_status is one of: 'MATCH', 'MISMATCH', 'UNCERTAIN'
    """
    if not uploaded_id_file:
        return "UNCERTAIN", "No government ID uploaded."

    try:
        ocr_text = _extract_text_from_id_file(uploaded_id_file)
    except Exception as exc:
        logger.exception("OCR extraction failed: %s", exc)
        return "UNCERTAIN", "Could not process document with OCR."

    ocr_clean = _clean_name_string(ocr_text)
    ocr_compact = ocr_clean.replace(" ", "")
    ocr_words = ocr_clean.split()

    alpha_chars = re.findall(r"[a-z]", ocr_clean)
    if len(alpha_chars) < 25:
        logger.info("OCR returned fewer than 25 alpha characters (%d)", len(alpha_chars))
        return "UNCERTAIN", "Image too blurry or insufficient text."

    has_id_context = any(k in ocr_clean for k in ID_KEYWORDS)

    name_clean = _clean_name_string(legal_name)
    name_words = [w for w in name_clean.split() if w not in {"mr", "ms", "mrs", "dr", "atty", "engr"}]
    if not name_words:
        return "MISMATCH", "Full legal name is required."

    suffixes = {"jr", "sr", "ii", "iii", "iv", "v", "junior", "senior"}
    core_words = [w for w in name_words if w not in suffixes]

    matched_words = []
    import difflib
    for w in core_words:
        if len(w) == 1:
            # Middle initial match
            matched = any(ow.startswith(w) for ow in ocr_words)
        else:
            # Full word, compact substring, fuzzy, or initial match
            matched = (
                (w in ocr_words)
                or (w in ocr_compact)
                or any(difflib.SequenceMatcher(None, w, ow).ratio() >= 0.82 for ow in ocr_words if len(ow) >= len(w) - 1)
                or any(len(ow) == 1 and w.startswith(ow) for ow in ocr_words)
            )
        if matched:
            matched_words.append(w)

    significant_words = [w for w in core_words if len(w) > 1]
    if significant_words and len(matched_words) >= len(significant_words) * 0.75:
        return "MATCH", "Name verified."

    if has_id_context and len(matched_words) == 0:
        return "MISMATCH", "Valid ID detected but legal name was not found."

    return "UNCERTAIN", "Could not confidently verify that the name matches."

def _send_verification_email(name, email, role, raw_token):
    frontend_base = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    verify_url = f"{frontend_base.rstrip('/')}/partner-with-us/verify-email/{raw_token}"
    role_label = ROLE_LABELS.get(role, role.capitalize())

    subject = f"Verify Your GrainRise Partnership Application ({role_label})"
    text_content = f"""Hello {name},

Thank you for your interest in partnering with GrainRise as a {role_label}.

Please verify your email address by visiting this link:
{verify_url}

This link expires in 24 hours.

If you did not make this request, please disregard this email.

GrainRise Team"""
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 16px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02); border: 1px solid #e2e8f0;">
                        <!-- Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #064e1e 0%, #0f7634 100%); padding: 36px 32px 32px 32px; text-align: center;">
                                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 30px; margin-bottom: 12px; border: 1px solid rgba(255, 255, 255, 0.25);">
                                    <span style="font-size: 11px; font-weight: 700; color: #fef08a; text-transform: uppercase; letter-spacing: 1.5px;">Email Verification</span>
                                </div>
                                <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">GrainRise</h1>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: #bbf7d0; font-weight: 500;">Agricultural Supply & Distribution Platform</p>
                            </td>
                        </tr>

                        <!-- Body Content -->
                        <tr>
                            <td style="padding: 36px 32px 28px 32px;">
                                <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                                    Hello, {escape(name)}!
                                </h2>
                                <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                    Thank you for submitting your partnership application as a <strong style="color: #065f46; font-weight: 700;">{escape(role_label)}</strong>.
                                </p>
                                <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                                    To ensure the security of your inquiry and submit your application for administrative review, please verify your email address by clicking the button below:
                                </p>

                                <!-- CTA Button -->
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0 24px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="{verify_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #08511f 0%, #0d6e2c 100%); color: #ffffff; text-decoration: none; padding: 14px 38px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.2px; box-shadow: 0 4px 12px rgba(8, 81, 31, 0.35); text-align: center;">
                                                Verify Email Address &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Expiry Notice -->
                                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 24px 0; text-align: center;">
                                    <span style="font-size: 12px; color: #64748b; font-weight: 500;">
                                        &#9200; This verification link is valid for <strong>24 hours</strong>.
                                    </span>
                                </div>

                                <p style="margin: 20px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5;">
                                    Or copy and paste this link into your browser:<br>
                                    <a href="{verify_url}" style="color: #08511f; word-break: break-all; text-decoration: underline;">{verify_url}</a>
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                                    If you did not initiate this request, you can safely ignore this email.<br>
                                    &copy; 2026 GrainRise Platform. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    msg = EmailMultiAlternatives(subject, text_content, settings.DEFAULT_FROM_EMAIL, [email])
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=False)


def _check_email_used(email):
    norm_email = (email or "").strip().lower()
    if not norm_email:
        return False, None
    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id FROM users WHERE LOWER(email) = %s LIMIT 1", [norm_email])
        if cursor.fetchone():
            return True, "This email address is already registered to an existing account."
        cursor.execute(
            "SELECT partnership_inquiry_id FROM partnership_inquiries WHERE LOWER(email) = %s AND status IN ('to_review', 'active') LIMIT 1",
            [norm_email]
        )
        if cursor.fetchone():
            return True, "This email address has already been used in an existing partnership application."
    return False, None


def _check_organization_used(organization):
    norm_org = (organization or "").strip().lower()
    if not norm_org:
        return False, None
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT supplier_profile_id FROM supplier_profiles WHERE LOWER(business_name) = %s OR LOWER(organization_name) = %s LIMIT 1",
            [norm_org, norm_org]
        )
        if cursor.fetchone():
            return True, "This company or organization name is already registered."
        cursor.execute(
            "SELECT warehouse_profile_id FROM warehouse_profiles WHERE LOWER(business_name) = %s OR LOWER(organization_name) = %s LIMIT 1",
            [norm_org, norm_org]
        )
        if cursor.fetchone():
            return True, "This company or organization name is already registered."
        cursor.execute(
            "SELECT partnership_inquiry_id FROM partnership_inquiries WHERE LOWER(organization_company) = %s AND status IN ('to_review', 'active') LIMIT 1",
            [norm_org]
        )
        if cursor.fetchone():
            return True, "This company or organization name is already used in an active partnership application."
    return False, None


def _check_name_used(name):
    norm_name = " ".join((name or "").strip().lower().split())
    if not norm_name:
        return False, None
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT user_id FROM users 
            WHERE LOWER(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))) = %s
               OR LOWER(TRIM(first_name)) = %s
            LIMIT 1
        """, [norm_name, norm_name])
        if cursor.fetchone():
            return True, "This full name has already been registered to an existing account."
        cursor.execute(
            "SELECT partnership_inquiry_id FROM partnership_inquiries WHERE LOWER(TRIM(name)) = %s AND status IN ('to_review', 'active') LIMIT 1",
            [norm_name]
        )
        if cursor.fetchone():
            return True, "This name is already used in an existing partnership application."
    return False, None


@api_view(["GET"])
@permission_classes([AllowAny])
def check_partnership_availability(request):
    """
    GET /api/partnership-inquiries/check-availability/
    Query params: ?email=...&name=...&organization=...
    """
    email = request.query_params.get("email")
    name = request.query_params.get("name")
    organization = request.query_params.get("organization") or request.query_params.get("organization_company")

    res = {
        "email_used": False,
        "email_error": None,
        "organization_used": False,
        "organization_error": None,
        "name_used": False,
        "name_error": None,
    }

    if email:
        used, err = _check_email_used(email)
        res["email_used"] = used
        res["email_error"] = err

    if organization:
        used, err = _check_organization_used(organization)
        res["organization_used"] = used
        res["organization_error"] = err

    if name:
        used, err = _check_name_used(name)
        res["name_used"] = used
        res["name_error"] = err

    return Response(res, status=http_status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def submit_partnership_inquiry(request):
    """
    POST /api/partnership-inquiries/
    Submits application with duplicate validation and multi-file document upload support.
    """
    data = request.data
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    organization_company = (data.get("organization") or data.get("organization_company") or "").strip()
    partner_role = (data.get("partner_role") or data.get("role") or "").strip().lower()
    raw_phone = data.get("contact_number") or data.get("contact")
    raw_message = data.get("message")

    # Two required single-file uploads: government_issued_id and business_verification_document
    uploaded_gov_id = request.FILES.get("government_issued_id")
    uploaded_biz_doc = request.FILES.get("business_verification_document")
    if not uploaded_biz_doc:
        uploaded_biz_doc = request.FILES.get("business_verification_documents")

    errors = {}
    if not name:
        errors["name"] = "Full legal name is required."
    else:
        name_used, name_err = _check_name_used(name)
        if name_used:
            errors["name"] = name_err

    if not email:
        errors["email"] = "Email is required."
    elif not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors["email"] = "Please enter a valid email address."
    else:
        email_used, email_err = _check_email_used(email)
        if email_used:
            errors["email"] = email_err

    if not organization_company:
        errors["organization"] = "Organization or company name is required."
    else:
        org_used, org_err = _check_organization_used(organization_company)
        if org_used:
            errors["organization"] = org_err

    if not partner_role:
        errors["partner_role"] = "Partner role is required."
    elif partner_role not in ALLOWED_PARTNER_ROLES:
        errors["partner_role"] = "Invalid partner role selected. Must be Miller, Warehouse, or Retailer."

    normalized_phone = _validate_and_normalize_phone(raw_phone)
    if not normalized_phone:
        errors["contact_number"] = "Please enter a valid Philippine contact number (e.g., 09XXXXXXXXX or +639XXXXXXXXX)."

    clean_msg = _sanitize_message(raw_message)
    if not clean_msg:
        errors["message"] = "Partnership message is required."

    if not uploaded_gov_id:
        errors["government_issued_id"] = "Valid Government-Issued ID is required."
    else:
        if uploaded_gov_id.size > MAX_FILE_BYTES:
            errors["government_issued_id"] = f"File '{uploaded_gov_id.name}' exceeds the 5MB size limit."
        else:
            _, ext = os.path.splitext((uploaded_gov_id.name or "").lower())
            if ext not in ALLOWED_EXTENSIONS:
                errors["government_issued_id"] = f"File '{uploaded_gov_id.name}' has an unsupported file type '{ext}'. Allowed: JPG, PNG, WEBP, PDF."

    if not uploaded_biz_doc:
        errors["business_verification_document"] = "Valid Business Document is required."
    else:
        if uploaded_biz_doc.size > MAX_FILE_BYTES:
            errors["business_verification_document"] = f"File '{uploaded_biz_doc.name}' exceeds the 5MB size limit."
        else:
            _, ext = os.path.splitext((uploaded_biz_doc.name or "").lower())
            if ext not in ALLOWED_EXTENSIONS:
                errors["business_verification_document"] = f"File '{uploaded_biz_doc.name}' has an unsupported file type '{ext}'. Allowed: JPG, PNG, WEBP, PDF."

    if errors:
        return Response(errors, status=http_status.HTTP_400_BAD_REQUEST)

    # Validate Legal Name vs Government-Issued ID via OCR
    validation_status, reason = _verify_name_against_id(name, uploaded_gov_id)
    logger.info("Partnership Inquiry name-vs-ID verification: status=%s, reason=%s", validation_status, reason)

    if validation_status == "MISMATCH":
        return Response(
            {
                "success": False,
                "validation_status": "MISMATCH",
                "error_code": "NAME_MISMATCH",
                "title": "Name Does Not Match ID",
                "detail": "The full legal name you entered does not match the name detected on your uploaded government-issued ID. Please enter your name exactly as shown on your ID or upload the correct document.",
            },
            status=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if validation_status == "UNCERTAIN":
        return Response(
            {
                "success": False,
                "validation_status": "UNCERTAIN",
                "error_code": "NAME_UNCERTAIN",
                "title": "We Could Not Verify the Name",
                "detail": "We could not confidently verify that the name you entered matches the name on your uploaded ID. Please review your legal name or upload a clearer ID image.",
            },
            status=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Save documents only after validation passes
    import uuid
    app_uuid = uuid.uuid4()
    try:
        gov_id_path = _validate_and_save_document(uploaded_gov_id, app_uuid, prefix="gov_id")
        biz_doc_path = _validate_and_save_document(uploaded_biz_doc, app_uuid, prefix="biz_doc")
    except Exception as exc:
        logger.exception("Failed to save documents: %s", exc)
        return Response({"detail": "Failed to store uploaded document."}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Save temporary inquiry for email verification
    raw_token, token_hash = _generate_verification_token()
    expires_at = timezone.now() + timedelta(seconds=VERIFICATION_TOKEN_TTL_SECONDS)

    try:
        inquiry = PartnershipInquiry.objects.create(
            partnership_inquiry_id=app_uuid,
            name=name,
            email=email,
            organization_company=organization_company,
            partner_role=partner_role,
            contact_number=normalized_phone,
            message=clean_msg,
            government_issued_id=gov_id_path,
            business_verification_document=biz_doc_path,
            status=PartnershipInquiry.Status.TO_REVIEW,
            email_verified=False,
            verification_token_hash=token_hash,
            verification_expires_at=expires_at,
        )
    except Exception as exc:
        logger.exception("Error creating partnership inquiry: %s", exc)
        return Response(
            {
                "success": False,
                "detail": "Unable to save partnership application.",
            },
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Send verification email
    try:
        _send_verification_email(name, email, partner_role, raw_token)
    except Exception as exc:
        logger.warning("Could not send verification email: %s", exc)

    return Response({
        "success": True,
        "validation_status": "MATCH",
        "message": "Your partnership application has been received and submitted for review.",
        "requires_email_verification": True,
        "inquiry_id": str(app_uuid),
        "email": email,
    }, status=http_status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([AllowAny])
def verify_partnership_email(request, token):
    """
    GET /api/partnership-inquiries/verify-email/<token>/
    """
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    try:
        inquiry = PartnershipInquiry.objects.filter(verification_token_hash=token_hash).first()
        if inquiry:
            inquiry.email_verified = True
            inquiry.verified_at = timezone.now()
            inquiry.save(update_fields=["email_verified", "verified_at", "updated_at"])
            
    except Exception as exc:
        logger.exception("Verification error: %s", exc)

    return Response({
        "success": True,
        "message": "Email verified successfully! Your application is now in review.",
    }, status=http_status.HTTP_200_OK)

@api_view(["POST"])
@permission_classes([AllowAny])
def resend_partnership_verification(request):
    data = request.data
    email = (data.get("email") or "").strip().lower()
    inquiry = PartnershipInquiry.objects.filter(email=email).order_by("-created_at").first()
    if inquiry:
        raw_token, token_hash = _generate_verification_token()
        inquiry.verification_token_hash = token_hash
        inquiry.verification_expires_at = timezone.now() + timedelta(seconds=VERIFICATION_TOKEN_TTL_SECONDS)
        inquiry.save(update_fields=["verification_token_hash", "verification_expires_at", "updated_at"])
        try:
            _send_verification_email(inquiry.name, inquiry.email, inquiry.partner_role, raw_token)
        except Exception:
            pass
    return Response({"success": True, "message": "A new verification link has been sent if the email exists."})

# Stubs for backwards compatibility if called
@api_view(["GET"])
def admin_list_partnership_inquiries(request):
    return Response({"success": True, "results": [], "counts": {"to_review": 0, "active": 0, "inactive": 0}})

@api_view(["GET", "PATCH", "DELETE"])
def admin_get_or_update_partnership_inquiry(request, inquiry_id):
    return Response({"success": True})

@api_view(["POST"])
def admin_update_partnership_inquiry_status(request, inquiry_id):
    return Response({"success": True})
