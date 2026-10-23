import datetime
import logging
from decimal import Decimal
from django.db import connection, transaction
from django.utils import timezone

from .selectors import get_sales_notification_by_id

logger = logging.getLogger(__name__)


def create_sales_notification(
    supplier_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/miller-sales/dashboard",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Miller Sales belonging to supplier_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'sales'.
    """
    if not supplier_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/miller-sales/dashboard").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM miller_employee_notifications
                    WHERE supplier_profile_id = %s
                      AND employee_type = 'sales'
                      AND notification_content LIKE %s
                    """,
                    [supplier_profile_id, f"%{deduplication_key}%"],
                )
            else:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM miller_employee_notifications
                    WHERE supplier_profile_id = %s
                      AND employee_type = 'sales'
                      AND notification_content = %s
                    """,
                    [supplier_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate sales notification for supplier_profile_id=%s, title=%s",
                    supplier_profile_id,
                    clean_title,
                )
                return False

            sql_insert = """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
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
                [supplier_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created sales notification for supplier_profile_id=%s, title=%s",
                supplier_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create sales notification for supplier_profile_id=%s: %s",
            supplier_profile_id,
            exc,
        )
        return False


def sync_sales_activity_notifications(supplier_profile_id: int):
    """
    Idempotently generate Sales notifications from actual database events:
    1. New online orders: moc.status IN ('Ordered', 'pending')
    2. Approved orders: moc.status = 'Forwarded to Logistics'
    3. Declined orders: moc.status = 'Declined'
    4. Payment updates: moop.status IN ('paid', 'submitted to driver')

    Strictly scoped to supplier_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'sales'.
    Uses actual event timestamps to preserve chronological order.
    """
    now = timezone.now()

    # 1. New Online Orders
    sql_new_orders = """
        SELECT
            moc.online_order_id,
            moc.batch_no,
            mp.product_name,
            moc.ordered_quantity,
            COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                NULLIF(TRIM(wp.business_name), ''),
                'Buyer'
            ) AS buyer_name,
            moc.created_at
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        LEFT JOIN users u ON moc.user_buyer_id = u.user_id
        LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
        WHERE moc.supplier_profile_id = %s
          AND LOWER(TRIM(moc.status)) IN ('ordered', 'pending')
        ORDER BY moc.online_order_id DESC
        LIMIT 50
    """

    # 2. Approved Online Orders
    sql_approved_orders = """
        SELECT
            moc.online_order_id,
            moc.batch_no,
            mp.product_name,
            moc.ordered_quantity,
            COALESCE(moc.updated_at, moc.created_at) AS event_time
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE moc.supplier_profile_id = %s
          AND LOWER(TRIM(moc.status)) = 'forwarded to logistics'
        ORDER BY moc.online_order_id DESC
        LIMIT 50
    """

    # 3. Declined Online Orders
    sql_declined_orders = """
        SELECT
            moc.online_order_id,
            moc.batch_no,
            mp.product_name,
            COALESCE(moc.updated_at, moc.created_at) AS event_time
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE moc.supplier_profile_id = %s
          AND LOWER(TRIM(moc.status)) = 'declined'
        ORDER BY moc.online_order_id DESC
        LIMIT 50
    """

    # 4. Payment updates
    sql_payments = """
        SELECT
            moop.cod_id,
            moc.batch_no,
            moop.amount,
            moop.payment_method,
            moop.status,
            COALESCE(moc.updated_at, moc.created_at) AS event_time
        FROM miller_online_orders_payment moop
        JOIN miller_online_customer moc ON moop.online_order_id = moc.online_order_id
        WHERE moop.supplier_profile_id = %s
          AND LOWER(TRIM(moop.status)) IN ('paid', 'submitted to driver')
        ORDER BY moop.cod_id DESC
        LIMIT 50
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_new_orders, [supplier_profile_id])
        new_orders = cursor.fetchall()

        cursor.execute(sql_approved_orders, [supplier_profile_id])
        approved_orders = cursor.fetchall()

        cursor.execute(sql_declined_orders, [supplier_profile_id])
        declined_orders = cursor.fetchall()

        cursor.execute(sql_payments, [supplier_profile_id])
        payments = cursor.fetchall()

        # Existing notification content set for quick deduplication
        cursor.execute(
            """
            SELECT notification_content
            FROM miller_employee_notifications
            WHERE supplier_profile_id = %s
              AND employee_type = 'sales'
            """,
            [supplier_profile_id],
        )
        existing_contents = {row[0] for row in cursor.fetchall()}

        to_insert = []

        # Process New Online Orders
        for o_id, batch_no, prod_name, qty, buyer_name, created_at in new_orders:
            batch_str = batch_no or f"ORDER-{o_id}"
            prod_str = prod_name or "Rice Supply"
            qty_val = Decimal(str(qty or 0))
            qty_fmt = f"{int(qty_val):,}" if qty_val % 1 == 0 else f"{qty_val:,.2f}"
            buyer_str = buyer_name or "Buyer"

            content = f"New online order {batch_str} for {prod_str} ({qty_fmt} kg) received from {buyer_str}."
            if content not in existing_contents:
                existing_contents.add(content)
                dt = created_at or now
                to_insert.append((
                    supplier_profile_id,
                    "sales",
                    "New Online Order",
                    content,
                    "/miller-sales/online-orders",
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
                    supplier_profile_id,
                    "sales",
                    "Order Approved",
                    content,
                    "/miller-sales/online-orders",
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
                    supplier_profile_id,
                    "sales",
                    "Order Declined",
                    content,
                    "/miller-sales/online-orders",
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
                    supplier_profile_id,
                    "sales",
                    title,
                    content,
                    "/miller-sales/sales-history",
                    dt,
                ))

        if to_insert:
            sql_bulk = """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    created_at,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s, 'unseen')
            """
            cursor.executemany(sql_bulk, to_insert)
            logger.info("Synced %d sales notifications for branch %s", len(to_insert), supplier_profile_id)


def mark_notification_as_seen(supplier_profile_id: int, notification_id: int, employee_id: int = None):
    """
    Mark a single sales notification as seen, scoped strictly to supplier_profile_id.
    """
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM supplier_employees WHERE supplier_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    query = """
        UPDATE miller_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE notification_id = %s
          AND supplier_profile_id = %s
          AND employee_type = 'sales'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, notification_id, supplier_profile_id])
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_sales_notification_by_id(supplier_profile_id, notification_id)


def mark_all_sales_notifications_seen(supplier_profile_id: int, employee_id: int = None):
    """
    Mark all unseen sales notifications as seen for this branch.
    """
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM supplier_employees WHERE supplier_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    query = """
        UPDATE miller_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE supplier_profile_id = %s
          AND employee_type = 'sales'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, supplier_profile_id])
        rows_affected = cursor.rowcount

    return rows_affected

