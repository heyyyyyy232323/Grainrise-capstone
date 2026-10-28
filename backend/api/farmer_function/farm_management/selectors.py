from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

CROP_STATUS_AVAILABLE = "available_for_planting"
CROP_STATUS_LAND_PREPARATION = "land_preparation"
CROP_STATUS_PLANTED = "planted_and_growing"
CROP_STATUS_HARVESTED = "harvested"
CROP_STATUS_FAILED = "failed_crop"

VALID_CROP_STATUSES = {
    CROP_STATUS_AVAILABLE,
    CROP_STATUS_LAND_PREPARATION,
    CROP_STATUS_PLANTED,
    CROP_STATUS_HARVESTED,
    CROP_STATUS_FAILED,
}

VALID_FARM_STATUSES = {
    "active",
    "inactive",
}

SORT_NEWEST = "newest"
SORT_OLDEST = "oldest"
SORT_SIZE_HIGHEST = "size_highest"
SORT_SIZE_LOWEST = "size_lowest"

VALID_SORTS = {
    SORT_NEWEST,
    SORT_OLDEST,
    SORT_SIZE_HIGHEST,
    SORT_SIZE_LOWEST,
}


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    if not cursor.description:
        return []

    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None

    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))


def _normalize_text(value):
    return str(value or "").strip()


def _extract_barangay(street_address):
    street = str(street_address or "").strip()
    if not street:
        return ""
    for prefix in ["Brgy. ", "brgy. ", "Barangay ", "barangay ", "Brgy ", "brgy "]:
        if prefix in street:
            return street.split(prefix, 1)[1].strip()
    return ""


