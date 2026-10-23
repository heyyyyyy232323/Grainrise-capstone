"""
Business logic and atomic transaction services for Miller Sales Point of Sale (POS).
"""

import base64
import os
import re
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection, transaction

from .selectors import get_pos_checkout_receipt, get_seller_and_branch_context

PH_TZ = ZoneInfo("Asia/Manila")
KG_PER_SACK = Decimal("25.00")


class POSValidationError(Exception):
    """Raised when a POS validation rule or stock constraint fails."""

    def __init__(self, message: str, code: str = "validation_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def _extract_alpha(text: str) -> str:
    return "".join(ch for ch in (text or "") if ch.isalpha()).upper()


def _build_business_prefix(business_name: str) -> str:
    letters = _extract_alpha(business_name)
    if len(letters) >= 3:
        return letters[:3]
    return (letters + "XXX")[:3]


def _build_seller_initials(first_name: str, last_name: str) -> str:
    first_alpha = _extract_alpha(first_name)
    last_alpha = _extract_alpha(last_name)
    if first_alpha and last_alpha:
        return f"{first_alpha[0]}{last_alpha[0]}"
    if len(first_alpha) >= 2:
        return first_alpha[:2]
    if first_alpha:
        return f"{first_alpha[0]}S"
    return "SL"


def generate_pos_cash_reference(
    business_name: str,
    seller_first_name: str,
    seller_last_name: str,
    cursor=None,
) -> str:
    """
    Generate a unique Cash checkout reference in the format:
    `BBBMMDDYYYYHHMMII`
    - BBB: First three letters of Miller business name, uppercase.
    - MMDDYYYY: Current transaction date in Asia/Manila.
    - HHMM: Current transaction time in Asia/Manila (24-hour).
    - II: Initials of the logged-in seller.
    Example: `RIG101620262226KI`

    Handles collisions safely by advancing minute offsets if the exact reference
    was already used by an earlier checkout within the same minute.
    """
    bbb = _build_business_prefix(business_name)
    ii = _build_seller_initials(seller_first_name, seller_last_name)
    base_dt = datetime.now(PH_TZ)

    def _ref_exists(ref_candidate: str, db_cursor) -> bool:
        db_cursor.execute(
            "SELECT 1 FROM miller_ftf_sales WHERE reference_no = %s LIMIT 1",
            [ref_candidate],
        )
        return db_cursor.fetchone() is not None

    if cursor is not None:
        for offset in range(0, 1440):
            candidate_dt = base_dt + timedelta(minutes=offset)
            candidate_ref = f"{bbb}{candidate_dt.strftime('%m%d%Y%H%M')}{ii}"
            if not _ref_exists(candidate_ref, cursor):
                return candidate_ref
        return f"{bbb}{base_dt.strftime('%m%d%Y%H%M')}{uuid.uuid4().hex[:2].upper()}"

    with connection.cursor() as own_cursor:
        for offset in range(0, 1440):
            candidate_dt = base_dt + timedelta(minutes=offset)
            candidate_ref = f"{bbb}{candidate_dt.strftime('%m%d%Y%H%M')}{ii}"
            if not _ref_exists(candidate_ref, own_cursor):
                return candidate_ref
        return f"{bbb}{base_dt.strftime('%m%d%Y%H%M')}{uuid.uuid4().hex[:2].upper()}"


def normalize_reference_no(raw_ref: str) -> str:
    """Normalize a user/OCR reference string by trimming and collapsing whitespace."""
    cleaned = re.sub(r"\s+", "", (raw_ref or "").strip()).upper()
    return cleaned


def check_duplicate_pos_payment_reference(
    supplier_profile_id: int,
    payment_method: str,
    reference_no: str,
    credentials_id: int | None = None,
    cursor=None,
) -> bool:
    """
    Check whether a confirmed GCash or Bank Transfer payment reference number has already
    been used for the applicable payment account or payment method.
    Returns True if a duplicate exists.
    """
    clean_ref = normalize_reference_no(reference_no)
    if not clean_ref:
        return False

    norm_method = (payment_method or "").strip().lower()
    if norm_method in ("bank_transfer", "bank transfer"):
        norm_method = "bank"

    def _run_check(db_cursor) -> bool:
        if credentials_id:
            db_cursor.execute(
                """
                SELECT 1
                FROM miller_ftf_sales
                WHERE UPPER(REPLACE(TRIM(reference_no), ' ', '')) = %s
                  AND (
                      payment_credentials_id = %s
                      OR (supplier_profile_id = %s AND LOWER(TRIM(payment_method)) = %s)
                  )
                LIMIT 1
                """,
                [clean_ref, int(credentials_id), int(supplier_profile_id), norm_method],
            )
        else:
            db_cursor.execute(
                """
                SELECT 1
                FROM miller_ftf_sales
                WHERE UPPER(REPLACE(TRIM(reference_no), ' ', '')) = %s
                  AND supplier_profile_id = %s
                  AND LOWER(TRIM(payment_method)) = %s
                LIMIT 1
                """,
                [clean_ref, int(supplier_profile_id), norm_method],
            )
        return db_cursor.fetchone() is not None

    if cursor is not None:
        return _run_check(cursor)

    with connection.cursor() as own_cursor:
        return _run_check(own_cursor)


def _save_payment_proof_image(
    supplier_profile_id: int,
    reference_no: str,
    proof_image_data: str | None = None,
    proof_image_file=None,
) -> str:
    """
    Persist the captured camera payment proof image (from base64 data URL or uploaded file)
    under `MEDIA_ROOT/pos_payment_proofs/<supplier_profile_id>/` and return its relative media URL.
    """
    safe_ref = re.sub(r"[^A-Za-z0-9_-]", "", reference_no or "POS")[:32] or "POS"
    unique_token = uuid.uuid4().hex[:8]

    if proof_image_file is not None:
        ext = os.path.splitext(getattr(proof_image_file, "name", "") or "")[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            ext = ".jpg"
        rel_path = f"pos_payment_proofs/{supplier_profile_id}/{safe_ref}_{unique_token}{ext}"
        saved_path = default_storage.save(rel_path, proof_image_file)
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    raw_data = (proof_image_data or "").strip()
    if not raw_data:
        raise POSValidationError("A captured payment proof photo is required for GCash/Bank payments.")

    ext = ".jpg"
    b64_payload = raw_data
    if raw_data.startswith("data:"):
        header, _, b64_payload = raw_data.partition(",")
        if "image/png" in header:
            ext = ".png"
        elif "image/webp" in header:
            ext = ".webp"
        else:
            ext = ".jpg"

    try:
        binary_bytes = base64.b64decode(b64_payload, validate=False)
    except Exception as exc:
        raise POSValidationError("Invalid captured payment proof image data.") from exc

    if not binary_bytes or len(binary_bytes) < 64:
        raise POSValidationError("Captured payment proof image is empty or corrupted.")

    if len(binary_bytes) > 10 * 1024 * 1024:
        raise POSValidationError("Captured payment proof image exceeds the 10 MB limit.")

    rel_path = f"pos_payment_proofs/{supplier_profile_id}/{safe_ref}_{unique_token}{ext}"
    saved_path = default_storage.save(rel_path, ContentFile(binary_bytes))
    media_url = getattr(settings, "MEDIA_URL", "/media/")
    return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"


def _parse_positive_whole_sacks(raw_quantity, product_label: str = "Product") -> int:
    """
    Validate that quantity is a positive whole number of sacks (>= 1).
    Rejects decimals, zero, negative numbers, booleans, and non-numeric strings.
    """
    if isinstance(raw_quantity, bool) or raw_quantity is None:
        raise POSValidationError(f"Invalid sack quantity for {product_label}. Enter a positive whole number.")

    if isinstance(raw_quantity, int):
        if raw_quantity < 1:
            raise POSValidationError(f"Quantity for {product_label} must be at least 1 sack.")
        return raw_quantity

    if isinstance(raw_quantity, float):
        if not raw_quantity.is_integer() or raw_quantity < 1:
            raise POSValidationError(
                f"Fractional or non-positive sack quantities are not allowed for {product_label}."
            )
        return int(raw_quantity)

    raw_str = str(raw_quantity).strip()
    if not raw_str or not re.fullmatch(r"\d+", raw_str):
        raise POSValidationError(
            f"Invalid quantity '{raw_str}' for {product_label}. Only positive whole numbers of sacks are allowed."
        )

    qty = int(raw_str)
    if qty < 1:
        raise POSValidationError(f"Quantity for {product_label} must be at least 1 sack.")
    return qty


def process_pos_checkout(
    *,
    supplier_employee_id: int,
    supplier_profile_id: int,
    items_payload: list[dict],
    payment_method: str,
    amount_paid_raw=None,
    reference_no_raw: str | None = None,
    credentials_id_raw=None,
    payment_proof_image_data: str | None = None,
    payment_proof_file=None,
    payment_confirmed: bool = False,
    idempotency_key: str | None = None,
) -> dict:
    """
    Execute an atomic POS checkout:
    1. Validate seller & branch context.
    2. Validate cart items (non-empty, positive whole numbers of sacks, merged per product).
    3. Normalize & validate payment method ('cash', 'gcash', 'bank').
    4. Inside `transaction.atomic()`:
       - Check `idempotency_key` to prevent duplicate checkouts / double stock deduction.
       - Lock all target `miller_products` rows via `SELECT ... FOR UPDATE`.
       - Validate branch ownership, `status == 'active'`, `expiry_date > today (Asia/Manila)`,
         `unit_cost > 0`, and `stock_quantity >= quantity_sacks * 25`.
       - Compute server-side `selling_price_per_sack = unit_cost * 25`, line subtotals, and overall total.
       - Validate payment rules:
         * Cash: `amount_paid >= checkout_total`, compute `change_amount`, generate `BBBMMDDYYYYHHMMII`.
         * GCash / Bank: require active branch payment account (`credentials_id`), require explicit
           confirmation, require non-empty `reference_no` and captured proof image, reject duplicate
           references, set `amount_paid = checkout_total` and `change_amount = 0.00`.
       - Deduct `quantity_sacks * 25` kg from each product's `stock_quantity`.
       - Insert one row per product into `miller_ftf_sales` sharing the same `reference_no`,
         checkout-level `amount_paid`, and `change_amount`.
    5. Return the saved Sales Receipt payload.
    """
    if not supplier_employee_id or not supplier_profile_id:
        raise POSValidationError("Unauthorized seller or missing Miller branch context.", status_code=403)

    seller_ctx = get_seller_and_branch_context(supplier_employee_id, supplier_profile_id)
    if not seller_ctx or seller_ctx.get("status", "").lower() != "active":
        raise POSValidationError("Unauthorized or inactive Miller seller account.", status_code=403)

    if not items_payload or not isinstance(items_payload, list):
        raise POSValidationError("Cannot checkout with an empty cart.")

    # Merge any duplicate product entries in payload while validating positive integer quantities
    merged_quantities: dict[int, int] = {}
    for idx, entry in enumerate(items_payload, start=1):
        if not isinstance(entry, dict):
            raise POSValidationError(f"Invalid cart item format at position {idx}.")
        raw_pid = entry.get("product_id") or entry.get("miller_product_id") or entry.get("id")
        try:
            pid = int(raw_pid)
        except (TypeError, ValueError) as exc:
            raise POSValidationError(f"Invalid product ID at cart item {idx}.") from exc
        if pid <= 0:
            raise POSValidationError(f"Invalid product ID at cart item {idx}.")

        item_label = (entry.get("productName") or entry.get("product_name") or f"Product #{pid}").strip()
        qty_sacks = _parse_positive_whole_sacks(entry.get("quantity"), item_label)
        merged_quantities[pid] = merged_quantities.get(pid, 0) + qty_sacks

    if not merged_quantities:
        raise POSValidationError("Cannot checkout with an empty cart.")

    raw_method = (payment_method or "").strip().lower()
    if raw_method in ("bank_transfer", "bank transfer"):
        norm_method = "bank"
    elif raw_method in ("cash", "gcash", "bank"):
        norm_method = raw_method
    else:
        raise POSValidationError("Invalid payment method. Choose Cash, GCash, or Bank Transfer.")

    clean_idem_key = (idempotency_key or "").strip()[:100] or None
    today_ph = datetime.now(PH_TZ).date()

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Idempotency check (if client retried the exact same checkout request)
            if clean_idem_key:
                cursor.execute(
                    """
                    SELECT reference_no
                    FROM miller_ftf_sales
                    WHERE supplier_profile_id = %s
                      AND idempotency_key = %s
                    LIMIT 1
                    """,
                    [supplier_profile_id, clean_idem_key],
                )
                existing_idem = cursor.fetchone()
                if existing_idem and existing_idem[0]:
                    existing_receipt = get_pos_checkout_receipt(supplier_profile_id, existing_idem[0])
                    if existing_receipt:
                        return existing_receipt

            # 2. Lock all requested product rows in deterministic order
            sorted_pids = sorted(merged_quantities.keys())
            placeholders = ", ".join(["%s"] * len(sorted_pids))
            cursor.execute(
                f"""
                SELECT
                    product_id,
                    supplier_profile_id,
                    product_name,
                    product_code,
                    stock_quantity,
                    unit_cost,
                    expiry_date,
                    status
                FROM miller_products
                WHERE product_id IN ({placeholders})
                ORDER BY product_id ASC
                FOR UPDATE
                """,
                sorted_pids,
            )
            locked_rows = cursor.fetchall()

            products_by_id = {int(r[0]): r for r in locked_rows}

            validated_lines = []
            checkout_total = Decimal("0.00")

            for pid in sorted_pids:
                req_sacks = merged_quantities[pid]
                prod_row = products_by_id.get(pid)
                if not prod_row:
                    raise POSValidationError(f"Product #{pid} does not exist.")

                prod_branch_id = int(prod_row[1])
                if prod_branch_id != int(supplier_profile_id):
                    raise POSValidationError(
                        "Unauthorized product access across Miller branches.",
                        status_code=403,
                    )

                prod_name = (prod_row[2] or f"Product #{pid}").strip()
                prod_code = (prod_row[3] or "").strip()
                stock_kg = Decimal(str(prod_row[4] or "0"))
                unit_cost_kg = Decimal(str(prod_row[5] or "0"))
                expiry_date = prod_row[6]
                prod_status = (prod_row[7] or "").strip().lower()

                if prod_status != "active":
                    raise POSValidationError(
                        f"'{prod_name}' is no longer active (current status: {prod_status or 'inactive'})."
                    )

                if expiry_date is None or expiry_date <= today_ph:
                    raise POSValidationError(
                        f"'{prod_name}' has expired and cannot be sold."
                    )

                if unit_cost_kg <= Decimal("0"):
                    raise POSValidationError(
                        f"'{prod_name}' has an invalid selling price."
                    )

                available_sacks = int(stock_kg // KG_PER_SACK)
                if available_sacks < 1:
                    raise POSValidationError(
                        f"'{prod_name}' has less than 1 sack (25 kg) available."
                    )

                if req_sacks > available_sacks:
                    raise POSValidationError(
                        f"Insufficient stock for '{prod_name}'. Requested {req_sacks} "
                        f"{'sack' if req_sacks == 1 else 'sacks'}, but only {available_sacks} "
                        f"{'sack is' if available_sacks == 1 else 'sacks are'} available."
                    )

                quantity_kg = (Decimal(req_sacks) * KG_PER_SACK).quantize(Decimal("0.01"))
                if stock_kg - quantity_kg < Decimal("0.00"):
                    raise POSValidationError(
                        f"Insufficient stock weight for '{prod_name}'."
                    )

                selling_price_per_sack = (unit_cost_kg * KG_PER_SACK).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                line_subtotal = (quantity_kg * unit_cost_kg).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                checkout_total = (checkout_total + line_subtotal).quantize(Decimal("0.01"))

                validated_lines.append(
                    {
                        "miller_product_id": pid,
                        "product_name": prod_name,
                        "product_code": prod_code,
                        "quantity_sacks": req_sacks,
                        "quantity_kg": quantity_kg,
                        "deduct_kg": quantity_kg,
                        "new_stock_kg": (stock_kg - quantity_kg).quantize(Decimal("0.01")),
                        "selling_price_per_sack": selling_price_per_sack,
                        "line_subtotal": line_subtotal,
                        "expiry_date": expiry_date,
                    }
                )

            if checkout_total <= Decimal("0.00"):
                raise POSValidationError("Checkout total must be greater than ₱0.00.")

            # 3. Validate payment method rules
            credentials_id_to_save = None
            saved_proof_url = None

            if norm_method == "cash":
                if amount_paid_raw is None or str(amount_paid_raw).strip() == "":
                    raise POSValidationError("Amount Paid is required for Cash transactions.")
                try:
                    amount_paid = Decimal(str(amount_paid_raw).strip()).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                except (InvalidOperation, ValueError) as exc:
                    raise POSValidationError("Invalid Amount Paid value.") from exc

                if amount_paid < checkout_total:
                    raise POSValidationError(
                        f"Insufficient cash payment. Total payable is ₱{checkout_total:,.2f}, "
                        f"but Amount Paid is ₱{amount_paid:,.2f}."
                    )

                change_amount = (amount_paid - checkout_total).quantize(Decimal("0.01"))
                final_reference_no = generate_pos_cash_reference(
                    business_name=seller_ctx.get("business_name", "MIL"),
                    seller_first_name=seller_ctx.get("first_name", ""),
                    seller_last_name=seller_ctx.get("last_name", ""),
                    cursor=cursor,
                )

            else:
                # GCash or Bank Transfer
                if not payment_confirmed:
                    raise POSValidationError(
                        f"Explicit payment confirmation is required before completing a {norm_method.upper()} sale."
                    )

                clean_ref = normalize_reference_no(reference_no_raw or "")
                if not clean_ref or len(clean_ref) < 4:
                    raise POSValidationError(
                        "A valid transaction reference number is required for GCash/Bank payments."
                    )
                if len(clean_ref) > 100:
                    raise POSValidationError(
                        "Transaction reference number cannot exceed 100 characters."
                    )

                # Verify configured payment account for this Miller branch
                if credentials_id_raw:
                    try:
                        req_cred_id = int(credentials_id_raw)
                    except (TypeError, ValueError) as exc:
                        raise POSValidationError("Invalid payment account selected.") from exc

                    cursor.execute(
                        """
                        SELECT credentials_id, type
                        FROM miller_online_transaction_credentials
                        WHERE credentials_id = %s
                          AND supplier_profile_id = %s
                          AND LOWER(TRIM(status)) = 'active'
                        LIMIT 1
                        """,
                        [req_cred_id, supplier_profile_id],
                    )
                else:
                    cursor.execute(
                        """
                        SELECT credentials_id, type
                        FROM miller_online_transaction_credentials
                        WHERE supplier_profile_id = %s
                          AND LOWER(TRIM(type)) = %s
                          AND LOWER(TRIM(status)) = 'active'
                        ORDER BY is_default DESC, updated_at DESC, credentials_id DESC
                        LIMIT 1
                        """,
                        [supplier_profile_id, norm_method],
                    )

                cred_row = cursor.fetchone()
                if not cred_row:
                    method_label = "GCash" if norm_method == "gcash" else "Bank Transfer"
                    raise POSValidationError(
                        f"No active {method_label} payment account is configured for this Miller branch."
                    )

                credentials_id_to_save = int(cred_row[0])
                cred_type = (cred_row[1] or "").strip().lower()
                if cred_type != norm_method:
                    raise POSValidationError(
                        "Selected payment account does not match the chosen payment method."
                    )

                # Check duplicate payment reference within the payment account/method
                if check_duplicate_pos_payment_reference(
                    supplier_profile_id=supplier_profile_id,
                    payment_method=norm_method,
                    reference_no=clean_ref,
                    credentials_id=credentials_id_to_save,
                    cursor=cursor,
                ):
                    method_label = "GCash" if norm_method == "gcash" else "Bank Transfer"
                    raise POSValidationError(
                        f"Duplicate payment reference '{clean_ref}'. This reference number has already been used for a confirmed {method_label} transaction.",
                        code="duplicate_reference",
                    )

                # Save captured proof image
                saved_proof_url = _save_payment_proof_image(
                    supplier_profile_id=supplier_profile_id,
                    reference_no=clean_ref,
                    proof_image_data=payment_proof_image_data,
                    proof_image_file=payment_proof_file,
                )

                final_reference_no = clean_ref
                amount_paid = checkout_total
                change_amount = Decimal("0.00")

            # 4. Deduct stock from miller_products and insert product rows into miller_ftf_sales
            for line in validated_lines:
                cursor.execute(
                    """
                    UPDATE miller_products
                    SET stock_quantity = stock_quantity - %s
                    WHERE product_id = %s
                      AND supplier_profile_id = %s
                      AND stock_quantity >= %s
                    """,
                    [
                        line["quantity_kg"],
                        line["miller_product_id"],
                        supplier_profile_id,
                        line["quantity_kg"],
                    ],
                )
                if cursor.rowcount != 1:
                    raise POSValidationError(
                        f"Could not deduct stock for '{line['product_name']}'. Stock may have changed."
                    )

                cursor.execute(
                    """
                    INSERT INTO miller_ftf_sales (
                        supplier_profile_id,
                        sold_by_employee_id,
                        miller_product_id,
                        quantity_sold,
                        total_payment,
                        amount_paid,
                        change_amount,
                        payment_method,
                        payment_credentials_id,
                        reference_no,
                        payment_proof_image,
                        idempotency_key
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s
                    )
                    """,
                    [
                        supplier_profile_id,
                        supplier_employee_id,
                        line["miller_product_id"],
                        line["quantity_kg"],
                        line["line_subtotal"],
                        amount_paid,
                        change_amount,
                        norm_method,
                        credentials_id_to_save,
                        final_reference_no,
                        saved_proof_url,
                        clean_idem_key,
                    ],
                )

    receipt_data = get_pos_checkout_receipt(supplier_profile_id, final_reference_no)
    if not receipt_data:
        raise POSValidationError("Checkout succeeded, but receipt retrieval failed.", status_code=500)

    return receipt_data


# ============================================================
# MILLER SALES ONLINE ORDERS SERVICES
# ============================================================

class OnlineOrderError(Exception):
    def __init__(self, message: str, code: str = "order_error", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class OnlineOrderNotFoundError(OnlineOrderError):
    def __init__(self, message: str = "Online order not found."):
        super().__init__(message, code="order_not_found", status_code=404)


class OnlineOrderStateError(OnlineOrderError):
    def __init__(self, message: str):
        super().__init__(message, code="invalid_order_state", status_code=400)


class InsufficientStockError(OnlineOrderError):
    def __init__(self, message: str):
        super().__init__(message, code="insufficient_stock", status_code=400)


def approve_miller_online_order(
    supplier_profile_id: int,
    online_order_id: int,
    supplier_employee_id: int = None,
) -> dict:
    """
    Approve order:
    1. Validates order status is 'Ordered' (or 'pending').
    2. Validates sufficient miller_products.stock_quantity in kilograms.
    3. Atomically deducts ordered_quantity in kilograms from miller_products.stock_quantity.
    4. Updates miller_online_customer.status to 'Forwarded to Logistics'.
    5. Prevents repeated stock deduction.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock and read order
            cursor.execute(
                """
                SELECT
                    online_order_id,
                    supplier_profile_id,
                    miller_product_id,
                    ordered_quantity,
                    status,
                    batch_no
                FROM miller_online_customer
                WHERE online_order_id = %s AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [online_order_id, supplier_profile_id],
            )
            order_row = cursor.fetchone()
            if not order_row:
                raise OnlineOrderNotFoundError("Order not found or does not belong to this branch.")

            current_status = str(order_row[4] or "").strip()
            if current_status.lower() != "ordered" and current_status.lower() != "pending":
                raise OnlineOrderStateError(
                    f"Order #{online_order_id} has status '{current_status}' and cannot be approved. "
                    "Only pending orders can be approved."
                )

            product_id = int(order_row[2])
            ordered_quantity = Decimal(str(order_row[3] or "0.00"))
            batch_no = order_row[5] or f"ORDER-{online_order_id}"

            # 2. Lock and check product stock
            cursor.execute(
                """
                SELECT product_id, product_name, stock_quantity, status
                FROM miller_products
                WHERE product_id = %s AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [product_id, supplier_profile_id],
            )
            prod_row = cursor.fetchone()
            if not prod_row:
                raise OnlineOrderError(
                    f"Associated product #{product_id} not found in inventory.",
                    code="product_not_found",
                    status_code=404,
                )

            product_name = prod_row[1] or "Product"
            stock_qty = Decimal(str(prod_row[2] or "0.00"))

            if stock_qty < ordered_quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for '{product_name}'. "
                    f"Available: {stock_qty:,.2f} kg, Required: {ordered_quantity:,.2f} kg."
                )

            # 3. Deduct stock quantity in kilograms atomically
            cursor.execute(
                """
                UPDATE miller_products
                SET stock_quantity = stock_quantity - %s
                WHERE product_id = %s AND supplier_profile_id = %s AND stock_quantity >= %s
                """,
                [ordered_quantity, product_id, supplier_profile_id, ordered_quantity],
            )
            if cursor.rowcount == 0:
                raise InsufficientStockError(
                    f"Stock deduction failed for '{product_name}'. Available stock may have changed."
                )

            # 4. Update order status to 'Forwarded to Logistics'
            cursor.execute(
                """
                UPDATE miller_online_customer
                SET status = 'Forwarded to Logistics',
                    updated_at = CURRENT_TIMESTAMP
                WHERE online_order_id = %s AND supplier_profile_id = %s
                """,
                [online_order_id, supplier_profile_id],
            )

    try:
        from .notifications.services import create_sales_notification
        qty_fmt = f"{int(ordered_quantity):,}" if ordered_quantity % 1 == 0 else f"{ordered_quantity:,.2f}"
        create_sales_notification(
            supplier_profile_id=supplier_profile_id,
            title="Order Approved",
            content=f"Online order {batch_no} for {product_name} ({qty_fmt} kg) has been approved and forwarded to logistics.",
            action_url="/miller-sales/online-orders",
        )
    except Exception:
        pass

    return {
        "online_order_id": online_order_id,
        "batch_no": batch_no,
        "status": "Forwarded to Logistics",
        "deducted_quantity": float(ordered_quantity),
        "remaining_stock": float(stock_qty - ordered_quantity),
    }


def decline_miller_online_order(
    supplier_profile_id: int,
    online_order_id: int,
    decline_reason: str,
    sender_user_id: int = None,
    supplier_employee_id: int = None,
) -> dict:
    """
    Decline order:
    1. Validates non-empty decline reason.
    2. Validates order status is 'Ordered' (or 'pending').
    3. Updates order status to 'Declined'.
    4. Saves message addressed to the appropriate buyer using the approved messages schema.
    """
    reason = str(decline_reason or "").strip()
    if not reason:
        raise OnlineOrderError("Decline reason is required.", code="missing_reason", status_code=400)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock and read order + buyer info
            cursor.execute(
                """
                SELECT
                    moc.online_order_id,
                    moc.supplier_profile_id,
                    moc.miller_product_id,
                    moc.user_buyer_id,
                    moc.warehouse_buyer_id,
                    moc.ordered_quantity,
                    moc.status,
                    moc.batch_no,
                    mp.product_name,
                    wp.user_id AS warehouse_user_id,
                    moc.created_at,
                    sp.user_id AS supplier_owner_user_id
                FROM miller_online_customer moc
                LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
                LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
                LEFT JOIN supplier_profiles sp ON moc.supplier_profile_id = sp.supplier_profile_id
                WHERE moc.online_order_id = %s AND moc.supplier_profile_id = %s
                FOR UPDATE
                """,
                [online_order_id, supplier_profile_id],
            )
            order_row = cursor.fetchone()
            if not order_row:
                raise OnlineOrderNotFoundError("Order not found or does not belong to this branch.")

            current_status = str(order_row[6] or "").strip()
            if current_status.lower() != "ordered" and current_status.lower() != "pending":
                raise OnlineOrderStateError(
                    f"Order #{online_order_id} has status '{current_status}' and cannot be declined. "
                    "Only pending orders can be declined."
                )

            batch_no = order_row[7] or f"ORDER-{online_order_id}"
            product_name = order_row[8] or "Product"
            user_buyer_id = order_row[3]
            warehouse_buyer_id = order_row[4]
            warehouse_user_id = order_row[9]
            order_created_at = order_row[10]
            supplier_owner_user_id = order_row[11]

            # Format quantity (e.g. 10 or 10.50)
            ordered_qty = Decimal(str(order_row[5] or "0.00"))
            if ordered_qty % 1 == 0:
                qty_str = f"{int(ordered_qty):,}"
            else:
                qty_str = f"{ordered_qty:,.2f}"

            # Format order date from actual created_at
            if hasattr(order_created_at, "strftime"):
                order_date_str = order_created_at.strftime("%B %d, %Y")
            else:
                order_date_str = str(order_created_at or "")[:10]

            # 2. Update order status to 'Declined'
            cursor.execute(
                """
                UPDATE miller_online_customer
                SET status = 'Declined',
                    updated_at = CURRENT_TIMESTAMP
                WHERE online_order_id = %s AND supplier_profile_id = %s
                """,
                [online_order_id, supplier_profile_id],
            )

            # 3. Resolve sender and buyer recipient for messages schema
            effective_sender_user_id = sender_user_id or (int(supplier_owner_user_id) if supplier_owner_user_id is not None else None)

            if user_buyer_id:
                # Retailer buyer
                receiver_user_id = int(user_buyer_id)
                receiver_warehouse_profile_id = None
            elif warehouse_buyer_id:
                # Warehouse buyer
                receiver_user_id = int(warehouse_user_id) if warehouse_user_id else None
                receiver_warehouse_profile_id = int(warehouse_buyer_id)
            else:
                receiver_user_id = None
                receiver_warehouse_profile_id = None

            # Required message format:
            # "Your order [Batch No.] for [Product Name] ([Quantity] kg), placed on [Order Date], was declined for the following reason: [Reason]."
            message_content = (
                f"Your order {batch_no} for {product_name} ({qty_str} kg), placed on {order_date_str}, "
                f"was declined for the following reason: {reason}."
            )

            # 4. Check for duplicate decline message to prevent repeat insertions
            cursor.execute(
                """
                SELECT message_id FROM messages
                WHERE message_content LIKE %s
                  AND ((receiver_user_id = %s AND receiver_user_id IS NOT NULL)
                       OR (receiver_warehouse_profile_id = %s AND receiver_warehouse_profile_id IS NOT NULL))
                LIMIT 1
                """,
                [f"Your order {batch_no}%", receiver_user_id, receiver_warehouse_profile_id],
            )
            existing_msg = cursor.fetchone()

            if not existing_msg:
                # Insert into messages table using the approved schema
                cursor.execute(
                    """
                    INSERT INTO messages (
                        sender_supplier_profile_id,
                        receiver_supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        sender_warehouse_profile_id,
                        receiver_warehouse_profile_id,
                        message_content,
                        message_attachment,
                        created_at
                    ) VALUES (
                        %s, NULL, %s, %s, NULL, %s, %s, NULL, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        supplier_profile_id,
                        effective_sender_user_id,
                        receiver_user_id,
                        receiver_warehouse_profile_id,
                        message_content,
                    ],
                )

    try:
        from .notifications.services import create_sales_notification
        create_sales_notification(
            supplier_profile_id=supplier_profile_id,
            title="Order Declined",
            content=f"Online order {batch_no} for {product_name} was declined.",
            action_url="/miller-sales/online-orders",
        )
    except Exception:
        pass

    return {
        "online_order_id": online_order_id,
        "batch_no": batch_no,
        "status": "Declined",
        "decline_reason": reason,
    }

