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


def format_readable_currency(val):
    """Format monetary value for KPI card display."""
    if val is None:
        return "₱0"
    try:
        f_val = float(val)
        if f_val >= 1_000_000:
            return f"₱{(f_val / 1_000_000):.1f}M"
        if f_val >= 10_000:
            return f"₱{f_val:,.0f}"
        if f_val % 1 == 0:
            return f"₱{int(f_val):,}"
        return f"₱{f_val:,.2f}"
    except (ValueError, TypeError):
        return f"₱{val}"


def format_readable_date(d):
    """Format date/datetime as: Abbreviated month, numeric day, four-digit year."""
    if not d:
        return ""
    if isinstance(d, datetime.datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            clean = d.split("T")[0].split(" ")[0].strip()
            d = datetime.date.fromisoformat(clean)
        except Exception:
            return str(d)
    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return f"{month_names[d.month - 1]} {d.day}, {d.year}"


def get_encoder_dashboard_kpis(supplier_profile_id):
    """
    Compute Top KPIs for the authenticated miller encoder branch:
    1. Product Variants: distinct product variants from miller_products
    2. Inventory Value: SUM(stock_quantity * unit_cost) for relevant active inventory
    3. Low Stock Products: stock > 0 and < 200
    4. Out of Stock: stock <= 0
    """
    sql = """
        SELECT
            COUNT(DISTINCT TRIM(LOWER(product_name))) AS variant_count,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'active' THEN stock_quantity * unit_cost ELSE 0 END), 0) AS total_inventory_value,
            COUNT(CASE WHEN LOWER(status) = 'active' AND stock_quantity > 0 AND stock_quantity < 200 THEN 1 END) AS low_stock_count,
            COUNT(CASE WHEN LOWER(status) = 'active' AND stock_quantity <= 0 THEN 1 END) AS out_of_stock_count
        FROM miller_products
        WHERE supplier_profile_id = %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        row = _row_to_dict(cursor)

    variant_count = int(row.get("variant_count") or 0) if row else 0
    inv_value_raw = float(row.get("total_inventory_value") or 0.0) if row else 0.0
    low_stock_count = int(row.get("low_stock_count") or 0) if row else 0
    out_of_stock_count = int(row.get("out_of_stock_count") or 0) if row else 0

    return {
        "product_variants": {
            "title": "Product Variants",
            "value": str(variant_count),
            "footer": "Registered warehouse products",
            "tone": "neutral",
            "action_url": "/supplier-encoder/stock",
        },
        "inventory_value": {
            "title": "Inventory Value",
            "value": format_readable_currency(inv_value_raw),
            "raw_value": inv_value_raw,
            "footer": "Total warehouse inventory value",
            "tone": "success",
            "action_url": "/supplier-encoder/stock",
        },
        "low_stock_products": {
            "title": "Low Stock Products",
            "value": str(low_stock_count),
            "footer": "Products requiring restocking",
            "tone": "warning",
            "action_url": "/supplier-encoder/stock?filter=low-stock",
        },
        "out_of_stock": {
            "title": "Out of Stock",
            "value": str(out_of_stock_count),
            "footer": "Products with zero available inventory",
            "tone": "danger",
            "variant": "solid",
            "action_url": "/supplier-encoder/stock?filter=no-stock",
        },
    }


def get_inventory_status_breakdown(supplier_profile_id):
    """
    Inventory Status donut chart data:
    - In Stock: stock_quantity >= 200
    - Low Stock: 0 < stock_quantity < 200
    - Out of Stock: stock_quantity <= 0
    """
    sql = """
        SELECT
            COUNT(CASE WHEN stock_quantity >= 200 THEN 1 END) AS in_stock,
            COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity < 200 THEN 1 END) AS low_stock,
            COUNT(CASE WHEN stock_quantity <= 0 THEN 1 END) AS out_of_stock
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND LOWER(status) = 'active'
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        row = _row_to_dict(cursor)

    in_stock = int(row.get("in_stock") or 0) if row else 0
    low_stock = int(row.get("low_stock") or 0) if row else 0
    out_stock = int(row.get("out_of_stock") or 0) if row else 0

    return [
        {"label": "In Stock", "value": in_stock, "color": "#0F9D2A"},
        {"label": "Low Stock", "value": low_stock, "color": "#E0AC1C"},
        {"label": "Out of Stock", "value": out_stock, "color": "#E25E3E"},
    ]


def get_inventory_overview_distribution(supplier_profile_id):
    """
    Inventory Overview bar chart:
    Real current inventory quantities grouped by product variant.
    """
    sql = """
        SELECT
            product_name,
            COALESCE(SUM(stock_quantity), 0) AS total_qty
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND LOWER(status) = 'active'
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 8
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    return [
        {
            "label": r.get("product_name") or "Unknown",
            "value": round(float(r.get("total_qty") or 0.0), 1),
        }
        for r in rows
    ]


def get_low_stock_distribution(supplier_profile_id):
    """
    Low Stock Distributions bar chart:
    Only low-stock inventory (0 < stock < 200), grouped by product variant.
    """
    sql = """
        SELECT
            product_name,
            COALESCE(SUM(stock_quantity), 0) AS low_stock_qty
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND LOWER(status) = 'active'
          AND stock_quantity > 0
          AND stock_quantity < 200
        GROUP BY product_name
        ORDER BY low_stock_qty DESC
        LIMIT 8
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    return [
        {
            "label": r.get("product_name") or "Unknown",
            "value": round(float(r.get("low_stock_qty") or 0.0), 1),
        }
        for r in rows
    ]


