import datetime
from decimal import Decimal
import logging
from django.db import connection

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
    Format date/datetime as: Abbreviated month, numeric day, four-digit year.
    Examples: Oct 8, 2026; Jan 5, 2027; May 2, 2026.
    """
    if not d:
        return "—"

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


def format_readable_date_time(dt):
    """
    Format datetime as: Oct 8, 2026, 02:18 PM.
    """
    if not dt:
        return "—"
    if isinstance(dt, str):
        try:
            dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return str(dt)

    if isinstance(dt, datetime.datetime):
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ]
        hour = dt.strftime("%I:%M %p")
        return f"{month_names[dt.month - 1]} {dt.day}, {dt.year}, {hour}"

    return format_readable_date(dt)


def format_readable_qty(qty):
    """
    Format quantity with 'kg' suffix.
    E.g. 2300 -> '2,300 kg', 2300.5 -> '2,300.50 kg'
    """
    if qty is None:
        return "0 kg"
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
    E.g. 24 -> '₱ 24.00', 50000 -> '₱ 50,000.00'
    """
    if val is None:
        return "₱ 0.00"
    try:
        f_val = float(val)
        return f"₱ {f_val:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def _resolve_photo_url(photo_path):
    """Resolve photo path to a standard media path."""
    if not photo_path:
        return None
    clean = str(photo_path).strip().replace("\\", "/")
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:"):
        return clean
    clean = clean.lstrip("/")
    if not clean.startswith("media/"):
        clean = f"media/{clean}"
    return f"/{clean}"


def _compute_receiver_name(first_name, last_name):
    """Format full name of employee who received delivery."""
    first = str(first_name or "").strip()
    last = str(last_name or "").strip()
    full = f"{first} {last}".strip()
    return full if full else "Procurement Staff"


def get_receiving_history(
    supplier_profile_id,
    search=None,
    start_date=None,
    end_date=None,
    supplier_id=None,
    status_filter=None,
    sort_by=None,
):
    """
    Fetch historical receiving records from inbound_purchase_history joined with inbound_order.
    Scoped strictly to the authenticated Miller business (supplier_profile_id).

    Filters:
    - search: Case-insensitive match on batch_no, variant/product, supplier, receiving_ref, receiver name.
    - start_date / end_date: Date range based on iph.received_at.
    - supplier_id: Filter by farmer_contact_id.
    - status_filter: Refers to inbound_order.status ('partially_received', 'received').
    - sort_by: 'newest' (default), 'oldest', 'batch_asc', 'batch_desc'.
    """
    sql = """
        SELECT
            iph.receiving_id,
            iph.order_id,
            iph.supplier_profile_id,
            iph.farmer_contact_id,
            iph.receiving_reference_no,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.received_by_employee_id,
            iph.price_per_kg,
            iph.total_price,
            iph.status AS payment_status,
            iph.received_at,
            iph.receiving_proof_photo,
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status AS order_status,
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization,
            se.first_name AS receiver_first_name,
            se.last_name AS receiver_last_name,
            fp.farmer_rating
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN (
            SELECT receiving_id, MAX(farmer_rating) AS farmer_rating
            FROM farmer_performance
            GROUP BY receiving_id
        ) fp ON fp.receiving_id = iph.receiving_id
        WHERE iph.supplier_profile_id = %s
    """
    params = [supplier_profile_id]

    # Status filter (refers to inbound_order.status)
    clean_status = str(status_filter or "").strip().lower()
    if clean_status in ("partially_received", "partially received"):
        sql += " AND io.status IN ('partially_received', 'partially received')"
    elif clean_status == "received":
        sql += " AND io.status = 'received'"

    # Supplier filter
    if supplier_id and str(supplier_id).lower() != "all":
        try:
            s_id = int(supplier_id)
            sql += " AND io.farmer_contact_id = %s"
            params.append(s_id)
        except (ValueError, TypeError):
            pass

    # Date Range filter (iph.received_at)
    if start_date:
        try:
            clean_start = str(start_date).strip().split("T")[0]
            if clean_start:
                sql += " AND DATE(iph.received_at) >= %s"
                params.append(clean_start)
        except Exception:
            pass

    if end_date:
        try:
            clean_end = str(end_date).strip().split("T")[0]
            if clean_end:
                sql += " AND DATE(iph.received_at) <= %s"
                params.append(clean_end)
        except Exception:
            pass

    # Case-insensitive search
    clean_search = str(search or "").strip().lower()
    if clean_search:
        search_pattern = f"%{clean_search}%"
        sql += """
            AND (
                LOWER(io.batch_no) LIKE %s
                OR LOWER(io.product_name) LIKE %s
                OR LOWER(COALESCE(fc.organization, '')) LIKE %s
                OR LOWER(COALESCE(fc.supplier_farm, '')) LIKE %s
                OR LOWER(COALESCE(fc.contact_person, '')) LIKE %s
                OR LOWER(iph.receiving_reference_no) LIKE %s
                OR LOWER(CONCAT(COALESCE(se.first_name, ''), ' ', COALESCE(se.last_name, ''))) LIKE %s
            )
        """
        params.extend([
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
        ])

    # Sorting
    clean_sort = str(sort_by or "").strip().lower()
    if clean_sort == "batch_asc":
        sql += " ORDER BY io.batch_no ASC, iph.received_at DESC"
    elif clean_sort == "batch_desc":
        sql += " ORDER BY io.batch_no DESC, iph.received_at DESC"
    elif clean_sort == "oldest":
        sql += " ORDER BY iph.received_at ASC, iph.receiving_id ASC"
    else:
        # Default: Newest first
        sql += " ORDER BY iph.received_at DESC, iph.receiving_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    results = []
    for r in rows:
        supplier_name = _compute_supplier_display_name(
            r["organization"], r["supplier_farm"], r["contact_person"]
        )
        receiver_name = _compute_receiver_name(
            r["receiver_first_name"], r["receiver_last_name"]
        )
        ord_status = str(r["order_status"] or "").strip().lower()
        is_partial = ord_status in ("partially_received", "partially received")

        rec_dt = r["received_at"]
        raw_rec_date = rec_dt.strftime("%Y-%m-%d") if isinstance(rec_dt, (datetime.datetime, datetime.date)) else str(rec_dt or "")[:10]

        pay_status = str(r["payment_status"] or "pending").strip().lower()
        if pay_status in ("request to pay", "request_to_pay"):
            pay_label = "Request to Pay"
        elif pay_status == "paid":
            pay_label = "Paid"
        else:
            pay_label = "Pending"

        results.append({
            "id": r["receiving_id"],
            "receiving_id": r["receiving_id"],
            "order_id": r["order_id"],
            "receiving_reference_no": r["receiving_reference_no"],
            "batch_no": r["batch_no"],
            "variant": r["product_name"],
            "product_name": r["product_name"],
            "supplier": supplier_name,
            "farmer_contact_id": r["farmer_contact_id"],
            "total_received": format_readable_qty(r["total_received"]),
            "total_received_kg": float(r["total_received"] or 0),
            "received_good": format_readable_qty(r["received_good"]),
            "received_bad": format_readable_qty(r["received_bad"]),
            "price_per_kg": format_readable_currency(r["price_per_kg"]),
            "total_payable": format_readable_currency(r["total_price"]),
            "received_by": receiver_name,
            "supplier_rating": int(r["farmer_rating"]) if r.get("farmer_rating") is not None else None,
            "farmer_rating": int(r["farmer_rating"]) if r.get("farmer_rating") is not None else None,
            "order_status": ord_status,
            "status": "Partially Received" if is_partial else "Received",
            "status_label": "Partially Received" if is_partial else "Received",
            "payment_status": pay_status,
            "payment_status_label": pay_label,
            "received_at": format_readable_date_time(rec_dt),
            "raw_received_at": rec_dt.isoformat() if isinstance(rec_dt, datetime.datetime) else str(rec_dt or ""),
            "received_date_formatted": format_readable_date(rec_dt),
            "raw_received_date": raw_rec_date,
            "receiving_proof_photo": _resolve_photo_url(r["receiving_proof_photo"]),
        })

    return results


