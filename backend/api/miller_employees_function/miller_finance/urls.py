from django.urls import include, path

urlpatterns = [
    path(
        "payables/",
        include("api.miller_employees_function.miller_finance.payables.urls"),
    ),
    path(
        "expenses/",
        include("api.miller_employees_function.miller_finance.expenses.urls"),
    ),
    path(
        "reimbursements/",
        include("api.miller_employees_function.miller_finance.reimbursements.urls"),
    ),
    path(
        "payment-history/",
        include("api.miller_employees_function.miller_finance.payment_history.urls"),
    ),
    path(
        "dashboard/",
        include("api.miller_employees_function.miller_finance.dashboard.urls"),
    ),
    path(
        "notifications/",
        include("api.miller_employees_function.miller_finance.notifications.urls"),
    ),
]



