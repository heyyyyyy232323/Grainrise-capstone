import json
from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

WAREHOUSE_ROLE = "warehouse_manager"

TAB_TO_REVIEW = "to-review"
TAB_ACTIVE = "active"
TAB_INACTIVE = "inactive"

VALID_WAREHOUSE_TABS = {
    TAB_TO_REVIEW,
    TAB_ACTIVE,
    TAB_INACTIVE,
}


# ============================================================
# DATABASE ROW HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    """
    Convert all rows from the current cursor
    into dictionaries.
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


def _row_to_dict(cursor):
    """
    Convert one database row into a dictionary.

    Returns None when no row exists.
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
# MANAGEMENT TAB STATUS
# ============================================================

def _status_condition_for_tab(tab):
    """
    Warehouse registration behavior:

        To Review
            users.status = inactive

        Active
            users.status = active

        Inactive
            users.status = archived
            OR deactivated

    Important:
    Newly registered Warehouse Managers are
    inactive while waiting for approval.

    Therefore inactive registrations must NOT
    appear inside the management Inactive tab.
    """

    if tab == TAB_TO_REVIEW:

        return """
            u.status = 'inactive'
        """


    if tab == TAB_ACTIVE:

        return """
            u.status = 'active'
        """


    if tab == TAB_INACTIVE:

        return """
            u.status IN (
                'archived',
                'deactivated'
            )
        """


    raise ValueError(
        "Invalid Warehouse Management tab."
    )


# ============================================================
# WAREHOUSE MANAGEMENT LIST
# ============================================================

def list_warehouses(
    tab=TAB_TO_REVIEW,
):
    """
    Return Warehouse Manager rows for the
    selected management tab.

    Search, sorting, and pagination remain
    handled by the React page.

    Inactive rows include the latest
    warehouse archive reason.
    """

    if tab not in VALID_WAREHOUSE_TABS:

        raise ValueError(
            "Invalid Warehouse Management tab."
        )


    status_condition = (
        _status_condition_for_tab(
            tab
        )
    )

    inquiry_rows = []
    if tab == TAB_TO_REVIEW:
        from ...models import PartnershipInquiry
        inquiries = PartnershipInquiry.objects.filter(
            partner_role="warehouse",
            status=PartnershipInquiry.Status.TO_REVIEW,
            email_verified=True,
        ).order_by("-created_at")

        for inq in inquiries:
            inquiry_rows.append({
                "id": str(inq.partnership_inquiry_id),
                "manager_name": inq.name,
                "business_name": inq.organization_company,
                "organization_name": inq.organization_company,
                "email": inq.email,
                "contact_number": inq.contact_number,
                "status": "to_review",
                "created_at": inq.created_at,
                "updated_at": inq.updated_at,
                "archive_reason": None,
                "archived_at": None,
            })


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ============================================
                -- ACCOUNT
                -- ============================================

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
                AS manager_name,


                -- ============================================
                -- WAREHOUSE BUSINESS
                -- ============================================

                wp.business_name,

                wp.organization_name,


                -- ============================================
                -- ACCOUNT CONTACT
                -- ============================================

                u.email,

                u.contact_number,


                -- ============================================
                -- ACCOUNT STATUS
                -- ============================================

                u.status
                    AS status,


                -- ============================================
                -- TIMESTAMPS
                -- ============================================

                u.created_at,

                u.updated_at,


                -- ============================================
                -- LATEST ARCHIVE INFORMATION
                -- ============================================

                archive_info.reason
                    AS archive_reason,

                archive_info.created_at
                    AS archived_at


            FROM users u


            LEFT JOIN (
                SELECT
                    wp1.user_id,
                    wp1.business_name,
                    wp1.organization_name
                FROM warehouse_profiles wp1
                INNER JOIN (
                    SELECT
                        user_id,
                        MIN(warehouse_profile_id) AS min_wp_id
                    FROM warehouse_profiles
                    GROUP BY user_id
                ) wp_min
                    ON wp1.warehouse_profile_id = wp_min.min_wp_id
            ) wp
                ON wp.user_id = u.user_id


            -- ================================================
            -- LATEST WAREHOUSE ARCHIVE REASON
            -- ================================================

            LEFT JOIN LATERAL (

                SELECT

                    war.reason,

                    war.created_at

                FROM warehouse_archive_reasons war

                WHERE
                    war.user_id =
                        u.user_id

                ORDER BY

                    war.created_at DESC,

                    war.warehouse_archive_reason_id DESC

                LIMIT 1

            ) archive_info
                ON TRUE


            WHERE

                u.user_role = %s

                AND {status_condition}


            ORDER BY

                u.created_at DESC,

                u.user_id DESC
            """,
            [
                WAREHOUSE_ROLE,
            ],
        )


        return inquiry_rows + _rows_to_dicts(cursor)


