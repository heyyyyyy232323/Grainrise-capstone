from django.urls import path
from .views import procurement_dashboard_view

urlpatterns = [
    path("", procurement_dashboard_view, name="procurement_dashboard"),
]

