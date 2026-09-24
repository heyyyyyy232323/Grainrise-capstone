from django.urls import include, path

from . import views
from . import auth_views
from .admin_auth import admin_views


urlpatterns = [

    # ========================================================
    # API HEALTH
    # ========================================================

    path(
        "",
        views.read_root,
        name="api-root",
    ),


    # ========================================================
    # LOCATION / PSGC
    # ========================================================

    path(
        "locations/provinces",
        views.locations_provinces,
        name="locations-provinces",
    ),

    path(
        "locations/provinces/<str:parent_code>/cities-municipalities",
        views.locations_cities_municipalities,
        name="locations-cities-municipalities",
    ),

    path(
        "locations/cities-municipalities/<str:locality_code>/barangays",
        views.locations_barangays,
        name="locations-barangays",
    ),

    path(
        "locations/cities-municipalities/<str:locality_code>",
        views.locations_locality_detail,
        name="locations-locality-detail",
    ),


    # ========================================================
    # USER AUTHENTICATION
    # ========================================================

    path(
        "auth/login",
        auth_views.login,
        name="user-login",
    ),

    path(
        "auth/register",
        views.register,
        name="generic-register",
    ),


    # ========================================================
    # ADMIN AUTHENTICATION
    # ========================================================

    path(
        "auth/admin/login",
        admin_views.admin_login,
        name="admin-login",
    ),


    # ========================================================
    # RETAILER REGISTRATION
    # ========================================================

    path(
        "auth/retailer/send-otp",
        views.send_retailer_otp,
        name="retailer-send-otp",
    ),

    path(
        "auth/retailer/verify-otp",
        views.verify_retailer_otp,
        name="retailer-verify-otp",
    ),

    path(
        "auth/retailer/google-verify",
        views.verify_retailer_google,
        name="retailer-google-verify",
    ),

    path(
        "auth/retailer/register",
        views.register_retailer,
        name="retailer-register",
    ),



    # ========================================================
    # WAREHOUSE MANAGER REGISTRATION
    # ========================================================

    path(
        "auth/warehouse-manager/send-otp",
        views.send_warehouse_otp,
        name="warehouse-manager-send-otp",
    ),

    path(
        "auth/warehouse-manager/verify-otp",
        views.verify_warehouse_otp,
        name="warehouse-manager-verify-otp",
    ),

    path(
        "auth/warehouse-manager/google-verify",
        views.verify_warehouse_google,
        name="warehouse-manager-google-verify",
    ),

    path(
        "auth/warehouse-manager/extract-documents",
        views.extract_warehouse_documents,
        name="warehouse-manager-extract-documents",
    ),

    path(
        "auth/warehouse-manager/register",
        views.register_warehouse,
        name="warehouse-manager-register",
    ),


    # ========================================================
    # SUPPLIER / MILLER REGISTRATION
    # ========================================================

    path(
        "auth/supplier/send-otp",
        views.send_supplier_otp,
        name="supplier-send-otp",
    ),

    path(
        "auth/supplier/verify-otp",
        views.verify_supplier_otp,
        name="supplier-verify-otp",
    ),

    path(
        "auth/supplier/google-verify",
        views.verify_supplier_google,
        name="supplier-google-verify",
    ),

    path(
        "auth/supplier/extract-documents",
        views.extract_supplier_documents,
        name="supplier-extract-documents",
    ),

    path(
        "auth/supplier/register",
        views.register_supplier,
        name="supplier-register",
    ),


    # ========================================================
    # ACCOUNT ADMIN MANAGEMENT
    # ========================================================

    path(
        "admin/",
        include("api.account_admin_fnction.accountadmin_urls"),
    ),



    # ========================================================
    # MILLER MANAGER FUNCTIONS
    # ========================================================
    #
    # Current Miller modules:
    #
    # /api/miller/contracts/
    #
    # All Miller Contracts endpoints are protected by the
    # Miller JWT guard and resolve the supplier_profile_id
    # from the authenticated Miller Manager account.
    #
    # Never use a supplier_profile_id sent by the frontend as
    # ownership authority.
    # ========================================================

    path(
        "miller/",
        include("api.miller_function.urls"),
    ),


    # ========================================================
    # CENTRALIZED NEWS & UPDATES
    # ========================================================
    #
    # Shared by:
    #
    # miller_manager
    # warehouse_manager
    # retailer
    #
    # Employees are rejected by the News authentication guard.
    #
    # Final prefix:
    #
    # /api/news/
    # ========================================================

    path(
        "news/",
        include("api.news_updates.urls"),
    ),


    # ========================================================
    # ADMIN — RETAILER MANAGEMENT
    # ========================================================

    path(
        "admin/retailers",
        views.admin_retailers,
        name="admin-retailers",
    ),

    path(
        "admin/retailers/<int:user_id>/status",
        views.admin_retailer_status,
        name="admin-retailer-status",
    ),

    path(
        "admin/retailers/<int:user_id>/documents/<str:document_kind>",
        views.admin_retailer_document,
        name="admin-retailer-document",
    ),


    # ========================================================
    # EXISTING SILOS
    # ========================================================

    path(
        "silos",
        views.silos_list,
        name="silos-list",
    ),

    path(
        "silos/<int:silo_id>",
        views.update_silo,
        name="silo-update",
    ),


    # ========================================================
    # EXISTING ALERTS
    # ========================================================

    path(
        "alerts",
        views.alerts_list,
        name="alerts-list",
    ),

    path(
        "alerts/<int:alert_id>/resolve",
        views.resolve_alert,
        name="alert-resolve",
    ),
]