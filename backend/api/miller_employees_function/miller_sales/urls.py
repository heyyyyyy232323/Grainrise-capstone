from django.urls import include, path

from . import views

urlpatterns = [
    path("pos/products/", views.pos_products_view, name="miller-sales-pos-products"),
    path("pos/payment-accounts/", views.pos_payment_accounts_view, name="miller-sales-pos-payment-accounts"),
    path("pos/check-reference/", views.pos_check_reference_view, name="miller-sales-pos-check-reference"),
    path("pos/checkout/", views.pos_checkout_view, name="miller-sales-pos-checkout"),
    path("pos/receipt/<str:reference_no>/", views.pos_receipt_detail_view, name="miller-sales-pos-receipt"),
    path("online-orders/", views.online_orders_list_view, name="miller-sales-online-orders-list"),
    path("online-orders/<int:order_id>/", views.online_order_detail_view, name="miller-sales-online-orders-detail"),
    path("online-orders/<int:order_id>/approve/", views.online_order_approve_view, name="miller-sales-online-orders-approve"),
    path("online-orders/<int:order_id>/decline/", views.online_order_decline_view, name="miller-sales-online-orders-decline"),
    path("history/in-store/", views.in_store_sales_history_view, name="miller-sales-history-in-store"),
    path("history/online/", views.online_sales_history_view, name="miller-sales-history-online"),
    path("dashboard/", views.sales_dashboard_view, name="miller-sales-dashboard"),
    path("notifications/", include("api.miller_employees_function.miller_sales.notifications.urls")),
    path("notifications", include("api.miller_employees_function.miller_sales.notifications.urls")),
]

