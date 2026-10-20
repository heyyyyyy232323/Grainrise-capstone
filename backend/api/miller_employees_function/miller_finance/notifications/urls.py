from django.urls import path
from .views import (
    list_notifications_view,
    mark_all_notifications_seen_view,
    mark_notification_seen_view,
)

urlpatterns = [
    path("", list_notifications_view, name="list_finance_notifications"),
    path("<int:notification_id>/seen/", mark_notification_seen_view, name="mark_finance_notification_seen"),
    path("mark-all-seen/", mark_all_notifications_seen_view, name="mark_all_finance_notifications_seen"),
]

