import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
from .selectors import (
    list_pending_finance_expenses,
    get_finance_expense_detail,
    get_finance_expense_types,
)
from .services import (
    record_expense_payment,
    ExpenseNotFoundError,
    AlreadyPaidError,
    InvalidExpenseStateError,
    DuplicateReferenceError,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_finance_required
def list_finance_expenses_view(request):
    """
    GET /api/miller-employees/finance/expenses/
    Retrieve ONLY pending expenses for the authenticated Finance employee's branch.
    Strictly scoped to supplier_profile_id.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    filters = {
        "search": request.query_params.get("search", ""),
        "type": request.query_params.get("type", ""),
        "sort_by": request.query_params.get("sort_by", "nearest_deadline"),
    }

    try:
        data = list_pending_finance_expenses(supplier_profile_id, filters)
        available_types = get_finance_expense_types(supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": data,
                "types": available_types,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve finance expenses for supplier_profile_id=%s: %s", supplier_profile_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load expenses records. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_finance_required
def record_expense_payment_view(request):
    """
    POST /api/miller-employees/finance/expenses/pay/
    Record payment for an expense in 'pending' status.
    Supports JSON or multipart/form-data with Bearer JWT authentication.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    paid_by_employee_id = request.grainrise_supplier_employee_id

    raw_expense_id = request.data.get("expenses_id") or request.data.get("expense_id")
    try:
        expense_id = int(raw_expense_id)
    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": "Valid expenses_id is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = request.data.get("payment_method")
    payment_reference = request.data.get("payment_reference")
    receipt_file = request.FILES.get("receipt_file") or request.FILES.get("receipt")

    try:
        receipt_detail = record_expense_payment(
            supplier_profile_id=supplier_profile_id,
            paid_by_employee_id=paid_by_employee_id,
            expense_id=expense_id,
            payment_method=payment_method,
            payment_reference=payment_reference,
            receipt_file=receipt_file,
        )

        return Response(
            {
                "success": True,
                "message": "Payment recorded successfully.",
                "data": receipt_detail,
            },
            status=status.HTTP_200_OK,
        )
    except ExpenseNotFoundError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )
    except AlreadyPaidError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except DuplicateReferenceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to record expense payment: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to process payment. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_finance_required
def get_finance_expense_detail_view(request, expense_id):
    """
    GET /api/miller-employees/finance/expenses/<expense_id>/
    Retrieve detail of a single expense for the Finance employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        expense = get_finance_expense_detail(supplier_profile_id, expense_id)
        if not expense:
            return Response(
                {
                    "success": False,
                    "message": "Expense record not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": True,
                "data": expense,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to get finance expense detail: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load expense details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

