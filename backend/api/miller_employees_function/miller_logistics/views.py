import base64
import json
import logging
import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.miller_employees_function.employee_auth import miller_flc_required
from api.miller_employees_function.miller_finance.reimbursements.services import (
    submit_reimbursement_request,
)
from . import selectors

logger = logging.getLogger(__name__)
from .selectors import (
    get_flc_driver_deliveries,
    get_flc_vehicle_detail,
    list_flc_active_drivers,
    list_flc_delivery_orders,
    list_flc_drivers_with_capacity,
    list_flc_fulfillment_history,
    list_flc_fulfillment_variants,
    list_flc_product_returns,
    list_flc_return_variants,
    list_flc_vehicle_assigned_history,
    list_flc_vehicles,
)
from .services import (
    CrossBranchConflictError,
    DeliveryAssignmentError,
    DriverNotFoundError,
    ReturnActionError,
    VehicleNotFoundError,
    VehicleValidationError,
    assign_order_to_driver,
    process_return_action,
    update_flc_vehicle_status,
)


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_vehicles_list_view(request):
    """
    GET /api/miller-employees/logistics/vehicles/
    Retrieve delivery vehicles scoped strictly to the authenticated FLC employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all").strip()
    sort_by = request.GET.get("sort", "").strip()

    try:
        vehicles = list_flc_vehicles(
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
            search=search,
            status_filter=status_filter,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "vehicles": vehicles,
                "total": len(vehicles),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve vehicles: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_vehicle_detail_view(request, vehicle_id):
    """
    GET /api/miller-employees/logistics/vehicles/<vehicle_id>/
    Retrieve full details for a vehicle scoped to the authenticated FLC employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    try:
        vehicle = get_flc_vehicle_detail(
            vehicle_id=vehicle_id,
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
        )
        if not vehicle:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Vehicle not found or not designated to your branch.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "vehicle": vehicle,
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve vehicle details: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_active_drivers_view(request):
    """
    GET /api/miller-employees/logistics/drivers/
    Retrieve active drivers belonging to the SAME branch as the authenticated FLC employee.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        drivers = list_flc_active_drivers(supplier_profile_id=supplier_profile_id)
        return JsonResponse(
            {
                "success": True,
                "drivers": drivers,
                "total": len(drivers),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve drivers: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["POST"])
@miller_flc_required
def flc_vehicle_update_status_view(request, vehicle_id):
    """
    POST /api/miller-employees/logistics/vehicles/<vehicle_id>/update-status/
    Execute status update or driver assignment for a vehicle designated to this branch.

    Payload options:
    - { "action": "assign_driver", "driver_id": 123 }
    - { "action": "inactive", "reason": "Repairing suspension" }
    - { "action": "maintenance", "reason": "Scheduled change oil" }
    - { "action": "set_active" }
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON payload.",
            },
            status=400,
        )

    action = body.get("action")
    driver_id = body.get("driver_id")
    reason = body.get("reason")

    try:
        result = update_flc_vehicle_status(
            vehicle_id=vehicle_id,
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
            action=action,
            driver_id=driver_id,
            reason=reason,
        )
        return JsonResponse(
            {
                "success": True,
                "message": result.get("message", "Vehicle updated successfully."),
                "data": result,
            },
            status=200,
        )
    except VehicleNotFoundError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=404,
        )
    except DriverNotFoundError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=404,
        )
    except VehicleValidationError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    except CrossBranchConflictError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=409,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error updating vehicle: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_delivery_orders_view(request):
    """
    GET /api/miller-employees/logistics/delivery-orders/
    Retrieve branch orders with status = 'Forwarded to Logistics'.
    Supports query parameters:
    - search: batch_no, buyer, or product name
    - buyer_type: all | retailer | warehouse
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - sort: qty-desc | qty-asc | amount-desc | amount-asc | batch-asc | date-desc | date-asc
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    search = request.GET.get("search", "").strip()
    buyer_type = request.GET.get("buyer_type", "all").strip().lower()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "").strip()

    try:
        orders = list_flc_delivery_orders(
            supplier_profile_id=supplier_profile_id,
            search=search,
            buyer_type=buyer_type,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "orders": orders,
                "total": len(orders),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve delivery orders: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_driver_capacities_view(request):
    """
    GET /api/miller-employees/logistics/driver-capacities/
    Retrieve active drivers in the branch with vehicle capacity and pending load calculations.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        drivers = list_flc_drivers_with_capacity(supplier_profile_id)
        return JsonResponse(
            {
                "success": True,
                "drivers": drivers,
                "total": len(drivers),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve driver capacities: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_driver_deliveries_view(request, driver_id):
    """
    GET /api/miller-employees/logistics/driver-capacities/<driver_id>/deliveries/
    or  /api/miller-employees/logistics/drivers/<driver_id>/deliveries/
    Retrieve live capacity details and currently assigned, unfinished deliveries for a specific driver.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        data = get_flc_driver_deliveries(supplier_profile_id, driver_id)
        if not data:
            return JsonResponse(
                {
                    "success": False,
                    "message": f"Driver #{driver_id} not found or does not belong to this branch.",
                },
                status=404,
            )
        return JsonResponse(
            {
                "success": True,
                "driver": data["driver"],
                "deliveries": data["deliveries"],
                "total": data["total"],
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve driver deliveries: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["POST"])
@miller_flc_required
def flc_assign_order_view(request, order_id):
    """
    POST /api/miller-employees/logistics/delivery-orders/<order_id>/assign/
    Atomically assign a forwarded order to an active driver and vehicle.
    Expects JSON body: { "driver_id": <int> }
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse(
            {
                "success": False,
                "message": "Malformed JSON payload.",
            },
            status=400,
        )

    driver_id = body.get("driver_id")
    if not driver_id:
        return JsonResponse(
            {
                "success": False,
                "message": "driver_id is required.",
            },
            status=400,
        )

    try:
        result = assign_order_to_driver(
            supplier_profile_id=supplier_profile_id,
            online_order_id=order_id,
            driver_id=driver_id,
        )
        return JsonResponse(result, status=200)
    except DeliveryAssignmentError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error assigning order: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_product_returns_view(request):
    """
    GET /api/miller-employees/logistics/product-returns/
    Retrieve pending product returns scoped strictly to the authenticated FLC employee's branch.
    Supports query params: search, variant, start_date, end_date, sort.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    search = request.GET.get("search", "").strip()
    variant = request.GET.get("variant", "").strip()
    start_date = request.GET.get("start_date", "").strip()
    end_date = request.GET.get("end_date", "").strip()
    sort_by = request.GET.get("sort", "").strip()

    try:
        returns = list_flc_product_returns(
            supplier_profile_id=supplier_profile_id,
            search=search if search else None,
            variant_filter=variant if variant else None,
            start_date=start_date if start_date else None,
            end_date=end_date if end_date else None,
            sort_by=sort_by if sort_by else None,
        )
        return JsonResponse(
            {
                "success": True,
                "returns": returns,
                "total": len(returns),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve product returns: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_return_variants_view(request):
    """
    GET /api/miller-employees/logistics/product-returns/variants/
    Retrieve distinct product variants available in returns for the authenticated branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        variants = list_flc_return_variants(supplier_profile_id)
        return JsonResponse(
            {
                "success": True,
                "variants": variants,
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve return variants: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["POST"])
@miller_flc_required
def flc_process_return_view(request, return_id):
    """
    POST /api/miller-employees/logistics/product-returns/<return_id>/process/
    Atomically approve or reject a pending product return.
    Expects JSON body:
      - action: 'approve' | 'reject'
      - rejection_reason: string (required if action == 'reject')
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    owner_user_id = request.grainrise_owner_user_id

    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        return JsonResponse(
            {
                "success": False,
                "message": "Malformed JSON payload.",
            },
            status=400,
        )

    action = str(body.get("action", "")).strip().lower()
    if action not in ("approve", "reject"):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid action. Must be 'approve' or 'reject'.",
            },
            status=400,
        )

    rejection_reason = body.get("rejection_reason")
    if action == "reject" and not (rejection_reason and str(rejection_reason).strip()):
        return JsonResponse(
            {
                "success": False,
                "message": "Rejection reason is required when rejecting a return.",
            },
            status=400,
        )

    try:
        result = process_return_action(
            supplier_profile_id=supplier_profile_id,
            return_id=return_id,
            action=action,
            rejection_reason=rejection_reason,
            sender_user_id=owner_user_id,
        )
        return JsonResponse(result, status=200)
    except ReturnActionError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error processing return: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_vehicle_assigned_history_view(request):
    """
    GET /api/miller-employees/logistics/assigned-history/
    Retrieve vehicle assignment history records scoped to the authenticated FLC branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all").strip()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "date-desc").strip()

    try:
        assignments = list_flc_vehicle_assigned_history(
            supplier_profile_id=supplier_profile_id,
            search=search,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "assignments": assignments,
                "total": len(assignments),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error fetching vehicle assignment history: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_fulfillment_history_view(request):
    """
    GET /api/miller-employees/logistics/fulfillment-history/
    Retrieve fulfillment/receiving records scoped to the authenticated FLC branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search", "").strip()
    variant = request.GET.get("variant", "all").strip()
    buyer_type = request.GET.get("buyer_type", "all").strip()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "").strip()

    try:
        records = list_flc_fulfillment_history(
            supplier_profile_id=supplier_profile_id,
            search=search,
            variant_filter=variant,
            buyer_type_filter=buyer_type,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "fulfillments": records,
                "total": len(records),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error fetching fulfillment history: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_fulfillment_variants_view(request):
    """
    GET /api/miller-employees/logistics/fulfillment-history/variants/
    Retrieve distinct variants associated with receiving/products for this FLC branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        variants = list_flc_fulfillment_variants(supplier_profile_id)
        return JsonResponse({"success": True, "variants": variants}, status=200)
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error fetching fulfillment variants: {str(e)}",
            },
            status=500,
        )


def _save_reimbursement_attachment(file_obj, base64_str, supplier_profile_id):
    """
    Validate and save attachment file (file_obj or base64 data URL).
    Returns relative media URL like /media/reimbursements/7/abc12345.jpg.
    Raises ValueError on validation failures.
    """
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    max_bytes = 10 * 1024 * 1024  # 10 MB

    if file_obj is not None:
        name = getattr(file_obj, "name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in allowed_exts:
            raise ValueError(
                f"Unsupported file format '{ext}'. Only PNG, JPG, JPEG, and WEBP files are accepted."
            )
        if file_obj.size > max_bytes:
            raise ValueError("Attachment file exceeds the 10 MB size limit.")

        unique_name = f"reimb_{uuid.uuid4().hex[:12]}{ext}"
        rel_path = f"reimbursements/{supplier_profile_id}/{unique_name}"
        saved_path = default_storage.save(rel_path, file_obj)
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    if base64_str and str(base64_str).strip():
        raw_str = str(base64_str).strip()
        ext = ".jpg"
        b64_payload = raw_str
        if raw_str.startswith("data:"):
            header, _, b64_payload = raw_str.partition(",")
            if "image/png" in header:
                ext = ".png"
            elif "image/webp" in header:
                ext = ".webp"
            elif "image/jpeg" in header or "image/jpg" in header:
                ext = ".jpg"
            else:
                raise ValueError(
                    "Unsupported image format in captured photo. Only PNG, JPG, and WEBP are accepted."
                )

        try:
            binary_bytes = base64.b64decode(b64_payload, validate=False)
        except Exception as exc:
            raise ValueError("Invalid captured photo data.") from exc

        if not binary_bytes or len(binary_bytes) < 64:
            raise ValueError("Captured photo is empty or corrupted.")

        if len(binary_bytes) > max_bytes:
            raise ValueError("Captured photo exceeds the 10 MB size limit.")

        unique_name = f"reimb_{uuid.uuid4().hex[:12]}{ext}"
        rel_path = f"reimbursements/{supplier_profile_id}/{unique_name}"
        saved_path = default_storage.save(rel_path, ContentFile(binary_bytes))
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    raise ValueError("Attachment is required. Please upload a receipt or take a photo.")


@csrf_exempt
@require_http_methods(["POST"])
@miller_flc_required
def flc_submit_reimbursement_view(request):
    """
    POST /api/miller-employees/logistics/reimbursements/submit/
    Submit a new reimbursement request for the authenticated FLC employee.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

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
        photo_url = _save_reimbursement_attachment(file_obj, base64_str, supplier_profile_id)
    except ValueError as e:
        return JsonResponse({"success": False, "message": str(e)}, status=400)

    # Call submit_reimbursement_request
    try:
        final_title = title or f"{final_category} Reimbursement"
        result = submit_reimbursement_request(
            supplier_profile_id=supplier_profile_id,
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
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error submitting reimbursement request: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_reimbursement_history_view(request):
    """
    GET /api/miller-employees/logistics/reimbursements/history/
    List reimbursement history records for the authenticated FLC employee.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

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
        records = selectors.list_flc_reimbursement_history(
            supplier_profile_id=supplier_profile_id,
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
        logger.error(f"Error fetching reimbursement history: {e}", exc_info=True)
        return JsonResponse(
            {"success": False, "error": f"Failed to load reimbursement history: {str(e)}"},
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_reimbursement_categories_view(request):
    """
    GET /api/miller-employees/logistics/reimbursements/categories/
    List all standard and custom reimbursement categories for this branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        categories = selectors.get_flc_reimbursement_categories(supplier_profile_id)
        return JsonResponse(
            {
                "success": True,
                "categories": categories,
            },
            status=200,
        )
    except Exception as e:
        logger.error(f"Error fetching reimbursement categories: {e}", exc_info=True)
        return JsonResponse(
            {"success": False, "error": f"Failed to load reimbursement categories: {str(e)}"},
            status=500,
        )
