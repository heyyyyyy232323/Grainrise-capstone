from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_notifications_view, name="list_warehouse_finance_notifications"),
    path("<int:notification_id>/seen/", views.mark_notification_seen_view, name="mark_warehouse_finance_notification_seen"),
    path("mark-all-seen/", views.mark_all_notifications_seen_view, name="mark_all_warehouse_finance_notifications_seen"),
]
