import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import get_warehouse_finance_dashboard_data

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@warehouse_finance_required
def get_warehouse_finance_dashboard_data_view(request):
    """
    GET /api/warehouse/finance/dashboard/
    Retrieve verified KPIs, real chart series by period, and metadata for the Warehouse Finance Dashboard.
    Strictly isolated to authenticated warehouse_profile_ids.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    finance_user = getattr(request, "warehouse_finance_user", {}) or {}

    try:
        data = get_warehouse_finance_dashboard_data(warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "data": data,
                "employee": {
                    "first_name": finance_user.get("first_name"),
                    "last_name": finance_user.get("last_name"),
                    "position": finance_user.get("position"),
                    "business_name": finance_user.get("business_name"),
                },
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception(
            "Failed to fetch warehouse finance dashboard data for warehouse_profile_ids=%s: %s",
            warehouse_profile_ids,
            exc,
        )
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load warehouse finance dashboard data.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
