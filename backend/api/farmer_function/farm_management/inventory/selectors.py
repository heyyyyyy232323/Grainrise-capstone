from django.db import connection


# ============================================================
# INVENTORY CONSTANTS
# ============================================================

STATUS_ACTIVE = "active"
STATUS_ARCHIVED = "archived"


VALID_INVENTORY_STATUSES = {
    STATUS_ACTIVE,
    STATUS_ARCHIVED,
}


SORT_NEWEST = "newest"
SORT_OLDEST = "oldest"
SORT_STOCK_HIGHEST = "stock_highest"
SORT_STOCK_LOWEST = "stock_lowest"


VALID_INVENTORY_SORTS = {
    SORT_NEWEST,
    SORT_OLDEST,
    SORT_STOCK_HIGHEST,
    SORT_STOCK_LOWEST,
}


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(
    cursor,
):
    """
    Convert all rows from the current cursor result into
    dictionaries using the selected column aliases.
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


def _row_to_dict(
    cursor,
):
    """
    Convert one cursor row into a dictionary.

    Returns None when no matching record exists.
    """

    row = cursor.fetchone()

    if row is None:
        return None

    columns = [
        column[0]
        for column in cursor.description
    ]

    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# ID NORMALIZERS
# ============================================================

def _normalize_farmer_id(
    farmer_user_id,
):
    """
    farmer_user_id must come from the authenticated Farmer
    JWT/session.

    Never accept this value from request.data.
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
        raise ValueError(
            "Invalid inventory product ID."
        ) from exc

    if product_id <= 0:
        raise ValueError(
            "Invalid inventory product ID."
        )

    return product_id


# ============================================================
# INVENTORY LIST
# ============================================================

