from django.db import connection, transaction

from .selectors import (
    admin_notification_exists,
    get_admin_notification,
    get_admin_unread_notification_count,
)


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

@transaction.atomic
def mark_admin_notification_as_read(
    admin_id,
    notification_id,
):
    """
    Mark one notification as read for one Account Admin.

    Safe to call repeatedly because the table uses:
        PRIMARY KEY (notification_id, admin_id)
    """

    if not admin_id:
        raise ValueError(
            "Administrator ID is required."
        )

    if not notification_id:
        raise ValueError(
            "Notification ID is required."
        )


    # ========================================================
    # VERIFY NOTIFICATION
    # ========================================================

    if not admin_notification_exists(
        notification_id
    ):
        raise ValueError(
            "Notification was not found."
        )


    # ========================================================
    # INSERT READ STATE
    # ========================================================

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO admin_notification_reads (
                notification_id,
                admin_id
            )
            VALUES (
                %s,
                %s
            )

            ON CONFLICT (
                notification_id,
                admin_id
            )
            DO NOTHING
            """,
            [
                notification_id,
                admin_id,
            ],
        )


    # ========================================================
    # RETURN UPDATED NOTIFICATION
    # ========================================================

    notification = (
        get_admin_notification(
            admin_id,
            notification_id,
        )
    )


    unread_count = (
        get_admin_unread_notification_count(
            admin_id
        )
    )


    return {
        "notification":
            notification,

        "unread_count":
            unread_count,
    }


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================

@transaction.atomic
def mark_all_admin_notifications_as_read(
    admin_id,
):
    """
    Mark every currently available admin notification
    as read for the authenticated Account Admin only.
    """

    if not admin_id:
        raise ValueError(
            "Administrator ID is required."
        )


    # ========================================================
    # INSERT MISSING READ STATES
    # ========================================================

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO admin_notification_reads (
                notification_id,
                admin_id
            )

            SELECT
                n.notification_id,
                %s

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

            ON CONFLICT (
                notification_id,
                admin_id
            )
            DO NOTHING
            """,
            [
                admin_id,
                admin_id,
            ],
        )


        marked_count = (
            cursor.rowcount
            if cursor.rowcount is not None
            else 0
        )


    return {
        "marked_count":
            max(
                int(
                    marked_count
                ),
                0,
            ),

        "unread_count":
            0,
    }


# ============================================================
# OPEN NOTIFICATION
# ============================================================

@transaction.atomic
def open_admin_notification(
    admin_id,
    notification_id,
):
    """
    Used when Account Admin clicks a notification.

    It marks the notification as read and returns its
    target_path so the frontend navbar can navigate to
    the designated management module.
    """

    result = (
        mark_admin_notification_as_read(
            admin_id,
            notification_id,
        )
    )


    notification = (
        result.get(
            "notification"
        )
        or {}
    )


    return {
        "notification":
            notification,

        "target_path":
            notification.get(
                "target_path"
            )
            or "/admin/dashboard",

        "unread_count":
            result.get(
                "unread_count"
            )
            or 0,
    }