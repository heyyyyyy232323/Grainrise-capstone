"""
Business logic and atomic transaction services for Warehouse Sales Point of Sale (POS).
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
    return "WS"


def generate_warehouse_pos_cash_reference(
    business_name: str,
    seller_first_name: str,
    seller_last_name: str,
    cursor=None,
) -> str:
    """
    Generate a unique Cash checkout reference in the format:
    `BBBMMDDYYYYHHMMII`
    - BBB: First three letters of Warehouse business name, uppercase.
    - MMDDYYYY: Current transaction date in Asia/Manila.
    - HHMM: Current transaction time in Asia/Manila (24-hour).
    - II: Initials of the logged-in seller.
    Example: `WHB102720261930JD`

    Handles collisions safely by advancing minute offsets if the exact reference
    was already used by an earlier checkout within the same minute.
    """
    bbb = _build_business_prefix(business_name)
    ii = _build_seller_initials(seller_first_name, seller_last_name)
    base_dt = datetime.now(PH_TZ)

    def _ref_exists(ref_candidate: str, db_cursor) -> bool:
        db_cursor.execute(
            "SELECT 1 FROM warehouse_ftf_sales WHERE reference_no = %s LIMIT 1",
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
    warehouse_profile_id: int,
    payment_method: str,
    reference_no: str,
    credentials_id: int | None = None,
    cursor=None,
) -> bool:
    """
    Check whether a confirmed GCash or Bank Transfer payment reference number has already
    been used for the applicable payment account or payment method in warehouse_ftf_sales.
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
                FROM warehouse_ftf_sales
                WHERE UPPER(REPLACE(TRIM(reference_no), ' ', '')) = %s
                  AND (
                      payment_credentials_id = %s
                      OR (warehouse_profile_id = %s AND LOWER(TRIM(payment_method)) = %s)
                  )
                LIMIT 1
                """,
                [clean_ref, int(credentials_id), int(warehouse_profile_id), norm_method],
            )
        else:
            db_cursor.execute(
                """
                SELECT 1
                FROM warehouse_ftf_sales
                WHERE UPPER(REPLACE(TRIM(reference_no), ' ', '')) = %s
                  AND warehouse_profile_id = %s
                  AND LOWER(TRIM(payment_method)) = %s
                LIMIT 1
                """,
                [clean_ref, int(warehouse_profile_id), norm_method],
            )
        return db_cursor.fetchone() is not None

    if cursor is not None:
        return _run_check(cursor)

    with connection.cursor() as own_cursor:
        return _run_check(own_cursor)


def _save_payment_proof_image(
    warehouse_profile_id: int,
    reference_no: str,
    proof_image_data: str | None = None,
    proof_image_file=None,
) -> str:
    """
    Persist the captured camera payment proof image (from base64 data URL or uploaded file)
    under `MEDIA_ROOT/pos_payment_proofs/warehouse_<warehouse_profile_id>/` and return its relative media URL.
    """
    safe_ref = re.sub(r"[^A-Za-z0-9_-]", "", reference_no or "POS")[:32] or "POS"
    unique_token = uuid.uuid4().hex[:8]

    if proof_image_file is not None:
        ext = os.path.splitext(getattr(proof_image_file, "name", "") or "")[1].lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp"):
            ext = ".jpg"
        rel_path = f"pos_payment_proofs/warehouse_{warehouse_profile_id}/{safe_ref}_{unique_token}{ext}"
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

    rel_path = f"pos_payment_proofs/warehouse_{warehouse_profile_id}/{safe_ref}_{unique_token}{ext}"
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
    warehouse_employee_id: int | None,
    warehouse_profile_id: int,
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
       - Lock all target `warehouse_products` rows via `SELECT ... FOR UPDATE`.
       - Validate branch ownership, `status == 'active'`, `expiry_date > today (Asia/Manila)`,
         `unit_cost > 0`, and `stock_quantity >= quantity_sacks * 25`.
       - Compute server-side `selling_price_per_sack = unit_cost * 25`, line subtotals, and overall total.
       - Validate payment rules:
         * Cash: `amount_paid >= checkout_total`, compute `change_amount`, generate cash reference.
         * GCash / Bank: require active branch payment account (`credentials_id`), require explicit
           confirmation, require non-empty `reference_no` and captured proof image, reject duplicate
           references, set `amount_paid = checkout_total` and `change_amount = 0.00`.
       - Deduct `quantity_sacks * 25` kg from each product's `stock_quantity`.
       - Insert one row per product into `warehouse_ftf_sales` sharing the same `reference_no`,
         checkout-level `amount_paid`, and `change_amount`.
    5. Return the saved Sales Receipt payload.
    """
    if not warehouse_profile_id:
        raise POSValidationError("Missing Warehouse branch context.", status_code=403)

    seller_ctx = get_seller_and_branch_context(warehouse_employee_id, warehouse_profile_id)
    if not seller_ctx or seller_ctx.get("status", "").lower() != "active":
        raise POSValidationError("Unauthorized or inactive Warehouse seller account.", status_code=403)

    if not items_payload or not isinstance(items_payload, list):
        raise POSValidationError("Cannot checkout with an empty cart.")

    # Merge any duplicate product entries in payload while validating positive integer quantities
    merged_quantities: dict[int, int] = {}
    for idx, entry in enumerate(items_payload, start=1):
        if not isinstance(entry, dict):
            raise POSValidationError(f"Invalid cart item format at position {idx}.")
        raw_pid = entry.get("product_id") or entry.get("warehouse_product_id") or entry.get("id")
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
                    FROM warehouse_ftf_sales
                    WHERE warehouse_profile_id = %s
                      AND idempotency_key = %s
                    LIMIT 1
                    """,
                    [warehouse_profile_id, clean_idem_key],
                )
                existing_idem = cursor.fetchone()
                if existing_idem and existing_idem[0]:
                    existing_receipt = get_pos_checkout_receipt(warehouse_profile_id, existing_idem[0])
                    if existing_receipt:
                        return existing_receipt

            # 2. Lock all requested product rows in deterministic order
            sorted_pids = sorted(merged_quantities.keys())
            placeholders = ", ".join(["%s"] * len(sorted_pids))
            cursor.execute(
                f"""
                SELECT
                    product_id,
                    warehouse_profile_id,
                    product_name,
                    product_code,
                    stock_quantity,
                    unit_cost,
                    expiry_date,
                    status
                FROM warehouse_products
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
                if prod_branch_id != int(warehouse_profile_id):
                    raise POSValidationError(
                        "Unauthorized product access across Warehouse branches.",
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
                        "warehouse_product_id": pid,
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
                final_reference_no = generate_warehouse_pos_cash_reference(
                    business_name=seller_ctx.get("business_name", "WH"),
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

                # Verify configured payment account for this Warehouse branch
                if credentials_id_raw:
                    try:
                        req_cred_id = int(credentials_id_raw)
                    except (TypeError, ValueError) as exc:
                        raise POSValidationError("Invalid payment account selected.") from exc

                    cursor.execute(
                        """
                        SELECT credentials_id, type
                        FROM warehouse_online_transaction_credentials
                        WHERE credentials_id = %s
                          AND warehouse_profile_id = %s
                          AND LOWER(TRIM(status)) = 'active'
                        LIMIT 1
                        """,
                        [req_cred_id, warehouse_profile_id],
                    )
                else:
                    cursor.execute(
                        """
                        SELECT credentials_id, type
                        FROM warehouse_online_transaction_credentials
                        WHERE warehouse_profile_id = %s
                          AND LOWER(TRIM(type)) = %s
                          AND LOWER(TRIM(status)) = 'active'
                        ORDER BY is_default DESC, updated_at DESC, credentials_id DESC
                        LIMIT 1
                        """,
                        [warehouse_profile_id, norm_method],
                    )

                cred_row = cursor.fetchone()
                if not cred_row:
                    method_label = "GCash" if norm_method == "gcash" else "Bank Transfer"
                    raise POSValidationError(
                        f"No active {method_label} payment account is configured for this Warehouse branch."
                    )

                credentials_id_to_save = int(cred_row[0])
                cred_type = (cred_row[1] or "").strip().lower()
                if cred_type != norm_method:
                    raise POSValidationError(
                        "Selected payment account does not match the chosen payment method."
                    )

                # Check duplicate payment reference within the payment account/method
                if check_duplicate_pos_payment_reference(
                    warehouse_profile_id=warehouse_profile_id,
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
                    warehouse_profile_id=warehouse_profile_id,
                    reference_no=clean_ref,
                    proof_image_data=payment_proof_image_data,
                    proof_image_file=payment_proof_file,
                )

                final_reference_no = clean_ref
                amount_paid = checkout_total
                change_amount = Decimal("0.00")

            # 4. Deduct stock from warehouse_products and insert product rows into warehouse_ftf_sales
            for line in validated_lines:
                cursor.execute(
                    """
                    UPDATE warehouse_products
                    SET stock_quantity = stock_quantity - %s
                    WHERE product_id = %s
                      AND warehouse_profile_id = %s
                      AND stock_quantity >= %s
                    """,
                    [
                        line["quantity_kg"],
                        line["warehouse_product_id"],
                        warehouse_profile_id,
                        line["quantity_kg"],
                    ],
                )
                if cursor.rowcount != 1:
                    raise POSValidationError(
                        f"Could not deduct stock for '{line['product_name']}'. Stock may have changed."
                    )

                cursor.execute(
                    """
                    INSERT INTO warehouse_ftf_sales (
                        warehouse_profile_id,
                        sold_by_employee_id,
                        warehouse_product_id,
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
                        warehouse_profile_id,
                        warehouse_employee_id,
                        line["warehouse_product_id"],
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

    receipt_data = get_pos_checkout_receipt(warehouse_profile_id, final_reference_no)
    if not receipt_data:
        raise POSValidationError("Checkout succeeded, but receipt retrieval failed.", status_code=500)

    return receipt_data
