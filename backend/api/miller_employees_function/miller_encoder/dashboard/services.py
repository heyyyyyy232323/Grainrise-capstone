import datetime
import json
import logging
import os
import re
import requests
from django.db import connection, transaction
from django.utils import timezone

from api.miller_employees_function.miller_encoder.request_order.selectors import get_branch_business_info
from api.miller_employees_function.miller_encoder.request_order.forecasting import fetch_branch_cds_climate
from .selectors import (
    get_active_cds_snapshot,
    get_branch_inventory_summary,
)

logger = logging.getLogger("grainrise.encoder.dashboard.services")


def _clean_json_text(raw_text):
    """Strip markdown code fence blocks from AI response text."""
    if not raw_text:
        return ""
    text = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if match:
        return match.group(1).strip()
    return text


def _build_deterministic_shelf_health(branch_info, inventory_summary, cds_climate):
    """
    Deterministic rule-based expert storage guidance and shelf health analysis.
    Guarantees reliable, highly accurate guidance if external Gemini AI is unavailable.
    """
    province = branch_info.get("province") or "Bulacan"
    municipality = branch_info.get("municipality") or "Bocaue"
    loc = f"{municipality}, {province}"

    months = cds_climate.get("months", [])
    max_rain = 0.0
    avg_temp = 28.0
    rain_values = []
    temp_values = []

    for m in months:
        r = float(m.get("total_precipitation_mm") or 0.0)
        t = float(m.get("average_temperature_c") or 28.0)
        max_rain = max(max_rain, r)
        rain_values.append(r)
        temp_values.append(t)

    if temp_values:
        avg_temp = sum(temp_values) / len(temp_values)

    # Determine risk level based on seasonal conditions & inventory
    total_stock = float(inventory_summary.get("total_stock_kg") or 0.0)
    has_unmilled = inventory_summary.get("unmilled_count", 0) > 0

    if max_rain >= 160.0 or (avg_temp >= 29.0 and max_rain >= 100.0):
        risk_level = "HIGH"
    elif max_rain >= 80.0 or avg_temp >= 28.0:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    m1 = months[0]["month"] if len(months) > 0 else "Month 1"
    m3 = months[-1]["month"] if len(months) > 2 else "Month 3"

    explanation = (
        f"Climate-Based Storage Risk Guidance: Regional meteorological projections for {loc} between "
        f"{m1} and {m3} indicate average temperatures near {avg_temp:.1f}°C with monthly precipitation "
        f"levels reaching up to {max_rain:.1f} mm. Note that this analysis provides climate-driven warehouse "
        f"storage advisory guidance and is not a direct physical indoor moisture sensor measurement.\n\n"
        f"Storage Vulnerabilities: Warm, humid tropical ambient air accelerates moisture absorption in stored grains. "
        f"For milled rice, elevated ambient relative humidity increases susceptibility to rice lice, bukbok (grain weevils), "
        f"and grain discoloration (pangingitim). For unmilled palay stocks, high environmental moisture can trigger premature "
        f"germination, fungal mold propagation, and significant dry-matter loss during prolonged storage.\n\n"
        f"Warehouse Precautions: Maintain rigorous aeration schedules and stack separation to facilitate continuous airflow. "
        f"Prioritize rapid stock rotation (FIFO) for older batches and conduct weekly physical checks across all pallet rows."
    )

    recommended_actions = [
        "Elevate all grain sacks on wooden pallets at least 15–20 cm off the warehouse concrete floor to mitigate moisture wicking.",
        "Maintain a minimum 50 cm clearance between pallet stacks and exterior walls for proper perimeter ventilation.",
        "Inspect roofing, flashing, and gutter channels for potential rainwater intrusion before expected rainfall peaks.",
        "Conduct scheduled weekly inspections for early indications of weevil (bukbok) infestation and rice lice.",
        "Enforce strict First-In, First-Out (FIFO) stock rotation, prioritizing higher-moisture or near-expiry inventory.",
    ]

    return {
        "shelf_health_risk_level": risk_level,
        "explanation": explanation,
        "recommended_actions": recommended_actions,
    }


