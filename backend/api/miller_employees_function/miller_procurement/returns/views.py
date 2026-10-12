import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import (
    get_miller_returns,
    get_return_detail,
    get_distinct_suppliers,
)
from .services import (
    ReturnNotFoundError,
    AlreadyReturnedError,
    ReturnValidationError,
    mark_as_returned,
)

logger = logging.getLogger(__name__)


# ============================================================
# RETURNS LIST VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def returns_list_view(request):
    """
    GET /api/miller-employees/procurement/returns/
    Fetch returns records scoped to the authenticated Miller business.
    Supports search, status, supplier_id, and sort_by filters.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        search = request.query_params.get("search")
        status_filter = request.query_params.get("status")
        supplier_id = request.query_params.get("supplier_id")
        sort_by = request.query_params.get("sort_by")

        returns = get_miller_returns(
            supplier_profile_id=supplier_profile_id,
            search=search,
            status_filter=status_filter,
            supplier_id=supplier_id,
            sort_by=sort_by,
        )

        return Response(
            {
                "success": True,
                "data": returns,
                "count": len(returns),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing procurement returns: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving returns.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RETURN DETAIL VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def return_detail_view(request, return_id):
    """
    GET /api/miller-employees/procurement/returns/<return_id>/
    Retrieve complete detail for a specific return record.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = get_return_detail(
            supplier_profile_id=supplier_profile_id,
            return_id=return_id,
        )

        if not detail:
            return Response(
                {
                    "success": False,
                    "message": f"Return record #{return_id} was not found or access denied.",
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
        logger.exception("Error retrieving return #%s detail: %s", return_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving return details.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RETURN SUPPLIERS VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def return_suppliers_view(request):
    """
    GET /api/miller-employees/procurement/returns/suppliers/
    Fetch distinct active suppliers that have return records for this miller.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        suppliers = get_distinct_suppliers(supplier_profile_id=supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": suppliers,
                "count": len(suppliers),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing return suppliers: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving suppliers.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# MARK AS RETURNED VIEW
# ============================================================

@api_view(["POST"])
@miller_procurement_required
def mark_as_returned_view(request, return_id):
    """
    POST /api/miller-employees/procurement/returns/<return_id>/mark-returned/
    Mark a pending return as returned.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        result = mark_as_returned(
            supplier_profile_id=supplier_profile_id,
            return_id=return_id,
        )

        return Response(
            {
                "success": True,
                "message": "Return record successfully marked as returned.",
                "data": result,
            },
            status=status.HTTP_200_OK,
        )

    except ReturnNotFoundError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except (AlreadyReturnedError, ReturnValidationError) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error marking return #%s as returned: %s", return_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while updating the return status.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

