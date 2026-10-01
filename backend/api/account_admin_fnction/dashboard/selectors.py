from django.db import connection


# ============================================================
# ROLE CONSTANTS
# ============================================================

ROLE_MILLER = "miller_manager"
ROLE_WAREHOUSE = "warehouse_manager"
ROLE_RETAILER = "retailer"
ROLE_FARMER = "farmer"


# ============================================================
# DATABASE HELPERS
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
# KPI COUNTS
# ============================================================

def get_dashboard_kpi_counts():
    """
    Return the four Account Admin management KPI counts.

    These correspond directly to:
        Miller Management
        Warehouse Management
        Retailer Management
        Farmer Management

    Counts include all records under that role regardless of
    whether the account is active, inactive, archived, or
    deactivated because the corresponding management module
    handles all of those states.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN u.user_role = 'miller_manager'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS miller_managers,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.user_role = 'warehouse_manager'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS warehouse_managers,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.user_role = 'retailer'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS retailers,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.user_role = 'farmer'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS farmers

            FROM users u
            """
        )

        row = (
            _row_to_dict(
                cursor
            )
            or {}
        )


    return {
        "miller_managers":
            int(
                row.get(
                    "miller_managers"
                )
                or 0
            ),

        "warehouse_managers":
            int(
                row.get(
                    "warehouse_managers"
                )
                or 0
            ),

        "retailers":
            int(
                row.get(
                    "retailers"
                )
                or 0
            ),

        "farmers":
            int(
                row.get(
                    "farmers"
                )
                or 0
            ),
    }


# ============================================================
# OVERALL USER COUNT
# ============================================================

def get_overall_user_count():
    """
    Overall number of GrainRise users.

    Used for analytics / Entity Breakdown rather than
    as one of the clickable management KPI cards.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)
                    AS total_users

            FROM users
            """
        )

        row = (
            _row_to_dict(
                cursor
            )
            or {}
        )


    return int(
        row.get(
            "total_users"
        )
        or 0
    )


# ============================================================
# ACCOUNT STATUS SUMMARY
# ============================================================

def get_account_status_summary():
    """
    Return overall Account Admin user status totals.

    Registration review:
        inactive

    Active:
        active

    Management inactive:
        archived
        deactivated
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'active'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS active,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'inactive'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS to_review,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'archived'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS archived,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'deactivated'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS deactivated

            FROM users u
            """
        )

        row = (
            _row_to_dict(
                cursor
            )
            or {}
        )


    return {
        "active":
            int(
                row.get(
                    "active"
                )
                or 0
            ),

        "to_review":
            int(
                row.get(
                    "to_review"
                )
                or 0
            ),

        "archived":
            int(
                row.get(
                    "archived"
                )
                or 0
            ),

        "deactivated":
            int(
                row.get(
                    "deactivated"
                )
                or 0
            ),
    }


# ============================================================
# ENTITY BREAKDOWN
# ============================================================

def get_entity_breakdown():
    """
    Breakdown used by the dashboard pie/donut chart.

    Uses the same four Account Admin management entities
    as the clickable KPI cards.
    """

    counts = (
        get_dashboard_kpi_counts()
    )


    return [
        {
            "key":
                ROLE_MILLER,

            "label":
                "Miller Managers",

            "value":
                counts[
                    "miller_managers"
                ],
        },

        {
            "key":
                ROLE_WAREHOUSE,

            "label":
                "Warehouse Managers",

            "value":
                counts[
                    "warehouse_managers"
                ],
        },

        {
            "key":
                ROLE_RETAILER,

            "label":
                "Retailers",

            "value":
                counts[
                    "retailers"
                ],
        },

        {
            "key":
                ROLE_FARMER,

            "label":
                "Farmers",

            "value":
                counts[
                    "farmers"
                ],
        },
    ]


# ============================================================
# ROLE STATUS BREAKDOWN
# ============================================================

def get_role_status_breakdown():
    """
    Return account-status counts per GrainRise role.

    Useful for dashboard graph data without hardcoded samples.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_role
                    AS user_role,

                COUNT(*)
                    AS total,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'active'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS active,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'inactive'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS to_review,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'archived'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS archived,

                COALESCE(
                    SUM(
                        CASE
                            WHEN u.status = 'deactivated'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS deactivated

            FROM users u

            WHERE
                u.user_role IN (
                    'miller_manager',
                    'warehouse_manager',
                    'retailer',
                    'farmer'
                )

            GROUP BY
                u.user_role

            ORDER BY
                u.user_role
            """
        )

        rows = (
            _rows_to_dicts(
                cursor
            )
        )


    return [
        {
            "user_role":
                row.get(
                    "user_role"
                ),

            "total":
                int(
                    row.get(
                        "total"
                    )
                    or 0
                ),

            "active":
                int(
                    row.get(
                        "active"
                    )
                    or 0
                ),

            "to_review":
                int(
                    row.get(
                        "to_review"
                    )
                    or 0
                ),

            "archived":
                int(
                    row.get(
                        "archived"
                    )
                    or 0
                ),

            "deactivated":
                int(
                    row.get(
                        "deactivated"
                    )
                    or 0
                ),
        }

        for row in rows
    ]


# ============================================================
# RECENT USER ACTIVITY
# ============================================================

def get_recent_user_activity(
    limit=8,
):
    """
    Return latest centralized user/account records.

    For now this gives the dashboard a real DB-backed
    Recent Activity source instead of sample data.
    """

    try:
        cleaned_limit = int(
            limit
        )

    except (
        TypeError,
        ValueError,
    ):
        cleaned_limit = 8


    cleaned_limit = max(
        1,
        min(
            cleaned_limit,
            20,
        )
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,

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
                AS full_name,

                u.email,

                u.user_role
                    AS user_role,

                u.status
                    AS status,

                u.created_at

            FROM users u

            ORDER BY
                u.created_at DESC,
                u.user_id DESC

            LIMIT %s
            """,
            [
                cleaned_limit,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# COMPLETE DASHBOARD DATA
# ============================================================

def get_admin_dashboard_data():
    """
    Build all database-backed dashboard data in one selector.
    """

    return {
        "kpis":
            get_dashboard_kpi_counts(),

        "overall_users":
            get_overall_user_count(),

        "account_status":
            get_account_status_summary(),

        "entity_breakdown":
            get_entity_breakdown(),

        "role_status_breakdown":
            get_role_status_breakdown(),

        "recent_activity":
            get_recent_user_activity(),
    }