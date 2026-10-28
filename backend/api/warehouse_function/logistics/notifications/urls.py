from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_notifications_view, name="list_warehouse_logistics_notifications"),
    path("<int:notification_id>/seen/", views.mark_notification_seen_view, name="mark_warehouse_logistics_notification_seen"),
    path("<int:notification_id>/seen", views.mark_notification_seen_view),
    path("mark-all-seen/", views.mark_all_notifications_seen_view, name="mark_all_warehouse_logistics_notifications_seen"),
]

