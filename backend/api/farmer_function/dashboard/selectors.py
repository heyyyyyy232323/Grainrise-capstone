from django.db import connection


# ============================================================
# GRAINRISE
# FARMER DASHBOARD SELECTORS
# ============================================================


# ============================================================
# DATABASE HELPERS
# ============================================================

def _fetchone_dict(cursor):
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


def _fetchall_dict(cursor):
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


def _validate_farmer_id(farmer_user_id):
    try:
        farmer_id = int(
            farmer_user_id
        )
    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid authenticated Farmer ID."
        ) from exc

    if farmer_id <= 0:
        raise ValueError(
            "Invalid authenticated Farmer ID."
        )

    return farmer_id


# ============================================================
# KPI
# ============================================================

def get_farmer_dashboard_kpis(
    farmer_user_id,
):
    farmer_id = _validate_farmer_id(
        farmer_user_id
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH

            available_millers AS (
                SELECT
                    COUNT(
                        DISTINCT sp.supplier_profile_id
                    ) AS total
                FROM supplier_profiles sp
                INNER JOIN users u
                    ON u.user_id = sp.user_id
                WHERE
                    u.user_role = 'miller_manager'
                    AND u.status = 'active'
            ),

            contracted_millers AS (
                SELECT
                    COUNT(
                        DISTINCT c.supplier_profile_id
                    ) AS total
                FROM contracts c
                WHERE
                    c.farmer_user_id = %s
                    AND c.contract_status IN (
                        'active',
                        'void_requested'
                    )
            ),

            current_farm_state AS (
                SELECT
                    ff.farm_id,
                    ff.total_farm_area,
                    ff.farm_status,

                    CASE
                        WHEN current_cycle.crop_cycle_id
                            IS NULL
                        THEN
                            'available_for_planting'
                        ELSE
                            current_cycle.crop_status
                    END AS current_crop_status

                FROM farmer_farms ff

                LEFT JOIN LATERAL (
                    SELECT
                        fcc.crop_cycle_id,
                        fcc.crop_status
                    FROM farmer_crop_cycles fcc
                    WHERE
                        fcc.farm_id = ff.farm_id
                        AND fcc.completed_at IS NULL
                    ORDER BY
                        fcc.created_at DESC,
                        fcc.crop_cycle_id DESC
                    LIMIT 1
                ) current_cycle
                    ON TRUE

                WHERE
                    ff.user_id = %s
            ),

            farm_summary AS (
                SELECT

                    COALESCE(
                        SUM(total_farm_area)
                        FILTER (
                            WHERE
                                farm_status = 'active'
                                AND current_crop_status =
                                    'planted_and_growing'
                        ),
                        0
                    ) AS harvest_area,

                    COALESCE(
                        SUM(total_farm_area)
                        FILTER (
                            WHERE
                                farm_status = 'active'
                                AND current_crop_status =
                                    'available_for_planting'
                        ),
                        0
                    ) AS cropping_area

                FROM current_farm_state
            )

            SELECT
                am.total AS available_millers,
                cm.total AS contracted_millers,
                fs.harvest_area,
                fs.cropping_area

            FROM available_millers am
            CROSS JOIN contracted_millers cm
            CROSS JOIN farm_summary fs
            """,
            [
                farmer_id,
                farmer_id,
            ],
        )

        row = (
            _fetchone_dict(cursor)
            or {}
        )

    return {
        "available_millers": int(
            row.get(
                "available_millers"
            )
            or 0
        ),

        "contracted_millers": int(
            row.get(
                "contracted_millers"
            )
            or 0
        ),

        "registered_harvest_area_ha": float(
            row.get(
                "harvest_area"
            )
            or 0
        ),

        "potential_cropping_area_ha": float(
            row.get(
                "cropping_area"
            )
            or 0
        ),
    }


# ============================================================
# PALAY BUYING PRICE TREND
# ============================================================

def get_palay_market_price_trend(
    months=6,
):
    month_count = max(
        1,
        min(
            int(months),
            24,
        ),
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH month_series AS (
                SELECT
                    GENERATE_SERIES(
                        DATE_TRUNC(
                            'month',
                            CURRENT_DATE
                        )
                        -
                        (%s - 1)
                        * INTERVAL '1 month',

                        DATE_TRUNC(
                            'month',
                            CURRENT_DATE
                        ),

                        INTERVAL '1 month'
                    )::DATE
                    AS month_start
            ),

            monthly_prices AS (
                SELECT
                    DATE_TRUNC(
                        'month',
                        cp.created_at
                    )::DATE
                    AS month_start,

                    AVG(
                        cp.buying_price_per_kg
                    )
                    AS average_price,

                    MIN(
                        cp.buying_price_per_kg
                    )
                    AS minimum_price,

                    MAX(
                        cp.buying_price_per_kg
                    )
                    AS maximum_price,

                    COUNT(*)
                    AS record_count

                FROM contract_postings cp

                WHERE
                    cp.product_type =
                        'unmilled_palay'

                    AND cp.posting_status
                        <> 'cancelled'

                    AND cp.created_at >=
                        DATE_TRUNC(
                            'month',
                            CURRENT_DATE
                        )
                        -
                        (%s - 1)
                        * INTERVAL '1 month'

                GROUP BY
                    DATE_TRUNC(
                        'month',
                        cp.created_at
                    )
            )

            SELECT
                ms.month_start,

                ROUND(
                    mp.average_price,
                    2
                ) AS average_price_per_kg,

                ROUND(
                    mp.minimum_price,
                    2
                ) AS minimum_price_per_kg,

                ROUND(
                    mp.maximum_price,
                    2
                ) AS maximum_price_per_kg,

                COALESCE(
                    mp.record_count,
                    0
                ) AS record_count

            FROM month_series ms

            LEFT JOIN monthly_prices mp
                ON mp.month_start =
                    ms.month_start

            ORDER BY
                ms.month_start ASC
            """,
            [
                month_count,
                month_count,
            ],
        )

        rows = _fetchall_dict(
            cursor
        )

    return [
        {
            "period_start":
                row[
                    "month_start"
                ],

            "average_price_per_kg":
                float(
                    row[
                        "average_price_per_kg"
                    ]
                )
                if row[
                    "average_price_per_kg"
                ] is not None
                else None,

            "minimum_price_per_kg":
                float(
                    row[
                        "minimum_price_per_kg"
                    ]
                )
                if row[
                    "minimum_price_per_kg"
                ] is not None
                else None,

            "maximum_price_per_kg":
                float(
                    row[
                        "maximum_price_per_kg"
                    ]
                )
                if row[
                    "maximum_price_per_kg"
                ] is not None
                else None,

            "record_count":
                int(
                    row[
                        "record_count"
                    ]
                    or 0
                ),
        }
        for row in rows
    ]


