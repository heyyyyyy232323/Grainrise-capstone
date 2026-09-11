"""
GrainRise Farmer Demand Forecast workflow.

Responsibilities:
- Farmer-scoped POS, Contract, and News retrieval
- Time Series + Multiple Linear Regression orchestration
- Demand forecast run persistence
- Product option retrieval

Important:
AI is not used to generate numerical demand forecasts.
Active Contracts are treated as committed-demand floors rather
than blindly added to the model forecast.
"""

from __future__ import annotations
import calendar
from datetime import date, datetime, timedelta
from typing import Mapping, Sequence
from django.db import connection, transaction
from django.utils import timezone
from psycopg2.extras import Json
from .demand_forecast_engine import MODEL_TYPE, MODEL_VERSION, DemandForecastError, generate_demand_forecast
from .selectors import get_farmer_contract_demand_series, get_farmer_sales_demand_series, list_demand_news_articles, list_farmer_demand_products
VALID_GRANULARITIES = {'weekly', 'monthly'}
DEFAULT_HORIZON = {'weekly': 12, 'monthly': 6}
MAX_HORIZON = {'weekly': 26, 'monthly': 12}
DEFAULT_HISTORY_PERIODS = {'weekly': 52, 'monthly': 24}

class DemandWorkflowError(Exception):

    def __init__(self, code: str, message: str, status: int=500):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status

def _text(value) -> str:
    return str(value or '').strip()

def _farmer_id(value) -> int:
    try:
        value = int(value)
    except (TypeError, ValueError) as exc:
        raise DemandWorkflowError('authentication_required', 'Invalid Farmer session.', 401) from exc
    if value <= 0:
        raise DemandWorkflowError('authentication_required', 'Invalid Farmer session.', 401)
    return value

def _date(value, field_name: str) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(_text(value))
    except ValueError as exc:
        raise DemandWorkflowError('validation_error', f'{field_name} must use YYYY-MM-DD format.', 400) from exc

