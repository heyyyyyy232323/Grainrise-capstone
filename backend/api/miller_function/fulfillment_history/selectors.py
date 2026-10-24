"""
Selectors for Miller Manager Fulfillment History.
Retrieves completed fulfillment and receiving records across all branches
owned by the authenticated Miller Manager.
"""

from django.db import connection


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


def _resolve_photo_url(relative_path):
    """
    Ensure photo path resolves correctly to /media/.
    """
    if not relative_path:
        return None
    cleaned = str(relative_path).strip().replace("\\", "/")
    if cleaned.startswith("http://") or cleaned.startswith("https://"):
        return cleaned
    if cleaned.startswith("/media/"):
        return cleaned
    cleaned = cleaned.lstrip("/")
    return f"/media/{cleaned}"


def list_manager_fulfillment_variants(miller_user_id, branch_id=None):
    """
    Retrieve distinct variants associated with receiving history across all Manager-owned branches,
    optionally filtered by a specific branch_id.
    """
    where_clauses = ["sp.user_id = %s"]
    params = [miller_user_id]

    if branch_id and str(branch_id).strip().lower() != "all":
        where_clauses.append("sp.supplier_profile_id = %s")
        params.append(branch_id)

    where_sql = " AND ".join(where_clauses)

    sql = f"""
        SELECT DISTINCT mp.product_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        INNER JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        WHERE {where_sql}
          AND mp.product_name IS NOT NULL
        ORDER BY mp.product_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        variants = [r[0] for r in rows if r[0]]

    # Fallback to products registered under manager's branches if receiving history is sparse
    if not variants:
        fallback_sql = f"""
            SELECT DISTINCT mp.product_name
            FROM miller_products mp
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = mp.supplier_profile_id
            WHERE {where_sql}
              AND mp.product_name IS NOT NULL
            ORDER BY mp.product_name ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(fallback_sql, params)
            variants = [r[0] for r in cursor.fetchall() if r[0]]

    return variants


def list_manager_fulfillment_history(
    miller_user_id,
    branch_id=None,
    search=None,
    variant_filter=None,
    buyer_type_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve fulfillment/receiving history records across ALL branches owned by the Miller Manager,
    or filtered by selected branch_id.
    """
    where_clauses = ["sp.user_id = %s"]
    params = [miller_user_id]

    # Branch filter
    if branch_id and str(branch_id).strip().lower() != "all":
        where_clauses.append("sp.supplier_profile_id = %s")
        params.append(branch_id)

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

    # Search filter: order number, batch number, customer, product, or branch name
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
                OR sp.business_name LIKE %s
            )"""
        )
        params.extend([search_like] * 9)

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
    elif sort_by == "branch-asc":
        order_by_sql = "ORDER BY sp.business_name ASC, rh.received_at DESC"
    elif sort_by == "branch-desc":
        order_by_sql = "ORDER BY sp.business_name DESC, rh.received_at DESC"

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
            se.suffix AS driver_suffix,
            -- Branch Info
            sp.supplier_profile_id,
            sp.business_name AS branch_name,
            sp.organization_name AS branch_org_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
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

        branch_profile_id = r[36]
        branch_name = r[37] or r[38] or f"Branch #{branch_profile_id}"

        history.append({
            "receiving_id": r[0],
            "id": r[0],
            "receiving_reference_no": r[1] or f"REC-{r[0]}",
            "reference_no": r[1] or f"REC-{r[0]}",
            "branch_id": branch_profile_id,
            "supplier_profile_id": branch_profile_id,
            "branch_name": branch_name,
            "branch": branch_name,
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
