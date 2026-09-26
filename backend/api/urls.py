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

    # ========================================================
    # ADMIN AUTHENTICATION
    # ========================================================

    path(
        "auth/admin/login",
        admin_views.admin_login,
        name="admin-login",
    ),


    # ========================================================
    # REGISTRATION FUNCTIONALITY DISABLED
    # Public self-registration for Millers/Suppliers, Retailers,
    # and Warehouses has been removed in favor of the Partner With Us flow.
    # The registration handlers in views.py, supplier_registration.py,
    # and warehouse_registration.py are preserved for future use.
    # ========================================================


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
    # ADMIN â€” RETAILER MANAGEMENT
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


    # ========================================================
    # FORGOT PASSWORD
    # ========================================================

    path(
        "auth/forgot-password/send-otp",
        views.forgot_password_send_otp,
        name="forgot-password-send-otp",
    ),

    path(
        "auth/forgot-password/verify-otp",
        views.forgot_password_verify_otp,
        name="forgot-password-verify-otp",
    ),

    path(
        "auth/forgot-password/reset",
        views.forgot_password_reset,
        name="forgot-password-reset",
    ),
]