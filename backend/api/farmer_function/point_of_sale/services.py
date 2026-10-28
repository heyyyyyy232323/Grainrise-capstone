from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.db import connection, transaction
from django.utils import timezone


# ============================================================
# GRAINRISE
# FARMER > POINT OF SALE
# SERVICES
# ============================================================
#
# PURPOSE:
#
# Handles Farmer face-to-face POS checkout.
#
#
# IMPORTANT SECURITY:
#
# farmer_user_id MUST come from:
#
#     request.grainrise_farmer_id
#
# Never accept farmer_user_id from frontend request data.
#
#
# CURRENT POS RULES:
#
# 1. Product must belong to authenticated Farmer.
#
# 2. Product must be active.
#
# 3. Product must NOT be out_of_stock.
#
# 4. Product must have available stock.
#
# 5. Product must have a valid selling price.
#
# 6. Quantity sold must NOT exceed:
#
#        available_quantity_kg
#
# 7. Successful checkout automatically deducts sold
#    quantity from:
#
#        farm_products.total_stock_quantity_kg
#
# 8. PostgreSQL automatically recalculates:
#
#        available_quantity_kg
#
#    because it is a generated column:
#
#        total_stock_quantity_kg
#        -
#        reserved_committed_quantity_kg
#
# 9. If available stock becomes zero after the sale,
#    stock_level becomes:
#
#        out_of_stock
#
# 10. One checkout may contain multiple products.
#
# 11. All product rows from one checkout share the same:
#
#        transaction_code
#
# 12. The whole checkout is atomic.
#
#     If ONE item fails:
#
#        - no POS transaction is saved
#        - no Inventory stock is deducted
#
# ============================================================


# ============================================================
# CONSTANTS
# ============================================================

PAYMENT_CASH = "cash"
PAYMENT_CARD = "card"

VALID_PAYMENT_METHODS = {
    PAYMENT_CASH,
    PAYMENT_CARD,
}

TRANSACTION_COMPLETED = "completed"

PRODUCT_ACTIVE = "active"

STOCK_OUT = "out_of_stock"


# ============================================================
# CONTROLLED ERROR
# ============================================================

class FarmerPOSError(Exception):
    """
    Controlled Farmer POS business error.

    code:
        Stable backend error identifier.

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
# TEXT HELPER
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
        raise FarmerPOSError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )


    if (
        max_length is not None
        and len(normalized) > max_length
    ):
        raise FarmerPOSError(
            "validation_error",
            (
                f"{field_name} must not exceed "
                f"{max_length} characters."
            ),
            400,
        )


    return normalized


# ============================================================
# FARMER ID
# ============================================================

def _normalize_farmer_id(
    farmer_user_id,
):
    """
    Normalize authenticated Farmer ID.

    This value must come from the existing Farmer JWT guard.
    """

    try:
        farmer_id = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise FarmerPOSError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        ) from exc


    if farmer_id <= 0:
        raise FarmerPOSError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        )


    return farmer_id


# ============================================================
# PRODUCT ID
# ============================================================

def _normalize_product_id(
    value,
):
    try:
        product_id = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise FarmerPOSError(
            "invalid_product",
            "Invalid Inventory product.",
            400,
        ) from exc


    if product_id <= 0:
        raise FarmerPOSError(
            "invalid_product",
            "Invalid Inventory product.",
            400,
        )


    return product_id


# ============================================================
# POS QUANTITY
# ============================================================

def _positive_quantity(
    value,
):
    """
    Quantity sold must always be greater than zero.
    """

    if value in (
        None,
        "",
    ):
        raise FarmerPOSError(
            "invalid_quantity",
            "Quantity is required.",
            400,
        )


    try:
        quantity = Decimal(
            str(
                value
            )
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise FarmerPOSError(
            "invalid_quantity",
            "Quantity must be a valid number.",
            400,
        ) from exc


    if quantity <= 0:
        raise FarmerPOSError(
            "invalid_quantity",
            (
                "Quantity must be greater "
                "than zero."
            ),
            400,
        )


    return quantity


# ============================================================
# MONEY
# ============================================================

def _money(
    value,
    *,
    required=False,
    field_name="Amount",
):
    if value in (
        None,
        "",
    ):
        if required:
            raise FarmerPOSError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )

        return None


    try:
        amount = Decimal(
            str(
                value
            )
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise FarmerPOSError(
            "validation_error",
            (
                f"{field_name} must be "
                "a valid number."
            ),
            400,
        ) from exc


    if amount < 0:
        raise FarmerPOSError(
            "validation_error",
            (
                f"{field_name} cannot "
                "be negative."
            ),
            400,
        )


    return amount


# ============================================================
# ACTIVE FARMER VALIDATION
# ============================================================

def _assert_active_farmer(
    cursor,
    farmer_user_id,
):
    """
    Defense-in-depth.

    farmer_required already checks the Farmer session,
    but write services verify the account again.
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
        raise FarmerPOSError(
            "authentication_required",
            (
                "Farmer account is not active. "
                "Please sign in again."
            ),
            401,
        )


