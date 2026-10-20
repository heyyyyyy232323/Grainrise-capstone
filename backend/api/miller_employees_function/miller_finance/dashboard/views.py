import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
from .selectors import get_finance_dashboard_data

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@miller_finance_required
def get_finance_dashboard_data_view(request):
    """
    GET /api/miller-employees/finance/dashboard/
    Retrieve verified KPIs, real chart series by period, and metadata for the Miller Finance Dashboard.
    Strictly isolated to authenticated supplier_profile_id.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee = request.grainrise_supplier_employee or {}

    try:
        data = get_finance_dashboard_data(supplier_profile_id)
        return _no_cache_response(
            {
                "success": True,
                "data": data,
                "employee": {
                    "first_name": employee.get("first_name"),
                    "last_name": employee.get("last_name"),
                    "position": employee.get("position"),
                    "business_name": employee.get("business_name"),
                },
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to fetch finance dashboard data for supplier_profile_id=%s: %s",
            supplier_profile_id,
            exc,
        )
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load finance dashboard data.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

