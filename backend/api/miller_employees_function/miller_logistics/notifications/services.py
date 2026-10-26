import logging
from django.db import connection
from django.utils import timezone

from .selectors import get_logistics_notification_by_id

logger = logging.getLogger(__name__)


def create_logistics_notification(
    supplier_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/miller-logistics/delivery-management",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Miller Logistics Coordinator belonging to supplier_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'logistics'.
    """
    if not supplier_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/miller-logistics/delivery-management").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM miller_employee_notifications
                    WHERE supplier_profile_id = %s
                      AND employee_type = 'logistics'
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
                      AND employee_type = 'logistics'
                      AND notification_content = %s
                    """,
                    [supplier_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate logistics notification for supplier_profile_id=%s, title=%s",
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
                ) VALUES (%s, 'logistics', %s, %s, %s, %s, 'unseen')
            """
            cursor.execute(
                sql_insert,
                [supplier_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created logistics notification for supplier_profile_id=%s, title=%s",
                supplier_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create logistics notification for supplier_profile_id=%s: %s",
            supplier_profile_id,
            exc,
        )
        return False


def mark_notification_as_seen(supplier_profile_id: int, notification_id: int, employee_id: int = None):
    """
    Mark a single notification as seen, recording employee_id and seen_at timestamp.
    Strictly scoped to supplier_profile_id and employee_type = 'logistics'.
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
          AND employee_type = 'logistics'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, notification_id, supplier_profile_id])
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_logistics_notification_by_id(supplier_profile_id, notification_id)


def mark_all_logistics_notifications_seen(supplier_profile_id: int, employee_id: int = None):
    """
    Mark all unseen logistics notifications as seen for this branch.
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
          AND employee_type = 'logistics'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, supplier_profile_id])
        rows_affected = cursor.rowcount

    return rows_affected


def notify_flc_new_product_return(
    supplier_profile_id: int,
    return_reference_no: str,
    product_name: str = None,
    quantity: float = None,
    created_at=None,
) -> bool:
    """
    Trigger FLC notification when a new Pending online product return is submitted.
    Deduplicated by return_reference_no.
    """
    qty_str = f" ({quantity:,.2f} kg)" if quantity is not None else ""
    prod_str = f" for {product_name}" if product_name else ""
    return create_logistics_notification(
        supplier_profile_id=supplier_profile_id,
        title="New Product Return Issue",
        content=f"Return request {return_reference_no}{prod_str}{qty_str} has been submitted with Pending status.",
        action_url="/miller-logistics/product-returns",
        created_at=created_at,
        deduplication_key=str(return_reference_no),
    )


def sync_logistics_activity_notifications(supplier_profile_id: int):
    """
    Idempotently sync real database events for Miller Logistics Coordinator:
    1. Forwarded delivery orders awaiting assignment/dispatch (status = 'Forwarded to Logistics')
    2. Pending product return issues (status = 'Pending' in miller_online_orders_returns)

    Strictly scoped to supplier_profile_id and employee_type = 'logistics'.
    Prevents duplicates using deduplication keys.
    """
    if not supplier_profile_id:
        return

    # 1. Forwarded to Logistics orders
    sql_forwarded_orders = """
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

    # 2. Pending product returns
    sql_pending_returns = """
        SELECT
            moor.return_id,
            moor.return_reference_no,
            moor.quantity,
            mp.product_name,
            COALESCE(moor.created_at, NOW()) AS event_time
        FROM miller_online_orders_returns moor
        JOIN miller_online_customer moc ON moor.online_order_id = moc.online_order_id
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE moor.supplier_profile_id = %s
          AND LOWER(TRIM(moor.status)) = 'pending'
        ORDER BY moor.return_id DESC
        LIMIT 50
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_forwarded_orders, [supplier_profile_id])
            forwarded_orders = cursor.fetchall()

            cursor.execute(sql_pending_returns, [supplier_profile_id])
            pending_returns = cursor.fetchall()

        for row in forwarded_orders:
            online_order_id, batch_no, product_name, ordered_qty, event_time = row
            identifier = batch_no or f"Order #{online_order_id}"
            prod_info = f" ({product_name})" if product_name else ""
            create_logistics_notification(
                supplier_profile_id=supplier_profile_id,
                title="New Delivery Order Assigned",
                content=f"Order #{identifier}{prod_info} has been forwarded to Logistics for dispatch.",
                action_url="/miller-logistics/delivery-management",
                created_at=event_time,
                deduplication_key=f"#{identifier}",
            )

        for row in pending_returns:
            return_id, return_reference_no, quantity, product_name, event_time = row
            ref_label = return_reference_no or f"RET-{return_id}"
            notify_flc_new_product_return(
                supplier_profile_id=supplier_profile_id,
                return_reference_no=ref_label,
                product_name=product_name,
                quantity=float(quantity) if quantity is not None else None,
                created_at=event_time,
            )
    except Exception as exc:
        logger.warning(
            "Failed to sync logistics notifications for supplier_profile_id=%s: %s",
            supplier_profile_id,
            exc,
        )


