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


def _parse_capacity_kg(capacity_val):
    """
    Safely extract numeric kg capacity from varchar like '1,000 kg' or Decimal/float.
    """
    if capacity_val is None:
        return 0.0
    val_str = str(capacity_val).lower().replace(",", "").replace("kg", "").strip()
    try:
        return float(val_str)
    except (ValueError, TypeError):
        return 0.0


def list_flc_delivery_orders(
    supplier_profile_id,
    search=None,
    buyer_type=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve orders scoped to authenticated branch with status = 'Forwarded to Logistics'.
    """
    params = [supplier_profile_id]
    where_clauses = [
        "moc.supplier_profile_id = %s",
        "moc.status = 'Forwarded to Logistics'",
    ]

    if buyer_type and buyer_type != "all":
        if buyer_type == "retailer":
            where_clauses.append("moc.user_buyer_id IS NOT NULL")
        elif buyer_type == "warehouse":
            where_clauses.append("moc.warehouse_buyer_id IS NOT NULL")

    if start_date:
        where_clauses.append("moc.expected_arrival_date >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("moc.expected_arrival_date <= %s")
        params.append(end_date)

    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                moc.batch_no LIKE %s
                OR mp.product_name LIKE %s
                OR mp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR wp.business_name LIKE %s
            )"""
        )
        params.extend([search_like] * 6)

    where_sql = " AND ".join(where_clauses)

    order_by_sql = "ORDER BY moc.expected_arrival_date ASC, moc.online_order_id ASC"
    if sort_by == "qty-desc":
        order_by_sql = "ORDER BY moc.ordered_quantity DESC, moc.online_order_id DESC"
    elif sort_by == "qty-asc":
        order_by_sql = "ORDER BY moc.ordered_quantity ASC, moc.online_order_id ASC"
    elif sort_by == "amount-desc":
        order_by_sql = "ORDER BY moc.total_price DESC, moc.online_order_id DESC"
    elif sort_by == "amount-asc":
        order_by_sql = "ORDER BY moc.total_price ASC, moc.online_order_id ASC"
    elif sort_by == "batch-asc":
        order_by_sql = "ORDER BY moc.batch_no ASC, moc.online_order_id ASC"
    elif sort_by == "batch-desc":
        order_by_sql = "ORDER BY moc.batch_no DESC, moc.online_order_id DESC"
    elif sort_by == "date-desc":
        order_by_sql = "ORDER BY moc.expected_arrival_date DESC, moc.online_order_id DESC"
    elif sort_by == "date-asc":
        order_by_sql = "ORDER BY moc.expected_arrival_date ASC, moc.online_order_id ASC"

    sql = f"""
        SELECT
            moc.online_order_id,
            moc.batch_no,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.expected_arrival_date,
            moc.status,
            moc.created_at,
            moc.user_buyer_id,
            moc.warehouse_buyer_id,
            -- Product
            mp.product_id,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            -- Retailer
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            u.contact_number AS retailer_contact,
            u.email AS retailer_email,
            u.province AS retailer_province,
            u.municipality AS retailer_municipality,
            u.barangay AS retailer_barangay,
            u.street_address AS retailer_street,
            -- Warehouse
            wp.business_name AS wh_name,
            wp.organization_name AS wh_org,
            wp.official_contact_number AS wh_contact,
            wp.official_email AS wh_email,
            wp.province AS wh_province,
            wp.municipality AS wh_municipality,
            wp.barangay AS wh_barangay,
            wp.street_address AS wh_street,
            -- Payment
            mop.payment_method,
            mop.status AS payment_status,
            mop.payment_reference,
            -- Approved Return Replacement (if this is an approved return replacement order)
            mor_app.return_id AS approved_return_id,
            mor_app.quantity AS approved_return_quantity
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN users u
            ON u.user_id = moc.user_buyer_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = moc.warehouse_buyer_id
        LEFT JOIN miller_online_orders_payment mop
            ON mop.online_order_id = moc.online_order_id
        LEFT JOIN (
            SELECT online_order_id, MAX(return_id) AS return_id, SUM(quantity) AS quantity
            FROM miller_online_orders_returns
            WHERE status = 'Approved'
            GROUP BY online_order_id
        ) mor_app ON mor_app.online_order_id = moc.online_order_id
        WHERE {where_sql}
        {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    orders = []
    for r in rows:
        is_warehouse = r[9] is not None
        buyer_type_str = "Warehouse" if is_warehouse else "Retailer"

        if is_warehouse:
            buyer_name = r[24] or r[25] or f"Warehouse #{r[9]}"
            contact = r[26] or "—"
            email = r[27] or "—"
            addr_parts = [r[31], r[30], r[29], r[28]]
        else:
            buyer_name = _format_driver_name(r[14], r[15], r[16], r[17]) or f"Retailer #{r[8]}"
            contact = r[18] or "—"
            email = r[19] or "—"
            addr_parts = [r[23], r[22], r[21], r[20]]

        clean_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()])
        if not clean_addr:
            clean_addr = "Address not specified"

        original_qty = float(r[2]) if r[2] is not None else 0.0
        has_approved_return = r[35] is not None
        # Per specification: Replacement quantity displayed and assigned = approved return quantity itself
        effective_qty = float(r[36]) if (has_approved_return and r[36] is not None) else original_qty

        fare = float(r[3]) if r[3] is not None else 0.0
        total = float(r[4]) if r[4] is not None else 0.0
        unit_cost = float(r[13]) if r[13] is not None else 0.0

        orders.append(
            {
                "online_order_id": r[0],
                "id": r[0],
                "batch_no": r[1],
                "batch": r[1],
                "ordered_quantity": effective_qty,
                "original_ordered_quantity": original_qty,
                "is_replacement": has_approved_return,
                "approved_return_id": r[35],
                "ordered_quantity_formatted": f"{effective_qty:,.0f} kg" if effective_qty.is_integer() else f"{effective_qty:,.2f} kg",
                "fare_fee": fare,
                "fare_fee_formatted": f"₱{fare:,.2f}",
                "total_price": total,
                "total_price_formatted": f"₱{total:,.2f}",
                "expected_arrival_date": r[5].isoformat() if r[5] else None,
                "expected_arrival_date_formatted": r[5].strftime("%b %d, %Y") if r[5] else "—",
                "status": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
                "buyer_type": buyer_type_str,
                "buyer_name": buyer_name,
                "retailer": buyer_name,
                "contact_number": contact,
                "email": email,
                "delivery_address": clean_addr,
                "product_id": r[10],
                "product_name": r[11] or "Rice Variant",
                "variant": r[11] or "Rice Variant",
                "product_code": r[12] or "—",
                "unit_cost": unit_cost,
                "unit_cost_formatted": f"₱{unit_cost:,.2f}",
                "payment_method": r[32] or "N/A",
                "payment_status": r[33] or "N/A",
                "payment_reference": r[34] or "—",
            }
        )

    return orders


def list_flc_drivers_with_capacity(supplier_profile_id):
    """
    List active drivers for the branch with live capacity calculation:
    - active driver in supplier_employees (position='driver', status='active')
    - active vehicle assignment in miller_vehicle_assignee (status='active')
    - vehicle status and max capacity in miller_delivery_vehicle_management
    - total pending load = sum of effective delivery quantities from currently assigned, unfinished deliveries
    - excludes completed, cancelled, or received orders
    - prevents duplicate quantity counting
    - remaining capacity = vehicle capacity - total pending load
    """
    sql = """
        SELECT
            se.supplier_employee_id,
            se.first_name,
            se.middle_initial,
            se.last_name,
            se.suffix,
            se.contact_number,
            se.status AS driver_status,
            -- Vehicle assignee
            mva.assigned_id,
            -- Vehicle details
            v.vehicle_id,
            v.plate_number,
            v.model,
            v.type AS vehicle_type,
            v.capacity AS vehicle_capacity_str,
            v.status AS vehicle_status,
            -- Pending load calculation (using replacement return quantity if approved return replacement)
            COALESCE(
                (
                    SELECT SUM(
                        COALESCE(
                            (
                                SELECT SUM(mor.quantity)
                                FROM miller_online_orders_returns mor
                                WHERE mor.online_order_id = mda_sub.online_order_id
                                  AND mor.status = 'Approved'
                            ),
                            moc.ordered_quantity
                        )
                    )
                    FROM (
                        SELECT
                            online_order_id,
                            delivery_vehicle_id,
                            supplier_profile_id
                        FROM miller_driver_assignment
                        WHERE status = 'Pending'
                          AND delivery_vehicle_id = v.vehicle_id
                          AND supplier_profile_id = %s
                        GROUP BY online_order_id, delivery_vehicle_id, supplier_profile_id
                    ) mda_sub
                    INNER JOIN miller_online_customer moc
                        ON moc.online_order_id = mda_sub.online_order_id
                    WHERE moc.status NOT IN ('Delivered', 'Cancelled', 'Declined')
                      AND moc.status = 'Assigned to driver'
                      AND mda_sub.online_order_id NOT IN (
                          SELECT rh.online_order_id
                          FROM miller_online_customer_receiving_history rh
                          WHERE rh.supplier_profile_id = %s
                      )
                ),
                0.0
            ) AS pending_load
        FROM supplier_employees se
        LEFT JOIN (
            SELECT mva1.*
            FROM miller_vehicle_assignee mva1
            INNER JOIN (
                SELECT driver_id, MAX(assigned_id) AS max_assigned_id
                FROM miller_vehicle_assignee
                WHERE status = 'active'
                  AND supplier_profile_id = %s
                GROUP BY driver_id
            ) mva2 ON mva1.assigned_id = mva2.max_assigned_id
        ) mva ON mva.driver_id = se.supplier_employee_id
        LEFT JOIN miller_delivery_vehicle_management v
            ON v.vehicle_id = mva.vehicle_id
        WHERE se.supplier_profile_id = %s
          AND LOWER(se.position) = 'driver'
          AND LOWER(se.status) = 'active'
        ORDER BY se.first_name ASC, se.last_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, supplier_profile_id, supplier_profile_id, supplier_profile_id])
        rows = cursor.fetchall()

    drivers = []
    for r in rows:
        driver_name = _format_driver_name(r[1], r[2], r[3], r[4])
        has_vehicle = r[8] is not None
        vehicle_id = r[8]
        plate_number = r[9]
        model = r[10]
        vehicle_status = r[13]
        max_cap = _parse_capacity_kg(r[12]) if has_vehicle else 0.0
        pending_load = float(r[14]) if r[14] is not None else 0.0
        remaining_cap = max(0.0, max_cap - pending_load)

        if not has_vehicle:
            status_label = "No Vehicle"
        elif vehicle_status and vehicle_status.lower() != "active":
            status_label = vehicle_status.capitalize()
        elif remaining_cap <= 0:
            status_label = "Full"
        elif pending_load > (max_cap * 0.75):
            status_label = "Limited Capacity"
        else:
            status_label = "Available"

        pct_used = min(100, round((pending_load / max_cap) * 100)) if max_cap > 0 else 0

        drivers.append(
            {
                "driver_id": r[0],
                "id": r[0],
                "name": driver_name,
                "first_name": r[1],
                "last_name": r[3],
                "contact_number": r[5],
                "has_vehicle": has_vehicle,
                "vehicle_id": vehicle_id,
                "plate_number": plate_number,
                "vehicle_model": model,
                "vehicle_status": vehicle_status,
                "capacity": pending_load,
                "current_load": pending_load,
                "max": max_cap,
                "max_capacity": max_cap,
                "remaining_capacity": remaining_cap,
                "pct_used": pct_used,
                "status": status_label,
            }
        )

    return drivers


def get_flc_driver_deliveries(supplier_profile_id, driver_id):
    """
    Retrieve live capacity details and currently assigned, unfinished deliveries for a specific driver.
    Filters:
    - Scoped strictly to authenticated supplier_profile_id
    - Excludes completed, cancelled, or received orders
    - Uses approved replacement return quantity for approved product returns
    - Prevents duplicate delivery counting
    """
    drivers = list_flc_drivers_with_capacity(supplier_profile_id)
    driver_info = next((d for d in drivers if int(d["driver_id"]) == int(driver_id)), None)
    if not driver_info:
        return None

    deliveries_sql = """
        SELECT
            mda_sub.assignment_id,
            mda_sub.online_order_id,
            moc.batch_no,
            COALESCE(mp.product_name, 'Rice Variant') AS product_name,
            moc.ordered_quantity,
            COALESCE(
                (
                    SELECT SUM(mor.quantity)
                    FROM miller_online_orders_returns mor
                    WHERE mor.online_order_id = mda_sub.online_order_id
                      AND mor.status = 'Approved'
                ),
                moc.ordered_quantity
            ) AS effective_quantity,
            (
                SELECT COUNT(*)
                FROM miller_online_orders_returns mor
                WHERE mor.online_order_id = mda_sub.online_order_id
                  AND mor.status = 'Approved'
            ) AS approved_returns_count,
            moc.user_buyer_id,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            moc.warehouse_buyer_id,
            wp.business_name,
            wp.organization_name,
            moc.status AS order_status,
            mda_sub.status AS assignment_status,
            mda_sub.created_at AS assigned_at
        FROM (
            SELECT
                MAX(assignment_id) AS assignment_id,
                online_order_id,
                delivery_vehicle_id,
                supplier_profile_id,
                MAX(status) AS status,
                MAX(created_at) AS created_at
            FROM miller_driver_assignment
            WHERE status = 'Pending'
              AND supplier_profile_id = %s
            GROUP BY online_order_id, delivery_vehicle_id, supplier_profile_id
        ) mda_sub
        INNER JOIN miller_vehicle_assignee mva
            ON mva.vehicle_id = mda_sub.delivery_vehicle_id
            AND mva.driver_id = %s
            AND mva.supplier_profile_id = %s
            AND mva.status = 'active'
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = mda_sub.online_order_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN users u
            ON u.user_id = moc.user_buyer_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = moc.warehouse_buyer_id
        WHERE moc.status NOT IN ('Delivered', 'Cancelled', 'Declined')
          AND moc.status = 'Assigned to driver'
          AND mda_sub.online_order_id NOT IN (
              SELECT rh.online_order_id
              FROM miller_online_customer_receiving_history rh
              WHERE rh.supplier_profile_id = %s
          )
        ORDER BY mda_sub.created_at DESC, mda_sub.assignment_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(
            deliveries_sql,
            [supplier_profile_id, driver_id, supplier_profile_id, supplier_profile_id],
        )
        rows = cursor.fetchall()

    deliveries = []
    for r in rows:
        assignment_id = r[0]
        online_order_id = r[1]
        batch_no = r[2] or f"Order #{online_order_id}"
        product_name = r[3]
        original_qty = float(r[4]) if r[4] is not None else 0.0
        effective_qty = float(r[5]) if r[5] is not None else original_qty
        is_replacement = bool(r[6] and r[6] > 0)

        is_warehouse = r[12] is not None
        buyer_type = "Warehouse" if is_warehouse else "Retailer"
        if is_warehouse:
            buyer_name = r[13] or r[14] or f"Warehouse #{r[12]}"
        else:
            buyer_name = _format_driver_name(r[8], r[9], r[10], r[11]) or f"Retailer #{r[7]}"

        deliveries.append(
            {
                "assignment_id": assignment_id,
                "online_order_id": online_order_id,
                "batch_no": batch_no,
                "product_name": product_name,
                "ordered_quantity": original_qty,
                "quantity": effective_qty,
                "quantity_formatted": f"{effective_qty:,.0f} kg" if effective_qty.is_integer() else f"{effective_qty:,.2f} kg",
                "is_replacement": is_replacement,
                "buyer": buyer_name,
                "buyer_name": buyer_name,
                "buyer_type": buyer_type,
                "order_status": r[15],
                "assignment_status": r[16],
                "assigned_at": r[17].isoformat() if r[17] else None,
            }
        )

    return {
        "driver": driver_info,
        "deliveries": deliveries,
        "total": len(deliveries),
    }


def list_flc_product_returns(
    supplier_profile_id,
    search=None,
    variant_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve product return requests scoped to the authenticated branch.
    Only returns with status = 'Pending' are displayed per specification.
    """
    params = [supplier_profile_id]
    where_clauses = [
        "mor.supplier_profile_id = %s",
        "mor.status = 'Pending'",
    ]

    if variant_filter and variant_filter != "all":
        where_clauses.append("LOWER(TRIM(mp.product_name)) = LOWER(TRIM(%s))")
        params.append(variant_filter)

    if start_date:
        where_clauses.append("DATE(mor.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(mor.created_at) <= %s")
        params.append(end_date)

    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                mor.return_reference_no LIKE %s
                OR mor.receiving_reference_no LIKE %s
                OR moc.batch_no LIKE %s
                OR mp.product_name LIKE %s
                OR mp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR wp.business_name LIKE %s
            )"""
        )
        params.extend([search_like] * 8)

    where_sql = " AND ".join(where_clauses)

    order_by_sql = "ORDER BY mor.created_at DESC, mor.return_id DESC"
    if sort_by == "variant-asc":
        order_by_sql = "ORDER BY mp.product_name ASC, mor.return_id DESC"
    elif sort_by == "variant-desc":
        order_by_sql = "ORDER BY mp.product_name DESC, mor.return_id DESC"
    elif sort_by == "batch-asc":
        order_by_sql = "ORDER BY moc.batch_no ASC, mor.return_id DESC"
    elif sort_by == "batch-desc":
        order_by_sql = "ORDER BY moc.batch_no DESC, mor.return_id DESC"
    elif sort_by == "qty-desc":
        order_by_sql = "ORDER BY mor.quantity DESC, mor.return_id DESC"
    elif sort_by == "qty-asc":
        order_by_sql = "ORDER BY mor.quantity ASC, mor.return_id DESC"
    elif sort_by == "cost-desc":
        order_by_sql = "ORDER BY (mor.quantity * COALESCE(mp.unit_cost, 0.0)) DESC, mor.return_id DESC"
    elif sort_by == "cost-asc":
        order_by_sql = "ORDER BY (mor.quantity * COALESCE(mp.unit_cost, 0.0)) ASC, mor.return_id DESC"

    sql = f"""
        SELECT
            mor.return_id,
            mor.return_reference_no,
            mor.receiving_reference_no,
            mor.quantity AS return_quantity,
            mor.reason AS return_reason,
            mor.proof AS return_proof,
            mor.status AS return_status,
            mor.created_at AS return_created_at,
            -- Original Online Order
            moc.online_order_id,
            moc.batch_no,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.expected_arrival_date,
            moc.status AS order_status,
            -- Product
            mp.product_id,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            mp.stock_quantity AS product_stock,
            -- Buyer info (Retailer or Warehouse)
            mor.retailer_buyer_id,
            mor.warehouse_buyer_id,
            u.first_name AS ret_first,
            u.middle_initial AS ret_mi,
            u.last_name AS ret_last,
            u.suffix AS ret_suffix,
            u.contact_number AS ret_contact,
            u.email AS ret_email,
            u.province AS ret_prov,
            u.municipality AS ret_muni,
            u.barangay AS ret_brgy,
            u.street_address AS ret_street,
            wp.business_name AS wh_name,
            wp.organization_name AS wh_org,
            wp.official_contact_number AS wh_contact,
            wp.official_email AS wh_email,
            wp.province AS wh_prov,
            wp.municipality AS wh_muni,
            wp.barangay AS wh_brgy,
            wp.street_address AS wh_street,
            -- Delivered By Driver
            mor.delivered_by,
            se.first_name AS driver_first,
            se.middle_initial AS driver_mi,
            se.last_name AS driver_last,
            se.suffix AS driver_suffix,
            se.contact_number AS driver_contact,
            v.plate_number AS driver_plate_number,
            v.model AS driver_vehicle_model,
            -- Payment
            mop.payment_method,
            mop.status AS payment_status,
            mop.payment_reference
        FROM miller_online_orders_returns mor
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = mor.online_order_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN users u
            ON u.user_id = mor.retailer_buyer_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = mor.warehouse_buyer_id
        LEFT JOIN miller_vehicle_assignee mva
            ON mva.assigned_id = mor.delivered_by
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = mva.driver_id
        LEFT JOIN miller_delivery_vehicle_management v
            ON v.vehicle_id = mva.vehicle_id
        LEFT JOIN miller_online_orders_payment mop
            ON mop.online_order_id = moc.online_order_id
        WHERE {where_sql}
        {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    returns = []
    for r in rows:
        is_warehouse = r[21] is not None
        buyer_type_str = "Warehouse" if is_warehouse else "Retailer"

        if is_warehouse:
            buyer_name = r[32] or r[33] or f"Warehouse #{r[21]}"
            contact = r[34] or "—"
            email = r[35] or "—"
            addr_parts = [r[39], r[38], r[37], r[36]]
        else:
            buyer_name = _format_driver_name(r[22], r[23], r[24], r[25]) or f"Retailer #{r[20]}"
            contact = r[26] or "—"
            email = r[27] or "—"
            addr_parts = [r[31], r[30], r[29], r[28]]

        clean_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()])
        if not clean_addr:
            clean_addr = "Address not specified"

        driver_name = _format_driver_name(r[41], r[42], r[43], r[44]) or "N/A"
        driver_plate = r[46] or "N/A"
        driver_model = r[47] or ""
        driver_display = f"{driver_name} ({driver_plate})" if driver_plate != "N/A" else driver_name

        ret_qty = float(r[3]) if r[3] is not None else 0.0
        unit_cost = float(r[18]) if r[18] is not None else 0.0
        total_return_cost = ret_qty * unit_cost

        ord_qty = float(r[10]) if r[10] is not None else 0.0
        fare = float(r[11]) if r[11] is not None else 0.0
        order_total = float(r[12]) if r[12] is not None else 0.0
        available_stock = float(r[19]) if r[19] is not None else 0.0

        returns.append(
            {
                "return_id": r[0],
                "id": r[0],
                "return_reference_no": r[1],
                "receiving_reference_no": r[2] or "—",
                "quantity": ret_qty,
                "numericQty": ret_qty,
                "qty": f"{ret_qty:,.0f} kg" if ret_qty.is_integer() else f"{ret_qty:,.2f} kg",
                "quantity_formatted": f"{ret_qty:,.0f} kg" if ret_qty.is_integer() else f"{ret_qty:,.2f} kg",
                "reason": r[4] or "No reason specified.",
                "proof": _resolve_photo_url(r[5]),
                "status": r[6],
                "created_at": r[7].isoformat() if r[7] else None,
                "isoDate": r[7].strftime("%Y-%m-%d") if r[7] else "",
                "created_at_formatted": r[7].strftime("%b %d, %Y") if r[7] else "—",
                # Order Info
                "online_order_id": r[8],
                "batch_no": r[9],
                "orderNo": r[9],
                "ordered_quantity": ord_qty,
                "ordered_quantity_formatted": f"{ord_qty:,.0f} kg" if ord_qty.is_integer() else f"{ord_qty:,.2f} kg",
                "fare_fee": fare,
                "fare_fee_formatted": f"₱{fare:,.2f}",
                "total_price": order_total,
                "total_price_formatted": f"₱{order_total:,.2f}",
                "expected_arrival_date": r[13].isoformat() if r[13] else None,
                "expected_arrival_date_formatted": r[13].strftime("%b %d, %Y") if r[13] else "—",
                "order_status": r[14],
                # Product Info
                "product_id": r[15],
                "product_name": r[16] or "Rice Variant",
                "variant": r[16] or "Rice Variant",
                "product_code": r[17] or "—",
                "unit_cost": unit_cost,
                "unit_cost_formatted": f"₱{unit_cost:,.2f}",
                "total_return_cost": total_return_cost,
                "total_return_cost_formatted": f"₱{total_return_cost:,.2f}",
                "available_stock": available_stock,
                "available_stock_formatted": f"{available_stock:,.0f} kg" if available_stock.is_integer() else f"{available_stock:,.2f} kg",
                # Buyer Info
                "buyer_type": buyer_type_str,
                "buyer_name": buyer_name,
                "buyer": buyer_name,
                "retailer": buyer_name,
                "contact_number": contact,
                "email": email,
                "delivery_address": clean_addr,
                # Delivery Info
                "delivered_by": r[40],
                "driver_name": driver_name,
                "driver_display": driver_display,
                "driver_contact": r[45] or "—",
                "driver_plate": driver_plate,
                "driver_model": driver_model,
                # Payment
                "payment_method": r[48] or "N/A",
                "payment_status": r[49] or "N/A",
                "payment_reference": r[50] or "—",
            }
        )

    return returns


def list_flc_return_variants(supplier_profile_id):
    """
    Retrieve unique product variants present in Pending product returns.
    """
    sql = """
        SELECT DISTINCT mp.product_name
        FROM miller_online_orders_returns mor
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = mor.online_order_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        WHERE mor.supplier_profile_id = %s
          AND mor.status = 'Pending'
          AND mp.product_name IS NOT NULL
        ORDER BY mp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = cursor.fetchall()

    return [r[0] for r in rows if r[0]]


def list_flc_vehicle_assigned_history(
    supplier_profile_id,
    search=None,
    status_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve all vehicle assignment records for the authenticated FLC employee's branch.
    Includes active, changed, and historical assignments.

    DATABASE TABLES:
    - miller_vehicle_assignee mva
    - miller_delivery_vehicle_management v
    - supplier_employees se
    """
    params = [supplier_profile_id]
    where_clauses = ["mva.supplier_profile_id = %s"]

    # Status filter: All, Active, Changed
    if status_filter and status_filter.lower() in ("active", "changed"):
        where_clauses.append("LOWER(mva.status) = LOWER(%s)")
        params.append(status_filter.strip())

    # Date range filter on assignment creation date (created_at)
    if start_date:
        where_clauses.append("DATE(mva.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(mva.created_at) <= %s")
        params.append(end_date)

    # Search filter: vehicle model, plate number, or driver name
    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                v.model LIKE %s
                OR v.plate_number LIKE %s
                OR se.first_name LIKE %s
                OR se.last_name LIKE %s
                OR CONCAT(se.first_name, ' ', se.last_name) LIKE %s
            )"""
        )
        params.extend([search_like] * 5)

    where_sql = " AND ".join(where_clauses)

    # Sorting
    order_by_sql = "ORDER BY mva.created_at DESC, mva.assigned_id DESC"
    if sort_by == "model-asc":
        order_by_sql = "ORDER BY v.model ASC, mva.created_at DESC"
    elif sort_by == "model-desc":
        order_by_sql = "ORDER BY v.model DESC, mva.created_at DESC"
    elif sort_by == "plate-asc":
        order_by_sql = "ORDER BY v.plate_number ASC, mva.created_at DESC"
    elif sort_by == "plate-desc":
        order_by_sql = "ORDER BY v.plate_number DESC, mva.created_at DESC"
    elif sort_by == "driver-asc":
        order_by_sql = "ORDER BY se.first_name ASC, se.last_name ASC, mva.created_at DESC"
    elif sort_by == "driver-desc":
        order_by_sql = "ORDER BY se.first_name DESC, se.last_name DESC, mva.created_at DESC"
    elif sort_by == "date-desc":
        order_by_sql = "ORDER BY mva.created_at DESC, mva.assigned_id DESC"
    elif sort_by == "date-asc":
        order_by_sql = "ORDER BY mva.created_at ASC, mva.assigned_id ASC"

    sql = f"""
        SELECT
            mva.assigned_id,
            mva.status AS assignment_status,
            mva.created_at AS assigned_on,
            mva.updated_at,
            -- Vehicle info
            v.vehicle_id,
            v.model,
            v.plate_number,
            v.type,
            v.number_of_wheels,
            v.capacity,
            v.photo,
            v.status AS vehicle_status,
            v.inactive_reason,
            v.maintenance_reason,
            -- Driver info
            se.supplier_employee_id AS driver_id,
            se.first_name AS driver_first_name,
            se.middle_initial AS driver_middle_initial,
            se.last_name AS driver_last_name,
            se.suffix AS driver_suffix,
            se.email AS driver_email,
            se.contact_number AS driver_contact_number
        FROM miller_vehicle_assignee mva
        INNER JOIN miller_delivery_vehicle_management v
            ON v.vehicle_id = mva.vehicle_id
        INNER JOIN supplier_employees se
            ON se.supplier_employee_id = mva.driver_id
        WHERE {where_sql}
        {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    assignments = []
    for r in rows:
        driver_name = _format_driver_name(r[15], r[16], r[17], r[18])
        cap = _parse_capacity_kg(r[9])
        cap_formatted = f"{cap:,.0f} kg" if cap.is_integer() else f"{cap:,.2f} kg"

        created_at_dt = r[2]
        created_at_iso = created_at_dt.isoformat() if created_at_dt else None
        created_at_formatted = created_at_dt.strftime("%b %d, %Y") if created_at_dt else "—"

        status_raw = str(r[1] or "active").strip()
        status_clean = "Active" if status_raw.lower() == "active" else "Changed"

        assignments.append(
            {
                "assigned_id": r[0],
                "id": r[0],
                "status": status_clean,
                "assignment_status": status_clean,
                "status_raw": status_raw,
                "assigned_on": created_at_formatted,
                "assigned_on_formatted": created_at_formatted,
                "assigned_on_iso": created_at_iso,
                "created_at": created_at_iso,
                "isoDate": created_at_dt.strftime("%Y-%m-%d") if created_at_dt else "",
                # Vehicle Details
                "vehicle_id": r[4],
                "model": r[5] or "Vehicle",
                "plate_number": r[6] or "—",
                "type": r[7] or "Delivery Vehicle",
                "number_of_wheels": r[8] or 4,
                "capacity": cap,
                "capacity_formatted": cap_formatted,
                "photo": r[10],
                "photo_url": _resolve_photo_url(r[10]),
                "vehicle_status": r[11] or "active",
                "inactive_reason": r[12],
                "maintenance_reason": r[13],
                # Driver Details
                "driver_id": r[14],
                "driver": driver_name,
                "driver_name": driver_name,
                "driver_email": r[19] or "—",
                "driver_contact": r[20] or "—",
            }
        )

    return assignments


def list_flc_fulfillment_variants(supplier_profile_id):
    """
    Retrieve distinct variants associated with receiving history for the authenticated branch.
    """
    sql = """
        SELECT DISTINCT mp.product_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        INNER JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        WHERE rh.supplier_profile_id = %s
          AND mp.product_name IS NOT NULL
        ORDER BY mp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = cursor.fetchall()
        variants = [r[0] for r in rows if r[0]]

    # Also include branch-wide products if receiving history is still sparse
    if not variants:
        sql_fallback = """
            SELECT DISTINCT product_name
            FROM miller_products
            WHERE supplier_profile_id = %s
              AND product_name IS NOT NULL
            ORDER BY product_name ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_fallback, [supplier_profile_id])
            variants = [r[0] for r in cursor.fetchall() if r[0]]

    return variants


def list_flc_fulfillment_history(
    supplier_profile_id,
    search=None,
    variant_filter=None,
    buyer_type_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve fulfillment/receiving history records scoped strictly to the authenticated FLC branch.
    """
    where_clauses = ["rh.supplier_profile_id = %s"]
    params = [supplier_profile_id]

    # Date range filter on rh.received_at
    if start_date:
        where_clauses.append("DATE(rh.received_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(rh.received_at) <= %s")
        params.append(end_date)

    # Variant filter
    if variant_filter and variant_filter.strip().lower() != "all":
        where_clauses.append("LOWER(mp.product_name) = LOWER(%s)")
        params.append(variant_filter.strip())

    # Buyer type filter
    if buyer_type_filter and buyer_type_filter.strip().lower() != "all":
        b_type = buyer_type_filter.strip().lower()
        if b_type == "retailer":
            where_clauses.append("(rh.user_buyer_id IS NOT NULL OR moc.user_buyer_id IS NOT NULL)")
        elif b_type == "warehouse":
            where_clauses.append("(rh.warehouse_buyer_id IS NOT NULL OR moc.warehouse_buyer_id IS NOT NULL)")

    # Search filter: order number, batch number, customer, or product
    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                rh.receiving_reference_no LIKE %s
                OR moc.batch_no LIKE %s
                OR mp.product_name LIKE %s
                OR mp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR CONCAT(u.first_name, ' ', u.last_name) LIKE %s
                OR wp.business_name LIKE %s
            )"""
        )
        params.extend([search_like] * 8)

    where_sql = " AND ".join(where_clauses)

    # Sorting
    order_by_sql = "ORDER BY rh.received_at DESC, rh.receiving_id DESC"
    if sort_by == "variant-asc":
        order_by_sql = "ORDER BY mp.product_name ASC, rh.received_at DESC"
    elif sort_by == "variant-desc":
        order_by_sql = "ORDER BY mp.product_name DESC, rh.received_at DESC"
    elif sort_by == "customer-asc":
        order_by_sql = "ORDER BY COALESCE(wp.business_name, u.first_name) ASC, rh.received_at DESC"
    elif sort_by == "customer-desc":
        order_by_sql = "ORDER BY COALESCE(wp.business_name, u.first_name) DESC, rh.received_at DESC"
    elif sort_by == "delivered-desc":
        order_by_sql = "ORDER BY rh.total_received DESC, rh.received_at DESC"
    elif sort_by == "delivered-asc":
        order_by_sql = "ORDER BY rh.total_received ASC, rh.received_at DESC"
    elif sort_by == "passed-desc":
        order_by_sql = "ORDER BY rh.received_good DESC, rh.received_at DESC"
    elif sort_by == "passed-asc":
        order_by_sql = "ORDER BY rh.received_good ASC, rh.received_at DESC"
    elif sort_by == "failed-desc":
        order_by_sql = "ORDER BY rh.received_bad DESC, rh.received_at DESC"
    elif sort_by == "failed-asc":
        order_by_sql = "ORDER BY rh.received_bad ASC, rh.received_at DESC"
    elif sort_by == "cost-desc":
        order_by_sql = "ORDER BY moc.total_price DESC, rh.received_at DESC"
    elif sort_by == "cost-asc":
        order_by_sql = "ORDER BY moc.total_price ASC, rh.received_at DESC"

    sql = f"""
        SELECT
            rh.receiving_id,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.payables,
            rh.status AS receiving_status,
            rh.proof,
            rh.received_at,
            -- Order Info
            moc.online_order_id,
            moc.batch_no,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.expected_arrival_date,
            moc.status AS order_status,
            -- Product Info
            mp.product_id,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            -- Buyer Info
            rh.user_buyer_id,
            rh.warehouse_buyer_id,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            wp.business_name,
            -- Driver & Vehicle from vehicle_assignee_id
            mva.assigned_id AS vehicle_assignee_id,
            mva.status AS assignment_status,
            v.model AS vehicle_model,
            v.plate_number AS vehicle_plate_number,
            v.type AS vehicle_type,
            se.first_name AS driver_first_name,
            se.middle_initial AS driver_middle_initial,
            se.last_name AS driver_last_name,
            se.suffix AS driver_suffix
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN users u
            ON u.user_id = COALESCE(rh.user_buyer_id, moc.user_buyer_id)
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = COALESCE(rh.warehouse_buyer_id, moc.warehouse_buyer_id)
        LEFT JOIN miller_vehicle_assignee mva
            ON mva.assigned_id = rh.vehicle_assignee_id
        LEFT JOIN miller_delivery_vehicle_management v
            ON v.vehicle_id = mva.vehicle_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = mva.driver_id
        WHERE {where_sql}
        {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    history = []
    for r in rows:
        total_rec = float(r[2]) if r[2] is not None else 0.0
        good_rec = float(r[3]) if r[3] is not None else 0.0
        bad_rec = float(r[4]) if r[4] is not None else 0.0
        ord_qty = float(r[11]) if r[11] is not None else 0.0
        fare_fee = float(r[12]) if r[12] is not None else 0.0
        unit_cost = float(r[19]) if r[19] is not None else 0.0
        total_price = float(r[13]) if r[13] is not None else (ord_qty * unit_cost + fare_fee)

        is_warehouse = bool(r[21])
        if is_warehouse:
            buyer_type = "Warehouse"
            buyer_name = r[26] or "Warehouse Buyer"
        else:
            buyer_type = "Retailer"
            buyer_name = _format_driver_name(r[22], r[23], r[24], r[25]) or "Retailer Buyer"

        driver_name = _format_driver_name(r[32], r[33], r[34], r[35]) if r[32] else "Unassigned"

        rec_at = r[8]
        rec_at_iso = rec_at.isoformat() if rec_at else None
        rec_at_formatted = rec_at.strftime("%b %d, %Y") if rec_at else "—"

        exp_date = r[14]
        exp_date_iso = exp_date.isoformat() if exp_date else None
        exp_date_formatted = exp_date.strftime("%b %d, %Y") if exp_date else "—"

        status_raw = str(r[6] or "unpaid").strip().lower()
        status_clean = "Paid" if status_raw == "paid" else "Unpaid"

        history.append({
            "receiving_id": r[0],
            "id": r[0],
            "receiving_reference_no": r[1] or f"REC-{r[0]}",
            "reference_no": r[1] or f"REC-{r[0]}",
            "total_received": total_rec,
            "total_received_formatted": f"{total_rec:,.0f} kg" if total_rec.is_integer() else f"{total_rec:,.2f} kg",
            "delivered": f"{total_rec:,.0f} kg" if total_rec.is_integer() else f"{total_rec:,.2f} kg",
            "received_good": good_rec,
            "received_good_formatted": f"{good_rec:,.0f} kg" if good_rec.is_integer() else f"{good_rec:,.2f} kg",
            "passed": f"{good_rec:,.0f} kg" if good_rec.is_integer() else f"{good_rec:,.2f} kg",
            "received_bad": bad_rec,
            "received_bad_formatted": f"{bad_rec:,.0f} kg" if bad_rec.is_integer() else f"{bad_rec:,.2f} kg",
            "failed": f"{bad_rec:,.0f} kg" if bad_rec.is_integer() else f"{bad_rec:,.2f} kg",
            "quantity_to_pay": good_rec,
            "quantity_to_pay_formatted": f"{good_rec:,.0f} kg" if good_rec.is_integer() else f"{good_rec:,.2f} kg",
            "payables": float(r[5]) if r[5] is not None else (good_rec * unit_cost),
            "status": status_clean,
            "status_raw": status_raw,
            "proof": r[7],
            "proof_url": _resolve_photo_url(r[7]),
            "received_at": rec_at_iso,
            "received_at_formatted": rec_at_formatted,
            "isoDate": rec_at.strftime("%Y-%m-%d") if rec_at else "",
            "online_order_id": r[9],
            "batch_no": r[10] or "—",
            "ordered_quantity": ord_qty,
            "ordered_quantity_formatted": f"{ord_qty:,.0f} kg" if ord_qty.is_integer() else f"{ord_qty:,.2f} kg",
            "fare_fee": fare_fee,
            "fare_fee_formatted": f"₱{fare_fee:,.2f}",
            "total_price": total_price,
            "total_price_formatted": f"₱{total_price:,.2f}",
            "expected_arrival_date": exp_date_iso,
            "expected_arrival_date_formatted": exp_date_formatted,
            "order_status": r[15],
            "product_id": r[16],
            "product_name": r[17] or "Variant",
            "variant": r[17] or "Variant",
            "product_code": r[18] or "—",
            "unit_cost": unit_cost,
            "unit_cost_formatted": f"₱{unit_cost:,.2f}",
            "buyer_type": buyer_type,
            "customer_type": buyer_type,
            "customer_name": buyer_name,
            "customer": buyer_name,
            "buyer_name": buyer_name,
            "vehicle_assignee_id": r[27],
            "assignment_status": r[28],
            "assigned_vehicle_model": r[29] or "—",
            "vehicle_model": r[29] or "—",
            "plate_number": r[30] or "—",
            "vehicle_type": r[31] or "—",
            "assigned_driver": driver_name,
            "driver_name": driver_name,
        })

    return history


def get_flc_reimbursement_categories(supplier_profile_id: int) -> list:
    """
    Return all standard reimbursement categories plus any custom categories
    used in miller_reimbursement for this supplier branch.
    """
    preset = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication Expenses",
        "Logistics",
        "Office & Operating Supplies",
        "Others",
    ]
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT mr.types
            FROM miller_reimbursement mr
            WHERE mr.supplier_profile_id = %s
              AND mr.types IS NOT NULL
              AND TRIM(mr.types) != ''
            ORDER BY mr.types ASC
            """,
            [supplier_profile_id],
        )
        db_types = [r[0].strip() for r in cursor.fetchall() if r[0] and r[0].strip()]

    categories = list(preset)
    for dt in db_types:
        if dt not in categories:
            categories.append(dt)
    return categories


def list_flc_reimbursement_history(
    supplier_profile_id: int,
    employee_id: int = None,
    search: str = None,
    status_filter: str = None,
    category_filter: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = None,
) -> list:
    """
    List reimbursement history records belonging to the authenticated FLC branch and employee.

    Tables involved:
    - miller_reimbursement (mr)
    - supplier_employees (se for requester, pe for payer)

    Validations & Rules:
    - Scoped strictly by supplier_profile_id.
    - If employee_id is provided, scoped to requested_by = employee_id.
    - Search by category (types), description, title, requester name, or request_reference_no.
    - Date filtering using requested_date (start_date <= end_date validated).
    - Status filtering: 'requested', 'paid', or 'all'.
    - Category filtering: existing standard & custom categories.
    - Sorting: newest first ('date-desc') or oldest first ('date-asc') by requested_date.
    - Expense Date column: uses expense_date (formatted like 'Oct 23, 2026' or 'N/A' if null).
    """
    where_clauses = ["mr.supplier_profile_id = %s"]
    params = [supplier_profile_id]

    if employee_id:
        where_clauses.append("mr.requested_by = %s")
        params.append(employee_id)

    if search:
        term = f"%{search.strip()}%"
        where_clauses.append(
            """
            (
                mr.types LIKE %s
                OR mr.description LIKE %s
                OR mr.title LIKE %s
                OR mr.request_reference_no LIKE %s
                OR CONCAT_WS(' ', se.first_name, se.last_name) LIKE %s
            )
            """
        )
        params.extend([term, term, term, term, term])

    if status_filter and status_filter.strip().lower() != "all":
        st = status_filter.strip().lower()
        if st in ["requested", "paid"]:
            where_clauses.append("LOWER(mr.status) = %s")
            params.append(st)

    if category_filter and category_filter.strip().lower() != "all":
        where_clauses.append("LOWER(mr.types) = %s")
        params.append(category_filter.strip().lower())

    if start_date:
        where_clauses.append("DATE(mr.requested_date) >= %s")
        params.append(start_date.strip())

    if end_date:
        where_clauses.append("DATE(mr.requested_date) <= %s")
        params.append(end_date.strip())

    order_by = "ORDER BY mr.requested_date DESC, mr.reimbursement_id DESC"
    if sort_by == "date-asc":
        order_by = "ORDER BY mr.requested_date ASC, mr.reimbursement_id ASC"

    query = f"""
        SELECT
            mr.reimbursement_id,
            mr.supplier_profile_id,
            mr.requested_by,
            mr.title,
            mr.description,
            mr.types,
            mr.price,
            mr.requested_date,
            mr.photo_evidence,
            mr.status,
            mr.request_reference_no,
            mr.paid_by,
            mr.paid_date,
            mr.method,
            mr.receipt_photo,
            mr.payment_reference_no,
            mr.expense_date,
            se.first_name AS req_first_name,
            se.middle_initial AS req_middle_initial,
            se.last_name AS req_last_name,
            se.suffix AS req_suffix,
            pe.first_name AS pay_first_name,
            pe.middle_initial AS pay_middle_initial,
            pe.last_name AS pay_last_name,
            pe.suffix AS pay_suffix
        FROM miller_reimbursement mr
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = mr.requested_by
        LEFT JOIN supplier_employees pe
            ON pe.supplier_employee_id = mr.paid_by
        WHERE {" AND ".join(where_clauses)}
        {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    results = []
    for r in rows:
        reimb_id = r[0]
        supp_id = r[1]
        req_id = r[2]
        title = r[3] or "Reimbursement Request"
        description = r[4] or ""
        types = r[5] or "Others"
        price_val = float(r[6]) if r[6] is not None else 0.0
        req_date = r[7]
        photo_evidence = r[8]
        status_val = str(r[9] or "requested").lower()
        ref_no = r[10] or f"REIMB-{reimb_id}"
        paid_by_id = r[11]
        paid_date = r[12]
        method = r[13]
        receipt_photo = r[14]
        payment_ref_no = r[15]
        expense_date = r[16]

        req_name = _format_driver_name(r[17], r[18], r[19], r[20]) or "N/A"
        payer_name = _format_driver_name(r[21], r[22], r[23], r[24]) if paid_by_id else "N/A"

        req_date_str = req_date.strftime("%b %d, %Y, %I:%M %p") if req_date else "N/A"
        req_date_short = req_date.strftime("%b %d, %Y") if req_date else "N/A"
        req_date_iso = req_date.isoformat() if req_date else ""

        if expense_date:
            expense_date_str = (
                expense_date.strftime("%b %d, %Y")
                if hasattr(expense_date, "strftime")
                else str(expense_date)
            )
            expense_date_iso = (
                expense_date.isoformat()
                if hasattr(expense_date, "isoformat")
                else str(expense_date)
            )
        else:
            expense_date_str = "N/A"
            expense_date_iso = ""

        if paid_date:
            paid_date_str = (
                paid_date.strftime("%b %d, %Y, %I:%M %p")
                if hasattr(paid_date, "strftime")
                else str(paid_date)
            )
            paid_date_iso = (
                paid_date.isoformat()
                if hasattr(paid_date, "isoformat")
                else str(paid_date)
            )
        else:
            paid_date_str = "N/A"
            paid_date_iso = ""

        status_display = "Paid" if status_val == "paid" else "Requested"

        results.append(
            {
                "id": reimb_id,
                "reimbursement_id": reimb_id,
                "supplier_profile_id": supp_id,
                "requested_by": req_id,
                "requested_by_name": req_name,
                "requester": req_name,
                "requestedBy": req_name,
                "title": title,
                "description": description,
                "types": types,
                "category": types,
                "price": f"₱{price_val:,.2f}",
                "amount": f"₱{price_val:,.2f}",
                "numericAmount": price_val,
                "requested_date": req_date_str,
                "requested_date_short": req_date_short,
                "requested_date_iso": req_date_iso,
                "isoDate": req_date.strftime("%Y-%m-%d") if req_date else "",
                "expense_date": expense_date_str,
                "expense_date_iso": expense_date_iso,
                "expenseDate": expense_date_str,
                "status": status_display,
                "status_raw": status_val,
                "request_reference_no": ref_no,
                "paid_by": paid_by_id,
                "paid_by_name": payer_name or "N/A",
                "paid_date": paid_date_str,
                "paid_date_iso": paid_date_iso,
                "method": method or "N/A",
                "payment_reference_no": payment_ref_no or "N/A",
                "photo_evidence": photo_evidence,
                "photo_evidence_url": _resolve_photo_url(photo_evidence),
                "receipt_photo": receipt_photo,
                "receipt_photo_url": _resolve_photo_url(receipt_photo),
            }
        )

    return results



