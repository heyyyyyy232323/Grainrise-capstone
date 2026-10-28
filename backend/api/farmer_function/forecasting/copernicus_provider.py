import os
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path


# ============================================================
# GRAINRISE
# FARMER FORECASTING
# COPERNICUS / CDS PROVIDER
# ============================================================
#
# PURPOSE:
#
# Isolates all Climate Data Store communication from the main
# Forecasting service layer.
#
# This module ONLY:
# - validates provider input
# - builds CDS requests
# - downloads raw NetCDF/ZIP artifacts
# - returns safe request metadata
#
# This module DOES NOT:
# - parse NetCDF
# - aggregate weekly/monthly values
# - convert units
# - save PostgreSQL climate_data_points
# - calculate climate risks
# - generate AI recommendations
#
# Raw climate data is normalized by a separate layer later.
# ============================================================


CDS_PROVIDER_CODE = "copernicus_cds"
CDS_API_URL_DEFAULT = "https://cds.climate.copernicus.eu/api"

# Optimized single-point ERA5-Land time-series product.
HISTORICAL_DATASET_DEFAULT = "reanalysis-era5-land-timeseries"

# C3S monthly seasonal forecasts on surface/single levels.
SEASONAL_DATASET_DEFAULT = "seasonal-monthly-single-levels"

# ECMWF SEAS5.1 / System 51 is configurable through .env so
# GrainRise is not permanently tied to one seasonal system.
SEASONAL_CENTRE_DEFAULT = "ecmwf"
SEASONAL_SYSTEM_DEFAULT = "51"
SEASONAL_PRODUCT_TYPE_DEFAULT = "monthly_mean"

NETCDF_FORMAT = "netcdf"

# Current GrainRise scope is six months.
SEASONAL_LEAD_MONTHS = ("1", "2", "3", "4", "5", "6")

# Seasonal data are on a much coarser grid than ERA5-Land.
# A small bounding box is used and the future normalizer will
# select the grid point nearest the requested Farmer location.
SEASONAL_POINT_HALF_SPAN_DEGREES = Decimal("0.60")

# ------------------------------------------------------------
# ERA5-Land historical grid.
#
# The historical time-series product snaps a requested point to
# the nearest 0.1 degree ERA5-Land grid cell. ERA5-Land only has
# data over land, so a requested point near a coastline or small
# island can snap to a masked (water) cell, in which case every
# variable comes back all-missing.
#
# Any retry has to move by a whole grid step (0.1 degrees) —
# nudging by less than that snaps back to the exact same cell.
# ------------------------------------------------------------

HISTORICAL_GRID_SPACING_DEGREES = Decimal("0.1")

# Full-grid-step offsets to retry with, spiraling outward from
# the exact requested point: (latitude_offset, longitude_offset).
HISTORICAL_LAND_NUDGE_OFFSETS_DEGREES = (
    (Decimal("0.0"), Decimal("0.0")),
    (Decimal("0.1"), Decimal("0.0")),
    (Decimal("-0.1"), Decimal("0.0")),
    (Decimal("0.0"), Decimal("0.1")),
    (Decimal("0.0"), Decimal("-0.1")),
    (Decimal("0.1"), Decimal("0.1")),
    (Decimal("0.1"), Decimal("-0.1")),
    (Decimal("-0.1"), Decimal("0.1")),
    (Decimal("-0.1"), Decimal("-0.1")),
)


# ============================================================
# GRAINRISE NORMALIZED VARIABLE -> CDS VARIABLE
# ============================================================
#
# The database uses stable GrainRise names, while Copernicus
# uses dataset-specific variable names.
#
# GRAINRISE SCOPE:
# Copernicus is used here only for weather/climate variables.
# We do NOT expose soil moisture, fertility, pH, nutrients, or
# "soil health" as direct Farmer-facing CDS measurements.
#
# Possible land/soil implications are produced later by the AI
# interpretation layer using climate history/outlook + approved
# learning materials, and must be worded as possible conditions
# or considerations rather than measured soil-health facts.
#
# Historical wind speed is derived later from U/V components:
#
#     sqrt(u^2 + v^2)
#
# This provider therefore expands wind_speed_mps into the two
# source components when requesting ERA5-Land.
# ============================================================

HISTORICAL_VARIABLE_MAP = {
    "temperature_c": ("2m_temperature",),
    "precipitation_mm": ("total_precipitation",),
    "wind_speed_mps": (
        "10m_u_component_of_wind",
        "10m_v_component_of_wind",
    ),
    "solar_radiation_mj_m2": ("surface_solar_radiation_downwards",),
}


