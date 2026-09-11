from datetime import date, datetime
from decimal import Decimal

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import (
    require_GET,
    require_POST,
)

from ..farmer_auth import farmer_required

from .selectors import (
    get_farmer_notification,
    get_farmer_unread_notification_count,
    list_farmer_notifications,
)

from .services import (
    mark_all_farmer_notifications_as_read,
    mark_farmer_notification_as_read,
    open_farmer_notification,
)


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {
            key: _serialize_value(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
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
# LIST
# ============================================================

@require_GET
@farmer_required
def farmer_notifications_list(request):
    try:
        limit = int(
            request.GET.get("limit", 30)
        )
    except (TypeError, ValueError):
        limit = 30

    try:
        offset = int(
            request.GET.get("offset", 0)
        )
    except (TypeError, ValueError):
        offset = 0

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    try:
        farmer_user_id = (
            request.grainrise_farmer_id
        )

        notifications = (
            list_farmer_notifications(
                farmer_user_id,
                limit,
                offset,
            )
        )

        unread_count = (
            get_farmer_unread_notification_count(
                farmer_user_id
            )
        )

        return JsonResponse(
            {
                "success": True,
                "results":
                    _serialize_rows(
                        notifications
                    ),
                "total":
                    len(notifications),
                "unread_count":
                    unread_count,
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message":
                    "Unable to load Farmer notifications.",
                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# UNREAD COUNT
# ============================================================

@require_GET
@farmer_required
def farmer_notifications_unread_count(
    request
):
    try:
        unread_count = (
            get_farmer_unread_notification_count(
                request.grainrise_farmer_id
            )
        )

        return JsonResponse(
            {
                "success": True,
                "unread_count":
                    unread_count,
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message":
                    "Unable to load unread notification count.",
                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# DETAIL
# ============================================================

@require_GET
@farmer_required
def farmer_notification_detail(
    request,
    notification_id,
):
    try:
        notification = (
            get_farmer_notification(
                request.grainrise_farmer_id,
                notification_id,
            )
        )

        if not notification:
            return JsonResponse(
                {
                    "success": False,
                    "message":
                        "Notification was not found.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "notification":
                    _serialize_row(
                        notification
                    ),
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
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
@farmer_required
def farmer_notification_mark_read(
    request,
    notification_id,
):
    try:
        result = (
            mark_farmer_notification_as_read(
                request.grainrise_farmer_id,
                notification_id,
            )
        )

        return JsonResponse(
            {
                "success": True,
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
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=404,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
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
@farmer_required
def farmer_notification_open(
    request,
    notification_id,
):
    try:
        result = (
            open_farmer_notification(
                request.grainrise_farmer_id,
                notification_id,
            )
        )

        return JsonResponse(
            {
                "success": True,
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
                    or "/farmer/dashboard",
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
                "success": False,
                "message": str(exc),
            },
            status=404,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
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
@farmer_required
def farmer_notifications_mark_all_read(
    request
):
    try:
        result = (
            mark_all_farmer_notifications_as_read(
                request.grainrise_farmer_id
            )
        )

        return JsonResponse(
            {
                "success": True,
                "message":
                    "All notifications marked as read.",
                "marked_count":
                    int(
                        result.get(
                            "marked_count"
                        )
                        or 0
                    ),
                "unread_count": 0,
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,
                "message":
                    "Unable to mark all notifications as read.",
                "error":
                    str(exc),
            },
            status=500,
        )
