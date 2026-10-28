"""
Selectors for Warehouse Driver - My Duties and Live Tracking.
Strictly scoped to authenticated branch (warehouse_profile_id) and driver (driver_id).
"""

from datetime import date, datetime
from decimal import Decimal
from django.db import connection


def get_driver_assigned_vehicle(warehouse_profile_id: int, driver_id: int) -> dict | None:
    """
    Get the active vehicle assigned to this driver in the authenticated warehouse branch.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                wva.assigned_id,
                wva.vehicle_id,
                TRIM(CONCAT_WS(' ', v.type, v.model)) AS vehicle_name,
                v.plate_number,
                v.capacity
            FROM warehouse_vehicle_assignee wva
            INNER JOIN warehouse_delivery_vehicle_management v
                ON v.vehicle_id = wva.vehicle_id
            WHERE wva.warehouse_profile_id = %s
              AND wva.driver_id = %s
              AND wva.status = 'active'
            LIMIT 1
            """,
            [warehouse_profile_id, driver_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    cap_raw = str(row[4] or "0").lower().replace("kg", "").replace(",", "").strip()
    try:
        cap_val = float(cap_raw or 0)
    except (TypeError, ValueError):
        cap_val = 0.0

    return {
        "assigned_id": row[0],
        "vehicle_id": row[1],
        "vehicle_name": row[2] or "Delivery Vehicle",
        "plate_number": row[3],
        "capacity": cap_val,
    }


def normalize_payment_method(raw_method: str | None) -> str:
    """
    Map payment method to 'Online Payment' or 'Cash on Delivery'.
    GCash and Bank = Online Payment; COD = Cash on Delivery.
    """
    if not raw_method:
        return "Cash on Delivery"
    val = str(raw_method).strip().lower()
    if val in ("gcash", "bank", "online payment", "online"):
        return "Online Payment"
    return "Cash on Delivery"


def get_driver_duties(
    warehouse_profile_id: int,
    driver_id: int,
    search_query: str | None = None,
    payment_method_filter: str | None = None,
    sort_by: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """
    Retrieve assigned deliveries with Pending status and order statuses
    'Assigned to driver' or 'In transit' for the authenticated warehouse driver.
    """
    sql = """
        SELECT
            wda.assignment_id,
            wda.status AS assignment_status,
            wda.delivery_vehicle_id,
            wda.proof_of_delivery,
            wda.created_at AS assigned_at,
            woc.online_order_id,
            woc.batch_no,
            woc.expected_arrival_date,
            woc.ordered_quantity,
            woc.fare_fee,
            woc.total_price,
            woc.status AS order_status,
            woc.retailer_buyer_id,
            wp.product_id,
            wp.product_name,
            wp.unit_cost,
            COALESCE((
                SELECT SUM(woor.quantity)
                FROM warehouse_online_orders_returns woor
                WHERE woor.online_order_id = woc.online_order_id
                  AND LOWER(woor.status) = 'approved'
            ), 0) AS approved_return_qty,
            COALESCE(
                woop.payment_method,
                'Cash on Delivery'
            ) AS raw_payment_method,
            u.user_id,
            TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
            u.contact_number AS retailer_contact,
            TRIM(CONCAT_WS(', ', NULLIF(u.street_address, ''), NULLIF(u.barangay, ''), NULLIF(u.municipality, ''), NULLIF(u.province, ''))) AS retailer_address,
            TRIM(CONCAT_WS(' ', v.type, v.model)) AS vehicle_name,
            v.plate_number
        FROM warehouse_driver_assignment wda
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = wda.online_order_id
        INNER JOIN warehouse_vehicle_assignee wva
            ON wva.vehicle_id = wda.delivery_vehicle_id
            AND wva.driver_id = %s
            AND wva.warehouse_profile_id = %s
            AND wva.status = 'active'
        LEFT JOIN warehouse_delivery_vehicle_management v
            ON v.vehicle_id = wda.delivery_vehicle_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN warehouse_online_orders_payment woop
            ON woop.online_order_id = woc.online_order_id
        LEFT JOIN users u
            ON u.user_id = woc.retailer_buyer_id
        WHERE wda.warehouse_profile_id = %s
          AND wda.status = 'Pending'
          AND woc.status IN ('Assigned to driver', 'In transit')
    """
    params = [driver_id, warehouse_profile_id, warehouse_profile_id]

    if start_date:
        sql += " AND woc.expected_arrival_date >= %s"
        params.append(start_date)

    if end_date:
        sql += " AND woc.expected_arrival_date <= %s"
        params.append(end_date)

    # Sort
    if sort_by == "oldest":
        sql += " ORDER BY woc.expected_arrival_date ASC, woc.online_order_id ASC"
    else:
        sql += " ORDER BY woc.expected_arrival_date DESC, woc.online_order_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    duties = []
    for r in rows:
        assignment_id = r[0]
        assignment_status = r[1]
        delivery_vehicle_id = r[2]
        proof_of_delivery = r[3]
        assigned_at = r[4]
        online_order_id = r[5]
        batch_no = r[6]
        expected_arrival_date = r[7]
        ordered_quantity = Decimal(str(r[8] or "0"))
        fare_fee = Decimal(str(r[9] or "0"))
        total_price = Decimal(str(r[10] or "0"))
        order_status = r[11]
        retailer_buyer_id = r[12]
        product_id = r[13]
        product_name = r[14] or "Rice Product"
        unit_cost = Decimal(str(r[15] or "0"))
        approved_return_qty = Decimal(str(r[16] or "0"))
        raw_payment_method = r[17]
        retailer_name = r[19]
        retailer_contact = r[20]
        retailer_address = r[21]
        vehicle_name = r[22]
        plate_number = r[23]

        customer_type = "Retailer"
        customer_name = retailer_name or "Retailer Customer"
        customer_contact = retailer_contact or ""
        delivery_address = retailer_address or ""
        buyer_id = retailer_buyer_id

        # Determine Display Quantity (approved return replacement vs original ordered qty)
        is_replacement = approved_return_qty > 0
        display_quantity = approved_return_qty if is_replacement else ordered_quantity

        # Payment method normalization
        normalized_payment_method = normalize_payment_method(raw_payment_method)

        # Expected Arrival Date string
        if isinstance(expected_arrival_date, (date, datetime)):
            arrival_date_str = expected_arrival_date.strftime("%B %d, %Y")
            arrival_iso = expected_arrival_date.strftime("%Y-%m-%d")
        else:
            arrival_date_str = str(expected_arrival_date or "N/A")
            arrival_iso = str(expected_arrival_date or "")

        duty = {
            "id": f"duty-{assignment_id}",
            "assignment_id": assignment_id,
            "assignment_status": assignment_status,
            "delivery_vehicle_id": delivery_vehicle_id,
            "vehicle_name": vehicle_name or "",
            "plate_number": plate_number or "",
            "proof_of_delivery": proof_of_delivery,
            "online_order_id": online_order_id,
            "batch_no": batch_no or f"BATCH-{online_order_id}",
            "expected_arrival_date": arrival_date_str,
            "expected_arrival_date_iso": arrival_iso,
            "ordered_quantity": float(ordered_quantity),
            "display_quantity": float(display_quantity),
            "is_replacement": is_replacement,
            "approved_replacement_quantity": float(approved_return_qty),
            "fare_fee": float(fare_fee),
            "total_price": float(total_price),
            "order_status": order_status,
            "customer_type": customer_type,
            "buyer_id": buyer_id,
            "customer_name": customer_name,
            "customer_contact": customer_contact,
            "delivery_address": delivery_address,
            "product_id": product_id,
            "product_name": product_name,
            "unit_cost": float(unit_cost),
            "raw_payment_method": raw_payment_method,
            "payment_method": normalized_payment_method,
            "buyer_group_key": f"Retailer_{buyer_id}",
        }

        # Apply in-memory search and payment method filter if supplied
        if search_query:
            sq = search_query.strip().lower()
            combined = f"{duty['batch_no']} {duty['customer_name']} {duty['delivery_address']} {duty['product_name']} {duty['online_order_id']}".lower()
            if sq not in combined:
                continue

        if payment_method_filter:
            pmf = payment_method_filter.strip().lower()
            if pmf == "online payment" and duty["payment_method"] != "Online Payment":
                continue
            if pmf == "cash on delivery" and duty["payment_method"] != "Cash on Delivery":
                continue

        duties.append(duty)

    return duties


def get_buyer_group_for_tracking(
    warehouse_profile_id: int,
    driver_id: int,
    buyer_group_key: str | None = None,
    order_ids: list[int] | None = None,
) -> dict | None:
    """
    Fetch all active assigned orders for a specific buyer group.
    Ensures branch scoping and driver ownership.
    """
    all_duties = get_driver_duties(warehouse_profile_id, driver_id)

    if buyer_group_key:
        filtered = [d for d in all_duties if d["buyer_group_key"] == buyer_group_key]
    elif order_ids:
        filtered = [d for d in all_duties if d["online_order_id"] in order_ids]
    else:
        filtered = []

    if not filtered:
        return None

    first = filtered[0]
    return {
        "buyer_group_key": first["buyer_group_key"],
        "customer_type": "Retailer",
        "buyer_id": first["buyer_id"],
        "customer_name": first["customer_name"],
        "customer_contact": first["customer_contact"],
        "delivery_address": first["delivery_address"],
        "orders": filtered,
    }


def get_last_ping_for_orders(
    warehouse_profile_id: int,
    driver_id: int,
    assignment_ids: list[int],
) -> dict | None:
    """
    Fetch current last ping information for assigned orders.
    """
    if not assignment_ids:
        return None

    placeholders = ",".join(["%s"] * len(assignment_ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                ping_id,
                assignment_id,
                latitude,
                longitude,
                last_ping_at,
                status
            FROM warehouse_last_ping
            WHERE warehouse_profile_id = %s
              AND driver_id = %s
              AND assignment_id IN ({placeholders})
            ORDER BY last_ping_at DESC
            LIMIT 1
            """,
            [warehouse_profile_id, driver_id, *assignment_ids],
        )
        row = cursor.fetchone()

    if not row:
        return None

    return {
        "ping_id": row[0],
        "assignment_id": row[1],
        "latitude": float(row[2]) if row[2] is not None else None,
        "longitude": float(row[3]) if row[3] is not None else None,
        "last_ping_at": row[4].isoformat() if row[4] else None,
        "status": row[5],
    }


def get_driver_assigned_conversations(
    warehouse_profile_id: int,
    driver_id: int,
) -> list[dict]:
    """
    Retrieve conversations for the authenticated warehouse driver.
    Lists Retailer buyers assigned to this driver (current and historical),
    including active assignment status, batch numbers, latest message, and unread counts.
    """
    # 1. First ensure all buyers from active duties are included
    active_duties = get_driver_duties(warehouse_profile_id, driver_id)
    known_buyers = set()
    assigned_retailers = []

    for d in active_duties:
        u_id = d.get("buyer_id")
        if u_id is not None and u_id not in known_buyers:
            known_buyers.add(u_id)
            assigned_retailers.append(u_id)

    # 2. Also retrieve previous/completed delivery buyers from warehouse_driver_assignment
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT
                woc.retailer_buyer_id
            FROM warehouse_driver_assignment wda
            INNER JOIN warehouse_online_customer woc
                ON woc.online_order_id = wda.online_order_id
            INNER JOIN warehouse_vehicle_assignee wva
                ON wva.vehicle_id = wda.delivery_vehicle_id
                AND wva.driver_id = %s
                AND wva.warehouse_profile_id = %s
            WHERE wda.warehouse_profile_id = %s
              AND woc.retailer_buyer_id IS NOT NULL
            """,
            [driver_id, warehouse_profile_id, warehouse_profile_id],
        )
        for row in cursor.fetchall():
            u_id = row[0]
            if u_id is not None and u_id not in known_buyers:
                known_buyers.add(u_id)
                assigned_retailers.append(u_id)

    conversations = []

    for recipient_id in assigned_retailers:
        with connection.cursor() as cursor:
            # 3. Retailer Profile Info
            cursor.execute(
                """
                SELECT
                    TRIM(CONCAT_WS(' ', first_name, middle_initial, last_name, suffix)) AS name,
                    contact_number,
                    TRIM(CONCAT_WS(', ', NULLIF(street_address, ''), NULLIF(barangay, ''), NULLIF(municipality, ''), NULLIF(province, ''))) AS address
                FROM users
                WHERE user_id = %s
                LIMIT 1
                """,
                [recipient_id],
            )
            buyer_row = cursor.fetchone()
            if not buyer_row:
                continue

            buyer_name = buyer_row[0] or f"Retailer #{recipient_id}"
            contact_number = buyer_row[1] or ""
            address = buyer_row[2] or ""

            # 4. Check for Active Delivery Assignment
            cursor.execute(
                """
                SELECT
                    woc.batch_no,
                    COALESCE(wp.product_name, 'Rice Product') AS product_name,
                    woc.ordered_quantity,
                    woc.status AS order_status
                FROM warehouse_driver_assignment wda
                INNER JOIN warehouse_online_customer woc
                    ON woc.online_order_id = wda.online_order_id
                LEFT JOIN warehouse_products wp
                    ON wp.product_id = woc.warehouse_product_id
                INNER JOIN warehouse_vehicle_assignee wva
                    ON wva.vehicle_id = wda.delivery_vehicle_id
                    AND wva.driver_id = %s
                    AND wva.warehouse_profile_id = %s
                    AND LOWER(wva.status) = 'active'
                WHERE wda.warehouse_profile_id = %s
                  AND wda.status = 'Pending'
                  AND woc.status IN ('Assigned to driver', 'In transit')
                  AND woc.retailer_buyer_id = %s
                ORDER BY woc.online_order_id ASC
                """,
                [driver_id, warehouse_profile_id, warehouse_profile_id, recipient_id],
            )
            active_orders = cursor.fetchall()

            has_active_assignment = len(active_orders) > 0
            active_batch_numbers = [r[0] for r in active_orders if r[0]]
            batch_summary = (
                " · ".join(f"{r[0]} ({r[1]} {r[2]}kg)" for r in active_orders[:2])
                if active_orders
                else "No active delivery assignment"
            )

            # 5. Latest Message in Thread
            cursor.execute(
                """
                SELECT
                    m.message_content,
                    m.created_at,
                    m.sender_warehouse_profile_id
                FROM messages m
                WHERE (
                    (m.sender_warehouse_profile_id = %s AND m.receiver_user_id = %s)
                    OR (m.receiver_warehouse_profile_id = %s AND m.sender_user_id = %s)
                )
                ORDER BY m.created_at DESC, m.message_id DESC
                LIMIT 1
                """,
                [warehouse_profile_id, recipient_id, warehouse_profile_id, recipient_id],
            )
            last_msg_row = cursor.fetchone()

            last_msg_text = last_msg_row[0] if last_msg_row else "No messages yet"
            last_msg_time = last_msg_row[1].isoformat() if last_msg_row and last_msg_row[1] else None

            # 6. Count Unread Messages from Buyer
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM messages m
                WHERE m.receiver_warehouse_profile_id = %s
                  AND m.sender_user_id = %s
                  AND m.seen_at IS NULL
                """,
                [warehouse_profile_id, recipient_id],
            )
            unread_count = cursor.fetchone()[0]

        conversations.append({
            "id": f"Retailer_{recipient_id}",
            "recipient_id": recipient_id,
            "recipient_type": "Retailer",
            "name": buyer_name,
            "role": "Retailer",
            "contact_number": contact_number,
            "address": address,
            "has_active_assignment": has_active_assignment,
            "active_batch_numbers": active_batch_numbers,
            "batch": batch_summary,
            "lastMsg": last_msg_text,
            "lastMsgTime": last_msg_time,
            "unread": unread_count,
            "avatar": buyer_name[0].upper() if buyer_name else "R",
        })

    # Sort conversations: active assignments first, then latest message date
    conversations.sort(
        key=lambda c: (1 if c["has_active_assignment"] else 0, c["lastMsgTime"] or ""),
        reverse=True,
    )
    return conversations


def get_driver_conversation_thread(
    warehouse_profile_id: int,
    driver_id: int,
    recipient_id: int,
    recipient_type: str = "Retailer",
) -> dict:
    """
    Retrieve message history for a specific conversation with an assigned Retailer buyer.
    Also returns active assignment status, and marks incoming messages as seen.
    """
    with connection.cursor() as cursor:
        # 1. Buyer details
        cursor.execute(
            """
            SELECT
                TRIM(CONCAT_WS(' ', first_name, middle_initial, last_name, suffix)) AS name,
                contact_number,
                TRIM(CONCAT_WS(', ', NULLIF(street_address, ''), NULLIF(barangay, ''), NULLIF(municipality, ''), NULLIF(province, ''))) AS address
            FROM users
            WHERE user_id = %s
            LIMIT 1
            """,
            [recipient_id],
        )
        buyer_row = cursor.fetchone()
        buyer_name = buyer_row[0] if buyer_row else f"Retailer #{recipient_id}"
        contact_number = buyer_row[1] if buyer_row else ""
        address = buyer_row[2] if buyer_row else ""

        # 2. Check active assignment
        cursor.execute(
            """
            SELECT
                woc.batch_no,
                COALESCE(wp.product_name, 'Rice Product') AS product_name,
                woc.ordered_quantity,
                woc.status AS order_status
            FROM warehouse_driver_assignment wda
            INNER JOIN warehouse_online_customer woc
                ON woc.online_order_id = wda.online_order_id
            LEFT JOIN warehouse_products wp
                ON wp.product_id = woc.warehouse_product_id
            INNER JOIN warehouse_vehicle_assignee wva
                ON wva.vehicle_id = wda.delivery_vehicle_id
                AND wva.driver_id = %s
                AND wva.warehouse_profile_id = %s
                AND LOWER(wva.status) = 'active'
            WHERE wda.warehouse_profile_id = %s
              AND wda.status = 'Pending'
              AND woc.status IN ('Assigned to driver', 'In transit')
              AND woc.retailer_buyer_id = %s
            ORDER BY woc.online_order_id ASC
            """,
            [driver_id, warehouse_profile_id, warehouse_profile_id, recipient_id],
        )
        active_orders = cursor.fetchall()
        has_active_assignment = len(active_orders) > 0
        active_batch_numbers = list(dict.fromkeys(r[0] for r in active_orders if r[0]))

        # 3. Find unread incoming messages to mark seen
        cursor.execute(
            """
            SELECT message_id
            FROM messages
            WHERE receiver_warehouse_profile_id = %s
              AND sender_user_id = %s
              AND seen_at IS NULL
            """,
            [warehouse_profile_id, recipient_id],
        )
        unread_rows = cursor.fetchall()
        unread_ids = [r[0] for r in unread_rows]

        if unread_ids:
            cursor.execute(
                """
                UPDATE messages
                SET seen_at = NOW()
                WHERE receiver_warehouse_profile_id = %s
                  AND sender_user_id = %s
                  AND seen_at IS NULL
                """,
                [warehouse_profile_id, recipient_id],
            )

        # 4. Fetch chronological messages
        cursor.execute(
            """
            SELECT
                m.message_id,
                m.sender_warehouse_profile_id,
                m.message_content,
                m.created_at,
                m.seen_at
            FROM messages m
            WHERE (
                (m.sender_warehouse_profile_id = %s AND m.receiver_user_id = %s)
                OR (m.receiver_warehouse_profile_id = %s AND m.sender_user_id = %s)
            )
            ORDER BY m.created_at ASC, m.message_id ASC
            """,
            [warehouse_profile_id, recipient_id, warehouse_profile_id, recipient_id],
        )
        msg_rows = cursor.fetchall()

    # Broadcast seen events if any were marked seen
    if unread_ids:
        try:
            from api.realtime.broadcast import broadcast_messages_seen
            broadcast_messages_seen(unread_ids)
        except Exception:
            pass

    messages_list = []
    for r in msg_rows:
        msg_id, sender_wh, content, created_at, seen_at = r
        is_mine = sender_wh == warehouse_profile_id

        time_str = created_at.strftime("%I:%M %p") if created_at else ""

        messages_list.append({
            "id": msg_id,
            "sender": "me" if is_mine else "them",
            "text": content or "",
            "time": time_str,
            "timestamp": created_at.isoformat() if created_at else None,
            "seen": seen_at is not None,
        })

    return {
        "recipient_id": recipient_id,
        "recipient_type": "Retailer",
        "name": buyer_name,
        "contact_number": contact_number,
        "address": address,
        "has_active_assignment": has_active_assignment,
        "active_batch_numbers": active_batch_numbers,
        "messages": messages_list,
    }


def get_driver_payment_submissions(
    warehouse_profile_id: int,
    driver_id: int,
    search_query: str | None = None,
    payment_method_filter: str | None = None,
    status_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """
    Fetch COD payments collected by the authenticated warehouse driver.
    Scoped strictly by warehouse_profile_id and driver_id.
    Handles date range, search, payment method, and status filtering.
    Preserves transaction grouping by cod_transaction_key.
    """
    params = [warehouse_profile_id, driver_id]
    where_clauses = ["cod.warehouse_profile_id = %s", "cod.driver_id = %s"]

    # 1. Search Query
    if search_query and search_query.strip():
        q = f"%{search_query.strip()}%"
        where_clauses.append(
            """(
                woc.batch_no LIKE %s
                OR u.first_name LIKE %s
                OR u.last_name LIKE %s
                OR CONCAT_WS(' ', u.first_name, u.last_name) LIKE %s
                OR u.street_address LIKE %s
                OR u.barangay LIKE %s
                OR u.municipality LIKE %s
                OR u.province LIKE %s
            )"""
        )
        params.extend([q, q, q, q, q, q, q, q])

    # 2. Payment Method Filter
    if payment_method_filter and payment_method_filter.strip():
        method_str = payment_method_filter.strip()
        if method_str.lower() in ("cash on delivery", "cash"):
            where_clauses.append("cod.payment_method = 'Cash'")
        elif method_str.lower() in ("gcash", "online payment"):
            where_clauses.append("cod.payment_method = 'GCash'")
        elif method_str.lower() in ("bank", "bank transfer"):
            where_clauses.append("cod.payment_method = 'Bank'")
        else:
            where_clauses.append("cod.payment_method = %s")
            params.append(method_str)

    # 3. Status Filter (Handled, Submitted)
    if status_filter and status_filter.strip():
        st = status_filter.strip().capitalize()
        if st in ("Handled", "Submitted"):
            where_clauses.append("cod.status = %s")
            params.append(st)

    # 4. Date Range Filtering
    if start_date and start_date.strip():
        where_clauses.append("DATE(cod.handled_at) >= %s")
        params.append(start_date.strip())
    if end_date and end_date.strip():
        where_clauses.append("DATE(cod.handled_at) <= %s")
        params.append(end_date.strip())

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            cod.cod_id,
            cod.cod_transaction_key,
            cod.online_order_id,
            cod.payment_method,
            cod.total AS cod_row_total,
            cod.amount_paid,
            cod.`change` AS change_amount,
            cod.payment_reference_no,
            cod.external_payment_reference_no,
            cod.receipt_photo,
            cod.status,
            cod.handled_at,
            cod.submitted_at,
            woc.batch_no,
            woc.ordered_quantity,
            COALESCE(wp.unit_cost, 0.0) AS unit_cost,
            woc.total_price AS order_total,
            COALESCE(wp.product_name, 'Rice Product') AS product_name,
            u.user_id,
            TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
            TRIM(CONCAT_WS(', ', NULLIF(u.street_address, ''), NULLIF(u.barangay, ''), NULLIF(u.municipality, ''), NULLIF(u.province, ''))) AS destination_address,
            COALESCE(wp_prof.business_name, 'GrainRise Warehouse') AS business_name,
            TRIM(CONCAT_WS(' ', we.first_name, we.last_name)) AS driver_name
        FROM warehouse_online_customer_cash_on_delivery cod
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = cod.online_order_id
        LEFT JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN users u
            ON u.user_id = woc.retailer_buyer_id
        LEFT JOIN warehouse_profiles wp_prof
            ON wp_prof.warehouse_profile_id = cod.warehouse_profile_id
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = cod.driver_id
        WHERE {where_sql}
        ORDER BY cod.handled_at DESC, cod.cod_transaction_key ASC, cod.cod_id ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        raw_rows = cursor.fetchall()

    if not raw_rows:
        return []

    # Map raw rows to dicts
    mapped = []
    for r in raw_rows:
        (
            cod_id,
            tx_key,
            order_id,
            pay_method,
            cod_row_total,
            amount_paid,
            change_amount,
            pay_ref,
            ext_ref,
            receipt_photo,
            status,
            handled_at,
            submitted_at,
            batch_no,
            ordered_qty,
            unit_cost,
            order_total,
            product_name,
            retailer_user_id,
            retailer_name,
            destination_addr,
            business_name,
            driver_name,
        ) = r

        mapped.append({
            "cod_id": cod_id,
            "id": f"cod-{cod_id}",
            "cod_transaction_key": tx_key,
            "online_order_id": order_id,
            "payment_method": pay_method,
            "cod_row_total": float(cod_row_total or 0),
            "amount_paid": float(amount_paid or 0),
            "change": float(change_amount or 0),
            "payment_reference_no": pay_ref,
            "external_payment_reference_no": ext_ref,
            "receipt_photo": receipt_photo,
            "status": status,
            "handled_at": handled_at.isoformat() if handled_at else None,
            "paid_at": handled_at.strftime("%I:%M %p") if handled_at else "—",
            "date": handled_at.date().isoformat() if handled_at else "",
            "submitted_at": submitted_at.isoformat() if submitted_at else None,
            "batch_no": batch_no or "—",
            "batchNo": batch_no or "—",
            "ordered_quantity": float(ordered_qty or 0),
            "qty": f"{float(ordered_qty or 0):,.0f} kg" if float(ordered_qty or 0).is_integer() else f"{float(ordered_qty or 0):,.2f} kg",
            "unit_cost": float(unit_cost or 0),
            "unit_cost_formatted": f"₱{float(unit_cost or 0):,.2f}",
            "order_total": float(order_total or cod_row_total or 0),
            "amount": f"₱{float(order_total or cod_row_total or 0):,.2f}",
            "product_name": product_name,
            "variant": product_name,
            "retailer_user_id": retailer_user_id,
            "retailer": retailer_name or "Retailer",
            "destination": destination_addr or "Designated Delivery Destination",
            "business_name": business_name,
            "driver_name": driver_name or "Assigned Driver",
        })

    # Group by cod_transaction_key to attach transaction-level metadata
    groups = {}
    for item in mapped:
        k = item["cod_transaction_key"]
        if k not in groups:
            groups[k] = []
        groups[k].append(item)

    results = []
    for k, group_items in groups.items():
        is_multi = len(group_items) > 1
        tx_batches = list(dict.fromkeys(item["batch_no"] for item in group_items))
        tx_total = sum(item["order_total"] for item in group_items)

        # Build items list for modal & POS receipt
        items_payload = [
            {
                "online_order_id": item["online_order_id"],
                "product_name": item["product_name"],
                "batch_no": item["batch_no"],
                "ordered_quantity": item["ordered_quantity"],
                "display_quantity": item["qty"].replace(" kg", ""),
                "unit_cost": item["unit_cost"],
                "unit_cost_formatted": item["unit_cost_formatted"],
                "total_price": item["order_total"],
                "total_price_formatted": item["amount"],
            }
            for item in group_items
        ]

        first = group_items[0]
        tx_receipt_data = {
            "business_name": first["business_name"],
            "reference_no": first["payment_reference_no"],
            "transaction_date_formatted": first["handled_at"][:19].replace("T", " ") if first["handled_at"] else "",
            "driver_name": first["driver_name"],
            "customer_name": first["retailer"],
            "buyer_type": "Retailer",
            "batch_no": ", ".join(tx_batches),
            "payment_method": first["payment_method"],
            "external_payment_reference_no": first["external_payment_reference_no"],
            "receipt_photo": first["receipt_photo"],
            "items": items_payload,
            "total_amount": tx_total,
            "total_amount_formatted": f"₱{tx_total:,.2f}",
            "amount_paid": first["amount_paid"],
            "amount_paid_formatted": f"₱{first['amount_paid']:,.2f}",
            "change_amount": first["change"],
            "change_amount_formatted": f"₱{first['change']:,.2f}",
            "status": first["status"],
        }

        for idx, item in enumerate(group_items):
            is_last = idx == len(group_items) - 1
            action_label = "View Details" if item["status"] == "Submitted" else "Submit Payment"

            results.append({
                **item,
                "is_multi_order": is_multi,
                "is_first_in_group": idx == 0,
                "is_last_in_group": is_last,
                "group_order_count": len(group_items),
                "group_order_index": idx,
                "transaction_total": tx_total,
                "transaction_total_formatted": f"₱{tx_total:,.2f}",
                "transaction_batches": tx_batches,
                "transaction_batches_str": ", ".join(tx_batches),
                "transaction_items": items_payload,
                "receipt_data": tx_receipt_data,
                "action_label": action_label,
            })

    return results


def _format_person_name(first, middle, last, suffix):
    parts = [first, f"{middle}." if middle else None, last, suffix]
    return " ".join([p for p in parts if p]).strip()


def _parse_capacity_kg_val(raw_val):
    if raw_val is None:
        return 0.0
    cleaned = str(raw_val).lower().replace("kg", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except (TypeError, ValueError):
        return 0.0


def _resolve_photo_url_val(photo_path):
    if not photo_path:
        return None
    p = str(photo_path).strip()
    if p.startswith(("http://", "https://", "//", "data:", "blob:")):
        return p
    clean = p.lstrip("/")
    while clean.startswith("media/"):
        clean = clean[6:]
    return f"/media/{clean}"


def list_warehouse_driver_fulfillment_variants(warehouse_profile_id: int, driver_id: int) -> list:
    """
    Retrieve distinct variants associated with receiving/fulfillment history for this warehouse driver.
    """
    sql = """
        SELECT DISTINCT wp.product_name
        FROM warehouse_online_customer_receiving_history rh
        INNER JOIN warehouse_online_customer woc
            ON woc.online_order_id = rh.online_order_id
        INNER JOIN warehouse_products wp
            ON wp.product_id = woc.warehouse_product_id
        LEFT JOIN warehouse_vehicle_assignee wva
            ON wva.assigned_id = rh.vehicle_assignee_id
        WHERE rh.warehouse_profile_id = %s
          AND wp.product_name IS NOT NULL
          AND (
              wva.driver_id = %s
              OR EXISTS (
                  SELECT 1
                  FROM warehouse_driver_assignment wda
                  INNER JOIN warehouse_vehicle_assignee wva2
                      ON wva2.vehicle_id = wda.delivery_vehicle_id
                      AND wva2.driver_id = %s
                  WHERE wda.online_order_id = rh.online_order_id
              )
          )
        ORDER BY wp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [warehouse_profile_id, driver_id, driver_id])
        rows = cursor.fetchall()
        variants = [r[0] for r in rows if r[0]]

    if not variants:
        sql_fallback = """
            SELECT DISTINCT product_name
            FROM warehouse_products
            WHERE warehouse_profile_id = %s
              AND product_name IS NOT NULL
            ORDER BY product_name ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(sql_fallback, [warehouse_profile_id])
            variants = [r[0] for r in cursor.fetchall() if r[0]]

    return variants


def list_warehouse_driver_fulfillment_history(
    warehouse_profile_id: int,
    driver_id: int,
    search: str | None = None,
    variant_filter: str | None = None,
    buyer_type_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    sort_by: str | None = None,
) -> list:
    """
    Retrieve completed fulfillment records strictly scoped to the authenticated Warehouse Driver.
    Identifies the driver through direct receiving assignment (rh.vehicle_assignee_id)
    or historical delivery assignment (warehouse_driver_assignment).
    """
    where_clauses = [
        "rh.warehouse_profile_id = %s",
        """(
            wva.driver_id = %s
            OR EXISTS (
                SELECT 1
                FROM warehouse_driver_assignment wda_check
                INNER JOIN warehouse_vehicle_assignee wva_check
                    ON wva_check.vehicle_id = wda_check.delivery_vehicle_id
                    AND wva_check.driver_id = %s
                WHERE wda_check.online_order_id = rh.online_order_id
            )
        )"""
    ]
    params = [warehouse_profile_id, driver_id, driver_id]

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

    # Search filter: receiving reference no, batch no, product name, customer name
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
    elif sort_by == "cost-desc":
        order_by_sql = "ORDER BY woc.total_price DESC, rh.received_at DESC"
    elif sort_by == "cost-asc":
        order_by_sql = "ORDER BY woc.total_price ASC, rh.received_at DESC"

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
            TRIM(CONCAT_WS(', ', NULLIF(u.street_address, ''), NULLIF(u.barangay, ''), NULLIF(u.municipality, ''), NULLIF(u.province, ''))) AS destination_address,
            -- Driver & Vehicle Info
            wva.assigned_id AS vehicle_assignee_id,
            wva.status AS assignment_status,
            COALESCE(v.model, v_wda.model) AS vehicle_model,
            COALESCE(v.plate_number, v_wda.plate_number) AS vehicle_plate_number,
            COALESCE(v.type, v_wda.type) AS vehicle_type,
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
        LEFT JOIN warehouse_driver_assignment wda
            ON wda.online_order_id = rh.online_order_id
        LEFT JOIN warehouse_delivery_vehicle_management v_wda
            ON v_wda.vehicle_id = wda.delivery_vehicle_id
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

        buyer_type = "Retailer"
        buyer_name = _format_person_name(r[21], r[22], r[23], r[24]) or "Retailer Buyer"
        destination_addr = r[25] or "Designated Delivery Destination"

        driver_name = _format_person_name(r[31], r[32], r[33], r[34]) if r[31] else "Assigned Driver"

        rec_at = r[8]
        rec_at_iso = rec_at.isoformat() if rec_at else None
        rec_at_formatted = rec_at.strftime("%b %d, %Y") if rec_at else "—"

        exp_date = r[14]
        exp_date_iso = exp_date.isoformat() if exp_date else None
        exp_date_formatted = exp_date.strftime("%b %d, %Y") if exp_date else "—"

        status_raw = str(r[6] or "unpaid").strip().lower()
        status_clean = "Paid" if status_raw == "paid" else "Unpaid"

        payable_val = float(r[5]) if r[5] is not None else (good_rec * unit_cost)

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
            "payables": payable_val,
            "payable_amount": payable_val,
            "payable_amount_formatted": f"₱{payable_val:,.2f}",
            "payables_formatted": f"₱{payable_val:,.2f}",
            "status": status_clean,
            "payment_status": status_clean,
            "status_raw": status_raw,
            "proof": r[7],
            "proof_url": _resolve_photo_url_val(r[7]),
            "receiving_proof": _resolve_photo_url_val(r[7]),
            "received_at": rec_at_iso,
            "received_at_formatted": rec_at_formatted,
            "receiving_date": rec_at_formatted,
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
            "delivery_details": destination_addr,
            "vehicle_assignee_id": r[26],
            "assignment_status": r[27],
            "assigned_vehicle_model": r[28] or "—",
            "vehicle_model": r[28] or "—",
            "plate_number": r[29] or "—",
            "vehicle_type": r[30] or "—",
            "assigned_driver": driver_name,
            "driver_name": driver_name,
        })

    return history


def list_warehouse_driver_vehicle_assigned_history(
    warehouse_profile_id: int,
    driver_id: int,
    search: str | None = None,
    status_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    sort_by: str | None = None,
) -> list:
    """
    Retrieve all vehicle assignment records belonging to the authenticated Warehouse Driver.
    Includes both active and changed assignments.
    """
    where_clauses = [
        "wva.warehouse_profile_id = %s",
        "wva.driver_id = %s",
    ]
    params = [warehouse_profile_id, driver_id]

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

    if search:
        search_like = f"%{search.strip()}%"
        where_clauses.append(
            """(
                v.model LIKE %s
                OR v.plate_number LIKE %s
                OR v.type LIKE %s
            )"""
        )
        params.extend([search_like] * 3)

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
            we.suffix AS driver_suffix
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
        driver_name = _format_person_name(r[15], r[16], r[17], r[18])
        cap = _parse_capacity_kg_val(r[9])
        cap_formatted = f"{cap:,.0f} kg" if cap.is_integer() else f"{cap:,.2f} kg"

        created_at_dt = r[2]
        created_at_iso = created_at_dt.isoformat() if created_at_dt else None
        created_at_formatted = created_at_dt.strftime("%b %d, %Y") if created_at_dt else "—"

        status_raw = str(r[1] or "active").strip()
        status_clean = "Active" if status_raw.lower() == "active" else "Changed"

        assignments.append({
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
            "photo_url": _resolve_photo_url_val(r[10]),
            "vehicle_status": r[11] or "active",
            "inactive_reason": r[12],
            "maintenance_reason": r[13],
            # Driver Details
            "driver_id": r[14],
            "driver": driver_name,
            "driver_name": driver_name,
        })

    return assignments


def list_warehouse_driver_reimbursement_history(
    warehouse_profile_id: int,
    driver_id: int,
    search: str = None,
    status_filter: str = None,
    category_filter: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = None,
) -> list:
    """
    List reimbursement history records belonging to the authenticated Warehouse Driver.
    Strictly scoped by warehouse_profile_id and requested_by = driver_id.

    Tables involved:
    - warehouse_reimbursement (wr)
    - warehouse_employees (se for requester, pe for payer)
    - users (pu for payer fallback)
    - warehouse_reimbursement_payout_tracking (wpt for payout tracking details)
    """
    where_clauses = [
        "wr.warehouse_profile_id = %s",
        "wr.requested_by = %s",
    ]
    params = [warehouse_profile_id, driver_id]

    if search:
        term = f"%{search.strip()}%"
        where_clauses.append(
            """
            (
                wr.types LIKE %s
                OR wr.description LIKE %s
                OR wr.title LIKE %s
                OR wr.request_reference_no LIKE %s
                OR CONCAT_WS(' ', pe.first_name, pe.last_name) LIKE %s
                OR CONCAT_WS(' ', pu.first_name, pu.last_name) LIKE %s
            )
            """
        )
        params.extend([term, term, term, term, term, term])

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
    if sort_by in ["date-asc", "oldest"]:
        order_by = "ORDER BY wr.requested_date ASC, wr.reimbursement_id ASC"
    elif sort_by in ["date-desc", "newest"]:
        order_by = "ORDER BY wr.requested_date DESC, wr.reimbursement_id DESC"

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
            COALESCE(wr.method, wpt.method) AS method,
            COALESCE(wr.receipt_photo, wpt.receipt_photo) AS receipt_photo,
            COALESCE(wr.payment_reference_no, wpt.processor_reference, wpt.reference_id) AS payment_reference_no,
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
        LEFT JOIN (
            SELECT
                reimbursement_id,
                method,
                receipt_photo,
                processor_reference,
                reference_id
            FROM warehouse_reimbursement_payout_tracking
            WHERE payout_attempt_id IN (
                SELECT MAX(payout_attempt_id)
                FROM warehouse_reimbursement_payout_tracking
                GROUP BY reimbursement_id
            )
        ) wpt ON wpt.reimbursement_id = wr.reimbursement_id
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

        req_name = _format_person_name(r[17], r[18], r[19], r[20]) or "Warehouse Driver"
        payer_name = _format_person_name(r[21], r[22], r[23], r[24])
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
                "paidBy": payer_name or "N/A",
                "paid_date": paid_date_str,
                "paid_date_iso": paid_date_iso,
                "paidDate": paid_date_str,
                "method": method or "N/A",
                "payment_reference_no": payment_ref_no or "N/A",
                "photo_evidence": photo_evidence or None,
                "photo_evidence_url": _resolve_photo_url_val(photo_evidence),
                "receipt_photo": receipt_photo or None,
                "receipt_photo_url": _resolve_photo_url_val(receipt_photo),
            }
        )

    return results


def get_warehouse_driver_reimbursement_categories(warehouse_profile_id: int) -> list:
    """
    Get all unique expense categories present in warehouse_reimbursement for the given branch,
    merged with the 8 standard approved categories.
    """
    standard_categories = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication",
        "Logistics & Delivery",
        "Office & Operating Supplies",
        "Others",
    ]
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT types
            FROM warehouse_reimbursement
            WHERE warehouse_profile_id = %s
              AND types IS NOT NULL
              AND TRIM(types) != ''
            ORDER BY types ASC
            """,
            [warehouse_profile_id],
        )
        rows = cursor.fetchall()

    db_categories = [r[0].strip() for r in rows if r[0] and r[0].strip()]
    merged = list(dict.fromkeys(standard_categories + db_categories))
    return merged




