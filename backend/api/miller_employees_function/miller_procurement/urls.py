from django.urls import include, path

urlpatterns = [
    path(
        "receiving-orders/",
        include("api.miller_employees_function.miller_procurement.receiving_orders.urls"),
    ),
    path(
        "goods-receipt/",
        include("api.miller_employees_function.miller_procurement.goods_receipt.urls"),
    ),
]

