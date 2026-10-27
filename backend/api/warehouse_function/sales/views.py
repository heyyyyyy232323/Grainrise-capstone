"""
HTTP views for Warehouse Sales Point of Sale (POS).
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.warehouse_function.warehouse_auth import warehouse_sales_required

from .selectors import (
    get_pos_checkout_receipt,
    get_seller_and_branch_context,
    get_warehouse_online_order_detail,
    list_in_store_sales,
    list_online_sales,
    list_pos_payment_accounts,
    list_pos_products,
    list_warehouse_online_orders,
)
from .services import (
    OnlineOrderError,
    POSValidationError,
    approve_warehouse_online_order,
    check_duplicate_pos_payment_reference,
    decline_warehouse_online_order,
    normalize_reference_no,
    process_pos_checkout,
)


@csrf_exempt
@require_GET
@warehouse_sales_required
def pos_products_view(request):
    """
    GET /api/warehouse/sales/pos/products/
    Returns active POS products (in sacks), configured payment accounts, and seller/branch info.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    warehouse_employee_id = request.grainrise_warehouse_employee_id

    products = list_pos_products(warehouse_profile_id)
    payment_accounts = list_pos_payment_accounts(warehouse_profile_id)
    seller_context = get_seller_and_branch_context(warehouse_employee_id, warehouse_profile_id)

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
@warehouse_sales_required
def pos_payment_accounts_view(request):
    """
    GET /api/warehouse/sales/pos/payment-accounts/
    Returns configured active GCash and Bank Transfer payment accounts for the Warehouse branch.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    accounts = list_pos_payment_accounts(warehouse_profile_id)
    return JsonResponse({"payment_accounts": accounts}, status=200)


@csrf_exempt
@require_POST
@warehouse_sales_required
def pos_check_reference_view(request):
    """
    POST /api/warehouse/sales/pos/check-reference/
    Validates whether a GCash/Bank payment reference number has already been used.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id

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
        warehouse_profile_id=warehouse_profile_id,
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
@warehouse_sales_required
def pos_checkout_view(request):
    """
    POST /api/warehouse/sales/pos/checkout/
    Processes a POS checkout (Cash, GCash, or Bank Transfer) atomically.
    Supports both JSON payloads (with base64 proof image) and multipart/form-data.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    warehouse_employee_id = request.grainrise_warehouse_employee_id

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
            return JsonResponse({"detail": "Invalid JSON body."}, status=400)

        items_payload = payload.get("items") or []
        payment_method = payload.get("payment_method", "")
        amount_paid_raw = payload.get("amount_paid")
        reference_no_raw = payload.get("reference_no")
        credentials_id_raw = payload.get("credentials_id")
        payment_proof_image_data = payload.get("payment_proof_image")
        payment_confirmed = bool(payload.get("payment_confirmed"))
        idempotency_key = payload.get("idempotency_key") or request.headers.get("X-Idempotency-Key")

    try:
        receipt_data = process_pos_checkout(
            warehouse_employee_id=warehouse_employee_id,
            warehouse_profile_id=warehouse_profile_id,
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
        return JsonResponse(
            {
                "success": True,
                "receipt": receipt_data,
                "message": "POS transaction completed successfully.",
            },
            status=201,
        )
    except POSValidationError as exc:
        return JsonResponse(
            {
                "detail": exc.message,
                "message": exc.message,
                "code": exc.code,
            },
            status=exc.status_code,
        )
    except Exception as exc:
        return JsonResponse(
            {
                "detail": f"An error occurred during checkout: {str(exc)}",
                "message": f"An error occurred during checkout: {str(exc)}",
            },
            status=500,
        )


@csrf_exempt
@require_GET
@warehouse_sales_required
def pos_receipt_detail_view(request, reference_no):
    """
    GET /api/warehouse/sales/pos/receipt/<str:reference_no>/
    Returns receipt details for a previously completed POS transaction.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    receipt_data = get_pos_checkout_receipt(warehouse_profile_id, reference_no)
    if not receipt_data:
        return JsonResponse({"detail": "Receipt not found for this transaction reference."}, status=404)

    return JsonResponse({"receipt": receipt_data}, status=200)


# ============================================================
# WAREHOUSE SALES HISTORY VIEWS
# ============================================================

@csrf_exempt
@require_GET
@warehouse_sales_required
def in_store_sales_history_view(request):
    """
    GET /api/warehouse/sales/history/in-store/
    Returns completed in-store sales transactions for the authenticated Warehouse branch.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_in_store_sales(
        warehouse_profile_id=warehouse_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


@csrf_exempt
@require_GET
@warehouse_sales_required
def online_sales_history_view(request):
    """
    GET /api/warehouse/sales/history/online/
    Returns online sales transactions for the authenticated Warehouse branch.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_online_sales(
        warehouse_profile_id=warehouse_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


# ============================================================
# WAREHOUSE ONLINE ORDERS VIEWS
# ============================================================

@csrf_exempt
@require_GET
@warehouse_sales_required
def online_orders_list_view(request):
    """
    GET /api/warehouse/sales/online-orders/
    Fetch actual warehouse_online_customer orders for the authenticated Warehouse branch.
    Supports query parameters: search, start_date, end_date, status.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    search = request.GET.get("search")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    status_filter = request.GET.get("status")

    data = list_warehouse_online_orders(
        warehouse_profile_id=warehouse_profile_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        status_filter=status_filter,
    )
    return JsonResponse(data, status=200)


@csrf_exempt
@require_GET
@warehouse_sales_required
def online_order_detail_view(request, order_id: int):
    """
    GET /api/warehouse/sales/online-orders/<order_id>/
    Fetch single online order detail for the authenticated Warehouse branch.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    detail = get_warehouse_online_order_detail(warehouse_profile_id, order_id)
    if not detail:
        return JsonResponse({"detail": "Online order not found."}, status=404)
    return JsonResponse({"order": detail}, status=200)


@csrf_exempt
@require_POST
@warehouse_sales_required
def online_order_approve_view(request, order_id: int):
    """
    POST /api/warehouse/sales/online-orders/<order_id>/approve/
    Validate stock in kilograms, atomically deduct stock, and update status to 'Forwarded to Logistics'.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    warehouse_employee_id = request.grainrise_warehouse_employee_id

    try:
        result = approve_warehouse_online_order(
            warehouse_profile_id=warehouse_profile_id,
            online_order_id=order_id,
            warehouse_employee_id=warehouse_employee_id,
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
            "message": result.get("message", "Order approved and forwarded to logistics successfully."),
            "order": result,
        },
        status=200,
    )


@csrf_exempt
@require_POST
@warehouse_sales_required
def online_order_decline_view(request, order_id: int):
    """
    POST /api/warehouse/sales/online-orders/<order_id>/decline/
    Require reason, update status to 'Declined', and save message addressed to buyer in messages table.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    warehouse_employee_id = request.grainrise_warehouse_employee_id
    sender_user_id = getattr(request, "grainrise_owner_user_id", None)

    try:
        body = json.loads(request.body.decode("utf-8")) if request.body else {}
    except Exception:
        body = {}

    reason = body.get("reason") or request.POST.get("reason")

    try:
        result = decline_warehouse_online_order(
            warehouse_profile_id=warehouse_profile_id,
            online_order_id=order_id,
            decline_reason=reason,
            sender_user_id=sender_user_id,
            warehouse_employee_id=warehouse_employee_id,
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
            "message": result.get("message", "Order has been declined successfully."),
            "order": result,
        },
        status=200,
    )

