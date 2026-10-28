import logging
from decimal import Decimal
from django.db import connection
from django.utils import timezone

from .selectors import get_warehouse_sales_notification_by_id

logger = logging.getLogger(__name__)


def create_warehouse_sales_notification(
    warehouse_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/warehouse-sales/dashboard",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Warehouse Sales belonging to warehouse_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'sales'.
    """
    if not warehouse_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/warehouse-sales/dashboard").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_employee_notifications
                    WHERE warehouse_profile_id = %s
                      AND employee_type = 'sales'
                      AND notification_content LIKE %s
                    """,
                    [warehouse_profile_id, f"%{deduplication_key}%"],
                )
            else:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_employee_notifications
                    WHERE warehouse_profile_id = %s
                      AND employee_type = 'sales'
                      AND notification_content = %s
                    """,
                    [warehouse_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate warehouse sales notification for warehouse_profile_id=%s, title=%s",
                    warehouse_profile_id,
                    clean_title,
                )
                return False

            sql_insert = """
                INSERT INTO warehouse_employee_notifications (
                    warehouse_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    created_at,
                    status
                ) VALUES (%s, 'sales', %s, %s, %s, %s, 'unseen')
            """
            cursor.execute(
                sql_insert,
                [warehouse_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created warehouse sales notification for warehouse_profile_id=%s, title=%s",
                warehouse_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create warehouse sales notification for warehouse_profile_id=%s: %s",
            warehouse_profile_id,
            exc,
        )
        return False


def sync_warehouse_sales_activity_notifications(warehouse_profile_id: int):
    """
    Idempotently generate Sales notifications from actual database events:
    1. New online orders: woc.status IN ('Ordered', 'pending')
    2. Approved orders: woc.status = 'Forwarded to Logistics'
    3. Declined orders: woc.status = 'Declined'
    4. Payment updates: woop.status IN ('paid', 'submitted to driver')

    Strictly scoped to warehouse_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'sales'.
    Uses actual event timestamps to preserve chronological order.
    """
    now = timezone.now()

    # 1. New Online Orders
    sql_new_orders = """
        SELECT
            woc.online_order_id,
            woc.batch_no,
            wp.product_name,
            woc.ordered_quantity,
            COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                'Retailer'
            ) AS buyer_name,
            woc.created_at
        FROM warehouse_online_customer woc
        LEFT JOIN warehouse_products wp ON woc.warehouse_product_id = wp.product_id
        LEFT JOIN users u ON woc.retailer_buyer_id = u.user_id
        WHERE woc.warehouse_profile_id = %s
          AND LOWER(TRIM(woc.status)) IN ('ordered', 'pending')
        ORDER BY woc.online_order_id DESC
        LIMIT 50
    """

    # 2. Approved Online Orders
    sql_approved_orders = """
        SELECT
            woc.online_order_id,
            woc.batch_no,
            wp.product_name,
            woc.ordered_quantity,
            COALESCE(woc.updated_at, woc.created_at) AS event_time
        FROM warehouse_online_customer woc
        LEFT JOIN warehouse_products wp ON woc.warehouse_product_id = wp.product_id
        WHERE woc.warehouse_profile_id = %s
          AND LOWER(TRIM(woc.status)) = 'forwarded to logistics'
        ORDER BY woc.online_order_id DESC
        LIMIT 50
    """

    # 3. Declined Online Orders
    sql_declined_orders = """
        SELECT
            woc.online_order_id,
            woc.batch_no,
            wp.product_name,
            COALESCE(woc.updated_at, woc.created_at) AS event_time
        FROM warehouse_online_customer woc
        LEFT JOIN warehouse_products wp ON woc.warehouse_product_id = wp.product_id
        WHERE woc.warehouse_profile_id = %s
          AND LOWER(TRIM(woc.status)) = 'declined'
        ORDER BY woc.online_order_id DESC
        LIMIT 50
    """

    # 4. Payment updates
    sql_payments = """
        SELECT
            woop.cod_id,
            woc.batch_no,
            woop.amount,
            woop.payment_method,
            woop.status,
            COALESCE(woc.updated_at, woc.created_at) AS event_time
        FROM warehouse_online_orders_payment woop
        JOIN warehouse_online_customer woc ON woop.online_order_id = woc.online_order_id
        WHERE woop.warehouse_profile_id = %s
          AND LOWER(TRIM(woop.status)) IN ('paid', 'submitted to driver')
        ORDER BY woop.cod_id DESC
        LIMIT 50
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_new_orders, [warehouse_profile_id])
        new_orders = cursor.fetchall()

        cursor.execute(sql_approved_orders, [warehouse_profile_id])
        approved_orders = cursor.fetchall()

        cursor.execute(sql_declined_orders, [warehouse_profile_id])
        declined_orders = cursor.fetchall()

        cursor.execute(sql_payments, [warehouse_profile_id])
        payments = cursor.fetchall()

        # Existing notification content set for quick deduplication
        cursor.execute(
            """
            SELECT notification_content
            FROM warehouse_employee_notifications
            WHERE warehouse_profile_id = %s
              AND employee_type = 'sales'
            """,
            [warehouse_profile_id],
        )
        existing_contents = {row[0] for row in cursor.fetchall()}

        to_insert = []

        # Process New Online Orders
        for o_id, batch_no, prod_name, qty, buyer_name, created_at in new_orders:
            batch_str = batch_no or f"ORDER-{o_id}"
            prod_str = prod_name or "Rice Supply"
            qty_val = Decimal(str(qty or 0))
            qty_fmt = f"{int(qty_val):,}" if qty_val % 1 == 0 else f"{qty_val:,.2f}"
            buyer_str = buyer_name or "Retailer"

            content = f"New online order {batch_str} for {prod_str} ({qty_fmt} kg) received from {buyer_str}."
            if content not in existing_contents:
                existing_contents.add(content)
                dt = created_at or now
                to_insert.append((
                    warehouse_profile_id,
                    "sales",
                    "New Online Order",
                    content,
                    "/warehouse-sales/online-orders",
                    dt,
                ))

        # Process Approved Online Orders
        for o_id, batch_no, prod_name, qty, event_time in approved_orders:
            batch_str = batch_no or f"ORDER-{o_id}"
            prod_str = prod_name or "Rice Supply"
            qty_val = Decimal(str(qty or 0))
            qty_fmt = f"{int(qty_val):,}" if qty_val % 1 == 0 else f"{qty_val:,.2f}"

            content = f"Online order {batch_str} for {prod_str} ({qty_fmt} kg) has been approved and forwarded to logistics."
            if content not in existing_contents:
                existing_contents.add(content)
                dt = event_time or now
                to_insert.append((
                    warehouse_profile_id,
                    "sales",
                    "Order Approved",
                    content,
                    "/warehouse-sales/online-orders",
                    dt,
                ))

        # Process Declined Online Orders
        for o_id, batch_no, prod_name, event_time in declined_orders:
            batch_str = batch_no or f"ORDER-{o_id}"
            prod_str = prod_name or "Rice Supply"

            content = f"Online order {batch_str} for {prod_str} was declined."
            if content not in existing_contents:
                existing_contents.add(content)
                dt = event_time or now
                to_insert.append((
                    warehouse_profile_id,
                    "sales",
                    "Order Declined",
                    content,
                    "/warehouse-sales/online-orders",
                    dt,
                ))

        # Process Payment updates
        for cod_id, batch_no, amount, method, pay_status, event_time in payments:
            batch_str = batch_no or "N/A"
            amt_val = float(amount or 0.0)
            status_str = str(pay_status or "").strip().lower()
            method_str = str(method or "Payment").strip()
            if method_str.lower() == "cash/cod":
                method_display = "Cash on Delivery"
            elif method_str.lower() == "bank":
                method_display = "Bank Transfer"
            elif method_str.lower() == "gcash":
                method_display = "GCash"
            else:
                method_display = method_str.capitalize()

            if status_str == "paid":
                content = f"Payment of ₱{amt_val:,.2f} for order {batch_str} via {method_display} has been verified."
                title = "Payment Verified"
            else:
                content = f"COD payment of ₱{amt_val:,.2f} for order {batch_str} was submitted to driver."
                title = "Payment Submitted to Driver"

            if content not in existing_contents:
                existing_contents.add(content)
                dt = event_time or now
                to_insert.append((
                    warehouse_profile_id,
                    "sales",
                    title,
                    content,
                    "/warehouse-sales/sales-history",
                    dt,
                ))

        if to_insert:
            sql_bulk = """
                INSERT INTO warehouse_employee_notifications (
                    warehouse_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    created_at,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s, 'unseen')
            """
            cursor.executemany(sql_bulk, to_insert)
            logger.info("Synced %d warehouse sales notifications for branch %s", len(to_insert), warehouse_profile_id)


def mark_warehouse_sales_notification_as_seen(warehouse_profile_id: int, notification_id: int, employee_id: int = None):
    """
    Mark a single sales notification as seen, scoped strictly to warehouse_profile_id.
    """
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM warehouse_employees WHERE warehouse_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    query = """
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE notification_id = %s
          AND warehouse_profile_id = %s
          AND employee_type = 'sales'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, notification_id, warehouse_profile_id])
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_warehouse_sales_notification_by_id(warehouse_profile_id, notification_id)


def mark_all_warehouse_sales_notifications_seen(warehouse_profile_id: int, employee_id: int = None):
    """
    Mark all unseen sales notifications as seen for this branch.
    """
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM warehouse_employees WHERE warehouse_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    query = """
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE warehouse_profile_id = %s
          AND employee_type = 'sales'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, warehouse_profile_id])
        rows_affected = cursor.rowcount

    return rows_affected