# ============================================================
# NORMALIZE CART ITEMS
# ============================================================

def _normalize_cart_items(
    raw_items,
):
    """
    Normalize frontend cart.

    Expected:

        [
            {
                "farm_product_id": 1,
                "quantity_kg": 50
            },
            {
                "farm_product_id": 2,
                "quantity_kg": 25
            }
        ]


    If the same product somehow appears more than once,
    quantities are combined.

    Example:

        Product 1 = 20 kg
        Product 1 = 30 kg

    becomes:

        Product 1 = 50 kg
    """

    if not isinstance(
        raw_items,
        list,
    ):
        raise FarmerPOSError(
            "invalid_cart",
            "POS cart is invalid.",
            400,
        )


    if not raw_items:
        raise FarmerPOSError(
            "empty_cart",
            (
                "Add at least one product "
                "before checkout."
            ),
            400,
        )


    combined = {}


    for item in raw_items:

        if not isinstance(
            item,
            dict,
        ):
            raise FarmerPOSError(
                "invalid_cart",
                "POS cart contains an invalid item.",
                400,
            )


        product_id = (
            _normalize_product_id(
                item.get(
                    "farm_product_id"
                )
            )
        )


        quantity = (
            _positive_quantity(
                item.get(
                    "quantity_kg"
                )
            )
        )


        if product_id in combined:

            combined[
                product_id
            ] += quantity

        else:

            combined[
                product_id
            ] = quantity


    # Consistent lock order helps prevent deadlocks when
    # multiple checkout requests touch several products.
    return [
        {
            "farm_product_id":
                product_id,

            "quantity_kg":
                combined[
                    product_id
                ],
        }

        for product_id
        in sorted(
            combined.keys()
        )
    ]


# ============================================================
# LOCK FARMER PRODUCTS
# ============================================================

def _lock_checkout_products(
    cursor,
    farmer_user_id,
    cart_items,
):
    """
    Lock all selected Inventory products.

    IMPORTANT:

    Product IDs are only used during checkout.

    farmer_pos_transactions itself is NOT foreign-keyed
    to farm_products.

    Ownership is checked here using:

        fp.user_id = authenticated Farmer ID

    FOR UPDATE prevents concurrent requests from selling
    the same available stock at the same time.
    """

    product_ids = [
        item[
            "farm_product_id"
        ]
        for item in cart_items
    ]


    placeholders = ", ".join(
        [
            "%s"
            for _ in product_ids
        ]
    )


    cursor.execute(
        f"""
        SELECT
            farm_product_id,

            user_id,

            product_code,

            product_type,

            rice_variety,

            product_grade,

            total_stock_quantity_kg,

            reserved_committed_quantity_kg,

            available_quantity_kg,

            stock_level,

            selling_price_per_kg,

            status

        FROM farm_products

        WHERE user_id = %s

          AND farm_product_id IN (
              {placeholders}
          )

        ORDER BY
            farm_product_id ASC

        FOR UPDATE
        """,
        [
            farmer_user_id,
            *product_ids,
        ],
    )


    rows = cursor.fetchall()


    # ========================================================
    # OWNERSHIP / EXISTENCE CHECK
    # ========================================================
    #
    # If the Farmer requested 3 product IDs but only 2 rows
    # were returned, the missing product either:
    #
    # - does not exist
    # - belongs to another Farmer
    #
    # We intentionally do not reveal which one.
    # ========================================================

    if len(
        rows
    ) != len(
        product_ids
    ):
        raise FarmerPOSError(
            "product_not_available",
            (
                "One or more selected products are "
                "not available under your account."
            ),
            404,
        )


    products = {}


    for row in rows:

        products[
            row[0]
        ] = {
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

            "product_grade":
                row[5],

            "total_stock_quantity_kg":
                row[6],

            "reserved_committed_quantity_kg":
                row[7],

            "available_quantity_kg":
                row[8],

            "stock_level":
                row[9],

            "selling_price_per_kg":
                row[10],

            "status":
                row[11],
        }


    return products


