import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import (
    count_procurement_notifications,
    get_procurement_unseen_notification_count,
    list_procurement_notifications,
)
from .services import (
    mark_all_procurement_notifications_seen,
    mark_notification_as_seen,
    sync_procurement_activity_notifications,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_procurement_required
def notifications_list_view(request):
    """
    GET /api/miller-employees/procurement/notifications/
    Return notifications for the authenticated branch and employee_type = 'procurement'.
    Syncs recent database activities before returning to ensure real-time accuracy.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        # Idempotently sync database activities to notifications
        sync_procurement_activity_notifications(supplier_profile_id)

        limit = request.query_params.get("limit", 50)
        offset = request.query_params.get("offset", 0)
        status_filter = request.query_params.get("status", None)
        if status_filter:
            status_filter = str(status_filter).strip().lower()
            if status_filter not in ("seen", "unseen"):
                status_filter = None

        notifications = list_procurement_notifications(
            supplier_profile_id=supplier_profile_id,
            limit=limit,
            offset=offset,
            status=status_filter,
        )

        unseen_count = get_procurement_unseen_notification_count(supplier_profile_id)
        total_count = count_procurement_notifications(supplier_profile_id, status=status_filter)

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
        logger.exception("Failed to list miller procurement notifications: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to load procurement notifications.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_procurement_required
def mark_notification_seen_view(request, notification_id):
    """
    POST /api/miller-employees/procurement/notifications/<notification_id>/seen/
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

        unseen_count = get_procurement_unseen_notification_count(supplier_profile_id)

        return Response(
            {
                "success": True,
                "message": "Notification marked as seen.",
                "unseen_count": unseen_count,
                "notification": updated,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to mark procurement notification as seen: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to mark notification as seen.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_procurement_required
def mark_all_seen_view(request):
    """
    POST /api/miller-employees/procurement/notifications/mark-all-seen/
    Mark all unseen notifications as seen for the authenticated branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

    try:
        updated_count = mark_all_procurement_notifications_seen(
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
        logger.exception("Failed to mark all procurement notifications as seen: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to mark all notifications as seen.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

