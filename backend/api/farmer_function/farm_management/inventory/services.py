import re
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from zoneinfo import ZoneInfo

from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from .selectors import (
    get_farmer_inventory_product_details,
)


# ============================================================
# CONSTANTS
# ============================================================

VALID_PRODUCT_TYPES = {
    "unmilled_palay": "Unmilled Palay",
    "unmilled palay": "Unmilled Palay",
    "milled_rice": "Milled Rice",
    "milled rice": "Milled Rice",
}

VALID_ACQUISITION_SOURCE_TYPES = {
    "own_farm": "Own Farm",
    "own farm": "Own Farm",
    "other_source": "Other Source",
    "other source": "Other Source",
}

STATUS_ACTIVE = "active"
STATUS_ARCHIVED = "archived"


# ============================================================
# ERROR
# ============================================================

class InventoryManagementError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# ============================================================
# BASIC VALIDATION HELPERS
# ============================================================

def _text(value, *, required=False, field_name="Field", max_length=None):
    normalized = str(value or "").strip()

    if required and not normalized:
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )

    if max_length is not None and len(normalized) > max_length:
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} must not exceed {max_length} characters.",
            400,
        )

    return normalized


def _positive_decimal(value, *, required=False, field_name="Value"):
    if value in (None, ""):
        if required:
            raise InventoryManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )
        return None

    try:
        normalized = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} must be a valid number.",
            400,
        ) from exc

    if normalized <= 0:
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} must be greater than zero.",
            400,
        )

    return normalized


def _date(value, *, required=False, field_name="Date"):
    if value in (None, ""):
        if required:
            raise InventoryManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )
        return None

    normalized = parse_date(str(value).strip())
    if normalized is None:
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} must be a valid date.",
            400,
        )

    return normalized


# ============================================================
# ID HELPERS
# ============================================================

def _normalize_farmer_id(farmer_user_id):
    try:
        farmer_id = int(farmer_user_id)
    except (TypeError, ValueError) as exc:
        raise InventoryManagementError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        ) from exc

    if farmer_id <= 0:
        raise InventoryManagementError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        )

    return farmer_id


def _normalize_product_id(farm_product_id):
    try:
        product_id = int(farm_product_id)
    except (TypeError, ValueError) as exc:
        raise InventoryManagementError(
            "invalid_product",
            "Invalid inventory product ID.",
            400,
        ) from exc

    if product_id <= 0:
        raise InventoryManagementError(
            "invalid_product",
            "Invalid inventory product ID.",
            400,
        )

    return product_id


def _normalize_farm_id(farm_id):
    try:
        normalized = int(farm_id)
    except (TypeError, ValueError) as exc:
        raise InventoryManagementError(
            "invalid_farm",
            "Invalid Source Farm.",
            400,
        ) from exc

    if normalized <= 0:
        raise InventoryManagementError(
            "invalid_farm",
            "Invalid Source Farm.",
            400,
        )

    return normalized


# ============================================================
# FARMER ACCOUNT VALIDATION
# ============================================================

def _assert_active_farmer(cursor, farmer_user_id):
    cursor.execute(
        """
        SELECT 1
        FROM users
        WHERE user_id = %s
          AND LOWER(user_role) = 'farmer'
          AND LOWER(status) = 'active'
        LIMIT 1
        """,
        [farmer_user_id],
    )
    if not cursor.fetchone():
        raise InventoryManagementError(
            "authentication_required",
            "Farmer account is not active. Please sign in again.",
            401,
        )


# ============================================================
# SOURCE FARM VALIDATION
# ============================================================

def _get_owned_source_farm(cursor, farmer_user_id, farm_id):
    cursor.execute(
        """
        SELECT
            f.farm_profile_id AS farm_id,
            f.farm_lot_name,
            COALESCE(s.farm_status, 'Active') AS farm_status
        FROM farm_profile f
        LEFT JOIN existing_grainrise_farmer_farm_status s
            ON s.farm_profile_id = f.farm_profile_id
        WHERE f.farm_profile_id = %s
          AND f.user_id = %s
        LIMIT 1
        """,
        [farm_id, farmer_user_id],
    )
    row = cursor.fetchone()
    if not row:
        raise InventoryManagementError(
            "source_farm_not_found",
            "The selected Source Farm could not be found under your Farmer account.",
            404,
        )

    return {
        "farm_id": row[0],
        "farm_name": row[1],
        "farm_status": row[2],
    }


