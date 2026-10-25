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
