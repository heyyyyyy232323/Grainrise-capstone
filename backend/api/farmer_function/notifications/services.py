from django.db import connection, transaction

from .selectors import (
    get_farmer_notification,
    get_farmer_unread_notification_count,
)


# ============================================================
# MARK ONE AS READ
# ============================================================

@transaction.atomic
def mark_farmer_notification_as_read(
    farmer_user_id,
    notification_id,
):
    notification = get_farmer_notification(
        farmer_user_id,
        notification_id,
    )

    if not notification:
        raise ValueError(
            "Notification was not found."
        )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                grainrise_mark_farmer_notification_read(
                    %s,
                    %s
                )
            """,
            [
                farmer_user_id,
                notification_id,
            ],
        )

    return {
        "notification":
            get_farmer_notification(
                farmer_user_id,
                notification_id,
            ),

        "unread_count":
            get_farmer_unread_notification_count(
                farmer_user_id
            ),
    }


# ============================================================
# MARK ALL AS READ
# ============================================================

@transaction.atomic
def mark_all_farmer_notifications_as_read(
    farmer_user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                grainrise_mark_all_farmer_notifications_read(%s)
                AS marked_count
            """,
            [farmer_user_id],
        )

        row = cursor.fetchone()

    return {
        "marked_count":
            int(row[0] or 0)
            if row
            else 0,

        "unread_count":
            0,
    }


# ============================================================
# OPEN NOTIFICATION
# ============================================================

@transaction.atomic
def open_farmer_notification(
    farmer_user_id,
    notification_id,
):
    result = mark_farmer_notification_as_read(
        farmer_user_id,
        notification_id,
    )

    notification = (
        result.get("notification")
        or {}
    )

    return {
        "notification":
            notification,

        "target_path":
            notification.get("target_path")
            or "/farmer/dashboard",

        "unread_count":
            result.get("unread_count")
            or 0,
    }
