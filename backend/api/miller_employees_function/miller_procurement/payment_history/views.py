import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import (
    get_payment_history_list,
    get_payment_history_detail,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_procurement_required
def payment_history_list_view(request):
    """
    GET /api/miller-employees/procurement/payment-history/
    Retrieve payment history records (requested and paid only) scoped to authenticated branch.
    Includes KPI totals, distinct suppliers list, and supports filters.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    filters = {
        "search": request.query_params.get("search", ""),
        "status": request.query_params.get("status", "all"),
        "supplier": request.query_params.get("supplier", "all"),
        "sort_by": request.query_params.get("sort_by", "request_date_newest"),
        "start_date": request.query_params.get("start_date", ""),
        "end_date": request.query_params.get("end_date", ""),
    }

    try:
        data = get_payment_history_list(
            supplier_profile_id=supplier_profile_id,
            filters=filters,
        )
        return Response(
            {
                "success": True,
                "data": data["records"],
                "kpi": data["kpi"],
                "suppliers": data["suppliers"],
                "business_info": data.get("business_info"),
                "total_count": data["total_count"],
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error retrieving payment history: %s", exc)
        payload = {
            "success": False,
            "message": "An error occurred while retrieving payment history records.",
        }
        if settings.DEBUG:
            payload["debug"] = str(exc)
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_procurement_required
def payment_history_detail_view(request, receiving_id):
    """
    GET /api/miller-employees/procurement/payment-history/<receiving_id>/
    Retrieve full payment history detail for single receiving record.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = get_payment_history_detail(
            supplier_profile_id=supplier_profile_id,
            receiving_id=receiving_id,
        )
        if not detail:
            return Response(
                {
                    "success": False,
                    "message": f"Payment history record #{receiving_id} not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": detail,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error retrieving payment history detail for id=%s: %s", receiving_id, exc)
        payload = {
            "success": False,
            "message": "An error occurred while retrieving payment detail.",
        }
        if settings.DEBUG:
            payload["debug"] = str(exc)
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
