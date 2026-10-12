import json
import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    get_manager_order_detail,
    list_manager_orders,
)
from .services import (
    InvalidOrderStateError,
    OrderApprovalError,
    OrderNotFoundError,
    approve_manager_order,
    decline_manager_order,
    edit_manager_order,
)

logger = logging.getLogger(__name__)


def _parse_request_body(request):
    """Safely parse JSON or data from request body."""
    if hasattr(request, "data") and isinstance(request.data, dict):
        return request.data
    try:
        body = request.body.decode("utf-8")
        return json.loads(body) if body else {}
    except Exception:
        return {}


@api_view(["GET"])
@miller_manager_required
def list_manager_orders_view(request):
    """
    GET /api/miller/order-approval/
    List inbound orders for the authenticated branch sorted by status hierarchy:
    requested -> ordered -> partially received -> received -> declined
    Within each status: created_at ASC.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    search = request.query_params.get("search")
    status_filter = request.query_params.get("status")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    try:
        orders = list_manager_orders(
            supplier_profile_id=supplier_profile_id,
            search=search,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
        )
        return Response(
            {
                "success": True,
                "count": len(orders),
                "orders": orders,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list manager orders: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve order approval list.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_manager_required
def detail_manager_order_view(request, inbound_order_id):
    """
    GET /api/miller/order-approval/<inbound_order_id>/
    Retrieve comprehensive details for an order approval record.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        order = get_manager_order_detail(
            supplier_profile_id=supplier_profile_id,
            inbound_order_id=inbound_order_id,
        )
        if not order:
            return Response(
                {
                    "success": False,
                    "message": "Order not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "order": order,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to get order detail %s: %s", inbound_order_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve order details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_manager_required
def edit_manager_order_view(request, inbound_order_id):
    """
    POST /api/miller/order-approval/<inbound_order_id>/edit/
    Edit allowed order fields for a requested order.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    manager_user_id = request.grainrise_miller_id
    body = _parse_request_body(request)

    ordered_quantity = body.get("ordered_quantity")
    expected_arrival_date = body.get("expected_arrival_date")
    target_arrival_date = body.get("target_arrival_date")
    required_by_date = body.get("required_by_date")

    try:
        updated_order = edit_manager_order(
            supplier_profile_id=supplier_profile_id,
            manager_user_id=manager_user_id,
            inbound_order_id=inbound_order_id,
            ordered_quantity=ordered_quantity,
            expected_arrival_date=expected_arrival_date,
            target_arrival_date=target_arrival_date,
            required_by_date=required_by_date,
        )
        return Response(
            {
                "success": True,
                "message": "Order details successfully updated.",
                "order": updated_order,
            },
            status=status.HTTP_200_OK,
        )
    except OrderNotFoundError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except InvalidOrderStateError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except OrderApprovalError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to edit order %s: %s", inbound_order_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to update order details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_manager_required
def decline_manager_order_view(request, inbound_order_id):
    """
    POST /api/miller/order-approval/<inbound_order_id>/decline/
    Decline a requested order with a required reason.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    body = _parse_request_body(request)
    reason = body.get("reason")

    try:
        decline_manager_order(
            supplier_profile_id=supplier_profile_id,
            inbound_order_id=inbound_order_id,
            reason=reason,
        )
        return Response(
            {
                "success": True,
                "message": "Order successfully declined.",
            },
            status=status.HTTP_200_OK,
        )
    except OrderNotFoundError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except InvalidOrderStateError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except OrderApprovalError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to decline order %s: %s", inbound_order_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to decline order.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_manager_required
def approve_manager_order_view(request, inbound_order_id):
    """
    POST /api/miller/order-approval/<inbound_order_id>/approve/
    Approve a requested order, setting status to 'ordered' and creating
    notifications for Encoder and Procurement.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        approve_manager_order(
            supplier_profile_id=supplier_profile_id,
            inbound_order_id=inbound_order_id,
        )
        return Response(
            {
                "success": True,
                "message": "Order successfully approved.",
            },
            status=status.HTTP_200_OK,
        )
    except OrderNotFoundError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except InvalidOrderStateError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except OrderApprovalError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to approve order %s: %s", inbound_order_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to approve order.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

