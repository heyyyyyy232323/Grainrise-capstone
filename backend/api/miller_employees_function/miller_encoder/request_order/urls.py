from django.urls import path
from . import views

urlpatterns = [
    # Eligible products
    path("eligible-products/", views.eligible_products_view, name="encoder-request-eligible-products"),
    path("eligible-products", views.eligible_products_view, name="encoder-request-eligible-products-noslash"),

    # Forecasting & demand intelligence
    path("forecast/", views.generate_forecast_view, name="encoder-request-forecast"),
    path("forecast", views.generate_forecast_view, name="encoder-request-forecast-noslash"),

    # Submit request order
    path("create/", views.create_request_order_view, name="encoder-request-order-create"),
    path("create", views.create_request_order_view, name="encoder-request-order-create-noslash"),
    path("", views.create_request_order_view, name="encoder-request-order-root"),
]

