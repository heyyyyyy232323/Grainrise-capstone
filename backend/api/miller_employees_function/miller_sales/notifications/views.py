import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_sales_required
from .selectors import (
    count_sales_notifications,
    get_sales_unseen_notification_count,
    list_sales_notifications,
)
from .services import (
    mark_all_sales_notifications_seen,
    mark_notification_as_seen,
    sync_sales_activity_notifications,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_sales_required
def notifications_list_view(request):
    """
    GET /api/miller-employees/sales/notifications/
    Return notifications for the authenticated branch and employee_type = 'sales'.
    Syncs recent database activities before returning to ensure real-time accuracy.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        # Idempotently sync database activities to notifications
        sync_sales_activity_notifications(supplier_profile_id)

        limit = request.query_params.get("limit", 50)
        offset = request.query_params.get("offset", 0)
        status_filter = request.query_params.get("status", None)
        if status_filter:
            status_filter = str(status_filter).strip().lower()
            if status_filter not in ("seen", "unseen"):
                status_filter = None

        notifications = list_sales_notifications(
            supplier_profile_id=supplier_profile_id,
            limit=limit,
            offset=offset,
            status=status_filter,
        )

        unseen_count = get_sales_unseen_notification_count(supplier_profile_id)
        total_count = count_sales_notifications(supplier_profile_id, status=status_filter)

        return Response(
            {
                "success": True,
                "unseen_count": unseen_count,
                "count": len(notifications),
                "total_count": total_count,
                "notifications": notifications,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list miller sales notifications: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to load sales notifications.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_sales_required
def mark_notification_seen_view(request, notification_id):
    """
    POST /api/miller-employees/sales/notifications/<notification_id>/seen/
    Mark a single notification as seen for the authenticated branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

    try:
        updated = mark_notification_as_seen(
            supplier_profile_id=supplier_profile_id,
            notification_id=notification_id,
            employee_id=employee_id,
        )

        if not updated:
            return Response(
                {
                    "success": False,
                    "message": "Notification not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        unseen_count = get_sales_unseen_notification_count(supplier_profile_id)

        return Response(
            {
                "success": True,
                "notification": updated,
                "unseen_count": unseen_count,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark sales notification as seen: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to mark notification as seen.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_sales_required
def mark_all_seen_view(request):
    """
    POST /api/miller-employees/sales/notifications/mark-all-seen/
    Mark all unseen notifications as seen for the authenticated branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

    try:
        updated_count = mark_all_sales_notifications_seen(
            supplier_profile_id=supplier_profile_id,
            employee_id=employee_id,
        )

        return Response(
            {
                "success": True,
                "message": "All notifications marked as seen.",
                "updated_count": updated_count,
                "unseen_count": 0,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark all sales notifications as seen: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to mark all notifications as seen.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

