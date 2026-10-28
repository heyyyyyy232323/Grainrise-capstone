from datetime import date



from django.db import connection





# ============================================================

# FARMER FORECASTING

# SELECTORS

# ============================================================

#

# PURPOSE:

#

# Read-only PostgreSQL access for Farmer Forecasting.

#

# SECURITY:

#

# farmer_user_id must always come from:

#

#     request.grainrise_farmer_id

#

# which is populated by the existing Farmer JWT guard.

#

# Never accept farmer_user_id from React as ownership authority.

#

# ============================================================





VALID_GRANULARITIES = {

    "weekly",

    "monthly",

}



VALID_PRODUCT_TYPES = {

    "unmilled_palay",

    "milled_rice",

}



VALID_CLIMATE_DATA_KINDS = {

    "historical",

    "forecast",

}



DEMAND_NEWS_CATEGORIES = {

    "market_updates",

    "supply_chain",

    "policy_regulation",

    "weather_climate",

    "general_agriculture",

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

        dict(zip(columns, row))

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



    return dict(zip(columns, row))





# ============================================================

# NORMALIZATION HELPERS

# ============================================================





def _normalize_farmer_id(farmer_user_id):

    try:

        farmer_id = int(farmer_user_id)

    except (TypeError, ValueError) as exc:

        raise ValueError(

            "Invalid authenticated Farmer ID."

        ) from exc



    if farmer_id <= 0:

        raise ValueError(

            "Invalid authenticated Farmer ID."

        )



    return farmer_id





def _normalize_positive_id(value, field_name):

    try:

        normalized = int(value)

    except (TypeError, ValueError) as exc:

        raise ValueError(

            f"Invalid {field_name}."

        ) from exc



    if normalized <= 0:

        raise ValueError(

            f"Invalid {field_name}."

        )



    return normalized





def _normalize_text(value):

    return str(value or "").strip()





def _normalize_product_type(value):

    normalized = _normalize_text(value).lower()



    if normalized not in VALID_PRODUCT_TYPES:

        raise ValueError(

            "Invalid Demand Forecast product type."

        )



    return normalized





def _normalize_rice_variety(value):

    normalized = _normalize_text(value)



    if not normalized:

        raise ValueError(

            "Rice variety is required for Demand Forecasting."

        )



    return normalized





def _normalize_granularity(value):

    normalized = _normalize_text(value).lower()



    if normalized not in VALID_GRANULARITIES:

        raise ValueError(

            "Forecast granularity must be weekly or monthly."

        )



    return normalized





def _normalize_date(value, field_name):

    if isinstance(value, date):

        return value



    normalized = _normalize_text(value)



    if not normalized:

        raise ValueError(

            f"{field_name} is required."

        )



    try:

        return date.fromisoformat(normalized)

    except ValueError as exc:

        raise ValueError(

            f"{field_name} must use YYYY-MM-DD format."

        ) from exc





def _normalize_date_range(start_date, end_date):

    normalized_start = _normalize_date(

        start_date,

        "Start date",

    )

    normalized_end = _normalize_date(

        end_date,

        "End date",

    )



    if normalized_start > normalized_end:

        raise ValueError(

            "Start date cannot be after end date."

        )



    return normalized_start, normalized_end





def _normalize_coordinate(value, field_name, minimum, maximum):

    try:

        normalized = round(float(value), 6)

    except (TypeError, ValueError) as exc:

        raise ValueError(

            f"Invalid {field_name}."

        ) from exc



    if not minimum <= normalized <= maximum:

        raise ValueError(

            f"Invalid {field_name}."

        )



    return normalized





# ============================================================

# CLIMATE FORECAST FARM OPTIONS

# ============================================================





PHILIPPINE_MUNICIPALITY_COORDINATES = {

    "cabanatuan city": (15.4859, 120.9673),

    "gapan city": (15.3087, 120.9472),

    "san jose city": (15.7903, 120.9981),

    "palayan city": (15.5414, 121.0847),

    "talavera": (15.5847, 120.9197),

    "guimba": (15.6586, 120.7672),

    "muñoz (science city)": (15.7139, 120.9056),

    "pantabangan": (15.8200, 121.1500),

    "cauayan city": (16.9248, 121.7744),

    "santiago city": (16.6917, 121.5475),

    "ilagan city": (17.1481, 121.8883),

    "alicia": (16.7797, 121.6975),

    "roxas": (17.1206, 121.6197),

    "tarlac city": (15.4802, 120.5979),

    "concepcion": (15.3242, 120.6558),

    "capas": (15.3347, 120.5897),

    "paniqui": (15.6664, 120.5819),

    "dagupan city": (16.0433, 120.3339),

    "urdaneta city": (15.9761, 120.5711),

    "san carlos city": (15.9281, 120.3489),

    "rosales": (15.8925, 120.5986),

    "san fernando city": (15.0344, 120.6847),

    "angeles city": (15.1450, 120.5887),

    "arayat": (15.1500, 120.7667),

    "magalang": (15.2208, 120.6606),

    "malolos city": (14.8527, 120.8160),

    "plaridel": (14.8872, 120.8572),

    "san ildefonso": (15.0786, 120.9417),

    "san miguel": (15.1439, 120.9769),

    "iloilo city": (10.7202, 122.5621),

    "pototan": (10.9483, 122.6289),

    "dingle": (11.0028, 122.6711),

}





def _lookup_city_coordinates(municipality, province):

    m_clean = str(municipality or "").strip().lower()

    if m_clean in PHILIPPINE_MUNICIPALITY_COORDINATES:

        return PHILIPPINE_MUNICIPALITY_COORDINATES[m_clean]



    p_clean = str(province or "").strip().lower()

    prov_defaults = {

        "nueva ecija": (15.4859, 120.9673),

        "isabela": (16.9754, 121.8107),

        "tarlac": (15.4802, 120.5979),

        "pangasinan": (15.9281, 120.3347),

        "pampanga": (15.0794, 120.6200),

        "bulacan": (14.8527, 120.8160),

        "iloilo": (10.7202, 122.5621),

    }

    return prov_defaults.get(p_clean, (15.4859, 120.9673))





def list_farmer_forecast_farms(farmer_user_id):

    """

    Return active registered farms owned by the authenticated

    Farmer for the Climate Forecasting location selector.

    """



    farmer_id = _normalize_farmer_id(

        farmer_user_id

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                fp.farm_profile_id AS farm_id,

                fp.user_id,

                fp.farm_lot_name AS farm_name,

                COALESCE(fs.farm_status, 'Active') AS farm_status,

                fp.street_address,

                '' AS barangay,

                fp.municipality,

                fp.province,

                fp.postal_code,

                fp.street_address AS primary_geocode_query,

                fp.municipality AS barangay_geocode_query,

                fp.municipality AS municipality_geocode_query,

                NULL AS latitude,

                NULL AS longitude,

                'resolved' AS geocode_status,

                'municipality' AS geocode_match_level,

                'grainrise_geographic' AS geocode_provider,

                CONCAT_WS(', ', NULLIF(fp.farm_lot_name, ''), NULLIF(fp.municipality, ''), NULLIF(fp.province, '')) AS geocoded_address,

                fp.created_at AS geocode_updated_at

            FROM farm_profile fp

            LEFT JOIN existing_grainrise_farmer_farm_status fs

                ON fs.farm_profile_id = fp.farm_profile_id

            WHERE fp.user_id = %s

            ORDER BY

                COALESCE(NULLIF(TRIM(fp.farm_lot_name), ''), fp.municipality),

                fp.farm_profile_id

            """,

            [farmer_id],

        )



        rows = _rows_to_dicts(cursor)

        for r in rows:

            coords = _lookup_city_coordinates(r.get("municipality"), r.get("province"))

            r["latitude"] = coords[0]

            r["longitude"] = coords[1]

        return rows





def get_farmer_forecast_farm(

    farmer_user_id,

    farm_id,

):

    """

    Return one active registered farm only when it belongs to

    the authenticated Farmer.

    """



    farmer_id = _normalize_farmer_id(

        farmer_user_id

    )

    normalized_farm_id = _normalize_positive_id(

        farm_id,

        "farm ID",

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                fp.farm_profile_id AS farm_id,

                fp.user_id,

                fp.farm_lot_name AS farm_name,

                COALESCE(fs.farm_status, 'Active') AS farm_status,

                fp.street_address,

                '' AS barangay,

                fp.municipality,

                fp.province,

                fp.postal_code,

                fp.street_address AS primary_geocode_query,

                fp.municipality AS barangay_geocode_query,

                fp.municipality AS municipality_geocode_query,

                NULL AS latitude,

                NULL AS longitude,

                'resolved' AS geocode_status,

                'municipality' AS geocode_match_level,

                'grainrise_geographic' AS geocode_provider,

                CONCAT_WS(', ', NULLIF(fp.farm_lot_name, ''), NULLIF(fp.municipality, ''), NULLIF(fp.province, '')) AS geocoded_address,

                fp.created_at AS geocode_updated_at

            FROM farm_profile fp

            LEFT JOIN existing_grainrise_farmer_farm_status fs

                ON fs.farm_profile_id = fp.farm_profile_id

            WHERE fp.farm_profile_id = %s

              AND fp.user_id = %s

            LIMIT 1

            """,

            [

                normalized_farm_id,

                farmer_id,

            ],

        )



        row = _row_to_dict(cursor)

        if row:

            coords = _lookup_city_coordinates(row.get("municipality"), row.get("province"))

            row["latitude"] = coords[0]

            row["longitude"] = coords[1]

        return row





# ============================================================

# FRESH CLIMATE CACHE LOOKUP

# ============================================================





def get_fresh_climate_fetch(

    *,

    provider_code,

    dataset_code,

    data_kind,

    latitude,

    longitude,

    requested_start_date,

    requested_end_date,

    granularity,

    variable_set_key,

    forecast_issue_date=None,

):

    """

    Return one unexpired successful climate cache header that

    exactly matches the normalized request.

    """



    provider = _normalize_text(provider_code)

    dataset = _normalize_text(dataset_code)

    kind = _normalize_text(data_kind).lower()

    normalized_granularity = _normalize_granularity(

        granularity

    )

    variables = _normalize_text(variable_set_key)



    if not provider:

        raise ValueError(

            "Climate provider is required."

        )



    if not dataset:

        raise ValueError(

            "Climate dataset is required."

        )



    if kind not in VALID_CLIMATE_DATA_KINDS:

        raise ValueError(

            "Invalid climate data kind."

        )



    if not variables:

        raise ValueError(

            "Climate variable set is required."

        )



    normalized_latitude = _normalize_coordinate(

        latitude,

        "latitude",

        -90,

        90,

    )

    normalized_longitude = _normalize_coordinate(

        longitude,

        "longitude",

        -180,

        180,

    )



    start_date, end_date = _normalize_date_range(

        requested_start_date,

        requested_end_date,

    )



    normalized_issue_date = None

    if forecast_issue_date not in (None, ""):

        normalized_issue_date = _normalize_date(

            forecast_issue_date,

            "Forecast issue date",

        )



    if kind == "historical" and normalized_issue_date is not None:

        raise ValueError(

            "Historical climate data cannot have a forecast issue date."

        )



    if kind == "forecast" and normalized_issue_date is None:

        raise ValueError(

            "Forecast issue date is required for forecast climate data."

        )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                climate_fetch_id,

                provider_code,

                dataset_code,

                data_kind,

                latitude,

                longitude,

                location_label,

                requested_start_date,

                requested_end_date,

                forecast_issue_date,

                granularity,

                variable_set_key,

                fetch_status,

                requested_at,

                completed_at,

                expires_at,

                provider_metadata

            FROM climate_api_fetches

            WHERE provider_code = %s

              AND dataset_code = %s

              AND data_kind = %s

              AND latitude = %s

              AND longitude = %s

              AND requested_start_date = %s

              AND requested_end_date = %s

              AND forecast_issue_date IS NOT DISTINCT FROM %s

              AND granularity = %s

              AND variable_set_key = %s

              AND fetch_status = 'success'

              AND expires_at > CURRENT_TIMESTAMP

            ORDER BY completed_at DESC

            LIMIT 1

            """,

            [

                provider,

                dataset,

                kind,

                normalized_latitude,

                normalized_longitude,

                start_date,

                end_date,

                normalized_issue_date,

                normalized_granularity,

                variables,

            ],

        )



        return _row_to_dict(cursor)





def get_climate_fetch_points(climate_fetch_id):

    """

    Return normalized data points for one climate cache batch.

    """



    fetch_id = _normalize_positive_id(

        climate_fetch_id,

        "climate fetch ID",

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                climate_data_point_id,

                climate_fetch_id,

                variable_code,

                source_variable_name,

                period_start,

                period_end,

                value,

                unit_code,

                aggregation_method,

                quality_metadata

            FROM climate_data_points

            WHERE climate_fetch_id = %s

            ORDER BY

                period_start ASC,

                variable_code ASC,

                climate_data_point_id ASC

            """,

            [fetch_id],

        )



        return _rows_to_dicts(cursor)





