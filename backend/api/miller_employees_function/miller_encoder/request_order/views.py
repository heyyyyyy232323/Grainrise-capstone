import json
import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.miller_employees_function.employee_auth import miller_encoder_required
from .selectors import (
    get_branch_business_info,
    list_eligible_request_products,
    get_product_for_request,
    get_historical_product_demand,
    get_current_month_sales,
)
from .forecasting import (
    generate_demand_forecast_pipeline,
)
from .services import (
    generate_batch_number,
    create_encoder_request_order,
    RequestOrderValidationError,
)

logger = logging.getLogger("grainrise.encoder.request_orders.views")


def _parse_request_data(request):
    """Safely extract data from JSON body or POST form data."""
    if request.content_type and "application/json" in request.content_type:
        try:
            return json.loads(request.body.decode("utf-8"))
        except Exception:
            return {}
    return request.POST.dict()


@csrf_exempt
@miller_encoder_required
def eligible_products_view(request):
    """
    GET: Retrieve list of eligible products for the authenticated miller branch.
    Only includes active and archived products matching the eligibility criteria (low/no stock, near expiry/expired).
    Never includes 'unmilled' products.
    """
    if request.method != "GET":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use GET."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id
    products = list_eligible_request_products(supplier_profile_id)
    branch_info = get_branch_business_info(supplier_profile_id)

    return JsonResponse(
        {
            "success": True,
            "data": {
                "products": products,
                "branch_info": {
                    "business_name": branch_info.get("business_name") if branch_info else "GrainRise",
                    "province": branch_info.get("province") if branch_info else "",
                    "municipality": branch_info.get("municipality") if branch_info else "",
                    "barangay": branch_info.get("barangay") if branch_info else "",
                },
            },
        },
        status=200,
    )


@csrf_exempt
@miller_encoder_required
def generate_forecast_view(request):
    """
    POST: Generate demand forecast and retrieve historical sales & CDS climate
    for the exact product and supplier.
    """
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use POST."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id
    data = _parse_request_data(request)

    product_id_raw = data.get("product_id") or data.get("miller_product_id")
    supplier_id_raw = data.get("supplier_id") or data.get("farmer_contact_id")

    if not product_id_raw:
        return JsonResponse(
            {"success": False, "message": "Product selection (product_id) is required."},
            status=400,
        )

    try:
        product_id = int(product_id_raw)
    except (TypeError, ValueError):
        return JsonResponse(
            {"success": False, "message": "Invalid product_id parameter."},
            status=400,
        )

    supplier_id = None
    if supplier_id_raw:
        try:
            supplier_id = int(supplier_id_raw)
        except (TypeError, ValueError):
            pass

    product = get_product_for_request(
        supplier_profile_id=supplier_profile_id,
        product_id=product_id,
        supplier_id=supplier_id,
    )
    if not product:
        return JsonResponse(
            {"success": False, "message": "Product not found or does not belong to your branch."},
            status=404,
        )

    if not product.get("is_eligible"):
        return JsonResponse(
            {
                "success": False,
                "message": f"This product is healthy and not eligible for supply request: {product.get('eligibility_reason')}.",
            },
            status=400,
        )

    branch_info = get_branch_business_info(supplier_profile_id)
    if not branch_info:
        return JsonResponse(
            {"success": False, "message": "Miller branch profile not found."},
            status=404,
        )

    matching_ids = product.get("all_matching_product_ids") or [product_id]

    # 1. Historical sales (past 12 months, actual only across matching product variant + supplier)
    historical_sales = get_historical_product_demand(
        supplier_profile_id=supplier_profile_id,
        product_ids=matching_ids,
    )

    # 2. Current month actual sales across matching product variant + supplier
    current_month_sales = get_current_month_sales(
        supplier_profile_id=supplier_profile_id,
        product_ids=matching_ids,
    )

    # 3. Demand forecasting pipeline (CDS 3-month forecast + Gemini AI)
    forecast_result = generate_demand_forecast_pipeline(
        supplier_profile_id=supplier_profile_id,
        product=product,
        branch_info=branch_info,
        historical_sales=historical_sales,
        current_month_sales=current_month_sales,
    )

    # 4. Preview batch number
    batch_preview = generate_batch_number(
        product_name=product.get("product_name"),
        business_name=branch_info.get("business_name"),
    )

    return JsonResponse(
        {
            "success": True,
            "data": {
                "product": product,
                "historical_demand": historical_sales,
                "current_month_sales": current_month_sales,
                "cds_climate": forecast_result["cds_climate"],
                "forecast": forecast_result["forecast"],
                "batch_number_preview": batch_preview,
                "is_fallback": forecast_result["is_fallback"],
            },
        },
        status=200,
    )


