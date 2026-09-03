from django.db import DatabaseError, IntegrityError

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required

from .selectors import (
    get_farmer_farm_details,
    list_farmer_farm_activity,
    list_farmer_farms,
)

from .services import (
    FarmManagementError,
    add_farm,
    record_failed_crop,
    record_harvest,
    record_planting,
    set_farm_status,
    start_land_preparation,
    update_current_crop,
    update_farm_information,
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


def _handle_exception(exc):
    """
    Convert expected Farm Management errors to clean API
    responses without exposing database internals.
    """

    if isinstance(
        exc,
        FarmManagementError,
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
                "The requested Farm Management action "
                "conflicts with the current farm, crop, "
                "or inventory state."
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
                "Farm Management is temporarily unavailable. "
                "Please try again."
            ),
            code="database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )

    return _error(
        (
            "An unexpected Farm Management error occurred. "
            "Please try again."
        ),
        code="internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# MY FARMS
# GET /farms/
# POST /farms/
# ============================================================

@api_view(
    [
        "GET",
        "POST",
    ]
)
@farmer_required
def farms(request):
    """
    GET
        List farms owned by the authenticated Farmer.

        Supported query params:
        - search
        - crop_status
        - farm_status
        - sort_by

    POST
        Add New Farm.

    SECURITY:
        Ownership always comes from
        request.grainrise_farmer_id,
        which was derived from the verified JWT.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        if request.method == "GET":
            items = list_farmer_farms(
                farmer_user_id,
                search=(
                    request.query_params.get(
                        "search",
                        "",
                    )
                ),
                crop_status=(
                    request.query_params.get(
                        "crop_status",
                        "",
                    )
                ),
                farm_status=(
                    request.query_params.get(
                        "farm_status",
                        "",
                    )
                ),
                sort_by=(
                    request.query_params.get(
                        "sort_by",
                        "newest",
                    )
                ),
            )

            return _success(
                data={
                    "items": items,
                    "count": len(items),
                }
            )

        created_farm = add_farm(
            farmer_user_id,
            request.data,
        )

        return _success(
            data=created_farm,
            message=(
                "Farm added successfully."
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
# SPECIFIC FARM DETAILS
# GET /farms/<farm_id>/
# PUT/PATCH /farms/<farm_id>/
# ============================================================

@api_view(
    [
        "GET",
        "PUT",
        "PATCH",
    ]
)
@farmer_required
def farm_details(
    request,
    farm_id,
):
    """
    GET
        Specific Farm Details Page data.

    PUT / PATCH
        Edit Farm Information modal.

    Crop fields are not edited here.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        if request.method == "GET":
            farm = (
                get_farmer_farm_details(
                    farmer_user_id,
                    farm_id,
                )
            )

            if not farm:
                return _error(
                    "Farm not found.",
                    code="farm_not_found",
                    http_status=(
                        status.HTTP_404_NOT_FOUND
                    ),
                )

            return _success(
                data=farm
            )

        updated_farm = (
            update_farm_information(
                farmer_user_id,
                farm_id,
                request.data,
            )
        )

        return _success(
            data=updated_farm,
            message=(
                "Farm information updated successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# FARM STATUS
# PATCH /farms/<farm_id>/status/
# ============================================================

@api_view(
    [
        "PATCH",
    ]
)
@farmer_required
def farm_status(
    request,
    farm_id,
):
    """
    Set Farm as Active / Inactive.

    Expected body:
        {
            "status": "active"
        }

    or:
        {
            "status": "inactive"
        }
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = set_farm_status(
            farmer_user_id,
            farm_id,
            request.data.get(
                "status"
            ),
        )

        return _success(
            data=updated_farm,
            message=(
                "Farm status updated successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# FARM ACTIVITY LOG
# GET /farms/<farm_id>/activity/
# ============================================================

@api_view(
    [
        "GET",
    ]
)
@farmer_required
def farm_activity(
    request,
    farm_id,
):
    """
    Paginated Farm Activity Log.

    Query params:
        page
        page_size
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        # ----------------------------------------------------
        # CONFIRM OWNERSHIP
        # ----------------------------------------------------

        farm = get_farmer_farm_details(
            farmer_user_id,
            farm_id,
        )

        if not farm:
            return _error(
                "Farm not found.",
                code="farm_not_found",
                http_status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        result = (
            list_farmer_farm_activity(
                farmer_user_id,
                farm_id,
                page=(
                    request.query_params.get(
                        "page",
                        1,
                    )
                ),
                page_size=(
                    request.query_params.get(
                        "page_size",
                        10,
                    )
                ),
            )
        )

        return _success(
            data=result
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# START LAND PREPARATION
# POST /farms/<farm_id>/crop/start-land-preparation/
# ============================================================

@api_view(
    [
        "POST",
    ]
)
@farmer_required
def crop_start_land_preparation(
    request,
    farm_id,
):
    """
    Expected body:

        {
            "land_preparation_date": "YYYY-MM-DD"
        }
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = (
            start_land_preparation(
                farmer_user_id,
                farm_id,
                request.data,
            )
        )

        return _success(
            data=updated_farm,
            message=(
                "Land preparation started successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# RECORD PLANTING
# POST /farms/<farm_id>/crop/record-planting/
# ============================================================

@api_view(
    [
        "POST",
    ]
)
@farmer_required
def crop_record_planting(
    request,
    farm_id,
):
    """
    Expected body:

        {
            "rice_variety": "Dinorado",
            "planting_date": "2026-08-12",
            "expected_harvest_date": "2026-11-20",
            "expected_yield_kg": 5000
        }

    expected_yield_kg is optional.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = record_planting(
            farmer_user_id,
            farm_id,
            request.data,
        )

        return _success(
            data=updated_farm,
            message=(
                "Planting recorded successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# UPDATE CURRENT CROP
# PATCH /farms/<farm_id>/crop/
# ============================================================

@api_view(
    [
        "PATCH",
    ]
)
@farmer_required
def crop_update(
    request,
    farm_id,
):
    """
    Normal crop update only.

    This endpoint DOES NOT mark a crop as harvested.

    Expected body may contain:

        {
            "expected_harvest_date": "2026-11-20",
            "expected_yield_kg": 5000,
            "remarks": "Crop is growing normally."
        }
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = (
            update_current_crop(
                farmer_user_id,
                farm_id,
                request.data,
            )
        )

        return _success(
            data=updated_farm,
            message=(
                "Current crop updated successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# RECORD HARVEST
# POST /farms/<farm_id>/crop/record-harvest/
# ============================================================

@api_view(
    [
        "POST",
    ]
)
@farmer_required
def crop_record_harvest(
    request,
    farm_id,
):
    """
    Record a successful harvest.

    SECURITY:
        farmer_user_id is taken exclusively from the verified
        JWT Farmer session.

        The frontend does NOT send ownership user_id.

    BUSINESS FLOW:
        1. Verify farm ownership
        2. Verify farm is active
        3. Verify current crop is Planted and Growing
        4. Mark crop cycle as Harvested
        5. Save actual harvest date and actual yield
        6. Automatically create farm_products Inventory record
        7. Write Farm Activity Log entries

    All database operations are performed atomically by
    services.record_harvest().

    Expected body:

        {
            "product_type": "unmilled_palay",
            "actual_harvest_date": "2026-11-20",
            "actual_yield_kg": 4850,
            "product_image": "...",
            "description": "Freshly harvested palay",
            "product_grade": "..."
        }

    Required:
        product_type
        actual_harvest_date
        actual_yield_kg

    Automatic:
        product_code
        rice_variety
        source type
        source farm
        source cropping cycle
        initial total stock
        reserved quantity
        available quantity
        stock level
        status
        timestamps

    Selling price is not required during Record Harvest.
    It may be configured later from Farmer Inventory.
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = (
            record_harvest(
                farmer_user_id,
                farm_id,
                request.data,
            )
        )

        return _success(
            data=updated_farm,
            message=(
                "Harvest recorded successfully "
                "and added to Inventory."
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
# RECORD FAILED CROP
# POST /farms/<farm_id>/crop/record-failed/
# ============================================================

@api_view(
    [
        "POST",
    ]
)
@farmer_required
def crop_record_failed(
    request,
    farm_id,
):
    """
    Expected body:

        {
            "failure_reason":
                "severe_weather_typhoon",

            "additional_remarks":
                "Optional remarks"
        }
    """

    farmer_user_id = (
        request.grainrise_farmer_id
    )

    try:
        updated_farm = (
            record_failed_crop(
                farmer_user_id,
                farm_id,
                request.data,
            )
        )

        return _success(
            data=updated_farm,
            message=(
                "Failed crop recorded successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )