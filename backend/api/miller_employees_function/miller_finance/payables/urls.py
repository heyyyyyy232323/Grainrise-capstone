from django.urls import path
from .views import list_payables_view, record_payment_view

urlpatterns = [
    path("", list_payables_view, name="miller_finance_payables_list"),
    path("pay/", record_payment_view, name="miller_finance_payables_record_payment"),
]

