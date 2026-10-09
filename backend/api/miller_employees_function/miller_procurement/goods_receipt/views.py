import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_procurement_required
from .selectors import (
    get_pending_goods_receipts,
    get_goods_receipt_detail,
)
from .services import (
    GoodsReceiptNotFoundError,
    AlreadyRequestedToPayError,
    request_to_pay,
)

logger = logging.getLogger(__name__)


# ============================================================
# GOODS RECEIPT LIST VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def goods_receipt_list_view(request):
    """
    GET /api/miller-employees/procurement/goods-receipt/
    Fetch inbound receiving records with status = 'pending',
    scoped to the authenticated Miller business.
    Supports search and sorting (oldest, newest, batch_asc, batch_desc).
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        search = request.query_params.get("search")
        sort_by = request.query_params.get("sort_by")

        receipts = get_pending_goods_receipts(
            supplier_profile_id=supplier_profile_id,
            search=search,
            sort_by=sort_by,
        )

        return Response(
            {
                "success": True,
                "data": receipts,
                "count": len(receipts),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing procurement goods receipts: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving goods receipts.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# GOODS RECEIPT DETAIL VIEW
# ============================================================

@api_view(["GET"])
@miller_procurement_required
def goods_receipt_detail_view(request, receiving_id):
    """
    GET /api/miller-employees/procurement/goods-receipt/<receiving_id>/
    Retrieve complete receiving and order details for a specific receiving record.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = get_goods_receipt_detail(
            supplier_profile_id=supplier_profile_id,
            receiving_id=receiving_id,
        )

        if not detail:
            return Response(
                {
                    "success": False,
                    "message": f"Receiving record #{receiving_id} was not found or access denied.",
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
        logger.exception("Error retrieving goods receipt detail for id=%s: %s", receiving_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving receiving details.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# REQUEST TO PAY VIEW
# ============================================================

@api_view(["POST"])
@miller_procurement_required
def goods_receipt_request_to_pay_view(request, receiving_id):
    """
    POST /api/miller-employees/procurement/goods-receipt/<receiving_id>/request-to-pay/
    Transition receiving status from 'pending' to 'request to pay'.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = request_to_pay(
            supplier_profile_id=supplier_profile_id,
            receiving_id=receiving_id,
        )

        return Response(
            {
                "success": True,
                "message": "Payment requested successfully and goods receipt generated.",
                "data": detail,
            },
            status=status.HTTP_200_OK,
        )

    except GoodsReceiptNotFoundError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    except AlreadyRequestedToPayError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error requesting payment for receiving_id=%s: %s", receiving_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while requesting payment.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

