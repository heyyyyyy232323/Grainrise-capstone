from django.urls import include, path

urlpatterns = [
    path(
        "encoder/",
        include("api.miller_employees_function.miller_encoder.urls"),
    ),
    path(
        "procurement/",
        include("api.miller_employees_function.miller_procurement.urls"),
    ),
    path(
        "finance/",
        include("api.miller_employees_function.miller_finance.urls"),
    ),
    path(
        "sales/",
        include("api.miller_employees_function.miller_sales.urls"),
    ),
    path(
        "logistics/",
        include("api.miller_employees_function.miller_logistics.urls"),
    ),
]

