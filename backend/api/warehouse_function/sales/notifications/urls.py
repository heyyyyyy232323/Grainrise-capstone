from django.urls import path
from . import views

urlpatterns = [
    path("", views.notifications_list_view, name="warehouse_sales_notifications_list"),
    path("<int:notification_id>/seen/", views.mark_notification_seen_view, name="warehouse_sales_notification_mark_seen"),
    path("<int:notification_id>/seen", views.mark_notification_seen_view),
    path("mark-all-seen/", views.mark_all_seen_view, name="warehouse_sales_notifications_mark_all_seen"),
    path("mark-all-seen", views.mark_all_seen_view),
]
