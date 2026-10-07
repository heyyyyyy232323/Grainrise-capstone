import datetime
from decimal import Decimal
from django.db import connection


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
    Never outputs raw timestamp strings or YYYY-MM-DD.
    """
    if not d:
        return None

    if isinstance(d, datetime.datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            # Handle ISO string with potential time or timezone component
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


def get_order_history_list(supplier_profile_id, search=None, start_date=None, end_date=None, sort_by=None):
    """
    Retrieve list of inbound orders strictly scoped to the authenticated encoder's supplier_profile_id.
    Ordered by created_at DESC by default.
    """
    where_clauses = ["io.supplier_profile_id = %s"]
    params = [supplier_profile_id]

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

    order_by_clause = "io.created_at DESC"
    if sort_by == "variant-asc":
        order_by_clause = "io.product_name ASC, io.created_at DESC"
    elif sort_by == "variant-desc":
        order_by_clause = "io.product_name DESC, io.created_at DESC"
    elif sort_by == "qty-desc":
        order_by_clause = "io.ordered_quantity DESC, io.created_at DESC"
    elif sort_by == "qty-asc":
        order_by_clause = "io.ordered_quantity ASC, io.created_at DESC"
    elif sort_by in ("date-asc", "oldest"):
        order_by_clause = "io.created_at ASC"

    where_sql = " AND ".join(where_clauses)
    sql = f"""
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
        WHERE {where_sql}
        ORDER BY {order_by_clause}
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
        qty_formatted = format_readable_qty(r.get("ordered_quantity"))

        raw_qty = float(r.get("ordered_quantity")) if r.get("ordered_quantity") is not None else 0.0

        result.append({
            "id": r["inbound_order_id"],
            "inbound_order_id": r["inbound_order_id"],
            "batchId": r.get("batch_no") or "",
            "batch_no": r.get("batch_no") or "",
            "variant": r.get("product_name") or "",
            "product_name": r.get("product_name") or "",
            "stockQty": qty_formatted,
            "ordered_quantity": raw_qty,
            "ordered_quantity_formatted": qty_formatted,
            "supplier": supplier_display,
            "supplier_name": supplier_display,
            "status": r.get("status") or "requested",
            "date": date_iso,
            "created_at": created_at_dt.isoformat() if created_at_dt else None,
            "created_at_formatted": created_at_formatted,
        })

    return result


