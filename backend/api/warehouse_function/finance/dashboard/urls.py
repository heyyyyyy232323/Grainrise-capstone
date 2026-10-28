from django.urls import path
from . import views

urlpatterns = [
    path("", views.get_warehouse_finance_dashboard_data_view, name="get_warehouse_finance_dashboard_data"),
]
