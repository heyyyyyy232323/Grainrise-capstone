import logging
import math
import os
import shutil
import tempfile
import threading

from datetime import (
    datetime,
    timezone,
)

import cdsapi
from django.core.cache import cache
import numpy as np
import xarray as xr


logger = logging.getLogger(
    "grainrise.announcements.climate"
)


# ============================================================
# COPERNICUS DATASET
# ============================================================

CDS_DATASET = (
    "seasonal-monthly-single-levels"
)


# ============================================================
# CDS SETTINGS
# ============================================================

DEFAULT_ORIGINATING_CENTRE = os.getenv(
    "GRAINRISE_CDS_ORIGINATING_CENTRE",
    "ecmwf",
)

DEFAULT_SYSTEM = os.getenv(
    "GRAINRISE_CDS_SYSTEM",
    "51",
)

# Minimum geographic span (in degrees) for CDS seasonal forecast bounding boxes.
# ECMWF System 51 runs on a 1.0-degree grid. Areas narrower than 1.0 degree can
# contain 0 grid points and trigger ECMWF MIR interpolation assertion failure:
# "MIR: Assertion failed: Area: non-empty area crop/mask (to at least one point)"
DEFAULT_MIN_CDS_SPAN = float(
    os.getenv(
        "GRAINRISE_CLIMATE_MIN_AREA_SPAN",
        "1.0",
    )
)


# ============================================================
# CLIMATE VARIABLES
# ============================================================

CDS_VARIABLES = [
    "2m_temperature",
    "total_precipitation",
    "10m_wind_speed",
]


# ============================================================
# FORECAST LEAD MONTHS
#
# IMPORTANT:
# Always request six months once.
#
# Frontend slices:
#   months[:1]
#   months[:3]
#   months[:6]
# ============================================================

LEAD_MONTHS = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
]


# ============================================================
# POSSIBLE XARRAY VARIABLE NAMES
# ============================================================

TEMPERATURE_VARIABLE_NAMES = [
    "t2m",
    "2t",
    "2m_temperature",
    "temperature",
]

PRECIPITATION_VARIABLE_NAMES = [
    "tp",
    "total_precipitation",
    "precipitation",
]

WIND_VARIABLE_NAMES = [
    "si10",
    "10si",
    "10m_wind_speed",
    "wind_speed",
]


# ============================================================
# EXCEPTIONS
# ============================================================

class ClimateServiceError(
    RuntimeError
):
    pass


class ClimateDataUnavailableError(
    ClimateServiceError
):
    pass


class ClimateInitializationDateUnavailableError(
    ClimateServiceError
):
    pass


class ClimateQueueLimitExceededError(
    ClimateServiceError
):
    """
    Raised when Copernicus Climate Data Store rejects a request because
    the queue limit has been reached and requests must be sequential.
    """
    pass


class InvalidClimateAreaError(
    ClimateServiceError
):
    pass


def _is_queue_limit_exceeded(
    exc,
):
    if exc is None:
        return False

    error_parts = [
        type(exc).__name__,
        str(exc),
        repr(exc),
    ]

    cause = getattr(exc, "__cause__", None) or getattr(exc, "__context__", None)
    if cause is not None:
        error_parts.extend([
            type(cause).__name__,
            str(cause),
            repr(cause),
        ])

    for arg in getattr(exc, "args", ()):
        error_parts.append(str(arg))

    full_text = " ".join(error_parts).lower()

    queue_markers = [
        "maximum number queued requests",
        "maximum number of queued requests",
        "request data sequentially",
        "queued requests for this dataset has been reached",
        "queued requests for this dataset",
        "queued requests",
        "queue limit",
        "too many requests",
        "429",
    ]

    return any(marker in full_text for marker in queue_markers)


def _is_initialization_date_unavailable(
    exc,
):
    if exc is None:
        return False

    # A queue limit or rate limiting error must NEVER be misclassified
    # as an unavailable initialization date, which would trigger futile fallback requests.
    if _is_queue_limit_exceeded(exc):
        return False

    error_parts = [
        type(exc).__name__,
        str(exc),
        repr(exc),
    ]

    cause = getattr(exc, "__cause__", None) or getattr(exc, "__context__", None)
    if cause is not None:
        error_parts.extend([
            type(cause).__name__,
            str(cause),
            repr(cause),
        ])

    for arg in getattr(exc, "args", ()):
        error_parts.append(str(arg))

    full_text = " ".join(error_parts).lower()

    non_date_infrastructure_markers = [
        "service unavailable",
        "gateway timeout",
        "bad gateway",
        "connection refused",
        "connection reset",
        "name resolution",
        "temporary failure in name resolution",
        "read timed out",
        "connect timed out",
    ]
    if any(marker in full_text for marker in non_date_infrastructure_markers):
        return False

    primary_markers = [
        "restricted access",
        "current c3s seasonal forecast",
        "ecmwf contribution",
        "date selection is valid",
        "date selection",
        "accesserror",
        "not yet available",
        "not yet published",
    ]

    if any(marker in full_text for marker in primary_markers):
        return True

    if ("unavailable" in full_text or "not available" in full_text or "restricted" in full_text):
        if any(term in full_text for term in ["date", "month", "year", "forecast", "period"]):
            return True

    return False


# ============================================================
# GENERIC HELPERS
# ============================================================

