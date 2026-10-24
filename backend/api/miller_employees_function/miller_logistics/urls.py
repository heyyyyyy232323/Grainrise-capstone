from django.urls import path

from . import views

urlpatterns = [
    path("vehicles/", views.flc_vehicles_list_view, name="flc-vehicles-list"),
    path("vehicles/<int:vehicle_id>/", views.flc_vehicle_detail_view, name="flc-vehicle-detail"),
    path(
        "vehicles/<int:vehicle_id>/update-status/",
        views.flc_vehicle_update_status_view,
        name="flc-vehicle-update-status",
    ),
    path("drivers/", views.flc_active_drivers_view, name="flc-active-drivers-list"),
    path("delivery-orders/", views.flc_delivery_orders_view, name="flc-delivery-orders-list"),
    path(
        "delivery-orders/<int:order_id>/assign/",
        views.flc_assign_order_view,
        name="flc-delivery-order-assign",
    ),
    path("driver-capacities/", views.flc_driver_capacities_view, name="flc-driver-capacities-list"),
]

