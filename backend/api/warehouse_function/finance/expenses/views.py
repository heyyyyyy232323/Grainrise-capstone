import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import (
    list_pending_warehouse_expenses,
    get_warehouse_expense_detail,
    get_warehouse_expense_types,
)
from .services import (
    record_warehouse_expense_payment,
    ExpenseNotFoundError,
    AlreadyPaidError,
    InvalidExpenseStateError,
    DuplicateReferenceError,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@warehouse_finance_required
def list_warehouse_expenses_view(request):
    """
    GET /api/warehouse/finance/expenses/
    Retrieve ONLY pending expenses for the authenticated Warehouse branch.
    Strictly scoped to warehouse_profile_ids.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    filters = {
        "search": request.query_params.get("search", ""),
        "type": request.query_params.get("type", ""),
        "sort_by": request.query_params.get("sort_by", "nearest_deadline"),
    }

    try:
        data = list_pending_warehouse_expenses(warehouse_profile_ids, filters)
        available_types = get_warehouse_expense_types(warehouse_profile_ids)
        return Response(
            {
                "success": True,
                "data": data,
                "types": available_types,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse expenses for warehouse_profile_ids=%s: %s", warehouse_profile_ids, exc)
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
@warehouse_finance_required
def record_warehouse_expense_payment_view(request):
    """
    POST /api/warehouse/finance/expenses/pay/
    Record payment for an expense in 'pending' status.
    Supports JSON or multipart/form-data with Bearer JWT authentication.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    paid_by_employee_id = request.grainrise_warehouse_employee_id
    payer_name = request.grainrise_warehouse_payer_name
    business_name = request.grainrise_warehouse_business_name

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
        receipt_detail = record_warehouse_expense_payment(
            warehouse_profile_ids=warehouse_profile_ids,
            paid_by_employee_id=paid_by_employee_id,
            expense_id=expense_id,
            payment_method=payment_method,
            payment_reference=payment_reference,
            receipt_file=receipt_file,
            payer_name=payer_name,
            business_name=business_name,
        )

        return Response(
            {
                "success": True,
                "message": "Expense payment recorded successfully.",
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
            status=status.HTTP_409_CONFLICT,
        )
    except DuplicateReferenceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_409_CONFLICT,
        )
    except (InvalidExpenseStateError, ValueError) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Unexpected error recording warehouse expense payment: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to process expense payment. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
