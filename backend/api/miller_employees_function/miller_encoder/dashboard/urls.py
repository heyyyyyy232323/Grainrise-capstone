from django.urls import path
from .views import dashboard_overview_view

urlpatterns = [
    path("", dashboard_overview_view, name="miller_encoder_dashboard_overview"),
]

