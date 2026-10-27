from django.urls import path
from .views import manager_dashboard_view

urlpatterns = [
    path("", manager_dashboard_view, name="miller_manager_dashboard"),
]

