import json
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

    inquiry_rows = []
    if tab == TAB_TO_REVIEW:
        from ...models import PartnershipInquiry
        inquiries = PartnershipInquiry.objects.filter(
            partner_role="retailer",
            status=PartnershipInquiry.Status.TO_REVIEW,
        ).order_by("-created_at")

        for inq in inquiries:
            inquiry_rows.append({
                "id": str(inq.partnership_inquiry_id),
                "retailer_name": inq.name,
                "email": inq.email,
                "contact_number": inq.contact_number,
                "username": None,
                "status": "to_review",
                "created_at": inq.created_at,
                "updated_at": inq.updated_at,
                "archive_reason": None,
                "archived_at": None,
            })

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

        return inquiry_rows + _rows_to_dicts(cursor)


# ============================================================
# STATUS COUNTS
# ============================================================

def get_retailer_status_counts():
    from ...models import PartnershipInquiry
    inquiry_to_review_count = PartnershipInquiry.objects.filter(
        partner_role="retailer",
        status=PartnershipInquiry.Status.TO_REVIEW,
    ).count()
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

    counts = row or {
        "to_review": 0,
        "active": 0,
        "inactive": 0,
    }
    counts["to_review"] = int(counts.get("to_review") or 0) + inquiry_to_review_count
    return counts


# ============================================================
# COMPLETE RETAILER DETAILS
# ============================================================

def get_retailer_details(
    user_id,
):
    from ...models import PartnershipInquiry
    inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
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
            "user_role": "retailer",
            "status": inquiry.status,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
            "retailer_document_id": None,
            "barangay_permit": None,
            "valid_id": (
                json.loads(inquiry.business_verification_document)[0]
                if (inquiry.business_verification_document and inquiry.business_verification_document.strip().startswith('['))
                else inquiry.business_verification_document
            ),
            "documents_created_at": inquiry.created_at,
            "documents_updated_at": inquiry.updated_at,
        }

    try:
        numeric_user_id = int(user_id)
    except (ValueError, TypeError):
        return None
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
                numeric_user_id,
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
                numeric_user_id,
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
                numeric_user_id,
                RETAILER_ROLE,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )