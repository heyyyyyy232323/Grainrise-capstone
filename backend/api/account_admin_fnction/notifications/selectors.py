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
        dict(
            zip(
                columns,
                row,
            )
        )
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

    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# LIST ADMIN NOTIFICATIONS
# ============================================================

def list_admin_notifications(
    admin_id,
    limit=30,
):
    """
    Return Account Admin notifications.

    Read/unread status is calculated specifically
    for the authenticated admin.
    """

    try:
        cleaned_limit = int(
            limit
        )

    except (
        TypeError,
        ValueError,
    ):
        cleaned_limit = 30


    cleaned_limit = max(
        1,
        min(
            cleaned_limit,
            100,
        )
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                n.notification_id,

                n.activity_id,

                n.notification_type,

                n.title,

                n.message,

                n.target_path,

                n.source_table,

                n.source_record_id,

                n.related_user_id,

                n.created_at,

                r.read_at,

                CASE
                    WHEN r.notification_id IS NULL
                        THEN FALSE
                    ELSE TRUE
                END
                AS is_read

            FROM admin_notifications n

            LEFT JOIN admin_notification_reads r
                ON r.notification_id =
                    n.notification_id

                AND r.admin_id =
                    %s

            ORDER BY
                n.created_at DESC,
                n.notification_id DESC

            LIMIT %s
            """,
            [
                admin_id,
                cleaned_limit,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# GET ONE NOTIFICATION
# ============================================================

def get_admin_notification(
    admin_id,
    notification_id,
):
    """
    Return one notification with the authenticated
    admin's own read state.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                n.notification_id,

                n.activity_id,

                n.notification_type,

                n.title,

                n.message,

                n.target_path,

                n.source_table,

                n.source_record_id,

                n.related_user_id,

                n.created_at,

                r.read_at,

                CASE
                    WHEN r.notification_id IS NULL
                        THEN FALSE
                    ELSE TRUE
                END
                AS is_read

            FROM admin_notifications n

            LEFT JOIN admin_notification_reads r
                ON r.notification_id =
                    n.notification_id

                AND r.admin_id =
                    %s

            WHERE
                n.notification_id =
                    %s

            LIMIT 1
            """,
            [
                admin_id,
                notification_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# UNREAD COUNT
# ============================================================

def get_admin_unread_notification_count(
    admin_id,
):
    """
    Count notifications not yet read by this admin.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)
                    AS unread_count

            FROM admin_notifications n

            WHERE NOT EXISTS (
                SELECT 1

                FROM admin_notification_reads r

                WHERE
                    r.notification_id =
                        n.notification_id

                    AND r.admin_id =
                        %s
            )
            """,
            [
                admin_id,
            ],
        )

        row = (
            _row_to_dict(
                cursor
            )
            or {}
        )


    return int(
        row.get(
            "unread_count"
        )
        or 0
    )


# ============================================================
# NOTIFICATION EXISTS
# ============================================================

def admin_notification_exists(
    notification_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1

                FROM admin_notifications

                WHERE
                    notification_id = %s
            )
            """,
            [
                notification_id,
            ],
        )

        row = cursor.fetchone()


    return bool(
        row
        and row[0]
    )


# ============================================================
# READ STATE EXISTS
# ============================================================

def admin_notification_read_exists(
    admin_id,
    notification_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1

                FROM admin_notification_reads

                WHERE
                    notification_id = %s

                    AND admin_id = %s
            )
            """,
            [
                notification_id,
                admin_id,
            ],
        )

        row = cursor.fetchone()


    return bool(
        row
        and row[0]
    )


# ============================================================
# TOTAL NOTIFICATION COUNT
# ============================================================

def get_admin_notification_count():
    """
    Total notification records available to Account Admins.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)
                    AS total

            FROM admin_notifications
            """
        )

        row = (
            _row_to_dict(
                cursor
            )
            or {}
        )


    return int(
        row.get(
            "total"
        )
        or 0
    )