import datetime
from django.db import connection


def _rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _format_policy_record(row, branches_map):
    """
    Format raw row from miller_fare_fee_management into structured policy dict.
    """
    fare_fee_id = row["fare_fee_id"]
    updated_at = row["updated_at"] or row["created_at"]
    created_at = row["created_at"] or row["updated_at"]

    iso_date = ""
    last_updated_date = ""
    last_updated_time = ""

    if updated_at:
        if isinstance(updated_at, (datetime.datetime, datetime.date)):
            iso_date = updated_at.strftime("%Y-%m-%d")
            last_updated_date = updated_at.strftime("%b %d, %Y")
            if isinstance(updated_at, datetime.datetime):
                last_updated_time = f"{updated_at.strftime('%I:%M %p')} PHT"
        else:
            iso_date = str(updated_at).split("T")[0]
            last_updated_date = str(updated_at)

    effective_branches = branches_map.get(fare_fee_id, [])
    effective_branch_ids = [b["supplier_profile_id"] for b in effective_branches]

    raw_status = (row["status"] or "active").lower()
    status_label = "Archived" if raw_status == "archived" else "Active"

    free_dist_val = float(row["free_delivery_distance"]) if row["free_delivery_distance"] is not None else 0.0
    base_fee_val = float(row["base_fee"]) if row["base_fee"] is not None else 0.0
    add_fee_val = float(row["additional_fee_per_kilometers"]) if row["additional_fee_per_kilometers"] is not None else 0.0

    return {
        "fare_fee_id": fare_fee_id,
        "set_by": row["set_by"],
        "rate_name": row["rate_name"] or "",
        "description": row["description"] or "",
        "free_delivery_distance": free_dist_val,
        "base_fee": base_fee_val,
        "additional_fee_per_kilometers": add_fee_val,
        "status": status_label,
        "raw_status": raw_status,
        "archive_reason": row["archive_reason"] or "",
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
        "updated_at": updated_at.isoformat() if hasattr(updated_at, "isoformat") else str(updated_at),
        "iso_date": iso_date,
        "last_updated_date": last_updated_date,
        "last_updated_time": last_updated_time,
        "effective_branches": effective_branches,
        "effective_branch_ids": effective_branch_ids,
    }


def list_manager_fare_policies(miller_user_id):
    """
    Retrieve all fare fee policies created by / belonging to the authenticated Miller Manager.
    Includes associated effective branches for each policy.
    """
    if not miller_user_id:
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                f.fare_fee_id,
                f.set_by,
                f.rate_name,
                f.description,
                f.free_delivery_distance,
                f.base_fee,
                f.additional_fee_per_kilometers,
                f.status,
                f.archive_reason,
                f.created_at,
                f.updated_at
            FROM miller_fare_fee_management f
            WHERE f.set_by = %s
            ORDER BY f.created_at DESC, f.fare_fee_id DESC
            """,
            [miller_user_id],
        )
        policies = _rows_to_dicts(cursor)

        if not policies:
            return []

        fare_fee_ids = [p["fare_fee_id"] for p in policies]
        format_strings = ",".join(["%s"] * len(fare_fee_ids))

        cursor.execute(
            f"""
            SELECT
                eb.fare_fee_id,
                eb.supplier_profile_id,
                sp.business_name,
                sp.organization_name
            FROM miller_fare_fee_management_effective_branches eb
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = eb.supplier_profile_id
            WHERE eb.fare_fee_id IN ({format_strings})
            ORDER BY sp.business_name ASC
            """,
            fare_fee_ids,
        )
        branch_rows = cursor.fetchall()

    branches_map = {}
    for fee_id, sp_id, biz_name, org_name in branch_rows:
        if fee_id not in branches_map:
            branches_map[fee_id] = []
        branches_map[fee_id].append({
            "supplier_profile_id": sp_id,
            "business_name": biz_name or org_name or f"Branch #{sp_id}",
            "organization_name": org_name or "",
        })

    return [_format_policy_record(p, branches_map) for p in policies]


def get_manager_fare_policy(miller_user_id, fare_fee_id):
    """
    Retrieve a single fare fee policy if owned by the authenticated Miller Manager.
    Returns dict or None.
    """
    if not miller_user_id or not fare_fee_id:
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                f.fare_fee_id,
                f.set_by,
                f.rate_name,
                f.description,
                f.free_delivery_distance,
                f.base_fee,
                f.additional_fee_per_kilometers,
                f.status,
                f.archive_reason,
                f.created_at,
                f.updated_at
            FROM miller_fare_fee_management f
            WHERE f.fare_fee_id = %s
              AND f.set_by = %s
            LIMIT 1
            """,
            [fare_fee_id, miller_user_id],
        )
        row_list = _rows_to_dicts(cursor)
        if not row_list:
            return None

        policy = row_list[0]

        cursor.execute(
            """
            SELECT
                eb.supplier_profile_id,
                sp.business_name,
                sp.organization_name
            FROM miller_fare_fee_management_effective_branches eb
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = eb.supplier_profile_id
            WHERE eb.fare_fee_id = %s
            ORDER BY sp.business_name ASC
            """,
            [fare_fee_id],
        )
        branch_rows = cursor.fetchall()

    branches = [
        {
            "supplier_profile_id": sp_id,
            "business_name": biz_name or org_name or f"Branch #{sp_id}",
            "organization_name": org_name or "",
        }
        for sp_id, biz_name, org_name in branch_rows
    ]

    branches_map = {policy["fare_fee_id"]: branches}
    return _format_policy_record(policy, branches_map)


def get_manager_branches(miller_user_id):
    """
    Retrieve all branches (supplier_profiles) owned by the Miller Manager.
    """
    if not miller_user_id:
        return []

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
                sp.street_address
            FROM supplier_profiles sp
            WHERE sp.user_id = %s
            ORDER BY sp.created_at ASC, sp.supplier_profile_id ASC
            """,
            [miller_user_id],
        )
        return _rows_to_dicts(cursor)

