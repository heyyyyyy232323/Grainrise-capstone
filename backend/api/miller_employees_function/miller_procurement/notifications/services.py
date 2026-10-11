import datetime
import logging
from django.db import connection, transaction
from django.utils import timezone

from .selectors import get_procurement_notification_by_id

logger = logging.getLogger(__name__)


def sync_procurement_activity_notifications(supplier_profile_id):
    """
    Idempotently generate procurement notifications from actual database activities:
    1. Incoming Orders: awaiting receiving in inbound_order
    2. Goods Receipts: deliveries recorded in inbound_purchase_history
    3. Payment Requests: status = 'request_to_pay' in inbound_purchase_history
    4. Returns: return cases recorded in miller_returns

    Prevents duplicates by checking existing notification_content for this branch and employee_type.
    Uses actual event timestamps to maintain chronological accuracy.
    """
    now = timezone.now()

    # ── 1. Incoming Orders ──────────────────────────────────────────────────────
    sql_orders = """
        SELECT
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.created_at
        FROM inbound_order io
        WHERE io.supplier_profile_id = %s
          AND LOWER(TRIM(io.status)) IN ('ordered', 'partially_received', 'partially received')
        ORDER BY io.inbound_order_id DESC
        LIMIT 30
    """

    # ── 2. Received Goods & Payment Requests ────────────────────────────────────
    sql_receipts = """
        SELECT
            iph.receiving_id,
            io.batch_no,
            iph.receiving_reference_no,
            iph.received_good,
            iph.total_price,
            iph.status,
            iph.received_at
        FROM inbound_purchase_history iph
        LEFT JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        WHERE iph.supplier_profile_id = %s
          AND iph.received_at IS NOT NULL
        ORDER BY iph.receiving_id DESC
        LIMIT 30
    """

    # ── 3. Returns ─────────────────────────────────────────────────────────────
    sql_returns = """
        SELECT
            mr.return_id,
            mr.return_reference_no,
            mr.quantity_kg,
            mr.reason_description,
            mr.created_at,
            io.batch_no
        FROM miller_returns mr
        JOIN inbound_order io
            ON io.inbound_order_id = mr.inbound_order_id
        WHERE mr.supplier_profile_id = %s
        ORDER BY mr.return_id DESC
        LIMIT 30
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_orders, [supplier_profile_id])
        orders = cursor.fetchall()

        cursor.execute(sql_receipts, [supplier_profile_id])
        receipts = cursor.fetchall()

        cursor.execute(sql_returns, [supplier_profile_id])
        returns = cursor.fetchall()

        # Existing notification content set for quick in-memory deduplication check
        cursor.execute(
            """
            SELECT notification_content
            FROM miller_employee_notifications
            WHERE supplier_profile_id = %s
              AND employee_type = 'procurement'
            """,
            [supplier_profile_id],
        )
        existing_contents = {row[0] for row in cursor.fetchall()}

        to_insert = []

        # Process Incoming Orders
        for o_id, batch_no, product_name, o_created_at in orders:
            batch_str = batch_no or "N/A"
            prod_str = product_name or "Rice Supply"
            content = f"Inbound order for {prod_str} ({batch_str}) is approved and awaiting procurement receiving."
            if content not in existing_contents:
                existing_contents.add(content)
                dt = o_created_at or now
                to_insert.append((
                    supplier_profile_id,
                    "procurement",
                    "Incoming Inbound Order",
                    content,
                    "/miller-procurement/receiving-orders",
                    dt,
                ))

        # Process Received Goods & Payment Requests
        for r_id, batch_no, rec_ref, good_qty, total_price, r_status, rec_at in receipts:
            batch_str = batch_no or "N/A"
            ref_str = rec_ref or f"REC-{r_id}"
            qty_val = float(good_qty or 0.0)
            status_val = str(r_status or "").lower()

            # Goods Receipt Notification
            rcpt_content = f"Receiving Ref {ref_str} recorded for Batch {batch_str} ({qty_val:,.0f} kg good units logged)."
            if rcpt_content not in existing_contents:
                existing_contents.add(rcpt_content)
                dt = rec_at or now
                to_insert.append((
                    supplier_profile_id,
                    "procurement",
                    "Goods Receipt Recorded",
                    rcpt_content,
                    "/miller-procurement/receiving-history",
                    dt,
                ))

            # Payment Request Notification if status is request_to_pay or paid
            if status_val in ("request_to_pay", "paid"):
                price_val = float(total_price or 0.0)
                pay_content = f"Payment requested for Batch {batch_str} (Receiving Ref: {ref_str}) in the amount of ₱ {price_val:,.2f}."
                if pay_content not in existing_contents:
                    existing_contents.add(pay_content)
                    dt = rec_at or now
                    to_insert.append((
                        supplier_profile_id,
                        "procurement",
                        "Payment Requested",
                        pay_content,
                        "/miller-procurement/payment-history",
                        dt,
                    ))

        # Process Returns
        for ret_id, ret_ref, qty_kg, reason, ret_created_at, batch_no in returns:
            batch_str = batch_no or "N/A"
            ref_str = ret_ref or f"RET-{ret_id}"
            qty_val = float(qty_kg or 0.0)
            ret_content = f"Return case {ref_str} filed for Batch {batch_str} ({qty_val:,.0f} kg returned)."
            if ret_content not in existing_contents:
                existing_contents.add(ret_content)
                dt = ret_created_at or now
                to_insert.append((
                    supplier_profile_id,
                    "procurement",
                    "Return Case Logged",
                    ret_content,
                    "/miller-procurement/returns",
                    dt,
                ))

        if to_insert:
            sql_insert = """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    created_at,
                    status,
                    seen_by_employee_id,
                    seen_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'unseen', NULL, NULL)
            """
            for row in to_insert:
                cursor.execute(sql_insert, row)
            logger.info("Synced %d procurement notifications for branch %s", len(to_insert), supplier_profile_id)


def mark_notification_as_seen(supplier_profile_id, notification_id, employee_id=None):
    """
    Mark a single procurement notification as seen, scoped strictly to supplier_profile_id.
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
          AND employee_type = 'procurement'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, notification_id, supplier_profile_id])
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_procurement_notification_by_id(supplier_profile_id, notification_id)


def mark_all_procurement_notifications_seen(supplier_profile_id, employee_id=None):
    """
    Mark all unseen procurement notifications as seen for this branch.
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
          AND employee_type = 'procurement'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, supplier_profile_id])
        rows_affected = cursor.rowcount

    return rows_affected
