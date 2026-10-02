import json
from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

MILLER_ROLE = "miller_manager"

TAB_TO_REVIEW = "to-review"
TAB_ACTIVE = "active"
TAB_INACTIVE = "inactive"

VALID_MILLER_TABS = {
    TAB_TO_REVIEW,
    TAB_ACTIVE,
    TAB_INACTIVE,
}


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    """
    Convert all rows from the current cursor
    into dictionaries.
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
# DATABASE TABLE CHECK
# ============================================================

def _table_exists(table_name):
    """
    Check whether a public PostgreSQL table exists.

    Miller Management has support tables for:
        archive reasons
        employee archive reasons
        ratings
        reports

    The main Miller list should still work even when
    one of these optional/support tables has not yet
    been created in the current database.
    """

    normalized_name = str(
        table_name or ""
    ).strip()

    if not normalized_name:
        return False

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = %s
            LIMIT 1
            """,
            [
                normalized_name,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )


# ============================================================
# STATUS CONDITION
# ============================================================

def _status_condition_for_tab(tab):
    """
    Miller Management status mapping.

    To Review:
        users.status = inactive

    Active:
        users.status = active

    Inactive:
        users.status = archived/deactivated

    Registration-pending accounts must not appear
    under the management Inactive tab.
    """

    if tab == TAB_TO_REVIEW:

        return """
            u.status =
                'inactive'
        """


    if tab == TAB_ACTIVE:

        return """
            u.status =
                'active'
        """


    if tab == TAB_INACTIVE:

        return """
            u.status IN (
                'archived',
                'deactivated'
            )
        """


    raise ValueError(
        "Invalid Miller Management tab."
    )


# ============================================================
# MILLER MANAGEMENT LIST
# ============================================================

