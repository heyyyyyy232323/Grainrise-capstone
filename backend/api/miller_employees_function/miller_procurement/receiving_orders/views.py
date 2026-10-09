import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import (
    get_eligible_receiving_orders,
    get_receiving_order_detail,
)
from .services import (
    InvalidOrderStateError,
    OrderNotFoundError,
    ReceivingValidationError,
    receive_inbound_order,
)

logger = logging.getLogger(__name__)


# ============================================================
# RECEIVING ORDERS LIST VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def receiving_orders_list_view(request):
    """
    GET /api/miller-employees/procurement/receiving-orders/
    Retrieve active receiving orders awaiting receiving (ordered / partially_received).
    Supports search, date range, sort_by, status filters.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        search = request.query_params.get("search")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        sort_by = request.query_params.get("sort_by")
        status_filter = request.query_params.get("status")

        orders = get_eligible_receiving_orders(
            supplier_profile_id=supplier_profile_id,
            search=search,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
            status_filter=status_filter,
        )

        return Response(
            {
                "success": True,
                "data": orders,
                "count": len(orders),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing procurement receiving orders: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving receiving orders.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RECEIVING ORDER DETAIL VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def receiving_order_detail_view(request, order_id):
    """
    GET /api/miller-employees/procurement/receiving-orders/<order_id>/
    Retrieve order details and complete historical receiving records.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = get_receiving_order_detail(
            supplier_profile_id=supplier_profile_id,
            inbound_order_id=order_id,
        )

        if not detail:
            return Response(
                {
                    "success": False,
                    "message": f"Inbound order #{order_id} not found or access denied.",
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
        logger.exception("Error retrieving receiving order #%s detail: %s", order_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving order details.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RECEIVE ORDER ACTION VIEW
# ============================================================

@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_procurement_required
def receive_order_view(request, order_id):
    """
    POST /api/miller-employees/procurement/receiving-orders/<order_id>/receive/
    Process delivery receiving as an atomic multipart transaction.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    try:
        total_received = request.data.get("total_received")
        quality_checking_toggle = request.data.get("quality_checking_toggle", False)
        received_bad = request.data.get("received_bad", "0")
        price_per_kg = request.data.get("price_per_kg")
        farmer_rating = request.data.get("farmer_rating")
        shelf_location = request.data.get("shelf_location")
        expiry_date = request.data.get("expiry_date")

        receiving_proof_file = request.FILES.get("receiving_proof_photo")
        photo_evidence_file = request.FILES.get("photo_evidence")

        result = receive_inbound_order(
            supplier_profile_id=supplier_profile_id,
            supplier_employee_id=supplier_employee_id,
            inbound_order_id=order_id,
            total_received=total_received,
            quality_checking_toggle=quality_checking_toggle,
            received_bad=received_bad,
            price_per_kg=price_per_kg,
            farmer_rating=farmer_rating,
            shelf_location=shelf_location,
            expiry_date=expiry_date,
            receiving_proof_file=receiving_proof_file,
            photo_evidence_file=photo_evidence_file,
        )

        return Response(
            {
                "success": True,
                "message": "Delivery received and recorded successfully.",
                "data": result,
            },
            status=status.HTTP_201_CREATED,
        )

    except ReceivingValidationError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except OrderNotFoundError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except InvalidOrderStateError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Unexpected error receiving order #%s: %s", order_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected server error occurred while processing receiving.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

