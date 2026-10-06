from django.db import connection


def _rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def list_miller_branches(miller_user_id):
    """
    Retrieve all supplier_profiles owned by the authenticated Miller Manager.

    Parameters:
    - miller_user_id: int, authoritative user_id from JWT (request.grainrise_miller_id)

    Returns list of dicts with:
    - supplier_profile_id
    - business_name
    - organization_name
    - province
    - municipality
    - postal_code
    - barangay
    - street_address
    - official_email
    - official_contact_number
    - created_at
    - updated_at
    - employee_count
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                sp.supplier_profile_id,
                sp.business_name,
                sp.organization_name,
                sp.province,
                sp.municipality,
                sp.postal_code,
                sp.barangay,
                sp.street_address,
                sp.official_email,
                sp.official_contact_number,
                sp.created_at,
                sp.updated_at,
                (
                    SELECT COUNT(*)
                    FROM supplier_employees se
                    WHERE se.supplier_profile_id = sp.supplier_profile_id
                ) AS employee_count
            FROM supplier_profiles sp
            WHERE sp.user_id = %s
            ORDER BY sp.created_at ASC, sp.supplier_profile_id ASC
            """,
            [miller_user_id],
        )
        return _rows_to_dicts(cursor)


def get_miller_branch(miller_user_id, branch_id):
    """
    Verify that the branch (supplier_profile) belongs to the authenticated Miller Manager.

    Parameters:
    - miller_user_id: int, authoritative user_id from JWT
    - branch_id: int, supplier_profile_id

    Returns dict or None.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                sp.supplier_profile_id,
                sp.business_name,
                sp.organization_name,
                sp.province,
                sp.municipality,
                sp.postal_code,
                sp.barangay,
                sp.street_address,
                sp.official_email,
                sp.official_contact_number,
                sp.created_at,
                sp.updated_at
            FROM supplier_profiles sp
            WHERE sp.supplier_profile_id = %s
              AND sp.user_id = %s
            LIMIT 1
            """,
            [branch_id, miller_user_id],
        )
        return _row_to_dict(cursor)


DISPLAY_ROLES = {
    "encoder": "Encoder",
    "procurement": "Procurement",
    "finance": "Finance",
    "seller": "Sales",
    "fulfillment_logistics_coordinator": "Fulfillment & Logistics",
    "driver": "Driver",
    "branch_manager": "Branch Manager",
}


def list_miller_branch_employees(supplier_profile_id):
    """
    Retrieve all employees from supplier_employees for the specified supplier_profile_id.

    Parameters:
    - supplier_profile_id: int

    Returns list of employee dicts with UI helper keys and archive_reason.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.supplier_profile_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.gender,
                se.province,
                se.municipality,
                se.postal_code,
                se.barangay,
                se.street_address,
                se.email,
                se.contact_number,
                se.username,
                se.position,
                se.status,
                se.created_at,
                se.updated_at,
                (
                    SELECT sear.reason
                    FROM supplier_employee_archive_reasons sear
                    WHERE sear.supplier_employee_id = se.supplier_employee_id
                    ORDER BY sear.created_at DESC, sear.supplier_employee_archive_reason_id DESC
                    LIMIT 1
                ) AS archive_reason
            FROM supplier_employees se
            WHERE se.supplier_profile_id = %s
            ORDER BY se.created_at DESC, se.supplier_employee_id DESC
            """,
            [supplier_profile_id],
        )
        rows = _rows_to_dicts(cursor)

    for row in rows:
        name_parts = [
            row.get("first_name"),
            row.get("middle_initial"),
            row.get("last_name"),
            row.get("suffix"),
        ]
        full_name = " ".join(part for part in name_parts if part).strip()
        pos = str(row.get("position") or "").strip().lower()
        row["id"] = row.get("supplier_employee_id")
        row["name"] = full_name or row.get("email") or "Employee"
        row["role"] = DISPLAY_ROLES.get(pos, row.get("position") or "Employee")
        row["phone"] = row.get("contact_number") or ""
        row["archive_reason"] = row.get("archive_reason") or ""

    return rows


def get_miller_branch_employee(branch_id, employee_id):
    """
    Retrieve an employee by supplier_employee_id and verify it belongs to branch_id.

    Parameters:
    - branch_id: int, supplier_profile_id
    - employee_id: int, supplier_employee_id

    Returns dict or None.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.supplier_profile_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.gender,
                se.province,
                se.municipality,
                se.postal_code,
                se.barangay,
                se.street_address,
                se.email,
                se.contact_number,
                se.username,
                se.position,
                se.status,
                se.created_at,
                se.updated_at,
                (
                    SELECT sear.reason
                    FROM supplier_employee_archive_reasons sear
                    WHERE sear.supplier_employee_id = se.supplier_employee_id
                    ORDER BY sear.created_at DESC, sear.supplier_employee_archive_reason_id DESC
                    LIMIT 1
                ) AS archive_reason
            FROM supplier_employees se
            WHERE se.supplier_employee_id = %s
              AND se.supplier_profile_id = %s
            LIMIT 1
            """,
            [employee_id, branch_id],
        )
        row = _row_to_dict(cursor)

    if row:
        name_parts = [
            row.get("first_name"),
            row.get("middle_initial"),
            row.get("last_name"),
            row.get("suffix"),
        ]
        full_name = " ".join(part for part in name_parts if part).strip()
        pos = str(row.get("position") or "").strip().lower()
        row["id"] = row.get("supplier_employee_id")
        row["name"] = full_name or row.get("email") or "Employee"
        row["role"] = DISPLAY_ROLES.get(pos, row.get("position") or "Employee")
        row["phone"] = row.get("contact_number") or ""
        row["archive_reason"] = row.get("archive_reason") or ""

    return row


