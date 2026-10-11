import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..miller_auth import miller_manager_required
from .selectors import (
    get_miller_supplier_by_id,
    list_miller_suppliers,
    list_supplier_active_orders,
    list_supplier_purchase_history,
)
from .services import create_miller_supplier, update_miller_supplier

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@miller_manager_required
def suppliers_view(request):
    """
    Handle Miller Suppliers collection endpoint:
    - GET  /api/miller/suppliers/ -> list all suppliers owned by authenticated Miller
    - POST /api/miller/suppliers/ -> create a new supplier under an owned branch
    """
    if request.method == "POST":
        return _create_supplier(request)
    return _list_suppliers(request)


def _list_suppliers(request):
    """
    GET /api/miller/suppliers/

    List only farmer_contacts whose supplier_profile_id belongs to request.grainrise_miller_id.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        branch_id = request.query_params.get("branch_id")
        suppliers = list_miller_suppliers(miller_user_id, branch_id=branch_id)
        return Response(
            {
                "success": True,
                "data": suppliers,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing miller suppliers: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving suppliers.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _create_supplier(request):
    """
    POST /api/miller/suppliers/

    Create a supplier in farmer_contacts and verify supplier_profile_id belongs to the Miller.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data
        supplier_profile_id = data.get("supplier_profile_id")
        if not supplier_profile_id:
            supplier_profile_id = getattr(request, "grainrise_default_supplier_profile_id", None)

        supplier_farm = data.get("supplier_farm")
        organization = data.get("organization")
        contact_person = data.get("contact_person")
        contact_number = data.get("contact_number") or data.get("phone")
        email = data.get("email")
        address = data.get("address")
        supplier_status = data.get("status") or "active"

        created = create_miller_supplier(
            miller_user_id=miller_user_id,
            supplier_profile_id=supplier_profile_id,
            supplier_farm=supplier_farm,
            organization=organization,
            contact_person=contact_person,
            contact_number=contact_number,
            email=email,
            address=address,
            status=supplier_status,
        )

        return Response(
            {
                "success": True,
                "message": "Supplier created successfully.",
                "data": created,
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error creating miller supplier: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while creating supplier.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PUT", "PATCH"])
@miller_manager_required
def supplier_detail_view(request, supplier_id):
    """
    Handle single supplier endpoint:
    - GET: Retrieve supplier info, branch, performance rating, active orders, and purchase history
    - PUT / PATCH: Update supplier profile
    """
    if request.method in ("PUT", "PATCH"):
        return _update_supplier(request, supplier_id)
    return _get_supplier(request, supplier_id)


def _get_supplier(request, supplier_id):
    """
    GET /api/miller/suppliers/<supplier_id>/
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        supplier = get_miller_supplier_by_id(miller_user_id, supplier_id)
        if not supplier:
            return Response(
                {
                    "success": False,
                    "message": "Supplier not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        active_orders = list_supplier_active_orders(miller_user_id, supplier_id)
        purchase_history = list_supplier_purchase_history(miller_user_id, supplier_id)

        supplier["active_orders"] = active_orders
        supplier["purchase_history"] = purchase_history

        return Response(
            {
                "success": True,
                "data": supplier,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error getting miller supplier detail: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving supplier detail.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _update_supplier(request, supplier_id):
    """
    PUT/PATCH /api/miller/suppliers/<supplier_id>/
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data
        supplier_profile_id = data.get("supplier_profile_id")
        supplier_farm = data.get("supplier_farm")
        organization = data.get("organization")
        contact_person = data.get("contact_person")
        contact_number = data.get("contact_number") or data.get("phone")
        email = data.get("email")
        address = data.get("address")
        supplier_status = data.get("status") or "active"

        updated = update_miller_supplier(
            miller_user_id=miller_user_id,
            supplier_id=supplier_id,
            supplier_profile_id=supplier_profile_id,
            supplier_farm=supplier_farm,
            organization=organization,
            contact_person=contact_person,
            contact_number=contact_number,
            email=email,
            address=address,
            status=supplier_status,
        )

        return Response(
            {
                "success": True,
                "message": "Supplier updated successfully.",
                "data": updated,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error updating miller supplier: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while updating supplier.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_manager_required
def supplier_active_orders_view(request, supplier_id):
    """
    GET /api/miller/suppliers/<supplier_id>/active-orders/
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        orders = list_supplier_active_orders(miller_user_id, supplier_id)
        return Response(
            {
                "success": True,
                "data": orders,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error retrieving supplier active orders: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving active orders.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_manager_required
def supplier_purchase_history_view(request, supplier_id):
    """
    GET /api/miller/suppliers/<supplier_id>/purchase-history/
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        history = list_supplier_purchase_history(miller_user_id, supplier_id)
        return Response(
            {
                "success": True,
                "data": history,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Error retrieving supplier purchase history: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving purchase history.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
