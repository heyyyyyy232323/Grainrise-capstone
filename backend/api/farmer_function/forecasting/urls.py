"""
GrainRise Farmer Forecasting URL routes.
"""

from django.urls import path

from . import views


app_name = "farmer_forecasting"


urlpatterns = [
    path(
        "farms/",
        views.forecasting_farms,
        name="forecasting-farms",
    ),
    path(
        "climate/",
        views.climate_forecast,
        name="climate-forecast",
    ),
    path(
        "demand/products/",
        views.demand_forecast_products,
        name="demand-forecast-products",
    ),
    path(
        "demand/",
        views.demand_forecast,
        name="demand-forecast",
    ),
    path(
        "ai/",
        views.forecast_ai,
        name="forecast-ai",
    ),
]
