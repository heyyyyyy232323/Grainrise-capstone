import datetime
from decimal import Decimal
import logging
from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


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
    Format date/datetime as: Month day, year (e.g. Oct 8, 2026).
    """
    if not d:
        return "Pending"

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


def get_procurement_dashboard_kpis(supplier_profile_id):
    """
    Compute Top KPIs for the authenticated miller procurement branch:
    1. Suppliers: registered active suppliers
    2. Receiving Orders: incoming orders waiting to be received
    3. Returns: pending return cases
    4. Pending Payables: requested payments awaiting settlement
    """
    sql = """
        SELECT
            (
                SELECT COUNT(*)
                FROM farmer_contacts
                WHERE supplier_profile_id = %s
                  AND LOWER(status) = 'active'
            ) AS suppliers_count,
            (
                SELECT COUNT(*)
                FROM inbound_order
                WHERE supplier_profile_id = %s
                  AND LOWER(TRIM(status)) IN ('ordered', 'partially_received', 'partially received')
            ) AS receiving_orders_count,
            (
                SELECT COUNT(*)
                FROM miller_returns
                WHERE supplier_profile_id = %s
                  AND LOWER(TRIM(status)) = 'pending'
            ) AS returns_count,
            (
                SELECT COUNT(*)
                FROM inbound_purchase_history
                WHERE supplier_profile_id = %s
                  AND status = 'request_to_pay'
            ) AS pending_payables_count
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, supplier_profile_id, supplier_profile_id, supplier_profile_id])
        row = _row_to_dict(cursor)

    suppliers_val = int(row.get("suppliers_count") or 0) if row else 0
    orders_val = int(row.get("receiving_orders_count") or 0) if row else 0
    returns_val = int(row.get("returns_count") or 0) if row else 0
    payables_val = int(row.get("pending_payables_count") or 0) if row else 0

    return {
        "suppliers": {
            "label": "Suppliers",
            "value": str(suppliers_val),
            "caption": "Registered Suppliers",
        },
        "receiving_orders": {
            "label": "Receiving Orders",
            "value": str(orders_val),
            "caption": "Incoming Orders",
        },
        "returns": {
            "label": "Returns",
            "value": str(returns_val),
            "caption": "Open Return Cases",
        },
        "pending_payables": {
            "label": "Pending Payables",
            "value": str(payables_val),
            "caption": "Payment Requests",
        },
    }


def get_receiving_orders_preview(supplier_profile_id, limit=5):
    """
    Retrieve incoming orders for preview table.
    Enforces status as Ordered or Partially Received (never In Transit).
    """
    sql = """
        SELECT
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.expected_arrival_date,
            io.status,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        WHERE io.supplier_profile_id = %s
          AND LOWER(TRIM(io.status)) IN ('ordered', 'partially_received', 'partially received')
        ORDER BY io.inbound_order_id DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, limit])
        rows = _rows_to_dicts(cursor)

    preview = []
    for r in rows:
        supplier_name = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person")
        )
        status_raw = str(r.get("status") or "").lower().strip()
        display_status = "Partially Received" if "partially" in status_raw else "Ordered"

        preview.append({
            "id": r["inbound_order_id"],
            "batchNo": r.get("batch_no") or "N/A",
            "supplier": supplier_name,
            "eta": format_readable_date(r.get("expected_arrival_date")),
            "status": display_status,
        })
    return preview


def get_pending_payables_preview(supplier_profile_id, limit=5):
    """
    Retrieve pending payment requests for preview table.
    """
    sql = """
        SELECT
            iph.receiving_id,
            io.batch_no,
            iph.total_price,
            iph.status,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_purchase_history iph
        LEFT JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        WHERE iph.supplier_profile_id = %s
          AND iph.status = 'request_to_pay'
        ORDER BY iph.receiving_id DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, limit])
        rows = _rows_to_dicts(cursor)

    preview = []
    for r in rows:
        supplier_name = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person")
        )
        amount_val = float(r.get("total_price") or 0.0)
        preview.append({
            "id": r["receiving_id"],
            "batchNo": r.get("batch_no") or "N/A",
            "supplier": supplier_name,
            "amount": f"₱ {amount_val:,.2f}",
            "status": "Pending",
        })
    return preview


def get_supplier_performance_summary(supplier_profile_id):
    """
    Compute supplier performance summary card:
    - Top Supplier
    - Deliveries
    - Acceptance rate
    """
    sql_top = """
        SELECT
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            COUNT(iph.receiving_id) AS delivery_count
        FROM inbound_purchase_history iph
        INNER JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        WHERE iph.supplier_profile_id = %s
        GROUP BY fc.farmer_contact_id, fc.organization, fc.supplier_farm, fc.contact_person
        ORDER BY delivery_count DESC
        LIMIT 1
    """
    sql_totals = """
        SELECT
            COUNT(iph.receiving_id) AS total_deliveries,
            COALESCE(SUM(iph.total_received), 0) AS sum_received,
            COALESCE(SUM(iph.received_good), 0) AS sum_good
        FROM inbound_purchase_history iph
        WHERE iph.supplier_profile_id = %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_top, [supplier_profile_id])
        top_row = _row_to_dict(cursor)
        cursor.execute(sql_totals, [supplier_profile_id])
        totals_row = _row_to_dict(cursor)

    if top_row:
        top_supplier_name = _compute_supplier_display_name(
            top_row.get("organization"),
            top_row.get("supplier_farm"),
            top_row.get("contact_person")
        )
    else:
        top_supplier_name = "None Yet"

    total_deliveries = int(totals_row.get("total_deliveries") or 0) if totals_row else 0
    sum_received = float(totals_row.get("sum_received") or 0.0) if totals_row else 0.0
    sum_good = float(totals_row.get("sum_good") or 0.0) if totals_row else 0.0

    if sum_received > 0:
        acceptance_rate = f"{(sum_good / sum_received * 100):.1f}%"
    else:
        acceptance_rate = "100.0%"

    return [
        {"label": "Top Suppliers", "value": top_supplier_name},
        {"label": "Deliveries", "value": str(total_deliveries)},
        {"label": "Acceptance", "value": acceptance_rate},
    ]


def get_returns_summary(supplier_profile_id):
    """
    Compute returns summary card:
    - Pending batch count
    - Recent / top return batch
    - Primary reason description
    """
    sql = """
        SELECT
            COUNT(CASE WHEN LOWER(TRIM(mr.status)) = 'pending' THEN 1 END) AS pending_count,
            (
                SELECT io.batch_no
                FROM miller_returns mr2
                JOIN inbound_order io ON io.inbound_order_id = mr2.inbound_order_id
                WHERE mr2.supplier_profile_id = %s
                ORDER BY mr2.return_id DESC
                LIMIT 1
            ) AS latest_batch,
            (
                SELECT mr3.reason_description
                FROM miller_returns mr3
                WHERE mr3.supplier_profile_id = %s
                GROUP BY mr3.reason_description
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS top_reason
        FROM miller_returns mr
        WHERE mr.supplier_profile_id = %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, supplier_profile_id, supplier_profile_id])
        row = _row_to_dict(cursor)

    pending_count = int(row.get("pending_count") or 0) if row else 0
    latest_batch = (row.get("latest_batch") or "").strip() if row else ""
    top_reason = (row.get("top_reason") or "").strip() if row else ""

    return [
        {"label": "Pending", "value": f"{pending_count} Batch(es)"},
        {"label": "Deliveries", "value": latest_batch or "None"},
        {"label": "Acceptance", "value": top_reason or "None"},
    ]


