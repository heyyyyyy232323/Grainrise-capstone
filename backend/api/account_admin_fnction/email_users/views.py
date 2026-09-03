import json

from datetime import date, datetime
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.utils import authorization_payload

from ..admin_auth import account_admin_required

from .selectors import (
    get_sent_email_history_detail,
    list_sent_email_history,
    search_email_recipients,
)

from .services import (
    send_account_admin_email,
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


        recipient_user_id = (
            data.get(
                "recipient_user_id"
            )
        )


        # ====================================================
        # OPTIONAL USER ID NORMALIZATION
        # ====================================================

        if recipient_user_id in {
            None,
            "",
        }:
            recipient_user_id = None

        else:
            try:
                recipient_user_id = int(
                    recipient_user_id
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