# ============================================================

# DEMAND FORECAST PRODUCT OPTIONS

# ============================================================





def list_farmer_demand_products(farmer_user_id):

    """

    Return product/rice-variety combinations that have either:



    - completed Farmer POS history, or

    - non-voided contract history/current commitments.



    This lets Demand Forecasting include products represented by

    contracts even when direct POS sales are still limited.

    """



    farmer_id = _normalize_farmer_id(

        farmer_user_id

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            WITH sales AS (

                SELECT

                    product_type,

                    rice_variety,

                    first_sale_date,

                    latest_sale_date,

                    lifetime_quantity_sold_kg,

                    lifetime_transaction_count

                FROM grainrise_farmer_sales_product_history_view

                WHERE farmer_user_id = %s

            ),

            contract_data AS (

                SELECT

                    product_type,

                    rice_variety,

                    MIN(contract_start_date) AS first_contract_date,

                    MAX(fulfillment_date) AS latest_contract_date,

                    SUM(realized_contract_quantity_kg)

                        AS realized_contract_quantity_kg,

                    SUM(committed_contract_quantity_kg)

                        AS committed_contract_quantity_kg,

                    SUM(at_risk_contract_quantity_kg)

                        AS at_risk_contract_quantity_kg

                FROM grainrise_farmer_contract_demand_base_view

                WHERE farmer_user_id = %s

                GROUP BY

                    product_type,

                    rice_variety

            )

            SELECT

                COALESCE(s.product_type, c.product_type)

                    AS product_type,

                COALESCE(s.rice_variety, c.rice_variety)

                    AS rice_variety,

                (s.product_type IS NOT NULL)

                    AS has_sales_history,

                (c.product_type IS NOT NULL)

                    AS has_contract_history,

                s.first_sale_date,

                s.latest_sale_date,

                COALESCE(s.lifetime_quantity_sold_kg, 0)

                    AS lifetime_quantity_sold_kg,

                COALESCE(s.lifetime_transaction_count, 0)::BIGINT

                    AS lifetime_transaction_count,

                c.first_contract_date,

                c.latest_contract_date,

                COALESCE(c.realized_contract_quantity_kg, 0)

                    AS realized_contract_quantity_kg,

                COALESCE(c.committed_contract_quantity_kg, 0)

                    AS committed_contract_quantity_kg,

                COALESCE(c.at_risk_contract_quantity_kg, 0)

                    AS at_risk_contract_quantity_kg

            FROM sales s

            FULL OUTER JOIN contract_data c

              ON c.product_type = s.product_type

             AND LOWER(TRIM(c.rice_variety)) =

                 LOWER(TRIM(s.rice_variety))

            ORDER BY

                product_type,

                rice_variety

            """,

            [

                farmer_id,

                farmer_id,

            ],

        )



        return _rows_to_dicts(cursor)





# ============================================================

# GAP-FILLED POS DEMAND SERIES

# ============================================================





def get_farmer_sales_demand_series(

    farmer_user_id,

    *,

    product_type,

    rice_variety,

    granularity,

    start_date,

    end_date,

):

    farmer_id = _normalize_farmer_id(

        farmer_user_id

    )

    normalized_product_type = _normalize_product_type(

        product_type

    )

    normalized_variety = _normalize_rice_variety(

        rice_variety

    )

    normalized_granularity = _normalize_granularity(

        granularity

    )

    normalized_start, normalized_end = _normalize_date_range(

        start_date,

        end_date,

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                period_start,

                period_end,

                quantity_sold_kg,

                transaction_count,

                sales_day_count,

                gross_sales_amount,

                weighted_avg_selling_price_per_kg,

                minimum_selling_price_per_kg,

                maximum_selling_price_per_kg,

                has_sales

            FROM grainrise_farmer_sales_demand_series(

                %s,

                %s,

                %s,

                %s,

                %s,

                %s

            )

            ORDER BY period_start

            """,

            [

                farmer_id,

                normalized_product_type,

                normalized_variety,

                normalized_granularity,

                normalized_start,

                normalized_end,

            ],

        )



        return _rows_to_dicts(cursor)





# ============================================================

# GAP-FILLED CONTRACT DEMAND SERIES

# ============================================================





def get_farmer_contract_demand_series(

    farmer_user_id,

    *,

    product_type,

    rice_variety,

    granularity,

    start_date,

    end_date,

):

    """

    Return weekly/monthly contract signals with missing periods

    filled with zero values by PostgreSQL GENERATE_SERIES.

    """



    farmer_id = _normalize_farmer_id(

        farmer_user_id

    )

    normalized_product_type = _normalize_product_type(

        product_type

    )

    normalized_variety = _normalize_rice_variety(

        rice_variety

    )

    normalized_granularity = _normalize_granularity(

        granularity

    )

    normalized_start, normalized_end = _normalize_date_range(

        start_date,

        end_date,

    )



    if normalized_granularity == "weekly":

        source_view = (

            "grainrise_farmer_weekly_contract_demand_view"

        )

        date_trunc_unit = "week"

        interval_step = "1 week"

        period_end_sql = "(p.period_start + 6)::date"

    else:

        source_view = (

            "grainrise_farmer_monthly_contract_demand_view"

        )

        date_trunc_unit = "month"

        interval_step = "1 month"

        period_end_sql = (

            "(p.period_start + INTERVAL '1 month' "

            "- INTERVAL '1 day')::date"

        )



    with connection.cursor() as cursor:

        cursor.execute(

            f"""

            WITH periods AS (

                SELECT

                    generated_period::DATE AS period_start

                FROM GENERATE_SERIES(

                    DATE_TRUNC(

                        '{date_trunc_unit}',

                        %s::TIMESTAMP

                    )::DATE,

                    DATE_TRUNC(

                        '{date_trunc_unit}',

                        %s::TIMESTAMP

                    )::DATE,

                    INTERVAL '{interval_step}'

                ) AS generated_period

            )

            SELECT

                p.period_start,

                {period_end_sql} AS period_end,

                COALESCE(c.realized_contract_quantity_kg, 0)

                    AS realized_contract_quantity_kg,

                COALESCE(c.committed_contract_quantity_kg, 0)

                    AS committed_contract_quantity_kg,

                COALESCE(c.at_risk_contract_quantity_kg, 0)

                    AS at_risk_contract_quantity_kg,

                COALESCE(c.completed_contract_count, 0)::BIGINT

                    AS completed_contract_count,

                COALESCE(c.active_contract_count, 0)::BIGINT

                    AS active_contract_count,

                COALESCE(c.void_requested_contract_count, 0)::BIGINT

                    AS void_requested_contract_count,

                COALESCE(c.realized_contract_value, 0)

                    AS realized_contract_value,

                COALESCE(c.committed_contract_value, 0)

                    AS committed_contract_value,

                COALESCE(c.at_risk_contract_value, 0)

                    AS at_risk_contract_value,

                c.weighted_avg_agreed_price_per_kg,

                (c.period_start IS NOT NULL)

                    AS has_contract_signal

            FROM periods p

            LEFT JOIN {source_view} c

              ON c.farmer_user_id = %s

             AND c.product_type = %s

             AND LOWER(TRIM(c.rice_variety)) =

                 LOWER(TRIM(%s))

             AND c.period_start = p.period_start

            ORDER BY p.period_start

            """,

            [

                normalized_start,

                normalized_end,

                farmer_id,

                normalized_product_type,

                normalized_variety,

            ],

        )



        return _rows_to_dicts(cursor)