def get_recent_procurement_activity(supplier_profile_id, limit=8):
    """
    Fetch recent procurement activity from actual database records:
    - Deliveries received / recorded
    - Returns logged
    - Payment requests
    Grouped by date (Today, Yesterday, or Formatted Date).
    """
    sql_receipts = """
        SELECT
            'receipt' AS act_type,
            iph.receiving_id AS id,
            io.batch_no,
            iph.receiving_reference_no,
            iph.received_good,
            iph.total_price,
            iph.status,
            iph.received_at AS act_time,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_purchase_history iph
        LEFT JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        WHERE iph.supplier_profile_id = %s
          AND iph.received_at IS NOT NULL
        ORDER BY iph.received_at DESC
        LIMIT %s
    """
    sql_returns = """
        SELECT
            'return' AS act_type,
            mr.return_id AS id,
            io.batch_no,
            mr.return_reference_no,
            mr.quantity_kg,
            mr.reason_description,
            mr.created_at AS act_time,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM miller_returns mr
        JOIN inbound_order io
            ON io.inbound_order_id = mr.inbound_order_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = mr.supplier_profile_id
        WHERE mr.supplier_profile_id = %s
        ORDER BY mr.created_at DESC
        LIMIT %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_receipts, [supplier_profile_id, limit])
        receipt_rows = _rows_to_dicts(cursor)
        cursor.execute(sql_returns, [supplier_profile_id, limit])
        return_rows = _rows_to_dicts(cursor)

    combined = []
    for r in receipt_rows:
        supplier_name = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person")
        )
        batch = r.get("batch_no") or "Batch"
        ref = r.get("receiving_reference_no") or "Receipt"
        good_qty = float(r.get("received_good") or 0.0)
        status_val = str(r.get("status") or "").lower()

        if status_val == "request_to_pay":
            title = f"Payment requested for {batch}"
            desc = f"Payment request submitted for {ref}. Payable amount: ₱ {float(r.get('total_price') or 0):,.2f}."
        else:
            title = f"Batch received from {supplier_name}"
            desc = f"Quality inspection cleared for {batch}. {good_qty:,.0f} kg good units logged (Ref: {ref})."

        combined.append({
            "title": title,
            "description": desc,
            "dt": r.get("act_time"),
        })

    for r in return_rows:
        batch = r.get("batch_no") or "Batch"
        ref = r.get("return_reference_no") or "Return"
        qty = float(r.get("quantity_kg") or 0.0)
        reason = r.get("reason_description") or "Damaged goods"
        combined.append({
            "title": f"Return logged for {batch}",
            "description": f"Return case {ref} filed. {qty:,.0f} kg returned due to {reason}.",
            "dt": r.get("act_time"),
        })

    # Sort combined activities descending by datetime
    def _parse_dt(item):
        val = item.get("dt")
        if not val:
            return datetime.datetime.min
        if isinstance(val, str):
            try:
                return datetime.datetime.fromisoformat(val.replace("Z", "+00:00"))
            except Exception:
                return datetime.datetime.min
        return val

    combined.sort(key=_parse_dt, reverse=True)
    combined = combined[:limit]

    # Group by Date: "Today", "Yesterday", or "Month Day, Year"
    now_date = timezone.now().date()
    yesterday_date = now_date - datetime.timedelta(days=1)

    grouped_dict = {}
    for item in combined:
        dt_val = _parse_dt(item)
        if dt_val == datetime.datetime.min:
            group_label = "Recent"
            time_str = "—"
        else:
            item_date = dt_val.date()
            if item_date == now_date:
                group_label = "Today"
            elif item_date == yesterday_date:
                group_label = "Yesterday"
            else:
                month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                group_label = f"{month_names[item_date.month - 1]} {item_date.day}, {item_date.year}"
            time_str = dt_val.strftime("%I:%M %p")

        if group_label not in grouped_dict:
            grouped_dict[group_label] = []

        grouped_dict[group_label].append({
            "title": item["title"],
            "description": item["description"],
            "time": time_str,
        })

    result = [{"date": k, "items": v} for k, v in grouped_dict.items()]
    return result
