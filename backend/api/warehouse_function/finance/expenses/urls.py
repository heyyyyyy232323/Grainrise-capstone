from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_warehouse_expenses_view, name="warehouse_expenses_list"),
    path("pay/", views.record_warehouse_expense_payment_view, name="warehouse_expenses_pay"),
]
