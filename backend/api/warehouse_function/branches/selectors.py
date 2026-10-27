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


def list_warehouse_branches(warehouse_user_id):
    """
    Retrieve all warehouse_profiles owned by the authenticated Warehouse Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                wp.warehouse_profile_id,
                wp.business_name,
                wp.organization_name,
                wp.province,
                wp.municipality,
                wp.postal_code,
                wp.barangay,
                wp.street_address,
                wp.official_email,
                wp.official_contact_number,
                wp.created_at,
                wp.updated_at,
                (
                    SELECT COUNT(*)
                    FROM warehouse_employees we
                    WHERE we.warehouse_profile_id = wp.warehouse_profile_id
                ) AS employee_count
            FROM warehouse_profiles wp
            WHERE wp.user_id = %s
            ORDER BY wp.created_at ASC, wp.warehouse_profile_id ASC
            """,
            [warehouse_user_id],
        )
        return _rows_to_dicts(cursor)


def get_warehouse_branch(warehouse_user_id, branch_id):
    """
    Verify and return the warehouse branch if owned by the authenticated Warehouse Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                wp.warehouse_profile_id,
                wp.business_name,
                wp.organization_name,
                wp.province,
                wp.municipality,
                wp.postal_code,
                wp.barangay,
                wp.street_address,
                wp.official_email,
                wp.official_contact_number,
                wp.created_at,
                wp.updated_at
            FROM warehouse_profiles wp
            WHERE wp.warehouse_profile_id = %s
              AND wp.user_id = %s
            LIMIT 1
            """,
            [branch_id, warehouse_user_id],
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


def list_warehouse_branch_employees(warehouse_profile_id):
    """
    Retrieve all employees from warehouse_employees for the specified warehouse_profile_id.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.warehouse_profile_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.gender,
                we.province,
                we.municipality,
                we.postal_code,
                we.barangay,
                we.street_address,
                we.email,
                we.contact_number,
                we.username,
                we.position,
                we.status,
                we.created_at,
                we.updated_at,
                (
                    SELECT wear.reason
                    FROM warehouse_employee_archive_reasons wear
                    WHERE wear.warehouse_employee_id = we.warehouse_employee_id
                    ORDER BY wear.created_at DESC, wear.warehouse_employee_archive_reason_id DESC
                    LIMIT 1
                ) AS archive_reason
            FROM warehouse_employees we
            WHERE we.warehouse_profile_id = %s
            ORDER BY we.created_at DESC, we.warehouse_employee_id DESC
            """,
            [warehouse_profile_id],
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
        row["id"] = row.get("warehouse_employee_id")
        row["name"] = full_name or row.get("email") or "Employee"
        row["role"] = DISPLAY_ROLES.get(pos, row.get("position") or "Employee")
        row["phone"] = row.get("contact_number") or ""
        row["archive_reason"] = row.get("archive_reason") or ""

    return rows


def get_warehouse_branch_employee(branch_id, employee_id):
    """
    Retrieve an employee by warehouse_employee_id and verify it belongs to branch_id.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.warehouse_profile_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.gender,
                we.province,
                we.municipality,
                we.postal_code,
                we.barangay,
                we.street_address,
                we.email,
                we.contact_number,
                we.username,
                we.position,
                we.status,
                we.created_at,
                we.updated_at,
                (
                    SELECT wear.reason
                    FROM warehouse_employee_archive_reasons wear
                    WHERE wear.warehouse_employee_id = we.warehouse_employee_id
                    ORDER BY wear.created_at DESC, wear.warehouse_employee_archive_reason_id DESC
                    LIMIT 1
                ) AS archive_reason
            FROM warehouse_employees we
            WHERE we.warehouse_employee_id = %s
              AND we.warehouse_profile_id = %s
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
        row["id"] = row.get("warehouse_employee_id")
        row["name"] = full_name or row.get("email") or "Employee"
        row["role"] = DISPLAY_ROLES.get(pos, row.get("position") or "Employee")
        row["phone"] = row.get("contact_number") or ""
        row["archive_reason"] = row.get("archive_reason") or ""

    return row