def _get_farmer_default_farm(cursor, farmer_user_id):
    cursor.execute(
        """
        SELECT farm_profile_id
        FROM farm_profile
        WHERE user_id = %s
        ORDER BY farm_profile_id ASC
        LIMIT 1
        """,
        [farmer_user_id],
    )
    row = cursor.fetchone()
    if not row:
        raise InventoryManagementError(
            "no_farm_profile",
            "You must register at least one farm profile before managing inventory.",
            400,
        )
    return row[0]


# ============================================================
# PRODUCT LOCK
# ============================================================

def _lock_owned_product(cursor, farmer_user_id, farm_product_id):
    cursor.execute(
        """
        SELECT
            fp.farm_product_id,
            fp.farm_profile_id,
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.record_origin,
            fp.source_type,
            fp.stock_quantity_kg,
            fp.selling_price_per_kg,
            fp.product_status
        FROM existing_grainrise_farmer_products fp
        INNER JOIN farm_profile f
            ON f.farm_profile_id = fp.farm_profile_id
        WHERE fp.farm_product_id = %s
          AND f.user_id = %s
        FOR UPDATE
        """,
        [farm_product_id, farmer_user_id],
    )
    row = cursor.fetchone()
    if not row:
        raise InventoryManagementError(
            "product_not_found",
            "Inventory product not found.",
            404,
        )

    return {
        "farm_product_id": row[0],
        "farm_profile_id": row[1],
        "product_code": row[2],
        "product_type": row[3],
        "rice_variety": row[4],
        "record_origin": row[5],
        "source_type": row[6],
        "stock_quantity_kg": row[7],
        "selling_price_per_kg": row[8],
        "status": row[9],
    }


# ============================================================
# PRODUCT CODE GENERATOR
# Format: [FARM INITIALS]-[OWNER INITIALS]-[MMDDYYYY]-[HHMM]
# Example: Desmond Farm + Cherry Abanid + 10/29/2026 02:26 AM -> DF-CA-10292026-0226
# ============================================================

def _get_farm_initials(farm_name):
    if not farm_name:
        return "FM"
    words = [w for w in re.split(r"[^A-Za-z0-9]+", str(farm_name).strip()) if w]
    if not words:
        return "FM"
    if len(words) == 1:
        return words[0][:2].upper() if len(words[0]) >= 2 else (words[0] + "F").upper()
    return "".join(w[0] for w in words).upper()


def _get_owner_initials(first_name, last_name):
    fn = str(first_name or "").strip()
    ln = str(last_name or "").strip()
    res = ""
    if fn:
        res += fn[0].upper()
    if ln:
        res += ln[0].upper()
    return res or "FM"


def _generate_manual_product_code(cursor, farm_name, first_name, last_name):
    """
    Format: [FARM INITIALS]-[OWNER INITIALS]-[MMDDYYYY]-[HHMM]
    Example: DF-CA-10292026-0226

    Authoritatively generated in Asia/Manila timezone with 24-hour HHMM.
    Handles same-minute collisions safely by appending sequence (-01, -02, etc.)
    without silently changing the approved format.
    """
    farm_init = _get_farm_initials(farm_name)
    owner_init = _get_owner_initials(first_name, last_name)
    manila_tz = ZoneInfo("Asia/Manila")
    now_manila = timezone.now().astimezone(manila_tz)
    date_str = now_manila.strftime("%m%d%Y")
    time_str = now_manila.strftime("%H%M")

    base_code = f"{farm_init}-{owner_init}-{date_str}-{time_str}"

    cursor.execute(
        "SELECT 1 FROM existing_grainrise_farmer_products WHERE product_code = %s LIMIT 1",
        [base_code],
    )
    if not cursor.fetchone():
        return base_code

    # Same-minute collision: append sequential sequence while preserving format
    seq = 1
    while True:
        candidate = f"{base_code}-{seq:02d}"
        cursor.execute(
            "SELECT 1 FROM existing_grainrise_farmer_products WHERE product_code = %s LIMIT 1",
            [candidate],
        )
        if not cursor.fetchone():
            return candidate
        seq += 1


# ============================================================
# CREATE MANUALLY ADDED PRODUCT
# ============================================================

@transaction.atomic
def add_inventory_product(farmer_user_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)

    raw_product_type = _text(
        data.get("product_type"),
        required=True,
        field_name="Product Type",
    ).lower()

    if raw_product_type not in VALID_PRODUCT_TYPES:
        raise InventoryManagementError(
            "validation_error",
            "Product Type must be either Unmilled Palay or Milled Rice.",
            400,
        )
    product_type_db = VALID_PRODUCT_TYPES[raw_product_type]

    rice_variety = _text(
        data.get("rice_variety"),
        required=True,
        field_name="Rice Variety / Variant",
        max_length=100,
    )

    product_image = _text(data.get("product_image"))
    description = _text(data.get("description") or data.get("product_description"))
    product_grade = _text(data.get("product_grade"), max_length=100)

    stock_quantity = _positive_decimal(
        data.get("stock_quantity_kg") or data.get("total_stock_quantity_kg") or data.get("available_quantity_kg"),
        required=True,
        field_name="Stock Quantity",
    )

    selling_price = _positive_decimal(
        data.get("selling_price_per_kg") or data.get("selling_price"),
        required=False,
        field_name="Selling Price per kg",
    )

    raw_source_type = _text(
        data.get("acquisition_source_type") or data.get("source_type"),
        required=True,
        field_name="Source Type",
    ).lower()

    if raw_source_type not in VALID_ACQUISITION_SOURCE_TYPES:
        raise InventoryManagementError(
            "validation_error",
            "Source Type must be either Own Farm or Other Source.",
            400,
        )
    source_type_db = VALID_ACQUISITION_SOURCE_TYPES[raw_source_type]

    harvest_acquisition_date = _date(
        data.get("harvest_acquisition_date"),
        required=False,
        field_name="Harvest / Acquisition Date",
    ) or timezone.now().date()

    source_remarks = _text(
        data.get("source_acquisition_remarks") or data.get("acquisition_remarks")
    )

    with connection.cursor() as cursor:
        _assert_active_farmer(cursor, farmer_id)

        target_farm_profile_id = None
        farm_name_for_code = ""

        if source_type_db == "Own Farm":
            raw_source_farm_id = data.get("source_farm_id") or data.get("farm_id")
            if raw_source_farm_id in (None, ""):
                raise InventoryManagementError(
                    "validation_error",
                    "Source Farm is required when Source Type is Own Farm.",
                    400,
                )
            source_farm_id = _normalize_farm_id(raw_source_farm_id)
            farm_info = _get_owned_source_farm(cursor, farmer_id, source_farm_id)
            target_farm_profile_id = source_farm_id
            farm_name_for_code = farm_info.get("farm_name") or "Farm Lot"
        else:
            # For Other Source, associate with the farmer's default farm profile
            target_farm_profile_id = _get_farmer_default_farm(cursor, farmer_id)
            farm_name_for_code = "Other Source"

        # Retrieve farmer user name for owner initials
        cursor.execute(
            "SELECT first_name, last_name FROM users WHERE user_id = %s LIMIT 1",
            [farmer_id],
        )
        user_row = cursor.fetchone()
        first_name = user_row[0] if user_row else ""
        last_name = user_row[1] if user_row else ""

        # Authoritatively generate code matching [FARM INITIALS]-[OWNER INITIALS]-[MMDDYYYY]-[HHMM]
        product_code = _generate_manual_product_code(
            cursor,
            farm_name_for_code,
            first_name,
            last_name,
        )

        cursor.execute(
            """
            INSERT INTO existing_grainrise_farmer_products (
                farm_profile_id,
                crop_cycle_id,
                product_code,
                product_type,
                rice_variety,
                product_grade,
                product_description,
                product_image,
                record_origin,
                source_type,
                acquisition_remarks,
                harvest_acquisition_date,
                stock_quantity_kg,
                selling_price_per_kg,
                product_status
            )
            VALUES (
                %s, NULL, %s, %s, %s, %s, %s, %s, 'Manually Added', %s, %s, %s, %s, %s, 'active'
            )
            """,
            [
                target_farm_profile_id,
                product_code,
                product_type_db,
                rice_variety,
                product_grade or None,
                description or None,
                product_image or None,
                source_type_db,
                source_remarks or None,
                harvest_acquisition_date,
                stock_quantity,
                selling_price,
            ],
        )

        created_product_id = cursor.lastrowid

    return get_farmer_inventory_product_details(farmer_id, created_product_id)


# ============================================================
# EDIT INVENTORY PRODUCT
# ============================================================

@transaction.atomic
def update_inventory_product(farmer_user_id, farm_product_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    product_id = _normalize_product_id(farm_product_id)

    product_image = _text(data.get("product_image"))
    description = _text(data.get("description") or data.get("product_description"))
    product_grade = _text(data.get("product_grade"), max_length=100)

    selling_price_raw = data.get("selling_price_per_kg") or data.get("selling_price")
    selling_price = _positive_decimal(
        selling_price_raw,
        required=False,
        field_name="Selling Price per kg",
    )

    with connection.cursor() as cursor:
        _assert_active_farmer(cursor, farmer_id)
        product = _lock_owned_product(cursor, farmer_id, product_id)

        if product["status"] != STATUS_ACTIVE:
            raise InventoryManagementError(
                "product_archived",
                "Archived products cannot be edited. Restore this product first.",
                409,
            )

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_products
            SET
                product_image = %s,
                product_description = %s,
                product_grade = %s,
                selling_price_per_kg = %s
            WHERE farm_product_id = %s
              AND product_status = 'active'
            """,
            [
                product_image or None,
                description or None,
                product_grade or None,
                selling_price,
                product_id,
            ],
        )

        if cursor.rowcount != 1:
            raise InventoryManagementError(
                "product_update_failed",
                "The product could not be updated. Please refresh and try again.",
                409,
            )

    return get_farmer_inventory_product_details(farmer_id, product_id)


# ============================================================
# ARCHIVE PRODUCT
# ============================================================

@transaction.atomic
def archive_inventory_product(farmer_user_id, farm_product_id, reason="Archived by farmer"):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    product_id = _normalize_product_id(farm_product_id)

    clean_reason = _text(
        reason,
        required=True,
        field_name="Archive Reason",
    )

    with connection.cursor() as cursor:
        _assert_active_farmer(cursor, farmer_id)
        product = _lock_owned_product(cursor, farmer_id, product_id)

        if product["status"] == STATUS_ARCHIVED:
            raise InventoryManagementError(
                "already_archived",
                "This product is already archived.",
                409,
            )

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_products
            SET
                product_status = 'archived',
                archive_reason = %s,
                archived_at = CURRENT_TIMESTAMP
            WHERE farm_product_id = %s
              AND product_status = 'active'
            """,
            [
                clean_reason,
                product_id,
            ],
        )

        if cursor.rowcount != 1:
            raise InventoryManagementError(
                "archive_failed",
                "The product could not be archived. Please refresh and try again.",
                409,
            )

    return get_farmer_inventory_product_details(farmer_id, product_id)


# ============================================================
# RESTORE PRODUCT
# ============================================================

@transaction.atomic
def restore_inventory_product(farmer_user_id, farm_product_id):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    product_id = _normalize_product_id(farm_product_id)

    with connection.cursor() as cursor:
        _assert_active_farmer(cursor, farmer_id)
        product = _lock_owned_product(cursor, farmer_id, product_id)

        if product["status"] == STATUS_ACTIVE:
            raise InventoryManagementError(
                "already_active",
                "This product is already active.",
                409,
            )

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_products
            SET
                product_status = 'active',
                archive_reason = NULL,
                archived_at = NULL
            WHERE farm_product_id = %s
              AND product_status = 'archived'
            """,
            [
                product_id,
            ],
        )

        if cursor.rowcount != 1:
            raise InventoryManagementError(
                "restore_failed",
                "The product could not be restored. Please refresh and try again.",
                409,
            )

    return get_farmer_inventory_product_details(farmer_id, product_id)
