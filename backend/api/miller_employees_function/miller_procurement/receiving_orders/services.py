import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import logging
import os
from pathlib import Path
import re
import secrets

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class ReceivingOrderError(Exception):
    """Base exception for receiving order operations."""
    pass


class ReceivingValidationError(ReceivingOrderError):
    """Raised when receiving inputs fail validation."""
    pass


class OrderNotFoundError(ReceivingOrderError):
    """Raised when the specified order is not found or not owned by the business."""
    pass


class InvalidOrderStateError(ReceivingOrderError):
    """Raised when an order is in a state that cannot accept receiving."""
    pass


# ============================================================
# PARSING & VALIDATION HELPERS
# ============================================================

def _parse_decimal(value, field_name="Value", required=True, min_val=None, max_val=None, strictly_positive=False):
    """Safely parse a Decimal number and validate constraints."""
    if value is None or str(value).strip() == "":
        if required:
            raise ReceivingValidationError(f"{field_name} is required.")
        return Decimal("0.00")

    try:
        val_str = str(value).strip().replace(",", "")
        dec_val = Decimal(val_str)
    except (InvalidOperation, TypeError, ValueError):
        raise ReceivingValidationError(f"{field_name} must be a valid number.")

    if strictly_positive and dec_val <= Decimal("0.00"):
        raise ReceivingValidationError(f"{field_name} must be greater than zero.")

    if min_val is not None and dec_val < min_val:
        raise ReceivingValidationError(f"{field_name} cannot be less than {min_val}.")

    if max_val is not None and dec_val > max_val:
        raise ReceivingValidationError(f"{field_name} cannot exceed {max_val}.")

    return dec_val.quantize(Decimal("0.01"))


def _parse_date(value, field_name="Date", required=True):
    """Parse a date string into datetime.date."""
    if value is None or str(value).strip() == "":
        if required:
            raise ReceivingValidationError(f"{field_name} is required.")
        return None

    if isinstance(value, datetime.date):
        return value

    val_str = str(value).strip()[:10]
    try:
        return datetime.date.fromisoformat(val_str)
    except ValueError:
        raise ReceivingValidationError(f"Invalid date format for {field_name}. Use YYYY-MM-DD.")


def _clean_str(value):
    """Clean string, strip whitespace."""
    if value is None:
        return ""
    return str(value).strip()


# ============================================================
# FILE STORAGE & CLEANUP HELPERS
# ============================================================

ALLOWED_PHOTO_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB


def _validate_upload_file(file_obj, field_name="File"):
    """Validate uploaded photo file existence, extension, and size."""
    if not file_obj or not hasattr(file_obj, "chunks"):
        raise ReceivingValidationError(f"{field_name} is required.")

    filename = getattr(file_obj, "name", "") or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_PHOTO_EXTENSIONS:
        allowed_str = ", ".join(ALLOWED_PHOTO_EXTENSIONS)
        raise ReceivingValidationError(f"{field_name} must be an image file ({allowed_str}).")

    file_size = getattr(file_obj, "size", 0)
    if file_size <= 0:
        raise ReceivingValidationError(f"{field_name} is empty.")
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ReceivingValidationError(f"{field_name} exceeds the maximum allowed size of 15 MB.")


def _save_file(file_obj, subfolder, supplier_profile_id):
    """
    Save an uploaded file under MEDIA_ROOT/{subfolder}/{supplier_profile_id}/
    Returns POSIX relative path.
    """
    filename = getattr(file_obj, "name", "") or ""
    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    unique_name = f"{secrets.token_hex(16)}{ext}"

    rel_dir = Path(subfolder) / str(supplier_profile_id)
    abs_dir = Path(settings.MEDIA_ROOT) / rel_dir
    abs_dir.mkdir(parents=True, exist_ok=True)

    abs_path = abs_dir / unique_name
    with abs_path.open("wb") as dest:
        for chunk in file_obj.chunks():
            dest.write(chunk)

    return (rel_dir / unique_name).as_posix()


def delete_file_safely(rel_path):
    """Delete a saved file from MEDIA_ROOT safely if exists."""
    if not rel_path:
        return
    try:
        abs_path = Path(settings.MEDIA_ROOT) / rel_path
        if abs_path.is_file():
            abs_path.unlink()
    except Exception as exc:
        logger.warning("Failed to delete file %s during rollback: %s", rel_path, exc)


