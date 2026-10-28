import json
import os
import time
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.db import connection, transaction

from .selectors import (
    get_climate_fetch_points,
    get_farmer_forecast_farm,
    get_fresh_climate_fetch,
)


# ============================================================
# FARMER FORECASTING SHARED SERVICES
# ============================================================
#
# RESPONSIBILITY:
#
# - registered-farm geocoding
# - geocode cache management
# - normalization of map/search/current-location coordinates
# - climate-cache request normalization
# - fresh climate-cache lookup
#
# INTENTIONALLY NOT HANDLED HERE:
#
# - Copernicus retrieval
# - raw climate file parsing/normalization
# - Demand Time Series + MLR
# - AI interpretation
#
# Those operations live in dedicated provider/engine/workflow
# modules so this shared service remains reusable and below the
# project file-size target.
#
# IMPORTANT FARMER-FACING RULE:
#
# Copernicus is treated as a weather/climate source only.
# GrainRise does NOT claim actual soil health, fertility, pH,
# nutrients, or laboratory soil properties from CDS.
# Possible land/soil implications belong to the later grounded
# AI interpretation layer using climate patterns + approved
# Learning Materials.
# ============================================================


GEOCODE_PROVIDER = "nominatim"

GEOCODE_RESOLVED = "resolved"
GEOCODE_APPROXIMATE = "approximate"
GEOCODE_FAILED = "failed"

MATCH_STREET = "street_address"
MATCH_BARANGAY = "barangay"
MATCH_MUNICIPALITY = "municipality"

VALID_GRANULARITIES = {"weekly", "monthly"}
VALID_CLIMATE_KINDS = {"historical", "forecast"}

# GrainRise intentionally treats Copernicus as the source of
# weather/climate variables only. Possible land/soil implications
# are interpreted later by the AI using climate history/outlook
# plus approved learning materials; they are not presented as
# directly measured soil-health values.
VALID_CLIMATE_VARIABLES = {
    "temperature_c",
    "precipitation_mm",
    "wind_speed_mps",
    "solar_radiation_mj_m2",
}

DEFAULT_NOMINATIM_URL = (
    "https://nominatim.openstreetmap.org/search"
)
DEFAULT_USER_AGENT = "GrainRise-Capstone/1.0"
NOMINATIM_MIN_INTERVAL_SECONDS = 1.05
HTTP_TIMEOUT_SECONDS = 12

_last_geocode_request = 0.0


__all__ = [
    "ForecastingError",
    "VALID_CLIMATE_VARIABLES",
    "resolve_registered_farm_coordinates",
    "normalize_forecast_coordinates",
    "build_climate_cache_request",
    "get_fresh_climate_cache_payload",
]


class ForecastingError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# ============================================================
# NORMALIZATION
# ============================================================


def _text(
    value,
    *,
    required=False,
    field_name="Field",
    max_length=None,
):
    normalized = str(value or "").strip()

    if required and not normalized:
        raise ForecastingError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )

    if (
        max_length is not None
        and len(normalized) > max_length
    ):
        raise ForecastingError(
            "validation_error",
            f"{field_name} is too long.",
            400,
        )

    return normalized


def _farmer_id(value):
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise ForecastingError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        ) from exc

    if normalized <= 0:
        raise ForecastingError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        )

    return normalized


def _positive_id(value, field_name):
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise ForecastingError(
            "validation_error",
            f"Invalid {field_name}.",
            400,
        ) from exc

    if normalized <= 0:
        raise ForecastingError(
            "validation_error",
            f"Invalid {field_name}.",
            400,
        )

    return normalized


def _coordinate(value, field_name, minimum, maximum):
    try:
        normalized = Decimal(str(value)).quantize(
            Decimal("0.000001")
        )
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ForecastingError(
            "invalid_location",
            f"Invalid {field_name}.",
            400,
        ) from exc

    if not Decimal(str(minimum)) <= normalized <= Decimal(
        str(maximum)
    ):
        raise ForecastingError(
            "invalid_location",
            f"Invalid {field_name}.",
            400,
        )

    return normalized


def _date(value, field_name):
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    normalized = _text(
        value,
        required=True,
        field_name=field_name,
    )

    try:
        return date.fromisoformat(normalized)
    except ValueError as exc:
        raise ForecastingError(
            "validation_error",
            f"{field_name} must use YYYY-MM-DD format.",
            400,
        ) from exc


def _date_range(start_date, end_date):
    start = _date(start_date, "Start date")
    end = _date(end_date, "End date")

    if start > end:
        raise ForecastingError(
            "validation_error",
            "Start date cannot be after end date.",
            400,
        )

    return start, end


def _granularity(value):
    normalized = _text(
        value,
        required=True,
        field_name="Forecast granularity",
    ).lower()

    if normalized not in VALID_GRANULARITIES:
        raise ForecastingError(
            "invalid_granularity",
            "Forecast granularity must be weekly or monthly.",
            400,
        )

    return normalized


def _climate_kind(value):
    normalized = _text(
        value,
        required=True,
        field_name="Climate data kind",
    ).lower()

    if normalized not in VALID_CLIMATE_KINDS:
        raise ForecastingError(
            "invalid_climate_kind",
            "Climate data kind must be historical or forecast.",
            400,
        )

    return normalized


def _variables(values):
    if not isinstance(values, (list, tuple, set)):
        raise ForecastingError(
            "validation_error",
            "Climate variables must be a list.",
            400,
        )

    normalized = sorted(
        {
            _text(value)
            for value in values
            if _text(value)
        }
    )

    if not normalized:
        raise ForecastingError(
            "validation_error",
            "At least one climate variable is required.",
            400,
        )

    unsupported = sorted(
        set(normalized) - VALID_CLIMATE_VARIABLES
    )

    if unsupported:
        raise ForecastingError(
            "unsupported_climate_variable",
            (
                "Unsupported GrainRise climate variable(s): "
                + ", ".join(unsupported)
                + ". GrainRise fetches weather/climate variables "
                  "from Copernicus only. Possible land/soil "
                  "implications are handled by AI interpretation "
                  "using climate history and approved learning "
                  "materials."
            ),
            400,
        )

    return tuple(normalized), ",".join(normalized)


# ============================================================
# GEOCODER
# ============================================================


def _geocoder_config():
    return {
        "url": _text(
            os.getenv("NOMINATIM_BASE_URL")
            or DEFAULT_NOMINATIM_URL
        ),
        "user_agent": _text(
            os.getenv("NOMINATIM_USER_AGENT")
            or DEFAULT_USER_AGENT
        ),
        "email": _text(
            os.getenv("NOMINATIM_CONTACT_EMAIL")
        ),
    }


def _respect_geocode_rate_limit():
    global _last_geocode_request

    elapsed = time.monotonic() - _last_geocode_request
    remaining = NOMINATIM_MIN_INTERVAL_SECONDS - elapsed

    if remaining > 0:
        time.sleep(remaining)

    _last_geocode_request = time.monotonic()


def _http_json(url, headers):
    request = Request(
        url,
        headers=headers,
        method="GET",
    )

    try:
        with urlopen(
            request,
            timeout=HTTP_TIMEOUT_SECONDS,
        ) as response:
            raw = response.read().decode(
                response.headers.get_content_charset()
                or "utf-8",
                errors="replace",
            )
    except HTTPError as exc:
        if exc.code == 429:
            raise ForecastingError(
                "geocoding_rate_limited",
                "The location service is temporarily busy.",
                503,
            ) from exc

        raise ForecastingError(
            "geocoding_provider_error",
            f"Location service error ({exc.code}).",
            502,
        ) from exc
    except (URLError, TimeoutError, OSError) as exc:
        raise ForecastingError(
            "geocoding_unavailable",
            "The location service is currently unavailable.",
            503,
        ) from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ForecastingError(
            "geocoding_invalid_response",
            "The location service returned invalid data.",
            502,
        ) from exc


def _geocode(query):
    query = _text(
        query,
        required=True,
        field_name="Location query",
    )
    config = _geocoder_config()

    if not config["user_agent"]:
        raise ForecastingError(
            "geocoding_configuration_error",
            "Geocoding User-Agent is not configured.",
            500,
        )

    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": "1",
        "limit": "1",
        "countrycodes": "ph",
    }

    if config["email"]:
        params["email"] = config["email"]

    _respect_geocode_rate_limit()

    payload = _http_json(
        f"{config['url']}?{urlencode(params)}",
        {
            "User-Agent": config["user_agent"],
            "Accept": "application/json",
        },
    )

    if not isinstance(payload, list) or not payload:
        return None

    result = payload[0]

    if not isinstance(result, dict):
        return None

    try:
        latitude = _coordinate(
            result.get("lat"),
            "latitude",
            -90,
            90,
        )
        longitude = _coordinate(
            result.get("lon"),
            "longitude",
            -180,
            180,
        )
    except ForecastingError:
        return None

    return {
        "latitude": latitude,
        "longitude": longitude,
        "display_name": _text(
            result.get("display_name")
        ),
        "provider": GEOCODE_PROVIDER,
    }


def _geocode_candidates(farm):
    candidates = [
        (
            MATCH_STREET,
            _text(farm.get("primary_geocode_query")),
        ),
        (
            MATCH_BARANGAY,
            _text(farm.get("barangay_geocode_query")),
        ),
        (
            MATCH_MUNICIPALITY,
            _text(farm.get("municipality_geocode_query")),
        ),
    ]

    output = []
    seen = set()

    for match_level, query in candidates:
        key = query.casefold()

        if not query or key in seen:
            continue

        seen.add(key)
        output.append((match_level, query))

    return output


# ============================================================
# FARM GEOCODE CACHE
# ============================================================


def _save_geocode_success(
    farmer_user_id,
    farm_id,
    result,
    match_level,
):
    status = (
        GEOCODE_RESOLVED
        if match_level == MATCH_STREET
        else GEOCODE_APPROXIMATE
    )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE farmer_farms
                SET
                    latitude = %s,
                    longitude = %s,
                    geocode_status = %s,
                    geocode_match_level = %s,
                    geocode_provider = %s,
                    geocoded_address = %s,
                    geocode_updated_at = CURRENT_TIMESTAMP
                WHERE farm_id = %s
                  AND user_id = %s
                  AND farm_status = 'active'
                RETURNING
                    farm_id,
                    farm_name,
                    latitude,
                    longitude,
                    geocode_status,
                    geocode_match_level,
                    geocode_provider,
                    geocoded_address,
                    geocode_updated_at
                """,
                [
                    result["latitude"],
                    result["longitude"],
                    status,
                    match_level,
                    result["provider"],
                    result.get("display_name") or None,
                    farm_id,
                    farmer_user_id,
                ],
            )

            row = cursor.fetchone()

            if row is None:
                raise ForecastingError(
                    "farm_not_found",
                    "Registered farm was not found.",
                    404,
                )

            columns = [
                item[0]
                for item in cursor.description
            ]

            return dict(zip(columns, row))


def _save_geocode_failure(
    farmer_user_id,
    farm_id,
):
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE farmer_farms
                SET
                    latitude = NULL,
                    longitude = NULL,
                    geocode_status = 'failed',
                    geocode_match_level = NULL,
                    geocode_provider = %s,
                    geocoded_address = NULL,
                    geocode_updated_at = CURRENT_TIMESTAMP
                WHERE farm_id = %s
                  AND user_id = %s
                  AND farm_status = 'active'
                RETURNING farm_id
                """,
                [
                    GEOCODE_PROVIDER,
                    farm_id,
                    farmer_user_id,
                ],
            )

            if cursor.fetchone() is None:
                raise ForecastingError(
                    "farm_not_found",
                    "Registered farm was not found.",
                    404,
                )


def resolve_registered_farm_coordinates(
    farmer_user_id,
    farm_id,
    *,
    force_refresh=False,
):
    farmer_id = _farmer_id(farmer_user_id)
    farm_id = _positive_id(farm_id, "farm ID")

    try:
        farm = get_farmer_forecast_farm(
            farmer_id,
            farm_id,
        )
    except ValueError as exc:
        raise ForecastingError(
            "validation_error",
            str(exc),
            400,
        ) from exc

    if farm is None:
        raise ForecastingError(
            "farm_not_found",
            "Registered farm was not found.",
            404,
        )

    if (
        not force_refresh
        and farm.get("latitude") is not None
        and farm.get("longitude") is not None
        and farm.get("geocode_status")
        in {GEOCODE_RESOLVED, GEOCODE_APPROXIMATE}
    ):
        return {
            "farm_id": farm["farm_id"],
            "farm_name": farm.get("farm_name"),
            "latitude": farm["latitude"],
            "longitude": farm["longitude"],
            "geocode_status": farm["geocode_status"],
            "geocode_match_level": farm.get(
                "geocode_match_level"
            ),
            "geocode_provider": farm.get(
                "geocode_provider"
            ),
            "geocoded_address": farm.get(
                "geocoded_address"
            ),
            "geocode_updated_at": farm.get(
                "geocode_updated_at"
            ),
            "from_cache": True,
        }

    candidates = _geocode_candidates(farm)

    if not candidates:
        _save_geocode_failure(farmer_id, farm_id)
        raise ForecastingError(
            "farm_address_unavailable",
            "The farm does not have enough address information.",
            422,
        )

    for match_level, query in candidates:
        result = _geocode(query)

        if result is None:
            continue

        saved = _save_geocode_success(
            farmer_id,
            farm_id,
            result,
            match_level,
        )
        saved["from_cache"] = False
        saved["query_used"] = query
        return saved

    _save_geocode_failure(farmer_id, farm_id)

    raise ForecastingError(
        "farm_geocoding_failed",
        (
            "The farm address could not be resolved. "
            "Use Search Location, Select on Map, or "
            "Current Location instead."
        ),
        422,
    )