# ============================================================
# WAREHOUSE MANAGEMENT COUNTS
# ============================================================

def get_warehouse_status_counts():
    from ...models import PartnershipInquiry
    inquiry_to_review_count = PartnershipInquiry.objects.filter(
        partner_role="warehouse",
        status=PartnershipInquiry.Status.TO_REVIEW,
        email_verified=True,
    ).count()
    """
    Return badge counts for:

        To Review
        Active
        Inactive
    """

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'inactive'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                AS to_review,


                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'active'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                AS active,


                COALESCE(
                    SUM(
                        CASE
                            WHEN status IN ('archived', 'deactivated')
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                AS inactive


            FROM users


            WHERE
                user_role = %s
            """,
            [
                WAREHOUSE_ROLE,
            ],
        )


        row = _row_to_dict(
            cursor
        )


    counts = row or {
        "to_review": 0,
        "active": 0,
        "inactive": 0,
    }
    counts["to_review"] = int(counts.get("to_review") or 0) + inquiry_to_review_count
    return counts


# ============================================================
# COMPLETE WAREHOUSE REGISTRATION DETAILS
# ============================================================

def get_warehouse_details(
    user_id,
):
    """
    Return complete Warehouse Manager
    registration information.

    Used by:
        Review Application modal
        View Owner modal
        Warehouse View Details

    Password hash is deliberately excluded.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        numeric_user_id = None

    if numeric_user_id is not None:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT

                    -- ============================================
                    -- PERSONAL INFORMATION
                    -- ============================================

                    u.user_id,

                    u.first_name,

                    u.middle_initial,

                    u.last_name,

                    u.suffix,

                    u.gender,


                    -- ============================================
                    -- PERSONAL ADDRESS
                    -- ============================================

                    u.province,

                    u.municipality,

                    u.postal_code,

                    u.barangay,

                    u.street_address,


                    -- ============================================
                    -- ACCOUNT
                    -- ============================================

                    u.email,

                    u.contact_number,

                    u.username,

                    u.user_role
                        AS user_role,

                    u.status
                        AS status,

                    u.created_at,

                    u.updated_at,


                    -- ============================================
                    -- WAREHOUSE PROFILE
                    -- ============================================

                    wp.warehouse_profile_id,

                    wp.business_name,

                    wp.organization_name,

                    wp.province
                        AS business_province,

                    wp.municipality
                        AS business_municipality,

                    wp.postal_code
                        AS business_postal_code,

                    wp.barangay
                        AS business_barangay,

                    wp.street_address
                        AS business_street_address,

                    wp.official_email,

                    wp.official_contact_number,

                    wp.created_at
                        AS business_created_at,

                    wp.updated_at
                        AS business_updated_at,


                    -- ============================================
                    -- COMPLIANCE DOCUMENTS
                    -- ============================================

                    wd.warehouse_document_id,

                    wd.government_issued_id,

                    wd.business_permit,

                    wd.business_registration,

                    wd.warehouse_license,

                    wd.created_at
                        AS documents_created_at,

                    wd.updated_at
                        AS documents_updated_at


                FROM users u


                LEFT JOIN warehouse_profiles wp

                    ON wp.user_id =
                        u.user_id


                LEFT JOIN warehouse_documents wd

                    ON wd.user_id =
                        u.user_id


                WHERE

                    u.user_id = %s

                    AND u.user_role = %s


                LIMIT 1
                """,
                [
                    numeric_user_id,
                    WAREHOUSE_ROLE,
                ],
            )

            user_details = _row_to_dict(
                cursor
            )

            if user_details:
                user_details["is_partnership"] = False
                return user_details

    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(
            partnership_inquiry_id=user_id,
            partner_role="warehouse",
            status=PartnershipInquiry.Status.TO_REVIEW,
            email_verified=True,
        ).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None
    if inquiry:
        name_parts = str(inquiry.name or "").strip().split()
        first_name = name_parts[0] if name_parts else "Applicant"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        return {
            "user_id": str(inquiry.partnership_inquiry_id),
            "first_name": first_name,
            "middle_initial": None,
            "last_name": last_name,
            "suffix": None,
            "gender": None,
            "province": None,
            "municipality": None,
            "postal_code": None,
            "barangay": None,
            "street_address": None,
            "email": inquiry.email,
            "contact_number": inquiry.contact_number,
            "username": None,
            "user_role": "warehouse_manager",
            "status": inquiry.status,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
            "warehouse_profile_id": None,
            "business_name": inquiry.organization_company,
            "organization_name": inquiry.organization_company,
            "business_province": None,
            "business_municipality": None,
            "business_postal_code": None,
            "business_barangay": None,
            "business_street_address": None,
            "official_email": inquiry.email,
            "official_contact_number": inquiry.contact_number,
            "business_created_at": inquiry.created_at,
            "business_updated_at": inquiry.updated_at,
            "warehouse_document_id": None,
            "government_issued_id": inquiry.government_issued_id,
            "business_permit": None,
            "business_registration": (
                json.loads(inquiry.business_verification_document)[0]
                if (inquiry.business_verification_document and inquiry.business_verification_document.strip().startswith('['))
                else inquiry.business_verification_document
            ),
            "warehouse_license": None,
            "is_partnership": True,
            "message": inquiry.message or "",
            "documents_created_at": inquiry.created_at,
            "documents_updated_at": inquiry.updated_at,
        }

    return None


# ============================================================
# WAREHOUSE ACCOUNT SUMMARY
# ============================================================

def get_warehouse_account_summary(
    user_id,
):
    """
    Lightweight Warehouse Manager lookup.

    Used by service actions:
        confirm
        archive
        restore
        permanent delete
        confirmation email
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return None

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                u.user_id,

                u.first_name,

                u.last_name,

                u.email,

                u.status
                    AS status,


                wp.warehouse_profile_id,

                wp.business_name,

                wp.organization_name,

                wp.official_email,

                wp.official_contact_number


            FROM users u


            LEFT JOIN warehouse_profiles wp

                ON wp.user_id =
                    u.user_id


            WHERE

                u.user_id = %s

                AND u.user_role = %s


            LIMIT 1
            """,
            [
                numeric_user_id,
                WAREHOUSE_ROLE,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# WAREHOUSE EXISTS
# ============================================================

def warehouse_exists(
    user_id,
):
    """
    Return True only when the given user exists
    and is a Warehouse Manager.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return False

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT EXISTS (

                SELECT 1

                FROM users

                WHERE

                    user_id = %s

                    AND user_role = %s
            )
            """,
            [
                numeric_user_id,
                WAREHOUSE_ROLE,
            ],
        )


        row = cursor.fetchone()


    return bool(
        row and row[0]
    )


# ============================================================
# WAREHOUSE VIEW DETAILS OVERVIEW
# ============================================================

def get_warehouse_view_overview(
    user_id,
):
    """
    Summary data for WarehouseInfo.jsx.

    Includes:
        Warehouse information
        Active employees
        Archived employees
        Average rating
        Rating count
        Report count
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return None

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                -- ============================================
                -- ACCOUNT
                -- ============================================

                u.user_id,

                u.status
                    AS status,


                -- ============================================
                -- WAREHOUSE
                -- ============================================

                wp.warehouse_profile_id,

                wp.business_name,

                wp.organization_name,

                wp.official_email,

                wp.official_contact_number,

                wp.province,

                wp.municipality,

                wp.postal_code,

                wp.barangay,

                wp.street_address,


                -- ============================================
                -- ACTIVE EMPLOYEE COUNT
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM warehouse_employees we

                    WHERE
                        we.warehouse_profile_id =
                            wp.warehouse_profile_id

                        AND we.status =
                            'active'
                )
                AS active_employee_count,


                -- ============================================
                -- ARCHIVED EMPLOYEE COUNT
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM warehouse_employees we

                    WHERE
                        we.warehouse_profile_id =
                            wp.warehouse_profile_id

                        AND we.status IN (
                            'inactive',
                            'deactivated',
                            'archived'
                        )
                )
                AS archived_employee_count,


                -- ============================================
                -- AVERAGE RATING
                -- ============================================

                COALESCE(
                    (
                        SELECT
                            AVG(
                                wr.rating
                            )

                        FROM warehouse_ratings wr

                        WHERE
                            wr.warehouse_user_id =
                                u.user_id
                    ),
                    0
                )
                AS average_rating,


                -- ============================================
                -- RATING COUNT
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM warehouse_ratings wr

                    WHERE
                        wr.warehouse_user_id =
                            u.user_id
                )
                AS rating_count,


                -- ============================================
                -- REPORT COUNT
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM warehouse_reports wrep

                    WHERE
                        wrep.warehouse_user_id =
                            u.user_id
                )
                AS report_count


            FROM users u


            INNER JOIN warehouse_profiles wp

                ON wp.user_id =
                    u.user_id


            WHERE

                u.user_id = %s

                AND u.user_role = %s


            ORDER BY
                wp.warehouse_profile_id ASC

            LIMIT 1
            """,
            [
                numeric_user_id,
                WAREHOUSE_ROLE,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# WAREHOUSE EMPLOYEES
# ============================================================

def get_warehouse_employees(
    user_id,
    employee_tab="active",
):
    """
    Get employee accounts belonging specifically
    to the selected Warehouse.

    employee_tab:

        active
            active

        archived
            inactive
            deactivated
            archived

    Latest archive reason is returned when available.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    normalized_tab = str(
        employee_tab
        or "active"
    ).strip().lower()


    if normalized_tab == "active":

        status_condition = """
            we.status =
                'active'
        """


    elif normalized_tab == "archived":

        status_condition = """
            we.status IN (
                'inactive',
                'deactivated',
                'archived'
            )
        """


    else:

        raise ValueError(
            "Invalid Warehouse employee tab."
        )


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ============================================
                -- EMPLOYEE ROOT
                -- ============================================

                we.warehouse_employee_id
                    AS employee_id,

                we.warehouse_profile_id,


                -- ============================================
                -- DISPLAY NAME
                -- ============================================

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            we.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            we.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            we.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            we.suffix
                        ),
                        ''
                    )
                )
                AS employee_name,


                -- ============================================
                -- PERSONAL INFORMATION
                -- ============================================

                we.first_name,

                we.middle_initial,

                we.last_name,

                we.suffix,

                we.gender,


                -- ============================================
                -- ADDRESS
                -- ============================================

                we.province,

                we.municipality,

                we.postal_code,

                we.barangay,

                we.street_address,


                -- ============================================
                -- CONTACT
                -- ============================================

                we.email,

                we.contact_number,


                -- ============================================
                -- ACCOUNT
                -- ============================================

                we.username,

                we.position,

                we.status,

                we.created_at,

                we.updated_at,


                -- ============================================
                -- LATEST ARCHIVE REASON
                -- ============================================

                archive_info.reason
                    AS archive_reason,

                archive_info.created_at
                    AS archived_at


            FROM warehouse_employees we


            INNER JOIN warehouse_profiles wp

                ON wp.warehouse_profile_id =
                    we.warehouse_profile_id


            INNER JOIN users u

                ON u.user_id =
                    wp.user_id


            -- ================================================
            -- LATEST EMPLOYEE ARCHIVE REASON
            -- ================================================

            LEFT JOIN LATERAL (

                SELECT

                    wear.reason,

                    wear.created_at

                FROM warehouse_employee_archive_reasons wear

                WHERE
                    wear.warehouse_employee_id =
                        we.warehouse_employee_id

                ORDER BY

                    wear.created_at DESC,

                    wear.warehouse_employee_archive_reason_id DESC

                LIMIT 1

            ) archive_info
                ON TRUE


            WHERE

                u.user_id = %s

                AND u.user_role = %s

                AND {status_condition}


            ORDER BY

                we.updated_at DESC,

                we.warehouse_employee_id DESC
            """,
            [
                numeric_user_id,
                WAREHOUSE_ROLE,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# WAREHOUSE RATINGS
# ============================================================

def get_warehouse_ratings(
    user_id,
):
    """
    Return all ratings for one Warehouse account.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                wr.warehouse_rating_id
                    AS rating_id,

                wr.warehouse_user_id,

                wr.reviewer_user_id,


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

                reviewer.user_role
                    AS reviewer_role,


                wr.rating,

                wr.comment,

                wr.created_at


            FROM warehouse_ratings wr


            INNER JOIN users reviewer

                ON reviewer.user_id =
                    wr.reviewer_user_id


            WHERE

                wr.warehouse_user_id = %s


            ORDER BY

                wr.created_at DESC,

                wr.warehouse_rating_id DESC
            """,
            [
                numeric_user_id,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# WAREHOUSE REPORTS
# ============================================================

def get_warehouse_reports(
    user_id,
):
    """
    Return reports submitted against one
    Warehouse Manager account.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                wr.warehouse_report_id
                    AS report_id,

                wr.warehouse_user_id,

                wr.reported_by_user_id,


                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            reporter.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reporter.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reporter.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            reporter.suffix
                        ),
                        ''
                    )
                )
                AS reported_by,


                reporter.email
                    AS reporter_email,

                reporter.user_role
                    AS reporter_role,


                wr.category,

                wr.description,

                wr.status,

                wr.created_at,

                wr.updated_at


            FROM warehouse_reports wr


            INNER JOIN users reporter

                ON reporter.user_id =
                    wr.reported_by_user_id


            WHERE

                wr.warehouse_user_id = %s


            ORDER BY

                wr.created_at DESC,

                wr.warehouse_report_id DESC
            """,
            [
                numeric_user_id,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# WAREHOUSE PROFILES
# ============================================================

def get_warehouse_profiles(
    user_id,
):
    """
    Fetch all warehouse profiles owned by a Warehouse user.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                warehouse_profile_id,
                business_name,
                organization_name,
                official_email,
                official_contact_number,
                province,
                municipality,
                barangay,
                street_address,
                postal_code
            FROM warehouse_profiles
            WHERE user_id = %s
            ORDER BY warehouse_profile_id ASC
            """,
            [numeric_user_id],
        )
        return _rows_to_dicts(cursor)


# ============================================================
# COMPLETE WAREHOUSE VIEW DETAILS DATA
# ============================================================

def get_warehouse_view_details_data(
    user_id,
):
    """
    Build all database data required by
    the future WarehouseInfo.jsx page.

    Returns:

        warehouse
        overview
        active_employees
        archived_employees
        ratings
        reports
        profiles
    """

    if not warehouse_exists(
        user_id
    ):

        return None


    warehouse = (
        get_warehouse_details(
            user_id
        )
    )


    overview = (
        get_warehouse_view_overview(
            user_id
        )
    )


    active_employees = (
        get_warehouse_employees(
            user_id,
            employee_tab="active",
        )
    )


    archived_employees = (
        get_warehouse_employees(
            user_id,
            employee_tab="archived",
        )
    )


    ratings = (
        get_warehouse_ratings(
            user_id
        )
    )


    reports = (
        get_warehouse_reports(
            user_id
        )
    )


    profiles = (
        get_warehouse_profiles(
            user_id
        )
    )


    return {
        "warehouse":
            warehouse,

        "overview":
            overview or {},

        "active_employees":
            active_employees,

        "archived_employees":
            archived_employees,

        "ratings":
            ratings,

        "reports":
            reports,

        "profiles":
            profiles,
    }