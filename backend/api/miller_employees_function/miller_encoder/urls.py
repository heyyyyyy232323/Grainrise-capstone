from django.urls import include, path

urlpatterns = [
    path(
        "stock-management/",
        include("api.miller_employees_function.miller_encoder.stock_management.urls"),
    ),
    path(
        "request-orders/",
        include("api.miller_employees_function.miller_encoder.request_order.urls"),
    ),
    path(
        "request-orders",
        include("api.miller_employees_function.miller_encoder.request_order.urls"),
    ),
    path(
        "order-history/",
        include("api.miller_employees_function.miller_encoder.order_history.urls"),
    ),
    path(
        "order-history",
        include("api.miller_employees_function.miller_encoder.order_history.urls"),
    ),
    path(
        "dashboard/",
        include("api.miller_employees_function.miller_encoder.dashboard.urls"),
    ),
    path(
        "dashboard",
        include("api.miller_employees_function.miller_encoder.dashboard.urls"),
    ),
    path(
        "notifications/",
        include("api.miller_employees_function.miller_encoder.notifications.urls"),
    ),
    path(
        "notifications",
        include("api.miller_employees_function.miller_encoder.notifications.urls"),
    ),
]