def _json_safe(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except Exception:
            pass
    if isinstance(value, Mapping):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    return str(value)

def _granularity(value) -> str:
    value = _text(value).lower()
    if value not in VALID_GRANULARITIES:
        raise DemandWorkflowError('validation_error', 'Demand Forecast granularity must be weekly or monthly.', 400)
    return value

def _horizon(granularity: str, value) -> int:
    if value in (None, ''):
        return DEFAULT_HORIZON[granularity]
    try:
        value = int(value)
    except (TypeError, ValueError) as exc:
        raise DemandWorkflowError('validation_error', 'Invalid Demand Forecast horizon.', 400) from exc
    if value <= 0 or value > MAX_HORIZON[granularity]:
        raise DemandWorkflowError('validation_error', f'Allowed {granularity} Demand Forecast horizon is 1-{MAX_HORIZON[granularity]} periods.', 400)
    return value

def _month_add(base: date, months: int) -> date:
    total = base.year * 12 + base.month - 1 + months
    year, month_index = divmod(total, 12)
    month = month_index + 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

def _month_end(base: date) -> date:
    return date(base.year, base.month, calendar.monthrange(base.year, base.month)[1])

def _normalize_history_end(value, granularity: str) -> date:
    if value not in (None, ''):
        return _date(value, 'Historical end date')
    today = timezone.localdate()
    if granularity == 'weekly':
        return today - timedelta(days=today.weekday() + 1)
    return date(today.year, today.month, 1) - timedelta(days=1)

def _default_history_start(end_date: date, granularity: str) -> date:
    periods = DEFAULT_HISTORY_PERIODS[granularity]
    if granularity == 'weekly':
        return end_date - timedelta(weeks=periods - 1) - timedelta(days=6)
    first_end_month = date(end_date.year, end_date.month, 1)
    return _month_add(first_end_month, -(periods - 1))

def _normalize_history_start(value, *, granularity: str, history_end: date) -> date:
    if value not in (None, ''):
        start = _date(value, 'Historical start date')
    else:
        start = _default_history_start(history_end, granularity)
    if start > history_end:
        raise DemandWorkflowError('validation_error', 'Historical start date cannot be after historical end date.', 400)
    return start

def _default_forecast_start(history_end: date, granularity: str) -> date:
    if granularity == 'weekly':
        return history_end + timedelta(days=1)
    return _month_add(date(history_end.year, history_end.month, 1), 1)

def _normalize_forecast_start(value, *, history_end: date, granularity: str) -> date:
    start = _date(value, 'Forecast start date') if value not in (None, '') else _default_forecast_start(history_end, granularity)
    if start <= history_end:
        raise DemandWorkflowError('validation_error', 'Forecast start date must be after historical end date.', 400)
    return start

def _forecast_end(start: date, granularity: str, horizon: int) -> date:
    if granularity == 'weekly':
        return start + timedelta(weeks=horizon) - timedelta(days=1)
    last_month = _month_add(date(start.year, start.month, 1), horizon - 1)
    return _month_end(last_month)

def _product_key(product_type, rice_variety):
    product = _text(product_type)
    variety = _text(rice_variety)
    if not product or not variety:
        raise DemandWorkflowError('validation_error', 'Product type and rice variety are required.', 400)
    return (product, variety)

def _validate_farmer_product(farmer_user_id: int, *, product_type, rice_variety):
    product, variety = _product_key(product_type, rice_variety)
    options = list_farmer_demand_products(farmer_user_id)
    for row in options:
        if _text(row.get('product_type')).lower() == product.lower() and _text(row.get('rice_variety')).lower() == variety.lower():
            return {'product_type': _text(row.get('product_type')), 'rice_variety': _text(row.get('rice_variety')), 'availability': row}
    raise DemandWorkflowError('demand_product_not_found', 'The selected product does not have Farmer-owned sales or Contract history.', 404)

def _create_run(farmer_user_id: int, *, product_type, rice_variety, granularity, history_start, history_end, forecast_start, forecast_end):
    with connection.cursor() as cursor:
        cursor.execute("\n            INSERT INTO farmer_demand_forecast_runs (\n                farmer_user_id,\n                product_type,\n                rice_variety,\n                forecast_granularity,\n                historical_start_date,\n                historical_end_date,\n                forecast_start_date,\n                forecast_end_date,\n                model_type,\n                model_version,\n                feature_snapshot,\n                forecast_output,\n                model_metrics,\n                data_status,\n                run_status,\n                started_at\n            )\n            VALUES (\n                %s,%s,%s,%s,%s,%s,%s,%s,\n                %s,%s,\n                '{}'::JSONB,\n                '{}'::JSONB,\n                '{}'::JSONB,\n                'insufficient',\n                'processing',\n                CURRENT_TIMESTAMP\n            )\n            RETURNING demand_forecast_run_id\n            ", [farmer_user_id, product_type, rice_variety, granularity, history_start, history_end, forecast_start, forecast_end, MODEL_TYPE, MODEL_VERSION])
        return int(cursor.fetchone()[0])

def _complete_run(run_id: int, payload: Mapping):
    with connection.cursor() as cursor:
        cursor.execute("\n            UPDATE farmer_demand_forecast_runs\n            SET\n                model_type = %s,\n                model_version = %s,\n                feature_snapshot = %s,\n                forecast_output = %s,\n                projected_total_quantity_kg = %s,\n                demand_trend = %s,\n                peak_period_start = %s,\n                peak_period_end = %s,\n                model_metrics = %s,\n                data_status = %s,\n                insufficient_data_reason = %s,\n                run_status = 'completed',\n                completed_at = CURRENT_TIMESTAMP,\n                failure_message = NULL\n            WHERE demand_forecast_run_id = %s\n            ", [payload['model_type'], payload['model_version'], Json(_json_safe(payload['feature_snapshot'])), Json(_json_safe(payload['forecast_output'])), payload.get('projected_total_quantity_kg'), payload.get('demand_trend'), payload.get('peak_period_start'), payload.get('peak_period_end'), Json(_json_safe(payload.get('model_metrics', {}))), payload['data_status'], payload.get('insufficient_data_reason'), run_id])

def _fail_run(run_id: int, message):
    with connection.cursor() as cursor:
        cursor.execute("\n            UPDATE farmer_demand_forecast_runs\n            SET\n                run_status = 'failed',\n                completed_at = CURRENT_TIMESTAMP,\n                failure_message = %s\n            WHERE demand_forecast_run_id = %s\n            ", [_text(message)[:4000], run_id])

def _load_sources(farmer_user_id: int, *, product_type, rice_variety, granularity, history_start, history_end, forecast_start, forecast_end):
    sales = get_farmer_sales_demand_series(farmer_user_id, product_type=product_type, rice_variety=rice_variety, granularity=granularity, start_date=history_start, end_date=history_end)
    contracts_history = get_farmer_contract_demand_series(farmer_user_id, product_type=product_type, rice_variety=rice_variety, granularity=granularity, start_date=history_start, end_date=history_end)
    future_contracts = get_farmer_contract_demand_series(farmer_user_id, product_type=product_type, rice_variety=rice_variety, granularity=granularity, start_date=forecast_start, end_date=forecast_end)
    news = list_demand_news_articles(start_date=history_start, end_date=history_end, limit=300)
    return {'sales_history': sales, 'contract_history': contracts_history, 'future_contracts': future_contracts, 'news_articles': news}

def generate_farmer_demand_forecast(farmer_user_id, *, product_type, rice_variety, granularity='monthly', historical_start_date=None, historical_end_date=None, forecast_start_date=None, horizon_periods=None):
    """
    End-to-end Farmer Demand Forecast workflow.

    Numerical methodology:
        Time Series + Multiple Linear Regression.

    Historical realized target:
        completed POS sales
        +
        completed/fulfilled Contract quantities.

    Future active Contracts:
        known committed-demand floor.

    News:
        deterministic structured signals.

    AI:
        intentionally not used in this numerical workflow.
    """
    farmer_id = _farmer_id(farmer_user_id)
    granularity = _granularity(granularity)
    product = _validate_farmer_product(farmer_id, product_type=product_type, rice_variety=rice_variety)
    history_end = _normalize_history_end(historical_end_date, granularity)
    history_start = _normalize_history_start(historical_start_date, granularity=granularity, history_end=history_end)
    forecast_start = _normalize_forecast_start(forecast_start_date, history_end=history_end, granularity=granularity)
    horizon = _horizon(granularity, horizon_periods)
    forecast_end = _forecast_end(forecast_start, granularity, horizon)
    sources = _load_sources(farmer_id, product_type=product['product_type'], rice_variety=product['rice_variety'], granularity=granularity, history_start=history_start, history_end=history_end, forecast_start=forecast_start, forecast_end=forecast_end)
    run_id = _create_run(farmer_id, product_type=product['product_type'], rice_variety=product['rice_variety'], granularity=granularity, history_start=history_start, history_end=history_end, forecast_start=forecast_start, forecast_end=forecast_end)
    try:
        result = generate_demand_forecast(sales_history_rows=sources['sales_history'], contract_history_rows=sources['contract_history'], future_contract_rows=sources['future_contracts'], news_articles=sources['news_articles'], granularity=granularity, forecast_start_date=forecast_start, horizon_periods=horizon, product_type=product['product_type'], rice_variety=product['rice_variety'])
        payload = result.as_dict()
        _complete_run(run_id, payload)
        return {'demand_forecast_run_id': run_id, 'product': {'product_type': product['product_type'], 'rice_variety': product['rice_variety']}, 'granularity': granularity, 'historical_period': {'start_date': history_start, 'end_date': history_end}, 'forecast_period': {'start_date': forecast_start, 'end_date': forecast_end, 'horizon_periods': horizon}, 'source_summary': {'sales_period_count': len(sources['sales_history']), 'contract_history_period_count': len(sources['contract_history']), 'future_contract_period_count': len(sources['future_contracts']), 'news_article_count': len(sources['news_articles'])}, **payload}
    except DemandForecastError as exc:
        _fail_run(run_id, exc.message)
        raise DemandWorkflowError(exc.code, exc.message, exc.status) from exc
    except Exception as exc:
        _fail_run(run_id, getattr(exc, 'message', str(exc)))
        raise

def list_farmer_demand_forecast_products(farmer_user_id):
    """
    Farmer-scoped product options for the Demand Forecast UI.
    """
    farmer_id = _farmer_id(farmer_user_id)
    return list_farmer_demand_products(farmer_id)