# ============================================================
# IDENTIFIER GENERATORS
# ============================================================

def extract_last4_batch(batch_no):
    """
    Extract LAST4BATCH from batch number.
    Prioritizes the last segment after hyphens if present.
    Example: 'DIN-RI-20261008-0529' -> '0529'
             'DIN - RI - 20261008 - 0529' -> '0529'
    """
    segments = [s.strip() for s in str(batch_no or "").split("-") if s.strip()]
    if segments:
        last_seg = re.sub(r"[^A-Za-z0-9]", "", segments[-1]).upper()
        if len(last_seg) >= 4:
            return last_seg[-4:]
    clean = re.sub(r"[^A-Za-z0-9]", "", str(batch_no or "").strip()).upper()
    if len(clean) >= 4:
        return clean[-4:]
    return clean.zfill(4)


def extract_first2_business(business_name):
    """
    Extract FIRST2BUSINESS.
    Example: 'Grainrise' -> 'GR'
             'Riggie Grains' -> 'RI'
    """
    clean = re.sub(r"[^A-Za-z0-9]", "", str(business_name or "").strip()).upper()
    if len(clean) >= 2:
        return clean[:2]
    return clean.ljust(2, "X")


def extract_contact_initials(contact_name):
    """
    Extract CONTACTINITIALS.
    Example: 'Juan Magsasaka' -> 'JM'
             'Juan' -> 'JU'
    """
    if not contact_name:
        return "SU"
    words = [w for w in re.split(r"[^A-Za-z0-9]+", str(contact_name).strip()) if w]
    if len(words) >= 2:
        return "".join(w[0].upper() for w in words)[:4]
    elif len(words) == 1:
        clean = re.sub(r"[^A-Za-z0-9]", "", words[0]).upper()
        return clean[:2] if len(clean) >= 2 else clean.ljust(2, "X")
    return "SU"


def extract_first3_product(product_name):
    """
    Extract FIRST3PRODUCT.
    Example: 'Dinurado' -> 'DIN'
             'Dinorado Palay' -> 'DIN'
    """
    clean = re.sub(r"[^A-Za-z0-9]", "", str(product_name or "").strip()).upper()
    if len(clean) >= 3:
        return clean[:3]
    return clean.ljust(3, "X")


def generate_receiving_reference(cursor, batch_no, business_name, contact_person, dt):
    """
    Generate unique receiving reference number server-side.
    Format: LAST4BATCH-FIRST2BUSINESS-CONTACTINITIALS-MMDDYYYY-HHMM
    Example: 0529-GR-JM-10152026-1212
    Enforces uniqueness against inbound_purchase_history.
    """
    last4 = extract_last4_batch(batch_no)
    first2_bus = extract_first2_business(business_name)
    contact_init = extract_contact_initials(contact_person)
    mmddyyyy = dt.strftime("%m%d%Y")
    hhmm = dt.strftime("%H%M")

    base_ref = f"{last4}-{first2_bus}-{contact_init}-{mmddyyyy}-{hhmm}"
    ref = base_ref

    # Check collision and handle safely
    attempt = 1
    while attempt <= 50:
        cursor.execute(
            "SELECT 1 FROM inbound_purchase_history WHERE receiving_reference_no = %s LIMIT 1",
            [ref],
        )
        if not cursor.fetchone():
            return ref
        ref = f"{base_ref}-{attempt:02d}"
        attempt += 1

    raise ReceivingOrderError("Failed to generate a unique receiving reference number after multiple attempts.")


def generate_product_code(cursor, batch_no, dt, business_name, product_name):
    """
    Generate unique product code server-side.
    Format: LAST4BATCH-MMDDYYYY-HHMM-FIRST2BUSINESS-FIRST3PRODUCT
    Example: 0529-10152026-1001-GR-DIN
    Enforces uniqueness against miller_products.
    """
    last4 = extract_last4_batch(batch_no)
    mmddyyyy = dt.strftime("%m%d%Y")
    hhmm = dt.strftime("%H%M")
    first2_bus = extract_first2_business(business_name)
    first3_prod = extract_first3_product(product_name)

    base_code = f"{last4}-{mmddyyyy}-{hhmm}-{first2_bus}-{first3_prod}"
    code = base_code

    attempt = 1
    while attempt <= 50:
        cursor.execute(
            "SELECT 1 FROM miller_products WHERE product_code = %s LIMIT 1",
            [code],
        )
        if not cursor.fetchone():
            return code
        code = f"{base_code}-{attempt:02d}"
        attempt += 1

    raise ReceivingOrderError("Failed to generate a unique product code after multiple attempts.")


