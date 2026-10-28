import logging
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


def mark_warehouse_driver_notification_as_seen(warehouse_profile_ids, notification_id, driver_id=None):
    """
    Mark a single warehouse driver notification as seen.
    """
    if not warehouse_profile_ids or not notification_id:
        return False

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    now = timezone.now()
    driver_tag = f"driver_{driver_id}" if driver_id else "driver"

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE notification_id = %s
          AND warehouse_profile_id IN ({p_wh})
          AND employee_type IN ('driver', %s)
    """
    params = [driver_id, now, notification_id] + list(warehouse_profile_ids) + [driver_tag]

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount > 0


def mark_all_warehouse_driver_notifications_seen(warehouse_profile_ids, driver_id=None):
    """
    Mark all unseen warehouse driver notifications as seen.
    """
    if not warehouse_profile_ids:
        return 0

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    now = timezone.now()
    driver_tag = f"driver_{driver_id}" if driver_id else "driver"

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE warehouse_profile_id IN ({p_wh})
          AND employee_type IN ('driver', %s)
          AND status = 'unseen'
    """
    params = [driver_id, now] + list(warehouse_profile_ids) + [driver_tag]

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount

