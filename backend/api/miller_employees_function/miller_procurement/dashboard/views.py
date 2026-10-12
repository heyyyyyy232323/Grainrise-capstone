import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .services import get_procurement_dashboard_data

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_procurement_required
def procurement_dashboard_view(request):
    """
    GET /api/miller-employees/procurement/dashboard/
    Return real branch-specific dashboard data for the authenticated procurement employee.
    Strictly isolated by supplier_profile_id from the employee session.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        data = get_procurement_dashboard_data(supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve procurement dashboard data: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Unable to load procurement dashboard data.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

