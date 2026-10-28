"""
GrainRise Farmer Dashboard Selectors.
Retrieves actual database records for the Farmer Dashboard.
"""

from decimal import Decimal
from django.db import connection


def _fetchone_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def _fetchall_dict(cursor):
    if not cursor.description:
        return []
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def get_farmer_farms(farmer_user_id):
    """
    Retrieve all registered farms owned by the authenticated farmer.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fp.farm_profile_id,
                fp.farm_lot_name,
                fp.street_address,
                fp.municipality,
                fp.province,
                fp.postal_code,
                fp.total_farm_area_hectares,
                fp.land_ownership_status,
                fp.rice_variety_currently_planted,
                fp.cropping_cycles_per_year,
                fp.rsbsa_number,
                COALESCE(fs.farm_status, 'Active') AS farm_status
            FROM farm_profile fp
            LEFT JOIN existing_grainrise_farmer_farm_status fs
                ON fs.farm_profile_id = fp.farm_profile_id
            WHERE fp.user_id = %s
            ORDER BY fp.farm_profile_id ASC
            """,
            [farmer_user_id],
        )
        return _fetchall_dict(cursor)


def get_farmer_dashboard_kpis(farmer_user_id, farm_profile_id=None):
    """
    Compute the 4 primary Farmer Dashboard KPIs:
    1. available_millers: count eligible registered active millers in the system.
    2. contracted_millers: count distinct millers with active Farmer contracts.
    3. registered_harvest_area_ha: actual planted area in ha from current cycles (Planted and Growing).
    4. potential_cropping_area_ha: remaining eligible registered farm area (total - harvest area, min 0).
    """
    with connection.cursor() as cursor:
        # 1. Available Millers (active miller admins/managers with supplier profile)
        cursor.execute(
            """
            SELECT COUNT(DISTINCT sp.supplier_profile_id) AS total
            FROM supplier_profiles sp
            INNER JOIN users u ON u.user_id = sp.user_id
            WHERE u.user_role IN ('miller_admin', 'miller_manager')
              AND u.status = 'active'
            """
        )
        row = cursor.fetchone()
        available_millers = row[0] if row else 0

        # 2. Contracted Millers (distinct active contracts for this farmer)
        if farm_profile_id:
            cursor.execute(
                """
                SELECT COUNT(DISTINCT c.supplier_profile_id) AS total
                FROM existing_grainrise_farmer_contracts c
                INNER JOIN farm_profile fp ON fp.farm_profile_id = c.farm_profile_id
                WHERE fp.user_id = %s
                  AND c.farm_profile_id = %s
                  AND c.contract_status = 'Active'
                """,
                [farmer_user_id, farm_profile_id],
            )
        else:
            cursor.execute(
                """
                SELECT COUNT(DISTINCT c.supplier_profile_id) AS total
                FROM existing_grainrise_farmer_contracts c
                INNER JOIN farm_profile fp ON fp.farm_profile_id = c.farm_profile_id
                WHERE fp.user_id = %s
                  AND c.contract_status = 'Active'
                """,
                [farmer_user_id],
            )
        row = cursor.fetchone()
        contracted_millers = row[0] if row else 0

        # 3. Registered Harvest Area (ha currently planted and growing)
        if farm_profile_id:
            cursor.execute(
                """
                SELECT COALESCE(SUM(cau.planted_area_hectares), 0) AS total_ha
                FROM existing_grainrise_farmer_crop_area_usage cau
                INNER JOIN existing_grainrise_farmer_crop_cycles cc
                    ON cc.crop_cycle_id = cau.crop_cycle_id
                WHERE cau.farmer_user_id = %s
                  AND cau.farm_profile_id = %s
                  AND cc.crop_status = 'Planted and Growing'
                """,
                [farmer_user_id, farm_profile_id],
            )
        else:
            cursor.execute(
                """
                SELECT COALESCE(SUM(cau.planted_area_hectares), 0) AS total_ha
                FROM existing_grainrise_farmer_crop_area_usage cau
                INNER JOIN existing_grainrise_farmer_crop_cycles cc
                    ON cc.crop_cycle_id = cau.crop_cycle_id
                WHERE cau.farmer_user_id = %s
                  AND cc.crop_status = 'Planted and Growing'
                """,
                [farmer_user_id],
            )
        row = cursor.fetchone()
        registered_harvest_area_ha = float(row[0]) if row and row[0] is not None else 0.0

        # 4. Total registered farm area (ha)
        if farm_profile_id:
            cursor.execute(
                """
                SELECT COALESCE(SUM(total_farm_area_hectares), 0) AS total_ha
                FROM farm_profile
                WHERE user_id = %s AND farm_profile_id = %s
                """,
                [farmer_user_id, farm_profile_id],
            )
        else:
            cursor.execute(
                """
                SELECT COALESCE(SUM(total_farm_area_hectares), 0) AS total_ha
                FROM farm_profile
                WHERE user_id = %s
                """,
                [farmer_user_id],
            )
        row = cursor.fetchone()
        total_farm_area = float(row[0]) if row and row[0] is not None else 0.0

        potential_cropping_area_ha = max(0.0, round(total_farm_area - registered_harvest_area_ha, 4))

    return {
        "available_millers": available_millers,
        "contracted_millers": contracted_millers,
        "registered_harvest_area_ha": round(registered_harvest_area_ha, 2),
        "potential_cropping_area_ha": round(potential_cropping_area_ha, 2),
        "total_farm_area_ha": round(total_farm_area, 2),
    }


def get_palay_market_prices(limit=12):
    """
    Retrieve chronological official Palay market price trend data from database.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                market_price_id,
                price_date,
                rice_variety,
                market_location,
                price_category,
                price_per_kg,
                source_name,
                source_url
            FROM existing_grainrise_farmer_palay_market_prices
            ORDER BY price_date ASC, market_price_id ASC
            LIMIT %s
            """,
            [limit],
        )
        rows = _fetchall_dict(cursor)

    trend = []
    for r in rows:
        p_date = r.get("price_date")
        iso_date = p_date.isoformat() if hasattr(p_date, "isoformat") else str(p_date)
        trend.append({
            "market_price_id": r.get("market_price_id"),
            "period_start": iso_date,
            "average_price_per_kg": float(r.get("price_per_kg") or 0.0),
            "rice_variety": r.get("rice_variety"),
            "market_location": r.get("market_location"),
            "price_category": r.get("price_category"),
            "source_name": r.get("source_name"),
            "source_url": r.get("source_url"),
        })
    return trend


def get_farmer_yield_history(farmer_user_id, farm_profile_id=None, limit=10):
    """
    Retrieve historical actual yield (kg) per completed harvest cycle for this farmer.
    Excludes failed or incomplete crops.
    """
    query = """
        SELECT
            cc.crop_cycle_id,
            cc.farm_profile_id,
            fp.farm_lot_name,
            cc.cycle_number,
            cc.rice_variety,
            cc.planting_date,
            cc.actual_harvest_date,
            cc.actual_yield_kg
        FROM existing_grainrise_farmer_crop_cycles cc
        INNER JOIN farm_profile fp ON fp.farm_profile_id = cc.farm_profile_id
        WHERE fp.user_id = %s
          AND cc.crop_status = 'Harvested'
          AND cc.actual_yield_kg IS NOT NULL
          AND cc.actual_yield_kg > 0
    """
    params = [farmer_user_id]
    if farm_profile_id:
        query += " AND cc.farm_profile_id = %s"
        params.append(farm_profile_id)

    query += " ORDER BY cc.actual_harvest_date ASC, cc.crop_cycle_id ASC LIMIT %s"
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = _fetchall_dict(cursor)

    result = []
    for r in rows:
        h_date = r.get("actual_harvest_date")
        year_str = str(h_date.year) if hasattr(h_date, "year") else ""
        c_num = r.get("cycle_number") or 1
        variety = r.get("rice_variety") or "Palay"
        name = f"Cycle {c_num} ({year_str})" if year_str else f"Cycle {c_num}"

        result.append({
            "crop_cycle_id": r.get("crop_cycle_id"),
            "farm_id": r.get("farm_profile_id"),
            "farm_name": r.get("farm_lot_name") or "Farm",
            "crop_cycle_name": name,
            "rice_variety": variety,
            "actual_yield_kg": float(r.get("actual_yield_kg") or 0.0),
            "actual_harvest_date": h_date.isoformat() if hasattr(h_date, "isoformat") else str(h_date),
        })
    return result


def get_farmer_inventory_summary(farmer_user_id, farm_profile_id=None):
    """
    Retrieve on-farm active grain storage / inventory products for the farmer.
    """
    query = """
        SELECT
            p.farm_product_id,
            p.farm_profile_id,
            fp.farm_lot_name,
            p.product_code,
            p.product_type,
            p.rice_variety,
            p.product_grade,
            p.stock_quantity_kg,
            p.selling_price_per_kg,
            p.record_origin
        FROM existing_grainrise_farmer_products p
        INNER JOIN farm_profile fp ON fp.farm_profile_id = p.farm_profile_id
        WHERE fp.user_id = %s
          AND p.product_status = 'active'
    """
    params = [farmer_user_id]
    if farm_profile_id:
        query += " AND p.farm_profile_id = %s"
        params.append(farm_profile_id)

    query += " ORDER BY p.farm_product_id ASC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = _fetchall_dict(cursor)

    total_stock_kg = 0.0
    unmilled_kg = 0.0
    milled_kg = 0.0
    items = []

    for r in rows:
        qty = float(r.get("stock_quantity_kg") or 0.0)
        total_stock_kg += qty
        p_type = str(r.get("product_type") or "")
        if "Unmilled" in p_type or "Palay" in p_type:
            unmilled_kg += qty
        else:
            milled_kg += qty

        items.append({
            "product_id": r.get("farm_product_id"),
            "product_code": r.get("product_code"),
            "product_type": p_type,
            "rice_variety": r.get("rice_variety"),
            "product_grade": r.get("product_grade"),
            "stock_quantity_kg": qty,
            "farm_name": r.get("farm_lot_name"),
        })

    return {
        "total_stock_kg": total_stock_kg,
        "unmilled_stock_kg": unmilled_kg,
        "milled_stock_kg": milled_kg,
        "product_count": len(items),
        "items": items,
    }


