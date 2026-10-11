from django.urls import path
from .views import (
    payment_history_list_view,
    payment_history_detail_view,
)

urlpatterns = [
    path(
        "",
        payment_history_list_view,
        name="procurement_payment_history_list",
    ),
    path(
        "<int:receiving_id>/",
        payment_history_detail_view,
        name="procurement_payment_history_detail",
    ),
]