def _safe_float(
    value,
):
    try:
        value = float(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


    if not math.isfinite(
        value
    ):
        return None


    return value


def _round_or_none(
    value,
    digits=1,
):
    value = _safe_float(
        value
    )


    if value is None:
        return None


    return round(
        value,
        digits,
    )


def _current_utc():
    return datetime.now(
        timezone.utc
    )


# ============================================================
# FORECAST REFERENCE MONTH
# ============================================================

def _forecast_reference_date():
    now = _current_utc()


    return {
        "year":
            str(
                now.year
            ),

        "month":
            f"{now.month:02d}",
    }


# ============================================================
# DATE HELPERS
# ============================================================

def _add_months(
    year,
    month,
    offset,
):
    base_index = (
        int(year) * 12
        + int(month)
        - 1
        + int(offset)
    )


    result_year = (
        base_index // 12
    )


    result_month = (
        base_index % 12
        + 1
    )


    return (
        result_year,
        result_month,
    )


def _month_label(
    year,
    month,
):
    return datetime(
        int(year),
        int(month),
        1,
    ).strftime(
        "%B %Y"
    )


# ============================================================
# AREA VALIDATION
#
# CDS order:
# [
#   north,
#   west,
#   south,
#   east
# ]
# ============================================================

def normalize_cds_area(
    area,
    *,
    min_span=DEFAULT_MIN_CDS_SPAN,
):
    if not isinstance(
        area,
        (
            list,
            tuple,
            dict,
        ),
    ):
        raise InvalidClimateAreaError(
            "Climate forecast area is required."
        )

    if isinstance(area, dict):
        try:
            raw_north = area["north"]
            raw_west = area["west"]
            raw_south = area["south"]
            raw_east = area["east"]
        except KeyError as exc:
            raise InvalidClimateAreaError(
                f"Climate forecast area dict missing key: {exc}"
            ) from exc
    else:
        if len(area) != 4:
            raise InvalidClimateAreaError(
                (
                    "Climate forecast area must contain "
                    "north, west, south, and east coordinates."
                )
            )
        raw_north = area[0]
        raw_west = area[1]
        raw_south = area[2]
        raw_east = area[3]

    try:
        north = float(raw_north)
        west = float(raw_west)
        south = float(raw_south)
        east = float(raw_east)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise InvalidClimateAreaError(
            "Climate forecast coordinates are invalid."
        ) from exc

    # Ensure orientation: north >= south, east >= west
    if north < south:
        north, south = south, north
    if east < west:
        east, west = west, east

    if not (
        -90.0 <= south <= 90.0
        and -90.0 <= north <= 90.0
        and -180.0 <= west <= 180.0
        and -180.0 <= east <= 180.0
    ):
        raise InvalidClimateAreaError(
            "Climate forecast coordinates are outside valid limits."
        )

    # Preserve center coordinates
    center_lat = (north + south) / 2.0
    center_lon = (east + west) / 2.0

    current_lat_span = north - south
    current_lon_span = east - west

    # Expand to safe minimum geographic span if narrower than dataset grid
    target_min_span = max(0.0, float(min_span or 0.0))

    if current_lat_span < target_min_span:
        half_lat = target_min_span / 2.0
        north = center_lat + half_lat
        south = center_lat - half_lat

    if current_lon_span < target_min_span:
        half_lon = target_min_span / 2.0
        east = center_lon + half_lon
        west = center_lon - half_lon

    # Clamp to geographic boundaries while preserving expanded span where possible
    if north > 90.0:
        excess = north - 90.0
        north = 90.0
        south = max(-90.0, south - excess)
    elif south < -90.0:
        excess = -90.0 - south
        south = -90.0
        north = min(90.0, north + excess)

    if east > 180.0:
        excess = east - 180.0
        east = 180.0
        west = max(-180.0, west - excess)
    elif west < -180.0:
        excess = -180.0 - west
        west = -180.0
        east = min(180.0, east + excess)

    # Format as clean Python floats rounded to 6 decimal places
    final_north = round(float(north), 6)
    final_west = round(float(west), 6)
    final_south = round(float(south), 6)
    final_east = round(float(east), 6)

    if final_north <= final_south:
        raise InvalidClimateAreaError(
            "North coordinate must be greater than south."
        )

    if final_east <= final_west:
        raise InvalidClimateAreaError(
            "East coordinate must be greater than west."
        )

    return [
        final_north,
        final_west,
        final_south,
        final_east,
    ]


# ============================================================
# VARIABLE RESOLUTION
# ============================================================

def _find_variable(
    dataset,
    candidates,
):
    for name in candidates:

        if name in dataset.data_vars:
            return dataset[
                name
            ]


    normalized = {
        str(name).lower():
            name
        for name
        in dataset.data_vars
    }


    for candidate in candidates:

        actual_name = normalized.get(
            str(candidate).lower()
        )


        if actual_name:
            return dataset[
                actual_name
            ]


    return None


# ============================================================
# FORECAST DIMENSION
# ============================================================

def _forecast_dimension(
    data_array,
):
    if data_array is None:
        return None


    preferred = [
        "forecastMonth",
        "forecast_month",
        "leadtime_month",
        "leadtime",
        "step",
        "time",
        "valid_time",
    ]


    for dimension in preferred:

        if dimension in data_array.dims:
            return dimension


    return None


def _select_lead_month(
    data_array,
    index,
):
    if data_array is None:
        return None


    dimension = _forecast_dimension(
        data_array
    )


    if not dimension:
        return data_array


    size = data_array.sizes.get(
        dimension,
        1,
    )


    if size <= 1:
        return data_array


    safe_index = min(
        index,
        size - 1,
    )


    return data_array.isel(
        {
            dimension:
                safe_index
        }
    )


# ============================================================
# DATA REDUCTION
#
# Ensemble members + latitude + longitude are averaged.
#
# No .load() is used.
# ============================================================

def _mean_data_array(
    data_array,
):
    if data_array is None:
        return None


    try:

        result = (
            data_array
            .mean(
                skipna=True
            )
            .values
        )


        result = np.asarray(
            result
        ).squeeze()


        return _safe_float(
            result
        )


    except Exception:

        logger.exception(
            (
                "Unable to calculate mean "
                "for climate variable."
            )
        )

        return None


# ============================================================
# UNIT CONVERSION
# ============================================================

def _temperature_to_celsius(
    value,
):
    value = _safe_float(
        value
    )


    if value is None:
        return None


    # Usually Kelvin from CDS.
    if value > 100:
        return (
            value - 273.15
        )


    return value


def _precipitation_to_mm(
    value,
):
    value = _safe_float(
        value
    )


    if value is None:
        return None


    # CDS total precipitation is normally metres.
    if abs(value) < 20:
        return (
            value * 1000.0
        )


    return value


def _wind_to_kmh(
    value,
):
    value = _safe_float(
        value
    )


    if value is None:
        return None


    # CDS wind speed normally m/s.
    return (
        value * 3.6
    )


# ============================================================
# CDS CLIENT
# ============================================================

def _create_cds_client():
    url = os.getenv("CDSAPI_URL") or os.getenv("CDS_API_URL")
    key = os.getenv("CDSAPI_KEY") or os.getenv("CDS_API_KEY")

    if not url or not key:
        rc_path = os.path.expanduser("~/.cdsapirc")
        if not os.path.exists(rc_path):
            raise ClimateServiceError(
                "Copernicus Climate Data Store (CDS) API is not configured. "
                "Please configure CDS_API_URL and CDS_API_KEY in your environment."
            )

    try:
        if url and key:
            return cdsapi.Client(url=url, key=key)
        return cdsapi.Client()

    except Exception as exc:
        raise ClimateServiceError(
            (
                "Unable to initialize the "
                "Copernicus Climate Data Store client."
            )
        ) from exc


# ============================================================
# CDS REQUEST
# ============================================================

def build_six_month_request(
    *,
    area,
    year=None,
    month=None,
):
    reference = (
        _forecast_reference_date()
    )


    selected_year = str(
        year
        or reference["year"]
    )


    selected_month = str(
        month
        or reference["month"]
    ).zfill(2)


    selected_area = (
        normalize_cds_area(
            area
        )
    )

    logger.info(
        (
            f"CDS request payload area configured: "
            f"[North={selected_area[0]}, West={selected_area[1]}, South={selected_area[2]}, East={selected_area[3]}]"
        )
    )

    return {
        "originating_centre":
            DEFAULT_ORIGINATING_CENTRE,

        "system":
            DEFAULT_SYSTEM,

        "variable":
            CDS_VARIABLES,

        "product_type":
            "monthly_mean",

        "year":
            selected_year,

        "month":
            selected_month,

        "leadtime_month":
            LEAD_MONTHS,

        "area":
            selected_area,

        "data_format":
            "netcdf",
    }


# ============================================================
# CDS DOWNLOAD
#
# Copernicus imposes strict concurrency/queue limits per account
# on seasonal datasets: "Maximum number queued requests for this
# dataset has been reached. Please configure your scripts to
# request data sequentially."
#
# We enforce process-level serialization via _CDS_RETRIEVAL_LOCK.
# ============================================================

_CDS_RETRIEVAL_LOCK = threading.Lock()


def _download_forecast(
    *,
    request_payload,
    target_path,
):
    client = (
        _create_cds_client()
    )

    req_year = request_payload.get("year")
    req_month = request_payload.get("month")
    req_area = request_payload.get("area")

    logger.info(
        (
            f"Requesting six-month GrainRise climate forecast from CDS "
            f"for initialization date {req_year}-{req_month} with final area: {req_area}."
        )
    )

    try:
        with _CDS_RETRIEVAL_LOCK:
            logger.info(
                f"Acquired CDS retrieval lock for initialization date {req_year}-{req_month}."
            )
            result = client.retrieve(
                CDS_DATASET,
                request_payload,
            )

            result.download(
                target_path
            )

    except Exception as exc:

        if _is_queue_limit_exceeded(exc):
            logger.warning(
                (
                    f"Copernicus CDS rejected request for {req_year}-{req_month} "
                    f"due to dataset queue limit: {exc}. Halting immediately without retrying fallback dates."
                )
            )

            raise ClimateQueueLimitExceededError(
                (
                    "The Copernicus Climate Data Store queue is temporarily busy processing other requests. "
                    "Please wait a moment and click Retry."
                )
            ) from exc

        if _is_initialization_date_unavailable(exc):
            logger.warning(
                (
                    f"Copernicus CDS rejected initialization date "
                    f"{req_year}-{req_month} as restricted or unavailable: {exc}"
                )
            )

            raise ClimateInitializationDateUnavailableError(
                (
                    f"CDS seasonal forecast initialization date "
                    f"{req_year}-{req_month} is restricted or unavailable."
                )
            ) from exc

        logger.exception(
            "Copernicus climate retrieval failed."
        )

        raise ClimateDataUnavailableError(
            (
                "Climate forecast could not be retrieved "
                "from Copernicus Climate Data Store."
            )
        ) from exc


# ============================================================
# OPEN NETCDF
# ============================================================

def _open_dataset(
    file_path,
):
    try:

        return xr.open_dataset(
            file_path,
            decode_times=True,
            cache=False,
        )


    except Exception as exc:

        logger.exception(
            (
                "Unable to open downloaded "
                "Copernicus dataset."
            )
        )


        raise ClimateServiceError(
            (
                "Downloaded climate data "
                "could not be processed."
            )
        ) from exc


# ============================================================
# EXTRACT SIX MONTHS
# ============================================================

def _extract_months(
    dataset,
    *,
    initialization_year,
    initialization_month,
):
    temperature = (
        _find_variable(
            dataset,
            TEMPERATURE_VARIABLE_NAMES,
        )
    )


    precipitation = (
        _find_variable(
            dataset,
            PRECIPITATION_VARIABLE_NAMES,
        )
    )


    wind = (
        _find_variable(
            dataset,
            WIND_VARIABLE_NAMES,
        )
    )


    if (
        temperature is None
        and precipitation is None
        and wind is None
    ):
        raise ClimateServiceError(
            (
                "The downloaded climate dataset "
                "contains no supported variables."
            )
        )


    months = []


    for index in range(6):

        temperature_slice = (
            _select_lead_month(
                temperature,
                index,
            )
        )


        precipitation_slice = (
            _select_lead_month(
                precipitation,
                index,
            )
        )


        wind_slice = (
            _select_lead_month(
                wind,
                index,
            )
        )


        temperature_value = (
            _temperature_to_celsius(
                _mean_data_array(
                    temperature_slice
                )
            )
        )


        precipitation_value = (
            _precipitation_to_mm(
                _mean_data_array(
                    precipitation_slice
                )
            )
        )


        wind_value = (
            _wind_to_kmh(
                _mean_data_array(
                    wind_slice
                )
            )
        )


        forecast_year, forecast_month = (
            _add_months(
                initialization_year,
                initialization_month,
                index,
            )
        )


        months.append(
            {
                "lead_month":
                    index + 1,

                "year":
                    forecast_year,

                "month_number":
                    forecast_month,

                "month":
                    _month_label(
                        forecast_year,
                        forecast_month,
                    ),

                "average_temperature_c":
                    _round_or_none(
                        temperature_value,
                        1,
                    ),

                "total_precipitation_mm":
                    _round_or_none(
                        precipitation_value,
                        1,
                    ),

                "average_wind_speed_kmh":
                    _round_or_none(
                        wind_value,
                        1,
                    ),
            }
        )


    return months


# ============================================================
# SUMMARY
# ============================================================

def _calculate_summary(
    months,
):
    temperatures = [
        item[
            "average_temperature_c"
        ]
        for item in months
        if item.get(
            "average_temperature_c"
        ) is not None
    ]


    rainfall = [
        item[
            "total_precipitation_mm"
        ]
        for item in months
        if item.get(
            "total_precipitation_mm"
        ) is not None
    ]


    winds = [
        item[
            "average_wind_speed_kmh"
        ]
        for item in months
        if item.get(
            "average_wind_speed_kmh"
        ) is not None
    ]


    average_temperature = (
        sum(
            temperatures
        )
        / len(
            temperatures
        )
        if temperatures
        else None
    )


    total_rainfall = (
        sum(
            rainfall
        )
        if rainfall
        else None
    )


    average_wind = (
        sum(
            winds
        )
        / len(
            winds
        )
        if winds
        else None
    )


    return {
        "average_temperature_c":
            _round_or_none(
                average_temperature,
                1,
            ),

        "total_precipitation_mm":
            _round_or_none(
                total_rainfall,
                1,
            ),

        "average_wind_speed_kmh":
            _round_or_none(
                average_wind,
                1,
            ),
    }


# ============================================================
# PUBLIC SERVICE
# ============================================================

def fetch_location_six_month_forecast(
    *,
    location,
    area,
    year=None,
    month=None,
):
    """
    Retrieve a six-month climate forecast for any resolved
    GrainRise location.

    Required:

        location = {
            "country": "...",
            "province": "...",
            "city": "...",
            "display_name": "..."
        }

        area = [
            north,
            west,
            south,
            east
        ]

    IMPORTANT:

    This function does NOT geocode a city.

    climate_selectors.py is responsible for turning the
    Admin's Country > Province > City selection into a
    small CDS bounding box.

    This service only retrieves and processes climate data.
    """


    if not isinstance(
        location,
        dict,
    ):
        raise ClimateServiceError(
            "Climate forecast location is required."
        )


    display_name = str(
        location.get(
            "display_name"
        )
        or ""
    ).strip()


    if not display_name:
        raise ClimateServiceError(
            "Climate forecast location name is required."
        )


    normalized_area = (
        normalize_cds_area(
            area
        )
    )

    reference = (
        _forecast_reference_date()
    )

    nominal_year = int(
        str(year or reference["year"]).strip()
    )

    nominal_month = int(
        str(month or reference["month"]).strip()
    )

    now = _current_utc()
    cached_working_date = cache.get("grainrise:climate:latest_working_date")

    # Copernicus seasonal forecasts publish around the 13th of each month.
    # Before day 13, the nominal current month is guaranteed not to exist yet on CDS.
    if now.day < 13:
        candidate_offsets = [-1, 0, -2]
    else:
        candidate_offsets = [0, -1, -2]

    raw_candidates = [
        _add_months(nominal_year, nominal_month, offset)
        for offset in candidate_offsets
    ]

    # Filter out dates known to be unavailable for this period
    candidate_dates = [
        d for d in raw_candidates
        if not cache.get(f"grainrise:climate:unavailable:{d[0]}_{d[1]}")
    ]
    if not candidate_dates:
        candidate_dates = raw_candidates

    # If the latest working date is among candidates, try it first to eliminate retries
    if cached_working_date and cached_working_date in candidate_dates:
        candidate_dates.remove(cached_working_date)
        candidate_dates.insert(0, cached_working_date)

    max_attempts = len(candidate_dates)

    temp_directory = (
        tempfile.mkdtemp(
            prefix=
                "grainrise_climate_"
        )
    )

    target_path = os.path.join(
        temp_directory,
        "forecast.nc",
    )

    dataset = None
    successful_year = None
    successful_month = None
    months = None
    summary = None
    last_unavailable_error = None

    try:

        for attempt_index, (cand_year, cand_month) in enumerate(candidate_dates, start=1):
            cand_date_str = f"{cand_year:04d}-{cand_month:02d}-01"

            logger.info(
                (
                    f"Attempting Copernicus climate forecast initialization date "
                    f"{cand_date_str} (attempt {attempt_index} of {max_attempts}) "
                    f"for area {normalized_area}."
                )
            )

            request_payload = (
                build_six_month_request(
                    area=normalized_area,
                    year=cand_year,
                    month=cand_month,
                )
            )

            if os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except OSError:
                    pass

            try:
                _download_forecast(
                    request_payload=request_payload,
                    target_path=target_path,
                )

                dataset = (
                    _open_dataset(
                        target_path
                    )
                )

                months = (
                    _extract_months(
                        dataset,
                        initialization_year=cand_year,
                        initialization_month=cand_month,
                    )
                )

                summary = (
                    _calculate_summary(
                        months
                    )
                )

                successful_year = cand_year
                successful_month = cand_month

                # Cache working date for future fast retrievals
                cache.set("grainrise:climate:latest_working_date", (successful_year, successful_month), timeout=86400)

                logger.info(
                    (
                        f"Successfully retrieved and processed Copernicus climate forecast "
                        f"using initialization date {cand_date_str} "
                        f"(attempt {attempt_index} of {max_attempts})."
                    )
                )
                break

            except ClimateQueueLimitExceededError as exc:
                logger.warning(
                    (
                        f"CDS queue limit reached on initialization date {cand_date_str}. "
                        f"Immediately halting all fallback attempts."
                    )
                )
                raise exc

            except ClimateInitializationDateUnavailableError as exc:
                last_unavailable_error = exc
                cache.set(f"grainrise:climate:unavailable:{cand_year}_{cand_month}", True, timeout=86400)

                if dataset is not None:
                    try:
                        dataset.close()
                    except Exception:
                        pass
                    dataset = None

                if attempt_index < max_attempts:
                    next_year, next_month = candidate_dates[attempt_index]
                    next_date_str = f"{next_year:04d}-{next_month:02d}-01"
                    logger.warning(
                        (
                            f"CDS initialization date {cand_date_str} is unavailable or restricted. "
                            f"Retrying with previous month {next_date_str} "
                            f"(attempt {attempt_index + 1} of {max_attempts})..."
                        )
                    )
                else:
                    logger.error(
                        (
                            f"CDS initialization date {cand_date_str} is unavailable or restricted, "
                            f"and maximum fallback limit ({max_attempts - 1} previous months) has been reached."
                        )
                    )

        if successful_year is None or months is None:
            raise ClimateDataUnavailableError(
                (
                    f"Climate forecast could not be retrieved from Copernicus Climate Data Store. "
                    f"The nominal initialization date ({candidate_dates[0][0]:04d}-{candidate_dates[0][1]:02d}-01) "
                    f"and {max_attempts - 1} previous months were unavailable or restricted."
                )
            ) from last_unavailable_error

        first_month = (
            months[0]["month"]
            if months
            else None
        )

        last_month = (
            months[-1]["month"]
            if months
            else None
        )

        return {
            "location": {
                "country":
                    location.get(
                        "country"
                    ),

                "country_code":
                    location.get(
                        "country_code"
                    ),

                "province":
                    location.get(
                        "province"
                    ),

                "province_code":
                    location.get(
                        "province_code"
                    ),

                "city":
                    location.get(
                        "city"
                    ),

                "city_code":
                    location.get(
                        "city_code"
                    ),

                "display_name":
                    display_name,
            },

            "source":
                (
                    "Copernicus Climate "
                    "Data Store"
                ),

            "dataset":
                CDS_DATASET,

            "forecast_area": {
                "north":
                    normalized_area[0],

                "west":
                    normalized_area[1],

                "south":
                    normalized_area[2],

                "east":
                    normalized_area[3],
            },

            "initialization": {
                "year":
                    successful_year,

                "month":
                    successful_month,

                "date":
                    f"{successful_year:04d}-{successful_month:02d}-01",
            },

            "forecast_period": {
                "from":
                    first_month,

                "to":
                    last_month,
            },

            "forecast_period_label":
                (
                    f"{first_month} - {last_month}"
                    if first_month
                    and last_month
                    else None
                ),

            "available_ranges": [
                1,
                3,
                6,
            ],

            "summary":
                summary,

            "months":
                months,

            "generated_at":
                (
                    _current_utc()
                    .isoformat()
                ),
        }


    except ClimateServiceError:
        raise


    except Exception as exc:

        logger.exception(
            (
                "Unexpected climate forecast "
                "processing error."
            )
        )


        raise ClimateServiceError(
            (
                "Unable to process "
                "the climate forecast."
            )
        ) from exc


    finally:

        if dataset is not None:

            try:
                dataset.close()

            except Exception:

                logger.exception(
                    (
                        "Unable to close "
                        "temporary climate dataset."
                    )
                )


        try:

            shutil.rmtree(
                temp_directory,
                ignore_errors=True,
            )

        except Exception:

            logger.exception(
                (
                    "Unable to delete temporary "
                    "climate forecast files."
                )
            )