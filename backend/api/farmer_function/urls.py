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
# CURRENT FARMER MODULES:
#
# /api/farmer/farm-management/
# /api/farmer/contracts/
# /api/farmer/point-of-sale/
# /api/farmer/transaction-history/
#
# ============================================================


urlpatterns = [

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
    #
    # CHILD ENDPOINTS:
    #
    # GET
    # /api/farmer/point-of-sale/products/
    #
    # POST
    # /api/farmer/point-of-sale/checkout/
    #
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
    #
    # CHILD ENDPOINTS:
    #
    # GET
    # /api/farmer/transaction-history/pos/
    #
    # GET
    # /api/farmer/transaction-history/pos/summary/
    #
    # GET
    # /api/farmer/transaction-history/contracts/
    #
    # GET
    # /api/farmer/transaction-history/contracts/<contract_id>/
    #
    # ========================================================

    path(
        "transaction-history/",
        include(
            "api.farmer_function.transaction_history.urls"
        ),
    ),

]