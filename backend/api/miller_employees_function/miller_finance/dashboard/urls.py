from django.urls import path
from .views import get_finance_dashboard_data_view

urlpatterns = [
    path("", get_finance_dashboard_data_view, name="get_finance_dashboard_data"),
]

