from django.urls import include, path

from . import views
from . import auth_views
from .admin_auth import admin_views
from . import partnership_inquiry
from . import support_views
from api.farmer_function.pos.views import history as farmer_pos_history


urlpatterns = [

    # ========================================================
    # FARMER POINT OF SALE
    # ========================================================
    path(
        "farmer/pos/",
        include("api.farmer_function.pos.urls"),
    ),
    # Compatibility route used by the Farmer Transaction History page.
    path(
        "farmer/transaction-history/pos/",
        farmer_pos_history,
        name="farmer-transaction-history-pos",
    ),

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
        "auth/change-temporary-password",
        auth_views.change_temporary_password,
        name="change-temporary-password",
    ),

    path(
        "auth/profile-status",
        auth_views.get_profile_status,
        name="auth-profile-status",
    ),

    path(
        "auth/complete-profile",
        auth_views.complete_profile,
        name="auth-complete-profile",
    ),

    path(
        "auth/profile",
        auth_views.user_profile,
        name="auth-user-profile-no-slash",
    ),

    path(
        "auth/profile/",
        auth_views.user_profile,
        name="auth-user-profile",
    ),

    path(
        "auth/change-password",
        auth_views.user_change_password,
        name="auth-user-change-password-no-slash",
    ),

    path(
        "auth/change-password/",
        auth_views.user_change_password,
        name="auth-user-change-password",
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
    #
    # Public self-registration for Millers/Suppliers,
    # Retailers, and Warehouses has been removed in favor
    # of the Partner With Us flow.
    #
    # Existing registration handlers are preserved.
    # ========================================================


    # ========================================================
    # ACCOUNT ADMIN MANAGEMENT
    # ========================================================

    path(
        "admin/",
        include(
            "api.account_admin_fnction.accountadmin_urls"
        ),
    ),


    # ========================================================
    # ACCOUNT ADMIN - ANNOUNCEMENTS
    #
    # FRONTEND ROUTES REMAIN:
    #
    # /api/announcements/admin/
    # /api/announcements/admin/counts/
    # /api/announcements/admin/drafts/
    # /api/announcements/admin/climate/forecast/
    # /api/announcements/admin/climate/generate-article/
    #
    # Backend implementation lives under:
    #
    # api/account_admin_fnction/announcements/
    # ========================================================

    path(
        "announcements/",
        include(
            "api.account_admin_fnction.announcements.urls"
        ),
    ),

    path(
        "profanity/",
        include(
            "api.account_admin_fnction.profanity_management.urls"
        ),
    ),


    # ========================================================
    # MILLER MANAGER FUNCTIONS
    # ========================================================

    path(
        "miller/",
        include(
            "api.miller_function.urls"
        ),
    ),

    # ========================================================
    # WAREHOUSE MANAGER FUNCTIONS
    # ========================================================

    path(
        "warehouse/",
        include(
            "api.warehouse_function.urls"
        ),
    ),
    path(
        "warehouse-manager/",
        include(
            "api.warehouse_function.urls"
        ),
    ),
    path(
        "warehouse-finance/",
        include(
            "api.warehouse_function.urls"
        ),
    ),


    # MILLER EMPLOYEE FUNCTIONS

    path(
        "miller-employees/",
        include(
            "api.miller_employees_function.urls"
        ),
    ),


    # ========================================================
    # MILLER EMPLOYEE FUNCTIONS (ENCODER, PROCUREMENT, FINANCE, SALES)
    # ========================================================

    path(
        "miller-employees/",
        include(
            "api.miller_employees_function.urls"
        ),
    ),


    # ========================================================
    # CENTRALIZED NEWS & UPDATES
    # ========================================================

    path(
        "news/",
        include(
            "api.news_updates.urls"
        ),
    ),


    # ========================================================
    # ADMIN – RETAILER MANAGEMENT
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


    # ========================================================
    # ========================================================
    # CONTACT SUPPORT (PUBLIC)
    # ========================================================

    path(
        "support/contact/",
        support_views.submit_contact_support,
        name="contact-support-submit",
    ),


    # ========================================================
    # PARTNERSHIP INQUIRIES (PUBLIC)
    # ========================================================

    path(
        "partnership-inquiries/check-availability/",
        partnership_inquiry.check_partnership_availability,
        name="partnership-inquiry-check-availability",
    ),

    path(
        "partnership-inquiries/verify-id/",
        partnership_inquiry.verify_partnership_id,
        name="partnership-inquiry-verify-id",
    ),

    path(
        "partnership-inquiries/",
        partnership_inquiry.submit_partnership_inquiry,
        name="partnership-inquiry-submit",
    ),

    path(
        "partnership-inquiries/verify-email/<str:token>",
        partnership_inquiry.verify_partnership_email,
        name="partnership-inquiry-verify-email-no-slash",
    ),

    path(
        "partnership-inquiries/verify-email/<str:token>/",
        partnership_inquiry.verify_partnership_email,
        name="partnership-inquiry-verify-email",
    ),

    path(
        "partnership-inquiries/verify-sms/<str:token>",
        partnership_inquiry.verify_partnership_sms_link,
        name="partnership-inquiry-verify-sms-no-slash",
    ),

    path(
        "partnership-inquiries/verify-sms/<str:token>/",
        partnership_inquiry.verify_partnership_sms_link,
        name="partnership-inquiry-verify-sms",
    ),

    path(
        "partnership-inquiries/verify-sms/",
        partnership_inquiry.verify_partnership_sms_link,
        name="partnership-inquiry-verify-sms-post",
    ),

    path(
        "partnership-inquiries/resend-verification/",
        partnership_inquiry.resend_partnership_verification,
        name="partnership-inquiry-resend-verification",
    ),

    path(
        "partnership-inquiries/verify-otp/",
        partnership_inquiry.verify_partnership_otp,
        name="partnership-inquiry-verify-otp",
    ),


    # ========================================================
    # PARTNERSHIP INQUIRIES (ADMIN — by role)
    #
    # GET:
    # /api/admin/partnership-inquiries/
    #
    # PATCH / DELETE:
    # /api/admin/partnership-inquiries/<id>/
    #
    # STATUS:
    # /api/admin/partnership-inquiries/<id>/status/
    # ========================================================

    path(
        "admin/partnership-inquiries/",
        partnership_inquiry.admin_list_partnership_inquiries,
        name="admin-partnership-inquiries-list",
    ),

    path(
        "admin/partnership-inquiries/<str:inquiry_id>/",
        partnership_inquiry.admin_get_or_update_partnership_inquiry,
        name="admin-partnership-inquiry-detail",
    ),

    path(
        "admin/partnership-inquiries/<str:inquiry_id>/status/",
        partnership_inquiry.admin_update_partnership_inquiry_status,
        name="admin-partnership-inquiry-status",
    ),
]

