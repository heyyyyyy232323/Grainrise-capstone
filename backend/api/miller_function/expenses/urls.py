from django.urls import path
from .views import (
    list_manager_expenses_view,
    list_manager_branches_view,
    create_manager_expense_view,
    get_manager_expense_detail_view,
)

urlpatterns = [
    path("", list_manager_expenses_view, name="list_manager_expenses"),
    path("branches/", list_manager_branches_view, name="list_manager_branches"),
    path("create/", create_manager_expense_view, name="create_manager_expense"),
    path("<int:expense_id>/", get_manager_expense_detail_view, name="get_manager_expense_detail"),
]

