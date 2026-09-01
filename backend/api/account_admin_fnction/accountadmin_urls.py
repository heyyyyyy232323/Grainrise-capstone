from django.urls import include, path


urlpatterns = [
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
]