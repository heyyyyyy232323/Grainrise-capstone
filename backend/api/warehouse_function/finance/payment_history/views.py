from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import (
    get_finance_payment_history_data,
    get_finance_report_data,
)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@warehouse_finance_required
def list_warehouse_finance_payment_history_view(request):
    """
    GET /api/warehouse/finance/payment-history/
    Returns actual paid Payables (registered millers & external suppliers),
    paid Expenses, and completed Reimbursements for the logged-in Warehouse Finance branch.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    data = get_finance_payment_history_data(warehouse_profile_ids)
    return _no_cache_response(
        {
            "success": True,
            "data": data,
            "message": "Warehouse finance payment history retrieved successfully.",
        },
        status.HTTP_200_OK,
    )


@api_view(["GET"])
@warehouse_finance_required
def list_warehouse_finance_report_data_view(request):
    """
    GET /api/warehouse/finance/payment-history/reports/
    Returns all paid and pending Warehouse Finance transactions
    (Procurement Payables, Expenses, Reimbursements) for financial reporting.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    data = get_finance_report_data(warehouse_profile_ids)
    return _no_cache_response(
        {
            "success": True,
            "data": data,
            "message": "Warehouse financial report data retrieved successfully.",
        },
        status.HTTP_200_OK,
    )
