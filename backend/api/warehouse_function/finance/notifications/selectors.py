from django.db import connection


def _rows_to_dicts(cursor):
    """Convert cursor results to a list of dicts."""
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    """Convert a single cursor result to a dict."""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def _format_notification_row(row):
    """Format notification record for consistent JSON response."""
    if not row:
        return None

    item = dict(row)
    created_at = item.get("created_at")
    seen_at = item.get("seen_at")

    if created_at is not None and hasattr(created_at, "isoformat"):
        created_at_str = created_at.isoformat()
    elif created_at is not None:
        created_at_str = str(created_at)
    else:
        created_at_str = None

    if seen_at is not None and hasattr(seen_at, "isoformat"):
        seen_at_str = seen_at.isoformat()
    elif seen_at is not None:
        seen_at_str = str(seen_at)
    else:
        seen_at_str = None

    status_val = str(item.get("status") or "unseen").lower().strip()
    is_seen = status_val == "seen"
    seen_by_name = (item.get("seen_by_name") or "").strip() or None

    return {
        "notification_id": int(item["notification_id"]),
        "id": int(item["notification_id"]),
        "warehouse_profile_id": int(item["warehouse_profile_id"]),
        "employee_type": str(item.get("employee_type") or "finance"),
        "notification_title": str(item.get("notification_title") or ""),
        "title": str(item.get("notification_title") or ""),
        "notification_content": str(item.get("notification_content") or ""),
        "message": str(item.get("notification_content") or ""),
        "content": str(item.get("notification_content") or ""),
        "action_url": item.get("action_url") or "/warehouse-finance/dashboard",
        "created_at": created_at_str,
        "status": status_val,
        "is_seen": is_seen,
        "is_read": is_seen,
        "seen_by_employee_id": int(item["seen_by_employee_id"]) if item.get("seen_by_employee_id") else None,
        "seen_by_name": seen_by_name,
        "seen_at": seen_at_str,
    }


def list_warehouse_finance_notifications(warehouse_profile_ids, limit=50, offset=0, status=None):
    """
    List notifications for the given warehouse branches where employee_type = 'finance'.
    Ordered newest first (created_at DESC).
    """
    if not warehouse_profile_ids:
        return []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    status_clause = ""

    if status in ("seen", "unseen"):
        status_clause = "AND men.status = %s"
        params.append(status)

    try:
        limit_val = max(1, min(int(limit), 200))
    except (ValueError, TypeError):
        limit_val = 50

    try:
        offset_val = max(0, int(offset))
    except (ValueError, TypeError):
        offset_val = 0

    params.extend([limit_val, offset_val])

    query = f"""
        SELECT
            men.notification_id,
            men.warehouse_profile_id,
            men.employee_type,
            men.notification_title,
            men.notification_content,
            men.action_url,
            men.created_at,
            men.status,
            men.seen_by_employee_id,
            men.seen_at,
            TRIM(CONCAT(COALESCE(we.first_name, ''), ' ', COALESCE(we.last_name, ''))) AS seen_by_name
        FROM warehouse_employee_notifications men
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = men.seen_by_employee_id
        WHERE men.warehouse_profile_id IN ({p_wh})
          AND men.employee_type = 'finance'
          {status_clause}
        ORDER BY men.created_at DESC, men.notification_id DESC
        LIMIT %s OFFSET %s
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = _rows_to_dicts(cursor)

    return [_format_notification_row(r) for r in rows]


def count_warehouse_finance_notifications(warehouse_profile_ids, status=None):
    """
    Count total notifications for this branch and employee_type = 'finance'.
    """
    if not warehouse_profile_ids:
        return 0

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    status_clause = ""

    if status in ("seen", "unseen"):
        status_clause = "AND status = %s"
        params.append(status)

    query = f"""
        SELECT COUNT(*)
        FROM warehouse_employee_notifications
        WHERE warehouse_profile_id IN ({p_wh})
          AND employee_type = 'finance'
          {status_clause}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        row = cursor.fetchone()

    return int(row[0]) if row else 0


def get_warehouse_finance_unseen_notification_count(warehouse_profile_ids):
    """
    Return count of unseen notifications for this branch and employee_type = 'finance'.
    """
    return count_warehouse_finance_notifications(warehouse_profile_ids, status="unseen")


def get_warehouse_finance_notification_by_id(warehouse_profile_ids, notification_id):
    """
    Fetch a single notification by ID, scoped to warehouse_profile_ids and employee_type = 'finance'.
    """
    if not warehouse_profile_ids:
        return None

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = [notification_id] + list(warehouse_profile_ids)

    query = f"""
        SELECT
            men.notification_id,
            men.warehouse_profile_id,
            men.employee_type,
            men.notification_title,
            men.notification_content,
            men.action_url,
            men.created_at,
            men.status,
            men.seen_by_employee_id,
            men.seen_at,
            TRIM(CONCAT(COALESCE(we.first_name, ''), ' ', COALESCE(we.last_name, ''))) AS seen_by_name
        FROM warehouse_employee_notifications men
        LEFT JOIN warehouse_employees we
            ON we.warehouse_employee_id = men.seen_by_employee_id
        WHERE men.notification_id = %s
          AND men.warehouse_profile_id IN ({p_wh})
          AND men.employee_type = 'finance'
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        row = _row_to_dict(cursor)

    return _format_notification_row(row)
