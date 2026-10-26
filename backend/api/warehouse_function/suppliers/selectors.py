import datetime
from decimal import Decimal
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


def _format_date(dt):
    if not dt:
        return None
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.strftime("%b %d, %Y")
    return str(dt)


def get_manager_warehouse_profile_ids(warehouse_user_id):
    """
    Get all warehouse_profile_ids owned by the Warehouse Manager user_id.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT warehouse_profile_id
            FROM warehouse_profiles
            WHERE user_id = %s
            ORDER BY warehouse_profile_id ASC
            """,
            [warehouse_user_id],
        )
        return [r[0] for r in cursor.fetchall()]


def list_manager_branches(warehouse_user_id):
    """
    List owned warehouse branches for branch selectors.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                warehouse_profile_id,
                business_name,
                organization_name,
                province,
                municipality,
                barangay,
                street_address
            FROM warehouse_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC, warehouse_profile_id ASC
            """,
            [warehouse_user_id],
        )
        return _rows_to_dicts(cursor)


# ==============================================================================
# SEGMENT 1 — GRAINRISE MILLERS SELECTORS
# ==============================================================================


def list_grainrise_millers(warehouse_user_id):
    """
    List all active registered GRAINRISE Miller branches from supplier_profiles.
    Only shows businesses whose parent users account is active and role is 'miller'.
    Includes:
    - Average star rating (rounded to 1 decimal place) and rating count.
    - Last receiving date for any warehouse branch owned by this manager.
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)

    # Subquery for last receiving date per supplier_profile_id
    receiving_subquery = "NULL"
    receiving_params = []
    if owned_branch_ids:
        placeholders = ",".join(["%s"] * len(owned_branch_ids))
        receiving_subquery = f"""
            (
                SELECT MAX(rh.received_at)
                FROM miller_online_customer_receiving_history rh
                WHERE rh.supplier_profile_id = sp.supplier_profile_id
                  AND rh.warehouse_buyer_id IN ({placeholders})
            )
        """
        receiving_params = list(owned_branch_ids)

    sql = f"""
        SELECT
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name,
            sp.province,
            sp.municipality,
            sp.barangay,
            sp.street_address,
            sp.postal_code,
            sp.official_email,
            sp.official_contact_number,
            CONCAT_WS(' ', u.first_name, NULLIF(u.middle_initial, ''), u.last_name, NULLIF(u.suffix, '')) AS owner_name,
            (
                SELECT ROUND(AVG(r.rating), 1)
                FROM miller_online_orders_rating r
                WHERE r.supplier_profile_id = sp.supplier_profile_id
            ) AS avg_rating,
            (
                SELECT COUNT(r.rating)
                FROM miller_online_orders_rating r
                WHERE r.supplier_profile_id = sp.supplier_profile_id
            ) AS rating_count,
            {receiving_subquery} AS last_received_at
        FROM supplier_profiles sp
        INNER JOIN users u
            ON u.user_id = sp.user_id
        WHERE u.status = 'active'
          AND u.user_role IN ('miller', 'miller_manager')
        ORDER BY sp.business_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, receiving_params)
        rows = _rows_to_dicts(cursor)

    result = []
    for r in rows:
        address_parts = [
            r.get("street_address"),
            r.get("barangay"),
            r.get("municipality"),
            r.get("province"),
            r.get("postal_code"),
        ]
        address = ", ".join([p.strip() for p in address_parts if p and str(p).strip()]) or "No address specified"

        avg_rating = r.get("avg_rating")
        rating_val = float(avg_rating) if avg_rating is not None else None

        last_dt = r.get("last_received_at")

        result.append({
            "supplier_profile_id": r["supplier_profile_id"],
            "id": r["supplier_profile_id"],
            "business_name": r["business_name"] or r["organization_name"] or "Miller Branch",
            "organization_name": r["organization_name"] or "",
            "address": address,
            "official_email": r["official_email"] or "",
            "official_contact_number": r["official_contact_number"] or "",
            "owner_name": r["owner_name"] or "Miller Owner",
            "avg_rating": rating_val,
            "rating_count": int(r.get("rating_count") or 0),
            "last_receiving_date": _format_date(last_dt),
            "last_received_at": str(last_dt) if last_dt else None,
        })

    return result


