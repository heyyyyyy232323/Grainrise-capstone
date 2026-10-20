import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    list_manager_expenses,
    list_manager_owned_branches,
    get_manager_expense_detail,
    get_manager_expense_types,
)
from .services import (
    create_manager_expense,
    ExpenseValidationError,
    BranchAccessDeniedError,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_manager_required
def list_manager_expenses_view(request):
    """
    GET /api/miller/expenses/
    List expenses for branches owned by the authenticated Miller Manager.
    Filters: search, branch, type, status, sort_by.
    """
    miller_user_id = request.grainrise_miller_id

    filters = {
        "search": request.query_params.get("search", ""),
        "branch": request.query_params.get("branch", ""),
        "type": request.query_params.get("type", ""),
        "status": request.query_params.get("status", ""),
        "sort_by": request.query_params.get("sort_by", "nearest_deadline"),
    }

    try:
        expenses = list_manager_expenses(miller_user_id, filters)
        available_types = get_manager_expense_types(miller_user_id)
        return Response(
            {
                "success": True,
                "count": len(expenses),
                "data": expenses,
                "types": available_types,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list manager expenses: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve expenses list. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_manager_required
def list_manager_branches_view(request):
    """
    GET /api/miller/expenses/branches/
    Returns list of supplier_profiles owned by the authenticated Miller Manager.
    Used to populate the branch dropdown in the Add Expense modal and filter.
    """
    miller_user_id = request.grainrise_miller_id

    try:
        branches = list_manager_owned_branches(miller_user_id)
        return Response(
            {
                "success": True,
                "data": branches,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list manager branches: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve branches.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_manager_required
def create_manager_expense_view(request):
    """
    POST /api/miller/expenses/create/
    Create a new expense for an owned branch.
    Input: supplier_profile_id, expense_type, description, price, deadline.
    """
    miller_user_id = request.grainrise_miller_id
    data = request.data or {}

    supplier_profile_id = data.get("supplier_profile_id") or data.get("branch_id")
    expense_type = data.get("expense_type") or data.get("type")
    description = data.get("description")
    price = data.get("price")
    deadline = data.get("deadline")

    try:
        created = create_manager_expense(
            miller_user_id=miller_user_id,
            supplier_profile_id=supplier_profile_id,
            expense_type=expense_type,
            description=description,
            price=price,
            deadline=deadline,
        )
        return Response(
            {
                "success": True,
                "message": "Expense record created successfully.",
                "data": created,
            },
            status=status.HTTP_201_CREATED,
        )
    except BranchAccessDeniedError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_403_FORBIDDEN,
        )
    except ExpenseValidationError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to create manager expense: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to create expense. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_manager_required
def get_manager_expense_detail_view(request, expense_id):
    """
    GET /api/miller/expenses/<expense_id>/
    Retrieve detail of a single expense for an owned branch.
    """
    miller_user_id = request.grainrise_miller_id

    try:
        expense = get_manager_expense_detail(miller_user_id, expense_id)
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
        logger.exception("Failed to get manager expense detail: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load expense details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

