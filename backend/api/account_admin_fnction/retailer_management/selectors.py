from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

RETAILER_ROLE = "retailer"

TAB_TO_REVIEW = "to-review"
TAB_ACTIVE = "active"
TAB_INACTIVE = "inactive"

VALID_RETAILER_TABS = {
    TAB_TO_REVIEW,
    TAB_ACTIVE,
    TAB_INACTIVE,
}


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    """
    Convert all cursor rows into dictionaries.
    """

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
    """
    Convert one cursor row into a dictionary.
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
# TABLE CHECK
# ============================================================

def _table_exists(table_name):
    """
    Check whether a PostgreSQL table exists.
    """

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
    """
    Retailer Management status mapping.

    To Review:
        inactive

    Active:
        active

    Management Inactive:
        archived
        deactivated

    Registration-pending inactive accounts must NOT appear
    under the Management Inactive tab.
    """

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
        "Invalid Retailer Management tab."
    )


# ============================================================
# RETAILER MANAGEMENT LIST
# ============================================================

def list_retailers(
    tab=TAB_TO_REVIEW,
):
    """
    Return Retailer Management records.

    Search, sorting, and pagination are handled by React.

    Archive reason is included when the optional
    retailer_archive_reasons table exists.
    """

    if tab not in VALID_RETAILER_TABS:
        raise ValueError(
            "Invalid Retailer Management tab."
        )

    status_condition = (
        _status_condition_for_tab(
            tab
        )
    )

    has_archive_reasons = (
        _table_exists(
            "retailer_archive_reasons"
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
                    rar.reason,
                    rar.created_at

                FROM retailer_archive_reasons rar

                WHERE
                    rar.user_id =
                        u.user_id

                ORDER BY
                    rar.created_at DESC,
                    rar.retailer_archive_reason_id DESC

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
                        TRIM(
                            u.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            u.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            u.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            u.suffix
                        ),
                        ''
                    )
                )
                AS retailer_name,


                u.email,

                u.contact_number,

                u.username,

                u.status::text
                    AS status,

                u.created_at,

                u.updated_at,


                {archive_columns}


            FROM users u


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
                RETAILER_ROLE,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# STATUS COUNTS
# ============================================================

def get_retailer_status_counts():
    """
    Return Retailer Management tab counts.
    """

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
                RETAILER_ROLE,
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
# COMPLETE RETAILER DETAILS
# ============================================================

def get_retailer_details(
    user_id,
):
    """
    Complete Retailer details used by:

        Review Application Modal
        View Details Modal

    Includes:
        personal information
        address
        account information
        barangay permit
        valid ID
    """

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                -- ============================================
                -- ACCOUNT
                -- ============================================

                u.user_id,

                u.first_name,

                u.middle_initial,

                u.last_name,

                u.suffix,

                u.gender,


                -- ============================================
                -- ADDRESS
                -- ============================================

                u.province,

                u.municipality,

                u.postal_code,

                u.barangay,

                u.street_address,


                -- ============================================
                -- CONTACT / LOGIN
                -- ============================================

                u.email,

                u.contact_number,

                u.username,

                u.user_role::text
                    AS user_role,

                u.status::text
                    AS status,

                u.created_at,

                u.updated_at,


                -- ============================================
                -- DOCUMENTS
                -- ============================================

                d.retailer_document_id,

                d.barangay_permit,

                d.valid_id,

                d.created_at
                    AS documents_created_at,

                d.updated_at
                    AS documents_updated_at


            FROM users u


            LEFT JOIN retailer_documents d

                ON d.user_id =
                    u.user_id


            WHERE

                u.user_id = %s

                AND u.user_role =
                    %s::user_role_enum


            LIMIT 1
            """,
            [
                user_id,
                RETAILER_ROLE,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# RETAILER ACCOUNT SUMMARY
# ============================================================

def get_retailer_account_summary(
    user_id,
):
    """
    Lightweight Retailer record used by
    service actions such as confirm/archive/restore/delete.
    """

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
                RETAILER_ROLE,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# RETAILER EXISTS
# ============================================================

def retailer_exists(
    user_id,
):
    """
    Return True only when the given user ID belongs
    to a Retailer account.
    """

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
                RETAILER_ROLE,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )