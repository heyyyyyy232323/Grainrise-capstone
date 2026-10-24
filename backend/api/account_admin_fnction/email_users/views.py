import json
import logging

from datetime import date, datetime
from decimal import Decimal

logger = logging.getLogger(__name__)

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.utils import authorization_payload
from api.models import PartnershipInquiry, ContactSupportMessage

from ..admin_auth import account_admin_required

from .selectors import (
    get_sent_email_history_detail,
    list_sent_email_history,
    search_email_recipients,
    list_received_support_messages,
    get_received_support_message_detail,
)

from .services import (
    send_account_admin_email,
    mark_support_message_read,
    update_support_message_status,
)


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    """
    Convert Python/database values into JSON-safe values.
    """

    if isinstance(
        value,
        (datetime, date),
    ):
        return value.isoformat()

    if isinstance(
        value,
        Decimal,
    ):
        return float(value)

    return value


def _serialize_row(row):
    """
    Serialize one dictionary row.
    """

    if not row:
        return None

    return {
        key: _serialize_value(value)
        for key, value in row.items()
    }


def _serialize_rows(rows):
    """
    Serialize multiple dictionary rows.
    """

    return [
        _serialize_row(row)
        for row in rows
    ]


# ============================================================
# REQUEST BODY
# ============================================================

def _read_request_data(request):
    """
    Read JSON or form request data.
    """

    content_type = str(
        request.content_type
        or ""
    ).lower()

    if "application/json" in content_type:
        try:
            raw_body = (
                request.body.decode(
                    "utf-8"
                )
                if request.body
                else ""
            )

            if not raw_body:
                return {}

            payload = json.loads(
                raw_body
            )

            if not isinstance(
                payload,
                dict,
            ):
                raise ValueError(
                    "Request body must be a JSON object."
                )

            return payload

        except (
            UnicodeDecodeError,
            json.JSONDecodeError,
        ) as exc:
            raise ValueError(
                "Invalid JSON request body."
            ) from exc

    return request.POST.dict()


# ============================================================
# AUTHENTICATED ADMIN ID
# ============================================================

def _authenticated_admin_id(request):
    """
    Read the currently authenticated administrator ID
    from the existing GrainRise JWT.

    Existing admin access token:
        payload["sub"] = admin_id
    """

    payload = authorization_payload(
        request
    )

    if not payload:
        raise ValueError(
            "Administrator authentication is required."
        )

    raw_admin_id = payload.get(
        "sub"
    )

    if raw_admin_id is None:
        raise ValueError(
            "Administrator ID is missing from the authentication token."
        )

    try:
        admin_id = int(
            raw_admin_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid administrator authentication token."
        ) from exc

    if admin_id <= 0:
        raise ValueError(
            "Invalid administrator authentication token."
        )

    return admin_id


# ============================================================
# SEARCH EMAIL RECIPIENTS
# ============================================================

