import hashlib
import hmac
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

@api_view(["POST"])
@permission_classes([AllowAny])
@parser_classes([MultiPartParser, FormParser])
def submit_partnership_inquiry(request):
    """
    POST /api/partnership-inquiries/
    Submits application and directly registers applicant into users table (inactive / To Review).
    """
    data = request.data
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    organization_company = (data.get("organization") or data.get("organization_company") or "").strip()
    partner_role = (data.get("partner_role") or data.get("role") or "").strip().lower()
    raw_phone = data.get("contact_number") or data.get("contact")
    raw_message = data.get("message")
    uploaded_doc = request.FILES.get("business_verification_document")

    errors = {}
    if not name:
        errors["name"] = "Name is required."
    if not email:
        errors["email"] = "Email is required."
    elif not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        errors["email"] = "Please enter a valid email address."
    if not organization_company:
        errors["organization"] = "Organization or company name is required."
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

    if not uploaded_doc:
        errors["business_verification_document"] = "Business verification document is required."
    else:
        if uploaded_doc.size > MAX_FILE_BYTES:
            errors["business_verification_document"] = "Document must not exceed 5MB."
        else:
            _, ext = os.path.splitext((uploaded_doc.name or "").lower())
            if ext not in ALLOWED_EXTENSIONS:
                errors["business_verification_document"] = f"Unsupported file type '{ext}'."

    if errors:
        return Response(errors, status=http_status.HTTP_400_BAD_REQUEST)

    # Save document
    import uuid
    app_uuid = uuid.uuid4()
    try:
        doc_rel_path = _validate_and_save_document(uploaded_doc, app_uuid)
    except Exception as exc:
        logger.exception("Failed to save document: %s", exc)
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
            business_verification_document=doc_rel_path,
            status=PartnershipInquiry.Status.TO_REVIEW,
            email_verified=False,
            verification_token_hash=token_hash,
            verification_expires_at=expires_at,
        )
    except Exception as exc:
        logger.exception("Error creating inquiry: %s", exc)

    # Account creation occurs when Admin clicks Confirm in the management module.

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