# ============================================================
# NON-REGISTERED LOCATION NORMALIZATION
# ============================================================


def normalize_forecast_coordinates(
    latitude,
    longitude,
    *,
    location_label=None,
):
    return {
        "latitude": _coordinate(
            latitude,
            "latitude",
            -90,
            90,
        ),
        "longitude": _coordinate(
            longitude,
            "longitude",
            -180,
            180,
        ),
        "location_label": _text(location_label),
    }


# ============================================================
# CLIMATE CACHE REQUEST
# ============================================================


def build_climate_cache_request(
    *,
    provider_code,
    dataset_code,
    data_kind,
    latitude,
    longitude,
    requested_start_date,
    requested_end_date,
    granularity,
    variable_codes,
    forecast_issue_date=None,
):
    kind = _climate_kind(data_kind)
    variables, variable_key = _variables(variable_codes)
    start_date, end_date = _date_range(
        requested_start_date,
        requested_end_date,
    )

    issue_date = None

    if forecast_issue_date not in (None, ""):
        issue_date = _date(
            forecast_issue_date,
            "Forecast issue date",
        )

    if kind == "historical" and issue_date is not None:
        raise ForecastingError(
            "invalid_climate_request",
            "Historical data cannot have a forecast issue date.",
            400,
        )

    if kind == "forecast" and issue_date is None:
        raise ForecastingError(
            "invalid_climate_request",
            "Forecast issue date is required.",
            400,
        )

    return {
        "provider_code": _text(
            provider_code,
            required=True,
            field_name="Climate provider",
            max_length=50,
        ),
        "dataset_code": _text(
            dataset_code,
            required=True,
            field_name="Climate dataset",
            max_length=150,
        ),
        "data_kind": kind,
        "latitude": _coordinate(
            latitude,
            "latitude",
            -90,
            90,
        ),
        "longitude": _coordinate(
            longitude,
            "longitude",
            -180,
            180,
        ),
        "requested_start_date": start_date,
        "requested_end_date": end_date,
        "granularity": _granularity(granularity),
        "variable_codes": variables,
        "variable_set_key": variable_key,
        "forecast_issue_date": issue_date,
    }


def get_fresh_climate_cache_payload(**kwargs):
    request_data = build_climate_cache_request(**kwargs)

    try:
        fetch = get_fresh_climate_fetch(
            provider_code=request_data["provider_code"],
            dataset_code=request_data["dataset_code"],
            data_kind=request_data["data_kind"],
            latitude=request_data["latitude"],
            longitude=request_data["longitude"],
            requested_start_date=(
                request_data["requested_start_date"]
            ),
            requested_end_date=(
                request_data["requested_end_date"]
            ),
            granularity=request_data["granularity"],
            variable_set_key=(
                request_data["variable_set_key"]
            ),
            forecast_issue_date=(
                request_data["forecast_issue_date"]
            ),
        )
    except ValueError as exc:
        raise ForecastingError(
            "invalid_climate_request",
            str(exc),
            400,
        ) from exc

    if fetch is None:
        return {
            "cache_hit": False,
            "request": request_data,
        }

    try:
        points = get_climate_fetch_points(
            fetch["climate_fetch_id"]
        )
    except ValueError as exc:
        raise ForecastingError(
            "invalid_climate_cache",
            str(exc),
            500,
        ) from exc

    return {
        "cache_hit": True,
        "fetch": fetch,
        "points": points,
    }
