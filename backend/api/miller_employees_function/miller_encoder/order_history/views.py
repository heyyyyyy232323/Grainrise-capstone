import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.miller_employees_function.employee_auth import miller_encoder_required
from .selectors import (
    get_order_history_list,
    get_order_history_detail,
)

logger = logging.getLogger("grainrise.encoder.order_history.views")


@csrf_exempt
@miller_encoder_required
def order_history_list_view(request):
    """
    GET: Retrieve list of order history records for the authenticated miller encoder.
    Strictly scoped to the encoder's supplier_profile_id.
    """
    if request.method != "GET":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use GET."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    sort_by = request.GET.get("sort_by")

    try:
        orders = get_order_history_list(
            supplier_profile_id=supplier_profile_id,
            search=search,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "data": orders,
            },
            status=200,
        )
    except Exception as exc:
        logger.exception("Error retrieving order history list: %s", exc)
        return JsonResponse(
            {"success": False, "message": "Failed to retrieve order history."},
            status=500,
        )


@csrf_exempt
@miller_encoder_required
def order_history_detail_view(request, inbound_order_id):
    """
    GET: Retrieve detailed order transaction information for the specified order.
    Strictly scoped to the encoder's supplier_profile_id.
    """
    if request.method != "GET":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use GET."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        inbound_order_id = int(inbound_order_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {"success": False, "message": "Invalid order ID provided."},
            status=400,
        )

    try:
        order_detail = get_order_history_detail(supplier_profile_id, inbound_order_id)
        if not order_detail:
            return JsonResponse(
                {"success": False, "message": "Order not found."},
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "data": order_detail,
            },
            status=200,
        )
    except Exception as exc:
        logger.exception("Error retrieving order detail: %s", exc)
        return JsonResponse(
            {"success": False, "message": "Failed to retrieve order details."},
            status=500,
        )

