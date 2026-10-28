from django.urls import include, path

urlpatterns = [
    path(
        "branches/",
        include("api.warehouse_function.branches.urls"),
    ),
    path(
        "suppliers/",
        include("api.warehouse_function.suppliers.urls"),
    ),
    path(
        "messages/",
        include("api.warehouse_function.messages.urls"),
    ),
    path(
        "finance/",
        include("api.warehouse_function.finance.urls"),
    ),
    path(
        "sales/",
        include("api.warehouse_function.sales.urls"),
    ),
    path(
        "logistics/",
        include("api.warehouse_function.logistics.urls"),
    ),
    path(
        "driver/",
        include("api.warehouse_function.driver.urls"),
    ),
    path(
        "payment-accounts/",
        include("api.warehouse_function.online_payment_accounts.urls"),
    ),
]
