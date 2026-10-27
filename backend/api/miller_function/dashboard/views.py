import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import get_manager_dashboard_data

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_manager_required
def manager_dashboard_view(request):
    """
    GET /api/miller/dashboard/
    Fetch live Miller Manager Dashboard data across all branches owned by the authenticated Miller Manager.
    """
    try:
        miller_user_id = request.grainrise_miller_id
        data = get_manager_dashboard_data(miller_user_id)
        return Response(
            {
                "success": True,
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error loading Miller Manager dashboard: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load dashboard data.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

