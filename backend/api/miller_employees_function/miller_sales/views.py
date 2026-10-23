"""
HTTP views for Miller Sales Point of Sale (POS).
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.miller_employees_function.employee_auth import miller_sales_required

from .selectors import (
    get_miller_online_order_detail,
    get_pos_checkout_receipt,
    get_sales_dashboard_data,
    get_seller_and_branch_context,
    list_in_store_sales,
    list_miller_online_orders,
    list_online_sales,
    list_pos_payment_accounts,
    list_pos_products,
)
from .services import (
    InsufficientStockError,
    OnlineOrderError,
    OnlineOrderNotFoundError,
    OnlineOrderStateError,
    POSValidationError,
    approve_miller_online_order,
    check_duplicate_pos_payment_reference,
    decline_miller_online_order,
    normalize_reference_no,
    process_pos_checkout,
)


@csrf_exempt
@require_GET
@miller_sales_required
def pos_products_view(request):
    """
    GET /api/miller-employees/sales/pos/products/
    Returns active POS products (in sacks), configured payment accounts, and seller/branch info.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    products = list_pos_products(supplier_profile_id)
    payment_accounts = list_pos_payment_accounts(supplier_profile_id)
    seller_context = get_seller_and_branch_context(supplier_employee_id, supplier_profile_id)

    return JsonResponse(
        {
            "products": products,
            "payment_accounts": payment_accounts,
            "seller": seller_context,
        },
        status=200,
    )


@csrf_exempt
@require_GET
@miller_sales_required
def pos_payment_accounts_view(request):
    """
    GET /api/miller-employees/sales/pos/payment-accounts/
    Returns configured active GCash and Bank Transfer payment accounts for the Miller branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    accounts = list_pos_payment_accounts(supplier_profile_id)
    return JsonResponse({"payment_accounts": accounts}, status=200)


@csrf_exempt
@require_POST
@miller_sales_required
def pos_check_reference_view(request):
    """
    POST /api/miller-employees/sales/pos/check-reference/
    Validates whether a GCash/Bank payment reference number has already been used.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid JSON body."}, status=400)

    payment_method = (payload.get("payment_method") or "").strip().lower()
    raw_ref = payload.get("reference_no") or ""
    credentials_id = payload.get("credentials_id")

    clean_ref = normalize_reference_no(raw_ref)
    if not clean_ref:
        return JsonResponse(
            {
                "is_duplicate": False,
                "normalized_reference": "",
                "detail": "Reference number is empty.",
            },
            status=200,
        )

    is_dup = check_duplicate_pos_payment_reference(
        supplier_profile_id=supplier_profile_id,
        payment_method=payment_method,
        reference_no=clean_ref,
        credentials_id=credentials_id,
    )

    return JsonResponse(
        {
            "is_duplicate": is_dup,
            "normalized_reference": clean_ref,
            "detail": (
                f"Reference number '{clean_ref}' has already been used for a confirmed payment."
                if is_dup
                else "Reference number is available."
            ),
        },
        status=200,
    )


@csrf_exempt
@require_POST
@miller_sales_required
def pos_checkout_view(request):
    """
    POST /api/miller-employees/sales/pos/checkout/
    Processes a POS checkout (Cash, GCash, or Bank Transfer) atomically.
    Supports both JSON payloads (with base64 proof image) and multipart/form-data.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    content_type = (request.content_type or "").lower()
    proof_file = None

    if "multipart/form-data" in content_type:
        raw_items = request.POST.get("items", "[]")
        try:
            items_payload = json.loads(raw_items)
        except ValueError:
            return JsonResponse({"detail": "Invalid cart items format."}, status=400)
        payment_method = request.POST.get("payment_method", "")
        amount_paid_raw = request.POST.get("amount_paid")
        reference_no_raw = request.POST.get("reference_no")
        credentials_id_raw = request.POST.get("credentials_id")
        payment_proof_image_data = request.POST.get("payment_proof_image")
        payment_confirmed_str = (request.POST.get("payment_confirmed") or "").strip().lower()
        payment_confirmed = payment_confirmed_str in ("true", "1", "yes")
        idempotency_key = request.POST.get("idempotency_key") or request.headers.get("X-Idempotency-Key")
        proof_file = request.FILES.get("payment_proof_file")
    else:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            return JsonResponse({"detail": "Invalid JSON request body."}, status=400)

        items_payload = payload.get("items") or []
        payment_method = payload.get("payment_method") or ""
        amount_paid_raw = payload.get("amount_paid")
        reference_no_raw = payload.get("reference_no")
        credentials_id_raw = payload.get("credentials_id")
        payment_proof_image_data = payload.get("payment_proof_image")
        payment_confirmed = bool(payload.get("payment_confirmed"))
        idempotency_key = payload.get("idempotency_key") or request.headers.get("X-Idempotency-Key")

    try:
        receipt = process_pos_checkout(
            supplier_employee_id=supplier_employee_id,
            supplier_profile_id=supplier_profile_id,
            items_payload=items_payload,
            payment_method=payment_method,
            amount_paid_raw=amount_paid_raw,
            reference_no_raw=reference_no_raw,
            credentials_id_raw=credentials_id_raw,
            payment_proof_image_data=payment_proof_image_data,
            payment_proof_file=proof_file,
            payment_confirmed=payment_confirmed,
            idempotency_key=idempotency_key,
        )
    except POSValidationError as exc:
        return JsonResponse(
            {
                "detail": exc.message,
                "code": exc.code,
            },
            status=exc.status_code,
        )
    except Exception as exc:
        return JsonResponse(
            {
                "detail": f"An unexpected error occurred while processing the sale: {str(exc)}",
                "code": "server_error",
            },
            status=500,
        )

    return JsonResponse(
        {
            "message": "Transaction completed successfully.",
            "receipt": receipt,
        },
        status=201,
    )


@csrf_exempt
@require_GET
@miller_sales_required
def pos_receipt_detail_view(request, reference_no: str):
    """
    GET /api/miller-employees/sales/pos/receipt/<reference_no>/
    Fetches the complete Sales Receipt for a given checkout reference number.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    receipt = get_pos_checkout_receipt(supplier_profile_id, reference_no)
    if not receipt:
        return JsonResponse({"detail": "Sales receipt not found."}, status=404)
    return JsonResponse({"receipt": receipt}, status=200)


