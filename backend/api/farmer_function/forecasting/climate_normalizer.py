from __future__ import annotations

import calendar
import math
import tempfile
import zipfile

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable


# ============================================================
# GRAINRISE FARMER FORECASTING
# COPERNICUS CLIMATE NORMALIZER
# ============================================================


HISTORICAL_SOURCE_MAP = {
    "t2m": "temperature_c",
    "2m_temperature": "temperature_c",

    "tp": "precipitation_mm",
    "total_precipitation": "precipitation_mm",

    "ssrd": "solar_radiation_mj_m2",
    "surface_solar_radiation_downwards": "solar_radiation_mj_m2",
}


WIND_U_NAMES = (
    "u10",
    "10m_u_component_of_wind",
)


WIND_V_NAMES = (
    "v10",
    "10m_v_component_of_wind",
)


SEASONAL_ALIASES = {
    "temperature_c": ("t2m", "2m_temperature"),
    "precipitation_mm": ("tprate", "tp", "total_precipitation"),
    "wind_speed_mps": ("si10", "10m_wind_speed", "ws10"),
    "solar_radiation_mj_m2": (
        # "msdsrf" (mean surface downward short-wave radiation
        # flux, W/m^2) is what the seasonal monthly-mean product
        # actually returns. "ssrd" is kept for safety in case a
        # differently-configured seasonal product ever returns
        # the ERA5-Land-style accumulated name instead.
        "msdsrf",
        "ssrd",
        "surface_solar_radiation_downwards",
    ),
}


TARGET_UNITS = {
    "temperature_c": "celsius",
    "precipitation_mm": "mm",
    "wind_speed_mps": "m/s",
    "solar_radiation_mj_m2": "MJ/m2",
}


TARGET_AGGREGATION = {
    "temperature_c": "mean",
    "precipitation_mm": "sum",
    "wind_speed_mps": "mean",
    "solar_radiation_mj_m2": "sum",
}


TIME_CANDIDATES = ("valid_time", "time", "date")

LATITUDE_CANDIDATES = ("latitude", "lat")

LONGITUDE_CANDIDATES = ("longitude", "lon")

ENSEMBLE_DIMS = (
    "number",
    "realization",
    "ensemble",
    "ensemble_member",
    "member",
)

LEAD_DIMS = (
    "leadtime_month",
    "forecastMonth",
    "forecast_month",
    "leadtime",
    "lead_month",
)


# ============================================================
# EXCEPTION
# ============================================================


class ClimateNormalizationError(Exception):

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


# ============================================================
# NORMALIZED POINT MODEL
# ============================================================


@dataclass(frozen=True)
class NormalizedClimatePoint:

    variable_code: str
    source_variable_name: str
    period_start: date
    period_end: date
    value: float
    unit_code: str
    aggregation_method: str
    quality_metadata: dict

    def as_dict(self):
        return {
            "variable_code": self.variable_code,
            "source_variable_name": self.source_variable_name,
            "period_start": self.period_start,
            "period_end": self.period_end,
            "value": self.value,
            "unit_code": self.unit_code,
            "aggregation_method": self.aggregation_method,
            "quality_metadata": self.quality_metadata,
        }


# ============================================================
# SCIENCE DEPENDENCIES
# ============================================================


def _science_modules():
    try:
        import numpy as np
        import pandas as pd
        import xarray as xr
    except ImportError as exc:
        raise ClimateNormalizationError(
            "climate_dependency_missing",
            "Install numpy, pandas, xarray and netCDF4.",
        ) from exc

    return np, pd, xr


# ============================================================
# GENERIC HELPERS
# ============================================================


def _existing_path(value, label):
    path = Path(value).expanduser().resolve()

    if not path.is_file() or path.stat().st_size <= 0:
        raise ClimateNormalizationError(
            "climate_file_missing",
            f"{label} is missing or empty.",
        )

    return path


def _clean_float(value):
    result = float(value)

    if not math.isfinite(result):
        raise ClimateNormalizationError(
            "climate_invalid_value",
            "Copernicus returned a non-finite value.",
        )

    return result


def _find_name(container, candidates):
    for name in candidates:
        if name in container:
            return name

    return None


# ============================================================
# PERIOD HELPERS
# ============================================================


def _period_bounds(timestamp, granularity):
    _, pd, _ = _science_modules()

    ts = pd.Timestamp(timestamp)

    if granularity == "weekly":
        start = (ts - pd.Timedelta(days=int(ts.weekday()))).normalize()
        end = start + pd.Timedelta(days=6)

    elif granularity == "monthly":
        period = ts.to_period("M")
        start = period.start_time
        end = period.end_time.normalize()

    else:
        raise ClimateNormalizationError(
            "climate_invalid_granularity",
            "Climate granularity must be weekly or monthly.",
        )

    return start.date(), end.date()


# ============================================================
# HISTORICAL FILE DISCOVERY
# ============================================================


def _historical_files(path):
    if path.suffix.lower() == ".nc":
        return None, [path]

    if path.suffix.lower() != ".zip":
        raise ClimateNormalizationError(
            "climate_historical_format_error",
            "Historical Copernicus artifact must be ZIP or NetCDF.",
        )

    temp_dir = tempfile.TemporaryDirectory(prefix="grainrise_climate_")
    root = Path(temp_dir.name)

    try:
        with zipfile.ZipFile(path) as archive:
            for name in archive.namelist():
                item = Path(name)

                if item.is_absolute() or ".." in item.parts:
                    raise ClimateNormalizationError(
                        "climate_archive_invalid",
                        "Historical climate archive contains an unsafe path.",
                    )

            archive.extractall(root)

    except zipfile.BadZipFile as exc:
        temp_dir.cleanup()
        raise ClimateNormalizationError(
            "climate_archive_invalid",
            "Historical Copernicus ZIP could not be opened.",
        ) from exc

    files = sorted(root.rglob("*.nc"))

    if not files:
        temp_dir.cleanup()
        raise ClimateNormalizationError(
            "climate_archive_empty",
            "Historical Copernicus ZIP did not contain NetCDF data.",
        )

    return temp_dir, files


# ============================================================
# TIME AXIS RESOLUTION
# ============================================================


def _time_info(dataset, data_array):
    np, _, _ = _science_modules()

    # 1. Direct dimension + coordinate:
    #    t2m(valid_time, ...); valid_time(valid_time)
    for candidate in TIME_CANDIDATES:
        if (
            candidate in data_array.dims
            and candidate in dataset.variables
        ):
            coordinate = dataset[candidate]
            return candidate, coordinate.values

    # 2. Datetime coordinate attached to a different dimension.
    for candidate in TIME_CANDIDATES:
        if candidate not in dataset.variables:
            continue

        coordinate = dataset[candidate]

        if coordinate.ndim != 1:
            continue

        if not coordinate.dims:
            continue

        coordinate_dim = coordinate.dims[0]

        if coordinate_dim in data_array.dims:
            return coordinate_dim, coordinate.values

    # 3. Any datetime coordinate.
    for _, coordinate in dataset.coords.items():
        if coordinate.ndim != 1:
            continue

        try:
            is_datetime = np.issubdtype(coordinate.dtype, np.datetime64)
        except TypeError:
            is_datetime = False

        if not is_datetime:
            continue

        if coordinate.dims and coordinate.dims[0] in data_array.dims:
            return coordinate.dims[0], coordinate.values

    # 4. Match datetime coordinate by dimension size.
    spatial_names = {*LATITUDE_CANDIDATES, *LONGITUDE_CANDIDATES}

    for _, coordinate in dataset.variables.items():
        if coordinate.ndim != 1:
            continue

        try:
            is_datetime = np.issubdtype(coordinate.dtype, np.datetime64)
        except TypeError:
            is_datetime = False

        if not is_datetime:
            continue

        for dimension in data_array.dims:
            if dimension in spatial_names:
                continue

            if int(data_array.sizes.get(dimension, 0)) == int(coordinate.size):
                return dimension, coordinate.values

    return None, None


# ============================================================
# NETCDF VARIABLE -> HOURLY SERIES
# ============================================================