def get_recent_inventory_activity(supplier_profile_id, limit=5):
    """
    Recent inventory/procurement activity for the authenticated supplier_profile_id.
    Joined with farmer_contacts.
    """
    sql = """
        SELECT
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.ordered_quantity,
            io.status,
            io.created_at,
            io.updated_at,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        WHERE io.supplier_profile_id = %s
        ORDER BY io.created_at DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, limit])
        rows = _rows_to_dicts(cursor)

    activity_items = []
    for r in rows:
        supplier_display = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person"),
        )
        status_key = str(r.get("status") or "").strip().lower()

        if status_key == "received":
            title = "Inventory Received"
            color = "#0B7A2A"
        elif status_key == "requested":
            title = "Order Requested"
            color = "#E0AC1C"
        elif status_key == "approved":
            title = "Order Approved"
            color = "#0B7A2A"
        elif status_key in ("in transit", "transit"):
            title = "Order In Transit"
            color = "#F97316"
        elif status_key == "declined":
            title = "Order Declined"
            color = "#E25E3E"
        else:
            title = f"Order {status_key.capitalize()}"
            color = "#2563EB"

        qty = float(r.get("ordered_quantity") or 0.0)
        qty_str = f"{int(qty):,} kg" if qty % 1 == 0 else f"{qty:,.1f} kg"

        created_dt = r.get("created_at")
        time_display = format_readable_date(created_dt)

        activity_items.append({
            "id": f"act-{r['inbound_order_id']}",
            "order_id": r["inbound_order_id"],
            "title": title,
            "description": f"Batch {r.get('batch_no')} ({r.get('product_name')} {qty_str}) from {supplier_display}",
            "time": time_display,
            "color": color,
            "status": r.get("status"),
        })

    return activity_items


def get_pending_order_requests(supplier_profile_id, limit=5):
    """
    Pending order requests for this supplier_profile_id where status is not received/completed.
    """
    sql_count = """
        SELECT COUNT(*) AS pending_total
        FROM inbound_order
        WHERE supplier_profile_id = %s
          AND LOWER(status) NOT IN ('received', 'completed', 'declined', 'cancelled')
    """
    sql_items = """
        SELECT
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.ordered_quantity,
            io.status,
            io.created_at,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        WHERE io.supplier_profile_id = %s
          AND LOWER(io.status) NOT IN ('received', 'completed', 'declined', 'cancelled')
        ORDER BY io.created_at DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_count, [supplier_profile_id])
        count_row = _row_to_dict(cursor)
        pending_count = int(count_row.get("pending_total") or 0) if count_row else 0

        cursor.execute(sql_items, [supplier_profile_id, limit])
        rows = _rows_to_dicts(cursor)

    items = []
    month_abbrevs = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
    for r in rows:
        supplier_display = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person"),
        )
        initials = (supplier_display[:2] if len(supplier_display) >= 2 else "GR").upper()

        dt = r.get("created_at")
        date_str = ""
        if isinstance(dt, (datetime.datetime, datetime.date)):
            date_str = f"{month_abbrevs[dt.month - 1]} {dt.day}"

        items.append({
            "id": f"req-{r['inbound_order_id']}",
            "order_id": r["inbound_order_id"],
            "batch_no": r.get("batch_no"),
            "name": supplier_display,
            "category": r.get("product_name") or "Rice Supply",
            "initials": initials,
            "date": date_str,
            "color": "#0B7A2A",
            "status": r.get("status"),
            "detailsLabel": "Details",
        })

    return {
        "pending_count": pending_count,
        "items": items,
    }


def get_branch_inventory_summary(supplier_profile_id):
    """
    Detailed inventory summary for feeding Gemini shelf health analysis.
    """
    sql = """
        SELECT
            product_id,
            product_name,
            stock_quantity,
            unit_cost,
            expiry_date,
            status,
            shelf_location
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND LOWER(status) IN ('active', 'unmilled')
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    total_stock_kg = sum(float(r.get("stock_quantity") or 0.0) for r in rows)
    unmilled_rows = [r for r in rows if str(r.get("status") or "").lower() == "unmilled"]
    active_milled_rows = [r for r in rows if str(r.get("status") or "").lower() == "active"]

    return {
        "total_stock_kg": round(total_stock_kg, 1),
        "total_active_variants": len(set(r.get("product_name") for r in rows)),
        "unmilled_count": len(unmilled_rows),
        "milled_count": len(active_milled_rows),
        "products_preview": [
            {
                "product_name": r.get("product_name"),
                "stock_quantity": float(r.get("stock_quantity") or 0.0),
                "expiry_date": str(r.get("expiry_date")) if r.get("expiry_date") else None,
                "status": r.get("status"),
            }
            for r in rows[:10]
        ],
    }


def get_active_cds_snapshot(supplier_profile_id):
    """
    Retrieve active weekly CDS climate and shelf health snapshot from database.
    """
    sql = """
        SELECT
            dashboard_snap_id,
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
        FROM inventory_dashboard_quick_cds_snap
        WHERE supplier_profile_id = %s
          AND status = 'active'
        ORDER BY generated_at DESC
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        row = _row_to_dict(cursor)

    if not row:
        return None

    # Parse JSON fields if strings
    for json_col in ("climate_data", "rainfall_data", "temperature_data", "recommended_actions"):
        val = row.get(json_col)
        if isinstance(val, str):
            try:
                row[json_col] = json.loads(val)
            except Exception:
                pass

    return row

