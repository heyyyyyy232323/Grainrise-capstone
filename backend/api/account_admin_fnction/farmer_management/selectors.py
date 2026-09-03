from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

FARMER_ROLE = "farmer"

TAB_TO_REVIEW = "to-review"
TAB_ACTIVE = "active"
TAB_INACTIVE = "inactive"

VALID_FARMER_TABS = {
    TAB_TO_REVIEW,
    TAB_ACTIVE,
    TAB_INACTIVE,
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
# TABLE CHECK
# ============================================================

def _table_exists(table_name):
    normalized_name = str(
        table_name or ""
    ).strip()

    if not normalized_name:
        return False

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT to_regclass(%s)
            """,
            [
                f"public.{normalized_name}",
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )


# ============================================================
# TAB STATUS CONDITION
# ============================================================

def _status_condition_for_tab(tab):
    if tab == TAB_TO_REVIEW:
        return """
            u.status =
                'inactive'::user_status_enum
        """

    if tab == TAB_ACTIVE:
        return """
            u.status =
                'active'::user_status_enum
        """

    if tab == TAB_INACTIVE:
        return """
            u.status IN (
                'archived'::user_status_enum,
                'deactivated'::user_status_enum
            )
        """

    raise ValueError(
        "Invalid Farmer Management tab."
    )


# ============================================================
# FARMER MANAGEMENT LIST
# ============================================================

def list_farmers(
    tab=TAB_TO_REVIEW,
):
    if tab not in VALID_FARMER_TABS:
        raise ValueError(
            "Invalid Farmer Management tab."
        )

    status_condition = (
        _status_condition_for_tab(
            tab
        )
    )

    has_archive_reasons = (
        _table_exists(
            "farmer_archive_reasons"
        )
    )

    if has_archive_reasons:
        archive_columns = """
            archive_info.reason
                AS archive_reason,

            archive_info.created_at
                AS archived_at
        """

        archive_join = """
            LEFT JOIN LATERAL (
                SELECT
                    far.reason,
                    far.created_at

                FROM farmer_archive_reasons far

                WHERE
                    far.user_id =
                        u.user_id

                ORDER BY
                    far.created_at DESC,
                    far.farmer_archive_reason_id DESC

                LIMIT 1
            ) archive_info
                ON TRUE
        """

    else:
        archive_columns = """
            NULL::text
                AS archive_reason,

            NULL::timestamp
                AS archived_at
        """

        archive_join = ""

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                u.user_id
                    AS id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS farmer_name,

                u.email,
                u.contact_number,
                u.username,

                u.status::text
                    AS status,

                fc.rsbsa_number,
                fc.submission_method,

                COALESCE(
                    farm_summary.farm_count,
                    0
                )
                AS farm_count,

                COALESCE(
                    farm_summary.total_farm_area,
                    0
                )
                AS total_farm_area,

                {archive_columns},

                u.created_at,
                u.updated_at

            FROM users u

            LEFT JOIN farmer_compliance fc
                ON fc.user_id =
                    u.user_id

            LEFT JOIN LATERAL (
                SELECT
                    COUNT(*)
                        AS farm_count,

                    COALESCE(
                        SUM(
                            ff.total_farm_area
                        ),
                        0
                    )
                    AS total_farm_area

                FROM farmer_farms ff

                WHERE
                    ff.user_id =
                        u.user_id
            ) farm_summary
                ON TRUE

            {archive_join}

            WHERE
                u.user_role =
                    %s::user_role_enum

                AND {status_condition}

            ORDER BY
                u.created_at DESC,
                u.user_id DESC
            """,
            [
                FARMER_ROLE,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# STATUS COUNTS
# ============================================================

def get_farmer_status_counts():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (
                    WHERE
                        status =
                            'inactive'::user_status_enum
                )
                AS to_review,

                COUNT(*) FILTER (
                    WHERE
                        status =
                            'active'::user_status_enum
                )
                AS active,

                COUNT(*) FILTER (
                    WHERE
                        status IN (
                            'archived'::user_status_enum,
                            'deactivated'::user_status_enum
                        )
                )
                AS inactive

            FROM users

            WHERE
                user_role =
                    %s::user_role_enum
            """,
            [
                FARMER_ROLE,
            ],
        )

        row = _row_to_dict(
            cursor
        )

    return row or {
        "to_review": 0,
        "active": 0,
        "inactive": 0,
    }


# ============================================================
# COMPLETE FARMER DETAILS
# ============================================================

def get_farmer_details(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,

                u.first_name,
                u.middle_initial,
                u.last_name,
                u.suffix,
                u.gender,

                u.province,
                u.municipality,
                u.postal_code,
                u.barangay,
                u.street_address,

                u.email,
                u.contact_number,
                u.username,

                u.user_role::text
                    AS user_role,

                u.status::text
                    AS status,

                fc.farmer_compliance_id,
                fc.rsbsa_number,
                fc.rsbsa_document,
                fc.submission_method,

                fc.created_at
                    AS compliance_created_at,

                fc.updated_at
                    AS compliance_updated_at,

                u.created_at,
                u.updated_at

            FROM users u

            LEFT JOIN farmer_compliance fc
                ON fc.user_id =
                    u.user_id

            WHERE
                u.user_id = %s

                AND u.user_role =
                    %s::user_role_enum

            LIMIT 1
            """,
            [
                user_id,
                FARMER_ROLE,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# FARMER FARMS
# ============================================================

def get_farmer_farms(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                farm_id,
                user_id,
                farm_name,

                province,
                municipality,
                postal_code,
                barangay,
                street_address,

                total_farm_area,
                land_ownership_status,
                rice_variety_currently_planted,
                cropping_cycles_per_year,
                farm_status,

                created_at,
                updated_at

            FROM farmer_farms

            WHERE
                user_id = %s

            ORDER BY
                created_at DESC,
                farm_id DESC
            """,
            [
                user_id,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# FARM SUMMARY
# ============================================================

def get_farmer_farm_summary(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)
                    AS farm_count,

                COUNT(*) FILTER (
                    WHERE
                        farm_status =
                            'active'
                )
                AS active_farm_count,

                COUNT(*) FILTER (
                    WHERE
                        farm_status =
                            'inactive'
                )
                AS inactive_farm_count,

                COALESCE(
                    SUM(
                        total_farm_area
                    ),
                    0
                )
                AS total_farm_area

            FROM farmer_farms

            WHERE
                user_id = %s
            """,
            [
                user_id,
            ],
        )

        row = _row_to_dict(
            cursor
        )

    return row or {
        "farm_count": 0,
        "active_farm_count": 0,
        "inactive_farm_count": 0,
        "total_farm_area": 0,
    }


# ============================================================
# FARMER RATING SUMMARY
# ============================================================

def get_farmer_rating_summary(
    user_id,
):
    if not _table_exists(
        "farmer_ratings"
    ):
        return {
            "average_rating": 0,
            "rating_count": 0,
            "five_star": 0,
            "four_star": 0,
            "three_star": 0,
            "two_star": 0,
            "one_star": 0,
        }

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COALESCE(
                    ROUND(
                        AVG(rating)::numeric,
                        2
                    ),
                    0
                )
                AS average_rating,

                COUNT(*)
                    AS rating_count,

                COUNT(*) FILTER (
                    WHERE rating = 5
                )
                AS five_star,

                COUNT(*) FILTER (
                    WHERE rating = 4
                )
                AS four_star,

                COUNT(*) FILTER (
                    WHERE rating = 3
                )
                AS three_star,

                COUNT(*) FILTER (
                    WHERE rating = 2
                )
                AS two_star,

                COUNT(*) FILTER (
                    WHERE rating = 1
                )
                AS one_star

            FROM farmer_ratings

            WHERE
                farmer_user_id = %s
            """,
            [
                user_id,
            ],
        )

        row = _row_to_dict(
            cursor
        )

    return row or {
        "average_rating": 0,
        "rating_count": 0,
        "five_star": 0,
        "four_star": 0,
        "three_star": 0,
        "two_star": 0,
        "one_star": 0,
    }


# ============================================================
# FARMER RATING HISTORY
# ============================================================

def get_farmer_ratings(
    user_id,
):
    if not _table_exists(
        "farmer_ratings"
    ):
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fr.farmer_rating_id,

                fr.farmer_user_id,

                fr.reviewer_user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            reviewer.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reviewer.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reviewer.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reviewer.suffix
                        ),
                        ''
                    )
                )
                AS reviewer_name,

                reviewer.email
                    AS reviewer_email,

                reviewer.user_role::text
                    AS reviewer_role,

                fr.rating,

                fr.comment,

                fr.created_at

            FROM farmer_ratings fr

            INNER JOIN users reviewer
                ON reviewer.user_id =
                    fr.reviewer_user_id

            WHERE
                fr.farmer_user_id = %s

            ORDER BY
                fr.created_at DESC,
                fr.farmer_rating_id DESC
            """,
            [
                user_id,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# FARMER ACCOUNT SUMMARY
# ============================================================

def get_farmer_account_summary(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                user_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                email,
                contact_number,
                username,

                status::text
                    AS status,

                created_at,
                updated_at

            FROM users

            WHERE
                user_id = %s

                AND user_role =
                    %s::user_role_enum

            LIMIT 1
            """,
            [
                user_id,
                FARMER_ROLE,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# FARMER EXISTS
# ============================================================

def farmer_exists(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1

                FROM users

                WHERE
                    user_id = %s

                    AND user_role =
                        %s::user_role_enum
            )
            """,
            [
                user_id,
                FARMER_ROLE,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )