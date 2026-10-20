import logging
from django.db import connection
from django.utils import timezone

from .selectors import get_finance_notification_by_id

logger = logging.getLogger(__name__)


def create_finance_notification(
    supplier_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/miller-finance/dashboard",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Miller Finance belonging to supplier_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'finance'.
    """
    if not supplier_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/miller-finance/dashboard").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            # Deduplication check
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM miller_employee_notifications
                    WHERE supplier_profile_id = %s
                      AND employee_type = 'finance'
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
                      AND employee_type = 'finance'
                      AND notification_content = %s
                    """,
                    [supplier_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate finance notification for supplier_profile_id=%s, title=%s",
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
                ) VALUES (%s, 'finance', %s, %s, %s, %s, 'unseen')
            """
            cursor.execute(
                sql_insert,
                [supplier_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created finance notification for supplier_profile_id=%s, title=%s",
                supplier_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create finance notification for supplier_profile_id=%s: %s",
            supplier_profile_id,
            exc,
        )
        return False


def mark_finance_notification_as_seen(supplier_profile_id: int, notification_id: int, employee_id: int = None):
    """
    Mark a single finance notification as seen, scoped strictly to supplier_profile_id.
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
          AND employee_type = 'finance'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, notification_id, supplier_profile_id])
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_finance_notification_by_id(supplier_profile_id, notification_id)


def mark_all_finance_notifications_seen(supplier_profile_id: int, employee_id: int = None):
    """
    Mark all unseen finance notifications as seen for this branch.
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
          AND employee_type = 'finance'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [valid_emp_id, now, supplier_profile_id])
        rows_affected = cursor.rowcount

    return rows_affected