def _hourly_series(dataset, variable_name):
    """
    Build a clean hourly pandas Series for one NetCDF variable.

    Returns None if no usable time-series could be produced —
    either because of a structural/parsing problem, or because
    every value at this point is NaN (e.g. an ERA5-Land grid
    cell that is masked out because it is not over land).
    """

    np, pd, _ = _science_modules()

    if variable_name not in dataset.data_vars:
        return None, "missing_variable"

    data_array = dataset[variable_name]

    time_dim, times = _time_info(dataset, data_array)

    if time_dim is None or times is None:
        return None, "no_time_axis"

    if time_dim not in data_array.dims:
        return None, "no_time_axis"

    # Reduce non-time dimensions (typically size-1 lat/lon).
    for dimension in list(data_array.dims):
        if dimension == time_dim:
            continue

        size = int(data_array.sizes.get(dimension, 1))

        if size == 1:
            data_array = data_array.isel({dimension: 0}, drop=True)
        else:
            data_array = data_array.mean(dim=dimension, skipna=True)

    if time_dim not in data_array.dims:
        return None, "no_time_axis"

    data_array = data_array.transpose(time_dim)

    try:
        values = np.asarray(data_array.values, dtype=float).reshape(-1)
    except (TypeError, ValueError):
        return None, "unreadable_values"

    try:
        timestamps = pd.to_datetime(
            np.asarray(times).reshape(-1),
            errors="coerce",
        )
    except Exception:
        return None, "unreadable_time_axis"

    count = min(len(values), len(timestamps))

    if count <= 0:
        return None, "empty_series"

    values = values[:count]
    timestamps = timestamps[:count]

    series = pd.Series(values, index=timestamps, dtype="float64")

    series = series[~series.index.isna()]

    all_nan_before_cleanup = bool(np.isnan(values).all())

    series = series.replace([np.inf, -np.inf], np.nan).dropna()

    if series.empty:
        # Distinguish "every value is NaN" (a masked/no-land grid
        # cell) from other structural emptiness for diagnostics.
        reason = "all_values_nan" if all_nan_before_cleanup else "empty_after_cleanup"
        return None, reason

    if series.index.has_duplicates:
        series = series.groupby(level=0).mean()

    return series.sort_index(), None


# ============================================================
# COMBINE SERIES FROM MULTIPLE CDS FILES
# ============================================================


def _combine_series(parts):
    _, pd, _ = _science_modules()

    if not parts:
        return None

    combined = pd.concat(parts)

    if combined.empty:
        return None

    return combined.groupby(level=0).mean().sort_index()


# ============================================================
# HISTORICAL UNIT CONVERSION
# ============================================================


def _convert_historical_series(target_code, series):
    if target_code == "temperature_c":
        return series - 273.15  # Kelvin -> Celsius

    if target_code == "precipitation_mm":
        return series * 1000.0  # metres -> millimetres

    if target_code == "solar_radiation_mj_m2":
        return series / 1_000_000.0  # J/m^2 -> MJ/m^2

    if target_code == "wind_speed_mps":
        return series

    raise ClimateNormalizationError(
        "climate_variable_unsupported",
        f"Unsupported historical variable: {target_code}.",
    )


# ============================================================
# HISTORICAL WEEKLY / MONTHLY AGGREGATION
# ============================================================


def _aggregate_series(series, target_code, granularity):
    _, pd, _ = _science_modules()

    series = series.sort_index()

    index = pd.DatetimeIndex(series.index)

    if index.tz is None:
        index = index.tz_localize("UTC")
    else:
        index = index.tz_convert("UTC")

    # ERA5 timestamps are UTC. GrainRise displays Philippine
    # local periods.
    series.index = index.tz_convert("Asia/Manila").tz_localize(None)

    if granularity == "weekly":
        grouper = pd.Grouper(freq="W-SUN", label="right", closed="right")
    elif granularity == "monthly":
        grouper = pd.Grouper(freq="ME")
    else:
        raise ClimateNormalizationError(
            "climate_invalid_granularity",
            "Climate granularity must be weekly or monthly.",
        )

    if TARGET_AGGREGATION[target_code] == "sum":
        return series.groupby(grouper).sum(min_count=1).dropna()

    return series.groupby(grouper).mean().dropna()


# ============================================================
# HISTORICAL NORMALIZER
# ============================================================