@csrf_exempt
@miller_encoder_required
def create_request_order_view(request):
    """
    POST: Submit new supply request order.
    Creates inbound_order, miller_inbound_date_requirements, and saves exact forecast in
    miller_demand_forecasting_support_from_request_orders in a single atomic transaction.
    """
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use POST."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    # Handle multipart or json
    if request.content_type and "application/json" in request.content_type:
        try:
            data = json.loads(request.body.decode("utf-8"))
        except Exception:
            return JsonResponse({"success": False, "message": "Invalid JSON payload."}, status=400)
    else:
        data = request.POST.dict()

    product_id_raw = data.get("product_id") or data.get("miller_product_id")
    supplier_id_raw = data.get("supplier_id") or data.get("farmer_contact_id")
    order_quantity = data.get("order_quantity") or data.get("ordered_quantity")
    stock_quantity = data.get("stock_quantity")
    target_arrival_date = data.get("target_arrival_date")
    required_by_date = data.get("required_by_date")
    notes = data.get("notes")

    forecast_raw = data.get("forecast_data") or data.get("forecast")
    if isinstance(forecast_raw, str):
        try:
            forecast_data = json.loads(forecast_raw)
        except Exception:
            forecast_data = None
    elif isinstance(forecast_raw, dict):
        forecast_data = forecast_raw
    else:
        forecast_data = None

    if not product_id_raw or not supplier_id_raw:
        return JsonResponse(
            {"success": False, "message": "Both product and supplier selections are required."},
            status=400,
        )

    if order_quantity is None:
        return JsonResponse(
            {"success": False, "message": "Order quantity is required."},
            status=400,
        )

    if not target_arrival_date or not required_by_date:
        return JsonResponse(
            {"success": False, "message": "Target Arrival Date and Required By Date are required."},
            status=400,
        )

    try:
        product_id = int(product_id_raw)
        supplier_id = int(supplier_id_raw)
    except (TypeError, ValueError):
        return JsonResponse(
            {"success": False, "message": "Invalid product or supplier ID format."},
            status=400,
        )

    # Optional replacement image file upload
    replacement_file = (
        request.FILES.get("replacement_file")
        or request.FILES.get("replacement_photo")
        or request.FILES.get("attachment")
        or request.FILES.get("product_photo")
    )

    try:
        result = create_encoder_request_order(
            supplier_profile_id=supplier_profile_id,
            supplier_employee_id=supplier_employee_id,
            product_id=product_id,
            supplier_id=supplier_id,
            order_quantity=order_quantity,
            stock_quantity=stock_quantity,
            target_arrival_date=target_arrival_date,
            required_by_date=required_by_date,
            notes=notes,
            replacement_file=replacement_file,
            forecast_data=forecast_data,
        )

        return JsonResponse(
            {
                "success": True,
                "message": f"Supply request order submitted successfully with batch {result['batch_no']}.",
                "data": result,
            },
            status=201,
        )

    except RequestOrderValidationError as exc:
        return JsonResponse(
            {"success": False, "message": str(exc)},
            status=400,
        )
    except Exception as exc:
        logger.exception("Unexpected error creating request order: %s", exc)
        return JsonResponse(
            {"success": False, "message": f"Internal server error: {str(exc)}"},
            status=500,
        )