def list_farmer_inventory_products(
    farmer_user_id,
    *,
    status_filter=STATUS_ACTIVE,
    search="",
    sort_by=SORT_NEWEST,
):
    """
    Return Farmer Inventory products belonging only to the
    authenticated Farmer.

    Used by:

        Farm Management
            -> Inventory
                -> Active
                -> Archive

    Supported:

        status_filter:
            active
            archived

        search:
            Product Code
            Rice Variety / Variant
            Description

        sort_by:
            newest
            oldest
            stock_highest
            stock_lowest


    SECURITY:

        fp.user_id = authenticated Farmer ID

    Therefore one Farmer cannot retrieve another Farmer's
    inventory even if a product ID/code becomes known.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    normalized_status = (
        str(
            status_filter or STATUS_ACTIVE
        )
        .strip()
        .lower()
    )


    if (
        normalized_status
        not in VALID_INVENTORY_STATUSES
    ):
        raise ValueError(
            "Invalid inventory status."
        )


    normalized_sort = (
        str(
            sort_by or SORT_NEWEST
        )
        .strip()
        .lower()
    )


    if (
        normalized_sort
        not in VALID_INVENTORY_SORTS
    ):
        raise ValueError(
            "Invalid inventory sort option."
        )


    normalized_search = (
        str(
            search or ""
        ).strip()
    )


    # ========================================================
    # SAFE ORDER BY MAPPING
    # ========================================================

    order_by_map = {
        SORT_NEWEST:
            """
            fp.created_at DESC,
            fp.farm_product_id DESC
            """,

        SORT_OLDEST:
            """
            fp.created_at ASC,
            fp.farm_product_id ASC
            """,

        SORT_STOCK_HIGHEST:
            """
            fp.available_quantity_kg DESC,
            fp.created_at DESC,
            fp.farm_product_id DESC
            """,

        SORT_STOCK_LOWEST:
            """
            fp.available_quantity_kg ASC,
            fp.created_at DESC,
            fp.farm_product_id DESC
            """,
    }


    order_by = (
        order_by_map[
            normalized_sort
        ]
    )


    # ========================================================
    # FILTERS
    # ========================================================

    conditions = [
        "fp.user_id = %s",
        "fp.status = %s",
    ]


    params = [
        farmer_id,
        normalized_status,
    ]


    if normalized_search:
        conditions.append(
            """
            (
                fp.product_code ILIKE %s
                OR fp.rice_variety ILIKE %s
                OR COALESCE(
                    fp.description,
                    ''
                ) ILIKE %s
            )
            """
        )


        search_pattern = (
            f"%{normalized_search}%"
        )


        params.extend(
            [
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
                -- PRODUCT IDENTIFICATION
                -- ===========================================

                fp.farm_product_id,
                fp.product_code,
                fp.product_image,
                fp.product_type,
                fp.rice_variety,
                fp.product_grade,
                fp.description,


                -- ===========================================
                -- SOURCE
                -- ===========================================

                fp.record_source_type,
                fp.acquisition_source_type,

                fp.source_farm_id,

                CASE
                    WHEN ff.farm_id IS NULL
                    THEN NULL

                    WHEN NULLIF(
                        TRIM(
                            COALESCE(
                                ff.farm_name,
                                ''
                            )
                        ),
                        ''
                    ) IS NOT NULL
                    THEN ff.farm_name

                    ELSE CONCAT(
                        'Farm #',
                        ff.farm_id
                    )
                END
                    AS source_farm_name,


                CONCAT_WS(
                    ', ',

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.street_address,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.barangay,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.municipality,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.province,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.postal_code,
                                ''
                            )
                        ),
                        ''
                    )
                )
                    AS source_farm_location,


                fp.source_crop_cycle_id,

                fcc.rice_variety
                    AS source_crop_rice_variety,

                fcc.crop_status
                    AS source_crop_status,

                fcc.land_preparation_date
                    AS source_land_preparation_date,

                fcc.planting_date
                    AS source_planting_date,

                fcc.expected_harvest_date
                    AS source_expected_harvest_date,

                fcc.actual_harvest_date
                    AS source_actual_harvest_date,

                fcc.actual_yield_kg
                    AS source_actual_yield_kg,


                fp.harvest_acquisition_date,

                fp.source_acquisition_remarks,


                -- ===========================================
                -- STOCK
                -- ===========================================

                fp.total_stock_quantity_kg,

                fp.reserved_committed_quantity_kg,

                fp.available_quantity_kg,

                fp.stock_level,


                -- ===========================================
                -- COMMERCIAL
                -- ===========================================

                fp.selling_price_per_kg,


                -- ===========================================
                -- RECORD
                -- ===========================================

                fp.status,

                fp.created_at,

                fp.updated_at


            FROM farm_products fp


            LEFT JOIN farmer_farms ff
                ON ff.farm_id =
                    fp.source_farm_id

                AND ff.user_id =
                    fp.user_id


            LEFT JOIN farmer_crop_cycles fcc
                ON fcc.crop_cycle_id =
                    fp.source_crop_cycle_id

                AND fcc.farm_id =
                    fp.source_farm_id


            WHERE
                {where_clause}


            ORDER BY
                {order_by}
            """,
            params,
        )


        return (
            _rows_to_dicts(
                cursor
            )
        )


# ============================================================
# INVENTORY PRODUCT DETAILS
# ============================================================