def normalize_historical_archive(
    archive_path,
    *,
    granularity: str,
    requested_variables: Iterable[str] | None = None,
):
    np, _, xr = _science_modules()

    path = _existing_path(archive_path, "Historical climate file")

    wanted = tuple(
        requested_variables
        or (
            "temperature_c",
            "precipitation_mm",
            "wind_speed_mps",
            "solar_radiation_mj_m2",
        )
    )

    unknown = sorted(set(wanted) - set(TARGET_UNITS))

    if unknown:
        raise ClimateNormalizationError(
            "climate_variable_unsupported",
            "Unsupported historical climate variables: "
            + ", ".join(unknown)
            + ".",
        )

    temp_dir, files = _historical_files(path)

    # Normal (non-wind) variables.
    parts = {
        code: [] for code in wanted if code != "wind_speed_mps"
    }

    # Wind components — CDS can return u10 and v10 in different
    # .nc files.
    wind_u_parts = []
    wind_v_parts = []

    found_variables = set()
    usable_variables = set()
    all_nan_variables = set()
    diagnostics = []

    try:
        for file_path in files:

            with xr.open_dataset(file_path, decode_times=True) as dataset:

                found_variables.update(
                    str(name) for name in dataset.data_vars
                )

                diagnostics.append(
                    {
                        "file": file_path.name,
                        "dims": {
                            str(key): int(value)
                            for key, value in dataset.sizes.items()
                        },
                        "coords": [str(name) for name in dataset.coords],
                        "vars": [str(name) for name in dataset.data_vars],
                    }
                )

                # Temperature / precipitation / solar.
                for source_name, target_code in HISTORICAL_SOURCE_MAP.items():

                    if source_name not in dataset.data_vars:
                        continue

                    if target_code not in wanted:
                        continue

                    series, reason = _hourly_series(dataset, source_name)

                    if series is not None and not series.empty:
                        parts[target_code].append(series)
                        usable_variables.add(source_name)
                    elif reason == "all_values_nan":
                        all_nan_variables.add(source_name)

                # Wind U component.
                if "wind_speed_mps" in wanted:

                    for source_name in WIND_U_NAMES:
                        if source_name not in dataset.data_vars:
                            continue

                        series, reason = _hourly_series(dataset, source_name)

                        if series is not None and not series.empty:
                            wind_u_parts.append(series)
                            usable_variables.add(source_name)
                        elif reason == "all_values_nan":
                            all_nan_variables.add(source_name)

                        break

                    # Wind V component.
                    for source_name in WIND_V_NAMES:
                        if source_name not in dataset.data_vars:
                            continue

                        series, reason = _hourly_series(dataset, source_name)

                        if series is not None and not series.empty:
                            wind_v_parts.append(series)
                            usable_variables.add(source_name)
                        elif reason == "all_values_nan":
                            all_nan_variables.add(source_name)

                        break

    finally:
        if temp_dir is not None:
            temp_dir.cleanup()

    # Combine standard variables.
    combined = {}

    for target_code, target_parts in parts.items():
        series = _combine_series(target_parts)

        if series is not None and not series.empty:
            combined[target_code] = _convert_historical_series(
                target_code, series
            )

    # Derive wind speed = sqrt(u10^2 + v10^2).
    u = _combine_series(wind_u_parts)
    v = _combine_series(wind_v_parts)

    if "wind_speed_mps" in wanted and u is not None and v is not None:
        u, v = u.align(v, join="inner")
        wind = np.sqrt((u ** 2) + (v ** 2)).dropna()

        if not wind.empty:
            combined["wind_speed_mps"] = wind

    # Validate.
    missing = [
        code
        for code in wanted
        if code not in combined or combined[code].empty
    ]

    if missing:

        # Every requested variable was present in the NetCDF
        # (found_variables), but none produced a usable series
        # (usable_variables empty) and every one of them was
        # all-NaN. This is the signature of coordinates that
        # snapped to a masked (non-land) ERA5-Land grid cell —
        # open water, a lake, or a coastal edge — rather than a
        # malformed download or a parsing bug.
        structurally_masked = (
            bool(found_variables)
            and not usable_variables
            and len(missing) == len(wanted)
            and bool(all_nan_variables)
            and all_nan_variables.issuperset(found_variables)
        )

        if structurally_masked:
            raise ClimateNormalizationError(
                "climate_location_no_land_data",
                (
                    "Copernicus ERA5-Land returned no usable data "
                    "for any requested variable at this location. "
                    "This usually means the coordinates snapped to "
                    "a masked (non-land) ERA5-Land grid cell — open "
                    "water, a lake, or a coastal edge — rather than "
                    "a malformed download."
                ),
            )

        diagnostic_text = "; ".join(
            (
                f"{item['file']} "
                f"dims={item['dims']} "
                f"coords={item['coords']} "
                f"vars={item['vars']}"
            )
            for item in diagnostics
        )

        raise ClimateNormalizationError(
            "climate_variable_missing",
            (
                "Historical Copernicus variables were present but "
                "no usable time-series could be built for: "
                + ", ".join(missing)
                + ". NetCDF variables found: "
                + (", ".join(sorted(found_variables)) or "(none)")
                + ". Variables with usable values: "
                + (", ".join(sorted(usable_variables)) or "(none)")
                + ". Structure: "
                + diagnostic_text
            ),
        )

    # Aggregate.
    source_labels = {
        "temperature_c": "t2m",
        "precipitation_mm": "tp",
        "wind_speed_mps": "u10+v10",
        "solar_radiation_mj_m2": "ssrd",
    }

    output = []

    for target_code in wanted:

        grouped = _aggregate_series(
            combined[target_code], target_code, granularity
        )

        for timestamp, value in grouped.items():

            start, end = _period_bounds(timestamp, granularity)

            output.append(
                NormalizedClimatePoint(
                    variable_code=target_code,
                    source_variable_name=source_labels[target_code],
                    period_start=start,
                    period_end=end,
                    value=_clean_float(value),
                    unit_code=TARGET_UNITS[target_code],
                    aggregation_method=TARGET_AGGREGATION[target_code],
                    quality_metadata={
                        "source_resolution": "hourly",
                        "source_dataset": "ERA5-Land time-series",
                        "location_method": "nearest ERA5-Land grid point",
                    },
                ).as_dict()
            )

    output.sort(key=lambda item: (item["period_start"], item["variable_code"]))

    return output


