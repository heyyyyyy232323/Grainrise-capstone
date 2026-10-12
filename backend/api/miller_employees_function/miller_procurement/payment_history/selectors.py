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


def _format_business_address(street, barangay, municipality, province, postal_code):
    """Format business street/barangay/municipality/province postal_code."""
    parts = [str(p).strip() for p in [street, barangay, municipality, province] if p and str(p).strip()]
    addr = ", ".join(parts)
    if postal_code and str(postal_code).strip():
        addr += f" {str(postal_code).strip()}"
    return addr or "Address Not Provided"


def _format_business_contact(contact_number, email):
    """Format business contact phone and email."""
    parts = [str(p).strip() for p in [contact_number, email] if p and str(p).strip()]
    return " • ".join(parts) if parts else "Contact Not Provided"


def format_readable_date(d):
    """
    Format date/datetime as: Month day, year (e.g. Oct 8, 2026).
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
    Format datetime as: Month day, year, 12-hour time (e.g. Oct 8, 2026, 02:18 PM).
    Safely accounts for None / historical records without inventing fake dates.
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
    Format quantity with 'kg' suffix. E.g. 2300 -> '2,300 kg'
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


def format_currency(val):
    """Format currency as ₱ X,XXX.XX"""
    if val is None:
        return "₱ 0.00"
    try:
        fval = float(val)
        return f"₱ {fval:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def _resolve_photo_url(photo_path):
    """Resolve photo path to standard media path."""
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


def get_payment_history_kpi_summary(supplier_profile_id):
    """
    Compute KPI summary metrics for requested and paid records in the branch.
    """
    sql = """
        SELECT
            COALESCE(SUM(CASE WHEN iph.status = 'request_to_pay' THEN iph.total_price ELSE 0 END), 0) AS requested_total,
            COALESCE(SUM(CASE WHEN iph.status = 'request_to_pay' THEN 1 ELSE 0 END), 0) AS requested_count,
            COALESCE(SUM(CASE WHEN iph.status = 'paid' THEN iph.total_price ELSE 0 END), 0) AS paid_total,
            COALESCE(SUM(CASE WHEN iph.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_count
        FROM inbound_purchase_history iph
        WHERE iph.supplier_profile_id = %s
          AND iph.status IN ('request_to_pay', 'paid')
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        row = _row_to_dict(cursor)

    if not row:
        return {
            "requested_total": 0.0,
            "requested_total_formatted": "₱ 0.00",
            "requested_count": 0,
            "paid_total": 0.0,
            "paid_total_formatted": "₱ 0.00",
            "paid_count": 0,
        }

    req_tot = float(row.get("requested_total") or 0.0)
    paid_tot = float(row.get("paid_total") or 0.0)

    return {
        "requested_total": req_tot,
        "requested_total_formatted": format_currency(req_tot),
        "requested_count": int(row.get("requested_count") or 0),
        "paid_total": paid_tot,
        "paid_total_formatted": format_currency(paid_tot),
        "paid_count": int(row.get("paid_count") or 0),
    }


def get_distinct_suppliers(supplier_profile_id):
    """
    Retrieve unique suppliers who have payment history records in this branch.
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
          AND iph.status IN ('request_to_pay', 'paid')
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


def get_business_profile_info(supplier_profile_id):
    """
    Retrieve business information for report header.
    """
    sql = """
        SELECT business_name, street_address, barangay, municipality, province, postal_code, official_email, official_contact_number
        FROM supplier_profiles
        WHERE supplier_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        row = _row_to_dict(cursor)

    if not row:
        return {
            "business_name": "GrainRise Miller",
            "business_address": "Address Not Provided",
            "business_contact": "Contact Not Provided",
        }

    return {
        "business_name": row.get("business_name") or "GrainRise Miller",
        "business_address": _format_business_address(
            row.get("street_address"),
            row.get("barangay"),
            row.get("municipality"),
            row.get("province"),
            row.get("postal_code"),
        ),
        "business_contact": _format_business_contact(
            row.get("official_contact_number"),
            row.get("official_email"),
        ),
        "official_contact_number": row.get("official_contact_number") or "",
        "official_email": row.get("official_email") or "",
    }


def get_payment_history_list(supplier_profile_id, filters=None):
    """
    Retrieve payment history records (only request_to_pay and paid) joined with payment references.
    Enforces strict JWT branch isolation on supplier_profile_id.
    """
    filters = filters or {}
    search = filters.get("search", "").strip()
    status_filter = filters.get("status", "all").strip().lower()
    supplier_filter = filters.get("supplier", "all").strip()
    sort_by = filters.get("sort_by", "request_date_newest").strip().lower()
    start_date = filters.get("start_date", "").strip()
    end_date = filters.get("end_date", "").strip()

    where_clauses = [
        "iph.supplier_profile_id = %s",
        "iph.status IN ('request_to_pay', 'paid')",
    ]
    params = [supplier_profile_id]

    # Status filter: Requested vs Paid
    if status_filter in ("requested", "request_to_pay"):
        where_clauses.append("iph.status = 'request_to_pay'")
    elif status_filter == "paid":
        where_clauses.append("iph.status = 'paid'")

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

    # Date Range filtering (using effective request/receiving date)
    if start_date:
        where_clauses.append("DATE(COALESCE(mfppr.requested_at, iph.received_at)) >= %s")
        params.append(start_date)
    if end_date:
        where_clauses.append("DATE(COALESCE(mfppr.requested_at, iph.received_at)) <= %s")
        params.append(end_date)

    # Case-insensitive search
    if search:
        search_pattern = f"%{search}%"
        where_clauses.append(
            """(
                io.batch_no LIKE %s
                OR io.product_name LIKE %s
                OR iph.receiving_reference_no LIKE %s
                OR COALESCE(mfppr.payment_reference_id, '') LIKE %s
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
            search_pattern,
        ])

    # Sorting
    if sort_by == "batch_asc":
        order_clause = "ORDER BY io.batch_no ASC, iph.receiving_id ASC"
    elif sort_by == "batch_desc":
        order_clause = "ORDER BY io.batch_no DESC, iph.receiving_id DESC"
    elif sort_by == "amount_high":
        order_clause = "ORDER BY iph.total_price DESC, iph.receiving_id DESC"
    elif sort_by == "amount_low":
        order_clause = "ORDER BY iph.total_price ASC, iph.receiving_id ASC"
    elif sort_by == "request_date_oldest":
        order_clause = "ORDER BY (mfppr.requested_at IS NULL), mfppr.requested_at ASC, iph.received_at ASC, iph.receiving_id ASC"
    elif sort_by == "request_date_newest":
        order_clause = "ORDER BY COALESCE(mfppr.requested_at, iph.received_at) DESC, iph.receiving_id DESC"
    elif sort_by == "paid_date_oldest":
        order_clause = "ORDER BY (mfppr.paid_at IS NULL), mfppr.paid_at ASC, iph.receiving_id ASC"
    elif sort_by == "paid_date_newest":
        order_clause = "ORDER BY (mfppr.paid_at IS NULL), mfppr.paid_at DESC, iph.receiving_id DESC"
    else:  # default request_date_newest
        order_clause = "ORDER BY COALESCE(mfppr.requested_at, iph.received_at) DESC, iph.receiving_id DESC"

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
            io.batch_no,
            io.product_name,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.product_photo,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            mfppr.payment_method,
            mfppr.payment_reference_id,
            mfppr.requested_at,
            mfppr.paid_at,
            rec_emp.first_name AS rec_first,
            rec_emp.last_name AS rec_last,
            req_emp.first_name AS req_first,
            req_emp.last_name AS req_last,
            paid_emp.first_name AS paid_first,
            paid_emp.last_name AS paid_last
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
        LEFT JOIN supplier_employees paid_emp
            ON paid_emp.supplier_employee_id = COALESCE(mfppr.paid_by_employee_id, iph.paid_by_employee_id)
        WHERE {where_sql}
        {order_clause}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    results = []
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

        # Names
        rec_first = row.get("rec_first") or ""
        rec_last = row.get("rec_last") or ""
        received_by = f"{rec_first} {rec_last}".strip() or "Warehouse Staff"

        req_first = row.get("req_first") or ""
        req_last = row.get("req_last") or ""
        requested_by = f"{req_first} {req_last}".strip() or "Procurement Staff"

        paid_first = row.get("paid_first") or ""
        paid_last = row.get("paid_last") or ""
        paid_by = f"{paid_first} {paid_last}".strip() or "N/A"

        # Status
        rec_status = (row.get("receiving_status") or "").strip().lower()
        is_paid = rec_status == "paid"
        status_label = "Paid" if is_paid else "Requested"

        # Safely account for dates without inventing fake dates
        requested_at_raw = row.get("requested_at")
        requested_at_formatted = format_readable_date_time(requested_at_raw) if requested_at_raw else "—"
        requested_date_only = format_readable_date(requested_at_raw) if requested_at_raw else "—"

        paid_at_raw = row.get("paid_at")
        paid_at_formatted = format_readable_date_time(paid_at_raw) if paid_at_raw else "N/A"
        paid_date_only = format_readable_date(paid_at_raw) if paid_at_raw else "N/A"

        payment_method = row.get("payment_method") or "N/A"
        payment_reference = row.get("payment_reference_id") or "N/A"

        results.append({
            "id": row["receiving_id"],
            "receiving_id": row["receiving_id"],
            "order_id": row["order_id"],
            "batch_no": row["batch_no"],
            "reference_no": row["receiving_reference_no"],
            "receiving_reference_no": row["receiving_reference_no"],
            "variant": row["product_name"] or "—",
            "product_name": row["product_name"] or "—",
            "product_photo": _resolve_photo_url(row.get("product_photo")),
            "supplier": supplier_display,
            "farmer_contact_id": row.get("farmer_contact_id"),
            "ordered_quantity": ordered_quantity,
            "original_order_quantity": format_readable_qty(ordered_quantity),
            "total_received": format_readable_qty(total_received),
            "total_received_raw": total_received,
            "received_good": format_readable_qty(received_good),
            "received_good_raw": received_good,
            "received_bad": format_readable_qty(received_bad),
            "received_bad_raw": received_bad,
            "price_per_kg": format_currency(price_per_kg),
            "price_per_kg_raw": price_per_kg,
            "total_amount": format_currency(total_price),
            "total_price": total_price,
            "status": status_label,
            "status_raw": rec_status,
            "is_paid": is_paid,
            # Dates
            "received_at": str(row.get("received_at") or ""),
            "received_date": format_readable_date(row.get("received_at")),
            "requested_at": str(requested_at_raw) if requested_at_raw else None,
            "requested_at_formatted": requested_at_formatted,
            "requested_date": requested_date_only,
            "paid_at": str(paid_at_raw) if paid_at_raw else None,
            "paid_at_formatted": paid_at_formatted,
            "paid_date": paid_date_only,
            # Employees
            "received_by": received_by,
            "requested_by": requested_by,
            "paid_by": paid_by if is_paid else "N/A",
            # Payment reference info
            "payment_method": payment_method if is_paid else "N/A",
            "payment_reference": payment_reference if is_paid else "N/A",
            "payment_reference_id": payment_reference if is_paid else "N/A",
        })

    kpi = get_payment_history_kpi_summary(supplier_profile_id)
    suppliers = get_distinct_suppliers(supplier_profile_id)
    business_info = get_business_profile_info(supplier_profile_id)

    return {
        "records": results,
        "kpi": kpi,
        "suppliers": suppliers,
        "business_info": business_info,
        "total_count": len(results),
    }


def get_payment_history_detail(supplier_profile_id, receiving_id):
    """
    Retrieve single payment history record details with full receipt fields.
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
            iph.price_per_kg,
            iph.total_price,
            iph.status AS receiving_status,
            iph.received_at,
            iph.receiving_proof_photo,
            io.inbound_order_id,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status AS order_procurement_status,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            fc.contact_number AS farmer_contact_number,
            sp.business_name,
            sp.street_address,
            sp.barangay,
            sp.municipality,
            sp.province,
            sp.postal_code,
            sp.official_email,
            sp.official_contact_number,
            mfppr.payment_method,
            mfppr.payment_reference_id,
            mfppr.requested_at,
            mfppr.paid_at,
            rec_emp.first_name AS rec_first,
            rec_emp.last_name AS rec_last,
            req_emp.first_name AS req_first,
            req_emp.last_name AS req_last,
            paid_emp.first_name AS paid_first,
            paid_emp.last_name AS paid_last
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN miller_finance_payables_payment_references mfppr
            ON mfppr.receiving_id = iph.receiving_id
        LEFT JOIN supplier_employees rec_emp
            ON rec_emp.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN supplier_employees req_emp
            ON req_emp.supplier_employee_id = mfppr.requested_by_employee_id
        LEFT JOIN supplier_employees paid_emp
            ON paid_emp.supplier_employee_id = COALESCE(mfppr.paid_by_employee_id, iph.paid_by_employee_id)
        WHERE iph.supplier_profile_id = %s
          AND iph.receiving_id = %s
          AND iph.status IN ('request_to_pay', 'paid')
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, receiving_id])
        row = _row_to_dict(cursor)

    if not row:
        return None

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

    # Names
    rec_first = row.get("rec_first") or ""
    rec_last = row.get("rec_last") or ""
    received_by = f"{rec_first} {rec_last}".strip() or "Warehouse Staff"

    req_first = row.get("req_first") or ""
    req_last = row.get("req_last") or ""
    requested_by = f"{req_first} {req_last}".strip() or "Procurement Staff"

    paid_first = row.get("paid_first") or ""
    paid_last = row.get("paid_last") or ""
    paid_by = f"{paid_first} {paid_last}".strip() or "N/A"

    # Status
    rec_status = (row.get("receiving_status") or "").strip().lower()
    is_paid = rec_status == "paid"
    status_label = "Paid" if is_paid else "Requested"

    # Dates
    requested_at_raw = row.get("requested_at")
    requested_at_formatted = format_readable_date_time(requested_at_raw) if requested_at_raw else "—"
    requested_date_only = format_readable_date(requested_at_raw) if requested_at_raw else "—"

    paid_at_raw = row.get("paid_at")
    paid_at_formatted = format_readable_date_time(paid_at_raw) if paid_at_raw else "N/A"
    paid_date_only = format_readable_date(paid_at_raw) if paid_at_raw else "N/A"

    payment_method = row.get("payment_method") or "N/A"
    payment_reference = row.get("payment_reference_id") or "N/A"

    # Business address
    business_name = row.get("business_name") or "GrainRise Miller"
    business_address = _format_business_address(
        row.get("street_address"),
        row.get("barangay"),
        row.get("municipality"),
        row.get("province"),
        row.get("postal_code"),
    )
    business_contact = _format_business_contact(
        row.get("official_contact_number"),
        row.get("official_email"),
    )

    return {
        "receiving_id": row["receiving_id"],
        "order_id": row["inbound_order_id"],
        "batch_no": row["batch_no"],
        "reference_no": row["receiving_reference_no"],
        "receiving_reference_no": row["receiving_reference_no"],
        "status": status_label,
        "status_raw": rec_status,
        "is_paid": is_paid,
        # Inbound Order Details
        "variant": row["product_name"] or "—",
        "product_name": row["product_name"] or "—",
        "product_description": row.get("product_description"),
        "product_photo": _resolve_photo_url(row.get("product_photo")),
        "supplier": supplier_display,
        "original_order_quantity": format_readable_qty(ordered_quantity),
        "ordered_quantity": ordered_quantity,
        # Receiving Details
        "total_received": format_readable_qty(total_received),
        "total_received_raw": total_received,
        "received_good": format_readable_qty(received_good),
        "received_good_raw": received_good,
        "received_bad": format_readable_qty(received_bad),
        "price_per_kg": format_currency(price_per_kg),
        "price_per_kg_raw": price_per_kg,
        "payable": format_currency(total_price),
        "amount_to_pay": format_currency(total_price),
        "total_price": total_price,
        "received_by": received_by,
        "received_date": format_readable_date(row.get("received_at")),
        "received_at": str(row.get("received_at") or ""),
        # Payment Details (Paid only)
        "requested_at": str(requested_at_raw) if requested_at_raw else None,
        "requested_at_formatted": requested_at_formatted,
        "requested_date": requested_date_only,
        "requested_by": requested_by,
        "paid_at": str(paid_at_raw) if paid_at_raw else None,
        "paid_at_formatted": paid_at_formatted,
        "paid_date": paid_date_only,
        "paid_by": paid_by if is_paid else "N/A",
        "payment_method": payment_method if is_paid else "N/A",
        "payment_reference": payment_reference if is_paid else "N/A",
        "payment_reference_id": payment_reference if is_paid else "N/A",
        # Business metadata for receipt modal
        "business_name": business_name,
        "business_address": business_address,
        "business_contact": business_contact,
    }
