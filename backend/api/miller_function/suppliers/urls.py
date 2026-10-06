from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.suppliers_view,
        name="miller-suppliers",
    ),
    path(
        "<int:supplier_id>/",
        views.supplier_detail_view,
        name="miller-supplier-detail",
    ),
    path(
        "<int:supplier_id>/active-orders/",
        views.supplier_active_orders_view,
        name="miller-supplier-active-orders",
    ),
    path(
        "<int:supplier_id>/purchase-history/",
        views.supplier_purchase_history_view,
        name="miller-supplier-purchase-history",
    ),
]