# ============================================================
# VALIDATE CHECKOUT PRODUCTS
# ============================================================

def _validate_checkout_products(
    products,
    cart_items,
):
    """
    Validate each selected Inventory item.

    Most important rule:

        quantity requested
        <=
        available_quantity_kg

    Never validate against total stock alone because part of
    that stock may already be reserved for Contracts.
    """

    prepared_items = []


    for cart_item in cart_items:

        product_id = (
            cart_item[
                "farm_product_id"
            ]
        )


        quantity = (
            cart_item[
                "quantity_kg"
            ]
        )


        product = (
            products[
                product_id
            ]
        )


        # ====================================================
        # ACTIVE INVENTORY RECORD
        # ====================================================

        if (
            product[
                "status"
            ]
            != PRODUCT_ACTIVE
        ):
            raise FarmerPOSError(
                "product_inactive",
                (
                    f"{product['rice_variety']} "
                    "is no longer active in Inventory."
                ),
                400,
            )


        # ====================================================
        # OUT OF STOCK
        # ====================================================

        if (
            product[
                "stock_level"
            ]
            == STOCK_OUT
        ):
            raise FarmerPOSError(
                "out_of_stock",
                (
                    f"{product['rice_variety']} "
                    "is already out of stock."
                ),
                400,
            )


        available_quantity = (
            Decimal(
                str(
                    product[
                        "available_quantity_kg"
                    ]
                )
            )
        )


        # ====================================================
        # NO AVAILABLE STOCK
        # ====================================================

        if available_quantity <= 0:
            raise FarmerPOSError(
                "out_of_stock",
                (
                    f"{product['rice_variety']} "
                    "has no available stock."
                ),
                400,
            )


        # ====================================================
        # QUANTITY LIMIT
        #
        # This is enforced by BACKEND.
        #
        # Even if someone modifies the frontend manually,
        # checkout cannot exceed available stock.
        # ====================================================

        if quantity > available_quantity:
            raise FarmerPOSError(
                "insufficient_stock",
                (
                    f"Only {available_quantity} kg of "
                    f"{product['rice_variety']} is "
                    "currently available."
                ),
                400,
            )


        # ====================================================
        # SELLING PRICE
        # ====================================================

        raw_price = (
            product[
                "selling_price_per_kg"
            ]
        )


        if raw_price is None:
            raise FarmerPOSError(
                "missing_selling_price",
                (
                    f"{product['rice_variety']} does "
                    "not have a selling price."
                ),
                400,
            )


        selling_price = Decimal(
            str(
                raw_price
            )
        )


        if selling_price <= 0:
            raise FarmerPOSError(
                "invalid_selling_price",
                (
                    f"{product['rice_variety']} has "
                    "an invalid selling price."
                ),
                400,
            )


        line_total = (
            quantity
            *
            selling_price
        )


        new_total_stock = (
            Decimal(
                str(
                    product[
                        "total_stock_quantity_kg"
                    ]
                )
            )
            -
            quantity
        )


        new_available_quantity = (
            available_quantity
            -
            quantity
        )


        # Because quantity cannot exceed available quantity,
        # new_total_stock can never go below the already
        # reserved/committed quantity.


        new_stock_level = (
            STOCK_OUT

            if new_available_quantity <= 0

            else product[
                "stock_level"
            ]
        )


        prepared_items.append(
            {
                "farm_product_id":
                    product_id,

                "product_code":
                    product[
                        "product_code"
                    ],

                "product_type":
                    product[
                        "product_type"
                    ],

                "rice_variety":
                    product[
                        "rice_variety"
                    ],

                "product_grade":
                    product[
                        "product_grade"
                    ],

                "quantity_sold_kg":
                    quantity,

                "selling_price_per_kg":
                    selling_price,

                "line_total_amount":
                    line_total,

                "previous_available_quantity_kg":
                    available_quantity,

                "new_available_quantity_kg":
                    new_available_quantity,

                "new_total_stock_quantity_kg":
                    new_total_stock,

                "new_stock_level":
                    new_stock_level,
            }
        )


    return prepared_items


