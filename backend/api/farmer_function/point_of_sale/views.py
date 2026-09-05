from django.db import (
    DatabaseError,
    IntegrityError,
)

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required

from .selectors import (
    list_farmer_pos_products,
)

from .services import (
    FarmerPOSError,
    complete_pos_checkout,
)


# ============================================================
# GRAINRISE
# FARMER > POINT OF SALE
# VIEWS
# ============================================================
#
# ENDPOINT PURPOSE:
#
# GET
#     Retrieve sellable Inventory products belonging only
#     to the currently authenticated Farmer.
#
# POST
#     Complete one face-to-face POS checkout.
#
#
# SECURITY:
#
# All endpoints are protected by:
#
#     @farmer_required
#
# Farmer ownership always comes from:
#
#     request.grainrise_farmer_id
#
# Never from:
#
#     request.data["farmer_user_id"]
#
# ============================================================


# ============================================================
# SUCCESS RESPONSE
# ============================================================

def _success(
    *,
    data=None,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }

    if message:
        payload[
            "message"
        ] = message

    if data is not None:
        payload[
            "data"
        ] = data

    return Response(
        payload,
        status=http_status,
    )


# ============================================================
# ERROR RESPONSE
# ============================================================

def _error(
    message,
    *,
    code="error",
    http_status=status.HTTP_400_BAD_REQUEST,
):
    return Response(
        {
            "success": False,
            "code": code,
            "message": message,
        },
        status=http_status,
    )


# ============================================================
# COMMON ERROR HANDLER
# ============================================================

def _handle_exception(
    exc,
):
    """
    Convert expected POS/database errors into safe API
    responses.

    Database internals are never exposed to frontend.
    """

    # ========================================================
    # POS BUSINESS ERROR
    # ========================================================

    if isinstance(
        exc,
        FarmerPOSError,
    ):
        return _error(
            exc.message,
            code=exc.code,
            http_status=exc.status,
        )


    # ========================================================
    # VALIDATION ERROR
    # ========================================================

    if isinstance(
        exc,
        ValueError,
    ):
        return _error(
            str(exc),
            code="validation_error",
            http_status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )


    # ========================================================
    # DATABASE CONFLICT
    # ========================================================

    if isinstance(
        exc,
        IntegrityError,
    ):
        return _error(
            (
                "The POS transaction conflicts "
                "with the current Inventory data. "
                "Please refresh and try again."
            ),
            code="data_conflict",
            http_status=(
                status.HTTP_409_CONFLICT
            ),
        )


    # ========================================================
    # DATABASE ERROR
    # ========================================================

    if isinstance(
        exc,
        DatabaseError,
    ):
        return _error(
            (
                "Farmer Point of Sale is "
                "temporarily unavailable. "
                "Please try again."
            ),
            code="database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )


    # ========================================================
    # UNKNOWN ERROR
    # ========================================================

    return _error(
        (
            "An unexpected Farmer Point of Sale "
            "error occurred. Please try again."
        ),
        code="internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# POS PRODUCTS
# ============================================================
#
# GET
#
# /farmer/point-of-sale/products/
#
#
# PURPOSE:
#
# Retrieve only products that may currently be sold by the
# authenticated Farmer.
#
#
# SELLABLE PRODUCT RULES:
#
# Product must:
#
#     belong to logged-in Farmer
#
#     status = active
#
#     available_quantity_kg > 0
#
#     stock_level != out_of_stock
#
#     selling_price_per_kg > 0
#
#
# IMPORTANT:
#
# Expiration filtering is intentionally NOT implemented yet
# because the current farm_products schema does not yet have
# an expiration field.
#
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def pos_products(
    request,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        # ====================================================
        # SEARCH
        # ====================================================

        search = (
            request.query_params.get(
                "search",
                "",
            )
        )


        # ====================================================
        # RETRIEVE PRODUCTS
        # ====================================================

        items = (
            list_farmer_pos_products(
                farmer_user_id,
                search=search,
            )
        )


        # ====================================================
        # RESPONSE
        # ====================================================

        return _success(
            data={
                "items": items,
                "count": len(
                    items
                ),
            },
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )


# ============================================================
# COMPLETE POS CHECKOUT
# ============================================================
#
# POST
#
# /farmer/point-of-sale/checkout/
#
#
# EXAMPLE REQUEST:
#
# {
#     "buyer_name": "Juan Dela Cruz",
#
#     "payment_method": "cash",
#
#     "amount_received": 3000,
#
#     "items": [
#         {
#             "farm_product_id": 5,
#             "quantity_kg": 50
#         },
#         {
#             "farm_product_id": 8,
#             "quantity_kg": 25
#         }
#     ]
# }
#
#
# buyer_name:
#
#     OPTIONAL
#
#
# IMPORTANT:
#
# farmer_user_id is intentionally NOT accepted here.
#
# It comes from:
#
#     request.grainrise_farmer_id
#
#
# CHECKOUT SERVICE WILL:
#
#     1. Lock selected Inventory products.
#
#     2. Verify they belong to authenticated Farmer.
#
#     3. Verify they are active.
#
#     4. Verify they are not out of stock.
#
#     5. Verify requested quantity does not exceed
#        available_quantity_kg.
#
#     6. Get current selling price from Inventory.
#
#     7. Calculate checkout total.
#
#     8. Validate payment.
#
#     9. Generate one transaction_code.
#
#    10. Save historical POS transaction rows.
#
#    11. Deduct quantity sold from Inventory stock.
#
#
# ATOMIC RULE:
#
# If even ONE item fails:
#
#     no transaction rows are saved
#     no Inventory stock is deducted
#
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def pos_checkout(
    request,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        # ====================================================
        # COMPLETE CHECKOUT
        # ====================================================

        result = (
            complete_pos_checkout(
                farmer_user_id=(
                    farmer_user_id
                ),
                data=request.data,
            )
        )


        # ====================================================
        # RESPONSE
        # ====================================================

        return _success(
            message=(
                "Transaction completed successfully."
            ),
            data=result,
            http_status=(
                status.HTTP_201_CREATED
            ),
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )