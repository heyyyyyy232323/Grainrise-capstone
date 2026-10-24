import os
import re
import logging
from django.conf import settings
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from api.models import ContactSupportMessage

logger = logging.getLogger(__name__)

ALLOWED_ATTACHMENT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".docx", ".txt"}
MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024  # 5 MB
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def _clean_str(val, max_length=None):
    if val is None:
        return ""
    cleaned = str(val).strip()
    if max_length and len(cleaned) > max_length:
        return cleaned[:max_length]
    return cleaned


@csrf_exempt
@require_POST
def submit_contact_support(request):
    """
    Public endpoint for submitting Contact Support messages ('How Can We Help?').
    Accepts application/json or multipart/form-data.
    """
    try:
        content_type = str(request.content_type or "").lower()
        if "application/json" in content_type:
            import json
            try:
                body = request.body.decode("utf-8") if request.body else "{}"
                data = json.loads(body)
            except Exception:
                return JsonResponse(
                    {"success": False, "message": "Invalid JSON payload."},
                    status=400,
                )
        else:
            data = request.POST.dict()

        full_name = _clean_str(data.get("fullName") or data.get("full_name"), 150)
        email = _clean_str(data.get("email"), 255)
        user_role = _clean_str(data.get("userRole") or data.get("user_role"), 100)
        concern_category = _clean_str(data.get("concernCategory") or data.get("concern_category"), 100)
        reference_id = _clean_str(data.get("referenceId") or data.get("reference_id"), 100)
        subject = _clean_str(data.get("subject"), 255)
        description = _clean_str(data.get("description"), 5000)

        # Validation
        errors = {}
        if not full_name:
            errors["fullName"] = "Full name is required."
        elif len(full_name) < 2:
            errors["fullName"] = "Full name must be at least 2 characters."

        if not email:
            errors["email"] = "Email address is required."
        elif not EMAIL_REGEX.match(email):
            errors["email"] = "Please enter a valid email address."

        if not concern_category:
            errors["concernCategory"] = "Concern category is required."

        if not subject:
            errors["subject"] = "Subject is required."
        elif len(subject) < 3:
            errors["subject"] = "Subject must be at least 3 characters."

        if not description:
            errors["description"] = "Description is required."
        elif len(description) < 10:
            errors["description"] = "Please provide more details (at least 10 characters)."

        if errors:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Validation failed. Please correct the highlighted fields.",
                    "errors": errors,
                },
                status=400,
            )

        # Optional Attachment Handling
        attachment_name = _clean_str(data.get("attachmentName") or data.get("attachment_name"), 255)
        attachment_file = None

        if "attachment" in request.FILES:
            uploaded_file = request.FILES["attachment"]
            ext = os.path.splitext(uploaded_file.name)[1].lower()
            if ext not in ALLOWED_ATTACHMENT_EXTENSIONS:
                return JsonResponse(
                    {
                        "success": False,
                        "message": f"Attachment file type '{ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_ATTACHMENT_EXTENSIONS))}",
                    },
                    status=400,
                )

            if uploaded_file.size > MAX_ATTACHMENT_BYTES:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Attachment file size exceeds 5MB limit.",
                    },
                    status=400,
                )

            attachment_file = uploaded_file
            if not attachment_name:
                attachment_name = uploaded_file.name

        # Save to database
        message = ContactSupportMessage.objects.create(
            full_name=full_name,
            email=email,
            user_role=user_role or None,
            concern_category=concern_category,
            reference_id=reference_id or None,
            subject=subject,
            description=description,
            attachment_name=attachment_name or None,
            attachment_file=attachment_file,
            is_read=False,
            status="unread",
        )

        logger.info(
            "Contact support message created: id=%s, email=%s, category=%s",
            message.support_id,
            message.email,
            message.concern_category,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Thank you! Your support request has been submitted successfully.",
                "data": {
                    "support_id": message.support_id,
                    "reference_id": message.reference_id,
                    "created_at": message.created_at.isoformat(),
                },
            },
            status=201,
        )

    except Exception as exc:
        logger.exception("Error processing contact support submission: %s", exc)
        return JsonResponse(
            {
                "success": False,
                "message": "An unexpected error occurred while processing your request. Please try again later.",
                "error": str(exc),
            },
            status=500,
        )

