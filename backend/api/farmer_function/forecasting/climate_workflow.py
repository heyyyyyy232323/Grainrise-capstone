from __future__ import annotations

import calendar
import concurrent.futures
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Mapping, Sequence

from django.db import IntegrityError, connection, transaction
from django.utils import timezone
from psycopg2.extras import Json, execute_values

from .climate_normalizer import (
    ClimateNormalizationError,
    climate_chart_payload,
    normalize_historical_archive,
    normalize_seasonal_forecast,
)
from .copernicus_provider import (
    CopernicusProviderError,
    clamp_latitude,
    clamp_longitude,
    historical_dataset_code,
    historical_land_nudge_offsets,
    retrieve_historical_timeseries,
    retrieve_seasonal_monthly_forecast,
    seasonal_dataset_code,
)
from .services import (
    ForecastingError,
    get_fresh_climate_cache_payload,
    normalize_forecast_coordinates,
    resolve_registered_farm_coordinates,
)


CLIMATE_PROVIDER_CODE = "copernicus_cds"
CLIMATE_VARIABLES = (
    "temperature_c",
    "precipitation_mm",
    "wind_speed_mps",
    "solar_radiation_mj_m2",
)
VALID_HISTORY_YEARS = {1, 3, 5}
VALID_LOCATION_SOURCES = {
    "registered_farm",
    "searched_location",
    "map_location",
    "current_location",
}

# Error code raised by normalize_historical_archive when every
# requested variable came back all-NaN — the requested point
# snapped to a masked (non-land) ERA5-Land grid cell.
CLIMATE_LOCATION_NO_LAND_DATA_CODE = "climate_location_no_land_data"


class ClimateWorkflowError(Exception):
    def __init__(self, code: str, message: str, status: int = 500):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _text(value) -> str:
    return str(value or "").strip()


def _positive_id(value, field_name: str) -> int:
    try:
        value = int(value)
    except (TypeError, ValueError) as exc:
        raise ClimateWorkflowError(
            "validation_error", f"Invalid {field_name}.", 400
        ) from exc

    if value <= 0:
        raise ClimateWorkflowError(
            "validation_error", f"Invalid {field_name}.", 400
        )
    return value


def _farmer_id(value) -> int:
    try:
        return _positive_id(value, "Farmer session")
    except ClimateWorkflowError as exc:
        raise ClimateWorkflowError(
            "authentication_required", "Invalid Farmer session.", 401
        ) from exc


