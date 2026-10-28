import logging
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


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

