from django.core.exceptions import ValidationError
from django.db import connection
from django.db.models import Q

from ...models import PartnershipInquiry


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
# TABLE CHECK (MySQL-compatible)
# ============================================================

def _table_exists(table_name):
    normalized_name = str(
        table_name or ""
    ).strip().lower()

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
# TAB STATUS CONDITION
# ============================================================

def _status_condition_for_tab(tab):
    if tab == TAB_TO_REVIEW:
        return "u.status = 'inactive'"

    if tab == TAB_ACTIVE:
        return "u.status = 'active'"

    if tab == TAB_INACTIVE:
        return "u.status IN ('archived', 'deactivated')"

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

    inquiry_rows = []
    if tab == TAB_TO_REVIEW:
        inquiries = PartnershipInquiry.objects.filter(
            partner_role="farmer",
            status=PartnershipInquiry.Status.TO_REVIEW,
        ).filter(
            Q(email_verified=True) | Q(contact_number_verified=True)
        ).order_by("-created_at")

        for inq in inquiries:
            inquiry_rows.append({
                "id": str(inq.partnership_inquiry_id),
                "farmer_name": inq.name,
                "email": inq.email or "—",
                "contact_number": inq.contact_number,
                "username": None,
                "status": "to_review",
                "rsbsa_number": "—",
                "submission_method": "Online Partner Inquiry",
                "farm_count": 0,
                "total_farm_area": 0,
                "archive_reason": None,
                "archived_at": None,
                "created_at": inq.created_at,
                "updated_at": inq.updated_at,
                "is_partnership": True,
            })

    has_archive_reasons = (
        _table_exists(
            "farmer_archive_reasons"
        )
    )

    if has_archive_reasons:
        archive_columns = """
            archive_info.reason AS archive_reason,
            archive_info.created_at AS archived_at
        """
        archive_join = """
            LEFT JOIN (
                SELECT far1.user_id, far1.reason, far1.created_at
                FROM farmer_archive_reasons far1
                INNER JOIN (
                    SELECT user_id, MAX(farmer_archive_reason_id) AS max_id
                    FROM farmer_archive_reasons
                    GROUP BY user_id
                ) far_max ON far1.farmer_archive_reason_id = far_max.max_id
            ) archive_info ON archive_info.user_id = u.user_id
        """
    else:
        archive_columns = """
            NULL AS archive_reason,
            NULL AS archived_at
        """
        archive_join = ""

    has_farmer_compliance = _table_exists("farmer_compliance")
    if has_farmer_compliance:
        compliance_cols = "fc.rsbsa_number, fc.submission_method"
        compliance_join = "LEFT JOIN farmer_compliance fc ON fc.user_id = u.user_id"
    else:
        compliance_cols = "NULL AS rsbsa_number, 'Direct Registration' AS submission_method"
        compliance_join = ""

    has_farmer_farms = _table_exists("farmer_farms")
    if has_farmer_farms:
        farm_cols = "COALESCE(farm_summary.farm_count, 0) AS farm_count, COALESCE(farm_summary.total_farm_area, 0) AS total_farm_area"
        farm_join = """
            LEFT JOIN (
                SELECT user_id, COUNT(*) AS farm_count, COALESCE(SUM(total_farm_area), 0) AS total_farm_area
                FROM farmer_farms
                GROUP BY user_id
            ) farm_summary ON farm_summary.user_id = u.user_id
        """
    else:
        farm_cols = "0 AS farm_count, 0 AS total_farm_area"
        farm_join = ""

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                u.user_id AS id,
                CONCAT_WS(
                    ' ',
                    NULLIF(TRIM(u.first_name), ''),
                    NULLIF(TRIM(u.middle_initial), ''),
                    NULLIF(TRIM(u.last_name), ''),
                    NULLIF(TRIM(u.suffix), '')
                ) AS farmer_name,
                u.email,
                u.contact_number,
                u.username,
                u.status AS status,
                {compliance_cols},
                {farm_cols},
                {archive_columns},
                u.created_at,
                u.updated_at
            FROM users u
            {compliance_join}
            {farm_join}
            {archive_join}
            WHERE u.user_role = %s
              AND {status_condition}
            ORDER BY u.created_at DESC, u.user_id DESC
            """,
            [FARMER_ROLE],
        )

        user_rows = _rows_to_dicts(cursor)

    for row in user_rows:
        row["is_partnership"] = False

    return inquiry_rows + user_rows


# ============================================================
# STATUS COUNTS
# ============================================================

def get_farmer_status_counts():
    inquiry_to_review_count = PartnershipInquiry.objects.filter(
        partner_role="farmer",
        status=PartnershipInquiry.Status.TO_REVIEW,
    ).filter(
        Q(email_verified=True) | Q(contact_number_verified=True)
    ).count()

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
            WHERE user_role = %s
            """,
            [FARMER_ROLE],
        )

        row = _row_to_dict(cursor)

    if not row:
        row = {"to_review": 0, "active": 0, "inactive": 0}

    row["to_review"] = int(row.get("to_review") or 0) + inquiry_to_review_count
    row["active"] = int(row.get("active") or 0)
    row["inactive"] = int(row.get("inactive") or 0)
    return row


# ============================================================
# COMPLETE FARMER DETAILS
# ============================================================

def get_farmer_details(
    user_id,
):
    try:
        inquiry = PartnershipInquiry.objects.filter(
            partnership_inquiry_id=user_id,
            partner_role="farmer",
        ).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        name_parts = str(inquiry.name or "").strip().split()
        first_name = name_parts[0] if name_parts else "Applicant"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        doc_raw = inquiry.business_verification_document or ""
        if doc_raw.strip().startswith("["):
            try:
                import json
                parsed = json.loads(doc_raw)
                doc_raw = parsed[0] if isinstance(parsed, list) and parsed else doc_raw
            except Exception:
                pass

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
            "user_role": "farmer",
            "status": inquiry.status,
            "farmer_compliance_id": None,
            "rsbsa_number": "Pending Onboarding",
            "rsbsa_document": doc_raw or None,
            "government_issued_id": inquiry.government_issued_id or None,
            "submission_method": "Online Partner Inquiry",
            "compliance_created_at": inquiry.created_at,
            "compliance_updated_at": inquiry.updated_at,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
            "is_partnership": True,
            "message": inquiry.message or "",
        }

    has_farmer_compliance = _table_exists("farmer_compliance")
    if has_farmer_compliance:
        comp_cols = """
            fc.farmer_compliance_id,
            fc.rsbsa_number,
            fc.rsbsa_document,
            fc.submission_method,
            fc.created_at AS compliance_created_at,
            fc.updated_at AS compliance_updated_at
        """
        comp_join = "LEFT JOIN farmer_compliance fc ON fc.user_id = u.user_id"
    else:
        comp_cols = """
            NULL AS farmer_compliance_id,
            NULL AS rsbsa_number,
            NULL AS rsbsa_document,
            'Direct Registration' AS submission_method,
            NULL AS compliance_created_at,
            NULL AS compliance_updated_at
        """
        comp_join = ""

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
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
                u.user_role AS user_role,
                u.status AS status,
                {comp_cols},
                u.created_at,
                u.updated_at
            FROM users u
            {comp_join}
            WHERE u.user_id = %s
              AND u.user_role = %s
            LIMIT 1
            """,
            [
                user_id,
                FARMER_ROLE,
            ],
        )

        row = _row_to_dict(cursor)

    if row:
        row["is_partnership"] = False

    return row


# ============================================================
# FARMER FARMS
# ============================================================

def get_farmer_farms(
    user_id,
):
    if not _table_exists("farmer_farms"):
        return []

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
            WHERE user_id = %s
            ORDER BY created_at DESC, farm_id DESC
            """,
            [user_id],
        )

        return _rows_to_dicts(cursor)


# ============================================================
# FARM SUMMARY
# ============================================================

def get_farmer_farm_summary(
    user_id,
):
    if not _table_exists("farmer_farms"):
        return {
            "farm_count": 0,
            "active_farm_count": 0,
            "inactive_farm_count": 0,
            "total_farm_area": 0,
        }

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS farm_count,
                COALESCE(SUM(CASE WHEN farm_status = 'active' THEN 1 ELSE 0 END), 0) AS active_farm_count,
                COALESCE(SUM(CASE WHEN farm_status = 'inactive' THEN 1 ELSE 0 END), 0) AS inactive_farm_count,
                COALESCE(SUM(total_farm_area), 0) AS total_farm_area
            FROM farmer_farms
            WHERE user_id = %s
            """,
            [user_id],
        )

        row = _row_to_dict(cursor)

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
    if not _table_exists("farmer_ratings"):
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
                COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating,
                COUNT(*) AS rating_count,
                COALESCE(SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END), 0) AS five_star,
                COALESCE(SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END), 0) AS four_star,
                COALESCE(SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END), 0) AS three_star,
                COALESCE(SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END), 0) AS two_star,
                COALESCE(SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END), 0) AS one_star
            FROM farmer_ratings
            WHERE farmer_user_id = %s
            """,
            [user_id],
        )

        row = _row_to_dict(cursor)

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
    if not _table_exists("farmer_ratings"):
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
                    NULLIF(TRIM(reviewer.first_name), ''),
                    NULLIF(TRIM(reviewer.middle_initial), ''),
                    NULLIF(TRIM(reviewer.last_name), ''),
                    NULLIF(TRIM(reviewer.suffix), '')
                ) AS reviewer_name,
                reviewer.email AS reviewer_email,
                reviewer.user_role AS reviewer_role,
                fr.rating,
                fr.comment,
                fr.created_at
            FROM farmer_ratings fr
            INNER JOIN users reviewer ON reviewer.user_id = fr.reviewer_user_id
            WHERE fr.farmer_user_id = %s
            ORDER BY fr.created_at DESC, fr.farmer_rating_id DESC
            """,
            [user_id],
        )

        return _rows_to_dicts(cursor)


# ============================================================
# FARMER ACCOUNT SUMMARY
# ============================================================

def get_farmer_account_summary(
    user_id,
):
    try:
        inquiry = PartnershipInquiry.objects.filter(
            partnership_inquiry_id=user_id,
            partner_role="farmer",
        ).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        return {
            "user_id": str(inquiry.partnership_inquiry_id),
            "status": inquiry.status,
            "first_name": inquiry.name,
            "last_name": "",
            "email": inquiry.email,
            "contact_number": inquiry.contact_number,
            "username": None,
            "user_role": "farmer",
            "is_partnership": True,
            "created_at": inquiry.created_at,
            "updated_at": inquiry.updated_at,
        }

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
                status,
                created_at,
                updated_at
            FROM users
            WHERE user_id = %s
              AND user_role = %s
            LIMIT 1
            """,
            [user_id, FARMER_ROLE],
        )

        return _row_to_dict(cursor)


# ============================================================
# FARMER EXISTS
# ============================================================

def farmer_exists(
    user_id,
):
    try:
        if PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id, partner_role="farmer").exists():
            return True
    except (ValueError, TypeError, ValidationError):
        pass

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM users
            WHERE user_id = %s
              AND user_role = %s
            LIMIT 1
            """,
            [user_id, FARMER_ROLE],
        )

        row = cursor.fetchone()

    return bool(row and row[0])
