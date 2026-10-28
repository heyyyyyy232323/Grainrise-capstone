import logging
from django.db import connection

logger = logging.getLogger(__name__)


def _parse_capacity_kg(capacity_val):
    """
    Safely extract numeric kg capacity from varchar like '10,000 kg' or Decimal/float.
    """
    if capacity_val is None:
        return 0.0
    val_str = str(capacity_val).lower().replace(",", "").replace("kg", "").strip()
    try:
        return float(val_str)
    except (ValueError, TypeError):
        return 0.0


def _format_driver_name(first_name, middle_initial, last_name, suffix):
    """
    Format driver/buyer full name cleanly.
    """
    parts = []
    if first_name:
        parts.append(first_name.strip())
    if middle_initial:
        clean_mi = middle_initial.strip().replace(".", "")
        parts.append(f"{clean_mi}.")
    if last_name:
        parts.append(last_name.strip())
    if suffix:
        parts.append(suffix.strip())

    name = " ".join(parts).strip()
    return name if name else "Driver"


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


def list_warehouse_flc_drivers_with_capacity(warehouse_profile_ids):
    """
    List active drivers for the warehouse branch with real-time capacity calculation:
    - Active driver in warehouse_employees (position in ('driver', 'delivery_driver'), status='active')
    - Active vehicle assignment in warehouse_vehicle_assignee (status='active')
    - Vehicle status and capacity in warehouse_delivery_vehicle_management
    - Pending load = sum of effective delivery quantities from currently assigned, unfinished deliveries
    - Excludes completed, cancelled, or declined orders
    - Remaining capacity = vehicle capacity - pending load
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    sql = f"""
        SELECT
            we.warehouse_employee_id,
            we.first_name,
            we.middle_initial,
            we.last_name,
            we.suffix,
            we.contact_number,
            we.status AS driver_status,
            -- Vehicle assignee
            wva.assigned_id,
            -- Vehicle details
            v.vehicle_id,
            v.plate_number,
            v.model,
            v.type AS vehicle_type,
            v.capacity AS vehicle_capacity_str,
            v.status AS vehicle_status,
            -- Pending load calculation
            COALESCE(
                (
                    SELECT SUM(
                        COALESCE(
                            (
                                SELECT SUM(wor.quantity)
                                FROM warehouse_online_orders_returns wor
                                WHERE wor.online_order_id = wda_sub.online_order_id
                                  AND wor.status = 'Approved'
                            ),
                            woc.ordered_quantity
                        )
                    )
                    FROM (
                        SELECT
                            online_order_id,
                            delivery_vehicle_id,
                            warehouse_profile_id
                        FROM warehouse_driver_assignment
                        WHERE status = 'Pending'
                          AND delivery_vehicle_id = v.vehicle_id
                          AND warehouse_profile_id IN ({p_wh})
                        GROUP BY online_order_id, delivery_vehicle_id, warehouse_profile_id
                    ) wda_sub
                    INNER JOIN warehouse_online_customer woc
                        ON woc.online_order_id = wda_sub.online_order_id
                    WHERE woc.status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Declined')
                      AND woc.status = 'Assigned to driver'
                ),
                0.0
            ) AS pending_load
        FROM warehouse_employees we
        LEFT JOIN (
            SELECT wva1.*
            FROM warehouse_vehicle_assignee wva1
            INNER JOIN (
                SELECT driver_id, MAX(assigned_id) AS max_assigned_id
                FROM warehouse_vehicle_assignee
                WHERE status = 'active'
                  AND warehouse_profile_id IN ({p_wh})
                GROUP BY driver_id
            ) wva2 ON wva1.assigned_id = wva2.max_assigned_id
        ) wva ON wva.driver_id = we.warehouse_employee_id
        LEFT JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wva.vehicle_id
        WHERE we.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(we.position)) IN ('driver', 'delivery_driver')
          AND LOWER(TRIM(we.status)) = 'active'
        ORDER BY we.first_name ASC, we.last_name ASC
    """

    params = list(warehouse_profile_ids) * 3

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
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
        elif max_cap > 0 and remaining_cap <= 0:
            status_label = "Full"
        elif max_cap > 0 and pending_load > (max_cap * 0.75):
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
                "contact_number": r[5] or "—",
                "has_vehicle": has_vehicle,
                "vehicle_id": vehicle_id,
                "plate_number": plate_number or "",
                "vehicle_model": model or "",
                "vehicle_status": vehicle_status or "",
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


def get_warehouse_flc_driver_deliveries(warehouse_profile_ids, driver_id: int):
    """
    Retrieve live capacity details and currently assigned, unfinished deliveries for a specific driver.
    Filters:
    - Scoped strictly to authenticated warehouse_profile_ids
    - Excludes completed, cancelled, or declined orders
    - Uses approved replacement return quantity for approved product returns
    - Prevents duplicate delivery counting
    """
    drivers = list_warehouse_flc_drivers_with_capacity(warehouse_profile_ids)
    driver_info = next((d for d in drivers if int(d["driver_id"]) == int(driver_id)), None)
    if not driver_info:
        return None

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    deliveries_sql = f"""
        SELECT
            wda_sub.assignment_id,
            wda_sub.online_order_id,
            woc.batch_no,
            COALESCE(wp.product_name, 'Rice Variant') AS product_name,
            woc.ordered_quantity,
            COALESCE(
                (
                    SELECT SUM(wor.quantity)
                    FROM warehouse_online_orders_returns wor
                    WHERE wor.online_order_id = wda_sub.online_order_id
                      AND wor.status = 'Approved'
                ),
                woc.ordered_quantity
            ) AS effective_quantity,
            (
                SELECT COUNT(*)
                FROM warehouse_online_orders_returns wor
                WHERE wor.online_order_id = wda_sub.online_order_id
                  AND wor.status = 'Approved'
            ) AS approved_returns_count,
            woc.retailer_buyer_id,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            u.province,
            u.municipality,
            u.barangay,
            u.street_address,
            woc.status AS order_status,
            wda_sub.status AS assignment_status,
            wda_sub.created_at AS assigned_at
        FROM (
            SELECT
                MAX(assignment_id) AS assignment_id,
                online_order_id,
                delivery_vehicle_id,
                warehouse_profile_id,
                MAX(status) AS status,
                MAX(created_at) AS created_at
            FROM warehouse_driver_assignment
            WHERE status = 'Pending'
              AND warehouse_profile_id IN ({p_wh})
            GROUP BY online_order_id, delivery_vehicle_id, warehouse_profile_id
        ) wda_sub
        INNER JOIN warehouse_vehicle_assignee wva
            ON wva.vehicle_id = wda_sub.delivery_vehicle_id
           AND wva.driver_id = %s
           AND wva.warehouse_profile_id IN ({p_wh})
           AND wva.status = 'active'
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = wda_sub.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = woc.retailer_buyer_id
        WHERE woc.status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Declined')
          AND woc.status = 'Assigned to driver'
        ORDER BY wda_sub.created_at DESC, wda_sub.assignment_id DESC
    """

    params = list(warehouse_profile_ids) + [driver_id] + list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(deliveries_sql, params)
        rows = cursor.fetchall()

    deliveries = []
    for r in rows:
        assignment_id = r[0]
        online_order_id = r[1]
        batch_no = r[2] or f"Batch #{online_order_id}"
        product_name = r[3] or "Rice Variant"
        effective_qty = float(r[5]) if r[5] is not None else float(r[4] or 0.0)
        is_replacement = int(r[6] or 0) > 0

        buyer_parts = [p for p in [r[8], r[9], r[10], r[11]] if p]
        buyer_name = " ".join(buyer_parts).strip() or "Retailer Buyer"

        addr_parts = [r[15], r[14], r[13], r[12]]
        clean_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()]) or "Address not specified"

        deliveries.append(
            {
                "assignment_id": assignment_id,
                "online_order_id": online_order_id,
                "batch_no": batch_no,
                "product_name": product_name,
                "quantity": effective_qty,
                "quantity_formatted": f"{effective_qty:,.0f} kg" if effective_qty.is_integer() else f"{effective_qty:,.2f} kg",
                "is_replacement": is_replacement,
                "buyer_name": buyer_name,
                "buyer_type": "Retailer",
                "delivery_address": clean_addr,
                "status": r[16],
                "assigned_at": r[18].isoformat() if hasattr(r[18], "isoformat") else str(r[18]),
            }
        )

    return {
        "driver": driver_info,
        "deliveries": deliveries,
        "total": len(deliveries),
    }


def list_warehouse_flc_delivery_orders(
    warehouse_profile_ids,
    search=None,
    area=None,
    start_date=None,
    end_date=None,
    sort_by=None,
    limit=None,
    offset=None,
):
    """
    Retrieve branch orders with status = 'Forwarded to Logistics'.
    Supports filtering by search query, delivery area, date range, and sorting.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    where_clauses = [
        f"woc.warehouse_profile_id IN ({p_wh})",
        "woc.status = 'Forwarded to Logistics'",
    ]

    # Search filter
    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                woc.batch_no LIKE %s
                OR wp.product_name LIKE %s
                OR wp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR u.username LIKE %s
            )"""
        )
        params.extend([search_like] * 6)

    # Date range filters
    if start_date:
        where_clauses.append("woc.expected_arrival_date >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("woc.expected_arrival_date <= %s")
        params.append(end_date)

    # Delivery Area filter
    if area and area.lower() != "all":
        area_like = f"%{area.strip()}%"
        where_clauses.append(
            """(
                u.province LIKE %s
                OR u.municipality LIKE %s
                OR u.barangay LIKE %s
                OR u.street_address LIKE %s
            )"""
        )
        params.extend([area_like] * 4)

    where_sql = " AND ".join(where_clauses)

    # Order By SQL
    order_by_sql = "ORDER BY woc.expected_arrival_date ASC, woc.online_order_id ASC"
    if sort_by == "qty-desc":
        order_by_sql = "ORDER BY woc.ordered_quantity DESC, woc.online_order_id DESC"
    elif sort_by == "qty-asc":
        order_by_sql = "ORDER BY woc.ordered_quantity ASC, woc.online_order_id ASC"
    elif sort_by == "amount-desc":
        order_by_sql = "ORDER BY woc.total_price DESC, woc.online_order_id DESC"
    elif sort_by == "amount-asc":
        order_by_sql = "ORDER BY woc.total_price ASC, woc.online_order_id ASC"
    elif sort_by == "batch-asc":
        order_by_sql = "ORDER BY woc.batch_no ASC, woc.online_order_id ASC"
    elif sort_by == "batch-desc":
        order_by_sql = "ORDER BY woc.batch_no DESC, woc.online_order_id DESC"
    elif sort_by == "date-desc":
        order_by_sql = "ORDER BY woc.expected_arrival_date DESC, woc.online_order_id DESC"
    elif sort_by == "date-asc":
        order_by_sql = "ORDER BY woc.expected_arrival_date ASC, woc.online_order_id ASC"

    limit_sql = ""
    if limit is not None:
        try:
            lim = max(1, int(limit))
            limit_sql = f"LIMIT {lim}"
            if offset is not None:
                off = max(0, int(offset))
                limit_sql += f" OFFSET {off}"
        except (ValueError, TypeError):
            pass

    sql = f"""
        SELECT
            woc.online_order_id,
            woc.batch_no,
            woc.ordered_quantity,
            woc.fare_fee,
            woc.total_price,
            woc.expected_arrival_date,
            woc.status,
            woc.created_at,
            woc.retailer_buyer_id,
            wp.product_id,
            wp.product_name,
            wp.product_code,
            wp.unit_cost,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            u.username,
            u.contact_number,
            u.email,
            u.province,
            u.municipality,
            u.barangay,
            u.street_address,
            wop.payment_method,
            wop.status AS payment_status,
            wop.payment_reference,
            mor_app.quantity AS approved_return_quantity
        FROM warehouse_online_customer woc
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = woc.retailer_buyer_id
        LEFT JOIN warehouse_online_orders_payment wop
            ON wop.online_order_id = woc.online_order_id
        LEFT JOIN (
            SELECT online_order_id, SUM(quantity) AS quantity
            FROM warehouse_online_orders_returns
            WHERE status = 'Approved'
            GROUP BY online_order_id
        ) mor_app ON mor_app.online_order_id = woc.online_order_id
        WHERE {where_sql}
        {order_by_sql}
        {limit_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    orders = []
    for r in rows:
        online_order_id = r[0]
        batch_no = r[1] or f"Batch #{online_order_id}"
        original_qty = float(r[2]) if r[2] is not None else 0.0
        has_approved_return = r[27] is not None
        effective_qty = float(r[27]) if (has_approved_return and r[27] is not None) else original_qty

        fare = float(r[3]) if r[3] is not None else 0.0
        total = float(r[4]) if r[4] is not None else 0.0
        arrival_date = r[5]
        product_name = r[10] or "Rice Variant"
        unit_cost = float(r[12]) if r[12] is not None else 0.0

        u_parts = [p for p in [r[13], r[14], r[15], r[16]] if p]
        retailer_name = " ".join(u_parts).strip() or r[17] or "Retailer Buyer"

        addr_parts = [r[23], r[22], r[21], r[20]]
        clean_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()]) or "Address not specified"

        orders.append(
            {
                "online_order_id": online_order_id,
                "id": online_order_id,
                "batch_no": batch_no,
                "batch": batch_no,
                "ordered_quantity": effective_qty,
                "original_ordered_quantity": original_qty,
                "is_replacement": has_approved_return,
                "ordered_quantity_formatted": f"{effective_qty:,.0f} kg" if effective_qty.is_integer() else f"{effective_qty:,.2f} kg",
                "fare_fee": fare,
                "fare_fee_formatted": f"₱{fare:,.2f}",
                "total_price": total,
                "total_price_formatted": f"₱{total:,.2f}",
                "expected_arrival_date": arrival_date.isoformat() if hasattr(arrival_date, "isoformat") else str(arrival_date or ""),
                "expected_arrival_date_formatted": arrival_date.strftime("%b %d, %Y") if hasattr(arrival_date, "strftime") else str(arrival_date or "—"),
                "status": r[6],
                "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
                "buyer_type": "Retailer",
                "buyer_name": retailer_name,
                "retailer": retailer_name,
                "contact_number": r[18] or "—",
                "email": r[19] or "—",
                "delivery_address": clean_addr,
                "product_id": r[9],
                "product_name": product_name,
                "variant": product_name,
                "product_code": r[11] or "—",
                "unit_cost": unit_cost,
                "unit_cost_formatted": f"₱{unit_cost:,.2f}",
                "payment_method": r[24] or "COD",
                "payment_status": r[25] or "Pending",
                "payment_reference": r[26] or "—",
            }
        )

    return orders


