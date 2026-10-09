from django.urls import path
from .views import (
    approve_manager_order_view,
    decline_manager_order_view,
    detail_manager_order_view,
    edit_manager_order_view,
    list_manager_orders_view,
)

urlpatterns = [
    path("", list_manager_orders_view, name="manager_order_approval_list"),
    path("<int:inbound_order_id>/", detail_manager_order_view, name="manager_order_approval_detail"),
    path("<int:inbound_order_id>", detail_manager_order_view),
    path("<int:inbound_order_id>/edit/", edit_manager_order_view, name="manager_order_approval_edit"),
    path("<int:inbound_order_id>/edit", edit_manager_order_view),
    path("<int:inbound_order_id>/decline/", decline_manager_order_view, name="manager_order_approval_decline"),
    path("<int:inbound_order_id>/decline", decline_manager_order_view),
    path("<int:inbound_order_id>/approve/", approve_manager_order_view, name="manager_order_approval_approve"),
    path("<int:inbound_order_id>/approve", approve_manager_order_view),
]