# ============================================================
# TRANSACTION CODE
# ============================================================

def _generate_transaction_code():
    """
    Generate one checkout / receipt code.

    Example:

        POS-2026-A1B2C3D4E5

    All product rows from the same checkout use this code.

    UUID suffix avoids depending on another database table
    or sequence solely for receipt numbering.
    """

    year = (
        timezone.localdate().year
    )


    suffix = (
        uuid4()
        .hex[:10]
        .upper()
    )


    return (
        f"POS-{year}-{suffix}"
    )


# ============================================================
# COMPLETE POS CHECKOUT
# ============================================================

@transaction.atomic
def complete_pos_checkout(
    farmer_user_id,
    data,
):
    """
    Complete one Farmer face-to-face POS transaction.


    EXPECTED DATA:

        {
            "buyer_name": "Juan Dela Cruz",

            "payment_method": "cash",

            "amount_received": 3000,

            "items": [
                {
                    "farm_product_id": 1,
                    "quantity_kg": 50
                },
                {
                    "farm_product_id": 2,
                    "quantity_kg": 25
                }
            ]
        }


    Buyer name is optional.


    PAYMENT:

        cash:
            amount_received required

        card:
            amount_received ignored / must be empty


    SUCCESS:

        1. Creates POS transaction rows.

        2. All rows share one transaction_code.

        3. Deducts sold quantity from Inventory.

        4. Sets stock_level = out_of_stock if remaining
           available quantity reaches zero.


    FAILURE:

        Entire transaction is rolled back.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    if not isinstance(
        data,
        dict,
    ):
        raise FarmerPOSError(
            "validation_error",
            "Invalid checkout data.",
            400,
        )


    # ========================================================
    # BUYER / PAYEE
    # ========================================================

    buyer_name = (
        _text(
            data.get(
                "buyer_name"
            ),
            max_length=200,
        )
    )


    buyer_name = (
        buyer_name
        or None
    )


    # ========================================================
    # PAYMENT METHOD
    # ========================================================

    payment_method = (
        _text(
            data.get(
                "payment_method"
            ),
            required=True,
            field_name="Payment Method",
            max_length=20,
        ).lower()
    )


    if (
        payment_method
        not in VALID_PAYMENT_METHODS
    ):
        raise FarmerPOSError(
            "invalid_payment_method",
            (
                "Payment Method must be "
                "Cash or Card."
            ),
            400,
        )


    # ========================================================
    # CART
    # ========================================================

    cart_items = (
        _normalize_cart_items(
            data.get(
                "items"
            )
        )
    )


    # ========================================================
    # DATABASE TRANSACTION
    # ========================================================

    with connection.cursor() as cursor:

        # ----------------------------------------------------
        # VERIFY FARMER SESSION
        # ----------------------------------------------------

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        # ----------------------------------------------------
        # LOCK PRODUCTS
        #
        # Prevents concurrent checkout from overselling stock.
        # ----------------------------------------------------

        products = (
            _lock_checkout_products(
                cursor,
                farmer_id,
                cart_items,
            )
        )


        # ----------------------------------------------------
        # VALIDATE STOCK / PRICE / STATUS
        # ----------------------------------------------------

        prepared_items = (
            _validate_checkout_products(
                products,
                cart_items,
            )
        )


        # ----------------------------------------------------
        # COMPLETE CHECKOUT TOTAL
        # ----------------------------------------------------

        checkout_total = sum(
            (
                item[
                    "line_total_amount"
                ]

                for item
                in prepared_items
            ),
            Decimal("0.00"),
        )


        if checkout_total <= 0:
            raise FarmerPOSError(
                "invalid_total",
                "Checkout total is invalid.",
                400,
            )


        # ----------------------------------------------------
        # PAYMENT VALIDATION
        # ----------------------------------------------------

        if (
            payment_method
            == PAYMENT_CASH
        ):

            amount_received = (
                _money(
                    data.get(
                        "amount_received"
                    ),
                    required=True,
                    field_name="Amount Received",
                )
            )


            if (
                amount_received
                <
                checkout_total
            ):
                raise FarmerPOSError(
                    "insufficient_payment",
                    (
                        "Amount Received is less "
                        "than the checkout total."
                    ),
                    400,
                )


            change_amount = (
                amount_received
                -
                checkout_total
            )


        else:

            amount_received = None
            change_amount = None


        # ----------------------------------------------------
        # ONE RECEIPT / TRANSACTION CODE
        # ----------------------------------------------------

        transaction_code = (
            _generate_transaction_code()
        )


        created_rows = []


        # ====================================================
        # CREATE POS ROWS + DEDUCT INVENTORY
        # ====================================================

        for item in prepared_items:

            # ------------------------------------------------
            # SAVE HISTORICAL POS TRANSACTION
            #
            # IMPORTANT:
            #
            # No farm_product_id is saved here.
            #
            # Product information is stored as a historical
            # snapshot.
            # ------------------------------------------------

            cursor.execute(
                """
                INSERT INTO farmer_pos_transactions (
                    transaction_code,

                    farmer_user_id,

                    buyer_name,

                    product_type,

                    rice_variety,

                    product_grade,

                    quantity_sold_kg,

                    selling_price_per_kg,

                    payment_method,

                    amount_received,

                    change_amount,

                    transaction_status,

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

                    %s,

                    %s,

                    %s,

                    %s,

                    'completed',

                    CURRENT_TIMESTAMP,

                    CURRENT_TIMESTAMP
                )

                RETURNING
                    transaction_id,
                    line_total_amount,
                    created_at
                """,
                [
                    transaction_code,

                    farmer_id,

                    buyer_name,

                    item[
                        "product_type"
                    ],

                    item[
                        "rice_variety"
                    ],

                    item[
                        "product_grade"
                    ],

                    item[
                        "quantity_sold_kg"
                    ],

                    item[
                        "selling_price_per_kg"
                    ],

                    payment_method,

                    amount_received,

                    change_amount,
                ],
            )


            inserted = (
                cursor.fetchone()
            )


            # ------------------------------------------------
            # DEDUCT SOLD QUANTITY FROM INVENTORY
            #
            # We update total physical stock.
            #
            # PostgreSQL automatically recalculates:
            #
            # available_quantity_kg
            #
            # because it is generated from:
            #
            # total stock - reserved stock
            # ------------------------------------------------

            cursor.execute(
                """
                UPDATE farm_products

                SET
                    total_stock_quantity_kg = %s,

                    stock_level = %s,

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE farm_product_id = %s

                  AND user_id = %s
                """,
                [
                    item[
                        "new_total_stock_quantity_kg"
                    ],

                    item[
                        "new_stock_level"
                    ],

                    item[
                        "farm_product_id"
                    ],

                    farmer_id,
                ],
            )


            if cursor.rowcount != 1:
                raise FarmerPOSError(
                    "inventory_update_failed",
                    (
                        "Unable to update Inventory "
                        "stock for this checkout."
                    ),
                    409,
                )


            created_rows.append(
                {
                    "transaction_id":
                        inserted[0],

                    "product_code":
                        item[
                            "product_code"
                        ],

                    "product_type":
                        item[
                            "product_type"
                        ],

                    "rice_variety":
                        item[
                            "rice_variety"
                        ],

                    "product_grade":
                        item[
                            "product_grade"
                        ],

                    "quantity_sold_kg":
                        item[
                            "quantity_sold_kg"
                        ],

                    "selling_price_per_kg":
                        item[
                            "selling_price_per_kg"
                        ],

                    "line_total_amount":
                        inserted[1],

                    "previous_available_quantity_kg":
                        item[
                            "previous_available_quantity_kg"
                        ],

                    "remaining_available_quantity_kg":
                        item[
                            "new_available_quantity_kg"
                        ],

                    "created_at":
                        inserted[2],
                }
            )


    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "transaction_code":
            transaction_code,

        "buyer_name":
            buyer_name,

        "payment_method":
            payment_method,

        "total_amount":
            checkout_total,

        "amount_received":
            amount_received,

        "change_amount":
            change_amount,

        "transaction_status":
            TRANSACTION_COMPLETED,

        "items":
            created_rows,
    }