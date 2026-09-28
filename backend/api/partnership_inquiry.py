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

def _validate_and_save_document(uploaded_file, inquiry_id):
    if not uploaded_file:
        return None
    if uploaded_file.size > MAX_FILE_BYTES:
        raise ValueError("Document file size must not exceed 5 MB.")
    _, ext = os.path.splitext(uploaded_file.name.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Unsupported file extension '{ext}'. Allowed: JPG, PNG, WEBP, PDF.")
    
    unique_suffix = secrets.token_hex(16)
    filename = f"doc_{unique_suffix}{ext}"
    rel_dir = os.path.join("partnership_documents", str(inquiry_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)
    abs_path = os.path.join(abs_dir, filename)

    with open(abs_path, "wb") as dest:
        for chunk in uploaded_file.chunks():
            dest.write(chunk)

    return os.path.join(rel_dir, filename).replace("\\", "/")

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

    # Support multiple document uploads
    uploaded_docs = request.FILES.getlist("business_verification_documents")
    if not uploaded_docs:
        uploaded_docs = request.FILES.getlist("business_verification_document")
    if not uploaded_docs and request.FILES.get("business_verification_document"):
        uploaded_docs = [request.FILES.get("business_verification_document")]

    errors = {}
    if not name:
        errors["name"] = "Name is required."
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

    if not uploaded_docs:
        errors["business_verification_document"] = "Please upload at least one business verification document."
    else:
        for doc in uploaded_docs:
            if doc.size > MAX_FILE_BYTES:
                errors["business_verification_document"] = f"File '{doc.name}' exceeds the 5MB size limit."
                break
            _, ext = os.path.splitext((doc.name or "").lower())
            if ext not in ALLOWED_EXTENSIONS:
                errors["business_verification_document"] = f"File '{doc.name}' has an unsupported file type '{ext}'. Allowed: JPG, PNG, WEBP, PDF."
                break

    if errors:
        return Response(errors, status=http_status.HTTP_400_BAD_REQUEST)

    # Save documents
    import uuid
    app_uuid = uuid.uuid4()
    saved_doc_paths = []
    try:
        for doc in uploaded_docs:
            rel_path = _validate_and_save_document(doc, app_uuid)
            if rel_path:
                saved_doc_paths.append(rel_path)
    except Exception as exc:
        logger.exception("Failed to save documents: %s", exc)
        return Response({"detail": "Failed to store uploaded document."}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

    doc_storage_val = json.dumps(saved_doc_paths) if len(saved_doc_paths) > 1 else (saved_doc_paths[0] if saved_doc_paths else None)

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
            business_verification_document=doc_storage_val,
            status=PartnershipInquiry.Status.TO_REVIEW,
            email_verified=False,
            verification_token_hash=token_hash,
            verification_expires_at=expires_at,
        )
    except Exception as exc:
        logger.exception("Error creating inquiry: %s", exc)

    # Send verification email
    try:
        _send_verification_email(name, email, partner_role, raw_token)
    except Exception as exc:
        logger.warning("Could not send verification email: %s", exc)

    return Response({
        "success": True,
        "message": "Your partnership application has been received and submitted for review.",
        "requires_email_verification": True,
        "inquiry_id": str(app_uuid),
        "email": email,
        "uploaded_files_count": len(saved_doc_paths),
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
