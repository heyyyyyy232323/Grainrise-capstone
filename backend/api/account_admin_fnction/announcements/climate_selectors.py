import json
import logging
import os

from urllib.parse import (
    urlencode,
)

from urllib.request import (
    Request,
    urlopen,
)

from django.core.cache import cache

from .climate_service import (
    InvalidClimateAreaError,
    normalize_cds_area,
)


logger = logging.getLogger(
    "grainrise.announcements.climate.location"
)


# ============================================================
# GEOCODING CONFIG
# ============================================================

GEOCODER_BASE_URL = os.getenv(
    "GRAINRISE_GEOCODER_URL",
    "https://nominatim.openstreetmap.org/search",
)


GEOCODER_USER_AGENT = os.getenv(
    "GRAINRISE_GEOCODER_USER_AGENT",
    "GrainRise-Capstone/1.0",
)


GEOCODER_TIMEOUT_SECONDS = int(
    os.getenv(
        "GRAINRISE_GEOCODER_TIMEOUT",
        "12",
    )
)


# ============================================================
# CACHE
#
# Geocoding results do not need to be requested repeatedly.
#
# 30 days is appropriate because city coordinates/bounds rarely
# change and this reduces external API calls on Render.
# ============================================================

LOCATION_CACHE_SECONDS = int(
    os.getenv(
        "GRAINRISE_LOCATION_CACHE_SECONDS",
        str(60 * 60 * 24 * 30),
    )
)


# ============================================================
# FORECAST BOX SETTINGS
#
# We intentionally DO NOT request a whole province.
#
# Seasonal forecasts are relatively coarse, so an extremely
# tiny city box is also unnecessary.
#
# Default half-span 0.25 degrees:
#
# center latitude +/- 0.25
# center longitude +/- 0.25
#
# This produces a compact ~0.5 x 0.5 degree box.
# ============================================================

DEFAULT_HALF_SPAN = float(
    os.getenv(
        "GRAINRISE_CLIMATE_HALF_SPAN",
        "0.25",
    )
)


MIN_HALF_SPAN = 0.10
MAX_HALF_SPAN = 0.50


# ============================================================
# EXCEPTIONS
# ============================================================

class ClimateLocationError(
    RuntimeError
):
    pass


class ClimateLocationNotFoundError(
    ClimateLocationError
):
    pass


# ============================================================
# STRING HELPERS
# ============================================================

def _clean_text(
    value,
):
    return str(
        value or ""
    ).strip()


def _normalize_key_part(
    value,
):
    return (
        _clean_text(
            value
        )
        .lower()
        .replace(
            " ",
            "_",
        )
        .replace(
            "/",
            "_",
        )
    )


# ============================================================
# LOCATION VALIDATION
# ============================================================

def normalize_location(
    location,
):
    """
    Expected input from ClimateForecastModal:

    {
        "country": "Philippines",
        "country_code": "PH",

        "province": "Bulacan",
        "province_code": "...",

        "city": "City of Malolos",
        "city_code": "...",

        "display_name":
            "City of Malolos, Bulacan, Philippines"
    }
    """

    if not isinstance(
        location,
        dict,
    ):
        raise ClimateLocationError(
            "Forecast location is required."
        )


    country = _clean_text(
        location.get(
            "country"
        )
    )


    country_code = (
        _clean_text(
            location.get(
                "country_code"
            )
        )
        .upper()
    )


    province = _clean_text(
        location.get(
            "province"
        )
    )


    province_code = _clean_text(
        location.get(
            "province_code"
        )
    )


    city = _clean_text(
        location.get(
            "city"
        )
    )


    city_code = _clean_text(
        location.get(
            "city_code"
        )
    )


    if not country:
        country = (
            "Philippines"
        )


    if not country_code:
        country_code = (
            "PH"
        )


    # Current GrainRise location hook is Philippine PSGC based.
    if (
        country_code != "PH"
        and country.lower()
        != "philippines"
    ):
        raise ClimateLocationError(
            (
                "The current GrainRise forecast "
                "location selector supports "
                "Philippine locations only."
            )
        )


    if not province:
        raise ClimateLocationError(
            "Province is required."
        )


    if not city:
        raise ClimateLocationError(
            "City or municipality is required."
        )


    display_name = _clean_text(
        location.get(
            "display_name"
        )
    )


    if not display_name:
        display_name = (
            f"{city}, "
            f"{province}, "
            f"{country}"
        )


    return {
        "country":
            country,

        "country_code":
            country_code,

        "province":
            province,

        "province_code":
            province_code,

        "city":
            city,

        "city_code":
            city_code,

        "display_name":
            display_name,
    }


# ============================================================
# CACHE KEY
# ============================================================

def _location_cache_key(
    location,
):
    city_code = _normalize_key_part(
        location.get(
            "city_code"
        )
    )


    province_code = _normalize_key_part(
        location.get(
            "province_code"
        )
    )


    if city_code:
        identifier = (
            city_code
        )

    else:
        identifier = (
            f"{_normalize_key_part(location['city'])}"
            f"_"
            f"{_normalize_key_part(location['province'])}"
        )


    return (
        "grainrise:"
        "climate_location:"
        f"{province_code}:"
        f"{identifier}"
    )


# ============================================================
# GEOCODER QUERY
# ============================================================

def _build_geocoder_query(
    location,
):
    return (
        f"{location['city']}, "
        f"{location['province']}, "
        f"{location['country']}"
    )


# ============================================================
# GEOCODER REQUEST
# ============================================================

def _request_geocoder(
    location,
):
    query = (
        _build_geocoder_query(
            location
        )
    )


    params = urlencode(
        {
            "q":
                query,

            "format":
                "jsonv2",

            "limit":
                "1",

            "countrycodes":
                "ph",

            "addressdetails":
                "1",
        }
    )


    url = (
        f"{GEOCODER_BASE_URL}"
        f"?{params}"
    )


    request = Request(
        url,
        headers={
            "User-Agent":
                GEOCODER_USER_AGENT,

            "Accept":
                "application/json",
        },
    )


    try:

        with urlopen(
            request,
            timeout=
                GEOCODER_TIMEOUT_SECONDS,
        ) as response:

            raw = response.read(
                64 * 1024
            )


    except Exception as exc:

        logger.exception(
            (
                "Unable to resolve climate "
                "forecast location."
            )
        )


        raise ClimateLocationError(
            (
                "Unable to resolve the selected "
                "location for climate forecasting."
            )
        ) from exc


    try:

        payload = json.loads(
            raw.decode(
                "utf-8"
            )
        )


    except (
        json.JSONDecodeError,
        UnicodeDecodeError,
    ) as exc:

        raise ClimateLocationError(
            (
                "The location service returned "
                "an invalid response."
            )
        ) from exc


    if (
        not isinstance(
            payload,
            list,
        )
        or not payload
    ):
        raise ClimateLocationNotFoundError(
            (
                "The selected city or municipality "
                "could not be located."
            )
        )


    result = payload[0]


    return result


# ============================================================
# COORDINATES
# ============================================================

def _extract_coordinates(
    geocoder_result,
):
    try:

        latitude = float(
            geocoder_result[
                "lat"
            ]
        )


        longitude = float(
            geocoder_result[
                "lon"
            ]
        )


    except (
        KeyError,
        TypeError,
        ValueError,
    ) as exc:

        raise ClimateLocationError(
            (
                "Coordinates for the selected "
                "location are unavailable."
            )
        ) from exc


    if not (
        -90 <= latitude <= 90
    ):
        raise ClimateLocationError(
            "Invalid location latitude."
        )


    if not (
        -180 <= longitude <= 180
    ):
        raise ClimateLocationError(
            "Invalid location longitude."
        )


    return (
        latitude,
        longitude,
    )


# ============================================================
# COMPACT CDS AREA
# ============================================================

def _build_compact_area(
    *,
    latitude,
    longitude,
):
    half_span = max(
        MIN_HALF_SPAN,
        min(
            DEFAULT_HALF_SPAN,
            MAX_HALF_SPAN,
        ),
    )


    north = min(
        90.0,
        latitude + half_span,
    )


    south = max(
        -90.0,
        latitude - half_span,
    )


    west = max(
        -180.0,
        longitude - half_span,
    )


    east = min(
        180.0,
        longitude + half_span,
    )


    try:

        return normalize_cds_area(
            [
                north,
                west,
                south,
                east,
            ]
        )


    except InvalidClimateAreaError as exc:

        raise ClimateLocationError(
            (
                "Unable to build a valid climate "
                "forecast area for this location."
            )
        ) from exc


# ============================================================
# SERIALIZABLE RESULT
# ============================================================

def _build_resolved_location(
    *,
    location,
    latitude,
    longitude,
    area,
):
    return {
        "location": {
            **location,

            "latitude":
                round(
                    latitude,
                    6,
                ),

            "longitude":
                round(
                    longitude,
                    6,
                ),
        },

        "coordinates": {
            "latitude":
                round(
                    latitude,
                    6,
                ),

            "longitude":
                round(
                    longitude,
                    6,
                ),
        },

        "area": [
            round(
                float(value),
                6,
            )
            for value in area
        ],
    }


# ============================================================
# PUBLIC SELECTOR
# ============================================================

def resolve_forecast_location(
    location,
):
    """
    Convert the Admin's PSGC location selection into:

        location metadata
        latitude
        longitude
        compact CDS bounding box

    This function is intentionally lightweight.

    It:
        - does NOT call CDS
        - does NOT open xarray
        - does NOT download climate files
        - does NOT use pandas

    It may call the geocoder once.

    The resolved result is cached so repeated forecast requests
    for the same city do not repeatedly hit the geocoding
    service.
    """

    normalized_location = (
        normalize_location(
            location
        )
    )


    cache_key = (
        _location_cache_key(
            normalized_location
        )
    )


    cached = cache.get(
        cache_key
    )


    if isinstance(
        cached,
        dict,
    ):

        cached_area = (
            cached.get(
                "area"
            )
        )


        cached_location = (
            cached.get(
                "location"
            )
        )


        if (
            cached_area
            and cached_location
        ):
            return cached


    geocoder_result = (
        _request_geocoder(
            normalized_location
        )
    )


    latitude, longitude = (
        _extract_coordinates(
            geocoder_result
        )
    )


    area = (
        _build_compact_area(
            latitude=
                latitude,

            longitude=
                longitude,
        )
    )


    resolved = (
        _build_resolved_location(
            location=
                normalized_location,

            latitude=
                latitude,

            longitude=
                longitude,

            area=
                area,
        )
    )


    try:

        cache.set(
            cache_key,
            resolved,
            timeout=
                LOCATION_CACHE_SECONDS,
        )


    except Exception:

        # Cache failure must never prevent forecasting.
        logger.warning(
            (
                "Unable to cache resolved "
                "forecast location."
            ),
            exc_info=True,
        )


    return resolved


# ============================================================
# FORECAST CACHE KEY
# ============================================================

def build_forecast_cache_key(
    *,
    location,
    initialization_year,
    initialization_month,
):
    """
    Used later by admin_views / forecast orchestration.

    Example:

    grainrise:climate_forecast:
        031410000:
        2026:
        10
    """

    normalized = (
        normalize_location(
            location
        )
    )


    location_identifier = (
        normalized.get(
            "city_code"
        )
        or (
            f"{normalized['city']}-"
            f"{normalized['province']}"
        )
    )


    location_identifier = (
        _normalize_key_part(
            location_identifier
        )
    )


    return (
        "grainrise:"
        "climate_forecast:"
        f"{location_identifier}:"
        f"{int(initialization_year)}:"
        f"{int(initialization_month):02d}"
    )