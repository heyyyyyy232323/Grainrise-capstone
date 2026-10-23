import logging
from django.db import connection

logger = logging.getLogger(__name__)


def _rows_to_dicts(cursor):
    """Convert cursor results to a list of dicts."""
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    """Convert a single cursor result to a dict."""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def _resolve_photo_url(photo_path):
    """Resolve photo path to a standard media path."""
    if not photo_path:
        return None
    trimmed = str(photo_path).strip()
    if not trimmed:
        return None
    if (
        trimmed.startswith("http://")
        or trimmed.startswith("https://")
        or trimmed.startswith("//")
        or trimmed.startswith("data:")
    ):
        return trimmed

    clean_path = trimmed.lstrip("/")
    while clean_path.startswith("media/"):
        clean_path = clean_path[6:]
    return f"/media/{clean_path}"


def list_miller_branches(miller_user_id):
    """
    Retrieve all supplier_profiles owned by the authenticated Miller.

    Parameters:
    - miller_user_id: int (request.grainrise_miller_id)

    Returns:
    - list of dicts: [
        {
          "supplier_profile_id": int,
          "business_name": str,
          "organization_name": str,
          "province": str,
          "municipality": str,
          "barangay": str,
          "street_address": str
        }, ...
      ]
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
                sp.barangay,
                sp.street_address
            FROM supplier_profiles sp
            WHERE sp.user_id = %s
            ORDER BY sp.business_name ASC, sp.supplier_profile_id ASC
            """,
            [miller_user_id],
        )
        return _rows_to_dicts(cursor)


def is_plate_number_taken(plate_number, exclude_vehicle_id=None):
    """
    Check if plate number already exists in the system (unique constraint).

    Parameters:
    - plate_number: str
    - exclude_vehicle_id: int (optional, for edit checks)

    Returns:
    - bool: True if plate number exists, False otherwise
    """
    clean_plate = str(plate_number or "").strip()
    if not clean_plate:
        return False

    with connection.cursor() as cursor:
        if exclude_vehicle_id:
            cursor.execute(
                """
                SELECT 1
                FROM miller_delivery_vehicle_management
                WHERE LOWER(TRIM(plate_number)) = LOWER(TRIM(%s))
                  AND vehicle_id != %s
                LIMIT 1
                """,
                [clean_plate, exclude_vehicle_id],
            )
        else:
            cursor.execute(
                """
                SELECT 1
                FROM miller_delivery_vehicle_management
                WHERE LOWER(TRIM(plate_number)) = LOWER(TRIM(%s))
                LIMIT 1
                """,
                [clean_plate],
            )
        return cursor.fetchone() is not None


def validate_branches_belong_to_miller(miller_user_id, branch_ids):
    """
    Validate that every designated supplier_profile_id belongs to the authenticated Miller Owner.

    Parameters:
    - miller_user_id: int
    - branch_ids: list of int

    Returns:
    - list of valid int supplier_profile_ids

    Raises:
    - ValueError if invalid or unauthorized branch is found
    """
    if not branch_ids:
        raise ValueError("At least one designated branch is required.")

    # Deduplicate while preserving order
    unique_branch_ids = []
    for bid in branch_ids:
        try:
            bid_int = int(bid)
            if bid_int not in unique_branch_ids:
                unique_branch_ids.append(bid_int)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid branch ID format: {bid}")

    if not unique_branch_ids:
        raise ValueError("At least one designated branch is required.")

    placeholders = ", ".join(["%s"] * len(unique_branch_ids))
    params = [miller_user_id] + unique_branch_ids

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT supplier_profile_id
            FROM supplier_profiles
            WHERE user_id = %s
              AND supplier_profile_id IN ({placeholders})
            """,
            params,
        )
        owned_ids = {row[0] for row in cursor.fetchall()}

    for bid_int in unique_branch_ids:
        if bid_int not in owned_ids:
            raise ValueError(
                f"Unauthorized branch designation: Branch ID {bid_int} does not belong to your account."
            )

    return unique_branch_ids


def list_miller_vehicles(
    miller_user_id,
    search=None,
    sort_by="plate_asc",
    wheels_filter=None,
    type_filter=None,
):
    """
    List vehicles owned by the authenticated Miller user_id with search, sort, and filters.

    Filters:
    - search: matches plate_number, model, capacity, or branch name
    - sort_by: 'plate_asc' (Plate Number A-Z) or 'plate_desc' (Plate Number Z-A)
    - wheels_filter: integer number of wheels (or 'all')
    - type_filter: 'Truck', 'Car', 'Motor' (or 'all')

    Returns:
    - list of dicts with vehicle details, designated branch list and formatted branch names.
    """
    base_sql = """
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
            COALESCE(
                GROUP_CONCAT(
                    DISTINCT CONCAT(vb.supplier_profile_id, '::', COALESCE(sp.business_name, CONCAT('Branch #', vb.supplier_profile_id)))
                    ORDER BY sp.business_name ASC
                    SEPARATOR '||'
                ),
                ''
            ) AS branches_encoded
        FROM miller_delivery_vehicle_management v
        LEFT JOIN miller_delivery_vehicle_branches vb
            ON vb.vehicle_id = v.vehicle_id
        LEFT JOIN supplier_profiles sp
            ON vb.supplier_profile_id = sp.supplier_profile_id
        WHERE v.user_id = %s
    """
    params = [miller_user_id]

    # Type Filter
    if type_filter and str(type_filter).strip().lower() != "all":
        clean_type = str(type_filter).strip()
        base_sql += " AND LOWER(v.type) = LOWER(%s)"
        params.append(clean_type)

    # Wheels Filter
    if wheels_filter and str(wheels_filter).strip().lower() != "all":
        try:
            wheels_val = int(wheels_filter)
            base_sql += " AND v.number_of_wheels = %s"
            params.append(wheels_val)
        except (ValueError, TypeError):
            pass

    # Search Filter
    if search and str(search).strip():
        term = f"%{str(search).strip()}%"
        base_sql += """
            AND (
                v.plate_number LIKE %s
                OR v.model LIKE %s
                OR v.capacity LIKE %s
                OR sp.business_name LIKE %s
            )
        """
        params.extend([term, term, term, term])

    base_sql += " GROUP BY v.vehicle_id"

    # Sorting: Plate Number A-Z / Z-A
    if sort_by == "plate_desc":
        base_sql += " ORDER BY v.plate_number DESC, v.vehicle_id DESC"
    else:
        # Default: plate_asc
        base_sql += " ORDER BY v.plate_number ASC, v.vehicle_id ASC"

    with connection.cursor() as cursor:
        cursor.execute(base_sql, params)
        rows = _rows_to_dicts(cursor)

    vehicles = []
    for r in rows:
        encoded_branches = r.pop("branches_encoded", "") or ""
        branches = []
        if encoded_branches:
            for item in encoded_branches.split("||"):
                if "::" in item:
                    b_id_str, b_name = item.split("::", 1)
                    try:
                        branches.append(
                            {
                                "supplier_profile_id": int(b_id_str),
                                "business_name": b_name.strip(),
                            }
                        )
                    except ValueError:
                        continue

        branch_names = ", ".join(b["business_name"] for b in branches) if branches else "No branch designated"

        vehicles.append(
            {
                "id": r["vehicle_id"],
                "vehicle_id": r["vehicle_id"],
                "user_id": r["user_id"],
                "type": r["type"],
                "number_of_wheels": r["number_of_wheels"],
                "model": r["model"],
                "plate_number": r["plate_number"],
                "capacity": r["capacity"],
                "photo": r["photo"],
                "photo_url": _resolve_photo_url(r["photo"]),
                "status": r["status"],
                "branches": branches,
                "branch_ids": [b["supplier_profile_id"] for b in branches],
                "branch_names": branch_names,
                "branch": branch_names,  # Canonical key for Table view
            }
        )

    return vehicles


def get_miller_vehicle_detail(miller_user_id, vehicle_id):
    """
    Retrieve full details for a single vehicle owned by the authenticated Miller.

    Parameters:
    - miller_user_id: int
    - vehicle_id: int

    Returns:
    - dict or None
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
                v.status
            FROM miller_delivery_vehicle_management v
            WHERE v.vehicle_id = %s
              AND v.user_id = %s
            LIMIT 1
            """,
            [vehicle_id, miller_user_id],
        )
        vehicle = _row_to_dict(cursor)

    if not vehicle:
        return None

    # Retrieve all designated branches for this vehicle directly from miller_delivery_vehicle_branches
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
        branches = _rows_to_dicts(cursor)

    branch_names = ", ".join(b["business_name"] for b in branches) if branches else "No branch designated"

    vehicle["id"] = vehicle["vehicle_id"]
    vehicle["photo_url"] = _resolve_photo_url(vehicle.get("photo"))
    vehicle["branches"] = branches
    vehicle["branch_ids"] = [int(b["supplier_profile_id"]) for b in branches]
    vehicle["branch_names"] = branch_names
    vehicle["branch"] = branch_names

    return vehicle