# Seasonal output is kept to the same Farmer-facing
# weather/climate scope used by GrainRise. Do not imply that
# unavailable land/soil properties are forecasted by the API.
SEASONAL_VARIABLE_MAP = {
    "temperature_c": ("2m_temperature",),
    "precipitation_mm": ("total_precipitation",),
    "wind_speed_mps": ("10m_wind_speed",),
    "solar_radiation_mj_m2": ("surface_solar_radiation_downwards",),
}


HISTORICAL_NORMALIZATION_HINTS = {
    "2m_temperature": {
        "target_variable": "temperature_c",
        "conversion": "kelvin_to_celsius",
    },
    "total_precipitation": {
        "target_variable": "precipitation_mm",
        "conversion": "metres_to_millimetres_sum",
    },
    "10m_u_component_of_wind": {
        "target_variable": "wind_speed_mps",
        "conversion": "wind_component",
    },
    "10m_v_component_of_wind": {
        "target_variable": "wind_speed_mps",
        "conversion": "wind_component",
    },
    "surface_solar_radiation_downwards": {
        "target_variable": "solar_radiation_mj_m2",
        "conversion": "joules_to_megajoules_sum",
    },
}


SEASONAL_NORMALIZATION_HINTS = {
    "2m_temperature": {
        "target_variable": "temperature_c",
        "conversion": "kelvin_to_celsius_ensemble_mean",
    },
    "total_precipitation": {
        "target_variable": "precipitation_mm",
        "conversion": "seasonal_precipitation_to_mm_ensemble_mean",
    },
    "10m_wind_speed": {
        "target_variable": "wind_speed_mps",
        "conversion": "ensemble_mean",
    },
    "surface_solar_radiation_downwards": {
        "target_variable": "solar_radiation_mj_m2",
        "conversion": "seasonal_radiation_to_mj_m2_ensemble_mean",
    },
}


# ============================================================
# CONTROLLED PROVIDER ERROR
# ============================================================


class CopernicusProviderError(Exception):
    """
    Controlled exception for CDS provider failures.

    code:
        Stable backend identifier.

    message:
        Safe human-readable message for service/view layers.

    status:
        Suggested HTTP status.
    """

    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# ============================================================
# NORMALIZATION HELPERS
# ============================================================


def _text(value, *, required=False, field_name="Field", max_length=None):
    normalized = str(value or "").strip()

    if required and not normalized:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            f"{field_name} is required.",
            400,
        )

    if max_length is not None and len(normalized) > max_length:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            f"{field_name} is too long.",
            400,
        )

    return normalized


def _date(value, field_name):
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    normalized = _text(value, required=True, field_name=field_name)

    try:
        return date.fromisoformat(normalized)
    except ValueError as exc:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            f"{field_name} must use YYYY-MM-DD format.",
            400,
        ) from exc


def _date_range(start_date, end_date):
    start = _date(start_date, "Start date")
    end = _date(end_date, "End date")

    if start > end:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            "Start date cannot be after end date.",
            400,
        )

    return start, end


def _coordinate(value, field_name, minimum, maximum):
    try:
        normalized = Decimal(str(value)).quantize(Decimal("0.000001"))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise CopernicusProviderError(
            "copernicus_invalid_location",
            f"Invalid {field_name}.",
            400,
        ) from exc

    if not Decimal(str(minimum)) <= normalized <= Decimal(str(maximum)):
        raise CopernicusProviderError(
            "copernicus_invalid_location",
            f"Invalid {field_name}.",
            400,
        )

    return normalized


def _output_path(value, *, expected_suffix=None):
    if value in (None, ""):
        raise CopernicusProviderError(
            "copernicus_validation_error",
            "Climate download output path is required.",
            500,
        )

    path = Path(value).expanduser().resolve()

    if expected_suffix and path.suffix.lower() != expected_suffix:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            f"Climate output file must use the {expected_suffix} extension.",
            500,
        )

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise CopernicusProviderError(
            "copernicus_storage_error",
            "Climate download directory could not be created.",
            500,
        ) from exc

    return path