def get_grainrise_miller_detail(warehouse_user_id, supplier_profile_id):
    """
    Get detailed profile of a registered GRAINRISE Miller branch,
    including Active Purchases and Purchase History involving owned warehouses.
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)

    # 1. Miller Profile
    sql_profile = """
        SELECT
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name,
            sp.province,
            sp.municipality,
            sp.barangay,
            sp.street_address,
            sp.postal_code,
            sp.official_email,
            sp.official_contact_number,
            CONCAT_WS(' ', u.first_name, NULLIF(u.middle_initial, ''), u.last_name, NULLIF(u.suffix, '')) AS owner_name,
            (
                SELECT ROUND(AVG(r.rating), 1)
                FROM miller_online_orders_rating r
                WHERE r.supplier_profile_id = sp.supplier_profile_id
            ) AS avg_rating,
            (
                SELECT COUNT(r.rating)
                FROM miller_online_orders_rating r
                WHERE r.supplier_profile_id = sp.supplier_profile_id
            ) AS rating_count
        FROM supplier_profiles sp
        INNER JOIN users u
            ON u.user_id = sp.user_id
        WHERE sp.supplier_profile_id = %s
          AND u.status = 'active'
          AND u.user_role IN ('miller', 'miller_manager')
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_profile, [supplier_profile_id])
        profile_row = _row_to_dict(cursor)

    if not profile_row:
        return None

    address_parts = [
        profile_row.get("street_address"),
        profile_row.get("barangay"),
        profile_row.get("municipality"),
        profile_row.get("province"),
        profile_row.get("postal_code"),
    ]
    address = ", ".join([p.strip() for p in address_parts if p and str(p).strip()]) or "No address specified"
    avg_rating = profile_row.get("avg_rating")
    rating_val = float(avg_rating) if avg_rating is not None else None

    profile_data = {
        "supplier_profile_id": profile_row["supplier_profile_id"],
        "id": profile_row["supplier_profile_id"],
        "business_name": profile_row["business_name"] or profile_row["organization_name"] or "Miller Branch",
        "organization_name": profile_row["organization_name"] or "",
        "address": address,
        "official_email": profile_row["official_email"] or "",
        "official_contact_number": profile_row["official_contact_number"] or "",
        "owner_name": profile_row["owner_name"] or "Miller Owner",
        "avg_rating": rating_val,
        "rating_count": int(profile_row.get("rating_count") or 0),
    }

    # 2. Active Purchases (Unfinished orders for owned branches)
    active_orders = []
    if owned_branch_ids:
        placeholders = ",".join(["%s"] * len(owned_branch_ids))
        # Statuses: 'Ordered', 'In transit', 'Processing', 'Assigned to driver', 'Forwarded to Logistics'
        sql_active = f"""
            SELECT
                moc.online_order_id,
                moc.batch_no,
                moc.miller_product_id,
                mp.product_name,
                mp.product_code,
                mp.product_description,
                mp.product_image,
                moc.ordered_quantity,
                moc.total_price,
                moc.fare_fee,
                moc.expected_arrival_date,
                moc.status,
                moc.created_at,
                sp.business_name AS miller_name
            FROM miller_online_customer moc
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = moc.supplier_profile_id
            WHERE moc.supplier_profile_id = %s
              AND moc.warehouse_buyer_id IN ({placeholders})
              AND moc.status NOT IN ('Delivered', 'Declined', 'Cancelled', 'Completed', 'Received')
            ORDER BY moc.created_at DESC, moc.online_order_id DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_active, [supplier_profile_id] + list(owned_branch_ids))
            active_rows = _rows_to_dicts(cursor)

        for a in active_rows:
            qty = float(a["ordered_quantity"]) if a.get("ordered_quantity") is not None else 0.0
            tot = float(a["total_price"]) if a.get("total_price") is not None else 0.0
            # Unit cost per kg charged to warehouse:
            unit_cost = round(tot / qty, 2) if qty > 0 else 0.0

            active_orders.append({
                "online_order_id": a["online_order_id"],
                "id": a["online_order_id"],
                "batch_no": a["batch_no"] or f"ORD-{a['online_order_id']}",
                "product_id": a["miller_product_id"],
                "product_name": a["product_name"] or a["product_code"] or "Rice Variant",
                "product_description": a["product_description"] or "",
                "product_photo": a["product_image"] or "",
                "ordered_quantity": qty,
                "total_price": tot,
                "unit_cost": unit_cost,
                "expected_arrival_date": str(a["expected_arrival_date"]) if a.get("expected_arrival_date") else None,
                "status": a["status"] or "Ordered",
                "miller_name": a["miller_name"] or profile_data["business_name"],
            })

    # 3. Purchase History (Completed receiving records for owned branches)
    purchase_history = []
    if owned_branch_ids:
        placeholders = ",".join(["%s"] * len(owned_branch_ids))
        sql_history = f"""
            SELECT
                rh.receiving_id,
                rh.receiving_reference_no,
                rh.received_at,
                rh.total_received,
                rh.received_good,
                rh.received_bad,
                rh.payables,
                rh.status AS payment_status,
                rh.proof AS receiving_proof_photo,
                moc.batch_no,
                moc.ordered_quantity,
                mp.product_name,
                mp.product_code,
                mp.product_description,
                mp.product_image
            FROM miller_online_customer_receiving_history rh
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = rh.online_order_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            WHERE rh.supplier_profile_id = %s
              AND rh.warehouse_buyer_id IN ({placeholders})
            ORDER BY rh.received_at DESC, rh.receiving_id DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_history, [supplier_profile_id] + list(owned_branch_ids))
            hist_rows = _rows_to_dicts(cursor)

        for h in hist_rows:
            rec_dt = h.get("received_at")
            total_rcvd = float(h["total_received"]) if h.get("total_received") is not None else 0.0
            total_pay = float(h["payables"]) if h.get("payables") is not None else 0.0
            price_per_kg = round(total_pay / total_rcvd, 2) if total_rcvd > 0 else 0.0

            purchase_history.append({
                "receiving_id": h["receiving_id"],
                "id": h["receiving_id"],
                "receiving_reference_no": h["receiving_reference_no"] or f"REC-{h['receiving_id']}",
                "batch_no": h["batch_no"] or "—",
                "product_name": h["product_name"] or h["product_code"] or "Rice Variant",
                "received_at": str(rec_dt) if rec_dt else None,
                "received_date": _format_date(rec_dt),
                "total_received": total_rcvd,
                "received_good": float(h["received_good"]) if h.get("received_good") is not None else 0.0,
                "received_bad": float(h["received_bad"]) if h.get("received_bad") is not None else 0.0,
                "price_per_kg": price_per_kg,
                "total_payable": total_pay,
                "payment_status": h["payment_status"] or "Pending",
                "product_photo": h["product_image"] or "",
            })

    profile_data["active_orders"] = active_orders
    profile_data["purchase_history"] = purchase_history

    return profile_data


def get_grainrise_receiving_detail(warehouse_user_id, receiving_id):
    """
    Get full details for a Grainrise Miller receiving history modal:
    - Section 1: Inbound Order Details (variant, supplier, photo, original order quantity)
    - Section 2: Receiving Details (reference, total, good, bad, price/kg, payable,
      payment status, received by, proof, miller rating, rating comments, rating attachment)
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)
    if not owned_branch_ids:
        return None

    placeholders = ",".join(["%s"] * len(owned_branch_ids))
    sql = f"""
        SELECT
            rh.receiving_id,
            rh.receiving_reference_no,
            rh.received_at,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.payables,
            rh.status AS receiving_payment_status,
            rh.proof AS receiving_proof_photo,
            moc.online_order_id,
            moc.batch_no,
            moc.ordered_quantity,
            sp.business_name AS supplier_name,
            mp.product_name,
            mp.product_code,
            mp.product_description,
            mp.product_image,
            r.rating,
            r.comment AS rating_comment,
            (
                SELECT ra.attachment
                FROM miller_online_orders_rating_attachment ra
                WHERE ra.rating_id = r.rating_id
                LIMIT 1
            ) AS rating_attachment,
            fpay.amount_to_pay,
            fpay.payment_method,
            fpay.payment_reference_id,
            CONCAT_WS(' ', we.first_name, NULLIF(we.middle_initial, ''), we.last_name, NULLIF(we.suffix, '')) AS received_by_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN miller_online_orders_rating r
            ON r.online_order_id = moc.online_order_id
           AND r.warehouse_buyer_id = rh.warehouse_buyer_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.miller_receiving_id = rh.receiving_id
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = fpay.requested_by_employee_id
        WHERE rh.receiving_id = %s
          AND rh.warehouse_buyer_id IN ({placeholders})
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [receiving_id] + list(owned_branch_ids))
        row = _row_to_dict(cursor)

    if not row:
        return None

    tot_rcvd = float(row["total_received"]) if row.get("total_received") is not None else 0.0
    tot_pay = float(row["payables"]) if row.get("payables") is not None else 0.0
    price_per_kg = round(tot_pay / tot_rcvd, 2) if tot_rcvd > 0 else 0.0

    return {
        "receiving_id": row["receiving_id"],
        "id": row["receiving_id"],
        "batch_no": row["batch_no"] or f"ORD-{row['online_order_id']}",
        "receiving_reference_no": row["receiving_reference_no"] or f"REC-{row['receiving_id']}",
        "received_at": str(row["received_at"]) if row.get("received_at") else None,
        "received_date": _format_date(row.get("received_at")),
        # Section 1
        "product_variant": row["product_name"] or row["product_code"] or "Rice Variant",
        "supplier": row["supplier_name"] or "Registered Miller",
        "product_photo": row["product_image"] or "",
        "original_order_quantity": f"{float(row['ordered_quantity']):,.2f} kg" if row.get("ordered_quantity") else "—",
        # Section 2
        "total_received": f"{tot_rcvd:,.2f} kg",
        "received_good": f"{float(row['received_good'] or 0):,.2f} kg",
        "received_bad": f"{float(row['received_bad'] or 0):,.2f} kg",
        "price_per_kg": f"₱{price_per_kg:,.2f}",
        "total_payable": f"₱{tot_pay:,.2f}",
        "payment_status": row["receiving_payment_status"] or "Pending",
        "received_by": row["received_by_name"] or "Warehouse Staff",
        "receiving_proof_photo": row["receiving_proof_photo"] or "",
        "supplier_rating": row["rating"],
        "rating_comment": row["rating_comment"] or "Not available",
        "rating_attachment": row["rating_attachment"] or "",
    }


# ==============================================================================
# SEGMENT 2 — NON-GRAINRISE MILLERS SELECTORS
# ==============================================================================


def list_nongrainrise_millers(warehouse_user_id):
    """
    List active external Miller suppliers from warehouse_nongrainrise_supplier_contacts
    associated with warehouse branches owned by the authenticated manager.
    Includes:
    - Average star rating from warehouse_nongrainrise_supplier_contacts_ratings.
    - Last receiving date from warehouse_nongrainrise_supplier_receiving_history.
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)
    if not owned_branch_ids:
        return []

    placeholders = ",".join(["%s"] * len(owned_branch_ids))
    sql = f"""
        SELECT
            ngsc.warehouse_nongrainrise_supplier_contact_id,
            ngsc.warehouse_profile_id,
            ngsc.business_name,
            ngsc.business_address,
            ngsc.contact_person,
            ngsc.contact_number,
            ngsc.email,
            ngsc.status,
            wp.business_name AS branch_name,
            (
                SELECT ROUND(AVG(r.ratings), 1)
                FROM warehouse_nongrainrise_supplier_contacts_ratings r
                WHERE r.warehouse_nongrainrise_supplier_contact_id = ngsc.warehouse_nongrainrise_supplier_contact_id
            ) AS avg_rating,
            (
                SELECT COUNT(r.ratings)
                FROM warehouse_nongrainrise_supplier_contacts_ratings r
                WHERE r.warehouse_nongrainrise_supplier_contact_id = ngsc.warehouse_nongrainrise_supplier_contact_id
            ) AS rating_count,
            (
                SELECT MAX(rh.received_at)
                FROM warehouse_nongrainrise_supplier_receiving_history rh
                WHERE rh.warehouse_nongrainrise_supplier_contact_id = ngsc.warehouse_nongrainrise_supplier_contact_id
            ) AS last_received_at
        FROM warehouse_nongrainrise_supplier_contacts ngsc
        INNER JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = ngsc.warehouse_profile_id
        WHERE ngsc.warehouse_profile_id IN ({placeholders})
          AND ngsc.status = 'active'
        ORDER BY ngsc.business_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, list(owned_branch_ids))
        rows = _rows_to_dicts(cursor)

    result = []
    for r in rows:
        avg_rating = r.get("avg_rating")
        rating_val = float(avg_rating) if avg_rating is not None else None
        last_dt = r.get("last_received_at")

        result.append({
            "warehouse_nongrainrise_supplier_contact_id": r["warehouse_nongrainrise_supplier_contact_id"],
            "id": r["warehouse_nongrainrise_supplier_contact_id"],
            "warehouse_profile_id": r["warehouse_profile_id"],
            "business_name": r["business_name"] or "External Miller",
            "business_address": r["business_address"] or "No address specified",
            "contact_person": r["contact_person"] or "—",
            "contact_number": r["contact_number"] or "—",
            "email": r["email"] or "",
            "status": r["status"] or "active",
            "branch_name": r["branch_name"] or "Branch",
            "avg_rating": rating_val,
            "rating_count": int(r.get("rating_count") or 0),
            "last_receiving_date": _format_date(last_dt),
            "last_received_at": str(last_dt) if last_dt else None,
        })

    return result


def _check_table_has_columns(table_name, columns):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
            """,
            [table_name],
        )
        existing = {r[0].lower() for r in cursor.fetchall()}
    return {col: (col.lower() in existing) for col in columns}


def get_nongrainrise_miller_detail(warehouse_user_id, contact_id):
    """
    Get details of an external Non-GRAINRISE Miller, including
    Active Purchases (from warehouse_purchase_requests) and
    Purchase History (from warehouse_nongrainrise_supplier_receiving_history).
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)
    if not owned_branch_ids:
        return None

    placeholders = ",".join(["%s"] * len(owned_branch_ids))

    # 1. External Supplier Profile
    sql_profile = f"""
        SELECT
            ngsc.warehouse_nongrainrise_supplier_contact_id,
            ngsc.warehouse_profile_id,
            ngsc.business_name,
            ngsc.business_address,
            ngsc.contact_person,
            ngsc.contact_number,
            ngsc.email,
            ngsc.status,
            wp.business_name AS branch_name,
            (
                SELECT ROUND(AVG(r.ratings), 1)
                FROM warehouse_nongrainrise_supplier_contacts_ratings r
                WHERE r.warehouse_nongrainrise_supplier_contact_id = ngsc.warehouse_nongrainrise_supplier_contact_id
            ) AS avg_rating,
            (
                SELECT COUNT(r.ratings)
                FROM warehouse_nongrainrise_supplier_contacts_ratings r
                WHERE r.warehouse_nongrainrise_supplier_contact_id = ngsc.warehouse_nongrainrise_supplier_contact_id
            ) AS rating_count
        FROM warehouse_nongrainrise_supplier_contacts ngsc
        INNER JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = ngsc.warehouse_profile_id
        WHERE ngsc.warehouse_nongrainrise_supplier_contact_id = %s
          AND ngsc.warehouse_profile_id IN ({placeholders})
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_profile, [contact_id] + list(owned_branch_ids))
        profile_row = _row_to_dict(cursor)

    if not profile_row:
        return None

    avg_rating = profile_row.get("avg_rating")
    rating_val = float(avg_rating) if avg_rating is not None else None

    profile_data = {
        "warehouse_nongrainrise_supplier_contact_id": profile_row["warehouse_nongrainrise_supplier_contact_id"],
        "id": profile_row["warehouse_nongrainrise_supplier_contact_id"],
        "warehouse_profile_id": profile_row["warehouse_profile_id"],
        "business_name": profile_row["business_name"] or "External Miller",
        "business_address": profile_row["business_address"] or "No address specified",
        "contact_person": profile_row["contact_person"] or "—",
        "contact_number": profile_row["contact_number"] or "—",
        "email": profile_row["email"] or "",
        "status": profile_row["status"] or "active",
        "branch_name": profile_row["branch_name"] or "Branch",
        "avg_rating": rating_val,
        "rating_count": int(profile_row.get("rating_count") or 0),
    }

    # 2. Active Purchases from warehouse_purchase_requests
    col_check = _check_table_has_columns("warehouse_purchase_requests", ["batch_no", "unit_cost", "total_price"])
    batch_col = "wpr.batch_no" if col_check.get("batch_no") else "NULL AS batch_no"
    unit_cost_col = "wpr.unit_cost" if col_check.get("unit_cost") else "NULL AS unit_cost"
    total_price_col = "wpr.total_price" if col_check.get("total_price") else "NULL AS total_price"

    sql_active = f"""
        SELECT
            wpr.purchase_request_id,
            wpr.product_name,
            wpr.product_description,
            wpr.product_photo,
            wpr.ordered_quantity,
            wpr.expected_arrival_date,
            wpr.status,
            wpr.created_at,
            {batch_col},
            {unit_cost_col},
            {total_price_col}
        FROM warehouse_purchase_requests wpr
        WHERE wpr.warehouse_nongrainrise_supplier_contact_id = %s
          AND wpr.warehouse_profile_id IN ({placeholders})
          AND wpr.status NOT IN ('received', 'completed', 'cancelled', 'rejected')
        ORDER BY wpr.created_at DESC, wpr.purchase_request_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_active, [contact_id] + list(owned_branch_ids))
        active_rows = _rows_to_dicts(cursor)

    active_orders = []
    for a in active_rows:
        qty = float(a["ordered_quantity"]) if a.get("ordered_quantity") is not None else 0.0
        uc = float(a["unit_cost"]) if a.get("unit_cost") is not None else None
        tp = float(a["total_price"]) if a.get("total_price") is not None else None

        active_orders.append({
            "purchase_request_id": a["purchase_request_id"],
            "id": a["purchase_request_id"],
            "batch_no": a.get("batch_no") or None,
            "product_name": a["product_name"] or "Grain Variant",
            "product_description": a["product_description"] or "",
            "product_photo": a["product_photo"] or "",
            "ordered_quantity": qty,
            "unit_cost": uc,
            "total_price": tp,
            "expected_arrival_date": str(a["expected_arrival_date"]) if a.get("expected_arrival_date") else None,
            "status": a["status"] or "Ordered",
            "miller_name": profile_data["business_name"],
        })

    # 3. Purchase History from warehouse_nongrainrise_supplier_receiving_history
    sql_history = f"""
        SELECT
            rh.receiving_id,
            rh.purchase_request_id,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.price_per_kg,
            rh.total_price,
            rh.status AS payment_status,
            rh.received_at,
            rh.receiving_proof_photo,
            wpr.product_name,
            wpr.product_description,
            wpr.product_photo,
            wpr.ordered_quantity
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_purchase_requests wpr
            ON wpr.purchase_request_id = rh.purchase_request_id
        WHERE rh.warehouse_nongrainrise_supplier_contact_id = %s
          AND rh.warehouse_profile_id IN ({placeholders})
        ORDER BY rh.received_at DESC, rh.receiving_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_history, [contact_id] + list(owned_branch_ids))
        hist_rows = _rows_to_dicts(cursor)

    purchase_history = []
    for h in hist_rows:
        rec_dt = h.get("received_at")
        tot_rcvd = float(h["total_received"]) if h.get("total_received") is not None else 0.0
        tot_price = float(h["total_price"]) if h.get("total_price") is not None else 0.0
        price_kg = float(h["price_per_kg"]) if h.get("price_per_kg") is not None else 0.0

        purchase_history.append({
            "receiving_id": h["receiving_id"],
            "id": h["receiving_id"],
            "receiving_reference_no": h["receiving_reference_no"] or f"REC-{h['receiving_id']}",
            "product_name": h["product_name"] or "Grain Variant",
            "received_at": str(rec_dt) if rec_dt else None,
            "received_date": _format_date(rec_dt),
            "total_received": tot_rcvd,
            "received_good": float(h["received_good"]) if h.get("received_good") is not None else 0.0,
            "received_bad": float(h["received_bad"]) if h.get("received_bad") is not None else 0.0,
            "price_per_kg": price_kg,
            "total_price": tot_price,
            "payment_status": h["payment_status"] or "Pending",
            "product_photo": h["product_photo"] or "",
        })

    profile_data["active_orders"] = active_orders
    profile_data["purchase_history"] = purchase_history

    return profile_data


def get_nongrainrise_receiving_detail(warehouse_user_id, receiving_id):
    """
    Get full details for a Non-Grainrise Miller receiving history modal:
    - Section 1: Inbound Order Details
    - Section 2: Receiving Details
    """
    owned_branch_ids = get_manager_warehouse_profile_ids(warehouse_user_id)
    if not owned_branch_ids:
        return None

    placeholders = ",".join(["%s"] * len(owned_branch_ids))
    sql = f"""
        SELECT
            rh.receiving_id,
            rh.purchase_request_id,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.price_per_kg,
            rh.total_price,
            rh.status AS payment_status,
            rh.received_at,
            rh.receiving_proof_photo,
            wpr.product_name,
            wpr.product_description,
            wpr.product_photo,
            wpr.ordered_quantity,
            ngsc.business_name AS supplier_name,
            CONCAT_WS(' ', we.first_name, NULLIF(we.middle_initial, ''), we.last_name, NULLIF(we.suffix, '')) AS received_by_name
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_purchase_requests wpr
            ON wpr.purchase_request_id = rh.purchase_request_id
        LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
            ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = rh.received_by_employee_id
        WHERE rh.receiving_id = %s
          AND rh.warehouse_profile_id IN ({placeholders})
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [receiving_id] + list(owned_branch_ids))
        row = _row_to_dict(cursor)

    if not row:
        return None

    tot_rcvd = float(row["total_received"]) if row.get("total_received") is not None else 0.0
    tot_price = float(row["total_price"]) if row.get("total_price") is not None else 0.0
    price_kg = float(row["price_per_kg"]) if row.get("price_per_kg") is not None else 0.0

    return {
        "receiving_id": row["receiving_id"],
        "id": row["receiving_id"],
        "receiving_reference_no": row["receiving_reference_no"] or f"REC-{row['receiving_id']}",
        "received_at": str(row["received_at"]) if row.get("received_at") else None,
        "received_date": _format_date(row.get("received_at")),
        # Section 1
        "product_variant": row["product_name"] or "Grain Variant",
        "supplier": row["supplier_name"] or "External Supplier",
        "product_photo": row["product_photo"] or "",
        "original_order_quantity": f"{float(row['ordered_quantity']):,.2f} kg" if row.get("ordered_quantity") else "—",
        # Section 2
        "total_received": f"{tot_rcvd:,.2f} kg",
        "received_good": f"{float(row['received_good'] or 0):,.2f} kg",
        "received_bad": f"{float(row['received_bad'] or 0):,.2f} kg",
        "price_per_kg": f"₱{price_kg:,.2f}",
        "total_payable": f"₱{tot_price:,.2f}",
        "payment_status": row["payment_status"] or "Pending",
        "received_by": row["received_by_name"] or "Warehouse Staff",
        "receiving_proof_photo": row["receiving_proof_photo"] or "",
        "supplier_rating": None,
        "rating_comment": "Not available",
        "rating_attachment": "",
    }
