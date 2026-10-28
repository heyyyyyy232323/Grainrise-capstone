import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_logistics_required
from .notifications.services import sync_warehouse_logistics_activity_notifications
from .selectors import (
    get_warehouse_flc_dashboard_data,
    get_warehouse_flc_driver_deliveries,
    get_warehouse_flc_reimbursement_categories,
    list_warehouse_flc_active_drivers,
    list_warehouse_flc_delivery_orders,
    list_warehouse_flc_drivers_with_capacity,
    list_warehouse_flc_fulfillment_history,
    list_warehouse_flc_fulfillment_variants,
    list_warehouse_flc_product_returns,
    list_warehouse_flc_reimbursement_history,
    list_warehouse_flc_return_variants,
    list_warehouse_flc_vehicle_assigned_history,
    list_warehouse_flc_vehicles,
    get_warehouse_flc_vehicle_detail,
)
from .services import (
    CrossBranchConflictError,
    DeliveryAssignmentError,
    DriverNotFoundError,
    ReturnActionError,
    VehicleNotFoundError,
    VehicleValidationError,
    _save_warehouse_reimbursement_attachment,
    assign_order_to_driver,
    process_warehouse_flc_product_return,
    submit_warehouse_flc_reimbursement_request,
    update_warehouse_flc_vehicle_status,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


def _get_request_profile_ids(request):
    ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        ids = [single] if single else []
    return ids


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_dashboard_view(request):
    """
    GET /api/warehouse/logistics/dashboard/
    Return real, branch-scoped KPIs, load utilization, order status breakdown,
    driver assignment status, delivery management records, and pending product returns.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)
    warehouse_user_id = getattr(request, "grainrise_warehouse_profile_id", None)

    try:
        try:
            sync_warehouse_logistics_activity_notifications(warehouse_profile_ids)
        except Exception as sync_exc:
            logger.warning("Error syncing warehouse FLC notifications during dashboard load: %s", sync_exc)

        dashboard_data = get_warehouse_flc_dashboard_data(
            warehouse_profile_ids=warehouse_profile_ids,
            warehouse_user_id=warehouse_user_id,
        )

        return _no_cache_response(
            {
                "success": True,
                "data": dashboard_data,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to load warehouse FLC dashboard: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load dashboard data.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_delivery_orders_view(request):
    """
    GET /api/warehouse/logistics/delivery-orders/
    Retrieve branch orders with status = 'Forwarded to Logistics'.
    Supports query parameters:
    - search: batch_no, retailer name, or product name
    - area: delivery area filter
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - sort: qty-desc | qty-asc | amount-desc | amount-asc | batch-asc | batch-desc | date-desc | date-asc
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    search = request.query_params.get("search", "").strip()
    area = request.query_params.get("area", "").strip()
    start_date = request.query_params.get("start_date", "").strip() or None
    end_date = request.query_params.get("end_date", "").strip() or None
    sort_by = request.query_params.get("sort", "").strip()

    try:
        orders = list_warehouse_flc_delivery_orders(
            warehouse_profile_ids=warehouse_profile_ids,
            search=search,
            area=area,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return _no_cache_response(
            {
                "success": True,
                "orders": orders,
                "total": len(orders),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse delivery orders: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve delivery orders: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_driver_capacities_view(request):
    """
    GET /api/warehouse/logistics/driver-capacities/
    Retrieve active drivers in the branch with vehicle capacity and pending load calculations.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        drivers = list_warehouse_flc_drivers_with_capacity(warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "drivers": drivers,
                "total": len(drivers),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse driver capacities: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve driver capacities: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_driver_deliveries_view(request, driver_id: int):
    """
    GET /api/warehouse/logistics/driver-capacities/<int:driver_id>/deliveries/
    Retrieve live capacity details and currently assigned, unfinished deliveries for a specific driver.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        data = get_warehouse_flc_driver_deliveries(warehouse_profile_ids, driver_id)
        if not data:
            return _no_cache_response(
                {
                    "success": False,
                    "message": f"Driver #{driver_id} not found or does not belong to this branch.",
                },
                status.HTTP_404_NOT_FOUND,
            )
        return _no_cache_response(
            {
                "success": True,
                "driver": data["driver"],
                "deliveries": data["deliveries"],
                "total": data["total"],
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse driver deliveries for driver %s: %s", driver_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve driver deliveries: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@warehouse_logistics_required
def warehouse_flc_assign_order_view(request, order_id: int):
    """
    POST /api/warehouse/logistics/delivery-orders/<int:order_id>/assign/
    Atomically assign a forwarded order to an active driver and vehicle.
    Expects JSON body: { "driver_id": <int> }
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    driver_id = request.data.get("driver_id")
    if not driver_id:
        return _no_cache_response(
            {
                "success": False,
                "message": "driver_id is required.",
            },
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        driver_id_int = int(driver_id)
    except (ValueError, TypeError):
        return _no_cache_response(
            {
                "success": False,
                "message": "driver_id must be a valid integer.",
            },
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = assign_order_to_driver(
            warehouse_profile_ids=warehouse_profile_ids,
            online_order_id=order_id,
            driver_id=driver_id_int,
        )
        return _no_cache_response(result, status.HTTP_200_OK)
    except DeliveryAssignmentError as exc:
        return _no_cache_response(
            {
                "success": False,
                "message": str(exc),
            },
            status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Unexpected error assigning order %s to driver %s: %s", order_id, driver_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error while assigning driver: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_product_returns_view(request):
    """
    GET /api/warehouse/logistics/product-returns/
    Retrieve pending product returns scoped strictly to the authenticated Warehouse branch.
    Query params: search, variant, start_date, end_date, sort_by
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    search = request.GET.get("search", "").strip() or None
    variant_filter = request.GET.get("variant", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "").strip() or None

    try:
        returns = list_warehouse_flc_product_returns(
            warehouse_profile_ids=warehouse_profile_ids,
            search=search,
            variant_filter=variant_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return _no_cache_response(
            {
                "success": True,
                "returns": returns,
                "total": len(returns),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse product returns: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve product returns: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_product_returns_variants_view(request):
    """
    GET /api/warehouse/logistics/product-returns/variants/
    Retrieve distinct product variants available in returns for the authenticated branch.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        variants = list_warehouse_flc_return_variants(warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "variants": variants,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse return variants: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve return variants: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@warehouse_logistics_required
def warehouse_flc_process_product_return_view(request, return_id):
    """
    POST /api/warehouse/logistics/product-returns/<return_id>/process/
    Approve or Reject a pending product return.
    Payload: { "action": "approve" | "reject", "rejection_reason": "..." }
    """
    warehouse_profile_ids = _get_request_profile_ids(request)
    sender_user_id = getattr(request, "grainrise_user_id", None)

    action = request.data.get("action")
    rejection_reason = request.data.get("rejection_reason")

    if not action:
        return _no_cache_response(
            {
                "success": False,
                "message": "action is required ('approve' or 'reject').",
            },
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = process_warehouse_flc_product_return(
            warehouse_profile_ids=warehouse_profile_ids,
            return_id=return_id,
            action=action,
            rejection_reason=rejection_reason,
            sender_user_id=sender_user_id,
        )
        return _no_cache_response(result, status.HTTP_200_OK)
    except ReturnActionError as exc:
        return _no_cache_response(
            {
                "success": False,
                "message": str(exc),
            },
            status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Unexpected error processing warehouse return %s: %s", return_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error while processing return: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_vehicle_assigned_history_view(request):
    """
    GET /api/warehouse/logistics/assigned-history/
    Retrieve vehicle assignment history records scoped to the authenticated Warehouse branch.
    Includes active, changed, and historical assignments.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)
    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all").strip()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "date-desc").strip()

    try:
        assignments = list_warehouse_flc_vehicle_assigned_history(
            warehouse_profile_ids=warehouse_profile_ids,
            search=search,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return _no_cache_response(
            {
                "success": True,
                "assignments": assignments,
                "total": len(assignments),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse vehicle assigned history: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error fetching vehicle assignment history: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_fulfillment_history_view(request):
    """
    GET /api/warehouse/logistics/fulfillment-history/
    Retrieve fulfillment/receiving records scoped to the authenticated Warehouse branch.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)
    search = request.GET.get("search", "").strip()
    variant = request.GET.get("variant", "all").strip()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "").strip()

    try:
        records = list_warehouse_flc_fulfillment_history(
            warehouse_profile_ids=warehouse_profile_ids,
            search=search,
            variant_filter=variant,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return _no_cache_response(
            {
                "success": True,
                "fulfillments": records,
                "total": len(records),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse fulfillment history: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error fetching fulfillment history: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_fulfillment_history_variants_view(request):
    """
    GET /api/warehouse/logistics/fulfillment-history/variants/
    Retrieve unique product variants from warehouse receiving history.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        variants = list_warehouse_flc_fulfillment_variants(warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "variants": variants,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse fulfillment variants: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error fetching fulfillment variants: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_vehicles_list_view(request):
    """
    GET /api/warehouse/logistics/vehicles/
    Retrieve delivery vehicles scoped strictly to the authenticated Warehouse branch.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)
    warehouse_user_id = getattr(request, "grainrise_warehouse_profile_id", None)

    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all").strip()
    sort_by = request.GET.get("sort", "").strip()

    try:
        vehicles = list_warehouse_flc_vehicles(
            warehouse_profile_ids=warehouse_profile_ids,
            warehouse_user_id=None,
            search=search,
            status_filter=status_filter,
            sort_by=sort_by,
        )
        return _no_cache_response(
            {
                "success": True,
                "vehicles": vehicles,
                "total": len(vehicles),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse vehicles: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve vehicles: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_vehicle_detail_view(request, vehicle_id):
    """
    GET /api/warehouse/logistics/vehicles/<vehicle_id>/
    Retrieve full details for a vehicle scoped to the authenticated Warehouse branch.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        vehicle = get_warehouse_flc_vehicle_detail(
            vehicle_id=vehicle_id,
            warehouse_profile_ids=warehouse_profile_ids,
        )
        if not vehicle:
            return _no_cache_response(
                {
                    "success": False,
                    "message": "Vehicle not found or not designated to your branch.",
                },
                status.HTTP_404_NOT_FOUND,
            )

        return _no_cache_response(
            {
                "success": True,
                "vehicle": vehicle,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse vehicle details: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve vehicle details: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["GET"])
@warehouse_logistics_required
def warehouse_flc_active_drivers_view(request):
    """
    GET /api/warehouse/logistics/drivers/
    Retrieve active drivers belonging to the SAME branch as the authenticated Warehouse FLC employee.
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        drivers = list_warehouse_flc_active_drivers(warehouse_profile_ids=warehouse_profile_ids)
        return _no_cache_response(
            {
                "success": True,
                "drivers": drivers,
                "total": len(drivers),
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Unexpected error fetching warehouse drivers: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Failed to retrieve drivers: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@warehouse_logistics_required
def warehouse_flc_vehicle_update_status_view(request, vehicle_id):
    """
    POST /api/warehouse/logistics/vehicles/<vehicle_id>/update-status/
    Execute status update or driver assignment for a vehicle designated to this branch.

    Payload options:
    - { "action": "assign_driver", "driver_id": 123 }
    - { "action": "inactive", "reason": "Repairing suspension" }
    - { "action": "maintenance", "reason": "Scheduled change oil" }
    - { "action": "set_active" }
    """
    warehouse_profile_ids = _get_request_profile_ids(request)

    try:
        if isinstance(request.data, dict):
            body = request.data
        else:
            body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    action = body.get("action")
    driver_id = body.get("driver_id")
    reason = body.get("reason")

    try:
        result = update_warehouse_flc_vehicle_status(
            vehicle_id=vehicle_id,
            warehouse_profile_ids=warehouse_profile_ids,
            action=action,
            driver_id=driver_id,
            reason=reason,
        )
        return _no_cache_response(
            {
                "success": True,
                "message": result.get("message", "Vehicle updated successfully."),
                "data": result,
            },
            status.HTTP_200_OK,
        )
    except VehicleNotFoundError as e:
        return _no_cache_response(
            {
                "success": False,
                "message": str(e),
            },
            status.HTTP_404_NOT_FOUND,
        )
    except DriverNotFoundError as e:
        return _no_cache_response(
            {
                "success": False,
                "message": str(e),
            },
            status.HTTP_404_NOT_FOUND,
        )
    except VehicleValidationError as e:
        return _no_cache_response(
            {
                "success": False,
                "message": str(e),
            },
            status.HTTP_400_BAD_REQUEST,
        )
    except CrossBranchConflictError as e:
        return _no_cache_response(
            {
                "success": False,
                "message": str(e),
            },
            status.HTTP_409_CONFLICT,
        )
    except Exception as exc:
        logger.exception("Unexpected error updating warehouse vehicle status: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": f"Server error updating vehicle: {str(exc)}",
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ─────────────────────────────────────────────────────────────
# WAREHOUSE FLC REIMBURSEMENT REQUEST VIEWS
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
@warehouse_logistics_required
def warehouse_flc_submit_reimbursement_view(request):
    """
    POST /api/warehouse/logistics/reimbursements/submit/
    Submit a new reimbursement request for the authenticated Warehouse FLC employee.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    employee_id = getattr(request, "grainrise_warehouse_employee_id", None)

    # Handle multipart or JSON
    if request.content_type and "multipart/form-data" in request.content_type:
        category = request.POST.get("category", "").strip()
        custom_category = request.POST.get("custom_category", "").strip()
        cost_raw = request.POST.get("cost", "").strip()
        expense_date_raw = request.POST.get("expense_date", "").strip()
        description = request.POST.get("description", "").strip()
        title = request.POST.get("title", "").strip()
        file_obj = request.FILES.get("attachment") or request.FILES.get("file")
        base64_str = request.POST.get("attachment_base64", "").strip()
    else:
        try:
            body = json.loads(request.body.decode("utf-8")) if request.body else {}
        except Exception:
            body = {}
        category = str(body.get("category", "")).strip()
        custom_category = str(body.get("custom_category", "")).strip()
        cost_raw = str(body.get("cost", "")).strip()
        expense_date_raw = str(body.get("expense_date", "")).strip()
        description = str(body.get("description", "")).strip()
        title = str(body.get("title", "")).strip()
        file_obj = None
        base64_str = str(body.get("attachment", "")).strip()

    # Category validation
    valid_categories = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication Expenses",
        "Logistics",
        "Office & Operating Supplies",
        "Others",
    ]
    if not category:
        return JsonResponse({"success": False, "message": "Expense category is required."}, status=400)

    if category == "Others":
        if not custom_category:
            return JsonResponse(
                {"success": False, "message": "Please specify the custom category for 'Others'."},
                status=400,
            )
        final_category = custom_category
    else:
        final_category = category

    # Cost validation
    try:
        cost = float(cost_raw)
        if cost <= 0:
            return JsonResponse(
                {"success": False, "message": "Cost must be a positive number greater than zero."},
                status=400,
            )
    except (TypeError, ValueError):
        return JsonResponse(
            {"success": False, "message": "Please enter a valid numeric cost amount."},
            status=400,
        )

    # Expense Date validation
    if not expense_date_raw:
        return JsonResponse({"success": False, "message": "Expense date is required."}, status=400)

    # Description validation
    if not description:
        return JsonResponse({"success": False, "message": "Description is required."}, status=400)
    if len(description) > 1000:
        return JsonResponse(
            {"success": False, "message": "Description cannot exceed 1,000 characters."},
            status=400,
        )

    # Attachment validation & saving
    try:
        photo_url = _save_warehouse_reimbursement_attachment(file_obj, base64_str, warehouse_profile_id)
    except ValueError as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)

    try:
        final_title = title or f"{final_category} Reimbursement"
        result = submit_warehouse_flc_reimbursement_request(
            warehouse_profile_id=warehouse_profile_id,
            requested_by_employee_id=employee_id,
            title=final_title,
            description=description,
            category=final_category,
            price=cost,
            photo_evidence=photo_url,
            expense_date=expense_date_raw,
        )
        return JsonResponse(
            {
                "success": True,
                "message": f"Reimbursement request {result.get('request_reference_no')} submitted successfully.",
                "reimbursement": result,
            },
            status=201,
        )
    except ValueError as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)
    except Exception as e:
        logger.error(f"Error submitting warehouse reimbursement request: {e}", exc_info=True)
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error submitting reimbursement request: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@warehouse_logistics_required
def warehouse_flc_reimbursement_history_view(request):
    """
    GET /api/warehouse/logistics/reimbursements/history/
    List reimbursement history records for the authenticated Warehouse FLC employee.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    employee_id = getattr(request, "grainrise_warehouse_employee_id", None)

    search = request.GET.get("search", "").strip() or None
    status_filter = request.GET.get("status", "").strip() or None
    category_filter = request.GET.get("category", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "").strip() or None

    # Date range validation
    if start_date and end_date and start_date > end_date:
        return JsonResponse(
            {"success": False, "error": "Start date cannot be after end date."},
            status=400,
        )

    try:
        records = list_warehouse_flc_reimbursement_history(
            warehouse_profile_ids=warehouse_profile_ids,
            employee_id=employee_id,
            search=search,
            status_filter=status_filter,
            category_filter=category_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "count": len(records),
                "data": records,
            },
            status=200,
        )
    except Exception as e:
        logger.error(f"Error fetching warehouse reimbursement history: {e}", exc_info=True)
        return JsonResponse(
            {"success": False, "error": f"Failed to load reimbursement history: {str(e)}"},
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@warehouse_logistics_required
def warehouse_flc_reimbursement_categories_view(request):
    """
    GET /api/warehouse/logistics/reimbursements/categories/
    List all standard and custom reimbursement categories for this branch.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    try:
        categories = get_warehouse_flc_reimbursement_categories(warehouse_profile_ids)
        return JsonResponse(
            {
                "success": True,
                "categories": categories,
            },
            status=200,
        )
    except Exception as e:
        logger.error(f"Error fetching warehouse reimbursement categories: {e}", exc_info=True)
        return JsonResponse(
            {"success": False, "error": f"Failed to load reimbursement categories: {str(e)}"},
            status=500,
        )


