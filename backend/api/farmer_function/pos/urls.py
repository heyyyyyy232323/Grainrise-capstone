from django.urls import path
from . import views

urlpatterns = [
    path("products/", views.products, name="farmer-pos-products"),
    path("checkout/", views.checkout_view, name="farmer-pos-checkout"),
    path("history/", views.history, name="farmer-pos-history"),
    path("receipt/<str:reference_no>/", views.receipt, name="farmer-pos-receipt"),
    path("history/receipt/<str:reference_no>/", views.receipt, name="farmer-pos-history-receipt"),
]
