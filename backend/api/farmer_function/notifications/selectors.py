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
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT *
            FROM grainrise_get_farmer_notifications(
                %s,
                %s,
                %s
            )
            """,
            [
                farmer_user_id,
                limit,
                offset,
            ],
        )

        return _rows_to_dicts(cursor)


# ============================================================
# GET ONE FARMER NOTIFICATION
# ============================================================

def get_farmer_notification(
    farmer_user_id,
    notification_id,
):
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

            WHERE
                farmer_user_id = %s
                AND notification_id = %s

            LIMIT 1
            """,
            [
                farmer_user_id,
                notification_id,
            ],
        )

        return _row_to_dict(cursor)


# ============================================================
# UNREAD COUNT
# ============================================================

def get_farmer_unread_notification_count(
    farmer_user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                grainrise_get_farmer_unread_notification_count(%s)
                AS unread_count
            """,
            [farmer_user_id],
        )

        row = _row_to_dict(cursor) or {}

    return int(
        row.get("unread_count")
        or 0
    )
