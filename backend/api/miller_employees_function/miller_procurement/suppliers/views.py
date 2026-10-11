import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import list_procurement_suppliers, get_procurement_supplier_detail
from .services import update_procurement_supplier

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_procurement_required
def procurement_suppliers_list_view(request):
    """
    GET /api/miller-employees/procurement/suppliers/
    List all suppliers strictly belonging to the employee's assigned branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        suppliers = list_procurement_suppliers(supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": suppliers,
                "count": len(suppliers),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error listing procurement suppliers: %s", exc)
        return Response(
            {"success": False, "error": "Failed to retrieve suppliers list."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT", "PATCH"])
@miller_procurement_required
def procurement_supplier_detail_view(request, supplier_id):
    """
    GET /api/miller-employees/procurement/suppliers/<id>/
    View details and historical deliveries/ratings for a supplier.

    PUT / PATCH /api/miller-employees/procurement/suppliers/<id>/
    Update an existing supplier for this branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    if request.method == "GET":
        try:
            supplier = get_procurement_supplier_detail(supplier_profile_id, supplier_id)
            if not supplier:
                return Response(
                    {"success": False, "error": "Supplier not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(
                {"success": True, "data": supplier},
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.exception("Error retrieving procurement supplier %s: %s", supplier_id, exc)
            return Response(
                {"success": False, "error": "Failed to retrieve supplier details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # PUT or PATCH
    try:
        data = request.data or {}
        updated = update_procurement_supplier(
            supplier_profile_id=supplier_profile_id,
            supplier_id=supplier_id,
            supplier_farm=data.get("supplier_farm"),
            organization=data.get("organization"),
            contact_person=data.get("contact_person"),
            contact_number=data.get("contact_number"),
            email=data.get("email"),
            address=data.get("address"),
            status=data.get("status", "active"),
        )
        return Response(
            {
                "success": True,
                "message": "Supplier updated successfully.",
                "data": updated,
            },
            status=status.HTTP_200_OK,
        )
    except ValueError as exc:
        return Response(
            {"success": False, "error": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Error updating procurement supplier %s: %s", supplier_id, exc)
        return Response(
            {"success": False, "error": "Failed to update supplier."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

