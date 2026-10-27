from django.urls import path
from .views import (
    list_warehouse_finance_payment_history_view,
    list_warehouse_finance_report_data_view,
)

urlpatterns = [
    path("", list_warehouse_finance_payment_history_view, name="warehouse_finance_payment_history"),
    path("reports/", list_warehouse_finance_report_data_view, name="warehouse_finance_payment_history_reports"),
]
