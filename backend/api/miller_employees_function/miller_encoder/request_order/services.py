import datetime
import json
import logging
import os
from pathlib import Path
import secrets

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .selectors import (
    get_branch_business_info,
    get_product_for_request,
)

logger = logging.getLogger("grainrise.encoder.request_orders")


class RequestOrderValidationError(ValueError):
    """Raised when request order data validation fails."""
    pass


def generate_batch_number(product_name, business_name, cursor=None):
    """
    Generate server-side batch number according to:
    PPP - BB - YYYYMMDD - HHMM

    PPP = first 3 alphabetic letters of product_name (uppercase)
    BB = first 2 alphabetic letters of business_name (uppercase)
    Date and time in Philippine / local timezone.
    Guarantees uniqueness against inbound_order.batch_no.
    """
    clean_p = "".join(c for c in (product_name or "") if c.isalpha()).upper()
    ppp = clean_p[:3] if len(clean_p) >= 3 else clean_p.ljust(3, "X")

    clean_b = "".join(c for c in (business_name or "") if c.isalpha()).upper()
    bb = clean_b[:2] if len(clean_b) >= 2 else clean_b.ljust(2, "X")

    now = timezone.localtime(timezone.now())
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M")
    base_batch = f"{ppp} - {bb} - {date_str} - {time_str}"

    if not cursor:
        with connection.cursor() as cur:
            return _ensure_unique_batch_no(cur, base_batch)
    return _ensure_unique_batch_no(cursor, base_batch)


def _ensure_unique_batch_no(cursor, base_batch):
    candidate = base_batch
    suffix = 1
    while True:
        cursor.execute("SELECT 1 FROM inbound_order WHERE batch_no = %s LIMIT 1", [candidate])
        if not cursor.fetchone():
            return candidate
        candidate = f"{base_batch}-{suffix:02d}"
        suffix += 1


def save_request_order_attachment(file_obj, supplier_profile_id):
    """
    Save an uploaded replacement image attachment to MEDIA_ROOT/inbound_orders/<supplier_profile_id>/
    Returns POSIX relative path.
    Crucially does NOT modify miller_products.product_image.
    """
    if not file_obj or not hasattr(file_obj, "chunks"):
        return None

    orig_name = getattr(file_obj, "name", "") or ""
    extension = os.path.splitext(orig_name)[1].lower() or ".jpg"
    unique_name = f"req_{secrets.token_hex(12)}{extension}"

    rel_directory = Path("inbound_orders") / str(supplier_profile_id)
    abs_directory = Path(settings.MEDIA_ROOT) / rel_directory
    abs_directory.mkdir(parents=True, exist_ok=True)

    abs_file_path = abs_directory / unique_name
    with abs_file_path.open("wb") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)

    return (rel_directory / unique_name).as_posix()


def validate_request_order_dates(target_arrival_date, required_by_date):
    """
    Enforce date rules:
    - Target Arrival Date >= today + 3 days
    - Required By Date >= Target Arrival Date + 4 days
    """
    today = timezone.localdate()

    if isinstance(target_arrival_date, str):
        try:
            target_arrival_date = datetime.date.fromisoformat(target_arrival_date.strip())
        except ValueError:
            raise RequestOrderValidationError("Target Arrival Date must be a valid date (YYYY-MM-DD).")

    if isinstance(required_by_date, str):
        try:
            required_by_date = datetime.date.fromisoformat(required_by_date.strip())
        except ValueError:
            raise RequestOrderValidationError("Required By Date must be a valid date (YYYY-MM-DD).")

    min_target = today + datetime.timedelta(days=3)
    if target_arrival_date < min_target:
        raise RequestOrderValidationError(
            f"Target Arrival Date must be at least 3 days from today (earliest allowed: {min_target.isoformat()})."
        )

    min_required = target_arrival_date + datetime.timedelta(days=4)
    if required_by_date < min_required:
        raise RequestOrderValidationError(
            f"Required By Date must be at least 4 days after Target Arrival Date (earliest allowed: {min_required.isoformat()})."
        )

    return target_arrival_date, required_by_date


