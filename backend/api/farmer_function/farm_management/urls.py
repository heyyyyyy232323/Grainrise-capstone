from django.urls import include, path

from .views import (
    crop_record_failed,
    crop_record_harvest,
    crop_record_planting,
    crop_start_land_preparation,
    crop_update,
    farm_activity,
    farm_details,
    farm_status,
    farms,
)


app_name = "farmer_farm_management"


urlpatterns = [

    # ========================================================
    # INVENTORY
    #
    # Mounted endpoints:
    #
    # GET /inventory/
    # POST /inventory/
    #
    # GET /inventory/farm-options/
    #
    # GET /inventory/<farm_product_id>/
    # PATCH /inventory/<farm_product_id>/
    #
    # PATCH /inventory/<farm_product_id>/archive/
    # PATCH /inventory/<farm_product_id>/restore/
    # ========================================================

    path(
        "inventory/",
        include(
            "api.farmer_function.farm_management.inventory.urls"
        ),
    ),


    # ========================================================
    # MY FARMS
    # ========================================================

    path(
        "farms/",
        farms,
        name="farms",
    ),


    # ========================================================
    # SPECIFIC FARM DETAILS
    # ========================================================

    path(
        "farms/<int:farm_id>/",
        farm_details,
        name="farm-details",
    ),


    # ========================================================
    # FARM STATUS
    # ========================================================

    path(
        "farms/<int:farm_id>/status/",
        farm_status,
        name="farm-status",
    ),


    # ========================================================
    # FARM ACTIVITY LOG
    # ========================================================

    path(
        "farms/<int:farm_id>/activity/",
        farm_activity,
        name="farm-activity",
    ),


    # ========================================================
    # CROP — START LAND PREPARATION
    # ========================================================

    path(
        (
            "farms/<int:farm_id>/crop/"
            "start-land-preparation/"
        ),
        crop_start_land_preparation,
        name="crop-start-land-preparation",
    ),


    # ========================================================
    # CROP — RECORD PLANTING
    # ========================================================

    path(
        (
            "farms/<int:farm_id>/crop/"
            "record-planting/"
        ),
        crop_record_planting,
        name="crop-record-planting",
    ),


    # ========================================================
    # CROP — UPDATE CURRENT CROP
    # ========================================================

    path(
        "farms/<int:farm_id>/crop/",
        crop_update,
        name="crop-update",
    ),


    # ========================================================
    # CROP — RECORD HARVEST
    # ========================================================

    path(
        (
            "farms/<int:farm_id>/crop/"
            "record-harvest/"
        ),
        crop_record_harvest,
        name="crop-record-harvest",
    ),


    # ========================================================
    # CROP — RECORD FAILED CROP
    # ========================================================

    path(
        (
            "farms/<int:farm_id>/crop/"
            "record-failed/"
        ),
        crop_record_failed,
        name="crop-record-failed",
    ),

]