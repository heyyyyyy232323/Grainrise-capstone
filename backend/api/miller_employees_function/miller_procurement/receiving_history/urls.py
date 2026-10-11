from django.urls import path
from . import views

urlpatterns = [
    path("", views.receiving_history_list_view, name="procurement_receiving_history_list"),
    path("suppliers/", views.receiving_history_suppliers_view, name="procurement_receiving_history_suppliers"),
    path("<int:receiving_id>/", views.receiving_history_detail_view, name="procurement_receiving_history_detail"),
]

