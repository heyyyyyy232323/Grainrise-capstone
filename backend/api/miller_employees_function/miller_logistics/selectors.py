from django.db import connection


def _resolve_photo_url(photo_path):
    """
    Format photo path into a standardized URL or absolute media path.
    """
    if not photo_path:
        return None

    trimmed = str(photo_path).strip()
    if (
        trimmed.startswith("http://")
        or trimmed.startswith("https://")
        or trimmed.startswith("//")
        or trimmed.startswith("data:")
        or trimmed.startswith("blob:")
    ):
        return trimmed

    clean_path = trimmed.lstrip("/")
    while clean_path.startswith("media/"):
        clean_path = clean_path[6:]
    return f"/media/{clean_path}"


def _format_driver_name(first_name, middle_initial, last_name, suffix):
    """
    Format employee full name cleanly.
    """
    parts = []
    if first_name:
        parts.append(str(first_name).strip())
    if middle_initial:
        mi = str(middle_initial).strip().rstrip(".")
        if mi:
            parts.append(f"{mi}.")
    if last_name:
        parts.append(str(last_name).strip())
    if suffix:
        parts.append(str(suffix).strip())
    return " ".join(parts) if parts else ""


def list_flc_vehicles(
    supplier_profile_id,
    miller_user_id,
    search=None,
    status_filter=None,
    sort_by=None,
):
    """
    List delivery vehicles scoped to the authenticated FLC employee's branch.

    Validations & Scoping:
    - Joins miller_delivery_vehicle_branches to restrict strictly to supplier_profile_id.
    - Validates owner miller_user_id on miller_delivery_vehicle_management.
    - Resolves active assignee from miller_vehicle_assignee where status = 'active'.
    - Validates driver from supplier_employees.
    - Supports search, status filtering, and sorting (with vehicle_id as proxy for insertion order).
    """
    sql = """
        SELECT
            v.vehicle_id,
            v.user_id,
            v.type,
            v.number_of_wheels,
            v.model,
            v.plate_number,
            v.capacity,
            v.photo,
            v.status,
            v.inactive_reason,
            v.maintenance_reason,
            v.updated_at,
            mva.assigned_id,
            mva.supplier_profile_id AS assignee_branch_id,
            mva.driver_id,
            se.first_name AS driver_first_name,
            se.middle_initial AS driver_middle_initial,
            se.last_name AS driver_last_name,
            se.suffix AS driver_suffix,
            se.email AS driver_email,
            se.contact_number AS driver_contact_number,
            sp_assign.business_name AS assignee_branch_name
        FROM miller_delivery_vehicle_management v
        INNER JOIN miller_delivery_vehicle_branches vb
            ON vb.vehicle_id = v.vehicle_id AND vb.supplier_profile_id = %s
        LEFT JOIN miller_vehicle_assignee mva
            ON mva.vehicle_id = v.vehicle_id AND mva.status = 'active'
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = mva.driver_id
        LEFT JOIN supplier_profiles sp_assign
            ON sp_assign.supplier_profile_id = mva.supplier_profile_id
        WHERE v.user_id = %s
    """
    params = [supplier_profile_id, miller_user_id]

    # Status Filter
    if status_filter and str(status_filter).strip().lower() != "all":
        clean_status = str(status_filter).strip().lower()
        if clean_status in ("for maintenance", "maintenance"):
            sql += " AND LOWER(v.status) = 'for maintenance'"
        elif clean_status in ("active", "inactive"):
            sql += " AND LOWER(v.status) = %s"
            params.append(clean_status)

    # Search Filter
    if search and str(search).strip():
        term = f"%{str(search).strip()}%"
        sql += """
            AND (
                v.plate_number LIKE %s
                OR v.model LIKE %s
                OR v.capacity LIKE %s
                OR CONCAT_WS(' ', se.first_name, se.last_name) LIKE %s
            )
        """
        params.extend([term, term, term, term])

    # Sorting: Model A-Z/Z-A, Plate A-Z/Z-A, Newest/Oldest (vehicle_id as insertion-order proxy)
    sort_key = str(sort_by or "").strip().lower()
    if sort_key == "model_asc":
        sql += " ORDER BY v.model ASC, v.vehicle_id DESC"
    elif sort_key == "model_desc":
        sql += " ORDER BY v.model DESC, v.vehicle_id DESC"
    elif sort_key == "plate_asc":
        sql += " ORDER BY v.plate_number ASC, v.vehicle_id DESC"
    elif sort_key == "plate_desc":
        sql += " ORDER BY v.plate_number DESC, v.vehicle_id DESC"
    elif sort_key == "oldest":
        sql += " ORDER BY v.vehicle_id ASC"
    elif sort_key == "newest":
        sql += " ORDER BY v.vehicle_id DESC"
    else:
        # Default newest first
        sql += " ORDER BY v.vehicle_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    vehicles = []
    for r in rows:
        driver_name = _format_driver_name(r[15], r[16], r[17], r[18])
        assignee_branch_id = r[13]
        is_other_branch = bool(
            assignee_branch_id and int(assignee_branch_id) != int(supplier_profile_id)
        )

        vehicles.append(
            {
                "vehicle_id": r[0],
                "id": r[0],
                "user_id": r[1],
                "type": r[2],
                "number_of_wheels": r[3],
                "model": r[4],
                "plate_number": r[5],
                "capacity": r[6],
                "photo": r[7],
                "photo_url": _resolve_photo_url(r[7]),
                "status": r[8],
                "inactive_reason": r[9],
                "maintenance_reason": r[10],
                "updated_at": r[11].isoformat() if r[11] else None,
                "assigned_id": r[12],
                "assignee_branch_id": assignee_branch_id,
                "assignee_branch_name": r[21],
                "is_assigned_to_other_branch": is_other_branch,
                "assigned_driver_id": r[14],
                "assigned_driver": driver_name if driver_name else "N/A",
                "assigned_driver_name": driver_name if driver_name else "N/A",
                "driver_name": driver_name if driver_name else "N/A",
                "driver_email": r[19],
                "driver_contact": r[20],
            }
        )

    return vehicles


def get_flc_vehicle_detail(vehicle_id, supplier_profile_id, miller_user_id):
    """
    Retrieve single vehicle detail scoped to the authenticated FLC employee's branch.

    Validates that:
    - Vehicle is owned by miller_user_id
    - Vehicle is designated to this branch (supplier_profile_id) via miller_delivery_vehicle_branches.
    - Resolves active assignee from miller_vehicle_assignee.
    - Resolves all designated branches for this vehicle (matching Miller Manager view).
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                v.vehicle_id,
                v.user_id,
                v.type,
                v.number_of_wheels,
                v.model,
                v.plate_number,
                v.capacity,
                v.photo,
                v.status,
                v.inactive_reason,
                v.maintenance_reason,
                v.updated_at
            FROM miller_delivery_vehicle_management v
            INNER JOIN miller_delivery_vehicle_branches vb
                ON vb.vehicle_id = v.vehicle_id AND vb.supplier_profile_id = %s
            WHERE v.vehicle_id = %s
              AND v.user_id = %s
            LIMIT 1
            """,
            [supplier_profile_id, vehicle_id, miller_user_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    # Retrieve all designated branches for this vehicle
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT
                vb.supplier_profile_id,
                COALESCE(sp.business_name, CONCAT('Branch #', vb.supplier_profile_id)) AS business_name,
                sp.organization_name,
                sp.province,
                sp.municipality,
                sp.barangay,
                sp.street_address
            FROM miller_delivery_vehicle_branches vb
            LEFT JOIN supplier_profiles sp
                ON vb.supplier_profile_id = sp.supplier_profile_id
            WHERE vb.vehicle_id = %s
            ORDER BY sp.business_name ASC, vb.supplier_profile_id ASC
            """,
            [vehicle_id],
        )
        branches_raw = cursor.fetchall()

    branches = [
        {
            "supplier_profile_id": b[0],
            "business_name": b[1],
            "organization_name": b[2],
            "province": b[3],
            "municipality": b[4],
            "barangay": b[5],
            "street_address": b[6],
        }
        for b in branches_raw
    ]
    branch_names = (
        ", ".join(b["business_name"] for b in branches)
        if branches
        else "No branch designated"
    )

    # Retrieve current active assignment
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mva.assigned_id,
                mva.supplier_profile_id,
                mva.driver_id,
                mva.status,
                mva.created_at,
                mva.updated_at,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.email,
                se.contact_number,
                sp.business_name AS assignee_branch_name
            FROM miller_vehicle_assignee mva
            LEFT JOIN supplier_employees se
                ON se.supplier_employee_id = mva.driver_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = mva.supplier_profile_id
            WHERE mva.vehicle_id = %s
              AND mva.status = 'active'
            LIMIT 1
            """,
            [vehicle_id],
        )
        assign_row = cursor.fetchone()

    assigned_driver = None
    assigned_driver_name = "N/A"
    is_other_branch = False
    other_branch_name = None

    if assign_row:
        driver_name = _format_driver_name(
            assign_row[6], assign_row[7], assign_row[8], assign_row[9]
        )
        assigned_branch_id = assign_row[1]
        is_other_branch = bool(
            assigned_branch_id and int(assigned_branch_id) != int(supplier_profile_id)
        )
        other_branch_name = assign_row[12] if is_other_branch else None

        assigned_driver = {
            "assigned_id": assign_row[0],
            "supplier_profile_id": assigned_branch_id,
            "driver_id": assign_row[2],
            "driver_name": driver_name,
            "name": driver_name,
            "first_name": assign_row[6],
            "last_name": assign_row[8],
            "email": assign_row[10],
            "contact_number": assign_row[11],
            "created_at": assign_row[4].isoformat() if assign_row[4] else None,
            "is_other_branch": is_other_branch,
            "other_branch_name": other_branch_name,
        }
        assigned_driver_name = driver_name if driver_name else "N/A"

    return {
        "vehicle_id": row[0],
        "id": row[0],
        "user_id": row[1],
        "type": row[2],
        "number_of_wheels": row[3],
        "model": row[4],
        "plate_number": row[5],
        "capacity": row[6],
        "photo": row[7],
        "photo_url": _resolve_photo_url(row[7]),
        "status": row[8],
        "inactive_reason": row[9],
        "maintenance_reason": row[10],
        "updated_at": row[11].isoformat() if row[11] else None,
        "branches": branches,
        "branch_ids": [int(b["supplier_profile_id"]) for b in branches],
        "branch_names": branch_names,
        "assigned_driver": assigned_driver,
        "assigned_driver_name": assigned_driver_name,
        "is_assigned_to_other_branch": is_other_branch,
        "other_branch_name": other_branch_name,
    }


def list_flc_active_drivers(supplier_profile_id):
    """
    Retrieve all active drivers for the FLC employee's branch.

    Validates:
    - SAME branch: supplier_employees.supplier_profile_id == supplier_profile_id
    - position == 'driver'
    - status == 'active'

    Also returns each driver's currently assigned vehicle (if any) to aid UI assignment.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.email,
                se.contact_number,
                se.status,
                mva.vehicle_id AS current_assigned_vehicle_id,
                v.plate_number AS current_assigned_plate_number,
                v.model AS current_assigned_vehicle_model
            FROM supplier_employees se
            LEFT JOIN miller_vehicle_assignee mva
                ON mva.driver_id = se.supplier_employee_id AND mva.status = 'active'
            LEFT JOIN miller_delivery_vehicle_management v
                ON v.vehicle_id = mva.vehicle_id
            WHERE se.supplier_profile_id = %s
              AND LOWER(se.position) = 'driver'
              AND LOWER(se.status) = 'active'
            ORDER BY se.first_name ASC, se.last_name ASC
            """,
            [supplier_profile_id],
        )
        rows = cursor.fetchall()

    drivers = []
    for r in rows:
        name = _format_driver_name(r[1], r[2], r[3], r[4])
        drivers.append(
            {
                "supplier_employee_id": r[0],
                "driver_id": r[0],
                "id": r[0],
                "first_name": r[1],
                "middle_initial": r[2],
                "last_name": r[3],
                "suffix": r[4],
                "name": name,
                "full_name": name,
                "email": r[5],
                "contact_number": r[6],
                "status": r[7],
                "current_assigned_vehicle_id": r[8],
                "current_assigned_plate_number": r[9],
                "current_assigned_vehicle_model": r[10],
            }
        )

    return drivers

