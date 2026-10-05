from django.urls import include, path


urlpatterns = [
    # ========================================================
    # DASHBOARD
    # ========================================================

    path(
        "dashboard/",
        include(
            "api.account_admin_fnction.dashboard.urls"
        ),
    ),


    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    path(
        "notifications/",
        include(
            "api.account_admin_fnction.notifications.urls"
        ),
    ),


    # ========================================================
    # ANNOUNCEMENTS
    # ========================================================

    path(
        "announcements/",
        include(
            "api.account_admin_fnction.announcements.urls"
        ),
    ),


    # ========================================================
    # MILLER MANAGEMENT
    # ========================================================

    path(
        "millers/",
        include(
            "api.account_admin_fnction.miller_management.urls"
        ),
    ),


    # ========================================================
    # WAREHOUSE MANAGEMENT
    # ========================================================

    path(
        "warehouses/",
        include(
            "api.account_admin_fnction.warehouse_management.urls"
        ),
    ),


    # ========================================================
    # RETAILER MANAGEMENT
    # ========================================================

    path(
        "retailers/",
        include(
            "api.account_admin_fnction.retailer_management.urls"
        ),
    ),


    # ========================================================
    # FARMER MANAGEMENT
    # ========================================================

    path(
        "farmers/",
        include(
            "api.account_admin_fnction.farmer_management.urls"
        ),
    ),


    # ========================================================
    # EMAIL USERS
    # ========================================================

    path(
        "email-users/",
        include(
            "api.account_admin_fnction.email_users.urls"
        ),
    ),
]