def _normalize_requested_variables(variable_codes, mapping, *, data_label):
    if not isinstance(variable_codes, (list, tuple, set)):
        raise CopernicusProviderError(
            "copernicus_validation_error",
            "Climate variables must be a list.",
            400,
        )

    normalized_codes = []
    source_variables = []
    unsupported = []

    seen_codes = set()
    seen_source_variables = set()

    for raw_code in variable_codes:
        code = _text(raw_code).lower()

        if not code or code in seen_codes:
            continue

        seen_codes.add(code)

        source_names = mapping.get(code)

        if source_names is None:
            unsupported.append(code)
            continue

        normalized_codes.append(code)

        for source_name in source_names:
            if source_name in seen_source_variables:
                continue

            seen_source_variables.add(source_name)
            source_variables.append(source_name)

    if unsupported:
        raise CopernicusProviderError(
            "copernicus_unsupported_variable",
            (
                f"{data_label} does not support these GrainRise "
                f"climate variables: {', '.join(unsupported)}."
            ),
            422,
        )

    if not normalized_codes:
        raise CopernicusProviderError(
            "copernicus_validation_error",
            "At least one supported climate variable is required.",
            400,
        )

    return tuple(normalized_codes), tuple(source_variables)


# ============================================================
# GRID HELPERS
# ============================================================


def clamp_latitude(value: Decimal) -> Decimal:
    return max(Decimal("-90"), min(Decimal("90"), value))


def clamp_longitude(value: Decimal) -> Decimal:
    # Longitude wraps rather than clamps, but a +/-0.1 degree
    # nudge never gets close to the antimeridian in practice for
    # GrainRise's service area, so a simple clamp is sufficient
    # and keeps validation straightforward.
    return max(Decimal("-180"), min(Decimal("180"), value))


# Each retry costs a full CDS queue round-trip (often tens of
# seconds to minutes), so the default attempt count is kept
# below the full 9-offset spiral. Center + 4 cardinal neighbors
# covers the overwhelming majority of real coastal/near-shore
# cases; the diagonal offsets are only reached if configured up.
HISTORICAL_LAND_NUDGE_MAX_ATTEMPTS_DEFAULT = 5


def historical_land_nudge_offsets(max_attempts=None):
    """
    Full-grid-step (lat_offset, lon_offset) Decimal pairs to try,
    in order, when a historical request lands on a masked
    ERA5-Land grid cell. The first offset is always (0, 0) — the
    farmer's exact requested point.

    Capped by CDS_HISTORICAL_LAND_NUDGE_MAX_ATTEMPTS (env) or the
    max_attempts argument, since every extra offset is another
    full CDS retrieval round-trip.
    """

    limit = max_attempts

    if limit is None:
        raw = os.getenv("CDS_HISTORICAL_LAND_NUDGE_MAX_ATTEMPTS")
        try:
            limit = int(raw) if raw else HISTORICAL_LAND_NUDGE_MAX_ATTEMPTS_DEFAULT
        except ValueError:
            limit = HISTORICAL_LAND_NUDGE_MAX_ATTEMPTS_DEFAULT

    limit = max(1, min(int(limit), len(HISTORICAL_LAND_NUDGE_OFFSETS_DEGREES)))

    return HISTORICAL_LAND_NUDGE_OFFSETS_DEGREES[:limit]


# ============================================================
# CDS CLIENT
# ============================================================


def _import_cdsapi():
    """
    Lazy import keeps Django importable before requirements are
    updated/installed on a developer machine.
    """

    try:
        import cdsapi  # pylint: disable=import-outside-toplevel
    except ImportError as exc:
        raise CopernicusProviderError(
            "copernicus_dependency_missing",
            (
                "Copernicus support is not installed. "
                "Install the project's CDS API dependency."
            ),
            500,
        ) from exc

    return cdsapi


def _cds_client():
    cdsapi = _import_cdsapi()

    api_url = _text(os.getenv("CDS_API_URL") or CDS_API_URL_DEFAULT)

    api_key = _text(
        os.getenv("CDS_API_KEY") or os.getenv("CDS_API_TOKEN")
    )

    try:
        # If an environment token is supplied, use it directly.
        # Otherwise cdsapi.Client() falls back to the standard
        # user-level .cdsapirc configuration.
        if api_key:
            return cdsapi.Client(url=api_url, key=api_key, quiet=True)

        return cdsapi.Client(quiet=True)

    except Exception as exc:  # cdsapi/cads errors vary by version
        raise CopernicusProviderError(
            "copernicus_configuration_error",
            (
                "Copernicus CDS credentials are not configured "
                "or could not be loaded."
            ),
            500,
        ) from exc


# ============================================================
# PROVIDER CONFIGURATION
# ============================================================


def historical_dataset_code():
    return _text(
        os.getenv("CDS_HISTORICAL_DATASET") or HISTORICAL_DATASET_DEFAULT,
        required=True,
        field_name="Historical CDS dataset",
        max_length=150,
    )


