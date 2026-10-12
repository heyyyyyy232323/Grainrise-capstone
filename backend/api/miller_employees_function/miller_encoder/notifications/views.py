import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_encoder_required
from .selectors import (
    count_encoder_notifications,
    get_encoder_unseen_notification_count,
    list_encoder_notifications,
)
from .services import mark_notification_as_seen

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_encoder_required
def notifications_list_view(request):
    """
    GET /api/miller-employees/encoder/notifications/
    Return notifications for the authenticated branch and employee_type = 'encoder'.
    Ordered newest first, with unseen count included.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        limit = request.query_params.get("limit", 50)
        offset = request.query_params.get("offset", 0)
        status_filter = request.query_params.get("status", None)
        if status_filter:
            status_filter = str(status_filter).strip().lower()
            if status_filter not in ("seen", "unseen"):
                status_filter = None

        notifications = list_encoder_notifications(
            supplier_profile_id=supplier_profile_id,
            limit=limit,
            offset=offset,
            status=status_filter,
        )

        unseen_count = get_encoder_unseen_notification_count(supplier_profile_id)
        total_count = count_encoder_notifications(supplier_profile_id, status=status_filter)

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
        logger.exception("Failed to list miller encoder notifications: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve notifications.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_encoder_required
def mark_notification_seen_view(request, notification_id):
    """
    POST /api/miller-employees/encoder/notifications/<notification_id>/seen/
    Mark an individual notification as seen for the authenticated encoder.
    Saves seen_by_employee_id and seen_at.
    If already seen, preserves existing seen_by_employee_id and seen_at.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    try:
        updated_notification = mark_notification_as_seen(
            supplier_profile_id=supplier_profile_id,
            supplier_employee_id=supplier_employee_id,
            notification_id=notification_id,
        )

        if not updated_notification:
            return Response(
                {
                    "success": False,
                    "message": "Notification not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        unseen_count = get_encoder_unseen_notification_count(supplier_profile_id)

        return Response(
            {
                "success": True,
                "message": "Notification marked as seen.",
                "notification": updated_notification,
                "unseen_count": unseen_count,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to mark notification %s as seen: %s", notification_id, exc
        )
        return Response(
            {
                "success": False,
                "message": "Failed to update notification.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
