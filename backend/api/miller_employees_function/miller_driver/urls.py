"""
URL patterns for Miller Driver endpoints.
"""

from django.urls import path
from .views import (
    driver_buyer_group_view,
    driver_delivery_complete_view,
    driver_duties_list_view,
    driver_live_tracking_exit_view,
    driver_live_tracking_ping_view,
    driver_live_tracking_start_view,
)

urlpatterns = [
    path("duties/", driver_duties_list_view, name="driver-duties-list"),
    path("live-tracking/group/", driver_buyer_group_view, name="driver-live-tracking-group"),
    path("live-tracking/start/", driver_live_tracking_start_view, name="driver-live-tracking-start"),
    path("live-tracking/ping/", driver_live_tracking_ping_view, name="driver-live-tracking-ping"),
    path("live-tracking/exit/", driver_live_tracking_exit_view, name="driver-live-tracking-exit"),
    path("delivery/complete/", driver_delivery_complete_view, name="driver-delivery-complete"),
]
