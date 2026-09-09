"""
GrainRise Farmer Forecast AI workflow.

This module:
- validates that referenced forecast runs belong to the authenticated Farmer
- reconstructs Climate/Demand grounding context from PostgreSQL
- retrieves relevant approved Learning Materials
- retrieves relevant News context for Demand/Combined explanations
- calls ai_service.py
- stores the interpretation/Q&A audit result

Important:
AI never generates the numerical forecasts.
Possible land/soil statements are interpretations only, never measured soil facts.
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Mapping, Sequence
from django.db import connection
from psycopg2.extras import Json
from .ai_service import ForecastAIError, generate_forecast_interpretation
from .selectors import list_demand_news_articles
VALID_SCOPES = {'climate', 'demand', 'combined'}
VALID_LANGUAGES = {'en', 'fil', 'taglish'}
LEARNING_CATEGORIES = {'climate': ('climate', 'farming', 'forecasting', 'general'), 'demand': ('demand', 'market', 'forecasting', 'general'), 'combined': ('climate', 'demand', 'farming', 'market', 'forecasting', 'general')}
MAX_LEARNING_MATERIALS = 8
MAX_NEWS_ARTICLES = 12

class AIWorkflowError(Exception):

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
        raise AIWorkflowError('authentication_required', 'Invalid Farmer session.', 401) from exc
    if value <= 0:
        raise AIWorkflowError('authentication_required', 'Invalid Farmer session.', 401)
    return value

def _positive_id(value, field_name: str):
    if value in (None, ''):
        return None
    try:
        value = int(value)
    except (TypeError, ValueError) as exc:
        raise AIWorkflowError('validation_error', f'Invalid {field_name}.', 400) from exc
    if value <= 0:
        raise AIWorkflowError('validation_error', f'Invalid {field_name}.', 400)
    return value

def _scope(value) -> str:
    value = _text(value).lower()
    if value not in VALID_SCOPES:
        raise AIWorkflowError('validation_error', 'Forecast AI scope must be climate, demand, or combined.', 400)
    return value

def _language(value) -> str:
    value = _text(value).lower() or 'fil'
    if value not in VALID_LANGUAGES:
        raise AIWorkflowError('validation_error', 'Response language must be en, fil, or taglish.', 400)
    return value

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

def _row_dict(cursor, row):
    columns = [item[0] for item in cursor.description]
    return dict(zip(columns, row))

def _table_columns(table_name: str):
    with connection.cursor() as cursor:
        cursor.execute("\n            SELECT column_name\n            FROM information_schema.columns\n            WHERE table_schema = 'public'\n              AND table_name = %s\n            ORDER BY ordinal_position\n            ", [table_name])
        return {row[0] for row in cursor.fetchall()}

def _first_existing(columns, candidates):
    for candidate in candidates:
        if candidate in columns:
            return candidate
    return None

def _quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'

def _load_climate_points(fetch_id):
    if fetch_id is None:
        return []
    with connection.cursor() as cursor:
        cursor.execute('\n            SELECT\n                variable_code,\n                source_variable_name,\n                period_start,\n                period_end,\n                value,\n                unit_code,\n                aggregation_method,\n                quality_metadata\n            FROM climate_data_points\n            WHERE climate_fetch_id = %s\n            ORDER BY period_start, variable_code\n            ', [fetch_id])
        columns = [item[0] for item in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

def _compact_climate_series(points: Sequence[Mapping]):
    grouped = {}
    for point in points:
        code = _text(point.get('variable_code'))
        if not code:
            continue
        grouped.setdefault(code, []).append({'period_start': _json_safe(point.get('period_start')), 'period_end': _json_safe(point.get('period_end')), 'value': point.get('value'), 'unit': point.get('unit_code')})
    return grouped

def _load_farm_context(farmer_user_id: int, farm_id):
    if farm_id is None:
        return {}
    with connection.cursor() as cursor:
        cursor.execute('\n            SELECT\n                farm_id,\n                farm_name,\n                province,\n                municipality,\n                postal_code,\n                barangay,\n                street_address,\n                total_farm_area,\n                land_ownership_status,\n                rice_variety_currently_planted,\n                cropping_cycles_per_year,\n                farm_status\n            FROM farmer_farms\n            WHERE farm_id = %s\n              AND user_id = %s\n            LIMIT 1\n            ', [farm_id, farmer_user_id])
        row = cursor.fetchone()
        if not row:
            return {}
        return _row_dict(cursor, row)

def _load_climate_context(farmer_user_id: int, run_id: int):
    with connection.cursor() as cursor:
        cursor.execute('\n            SELECT\n                climate_forecast_run_id,\n                farmer_user_id,\n                location_source,\n                farm_id,\n                latitude,\n                longitude,\n                location_label,\n                historical_years,\n                display_granularity,\n                forecast_horizon_months,\n                historical_fetch_id,\n                forecast_fetch_id,\n                run_status,\n                started_at,\n                completed_at\n            FROM farmer_climate_forecast_runs\n            WHERE climate_forecast_run_id = %s\n              AND farmer_user_id = %s\n            LIMIT 1\n            ', [run_id, farmer_user_id])
        row = cursor.fetchone()
        if not row:
            raise AIWorkflowError('climate_forecast_not_found', 'Climate Forecast run was not found for this Farmer.', 404)
        run = _row_dict(cursor, row)
    if _text(run.get('run_status')).lower() != 'completed':
        raise AIWorkflowError('climate_forecast_not_ready', 'Climate Forecast must be completed before AI interpretation.', 409)
    historical_points = _load_climate_points(run.get('historical_fetch_id'))
    forecast_points = _load_climate_points(run.get('forecast_fetch_id'))
    if not historical_points or not forecast_points:
        raise AIWorkflowError('climate_context_incomplete', 'Climate Forecast data is incomplete.', 409)
    context = {'run_id': run['climate_forecast_run_id'], 'location': {'source': run.get('location_source'), 'label': run.get('location_label'), 'latitude': run.get('latitude'), 'longitude': run.get('longitude')}, 'historical_years': run.get('historical_years'), 'historical_granularity': run.get('display_granularity'), 'forecast_horizon_months': run.get('forecast_horizon_months'), 'historical': _compact_climate_series(historical_points), 'forecast': _compact_climate_series(forecast_points), 'interpretation_boundary': 'These are climate/weather values. GrainRise does not measure actual soil health. Any land/soil implication must be presented only as a possible interpretation grounded in climate patterns and approved Learning Materials.'}
    farm = _load_farm_context(farmer_user_id, run.get('farm_id'))
    return (context, farm)

def _load_demand_context(farmer_user_id: int, run_id: int):
    with connection.cursor() as cursor:
        cursor.execute('\n            SELECT\n                demand_forecast_run_id,\n                farmer_user_id,\n                product_type,\n                rice_variety,\n                forecast_granularity,\n                historical_start_date,\n                historical_end_date,\n                forecast_start_date,\n                forecast_end_date,\n                model_type,\n                model_version,\n                feature_snapshot,\n                forecast_output,\n                projected_total_quantity_kg,\n                demand_trend,\n                peak_period_start,\n                peak_period_end,\n                model_metrics,\n                data_status,\n                insufficient_data_reason,\n                run_status,\n                started_at,\n                completed_at\n            FROM farmer_demand_forecast_runs\n            WHERE demand_forecast_run_id = %s\n              AND farmer_user_id = %s\n            LIMIT 1\n            ', [run_id, farmer_user_id])
        row = cursor.fetchone()
        if not row:
            raise AIWorkflowError('demand_forecast_not_found', 'Demand Forecast run was not found for this Farmer.', 404)
        run = _row_dict(cursor, row)
    if _text(run.get('run_status')).lower() != 'completed':
        raise AIWorkflowError('demand_forecast_not_ready', 'Demand Forecast must be completed before AI interpretation.', 409)
    return ({'run_id': run['demand_forecast_run_id'], 'product': {'product_type': run.get('product_type'), 'rice_variety': run.get('rice_variety')}, 'granularity': run.get('forecast_granularity'), 'historical_period': {'start_date': _json_safe(run.get('historical_start_date')), 'end_date': _json_safe(run.get('historical_end_date'))}, 'forecast_period': {'start_date': _json_safe(run.get('forecast_start_date')), 'end_date': _json_safe(run.get('forecast_end_date'))}, 'model_type': run.get('model_type'), 'model_version': run.get('model_version'), 'feature_snapshot': run.get('feature_snapshot') or {}, 'forecast_output': run.get('forecast_output') or {}, 'projected_total_quantity_kg': run.get('projected_total_quantity_kg'), 'demand_trend': run.get('demand_trend'), 'peak_period_start': _json_safe(run.get('peak_period_start')), 'peak_period_end': _json_safe(run.get('peak_period_end')), 'model_metrics': run.get('model_metrics') or {}, 'data_status': run.get('data_status'), 'insufficient_data_reason': run.get('insufficient_data_reason'), 'methodology_boundary': 'The numerical Demand Forecast is produced by Time Series + Multiple Linear Regression. AI explains the result but does not generate it.'}, run)

def _learning_materials(*, scope: str, query_text=None, limit=MAX_LEARNING_MATERIALS):
    columns = _table_columns('forecast_learning_materials')
    if not columns:
        return []
    category_column = _first_existing(columns, ('category', 'category_code'))
    id_column = _first_existing(columns, ('learning_material_id', 'material_id'))
    if not id_column:
        return []
    selected = [_quote_identifier(id_column) + ' AS learning_material_id', 'title', 'summary', 'content_text', 'topic', 'source_name']
    if category_column:
        selected.append(_quote_identifier(category_column) + ' AS category_code')
    else:
        selected.append('NULL::TEXT AS category_code')
    if 'source_reference' in columns:
        selected.append('source_reference')
    elif 'reference' in columns:
        selected.append('"reference" AS source_reference')
    elif 'source_url' in columns:
        selected.append('source_url AS source_reference')
    else:
        selected.append('NULL::TEXT AS source_reference')
    filters = ["status = 'active'", 'allow_ai_retrieval = TRUE']
    params = []
    if category_column:
        filters.append(_quote_identifier(category_column) + ' = ANY(%s)')
        params.append(list(LEARNING_CATEGORIES[scope]))
    query = _text(query_text)
    order_sql = 'updated_at DESC'
    if query and 'search_vector' in columns:
        filters.append("search_vector @@ plainto_tsquery('simple', %s)")
        params.append(query)
        order_sql = "TS_RANK(search_vector, plainto_tsquery('simple', %s)) DESC, updated_at DESC"
        params.append(query)
    params.append(max(1, min(int(limit), MAX_LEARNING_MATERIALS)))
    sql = f"\n        SELECT\n            {', '.join(selected)}\n        FROM forecast_learning_materials\n        WHERE {' AND '.join(filters)}\n        ORDER BY {order_sql}\n        LIMIT %s\n    "
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        names = [item[0] for item in cursor.description]
        return [dict(zip(names, row)) for row in cursor.fetchall()]

def _news_context(demand_run: Mapping | None):
    if not demand_run:
        return []
    start_date = demand_run.get('historical_start_date')
    end_date = demand_run.get('historical_end_date')
    if not start_date or not end_date:
        return []
    return list_demand_news_articles(start_date=start_date, end_date=end_date, limit=MAX_NEWS_ARTICLES)

def _interpretation_metadata():
    table = 'farmer_forecast_ai_interpretations'
    columns = _table_columns(table)
    if not columns:
        raise AIWorkflowError('ai_table_missing', 'Forecast AI interpretation table does not exist.', 500)
    id_column = _first_existing(columns, ('ai_interpretation_id', 'forecast_ai_interpretation_id', 'interpretation_id'))
    if not id_column:
        raise AIWorkflowError('ai_table_invalid', 'Forecast AI interpretation primary identifier could not be resolved.', 500)
    error_column = _first_existing(columns, ('error_message', 'failure_message', 'generation_error'))
    return {'table': table, 'columns': columns, 'id_column': id_column, 'error_column': error_column}

def _create_interpretation(farmer_user_id: int, *, scope, climate_run_id, demand_run_id, question_text, response_language):
    meta = _interpretation_metadata()
    columns = meta['columns']
    values = {'farmer_user_id': farmer_user_id, 'interpretation_scope': scope, 'interaction_type': 'user_question' if _text(question_text) else 'automatic', 'climate_forecast_run_id': climate_run_id, 'demand_forecast_run_id': demand_run_id, 'question_text': question_text or None, 'response_language': response_language, 'generation_status': 'processing'}
    if 'started_at' in columns:
        started_at = True
    else:
        started_at = False
    usable = [key for key in values if key in columns]
    quoted_columns = [_quote_identifier(key) for key in usable]
    placeholders = ['%s' for _ in usable]
    params = [values[key] for key in usable]
    if started_at:
        quoted_columns.append('"started_at"')
        placeholders.append('CURRENT_TIMESTAMP')
    sql = f"\n        INSERT INTO {meta['table']} (\n            {', '.join(quoted_columns)}\n        )\n        VALUES (\n            {', '.join(placeholders)}\n        )\n        RETURNING {_quote_identifier(meta['id_column'])}\n    "
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return (int(cursor.fetchone()[0]), meta)

def _complete_interpretation(interpretation_id: int, meta, payload: Mapping):
    columns = meta['columns']
    values = {'explanation_text': payload.get('explanation_text'), 'forecast_reason_text': payload.get('forecast_reason_text'), 'recommended_actions_text': payload.get('recommended_actions_text'), 'learning_guidance_text': payload.get('learning_guidance_text'), 'response_text': payload.get('response_text'), 'grounding_snapshot': Json(_json_safe(payload.get('grounding_snapshot', {}))), 'learning_material_ids': payload.get('learning_material_ids', []), 'ai_provider': payload.get('ai_provider'), 'ai_model': payload.get('ai_model'), 'prompt_version': payload.get('prompt_version'), 'generation_status': 'completed'}
    assignments = []
    params = []
    for column, value in values.items():
        if column not in columns:
            continue
        assignments.append(_quote_identifier(column) + ' = %s')
        params.append(value)
    if 'completed_at' in columns:
        assignments.append('"completed_at" = CURRENT_TIMESTAMP')
    if meta['error_column']:
        assignments.append(_quote_identifier(meta['error_column']) + ' = NULL')
    params.append(interpretation_id)
    sql = f"\n        UPDATE {meta['table']}\n        SET {', '.join(assignments)}\n        WHERE {_quote_identifier(meta['id_column'])} = %s\n    "
    with connection.cursor() as cursor:
        cursor.execute(sql, params)

def _fail_interpretation(interpretation_id: int, meta, message):
    columns = meta['columns']
    assignments = []
    params = []
    if 'generation_status' in columns:
        assignments.append('"generation_status" = %s')
        params.append('failed')
    if 'completed_at' in columns:
        assignments.append('"completed_at" = CURRENT_TIMESTAMP')
    if meta['error_column']:
        assignments.append(_quote_identifier(meta['error_column']) + ' = %s')
        params.append(_text(message)[:4000])
    if not assignments:
        return
    params.append(interpretation_id)
    sql = f"\n        UPDATE {meta['table']}\n        SET {', '.join(assignments)}\n        WHERE {_quote_identifier(meta['id_column'])} = %s\n    "
    with connection.cursor() as cursor:
        cursor.execute(sql, params)

def generate_farmer_forecast_ai(farmer_user_id, *, scope, climate_forecast_run_id=None, demand_forecast_run_id=None, question_text=None, response_language='fil'):
    """
    Generate a grounded Forecast interpretation or Farmer Q&A.

    The frontend provides only run IDs/question/language.
    Forecast values are reloaded server-side from Farmer-owned
    PostgreSQL rows so the client cannot substitute fake data.
    """
    farmer_id = _farmer_id(farmer_user_id)
    scope = _scope(scope)
    language = _language(response_language)
    climate_run_id = _positive_id(climate_forecast_run_id, 'Climate Forecast run')
    demand_run_id = _positive_id(demand_forecast_run_id, 'Demand Forecast run')
    if scope == 'climate' and climate_run_id is None:
        raise AIWorkflowError('climate_run_required', 'Climate Forecast run is required for Climate interpretation.', 400)
    if scope == 'demand' and demand_run_id is None:
        raise AIWorkflowError('demand_run_required', 'Demand Forecast run is required for Demand interpretation.', 400)
    if scope == 'combined' and (climate_run_id is None or demand_run_id is None):
        raise AIWorkflowError('combined_runs_required', 'Combined Insights require both Climate and Demand Forecast runs.', 400)
    climate_context = None
    demand_context = None
    farm_context = {}
    demand_run = None
    if scope in {'climate', 'combined'}:
        climate_context, farm_context = _load_climate_context(farmer_id, climate_run_id)
    if scope in {'demand', 'combined'}:
        demand_context, demand_run = _load_demand_context(farmer_id, demand_run_id)
    retrieval_query = _text(question_text)
    if not retrieval_query:
        if scope == 'climate':
            retrieval_query = 'rainfall temperature wind solar radiation rice farming land preparation drainage drought flood climate'
        elif scope == 'demand':
            retrieval_query = 'rice demand sales contracts market price supply demand forecasting'
        else:
            retrieval_query = 'rice farming climate rainfall drought flood market demand sales contracts planning'
    materials = _learning_materials(scope=scope, query_text=retrieval_query)
    news = _news_context(demand_run) if scope in {'demand', 'combined'} else []
    interpretation_id, interpretation_meta = _create_interpretation(farmer_id, scope=scope, climate_run_id=climate_run_id, demand_run_id=demand_run_id, question_text=_text(question_text) or None, response_language=language)
    try:
        result = generate_forecast_interpretation(scope=scope, response_language=language, farm_context=farm_context, climate_context=climate_context, demand_context=demand_context, learning_materials=materials, news_articles=news, question_text=_text(question_text) or None)
        payload = result.as_dict()
        _complete_interpretation(interpretation_id, interpretation_meta, payload)
        return {'ai_interpretation_id': interpretation_id, 'scope': scope, 'interaction_type': 'user_question' if _text(question_text) else 'automatic', 'climate_forecast_run_id': climate_run_id, 'demand_forecast_run_id': demand_run_id, 'response_language': language, 'grounding_summary': {'learning_material_count': len(materials), 'news_article_count': len(news), 'has_climate_context': climate_context is not None, 'has_demand_context': demand_context is not None, 'has_farm_context': bool(farm_context)}, **payload}
    except ForecastAIError as exc:
        _fail_interpretation(interpretation_id, interpretation_meta, exc.message)
        raise AIWorkflowError(exc.code, exc.message, exc.status) from exc
    except Exception as exc:
        _fail_interpretation(interpretation_id, interpretation_meta, getattr(exc, 'message', str(exc)))
        raise