def list_warehouse_flc_product_returns(warehouse_profile_ids, limit=50):
    """
    Retrieve branch pending returns from warehouse_online_orders_returns.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    sql = f"""
        SELECT
            woor.return_id,
            woor.return_reference_no,
            woor.quantity,
            woor.reason,
            woor.status,
            woor.created_at,
            woc.online_order_id,
            woc.batch_no,
            wp.product_name,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            u.username
        FROM warehouse_online_orders_returns woor
        JOIN warehouse_online_customer woc
            ON woc.online_order_id = woor.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = woor.retailer_buyer_id
        WHERE woor.warehouse_profile_id IN ({p_wh})
          AND woor.status = 'Pending'
        ORDER BY woor.return_id DESC
        LIMIT %s
    """

    params = list(warehouse_profile_ids) + [limit]

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    returns = []
    for r in rows:
        return_id = r[0]
        return_ref = r[1] or f"RET-{return_id}"
        qty = float(r[2] or 0.0)
        batch_no = r[7] or f"Order #{r[6]}"
        product_name = r[8] or "Rice Variant"

        u_parts = [p for p in [r[9], r[10], r[11], r[12]] if p]
        buyer_name = " ".join(u_parts).strip() or r[13] or "Retailer Buyer"

        returns.append(
            {
                "return_id": return_id,
                "id": return_id,
                "return_reference_no": return_ref,
                "order_no": batch_no,
                "orderNo": batch_no,
                "batch_no": batch_no,
                "variant": product_name,
                "product_name": product_name,
                "buyer": buyer_name,
                "buyer_name": buyer_name,
                "retailer": buyer_name,
                "quantity": qty,
                "qty": f"{qty:,.0f} kg",
                "quantity_formatted": f"{qty:,.0f} kg",
                "reason": r[3] or "",
                "status": r[4],
                "created_at": r[5].isoformat() if hasattr(r[5], "isoformat") else str(r[5]),
            }
        )

    return returns


def get_warehouse_flc_dashboard_data(warehouse_profile_ids, warehouse_user_id=None):
    """
    Retrieve real, branch-scoped Warehouse FLC dashboard metrics and dataset summaries.
    Strictly isolated to warehouse_profile_ids.
    """
    if not warehouse_profile_ids:
        return {
            "kpis": {
                "orders_awaiting_assignment": 0,
                "unassigned_vehicles": 0,
                "pending_returns": 0,
                "pending_reimbursements": 0,
            },
            "driver_assignment": {
                "orders_awaiting": 0,
                "orders_assigned": 0,
                "total_orders": 0,
                "percentage": 0,
                "summary": "No forwarded orders awaiting driver assignment.",
            },
            "order_status_breakdown": {
                "total": 0,
                "pending": {"count": 0, "percentage": 0},
                "forwarded": {"count": 0, "percentage": 0},
                "assigned": {"count": 0, "percentage": 0},
                "completed": {"count": 0, "percentage": 0},
            },
            "load_utilization": [],
            "delivery_orders": [],
            "product_returns": [],
        }

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    wh_params = list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        # 1. Orders Awaiting Assignment: Count orders with status = 'Forwarded to Logistics'
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM warehouse_online_customer
            WHERE warehouse_profile_id IN ({p_wh})
              AND status = 'Forwarded to Logistics'
            """,
            wh_params,
        )
        orders_awaiting = int(cursor.fetchone()[0] or 0)

        # 2. Unassigned Vehicles: Count active, branch-designated vehicles without active driver assignee
        cursor.execute(
            f"""
            SELECT COUNT(DISTINCT v.vehicle_id)
            FROM warehouse_delivery_vehicle_management v
            INNER JOIN warehouse_delivery_vehicle_branches vb
                ON vb.vehicle_id = v.vehicle_id AND vb.warehouse_profile_id IN ({p_wh})
            LEFT JOIN warehouse_vehicle_assignee wva
                ON wva.vehicle_id = v.vehicle_id
               AND wva.warehouse_profile_id IN ({p_wh})
               AND wva.status = 'active'
            WHERE v.status = 'active'
              AND wva.assigned_id IS NULL
            """,
            wh_params * 2,
        )
        unassigned_vehicles = int(cursor.fetchone()[0] or 0)

        # 3. Pending Return Issues: Count returns with status = 'Pending'
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM warehouse_online_orders_returns
            WHERE warehouse_profile_id IN ({p_wh})
              AND status = 'Pending'
            """,
            wh_params,
        )
        pending_returns = int(cursor.fetchone()[0] or 0)

        # 4. Pending Reimbursements: Count reimbursements with status = 'requested'
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM warehouse_reimbursement
            WHERE warehouse_profile_id IN ({p_wh})
              AND LOWER(status) = 'requested'
            """,
            wh_params,
        )
        pending_reimbursements = int(cursor.fetchone()[0] or 0)

        # 5. Driver Assignment Progress:
        # Count orders in warehouse_online_customer with status = 'Assigned to driver'
        cursor.execute(
            f"""
            SELECT COUNT(DISTINCT woc.online_order_id)
            FROM warehouse_online_customer woc
            INNER JOIN warehouse_driver_assignment wda
                ON wda.online_order_id = woc.online_order_id
               AND wda.warehouse_profile_id = woc.warehouse_profile_id
            WHERE woc.warehouse_profile_id IN ({p_wh})
              AND woc.status = 'Assigned to driver'
            """,
            wh_params,
        )
        orders_assigned = int(cursor.fetchone()[0] or 0)

        total_assignable = orders_awaiting + orders_assigned
        if total_assignable > 0:
            assignment_percentage = round((orders_assigned / total_assignable) * 100)
            if orders_awaiting == 0:
                assignment_summary = "All forwarded orders currently have assigned drivers."
            else:
                assignment_summary = f"{orders_assigned} of {total_assignable} forwarded orders currently assigned to drivers."
        else:
            assignment_percentage = 0
            assignment_summary = "No forwarded orders awaiting driver assignment."

        # 6. Order Status Breakdown
        cursor.execute(
            f"""
            SELECT
                COUNT(CASE WHEN woc.status IN ('Ordered', 'pending', 'Add to cart') THEN 1 END) AS count_pending,
                COUNT(CASE WHEN woc.status = 'Forwarded to Logistics' THEN 1 END) AS count_forwarded,
                COUNT(CASE WHEN woc.status = 'Assigned to driver' THEN 1 END) AS count_assigned,
                COUNT(CASE WHEN woc.status IN ('Delivered', 'Completed') THEN 1 END) AS count_completed
            FROM warehouse_online_customer woc
            WHERE woc.warehouse_profile_id IN ({p_wh})
              AND woc.status != 'Declined'
            """,
            wh_params,
        )
        status_row = cursor.fetchone()
        c_pending = int(status_row[0] or 0)
        c_forwarded = int(status_row[1] or 0)
        c_assigned = int(status_row[2] or 0)
        c_completed = int(status_row[3] or 0)
        total_status = c_pending + c_forwarded + c_assigned + c_completed

        if total_status > 0:
            pct_pending = round((c_pending / total_status) * 100)
            pct_forwarded = round((c_forwarded / total_status) * 100)
            pct_assigned = round((c_assigned / total_status) * 100)
            pct_completed = max(0, 100 - (pct_pending + pct_forwarded + pct_assigned))
        else:
            pct_pending = pct_forwarded = pct_assigned = pct_completed = 0

    # 7. Load Utilization
    raw_drivers = list_warehouse_flc_drivers_with_capacity(warehouse_profile_ids)
    load_utilization = []
    for d in raw_drivers:
        driver_name = d.get("name") or "Driver"
        max_cap = float(d.get("max_capacity") or d.get("max") or 0.0)
        curr_load = float(d.get("current_load") or d.get("capacity") or 0.0)
        rem_cap = float(d.get("remaining_capacity") or max(0.0, max_cap - curr_load))
        pct_used = int(d.get("pct_used") or 0)
        status_label = d.get("status") or ("No Vehicle" if not d.get("has_vehicle") else "Available")

        load_utilization.append({
            "driver_id": d.get("driver_id") or d.get("id"),
            "driver_name": driver_name,
            "has_vehicle": bool(d.get("has_vehicle")),
            "vehicle_id": d.get("vehicle_id"),
            "plate_number": d.get("plate_number") or "",
            "model": d.get("vehicle_model") or "",
            "max_capacity_kg": max_cap,
            "pending_load_kg": curr_load,
            "remaining_capacity_kg": rem_cap,
            "utilization_percentage": pct_used,
            "status_label": status_label,
            "load_display": f"{curr_load:,.0f} / {max_cap:,.0f} kg" if max_cap else "0 / 0 kg",
        })

    # 8. Delivery Management Table (top 5 forwarded orders)
    delivery_orders_all = list_warehouse_flc_delivery_orders(warehouse_profile_ids, limit=5)
    delivery_table = []
    for o in delivery_orders_all:
        delivery_table.append({
            "online_order_id": o.get("online_order_id") or o.get("id"),
            "batch_no": o.get("batch_no") or o.get("batch") or "—",
            "retailer": o.get("retailer") or o.get("buyer_name") or "Retailer",
            "variant": o.get("product_name") or o.get("variant") or "—",
            "qty": o.get("ordered_quantity_formatted") or f"{float(o.get('ordered_quantity') or 0):,.0f} kg",
            "arrival": o.get("expected_arrival_date_formatted") or str(o.get("expected_arrival_date") or "—"),
        })

    # 9. Product Returns Table (top 5 pending returns)
    returns_all = list_warehouse_flc_product_returns(warehouse_profile_ids, limit=5)
    returns_table = []
    for r in returns_all:
        returns_table.append({
            "return_id": r.get("return_id") or r.get("id"),
            "variant": r.get("product_name") or r.get("variant") or "—",
            "order_no": r.get("orderNo") or r.get("batch_no") or r.get("return_reference_no") or "—",
            "return_reference_no": r.get("return_reference_no") or "—",
            "buyer": r.get("buyer") or r.get("buyer_name") or "Buyer",
            "qty": r.get("quantity_formatted") or r.get("qty") or f"{float(r.get('quantity') or 0):,.0f} kg",
        })

    return {
        "kpis": {
            "orders_awaiting_assignment": orders_awaiting,
            "unassigned_vehicles": unassigned_vehicles,
            "pending_returns": pending_returns,
            "pending_reimbursements": pending_reimbursements,
        },
        "driver_assignment": {
            "orders_awaiting": orders_awaiting,
            "orders_assigned": orders_assigned,
            "total_orders": total_assignable,
            "percentage": assignment_percentage,
            "summary": assignment_summary,
        },
        "order_status_breakdown": {
            "total": total_status,
            "pending": {"count": c_pending, "percentage": pct_pending},
            "forwarded": {"count": c_forwarded, "percentage": pct_forwarded},
            "assigned": {"count": c_assigned, "percentage": pct_assigned},
            "completed": {"count": c_completed, "percentage": pct_completed},
        },
        "load_utilization": load_utilization,
        "delivery_orders": delivery_table,
        "product_returns": returns_table,
    }


def list_warehouse_flc_product_returns(
    warehouse_profile_ids,
    search=None,
    variant_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
    limit=None,
    offset=None,
):
    """
    Retrieve product return requests scoped strictly to the authenticated warehouse branches.
    Only returns with status = 'Pending' are displayed per specification.
    Supports filtering by search query, variant filter, date range, and sorting.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    where_clauses = [
        f"wor.warehouse_profile_id IN ({p_wh})",
        "wor.status = 'Pending'",
    ]

    if variant_filter and variant_filter != "all":
        where_clauses.append("LOWER(TRIM(wp.product_name)) = LOWER(TRIM(%s))")
        params.append(variant_filter)

    if start_date:
        where_clauses.append("DATE(wor.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(wor.created_at) <= %s")
        params.append(end_date)

    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                wor.return_reference_no LIKE %s
                OR wor.receiving_reference_no LIKE %s
                OR woc.batch_no LIKE %s
                OR wp.product_name LIKE %s
                OR wp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR u.username LIKE %s
            )"""
        )
        params.extend([search_like] * 8)

    where_sql = " AND ".join(where_clauses)

    order_by_sql = "ORDER BY wor.created_at DESC, wor.return_id DESC"
    if sort_by == "variant-asc":
        order_by_sql = "ORDER BY wp.product_name ASC, wor.return_id DESC"
    elif sort_by == "variant-desc":
        order_by_sql = "ORDER BY wp.product_name DESC, wor.return_id DESC"
    elif sort_by == "batch-asc":
        order_by_sql = "ORDER BY woc.batch_no ASC, wor.return_id DESC"
    elif sort_by == "batch-desc":
        order_by_sql = "ORDER BY woc.batch_no DESC, wor.return_id DESC"
    elif sort_by == "qty-desc":
        order_by_sql = "ORDER BY wor.quantity DESC, wor.return_id DESC"
    elif sort_by == "qty-asc":
        order_by_sql = "ORDER BY wor.quantity ASC, wor.return_id DESC"
    elif sort_by == "cost-desc":
        order_by_sql = "ORDER BY (wor.quantity * COALESCE(wp.unit_cost, 0.0)) DESC, wor.return_id DESC"
    elif sort_by == "cost-asc":
        order_by_sql = "ORDER BY (wor.quantity * COALESCE(wp.unit_cost, 0.0)) ASC, wor.return_id DESC"

    limit_sql = ""
    if limit is not None:
        try:
            lim = max(1, int(limit))
            limit_sql = f"LIMIT {lim}"
            if offset is not None:
                off = max(0, int(offset))
                limit_sql += f" OFFSET {off}"
        except (ValueError, TypeError):
            pass

    sql = f"""
        SELECT
            wor.return_id,
            wor.return_reference_no,
            wor.receiving_reference_no,
            wor.quantity AS return_quantity,
            wor.reason AS return_reason,
            wor.proof AS return_proof,
            wor.status AS return_status,
            wor.created_at AS return_created_at,
            -- Original Online Order
            woc.online_order_id,
            woc.batch_no,
            woc.ordered_quantity,
            woc.fare_fee,
            woc.total_price,
            woc.expected_arrival_date,
            woc.status AS order_status,
            -- Product
            wp.product_id,
            wp.product_name,
            wp.product_code,
            wp.unit_cost,
            wp.stock_quantity AS product_stock,
            -- Retailer buyer info
            wor.retailer_buyer_id,
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
            -- Delivered By Driver
            wor.delivered_by,
            we.first_name AS driver_first,
            we.middle_initial AS driver_mi,
            we.last_name AS driver_last,
            we.suffix AS driver_suffix,
            we.contact_number AS driver_contact,
            v.plate_number AS driver_plate_number,
            v.model AS driver_vehicle_model,
            -- Payment
            wop.payment_method,
            wop.status AS payment_status,
            wop.payment_reference
        FROM warehouse_online_orders_returns wor
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = wor.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = wor.retailer_buyer_id
        LEFT JOIN warehouse_vehicle_assignee wva
            ON wva.assigned_id = wor.delivered_by
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = COALESCE(wva.driver_id, wor.delivered_by)
        LEFT JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wva.vehicle_id
        LEFT JOIN warehouse_online_orders_payment wop
            ON wop.online_order_id = woc.online_order_id
        WHERE {where_sql}
        {order_by_sql}
        {limit_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    returns = []
    for r in rows:
        buyer_name = _format_driver_name(r[21], r[22], r[23], r[24]) or f"Retailer #{r[20]}"
        contact = r[25] or "—"
        email = r[26] or "—"
        addr_parts = [r[30], r[29], r[28], r[27]]
        clean_addr = ", ".join([str(p).strip() for p in addr_parts if p and str(p).strip()])
        if not clean_addr:
            clean_addr = "Address not specified"

        driver_name = _format_driver_name(r[32], r[33], r[34], r[35]) or "N/A"
        driver_plate = r[37] or "N/A"
        driver_model = r[38] or ""
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
                # Retailer Buyer Info
                "buyer_type": "Retailer",
                "buyer_name": buyer_name,
                "buyer": buyer_name,
                "retailer": buyer_name,
                "contact_number": contact,
                "email": email,
                "delivery_address": clean_addr,
                # Delivery Info
                "delivered_by": r[31],
                "driver_name": driver_name,
                "driver_display": driver_display,
                "driver_contact": r[36] or "—",
                "driver_plate": driver_plate,
                "driver_model": driver_model,
                # Payment
                "payment_method": r[39] or "N/A",
                "payment_status": r[40] or "N/A",
                "payment_reference": r[41] or "—",
            }
        )

    return returns


def list_warehouse_flc_return_variants(warehouse_profile_ids):
    """
    Retrieve unique product variants present in Pending warehouse product returns.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT DISTINCT wp.product_name
        FROM warehouse_online_orders_returns wor
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = wor.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        WHERE wor.warehouse_profile_id IN ({p_wh})
          AND wor.status = 'Pending'
          AND wp.product_name IS NOT NULL
        ORDER BY wp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, list(warehouse_profile_ids))
        rows = cursor.fetchall()

    return [r[0] for r in rows if r[0]]


