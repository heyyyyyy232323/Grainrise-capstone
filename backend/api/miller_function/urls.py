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

]
