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


def get_eligible_receiving_orders(
    supplier_profile_id,
    search=None,
    start_date=None,
    end_date=None,
    sort_by=None,
    status_filter=None,
):
    """
    Retrieve eligible receiving orders strictly scoped to the authenticated supplier_profile_id.

    Eligible orders:
    - Status == 'ordered' (Ready to Receive)
    - Status IN ('partially_received', 'partially received') (Partially Received)
    - Excludes fully received ('received'), requested, declined, cancelled orders.
    - Excludes orders where Remaining Receivable <= 0.

    Remaining Receivable = Original Ordered Quantity - SUM(Received Good).
    Original ordered quantity is NEVER modified.
    """
    where_clauses = [
        "io.supplier_profile_id = %s",
        "LOWER(TRIM(io.status)) IN ('ordered', 'partially_received', 'partially received')",
    ]
    params = [supplier_profile_id]

    # Search filter
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

    # Date range filter on expected_arrival_date
    if start_date and str(start_date).strip():
        where_clauses.append("io.expected_arrival_date >= %s")
        params.append(str(start_date).strip())

    if end_date and str(end_date).strip():
        where_clauses.append("io.expected_arrival_date <= %s")
        params.append(str(end_date).strip())

    # Status filter if specific tab/filter requested
    if status_filter and str(status_filter).strip():
        s_norm = str(status_filter).strip().lower()
        if s_norm in ("ordered", "ready to receive", "ready_to_receive"):
            where_clauses.append("LOWER(TRIM(io.status)) = 'ordered'")
        elif s_norm in ("partially_received", "partially received"):
            where_clauses.append("LOWER(TRIM(io.status)) IN ('partially_received', 'partially received')")

    where_sql = " AND ".join(where_clauses)

    sql = f"""
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
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            fc.contact_number,
            fc.email,
            fc.address,
            COALESCE(rec.total_good_received, 0.00) AS total_good_received
        FROM inbound_order io
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN (
            SELECT
                order_id,
                supplier_profile_id,
                SUM(received_good) AS total_good_received
            FROM inbound_purchase_history
            WHERE supplier_profile_id = %s
            GROUP BY order_id, supplier_profile_id
        ) rec
            ON rec.order_id = io.inbound_order_id
           AND rec.supplier_profile_id = io.supplier_profile_id
        WHERE {where_sql}
    """

    all_params = [supplier_profile_id] + params

    with connection.cursor() as cursor:
        cursor.execute(sql, all_params)
        rows = _rows_to_dicts(cursor)

    results = []
    for r in rows:
        ordered_qty = Decimal(str(r["ordered_quantity"] or 0))
        accepted_good = Decimal(str(r["total_good_received"] or 0))
        remaining = max(Decimal("0.00"), ordered_qty - accepted_good)

        # Exclude fully received orders
        if remaining <= Decimal("0.00"):
            continue

        raw_status = str(r.get("status") or "").strip().lower()
        if raw_status == "ordered":
            display_status = "Ready to Receive"
        elif raw_status in ("partially_received", "partially received"):
            display_status = "Partially Received"
        else:
            display_status = raw_status.replace("_", " ").title()

        supplier_display = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person"),
        )

        created_at_dt = r.get("created_at")
        expected_arrival_val = r.get("expected_arrival_date")

        results.append({
            "id": r["inbound_order_id"],
            "inbound_order_id": r["inbound_order_id"],
            "batchNo": r.get("batch_no") or "",
            "batch_no": r.get("batch_no") or "",
            "variant": r.get("product_name") or "",
            "product_name": r.get("product_name") or "",
            "product_description": r.get("product_description") or "",
            "product_photo": _resolve_photo_url(r.get("product_photo")),
            "supplier": supplier_display,
            "farmer_contact_id": r.get("farmer_contact_id"),
            "supplier_info": {
                "farmer_contact_id": r.get("farmer_contact_id"),
                "organization": r.get("organization") or "",
                "supplier_farm": r.get("supplier_farm") or "",
                "contact_person": r.get("contact_person") or "",
                "contact_number": r.get("contact_number") or "",
                "email": r.get("email") or "",
                "address": r.get("address") or "",
            },
            "ordered_quantity": float(ordered_qty),
            "ordered_quantity_formatted": format_readable_qty(ordered_qty),
            "received_good_total": float(accepted_good),
            "received_good_total_formatted": format_readable_qty(accepted_good),
            "qty": format_readable_qty(remaining),
            "remaining_receivable": float(remaining),
            "remaining_receivable_formatted": format_readable_qty(remaining),
            "eta": format_readable_date(expected_arrival_val),
            "expected_arrival_date": str(expected_arrival_val) if expected_arrival_val else "",
            "raw_status": raw_status,
            "status": display_status,
            "created_at": created_at_dt.isoformat() if created_at_dt else "",
        })

    # Sort in memory for accurate calculation sorting
    if sort_by == "date-desc":
        results.sort(key=lambda x: (x["expected_arrival_date"] or "", x["created_at"] or ""), reverse=True)
    elif sort_by == "date-asc":
        results.sort(key=lambda x: (x["expected_arrival_date"] or "9999-99-99", x["created_at"] or ""))
    elif sort_by == "variant-asc":
        results.sort(key=lambda x: (x["variant"] or "").lower())
    elif sort_by == "variant-desc":
        results.sort(key=lambda x: (x["variant"] or "").lower(), reverse=True)
    elif sort_by == "qty-desc":
        results.sort(key=lambda x: x["remaining_receivable"], reverse=True)
    elif sort_by == "qty-asc":
        results.sort(key=lambda x: x["remaining_receivable"])
    else:
        # Default: expected arrival date ascending (nearest first), then created_at desc
        results.sort(key=lambda x: (x["expected_arrival_date"] or "9999-99-99", -(datetime.datetime.fromisoformat(x["created_at"]).timestamp() if x["created_at"] else 0)))

    return results


def get_receiving_order_detail(supplier_profile_id, inbound_order_id):
    """
    Retrieve full details for a single receiving order, including past receiving history.
    Strictly scoped to supplier_profile_id.
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
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            fc.contact_number,
            fc.email,
            fc.address,
            sp.business_name
        FROM inbound_order io
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = io.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
           AND fc.supplier_profile_id = io.supplier_profile_id
        WHERE io.inbound_order_id = %s
          AND io.supplier_profile_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [inbound_order_id, supplier_profile_id])
        order_row = _row_to_dict(cursor)

    if not order_row:
        return None

    # Fetch all historical inbound_purchase_history records
    rec_sql = """
        SELECT
            iph.receiving_id,
            iph.order_id,
            iph.supplier_profile_id,
            iph.farmer_contact_id,
            iph.receiving_reference_no,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.price_per_kg,
            iph.total_price,
            iph.status AS payment_status,
            iph.received_at,
            iph.receiving_proof_photo,
            iph.received_by_employee_id,
            TRIM(CONCAT(COALESCE(se.first_name, ''), ' ', COALESCE(se.last_name, ''))) AS received_by_name,
            fp.farmer_rating,
            mr.return_id,
            mr.return_reference_no,
            mr.photo_evidence AS return_photo_evidence,
            mr.quantity_kg AS return_quantity_kg,
            mr.status AS return_status
        FROM inbound_purchase_history iph
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN farmer_performance fp
            ON fp.receiving_id = iph.receiving_id
        LEFT JOIN miller_returns mr
            ON mr.receiving_id = iph.receiving_id
        WHERE iph.order_id = %s
          AND iph.supplier_profile_id = %s
        ORDER BY iph.receiving_id ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(rec_sql, [inbound_order_id, supplier_profile_id])
        rec_rows = _rows_to_dicts(cursor)

    ordered_qty = Decimal(str(order_row["ordered_quantity"] or 0))
    total_good_accepted = sum(Decimal(str(r["received_good"] or 0)) for r in rec_rows)
    total_received_sum = sum(Decimal(str(r["total_received"] or 0)) for r in rec_rows)
    total_bad_sum = sum(Decimal(str(r["received_bad"] or 0)) for r in rec_rows)
    remaining_receivable = max(Decimal("0.00"), ordered_qty - total_good_accepted)

    receiving_history = []
    for r in rec_rows:
        good_val = Decimal(str(r["received_good"] or 0))
        bad_val = Decimal(str(r["received_bad"] or 0))
        tot_val = Decimal(str(r["total_received"] or 0))
        price_val = Decimal(str(r["price_per_kg"] or 0))
        tot_price_val = Decimal(str(r["total_price"] or 0))
        rec_at = r.get("received_at")

        history_item = {
            "receiving_id": r["receiving_id"],
            "receiving_reference_no": r.get("receiving_reference_no") or "",
            "total_received": float(tot_val),
            "total_received_formatted": format_readable_qty(tot_val),
            "received_good": float(good_val),
            "received_good_formatted": format_readable_qty(good_val),
            "received_bad": float(bad_val),
            "received_bad_formatted": format_readable_qty(bad_val),
            "price_per_kg": float(price_val),
            "price_per_kg_formatted": format_readable_currency(price_val),
            "total_price": float(tot_price_val),
            "total_price_formatted": format_readable_currency(tot_price_val),
            "payment_status": r.get("payment_status") or "pending",
            "received_by_employee_id": r.get("received_by_employee_id"),
            "received_by_name": r.get("received_by_name") or "Procurement Officer",
            "received_at": rec_at.isoformat() if rec_at else "",
            "received_at_formatted": format_readable_date(rec_at),
            "receiving_proof_photo": _resolve_photo_url(r.get("receiving_proof_photo")),
            "farmer_rating": r.get("farmer_rating"),
        }

        if r.get("return_id"):
            ret_qty = Decimal(str(r.get("return_quantity_kg") or bad_val))
            history_item["return"] = {
                "return_id": r["return_id"],
                "return_reference_no": r.get("return_reference_no") or "",
                "quantity_kg": float(ret_qty),
                "quantity_kg_formatted": format_readable_qty(ret_qty),
                "photo_evidence": _resolve_photo_url(r.get("return_photo_evidence")),
                "status": r.get("return_status") or "pending",
            }
        else:
            history_item["return"] = None

        receiving_history.append(history_item)

    raw_status = str(order_row.get("status") or "").strip().lower()
    if raw_status == "ordered":
        display_status = "Ready to Receive"
    elif raw_status in ("partially_received", "partially received"):
        display_status = "Partially Received"
    elif raw_status == "received":
        display_status = "Received"
    else:
        display_status = raw_status.replace("_", " ").title()

    supplier_display = _compute_supplier_display_name(
        order_row.get("organization"),
        order_row.get("supplier_farm"),
        order_row.get("contact_person"),
    )

    created_at_dt = order_row.get("created_at")
    expected_arrival_val = order_row.get("expected_arrival_date")

    return {
        "inbound_order_id": order_row["inbound_order_id"],
        "batch_no": order_row.get("batch_no") or "",
        "product_name": order_row.get("product_name") or "",
        "product_description": order_row.get("product_description") or "",
        "product_photo": _resolve_photo_url(order_row.get("product_photo")),
        "ordered_quantity": float(ordered_qty),
        "ordered_quantity_formatted": format_readable_qty(ordered_qty),
        "received_good_total": float(total_good_accepted),
        "received_good_total_formatted": format_readable_qty(total_good_accepted),
        "received_bad_total": float(total_bad_sum),
        "received_bad_total_formatted": format_readable_qty(total_bad_sum),
        "total_received_sum": float(total_received_sum),
        "total_received_sum_formatted": format_readable_qty(total_received_sum),
        "remaining_receivable": float(remaining_receivable),
        "remaining_receivable_formatted": format_readable_qty(remaining_receivable),
        "expected_arrival_date": str(expected_arrival_val) if expected_arrival_val else "",
        "expected_arrival_date_formatted": format_readable_date(expected_arrival_val),
        "raw_status": raw_status,
        "status": display_status,
        "created_at": created_at_dt.isoformat() if created_at_dt else "",
        "business_name": order_row.get("business_name") or "",
        "supplier": {
            "farmer_contact_id": order_row.get("farmer_contact_id"),
            "name": supplier_display,
            "organization": order_row.get("organization") or "",
            "supplier_farm": order_row.get("supplier_farm") or "",
            "contact_person": order_row.get("contact_person") or "",
            "contact_number": order_row.get("contact_number") or "",
            "email": order_row.get("email") or "",
            "address": order_row.get("address") or "",
        },
        "receiving_history": receiving_history,
    }