# ============================================================
# SEASONAL DATE HELPERS
# ============================================================


def _month_add(base: date, months: int):
    absolute = base.year * 12 + base.month - 1 + months
    year, month_index = divmod(absolute, 12)
    return date(year, month_index + 1, 1)


def _month_bounds(issue_date: date, position: int):
    start = _month_add(
        date(issue_date.year, issue_date.month, 1), position
    )
    end = date(
        start.year, start.month, calendar.monthrange(start.year, start.month)[1]
    )
    return start, end


# ============================================================
# SEASONAL VARIABLE HELPERS
# ============================================================


def _seasonal_name(dataset, aliases):
    for name in aliases:
        if name in dataset.data_vars:
            return name

    return None


def _reduce_seasonal(data_array, latitude, longitude):
    lat_name = _find_name(data_array.coords, LATITUDE_CANDIDATES)
    lon_name = _find_name(data_array.coords, LONGITUDE_CANDIDATES)

    if lat_name and lon_name:
        try:
            data_array = data_array.sel(
                {
                    lat_name: float(latitude),
                    lon_name: float(longitude),
                },
                method="nearest",
            )
        except Exception:
            pass

    member_count = None

    for dim in ENSEMBLE_DIMS:
        if dim in data_array.dims:
            member_count = data_array.sizes[dim]
            data_array = data_array.mean(dim=dim, skipna=True)

    return data_array, member_count


def _seasonal_period_dimension(data_array):
    for dim in LEAD_DIMS:
        if dim in data_array.dims:
            return dim

    for dim in TIME_CANDIDATES:
        if dim in data_array.dims:
            return dim

    return None


# ============================================================
# SEASONAL UNIT CONVERSION
# ============================================================


def _seasonal_convert(target_code, value, year, month):
    seconds = calendar.monthrange(year, month)[1] * 86400

    if target_code == "temperature_c":
        return value - 273.15

    if target_code == "precipitation_mm":
        return value * seconds * 1000.0

    if target_code == "wind_speed_mps":
        return value

    if target_code == "solar_radiation_mj_m2":
        return value * seconds / 1_000_000.0

    raise ClimateNormalizationError(
        "climate_variable_unsupported",
        f"Unsupported seasonal variable: {target_code}.",
    )


# ============================================================
# SEASONAL NORMALIZER
# ============================================================


