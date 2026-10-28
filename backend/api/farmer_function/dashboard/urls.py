"""
GrainRise Farmer Dashboard URL routes.
"""

from django.urls import path
from . import views

app_name = "farmer_dashboard"

urlpatterns = [
    path("", views.farmer_dashboard, name="overview"),
    path("refresh/", views.refresh_farmer_insights, name="refresh"),
    path("farms/", views.farmer_farms_list, name="farms"),
]
