"""
Selectors for Miller Driver - My Duties and Live Tracking.
Strictly scoped to authenticated branch (supplier_profile_id) and driver (driver_id).
"""

from datetime import date, datetime
from decimal import Decimal
from django.db import connection


def get_driver_assigned_vehicle(supplier_profile_id: int, driver_id: int) -> dict | None:
    """
    Get the active vehicle assigned to this driver in the authenticated branch.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mva.assigned_id,
                mva.vehicle_id,
                TRIM(CONCAT_WS(' ', v.type, v.model)) AS vehicle_name,
                v.plate_number,
                v.capacity
            FROM miller_vehicle_assignee mva
            INNER JOIN miller_delivery_vehicle_management v
                ON v.vehicle_id = mva.vehicle_id
            WHERE mva.supplier_profile_id = %s
              AND mva.driver_id = %s
              AND mva.status = 'active'
            LIMIT 1
            """,
            [supplier_profile_id, driver_id],
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
    supplier_profile_id: int,
    driver_id: int,
    search_query: str | None = None,
    payment_method_filter: str | None = None,
    sort_by: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """
    Retrieve assigned deliveries with Pending status and order statuses
    'Assigned to driver' or 'In transit' for the authenticated driver.
    """
    sql = """
        SELECT
            mda.assignment_id,
            mda.status AS assignment_status,
            mda.delivery_vehicle_id,
            mda.proof_of_delivery,
            mda.created_at AS assigned_at,
            moc.online_order_id,
            moc.batch_no,
            moc.expected_arrival_date,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.status AS order_status,
            moc.user_buyer_id,
            moc.warehouse_buyer_id,
            mp.product_id,
            mp.product_name,
            mp.unit_cost,
            COALESCE((
                SELECT SUM(moor.quantity)
                FROM miller_online_orders_returns moor
                WHERE moor.online_order_id = moc.online_order_id
                  AND LOWER(moor.status) = 'approved'
            ), 0) AS approved_return_qty,
            COALESCE(
                moop.payment_method,
                'Cash on Delivery'
            ) AS raw_payment_method,
            u.user_id,
            TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
            u.contact_number AS retailer_contact,
            TRIM(CONCAT_WS(', ', NULLIF(u.street_address, ''), NULLIF(u.barangay, ''), NULLIF(u.municipality, ''), NULLIF(u.province, ''))) AS retailer_address,
            wp.warehouse_profile_id,
            wp.business_name AS warehouse_name,
            wp.official_contact_number AS warehouse_contact,
            TRIM(CONCAT_WS(', ', NULLIF(wp.street_address, ''), NULLIF(wp.barangay, ''), NULLIF(wp.municipality, ''), NULLIF(wp.province, ''))) AS warehouse_address,
            TRIM(CONCAT_WS(' ', v.type, v.model)) AS vehicle_name,
            v.plate_number
        FROM miller_driver_assignment mda
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = mda.online_order_id
        INNER JOIN miller_vehicle_assignee mva
            ON mva.vehicle_id = mda.delivery_vehicle_id
            AND mva.driver_id = %s
            AND mva.supplier_profile_id = %s
            AND mva.status = 'active'
        LEFT JOIN miller_delivery_vehicle_management v
            ON v.vehicle_id = mda.delivery_vehicle_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN miller_online_orders_payment moop
            ON moop.online_order_id = moc.online_order_id
        LEFT JOIN users u
            ON u.user_id = moc.user_buyer_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = moc.warehouse_buyer_id
        WHERE mda.supplier_profile_id = %s
          AND mda.status = 'Pending'
          AND moc.status IN ('Assigned to driver', 'In transit')
    """
    params = [driver_id, supplier_profile_id, supplier_profile_id]

    if start_date:
        sql += " AND moc.expected_arrival_date >= %s"
        params.append(start_date)

    if end_date:
        sql += " AND moc.expected_arrival_date <= %s"
        params.append(end_date)

    # Sort
    if sort_by == "oldest":
        sql += " ORDER BY moc.expected_arrival_date ASC, moc.online_order_id ASC"
    else:
        sql += " ORDER BY moc.expected_arrival_date DESC, moc.online_order_id DESC"

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
        user_buyer_id = r[12]
        warehouse_buyer_id = r[13]
        product_id = r[14]
        product_name = r[15] or "Rice Product"
        unit_cost = Decimal(str(r[16] or "0"))
        approved_return_qty = Decimal(str(r[17] or "0"))
        raw_payment_method = r[18]
        retailer_name = r[20]
        retailer_contact = r[21]
        retailer_address = r[22]
        warehouse_name = r[24]
        warehouse_contact = r[25]
        warehouse_address = r[26]
        vehicle_name = r[27]
        plate_number = r[28]

        # Determine Customer Type and Details
        if warehouse_buyer_id:
            customer_type = "Warehouse"
            customer_name = warehouse_name or "Warehouse Customer"
            customer_contact = warehouse_contact or ""
            delivery_address = warehouse_address or ""
            buyer_id = warehouse_buyer_id
        else:
            customer_type = "Retailer"
            customer_name = retailer_name or "Retailer Customer"
            customer_contact = retailer_contact or ""
            delivery_address = retailer_address or ""
            buyer_id = user_buyer_id

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
            "buyer_group_key": f"{customer_type}_{buyer_id}",
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
    supplier_profile_id: int,
    driver_id: int,
    buyer_group_key: str | None = None,
    order_ids: list[int] | None = None,
) -> dict | None:
    """
    Fetch all active assigned orders for a specific buyer group.
    Ensures branch scoping and driver ownership.
    """
    all_duties = get_driver_duties(supplier_profile_id, driver_id)

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
        "customer_type": first["customer_type"],
        "buyer_id": first["buyer_id"],
        "customer_name": first["customer_name"],
        "customer_contact": first["customer_contact"],
        "delivery_address": first["delivery_address"],
        "orders": filtered,
    }