def list_warehouse_flc_vehicle_assigned_history(
    warehouse_profile_ids,
    search=None,
    status_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve all vehicle assignment records for the authenticated Warehouse branch.
    Includes active, changed, and historical assignments.

    DATABASE TABLES:
    - warehouse_vehicle_assignee wva
    - warehouse_delivery_vehicle_management v
    - warehouse_employees we
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    where_clauses = [f"wva.warehouse_profile_id IN ({p_wh})"]

    # Status filter: All, Active, Changed
    if status_filter and status_filter.lower() in ("active", "changed"):
        where_clauses.append("LOWER(wva.status) = LOWER(%s)")
        params.append(status_filter.strip())

    # Date range filter on assignment creation date (created_at)
    if start_date:
        where_clauses.append("DATE(wva.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(wva.created_at) <= %s")
        params.append(end_date)

    # Search filter: vehicle model, plate number, or driver name
    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                v.model LIKE %s
                OR v.plate_number LIKE %s
                OR we.first_name LIKE %s
                OR we.last_name LIKE %s
                OR CONCAT(we.first_name, ' ', we.last_name) LIKE %s
            )"""
        )
        params.extend([search_like] * 5)

    where_sql = " AND ".join(where_clauses)

    # Sorting
    order_by_sql = "ORDER BY wva.created_at DESC, wva.assigned_id DESC"
    if sort_by == "model-asc":
        order_by_sql = "ORDER BY v.model ASC, wva.created_at DESC"
    elif sort_by == "model-desc":
        order_by_sql = "ORDER BY v.model DESC, wva.created_at DESC"
    elif sort_by == "plate-asc":
        order_by_sql = "ORDER BY v.plate_number ASC, wva.created_at DESC"
    elif sort_by == "plate-desc":
        order_by_sql = "ORDER BY v.plate_number DESC, wva.created_at DESC"
    elif sort_by == "driver-asc":
        order_by_sql = "ORDER BY we.first_name ASC, we.last_name ASC, wva.created_at DESC"
    elif sort_by == "driver-desc":
        order_by_sql = "ORDER BY we.first_name DESC, we.last_name DESC, wva.created_at DESC"
    elif sort_by == "date-desc":
        order_by_sql = "ORDER BY wva.created_at DESC, wva.assigned_id DESC"
    elif sort_by == "date-asc":
        order_by_sql = "ORDER BY wva.created_at ASC, wva.assigned_id ASC"

    sql = f"""
        SELECT
            wva.assigned_id,
            wva.status AS assignment_status,
            wva.created_at AS assigned_on,
            wva.updated_at,
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
            we.warehouse_employee_id AS driver_id,
            we.first_name AS driver_first_name,
            we.middle_initial AS driver_middle_initial,
            we.last_name AS driver_last_name,
            we.suffix AS driver_suffix,
            we.email AS driver_email,
            we.contact_number AS driver_contact_number
        FROM warehouse_vehicle_assignee wva
        INNER JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wva.vehicle_id
        INNER JOIN warehouse_employees we
            ON we.warehouse_employee_id = wva.driver_id
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


