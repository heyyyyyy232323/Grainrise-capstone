from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.receiving_orders_list_view,
        name="procurement-receiving-orders-list",
    ),
    path(
        "<int:order_id>/",
        views.receiving_order_detail_view,
        name="procurement-receiving-order-detail",
    ),
    path(
        "<int:order_id>/receive/",
        views.receive_order_view,
        name="procurement-receive-order",
    ),
]