def generate_return_reference(cursor, inbound_order_id, receiving_ref, received_bad):
    """
    Generate unique return reference number server-side.
    Format: RECEIVINGREFERENCE-NNN-QQQQ
    Where:
      NNN = return report sequence for the same original inbound order, padded to three digits.
      QQQQ = rejected kg rounded HALF_UP to a whole kilogram, padded to four digits.
    Example: 0529-GR-JM-10152026-1212-001-0045
    """
    cursor.execute(
        "SELECT COUNT(*) FROM miller_returns WHERE inbound_order_id = %s",
        [inbound_order_id],
    )
    existing_returns_count = cursor.fetchone()[0] or 0
    seq = existing_returns_count + 1
    nnn = f"{seq:03d}"

    rounded_qty = int(Decimal(str(received_bad)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    qqqq = f"{rounded_qty:04d}" if rounded_qty <= 9999 else str(rounded_qty)

    base_ref = f"{receiving_ref}-{nnn}-{qqqq}"
    ref = base_ref

    attempt = 1
    while attempt <= 50:
        cursor.execute(
            "SELECT 1 FROM miller_returns WHERE return_reference_no = %s LIMIT 1",
            [ref],
        )
        if not cursor.fetchone():
            return ref
        ref = f"{base_ref}-{attempt:02d}"
        attempt += 1

    raise ReceivingOrderError("Failed to generate a unique return reference number after multiple attempts.")


def get_active_markup_percentage(cursor, supplier_profile_id):
    """
    Fetch active markup percentage for the given supplier profile from
    miller_mark_up_prices_from_received_products.
    Defaults to 12.00% if no active record exists.
    """
    cursor.execute(
        """
        SELECT mark_up_percentages
        FROM miller_mark_up_prices_from_received_products
        WHERE supplier_profile_id = %s
          AND status = 'active'
        ORDER BY mark_up_id DESC
        LIMIT 1
        """,
        [supplier_profile_id],
    )
    row = cursor.fetchone()
    if row and row[0] is not None:
        try:
            return Decimal(str(row[0]))
        except (InvalidOperation, TypeError, ValueError):
            return Decimal("12.00")
    return Decimal("12.00")


def create_receiving_encoder_notification(
    cursor,
    supplier_profile_id,
    batch_no,
    product_name,
    received_good,
    remaining_receivable,
    order_status,
):
    """
    Automatically notify the Inventory Encoder when Procurement marks an order as partially or fully received.

    Rules:
    - Scoped strictly to supplier_profile_id and employee_type = 'encoder'.
    - Formats numbers cleanly: e.g. '800 kg', '1,500 kg'.
    - Includes batch number, product name, received good quantity, remaining receivable, and receiving status.
    - Status 'partially_received': e.g. "Your order DIN-RI-20261008-0529 was partially received. 800 kg of Dinorado Palay was added to Unmilled Inventory. Remaining: 1,500 kg."
    - Status 'received': e.g. "Your order DIN-RI-20261008-0529 has been completed and fully received. 1,500 kg of Dinorado Palay was added to Unmilled Inventory. Remaining: 0 kg."
    - Idempotent: Avoids duplicate notification inserts if an identical notification already exists for this branch.
    """
    good_dec = Decimal(str(received_good or 0))
    rem_dec = Decimal(str(remaining_receivable or 0))

    qty_good_str = f"{int(good_dec):,} kg" if good_dec % 1 == 0 else f"{good_dec:,.2f} kg"
    qty_rem_str = f"{int(rem_dec):,} kg" if rem_dec % 1 == 0 else f"{rem_dec:,.2f} kg"

    clean_batch = str(batch_no or "").strip()
    clean_product = str(product_name or "").strip()

    if order_status == "received":
        title = "Order Completed"
        content = (
            f"Your order {clean_batch} has been completed and fully received. "
            f"{qty_good_str} of {clean_product} was added to Unmilled Inventory. "
            f"Remaining: 0 kg."
        )
    elif good_dec > Decimal("0.00"):
        title = "Order Partially Received"
        content = (
            f"Your order {clean_batch} was partially received. "
            f"{qty_good_str} of {clean_product} was added to Unmilled Inventory. "
            f"Remaining: {qty_rem_str}."
        )
    else:
        title = "Order Delivery Inspected"
        content = (
            f"Delivery for order {clean_batch} was inspected by Procurement, "
            f"but 0 kg was accepted into inventory. "
            f"Remaining: {qty_rem_str}."
        )

    action_url = "/supplier-encoder/stock"

    # Idempotency check: avoid duplicate notifications on retries
    cursor.execute(
        """
        SELECT notification_id
        FROM miller_employee_notifications
        WHERE supplier_profile_id = %s
          AND employee_type = 'encoder'
          AND notification_content = %s
        LIMIT 1
        """,
        [supplier_profile_id, content],
    )
    existing = cursor.fetchone()
    if existing:
        return existing[0]

    cursor.execute(
        """
        INSERT INTO miller_employee_notifications (
            supplier_profile_id,
            employee_type,
            notification_title,
            notification_content,
            action_url,
            status,
            seen_by_employee_id,
            seen_at
        ) VALUES (
            %s,
            'encoder',
            %s,
            %s,
            %s,
            'unseen',
            NULL,
            NULL
        )
        """,
        [
            supplier_profile_id,
            title,
            content,
            action_url,
        ],
    )
    return cursor.lastrowid


# ============================================================
# RECEIVING ATOMIC TRANSACTION SERVICE
# ============================================================

def receive_inbound_order(
    supplier_profile_id,
    supplier_employee_id,
    inbound_order_id,
    total_received,
    quality_checking_toggle,
    received_bad,
    price_per_kg,
    farmer_rating,
    shelf_location,
    expiry_date,
    receiving_proof_file,
    photo_evidence_file=None,
):
    """
    Process receiving of an inbound order as one atomic database transaction.

    Steps:
    1. Authenticate Procurement employee (done via decorator).
    2. Verify authorized business ownership and lock target order row.
    3. Recompute remaining receivable quantity from database records.
    4. Validate requested receiving quantities, dates, price, rating, files.
    5. Generate unique receiving reference.
    6. Insert inbound_purchase_history.
    7. If accepted quantity > 0, insert miller_products (unmilled, product_image = NULL).
    8. If rejected quantity > 0, insert miller_returns.
    9. Insert farmer_performance rating.
    10. Recalculate total accepted quantity and update inbound_order.status.
    11. Commit transaction and clean up orphan files on any failure.
    """
    # ---------------------------------------------------------
    # 1. PRE-TRANSACTION INPUT PARSING & VALIDATION
    # ---------------------------------------------------------
    total_rec_dec = _parse_decimal(
        total_received,
        field_name="Total received quantity",
        required=True,
        strictly_positive=True,
    )

    # Handle Quality Checking Toggle
    is_quality_issue = False
    if isinstance(quality_checking_toggle, bool):
        is_quality_issue = quality_checking_toggle
    elif isinstance(quality_checking_toggle, str):
        is_quality_issue = quality_checking_toggle.strip().lower() in ("true", "1", "yes", "on")

    if not is_quality_issue:
        bad_dec = Decimal("0.00")
    else:
        bad_dec = _parse_decimal(
            received_bad,
            field_name="Received bad quantity",
            required=True,
            min_val=Decimal("0.00"),
        )

    if bad_dec < Decimal("0.00"):
        raise ReceivingValidationError("Received bad quantity cannot be negative.")

    if bad_dec > total_rec_dec:
        raise ReceivingValidationError("Received bad quantity cannot exceed total received quantity.")

    good_dec = (total_rec_dec - bad_dec).quantize(Decimal("0.01"))
    if good_dec < Decimal("0.00"):
        raise ReceivingValidationError("Calculated accepted good quantity cannot be negative.")

    # Price per kg
    price_dec = _parse_decimal(
        price_per_kg,
        field_name="Price per kilogram",
        required=True,
        strictly_positive=True,
    )

    # Total Payables = good_dec * price_dec (rejected goods excluded)
    total_payables = (good_dec * price_dec).quantize(Decimal("0.01"))

    # Farmer Rating
    try:
        rating_int = int(str(farmer_rating).strip())
        if rating_int < 1 or rating_int > 5:
            raise ValueError()
    except (TypeError, ValueError):
        raise ReceivingValidationError("Farmer rating is required and must be an integer between 1 and 5.")

    # Validate Shelf Location & Expiry Date when good_dec > 0
    shelf_loc_clean = _clean_str(shelf_location)
    parsed_expiry_date = None
    today_local = timezone.localtime(timezone.now()).date()

    if good_dec > Decimal("0.00"):
        if not shelf_loc_clean:
            raise ReceivingValidationError("Shelf location is required.")

        parsed_expiry_date = _parse_date(expiry_date, field_name="Expiry date", required=True)
        if parsed_expiry_date < today_local:
            raise ReceivingValidationError("Expiry date must be today or a future date (cannot be a past date).")
    else:
        # If received_good == 0 (entire delivery rejected), expiry_date is optional
        if expiry_date:
            parsed_expiry_date = _parse_date(expiry_date, field_name="Expiry date", required=False)
            if parsed_expiry_date and parsed_expiry_date < today_local:
                raise ReceivingValidationError("Expiry date must be today or a future date (cannot be a past date).")

    # Validate Files
    _validate_upload_file(receiving_proof_file, field_name="Proof of receiving photo")

    if bad_dec > Decimal("0.00"):
        if not photo_evidence_file:
            raise ReceivingValidationError("Proof of rejected goods photo is required when rejected quantity is greater than 0 kg.")
        _validate_upload_file(photo_evidence_file, field_name="Proof of rejected goods photo")

    # ---------------------------------------------------------
    # 2. ATOMIC TRANSACTION EXECUTION
    # ---------------------------------------------------------
    saved_files = []
    receiving_proof_path = None
    returns_proof_path = None

    try:
        now_dt = timezone.localtime(timezone.now())

        with transaction.atomic():
            with connection.cursor() as cursor:
                # 2A. Lock the target order row and verify ownership
                cursor.execute(
                    """
                    SELECT
                        io.inbound_order_id,
                        io.supplier_profile_id,
                        io.farmer_contact_id,
                        io.batch_no,
                        io.product_name,
                        io.product_description,
                        io.ordered_quantity,
                        io.expected_arrival_date,
                        io.status,
                        io.created_at,
                        sp.business_name,
                        fc.contact_person,
                        fc.supplier_farm,
                        fc.organization
                    FROM inbound_order io
                    INNER JOIN supplier_profiles sp
                        ON sp.supplier_profile_id = io.supplier_profile_id
                    LEFT JOIN farmer_contacts fc
                        ON fc.farmer_contact_id = io.farmer_contact_id
                    WHERE io.inbound_order_id = %s
                      AND io.supplier_profile_id = %s
                    FOR UPDATE
                    """,
                    [inbound_order_id, supplier_profile_id],
                )
                order_row = cursor.fetchone()

                if not order_row:
                    raise OrderNotFoundError("Inbound order not found or does not belong to your business.")

                db_status = str(order_row[8] or "").strip().lower()
                if db_status not in ("ordered", "partially_received", "partially received"):
                    raise InvalidOrderStateError(
                        f"Order #{inbound_order_id} has status '{order_row[8]}' and is not eligible for receiving."
                    )

                batch_no = order_row[3]
                product_name = order_row[4]
                product_desc = order_row[5]
                ordered_quantity = Decimal(str(order_row[6] or 0))
                farmer_contact_id = order_row[2]
                order_created_at = order_row[9]
                business_name = order_row[10]
                contact_person = order_row[11] or order_row[12] or order_row[13] or "Supplier"

                # 2B. Recompute remaining receivable quantity from current database records
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(received_good), 0.00)
                    FROM inbound_purchase_history
                    WHERE order_id = %s
                      AND supplier_profile_id = %s
                    """,
                    [inbound_order_id, supplier_profile_id],
                )
                accepted_so_far = Decimal(str(cursor.fetchone()[0] or 0))
                remaining_receivable = max(Decimal("0.00"), ordered_quantity - accepted_so_far)

                if remaining_receivable <= Decimal("0.00"):
                    raise InvalidOrderStateError("This order has already been fully received.")

                if total_rec_dec > remaining_receivable:
                    raise ReceivingValidationError(
                        f"Total received quantity ({total_rec_dec:,.2f} kg) cannot exceed the "
                        f"remaining receivable quantity ({remaining_receivable:,.2f} kg)."
                    )

                if good_dec > remaining_receivable:
                    raise ReceivingValidationError(
                        f"Accepted good quantity ({good_dec:,.2f} kg) cannot exceed the "
                        f"remaining receivable quantity ({remaining_receivable:,.2f} kg)."
                    )

                # 2C. Generate Unique Receiving Reference
                receiving_ref = generate_receiving_reference(
                    cursor=cursor,
                    batch_no=batch_no,
                    business_name=business_name,
                    contact_person=contact_person,
                    dt=now_dt,
                )

                # 2D. Save uploaded files to storage
                receiving_proof_path = _save_file(
                    file_obj=receiving_proof_file,
                    subfolder="receiving_proofs",
                    supplier_profile_id=supplier_profile_id,
                )
                saved_files.append(receiving_proof_path)

                if bad_dec > Decimal("0.00") and photo_evidence_file:
                    returns_proof_path = _save_file(
                        file_obj=photo_evidence_file,
                        subfolder="returns_proofs",
                        supplier_profile_id=supplier_profile_id,
                    )
                    saved_files.append(returns_proof_path)

                # 2E. Insert inbound_purchase_history
                cursor.execute(
                    """
                    INSERT INTO inbound_purchase_history (
                        order_id,
                        supplier_profile_id,
                        farmer_contact_id,
                        receiving_reference_no,
                        total_received,
                        received_good,
                        received_bad,
                        received_by_employee_id,
                        price_per_kg,
                        total_price,
                        status,
                        paid_by_employee_id,
                        received_at,
                        receiving_proof_photo
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    """,
                    [
                        inbound_order_id,
                        supplier_profile_id,
                        farmer_contact_id,
                        receiving_ref,
                        total_rec_dec,
                        good_dec,
                        bad_dec,
                        supplier_employee_id,
                        price_dec,
                        total_payables,
                        "pending",
                        None,
                        now_dt,
                        receiving_proof_path,
                    ],
                )
                receiving_id = cursor.lastrowid

                # 2F. If accepted quantity > 0, auto-create unmilled miller_products
                created_product_id = None
                generated_prod_code = None
                marked_up_unit_cost = None
                active_markup_pct = None

                if good_dec > Decimal("0.00"):
                    active_markup_pct = get_active_markup_percentage(cursor, supplier_profile_id)
                    markup_multiplier = Decimal("1.00") + (active_markup_pct / Decimal("100.00"))
                    marked_up_unit_cost = (price_dec * markup_multiplier).quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )

                    generated_prod_code = generate_product_code(
                        cursor=cursor,
                        batch_no=batch_no,
                        dt=now_dt,
                        business_name=business_name,
                        product_name=product_name,
                    )

                    order_date_val = order_created_at.date() if isinstance(order_created_at, datetime.datetime) else today_local
                    arrival_date_val = today_local

                    cursor.execute(
                        """
                        INSERT INTO miller_products (
                            supplier_profile_id,
                            farmer_contact_id,
                            inbound_purchase_history_id,
                            product_code,
                            product_name,
                            product_description,
                            product_image,
                            order_date,
                            arrival_date,
                            expiry_date,
                            stock_quantity,
                            unit_cost,
                            shelf_location,
                            archive_reason,
                            status
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """,
                        [
                            supplier_profile_id,
                            farmer_contact_id,
                            receiving_id,
                            generated_prod_code,
                            product_name,
                            product_desc,
                            None,  # product_image strictly NULL for Procurement
                            order_date_val,
                            arrival_date_val,
                            parsed_expiry_date,
                            good_dec,
                            marked_up_unit_cost,
                            shelf_loc_clean,
                            None,
                            "unmilled",
                        ],
                    )
                    created_product_id = cursor.lastrowid

                # 2G. If rejected quantity > 0, create miller_returns record
                created_return_id = None
                generated_return_ref = None

                if bad_dec > Decimal("0.00"):
                    generated_return_ref = generate_return_reference(
                        cursor=cursor,
                        inbound_order_id=inbound_order_id,
                        receiving_ref=receiving_ref,
                        received_bad=bad_dec,
                    )

                    cursor.execute(
                        """
                        INSERT INTO miller_returns (
                            supplier_profile_id,
                            received_by_employee_id,
                            inbound_order_id,
                            receiving_id,
                            photo_evidence,
                            receiving_reference_no,
                            return_reference_no,
                            quantity_kg,
                            status,
                            created_at,
                            returned_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        )
                        """,
                        [
                            supplier_profile_id,
                            supplier_employee_id,
                            inbound_order_id,
                            receiving_id,
                            returns_proof_path,
                            receiving_ref,
                            generated_return_ref,
                            bad_dec,
                            "pending",
                            now_dt,
                            None,
                        ],
                    )
                    created_return_id = cursor.lastrowid

                # 2H. Insert farmer_performance rating linked to receiving_id
                cursor.execute(
                    """
                    INSERT INTO farmer_performance (
                        farmer_contact_id,
                        farmer_rating,
                        rated_by_employee_id,
                        receiving_id
                    ) VALUES (
                        %s, %s, %s, %s
                    )
                    """,
                    [
                        farmer_contact_id,
                        rating_int,
                        supplier_employee_id,
                        receiving_id,
                    ],
                )
                farmer_perf_id = cursor.lastrowid

                # 2I. Recalculate total accepted goods and update inbound_order.status
                cursor.execute(
                    """
                    SELECT COALESCE(SUM(received_good), 0.00)
                    FROM inbound_purchase_history
                    WHERE order_id = %s
                      AND supplier_profile_id = %s
                    """,
                    [inbound_order_id, supplier_profile_id],
                )
                new_total_accepted = Decimal(str(cursor.fetchone()[0] or 0))

                if new_total_accepted >= ordered_quantity:
                    new_order_status = "received"
                else:
                    new_order_status = "partially_received"

                cursor.execute(
                    """
                    UPDATE inbound_order
                    SET status = %s
                    WHERE inbound_order_id = %s
                      AND supplier_profile_id = %s
                    """,
                    [new_order_status, inbound_order_id, supplier_profile_id],
                )

                new_remaining = max(Decimal("0.00"), ordered_quantity - new_total_accepted)

                # 2J. Create notification for Inventory Encoder
                encoder_notif_id = create_receiving_encoder_notification(
                    cursor=cursor,
                    supplier_profile_id=supplier_profile_id,
                    batch_no=batch_no,
                    product_name=product_name,
                    received_good=good_dec,
                    remaining_receivable=new_remaining,
                    order_status=new_order_status,
                )

        # Transaction committed successfully!
        return {
            "receiving_id": receiving_id,
            "receiving_reference_no": receiving_ref,
            "order_id": inbound_order_id,
            "total_received": float(total_rec_dec),
            "received_good": float(good_dec),
            "received_bad": float(bad_dec),
            "price_per_kg": float(price_dec),
            "total_price": float(total_payables),
            "farmer_rating": rating_int,
            "farmer_performance_id": farmer_perf_id,
            "product_id": created_product_id,
            "product_code": generated_prod_code,
            "unit_cost": float(marked_up_unit_cost) if marked_up_unit_cost is not None else None,
            "markup_percentage": float(active_markup_pct) if active_markup_pct is not None else None,
            "notification_id": encoder_notif_id,
            "return_id": created_return_id,
            "return_reference_no": generated_return_ref,
            "order_status": new_order_status,
            "remaining_receivable": float(new_remaining),
            "receiving_proof_photo": receiving_proof_path,
            "photo_evidence": returns_proof_path,
        }

    except Exception:
        # Rollback occurred! Clean up any written files to prevent orphan files
        for fpath in saved_files:
            delete_file_safely(fpath)
        raise

