from django.urls import path
from .views import (
    mark_all_seen_view,
    mark_notification_seen_view,
    notifications_list_view,
)

urlpatterns = [
    path("", notifications_list_view, name="logistics_notifications_list"),
    path("<int:notification_id>/seen/", mark_notification_seen_view, name="logistics_notification_mark_seen"),
    path("<int:notification_id>/seen", mark_notification_seen_view),
    path("mark-all-seen/", mark_all_seen_view, name="logistics_notifications_mark_all_seen"),
    path("mark-all-seen", mark_all_seen_view),
]
