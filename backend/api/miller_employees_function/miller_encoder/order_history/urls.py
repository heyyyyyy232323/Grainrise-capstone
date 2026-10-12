from django.urls import path
from .views import (
    order_history_list_view,
    order_history_detail_view,
)

urlpatterns = [
    path("", order_history_list_view, name="miller_encoder_order_history_list"),
    path("<int:inbound_order_id>/", order_history_detail_view, name="miller_encoder_order_history_detail"),
    path("<int:inbound_order_id>", order_history_detail_view, name="miller_encoder_order_history_detail_noslash"),
]