def get_farmer_current_crop(farmer_user_id, farm_profile_id=None):
    """
    Retrieve active crop cycle details for agronomic farm health assessment.
    """
    query = """
        SELECT
            cc.crop_cycle_id,
            cc.farm_profile_id,
            fp.farm_lot_name,
            fp.municipality,
            fp.province,
            fp.total_farm_area_hectares,
            cc.cycle_number,
            cc.rice_variety,
            cc.crop_status,
            cc.land_preparation_date,
            cc.planting_date,
            cc.expected_harvest_date,
            cc.expected_yield_kg,
            cau.planted_area_hectares
        FROM existing_grainrise_farmer_crop_cycles cc
        INNER JOIN farm_profile fp ON fp.farm_profile_id = cc.farm_profile_id
        LEFT JOIN existing_grainrise_farmer_crop_area_usage cau
            ON cau.crop_cycle_id = cc.crop_cycle_id
        WHERE fp.user_id = %s
          AND cc.crop_status IN ('Land Preparation', 'Planted and Growing')
    """
    params = [farmer_user_id]
    if farm_profile_id:
        query += " AND cc.farm_profile_id = %s"
        params.append(farm_profile_id)

    query += " ORDER BY cc.crop_cycle_id DESC LIMIT 1"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        row = _fetchone_dict(cursor)

    if not row:
        return None

    return {
        "crop_cycle_id": row.get("crop_cycle_id"),
        "farm_profile_id": row.get("farm_profile_id"),
        "farm_lot_name": row.get("farm_lot_name"),
        "municipality": row.get("municipality"),
        "province": row.get("province"),
        "total_farm_area_hectares": float(row.get("total_farm_area_hectares") or 0.0),
        "cycle_number": row.get("cycle_number"),
        "rice_variety": row.get("rice_variety"),
        "crop_status": row.get("crop_status"),
        "land_preparation_date": str(row.get("land_preparation_date") or ""),
        "planting_date": str(row.get("planting_date") or ""),
        "expected_harvest_date": str(row.get("expected_harvest_date") or ""),
        "expected_yield_kg": float(row.get("expected_yield_kg") or 0.0),
        "planted_area_hectares": float(row.get("planted_area_hectares") or 0.0),
    }


def get_active_climate_snapshot(farmer_user_id, farm_profile_id=None):
    """
    Retrieve unexpired Copernicus CDS climate snapshot from database.
    """
    query = """
        SELECT
            climate_snapshot_id,
            farmer_user_id,
            farm_profile_id,
            forecast_issue_month,
            forecast_start_month,
            forecast_end_month,
            farm_location,
            latitude,
            longitude,
            climate_data,
            rainfall_data,
            temperature_data,
            data_source,
            generated_at,
            refresh_due_at
        FROM existing_grainrise_farmer_dashboard_climate_snapshots
        WHERE farmer_user_id = %s
          AND NOW() < refresh_due_at
    """
    params = [farmer_user_id]
    if farm_profile_id:
        query += " AND farm_profile_id = %s"
        params.append(farm_profile_id)

    query += " ORDER BY generated_at DESC LIMIT 1"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return _fetchone_dict(cursor)


def get_active_shelf_health_snapshot(farmer_user_id):
    """
    Retrieve unexpired 14-day AI shelf health snapshot from database.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                shelf_snapshot_id,
                farmer_user_id,
                snapshot_window_start,
                inventory_snapshot,
                climate_context,
                risk_level,
                explanation,
                recommended_actions,
                generated_at,
                refresh_due_at
            FROM existing_grainrise_farmer_dashboard_shelf_health_snapshots
            WHERE farmer_user_id = %s
              AND NOW() < refresh_due_at
            ORDER BY generated_at DESC
            LIMIT 1
            """,
            [farmer_user_id],
        )
        return _fetchone_dict(cursor)


def get_active_farm_health_snapshot(farmer_user_id, farm_profile_id=None):
    """
    Retrieve unexpired 14-day AI farm health snapshot from database.
    """
    query = """
        SELECT
            farm_health_snapshot_id,
            farmer_user_id,
            farm_profile_id,
            crop_cycle_id,
            snapshot_window_start,
            crop_cycle_snapshot,
            climate_context,
            risk_level,
            explanation,
            irrigation_advisory,
            fertilizer_advisory,
            recommended_actions,
            generated_at,
            refresh_due_at
        FROM existing_grainrise_farmer_dashboard_farm_health_snapshots
        WHERE farmer_user_id = %s
          AND NOW() < refresh_due_at
    """
    params = [farmer_user_id]
    if farm_profile_id:
        query += " AND farm_profile_id = %s"
        params.append(farm_profile_id)

    query += " ORDER BY generated_at DESC LIMIT 1"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return _fetchone_dict(cursor)
