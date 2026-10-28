import logging
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


def create_warehouse_logistics_notification(
    warehouse_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/warehouse-logistics/delivery-management",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Warehouse Logistics Coordinator belonging to warehouse_profile_id.
    Prevents duplicates by checking existing notifications for this branch and employee_type in ('logistics', 'fulfillment_logistics_coordinator').
    """
    if not warehouse_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/warehouse-logistics/delivery-management").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_employee_notifications
                    WHERE warehouse_profile_id = %s
                      AND employee_type IN ('logistics', 'fulfillment_logistics_coordinator')
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
                      AND employee_type IN ('logistics', 'fulfillment_logistics_coordinator')
                      AND notification_content = %s
                    """,
                    [warehouse_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate warehouse logistics notification for warehouse_profile_id=%s, title=%s",
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
                ) VALUES (%s, 'logistics', %s, %s, %s, %s, 'unseen')
            """
            cursor.execute(
                sql_insert,
                [warehouse_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created warehouse logistics notification for warehouse_profile_id=%s, title=%s",
                warehouse_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create warehouse logistics notification for warehouse_profile_id=%s: %s",
            warehouse_profile_id,
            exc,
        )
        return False


def notify_warehouse_flc_order_forwarded(
    warehouse_profile_id: int,
    identifier: str,
    product_name: str = None,
    quantity: float = None,
    created_at=None,
) -> bool:
    """
    Trigger Warehouse FLC notification when an online order is forwarded to logistics for dispatch.
    Deduplicated by order identifier / batch number.
    """
    qty_str = f" ({quantity:,.0f} kg)" if quantity is not None else ""
    prod_str = f" for {product_name}" if product_name else ""
    return create_warehouse_logistics_notification(
        warehouse_profile_id=warehouse_profile_id,
        title="New Delivery Order Assigned",
        content=f"Order #{identifier}{prod_str}{qty_str} has been forwarded to Logistics for dispatch.",
        action_url="/warehouse-logistics/delivery-management",
        created_at=created_at,
        deduplication_key=f"#{identifier}",
    )


def notify_warehouse_flc_new_product_return(
    warehouse_profile_id: int,
    return_reference_no: str,
    product_name: str = None,
    quantity: float = None,
    created_at=None,
) -> bool:
    """
    Trigger Warehouse FLC notification when a new Pending online product return is submitted.
    Deduplicated by return_reference_no.
    """
    qty_str = f" ({quantity:,.0f} kg)" if quantity is not None else ""
    prod_str = f" for {product_name}" if product_name else ""
    return create_warehouse_logistics_notification(
        warehouse_profile_id=warehouse_profile_id,
        title="New Product Return Issue",
        content=f"Return request {return_reference_no}{prod_str}{qty_str} has been submitted with Pending status.",
        action_url="/warehouse-logistics/product-returns",
        created_at=created_at,
        deduplication_key=str(return_reference_no),
    )


def sync_warehouse_logistics_activity_notifications(warehouse_profile_ids):
    """
    Idempotently sync real database events for Warehouse Logistics Coordinator:
    1. Forwarded delivery orders awaiting assignment/dispatch (status = 'Forwarded to Logistics')
    2. Pending product return issues (status = 'Pending' in warehouse_online_orders_returns)

    Strictly scoped to warehouse_profile_ids and employee_type in ('logistics', 'fulfillment_logistics_coordinator').
    Prevents duplicates using deduplication keys.
    """
    if not warehouse_profile_ids:
        return

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    # 1. Forwarded to Logistics orders
    sql_forwarded_orders = f"""
        SELECT
            woc.online_order_id,
            woc.batch_no,
            wp.product_name,
            woc.ordered_quantity,
            COALESCE(woc.updated_at, woc.created_at) AS event_time,
            woc.warehouse_profile_id
        FROM warehouse_online_customer woc
        LEFT JOIN warehouse_products wp ON woc.warehouse_product_id = wp.product_id
        WHERE woc.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(woc.status)) = 'forwarded to logistics'
        ORDER BY woc.online_order_id DESC
        LIMIT 50
    """

    # 2. Pending product returns
    sql_pending_returns = f"""
        SELECT
            woor.return_id,
            woor.return_reference_no,
            woor.quantity,
            wp.product_name,
            COALESCE(woor.created_at, NOW()) AS event_time,
            woor.warehouse_profile_id
        FROM warehouse_online_orders_returns woor
        JOIN warehouse_online_customer woc ON woor.online_order_id = woc.online_order_id
        LEFT JOIN warehouse_products wp ON woc.warehouse_product_id = wp.product_id
        WHERE woor.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(woor.status)) = 'pending'
        ORDER BY woor.return_id DESC
        LIMIT 50
    """

    try:
        with connection.cursor() as cursor:
            cursor.execute(sql_forwarded_orders, list(warehouse_profile_ids))
            forwarded_orders = cursor.fetchall()

            cursor.execute(sql_pending_returns, list(warehouse_profile_ids))
            pending_returns = cursor.fetchall()

        for row in forwarded_orders:
            online_order_id, batch_no, product_name, ordered_qty, event_time, wh_id = row
            identifier = batch_no or f"Order #{online_order_id}"
            notify_warehouse_flc_order_forwarded(
                warehouse_profile_id=wh_id,
                identifier=identifier,
                product_name=product_name,
                quantity=float(ordered_qty) if ordered_qty is not None else None,
                created_at=event_time,
            )

        for row in pending_returns:
            return_id, return_reference_no, quantity, product_name, event_time, wh_id = row
            ref_label = return_reference_no or f"RET-{return_id}"
            notify_warehouse_flc_new_product_return(
                warehouse_profile_id=wh_id,
                return_reference_no=ref_label,
                product_name=product_name,
                quantity=float(quantity) if quantity is not None else None,
                created_at=event_time,
            )
    except Exception as exc:
        logger.warning(
            "Failed to sync warehouse logistics notifications for warehouse_profile_ids=%s: %s",
            warehouse_profile_ids,
            exc,
        )


def mark_warehouse_logistics_notification_as_seen(warehouse_profile_ids, notification_id, employee_id=None):
    """
    Mark a single warehouse logistics notification as seen.
    """
    if not warehouse_profile_ids or not notification_id:
        return False

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    now = timezone.now()

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE notification_id = %s
          AND warehouse_profile_id IN ({p_wh})
          AND employee_type IN ('logistics', 'fulfillment_logistics_coordinator')
    """
    params = [employee_id, now, notification_id] + list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount > 0


def mark_all_warehouse_logistics_notifications_seen(warehouse_profile_ids, employee_id=None):
    """
    Mark all unseen warehouse logistics notifications as seen.
    """
    if not warehouse_profile_ids:
        return 0

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    now = timezone.now()

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE warehouse_profile_id IN ({p_wh})
          AND employee_type IN ('logistics', 'fulfillment_logistics_coordinator')
          AND status = 'unseen'
    """
    params = [employee_id, now] + list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount
