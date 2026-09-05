from django.urls import path

from .views import (
    pos_products,
    pos_checkout,
)


# ============================================================
# GRAINRISE
# FARMER > POINT OF SALE
# URLS
# ============================================================
#
# PARENT ROUTE:
#
# /api/farmer/point-of-sale/
#
#
# ENDPOINTS:
#
# GET
# /api/farmer/point-of-sale/products/
#
#     Retrieve sellable Inventory products belonging only
#     to the currently authenticated Farmer.
#
#
# POST
# /api/farmer/point-of-sale/checkout/
#
#     Complete one Farmer face-to-face POS checkout.
#
# ============================================================


urlpatterns = [

    # ========================================================
    # POS SELLABLE PRODUCTS
    # ========================================================

    path(
        "products/",
        pos_products,
        name="farmer-pos-products",
    ),


    # ========================================================
    # COMPLETE POS CHECKOUT
    # ========================================================

    path(
        "checkout/",
        pos_checkout,
        name="farmer-pos-checkout",
    ),

]