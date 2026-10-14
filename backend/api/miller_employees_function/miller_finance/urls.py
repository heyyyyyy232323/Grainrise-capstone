from django.urls import include, path

urlpatterns = [
    path(
        "payables/",
        include("api.miller_employees_function.miller_finance.payables.urls"),
    ),
]

