"""
URL patterns for Miller Manager Fulfillment History.
"""

from django.urls import path

from .views import (
    manager_fulfillment_history_list_view,
    manager_fulfillment_variants_view,
)

urlpatterns = [
    path("", manager_fulfillment_history_list_view, name="manager_fulfillment_list"),
    path("variants/", manager_fulfillment_variants_view, name="manager_fulfillment_variants"),
    path("variants", manager_fulfillment_variants_view),
]