def _normalize_farmer_id(farmer_user_id):
    try:
        normalized = int(farmer_user_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid authenticated Farmer ID.") from exc

    if normalized <= 0:
        raise ValueError("Invalid authenticated Farmer ID.")

    return normalized


def _normalize_farm_id(farm_id):
    try:
        normalized = int(farm_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid farm ID.") from exc

    if normalized <= 0:
        raise ValueError("Invalid farm ID.")

    return normalized


def _farm_order_by(sort_by):
    normalized = _normalize_text(sort_by).lower() or SORT_NEWEST

    if normalized not in VALID_SORTS:
        normalized = SORT_NEWEST

    if normalized == SORT_OLDEST:
        return "fp.created_at ASC, fp.farm_profile_id ASC"

    if normalized == SORT_SIZE_HIGHEST:
        return "fp.total_farm_area_hectares DESC, fp.created_at DESC, fp.farm_profile_id DESC"

    if normalized == SORT_SIZE_LOWEST:
        return "fp.total_farm_area_hectares ASC, fp.created_at DESC, fp.farm_profile_id DESC"

    return "fp.created_at DESC, fp.farm_profile_id DESC"


# ============================================================
# FARMER FARM LIST
# ============================================================

def list_farmer_farms(
    farmer_user_id,
    search="",
    crop_status="",
    farm_status="",
    sort_by=SORT_NEWEST,
):
    """
    Return farms owned by ONE authenticated Farmer.
    Farmer identity is strictly derived from verified session/JWT.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_search = _normalize_text(search).lower()
    normalized_crop_status = _normalize_text(crop_status).lower()
    normalized_farm_status = _normalize_text(farm_status).lower()

    if normalized_crop_status and normalized_crop_status not in VALID_CROP_STATUSES:
        raise ValueError("Invalid current crop status.")

    if normalized_farm_status and normalized_farm_status not in VALID_FARM_STATUSES:
        raise ValueError("Invalid farm status.")

    order_by = _farm_order_by(sort_by)

    conditions = [
        "fp.user_id = %s",
    ]
    params = [
        farmer_id,
    ]

    if normalized_search:
        search_pattern = f"%{normalized_search}%"
        conditions.append(
            """
            (
                LOWER(COALESCE(fp.farm_lot_name, '')) LIKE %s
                OR LOWER(COALESCE(fp.street_address, '')) LIKE %s
                OR LOWER(COALESCE(fp.municipality, '')) LIKE %s
                OR LOWER(COALESCE(fp.province, '')) LIKE %s
                OR LOWER(COALESCE(fp.postal_code, '')) LIKE %s
            )
            """
        )
        params.extend([
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
        ])

    if normalized_farm_status:
        conditions.append(
            "LOWER(COALESCE(fs.farm_status, 'Active')) = %s"
        )
        params.append(normalized_farm_status)

    if normalized_crop_status:
        conditions.append(
            """
            (
                CASE
                    WHEN latest_crop.crop_cycle_id IS NULL THEN 'available_for_planting'
                    WHEN LOWER(latest_crop.crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(latest_crop.crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    WHEN LOWER(latest_crop.crop_status) = 'harvested' THEN 'harvested'
                    WHEN LOWER(latest_crop.crop_status) = 'failed crop' THEN 'failed_crop'
                    ELSE LOWER(REPLACE(latest_crop.crop_status, ' ', '_'))
                END
            ) = %s
            """
        )
        params.append(normalized_crop_status)

    where_clause = " AND ".join(conditions)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                fp.farm_profile_id AS farm_id,
                fp.farm_profile_id,
                fp.farm_lot_name AS farm_name,
                fp.farm_lot_name,
                fp.street_address,
                fp.municipality,
                fp.province,
                fp.postal_code,
                CONCAT_WS(', ',
                    NULLIF(TRIM(fp.street_address), ''),
                    NULLIF(TRIM(fp.municipality), ''),
                    NULLIF(TRIM(fp.province), ''),
                    NULLIF(TRIM(fp.postal_code), '')
                ) AS farm_location,
                fp.total_farm_area_hectares AS total_farm_area,
                fp.total_farm_area_hectares,
                fp.land_ownership_status,
                fp.cropping_cycles_per_year,
                fp.rice_variety_currently_planted AS registered_rice_variety,
                fp.rice_variety_currently_planted,
                fp.rsbsa_number,
                fp.rsbsa_id_document,
                LOWER(COALESCE(fs.farm_status, 'Active')) AS farm_status,
                LOWER(COALESCE(fs.farm_status, 'Active')) AS status,
                latest_crop.crop_cycle_id,
                latest_crop.rice_variety AS current_rice_variety,
                CASE
                    WHEN latest_crop.crop_cycle_id IS NULL THEN 'available_for_planting'
                    WHEN LOWER(latest_crop.crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(latest_crop.crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    WHEN LOWER(latest_crop.crop_status) = 'harvested' THEN 'harvested'
                    WHEN LOWER(latest_crop.crop_status) = 'failed crop' THEN 'failed_crop'
                    ELSE LOWER(REPLACE(latest_crop.crop_status, ' ', '_'))
                END AS current_crop_status,
                latest_crop.land_preparation_date,
                latest_crop.planting_date,
                latest_crop.expected_harvest_date,
                latest_crop.expected_yield_kg,
                latest_crop.actual_harvest_date,
                latest_crop.actual_yield_kg,
                latest_crop.failure_reason,
                latest_crop.remarks AS failure_remarks,
                fp.created_at,
                fp.updated_at
            FROM farm_profile fp
            LEFT JOIN existing_grainrise_farmer_farm_status fs
                ON fs.farm_profile_id = fp.farm_profile_id
            LEFT JOIN (
                SELECT cc1.*
                FROM existing_grainrise_farmer_crop_cycles cc1
                INNER JOIN (
                    SELECT farm_profile_id, MAX(crop_cycle_id) AS max_cc_id
                    FROM existing_grainrise_farmer_crop_cycles
                    GROUP BY farm_profile_id
                ) latest_ids ON cc1.crop_cycle_id = latest_ids.max_cc_id
            ) latest_crop ON latest_crop.farm_profile_id = fp.farm_profile_id
            WHERE {where_clause}
            ORDER BY {order_by}
            """,
            params,
        )
        rows = _rows_to_dicts(cursor)
        for row in rows:
            row["barangay"] = _extract_barangay(row.get("street_address"))
        return rows


# ============================================================
# SPECIFIC FARM DETAILS
# ============================================================

def get_farmer_farm_details(farmer_user_id, farm_id):
    """
    Get one farm only when it belongs to the authenticated Farmer.
    Returns None if not found or unauthorized.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fp.farm_profile_id AS farm_id,
                fp.farm_profile_id,
                fp.user_id,
                fp.farm_lot_name AS farm_name,
                fp.farm_lot_name,
                fp.street_address,
                fp.municipality,
                fp.province,
                fp.postal_code,
                CONCAT_WS(', ',
                    NULLIF(TRIM(fp.street_address), ''),
                    NULLIF(TRIM(fp.municipality), ''),
                    NULLIF(TRIM(fp.province), ''),
                    NULLIF(TRIM(fp.postal_code), '')
                ) AS farm_location,
                fp.total_farm_area_hectares AS total_farm_area,
                fp.total_farm_area_hectares,
                fp.land_ownership_status,
                fp.cropping_cycles_per_year,
                fp.rice_variety_currently_planted AS registered_rice_variety,
                fp.rice_variety_currently_planted,
                fp.rsbsa_number,
                fp.rsbsa_id_document,
                LOWER(COALESCE(fs.farm_status, 'Active')) AS farm_status,
                LOWER(COALESCE(fs.farm_status, 'Active')) AS status,
                fs.inactive_reason,
                fs.inactive_at,
                latest_crop.crop_cycle_id,
                latest_crop.cycle_number,
                latest_crop.rice_variety AS current_rice_variety,
                CASE
                    WHEN latest_crop.crop_cycle_id IS NULL THEN 'available_for_planting'
                    WHEN LOWER(latest_crop.crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(latest_crop.crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    WHEN LOWER(latest_crop.crop_status) = 'harvested' THEN 'harvested'
                    WHEN LOWER(latest_crop.crop_status) = 'failed crop' THEN 'failed_crop'
                    ELSE LOWER(REPLACE(latest_crop.crop_status, ' ', '_'))
                END AS current_crop_status,
                latest_crop.land_preparation_date,
                latest_crop.planting_date,
                latest_crop.expected_harvest_date,
                latest_crop.expected_yield_kg,
                latest_crop.actual_harvest_date,
                latest_crop.actual_yield_kg,
                latest_crop.failure_reason,
                latest_crop.remarks AS failure_remarks,
                latest_crop.remarks,
                latest_crop.created_at AS crop_cycle_created_at,
                latest_crop.updated_at AS crop_cycle_updated_at,
                fp.created_at AS farm_created_at,
                fp.updated_at AS farm_updated_at,
                fp.created_at,
                fp.updated_at
            FROM farm_profile fp
            LEFT JOIN existing_grainrise_farmer_farm_status fs
                ON fs.farm_profile_id = fp.farm_profile_id
            LEFT JOIN (
                SELECT cc1.*
                FROM existing_grainrise_farmer_crop_cycles cc1
                INNER JOIN (
                    SELECT farm_profile_id, MAX(crop_cycle_id) AS max_cc_id
                    FROM existing_grainrise_farmer_crop_cycles
                    GROUP BY farm_profile_id
                ) latest_ids ON cc1.crop_cycle_id = latest_ids.max_cc_id
            ) latest_crop ON latest_crop.farm_profile_id = fp.farm_profile_id
            WHERE fp.farm_profile_id = %s
              AND fp.user_id = %s
            LIMIT 1
            """,
            [normalized_farm_id, farmer_id],
        )
        farm = _row_to_dict(cursor)

        if not farm:
            return None

        farm["barangay"] = _extract_barangay(farm.get("street_address"))

        # Fetch full crop cycle history for this farm
        cursor.execute(
            """
            SELECT
                crop_cycle_id,
                farm_profile_id AS farm_id,
                farm_profile_id,
                cycle_number,
                rice_variety,
                crop_status,
                CASE
                    WHEN LOWER(crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    WHEN LOWER(crop_status) = 'harvested' THEN 'harvested'
                    WHEN LOWER(crop_status) = 'failed crop' THEN 'failed_crop'
                    ELSE LOWER(REPLACE(crop_status, ' ', '_'))
                END AS normalized_crop_status,
                land_preparation_date,
                planting_date,
                expected_harvest_date,
                expected_yield_kg,
                actual_harvest_date,
                actual_yield_kg,
                failure_reason,
                remarks AS failure_remarks,
                remarks,
                created_at,
                updated_at
            FROM existing_grainrise_farmer_crop_cycles
            WHERE farm_profile_id = %s
            ORDER BY cycle_number DESC, crop_cycle_id DESC
            """,
            [normalized_farm_id],
        )
        farm["crop_history"] = _rows_to_dicts(cursor)

        return farm


# ============================================================
# FARM OWNERSHIP LOOKUP
# ============================================================

def get_farmer_owned_farm(farmer_user_id, farm_id):
    """
    Lightweight ownership lookup for mutation services.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fp.farm_profile_id AS farm_id,
                fp.farm_profile_id,
                fp.user_id,
                fp.farm_lot_name AS farm_name,
                LOWER(COALESCE(fs.farm_status, 'Active')) AS farm_status,
                fp.rice_variety_currently_planted AS registered_rice_variety,
                fp.total_farm_area_hectares AS total_farm_area
            FROM farm_profile fp
            LEFT JOIN existing_grainrise_farmer_farm_status fs
                ON fs.farm_profile_id = fp.farm_profile_id
            WHERE fp.farm_profile_id = %s
              AND fp.user_id = %s
            LIMIT 1
            """,
            [normalized_farm_id, farmer_id],
        )
        return _row_to_dict(cursor)


# ============================================================
# LATEST & ACTIVE CROPPING CYCLE
# ============================================================

def get_latest_crop_cycle(farmer_user_id, farm_id):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fcc.crop_cycle_id,
                fcc.farm_profile_id AS farm_id,
                fcc.farm_profile_id,
                fcc.cycle_number,
                fcc.rice_variety,
                fcc.crop_status,
                CASE
                    WHEN LOWER(fcc.crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(fcc.crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    WHEN LOWER(fcc.crop_status) = 'harvested' THEN 'harvested'
                    WHEN LOWER(fcc.crop_status) = 'failed crop' THEN 'failed_crop'
                    ELSE LOWER(REPLACE(fcc.crop_status, ' ', '_'))
                END AS normalized_crop_status,
                fcc.land_preparation_date,
                fcc.planting_date,
                fcc.expected_harvest_date,
                fcc.expected_yield_kg,
                fcc.actual_harvest_date,
                fcc.actual_yield_kg,
                fcc.failure_reason,
                fcc.remarks AS failure_remarks,
                fcc.remarks,
                fcc.created_at,
                fcc.updated_at
            FROM existing_grainrise_farmer_crop_cycles fcc
            INNER JOIN farm_profile fp
                ON fp.farm_profile_id = fcc.farm_profile_id
            WHERE fcc.farm_profile_id = %s
              AND fp.user_id = %s
            ORDER BY fcc.cycle_number DESC, fcc.crop_cycle_id DESC
            LIMIT 1
            """,
            [normalized_farm_id, farmer_id],
        )
        return _row_to_dict(cursor)


def get_active_crop_cycle(farmer_user_id, farm_id):
    """
    Return active/ongoing cycle ('Land Preparation' or 'Planted and Growing').
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fcc.crop_cycle_id,
                fcc.farm_profile_id AS farm_id,
                fcc.farm_profile_id,
                fcc.cycle_number,
                fcc.rice_variety,
                fcc.crop_status,
                CASE
                    WHEN LOWER(fcc.crop_status) = 'land preparation' THEN 'land_preparation'
                    WHEN LOWER(fcc.crop_status) = 'planted and growing' THEN 'planted_and_growing'
                    ELSE LOWER(REPLACE(fcc.crop_status, ' ', '_'))
                END AS normalized_crop_status,
                fcc.land_preparation_date,
                fcc.planting_date,
                fcc.expected_harvest_date,
                fcc.expected_yield_kg,
                fcc.actual_harvest_date,
                fcc.actual_yield_kg,
                fcc.failure_reason,
                fcc.remarks AS failure_remarks,
                fcc.remarks,
                fcc.created_at,
                fcc.updated_at
            FROM existing_grainrise_farmer_crop_cycles fcc
            INNER JOIN farm_profile fp
                ON fp.farm_profile_id = fcc.farm_profile_id
            WHERE fcc.farm_profile_id = %s
              AND fp.user_id = %s
              AND fcc.crop_status IN ('Land Preparation', 'Planted and Growing')
            ORDER BY fcc.crop_cycle_id DESC
            LIMIT 1
            """,
            [normalized_farm_id, farmer_id],
        )
        return _row_to_dict(cursor)


# ============================================================
# FARM ACTIVITY LOG
# ============================================================

def list_farmer_farm_activity(
    farmer_user_id,
    farm_id,
    page=1,
    page_size=10,
):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    try:
        normalized_page = max(1, int(page))
    except (TypeError, ValueError):
        normalized_page = 1

    try:
        normalized_page_size = min(max(int(page_size), 1), 100)
    except (TypeError, ValueError):
        normalized_page_size = 10

    offset = (normalized_page - 1) * normalized_page_size

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM existing_grainrise_farmer_farm_activity_logs fal
            INNER JOIN farm_profile fp
                ON fp.farm_profile_id = fal.farm_profile_id
            WHERE fal.farm_profile_id = %s
              AND fp.user_id = %s
            """,
            [normalized_farm_id, farmer_id],
        )
        total = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT
                fal.activity_id AS farm_activity_id,
                fal.activity_id,
                fal.farm_profile_id AS farm_id,
                fal.crop_cycle_id,
                fal.created_at AS activity_date_time,
                fal.activity_type,
                fal.rice_variety,
                fal.crop_status AS farm_crop_status,
                fal.details AS details_remarks,
                fal.details,
                fal.performed_by_user_id,
                CONCAT_WS(' ',
                    NULLIF(TRIM(performer.first_name), ''),
                    NULLIF(TRIM(performer.middle_initial), ''),
                    NULLIF(TRIM(performer.last_name), ''),
                    NULLIF(TRIM(performer.suffix), '')
                ) AS performed_by
            FROM existing_grainrise_farmer_farm_activity_logs fal
            INNER JOIN farm_profile fp
                ON fp.farm_profile_id = fal.farm_profile_id
            LEFT JOIN users performer
                ON performer.user_id = fal.performed_by_user_id
            WHERE fal.farm_profile_id = %s
              AND fp.user_id = %s
            ORDER BY fal.created_at DESC, fal.activity_id DESC
            LIMIT %s OFFSET %s
            """,
            [normalized_farm_id, farmer_id, normalized_page_size, offset],
        )
        items = _rows_to_dicts(cursor)

    total_pages = (total + normalized_page_size - 1) // normalized_page_size if total else 0

    return {
        "items": items,
        "pagination": {
            "page": normalized_page,
            "page_size": normalized_page_size,
            "total_items": total,
            "total_pages": total_pages,
        },
    }
