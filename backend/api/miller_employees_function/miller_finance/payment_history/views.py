from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
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
@miller_finance_required
def list_finance_payment_history_view(request):
    """
    GET /api/miller-employees/finance/payment-history/
    Returns actual paid Payables, paid Expenses, and completed Reimbursements
    for the logged-in Miller Finance employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    data = get_finance_payment_history_data(supplier_profile_id)
    return _no_cache_response(data, status.HTTP_200_OK)


@api_view(["GET"])
@miller_finance_required
def list_finance_report_data_view(request):
    """
    GET /api/miller-employees/finance/payment-history/reports/
    Returns all paid and pending Finance transactions (Payables, Expenses, Reimbursements)
    for the logged-in Miller Finance employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    data = get_finance_report_data(supplier_profile_id)
    return _no_cache_response(data, status.HTTP_200_OK)