# ============================================================
# MILLER SALES ONLINE ORDERS VIEWS
# ============================================================

@csrf_exempt
@require_GET
@miller_sales_required
def online_orders_list_view(request):
    """
    GET /api/miller-employees/sales/online-orders/
    Fetch actual miller_online_customer orders for the authenticated Miller branch.
    Supports query parameters:
    - search: string
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - status: string (e.g. 'pending', 'all')
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    status_filter = request.GET.get("status")

    data = list_miller_online_orders(
        supplier_profile_id=supplier_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )
    return JsonResponse(data, status=200)


@csrf_exempt
@require_GET
@miller_sales_required
def online_order_detail_view(request, order_id: int):
    """
    GET /api/miller-employees/sales/online-orders/<order_id>/
    Fetch single online order detail for the authenticated Miller branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    detail = get_miller_online_order_detail(supplier_profile_id, order_id)
    if not detail:
        return JsonResponse({"detail": "Online order not found."}, status=404)
    return JsonResponse({"order": detail}, status=200)


@csrf_exempt
@require_POST
@miller_sales_required
def online_order_approve_view(request, order_id: int):
    """
    POST /api/miller-employees/sales/online-orders/<order_id>/approve/
    Validate stock in kilograms, atomically deduct stock, and update status to 'Forwarded to Logistics'.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id

    try:
        result = approve_miller_online_order(
            supplier_profile_id=supplier_profile_id,
            online_order_id=order_id,
            supplier_employee_id=supplier_employee_id,
        )
    except OnlineOrderError as exc:
        return JsonResponse({"detail": exc.message, "code": exc.code}, status=exc.status_code)
    except Exception as exc:
        return JsonResponse(
            {"detail": f"An unexpected error occurred while approving the order: {str(exc)}", "code": "server_error"},
            status=500,
        )

    return JsonResponse(
        {
            "message": "Order approved and forwarded to logistics successfully.",
            "order": result,
        },
        status=200,
    )


@csrf_exempt
@require_POST
@miller_sales_required
def online_order_decline_view(request, order_id: int):
    """
    POST /api/miller-employees/sales/online-orders/<order_id>/decline/
    Require reason, update status to 'Declined', and save message addressed to buyer in messages table.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    supplier_employee_id = request.grainrise_supplier_employee_id
    sender_user_id = getattr(request, "grainrise_owner_user_id", None)

    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        body = {}

    reason = body.get("reason") or request.POST.get("reason")

    try:
        result = decline_miller_online_order(
            supplier_profile_id=supplier_profile_id,
            online_order_id=order_id,
            decline_reason=reason,
            sender_user_id=sender_user_id,
            supplier_employee_id=supplier_employee_id,
        )
    except OnlineOrderError as exc:
        return JsonResponse({"detail": exc.message, "code": exc.code}, status=exc.status_code)
    except Exception as exc:
        return JsonResponse(
            {"detail": f"An unexpected error occurred while declining the order: {str(exc)}", "code": "server_error"},
            status=500,
        )

    return JsonResponse(
        {
            "message": "Order has been declined successfully.",
            "order": result,
        },
        status=200,
    )


# ============================================================
# MILLER SALES HISTORY VIEWS
# ============================================================

@csrf_exempt
@require_GET
@miller_sales_required
def in_store_sales_history_view(request):
    """
    GET /api/miller-employees/sales/history/in-store/
    Returns completed in-store sales transactions for the authenticated Miller branch.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_in_store_sales(
        supplier_profile_id=supplier_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


@csrf_exempt
@require_GET
@miller_sales_required
def online_sales_history_view(request):
    """
    GET /api/miller-employees/sales/history/online/
    Returns online sales transactions for the authenticated Miller branch.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_online_sales(
        supplier_profile_id=supplier_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


@csrf_exempt
@require_GET
@miller_sales_required
def sales_dashboard_view(request):
    """
    GET /api/miller-employees/sales/dashboard/
    Returns live sales dashboard data for the authenticated Miller branch:
    - KPIs (Today's Sales, Month Sales, Potential Sales, Pending Online Orders)
    - Sales Trend (Week and Month series)
    - Sales Distribution (In-Store vs Online)
    - Recent Activities
    - Top Selling Products
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    data = get_sales_dashboard_data(supplier_profile_id)
    return JsonResponse(data, status=200)




