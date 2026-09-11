from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable, Mapping, Sequence

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


MODEL_TYPE = "time_series_mlr"
MODEL_VERSION = "grainrise-demand-v2"

VALID_GRANULARITIES = {"weekly", "monthly"}

# GrainRise allows a Forecast result as soon as at least one
# completed historical period exists for the selected Farmer/product.
#
# 1-8 periods:
#     Limited-History Estimate
#
# 9+ usable periods:
#     Time Series + Multiple Linear Regression when the feature
#     matrix is sufficiently complete.
#
# The fallback is deliberately identified in feature_snapshot and
# forecast_output. It must not be presented as an MLR-generated result.
MIN_HISTORY_PERIODS = {"weekly": 1, "monthly": 1}
MLR_MIN_HISTORY_PERIODS = {"weekly": 9, "monthly": 9}
MLR_MIN_NONZERO_PERIODS = 4

LIMITED_HISTORY_METHOD = "limited_history_baseline"

DEFAULT_HORIZON_PERIODS = {"weekly": 12, "monthly": 6}
MAX_HORIZON_PERIODS = {"weekly": 26, "monthly": 12}
TREND_THRESHOLD = 0.05
EPSILON = 1e-9

# Deterministic news features. AI is intentionally not used
# to generate predictor values.
NEWS_DEMAND_POSITIVE = (
    "high demand", "strong demand", "demand increase", "demand increases",
    "demand increased", "rising demand", "higher demand",
    "increased consumption", "strong buying", "buying interest",
    "rice shortage", "supply shortage",
)
NEWS_DEMAND_NEGATIVE = (
    "low demand", "weak demand", "demand decrease", "demand decreases",
    "demand decreased", "falling demand", "lower demand",
    "declining demand", "oversupply", "over supply", "surplus", "rice glut",
)
NEWS_SUPPLY_DISRUPTION = (
    "typhoon", "flood", "flooding", "drought", "dry spell", "el nino",
    "el niño", "crop damage", "crop loss", "harvest loss",
    "production decline", "production decrease", "lower production",
    "supply disruption", "supply constraint", "supply shortage",
    "weather damage",
)
NEWS_SUPPLY_RELIEF = (
    "bumper harvest", "record harvest", "higher production",
    "production increase", "production rises", "increased output",
    "higher output", "supply increase", "increased supply", "ample supply",
)
NEWS_PRICE_POSITIVE = (
    "price increase", "prices increase", "price rises", "prices rise",
    "price hike", "higher price", "higher prices", "price surge",
    "prices surge", "price pressure",
)
NEWS_PRICE_NEGATIVE = (
    "price decrease", "prices decrease", "price falls", "prices fall",
    "lower price", "lower prices", "price decline", "prices decline",
    "price drop", "prices drop",
)
NEWS_POLICY_IMPORT = (
    "rice import", "rice imports", "importation", "import tariff",
    "rice tariff", "tariff", "import quota", "government rice",
    "rice policy", "price ceiling", "buffer stock",
    "national food authority", "nfa",
)


class DemandForecastError(Exception):
    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass(frozen=True)
class DemandForecastResult:
    data_status: str
    insufficient_data_reason: str | None
    model_type: str
    model_version: str
    feature_snapshot: dict
    forecast_output: dict
    projected_total_quantity_kg: float | None
    demand_trend: str | None
    peak_period_start: date | None
    peak_period_end: date | None
    model_metrics: dict

    def as_dict(self) -> dict:
        return {
            "data_status": self.data_status,
            "insufficient_data_reason": self.insufficient_data_reason,
            "model_type": self.model_type,
            "model_version": self.model_version,
            "feature_snapshot": self.feature_snapshot,
            "forecast_output": self.forecast_output,
            "projected_total_quantity_kg": self.projected_total_quantity_kg,
            "demand_trend": self.demand_trend,
            "peak_period_start": self.peak_period_start,
            "peak_period_end": self.peak_period_end,
            "model_metrics": self.model_metrics,
        }


def _text(value) -> str:
    return str(value or "").strip()


def _float(value, default=0.0) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return float(default)
    return result if math.isfinite(result) else float(default)


def _optional_float(value):
    if value in (None, ""):
        return np.nan
    try:
        result = float(value)
    except (TypeError, ValueError):
        return np.nan
    return result if math.isfinite(result) else np.nan