def seasonal_dataset_code():
    return _text(
        os.getenv("CDS_SEASONAL_DATASET") or SEASONAL_DATASET_DEFAULT,
        required=True,
        field_name="Seasonal CDS dataset",
        max_length=150,
    )


def seasonal_originating_centre():
    return _text(
        os.getenv("CDS_SEASONAL_ORIGINATING_CENTRE") or SEASONAL_CENTRE_DEFAULT,
        required=True,
        field_name="Seasonal originating centre",
        max_length=50,
    )


def seasonal_system():
    return _text(
        os.getenv("CDS_SEASONAL_SYSTEM") or SEASONAL_SYSTEM_DEFAULT,
        required=True,
        field_name="Seasonal system",
        max_length=20,
    )


def seasonal_product_type():
    return _text(
        os.getenv("CDS_SEASONAL_PRODUCT_TYPE") or SEASONAL_PRODUCT_TYPE_DEFAULT,
        required=True,
        field_name="Seasonal product type",
        max_length=50,
    )


# ============================================================
# REQUEST BUILDERS
# ============================================================


def build_historical_timeseries_request(
    *,
    latitude,
    longitude,
    start_date,
    end_date,
    variable_codes,
):
    """
    Build a request for ERA5-Land hourly time-series at one
    Farmer location.

    The product itself snaps a requested point to the nearest
    ERA5-Land 0.1 degree grid point.
    """

    lat = _coordinate(latitude, "latitude", -90, 90)
    lon = _coordinate(longitude, "longitude", -180, 180)
    start, end = _date_range(start_date, end_date)

    normalized_codes, source_variables = _normalize_requested_variables(
        variable_codes,
        HISTORICAL_VARIABLE_MAP,
        data_label="Historical ERA5-Land",
    )

    date_range = f"{start.isoformat()}/{end.isoformat()}"

    request = {
        "variable": list(source_variables),
        "location": {
            "longitude": float(lon),
            "latitude": float(lat),
        },
        "date": [date_range],
        "data_format": NETCDF_FORMAT,
    }

    return {
        "provider_code": CDS_PROVIDER_CODE,
        "dataset_code": historical_dataset_code(),
        "data_kind": "historical",
        "latitude": lat,
        "longitude": lon,
        "start_date": start,
        "end_date": end,
        "normalized_variable_codes": normalized_codes,
        "source_variables": source_variables,
        "request": request,
        "normalization_hints": {
            variable: HISTORICAL_NORMALIZATION_HINTS[variable]
            for variable in source_variables
            if variable in HISTORICAL_NORMALIZATION_HINTS
        },
    }


def _seasonal_area(latitude, longitude):
    lat = _coordinate(latitude, "latitude", -90, 90)
    lon = _coordinate(longitude, "longitude", -180, 180)

    half_span = SEASONAL_POINT_HALF_SPAN_DEGREES

    north = min(Decimal("90"), lat + half_span)
    south = max(Decimal("-90"), lat - half_span)
    west = max(Decimal("-180"), lon - half_span)
    east = min(Decimal("180"), lon + half_span)

    # CDS / MARS area order: North, West, South, East.
    return [float(north), float(west), float(south), float(east)]


def build_seasonal_monthly_request(
    *,
    latitude,
    longitude,
    forecast_issue_date,
    variable_codes,
    lead_months=SEASONAL_LEAD_MONTHS,
):
    """
    Build the six-month C3S seasonal monthly request.

    forecast_issue_date identifies the initialization month.
    The seasonal request uses its year/month plus lead months
    1..6.
    """

    lat = _coordinate(latitude, "latitude", -90, 90)
    lon = _coordinate(longitude, "longitude", -180, 180)
    issue_date = _date(forecast_issue_date, "Forecast issue date")

    normalized_codes, source_variables = _normalize_requested_variables(
        variable_codes,
        SEASONAL_VARIABLE_MAP,
        data_label="C3S seasonal forecast",
    )

    normalized_leads = tuple(
        str(value).strip() for value in lead_months if str(value).strip()
    )

    if normalized_leads != SEASONAL_LEAD_MONTHS:
        raise CopernicusProviderError(
            "copernicus_invalid_horizon",
            (
                "GrainRise Climate Forecasting currently supports "
                "exactly six seasonal lead months (1 to 6)."
            ),
            400,
        )

    request = {
        "originating_centre": seasonal_originating_centre(),
        "system": seasonal_system(),
        "variable": list(source_variables),
        "product_type": [seasonal_product_type()],
        "year": [f"{issue_date.year:04d}"],
        "month": [f"{issue_date.month:02d}"],
        "leadtime_month": list(normalized_leads),
        "data_format": NETCDF_FORMAT,
        "area": _seasonal_area(lat, lon),
    }

    return {
        "provider_code": CDS_PROVIDER_CODE,
        "dataset_code": seasonal_dataset_code(),
        "data_kind": "forecast",
        "latitude": lat,
        "longitude": lon,
        "forecast_issue_date": issue_date,
        "lead_months": normalized_leads,
        "normalized_variable_codes": normalized_codes,
        "source_variables": source_variables,
        "request": request,
        "normalization_hints": {
            variable: SEASONAL_NORMALIZATION_HINTS[variable]
            for variable in source_variables
            if variable in SEASONAL_NORMALIZATION_HINTS
        },
    }