def _date(value, field_name: str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(_text(value))
    except ValueError as exc:
        raise ClimateWorkflowError(
            "validation_error",
            f"{field_name} must use YYYY-MM-DD format.",
            400,
        ) from exc


def _json_safe(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            pass
    if isinstance(value, Mapping):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(v) for v in value]
    return str(value)


def _month_add(base: date, months: int) -> date:
    total = base.year * 12 + base.month - 1 + months
    year, month_index = divmod(total, 12)
    month = month_index + 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def _month_end(base: date) -> date:
    return date(
        base.year,
        base.month,
        calendar.monthrange(base.year, base.month)[1],
    )


def _subtract_years(base: date, years: int) -> date:
    try:
        return base.replace(year=base.year - years)
    except ValueError:
        return base.replace(year=base.year - years, day=28)


def _historical_period(historical_years, granularity: str):
    try:
        years = int(historical_years)
    except (TypeError, ValueError) as exc:
        raise ClimateWorkflowError(
            "validation_error",
            "Historical period must be 1, 3, or 5 years.",
            400,
        ) from exc

    if years not in VALID_HISTORY_YEARS:
        raise ClimateWorkflowError(
            "validation_error",
            "Historical period must be 1, 3, or 5 years.",
            400,
        )

    today = timezone.localdate()

    if granularity == "weekly":
        # Last complete Monday-Sunday week.
        end = today - timedelta(days=today.weekday() + 1)
    elif granularity == "monthly":
        end = date(today.year, today.month, 1) - timedelta(days=1)
    else:
        raise ClimateWorkflowError(
            "validation_error",
            "Climate granularity must be weekly or monthly.",
            400,
        )

    start = _subtract_years(end, years) + timedelta(days=1)
    return years, start, end


def _seasonal_period(issue_date: date):
    start = date(issue_date.year, issue_date.month, 1)
    end = _month_end(_month_add(start, 5))
    return start, end


def _cache_expiry(granularity: str):
    today = timezone.localdate()

    if granularity == "weekly":
        days = (7 - today.weekday()) % 7 or 7
        boundary = today + timedelta(days=days)
    else:
        boundary = _month_add(date(today.year, today.month, 1), 1)

    aware = timezone.make_aware(
        datetime.combine(boundary, datetime.min.time()),
        timezone.get_current_timezone(),
    )
    return aware + timedelta(hours=2)


def _resolve_location(
    farmer_user_id: int,
    *,
    location_source,
    farm_id=None,
    latitude=None,
    longitude=None,
    location_label=None,
):
    source = _text(location_source).lower()

    if source not in VALID_LOCATION_SOURCES:
        raise ClimateWorkflowError(
            "invalid_location_source",
            "Invalid Climate Forecast location source.",
            400,
        )

    if source == "registered_farm":
        if farm_id is None:
            raise ClimateWorkflowError(
                "farm_required", "Registered Farm is required.", 400
            )

        try:
            resolved = resolve_registered_farm_coordinates(
                farmer_user_id, farm_id
            )
        except ForecastingError as exc:
            raise ClimateWorkflowError(
                exc.code, exc.message, exc.status
            ) from exc

        return {
            "location_source": source,
            "farm_id": int(resolved["farm_id"]),
            "latitude": resolved["latitude"],
            "longitude": resolved["longitude"],
            "location_label": (
                resolved.get("farm_name")
                or resolved.get("geocoded_address")
                or "Registered Farm"
            ),
            "geocoding": resolved,
        }

    try:
        normalized = normalize_forecast_coordinates(
            latitude,
            longitude,
            location_label=location_label,
        )
    except ForecastingError as exc:
        raise ClimateWorkflowError(
            exc.code, exc.message, exc.status
        ) from exc

    return {
        "location_source": source,
        "farm_id": None,
        **normalized,
    }


def _fresh_cache(
    *,
    dataset_code,
    data_kind,
    location,
    start_date,
    end_date,
    granularity,
    forecast_issue_date=None,
):
    try:
        return get_fresh_climate_cache_payload(
            provider_code=CLIMATE_PROVIDER_CODE,
            dataset_code=dataset_code,
            data_kind=data_kind,
            latitude=location["latitude"],
            longitude=location["longitude"],
            requested_start_date=start_date,
            requested_end_date=end_date,
            granularity=granularity,
            variable_codes=CLIMATE_VARIABLES,
            forecast_issue_date=forecast_issue_date,
        )
    except ForecastingError as exc:
        raise ClimateWorkflowError(
            exc.code, exc.message, exc.status
        ) from exc


def _insert_fetch(
    *,
    dataset_code,
    data_kind,
    location,
    start_date,
    end_date,
    granularity,
    forecast_issue_date=None,
):
    variable_key = ",".join(sorted(CLIMATE_VARIABLES))

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO climate_api_fetches (
                        provider_code, dataset_code, data_kind,
                        latitude, longitude, location_label,
                        requested_start_date, requested_end_date,
                        forecast_issue_date, granularity,
                        variable_set_key, fetch_status
                    )
                    VALUES (
                        %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'pending'
                    )
                    RETURNING climate_fetch_id
                    """,
                    [
                        CLIMATE_PROVIDER_CODE,
                        dataset_code,
                        data_kind,
                        location["latitude"],
                        location["longitude"],
                        location.get("location_label") or None,
                        start_date,
                        end_date,
                        forecast_issue_date,
                        granularity,
                        variable_key,
                    ],
                )
                return int(cursor.fetchone()[0])
    except IntegrityError as exc:
        raise ClimateWorkflowError(
            "climate_fetch_conflict",
            (
                "An identical climate request is already cached "
                "or being processed. Please retry."
            ),
            409,
        ) from exc


def _save_fetch_success(
    fetch_id: int,
    *,
    points: Sequence[Mapping],
    granularity: str,
    provider_metadata: Mapping,
):
    with transaction.atomic():
        with connection.cursor() as cursor:
            if points:
                # A single batched INSERT instead of one round
                # trip per point — historical runs can carry
                # hundreds of points (weekly x years x variables).
                execute_values(
                    cursor,
                    """
                    INSERT INTO climate_data_points (
                        climate_fetch_id, variable_code,
                        source_variable_name, period_start,
                        period_end, value, unit_code,
                        aggregation_method, quality_metadata
                    )
                    VALUES %s
                    """,
                    [
                        (
                            fetch_id,
                            point["variable_code"],
                            point.get("source_variable_name"),
                            point["period_start"],
                            point["period_end"],
                            point["value"],
                            point["unit_code"],
                            point["aggregation_method"],
                            Json(_json_safe(
                                point.get("quality_metadata", {})
                            )),
                        )
                        for point in points
                    ],
                )

            cursor.execute(
                """
                UPDATE climate_api_fetches
                SET
                    fetch_status = 'success',
                    completed_at = CURRENT_TIMESTAMP,
                    expires_at = %s,
                    error_message = NULL,
                    provider_metadata = %s
                WHERE climate_fetch_id = %s
                """,
                [
                    _cache_expiry(granularity),
                    Json(_json_safe(provider_metadata)),
                    fetch_id,
                ],
            )


def _save_fetch_failure(fetch_id: int, message):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE climate_api_fetches
            SET
                fetch_status = 'failed',
                completed_at = CURRENT_TIMESTAMP,
                expires_at = NULL,
                error_message = %s
            WHERE climate_fetch_id = %s
            """,
            [_text(message)[:4000], fetch_id],
        )


def _run_climate_task(func, /, **kwargs):
    """
    Run a climate-fetch function on a worker thread and close its
    thread-local DB connection afterward. ThreadPoolExecutor
    spawns fresh threads per call here (short-lived, per-request
    pool), and each thread that touches the Django ORM opens its
    own connection — without an explicit close, those leak until
    the process reaps idle connections.
    """

    try:
        return func(**kwargs)
    finally:
        connection.close()


def _historical_climate(
    *,
    location,
    start_date,
    end_date,
    granularity,
):
    dataset = historical_dataset_code()

    cached = _fresh_cache(
        dataset_code=dataset,
        data_kind="historical",
        location=location,
        start_date=start_date,
        end_date=end_date,
        granularity=granularity,
    )

    if cached["cache_hit"]:
        return {
            "fetch_id": int(cached["fetch"]["climate_fetch_id"]),
            "points": cached["points"],
            "cache_hit": True,
        }

    fetch_id = _insert_fetch(
        dataset_code=dataset,
        data_kind="historical",
        location=location,
        start_date=start_date,
        end_date=end_date,
        granularity=granularity,
    )

    base_latitude = location["latitude"]
    base_longitude = location["longitude"]

    last_error = None

    # ERA5-Land only has data over land. If the exact requested
    # point snaps to a masked (water) grid cell, every variable
    # comes back all-NaN. Retry at neighboring grid points (full
    # 0.1 degree steps — smaller nudges snap back to the same
    # cell) before giving up. Any other failure (auth, malformed
    # download, genuine parsing error) is not retried.
    for lat_offset, lon_offset in historical_land_nudge_offsets():

        attempt_latitude = clamp_latitude(base_latitude + lat_offset)
        attempt_longitude = clamp_longitude(base_longitude + lon_offset)

        try:
            with tempfile.TemporaryDirectory(
                prefix="grainrise_era5_"
            ) as directory:
                target = Path(directory) / "historical.zip"

                metadata = retrieve_historical_timeseries(
                    latitude=attempt_latitude,
                    longitude=attempt_longitude,
                    start_date=start_date,
                    end_date=end_date,
                    variable_codes=CLIMATE_VARIABLES,
                    output_path=target,
                )

                points = normalize_historical_archive(
                    metadata["output_path"],
                    granularity=granularity,
                    requested_variables=CLIMATE_VARIABLES,
                )

            if lat_offset != 0 or lon_offset != 0:
                metadata["land_nudge_applied"] = {
                    "requested_latitude": float(base_latitude),
                    "requested_longitude": float(base_longitude),
                    "used_latitude": float(attempt_latitude),
                    "used_longitude": float(attempt_longitude),
                    "latitude_offset_degrees": float(lat_offset),
                    "longitude_offset_degrees": float(lon_offset),
                }

            _save_fetch_success(
                fetch_id,
                points=points,
                granularity=granularity,
                provider_metadata=metadata,
            )

            return {
                "fetch_id": fetch_id,
                "points": points,
                "cache_hit": False,
            }

        except ClimateNormalizationError as exc:
            last_error = exc

            if exc.code != CLIMATE_LOCATION_NO_LAND_DATA_CODE:
                # A genuine parsing/structural failure — retrying
                # at a different point won't fix this.
                break

            continue

        except CopernicusProviderError as exc:
            # Retrieval-level failures (auth, quota, malformed
            # download) are not location-dependent — don't retry.
            last_error = exc
            break

    _save_fetch_failure(
        fetch_id,
        getattr(last_error, "message", str(last_error)),
    )
    raise ClimateWorkflowError(
        getattr(last_error, "code", "climate_processing_failed"),
        getattr(
            last_error,
            "message",
            "Climate data could not be processed.",
        ),
        getattr(last_error, "status", 502),
    ) from last_error


def _seasonal_climate(*, location, issue_date):
    start_date, end_date = _seasonal_period(issue_date)
    dataset = seasonal_dataset_code()

    cached = _fresh_cache(
        dataset_code=dataset,
        data_kind="forecast",
        location=location,
        start_date=start_date,
        end_date=end_date,
        granularity="monthly",
        forecast_issue_date=issue_date,
    )

    if cached["cache_hit"]:
        return {
            "fetch_id": int(cached["fetch"]["climate_fetch_id"]),
            "points": cached["points"],
            "cache_hit": True,
        }

    fetch_id = _insert_fetch(
        dataset_code=dataset,
        data_kind="forecast",
        location=location,
        start_date=start_date,
        end_date=end_date,
        granularity="monthly",
        forecast_issue_date=issue_date,
    )

    try:
        with tempfile.TemporaryDirectory(
            prefix="grainrise_seasonal_"
        ) as directory:
            target = Path(directory) / "seasonal.nc"

            metadata = retrieve_seasonal_monthly_forecast(
                latitude=location["latitude"],
                longitude=location["longitude"],
                forecast_issue_date=issue_date,
                variable_codes=CLIMATE_VARIABLES,
                output_path=target,
            )

            points = normalize_seasonal_forecast(
                metadata["output_path"],
                forecast_issue_date=issue_date,
                latitude=float(location["latitude"]),
                longitude=float(location["longitude"]),
                requested_variables=CLIMATE_VARIABLES,
            )

        _save_fetch_success(
            fetch_id,
            points=points,
            granularity="monthly",
            provider_metadata=metadata,
        )

        return {
            "fetch_id": fetch_id,
            "points": points,
            "cache_hit": False,
        }

    except (
        CopernicusProviderError,
        ClimateNormalizationError,
    ) as exc:
        _save_fetch_failure(
            fetch_id,
            getattr(exc, "message", str(exc)),
        )
        raise ClimateWorkflowError(
            getattr(exc, "code", "climate_processing_failed"),
            getattr(
                exc,
                "message",
                "Climate data could not be processed.",
            ),
            getattr(exc, "status", 502),
        ) from exc


def _create_run(
    farmer_user_id,
    *,
    location,
    historical_years,
    granularity,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO farmer_climate_forecast_runs (
                farmer_user_id, location_source, farm_id,
                latitude, longitude, location_label,
                historical_years, display_granularity,
                forecast_horizon_months, run_status, started_at
            )
            VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,6,
                'processing', CURRENT_TIMESTAMP
            )
            RETURNING climate_forecast_run_id
            """,
            [
                farmer_user_id,
                location["location_source"],
                location.get("farm_id"),
                location["latitude"],
                location["longitude"],
                location["location_label"],
                historical_years,
                granularity,
            ],
        )
        return int(cursor.fetchone()[0])


def _complete_run(
    run_id,
    *,
    historical_fetch_id,
    forecast_fetch_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE farmer_climate_forecast_runs
            SET
                historical_fetch_id = %s,
                forecast_fetch_id = %s,
                run_status = 'completed',
                completed_at = CURRENT_TIMESTAMP,
                failure_message = NULL
            WHERE climate_forecast_run_id = %s
            """,
            [historical_fetch_id, forecast_fetch_id, run_id],
        )


def _fail_run(run_id, message):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE farmer_climate_forecast_runs
            SET
                run_status = 'failed',
                completed_at = CURRENT_TIMESTAMP,
                failure_message = %s
            WHERE climate_forecast_run_id = %s
            """,
            [_text(message)[:4000], run_id],
        )


def generate_farmer_climate_forecast(
    farmer_user_id,
    *,
    location_source,
    historical_years,
    display_granularity,
    farm_id=None,
    latitude=None,
    longitude=None,
    location_label=None,
    forecast_issue_date=None,
):
    """
    End-to-end Farmer Climate Forecast workflow.

    Direct CDS values are weather/climate only. GrainRise does
    not claim actual soil health. Possible soil/land implications
    belong to the later grounded AI interpretation layer.
    """

    farmer_id = _farmer_id(farmer_user_id)
    granularity = _text(display_granularity).lower()

    years, history_start, history_end = _historical_period(
        historical_years,
        granularity,
    )

    today = timezone.localdate()
    issue_date = (
        _date(forecast_issue_date, "Forecast issue date")
        if forecast_issue_date
        else date(today.year, today.month, 1)
    )

    location = _resolve_location(
        farmer_id,
        location_source=location_source,
        farm_id=farm_id,
        latitude=latitude,
        longitude=longitude,
        location_label=location_label,
    )

    run_id = _create_run(
        farmer_id,
        location=location,
        historical_years=years,
        granularity=granularity,
    )

    try:
        # Historical and seasonal are independent CDS downloads.
        # Each one blocks on Copernicus's own queue (often tens
        # of seconds to minutes), so running them concurrently
        # roughly halves the total wait instead of paying both
        # queue times back-to-back.
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            historical_future = executor.submit(
                _run_climate_task,
                _historical_climate,
                location=location,
                start_date=history_start,
                end_date=history_end,
                granularity=granularity,
            )
            forecast_future = executor.submit(
                _run_climate_task,
                _seasonal_climate,
                location=location,
                issue_date=issue_date,
            )

            historical = historical_future.result()
            forecast = forecast_future.result()

        _complete_run(
            run_id,
            historical_fetch_id=historical["fetch_id"],
            forecast_fetch_id=forecast["fetch_id"],
        )

        return {
            "climate_forecast_run_id": run_id,
            "location": location,
            "historical_years": years,
            "display_granularity": granularity,
            "historical_period": {
                "start_date": history_start,
                "end_date": history_end,
            },
            "forecast_issue_date": issue_date,
            "historical": {
                "cache_hit": historical["cache_hit"],
                "chart_data": climate_chart_payload(
                    historical["points"]
                ),
            },
            "forecast": {
                "cache_hit": forecast["cache_hit"],
                "granularity": "monthly",
                "chart_data": climate_chart_payload(
                    forecast["points"]
                ),
            },
            "soil_land_note": (
                "GrainRise does not measure actual soil health. "
                "Possible land/soil implications are AI "
                "interpretations based on climate patterns and "
                "approved Learning Materials."
            ),
        }

    except Exception as exc:
        _fail_run(
            run_id,
            getattr(exc, "message", str(exc)),
        )
        raise