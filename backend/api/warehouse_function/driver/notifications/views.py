import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_driver_required
from .selectors import (
    count_warehouse_driver_notifications,
    get_warehouse_driver_unseen_notification_count,
    list_warehouse_driver_notifications,
)
from .services import (
    mark_all_warehouse_driver_notifications_seen,
    mark_warehouse_driver_notification_as_seen,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@warehouse_driver_required
def driver_notifications_list_view(request):
    """
    GET /api/warehouse/driver/notifications/
    List notifications for the authenticated Warehouse Driver.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    driver_id = request.grainrise_driver_id
    limit = request.query_params.get("limit", 50)
    offset = request.query_params.get("offset", 0)
    status_filter = request.query_params.get("status", None)

    try:
        notifications = list_warehouse_driver_notifications(
            warehouse_profile_ids=warehouse_profile_ids,
            driver_id=driver_id,
            limit=limit,
            offset=offset,
            status=status_filter,
        )
        total_count = count_warehouse_driver_notifications(warehouse_profile_ids, driver_id=driver_id)
        unseen_count = get_warehouse_driver_unseen_notification_count(warehouse_profile_ids, driver_id=driver_id)

        return _no_cache_response(
            {
                "success": True,
                "notifications": notifications,
                "total_count": total_count,
                "unseen_count": unseen_count,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to list warehouse driver notifications for warehouse_profile_ids=%s, driver_id=%s: %s",
            warehouse_profile_ids,
            driver_id,
            exc,
        )
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load notifications.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_driver_required
def driver_notification_seen_view(request, notification_id: int):
    """
    POST /api/warehouse/driver/notifications/<int:notification_id>/seen/
    Mark a single driver notification as seen.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    driver_id = request.grainrise_driver_id

    try:
        updated = mark_warehouse_driver_notification_as_seen(
            warehouse_profile_ids=warehouse_profile_ids,
            notification_id=notification_id,
            driver_id=driver_id,
        )
        if not updated:
            return _no_cache_response(
                {
                    "success": False,
                    "message": "Notification not found or access denied.",
                },
                status.HTTP_404_NOT_FOUND,
            )

        unseen_count = get_warehouse_driver_unseen_notification_count(warehouse_profile_ids, driver_id=driver_id)
        return _no_cache_response(
            {
                "success": True,
                "message": "Notification marked as seen.",
                "unseen_count": unseen_count,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark warehouse driver notification as seen: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to update notification.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_driver_required
def driver_notifications_mark_all_seen_view(request):
    """
    POST /api/warehouse/driver/notifications/mark-all-seen/
    Mark all unseen notifications for this driver as seen.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    driver_id = request.grainrise_driver_id

    try:
        count = mark_all_warehouse_driver_notifications_seen(
            warehouse_profile_ids=warehouse_profile_ids,
            driver_id=driver_id,
        )
        return _no_cache_response(
            {
                "success": True,
                "message": "All notifications marked as seen.",
                "updated_count": count,
                "unseen_count": 0,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark all warehouse driver notifications seen: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to update notifications.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

