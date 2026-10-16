from django.urls import path
from .views import (
    list_finance_expenses_view,
    record_expense_payment_view,
    get_finance_expense_detail_view,
)

urlpatterns = [
    path("", list_finance_expenses_view, name="list_finance_expenses"),
    path("pay/", record_expense_payment_view, name="record_expense_payment"),
    path("<int:expense_id>/", get_finance_expense_detail_view, name="get_finance_expense_detail"),
]

