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

def _rows_to_dicts(cursor):
    """
    Convert all rows from the current cursor result into
    dictionaries using the selected column aliases.
    """
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    """
    Convert one cursor row into a dictionary.
    Returns None when no matching record exists.
    """
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


# ============================================================
# ID NORMALIZERS
# ============================================================

def _normalize_farmer_id(farmer_user_id):
    try:
        farmer_id = int(farmer_user_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid Farmer session.") from exc

    if farmer_id <= 0:
        raise ValueError("Invalid Farmer session.")

    return farmer_id


def _normalize_product_id(farm_product_id):
    try:
        product_id = int(farm_product_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid inventory product ID.") from exc

    if product_id <= 0:
        raise ValueError("Invalid inventory product ID.")

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
    authenticated Farmer (via farm_profile.user_id).
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)

    normalized_status = str(status_filter or STATUS_ACTIVE).strip().lower()
    if normalized_status not in VALID_INVENTORY_STATUSES:
        raise ValueError("Invalid inventory status.")

    normalized_sort = str(sort_by or SORT_NEWEST).strip().lower()
    if normalized_sort not in VALID_INVENTORY_SORTS:
        raise ValueError("Invalid inventory sort option.")

    normalized_search = str(search or "").strip()

    # Safe order-by mapping
    order_by_map = {
        SORT_NEWEST: "fp.created_at DESC, fp.farm_product_id DESC",
        SORT_OLDEST: "fp.created_at ASC, fp.farm_product_id ASC",
        SORT_STOCK_HIGHEST: "available_quantity_kg DESC, fp.created_at DESC, fp.farm_product_id DESC",
        SORT_STOCK_LOWEST: "available_quantity_kg ASC, fp.created_at DESC, fp.farm_product_id DESC",
    }
    order_by = order_by_map[normalized_sort]

    conditions = [
        "f.user_id = %s",
        "fp.product_status = %s",
    ]
    params = [farmer_id, normalized_status]

    if normalized_search:
        conditions.append(
            """
            (
                fp.product_code LIKE %s
                OR fp.rice_variety LIKE %s
                OR COALESCE(fp.product_description, '') LIKE %s
            )
            """
        )
        search_pattern = f"%{normalized_search}%"
        params.extend([search_pattern, search_pattern, search_pattern])

    where_clause = "\nAND ".join(conditions)

    query = f"""
    SELECT
        fp.farm_product_id,
        fp.product_code,
        fp.product_image,
        fp.product_type,
        fp.rice_variety,
        fp.product_grade,
        fp.product_description AS description,

        -- Source
        fp.record_origin AS record_source_type,
        fp.source_type AS acquisition_source_type,
        fp.farm_profile_id AS source_farm_id,
        COALESCE(NULLIF(TRIM(f.farm_lot_name), ''), CONCAT('Farm #', f.farm_profile_id)) AS source_farm_name,
        CONCAT_WS(
            ', ',
            NULLIF(TRIM(f.street_address), ''),
            NULLIF(TRIM(f.municipality), ''),
            NULLIF(TRIM(f.province), ''),
            NULLIF(TRIM(f.postal_code), '')
        ) AS source_farm_location,

        fp.crop_cycle_id AS source_crop_cycle_id,
        cc.cycle_number AS source_crop_cycle_number,
        cc.rice_variety AS source_crop_rice_variety,
        cc.crop_status AS source_crop_status,
        cc.planting_date AS source_planting_date,
        cc.expected_harvest_date AS source_expected_harvest_date,
        cc.actual_harvest_date AS source_actual_harvest_date,
        cc.actual_yield_kg AS source_actual_yield_kg,

        fp.harvest_acquisition_date,
        fp.acquisition_remarks AS source_acquisition_remarks,

        -- Stock Calculations
        fp.stock_quantity_kg AS total_stock_quantity_kg,
        COALESCE(
            (
                SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                FROM existing_grainrise_farmer_inventory_commitments c
                WHERE c.farm_product_id = fp.farm_product_id
                  AND c.commitment_status = 'Active'
            ),
            0
        ) AS reserved_committed_quantity_kg,
        GREATEST(
            fp.stock_quantity_kg - COALESCE(
                (
                    SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                    FROM existing_grainrise_farmer_inventory_commitments c
                    WHERE c.farm_product_id = fp.farm_product_id
                      AND c.commitment_status = 'Active'
                ),
                0
            ),
            0
        ) AS available_quantity_kg,
        CASE
            WHEN GREATEST(
                fp.stock_quantity_kg - COALESCE(
                    (
                        SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                        FROM existing_grainrise_farmer_inventory_commitments c
                        WHERE c.farm_product_id = fp.farm_product_id
                          AND c.commitment_status = 'Active'
                    ),
                    0
                ),
                0
            ) >= 200 THEN 'in_stock'
            WHEN GREATEST(
                fp.stock_quantity_kg - COALESCE(
                    (
                        SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                        FROM existing_grainrise_farmer_inventory_commitments c
                        WHERE c.farm_product_id = fp.farm_product_id
                          AND c.commitment_status = 'Active'
                    ),
                    0
                ),
                0
            ) > 0 THEN 'low_stock'
            ELSE 'out_of_stock'
        END AS stock_level,

        -- Commercial
        fp.selling_price_per_kg,

        -- Record
        fp.product_status AS status,
        fp.archive_reason,
        fp.archived_at,
        fp.created_at,
        fp.updated_at

    FROM existing_grainrise_farmer_products fp
    INNER JOIN farm_profile f
        ON f.farm_profile_id = fp.farm_profile_id
    LEFT JOIN existing_grainrise_farmer_crop_cycles cc
        ON cc.crop_cycle_id = fp.crop_cycle_id

    WHERE
        {where_clause}

    ORDER BY
        {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return _rows_to_dicts(cursor)


# ============================================================
# INVENTORY PRODUCT DETAILS
# ============================================================

def get_farmer_inventory_product_details(
    farmer_user_id,
    farm_product_id,
):
    """
    Retrieve the complete Farmer Inventory View Details data for one product.
    Ensures the product belongs to the authenticated Farmer via farm_profile.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)
    product_id = _normalize_product_id(farm_product_id)

    query = """
    SELECT
        fp.farm_product_id,
        fp.product_code,
        fp.product_image,
        fp.product_type,
        fp.rice_variety,
        fp.product_grade,
        fp.product_description AS description,
        fp.product_status AS status,
        fp.archive_reason,
        fp.archived_at,

        -- Source Information
        fp.record_origin AS record_source_type,
        fp.source_type AS acquisition_source_type,
        fp.farm_profile_id AS source_farm_id,
        COALESCE(NULLIF(TRIM(f.farm_lot_name), ''), CONCAT('Farm #', f.farm_profile_id)) AS source_farm_name,
        CONCAT_WS(
            ', ',
            NULLIF(TRIM(f.street_address), ''),
            NULLIF(TRIM(f.municipality), ''),
            NULLIF(TRIM(f.province), ''),
            NULLIF(TRIM(f.postal_code), '')
        ) AS source_farm_location,

        fp.crop_cycle_id AS source_crop_cycle_id,
        cc.cycle_number AS source_crop_cycle_number,
        cc.rice_variety AS source_crop_rice_variety,
        cc.crop_status AS source_crop_status,
        cc.planting_date AS source_planting_date,
        cc.expected_harvest_date AS source_expected_harvest_date,
        cc.expected_yield_kg AS source_expected_yield_kg,
        cc.actual_harvest_date AS source_actual_harvest_date,
        cc.actual_yield_kg AS source_actual_yield_kg,

        fp.harvest_acquisition_date,
        fp.acquisition_remarks AS source_acquisition_remarks,

        -- Stock Information
        fp.stock_quantity_kg AS total_stock_quantity_kg,
        COALESCE(
            (
                SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                FROM existing_grainrise_farmer_inventory_commitments c
                WHERE c.farm_product_id = fp.farm_product_id
                  AND c.commitment_status = 'Active'
            ),
            0
        ) AS reserved_committed_quantity_kg,
        GREATEST(
            fp.stock_quantity_kg - COALESCE(
                (
                    SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                    FROM existing_grainrise_farmer_inventory_commitments c
                    WHERE c.farm_product_id = fp.farm_product_id
                      AND c.commitment_status = 'Active'
                ),
                0
            ),
            0
        ) AS available_quantity_kg,
        CASE
            WHEN GREATEST(
                fp.stock_quantity_kg - COALESCE(
                    (
                        SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                        FROM existing_grainrise_farmer_inventory_commitments c
                        WHERE c.farm_product_id = fp.farm_product_id
                          AND c.commitment_status = 'Active'
                    ),
                    0
                ),
                0
            ) >= 200 THEN 'in_stock'
            WHEN GREATEST(
                fp.stock_quantity_kg - COALESCE(
                    (
                        SELECT SUM(GREATEST(c.committed_quantity_kg - c.released_quantity_kg, 0))
                        FROM existing_grainrise_farmer_inventory_commitments c
                        WHERE c.farm_product_id = fp.farm_product_id
                          AND c.commitment_status = 'Active'
                    ),
                    0
                ),
                0
            ) > 0 THEN 'low_stock'
            ELSE 'out_of_stock'
        END AS stock_level,

        -- Commercial Information
        fp.selling_price_per_kg,

        -- Record Information
        fp.created_at,
        fp.updated_at

    FROM existing_grainrise_farmer_products fp
    INNER JOIN farm_profile f
        ON f.farm_profile_id = fp.farm_profile_id
    LEFT JOIN existing_grainrise_farmer_crop_cycles cc
        ON cc.crop_cycle_id = fp.crop_cycle_id

    WHERE
        fp.farm_product_id = %s
        AND f.user_id = %s

    LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [product_id, farmer_id])
        return _row_to_dict(cursor)


# ============================================================
# FARM OPTIONS FOR ADD PRODUCT
# ============================================================

def list_farmer_inventory_farm_options(
    farmer_user_id,
):
    """
    Used by:
        Inventory -> Add Product -> Source Type = Own Farm -> Source Farm dropdown

    Only farms belonging to the authenticated Farmer are returned.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)

    query = """
    SELECT
        f.farm_profile_id AS farm_id,
        COALESCE(NULLIF(TRIM(f.farm_lot_name), ''), CONCAT('Farm #', f.farm_profile_id)) AS farm_name,
        CONCAT_WS(
            ', ',
            NULLIF(TRIM(f.street_address), ''),
            NULLIF(TRIM(f.municipality), ''),
            NULLIF(TRIM(f.province), ''),
            NULLIF(TRIM(f.postal_code), '')
        ) AS farm_location,
        COALESCE(s.farm_status, 'Active') AS farm_status,
        f.rice_variety_currently_planted AS registered_rice_variety

    FROM farm_profile f
    LEFT JOIN existing_grainrise_farmer_farm_status s
        ON s.farm_profile_id = f.farm_profile_id

    WHERE
        f.user_id = %s

    ORDER BY
        f.created_at DESC,
        f.farm_profile_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [farmer_id])
        return _rows_to_dicts(cursor)
