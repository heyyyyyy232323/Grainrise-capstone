from django.urls import path

from . import views


app_name = "notifications"


urlpatterns = [
    # ========================================================
    # NOTIFICATION LIST
    # ========================================================

    path(
        "",
        views.admin_notifications_list,
        name="list",
    ),


    # ========================================================
    # UNREAD COUNT
    # ========================================================

    path(
        "unread-count/",
        views.admin_notifications_unread_count,
        name="unread-count",
    ),


    # ========================================================
    # MARK ALL AS READ
    # ========================================================

    path(
        "read-all/",
        views.admin_notifications_mark_all_read,
        name="read-all",
    ),


    # ========================================================
    # NOTIFICATION DETAIL
    # ========================================================

    path(
        "<int:notification_id>/",
        views.admin_notification_detail,
        name="detail",
    ),


    # ========================================================
    # MARK ONE AS READ
    # ========================================================

    path(
        "<int:notification_id>/read/",
        views.admin_notification_mark_read,
        name="mark-read",
    ),


    # ========================================================
    # OPEN NOTIFICATION
    # ========================================================

    path(
        "<int:notification_id>/open/",
        views.admin_notification_open,
        name="open",
    ),
]