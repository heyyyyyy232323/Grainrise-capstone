from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.db import connection, transaction
from django.utils.dateparse import parse_date

from .selectors import (
    get_farmer_inventory_product_details,
)


# ============================================================
# CONSTANTS
# ============================================================

VALID_PRODUCT_TYPES = {
    "unmilled_palay",
    "milled_rice",
}


VALID_ACQUISITION_SOURCE_TYPES = {
    "own_farm",
    "other_source",
}


STATUS_ACTIVE = "active"
STATUS_ARCHIVED = "archived"


# ============================================================
# ERROR
# ============================================================

class InventoryManagementError(Exception):
    """
    Controlled Farmer Inventory business error.

    code:
        Stable backend identifier.

    message:
        User-friendly frontend message.

    status:
        Suggested HTTP status code.
    """

    def __init__(
        self,
        code,
        message,
        status=400,
    ):
        super().__init__(
            message
        )

        self.code = code
        self.message = message
        self.status = status


# ============================================================
# BASIC VALIDATION HELPERS
# ============================================================

def _text(
    value,
    *,
    required=False,
    field_name="Field",
    max_length=None,
):
    normalized = str(
        value or ""
    ).strip()


    if (
        required
        and not normalized
    ):
        raise InventoryManagementError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )


    if (
        max_length is not None
        and len(normalized) > max_length
    ):
        raise InventoryManagementError(
            "validation_error",
            (
                f"{field_name} must not exceed "
                f"{max_length} characters."
            ),
            400,
        )


    return normalized


def _positive_decimal(
    value,
    *,
    required=False,
    field_name="Value",
):
    if value in (
        None,
        "",
    ):
        if required:
            raise InventoryManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )

        return None


    try:
        normalized = Decimal(
            str(
                value
            )
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise InventoryManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "a valid number."
            ),
            400,
        ) from exc


    if normalized <= 0:
        raise InventoryManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "greater than zero."
            ),
            400,
        )


    return normalized


def _date(
    value,
    *,
    required=False,
    field_name="Date",
):
    if value in (
        None,
        "",
    ):
        if required:
            raise InventoryManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )

        return None


    normalized = parse_date(
        str(
            value
        ).strip()
    )


    if normalized is None:
        raise InventoryManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "a valid date."
            ),
            400,
        )


    return normalized


# ============================================================
# ID HELPERS
# ============================================================

def _normalize_farmer_id(
    farmer_user_id,
):
    try:
        farmer_id = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
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


def _normalize_product_id(
    farm_product_id,
):
    try:
        product_id = int(
            farm_product_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
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


def _normalize_farm_id(
    farm_id,
):
    try:
        normalized = int(
            farm_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
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

def _assert_active_farmer(
    cursor,
    farmer_user_id,
):
    """
    Defense-in-depth.

    farmer_required already protects the HTTP endpoint, but
    Inventory services also verify the account before writes.
    """

    cursor.execute(
        """
        SELECT 1
        FROM users
        WHERE user_id = %s
          AND user_role::text = 'farmer'
          AND status::text = 'active'
        LIMIT 1
        """,
        [
            farmer_user_id,
        ],
    )


    if not cursor.fetchone():
        raise InventoryManagementError(
            "authentication_required",
            (
                "Farmer account is not active. "
                "Please sign in again."
            ),
            401,
        )


# ============================================================
# SOURCE FARM VALIDATION
# ============================================================

def _get_owned_source_farm(
    cursor,
    farmer_user_id,
    farm_id,
):
    """
    Return one source farm only when it belongs to the
    authenticated Farmer.
    """

    cursor.execute(
        """
        SELECT
            farm_id,
            farm_name,
            farm_status
        FROM farmer_farms
        WHERE farm_id = %s
          AND user_id = %s
        LIMIT 1
        """,
        [
            farm_id,
            farmer_user_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        raise InventoryManagementError(
            "source_farm_not_found",
            (
                "The selected Source Farm could not be "
                "found under your Farmer account."
            ),
            404,
        )


    return {
        "farm_id":
            row[0],

        "farm_name":
            row[1],

        "farm_status":
            row[2],
    }


# ============================================================
# PRODUCT LOCK
# ============================================================

def _lock_owned_product(
    cursor,
    farmer_user_id,
    farm_product_id,
):
    """
    Lock one Farmer Inventory product.

    Prevents another request from modifying the same product
    at the same time.

    Ownership is always checked.
    """

    cursor.execute(
        """
        SELECT
            farm_product_id,
            user_id,
            product_code,
            product_type,
            rice_variety,
            record_source_type,
            acquisition_source_type,
            source_farm_id,
            source_crop_cycle_id,
            total_stock_quantity_kg,
            reserved_committed_quantity_kg,
            available_quantity_kg,
            stock_level,
            selling_price_per_kg,
            status
        FROM farm_products
        WHERE farm_product_id = %s
          AND user_id = %s
        FOR UPDATE
        """,
        [
            farm_product_id,
            farmer_user_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        raise InventoryManagementError(
            "product_not_found",
            "Inventory product not found.",
            404,
        )


    return {
        "farm_product_id":
            row[0],

        "user_id":
            row[1],

        "product_code":
            row[2],

        "product_type":
            row[3],

        "rice_variety":
            row[4],

        "record_source_type":
            row[5],

        "acquisition_source_type":
            row[6],

        "source_farm_id":
            row[7],

        "source_crop_cycle_id":
            row[8],

        "total_stock_quantity_kg":
            row[9],

        "reserved_committed_quantity_kg":
            row[10],

        "available_quantity_kg":
            row[11],

        "stock_level":
            row[12],

        "selling_price_per_kg":
            row[13],

        "status":
            row[14],
    }


# ============================================================
# PRODUCT CODE
# ============================================================

def _generate_manual_product_code():
    """
    System-generated Product Code for manually added products.

    Example:

        FRM-MAN-A1B2C3D4E5F6

    The UUID segment makes collisions extremely unlikely.
    The database UNIQUE constraint remains the final safeguard.
    """

    suffix = (
        uuid4()
        .hex[:12]
        .upper()
    )


    return (
        f"FRM-MAN-{suffix}"
    )


# ============================================================
# CREATE MANUALLY ADDED PRODUCT
# ============================================================

@transaction.atomic
def add_inventory_product(
    farmer_user_id,
    data,
):
    """
    Inventory > Add Product.

    MANUAL INPUT:

        Product Type
        Rice Variety / Variant
        Stock Quantity
        Selling Price per kg
        Product Image
        Description
        Product Grade / Classification

        Source Type:
            Own Farm
            Other Source

        Source Farm
            required only for Own Farm

        Harvest / Acquisition Date

        Source / Acquisition Remarks
            primarily for Other Source


    AUTOMATIC:

        Product Code
        record_source_type = manually_added
        reserved quantity = 0
        available quantity = generated by PostgreSQL
        stock level = in_stock
        status = active
        created_at
        updated_at
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    # ========================================================
    # PRODUCT INFORMATION
    # ========================================================

    product_type = (
        _text(
            data.get(
                "product_type"
            ),
            required=True,
            field_name="Product Type",
        ).lower()
    )


    if (
        product_type
        not in VALID_PRODUCT_TYPES
    ):
        raise InventoryManagementError(
            "validation_error",
            (
                "Product Type must be either "
                "Unmilled Palay or Milled Rice."
            ),
            400,
        )


    rice_variety = _text(
        data.get(
            "rice_variety"
        ),
        required=True,
        field_name=(
            "Rice Variety / Variant"
        ),
        max_length=100,
    )


    product_image = _text(
        data.get(
            "product_image"
        ),
    )


    description = _text(
        data.get(
            "description"
        ),
    )


    product_grade = _text(
        data.get(
            "product_grade"
        ),
        max_length=100,
    )


    # ========================================================
    # STOCK
    # ========================================================

    stock_quantity = (
        _positive_decimal(
            data.get(
                "stock_quantity_kg"
            ),
            required=True,
            field_name=(
                "Stock Quantity"
            ),
        )
    )


    # ========================================================
    # COMMERCIAL
    # ========================================================

    selling_price = (
        _positive_decimal(
            data.get(
                "selling_price_per_kg"
            ),
            required=True,
            field_name=(
                "Selling Price per kg"
            ),
        )
    )


    # ========================================================
    # SOURCE
    # ========================================================

    acquisition_source_type = (
        _text(
            data.get(
                "acquisition_source_type"
            ),
            required=True,
            field_name="Source Type",
        ).lower()
    )


    if (
        acquisition_source_type
        not in VALID_ACQUISITION_SOURCE_TYPES
    ):
        raise InventoryManagementError(
            "validation_error",
            (
                "Source Type must be either "
                "Own Farm or Other Source."
            ),
            400,
        )


    harvest_acquisition_date = (
        _date(
            data.get(
                "harvest_acquisition_date"
            ),
            required=True,
            field_name=(
                "Harvest / Acquisition Date"
            ),
        )
    )


    source_remarks = _text(
        data.get(
            "source_acquisition_remarks"
        ),
    )


    source_farm_id = None


    if (
        acquisition_source_type
        == "own_farm"
    ):
        raw_source_farm_id = (
            data.get(
                "source_farm_id"
            )
        )


        if raw_source_farm_id in (
            None,
            "",
        ):
            raise InventoryManagementError(
                "validation_error",
                (
                    "Source Farm is required when "
                    "Source Type is Own Farm."
                ),
                400,
            )


        source_farm_id = (
            _normalize_farm_id(
                raw_source_farm_id
            )
        )


    # ========================================================
    # WRITE
    # ========================================================

    with connection.cursor() as cursor:

        # ----------------------------------------------------
        # ACTIVE FARMER
        # ----------------------------------------------------

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        # ----------------------------------------------------
        # SOURCE FARM OWNERSHIP
        # ----------------------------------------------------

        if (
            acquisition_source_type
            == "own_farm"
        ):
            _get_owned_source_farm(
                cursor,
                farmer_id,
                source_farm_id,
            )


        # ----------------------------------------------------
        # OTHER SOURCE
        #
        # No Farmer farm/crop cycle should be linked.
        # ----------------------------------------------------

        if (
            acquisition_source_type
            == "other_source"
        ):
            source_farm_id = None


        # ----------------------------------------------------
        # PRODUCT CODE
        # ----------------------------------------------------

        product_code = (
            _generate_manual_product_code()
        )


        # ----------------------------------------------------
        # INSERT PRODUCT
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO farm_products (
                user_id,

                product_code,
                product_image,
                product_type,
                rice_variety,
                product_grade,
                description,

                record_source_type,
                acquisition_source_type,

                source_farm_id,
                source_crop_cycle_id,

                harvest_acquisition_date,
                source_acquisition_remarks,

                total_stock_quantity_kg,
                reserved_committed_quantity_kg,

                stock_level,

                selling_price_per_kg,

                status,

                created_at,
                updated_at
            )
            VALUES (
                %s,

                %s,
                %s,
                %s,
                %s,
                %s,
                %s,

                'manually_added',
                %s,

                %s,
                NULL,

                %s,
                %s,

                %s,
                0,

                'in_stock',

                %s,

                'active',

                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING farm_product_id
            """,
            [
                farmer_id,

                product_code,
                product_image or None,
                product_type,
                rice_variety,
                product_grade or None,
                description or None,

                acquisition_source_type,

                source_farm_id,

                harvest_acquisition_date,
                source_remarks or None,

                stock_quantity,

                selling_price,
            ],
        )


        created_product_id = (
            cursor.fetchone()[0]
        )


    return (
        get_farmer_inventory_product_details(
            farmer_id,
            created_product_id,
        )
    )


# ============================================================
# EDIT INVENTORY PRODUCT
# ============================================================

@transaction.atomic
def update_inventory_product(
    farmer_user_id,
    farm_product_id,
    data,
):
    """
    Inventory > View Details > Edit Product.

    EDITABLE:

        Product Image
        Product Description
        Product Grade / Classification
        Selling Price per kg


    PROTECTED / READ ONLY:

        Product Code
        Product Type
        Rice Variety / Variant

        Source Type
        Source Farm
        Source Cropping Cycle
        Harvest / Acquisition Date

        Total Stock Quantity
        Reserved / Committed Quantity
        Available Quantity

        Status


    This protection applies to both:
        Harvest Generated
        Manually Added
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    product_id = (
        _normalize_product_id(
            farm_product_id
        )
    )


    product_image = _text(
        data.get(
            "product_image"
        ),
    )


    description = _text(
        data.get(
            "description"
        ),
    )


    product_grade = _text(
        data.get(
            "product_grade"
        ),
        max_length=100,
    )


    selling_price_raw = (
        data.get(
            "selling_price_per_kg"
        )
    )


    selling_price = (
        _positive_decimal(
            selling_price_raw,
            required=False,
            field_name=(
                "Selling Price per kg"
            ),
        )
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        product = (
            _lock_owned_product(
                cursor,
                farmer_id,
                product_id,
            )
        )


        # ----------------------------------------------------
        # PRODUCT MAY BE EDITED FROM DETAILS WHILE ACTIVE.
        #
        # Archived products remain historical/read-only until
        # restored.
        # ----------------------------------------------------

        if (
            product["status"]
            != STATUS_ACTIVE
        ):
            raise InventoryManagementError(
                "product_archived",
                (
                    "Archived products cannot be edited. "
                    "Restore this product first."
                ),
                409,
            )


        cursor.execute(
            """
            UPDATE farm_products
            SET
                product_image = %s,
                description = %s,
                product_grade = %s,
                selling_price_per_kg = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_product_id = %s
              AND user_id = %s
              AND status = 'active'
            """,
            [
                product_image or None,
                description or None,
                product_grade or None,
                selling_price,
                product_id,
                farmer_id,
            ],
        )


        if (
            cursor.rowcount != 1
        ):
            raise InventoryManagementError(
                "product_update_failed",
                (
                    "The product could not be updated. "
                    "Please refresh and try again."
                ),
                409,
            )


    return (
        get_farmer_inventory_product_details(
            farmer_id,
            product_id,
        )
    )


# ============================================================
# ARCHIVE PRODUCT
# ============================================================

@transaction.atomic
def archive_inventory_product(
    farmer_user_id,
    farm_product_id,
):
    """
    Move an Active Farmer Inventory product to Archive.

    This does NOT:
        delete stock
        modify quantities
        remove source history
        remove crop history

    Only:
        status = archived
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    product_id = (
        _normalize_product_id(
            farm_product_id
        )
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        product = (
            _lock_owned_product(
                cursor,
                farmer_id,
                product_id,
            )
        )


        if (
            product["status"]
            == STATUS_ARCHIVED
        ):
            raise InventoryManagementError(
                "already_archived",
                (
                    "This product is already archived."
                ),
                409,
            )


        cursor.execute(
            """
            UPDATE farm_products
            SET
                status = 'archived',
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_product_id = %s
              AND user_id = %s
              AND status = 'active'
            """,
            [
                product_id,
                farmer_id,
            ],
        )


        if (
            cursor.rowcount != 1
        ):
            raise InventoryManagementError(
                "archive_failed",
                (
                    "The product could not be archived. "
                    "Please refresh and try again."
                ),
                409,
            )


    return (
        get_farmer_inventory_product_details(
            farmer_id,
            product_id,
        )
    )


# ============================================================
# RESTORE PRODUCT
# ============================================================

@transaction.atomic
def restore_inventory_product(
    farmer_user_id,
    farm_product_id,
):
    """
    Restore an Archived product back to Active.

    Product identity, source and quantities remain unchanged.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    product_id = (
        _normalize_product_id(
            farm_product_id
        )
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        product = (
            _lock_owned_product(
                cursor,
                farmer_id,
                product_id,
            )
        )


        if (
            product["status"]
            == STATUS_ACTIVE
        ):
            raise InventoryManagementError(
                "already_active",
                (
                    "This product is already active."
                ),
                409,
            )


        # ----------------------------------------------------
        # RESTORE
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE farm_products
            SET
                status = 'active',
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_product_id = %s
              AND user_id = %s
              AND status = 'archived'
            """,
            [
                product_id,
                farmer_id,
            ],
        )


        if (
            cursor.rowcount != 1
        ):
            raise InventoryManagementError(
                "restore_failed",
                (
                    "The product could not be restored. "
                    "Please refresh and try again."
                ),
                409,
            )


    return (
        get_farmer_inventory_product_details(
            farmer_id,
            product_id,
        )
    )