# ============================================================
# DOWNLOAD EXECUTION
# ============================================================


def _retrieve(*, dataset_code, request_payload, output_path):
    client = _cds_client()

    try:
        client.retrieve(dataset_code, request_payload, str(output_path))

    except Exception as exc:  # cads/cdsapi exception types vary
        try:
            output_path.unlink(missing_ok=True)
        except OSError:
            pass

        message = str(exc).lower()

        if "terms" in message or "licence" in message or "license" in message:
            raise CopernicusProviderError(
                "copernicus_terms_required",
                (
                    "The required Copernicus dataset terms must "
                    "be accepted in the Climate Data Store account."
                ),
                503,
            ) from exc

        if (
            "unauthorized" in message
            or "forbidden" in message
            or "401" in message
            or "403" in message
        ):
            raise CopernicusProviderError(
                "copernicus_authentication_failed",
                "Copernicus CDS authentication failed.",
                503,
            ) from exc

        raise CopernicusProviderError(
            "copernicus_retrieval_failed",
            "Copernicus climate data could not be retrieved.",
            503,
        ) from exc

    if not output_path.exists() or output_path.stat().st_size <= 0:
        raise CopernicusProviderError(
            "copernicus_empty_download",
            "Copernicus returned an empty climate download.",
            502,
        )

    return output_path


def retrieve_historical_timeseries(
    *,
    latitude,
    longitude,
    start_date,
    end_date,
    variable_codes,
    output_path,
):
    """
    Download ERA5-Land historical hourly time-series.

    The CDS time-series product normally returns a ZIP archive
    containing one or more NetCDF files, because variables can
    live in separate parameter groups.
    """

    target = _output_path(output_path, expected_suffix=".zip")

    prepared = build_historical_timeseries_request(
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
        variable_codes=variable_codes,
    )

    _retrieve(
        dataset_code=prepared["dataset_code"],
        request_payload=prepared["request"],
        output_path=target,
    )

    return {
        **prepared,
        "output_path": str(target),
        "output_format": "zip_netcdf",
        "file_size_bytes": target.stat().st_size,
    }


def retrieve_seasonal_monthly_forecast(
    *,
    latitude,
    longitude,
    forecast_issue_date,
    variable_codes,
    output_path,
):
    """
    Download six lead months of C3S seasonal monthly data.

    The downloaded NetCDF can contain ensemble-member data.
    The future normalizer is responsible for producing the
    GrainRise ensemble-mean monthly forecast values.
    """

    target = _output_path(output_path, expected_suffix=".nc")

    prepared = build_seasonal_monthly_request(
        latitude=latitude,
        longitude=longitude,
        forecast_issue_date=forecast_issue_date,
        variable_codes=variable_codes,
    )

    _retrieve(
        dataset_code=prepared["dataset_code"],
        request_payload=prepared["request"],
        output_path=target,
    )

    return {
        **prepared,
        "output_path": str(target),
        "output_format": "netcdf",
        "file_size_bytes": target.stat().st_size,
    }


# ============================================================
# PROVIDER CAPABILITIES
# ============================================================


def get_copernicus_capabilities():
    """
    Small safe payload for diagnostics/frontend configuration.

    No API token or credential is returned.
    """

    return {
        "provider_code": CDS_PROVIDER_CODE,
        "historical": {
            "dataset_code": historical_dataset_code(),
            "source_resolution": "hourly",
            "supported_output_granularities": ["weekly", "monthly"],
            "supported_variables": sorted(HISTORICAL_VARIABLE_MAP.keys()),
        },
        "forecast": {
            "dataset_code": seasonal_dataset_code(),
            "originating_centre": seasonal_originating_centre(),
            "system": seasonal_system(),
            "source_resolution": "monthly",
            "forecast_horizon_months": 6,
            "supported_output_granularities": ["monthly"],
            "supported_variables": sorted(SEASONAL_VARIABLE_MAP.keys()),
        },
    }