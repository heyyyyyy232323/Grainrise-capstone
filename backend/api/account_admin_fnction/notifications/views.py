from datetime import date, datetime
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.utils import authorization_payload

from ..admin_auth import account_admin_required

from .selectors import (
    get_admin_notification,
    get_admin_unread_notification_count,
    list_admin_notifications,
)

from .services import (
    mark_admin_notification_as_read,
    mark_all_admin_notifications_as_read,
    open_admin_notification,
)


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    """
    Convert Python/PostgreSQL values into JSON-safe values.
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

    if isinstance(
        value,
        dict,
    ):
        return {
            key: _serialize_value(item)
            for key, item in value.items()
        }

    if isinstance(
        value,
        (list, tuple),
    ):
        return [
            _serialize_value(item)
            for item in value
        ]

    return value


def _serialize_row(row):
    if not row:
        return None

    return {
        key: _serialize_value(value)
        for key, value in row.items()
    }


def _serialize_rows(rows):
    return [
        _serialize_row(row)
        for row in rows
    ]


# ============================================================
# AUTHENTICATED ADMIN
# ============================================================

def _authenticated_admin_id(request):
    """
    Read Account Admin ID from the existing GrainRise JWT.

    Existing admin JWT:
        payload["sub"] = admin_id

    No separate notification/admin token is created.
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
# LIST NOTIFICATIONS
# ============================================================

@require_GET
@account_admin_required
def admin_notifications_list(request):
    """
    Return Account Admin navbar notifications.

    GET:
        /admin/notifications/

    Optional:
        ?limit=30
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        raw_limit = (
            request.GET.get(
                "limit"
            )
            or 30
        )


        try:
            limit = int(
                raw_limit
            )

        except (
            TypeError,
            ValueError,
        ):
            limit = 30


        limit = max(
            1,
            min(
                limit,
                100,
            )
        )


        notifications = (
            list_admin_notifications(
                admin_id=admin_id,
                limit=limit,
            )
        )


        unread_count = (
            get_admin_unread_notification_count(
                admin_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "results":
                    _serialize_rows(
                        notifications
                    ),

                "total":
                    len(
                        notifications
                    ),

                "unread_count":
                    unread_count,
            },
            status=200,
        )


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


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load notifications.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# UNREAD COUNT
# ============================================================

@require_GET
@account_admin_required
def admin_notifications_unread_count(
    request
):
    """
    Lightweight endpoint for navbar badge.

    GET:
        /admin/notifications/unread-count/
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        unread_count = (
            get_admin_unread_notification_count(
                admin_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "unread_count":
                    unread_count,
            },
            status=200,
        )


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


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load unread notification count.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# ONE NOTIFICATION
# ============================================================

@require_GET
@account_admin_required
def admin_notification_detail(
    request,
    notification_id,
):
    """
    Return one notification.

    GET:
        /admin/notifications/<id>/
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        notification = (
            get_admin_notification(
                admin_id,
                notification_id,
            )
        )


        if not notification:
            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Notification was not found.",
                },
                status=404,
            )


        return JsonResponse(
            {
                "success":
                    True,

                "notification":
                    _serialize_row(
                        notification
                    ),
            },
            status=200,
        )


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


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load the notification.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# MARK ONE AS READ
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def admin_notification_mark_read(
    request,
    notification_id,
):
    """
    Mark one notification as read for the currently
    authenticated Account Admin.

    POST:
        /admin/notifications/<id>/read/
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        result = (
            mark_admin_notification_as_read(
                admin_id=admin_id,
                notification_id=notification_id,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    "Notification marked as read.",

                "notification":
                    _serialize_row(
                        result.get(
                            "notification"
                        )
                    ),

                "unread_count":
                    int(
                        result.get(
                            "unread_count"
                        )
                        or 0
                    ),
            },
            status=200,
        )


    except ValueError as exc:
        message = str(
            exc
        )


        status_code = (
            404
            if "not found" in message.lower()
            else 400
        )


        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    message,
            },
            status=status_code,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to mark the notification as read.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# OPEN NOTIFICATION
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def admin_notification_open(
    request,
    notification_id,
):
    """
    Used when Account Admin clicks a notification.

    Marks it as read and returns its navigation destination.

    POST:
        /admin/notifications/<id>/open/
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        result = (
            open_admin_notification(
                admin_id=admin_id,
                notification_id=notification_id,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "notification":
                    _serialize_row(
                        result.get(
                            "notification"
                        )
                    ),

                "target_path":
                    result.get(
                        "target_path"
                    )
                    or "/admin/dashboard",

                "unread_count":
                    int(
                        result.get(
                            "unread_count"
                        )
                        or 0
                    ),
            },
            status=200,
        )


    except ValueError as exc:
        message = str(
            exc
        )


        status_code = (
            404
            if "not found" in message.lower()
            else 400
        )


        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    message,
            },
            status=status_code,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to open the notification.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# MARK ALL AS READ
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def admin_notifications_mark_all_read(
    request
):
    """
    Mark all available notifications as read for the
    currently authenticated Account Admin only.

    POST:
        /admin/notifications/read-all/
    """

    try:
        admin_id = (
            _authenticated_admin_id(
                request
            )
        )


        result = (
            mark_all_admin_notifications_as_read(
                admin_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    "All notifications marked as read.",

                "marked_count":
                    int(
                        result.get(
                            "marked_count"
                        )
                        or 0
                    ),

                "unread_count":
                    int(
                        result.get(
                            "unread_count"
                        )
                        or 0
                    ),
            },
            status=200,
        )


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


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to mark all notifications as read.",

                "error":
                    str(exc),
            },
            status=500,
        )