def list_millers(
    tab=TAB_TO_REVIEW,
):
    """
    Main Miller Management database list.

    React handles:
        search
        sorting
        pagination

    Archive reason is returned when the support
    table exists. A missing archive table must NOT
    prevent To Review or Active accounts from loading.
    """

    if tab not in VALID_MILLER_TABS:

        raise ValueError(
            "Invalid Miller Management tab."
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
            partner_role="miller",
            status=PartnershipInquiry.Status.TO_REVIEW,
        ).order_by("-created_at")

        for inq in inquiries:
            inquiry_rows.append({
                "id": str(inq.partnership_inquiry_id),
                "miller_name": inq.name,
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


    has_archive_reasons = (
        _table_exists(
            "miller_archive_reasons"
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
                    mar.reason,
                    mar.created_at

                FROM miller_archive_reasons mar

                WHERE
                    mar.user_id =
                        u.user_id

                ORDER BY
                    mar.created_at DESC,
                    mar.miller_archive_reason_id DESC

                LIMIT 1

            ) archive_info
                ON TRUE
        """

    else:

        archive_columns = """
            NULL
                AS archive_reason,

            NULL
                AS archived_at
        """


        archive_join = ""


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ============================================
                -- ACCOUNT ID
                -- ============================================

                u.user_id
                    AS id,


                -- ============================================
                -- MILLER NAME
                -- ============================================

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
                AS miller_name,


                -- ============================================
                -- BUSINESS
                -- ============================================

                p.business_name,

                p.organization_name,


                -- ============================================
                -- CONTACT
                -- ============================================

                u.email,

                u.contact_number,


                -- ============================================
                -- STATUS
                -- ============================================

                u.status
                    AS status,


                -- ============================================
                -- TIMESTAMPS
                -- ============================================

                u.created_at,

                u.updated_at,


                -- ============================================
                -- ARCHIVE INFORMATION
                -- ============================================

                {archive_columns}


            FROM users u


            INNER JOIN supplier_profiles p

                ON p.user_id =
                    u.user_id


            {archive_join}


            WHERE

                u.user_role = %s

                AND {status_condition}


            ORDER BY

                u.created_at DESC,

                u.user_id DESC
            """,
            [
                MILLER_ROLE,
            ],
        )


        return inquiry_rows + _rows_to_dicts(cursor)


# ============================================================
# MILLER MANAGEMENT COUNTS
# ============================================================

def get_miller_status_counts():
    from ...models import PartnershipInquiry
    inquiry_to_review_count = PartnershipInquiry.objects.filter(
        partner_role="miller",
        status=PartnershipInquiry.Status.TO_REVIEW,
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
                ) AS to_review,


                COALESCE(
                    SUM(
                        CASE
                            WHEN status = 'active'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS active,


                COALESCE(
                    SUM(
                        CASE
                            WHEN status IN ('archived', 'deactivated')
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                ) AS inactive


            FROM users


            WHERE
                user_role = %s
            """,
            [
                MILLER_ROLE,
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
# COMPLETE MILLER DETAILS
# ============================================================

def get_miller_details(
    user_id,
):
    """
    Full Miller registration details.

    Used by:
        Review Application
        View Owner
        MillerInfo

    Password hashes are deliberately excluded.

    supplier_documents is LEFT JOINED so a legacy
    account with missing documents does not make the
    entire owner record disappear.
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
                    -- ACCOUNT / PERSONAL
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
                    -- ACCOUNT CONTACT
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
                    -- BUSINESS
                    -- ============================================

                    p.supplier_profile_id,

                    p.business_name,

                    p.organization_name,

                    p.province
                        AS business_province,

                    p.municipality
                        AS business_municipality,

                    p.postal_code
                        AS business_postal_code,

                    p.barangay
                        AS business_barangay,

                    p.street_address
                        AS business_street_address,

                    p.official_email,

                    p.official_contact_number,

                    p.created_at
                        AS business_created_at,

                    p.updated_at
                        AS business_updated_at,


                    -- ============================================
                    -- DOCUMENTS
                    -- ============================================

                    d.supplier_document_id,

                    d.government_issued_id,

                    d.business_permit,

                    d.business_registration,

                    d.milling_license,

                    d.created_at
                        AS documents_created_at,

                    d.updated_at
                        AS documents_updated_at


                FROM users u


                LEFT JOIN supplier_profiles p

                    ON p.user_id =
                        u.user_id


                LEFT JOIN supplier_documents d

                    ON d.user_id =
                        u.user_id


                WHERE

                    u.user_id = %s

                    AND u.user_role = %s


                LIMIT 1
                """,
                [
                    numeric_user_id,
                    MILLER_ROLE,
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
            partner_role="miller",
            status=PartnershipInquiry.Status.TO_REVIEW,
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
            "user_role": "miller_manager",
            "status": inquiry.status,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
            "supplier_profile_id": None,
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
            "supplier_document_id": None,
            "government_issued_id": inquiry.government_issued_id,
            "business_permit": None,
            "business_registration": (
                json.loads(inquiry.business_verification_document)[0]
                if (inquiry.business_verification_document and inquiry.business_verification_document.strip().startswith('['))
                else inquiry.business_verification_document
            ),
            "milling_license": None,
            "is_partnership": True,
            "documents_created_at": inquiry.created_at,
            "documents_updated_at": inquiry.updated_at,
        }

    return None


# ============================================================
# MILLER ACCOUNT SUMMARY
# ============================================================

def get_miller_account_summary(
    user_id,
):
    """
    Lightweight Miller record used by
    account service actions.
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

                p.supplier_profile_id,

                p.business_name,

                p.organization_name,

                p.official_email,

                p.official_contact_number


            FROM users u


            LEFT JOIN supplier_profiles p

                ON p.user_id =
                    u.user_id


            WHERE

                u.user_id = %s

                AND u.user_role = %s


            LIMIT 1
            """,
            [
                numeric_user_id,
                MILLER_ROLE,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# MILLER EXISTS
# ============================================================

def miller_exists(
    user_id,
):
    """
    True only when the ID belongs to a
    Miller Manager account.
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
                MILLER_ROLE,
            ],
        )


        row = cursor.fetchone()


    return bool(
        row
        and row[0]
    )


# ============================================================
# MILLER VIEW DETAILS OVERVIEW
# ============================================================

def get_miller_view_overview(
    user_id,
):
    """
    Summary data for MillerInfo.

    Optional ratings/reports tables are checked first
    so missing support tables do not crash the page.
    """
    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return None

    has_ratings = (
        _table_exists(
            "miller_ratings"
        )
    )


    has_reports = (
        _table_exists(
            "miller_reports"
        )
    )


    if has_ratings:

        rating_columns = """
            COALESCE(
                (
                    SELECT
                        AVG(
                            mr.rating
                        )

                    FROM miller_ratings mr

                    WHERE
                        mr.miller_user_id =
                            u.user_id
                ),
                0
            )
            AS average_rating,


            (
                SELECT
                    COUNT(*)

                FROM miller_ratings mr

                WHERE
                    mr.miller_user_id =
                        u.user_id
            )
            AS rating_count
        """

    else:

        rating_columns = """
            0
                AS average_rating,

            0
                AS rating_count
        """


    if has_reports:

        report_columns = """
            (
                SELECT
                    COUNT(*)

                FROM miller_reports mrep

                WHERE
                    mrep.miller_user_id =
                        u.user_id
            )
            AS report_count
        """

    else:

        report_columns = """
            0
                AS report_count
        """


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ============================================
                -- MILLER
                -- ============================================

                u.user_id,

                u.status
                    AS status,


                -- ============================================
                -- BUSINESS
                -- ============================================

                p.supplier_profile_id,

                p.business_name,

                p.organization_name,

                p.official_email,

                p.official_contact_number,


                -- ============================================
                -- ACTIVE EMPLOYEES
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM supplier_employees se

                    WHERE
                        se.supplier_profile_id =
                            p.supplier_profile_id

                        AND se.status =
                            'active'
                )
                AS active_employee_count,


                -- ============================================
                -- ARCHIVED EMPLOYEES
                -- ============================================

                (
                    SELECT
                        COUNT(*)

                    FROM supplier_employees se

                    WHERE
                        se.supplier_profile_id =
                            p.supplier_profile_id

                        AND se.status IN (
                            'inactive',
                            'deactivated',
                            'archived'
                        )
                )
                AS archived_employee_count,


                -- ============================================
                -- RATINGS
                -- ============================================

                {rating_columns},


                -- ============================================
                -- REPORTS
                -- ============================================

                {report_columns}


            FROM users u


            INNER JOIN supplier_profiles p

                ON p.user_id =
                    u.user_id


            WHERE

                u.user_id = %s

                AND u.user_role = %s


            LIMIT 1
            """,
            [
                numeric_user_id,
                MILLER_ROLE,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# MILLER EMPLOYEES
# ============================================================

def get_miller_employees(
    user_id,
    employee_tab="active",
):
    """
    Employees owned by one Miller.

    active:
        status = active

    archived:
        inactive
        deactivated
        archived
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
            se.status =
                'active'
        """


    elif normalized_tab == "archived":

        status_condition = """
            se.status IN (
                'inactive',
                'deactivated',
                'archived'
            )
        """


    else:

        raise ValueError(
            "Invalid Miller employee tab."
        )


    has_archive_reasons = (
        _table_exists(
            "supplier_employee_archive_reasons"
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
                    ar.reason,
                    ar.created_at

                FROM
                    supplier_employee_archive_reasons ar

                WHERE
                    ar.supplier_employee_id =
                        se.supplier_employee_id

                ORDER BY
                    ar.created_at DESC,
                    ar.supplier_employee_archive_reason_id DESC

                LIMIT 1

            ) archive_info
                ON TRUE
        """

    else:

        archive_columns = """
            NULL
                AS archive_reason,

            NULL
                AS archived_at
        """


        archive_join = ""


    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT

                -- ============================================
                -- ROOT
                -- ============================================

                se.supplier_employee_id
                    AS employee_id,

                se.supplier_profile_id,


                -- ============================================
                -- DISPLAY NAME
                -- ============================================

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            se.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            se.middle_initial
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            se.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            se.suffix
                        ),
                        ''
                    )
                )
                AS employee_name,


                -- ============================================
                -- PERSONAL
                -- ============================================

                se.first_name,

                se.middle_initial,

                se.last_name,

                se.suffix,

                se.gender,


                -- ============================================
                -- ADDRESS
                -- ============================================

                se.province,

                se.municipality,

                se.postal_code,

                se.barangay,

                se.street_address,


                -- ============================================
                -- CONTACT
                -- ============================================

                se.email,

                se.contact_number,


                -- ============================================
                -- ACCOUNT
                -- ============================================

                se.username,

                se.position,

                se.status,

                se.created_at,

                se.updated_at,


                -- ============================================
                -- ARCHIVE INFORMATION
                -- ============================================

                {archive_columns}


            FROM supplier_employees se


            INNER JOIN supplier_profiles p

                ON p.supplier_profile_id =
                    se.supplier_profile_id


            INNER JOIN users u

                ON u.user_id =
                    p.user_id


            {archive_join}


            WHERE

                u.user_id = %s

                AND u.user_role = %s

                AND {status_condition}


            ORDER BY

                se.updated_at DESC,

                se.supplier_employee_id DESC
            """,
            [
                numeric_user_id,
                MILLER_ROLE,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# MILLER RATINGS
# ============================================================

def get_miller_ratings(
    user_id,
):
    """
    Ratings submitted for one Miller.

    Returns [] when the support table does
    not yet exist.
    """

    if not _table_exists(
        "miller_ratings"
    ):

        return []

    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                mr.miller_rating_id
                    AS rating_id,

                mr.miller_user_id,

                mr.reviewer_user_id,


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


                mr.rating,

                mr.comment,

                mr.created_at


            FROM miller_ratings mr


            INNER JOIN users reviewer

                ON reviewer.user_id =
                    mr.reviewer_user_id


            WHERE
                mr.miller_user_id = %s


            ORDER BY
                mr.created_at DESC,
                mr.miller_rating_id DESC
            """,
            [
                numeric_user_id,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# MILLER REPORTS
# ============================================================

def get_miller_reports(
    user_id,
):
    """
    Reports submitted against one Miller.

    Returns [] when the support table does
    not yet exist.
    """

    if not _table_exists(
        "miller_reports"
    ):

        return []

    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return []

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                mr.miller_report_id
                    AS report_id,

                mr.miller_user_id,

                mr.reported_by_user_id,


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


                mr.category,

                mr.description,

                mr.status,

                mr.created_at,

                mr.updated_at


            FROM miller_reports mr


            INNER JOIN users reporter

                ON reporter.user_id =
                    mr.reported_by_user_id


            WHERE
                mr.miller_user_id = %s


            ORDER BY
                mr.created_at DESC,
                mr.miller_report_id DESC
            """,
            [
                numeric_user_id,
            ],
        )


        return _rows_to_dicts(cursor)


# ============================================================
# COMPLETE MILLER VIEW DETAILS
# ============================================================

def get_miller_view_details_data(
    user_id,
):
    """
    Build everything required by MillerInfo.

    Returns:
        miller
        overview
        active_employees
        archived_employees
        ratings
        reports
    """

    if not miller_exists(
        user_id
    ):

        return None


    miller = (
        get_miller_details(
            user_id
        )
    )


    overview = (
        get_miller_view_overview(
            user_id
        )
    )


    active_employees = (
        get_miller_employees(
            user_id,
            employee_tab="active",
        )
    )


    archived_employees = (
        get_miller_employees(
            user_id,
            employee_tab="archived",
        )
    )


    ratings = (
        get_miller_ratings(
            user_id
        )
    )


    reports = (
        get_miller_reports(
            user_id
        )
    )


    return {
        "miller":
            miller,

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
    }