def get_last_ping_for_orders(
    supplier_profile_id: int,
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
            FROM miller_last_ping
            WHERE supplier_profile_id = %s
              AND driver_id = %s
              AND assignment_id IN ({placeholders})
            ORDER BY last_ping_at DESC
            LIMIT 1
            """,
            [supplier_profile_id, driver_id, *assignment_ids],
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
    supplier_profile_id: int,
    driver_id: int,
) -> list[dict]:
    """
    Retrieve conversations for the authenticated driver.
    Lists buyers (Retailer and Warehouse) assigned to this driver,
    including active assignment status, latest message, and unread counts.
    """
    with connection.cursor() as cursor:
        # 1. Get all unique buyers assigned to this driver
        cursor.execute(
            """
            SELECT DISTINCT
                moc.user_buyer_id,
                moc.warehouse_buyer_id
            FROM miller_driver_assignment mda
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = mda.online_order_id
            INNER JOIN miller_vehicle_assignee mva
                ON mva.vehicle_id = mda.delivery_vehicle_id
                AND mva.driver_id = %s
                AND mva.supplier_profile_id = %s
                AND mva.status = 'active'
            WHERE mda.supplier_profile_id = %s
            """,
            [driver_id, supplier_profile_id, supplier_profile_id],
        )
        assigned_buyers = cursor.fetchall()

    conversations = []

    for u_id, wh_id in assigned_buyers:
        is_retailer = u_id is not None
        recipient_id = u_id if is_retailer else wh_id
        recipient_type = "Retailer" if is_retailer else "Warehouse"

        with connection.cursor() as cursor:
            # 2. Buyer Profile Info
            if is_retailer:
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
            else:
                cursor.execute(
                    """
                    SELECT
                        business_name,
                        official_contact_number,
                        TRIM(CONCAT_WS(', ', NULLIF(street_address, ''), NULLIF(barangay, ''), NULLIF(municipality, ''), NULLIF(province, ''))) AS address
                    FROM warehouse_profiles
                    WHERE warehouse_profile_id = %s
                    LIMIT 1
                    """,
                    [recipient_id],
                )
            buyer_row = cursor.fetchone()
            if not buyer_row:
                continue

            buyer_name = buyer_row[0] or f"{recipient_type} #{recipient_id}"
            contact_number = buyer_row[1] or ""
            address = buyer_row[2] or ""

            # 3. Check for Active Delivery Assignment
            target_buyer_filter = "moc.user_buyer_id = %s" if is_retailer else "moc.warehouse_buyer_id = %s"
            cursor.execute(
                f"""
                SELECT
                    moc.batch_no,
                    COALESCE(mp.product_name, 'Rice Product') AS product_name,
                    moc.ordered_quantity,
                    moc.status AS order_status
                FROM miller_driver_assignment mda
                INNER JOIN miller_online_customer moc
                    ON moc.online_order_id = mda.online_order_id
                LEFT JOIN miller_products mp
                    ON mp.product_id = moc.miller_product_id
                INNER JOIN miller_vehicle_assignee mva
                    ON mva.vehicle_id = mda.delivery_vehicle_id
                    AND mva.driver_id = %s
                    AND mva.supplier_profile_id = %s
                    AND mva.status = 'active'
                WHERE mda.supplier_profile_id = %s
                  AND mda.status = 'Pending'
                  AND moc.status IN ('Assigned to driver', 'In transit')
                  AND {target_buyer_filter}
                ORDER BY moc.online_order_id ASC
                """,
                [driver_id, supplier_profile_id, supplier_profile_id, recipient_id],
            )
            active_orders = cursor.fetchall()

            has_active_assignment = len(active_orders) > 0
            active_batch_numbers = [r[0] for r in active_orders]
            batch_summary = (
                " · ".join(f"{r[0]} ({r[1]} {r[2]}kg)" for r in active_orders[:2])
                if active_orders
                else "No active delivery assignment"
            )

            # 4. Latest Message in Thread
            msg_filter = (
                """(
                    (m.sender_supplier_profile_id = %s AND m.receiver_user_id = %s)
                    OR (m.receiver_supplier_profile_id = %s AND m.sender_user_id = %s)
                )"""
                if is_retailer
                else """(
                    (m.sender_supplier_profile_id = %s AND m.receiver_warehouse_profile_id = %s)
                    OR (m.receiver_supplier_profile_id = %s AND m.sender_warehouse_profile_id = %s)
                )"""
            )
            cursor.execute(
                f"""
                SELECT
                    m.message_content,
                    m.created_at,
                    m.sender_supplier_profile_id
                FROM messages m
                WHERE {msg_filter}
                ORDER BY m.created_at DESC, m.message_id DESC
                LIMIT 1
                """,
                [supplier_profile_id, recipient_id, supplier_profile_id, recipient_id],
            )
            last_msg_row = cursor.fetchone()

            last_msg_text = last_msg_row[0] if last_msg_row else "No messages yet"
            last_msg_time = last_msg_row[1].isoformat() if last_msg_row and last_msg_row[1] else None

            # 5. Count Unread Messages from Buyer
            unread_filter = (
                """
                m.receiver_supplier_profile_id = %s
                AND m.sender_user_id = %s
                AND m.seen_at IS NULL
                """
                if is_retailer
                else """
                m.receiver_supplier_profile_id = %s
                AND m.sender_warehouse_profile_id = %s
                AND m.seen_at IS NULL
                """
            )
            cursor.execute(
                f"""
                SELECT COUNT(*)
                FROM messages m
                WHERE {unread_filter}
                """,
                [supplier_profile_id, recipient_id],
            )
            unread_count = cursor.fetchone()[0]

        conversations.append({
            "id": f"{recipient_type}_{recipient_id}",
            "recipient_id": recipient_id,
            "recipient_type": recipient_type,
            "name": buyer_name,
            "role": recipient_type,
            "contact_number": contact_number,
            "address": address,
            "has_active_assignment": has_active_assignment,
            "active_batch_numbers": active_batch_numbers,
            "batch": batch_summary,
            "lastMsg": last_msg_text,
            "lastMsgTime": last_msg_time,
            "unread": unread_count,
            "avatar": buyer_name[0].upper() if buyer_name else "B",
        })

    # Sort conversations: active assignments first, then by latest message date
    conversations.sort(
        key=lambda c: (1 if c["has_active_assignment"] else 0, c["lastMsgTime"] or ""),
        reverse=True,
    )
    return conversations


def get_driver_conversation_thread(
    supplier_profile_id: int,
    driver_id: int,
    recipient_id: int,
    recipient_type: str,
) -> dict:
    """
    Retrieve message history for a specific conversation with an assigned buyer.
    Also returns active assignment status, and marks incoming messages as seen.
    """
    is_retailer = recipient_type.lower() == "retailer"

    with connection.cursor() as cursor:
        # 1. Buyer details
        if is_retailer:
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
        else:
            cursor.execute(
                """
                SELECT
                    business_name,
                    official_contact_number,
                    TRIM(CONCAT_WS(', ', NULLIF(street_address, ''), NULLIF(barangay, ''), NULLIF(municipality, ''), NULLIF(province, ''))) AS address
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s
                LIMIT 1
                """,
                [recipient_id],
            )
        buyer_row = cursor.fetchone()
        buyer_name = buyer_row[0] if buyer_row else f"{recipient_type} #{recipient_id}"
        contact_number = buyer_row[1] if buyer_row else ""
        address = buyer_row[2] if buyer_row else ""

        # 2. Check active assignment
        target_buyer_filter = "moc.user_buyer_id = %s" if is_retailer else "moc.warehouse_buyer_id = %s"
        cursor.execute(
            f"""
            SELECT
                moc.batch_no,
                COALESCE(mp.product_name, 'Rice Product') AS product_name,
                moc.ordered_quantity,
                moc.status AS order_status
            FROM miller_driver_assignment mda
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = mda.online_order_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            INNER JOIN miller_vehicle_assignee mva
                ON mva.vehicle_id = mda.delivery_vehicle_id
                AND mva.driver_id = %s
                AND mva.supplier_profile_id = %s
                AND mva.status = 'active'
            WHERE mda.supplier_profile_id = %s
              AND mda.status = 'Pending'
              AND moc.status IN ('Assigned to driver', 'In transit')
              AND {target_buyer_filter}
            ORDER BY moc.online_order_id ASC
            """,
            [driver_id, supplier_profile_id, supplier_profile_id, recipient_id],
        )
        active_orders = cursor.fetchall()
        has_active_assignment = len(active_orders) > 0
        active_batch_numbers = list(dict.fromkeys(r[0] for r in active_orders if r[0]))

        # 3. Mark incoming unread messages as seen
        if is_retailer:
            cursor.execute(
                """
                UPDATE messages
                SET seen_at = NOW()
                WHERE receiver_supplier_profile_id = %s
                  AND sender_user_id = %s
                  AND seen_at IS NULL
                """,
                [supplier_profile_id, recipient_id],
            )
        else:
            cursor.execute(
                """
                UPDATE messages
                SET seen_at = NOW()
                WHERE receiver_supplier_profile_id = %s
                  AND sender_warehouse_profile_id = %s
                  AND seen_at IS NULL
                """,
                [supplier_profile_id, recipient_id],
            )

        # 4. Fetch chronological messages
        msg_filter = (
            """(
                (m.sender_supplier_profile_id = %s AND m.receiver_user_id = %s)
                OR (m.receiver_supplier_profile_id = %s AND m.sender_user_id = %s)
            )"""
            if is_retailer
            else """(
                (m.sender_supplier_profile_id = %s AND m.receiver_warehouse_profile_id = %s)
                OR (m.receiver_supplier_profile_id = %s AND m.sender_warehouse_profile_id = %s)
            )"""
        )
        cursor.execute(
            f"""
            SELECT
                m.message_id,
                m.sender_supplier_profile_id,
                m.message_content,
                m.created_at,
                m.seen_at
            FROM messages m
            WHERE {msg_filter}
            ORDER BY m.created_at ASC, m.message_id ASC
            """,
            [supplier_profile_id, recipient_id, supplier_profile_id, recipient_id],
        )
        msg_rows = cursor.fetchall()

    messages_list = []
    for r in msg_rows:
        msg_id, sender_sp, content, created_at, seen_at = r
        is_mine = sender_sp == supplier_profile_id

        # Time formatting
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
        "recipient_type": "Retailer" if is_retailer else "Warehouse",
        "name": buyer_name,
        "contact_number": contact_number,
        "address": address,
        "has_active_assignment": has_active_assignment,
        "active_batch_numbers": active_batch_numbers,
        "messages": messages_list,
    }


def get_driver_payment_submissions(
    supplier_profile_id: int,
    driver_id: int,
    search_query: str | None = None,
    payment_method_filter: str | None = None,
    status_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> list[dict]:
    """
    Fetch COD payments collected by the authenticated driver.
    Scoped strictly by supplier_profile_id and driver_id.
    Handles date range, search, payment method, and status filtering.
    Preserves transaction grouping by cod_transaction_key.
    """
    params = [supplier_profile_id, driver_id]
    where_clauses = ["cod.supplier_profile_id = %s", "cod.driver_id = %s"]

    # 1. Search Query
    if search_query and search_query.strip():
        q = f"%{search_query.strip()}%"
        where_clauses.append(
            """(
                moc.batch_no LIKE %s
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
            moc.batch_no,
            moc.ordered_quantity,
            COALESCE(mp.unit_cost, 0.0) AS unit_cost,
            moc.total_price AS order_total,
            COALESCE(mp.product_name, 'Rice Product') AS product_name,
            u.user_id,
            TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
            TRIM(CONCAT_WS(', ', NULLIF(u.street_address, ''), NULLIF(u.barangay, ''), NULLIF(u.municipality, ''), NULLIF(u.province, ''))) AS destination_address,
            COALESCE(sp.business_name, 'GrainRise Milling Company') AS business_name,
            TRIM(CONCAT_WS(' ', se.first_name, se.last_name)) AS driver_name
        FROM miller_online_customer_cash_on_delivery cod
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = cod.online_order_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN users u
            ON u.user_id = moc.user_buyer_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = cod.supplier_profile_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = cod.driver_id
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


def list_driver_fulfillment_variants(supplier_profile_id: int, driver_id: int) -> list:
    """
    Retrieve distinct variants associated with receiving/fulfillment history for this driver.
    """
    sql = """
        SELECT DISTINCT mp.product_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        INNER JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN miller_vehicle_assignee mva
            ON mva.assigned_id = rh.vehicle_assignee_id
        WHERE rh.supplier_profile_id = %s
          AND mp.product_name IS NOT NULL
          AND (
              mva.driver_id = %s
              OR EXISTS (
                  SELECT 1
                  FROM miller_driver_assignment mda
                  INNER JOIN miller_vehicle_assignee mva2
                      ON mva2.vehicle_id = mda.delivery_vehicle_id
                      AND mva2.driver_id = %s
                  WHERE mda.online_order_id = rh.online_order_id
              )
          )
        ORDER BY mp.product_name ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, driver_id, driver_id])
        rows = cursor.fetchall()
        variants = [r[0] for r in rows if r[0]]

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


def list_driver_fulfillment_history(
    supplier_profile_id: int,
    driver_id: int,
    search: str | None = None,
    variant_filter: str | None = None,
    buyer_type_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    sort_by: str | None = None,
) -> list:
    """
    Retrieve completed fulfillment records strictly scoped to the authenticated driver.
    Identifies the driver through direct receiving assignment (rh.vehicle_assignee_id)
    or historical delivery assignment (miller_driver_assignment).
    """
    where_clauses = [
        "rh.supplier_profile_id = %s",
        """(
            mva.driver_id = %s
            OR EXISTS (
                SELECT 1
                FROM miller_driver_assignment mda_check
                INNER JOIN miller_vehicle_assignee mva_check
                    ON mva_check.vehicle_id = mda_check.delivery_vehicle_id
                    AND mva_check.driver_id = %s
                WHERE mda_check.online_order_id = rh.online_order_id
            )
        )"""
    ]
    params = [supplier_profile_id, driver_id, driver_id]

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

    # Search filter: receiving reference no, batch no, product name, customer name
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
            -- Driver & Vehicle Info
            mva.assigned_id AS vehicle_assignee_id,
            mva.status AS assignment_status,
            COALESCE(v.model, v_mda.model) AS vehicle_model,
            COALESCE(v.plate_number, v_mda.plate_number) AS vehicle_plate_number,
            COALESCE(v.type, v_mda.type) AS vehicle_type,
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
        LEFT JOIN miller_driver_assignment mda
            ON mda.online_order_id = rh.online_order_id
        LEFT JOIN miller_delivery_vehicle_management v_mda
            ON v_mda.vehicle_id = mda.delivery_vehicle_id
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
            buyer_name = _format_person_name(r[22], r[23], r[24], r[25]) or "Retailer Buyer"

        driver_name = _format_person_name(r[32], r[33], r[34], r[35]) if r[32] else "Assigned Driver"

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
            "proof_url": _resolve_photo_url_val(r[7]),
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


def list_driver_vehicle_assigned_history(
    supplier_profile_id: int,
    driver_id: int,
    search: str | None = None,
    status_filter: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    sort_by: str | None = None,
) -> list:
    """
    Retrieve all vehicle assignment records belonging to the authenticated driver.
    Includes both active and changed assignments.
    """
    where_clauses = [
        "mva.supplier_profile_id = %s",
        "mva.driver_id = %s",
    ]
    params = [supplier_profile_id, driver_id]

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

    # Search filter: vehicle model, plate number, or vehicle type
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
    order_by_sql = "ORDER BY mva.created_at DESC, mva.assigned_id DESC"
    if sort_by == "model-asc":
        order_by_sql = "ORDER BY v.model ASC, mva.created_at DESC"
    elif sort_by == "model-desc":
        order_by_sql = "ORDER BY v.model DESC, mva.created_at DESC"
    elif sort_by == "plate-asc":
        order_by_sql = "ORDER BY v.plate_number ASC, mva.created_at DESC"
    elif sort_by == "plate-desc":
        order_by_sql = "ORDER BY v.plate_number DESC, mva.created_at DESC"
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
            se.suffix AS driver_suffix
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


# ═════════════════════════════════════════════════════════════════════════════
# DRIVER DASHBOARD SELECTOR
# ═════════════════════════════════════════════════════════════════════════════

def get_driver_dashboard_data(supplier_profile_id: int, driver_id: int) -> dict:
    """
    Retrieve live dashboard data for the authenticated Driver:
    - KPI Metrics: Active Duties, Assigned Duties, Pending Payments, Unread Messages
    - Current Active Duty: Oldest unfinished 'In transit' delivery group
    - Load Utilization: Driver's currently assigned vehicle, actual capacity, assigned load, remaining capacity, delivered load
    - Delivery Management Table: Recent/active deliveries preview
    """
    # 1. Fetch all duties currently pending for this driver
    all_duties = get_driver_duties(supplier_profile_id=supplier_profile_id, driver_id=driver_id)
    assigned_duties_count = len(all_duties)

    # In transit duties
    in_transit_duties = [
        d for d in all_duties
        if str(d.get("order_status", "")).strip().lower() == "in transit"
    ]
    active_duties_count = len(in_transit_duties)

    # 2. Retrieve Driver's currently assigned vehicle through miller_vehicle_assignee
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mva.assigned_id,
                v.vehicle_id,
                v.plate_number,
                v.model,
                v.type,
                v.capacity,
                v.status AS vehicle_status
            FROM miller_vehicle_assignee mva
            INNER JOIN miller_delivery_vehicle_management v
                ON v.vehicle_id = mva.vehicle_id
            WHERE mva.driver_id = %s
              AND mva.supplier_profile_id = %s
              AND mva.status = 'active'
            ORDER BY mva.assigned_id DESC
            LIMIT 1
            """,
            [driver_id, supplier_profile_id],
        )
        veh_row = cursor.fetchone()

    has_vehicle = veh_row is not None
    if has_vehicle:
        assigned_id = veh_row[0]
        vehicle_id = veh_row[1]
        plate_number = veh_row[2] or "—"
        model = veh_row[3] or "Vehicle"
        vehicle_type = veh_row[4] or "Delivery Vehicle"
        max_capacity_kg = _parse_capacity_kg_val(veh_row[5])
    else:
        assigned_id = None
        vehicle_id = None
        plate_number = "—"
        model = ""
        vehicle_type = ""
        max_capacity_kg = 0.0

    # Assigned Load (using effective delivery quantities including approved return replacements)
    assigned_load_kg = sum(float(d.get("display_quantity") or 0.0) for d in all_duties)
    remaining_capacity_kg = max(0.0, max_capacity_kg - assigned_load_kg) if has_vehicle else 0.0
    utilization_pct = round((assigned_load_kg / max_capacity_kg) * 100, 1) if has_vehicle and max_capacity_kg > 0 else 0.0
    percent_assigned = min(100.0, utilization_pct)

    # Delivered Load (confirmed receiving records for this driver/vehicle)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(rh.total_received), 0.0)
            FROM miller_online_customer_receiving_history rh
            WHERE rh.supplier_profile_id = %s
              AND (
                  EXISTS (
                      SELECT 1 FROM miller_vehicle_assignee mva
                      WHERE mva.assigned_id = rh.vehicle_assignee_id AND mva.driver_id = %s
                  )
                  OR EXISTS (
                      SELECT 1 FROM miller_driver_assignment mda
                      INNER JOIN miller_vehicle_assignee mva2 ON mva2.vehicle_id = mda.delivery_vehicle_id
                      WHERE mda.online_order_id = rh.online_order_id AND mva2.driver_id = %s
                  )
              )
            """,
            [supplier_profile_id, driver_id, driver_id],
        )
        deliv_row = cursor.fetchone()
        delivered_load_kg = float(deliv_row[0] or 0.0) if deliv_row else 0.0

    # 3. Pending Payments KPI (unique COD transactions with 'Handled' status)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(DISTINCT COALESCE(NULLIF(cod.cod_transaction_key, ''), CONCAT('single_', cod.cod_id)))
            FROM miller_online_customer_cash_on_delivery cod
            WHERE cod.supplier_profile_id = %s
              AND cod.driver_id = %s
              AND cod.status = 'Handled'
            """,
            [supplier_profile_id, driver_id],
        )
        cod_row = cursor.fetchone()
        pending_payments_count = int(cod_row[0] or 0) if cod_row else 0

    # 4. Unread Messages KPI (unread messages from buyers with active assignments to this driver)
    unread_messages_count = 0
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT moc.user_buyer_id, moc.warehouse_buyer_id
            FROM miller_driver_assignment mda
            INNER JOIN miller_online_customer moc ON moc.online_order_id = mda.online_order_id
            INNER JOIN miller_vehicle_assignee mva ON mva.vehicle_id = mda.delivery_vehicle_id
                AND mva.driver_id = %s
                AND mva.supplier_profile_id = %s
                AND mva.status = 'active'
            WHERE mda.supplier_profile_id = %s
              AND mda.status = 'Pending'
              AND moc.status IN ('Assigned to driver', 'In transit')
            """,
            [driver_id, supplier_profile_id, supplier_profile_id],
        )
        active_buyers = cursor.fetchall()

        for u_id, wh_id in active_buyers:
            if u_id is not None:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM messages
                    WHERE receiver_supplier_profile_id = %s
                      AND sender_user_id = %s
                      AND seen_at IS NULL
                    """,
                    [supplier_profile_id, u_id],
                )
            elif wh_id is not None:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM messages
                    WHERE receiver_supplier_profile_id = %s
                      AND sender_warehouse_profile_id = %s
                      AND seen_at IS NULL
                    """,
                    [supplier_profile_id, wh_id],
                )
            else:
                continue

            cnt_row = cursor.fetchone()
            if cnt_row:
                unread_messages_count += int(cnt_row[0] or 0)

    # 5. Current Active Duty: Oldest unfinished In transit delivery group
    current_active_duty = None
    most_recent_active_group_key = None

    if in_transit_duties:
        # Group In transit orders by buyer_group_key
        # The oldest group based on assignment_id (first encountered)
        oldest_group_key = in_transit_duties[0]["buyer_group_key"]
        group_orders = [d for d in in_transit_duties if d["buyer_group_key"] == oldest_group_key]

        distinct_batches = list(dict.fromkeys(d["batch_no"] for d in group_orders if d.get("batch_no")))
        batch_no_display = ", ".join(distinct_batches)
        first_order = group_orders[0]
        customer_type = first_order.get("customer_type") or "Retailer"
        buyer_name = first_order.get("customer_name") or "Buyer"
        distinct_commodities = list(dict.fromkeys(d.get("product_name") or "Rice" for d in group_orders))
        commodity_display = ", ".join(distinct_commodities)

        combined_quantity = sum(float(d.get("display_quantity") or 0.0) for d in group_orders)
        qty_formatted = f"{combined_quantity:,.0f} kg" if combined_quantity.is_integer() else f"{combined_quantity:,.2f} kg"

        current_active_duty = {
            "exists": True,
            "buyer_group_key": oldest_group_key,
            "batch_no": batch_no_display,
            "batch_numbers": distinct_batches,
            "retailer": buyer_name,
            "customer_name": buyer_name,
            "customer_type": customer_type,
            "commodity": commodity_display,
            "quantity": qty_formatted,
            "quantity_val": combined_quantity,
            "delivery_schedule": first_order.get("expected_arrival_date") or "—",
            "order_ids": [d["online_order_id"] for d in group_orders],
        }

        # Most recently assigned unfinished delivery group for Active Duties KPI card click
        most_recent_active_group_key = in_transit_duties[-1]["buyer_group_key"]
    elif all_duties:
        most_recent_active_group_key = all_duties[0]["buyer_group_key"]

    # 6. Load Utilization Payload
    load_utilization = {
        "has_vehicle": has_vehicle,
        "vehicle_id": vehicle_id,
        "model": model,
        "plate_number": plate_number,
        "type": vehicle_type,
        "max_load": f"{max_capacity_kg:,.2f} kg" if has_vehicle else "No Assigned Vehicle",
        "assigned_load": f"{assigned_load_kg:,.2f}" if has_vehicle else "0.00",
        "assigned_load_full": f"{assigned_load_kg:,.2f} kg" if has_vehicle else "0.00 kg",
        "remaining_capacity": f"{remaining_capacity_kg:,.2f} kg" if has_vehicle else "0.00 kg",
        "delivered_load": f"{delivered_load_kg:,.2f} kg" if has_vehicle else "0.00 kg",
        "percent_assigned": percent_assigned if has_vehicle else 0.0,
        "utilization_percentage": utilization_pct if has_vehicle else 0.0,
        "no_vehicle_message": "No Assigned Vehicle" if not has_vehicle else None,
    }

    # 7. Delivery Management Table Preview (up to 5 actual Driver assignments)
    delivery_preview = []
    for d in all_duties[:5]:
        qty_val = float(d.get("display_quantity") or 0.0)
        qty_str = f"{qty_val:,.0f} kg" if qty_val.is_integer() else f"{qty_val:,.2f} kg"
        delivery_preview.append({
            "online_order_id": d.get("online_order_id"),
            "batch_no": d.get("batch_no") or "—",
            "retailer": d.get("customer_name") or "Retailer",
            "customer_name": d.get("customer_name") or "Retailer",
            "customer_type": d.get("customer_type") or "Retailer",
            "commodity": d.get("product_name") or "Rice Product",
            "variety": qty_str,
            "status": d.get("order_status") or "Assigned",
            "schedule": d.get("expected_arrival_date") or "—",
            "buyer_group_key": d.get("buyer_group_key"),
        })

    return {
        "kpis": {
            "active_duties": active_duties_count,
            "assigned_duties": assigned_duties_count,
            "pending_payments": pending_payments_count,
            "unread_messages": unread_messages_count,
            "most_recent_active_group_key": most_recent_active_group_key,
        },
        "current_active_duty": current_active_duty,
        "load_utilization": load_utilization,
        "deliveries": delivery_preview,
    }


# ═════════════════════════════════════════════════════════════════════════════
# DRIVER NOTIFICATIONS SELECTORS
# ═════════════════════════════════════════════════════════════════════════════

def sync_and_list_driver_notifications(
    supplier_profile_id: int,
    driver_id: int,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """
    Ensure all delivery assignments belonging to this authenticated driver
    have a notification record, then list them newest first.
    Strictly isolated to employee_type = 'driver_{driver_id}'.
    """
    emp_type = f"driver_{driver_id}"

    with connection.cursor() as cursor:
        # 1. Fetch assignments belonging to this driver
        cursor.execute(
            """
            SELECT
                mda.assignment_id,
                moc.online_order_id,
                moc.batch_no,
                mp.product_name,
                moc.ordered_quantity,
                COALESCE((
                    SELECT SUM(moor.quantity)
                    FROM miller_online_orders_returns moor
                    WHERE moor.online_order_id = moc.online_order_id
                      AND LOWER(moor.status) = 'approved'
                ), 0) AS approved_return_qty,
                mda.created_at,
                u.first_name, u.last_name,
                wp.business_name,
                moc.warehouse_buyer_id
            FROM miller_driver_assignment mda
            INNER JOIN miller_online_customer moc ON moc.online_order_id = mda.online_order_id
            INNER JOIN miller_vehicle_assignee mva ON mva.vehicle_id = mda.delivery_vehicle_id
                AND mva.driver_id = %s
                AND mva.supplier_profile_id = %s
                AND mva.status = 'active'
            LEFT JOIN miller_products mp ON mp.product_id = moc.miller_product_id
            LEFT JOIN users u ON u.user_id = moc.user_buyer_id
            LEFT JOIN warehouse_profiles wp ON wp.warehouse_profile_id = moc.warehouse_buyer_id
            WHERE mda.supplier_profile_id = %s
            ORDER BY mda.assignment_id DESC
            """,
            [driver_id, supplier_profile_id, supplier_profile_id],
        )
        assigned_rows = cursor.fetchall()

        for row in assigned_rows:
            batch_no = row[2] or f"BATCH-{row[1]}"
            p_name = row[3] or "Rice Product"
            app_ret_qty = float(row[5] or 0.0)
            ord_qty = float(row[4] or 0.0)
            effective_qty = app_ret_qty if app_ret_qty > 0 else ord_qty
            created_at = row[6] or datetime.now()
            buyer_name = row[9] if row[10] else f"{row[7] or ''} {row[8] or ''}".strip() or "Buyer"

            # Check if notification exists
            cursor.execute(
                """
                SELECT notification_id
                FROM miller_employee_notifications
                WHERE supplier_profile_id = %s
                  AND employee_type = %s
                  AND notification_title = 'New Delivery Assignment'
                  AND notification_content LIKE %s
                LIMIT 1
                """,
                [supplier_profile_id, emp_type, f"%{batch_no}%"],
            )
            exists = cursor.fetchone()
            if not exists:
                content = f"Delivery {batch_no} ({effective_qty:,.0f} kg of {p_name}) for {buyer_name} has been assigned to you."
                cursor.execute(
                    """
                    INSERT INTO miller_employee_notifications (
                        supplier_profile_id,
                        employee_type,
                        notification_title,
                        notification_content,
                        action_url,
                        created_at,
                        status
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'unseen')
                    """,
                    [
                        supplier_profile_id,
                        emp_type,
                        "New Delivery Assignment",
                        content,
                        "/miller-driver/my-duties",
                        created_at,
                    ],
                )

        # 2. Query notifications for this driver
        limit_val = max(1, min(int(limit), 100))
        offset_val = max(0, int(offset))
        cursor.execute(
            """
            SELECT
                notification_id,
                supplier_profile_id,
                employee_type,
                notification_title,
                notification_content,
                action_url,
                created_at,
                status,
                seen_by_employee_id,
                seen_at
            FROM miller_employee_notifications
            WHERE supplier_profile_id = %s
              AND employee_type = %s
            ORDER BY created_at DESC, notification_id DESC
            LIMIT %s OFFSET %s
            """,
            [supplier_profile_id, emp_type, limit_val, offset_val],
        )
        notif_rows = cursor.fetchall()

    notifs = []
    for r in notif_rows:
        created_at_dt = r[6]
        seen_at_dt = r[9]
        is_seen = str(r[7] or "unseen").lower() == "seen"
        notifs.append({
            "notification_id": r[0],
            "id": r[0],
            "supplier_profile_id": r[1],
            "employee_type": r[2],
            "notification_title": r[3],
            "title": r[3],
            "notification_content": r[4],
            "message": r[4],
            "content": r[4],
            "action_url": r[5] or "/miller-driver/my-duties",
            "created_at": created_at_dt.isoformat() if created_at_dt else None,
            "status": r[7],
            "is_seen": is_seen,
            "is_read": is_seen,
            "seen_by_employee_id": r[8],
            "seen_at": seen_at_dt.isoformat() if seen_at_dt else None,
        })

    return notifs


def count_driver_unseen_notifications(supplier_profile_id: int, driver_id: int) -> int:
    """
    Count unseen notifications for the authenticated Driver.
    """
    sync_and_list_driver_notifications(supplier_profile_id, driver_id, limit=1)
    emp_type = f"driver_{driver_id}"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_employee_notifications
            WHERE supplier_profile_id = %s
              AND employee_type = %s
              AND status = 'unseen'
            """,
            [supplier_profile_id, emp_type],
        )
        row = cursor.fetchone()
        return int(row[0] or 0) if row else 0


def mark_driver_notification_seen(supplier_profile_id: int, driver_id: int, notification_id: int) -> bool:
    """
    Mark a specific notification as seen for the authenticated Driver.
    """
    emp_type = f"driver_{driver_id}"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE miller_employee_notifications
            SET status = 'seen',
                seen_by_employee_id = %s,
                seen_at = NOW()
            WHERE notification_id = %s
              AND supplier_profile_id = %s
              AND employee_type = %s
            """,
            [driver_id, notification_id, supplier_profile_id, emp_type],
        )
        return cursor.rowcount > 0


def mark_all_driver_notifications_seen(supplier_profile_id: int, driver_id: int) -> bool:
    """
    Mark all unseen notifications as seen for the authenticated Driver.
    """
    emp_type = f"driver_{driver_id}"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE miller_employee_notifications
            SET status = 'seen',
                seen_by_employee_id = %s,
                seen_at = NOW()
            WHERE supplier_profile_id = %s
              AND employee_type = %s
              AND status = 'unseen'
            """,
            [driver_id, supplier_profile_id, emp_type],
        )
        return True


