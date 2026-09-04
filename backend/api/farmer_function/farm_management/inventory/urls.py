from django.urls import path

from .views import (
    inventory_farm_options,
    inventory_product_archive,
    inventory_product_details,
    inventory_product_restore,
    inventory_products,
)


app_name = "farmer_inventory"


urlpatterns = [

    # ========================================================
    # INVENTORY LIST + ADD PRODUCT
    #
    # GET
    #   /inventory/
    #
    # POST
    #   /inventory/
    # ========================================================

    path(
        "",
        inventory_products,
        name="inventory-products",
    ),


    # ========================================================
    # SOURCE FARM OPTIONS
    #
    # GET
    #   /inventory/farm-options/
    #
    # Used by:
    #
    # Add Product
    #   -> Source Type = Own Farm
    #   -> Source Farm dropdown
    # ========================================================

    path(
        "farm-options/",
        inventory_farm_options,
        name="inventory-farm-options",
    ),


    # ========================================================
    # PRODUCT DETAILS + EDIT
    #
    # GET
    #   /inventory/<farm_product_id>/
    #
    # PATCH
    #   /inventory/<farm_product_id>/
    # ========================================================

    path(
        "<int:farm_product_id>/",
        inventory_product_details,
        name="inventory-product-details",
    ),


    # ========================================================
    # ARCHIVE PRODUCT
    #
    # PATCH
    #   /inventory/<farm_product_id>/archive/
    # ========================================================

    path(
        "<int:farm_product_id>/archive/",
        inventory_product_archive,
        name="inventory-product-archive",
    ),


    # ========================================================
    # RESTORE PRODUCT
    #
    # PATCH
    #   /inventory/<farm_product_id>/restore/
    # ========================================================

    path(
        "<int:farm_product_id>/restore/",
        inventory_product_restore,
        name="inventory-product-restore",
    ),

]