def list_warehouse_flc_fulfillment_variants(warehouse_profile_ids):
    """
    Retrieve distinct product variants associated with receiving history for the authenticated branch.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT DISTINCT wp.product_name
        FROM warehouse_online_customer_receiving_history rh
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = rh.online_order_id
        INNER JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        WHERE rh.warehouse_profile_id IN ({p_wh})
          AND wp.product_name IS NOT NULL
        ORDER BY wp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, list(warehouse_profile_ids))
        rows = cursor.fetchall()
        variants = [r[0] for r in rows if r[0]]

    # Fallback to branch-wide products if receiving history is still sparse
    if not variants:
        sql_fallback = f"""
            SELECT DISTINCT product_name
            FROM warehouse_products
            WHERE warehouse_profile_id IN ({p_wh})
              AND product_name IS NOT NULL
            ORDER BY product_name ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_fallback, list(warehouse_profile_ids))
            variants = [r[0] for r in cursor.fetchall() if r[0]]

    return variants


def list_warehouse_flc_fulfillment_history(
    warehouse_profile_ids,
    search=None,
    variant_filter=None,
    start_date=None,
    end_date=None,
    sort_by=None,
):
    """
    Retrieve fulfillment/receiving history records scoped strictly to the authenticated Warehouse branch.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    where_clauses = [f"rh.warehouse_profile_id IN ({p_wh})"]

    # Date range filter on rh.received_at
    if start_date:
        where_clauses.append("DATE(rh.received_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(rh.received_at) <= %s")
        params.append(end_date)

    # Variant filter
    if variant_filter and variant_filter.strip().lower() != "all":
        where_clauses.append("LOWER(wp.product_name) = LOWER(%s)")
        params.append(variant_filter.strip())

    # Search filter: receiving reference, order batch, product name/code, customer name
    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                rh.receiving_reference_no LIKE %s
                OR woc.batch_no LIKE %s
                OR wp.product_name LIKE %s
                OR wp.product_code LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR CONCAT(u.first_name, ' ', u.last_name) LIKE %s
            )"""
        )
        params.extend([search_like] * 7)

    where_sql = " AND ".join(where_clauses)

    # Sorting
    order_by_sql = "ORDER BY rh.received_at DESC, rh.receiving_id DESC"
    if sort_by == "variant-asc":
        order_by_sql = "ORDER BY wp.product_name ASC, rh.received_at DESC"
    elif sort_by == "variant-desc":
        order_by_sql = "ORDER BY wp.product_name DESC, rh.received_at DESC"
    elif sort_by == "customer-asc":
        order_by_sql = "ORDER BY u.first_name ASC, u.last_name ASC, rh.received_at DESC"
    elif sort_by == "customer-desc":
        order_by_sql = "ORDER BY u.first_name DESC, u.last_name DESC, rh.received_at DESC"
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
    elif sort_by == "payable-desc":
        order_by_sql = "ORDER BY rh.payables DESC, rh.received_at DESC"
    elif sort_by == "payable-asc":
        order_by_sql = "ORDER BY rh.payables ASC, rh.received_at DESC"

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
            woc.online_order_id,
            woc.batch_no,
            woc.ordered_quantity,
            woc.fare_fee,
            woc.total_price,
            woc.expected_arrival_date,
            woc.status AS order_status,
            -- Product Info
            wp.product_id,
            wp.product_name,
            wp.product_code,
            wp.unit_cost,
            -- Buyer Info
            rh.retailer_buyer_id,
            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,
            -- Driver & Vehicle from vehicle_assignee_id
            wva.assigned_id AS vehicle_assignee_id,
            wva.status AS assignment_status,
            v.model AS vehicle_model,
            v.plate_number AS vehicle_plate_number,
            v.type AS vehicle_type,
            we.first_name AS driver_first_name,
            we.middle_initial AS driver_middle_initial,
            we.last_name AS driver_last_name,
            we.suffix AS driver_suffix
        FROM warehouse_online_customer_receiving_history rh
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = rh.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = rh.retailer_buyer_id
        LEFT JOIN warehouse_vehicle_assignee wva
            ON wva.assigned_id = rh.vehicle_assignee_id
        LEFT JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wva.vehicle_id
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = wva.driver_id
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
        procurement_cost = float(r[19]) if r[19] is not None else 0.0
        total_price = float(r[13]) if r[13] is not None else 0.0

        # Calculate actual sales unit price: (total_price - fare_fee) / ordered_quantity
        if ord_qty > 0 and total_price > 0:
            selling_unit_price = (total_price - fare_fee) / ord_qty
        else:
            selling_unit_price = procurement_cost

        buyer_name = _format_driver_name(r[21], r[22], r[23], r[24]) or f"Retailer #{r[20]}"
        driver_name = _format_driver_name(r[30], r[31], r[32], r[33]) if r[30] else "Unassigned"

        rec_at = r[8]
        rec_at_iso = rec_at.isoformat() if rec_at else None
        rec_at_formatted = rec_at.strftime("%b %d, %Y") if rec_at else "—"

        exp_date = r[14]
        exp_date_iso = exp_date.isoformat() if exp_date else None
        exp_date_formatted = exp_date.strftime("%b %d, %Y") if exp_date else "—"

        status_raw = str(r[6] or "Unpaid").strip()
        status_clean = "Paid" if status_raw.lower() == "paid" else "Unpaid"

        payables_val = float(r[5]) if r[5] is not None else (good_rec * selling_unit_price)

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
            "payables": payables_val,
            "payables_formatted": f"₱{payables_val:,.2f}",
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
            "selling_unit_price": selling_unit_price,
            "selling_unit_price_formatted": f"₱{selling_unit_price:,.2f}",
            "unit_cost": selling_unit_price,
            "unit_cost_formatted": f"₱{selling_unit_price:,.2f}",
            "total_price": total_price,
            "total_price_formatted": f"₱{total_price:,.2f}",
            "total_amount": total_price,
            "total_amount_formatted": f"₱{total_price:,.2f}",
            "expected_arrival_date": exp_date_iso,
            "expected_arrival_date_formatted": exp_date_formatted,
            "order_status": r[15],
            "product_id": r[16],
            "product_name": r[17] or "Variant",
            "variant": r[17] or "Variant",
            "product_code": r[18] or "—",
            "customer_type": "Retailer",
            "buyer_type": "Retailer",
            "customer_name": buyer_name,
            "customer": buyer_name,
            "buyer_name": buyer_name,
            "vehicle_assignee_id": r[25],
            "assignment_status": r[26],
            "assigned_vehicle_model": r[27] or "—",
            "vehicle_model": r[27] or "—",
            "plate_number": r[28] or "—",
            "vehicle_type": r[29] or "—",
            "assigned_driver": driver_name,
            "driver_name": driver_name,
        })

    return history


