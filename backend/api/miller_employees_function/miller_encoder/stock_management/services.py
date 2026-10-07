from datetime import date, datetime
from decimal import Decimal, InvalidOperation
import os
from pathlib import Path
import secrets

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .selectors import get_encoder_product


# ============================================================
# HELPER PARSERS & UTILITIES
# ============================================================

def _clean_text(value):
    """Strip string and return None if empty."""
    if value is None:
        return None
    val = str(value).strip()
    return val if val else None


def _parse_date(value, field_name="Date", required=False):
    """Parse date from string or date object into YYYY-MM-DD."""
    if value is None or str(value).strip() == "":
        if required:
            raise ValueError(f"{field_name} is required.")
        return None

    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")

    val_str = str(value).strip()
    # Handle ISO datetime strings like '2026-10-15T00:00:00'
    val_clean = val_str[:10]
    try:
        parsed = datetime.strptime(val_clean, "%Y-%m-%d").date()
        return parsed.strftime("%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Invalid date format for {field_name}. Use YYYY-MM-DD.")


def _validate_future_date(date_val_or_str, field_name="Expiry date"):
    """
    Validate that the date is strictly in the future.
    Rejects dates on or before today (date-only comparison).
    """
    if not date_val_or_str:
        return
    if isinstance(date_val_or_str, str):
        parsed = datetime.strptime(date_val_or_str[:10], "%Y-%m-%d").date()
    elif isinstance(date_val_or_str, datetime):
        parsed = date_val_or_str.date()
    elif isinstance(date_val_or_str, date):
        parsed = date_val_or_str
    else:
        raise ValueError(f"Invalid date for {field_name}.")

    today = timezone.localtime(timezone.now()).date()
    if parsed <= today:
        raise ValueError(f"{field_name} must be a future date.")


def _validate_not_future_date(date_val_or_str, field_name="Date"):
    """
    Validate that the date is not in the future.
    Allows today and past dates (date-only comparison).
    Rejects dates strictly after today.
    """
    if not date_val_or_str:
        return
    if isinstance(date_val_or_str, str):
        parsed = datetime.strptime(date_val_or_str[:10], "%Y-%m-%d").date()
    elif isinstance(date_val_or_str, datetime):
        parsed = date_val_or_str.date()
    elif isinstance(date_val_or_str, date):
        parsed = date_val_or_str
    else:
        raise ValueError(f"Invalid date for {field_name}.")

    today = timezone.localtime(timezone.now()).date()
    if parsed > today:
        raise ValueError(f"{field_name} cannot be in the future.")


def _parse_decimal(value, field_name="Value", required=False, min_value=None, strictly_positive=False):
    """Parse decimal number and validate min_value or strictly_positive."""
    if value is None or str(value).strip() == "":
        if required:
            raise ValueError(f"{field_name} is required.")
        return None

    try:
        dec = Decimal(str(value).strip())
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid number.")

    if strictly_positive:
        if dec <= Decimal("0"):
            raise ValueError(f"{field_name} must be greater than 0.")
    elif min_value is not None and dec < Decimal(str(min_value)):
        raise ValueError(f"{field_name} cannot be negative.")

    return dec


def _format_quantity(val):
    """Format quantity removing trailing zeroes after decimal point if any."""
    d = Decimal(str(val))
    s = f"{d:f}"
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s



def generate_product_code(product_name, cursor=None):
    """
    Generate unique manual product code:
    ADD - MMDDYYYY - HHMM - XXX
    XXX = first 3 alphabetical characters of product_name, uppercase.
    Example: Dinorado, Oct 15 2026, 10:01 -> ADD - 10152026 - 1001 - DIN
    """
    now = timezone.localtime(timezone.now())
    clean_name = str(product_name or "").strip()
    alpha_chars = [c.upper() for c in clean_name if c.isalpha()]
    if len(alpha_chars) >= 3:
        xxx = "".join(alpha_chars[:3])
    elif alpha_chars:
        xxx = "".join(alpha_chars).ljust(3, "X")
    else:
        xxx = "PRD"

    date_str = now.strftime("%m%d%Y")
    time_str = now.strftime("%H%M")
    base_code = f"ADD - {date_str} - {time_str} - {xxx}"
    code = base_code
    counter = 1

    def _code_exists(check_code):
        if cursor is not None:
            cursor.execute(
                "SELECT 1 FROM miller_products WHERE product_code = %s LIMIT 1",
                [check_code],
            )
            return cursor.fetchone() is not None
        with connection.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM miller_products WHERE product_code = %s LIMIT 1",
                [check_code],
            )
            return cur.fetchone() is not None

    while _code_exists(code):
        counter += 1
        code = f"{base_code}-{counter}"

    return code


def save_product_image_file(file_obj, supplier_profile_id):
    """
    Save an uploaded product image to MEDIA_ROOT/miller_product_images/<supplier_profile_id>/
    Returns POSIX relative path.
    """
    if not file_obj or not hasattr(file_obj, "chunks"):
        return None

    orig_name = getattr(file_obj, "name", "") or ""
    extension = os.path.splitext(orig_name)[1].lower() or ".jpg"
    unique_name = f"prod_{secrets.token_hex(12)}{extension}"

    rel_directory = Path("miller_product_images") / str(supplier_profile_id)
    abs_directory = Path(settings.MEDIA_ROOT) / rel_directory
    abs_directory.mkdir(parents=True, exist_ok=True)

    abs_file_path = abs_directory / unique_name
    with abs_file_path.open("wb") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)

    return (rel_directory / unique_name).as_posix()


def delete_product_image_file(rel_path):
    """
    Safely delete an uploaded product image file if stored locally.
    Enforces that the resolved target path is strictly inside settings.MEDIA_ROOT/miller_product_images/.
    Does not delete external URLs or base64 data URIs.
    """
    if not rel_path or not isinstance(rel_path, str):
        return

    clean_path = rel_path.strip()
    if not clean_path:
        return

    # Do not delete external URLs or base64 data URIs
    lower_path = clean_path.lower()
    if lower_path.startswith(("http://", "https://", "//", "data:")):
        return

    try:
        base_dir = (Path(settings.MEDIA_ROOT) / "miller_product_images").resolve()
        target_path = (Path(settings.MEDIA_ROOT) / clean_path).resolve()

        # Confirm the target is strictly inside base_dir and not base_dir itself
        if not target_path.is_relative_to(base_dir) or target_path == base_dir:
            return

        if target_path.is_file():
            target_path.unlink()
    except Exception:
        pass



# ============================================================
# SERVICES
# ============================================================

def create_manual_product(
    *,
    supplier_profile_id,
    farmer_contact_id,
    product_name,
    stock_quantity,
    product_description=None,
    product_image=None,
    order_date=None,
    arrival_date=None,
    expiry_date=None,
    unit_cost=None,
    shelf_location=None,
):
    """
    Create a manual active stock product under the authenticated supplier_profile_id.

    Required:
    - farmer_contact_id (must belong to authenticated supplier_profile_id)
    - product_name
    - product_image
    - order_date
    - arrival_date
    - expiry_date
    - stock_quantity (> 0)
    - unit_cost (> 0)
    - shelf_location

    Optional:
    - product_description
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    # Validate farmer_contact_id
    if not farmer_contact_id:
        raise ValueError("Supplier/farmer contact is required.")
    try:
        farmer_contact_id_int = int(farmer_contact_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid farmer_contact_id format.")

    # Validate product_name
    clean_product_name = _clean_text(product_name)
    if not clean_product_name:
        raise ValueError("Product name is required.")

    # Validate product_image
    clean_image = _clean_text(product_image)
    if not clean_image:
        raise ValueError("Product image is required.")

    # Validate dates
    parsed_order_date = _parse_date(order_date, "Order date", required=True)
    _validate_not_future_date(parsed_order_date, "Order date")

    parsed_arrival_date = _parse_date(arrival_date, "Arrival date", required=True)
    _validate_not_future_date(parsed_arrival_date, "Arrival date")

    parsed_expiry_date = _parse_date(expiry_date, "Expiry date", required=True)
    _validate_future_date(parsed_expiry_date, "Expiry date")

    # Validate stock_quantity & unit_cost
    parsed_stock = _parse_decimal(stock_quantity, "Stock quantity", required=True, strictly_positive=True)
    parsed_unit_cost = _parse_decimal(unit_cost, "Unit cost", required=True, strictly_positive=True)

    # Validate shelf_location
    clean_shelf = _clean_text(shelf_location)
    if not clean_shelf:
        raise ValueError("Shelf location is required.")

    # Description is optional / nullable
    clean_description = _clean_text(product_description)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Verify farmer_contact_id belongs to same supplier_profile_id
            cursor.execute(
                """
                SELECT farmer_contact_id
                FROM farmer_contacts
                WHERE farmer_contact_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [farmer_contact_id_int, supplier_profile_id],
            )
            if not cursor.fetchone():
                raise ValueError("Selected supplier/farmer contact was not found or does not belong to your branch.")

            # Generate server-side product_code
            product_code = generate_product_code(clean_product_name, cursor=cursor)

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
                    farmer_contact_id_int,
                    None,  # inbound_purchase_history_id = NULL
                    product_code,
                    clean_product_name,
                    clean_description,
                    clean_image,
                    parsed_order_date,
                    parsed_arrival_date,
                    parsed_expiry_date,
                    parsed_stock,
                    parsed_unit_cost,
                    clean_shelf,
                    None,  # archive_reason = NULL
                    "active",
                ],
            )
            new_product_id = cursor.lastrowid

    return get_encoder_product(supplier_profile_id, new_product_id)


def update_active_product(
    *,
    supplier_profile_id,
    product_id,
    data,
):
    """
    Update an active/unmilled stock product.

    Allows editing:
    - product_name
    - product_description
    - product_image
    - expiry_date
    - stock_quantity
    - unit_cost
    - shelf_location
    - farmer_contact_id

    Rules:
    - product must belong to authenticated supplier_profile_id
    - farmer_contact_id must belong to same profile
    - never modify product_code
    - never modify supplier_profile_id
    - never modify inbound_purchase_history_id
    - never modify order_date or arrival_date
    - never directly modify status
    - stock/unit cost must be greater than 0
    - archived product cannot be edited
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Validate product ownership and status
            cursor.execute(
                """
                SELECT product_id, status
                FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [product_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Product not found.")

            current_status = str(row[1] or "").strip().lower()
            if current_status == "unmilled":
                raise ValueError("Unmilled products cannot be edited directly. Please use process_unmilled_product() to process them into active stock.")
            elif current_status == "archived":
                raise ValueError("Archived products cannot be modified. Please restore the product first.")
            elif current_status != "active":
                raise ValueError(f"Only products with active status can be edited (current status: {current_status}).")

            updates = []
            params = []

            # product_name
            if "product_name" in data:
                clean_name = _clean_text(data["product_name"])
                if not clean_name:
                    raise ValueError("Product name cannot be empty.")
                updates.append("product_name = %s")
                params.append(clean_name)

            # product_description
            if "product_description" in data:
                updates.append("product_description = %s")
                params.append(_clean_text(data["product_description"]))

            # product_image
            if "product_image" in data:
                updates.append("product_image = %s")
                params.append(_clean_text(data["product_image"]))

            # NOTE: order_date and arrival_date are IMMUTABLE and cannot be edited.
            # If present in data, they are ignored.

            # expiry_date
            if "expiry_date" in data:
                parsed_exp = _parse_date(data["expiry_date"], "Expiry date", required=False)
                if parsed_exp is not None:
                    _validate_future_date(parsed_exp)
                updates.append("expiry_date = %s")
                params.append(parsed_exp)

            # stock_quantity
            if "stock_quantity" in data:
                parsed_stock = _parse_decimal(data["stock_quantity"], "Stock quantity", required=True, strictly_positive=True)
                updates.append("stock_quantity = %s")
                params.append(parsed_stock)

            # unit_cost
            if "unit_cost" in data:
                parsed_cost = _parse_decimal(data["unit_cost"], "Unit cost", required=False, strictly_positive=True)
                updates.append("unit_cost = %s")
                params.append(parsed_cost)

            # shelf_location
            if "shelf_location" in data:
                updates.append("shelf_location = %s")
                params.append(_clean_text(data["shelf_location"]))

            # farmer_contact_id
            if "farmer_contact_id" in data:
                raw_fc = data["farmer_contact_id"]
                if not raw_fc:
                    raise ValueError("Supplier/farmer contact cannot be empty.")
                try:
                    fc_id = int(raw_fc)
                except (TypeError, ValueError):
                    raise ValueError("Invalid farmer_contact_id format.")

                cursor.execute(
                    """
                    SELECT farmer_contact_id
                    FROM farmer_contacts
                    WHERE farmer_contact_id = %s
                      AND supplier_profile_id = %s
                    LIMIT 1
                    """,
                    [fc_id, supplier_profile_id],
                )
                if not cursor.fetchone():
                    raise ValueError("Selected supplier/farmer contact was not found or does not belong to your branch.")

                updates.append("farmer_contact_id = %s")
                params.append(fc_id)

            if not updates:
                return get_encoder_product(supplier_profile_id, product_id)

            params.extend([product_id, supplier_profile_id])
            sql = f"""
                UPDATE miller_products
                SET {', '.join(updates)}
                WHERE product_id = %s
                  AND supplier_profile_id = %s
            """
            cursor.execute(sql, params)

    return get_encoder_product(supplier_profile_id, product_id)


def process_unmilled_product(
    *,
    supplier_profile_id,
    product_id,
    expiry_date,
    stock_quantity,
    unit_cost,
    shelf_location,
):
    """
    Process an unmilled product into active stock.

    Allowed only when current status == 'unmilled'.

    Requires:
    - expiry_date
    - stock_quantity (>= 0)
    - unit_cost (>= 0)
    - shelf_location (non-empty)

    On success:
    - updates those fields
    - status = active
    - archive_reason = NULL

    Does NOT alter:
    - product_code
    - farmer_contact_id / supplier
    - inbound_purchase_history_id
    - order_date
    - arrival_date
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    # Validate required fields
    parsed_expiry = _parse_date(expiry_date, "Expiry date", required=True)
    _validate_future_date(parsed_expiry)
    parsed_stock = _parse_decimal(stock_quantity, "Stock quantity", required=True, strictly_positive=True)
    parsed_cost = _parse_decimal(unit_cost, "Unit cost", required=True, strictly_positive=True)
    clean_shelf = _clean_text(shelf_location)
    if not clean_shelf:
        raise ValueError("Shelf location is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id, status, stock_quantity
                FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [product_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Product not found.")

            current_status = str(row[1] or "").strip().lower()
            if current_status != "unmilled":
                raise ValueError(
                    f"Only unmilled products can be processed into active stock (current status: {current_status})."
                )

            current_stock = Decimal(str(row[2])) if row[2] is not None else Decimal("0")
            if parsed_stock > current_stock:
                raise ValueError(
                    f"Stock quantity cannot exceed the current unmilled stock of {_format_quantity(current_stock)} kg."
                )

            cursor.execute(
                """
                UPDATE miller_products
                SET expiry_date = %s,
                    stock_quantity = %s,
                    unit_cost = %s,
                    shelf_location = %s,
                    status = 'active',
                    archive_reason = NULL
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                """,
                [
                    parsed_expiry,
                    parsed_stock,
                    parsed_cost,
                    clean_shelf,
                    product_id,
                    supplier_profile_id,
                ],
            )

    return get_encoder_product(supplier_profile_id, product_id)


def archive_product(
    *,
    supplier_profile_id,
    product_id,
    reason,
):
    """
    Archive a product with a mandatory non-empty reason.
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    clean_reason = _clean_text(reason)
    if not clean_reason:
        raise ValueError("Archive reason is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id, status
                FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [product_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Product not found.")

            current_status = str(row[1] or "").strip().lower()
            if current_status == "unmilled":
                raise ValueError("Unmilled products cannot be archived. They must be processed into active stock first.")
            elif current_status == "archived":
                raise ValueError("Product is already archived.")
            elif current_status != "active":
                raise ValueError(f"Only active products can be archived (current status: {current_status}).")

            cursor.execute(
                """
                UPDATE miller_products
                SET status = 'archived',
                    archive_reason = %s
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                """,
                [clean_reason, product_id, supplier_profile_id],
            )

    return get_encoder_product(supplier_profile_id, product_id)


def restore_product(
    *,
    supplier_profile_id,
    product_id,
):
    """
    Restore an archived product back to active status.
    Only permitted when current status == 'archived'.
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id, status
                FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [product_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Product not found.")

            current_status = str(row[1] or "").strip().lower()
            if current_status != "archived":
                raise ValueError(
                    f"Only archived products can be restored (current status: {current_status})."
                )

            cursor.execute(
                """
                UPDATE miller_products
                SET status = 'active',
                    archive_reason = NULL
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                """,
                [product_id, supplier_profile_id],
            )

    return get_encoder_product(supplier_profile_id, product_id)


def delete_archived_product(
    *,
    supplier_profile_id,
    product_id,
):
    """
    Permanently delete a product.
    Only permitted when current status == 'archived'.
    """
    if not supplier_profile_id:
        raise ValueError("Supplier profile ID is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id, status, product_image
                FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                LIMIT 1
                """,
                [product_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Product not found.")

            current_status = str(row[1] or "").strip().lower()
            if current_status != "archived":
                raise ValueError(
                    f"Permanent deletion is only allowed for archived products (current status: {current_status})."
                )

            product_image_path = row[2]

            cursor.execute(
                """
                DELETE FROM miller_products
                WHERE product_id = %s
                  AND supplier_profile_id = %s
                """,
                [product_id, supplier_profile_id],
            )

    # Safely delete image file from disk if present
    if product_image_path:
        delete_product_image_file(product_image_path)

    return {"product_id": product_id, "deleted": True}

