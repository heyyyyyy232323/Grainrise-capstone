from django.db import connection


# ============================================================
# FARMER POINT OF SALE
# SELECTORS
# ============================================================
#
# PURPOSE:
#
# Read-only database queries used by Farmer Point of Sale.
#
#
# IMPORTANT OWNERSHIP RULE:
#
# Farmer identity comes from the authenticated Farmer
# JWT/session.
#
# The view will pass:
#
#     request.grainrise_farmer_id
#
# into these selectors.
#
# Never accept farmer_user_id from frontend input.
#
#
# IMPORTANT PRODUCT RULE:
#
# farm_product_id may be used temporarily by POS so the Farmer
# can select an Inventory product for checkout.
#
# It is NOT stored as a Foreign Key inside:
#
#     farmer_pos_transactions
#
# The transaction will instead store a historical product
# snapshot such as:
#
#     product_type
#     rice_variety
#     product_grade
#     selling_price_per_kg
#
#
# Demand Forecasting will later read POS historical data
# through SQL VIEWs / aggregated queries.
#
# ============================================================


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(
    cursor,
):
    """
    Convert all rows from the current database cursor into
    dictionaries using the selected column names.
    """

    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(
            zip(
                columns,
                row,
            )
        )
        for row in cursor.fetchall()
    ]


# ============================================================
# FARMER ID NORMALIZER
# ============================================================

def _normalize_farmer_id(
    farmer_user_id,
):
    """
    Normalize the authenticated Farmer ID.

    IMPORTANT:

    farmer_user_id must come from:

        request.grainrise_farmer_id

    which is populated by the existing Farmer JWT guard.

    Never use a Farmer ID supplied by frontend input.
    """

    try:
        farmer_id = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise ValueError(
            "Invalid Farmer session."
        ) from exc


    if farmer_id <= 0:

        raise ValueError(
            "Invalid Farmer session."
        )


    return farmer_id


# ============================================================
# SEARCH NORMALIZER
# ============================================================

def _normalize_search(
    value,
):
    return str(
        value or ""
    ).strip()


# ============================================================
# POS SELLABLE PRODUCTS
# ============================================================

def list_farmer_pos_products(
    farmer_user_id,
    *,
    search="",
):
    """
    Retrieve Inventory products that may currently be displayed
    inside Farmer Point of Sale.


    PRODUCT MUST:

        1. Belong to the authenticated Farmer.

        2. Have status = active.

        3. Have available stock greater than zero.

        4. Have a valid selling price.


    SECURITY:

        fp.user_id = authenticated Farmer ID


    Therefore:

        Farmer A cannot retrieve Farmer B's Inventory products
        in their POS product list.


    SEARCH:

        Product Code
        Product Type
        Rice Variety
        Product Grade
        Description


    IMPORTANT:

        farm_product_id is returned so the POS can identify
        which Inventory record the Farmer selected.

        It does NOT mean farmer_pos_transactions has a
        Foreign Key to farm_products.

        During checkout, the service will use the selected
        product ID only to:

            - verify ownership
            - verify stock
            - obtain current product information
            - obtain current selling price
            - deduct sold stock

        The completed transaction will save its own historical
        product snapshot.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    normalized_search = (
        _normalize_search(
            search
        )
    )


    # ========================================================
    # BASE FILTERS
    # ========================================================

    conditions = [

        # Logged-in Farmer ownership
        "fp.user_id = %s",

        # Only active Inventory records
        "fp.status = 'active'",

        # Product must still have sellable stock
        "fp.available_quantity_kg > 0",

        # POS requires an actual selling price
        "fp.selling_price_per_kg IS NOT NULL",

        "fp.selling_price_per_kg > 0",
    ]


    params = [
        farmer_id,
    ]


    # ========================================================
    # SEARCH
    # ========================================================

    if normalized_search:

        search_pattern = (
            f"%{normalized_search}%"
        )


        conditions.append(
            """
            (
                fp.product_code ILIKE %s

                OR fp.product_type ILIKE %s

                OR fp.rice_variety ILIKE %s

                OR COALESCE(
                    fp.product_grade,
                    ''
                ) ILIKE %s

                OR COALESCE(
                    fp.description,
                    ''
                ) ILIKE %s
            )
            """
        )


        params.extend(
            [
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
            ]
        )


    where_clause = (
        "\nAND ".join(
            conditions
        )
    )


    # ========================================================
    # QUERY
    # ========================================================

    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ===========================================
                -- TEMPORARY INVENTORY IDENTIFIER
                -- ===========================================
                --
                -- Used only for selecting/checking Inventory
                -- during the POS checkout.
                --
                -- Not stored as an FK in the POS transaction.
                -- ===========================================

                fp.farm_product_id,


                -- ===========================================
                -- PRODUCT DISPLAY INFORMATION
                -- ===========================================

                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,

                fp.description,


                -- ===========================================
                -- CURRENT SELLABLE STOCK
                -- ===========================================

                fp.available_quantity_kg,

                fp.stock_level,


                -- ===========================================
                -- CURRENT POS PRICE
                -- ===========================================

                fp.selling_price_per_kg


            FROM farm_products fp


            WHERE
                {where_clause}


            ORDER BY

                fp.rice_variety ASC,

                fp.product_code ASC,

                fp.farm_product_id ASC
            """,
            params,
        )


        return (
            _rows_to_dicts(
                cursor
            )
        )