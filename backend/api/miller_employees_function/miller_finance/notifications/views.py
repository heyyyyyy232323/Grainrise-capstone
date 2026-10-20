import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
from .selectors import (
    count_finance_notifications,
    get_finance_unseen_notification_count,
    list_finance_notifications,
)
from .services import (
    mark_all_finance_notifications_seen,
    mark_finance_notification_as_seen,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@miller_finance_required
def list_notifications_view(request):
    """
    GET /api/miller-employees/finance/notifications/
    List finance notifications for the authenticated Miller Finance employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    limit = request.query_params.get("limit", 50)
    offset = request.query_params.get("offset", 0)
    status_filter = request.query_params.get("status", None)

    try:
        notifications = list_finance_notifications(
            supplier_profile_id=supplier_profile_id,
            limit=limit,
            offset=offset,
            status=status_filter,
        )
        total_count = count_finance_notifications(supplier_profile_id)
        unseen_count = get_finance_unseen_notification_count(supplier_profile_id)

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
        logger.exception("Failed to list finance notifications for supplier_profile_id=%s: %s", supplier_profile_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load notifications.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_finance_required
def mark_notification_seen_view(request, notification_id: int):
    """
    POST /api/miller-employees/finance/notifications/<int:notification_id>/seen/
    Mark a single notification as seen.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee = request.grainrise_supplier_employee or {}
    employee_id = employee.get("supplier_employee_id")

    try:
        updated = mark_finance_notification_as_seen(
            supplier_profile_id=supplier_profile_id,
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

        unseen_count = get_finance_unseen_notification_count(supplier_profile_id)
        return _no_cache_response(
            {
                "success": True,
                "notification": updated,
                "unseen_count": unseen_count,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark notification %s seen for supplier_profile_id=%s: %s", notification_id, supplier_profile_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to mark notification as seen.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_finance_required
def mark_all_notifications_seen_view(request):
    """
    POST /api/miller-employees/finance/notifications/mark-all-seen/
    Mark all unseen finance notifications as seen.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee = request.grainrise_supplier_employee or {}
    employee_id = employee.get("supplier_employee_id")

    try:
        affected = mark_all_finance_notifications_seen(
            supplier_profile_id=supplier_profile_id,
            employee_id=employee_id,
        )
        return _no_cache_response(
            {
                "success": True,
                "message": f"Marked {affected} notifications as seen.",
                "affected": affected,
                "unseen_count": 0,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark all notifications seen for supplier_profile_id=%s: %s", supplier_profile_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to mark all notifications as seen.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

