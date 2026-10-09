import datetime
import json
from decimal import Decimal
from django.db import connection
from django.utils import timezone


def _rows_to_dicts(cursor):
    """Convert cursor results to a list of dicts."""
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    """Convert a single cursor result to a dict."""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def _compute_supplier_display_name(organization, supplier_farm, contact_person):
    """
    Determine supplier display name according to the priority:
    organization -> supplier_farm -> contact_person
    """
    org = str(organization or "").strip()
    if org:
        return org
    farm = str(supplier_farm or "").strip()
    if farm:
        return farm
    contact = str(contact_person or "").strip()
    if contact:
        return contact
    return "Unknown Supplier"


def format_readable_date(d):
    """
    Format date/datetime as: Abbreviated month, numeric day, four-digit year.
    Examples: Oct 8, 2026; Jan 5, 2027; May 2, 2026.
    """
    if not d:
        return None

    if isinstance(d, datetime.datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            clean_date_str = d.split("T")[0].split(" ")[0].strip()
            d = datetime.date.fromisoformat(clean_date_str)
        except Exception:
            return str(d)

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return f"{month_names[d.month - 1]} {d.day}, {d.year}"


def format_readable_qty(qty):
    """
    Format quantity with 'kg' suffix.
    E.g. 2300 -> '2,300 kg', 2300.5 -> '2,300.5 kg'
    """
    if qty is None:
        return None
    try:
        val = float(qty)
        if val % 1 == 0:
            return f"{int(val):,} kg"
        return f"{val:,.2f} kg"
    except (ValueError, TypeError):
        return f"{qty} kg"


def format_readable_currency(val):
    """
    Format monetary amount with Philippine Peso sign.
    E.g. 24.5 -> '₱ 24.50', 56350 -> '₱ 56,350.00'
    """
    if val is None:
        return None
    try:
        f_val = float(val)
        return f"₱ {f_val:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def _resolve_photo_url(photo_path):
    """Resolve photo path to a standard media path."""
    if not photo_path:
        return None
    trimmed = str(photo_path).strip()
    if not trimmed:
        return None

    if (
        trimmed.startswith("http://")
        or trimmed.startswith("https://")
        or trimmed.startswith("//")
        or trimmed.startswith("data:")
    ):
        return trimmed

    clean_path = trimmed.lstrip("/")
    while clean_path.startswith("media/"):
        clean_path = clean_path[6:]
    return f"/media/{clean_path}"


def _safe_json_loads(val):
    """Parse JSON value if it is string, or return as is if already dict/list."""
    if val is None:
        return None
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return None


# ============================================================
# HISTORICAL DEMAND & SALES SOURCES (Same as Encoder Request Order)
# ============================================================

def get_historical_product_demand(supplier_profile_id, product_ids):
    """
    Calculate historical demand over the last 12 months aggregated across ALL matching
    product IDs for the Product Variant + Supplier pair.
    Sources:
    1. miller_ftf_sales: quantity_sold
    2. miller_online_customer: ordered_quantity WHERE TRIM(LOWER(status)) = 'delivered'

    Aggregated monthly.
    Months with zero/no sales are EXCLUDED.
    """
    if not product_ids:
        return []

    if isinstance(product_ids, (int, str)):
        product_ids = [int(product_ids)]

    now = timezone.now()
    twelve_months_ago = (now - datetime.timedelta(days=365)).replace(day=1, hour=0, minute=0, second=0)

    placeholders = ", ".join(["%s"] * len(product_ids))

    sql_ftf = f"""
        SELECT
            DATE_FORMAT(created_at, '%%%%Y-%%%%m') AS sale_month,
            SUM(quantity_sold) AS total_sold
        FROM miller_ftf_sales
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND created_at >= %s
        GROUP BY DATE_FORMAT(created_at, '%%%%Y-%%%%m')
    """

    sql_online = f"""
        SELECT
            DATE_FORMAT(created_at, '%%%%Y-%%%%m') AS sale_month,
            SUM(ordered_quantity) AS total_sold
        FROM miller_online_customer
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND TRIM(LOWER(status)) = 'delivered'
          AND created_at >= %s
        GROUP BY DATE_FORMAT(created_at, '%%%%Y-%%%%m')
    """

    monthly_totals = {}
    params = [supplier_profile_id] + list(product_ids) + [twelve_months_ago]

    with connection.cursor() as cursor:
        cursor.execute(sql_ftf, params)
        for row in cursor.fetchall():
            m_key = row[0]
            qty = float(row[1] or 0.0)
            if qty > 0:
                monthly_totals[m_key] = monthly_totals.get(m_key, 0.0) + qty

        cursor.execute(sql_online, params)
        for row in cursor.fetchall():
            m_key = row[0]
            qty = float(row[1] or 0.0)
            if qty > 0:
                monthly_totals[m_key] = monthly_totals.get(m_key, 0.0) + qty

    sorted_months = sorted(monthly_totals.keys())
    results = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m_key in sorted_months:
        val = monthly_totals[m_key]
        if val <= 0:
            continue
        try:
            y, m = map(int, m_key.split("-"))
            label = f"{month_names[m - 1]} {y}"
            short_label = month_names[m - 1]
        except Exception:
            label = m_key
            short_label = m_key

        results.append({
            "month_key": m_key,
            "month": label,
            "short_label": short_label,
            "total_sold": round(val, 2),
        })

    return results


def get_current_month_sales(supplier_profile_id, product_ids):
    """
    Retrieve actual current-month sales aggregated across ALL matching product IDs
    for the selected Product Variant + Supplier pair.
    Sources: FTF sales + Delivered online orders.
    """
    if not product_ids:
        return {"total_actual_sales": 0.0}

    if isinstance(product_ids, (int, str)):
        product_ids = [int(product_ids)]

    now = timezone.now()
    start_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    placeholders = ", ".join(["%s"] * len(product_ids))

    sql_ftf = f"""
        SELECT SUM(quantity_sold)
        FROM miller_ftf_sales
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND created_at >= %s
    """

    sql_online = f"""
        SELECT SUM(ordered_quantity)
        FROM miller_online_customer
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND TRIM(LOWER(status)) = 'delivered'
          AND created_at >= %s
    """

    total_actual = 0.0
    params = [supplier_profile_id] + list(product_ids) + [start_of_current_month]

    with connection.cursor() as cursor:
        cursor.execute(sql_ftf, params)
        ftf_val = cursor.fetchone()[0]
        if ftf_val:
            total_actual += float(ftf_val)

        cursor.execute(sql_online, params)
        online_val = cursor.fetchone()[0]
        if online_val:
            total_actual += float(online_val)

    return {
        "total_actual_sales": round(total_actual, 2),
    }


SUPPORTED_STATUSES = [
    "requested",
    "ordered",
    "partially_received",
    "received",
    "declined",
]


def list_manager_orders(supplier_profile_id, search=None, status_filter=None, start_date=None, end_date=None):
    """
    List inbound orders for the authenticated Miller Manager's branch.
    Sort by status hierarchy:
    1. requested
    2. ordered
    3. partially_received
    4. received
    5. declined
    Within each status: created_at ASC (oldest to newest).
    """
    where_clauses = [
        "io.supplier_profile_id = %s",
        "LOWER(TRIM(REPLACE(io.status, ' ', '_'))) IN ('requested', 'ordered', 'partially_received', 'received', 'declined')",
    ]
    params = [supplier_profile_id]

    if status_filter and str(status_filter).strip().lower() != "all":
        norm_status = str(status_filter).strip().lower().replace(" ", "_")
        if norm_status in SUPPORTED_STATUSES:
            where_clauses.append("LOWER(TRIM(REPLACE(io.status, ' ', '_'))) = %s")
            params.append(norm_status)
        else:
            return []

    if search and str(search).strip():
        search_pattern = f"%{str(search).strip().lower()}%"
        where_clauses.append(
            """(
                LOWER(io.batch_no) LIKE %s OR
                LOWER(io.product_name) LIKE %s OR
                LOWER(COALESCE(fc.organization, '')) LIKE %s OR
                LOWER(COALESCE(fc.supplier_farm, '')) LIKE %s OR
                LOWER(COALESCE(fc.contact_person, '')) LIKE %s
            )"""
        )
        params.extend([search_pattern] * 5)

    if start_date and str(start_date).strip():
        where_clauses.append("DATE(io.created_at) >= %s")
        params.append(str(start_date).strip())

    if end_date and str(end_date).strip():
        where_clauses.append("DATE(io.created_at) <= %s")
        params.append(str(end_date).strip())

    where_sql = " AND ".join(where_clauses)

    sql = f"""
        SELECT
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status,
            io.created_at,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        WHERE {where_sql}
        ORDER BY
            CASE LOWER(TRIM(REPLACE(io.status, ' ', '_')))
                WHEN 'requested' THEN 1
                WHEN 'ordered' THEN 2
                WHEN 'partially_received' THEN 3
                WHEN 'received' THEN 4
                WHEN 'declined' THEN 5
                ELSE 6
            END ASC,
            io.created_at ASC,
            io.inbound_order_id ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    result = []
    for r in rows:
        supplier_display = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person"),
        )
        created_at_dt = r.get("created_at")
        date_iso = created_at_dt.strftime("%Y-%m-%d") if created_at_dt else ""
        created_at_formatted = format_readable_date(created_at_dt)
        raw_qty = float(r.get("ordered_quantity")) if r.get("ordered_quantity") is not None else 0.0
        norm_status = str(r.get("status") or "requested").lower().strip().replace(" ", "_")

        result.append({
            "id": r["inbound_order_id"],
            "inbound_order_id": r["inbound_order_id"],
            "variant": r.get("product_name") or "",
            "batch": r.get("batch_no") or "",
            "batch_no": r.get("batch_no") or "",
            "supplier": supplier_display,
            "status": norm_status,
            "qty": format_readable_qty(raw_qty),
            "ordered_quantity": raw_qty,
            "orderDate": created_at_formatted or "",
            "isoDate": date_iso,
            "created_at": created_at_dt.isoformat() if created_at_dt else None,
        })

    return result


def get_manager_order_detail(supplier_profile_id, inbound_order_id):
    """
    Retrieve comprehensive order approval details for the authenticated branch.
    Includes:
    - Inbound Order Details
    - Date Requirements (Requested By resolved via supplier_employees)
    - If status == 'requested': saved forecast support snapshot from DB,
      along with historical sales (last 12 months) and current month sales for the product variant + supplier pair.
    - If status in ('partially_received', 'received'): all receiving records from inbound_purchase_history
    - If status == 'declined': reason from miller_inbound_declined_reason
    """
    sql = """
        SELECT
            io.inbound_order_id,
            io.supplier_profile_id,
            io.farmer_contact_id,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status,
            io.created_at,
            io.updated_at,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            dr.target_arrival_date,
            dr.required_by_date,
            dr.set_by_employee_id,
            dr.adjusted_by_user_id,
            se.first_name AS set_by_first_name,
            se.last_name AS set_by_last_name
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN miller_inbound_date_requirements dr
            ON dr.inbound_order_id = io.inbound_order_id
           AND dr.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = dr.set_by_employee_id
        WHERE io.supplier_profile_id = %s
          AND io.inbound_order_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, inbound_order_id])
        order_row = _row_to_dict(cursor)

    if not order_row:
        return None

    norm_status = str(order_row.get("status") or "requested").lower().strip().replace(" ", "_")
    supplier_display = _compute_supplier_display_name(
        order_row.get("organization"),
        order_row.get("supplier_farm"),
        order_row.get("contact_person"),
    )

    requested_by = ""
    if order_row.get("set_by_first_name") or order_row.get("set_by_last_name"):
        requested_by = f"{order_row.get('set_by_first_name') or ''} {order_row.get('set_by_last_name') or ''}".strip()
    if not requested_by:
        requested_by = "Not Specified"

    raw_qty = float(order_row.get("ordered_quantity")) if order_row.get("ordered_quantity") is not None else 0.0

    detail = {
        "id": order_row["inbound_order_id"],
        "inbound_order_id": order_row["inbound_order_id"],
        "batch_no": order_row.get("batch_no") or "",
        "variant": order_row.get("product_name") or "",
        "product_name": order_row.get("product_name") or "",
        "supplier": supplier_display,
        "supplier_name": supplier_display,
        "product_description": order_row.get("product_description") or "",
        "product_photo": order_row.get("product_photo"),
        "product_photo_url": _resolve_photo_url(order_row.get("product_photo")),
        "ordered_quantity": raw_qty,
        "ordered_quantity_formatted": format_readable_qty(raw_qty),
        "expected_arrival_date": str(order_row.get("expected_arrival_date")) if order_row.get("expected_arrival_date") else "",
        "expected_arrival_date_formatted": format_readable_date(order_row.get("expected_arrival_date")) or "",
        "target_arrival_date": str(order_row.get("target_arrival_date")) if order_row.get("target_arrival_date") else "",
        "target_arrival_date_formatted": format_readable_date(order_row.get("target_arrival_date")) or "",
        "required_by_date": str(order_row.get("required_by_date")) if order_row.get("required_by_date") else "",
        "required_by_date_formatted": format_readable_date(order_row.get("required_by_date")) or "",
        "requested_by": requested_by,
        "status": norm_status,
        "created_at": order_row.get("created_at").isoformat() if order_row.get("created_at") else None,
        "created_at_formatted": format_readable_date(order_row.get("created_at")) or "",
        "historical_demand": [],
        "current_month_sales": 0.0,
    }

    # 1. DECLINED: Fetch rejection reason from miller_inbound_declined_reason
    if norm_status == "declined":
        decline_sql = """
            SELECT reason, created_at
            FROM miller_inbound_declined_reason
            WHERE inbound_order_id = %s
              AND supplier_profile_id = %s
            ORDER BY inbound_rejection_id DESC
            LIMIT 1
        """
        with connection.cursor() as cursor:
            cursor.execute(decline_sql, [inbound_order_id, supplier_profile_id])
            dec_row = _row_to_dict(cursor)

        detail["declined_reason"] = dec_row.get("reason") if dec_row else "No reason provided."
        detail["declined_at"] = format_readable_date(dec_row.get("created_at")) if dec_row else None

    # 2. PARTIALLY_RECEIVED / RECEIVED: Fetch ALL inbound_purchase_history records
    elif norm_status in ("partially_received", "received"):
        rec_sql = """
            SELECT
                iph.receiving_id,
                iph.receiving_reference_no,
                iph.total_received,
                iph.received_good,
                iph.received_bad,
                iph.price_per_kg,
                iph.total_price,
                iph.status AS payment_status,
                iph.received_by_employee_id,
                iph.paid_by_employee_id,
                TRIM(CONCAT(COALESCE(se_rec.first_name, ''), ' ', COALESCE(se_rec.last_name, ''))) AS received_by_name,
                TRIM(CONCAT(COALESCE(se_paid.first_name, ''), ' ', COALESCE(se_paid.last_name, ''))) AS paid_by_name
            FROM inbound_purchase_history iph
            LEFT JOIN supplier_employees se_rec
                ON se_rec.supplier_employee_id = iph.received_by_employee_id
            LEFT JOIN supplier_employees se_paid
                ON se_paid.supplier_employee_id = iph.paid_by_employee_id
            WHERE iph.order_id = %s
              AND iph.supplier_profile_id = %s
            ORDER BY iph.receiving_id ASC
        """
        with connection.cursor() as cursor:
            cursor.execute(rec_sql, [inbound_order_id, supplier_profile_id])
            rec_rows = _rows_to_dicts(cursor)

        total_received_sum = sum(float(r["total_received"] or 0) for r in rec_rows)
        first_payment_status = rec_rows[0]["payment_status"] if rec_rows else "Pending"
        first_paid_by = (rec_rows[0]["paid_by_name"] or "").strip() if rec_rows and (rec_rows[0]["paid_by_name"] or "").strip() else "Pending"

        records_list = []
        for r in rec_rows:
            rec_name = (r.get("received_by_name") or "").strip() or "Pending"
            good_val = float(r["received_good"]) if r.get("received_good") is not None else 0.0
            bad_val = float(r["received_bad"]) if r.get("received_bad") is not None else 0.0

            records_list.append({
                "receiving_id": r["receiving_id"],
                "reference_no": r.get("receiving_reference_no") or "—",
                "good": format_readable_qty(good_val),
                "good_raw": good_val,
                "bad": format_readable_qty(bad_val),
                "bad_raw": bad_val,
                "received_by": rec_name,
            })

        detail["procurement_receiving"] = {
            "total_received": format_readable_qty(total_received_sum),
            "total_received_raw": total_received_sum,
            "payment_status": first_payment_status or "Pending",
            "paid_by": first_paid_by,
            "records": records_list,
        }

    # 3. REQUESTED: Read saved demand forecast snapshot AS-IS + Real Sales
    elif norm_status == "requested":
        forecast_sql = """
            SELECT
                forecast_support_id,
                forecast_month,
                recommended_quantity,
                baseline_forecast_quantity,
                climate_snapshot,
                sales_competition_snapshot,
                supply_competition_snapshot,
                importation_snapshot,
                forecast_series,
                explanation,
                generated_at
            FROM miller_demand_forecasting_support_from_request_orders
            WHERE inbound_order_id = %s
              AND supplier_profile_id = %s
            LIMIT 1
        """
        with connection.cursor() as cursor:
            cursor.execute(forecast_sql, [inbound_order_id, supplier_profile_id])
            fc_row = _row_to_dict(cursor)

        # Query matching product IDs in miller_products for the product + supplier pair
        matching_product_ids = []
        farmer_contact_id = order_row.get("farmer_contact_id")
        prod_name_norm = str(order_row.get("product_name") or "").strip().lower()

        if farmer_contact_id:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT product_id
                    FROM miller_products
                    WHERE supplier_profile_id = %s
                      AND TRIM(LOWER(product_name)) = %s
                      AND farmer_contact_id = %s
                    """,
                    [supplier_profile_id, prod_name_norm, farmer_contact_id],
                )
                matching_product_ids = [row[0] for row in cursor.fetchall()]

        historical_demand = get_historical_product_demand(supplier_profile_id, matching_product_ids)
        current_sales_data = get_current_month_sales(supplier_profile_id, matching_product_ids)
        detail["historical_demand"] = historical_demand
        detail["current_month_sales"] = current_sales_data.get("total_actual_sales", 0.0)

        if fc_row:
            rec_forecast_qty = float(fc_row["recommended_quantity"]) if fc_row.get("recommended_quantity") is not None else None
            detail["forecast_support"] = {
                "forecast_support_id": fc_row["forecast_support_id"],
                "forecast_month": str(fc_row["forecast_month"]) if fc_row.get("forecast_month") else "",
                "recommended_quantity": rec_forecast_qty,
                "recommended_quantity_formatted": format_readable_qty(rec_forecast_qty),
                "next_month_forecast": rec_forecast_qty,
                "baseline_forecast_quantity": float(fc_row["baseline_forecast_quantity"]) if fc_row.get("baseline_forecast_quantity") is not None else None,
                "climate_snapshot": _safe_json_loads(fc_row.get("climate_snapshot")),
                "sales_competition_snapshot": _safe_json_loads(fc_row.get("sales_competition_snapshot")),
                "supply_competition_snapshot": _safe_json_loads(fc_row.get("supply_competition_snapshot")),
                "importation_snapshot": _safe_json_loads(fc_row.get("importation_snapshot")),
                "forecast_series": _safe_json_loads(fc_row.get("forecast_series")),
                "explanation": fc_row.get("explanation") or "",
                "generated_at": fc_row.get("generated_at").isoformat() if fc_row.get("generated_at") else None,
                "historical_demand": historical_demand,
                "current_month_sales": current_sales_data.get("total_actual_sales", 0.0),
            }
        else:
            detail["forecast_support"] = None

    return detail