# ============================================================

# NEWS SOURCE FOR DEMAND FEATURE EXTRACTION

# ============================================================





def list_demand_news_articles(

    *,

    start_date,

    end_date,

    limit=200,

):

    """

    Return Farmer-visible agriculture/market news that may be

    analyzed later by the Demand Forecasting service.



    This selector does NOT assign AI/news scores. It only

    retrieves the source articles from the existing centralized

    News & Updates database.

    """



    normalized_start, normalized_end = _normalize_date_range(

        start_date,

        end_date,

    )



    try:

        normalized_limit = int(limit)

    except (TypeError, ValueError) as exc:

        raise ValueError(

            "Invalid news article limit."

        ) from exc



    normalized_limit = max(

        1,

        min(normalized_limit, 500),

    )



    categories = sorted(

        DEMAND_NEWS_CATEGORIES

    )



    with connection.cursor() as cursor:

        cursor.execute(

            """

            SELECT

                news_id,

                title,

                description,

                article_body,

                has_full_article_body,

                source_name,

                source_domain,

                category_code,

                published_at,

                article_url

            FROM grainrise_news_role_feed_view

            WHERE user_role::text = 'farmer'

              AND published_at::DATE BETWEEN %s AND %s

              AND category_code = ANY(%s)

            ORDER BY published_at DESC

            LIMIT %s

            """,

            [

                normalized_start,

                normalized_end,

                categories,

                normalized_limit,

            ],

        )



        return _rows_to_dicts(cursor)

