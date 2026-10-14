import datetime
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


def format_readable_qty(qty):
    """Format quantity with 'kg' suffix. E.g. 2300 -> '2,300 kg'"""
    if qty is None:
        return "0 kg"
    try:
        val = float(qty)
        if val % 1 == 0:
            return f"{int(val):,} kg"
        return f"{val:,.2f} kg"
    except (ValueError, TypeError):
        return f"{qty} kg"


def format_currency(val):
    """Format currency as ₱ X,XXX.XX"""
    if val is None:
        return "₱ 0.00"
    try:
        fval = float(val)
        return f"₱ {fval:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def format_readable_date(d):
    """Format date/datetime as: Month day, year (e.g. Oct 8, 2026)."""
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


def get_distinct_payables_suppliers(supplier_profile_id):
    """
    Retrieve unique suppliers who have pending payable records (status='request_to_pay').
    """
    sql = """
        SELECT DISTINCT
            fc.farmer_contact_id,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_purchase_history iph
        INNER JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        WHERE iph.supplier_profile_id = %s
          AND iph.status = 'request_to_pay'
        ORDER BY fc.organization, fc.supplier_farm, fc.contact_person
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    suppliers = []
    seen = set()
    for r in rows:
        disp = _compute_supplier_display_name(
            r.get("organization"),
            r.get("supplier_farm"),
            r.get("contact_person"),
        )
        s_id = r.get("farmer_contact_id")
        if disp and disp not in seen:
            seen.add(disp)
            suppliers.append({
                "id": s_id,
                "name": disp,
            })
    return suppliers


def get_payables_list(supplier_profile_id, filters=None):
    """
    Retrieve payables records (ONLY request_to_pay status) for Miller Finance.
    Enforces strict JWT branch isolation on supplier_profile_id.
    """
    filters = filters or {}
    search = filters.get("search", "").strip()
    supplier_filter = filters.get("supplier", "").strip()
    sort_by = filters.get("sort_by", "batch-asc").strip().lower()

    where_clauses = [
        "iph.supplier_profile_id = %s",
        "iph.status = 'request_to_pay'",
    ]
    params = [supplier_profile_id]

    # Supplier filter
    if supplier_filter and supplier_filter.lower() != "all":
        if supplier_filter.isdigit():
            where_clauses.append("iph.farmer_contact_id = %s")
            params.append(int(supplier_filter))
        else:
            where_clauses.append(
                """(
                    LOWER(fc.organization) = LOWER(%s)
                    OR LOWER(fc.supplier_farm) = LOWER(%s)
                    OR LOWER(fc.contact_person) = LOWER(%s)
                )"""
            )
            params.extend([supplier_filter, supplier_filter, supplier_filter])

    # Case-insensitive search
    if search:
        search_pattern = f"%{search}%"
        where_clauses.append(
            """(
                io.batch_no LIKE %s
                OR io.product_name LIKE %s
                OR iph.receiving_reference_no LIKE %s
                OR COALESCE(fc.organization, '') LIKE %s
                OR COALESCE(fc.supplier_farm, '') LIKE %s
                OR COALESCE(fc.contact_person, '') LIKE %s
            )"""
        )
        params.extend([
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
            search_pattern,
        ])

    # Sorting
    if sort_by == "batch-desc":
        order_clause = "ORDER BY io.batch_no DESC, iph.receiving_id DESC"
    elif sort_by == "supplier-asc":
        order_clause = "ORDER BY COALESCE(NULLIF(fc.organization, ''), NULLIF(fc.supplier_farm, ''), fc.contact_person) ASC, iph.receiving_id ASC"
    elif sort_by == "supplier-desc":
        order_clause = "ORDER BY COALESCE(NULLIF(fc.organization, ''), NULLIF(fc.supplier_farm, ''), fc.contact_person) DESC, iph.receiving_id DESC"
    elif sort_by == "variant-asc":
        order_clause = "ORDER BY io.product_name ASC, iph.receiving_id ASC"
    elif sort_by == "variant-desc":
        order_clause = "ORDER BY io.product_name DESC, iph.receiving_id DESC"
    elif sort_by == "total-desc":
        order_clause = "ORDER BY iph.total_price DESC, iph.receiving_id DESC"
    elif sort_by == "total-asc":
        order_clause = "ORDER BY iph.total_price ASC, iph.receiving_id ASC"
    else:  # default batch-asc
        order_clause = "ORDER BY io.batch_no ASC, iph.receiving_id ASC"

    where_sql = " AND ".join(where_clauses)
    sql = f"""
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
            iph.status AS receiving_status,
            iph.received_at,
            iph.receiving_proof_photo,
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.ordered_quantity,
            io.expected_arrival_date,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            mfppr.payment_method,
            mfppr.payment_reference_id,
            mfppr.requested_at,
            rec_emp.first_name AS rec_first,
            rec_emp.last_name AS rec_last,
            req_emp.first_name AS req_first,
            req_emp.last_name AS req_last
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN miller_finance_payables_payment_references mfppr
            ON mfppr.receiving_id = iph.receiving_id
        LEFT JOIN supplier_employees rec_emp
            ON rec_emp.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN supplier_employees req_emp
            ON req_emp.supplier_employee_id = mfppr.requested_by_employee_id
        WHERE {where_sql}
        {order_clause}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    records = []
    for row in rows:
        supplier_display = _compute_supplier_display_name(
            row.get("organization"),
            row.get("supplier_farm"),
            row.get("contact_person"),
        )

        total_received = float(row.get("total_received") or 0.0)
        received_good = float(row.get("received_good") or 0.0)
        received_bad = float(row.get("received_bad") or 0.0)
        price_per_kg = float(row.get("price_per_kg") or 0.0)
        total_price = float(row.get("total_price") or 0.0)
        ordered_quantity = float(row.get("ordered_quantity") or 0.0)

        rec_first = row.get("rec_first") or ""
        rec_last = row.get("rec_last") or ""
        received_by = f"{rec_first} {rec_last}".strip() or "Warehouse Staff"

        req_first = row.get("req_first") or ""
        req_last = row.get("req_last") or ""
        requested_by = f"{req_first} {req_last}".strip() or "Procurement Staff"

        records.append({
            "id": row["receiving_id"],
            "receiving_id": row["receiving_id"],
            "order_id": row["order_id"],
            "batchNo": row["batch_no"],
            "batch_no": row["batch_no"],
            "reference_no": row["receiving_reference_no"],
            "receiving_reference_no": row["receiving_reference_no"],
            "supplier": supplier_display,
            "contact_person": row.get("contact_person") or "",
            "variant": row["product_name"] or "—",
            "stockQty": format_readable_qty(received_good),
            "unitPrice": format_currency(price_per_kg),
            "total": format_currency(total_price),
            "total_raw": total_price,
            "requestedBy": requested_by,
            # Inbound Order Details for Pay Now Modal
            "original_order_quantity": format_readable_qty(ordered_quantity),
            "ordered_quantity": ordered_quantity,
            # Receiving Details for Pay Now Modal
            "total_received": format_readable_qty(total_received),
            "total_received_raw": total_received,
            "received_good": format_readable_qty(received_good),
            "received_good_raw": received_good,
            "received_bad": format_readable_qty(received_bad),
            "price_per_kg": format_currency(price_per_kg),
            "price_per_kg_raw": price_per_kg,
            "payable": format_currency(total_price),
            "amount_to_pay": format_currency(total_price),
            "received_by": received_by,
            "received_date": format_readable_date(row.get("received_at")),
            "requested_date": format_readable_date(row.get("requested_at")),
        })

    distinct_suppliers = get_distinct_payables_suppliers(supplier_profile_id)

    return {
        "records": records,
        "suppliers": distinct_suppliers,
        "total_count": len(records),
    }


def get_payable_detail(supplier_profile_id, receiving_id):
    """
    Retrieve single payable record detail with verification.
    """
    payables_data = get_payables_list(supplier_profile_id)
    for rec in payables_data["records"]:
        if rec["receiving_id"] == receiving_id:
            return rec
    return None

