from django.urls import include, path

urlpatterns = [
    path("payables/", include("api.warehouse_function.finance.payables.urls")),
    path("expenses/", include("api.warehouse_function.finance.expenses.urls")),
    path("reimbursements/", include("api.warehouse_function.finance.reimbursements.urls")),
    path("payment-history/", include("api.warehouse_function.finance.payment_history.urls")),
    path("dashboard/", include("api.warehouse_function.finance.dashboard.urls")),
    path("notifications/", include("api.warehouse_function.finance.notifications.urls")),
]
