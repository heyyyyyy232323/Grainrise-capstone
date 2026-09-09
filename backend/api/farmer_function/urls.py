from django.urls import include, path


# ============================================================
# GRAINRISE
# FARMER FUNCTION URLS
# ============================================================
#
# BASE ROUTE:
#
# /api/farmer/
#
#
# FARMER MODULES:
#
# /api/farmer/dashboard/
# /api/farmer/farm-management/
# /api/farmer/contracts/
# /api/farmer/point-of-sale/
# /api/farmer/transaction-history/
# /api/farmer/forecasting/
# /api/farmer/notifications/
#
# ============================================================


urlpatterns = [

    # ========================================================
    # DASHBOARD
    # ========================================================

    path(
        "dashboard/",
        include(
            "api.farmer_function.dashboard.urls"
        ),
    ),


    # ========================================================
    # FARM MANAGEMENT
    # ========================================================

    path(
        "farm-management/",
        include(
            "api.farmer_function.farm_management.urls"
        ),
    ),


    # ========================================================
    # CONTRACTS
    # ========================================================

    path(
        "contracts/",
        include(
            "api.farmer_function.contracts.urls"
        ),
    ),


    # ========================================================
    # POINT OF SALE
    # ========================================================

    path(
        "point-of-sale/",
        include(
            "api.farmer_function.point_of_sale.urls"
        ),
    ),


    # ========================================================
    # TRANSACTION HISTORY
    # ========================================================

    path(
        "transaction-history/",
        include(
            "api.farmer_function.transaction_history.urls"
        ),
    ),


    # ========================================================
    # FORECASTING
    # ========================================================

    path(
        "forecasting/",
        include(
            "api.farmer_function.forecasting.urls"
        ),
    ),


    # ========================================================
    # NOTIFICATIONS
    # ========================================================

    path(
        "notifications/",
        include(
            "api.farmer_function.notifications.urls"
        ),
    ),

]
