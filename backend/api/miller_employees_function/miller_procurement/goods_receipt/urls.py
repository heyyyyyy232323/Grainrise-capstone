from django.urls import path
from .views import (
    goods_receipt_list_view,
    goods_receipt_detail_view,
    goods_receipt_request_to_pay_view,
)

urlpatterns = [
    path("", goods_receipt_list_view, name="procurement_goods_receipt_list"),
    path("<int:receiving_id>/", goods_receipt_detail_view, name="procurement_goods_receipt_detail"),
    path(
        "<int:receiving_id>/request-to-pay/",
        goods_receipt_request_to_pay_view,
        name="procurement_goods_receipt_request_to_pay",
    ),
]

