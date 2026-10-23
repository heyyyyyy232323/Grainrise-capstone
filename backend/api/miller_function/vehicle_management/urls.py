from django.urls import path
from .views import (
    check_plate_view,
    create_vehicle_view,
    detail_vehicle_view,
    list_branches_view,
    list_vehicles_view,
    update_vehicle_view,
)

urlpatterns = [
    path("", list_vehicles_view, name="miller-vehicle-list"),
    path("branches/", list_branches_view, name="miller-vehicle-branches"),
    path("check-plate/", check_plate_view, name="miller-vehicle-check-plate"),
    path("create/", create_vehicle_view, name="miller-vehicle-create"),
    path("<int:vehicle_id>/", detail_vehicle_view, name="miller-vehicle-detail"),
    path("<int:vehicle_id>/edit/", update_vehicle_view, name="miller-vehicle-update"),
]

