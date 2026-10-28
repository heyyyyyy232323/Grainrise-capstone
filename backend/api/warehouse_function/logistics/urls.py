from django.urls import include, path

from . import views

urlpatterns = [
    # Dashboard
    path("dashboard/", views.warehouse_flc_dashboard_view, name="warehouse-flc-dashboard"),

    # Delivery Orders Management
    path("delivery-orders/", views.warehouse_flc_delivery_orders_view, name="warehouse-flc-delivery-orders"),
    path("delivery-orders/<int:order_id>/assign/", views.warehouse_flc_assign_order_view, name="warehouse-flc-assign-order"),

    # Driver Capacities & Deliveries
    path("driver-capacities/", views.warehouse_flc_driver_capacities_view, name="warehouse-flc-driver-capacities"),
    path("driver-capacities/<int:driver_id>/deliveries/", views.warehouse_flc_driver_deliveries_view, name="warehouse-flc-driver-deliveries"),

    # Notifications (support both with and without trailing slash)
    path("notifications/", include("api.warehouse_function.logistics.notifications.urls")),
    path("notifications", include("api.warehouse_function.logistics.notifications.urls")),

    # Product Returns
    path("product-returns/", views.warehouse_flc_product_returns_view, name="warehouse-flc-product-returns"),
    path("product-returns/variants/", views.warehouse_flc_product_returns_variants_view, name="warehouse-flc-product-returns-variants"),
    path("product-returns/<int:return_id>/process/", views.warehouse_flc_process_product_return_view, name="warehouse-flc-process-product-return"),

    # Assigned History
    path("assigned-history/", views.warehouse_flc_vehicle_assigned_history_view, name="warehouse-flc-assigned-history"),

    # Vehicle Assignee Management
    path("vehicles/", views.warehouse_flc_vehicles_list_view, name="warehouse-flc-vehicles-list"),
    path("vehicles/<int:vehicle_id>/", views.warehouse_flc_vehicle_detail_view, name="warehouse-flc-vehicle-detail"),
    path("vehicles/<int:vehicle_id>/update-status/", views.warehouse_flc_vehicle_update_status_view, name="warehouse-flc-vehicle-update-status"),
    path("drivers/", views.warehouse_flc_active_drivers_view, name="warehouse-flc-active-drivers"),

    # Fulfillment History
    path("fulfillment-history/", views.warehouse_flc_fulfillment_history_view, name="warehouse-flc-fulfillment-history"),
    path("fulfillment-history/variants/", views.warehouse_flc_fulfillment_history_variants_view, name="warehouse-flc-fulfillment-history-variants"),

    # Reimbursements
    path("reimbursements/submit/", views.warehouse_flc_submit_reimbursement_view, name="warehouse-flc-submit-reimbursement"),
    path("reimbursements/history/", views.warehouse_flc_reimbursement_history_view, name="warehouse-flc-reimbursement-history"),
    path("reimbursements/categories/", views.warehouse_flc_reimbursement_categories_view, name="warehouse-flc-reimbursement-categories"),
]
