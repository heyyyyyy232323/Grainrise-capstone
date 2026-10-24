from django.urls import path
from .views import get_manager_performance_monitoring_view

urlpatterns = [
    path("", get_manager_performance_monitoring_view, name="manager-performance-monitoring"),
]