def get_receiving_history_detail(supplier_profile_id, receiving_id):
    """
    Fetch comprehensive details for a specific historical receiving record.
    Returns Inbound Order Details and Receiving Details matching MillerOrderApproval modal design.
    """
    sql = """
        SELECT
            iph.receiving_id,
            iph.order_id,
            iph.supplier_profile_id,
            iph.farmer_contact_id,
            iph.receiving_reference_no,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.received_by_employee_id,
            iph.price_per_kg,
            iph.total_price,
            iph.status AS payment_status,
            iph.received_at,
            iph.receiving_proof_photo,
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status AS order_status,
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization,
            se.first_name AS receiver_first_name,
            se.last_name AS receiver_last_name,
            fp.farmer_rating
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN (
            SELECT receiving_id, MAX(farmer_rating) AS farmer_rating
            FROM farmer_performance
            GROUP BY receiving_id
        ) fp ON fp.receiving_id = iph.receiving_id
        WHERE iph.supplier_profile_id = %s
          AND iph.receiving_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, receiving_id])
        r = _row_to_dict(cursor)

    if not r:
        return None

    supplier_name = _compute_supplier_display_name(
        r["organization"], r["supplier_farm"], r["contact_person"]
    )
    receiver_name = _compute_receiver_name(
        r["receiver_first_name"], r["receiver_last_name"]
    )
    ord_status = str(r["order_status"] or "").strip().lower()
    is_partial = ord_status in ("partially_received", "partially received")

    pay_status = str(r["payment_status"] or "pending").strip().lower()
    if pay_status in ("request to pay", "request_to_pay"):
        pay_label = "Request to Pay"
    elif pay_status == "paid":
        pay_label = "Paid"
    else:
        pay_label = "Pending"

    rec_dt = r["received_at"]
    raw_rec_date = rec_dt.strftime("%Y-%m-%d") if isinstance(rec_dt, (datetime.datetime, datetime.date)) else str(rec_dt or "")[:10]

    rating_val = r.get("farmer_rating")
    rating_int = int(rating_val) if rating_val is not None else None

    return {
        "id": r["receiving_id"],
        "receiving_id": r["receiving_id"],
        "order_id": r["order_id"],
        "receiving_reference_no": r["receiving_reference_no"],
        "batch_no": r["batch_no"],
        # Section 1: Inbound Order Details
        "variant": r["product_name"],
        "product_variant": r["product_name"],
        "supplier": supplier_name,
        "product_description": r["product_description"] or "",
        "product_photo": _resolve_photo_url(r["product_photo"]),
        "original_order_quantity": format_readable_qty(r["ordered_quantity"]),
        "expected_arrival_date": format_readable_date(r["expected_arrival_date"]),
        "order_status": ord_status,
        "order_status_label": "Partially Received" if is_partial else "Received",
        # Section 2: Receiving Details
        "total_received": format_readable_qty(r["total_received"]),
        "received_good": format_readable_qty(r["received_good"]),
        "received_bad": format_readable_qty(r["received_bad"]),
        "price_per_kg": format_readable_currency(r["price_per_kg"]),
        "total_payable": format_readable_currency(r["total_price"]),
        "payment_status": pay_status,
        "payment_status_label": pay_label,
        "received_by": receiver_name,
        "supplier_rating": rating_int,
        "farmer_rating": rating_int,
        "received_at": format_readable_date_time(rec_dt),
        "raw_received_date": raw_rec_date,
        "receiving_proof_photo": _resolve_photo_url(r["receiving_proof_photo"]),
    }


def get_distinct_history_suppliers(supplier_profile_id):
    """
    Fetch distinct active suppliers that have historical receiving records for this miller.
    """
    sql = """
        SELECT DISTINCT
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        INNER JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        WHERE iph.supplier_profile_id = %s
        ORDER BY COALESCE(fc.organization, fc.supplier_farm, fc.contact_person) ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    suppliers = []
    seen = set()
    for r in rows:
        fc_id = r["farmer_contact_id"]
        if fc_id in seen:
            continue
        seen.add(fc_id)
        name = _compute_supplier_display_name(
            r["organization"], r["supplier_farm"], r["contact_person"]
        )
        suppliers.append({
            "id": fc_id,
            "name": name,
        })
    return suppliers