def get_order_history_detail(supplier_profile_id, inbound_order_id):
    """
    Retrieve comprehensive details for an order strictly scoped to the authenticated branch.
    Follows all process-aware rules:
    - Missing procurement receiving / product code fields return 'In Process'
    - Unadjusted requirements return 'Not Adjusted'
    - Status badges differentiate Procurement Status (inbound_order.status)
      and Payment Status (inbound_purchase_history.status)
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
            io.status AS procurement_status,
            io.created_at,
            io.updated_at,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            dr.target_arrival_date,
            dr.required_by_date,
            se.first_name AS set_by_first_name,
            se.last_name AS set_by_last_name,
            au.first_name AS adj_first_name,
            au.last_name AS adj_last_name,
            au.username AS adj_username,
            iph.receiving_reference_no,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.price_per_kg,
            iph.total_price,
            iph.status AS payment_status,
            mp.product_code
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN miller_inbound_date_requirements dr
            ON dr.inbound_order_id = io.inbound_order_id
           AND dr.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = dr.set_by_employee_id
        LEFT JOIN auth_user au
            ON au.id = dr.adjusted_by_user_id
        LEFT JOIN inbound_purchase_history iph
            ON iph.order_id = io.inbound_order_id
           AND iph.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN miller_products mp
            ON mp.inbound_purchase_history_id = iph.receiving_id
           AND mp.supplier_profile_id = io.supplier_profile_id
        WHERE io.supplier_profile_id = %s
          AND io.inbound_order_id = %s
        ORDER BY iph.receiving_id DESC, mp.product_id DESC
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, inbound_order_id])
        row = _row_to_dict(cursor)

    if not row:
        return None

    # Supplier name
    supplier_display = _compute_supplier_display_name(
        row.get("organization"),
        row.get("supplier_farm"),
        row.get("contact_person"),
    )

    # Date Requirements: Set By
    set_by_name = ""
    if row.get("set_by_first_name") or row.get("set_by_last_name"):
        set_by_name = f"{row.get('set_by_first_name') or ''} {row.get('set_by_last_name') or ''}".strip()
    if not set_by_name:
        set_by_name = "In Process"

    # Date Requirements: Adjusted By
    adj_name = ""
    if row.get("adj_first_name") or row.get("adj_last_name"):
        adj_name = f"{row.get('adj_first_name') or ''} {row.get('adj_last_name') or ''}".strip()
    elif row.get("adj_username"):
        adj_name = row.get("adj_username").strip()
    if not adj_name:
        adj_name = "Not Adjusted"

    # Process-Dependent Missing Fields:
    # Product Code
    p_code = row.get("product_code")
    product_code_display = str(p_code).strip() if (p_code and str(p_code).strip()) else "In Process"

    # Receiving Reference No
    rec_ref = row.get("receiving_reference_no")
    rec_ref_display = str(rec_ref).strip() if (rec_ref and str(rec_ref).strip()) else "In Process"

    # Total Received
    tot_rec = row.get("total_received")
    total_received_display = format_readable_qty(tot_rec) if tot_rec is not None else "In Process"

    # Received Good
    rec_good = row.get("received_good")
    received_good_display = format_readable_qty(rec_good) if rec_good is not None else "In Process"

    # Received Bad
    rec_bad = row.get("received_bad")
    received_bad_display = format_readable_qty(rec_bad) if rec_bad is not None else "In Process"

    # Price per kg
    p_kg = row.get("price_per_kg")
    price_per_kg_display = format_readable_currency(p_kg) if p_kg is not None else "In Process"

    # Total Price
    tot_pr = row.get("total_price")
    total_price_display = format_readable_currency(tot_pr) if tot_pr is not None else "In Process"

    # Payment Status
    pay_stat = row.get("payment_status")
    payment_status_display = str(pay_stat).strip() if (pay_stat and str(pay_stat).strip()) else "In Process"

    # Quantities & Photos
    ord_qty = float(row.get("ordered_quantity")) if row.get("ordered_quantity") is not None else None
    photo_raw = row.get("product_photo")

    return {
        "inbound_order_id": row["inbound_order_id"],
        "batch_no": row.get("batch_no") or "",
        "supplier_name": supplier_display,

        # Section 1: Inbound Order Details
        "variant": row.get("product_name") or "",
        "product_description": row.get("product_description") or "",
        "product_photo": photo_raw,
        "product_photo_url": _resolve_photo_url(photo_raw),
        "ordered_quantity": ord_qty,
        "ordered_quantity_formatted": format_readable_qty(ord_qty),
        "expected_arrival_date": str(row.get("expected_arrival_date")) if row.get("expected_arrival_date") else None,
        "expected_arrival_date_formatted": format_readable_date(row.get("expected_arrival_date")) or "In Process",
        "created_at": row.get("created_at").isoformat() if row.get("created_at") else None,
        "created_at_formatted": format_readable_date(row.get("created_at")),
        "updated_at": row.get("updated_at").isoformat() if row.get("updated_at") else None,
        "updated_at_formatted": format_readable_date(row.get("updated_at")),
        "procurement_status": row.get("procurement_status") or "requested",
        "status": row.get("procurement_status") or "requested",

        # Section 2: Date Requirements
        "date_requirements": {
            "target_arrival_date": str(row.get("target_arrival_date")) if row.get("target_arrival_date") else None,
            "target_arrival_date_formatted": format_readable_date(row.get("target_arrival_date")) or "In Process",
            "required_by_date": str(row.get("required_by_date")) if row.get("required_by_date") else None,
            "required_by_date_formatted": format_readable_date(row.get("required_by_date")) or "In Process",
            "set_by": set_by_name,
            "adjusted_by": adj_name,
        },

        # Section 3: Procurement Receiving & Product Code
        "procurement_receiving": {
            "product_code": product_code_display,
            "receiving_reference_no": rec_ref_display,
            "total_received": total_received_display,
            "received_good": received_good_display,
            "received_bad": received_bad_display,
            "price_per_kg": price_per_kg_display,
            "total_price": total_price_display,
            "payment_status": payment_status_display,
        },
    }

