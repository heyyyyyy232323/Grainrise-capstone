from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_manager_finance_payment_history_view, name="manager_finance_payment_history"),
    path("reports/", views.list_manager_finance_report_data_view, name="manager_finance_report_data"),
]

