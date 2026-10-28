from django.urls import path
from . import views

urlpatterns = [
    path("", views.driver_notifications_list_view, name="list_warehouse_driver_notifications"),
    path("<int:notification_id>/seen/", views.driver_notification_seen_view, name="mark_warehouse_driver_notification_seen"),
    path("<int:notification_id>/seen", views.driver_notification_seen_view),
    path("mark-all-seen/", views.driver_notifications_mark_all_seen_view, name="mark_all_warehouse_driver_notifications_seen"),
]

