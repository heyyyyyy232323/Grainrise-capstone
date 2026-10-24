import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    get_manager_finance_payment_history_data,
    get_manager_finance_report_data,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@miller_manager_required
def list_manager_finance_payment_history_view(request):
    """
    GET /api/miller/finance-history/
    Returns paid Payables, paid Expenses, and completed Reimbursements across all
    branches owned by the authenticated Miller Manager (or filtered by branch_id).
    """
    miller_user_id = request.grainrise_miller_id
    branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")

    try:
        data = get_manager_finance_payment_history_data(
            miller_user_id=miller_user_id,
            branch_id=branch_id,
        )
        return _no_cache_response(data, status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error retrieving manager finance payment history: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving finance payment history.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_manager_required
def list_manager_finance_report_data_view(request):
    """
    GET /api/miller/finance-history/reports/
    Returns all paid and pending Finance transactions (Payables, Expenses, Reimbursements)
    across all branches owned by the authenticated Miller Manager (or filtered by branch_id).
    """
    miller_user_id = request.grainrise_miller_id
    branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")

    try:
        data = get_manager_finance_report_data(
            miller_user_id=miller_user_id,
            branch_id=branch_id,
        )
        return _no_cache_response(data, status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error retrieving manager finance report data: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving finance report data.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

