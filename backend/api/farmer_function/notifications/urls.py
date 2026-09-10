from django.urls import path

from . import views


app_name = "farmer_notifications"


urlpatterns = [
    path(
        "",
        views.farmer_notifications_list,
        name="list",
    ),

    path(
        "unread-count/",
        views.farmer_notifications_unread_count,
        name="unread-count",
    ),

    path(
        "read-all/",
        views.farmer_notifications_mark_all_read,
        name="read-all",
    ),

    path(
        "<int:notification_id>/",
        views.farmer_notification_detail,
        name="detail",
    ),

    path(
        "<int:notification_id>/read/",
        views.farmer_notification_mark_read,
        name="mark-read",
    ),

    path(
        "<int:notification_id>/open/",
        views.farmer_notification_open,
        name="open",
    ),
]
