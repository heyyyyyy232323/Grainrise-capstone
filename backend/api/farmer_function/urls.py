from django.urls import include, path


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
]