# ============================================================
# HARVEST / YIELD HISTORY
# ============================================================

def get_farmer_yield_history(
    farmer_user_id,
    limit=6,
):
    farmer_id = _validate_farmer_id(
        farmer_user_id
    )

    history_limit = max(
        1,
        min(
            int(limit),
            24,
        ),
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fcc.crop_cycle_id,
                ff.farm_id,
                ff.farm_name,
                fcc.rice_variety,
                fcc.actual_harvest_date,
                fcc.actual_yield_kg

            FROM farmer_crop_cycles fcc

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fcc.farm_id

            WHERE
                ff.user_id = %s

                AND fcc.crop_status =
                    'harvested'

                AND fcc.actual_harvest_date
                    IS NOT NULL

                AND fcc.actual_yield_kg
                    IS NOT NULL

                AND fcc.actual_yield_kg > 0

            ORDER BY
                fcc.actual_harvest_date DESC,
                fcc.crop_cycle_id DESC

            LIMIT %s
            """,
            [
                farmer_id,
                history_limit,
            ],
        )

        rows = _fetchall_dict(
            cursor
        )

    rows.reverse()

    return [
        {
            "crop_cycle_id":
                row[
                    "crop_cycle_id"
                ],

            "farm_id":
                row[
                    "farm_id"
                ],

            "farm_name":
                row[
                    "farm_name"
                ],

            "rice_variety":
                row[
                    "rice_variety"
                ],

            "actual_harvest_date":
                row[
                    "actual_harvest_date"
                ],

            "actual_yield_kg":
                float(
                    row[
                        "actual_yield_kg"
                    ]
                ),
        }
        for row in rows
    ]


# ============================================================
# CLIMATE OUTLOOK
# ============================================================

def get_farmer_climate_outlook(
    farmer_user_id,
    months=6,
):
    """
    RULE:

    1. Use Farmer's latest completed climate forecast,
       regardless of selected location source.

    Supported:
        registered_farm
        searched_location
        map_location
        current_location

    2. If Farmer has NOT generated a climate forecast yet,
       use the first ACTIVE registered farm as the default
       location label.

    3. No fake climate data is generated.
    """

    farmer_id = _validate_farmer_id(
        farmer_user_id
    )

    month_count = max(
        1,
        min(
            int(months),
            12,
        ),
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH

            latest_run AS (
                SELECT
                    fcfr.climate_forecast_run_id,
                    fcfr.farm_id,
                    fcfr.location_source,
                    fcfr.location_label,
                    fcfr.latitude,
                    fcfr.longitude,
                    fcfr.forecast_fetch_id,
                    fcfr.completed_at

                FROM farmer_climate_forecast_runs fcfr

                WHERE
                    fcfr.farmer_user_id = %s
                    AND fcfr.run_status =
                        'completed'
                    AND fcfr.forecast_fetch_id
                        IS NOT NULL

                ORDER BY
                    fcfr.completed_at DESC,
                    fcfr.climate_forecast_run_id DESC

                LIMIT 1
            ),

            default_farm AS (
                SELECT
                    ff.farm_id,

                    CONCAT_WS(
                        ', ',
                        NULLIF(
                            BTRIM(
                                COALESCE(
                                    ff.farm_name,
                                    ''
                                )
                            ),
                            ''
                        ),

                        NULLIF(
                            BTRIM(
                                COALESCE(
                                    ff.barangay,
                                    ''
                                )
                            ),
                            ''
                        ),

                        NULLIF(
                            BTRIM(
                                COALESCE(
                                    ff.municipality,
                                    ''
                                )
                            ),
                            ''
                        ),

                        NULLIF(
                            BTRIM(
                                COALESCE(
                                    ff.province,
                                    ''
                                )
                            ),
                            ''
                        )
                    )
                    AS location_label

                FROM farmer_farms ff

                WHERE
                    ff.user_id = %s
                    AND ff.farm_status =
                        'active'

                ORDER BY
                    ff.farm_id ASC

                LIMIT 1
            ),

            location_context AS (
                SELECT
                    lr.climate_forecast_run_id,
                    lr.farm_id,
                    lr.location_source,
                    lr.location_label,
                    lr.latitude,
                    lr.longitude,
                    lr.forecast_fetch_id,
                    lr.completed_at

                FROM latest_run lr

                UNION ALL

                SELECT
                    NULL::BIGINT,
                    df.farm_id,
                    'registered_farm'::VARCHAR,
                    df.location_label,
                    NULL::NUMERIC,
                    NULL::NUMERIC,
                    NULL::BIGINT,
                    NULL::TIMESTAMP

                FROM default_farm df

                WHERE NOT EXISTS (
                    SELECT 1
                    FROM latest_run
                )
            ),

            monthly_points AS (
                SELECT
                    DATE_TRUNC(
                        'month',
                        cdp.period_start
                    )::DATE
                    AS month_start,

                    SUM(
                        cdp.value
                    )
                    FILTER (
                        WHERE
                            cdp.variable_code =
                                'precipitation_mm'
                    )
                    AS rainfall_mm,

                    AVG(
                        cdp.value
                    )
                    FILTER (
                        WHERE
                            cdp.variable_code =
                                'temperature_c'
                    )
                    AS temperature_c

                FROM location_context lc

                INNER JOIN climate_data_points cdp
                    ON cdp.climate_fetch_id =
                        lc.forecast_fetch_id

                WHERE
                    cdp.variable_code IN (
                        'precipitation_mm',
                        'temperature_c'
                    )

                GROUP BY
                    DATE_TRUNC(
                        'month',
                        cdp.period_start
                    )
            ),

            limited_months AS (
                SELECT
                    month_start,
                    rainfall_mm,
                    temperature_c

                FROM monthly_points

                ORDER BY
                    month_start ASC

                LIMIT %s
            )

            SELECT
                lc.climate_forecast_run_id,
                lc.farm_id,
                lc.location_source,
                lc.location_label,
                lc.latitude,
                lc.longitude,
                lc.completed_at
                    AS forecast_generated_at,

                lm.month_start,

                ROUND(
                    lm.rainfall_mm,
                    2
                ) AS rainfall_mm,

                ROUND(
                    lm.temperature_c,
                    2
                ) AS temperature_c

            FROM location_context lc

            LEFT JOIN limited_months lm
                ON TRUE

            ORDER BY
                lm.month_start ASC
                NULLS LAST
            """,
            [
                farmer_id,
                farmer_id,
                month_count,
            ],
        )

        rows = _fetchall_dict(
            cursor
        )

    if not rows:
        return {
            "available": False,
            "climate_forecast_run_id": None,
            "farm_id": None,
            "location_source": None,
            "location": None,
            "latitude": None,
            "longitude": None,
            "forecast_generated_at": None,
            "series": [],
        }

    first = rows[0]

    series = [
        {
            "period_start":
                row[
                    "month_start"
                ],

            "rainfall_mm":
                float(
                    row[
                        "rainfall_mm"
                    ]
                )
                if row[
                    "rainfall_mm"
                ] is not None
                else None,

            "temperature_c":
                float(
                    row[
                        "temperature_c"
                    ]
                )
                if row[
                    "temperature_c"
                ] is not None
                else None,
        }

        for row in rows

        if row[
            "month_start"
        ] is not None
    ]

    return {
        "available":
            bool(series),

        "climate_forecast_run_id":
            first[
                "climate_forecast_run_id"
            ],

        "farm_id":
            first[
                "farm_id"
            ],

        "location_source":
            first[
                "location_source"
            ],

        "location":
            first[
                "location_label"
            ],

        "latitude":
            float(
                first[
                    "latitude"
                ]
            )
            if first[
                "latitude"
            ] is not None
            else None,

        "longitude":
            float(
                first[
                    "longitude"
                ]
            )
            if first[
                "longitude"
            ] is not None
            else None,

        "forecast_generated_at":
            first[
                "forecast_generated_at"
            ],

        "series":
            series,
    }


# ============================================================
# COMPLETE DASHBOARD
# ============================================================

def get_farmer_dashboard_data(
    farmer_user_id,
):
    farmer_id = _validate_farmer_id(
        farmer_user_id
    )

    return {
        "kpis":
            get_farmer_dashboard_kpis(
                farmer_id
            ),

        "palay_market_price_trend":
            get_palay_market_price_trend(
                months=6
            ),

        "yield_history":
            get_farmer_yield_history(
                farmer_id,
                limit=6,
            ),

        "climate_outlook":
            get_farmer_climate_outlook(
                farmer_id,
                months=6,
            ),
    }