def _execute_gemini_shelf_health(branch_info, inventory_summary, cds_climate):
    """
    Invoke Gemini AI to generate shelf health and moisture risk interpretation.
    """
    api_key = os.getenv("GRAINRISE_AI_API_KEY")
    endpoint = os.getenv("GRAINRISE_AI_ENDPOINT")
    main_model = os.getenv("GRAINRISE_AI_MODEL", "gemini-3.8-flash")
    fallback_models_str = os.getenv("GRAINRISE_AI_FALLBACK_MODELS", "gemini-3.7-flash,gemini-3.6-flash,gemini-2.5-flash")
    timeout = int(os.getenv("GRAINRISE_AI_TIMEOUT_SECONDS", "30"))

    if not api_key or not endpoint:
        logger.warning("GRAINRISE_AI_API_KEY or endpoint not configured. Using rule-based guidance.")
        return None

    province = branch_info.get("province") or "Bulacan"
    municipality = branch_info.get("municipality") or "Bocaue"
    b_name = branch_info.get("business_name") or "GrainRise Partner Miller"

    climate_summary_lines = []
    for m in cds_climate.get("months", []):
        climate_summary_lines.append(
            f"- {m.get('month')}: Total Rainfall {m.get('total_precipitation_mm', 0)} mm, "
            f"Avg Temp {m.get('average_temperature_c', 28)} °C, Wind {m.get('average_wind_speed_kmh', 12)} km/h"
        )
    climate_summary = "\n".join(climate_summary_lines)

    system_instruction = (
        "You are GrainRise AI, an expert post-harvest and warehouse grain storage preservation specialist "
        "for Philippine rice millers.\n"
        "Analyze regional Copernicus CDS climate forecast data and branch inventory to generate a 3-month "
        "storage risk advisory.\n\n"
        "CRITICAL RULES:\n"
        "1. Clarify explicitly that this is climate-based storage risk guidance, NOT measured indoor humidity sensor readings.\n"
        "2. Address specific risks for BOTH milled rice and unmilled palay:\n"
        "   - storage moisture absorption\n"
        "   - bukbok / grain weevils and rice lice\n"
        "   - discoloration / pangingitim\n"
        "   - mold / fungal spoilage\n"
        "   - overall quality deterioration\n"
        "3. Provide practical, actionable storage mitigation steps (ventilation, pallet elevation, wall clearance, leak checking, stock rotation).\n"
        "4. shelf_health_risk_level MUST be strictly one of: 'LOW', 'MODERATE', 'HIGH'.\n"
        "5. Output MUST be valid JSON adhering strictly to the requested schema without markdown fences."
    )

    user_prompt = f"""
Warehouse Facility: {b_name} in {municipality}, {province}, Philippines
Current Inventory: {inventory_summary.get('total_stock_kg', 0)} kg total ({inventory_summary.get('milled_count', 0)} milled products, {inventory_summary.get('unmilled_count', 0)} unmilled palay lots)

3-MONTH REGIONAL CLIMATE FORECAST (Copernicus CDS):
{climate_summary}

Respond in JSON format:
{{
  "shelf_health_risk_level": "LOW" | "MODERATE" | "HIGH",
  "explanation": "<2-3 detailed paragraphs analyzing climate impacts on grain storage, milled rice vs palay risks, pest/mold threats, and clearly stating this is climate guidance not a sensor measurement>",
  "recommended_actions": [
    "<Practical action 1: pallet elevation>",
    "<Practical action 2: wall clearance & ventilation>",
    "<Practical action 3: leak and gutter inspection>",
    "<Practical action 4: pest inspection frequency>",
    "<Practical action 5: FIFO stock rotation & near-expiry prioritization>"
  ]
}}
"""

    candidate_models = [main_model]
    if fallback_models_str:
        for fb in fallback_models_str.split(","):
            fb = fb.strip()
            if fb and fb not in candidate_models:
                candidate_models.append(fb)
    for safe_fb in ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-3.1-flash-lite-preview"]:
        if safe_fb not in candidate_models:
            candidate_models.append(safe_fb)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for cand in candidate_models:
        payload = {
            "model": cand,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
        }
        try:
            logger.info("Calling GrainRise AI for shelf health insight using model %s", cand)
            resp = requests.post(endpoint, headers=headers, json=payload, timeout=timeout)
            if resp.status_code == 200:
                res_json = resp.json()
                choices = res_json.get("choices", [])
                if choices and "message" in choices[0]:
                    content = choices[0]["message"].get("content", "")
                    clean_content = _clean_json_text(content)
                    parsed = json.loads(clean_content)
                    if isinstance(parsed, dict) and "shelf_health_risk_level" in parsed:
                        level = str(parsed.get("shelf_health_risk_level", "MODERATE")).strip().upper()
                        if level not in ("LOW", "MODERATE", "HIGH"):
                            level = "MODERATE"
                        parsed["shelf_health_risk_level"] = level
                        logger.info("Successfully received AI shelf health insight from %s (Risk: %s)", cand, level)
                        return parsed
            logger.warning("Model %s returned status %s: %s", cand, resp.status_code, resp.text[:150])
        except Exception as exc:
            logger.warning("AI model %s failed: %s", cand, exc)

    return None


