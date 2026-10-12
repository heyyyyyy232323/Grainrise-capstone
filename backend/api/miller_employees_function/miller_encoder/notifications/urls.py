from django.urls import path
from .views import (
    mark_notification_seen_view,
    notifications_list_view,
)

urlpatterns = [
    path("", notifications_list_view, name="encoder_notifications_list"),
    path("<int:notification_id>/seen/", mark_notification_seen_view, name="encoder_notification_mark_seen"),
    path("<int:notification_id>/seen", mark_notification_seen_view),
]
