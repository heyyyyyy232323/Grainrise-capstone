from django.urls import include, path

urlpatterns = [
    path(
        "stock-management/",
        include("api.miller_employees_function.miller_encoder.stock_management.urls"),
    ),
]

