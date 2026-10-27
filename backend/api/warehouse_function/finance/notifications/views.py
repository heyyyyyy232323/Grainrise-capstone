import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import (
    count_warehouse_finance_notifications,
    get_warehouse_finance_unseen_notification_count,
    list_warehouse_finance_notifications,
)
from .services import (
    mark_all_warehouse_finance_notifications_seen,
    mark_warehouse_finance_notification_as_seen,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@warehouse_finance_required
def list_notifications_view(request):
    """
    GET /api/warehouse/finance/notifications/
    List finance notifications for the authenticated Warehouse Finance employee's branch.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    limit = request.query_params.get("limit", 50)
    offset = request.query_params.get("offset", 0)
    status_filter = request.query_params.get("status", None)

    try:
        notifications = list_warehouse_finance_notifications(
            warehouse_profile_ids=warehouse_profile_ids,
            limit=limit,
            offset=offset,
            status=status_filter,
        )
        total_count = count_warehouse_finance_notifications(warehouse_profile_ids)
        unseen_count = get_warehouse_finance_unseen_notification_count(warehouse_profile_ids)

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
            "Failed to list warehouse finance notifications for warehouse_profile_ids=%s: %s",
            warehouse_profile_ids,
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
@warehouse_finance_required
def mark_notification_seen_view(request, notification_id: int):
    """
    POST /api/warehouse/finance/notifications/<int:notification_id>/seen/
    Mark a single notification as seen.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    employee_id = request.grainrise_warehouse_employee_id

    try:
        updated = mark_warehouse_finance_notification_as_seen(
            warehouse_profile_ids=warehouse_profile_ids,
            notification_id=notification_id,
            employee_id=employee_id,
        )
        if not updated:
            return _no_cache_response(
                {
                    "success": False,
                    "message": "Notification not found or access denied.",
                },
                status.HTTP_404_NOT_FOUND,
            )

        unseen_count = get_warehouse_finance_unseen_notification_count(warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "message": "Notification marked as seen.",
                "notification": updated,
                "unseen_count": unseen_count,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to mark notification %s as seen for warehouse_profile_ids=%s: %s",
            notification_id,
            warehouse_profile_ids,
            exc,
        )
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to update notification.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_finance_required
def mark_all_notifications_seen_view(request):
    """
    POST /api/warehouse/finance/notifications/mark-all-seen/
    Mark all unseen finance notifications as seen for this branch.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    employee_id = request.grainrise_warehouse_employee_id

    try:
        rows_affected = mark_all_warehouse_finance_notifications_seen(
            warehouse_profile_ids=warehouse_profile_ids,
            employee_id=employee_id,
        )
        return _no_cache_response(
            {
                "success": True,
                "message": "All notifications marked as seen.",
                "rows_affected": rows_affected,
                "unseen_count": 0,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to mark all notifications seen for warehouse_profile_ids=%s: %s",
            warehouse_profile_ids,
            exc,
        )
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to update notifications.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
