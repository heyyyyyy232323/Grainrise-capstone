from django.urls import path

from . import views

urlpatterns = [
    path("pos/products/", views.pos_products_view, name="miller-sales-pos-products"),
    path("pos/payment-accounts/", views.pos_payment_accounts_view, name="miller-sales-pos-payment-accounts"),
    path("pos/check-reference/", views.pos_check_reference_view, name="miller-sales-pos-check-reference"),
    path("pos/checkout/", views.pos_checkout_view, name="miller-sales-pos-checkout"),
    path("pos/receipt/<str:reference_no>/", views.pos_receipt_detail_view, name="miller-sales-pos-receipt"),
]

