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

