from django.urls import path
from .views import (
    list_finance_payment_history_view,
    list_finance_report_data_view,
)

urlpatterns = [
    path("", list_finance_payment_history_view, name="miller-finance-payment-history"),
    path("reports/", list_finance_report_data_view, name="miller-finance-payment-history-reports"),
]

