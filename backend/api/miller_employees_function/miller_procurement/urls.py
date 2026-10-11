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
    path(
        "returns/",
        include("api.miller_employees_function.miller_procurement.returns.urls"),
    ),
    path(
        "receiving-history/",
        include("api.miller_employees_function.miller_procurement.receiving_history.urls"),
    ),
    path(
        "suppliers/",
        include("api.miller_employees_function.miller_procurement.suppliers.urls"),
    ),
    path(
        "payment-history/",
        include("api.miller_employees_function.miller_procurement.payment_history.urls"),
    ),
    path(
        "dashboard/",
        include("api.miller_employees_function.miller_procurement.dashboard.urls"),
    ),
    path(
        "dashboard",
        include("api.miller_employees_function.miller_procurement.dashboard.urls"),
    ),
    path(
        "notifications/",
        include("api.miller_employees_function.miller_procurement.notifications.urls"),
    ),
    path(
        "notifications",
        include("api.miller_employees_function.miller_procurement.notifications.urls"),
    ),
]

