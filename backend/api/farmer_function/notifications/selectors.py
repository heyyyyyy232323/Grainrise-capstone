from django.db import connection


# ============================================================
# DATABASE HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    if not cursor.description:
        return []

    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def _row_to_dict(cursor):
    row = cursor.fetchone()

    if row is None:
        return None

    columns = [
        column[0]
        for column in cursor.description
    ]

    return dict(zip(columns, row))


# ============================================================
# LIST FARMER NOTIFICATIONS
# ============================================================

def list_farmer_notifications(
    farmer_user_id,
    limit=30,
    offset=0,
):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    notification_id,
                    notification_type,
                    title,
                    message,
                    target_path,
                    source_table,
                    source_record_id,
                    related_actor_type,
                    related_actor_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                FROM farmer_notifications
                WHERE farmer_user_id = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                [
                    farmer_user_id,
                    limit,
                    offset,
                ],
            )
            return _rows_to_dicts(cursor)
    except Exception:
        return []


# ============================================================
# GET ONE FARMER NOTIFICATION
# ============================================================

def get_farmer_notification(
    farmer_user_id,
    notification_id,
):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    notification_id,
                    notification_type,
                    title,
                    message,
                    target_path,
                    source_table,
                    source_record_id,
                    related_actor_type,
                    related_actor_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                FROM farmer_notifications
                WHERE farmer_user_id = %s
                  AND notification_id = %s
                LIMIT 1
                """,
                [
                    farmer_user_id,
                    notification_id,
                ],
            )
            return _row_to_dict(cursor)
    except Exception:
        return None


# ============================================================
# UNREAD COUNT
# ============================================================

def get_farmer_unread_notification_count(
    farmer_user_id,
):
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM farmer_notifications
                WHERE farmer_user_id = %s
                  AND is_read = 0
                """,
                [farmer_user_id],
            )
            row = cursor.fetchone()
            return int(row[0]) if row else 0
    except Exception:
        return 0