def validate_forecast_data(forecast_data, expected_product_id=None, expected_supplier_id=None):
    """
    Validate completeness of demand forecasting data before creating a request order.
    Rejects missing or incomplete forecast data with a 400 error.

    At minimum requires:
    - recommended_quantity > 0
    - baseline_forecast_quantity present/valid
    - forecast_series present
    - climate snapshot/data present
    - explanation non-empty
    - competition and importation snapshot structures exist
    - forecast tied to the matching product and supplier
    """
    error_msg = "Demand forecasting must be completed before submitting this request."

    if not forecast_data or not isinstance(forecast_data, dict):
        raise RequestOrderValidationError(error_msg)

    # 1. recommended_quantity > 0
    rec_qty = forecast_data.get("recommended_quantity")
    if rec_qty is None:
        raise RequestOrderValidationError(error_msg)
    try:
        rec_qty = float(rec_qty)
    except (TypeError, ValueError):
        raise RequestOrderValidationError(error_msg)
    if rec_qty <= 0:
        raise RequestOrderValidationError(error_msg)

    # 2. baseline_forecast_quantity present and valid
    base_qty = forecast_data.get("baseline_forecast_quantity")
    if base_qty is None:
        raise RequestOrderValidationError(error_msg)
    try:
        base_qty = float(base_qty)
    except (TypeError, ValueError):
        raise RequestOrderValidationError(error_msg)
    if base_qty < 0:
        raise RequestOrderValidationError(error_msg)

    # 3. forecast_series present
    forecast_series = forecast_data.get("forecast_series")
    if not forecast_series or not isinstance(forecast_series, (dict, list)):
        raise RequestOrderValidationError(error_msg)

    # 4. climate snapshot / data present
    climate = forecast_data.get("climate_snapshot") or forecast_data.get("cds_climate")
    if not climate or not isinstance(climate, (dict, list)):
        raise RequestOrderValidationError(error_msg)

    # 5. explanation non-empty
    explanation = str(forecast_data.get("explanation") or "").strip()
    if not explanation:
        raise RequestOrderValidationError(error_msg)

    # 6. competition / importation snapshot structures must exist
    sales_comp = forecast_data.get("sales_competition_snapshot")
    supply_comp = forecast_data.get("supply_competition_snapshot")
    importation = forecast_data.get("importation_snapshot")

    if sales_comp is None or supply_comp is None or importation is None:
        raise RequestOrderValidationError(error_msg)
    if (
        not isinstance(sales_comp, (dict, list))
        or not isinstance(supply_comp, (dict, list))
        or not isinstance(importation, (dict, list))
    ):
        raise RequestOrderValidationError(error_msg)

    # 7. Prevent stale / mismatched forecast
    if expected_product_id is not None and "product_id" in forecast_data and forecast_data["product_id"] is not None:
        try:
            if int(forecast_data["product_id"]) != int(expected_product_id):
                raise RequestOrderValidationError(error_msg)
        except (ValueError, TypeError):
            raise RequestOrderValidationError(error_msg)

    if expected_supplier_id is not None and "supplier_id" in forecast_data and forecast_data["supplier_id"] is not None:
        try:
            if int(forecast_data["supplier_id"]) != int(expected_supplier_id):
                raise RequestOrderValidationError(error_msg)
        except (ValueError, TypeError):
            raise RequestOrderValidationError(error_msg)

    return {
        "rec_qty": rec_qty,
        "base_qty": base_qty,
        "explanation": explanation,
        "climate": climate,
        "forecast_series": forecast_series,
        "sales_comp": sales_comp,
        "supply_comp": supply_comp,
        "importation": importation,
    }


