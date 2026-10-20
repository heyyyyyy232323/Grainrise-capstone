"""
HTTP views for Miller Sales Point of Sale (POS).
"""

import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from api.miller_employees_function.employee_auth import miller_sales_required

from .selectors import (
    get_pos_checkout_receipt,
    get_seller_and_branch_context,
    list_pos_payment_accounts,
    list_pos_products,
)
from .services import (
    POSValidationError,
    check_duplicate_pos_payment_reference,
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