@require_GET
@account_admin_required
def email_users_recipients(request):
    """
    Search GrainRise users for Specific User email.

    GET:
        /admin/email-users/recipients/

    Query:
        ?search=riggie
        ?limit=50

    Returns users with an available email address.

    JWT ADMIN SESSION REQUIRED.
    """

    search = str(
        request.GET.get(
            "search"
        )
        or ""
    ).strip()

    raw_limit = (
        request.GET.get(
            "limit"
        )
        or 50
    )

    try:
        limit = int(
            raw_limit
        )

    except (
        TypeError,
        ValueError,
    ):
        limit = 50

    limit = max(
        1,
        min(
            limit,
            100,
        )
    )

    try:
        rows = search_email_recipients(
            search=search,
            limit=limit,
        )

        return JsonResponse(
            {
                "success":
                    True,

                "search":
                    search,

                "results":
                    _serialize_rows(
                        rows
                    ),

                "total":
                    len(
                        rows
                    ),
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load email recipients.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# SENT HISTORY
# ============================================================

@require_GET
@account_admin_required
def email_users_history(request):
    """
    Return persistent Sent History.

    GET:
        /admin/email-users/history/

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        rows = (
            list_sent_email_history()
        )

        return JsonResponse(
            {
                "success":
                    True,

                "results":
                    _serialize_rows(
                        rows
                    ),

                "total":
                    len(
                        rows
                    ),
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load sent email history.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# SENT EMAIL DETAILS
# ============================================================

@require_GET
@account_admin_required
def email_users_history_detail(
    request,
    email_history_id,
):
    """
    Return one complete sent email record.

    GET:
        /admin/email-users/history/<id>/

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        history = (
            get_sent_email_history_detail(
                email_history_id
            )
        )

        if not history:
            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Sent email record was not found.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success":
                    True,

                "email":
                    _serialize_row(
                        history
                    ),
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load sent email details.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# SEND EMAIL
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def email_users_send(
    request,
):
    """
    Send email through the existing GrainRise Gmail setup.

    Broadcast example:

        {
            "recipient_type": "all_users",
            "subject": "System Maintenance Notice",
            "message_html": "<p>...</p>",
            "message_plain": "..."
        }

    Specific user example:

        {
            "recipient_type": "specific_user",
            "recipient_user_id": 12,
            "recipient_email": "user@email.com",
            "recipient_name": "Juan Dela Cruz",
            "subject": "Application Update",
            "message_html": "<p>...</p>",
            "message_plain": "..."
        }

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        data = _read_request_data(
            request
        )

        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        # ====================================================
        # REQUEST VALUES
        # ====================================================

        recipient_type = str(
            data.get(
                "recipient_type"
            )
            or ""
        ).strip().lower()


        subject = str(
            data.get(
                "subject"
            )
            or ""
        ).strip()


        message_html = str(
            data.get(
                "message_html"
            )
            or ""
        ).strip()


        message_plain = str(
            data.get(
                "message_plain"
            )
            or ""
        ).strip()


        recipient_email = str(
            data.get(
                "recipient_email"
            )
            or ""
        ).strip()


        recipient_name = str(
            data.get(
                "recipient_name"
            )
            or ""
        ).strip()


        recipient_id = data.get("recipient_id")
        recipient_user_id = data.get("recipient_user_id")
        lookup_id = recipient_id or recipient_user_id
        recipient_email = data.get("recipient_email") or data.get("recipientEmail") or ""
        recipient_name = data.get("recipient_name") or data.get("recipientName") or ""

        # ====================================================
        # RECIPIENT RESOLUTION
        # ====================================================

        if recipient_type in ("support_inquiry", "support_contact"):
            if lookup_id:
                try:
                    msg = ContactSupportMessage.objects.filter(support_id=lookup_id).first()
                    if msg:
                        if not recipient_email:
                            recipient_email = msg.email
                        if not recipient_name:
                            recipient_name = msg.full_name
                except Exception:
                    pass

            if not recipient_email and data.get("recipient_email"):
                recipient_email = data.get("recipient_email")
            if not recipient_name and data.get("recipient_name"):
                recipient_name = data.get("recipient_name")

            if not recipient_email:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Recipient email address is required.",
                    },
                    status=400,
                )
            recipient_user_id = None

        elif recipient_type == "partnership_inquiry":
            lookup_id = recipient_id or recipient_user_id
            inquiry = None
            if lookup_id:
                try:
                    inquiry = PartnershipInquiry.objects.filter(
                        partnership_inquiry_id=lookup_id
                    ).first()
                except Exception:
                    inquiry = None

            if inquiry:
                recipient_email = inquiry.email
                recipient_name = inquiry.name
                recipient_user_id = None
            elif recipient_email:
                recipient_user_id = None
            else:
                return JsonResponse(
                    {
                        "success": False,
                        "message": "Invalid partnership inquiry recipient.",
                    },
                    status=400,
                )

        else:
            lookup_user_id = (
                recipient_id
                if recipient_type in ("user", "specific_user") and recipient_id
                else recipient_user_id
            )

            if lookup_user_id in {
                None,
                "",
            }:
                recipient_user_id = None

            else:
                try:
                    recipient_user_id = int(
                        lookup_user_id
                    )

                except (
                    TypeError,
                    ValueError,
                ) as exc:
                    raise ValueError(
                        "Invalid recipient user ID."
                    ) from exc

        # ====================================================
        # SEND SERVICE
        # ====================================================

        result = (
            send_account_admin_email(
                admin_id=
                    admin_id,

                recipient_type=
                    recipient_type,

                subject=
                    subject,

                message_plain=
                    message_plain,

                message_html=
                    message_html,

                recipient_user_id=
                    recipient_user_id,

                recipient_email=
                    recipient_email,

                recipient_name=
                    recipient_name,

                recipient_id=
                    lookup_id,
            )
        )


        # ====================================================
        # SUCCESS
        # ====================================================

        delivery = (
            result.get(
                "delivery"
            )
            or {}
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result.get(
                        "message"
                    ),

                "history":
                    _serialize_row(
                        result.get(
                            "history"
                        )
                    ),

                "delivery": {
                    "successful_count":
                        int(
                            delivery.get(
                                "successful_count"
                            )
                            or 0
                        ),

                    "failed_count":
                        int(
                            delivery.get(
                                "failed_count"
                            )
                            or 0
                        ),

                    "failed_recipients":
                        delivery.get(
                            "failed_recipients"
                        )
                        or [],
                },

                "sent_by":
                    result.get(
                        "sent_by"
                    ),
            },
            status=200,
        )


    # ========================================================
    # VALIDATION
    # ========================================================

    except ValueError as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(exc),
            },
            status=400,
        )


    # ========================================================
    # EMAIL SERVER FAILURE
    # ========================================================

    except RuntimeError as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(exc),
            },
            status=503,
        )


    # ========================================================
    # UNKNOWN FAILURE
    # ========================================================

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to send the email.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# RECEIVED SUPPORT MESSAGES (CONTACT SUPPORT)
# ============================================================

@require_GET
@account_admin_required
def email_users_received(request):
    """
    Return support messages submitted via Contact Support form.
    GET /admin/email-users/received/
    """
    try:
        search = request.GET.get("search", "").strip() or None
        category = request.GET.get("category", "").strip() or None
        status = request.GET.get("status", "").strip() or None
        
        is_read_raw = request.GET.get("is_read")
        is_read = None
        if is_read_raw is not None and is_read_raw != "":
            if str(is_read_raw).lower() in ("true", "1"):
                is_read = True
            elif str(is_read_raw).lower() in ("false", "0"):
                is_read = False

        limit = int(request.GET.get("limit", 100))
        offset = int(request.GET.get("offset", 0))

        rows, unread_count, total = list_received_support_messages(
            search=search,
            is_read=is_read,
            category=category,
            status=status,
            limit=limit,
            offset=offset,
        )

        return JsonResponse(
            {
                "success": True,
                "results": _serialize_rows(rows),
                "unread_count": unread_count,
                "total": total,
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success": False,
                "message": "Unable to load received support messages.",
                "error": str(exc),
            },
            status=500,
        )


@require_GET
@account_admin_required
def email_users_received_detail(request, support_id):
    """
    Return full details of one received support message.
    GET /admin/email-users/received/<id>/
    """
    try:
        row = get_received_support_message_detail(support_id)
        if not row:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Support message not found.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "result": _serialize_row(row),
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success": False,
                "message": "Unable to load support message details.",
                "error": str(exc),
            },
            status=500,
        )


@csrf_exempt
@account_admin_required
def email_users_received_mark_read(request, support_id):
    """
    Mark a support message as read or unread.
    POST /admin/email-users/received/<id>/read/
    """
    if request.method not in ("POST", "PATCH"):
        return JsonResponse(
            {"success": False, "message": "Method not allowed."},
            status=405,
        )

    try:
        data = _read_request_data(request)
        is_read_val = data.get("is_read", True)
        if isinstance(is_read_val, str):
            is_read = is_read_val.lower() in ("true", "1")
        else:
            is_read = bool(is_read_val)

        updated = mark_support_message_read(support_id, is_read=is_read)
        if not updated:
            return JsonResponse(
                {"success": False, "message": "Support message not found."},
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "message": "Status updated successfully.",
                "support_id": support_id,
                "is_read": is_read,
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success": False,
                "message": "Unable to update read status.",
                "error": str(exc),
            },
            status=500,
        )


@csrf_exempt
@account_admin_required
def email_users_received_update_status(request, support_id):
    """
    Update support message status (open, in_progress, resolved).
    POST /admin/email-users/received/<id>/status/
    """
    if request.method not in ("POST", "PATCH"):
        return JsonResponse(
            {"success": False, "message": "Method not allowed."},
            status=405,
        )

    try:
        data = _read_request_data(request)
        status_val = str(data.get("status", "")).strip().lower()
        if not status_val:
            return JsonResponse(
                {"success": False, "message": "Status field is required."},
                status=400,
            )

        updated = update_support_message_status(support_id, status_val)
        if not updated:
            return JsonResponse(
                {"success": False, "message": "Support message not found."},
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "message": "Support status updated successfully.",
                "support_id": support_id,
                "status": status_val,
            },
            status=200,
        )

    except ValueError as exc:
        return JsonResponse(
            {"success": False, "message": str(exc)},
            status=400,
        )
    except Exception as exc:
        logger.exception("Email Users send failed:")
        return JsonResponse(
            {
                "success": False,
                "message": "Unable to update status.",
                "error": str(exc),
            },
            status=500,
        )