def create_encoder_request_order(
    supplier_profile_id,
    supplier_employee_id,
    product_id,
    supplier_id,
    order_quantity,
    stock_quantity,
    target_arrival_date,
    required_by_date,
    notes=None,
    replacement_file=None,
    forecast_data=None,
):
    """
    Create a complete request order for GrainRise Miller Encoder.
    Executes in a single transaction.atomic():
    1. inbound_order (status = 'requested')
    2. miller_inbound_date_requirements
    3. miller_demand_forecasting_support_from_request_orders
    """
    # 1. Validate employee and branch
    if not supplier_profile_id or not supplier_employee_id:
        raise RequestOrderValidationError("Encoder identity and branch scoping are required.")

    branch_info = get_branch_business_info(supplier_profile_id)
    if not branch_info:
        raise RequestOrderValidationError("Authenticated branch profile could not be found.")

    business_name = branch_info.get("business_name") or "GrainRise"

    # 2. Validate product & supplier
    product = get_product_for_request(
        supplier_profile_id=supplier_profile_id,
        product_id=product_id,
        supplier_id=supplier_id,
    )
    if not product:
        raise RequestOrderValidationError(
            "Selected product not found or does not belong to your authenticated branch."
        )

    if not product.get("is_eligible"):
        raise RequestOrderValidationError(
            f"Selected product is healthy and not eligible for request orders: {product.get('eligibility_reason')}."
        )

    # 3. Validate quantities
    try:
        order_qty_val = float(order_quantity)
    except (TypeError, ValueError):
        raise RequestOrderValidationError("Order quantity must be a valid number.")

    if order_qty_val <= 0:
        raise RequestOrderValidationError("Order quantity must be greater than 0.")

    # 4. Validate dates
    clean_target_date, clean_required_date = validate_request_order_dates(
        target_arrival_date=target_arrival_date,
        required_by_date=required_by_date,
    )

    # 5. Validate forecast result exists and is complete
    val_fc = validate_forecast_data(
        forecast_data,
        expected_product_id=product_id,
        expected_supplier_id=supplier_id,
    )
    rec_qty = val_fc["rec_qty"]
    base_qty = val_fc["base_qty"]
    explanation = val_fc["explanation"]
    climate = val_fc["climate"]
    forecast_series = val_fc["forecast_series"]
    sales_comp = val_fc["sales_comp"]
    supply_comp = val_fc["supply_comp"]
    importation = val_fc["importation"]

    # Compute upcoming month date (first day of upcoming month)
    today = timezone.localdate()
    if today.month == 12:
        forecast_month = datetime.date(today.year + 1, 1, 1)
    else:
        forecast_month = datetime.date(today.year, today.month + 1, 1)

    # 6. Save replacement file if provided, else use current product image
    # Crucially do NOT modify miller_products.product_image!
    if replacement_file:
        product_photo = save_request_order_attachment(replacement_file, supplier_profile_id)
    else:
        product_photo = product.get("product_image") or None

    # Merge product description with additional notes if provided
    product_desc = str(product.get("product_description") or "").strip()
    clean_notes = str(notes or "").strip()
    if clean_notes:
        if product_desc:
            combined_desc = f"{product_desc}\n\nAdditional Notes:\n{clean_notes}"
        else:
            combined_desc = clean_notes
    else:
        combined_desc = product_desc or None

    # 7. Atomic transaction
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Generate unique batch number
            batch_no = generate_batch_number(
                product_name=product.get("product_name"),
                business_name=business_name,
                cursor=cursor,
            )

            # Insert into inbound_order
            cursor.execute(
                """
                INSERT INTO inbound_order (
                    supplier_profile_id,
                    farmer_contact_id,
                    batch_no,
                    product_name,
                    product_description,
                    product_photo,
                    ordered_quantity,
                    expected_arrival_date,
                    status,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'requested', NOW(), NOW())
                """,
                [
                    supplier_profile_id,
                    product.get("farmer_contact_id"),
                    batch_no,
                    product.get("product_name"),
                    combined_desc,
                    product_photo,
                    order_qty_val,
                    clean_target_date,
                ],
            )
            inbound_order_id = cursor.lastrowid

            # Insert into miller_inbound_date_requirements
            cursor.execute(
                """
                INSERT INTO miller_inbound_date_requirements (
                    inbound_order_id,
                    supplier_profile_id,
                    set_by_employee_id,
                    adjusted_by_user_id,
                    target_arrival_date,
                    required_by_date,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, NULL, %s, %s, NOW(), NOW())
                """,
                [
                    inbound_order_id,
                    supplier_profile_id,
                    supplier_employee_id,
                    clean_target_date,
                    clean_required_date,
                ],
            )

            # Insert into miller_demand_forecasting_support_from_request_orders
            climate_json = json.dumps(climate)
            sales_comp_json = json.dumps(sales_comp)
            supply_comp_json = json.dumps(supply_comp)
            importation_json = json.dumps(importation)
            series_json = json.dumps(forecast_series)

            cursor.execute(
                """
                INSERT INTO miller_demand_forecasting_support_from_request_orders (
                    inbound_order_id,
                    supplier_profile_id,
                    miller_product_id,
                    generated_by_employee_id,
                    forecast_month,
                    recommended_quantity,
                    baseline_forecast_quantity,
                    climate_snapshot,
                    sales_competition_snapshot,
                    supply_competition_snapshot,
                    importation_snapshot,
                    forecast_series,
                    explanation,
                    generated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                [
                    inbound_order_id,
                    supplier_profile_id,
                    product_id,
                    supplier_employee_id,
                    forecast_month,
                    round(rec_qty, 2),
                    round(base_qty, 2),
                    climate_json,
                    sales_comp_json,
                    supply_comp_json,
                    importation_json,
                    series_json,
                    explanation,
                ],
            )
            forecast_support_id = cursor.lastrowid

    logger.info(
        "Successfully created request order %s (batch %s) by employee %s",
        inbound_order_id,
        batch_no,
        supplier_employee_id,
    )

    return {
        "inbound_order_id": inbound_order_id,
        "batch_no": batch_no,
        "product_name": product.get("product_name"),
        "ordered_quantity": order_qty_val,
        "target_arrival_date": str(clean_target_date),
        "required_by_date": str(clean_required_date),
        "product_photo": product_photo,
        "forecast_support_id": forecast_support_id,
        "status": "requested",
    }