def get_farmer_inventory_product_details(
    farmer_user_id,
    farm_product_id,
):
    """
    Retrieve the complete Farmer Inventory View Details data.

    Includes:

    PRODUCT INFORMATION:
        Product Code
        Product Image
        Product Type
        Rice Variety / Variant
        Product Grade / Classification
        Description
        Status

    SOURCE INFORMATION:
        Source Type
        Acquisition Source
        Source Farm
        Source Cropping Cycle
        Harvest / Acquisition Date

    STOCK INFORMATION:
        Total Stock Quantity
        Reserved / Committed Quantity
        Available Quantity
        Stock Level

    COMMERCIAL INFORMATION:
        Selling Price per kg

    RECORD INFORMATION:
        Date Added
        Last Updated


    SECURITY:

        Product ownership is checked with:

            fp.user_id = farmer_id

    so a Farmer cannot access another Farmer's product by
    manually changing the URL/product ID.
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
        cursor.execute(
            """
            SELECT

                -- ===========================================
                -- PRODUCT INFORMATION
                -- ===========================================

                fp.farm_product_id,

                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,

                fp.description,

                fp.status,


                -- ===========================================
                -- SOURCE INFORMATION
                -- ===========================================

                fp.record_source_type,

                fp.acquisition_source_type,

                fp.source_farm_id,


                CASE
                    WHEN ff.farm_id IS NULL
                    THEN NULL

                    WHEN NULLIF(
                        TRIM(
                            COALESCE(
                                ff.farm_name,
                                ''
                            )
                        ),
                        ''
                    ) IS NOT NULL
                    THEN ff.farm_name

                    ELSE CONCAT(
                        'Farm #',
                        ff.farm_id
                    )
                END
                    AS source_farm_name,


                CONCAT_WS(
                    ', ',

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.street_address,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.barangay,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.municipality,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.province,
                                ''
                            )
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.postal_code,
                                ''
                            )
                        ),
                        ''
                    )
                )
                    AS source_farm_location,


                fp.source_crop_cycle_id,


                fcc.rice_variety
                    AS source_crop_rice_variety,


                fcc.crop_status
                    AS source_crop_status,


                fcc.land_preparation_date
                    AS source_land_preparation_date,


                fcc.planting_date
                    AS source_planting_date,


                fcc.expected_harvest_date
                    AS source_expected_harvest_date,


                fcc.expected_yield_kg
                    AS source_expected_yield_kg,


                fcc.actual_harvest_date
                    AS source_actual_harvest_date,


                fcc.actual_yield_kg
                    AS source_actual_yield_kg,


                fp.harvest_acquisition_date,

                fp.source_acquisition_remarks,


                -- ===========================================
                -- STOCK INFORMATION
                -- ===========================================

                fp.total_stock_quantity_kg,

                fp.reserved_committed_quantity_kg,

                fp.available_quantity_kg,

                fp.stock_level,


                -- ===========================================
                -- COMMERCIAL INFORMATION
                -- ===========================================

                fp.selling_price_per_kg,


                -- ===========================================
                -- RECORD INFORMATION
                -- ===========================================

                fp.created_at,

                fp.updated_at


            FROM farm_products fp


            LEFT JOIN farmer_farms ff
                ON ff.farm_id =
                    fp.source_farm_id

                AND ff.user_id =
                    fp.user_id


            LEFT JOIN farmer_crop_cycles fcc
                ON fcc.crop_cycle_id =
                    fp.source_crop_cycle_id

                AND fcc.farm_id =
                    fp.source_farm_id


            WHERE
                fp.farm_product_id = %s

                AND fp.user_id = %s


            LIMIT 1
            """,
            [
                product_id,
                farmer_id,
            ],
        )


        return (
            _row_to_dict(
                cursor
            )
        )


# ============================================================
# FARM OPTIONS FOR ADD PRODUCT
# ============================================================

def list_farmer_inventory_farm_options(
    farmer_user_id,
):
    """
    Used by:

        Inventory
            -> Add Product
                -> Source Type = Own Farm
                -> Source Farm dropdown

    Only farms owned by the authenticated Farmer are returned.

    Both Active and Inactive farms remain visible as historical
    source options because inventory may represent an earlier
    acquisition.

    The backend service will still verify ownership again when
    the product is submitted.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                ff.farm_id,

                CASE
                    WHEN NULLIF(
                        TRIM(
                            COALESCE(
                                ff.farm_name,
                                ''
                            )
                        ),
                        ''
                    ) IS NOT NULL
                    THEN ff.farm_name

                    ELSE CONCAT(
                        'Farm #',
                        ff.farm_id
                    )
                END
                    AS farm_name,


                CONCAT_WS(
                    ', ',

                    NULLIF(
                        TRIM(
                            ff.street_address
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            ff.barangay
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            ff.municipality
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            ff.province
                        ),
                        ''
                    ),

                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.postal_code,
                                ''
                            )
                        ),
                        ''
                    )
                )
                    AS farm_location,


                ff.farm_status,

                ff.rice_variety_currently_planted
                    AS registered_rice_variety


            FROM farmer_farms ff


            WHERE
                ff.user_id = %s


            ORDER BY
                ff.created_at DESC,
                ff.farm_id DESC
            """,
            [
                farmer_id,
            ],
        )


        return (
            _rows_to_dicts(
                cursor
            )
        )