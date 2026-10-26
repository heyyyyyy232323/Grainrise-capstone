import json
import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..warehouse_auth import warehouse_manager_required
from .selectors import (
    get_grainrise_miller_detail,
    get_grainrise_receiving_detail,
    get_nongrainrise_miller_detail,
    get_nongrainrise_receiving_detail,
    list_grainrise_millers,
    list_manager_branches,
    list_nongrainrise_millers,
)
from .services import (
    cancel_grainrise_order,
    create_nongrainrise_miller,
    update_nongrainrise_miller,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@warehouse_manager_required
def grainrise_millers_list_view(request):
    """
    GET /api/warehouse/suppliers/grainrise/
    List registered GRAINRISE Millers.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        millers = list_grainrise_millers(warehouse_user_id)
        return Response({"success": True, "data": millers}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error in grainrise_millers_list_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load registered millers."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def grainrise_miller_detail_view(request, supplier_profile_id):
    """
    GET /api/warehouse/suppliers/grainrise/<int:supplier_profile_id>/
    Get profile, active orders, and purchase history for a registered Miller.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        detail = get_grainrise_miller_detail(warehouse_user_id, supplier_profile_id)
        if not detail:
            return Response(
                {"success": False, "message": "Registered miller was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error in grainrise_miller_detail_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load miller details."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def grainrise_receiving_detail_view(request, receiving_id):
    """
    GET /api/warehouse/suppliers/grainrise/receiving-history/<int:receiving_id>/
    Get modal receiving details for a Grainrise Miller purchase.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        detail = get_grainrise_receiving_detail(warehouse_user_id, receiving_id)
        if not detail:
            return Response(
                {"success": False, "message": "Receiving record was not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error in grainrise_receiving_detail_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load receiving details."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_manager_required
def cancel_grainrise_order_view(request, online_order_id):
    """
    POST /api/warehouse/suppliers/grainrise/orders/<int:online_order_id>/cancel/
    Request cancellation of an active order.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        reason = request.data.get("reason", "")
        result = cancel_grainrise_order(
            warehouse_user_id=warehouse_user_id,
            online_order_id=online_order_id,
            reason=reason,
        )
        if not result.get("success"):
            return Response(
                {
                    "success": False,
                    "allowed": False,
                    "message": result.get("blocker") or "Cancellation is not supported.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {"success": True, "message": "Order cancelled successfully."},
            status=status.HTTP_200_OK,
        )
    except ValueError as val_err:
        return Response(
            {"success": False, "message": str(val_err)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Error in cancel_grainrise_order_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to process cancellation request."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@warehouse_manager_required
def nongrainrise_millers_collection_view(request):
    """
    GET  /api/warehouse/suppliers/non-grainrise/ -> List active external millers
    POST /api/warehouse/suppliers/non-grainrise/ -> Add an external miller contact
    """
    warehouse_user_id = request.grainrise_warehouse_manager_id

    if request.method == "POST":
        try:
            data = request.data
            created = create_nongrainrise_miller(
                warehouse_user_id=warehouse_user_id,
                warehouse_profile_id=data.get("warehouse_profile_id"),
                business_name=data.get("business_name"),
                business_address=data.get("business_address"),
                contact_person=data.get("contact_person"),
                contact_number=data.get("contact_number"),
                email=data.get("email"),
                status=data.get("status", "active"),
            )
            return Response(
                {"success": True, "data": created, "message": "External miller added successfully."},
                status=status.HTTP_201_CREATED,
            )
        except ValueError as val_err:
            return Response(
                {"success": False, "message": str(val_err)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Error creating external miller: %s", exc)
            return Response(
                {"success": False, "message": "Failed to add external miller."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    try:
        suppliers = list_nongrainrise_millers(warehouse_user_id)
        return Response({"success": True, "data": suppliers}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error listing external millers: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load external millers."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT"])
@warehouse_manager_required
def nongrainrise_miller_detail_view(request, contact_id):
    """
    GET /api/warehouse/suppliers/non-grainrise/<int:contact_id>/
    PUT /api/warehouse/suppliers/non-grainrise/<int:contact_id>/
    """
    warehouse_user_id = request.grainrise_warehouse_manager_id

    if request.method == "PUT":
        try:
            data = request.data
            updated = update_nongrainrise_miller(
                warehouse_user_id=warehouse_user_id,
                contact_id=contact_id,
                business_name=data.get("business_name"),
                business_address=data.get("business_address"),
                contact_person=data.get("contact_person"),
                contact_number=data.get("contact_number"),
                email=data.get("email"),
                status=data.get("status", "active"),
            )
            return Response(
                {"success": True, "data": updated, "message": "External miller updated successfully."},
                status=status.HTTP_200_OK,
            )
        except ValueError as val_err:
            return Response(
                {"success": False, "message": str(val_err)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as exc:
            logger.exception("Error updating external miller: %s", exc)
            return Response(
                {"success": False, "message": "Failed to update external miller."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    try:
        detail = get_nongrainrise_miller_detail(warehouse_user_id, contact_id)
        if not detail:
            return Response(
                {"success": False, "message": "External miller not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error getting external miller detail: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load external miller details."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def nongrainrise_receiving_detail_view(request, receiving_id):
    """
    GET /api/warehouse/suppliers/non-grainrise/receiving-history/<int:receiving_id>/
    Get modal receiving details for a Non-Grainrise Miller purchase.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        detail = get_nongrainrise_receiving_detail(warehouse_user_id, receiving_id)
        if not detail:
            return Response(
                {"success": False, "message": "Receiving record was not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error in nongrainrise_receiving_detail_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load receiving details."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def manager_branches_view(request):
    """
    GET /api/warehouse/suppliers/branches/
    Returns list of owned branches for Add Miller modal dropdown.
    """
    try:
        warehouse_user_id = request.grainrise_warehouse_manager_id
        branches = list_manager_branches(warehouse_user_id)
        return Response({"success": True, "data": branches}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Error in manager_branches_view: %s", exc)
        return Response(
            {"success": False, "message": "Failed to load warehouse branches."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