def _date(value, field_name: str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(_text(value))
    except ValueError as exc:
        raise DemandForecastError(
            "invalid_date",
            f"{field_name} must use YYYY-MM-DD format.",
            400,
        ) from exc


def _timestamp(value):
    try:
        ts = value if isinstance(value, pd.Timestamp) else pd.Timestamp(value)
    except Exception:
        return None
    if pd.isna(ts):
        return None
    if ts.tzinfo is not None:
        ts = ts.tz_convert("UTC").tz_localize(None)
    return ts


def _normalize_granularity(value) -> str:
    value = _text(value).lower()
    if value not in VALID_GRANULARITIES:
        raise DemandForecastError(
            "invalid_granularity",
            "Demand Forecast granularity must be weekly or monthly.",
            400,
        )
    return value


def _normalize_horizon(granularity: str, value) -> int:
    if value in (None, ""):
        return DEFAULT_HORIZON_PERIODS[granularity]
    try:
        horizon = int(value)
    except (TypeError, ValueError) as exc:
        raise DemandForecastError(
            "invalid_horizon", "Demand Forecast horizon is invalid.", 400
        ) from exc
    if horizon <= 0 or horizon > MAX_HORIZON_PERIODS[granularity]:
        raise DemandForecastError(
            "invalid_horizon",
            f"Allowed {granularity} horizon is 1-"
            f"{MAX_HORIZON_PERIODS[granularity]} periods.",
            400,
        )
    return horizon


def _period_start(value, granularity: str) -> pd.Timestamp:
    ts = _timestamp(value)
    if ts is None:
        raise DemandForecastError(
            "invalid_period", "Demand source contains an invalid period date.", 500
        )
    if granularity == "weekly":
        return ts.to_period("W-SUN").start_time.normalize()
    return ts.to_period("M").start_time.normalize()


def _period_end(start: pd.Timestamp, granularity: str) -> pd.Timestamp:
    if granularity == "weekly":
        return start + pd.Timedelta(days=6)
    return start.to_period("M").end_time.normalize()


def _next_period_start(start: pd.Timestamp, granularity: str) -> pd.Timestamp:
    if granularity == "weekly":
        return start + pd.Timedelta(weeks=1)
    return (start + pd.offsets.MonthBegin(1)).normalize()


def _period_sequence(start, granularity: str, count: int):
    current = _period_start(start, granularity)
    output = []
    for _ in range(count):
        output.append(current)
        current = _next_period_start(current, granularity)
    return output


def _season_number(start: pd.Timestamp, granularity: str):
    if granularity == "monthly":
        return int(start.month), 12
    return int(start.isocalendar().week), 52


def _sales_frame(rows: Sequence[Mapping], granularity: str):
    records = []
    for row in rows or ():
        records.append({
            "period_start": _period_start(row.get("period_start"), granularity),
            "pos_quantity_sold_kg": max(_float(row.get("quantity_sold_kg")), 0.0),
            "pos_transaction_count": max(_float(row.get("transaction_count")), 0.0),
            "pos_sales_day_count": max(_float(row.get("sales_day_count")), 0.0),
            "pos_weighted_price": _optional_float(
                row.get("weighted_avg_selling_price_per_kg")
            ),
        })
    if not records:
        return pd.DataFrame(columns=[
            "period_start", "pos_quantity_sold_kg", "pos_transaction_count",
            "pos_sales_day_count", "pos_weighted_price",
        ])
    return (
        pd.DataFrame(records)
        .groupby("period_start", as_index=False)
        .agg({
            "pos_quantity_sold_kg": "sum",
            "pos_transaction_count": "sum",
            "pos_sales_day_count": "sum",
            "pos_weighted_price": "mean",
        })
        .sort_values("period_start")
    )


def _contract_frame(rows: Sequence[Mapping], granularity: str):
    records = []
    for row in rows or ():
        records.append({
            "period_start": _period_start(row.get("period_start"), granularity),
            "realized_contract_quantity_kg": max(
                _float(row.get("realized_contract_quantity_kg")), 0.0
            ),
            "committed_contract_quantity_kg": max(
                _float(row.get("committed_contract_quantity_kg")), 0.0
            ),
            "at_risk_contract_quantity_kg": max(
                _float(row.get("at_risk_contract_quantity_kg")), 0.0
            ),
            "contract_weighted_price": _optional_float(
                row.get("weighted_avg_agreed_price_per_kg")
            ),
        })
    if not records:
        return pd.DataFrame(columns=[
            "period_start", "realized_contract_quantity_kg",
            "committed_contract_quantity_kg", "at_risk_contract_quantity_kg",
            "contract_weighted_price",
        ])
    return (
        pd.DataFrame(records)
        .groupby("period_start", as_index=False)
        .agg({
            "realized_contract_quantity_kg": "sum",
            "committed_contract_quantity_kg": "sum",
            "at_risk_contract_quantity_kg": "sum",
            "contract_weighted_price": "mean",
        })
        .sort_values("period_start")
    )


def _phrase_count(text: str, phrases: Iterable[str]) -> int:
    lowered = text.lower()
    total = 0
    for phrase in phrases:
        total += len(re.findall(
            r"(?<!\w)" + re.escape(phrase.lower()) + r"(?!\w)",
            lowered,
            flags=re.IGNORECASE,
        ))
    return total


def _weighted_article_text(article: Mapping):
    title = _text(article.get("title"))
    description = _text(article.get("description"))
    body = _text(article.get("article_body"))
    return (title + " ") * 3 + (description + " ") * 2 + body


def _signed_signal(text, positive_terms, negative_terms):
    raw = _phrase_count(text, positive_terms) - _phrase_count(text, negative_terms)
    return float(np.tanh(raw / 3.0))


def _unsigned_signal(text, terms):
    return float(np.tanh(_phrase_count(text, terms) / 3.0))


def score_news_article(article: Mapping) -> dict:
    text = _weighted_article_text(article)
    weight = {
        "market_updates": 1.20,
        "supply_chain": 1.15,
        "policy_regulation": 1.10,
        "weather_climate": 1.00,
        "general_agriculture": 0.85,
    }.get(_text(article.get("category_code")).lower(), 0.80)

    def bounded(value, minimum=-1.0, maximum=1.0):
        return float(np.clip(value * weight, minimum, maximum))

    return {
        "news_demand_pressure": bounded(_signed_signal(
            text, NEWS_DEMAND_POSITIVE, NEWS_DEMAND_NEGATIVE
        )),
        "news_supply_disruption": bounded(_signed_signal(
            text, NEWS_SUPPLY_DISRUPTION, NEWS_SUPPLY_RELIEF
        )),
        "news_price_pressure": bounded(_signed_signal(
            text, NEWS_PRICE_POSITIVE, NEWS_PRICE_NEGATIVE
        )),
        "news_policy_import_intensity": bounded(
            _unsigned_signal(text, NEWS_POLICY_IMPORT), 0.0, 1.0
        ),
    }


def aggregate_news_signals(
    articles: Sequence[Mapping],
    *,
    granularity: str,
):
    records = []
    for article in articles or ():
        published = _timestamp(article.get("published_at"))
        if published is None:
            continue
        records.append({
            "period_start": _period_start(published, granularity),
            "news_article_count": 1.0,
            **score_news_article(article),
        })
    columns = [
        "period_start", "news_article_count", "news_demand_pressure",
        "news_supply_disruption", "news_price_pressure",
        "news_policy_import_intensity",
    ]
    if not records:
        return pd.DataFrame(columns=columns)
    return (
        pd.DataFrame(records)
        .groupby("period_start", as_index=False)
        .agg({
            "news_article_count": "sum",
            "news_demand_pressure": "mean",
            "news_supply_disruption": "mean",
            "news_price_pressure": "mean",
            "news_policy_import_intensity": "mean",
        })
        .sort_values("period_start")
    )


def build_historical_feature_frame(
    *,
    sales_rows: Sequence[Mapping],
    contract_rows: Sequence[Mapping],
    news_articles: Sequence[Mapping],
    granularity: str,
):
    granularity = _normalize_granularity(granularity)
    sales = _sales_frame(sales_rows, granularity)
    contracts = _contract_frame(contract_rows, granularity)
    news = aggregate_news_signals(news_articles, granularity=granularity)

    starts = []
    for source in (sales, contracts):
        if not source.empty:
            starts.extend(source["period_start"].tolist())
    if not starts:
        return pd.DataFrame()

    freq = "W-MON" if granularity == "weekly" else "MS"
    frame = pd.DataFrame({
        "period_start": pd.date_range(min(starts), max(starts), freq=freq)
    })

    for source in (sales, contracts, news):
        if not source.empty:
            frame = frame.merge(source, how="left", on="period_start")

    zero_cols = (
        "pos_quantity_sold_kg", "pos_transaction_count", "pos_sales_day_count",
        "realized_contract_quantity_kg", "committed_contract_quantity_kg",
        "at_risk_contract_quantity_kg", "news_article_count",
        "news_demand_pressure", "news_supply_disruption",
        "news_price_pressure", "news_policy_import_intensity",
    )
    for col in zero_cols:
        if col not in frame:
            frame[col] = 0.0
        frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0.0)

    for col in ("pos_weighted_price", "contract_weighted_price"):
        if col not in frame:
            frame[col] = np.nan
        frame[col] = (
            pd.to_numeric(frame[col], errors="coerce")
            .ffill()
            .bfill()
            .fillna(0.0)
        )

    frame["realized_demand_kg"] = (
        frame["pos_quantity_sold_kg"] + frame["realized_contract_quantity_kg"]
    )

    pos_qty = frame["pos_quantity_sold_kg"]
    contract_qty = frame["realized_contract_quantity_kg"]
    total_qty = pos_qty + contract_qty
    weighted_value = (
        frame["pos_weighted_price"] * pos_qty
        + frame["contract_weighted_price"] * contract_qty
    )
    fallback_price = np.maximum(
        frame["pos_weighted_price"], frame["contract_weighted_price"]
    )
    frame["market_price_per_kg"] = np.where(
        total_qty > 0,
        weighted_value / np.maximum(total_qty, EPSILON),
        fallback_price,
    )
    frame["market_price_per_kg"] = (
        pd.Series(frame["market_price_per_kg"])
        .replace([np.inf, -np.inf], np.nan)
        .ffill()
        .bfill()
        .fillna(0.0)
    )

    frame = frame.sort_values("period_start").reset_index(drop=True)
    frame["time_index"] = np.arange(len(frame), dtype=float)

    season = frame["period_start"].apply(
        lambda value: _season_number(value, granularity)
    )
    frame["season_sin"] = [
        math.sin(2 * math.pi * number / length) for number, length in season
    ]
    frame["season_cos"] = [
        math.cos(2 * math.pi * number / length) for number, length in season
    ]

    frame["lag_1_demand"] = frame["realized_demand_kg"].shift(1)
    frame["lag_2_demand"] = frame["realized_demand_kg"].shift(2)
    frame["lag_3_demand"] = frame["realized_demand_kg"].shift(3)
    frame["rolling_mean_3"] = (
        frame["realized_demand_kg"]
        .shift(1)
        .rolling(window=3, min_periods=3)
        .mean()
    )
    return frame


BASE_FEATURES = (
    "lag_1_demand", "rolling_mean_3", "time_index", "season_sin", "season_cos",
)
OPTIONAL_FEATURES = (
    "lag_2_demand", "lag_3_demand", "market_price_per_kg",
    "news_demand_pressure", "news_supply_disruption",
    "news_price_pressure", "news_policy_import_intensity",
    "news_article_count",
)


def _select_features(frame):
    selected = [name for name in BASE_FEATURES if name in frame]
    optional = []
    for name in OPTIONAL_FEATURES:
        if name not in frame:
            continue
        values = pd.to_numeric(frame[name], errors="coerce").dropna()
        if len(values) >= 2 and float(values.std(ddof=0)) > EPSILON:
            optional.append(name)

    max_features = max(3, min(10, (len(frame) - 2) // 2))
    selected = (selected + optional)[:max_features]
    if len(selected) < 3:
        raise DemandForecastError(
            "insufficient_features",
            "Not enough usable Demand Forecast features.",
            422,
        )
    return selected


def _safe_r2(y_true, y_pred):
    if len(y_true) < 2 or float(np.var(y_true)) <= EPSILON:
        return None
    return float(r2_score(y_true, y_pred))


def _metrics(y_true, y_pred):
    if not len(y_true):
        return {"mae_kg": None, "rmse_kg": None, "r2": None}
    r2 = _safe_r2(y_true, y_pred)
    return {
        "mae_kg": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse_kg": round(
            float(math.sqrt(mean_squared_error(y_true, y_pred))), 4
        ),
        "r2": round(r2, 6) if r2 is not None else None,
    }


def _fit_model(history):
    model_frame = history.dropna(subset=[
        "realized_demand_kg", "lag_1_demand", "rolling_mean_3"
    ]).copy()
    features = _select_features(model_frame)
    clean = model_frame.dropna(subset=[*features, "realized_demand_kg"]).copy()

    if len(clean) < 6:
        raise DemandForecastError(
            "insufficient_model_rows",
            "Not enough complete historical periods for Time Series–MLR.",
            422,
        )

    validation_size = max(2, min(6, int(round(len(clean) * 0.20))))
    if len(clean) - validation_size < max(4, len(features) + 1):
        validation_size = 0

    validation_metrics = {"mae_kg": None, "rmse_kg": None, "r2": None}
    if validation_size:
        train = clean.iloc[:-validation_size]
        validation = clean.iloc[-validation_size:]
        eval_model = Pipeline([
            ("scale", StandardScaler()),
            ("mlr", LinearRegression()),
        ])
        eval_model.fit(train[features], train["realized_demand_kg"])
        prediction = np.maximum(eval_model.predict(validation[features]), 0.0)
        validation_metrics = _metrics(
            validation["realized_demand_kg"].to_numpy(dtype=float),
            prediction,
        )

    model = Pipeline([
        ("scale", StandardScaler()),
        ("mlr", LinearRegression()),
    ])
    model.fit(clean[features], clean["realized_demand_kg"])

    coefficients = {
        feature: round(float(value), 6)
        for feature, value in zip(
            features, model.named_steps["mlr"].coef_
        )
    }
    return {
        "model": model,
        "features": features,
        "training_frame": clean,
        "validation_size": validation_size,
        "validation_metrics": validation_metrics,
        "standardized_coefficients": coefficients,
    }


def _future_contract_lookup(rows, granularity):
    frame = _contract_frame(rows, granularity)
    if frame.empty:
        return {}
    return {
        row["period_start"]: row
        for row in frame.to_dict(orient="records")
    }


def _last_news_state(history):
    return {
        col: _float(history[col].iloc[-1]) if col in history else 0.0
        for col in (
            "news_demand_pressure", "news_supply_disruption",
            "news_price_pressure", "news_policy_import_intensity",
            "news_article_count",
        )
    }


def _recursive_forecast(
    *,
    fitted,
    history,
    future_contract_rows,
    granularity,
    forecast_start_date,
    horizon_periods,
):
    model = fitted["model"]
    features = fitted["features"]
    contract_lookup = _future_contract_lookup(
        future_contract_rows, granularity
    )
    periods = _period_sequence(
        forecast_start_date, granularity, horizon_periods
    )

    demand_history = history["realized_demand_kg"].astype(float).tolist()
    latest_news = _last_news_state(history)
    last_price = _float(history["market_price_per_kg"].iloc[-1])
    last_index = _float(history["time_index"].iloc[-1], len(history) - 1)
    output = []

    for lead, start in enumerate(periods, start=1):
        contract = contract_lookup.get(start, {})
        committed = max(
            _float(contract.get("committed_contract_quantity_kg")), 0.0
        )
        at_risk = max(
            _float(contract.get("at_risk_contract_quantity_kg")), 0.0
        )
        contract_price = _optional_float(contract.get("contract_weighted_price"))
        future_price = float(contract_price) if np.isfinite(contract_price) else last_price

        decay = 0.75 ** (lead - 1)
        news = {key: value * decay for key, value in latest_news.items()}
        season, season_length = _season_number(start, granularity)

        feature_row = {
            "lag_1_demand": demand_history[-1],
            "lag_2_demand": demand_history[-2],
            "lag_3_demand": demand_history[-3],
            "rolling_mean_3": float(np.mean(demand_history[-3:])),
            "time_index": last_index + lead,
            "season_sin": math.sin(2 * math.pi * season / season_length),
            "season_cos": math.cos(2 * math.pi * season / season_length),
            "market_price_per_kg": future_price,
            **news,
        }
        x = pd.DataFrame([{
            name: _float(feature_row.get(name))
            for name in features
        }])
        model_forecast = max(float(model.predict(x)[0]), 0.0)

        # Known active contracts become a floor, not an additive
        # term, preventing double-counting of the same demand.
        final_forecast = max(model_forecast, committed)
        demand_history.append(final_forecast)
        end = _period_end(start, granularity)

        output.append({
            "period_start": start.date(),
            "period_end": end.date(),
            "model_forecast_quantity_kg": round(model_forecast, 2),
            "committed_contract_quantity_kg": round(committed, 2),
            "at_risk_contract_quantity_kg": round(at_risk, 2),
            "forecast_quantity_kg": round(final_forecast, 2),
            "contract_floor_applied": committed > model_forecast,
            "news_signal_decay": round(decay, 6),
        })
    return output



def _limited_history_baseline(history):
    """
    Conservative fallback for Farmers with only a small amount of
    historical demand data.

    This is NOT Multiple Linear Regression.

    The estimate uses the mean of up to the latest three realized
    demand periods. When at least two recent periods exist, a very
    small linear step is allowed, capped at 20% of the baseline per
    forecast period so a tiny dataset cannot create an extreme trend.
    """
    values = (
        pd.to_numeric(
            history["realized_demand_kg"],
            errors="coerce",
        )
        .fillna(0.0)
        .clip(lower=0.0)
        .astype(float)
        .tolist()
    )

    if not values:
        return 0.0, 0.0

    recent = values[-min(3, len(values)):]
    base = max(float(np.mean(recent)), 0.0)

    if len(recent) < 2:
        return base, 0.0

    x = np.arange(len(recent), dtype=float)
    slope = float(np.polyfit(x, np.asarray(recent, dtype=float), 1)[0])

    # Keep fallback movement conservative because the history is small.
    max_step = max(base * 0.20, 1.0)
    slope = float(np.clip(slope, -max_step, max_step))

    return base, slope


def _limited_history_forecast(
    *,
    history,
    future_contract_rows,
    granularity,
    forecast_start_date,
    horizon_periods,
):
    """
    Limited-history estimate used before the Farmer has enough clean
    historical periods for Time Series + MLR.

    Active Contracts are still a known-demand floor.
    Void-requested Contracts remain at-risk only.
    News is not used as a numerical predictor in this fallback because
    there is not enough history to estimate a defensible coefficient.
    """
    contract_lookup = _future_contract_lookup(
        future_contract_rows,
        granularity,
    )

    periods = _period_sequence(
        forecast_start_date,
        granularity,
        horizon_periods,
    )

    base, slope = _limited_history_baseline(history)
    output = []

    for lead, start in enumerate(periods, start=1):
        contract = contract_lookup.get(start, {})

        committed = max(
            _float(
                contract.get("committed_contract_quantity_kg")
            ),
            0.0,
        )

        at_risk = max(
            _float(
                contract.get("at_risk_contract_quantity_kg")
            ),
            0.0,
        )

        baseline_forecast = max(
            base + (slope * lead),
            0.0,
        )

        # Same anti-double-counting rule as the full model:
        # known active Contract demand is a floor, not an additive term.
        final_forecast = max(
            baseline_forecast,
            committed,
        )

        end = _period_end(
            start,
            granularity,
        )

        output.append({
            "period_start": start.date(),
            "period_end": end.date(),
            "model_forecast_quantity_kg": round(baseline_forecast, 2),
            "committed_contract_quantity_kg": round(committed, 2),
            "at_risk_contract_quantity_kg": round(at_risk, 2),
            "forecast_quantity_kg": round(final_forecast, 2),
            "contract_floor_applied": committed > baseline_forecast,
            "news_signal_decay": 0.0,
            "forecast_method": LIMITED_HISTORY_METHOD,
        })

    return output


def _limited_history_result(
    *,
    history,
    future_contract_rows,
    granularity,
    forecast_start,
    horizon,
    product_type,
    rice_variety,
    nonzero_history_period_count,
):
    periods = _limited_history_forecast(
        history=history,
        future_contract_rows=future_contract_rows,
        granularity=granularity,
        forecast_start_date=forecast_start,
        horizon_periods=horizon,
    )

    projected_total = round(
        sum(
            _float(row.get("forecast_quantity_kg"))
            for row in periods
        ),
        2,
    )

    peak_start, peak_end = _peak(periods)

    base, slope = _limited_history_baseline(history)

    snapshot = {
        "methodology": {
            "model_type": MODEL_TYPE,
            "model_version": MODEL_VERSION,
            "forecast_mode": LIMITED_HISTORY_METHOD,
            "forecast_method_label": "Limited-History Estimate",
            "uses_time_series_mlr": False,
            "fallback_reason": (
                "The Farmer has at least one historical demand period, "
                "but not enough clean history to fit the Time Series + "
                "Multiple Linear Regression model."
            ),
            "target_definition": (
                "POS quantity sold + completed fulfilled contract quantity"
            ),
            "active_contract_treatment": (
                "Known committed demand is a forecast floor, not an additive term."
            ),
            "void_requested_treatment": (
                "Reported as at-risk demand; not guaranteed demand."
            ),
            "news_feature_method": (
                "News is preserved for context but is not used as a numerical "
                "predictor in the limited-history fallback."
            ),
        },
        "product": {
            "product_type": product_type,
            "rice_variety": rice_variety,
        },
        "granularity": granularity,
        "history_period_count": len(history),
        "nonzero_history_period_count": nonzero_history_period_count,
        "limited_history_baseline_quantity_kg": round(base, 2),
        "limited_history_step_quantity_kg": round(slope, 2),
        "selected_features": [],
        "standardized_coefficients": {},
        "historical_periods": _history_snapshot(history),
    }

    output = {
        "granularity": granularity,
        "horizon_periods": horizon,
        "forecast_mode": LIMITED_HISTORY_METHOD,
        "forecast_method_label": "Limited-History Estimate",
        "uses_time_series_mlr": False,
        "periods": [{
            **row,
            "period_start": row["period_start"].isoformat(),
            "period_end": row["period_end"].isoformat(),
        } for row in periods],
    }

    metrics = {
        "forecast_mode": LIMITED_HISTORY_METHOD,
        "training_period_count": len(history),
        "validation_period_count": 0,
        "feature_count": 0,
        "mae_kg": None,
        "rmse_kg": None,
        "r2": None,
    }

    return DemandForecastResult(
        data_status="sufficient",
        insufficient_data_reason=None,
        model_type=MODEL_TYPE,
        model_version=MODEL_VERSION,
        feature_snapshot=snapshot,
        forecast_output=output,
        projected_total_quantity_kg=projected_total,
        demand_trend=_trend(periods),
        peak_period_start=peak_start,
        peak_period_end=peak_end,
        model_metrics=metrics,
    )

def _trend(outputs):
    values = np.asarray([
        _float(row.get("forecast_quantity_kg"))
        for row in outputs
    ], dtype=float)
    if not len(values):
        return None
    if len(values) == 1:
        return "stable"
    width = max(1, len(values) // 3)
    first = float(np.mean(values[:width]))
    last = float(np.mean(values[-width:]))
    change = (last - first) / max(abs(first), 1.0)
    if change > TREND_THRESHOLD:
        return "increasing"
    if change < -TREND_THRESHOLD:
        return "decreasing"
    return "stable"


def _peak(outputs):
    if not outputs:
        return None, None
    row = max(outputs, key=lambda item: _float(item.get("forecast_quantity_kg")))
    return row.get("period_start"), row.get("period_end")


def _history_snapshot(history):
    output = []
    for row in history.to_dict(orient="records"):
        start = row["period_start"]
        output.append({
            "period_start": start.date().isoformat(),
            "pos_quantity_sold_kg": round(_float(row.get("pos_quantity_sold_kg")), 2),
            "realized_contract_quantity_kg": round(
                _float(row.get("realized_contract_quantity_kg")), 2
            ),
            "realized_demand_kg": round(_float(row.get("realized_demand_kg")), 2),
            "market_price_per_kg": round(_float(row.get("market_price_per_kg")), 2),
            "news_article_count": int(round(_float(row.get("news_article_count")))),
            "news_demand_pressure": round(
                _float(row.get("news_demand_pressure")), 6
            ),
            "news_supply_disruption": round(
                _float(row.get("news_supply_disruption")), 6
            ),
            "news_price_pressure": round(
                _float(row.get("news_price_pressure")), 6
            ),
            "news_policy_import_intensity": round(
                _float(row.get("news_policy_import_intensity")), 6
            ),
        })
    return output


def _insufficient(reason, history_period_count=0):
    return DemandForecastResult(
        data_status="insufficient",
        insufficient_data_reason=reason,
        model_type=MODEL_TYPE,
        model_version=MODEL_VERSION,
        feature_snapshot={"history_period_count": history_period_count},
        forecast_output={"periods": []},
        projected_total_quantity_kg=None,
        demand_trend=None,
        peak_period_start=None,
        peak_period_end=None,
        model_metrics={},
    )


def generate_demand_forecast(
    *,
    sales_history_rows: Sequence[Mapping],
    contract_history_rows: Sequence[Mapping],
    future_contract_rows: Sequence[Mapping],
    news_articles: Sequence[Mapping],
    granularity: str,
    forecast_start_date,
    horizon_periods=None,
    product_type: str | None = None,
    rice_variety: str | None = None,
) -> DemandForecastResult:
    """
    GrainRise adaptive Demand Forecast.

    Historical target:
        POS + completed fulfilled contract quantity.

    1-8 historical periods, or an otherwise too-small feature matrix:
        Limited-History Estimate.

    Enough clean historical data:
        Time Series + Multiple Linear Regression.

    Future active contracts:
        known-demand floor.

    Future void-requested contracts:
        at-risk signal only.

    News:
        deterministic numeric features for the full MLR path.
        AI is never used to generate predictor values.
    """
    granularity = _normalize_granularity(granularity)
    horizon = _normalize_horizon(granularity, horizon_periods)
    forecast_start = _date(
        forecast_start_date,
        "Forecast start date",
    )

    history = build_historical_feature_frame(
        sales_rows=sales_history_rows,
        contract_rows=contract_history_rows,
        news_articles=news_articles,
        granularity=granularity,
    )

    count = len(history)
    minimum = MIN_HISTORY_PERIODS[granularity]

    if history.empty:
        return _insufficient(
            "At least one historical POS or completed Contract demand "
            "period is required before GrainRise can create a Demand Forecast."
        )

    if count < minimum:
        return _insufficient(
            f"At least {minimum} {granularity} historical period is required; "
            f"only {count} is available.",
            count,
        )

    nonzero = int(
        (history["realized_demand_kg"] > 0).sum()
    )

    normalized_start = _period_start(
        forecast_start,
        granularity,
    )

    expected_next = _next_period_start(
        history["period_start"].iloc[-1],
        granularity,
    )

    if normalized_start < expected_next:
        raise DemandForecastError(
            "invalid_forecast_start",
            "Forecast start must be after the final historical demand period.",
            400,
        )

    # ========================================================
    # FULL TIME SERIES + MLR PATH
    # ========================================================
    #
    # Nine periods are the earliest practical point at which the
    # current lag/rolling feature design can potentially produce
    # the six complete model rows required by _fit_model().
    #
    # If the matrix is still unusable, GrainRise falls back to the
    # Limited-History Estimate instead of returning no forecast.
    # ========================================================

    can_attempt_mlr = (
        count >= MLR_MIN_HISTORY_PERIODS[granularity]
        and nonzero >= MLR_MIN_NONZERO_PERIODS
    )

    if can_attempt_mlr:
        try:
            fitted = _fit_model(history)
        except DemandForecastError as exc:
            if exc.status != 422:
                raise
            fitted = None

        if fitted is not None:
            periods = _recursive_forecast(
                fitted=fitted,
                history=history,
                future_contract_rows=future_contract_rows,
                granularity=granularity,
                forecast_start_date=normalized_start,
                horizon_periods=horizon,
            )

            projected_total = round(
                sum(
                    _float(row.get("forecast_quantity_kg"))
                    for row in periods
                ),
                2,
            )

            peak_start, peak_end = _peak(periods)

            snapshot = {
                "methodology": {
                    "model_type": MODEL_TYPE,
                    "model_version": MODEL_VERSION,
                    "forecast_mode": MODEL_TYPE,
                    "forecast_method_label": (
                        "Time Series + Multiple Linear Regression"
                    ),
                    "uses_time_series_mlr": True,
                    "target_definition": (
                        "POS quantity sold + completed fulfilled contract quantity"
                    ),
                    "active_contract_treatment": (
                        "Known committed demand is a forecast floor, "
                        "not an additive term."
                    ),
                    "void_requested_treatment": (
                        "Reported as at-risk demand; not guaranteed demand."
                    ),
                    "news_feature_method": (
                        "Deterministic keyword/category scoring; "
                        "AI is not a predictor."
                    ),
                },
                "product": {
                    "product_type": product_type,
                    "rice_variety": rice_variety,
                },
                "granularity": granularity,
                "history_period_count": count,
                "nonzero_history_period_count": nonzero,
                "selected_features": list(fitted["features"]),
                "standardized_coefficients": (
                    fitted["standardized_coefficients"]
                ),
                "historical_periods": _history_snapshot(history),
            }

            output = {
                "granularity": granularity,
                "horizon_periods": horizon,
                "forecast_mode": MODEL_TYPE,
                "forecast_method_label": (
                    "Time Series + Multiple Linear Regression"
                ),
                "uses_time_series_mlr": True,
                "periods": [{
                    **row,
                    "period_start": row["period_start"].isoformat(),
                    "period_end": row["period_end"].isoformat(),
                    "forecast_method": MODEL_TYPE,
                } for row in periods],
            }

            metrics = {
                "forecast_mode": MODEL_TYPE,
                "training_period_count": len(
                    fitted["training_frame"]
                ),
                "validation_period_count": fitted["validation_size"],
                "feature_count": len(fitted["features"]),
                **fitted["validation_metrics"],
            }

            return DemandForecastResult(
                data_status="sufficient",
                insufficient_data_reason=None,
                model_type=MODEL_TYPE,
                model_version=MODEL_VERSION,
                feature_snapshot=snapshot,
                forecast_output=output,
                projected_total_quantity_kg=projected_total,
                demand_trend=_trend(periods),
                peak_period_start=peak_start,
                peak_period_end=peak_end,
                model_metrics=metrics,
            )

    # ========================================================
    # LIMITED-HISTORY FALLBACK
    # ========================================================

    return _limited_history_result(
        history=history,
        future_contract_rows=future_contract_rows,
        granularity=granularity,
        forecast_start=normalized_start,
        horizon=horizon,
        product_type=product_type,
        rice_variety=rice_variety,
        nonzero_history_period_count=nonzero,
    )


def summarize_demand_sources(
    *,
    sales_history_rows: Sequence[Mapping],
    contract_history_rows: Sequence[Mapping],
    future_contract_rows: Sequence[Mapping],
    news_articles: Sequence[Mapping],
) -> dict:
    return {
        "sales_period_count": len(sales_history_rows or ()),
        "contract_history_period_count": len(contract_history_rows or ()),
        "future_contract_period_count": len(future_contract_rows or ()),
        "news_article_count": len(news_articles or ()),
    }
