from django.urls import path
from . import views

urlpatterns = [
    path("", views.manager_receiving_history_list_view, name="manager_receiving_history_list"),
    path("suppliers/", views.manager_receiving_history_suppliers_view, name="manager_receiving_history_suppliers"),
    path("<int:receiving_id>/", views.manager_receiving_history_detail_view, name="manager_receiving_history_detail"),
]

