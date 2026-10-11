from django.urls import path
from .views import procurement_suppliers_list_view, procurement_supplier_detail_view

urlpatterns = [
    path("", procurement_suppliers_list_view, name="procurement_suppliers_list"),
    path("<int:supplier_id>/", procurement_supplier_detail_view, name="procurement_supplier_detail"),
]

