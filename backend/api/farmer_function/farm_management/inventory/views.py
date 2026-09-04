from django.db import (
    DatabaseError,
    IntegrityError,
)

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ...farmer_auth import farmer_required

from .selectors import (
    get_farmer_inventory_product_details,
    list_farmer_inventory_farm_options,
    list_farmer_inventory_products,
)

from .services import (
    InventoryManagementError,
    add_inventory_product,
    archive_inventory_product,
    restore_inventory_product,
    update_inventory_product,
)


# ============================================================
# RESPONSE HELPERS
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
        payload["message"] = message

    if data is not None:
        payload["data"] = data

    return Response(
        payload,
        status=http_status,
    )


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


def _handle_exception(
    exc,
):
    """
    Convert expected Farmer Inventory errors into clean,
    user-facing API responses.

    Database internals are never exposed to the frontend.
    """

    if isinstance(
        exc,
        InventoryManagementError,
    ):
        return _error(
            exc.message,
            code=exc.code,
            http_status=exc.status,
        )

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

    if isinstance(
        exc,
        IntegrityError,
    ):
        return _error(
            (
                "The Inventory action conflicts "
                "with the current product data. "
                "Please refresh and try again."
            ),
            code="data_conflict",
            http_status=(
                status.HTTP_409_CONFLICT
            ),
        )

    if isinstance(
        exc,
        DatabaseError,
    ):
        return _error(
            (
                "Farmer Inventory is temporarily "
                "unavailable. Please try again."
            ),
            code="database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )

    return _error(
        (
            "An unexpected Farmer Inventory "
            "error occurred. Please try again."
        ),
        code="internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# INVENTORY LIST + ADD PRODUCT
#
# GET
#   /inventory/
#
# POST
#   /inventory/
# ============================================================

@api_view(
    [
        "GET",
        "POST",
    ]
)
@farmer_required
def inventory_products(
    request,
):
    """
    GET
    ----------------------------------------------------------

    Retrieve Farmer Inventory records.

    Supported query parameters:

        status
            active
            archived

        search
            Product Code
            Rice Variety / Variant
            Description

        sort_by
            newest
            oldest
            stock_highest
            stock_lowest


    Example:

        /inventory/?status=active

        /inventory/?status=archived

        /inventory/?status=active&search=dinorado

        /inventory/?status=active&sort_by=stock_highest


    POST
    ----------------------------------------------------------

    Add Product manually.

    Expected body:

        {
            "product_type": "unmilled_palay",

            "rice_variety": "Dinorado",

            "stock_quantity_kg": 500,

            "selling_price_per_kg": 32.50,

            "product_image": "...",

            "description": "...",

            "product_grade": "...",

            "acquisition_source_type":
                "own_farm",

            "source_farm_id": 3,

            "harvest_acquisition_date":
                "2026-09-04",

            "source_acquisition_remarks":
                ""
        }


    SECURITY
    ----------------------------------------------------------

    The owner user_id is NEVER accepted from request.data.

    request.grainrise_farmer_id comes from the verified
    Farmer JWT/session.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        # ====================================================
        # GET INVENTORY
        # ====================================================

        if request.method == "GET":

            status_filter = (
                request.query_params.get(
                    "status",
                    "active",
                )
            )

            search = (
                request.query_params.get(
                    "search",
                    "",
                )
            )

            sort_by = (
                request.query_params.get(
                    "sort_by",
                    "newest",
                )
            )

            items = (
                list_farmer_inventory_products(
                    farmer_user_id,
                    status_filter=(
                        status_filter
                    ),
                    search=search,
                    sort_by=sort_by,
                )
            )

            return _success(
                data={
                    "items": items,
                    "count": len(items),
                    "status": status_filter,
                }
            )


        # ====================================================
        # ADD PRODUCT
        # ====================================================

        created_product = (
            add_inventory_product(
                farmer_user_id,
                request.data,
            )
        )

        return _success(
            data=created_product,
            message=(
                "Product added to Inventory "
                "successfully."
            ),
            http_status=(
                status.HTTP_201_CREATED
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# INVENTORY PRODUCT DETAILS + EDIT
#
# GET
#   /inventory/<farm_product_id>/
#
# PATCH
#   /inventory/<farm_product_id>/
# ============================================================

@api_view(
    [
        "GET",
        "PATCH",
    ]
)
@farmer_required
def inventory_product_details(
    request,
    farm_product_id,
):
    """
    GET
    ----------------------------------------------------------

    Return complete View Details information for one
    Farmer Inventory product.


    PATCH
    ----------------------------------------------------------

    Edit only allowed commercial/product presentation fields:

        product_image
        description
        product_grade
        selling_price_per_kg


    Protected fields cannot be changed through this endpoint:

        product_code
        product_type
        rice_variety

        record_source_type
        acquisition_source_type
        source_farm_id
        source_crop_cycle_id

        harvest_acquisition_date

        total_stock_quantity_kg
        reserved_committed_quantity_kg
        available_quantity_kg
        stock_level

        status


    SECURITY
    ----------------------------------------------------------

    Product must satisfy:

        farm_products.user_id
            =
        authenticated Farmer ID

    Therefore manually changing the product ID in the URL
    does not expose another Farmer's Inventory.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        # ====================================================
        # VIEW DETAILS
        # ====================================================

        if request.method == "GET":

            product = (
                get_farmer_inventory_product_details(
                    farmer_user_id,
                    farm_product_id,
                )
            )

            if not product:
                return _error(
                    (
                        "Inventory product "
                        "not found."
                    ),
                    code=(
                        "product_not_found"
                    ),
                    http_status=(
                        status.HTTP_404_NOT_FOUND
                    ),
                )

            return _success(
                data=product
            )


        # ====================================================
        # EDIT PRODUCT
        # ====================================================

        updated_product = (
            update_inventory_product(
                farmer_user_id,
                farm_product_id,
                request.data,
            )
        )

        return _success(
            data=updated_product,
            message=(
                "Inventory product updated "
                "successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# ARCHIVE PRODUCT
#
# PATCH
#   /inventory/<farm_product_id>/archive/
# ============================================================

@api_view(
    [
        "PATCH",
    ]
)
@farmer_required
def inventory_product_archive(
    request,
    farm_product_id,
):
    """
    Archive an Active Farmer Inventory product.

    This does NOT delete the record.

    Only:

        active
            ↓
        archived

    Product identity, source information and stock history
    remain intact.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        product = (
            archive_inventory_product(
                farmer_user_id,
                farm_product_id,
            )
        )

        return _success(
            data=product,
            message=(
                "Product archived successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# RESTORE PRODUCT
#
# PATCH
#   /inventory/<farm_product_id>/restore/
# ============================================================

@api_view(
    [
        "PATCH",
    ]
)
@farmer_required
def inventory_product_restore(
    request,
    farm_product_id,
):
    """
    Restore an Archived Farmer Inventory product.

        archived
            ↓
        active

    No product/source/stock information is recreated or
    changed.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        product = (
            restore_inventory_product(
                farmer_user_id,
                farm_product_id,
            )
        )

        return _success(
            data=product,
            message=(
                "Product restored successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# SOURCE FARM OPTIONS
#
# GET
#   /inventory/farm-options/
# ============================================================

@api_view(
    [
        "GET",
    ]
)
@farmer_required
def inventory_farm_options(
    request,
):
    """
    Used by:

        Inventory
            -> Add Product
                -> Source Type
                    -> Own Farm
                        -> Source Farm dropdown

    Only farms belonging to the authenticated Farmer are
    returned.

    IMPORTANT:

    Even though the dropdown only shows owned farms,
    add_inventory_product() validates ownership again
    during submission.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:

        items = (
            list_farmer_inventory_farm_options(
                farmer_user_id
            )
        )

        return _success(
            data={
                "items": items,
                "count": len(items),
            }
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )