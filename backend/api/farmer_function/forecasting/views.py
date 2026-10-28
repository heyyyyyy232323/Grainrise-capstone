"""
GrainRise Farmer Forecasting API views.

Thin transport layer only:
- Farmer JWT/session guard
- request payload reading
- workflow calls
- JSON-safe responses
- controlled error handling

No Farmer user_id is accepted from the frontend.
The authenticated Farmer ID always comes from farmer_required.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required

from .ai_workflow import (
    AIWorkflowError,
    generate_farmer_forecast_ai,
)
from .climate_workflow import (
    ClimateWorkflowError,
    generate_farmer_climate_forecast,
)
from .demand_workflow import (
    DemandWorkflowError,
    generate_farmer_demand_forecast,
    list_farmer_demand_forecast_products,
)
from .selectors import list_farmer_forecast_farms


logger = logging.getLogger(__name__)


# ============================================================
# RESPONSE / SERIALIZATION HELPERS
# ============================================================


def _serialize(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {
            key: _serialize(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            _serialize(item)
            for item in value
        ]

    return value


def _success(
    data=None,
    *,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }

    if message:
        payload["message"] = message

    if data is not None:
        payload["data"] = _serialize(
            data
        )

    return Response(
        payload,
        status=http_status,
    )


def _error(
    *,
    code,
    detail,
    http_status,
):
    return Response(
        {
            "success": False,
            "code": code,
            "detail": detail,
        },
        status=http_status,
    )


def _handle_exception(exc):
    controlled_types = (
        ClimateWorkflowError,
        DemandWorkflowError,
        AIWorkflowError,
    )

    if isinstance(
        exc,
        controlled_types,
    ):
        return _error(
            code=exc.code,
            detail=exc.message,
            http_status=exc.status,
        )

    logger.exception(
        "Unexpected Farmer Forecasting API error."
    )

    return _error(
        code="forecasting_internal_error",
        detail=(
            "Something went wrong while processing "
            "the Forecasting request."
        ),
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


def _data(request):
    value = getattr(
        request,
        "data",
        None,
    )

    return (
        value
        if isinstance(
            value,
            dict,
        )
        else {}
    )


def _farmer_user_id(request):
    farmer_id = getattr(
        request,
        "grainrise_farmer_id",
        None,
    )

    if farmer_id is None:
        raise ClimateWorkflowError(
            "authentication_required",
            "Farmer authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    return farmer_id


# ============================================================
# FARM OPTIONS
# ============================================================


@api_view([
    "GET",
])
@farmer_required
def forecasting_farms(
    request,
):
    """
    Farmer-owned farms usable by Climate Forecasting.

    GET /api/farmer/forecasting/farms/
    """

    try:
        farmer_id = _farmer_user_id(
            request
        )

        farms = list_farmer_forecast_farms(
            farmer_id
        )

        return _success(
            {
                "farms": farms,
            }
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# DEMAND PRODUCT OPTIONS
# ============================================================


@api_view([
    "GET",
])
@farmer_required
def demand_forecast_products(
    request,
):
    """
    Farmer-scoped product/variety options with available
    POS and/or Contract demand history.

    GET /api/farmer/forecasting/demand/products/
    """

    try:
        farmer_id = _farmer_user_id(
            request
        )

        products = (
            list_farmer_demand_forecast_products(
                farmer_id
            )
        )

        return _success(
            {
                "products": products,
            }
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# CLIMATE FORECAST
# ============================================================


@api_view([
    "POST",
])
@farmer_required
def climate_forecast(
    request,
):
    """
    Generate/load a Farmer Climate Forecast.

    The workflow:
    - resolves registered Farm or provided map/search/current
      coordinates
    - reuses fresh PostgreSQL climate cache when available
    - otherwise retrieves Copernicus climate data
    - normalizes historical + 6-month seasonal forecast
    - saves a Farmer-owned forecast run

    Expected body:

    {
        "location_source": "registered_farm",
        "farm_id": 1,
        "historical_years": 3,
        "display_granularity": "monthly"
    }

    For searched/map/current location, send:
        latitude
        longitude
        location_label
    """

    try:
        farmer_id = _farmer_user_id(
            request
        )

        payload = _data(
            request
        )

        result = generate_farmer_climate_forecast(
            farmer_id,
            location_source=payload.get(
                "location_source"
            ),
            historical_years=payload.get(
                "historical_years",
                3,
            ),
            display_granularity=payload.get(
                "display_granularity",
                "monthly",
            ),
            farm_id=payload.get(
                "farm_id"
            ),
            latitude=payload.get(
                "latitude"
            ),
            longitude=payload.get(
                "longitude"
            ),
            location_label=payload.get(
                "location_label"
            ),
            forecast_issue_date=payload.get(
                "forecast_issue_date"
            ),
            province=payload.get(
                "province"
            ),
            city=payload.get(
                "city"
            ),
        )

        return _success(
            result,
            message=(
                "Climate Forecast generated successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# DEMAND FORECAST
# ============================================================


@api_view([
    "POST",
])
@farmer_required
def demand_forecast(
    request,
):
    """
    Generate a Farmer Demand Forecast using the thesis method:

        Time Series
        +
        Multiple Linear Regression

    Sources:
        Farmer POS
        Contracts
        deterministic News signals

    AI is not used to generate the numerical result.

    Expected body:

    {
        "product_type": "Unmilled Palay",
        "rice_variety": "RC222",
        "granularity": "monthly",
        "horizon_periods": 6
    }

    Historical/forecast date fields are optional; the workflow
    provides safe defaults when omitted.
    """

    try:
        farmer_id = _farmer_user_id(
            request
        )

        payload = _data(
            request
        )

        result = generate_farmer_demand_forecast(
            farmer_id,
            product_type=payload.get(
                "product_type"
            ),
            rice_variety=payload.get(
                "rice_variety"
            ),
            granularity=payload.get(
                "granularity",
                "monthly",
            ),
            historical_start_date=payload.get(
                "historical_start_date"
            ),
            historical_end_date=payload.get(
                "historical_end_date"
            ),
            forecast_start_date=payload.get(
                "forecast_start_date"
            ),
            horizon_periods=payload.get(
                "horizon_periods"
            ),
        )

        return _success(
            result,
            message=(
                "Demand Forecast processed successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# GROUNDED AI INTERPRETATION / FARMER Q&A
# ============================================================


@api_view([
    "POST",
])
@farmer_required
def forecast_ai(
    request,
):
    """
    Generate automatic Forecast interpretation or answer a
    Farmer question.

    The frontend supplies only Farmer-owned Forecast run IDs.
    The backend reloads the actual stored run/context so the
    client cannot substitute arbitrary forecast values.

    Automatic Climate example:

    {
        "scope": "climate",
        "climate_forecast_run_id": 10,
        "response_language": "taglish"
    }

    Demand Q&A example:

    {
        "scope": "demand",
        "demand_forecast_run_id": 20,
        "question_text": "Bakit tumataas ang demand?",
        "response_language": "taglish"
    }

    Combined:

    {
        "scope": "combined",
        "climate_forecast_run_id": 10,
        "demand_forecast_run_id": 20,
        "response_language": "taglish"
    }

    AI interpretation cannot claim actual soil health.
    Soil/land implications are possible implications only,
    grounded in climate patterns + approved Learning Materials.
    """

    try:
        farmer_id = _farmer_user_id(
            request
        )

        payload = _data(
            request
        )

        result = generate_farmer_forecast_ai(
            farmer_id,
            scope=payload.get(
                "scope"
            ),
            climate_forecast_run_id=payload.get(
                "climate_forecast_run_id"
            ),
            demand_forecast_run_id=payload.get(
                "demand_forecast_run_id"
            ),
            question_text=payload.get(
                "question_text"
            ),
            response_language=payload.get(
                "response_language",
                "taglish",
            ),
        )

        return _success(
            result,
            message=(
                "Forecast interpretation generated successfully."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )



# ============================================================
# RESOLVE LOCATION COORDINATES
# ============================================================


@api_view([
    "GET",
])
@farmer_required
def resolve_location_coordinates(
    request,
):
    """
    Resolve accurate coordinates for a Philippine province and city/municipality.
    GET /api/farmer/forecasting/resolve-location/?province=...&city=...
    """
    try:
        province = request.query_params.get("province", "").strip()
        city = request.query_params.get("city", "").strip()

        if not province and not city:
            return _error(
                code="missing_location",
                detail="Province and city are required.",
                http_status=status.HTTP_400_BAD_REQUEST,
            )

        from api.account_admin_fnction.announcements.climate_selectors import (
            resolve_forecast_location,
        )

        resolved = resolve_forecast_location({
            "country": "Philippines",
            "country_code": "PH",
            "province": province,
            "city": city,
            "display_name": f"{city}, {province}, Philippines",
        })

        coords = resolved.get("coordinates") or {}
        return _success({
            "latitude": coords.get("latitude"),
            "longitude": coords.get("longitude"),
            "display_name": f"{city}, {province}",
        })
    except Exception as exc:
        return _handle_exception(exc)