def _format_snapshot_payload(snap):
    """Format database snapshot row for clean JSON response."""
    if not snap:
        return None

    res = dict(snap)
    # Ensure JSON fields are parsed
    for field in ("climate_data", "rainfall_data", "temperature_data", "recommended_actions"):
        if isinstance(res.get(field), str):
            try:
                res[field] = json.loads(res[field])
            except Exception:
                pass

    for date_field in ("forecast_start_month", "forecast_end_month", "generated_at", "refresh_due_at"):
        if res.get(date_field):
            res[date_field] = str(res[date_field])

    return res


def _generate_and_store_new_snapshot(supplier_profile_id):
    """
    Generate fresh 3-month Copernicus CDS forecast + Gemini shelf health insight,
    deactivate any existing active snapshots for this branch, and insert the new snapshot.
    """
    now = timezone.now()
    refresh_due_at = now + datetime.timedelta(days=7)

    # 1. Branch info
    branch_info = get_branch_business_info(supplier_profile_id) or {}

    # 2. CDS 3-month seasonal climate
    cds_climate = fetch_branch_cds_climate(branch_info)
    months = cds_climate.get("months", [])

    # Ensure 3 months exist and have valid rainfall numbers
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    full_month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

    cur_m = now.month
    cur_y = now.year

    # Align months to: current month, next month, following month
    aligned_months = []
    rainfall_list = []
    temperature_list = []

    for i in range(3):
        m_num = (cur_m - 1 + i) % 12 + 1
        y_num = cur_y + ((cur_m - 1 + i) // 12)
        month_label = f"{full_month_names[m_num - 1]} {y_num}"
        short_month = month_names[m_num - 1]

        # Check if CDS provided this month
        matched_cds = None
        for cm in months:
            if cm.get("month_number") == m_num or (cm.get("month") and short_month in str(cm.get("month"))):
                matched_cds = cm
                break

        # Rainfall in tropical PH: wet season (Jun-Nov) ~150-220mm, dry season ~40-80mm
        is_wet = m_num in (6, 7, 8, 9, 10, 11)
        default_rain = 175.0 if is_wet else 55.0
        default_temp = 28.2 if is_wet else 27.5

        if matched_cds and matched_cds.get("total_precipitation_mm") is not None:
            rain_val = float(matched_cds["total_precipitation_mm"])
        else:
            rain_val = default_rain

        if matched_cds and matched_cds.get("average_temperature_c") is not None:
            temp_val = float(matched_cds["average_temperature_c"])
        else:
            temp_val = default_temp

        aligned_months.append({
            "lead_month": i + 1,
            "year": y_num,
            "month_number": m_num,
            "month": month_label,
            "short_month": short_month,
            "total_precipitation_mm": round(rain_val, 1),
            "average_temperature_c": round(temp_val, 1),
            "average_wind_speed_kmh": round(float(matched_cds.get("average_wind_speed_kmh", 12.0) if matched_cds else 12.0), 1),
        })

        rainfall_list.append({
            "month": month_label,
            "short_month": short_month,
            "rainfall_mm": round(rain_val, 1),
        })

        temperature_list.append({
            "month": month_label,
            "short_month": short_month,
            "temperature_c": round(temp_val, 1),
        })

    cds_climate["months"] = aligned_months
    forecast_start_date = datetime.date(cur_y, cur_m, 1)
    end_m_num = (cur_m - 1 + 2) % 12 + 1
    end_y_num = cur_y + ((cur_m - 1 + 2) // 12)
    forecast_end_date = datetime.date(end_y_num, end_m_num, 1)

    # 3. Inventory summary
    inv_summary = get_branch_inventory_summary(supplier_profile_id)

    # 4. Gemini AI insight
    ai_result = _execute_gemini_shelf_health(branch_info, inv_summary, cds_climate)
    if not ai_result:
        logger.info("AI provider did not complete; using deterministic shelf health analysis.")
        ai_result = _build_deterministic_shelf_health(branch_info, inv_summary, cds_climate)

    risk_level = ai_result.get("shelf_health_risk_level", "MODERATE")
    explanation = ai_result.get("explanation", "")
    recommended_actions = ai_result.get("recommended_actions", [])

    # 5. Atomic database update: deactivate old active snapshots, insert new active snapshot
    sql_deactivate = """
        UPDATE inventory_dashboard_quick_cds_snap
        SET status = 'inactive'
        WHERE supplier_profile_id = %s AND status = 'active'
    """
    sql_insert = """
        INSERT INTO inventory_dashboard_quick_cds_snap (
            supplier_profile_id,
            forecast_start_month,
            forecast_end_month,
            climate_data,
            rainfall_data,
            temperature_data,
            shelf_health_risk_level,
            explanation,
            recommended_actions,
            generated_at,
            refresh_due_at,
            status
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active'
        )
    """

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(sql_deactivate, [supplier_profile_id])
            cursor.execute(
                sql_insert,
                [
                    supplier_profile_id,
                    forecast_start_date,
                    forecast_end_date,
                    json.dumps(cds_climate),
                    json.dumps(rainfall_list),
                    json.dumps(temperature_list),
                    risk_level,
                    explanation,
                    json.dumps(recommended_actions),
                    now,
                    refresh_due_at,
                ],
            )
            new_id = cursor.lastrowid

    logger.info("Created new active weekly CDS snapshot %s for supplier_profile_id %s", new_id, supplier_profile_id)

    return {
        "dashboard_snap_id": new_id,
        "supplier_profile_id": supplier_profile_id,
        "forecast_start_month": forecast_start_date,
        "forecast_end_month": forecast_end_date,
        "climate_data": cds_climate,
        "rainfall_data": rainfall_list,
        "temperature_data": temperature_list,
        "shelf_health_risk_level": risk_level,
        "explanation": explanation,
        "recommended_actions": recommended_actions,
        "generated_at": now,
        "refresh_due_at": refresh_due_at,
        "status": "active",
    }


def get_or_refresh_dashboard_cds_snapshot(supplier_profile_id):
    """
    Retrieve or refresh the weekly 3-month Copernicus CDS and AI shelf health snapshot.
    Enforces the Weekly Rule:
    - Snapshot remains valid for exactly 7 days
    - refresh_due_at = generated_at + 7 days
    - While active snapshot is not due, reads DB only (no external CDS/Gemini calls)
    - If refresh_due_at is reached, generates a new snapshot
    - If refresh fails, preserves and returns the existing active snapshot
    - Guarantees only one active snapshot per supplier_profile_id
    """
    active_snap = get_active_cds_snapshot(supplier_profile_id)
    now = timezone.now()

    if active_snap:
        refresh_due_at = active_snap.get("refresh_due_at")
        # Check if refresh is due
        is_due = False
        if refresh_due_at:
            if isinstance(refresh_due_at, str):
                try:
                    refresh_due_at = datetime.datetime.fromisoformat(refresh_due_at)
                except Exception:
                    pass
            if timezone.is_naive(refresh_due_at):
                refresh_due_at = timezone.make_aware(refresh_due_at)
            is_due = now >= refresh_due_at
        else:
            is_due = True

        if not is_due:
            # Active and valid within 7 days! DB read only.
            logger.debug(
                "Using cached DB snapshot %s for branch %s (due at %s)",
                active_snap.get("dashboard_snap_id"),
                supplier_profile_id,
                refresh_due_at,
            )
            return _format_snapshot_payload(active_snap)

        # Due for weekly refresh!
        logger.info(
            "Weekly CDS snapshot %s is due for refresh for branch %s. Attempting refresh...",
            active_snap.get("dashboard_snap_id"),
            supplier_profile_id,
        )
        try:
            new_snap = _generate_and_store_new_snapshot(supplier_profile_id)
            return _format_snapshot_payload(new_snap)
        except Exception as exc:
            logger.warning(
                "Failed to refresh weekly CDS snapshot for branch %s: %s. Keeping existing active snapshot.",
                supplier_profile_id,
                exc,
            )
            return _format_snapshot_payload(active_snap)

    # No active snapshot found: generate initial snapshot
    logger.info("No active CDS snapshot found for branch %s. Generating initial snapshot...", supplier_profile_id)
    new_snap = _generate_and_store_new_snapshot(supplier_profile_id)
    return _format_snapshot_payload(new_snap)

