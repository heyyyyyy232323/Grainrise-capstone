from django.urls import include, path


# ============================================================
# GRAINRISE
# MILLER MANAGER FUNCTION URLS
# ============================================================
#
# BASE ROUTE:
#
# /api/miller/
#
#
# CURRENT MILLER MODULES:
#
# /api/miller/contracts/
#
#
# NOTE:
# Additional Miller modules should be added here later using
# the same feature-folder pattern already used by Farmer.
# ============================================================


urlpatterns = [

    # ========================================================
    # CONTRACTS
    # ========================================================

    path(
        "contracts/",
        include(
            "api.miller_function.contracts.urls"
        ),
    ),

    # ========================================================
    # BRANCHES
    # ========================================================

    path(
        "branches/",
        include(
            "api.miller_function.branches.urls"
        ),
    ),

    # ========================================================
    # SUPPLIERS
    # ========================================================

    path(
        "suppliers/",
        include(
            "api.miller_function.suppliers.urls"
        ),
    ),

    # ========================================================
    # ORDER APPROVAL
    # ========================================================

    path(
        "order-approval/",
        include(
            "api.miller_function.order_approval.urls"
        ),
    ),
    path(
        "order-approval",
        include(
            "api.miller_function.order_approval.urls"
        ),
    ),

    # ========================================================
    # RECEIVING HISTORY
    # ========================================================

    path(
        "receiving-history/",
        include(
            "api.miller_function.receiving_history.urls"
        ),
    ),
]