def list_warehouse_flc_vehicles(
    warehouse_profile_ids,
    warehouse_user_id=None,
    search=None,
    status_filter=None,
    sort_by=None,
):
    """
    List delivery vehicles scoped strictly to the authenticated Warehouse branch.
    Matches Miller FLC Vehicle Assignee list behavior.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)

    where_clauses = [f"vb.warehouse_profile_id IN ({p_wh})"]

    if warehouse_user_id:
        where_clauses.append("v.user_id = %s")
        params.append(warehouse_user_id)

    # Status Filter
    if status_filter and str(status_filter).strip().lower() != "all":
        clean_status = str(status_filter).strip().lower()
        if clean_status in ("for maintenance", "maintenance"):
            where_clauses.append("LOWER(v.status) = 'for maintenance'")
        elif clean_status in ("active", "inactive"):
            where_clauses.append("LOWER(v.status) = %s")
            params.append(clean_status)

    # Search Filter
    if search and str(search).strip():
        term = f"%{str(search).strip()}%"
        where_clauses.append(
            """(
                v.plate_number LIKE %s
                OR v.model LIKE %s
                OR v.capacity LIKE %s
                OR CONCAT_WS(' ', we.first_name, we.last_name) LIKE %s
            )"""
        )
        params.extend([term, term, term, term])

    where_sql = " AND ".join(where_clauses)

    # Sorting
    sort_key = str(sort_by or "").strip().lower()
    if sort_key == "model_asc":
        order_sql = "ORDER BY v.model ASC, v.vehicle_id DESC"
    elif sort_key == "model_desc":
        order_sql = "ORDER BY v.model DESC, v.vehicle_id DESC"
    elif sort_key == "plate_asc":
        order_sql = "ORDER BY v.plate_number ASC, v.vehicle_id DESC"
    elif sort_key == "plate_desc":
        order_sql = "ORDER BY v.plate_number DESC, v.vehicle_id DESC"
    elif sort_key == "oldest":
        order_sql = "ORDER BY v.vehicle_id ASC"
    else:
        # Default newest first
        order_sql = "ORDER BY v.vehicle_id DESC"

    sql = f"""
        SELECT DISTINCT
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
            wva.assigned_id,
            wva.warehouse_profile_id AS assignee_branch_id,
            wva.driver_id,
            we.first_name AS driver_first_name,
            we.middle_initial AS driver_middle_initial,
            we.last_name AS driver_last_name,
            we.suffix AS driver_suffix,
            we.email AS driver_email,
            we.contact_number AS driver_contact_number,
            wp_assign.business_name AS assignee_branch_name
        FROM warehouse_delivery_vehicle_management v
        INNER JOIN warehouse_delivery_vehicle_branches vb
            ON vb.vehicle_id = v.vehicle_id
        LEFT JOIN warehouse_vehicle_assignee wva
            ON wva.vehicle_id = v.vehicle_id AND wva.status = 'active'
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = wva.driver_id
        LEFT JOIN warehouse_profiles wp_assign
            ON wp_assign.warehouse_profile_id = wva.warehouse_profile_id
        WHERE {where_sql}
        {order_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    vehicles = []
    seen_ids = set()
    for r in rows:
        vid = r[0]
        if vid in seen_ids:
            continue
        seen_ids.add(vid)

        driver_name = _format_driver_name(r[15], r[16], r[17], r[18]) if r[15] else "N/A"
        photo_raw = r[7]
        photo_url = _resolve_photo_url(photo_raw)

        vehicles.append(
            {
                "vehicle_id": vid,
                "id": vid,
                "user_id": r[1],
                "type": r[2] or "Truck",
                "number_of_wheels": r[3] or 4,
                "model": r[4] or "Vehicle Model",
                "plate_number": r[5] or "—",
                "capacity": r[6] or "—",
                "photo": photo_raw,
                "photo_url": photo_url,
                "status": (r[8] or "active").lower(),
                "inactive_reason": r[9],
                "maintenance_reason": r[10],
                "updated_at": r[11].isoformat() if r[11] else None,
                "assigned_id": r[12],
                "assignee_branch_id": r[13],
                "assigned_driver_id": r[14],
                "assigned_driver": driver_name,
                "assigned_driver_name": driver_name,
                "driver_name": driver_name,
                "driver_email": r[19] or "—",
                "driver_contact_number": r[20] or "—",
                "assignee_branch_name": r[21] or "—",
            }
        )

    return vehicles


def get_warehouse_flc_vehicle_detail(vehicle_id: int, warehouse_profile_ids, warehouse_user_id=None):
    """
    Retrieve full vehicle details including designated branches and active driver assignee.
    Scoped strictly to the authenticated Warehouse branch.
    """
    if not warehouse_profile_ids or not vehicle_id:
        return None

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids) + [vehicle_id]

    where_extra = ""
    if warehouse_user_id:
        where_extra = " AND v.user_id = %s"
        params.append(warehouse_user_id)

    sql = f"""
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
        FROM warehouse_delivery_vehicle_management v
        INNER JOIN warehouse_delivery_vehicle_branches vb
            ON vb.vehicle_id = v.vehicle_id AND vb.warehouse_profile_id IN ({p_wh})
        WHERE v.vehicle_id = %s
        {where_extra}
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = cursor.fetchone()

    if not row:
        return None

    # Retrieve all designated branches for this vehicle
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT
                vb.warehouse_profile_id,
                COALESCE(wp.business_name, CONCAT('Branch #', vb.warehouse_profile_id)) AS business_name,
                wp.organization_name,
                wp.province,
                wp.municipality,
                wp.barangay,
                wp.street_address
            FROM warehouse_delivery_vehicle_branches vb
            LEFT JOIN warehouse_profiles wp
                ON vb.warehouse_profile_id = wp.warehouse_profile_id
            WHERE vb.vehicle_id = %s
            ORDER BY wp.business_name ASC, vb.warehouse_profile_id ASC
            """,
            [vehicle_id],
        )
        branches_raw = cursor.fetchall()

    branches = [
        {
            "warehouse_profile_id": b[0],
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
                wva.assigned_id,
                wva.warehouse_profile_id,
                wva.driver_id,
                wva.status,
                wva.created_at,
                wva.updated_at,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.email,
                we.contact_number,
                wp.business_name AS assignee_branch_name
            FROM warehouse_vehicle_assignee wva
            LEFT JOIN warehouse_employees we
                ON we.warehouse_employee_id = wva.driver_id
            LEFT JOIN warehouse_profiles wp
                ON wp.warehouse_profile_id = wva.warehouse_profile_id
            WHERE wva.vehicle_id = %s
              AND wva.status = 'active'
            ORDER BY wva.assigned_id DESC
            LIMIT 1
            """,
            [vehicle_id],
        )
        assignee_row = cursor.fetchone()

    assigned_driver = None
    assigned_driver_name = "N/A"
    if assignee_row and assignee_row[6]:
        assigned_driver_name = _format_driver_name(
            assignee_row[6], assignee_row[7], assignee_row[8], assignee_row[9]
        )
        assigned_driver = {
            "assigned_id": assignee_row[0],
            "warehouse_profile_id": assignee_row[1],
            "driver_id": assignee_row[2],
            "status": assignee_row[3],
            "created_at": assignee_row[4].isoformat() if assignee_row[4] else None,
            "updated_at": assignee_row[5].isoformat() if assignee_row[5] else None,
            "full_name": assigned_driver_name,
            "first_name": assignee_row[6],
            "last_name": assignee_row[8],
            "email": assignee_row[10] or "—",
            "contact_number": assignee_row[11] or "—",
            "branch_name": assignee_row[12] or "—",
        }

    photo_raw = row[7]
    photo_url = _resolve_photo_url(photo_raw)

    return {
        "vehicle_id": row[0],
        "id": row[0],
        "user_id": row[1],
        "type": row[2] or "Truck",
        "number_of_wheels": row[3] or 4,
        "model": row[4] or "Vehicle Model",
        "plate_number": row[5] or "—",
        "capacity": row[6] or "—",
        "photo": photo_raw,
        "photo_url": photo_url,
        "status": (row[8] or "active").lower(),
        "inactive_reason": row[9],
        "maintenance_reason": row[10],
        "updated_at": row[11].isoformat() if row[11] else None,
        "branches": branches,
        "branch_names": branch_names,
        "assigned_driver": assigned_driver,
        "assigned_driver_name": assigned_driver_name,
    }


def list_warehouse_flc_active_drivers(warehouse_profile_ids):
    """
    Retrieve active drivers belonging to the authenticated Warehouse branch.
    Includes active vehicle assignments if any.
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)

    sql = f"""
        SELECT
            we.warehouse_employee_id,
            we.warehouse_profile_id,
            we.first_name,
            we.middle_initial,
            we.last_name,
            we.suffix,
            we.email,
            we.contact_number,
            we.status,
            wva.assigned_id,
            wva.vehicle_id,
            v.plate_number,
            v.model
        FROM warehouse_employees we
        LEFT JOIN warehouse_vehicle_assignee wva
            ON wva.driver_id = we.warehouse_employee_id AND wva.status = 'active'
        LEFT JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wva.vehicle_id
        WHERE we.warehouse_profile_id IN ({p_wh})
          AND LOWER(we.position) IN ('driver', 'delivery_driver')
          AND we.status = 'active'
        ORDER BY we.first_name ASC, we.last_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    drivers = []
    for r in rows:
        full_name = _format_driver_name(r[2], r[3], r[4], r[5])
        drivers.append(
            {
                "driver_id": r[0],
                "employee_id": r[0],
                "warehouse_profile_id": r[1],
                "first_name": r[2],
                "middle_initial": r[3],
                "last_name": r[4],
                "suffix": r[5],
                "full_name": full_name,
                "name": full_name,
                "email": r[6] or "—",
                "contact_number": r[7] or "—",
                "status": r[8],
                "current_assigned_vehicle_id": r[10],
                "current_assigned_plate_number": r[11],
                "current_assigned_model": r[12],
            }
        )

    return drivers


def list_warehouse_flc_reimbursement_history(
    warehouse_profile_ids,
    employee_id: int = None,
    search: str = None,
    status_filter: str = None,
    category_filter: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = None,
) -> list:
    """
    List reimbursement history records belonging to the authenticated Warehouse FLC branch and employee.

    Tables involved:
    - warehouse_reimbursement (wr)
    - warehouse_employees (se for requester, pe for payer)
    - users (pu for payer fallback)

    Validations & Rules:
    - Scoped strictly by warehouse_profile_ids.
    - If employee_id is provided, scoped to requested_by = employee_id.
    - Search by category (types), description, title, requester name, or request_reference_no.
    - Date filtering using requested_date (start_date <= end_date validated).
    - Status filtering: 'requested', 'paid', or 'all'.
    - Category filtering: existing standard & custom categories.
    - Sorting: newest first ('date-desc') or oldest first ('date-asc') by requested_date.
    - Expense Date column: uses expense_date (formatted like 'Oct 23, 2026' or 'N/A' if null).
    """
    if not warehouse_profile_ids:
        return []

    if isinstance(warehouse_profile_ids, (int, str)):
        warehouse_profile_ids = [warehouse_profile_ids]
    else:
        warehouse_profile_ids = list(warehouse_profile_ids)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    where_clauses = [f"wr.warehouse_profile_id IN ({p_wh})"]
    params = list(warehouse_profile_ids)

    if employee_id:
        where_clauses.append("wr.requested_by = %s")
        params.append(employee_id)

    if search:
        term = f"%{search.strip()}%"
        where_clauses.append(
            """
            (
                wr.types LIKE %s
                OR wr.description LIKE %s
                OR wr.title LIKE %s
                OR wr.request_reference_no LIKE %s
                OR CONCAT_WS(' ', se.first_name, se.last_name) LIKE %s
            )
            """
        )
        params.extend([term, term, term, term, term])

    if status_filter and status_filter.strip().lower() != "all":
        st = status_filter.strip().lower()
        if st in ["requested", "paid"]:
            where_clauses.append("LOWER(wr.status) = %s")
            params.append(st)

    if category_filter and category_filter.strip().lower() != "all":
        where_clauses.append("LOWER(wr.types) = %s")
        params.append(category_filter.strip().lower())

    if start_date:
        where_clauses.append("DATE(wr.requested_date) >= %s")
        params.append(start_date.strip())

    if end_date:
        where_clauses.append("DATE(wr.requested_date) <= %s")
        params.append(end_date.strip())

    order_by = "ORDER BY wr.requested_date DESC, wr.reimbursement_id DESC"
    if sort_by == "date-asc":
        order_by = "ORDER BY wr.requested_date ASC, wr.reimbursement_id ASC"

    query = f"""
        SELECT
            wr.reimbursement_id,
            wr.warehouse_profile_id,
            wr.requested_by,
            wr.title,
            wr.description,
            wr.types,
            wr.price,
            wr.requested_date,
            wr.photo_evidence,
            wr.status,
            wr.request_reference_no,
            wr.paid_by,
            wr.paid_date,
            wr.method,
            wr.receipt_photo,
            wr.payment_reference_no,
            wr.expense_date,
            se.first_name AS req_first_name,
            se.middle_initial AS req_middle_initial,
            se.last_name AS req_last_name,
            se.suffix AS req_suffix,
            pe.first_name AS pay_first_name,
            pe.middle_initial AS pay_middle_initial,
            pe.last_name AS pay_last_name,
            pe.suffix AS pay_suffix,
            pu.first_name AS user_pay_first_name,
            pu.last_name AS user_pay_last_name
        FROM warehouse_reimbursement wr
        LEFT JOIN warehouse_employees se
            ON se.warehouse_employee_id = wr.requested_by
        LEFT JOIN warehouse_employees pe
            ON pe.warehouse_employee_id = wr.paid_by
        LEFT JOIN users pu
            ON pu.user_id = wr.paid_by
        WHERE {" AND ".join(where_clauses)}
        {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    results = []
    for r in rows:
        reimb_id = r[0]
        wh_id = r[1]
        req_id = r[2]
        title = r[3] or "Reimbursement Request"
        description = r[4] or ""
        types = r[5] or "Others"
        price_val = float(r[6]) if r[6] is not None else 0.0
        req_date = r[7]
        photo_evidence = r[8]
        status_val = str(r[9] or "requested").lower()
        ref_no = r[10] or f"WH-REIMB-{reimb_id}"
        paid_by_id = r[11]
        paid_date = r[12]
        method = r[13]
        receipt_photo = r[14]
        payment_ref_no = r[15]
        expense_date = r[16]

        req_name = _format_driver_name(r[17], r[18], r[19], r[20]) or "Employee"
        payer_name = _format_driver_name(r[21], r[22], r[23], r[24])
        if not payer_name and (r[25] or r[26]):
            payer_name = f"{r[25] or ''} {r[26] or ''}".strip()
        if not payer_name and paid_by_id:
            payer_name = "Finance Officer"

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
                "warehouse_profile_id": wh_id,
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
                "paidDate": paid_date_str,
                "method": method or "N/A",
                "payment_reference_no": payment_ref_no or "N/A",
                "photo_evidence": photo_evidence or None,
                "receipt_photo": receipt_photo or None,
            }
        )

    return results


def get_warehouse_flc_reimbursement_categories(warehouse_profile_ids) -> list:
    """
    Get all unique expense categories present in warehouse_reimbursement for the given branch,
    merged with the 8 standard categories.
    """
    standard_categories = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication Expenses",
        "Logistics",
        "Office & Operating Supplies",
        "Others",
    ]

    if not warehouse_profile_ids:
        return standard_categories

    if isinstance(warehouse_profile_ids, (int, str)):
        warehouse_profile_ids = [warehouse_profile_ids]
    else:
        warehouse_profile_ids = list(warehouse_profile_ids)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT DISTINCT types
            FROM warehouse_reimbursement
            WHERE warehouse_profile_id IN ({p_wh})
              AND types IS NOT NULL
              AND types != ''
            ORDER BY types ASC
            """,
            list(warehouse_profile_ids),
        )
        custom_rows = cursor.fetchall()

    seen = set(standard_categories)
    merged = list(standard_categories)
    for (t,) in custom_rows:
        if t and t not in seen:
            seen.add(t)
            merged.append(t)

    return merged