def normalize_seasonal_forecast(
    netcdf_path,
    *,
    forecast_issue_date: date,
    latitude: float,
    longitude: float,
    requested_variables: Iterable[str] | None = None,
):
    np, _, xr = _science_modules()

    path = _existing_path(netcdf_path, "Seasonal climate file")

    wanted = tuple(
        requested_variables
        or (
            "temperature_c",
            "precipitation_mm",
            "wind_speed_mps",
            "solar_radiation_mj_m2",
        )
    )

    output = []

    with xr.open_dataset(path, decode_times=True) as dataset:

        found = sorted(str(name) for name in dataset.data_vars)

        for target_code in wanted:

            aliases = SEASONAL_ALIASES.get(target_code)

            if not aliases:
                raise ClimateNormalizationError(
                    "climate_variable_unsupported",
                    f"Unsupported seasonal variable: {target_code}.",
                )

            source_name = _seasonal_name(dataset, aliases)

            if not source_name:
                raise ClimateNormalizationError(
                    "climate_variable_missing",
                    (
                        "Seasonal Copernicus response could not be "
                        f"mapped to {target_code}. NetCDF variables "
                        "found: "
                        + (", ".join(found) or "(none)")
                        + "."
                    ),
                )

            data_array = dataset[source_name]

            data_array, member_count = _reduce_seasonal(
                data_array, latitude, longitude
            )

            period_dim = _seasonal_period_dimension(data_array)

            if not period_dim:
                raise ClimateNormalizationError(
                    "climate_seasonal_dimension_error",
                    (
                        "Could not identify forecast-month dimension "
                        f"for {target_code}."
                    ),
                )

            count = int(data_array.sizes[period_dim])

            if count < 6:
                raise ClimateNormalizationError(
                    "climate_seasonal_horizon_incomplete",
                    (
                        f"Seasonal response for {target_code} "
                        f"contains only {count} forecast months."
                    ),
                )

            for position in range(6):

                selected = data_array.isel({period_dim: position})

                # Reduce remaining dimensions.
                for dim in list(selected.dims):
                    if selected.sizes.get(dim, 1) == 1:
                        selected = selected.isel({dim: 0}, drop=True)
                    else:
                        selected = selected.mean(dim=dim, skipna=True)

                raw = float(
                    np.nanmean(np.asarray(selected.values, dtype=float))
                )

                if not math.isfinite(raw):
                    raise ClimateNormalizationError(
                        "climate_invalid_value",
                        (
                            "Seasonal Copernicus returned no usable "
                            f"value for {target_code}."
                        ),
                    )

                start, end = _month_bounds(forecast_issue_date, position)

                converted = _seasonal_convert(
                    target_code, raw, start.year, start.month
                )

                output.append(
                    NormalizedClimatePoint(
                        variable_code=target_code,
                        source_variable_name=source_name,
                        period_start=start,
                        period_end=end,
                        value=_clean_float(converted),
                        unit_code=TARGET_UNITS[target_code],
                        aggregation_method=TARGET_AGGREGATION[target_code],
                        quality_metadata={
                            "source_resolution": "monthly seasonal ensemble",
                            "source_dataset": (
                                "C3S seasonal monthly single levels"
                            ),
                            "ensemble_members": member_count,
                        },
                    ).as_dict()
                )

    output.sort(key=lambda item: (item["period_start"], item["variable_code"]))

    return output


# ============================================================
# FRONTEND CHART HELPERS
# ============================================================


def split_points_by_variable(points: Iterable[dict]):
    result = {}

    for point in points:
        result.setdefault(point["variable_code"], []).append(point)

    for values in result.values():
        values.sort(key=lambda item: item["period_start"])

    return result


def climate_chart_payload(points: Iterable[dict]):
    grouped = split_points_by_variable(points)

    return {
        variable: [
            {
                "period_start": (
                    item["period_start"].isoformat()
                    if hasattr(item["period_start"], "isoformat")
                    else str(item["period_start"])
                ),
                "period_end": (
                    item["period_end"].isoformat()
                    if hasattr(item["period_end"], "isoformat")
                    else str(item["period_end"])
                ),
                "value": round(float(item["value"]), 4),
                "unit": item["unit_code"],
            }
            for item in values
        ]
        for variable, values in grouped.items()
    }