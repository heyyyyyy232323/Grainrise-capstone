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
]
