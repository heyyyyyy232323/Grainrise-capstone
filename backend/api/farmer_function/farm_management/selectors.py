from django.db import connection


# ============================================================
# FARM MANAGEMENT CONSTANTS
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


def _row_to_dict(cursor):
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
# NORMALIZATION HELPERS
# ============================================================

def _normalize_text(value):
    return str(
        value or ""
    ).strip()


def _normalize_farmer_id(
    farmer_user_id,
):
    try:
        normalized = int(
            farmer_user_id
        )
    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid authenticated Farmer ID."
        ) from exc

    if normalized <= 0:
        raise ValueError(
            "Invalid authenticated Farmer ID."
        )

    return normalized


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
        raise ValueError(
            "Invalid farm ID."
        ) from exc

    if normalized <= 0:
        raise ValueError(
            "Invalid farm ID."
        )

    return normalized


# ============================================================
# LIST SORT
# ============================================================

def _farm_order_by(sort_by):
    normalized = (
        _normalize_text(
            sort_by
        ).lower()
        or SORT_NEWEST
    )

    if normalized not in VALID_SORTS:
        raise ValueError(
            "Invalid farm sort option."
        )

    if normalized == SORT_OLDEST:
        return """
            ff.created_at ASC,
            ff.farm_id ASC
        """

    if normalized == SORT_SIZE_HIGHEST:
        return """
            ff.total_farm_area DESC,
            ff.created_at DESC,
            ff.farm_id DESC
        """

    if normalized == SORT_SIZE_LOWEST:
        return """
            ff.total_farm_area ASC,
            ff.created_at DESC,
            ff.farm_id DESC
        """

    return """
        ff.created_at DESC,
        ff.farm_id DESC
    """


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

    IMPORTANT:
    farmer_user_id must come from the verified JWT/session,
    never from a client-supplied user_id.

    Current Crop Status:
    - If the farm has never had a cropping cycle:
        available_for_planting
    - Otherwise:
        status of the latest cropping cycle
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_search = (
        _normalize_text(
            search
        )
    )

    normalized_crop_status = (
        _normalize_text(
            crop_status
        ).lower()
    )

    normalized_farm_status = (
        _normalize_text(
            farm_status
        ).lower()
    )

    if (
        normalized_crop_status
        and normalized_crop_status
        not in VALID_CROP_STATUSES
    ):
        raise ValueError(
            "Invalid current crop status."
        )

    if (
        normalized_farm_status
        and normalized_farm_status
        not in VALID_FARM_STATUSES
    ):
        raise ValueError(
            "Invalid farm status."
        )

    order_by = _farm_order_by(
        sort_by
    )

    conditions = [
        "ff.user_id = %s",
    ]

    params = [
        farmer_id,
    ]

    if normalized_search:
        search_pattern = (
            f"%{normalized_search}%"
        )

        conditions.append(
            """
            (
                COALESCE(
                    ff.farm_name,
                    ''
                ) ILIKE %s

                OR ff.street_address
                    ILIKE %s

                OR ff.barangay
                    ILIKE %s

                OR ff.municipality
                    ILIKE %s

                OR ff.province
                    ILIKE %s
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

    if normalized_farm_status:
        conditions.append(
            "ff.farm_status = %s"
        )
        params.append(
            normalized_farm_status
        )

    if normalized_crop_status:
        conditions.append(
            """
            (
                CASE
                    WHEN latest_crop.crop_cycle_id
                        IS NULL
                    THEN
                        'available_for_planting'
                    ELSE
                        latest_crop.crop_status
                END
            ) = %s
            """
        )
        params.append(
            normalized_crop_status
        )

    where_clause = "\nAND ".join(
        conditions
    )

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                ff.farm_id,
                ff.farm_name,
                ff.street_address,
                ff.barangay,
                ff.municipality,
                ff.province,
                ff.postal_code,

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

                ff.total_farm_area,
                ff.land_ownership_status,
                ff.cropping_cycles_per_year,

                ff.rice_variety_currently_planted
                    AS registered_rice_variety,

                ff.farm_status,

                latest_crop.crop_cycle_id,

                latest_crop.rice_variety
                    AS current_rice_variety,

                CASE
                    WHEN latest_crop.crop_cycle_id
                        IS NULL
                    THEN
                        'available_for_planting'
                    ELSE
                        latest_crop.crop_status
                END
                AS current_crop_status,

                latest_crop.land_preparation_date,
                latest_crop.planting_date,
                latest_crop.expected_harvest_date,
                latest_crop.expected_yield_kg,
                latest_crop.actual_harvest_date,
                latest_crop.actual_yield_kg,

                ff.created_at,
                ff.updated_at

            FROM farmer_farms ff

            LEFT JOIN LATERAL (
                SELECT
                    fcc.crop_cycle_id,
                    fcc.rice_variety,
                    fcc.crop_status,
                    fcc.land_preparation_date,
                    fcc.planting_date,
                    fcc.expected_harvest_date,
                    fcc.expected_yield_kg,
                    fcc.actual_harvest_date,
                    fcc.actual_yield_kg,
                    fcc.created_at

                FROM farmer_crop_cycles fcc

                WHERE
                    fcc.farm_id =
                        ff.farm_id

                ORDER BY
                    fcc.created_at DESC,
                    fcc.crop_cycle_id DESC

                LIMIT 1
            ) latest_crop
                ON TRUE

            WHERE
                {where_clause}

            ORDER BY
                {order_by}
            """,
            params,
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# SPECIFIC FARM DETAILS
# ============================================================

def get_farmer_farm_details(
    farmer_user_id,
    farm_id,
):
    """
    Get one farm only when it belongs to the authenticated
    Farmer.
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                ff.farm_id,
                ff.farm_name,
                ff.street_address,
                ff.barangay,
                ff.municipality,
                ff.province,
                ff.postal_code,

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

                ff.total_farm_area,
                ff.land_ownership_status,
                ff.cropping_cycles_per_year,
                ff.farm_status,

                ff.rice_variety_currently_planted
                    AS registered_rice_variety,

                ff.created_at AS farm_created_at,
                ff.updated_at AS farm_updated_at,

                latest_crop.crop_cycle_id,

                latest_crop.rice_variety
                    AS current_rice_variety,

                CASE
                    WHEN latest_crop.crop_cycle_id
                        IS NULL
                    THEN
                        'available_for_planting'
                    ELSE
                        latest_crop.crop_status
                END
                AS current_crop_status,

                latest_crop.land_preparation_date,
                latest_crop.planting_date,
                latest_crop.expected_harvest_date,
                latest_crop.expected_yield_kg,
                latest_crop.actual_harvest_date,
                latest_crop.actual_yield_kg,
                latest_crop.failure_reason,
                latest_crop.failure_remarks,

                latest_crop.created_at
                    AS crop_cycle_created_at,

                latest_crop.updated_at
                    AS crop_cycle_updated_at,

                latest_crop.completed_at
                    AS crop_cycle_completed_at

            FROM farmer_farms ff

            LEFT JOIN LATERAL (
                SELECT
                    fcc.crop_cycle_id,
                    fcc.rice_variety,
                    fcc.crop_status,
                    fcc.land_preparation_date,
                    fcc.planting_date,
                    fcc.expected_harvest_date,
                    fcc.expected_yield_kg,
                    fcc.actual_harvest_date,
                    fcc.actual_yield_kg,
                    fcc.failure_reason,
                    fcc.failure_remarks,
                    fcc.created_at,
                    fcc.updated_at,
                    fcc.completed_at

                FROM farmer_crop_cycles fcc

                WHERE
                    fcc.farm_id =
                        ff.farm_id

                ORDER BY
                    fcc.created_at DESC,
                    fcc.crop_cycle_id DESC

                LIMIT 1
            ) latest_crop
                ON TRUE

            WHERE
                ff.farm_id = %s
                AND ff.user_id = %s

            LIMIT 1
            """,
            [
                normalized_farm_id,
                farmer_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# FARM OWNERSHIP LOOKUP
# ============================================================

def get_farmer_owned_farm(
    farmer_user_id,
    farm_id,
):
    """
    Lightweight ownership lookup for later service actions.
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                farm_id,
                user_id,
                farm_name,
                farm_status
            FROM farmer_farms
            WHERE farm_id = %s
              AND user_id = %s
            LIMIT 1
            """,
            [
                normalized_farm_id,
                farmer_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# LATEST CROPPING CYCLE
# ============================================================

def get_latest_crop_cycle(
    farmer_user_id,
    farm_id,
):
    """
    Return the latest crop cycle for an owned farm.
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fcc.crop_cycle_id,
                fcc.farm_id,
                fcc.rice_variety,
                fcc.crop_status,
                fcc.land_preparation_date,
                fcc.planting_date,
                fcc.expected_harvest_date,
                fcc.expected_yield_kg,
                fcc.actual_harvest_date,
                fcc.actual_yield_kg,
                fcc.failure_reason,
                fcc.failure_remarks,
                fcc.created_at,
                fcc.updated_at,
                fcc.completed_at

            FROM farmer_crop_cycles fcc

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fcc.farm_id

            WHERE
                fcc.farm_id = %s
                AND ff.user_id = %s

            ORDER BY
                fcc.created_at DESC,
                fcc.crop_cycle_id DESC

            LIMIT 1
            """,
            [
                normalized_farm_id,
                farmer_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# ACTIVE CROPPING CYCLE
# ============================================================

def get_active_crop_cycle(
    farmer_user_id,
    farm_id,
):
    """
    Return an ongoing crop cycle only.

    Ongoing:
    - land_preparation
    - planted_and_growing
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fcc.crop_cycle_id,
                fcc.farm_id,
                fcc.rice_variety,
                fcc.crop_status,
                fcc.land_preparation_date,
                fcc.planting_date,
                fcc.expected_harvest_date,
                fcc.expected_yield_kg,
                fcc.actual_harvest_date,
                fcc.actual_yield_kg,
                fcc.failure_reason,
                fcc.failure_remarks,
                fcc.created_at,
                fcc.updated_at,
                fcc.completed_at

            FROM farmer_crop_cycles fcc

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fcc.farm_id

            WHERE
                fcc.farm_id = %s
                AND ff.user_id = %s
                AND fcc.crop_status IN (
                    'land_preparation',
                    'planted_and_growing'
                )

            ORDER BY
                fcc.created_at DESC,
                fcc.crop_cycle_id DESC

            LIMIT 1
            """,
            [
                normalized_farm_id,
                farmer_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# FARM ACTIVITY LOG
# ============================================================

def list_farmer_farm_activity(
    farmer_user_id,
    farm_id,
    page=1,
    page_size=10,
):
    """
    Paginated Farm Activity Log for one owned farm.
    """

    farmer_id = _normalize_farmer_id(
        farmer_user_id
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    try:
        normalized_page = max(
            1,
            int(page),
        )
    except (
        TypeError,
        ValueError,
    ):
        normalized_page = 1

    try:
        normalized_page_size = int(
            page_size
        )
    except (
        TypeError,
        ValueError,
    ):
        normalized_page_size = 10

    normalized_page_size = min(
        max(
            normalized_page_size,
            1,
        ),
        100,
    )

    offset = (
        normalized_page - 1
    ) * normalized_page_size

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)
            FROM farmer_farm_activity_logs fal

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fal.farm_id

            WHERE
                fal.farm_id = %s
                AND ff.user_id = %s
            """,
            [
                normalized_farm_id,
                farmer_id,
            ],
        )

        total = cursor.fetchone()[0]

        cursor.execute(
            """
            SELECT
                fal.farm_activity_id,
                fal.farm_id,
                fal.crop_cycle_id,

                fal.created_at
                    AS activity_date_time,

                fal.activity_type,
                fal.rice_variety,
                fal.farm_crop_status,
                fal.details_remarks,
                fal.performed_by_user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            performer.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            performer.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            performer.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            performer.suffix
                        ),
                        ''
                    )
                )
                AS performed_by

            FROM farmer_farm_activity_logs fal

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fal.farm_id

            LEFT JOIN users performer
                ON performer.user_id =
                    fal.performed_by_user_id

            WHERE
                fal.farm_id = %s
                AND ff.user_id = %s

            ORDER BY
                fal.created_at DESC,
                fal.farm_activity_id DESC

            LIMIT %s
            OFFSET %s
            """,
            [
                normalized_farm_id,
                farmer_id,
                normalized_page_size,
                offset,
            ],
        )

        items = _rows_to_dicts(
            cursor
        )

    total_pages = (
        (
            total
            + normalized_page_size
            - 1
        )
        // normalized_page_size
        if total
        else 0
    )

    return {
        "items": items,
        "pagination": {
            "page": normalized_page,
            "page_size": normalized_page_size,
            "total_items": total,
            "total_pages": total_pages,
        },
    }
