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
    E.g. 300 -> '300 kg', 300.5 -> '300.50 kg'
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


def get_miller_returns(
    supplier_profile_id,
    search=None,
    status_filter=None,
    supplier_id=None,
    sort_by=None,
):
    """
    Fetch returns records from miller_returns scoped to authenticated supplier_profile_id.
    Supports filtering by search term, status ('pending', 'returned', 'all'), supplier_id,
    and sorting (pending first, batch_asc, batch_desc, oldest, newest).
    """
    sql = """
        SELECT
            mr.return_id,
            mr.supplier_profile_id,
            mr.received_by_employee_id,
            mr.inbound_order_id,
            mr.receiving_id,
            mr.photo_evidence,
            mr.receiving_reference_no,
            mr.return_reference_no,
            mr.quantity_kg,
            mr.reason_description,
            mr.status,
            mr.created_at,
            mr.returned_at,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.status AS inbound_order_status,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.received_at,
            iph.receiving_proof_photo,
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization
        FROM miller_returns mr
        INNER JOIN inbound_order io
            ON io.inbound_order_id = mr.inbound_order_id
        LEFT JOIN inbound_purchase_history iph
            ON iph.receiving_id = mr.receiving_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        WHERE mr.supplier_profile_id = %s
    """
    params = [supplier_profile_id]

    # Status filter
    clean_status = str(status_filter or "").strip().lower()
    if clean_status in ("pending", "returned"):
        sql += " AND mr.status = %s"
        params.append(clean_status)

    # Supplier filter
    if supplier_id:
        try:
            s_id = int(supplier_id)
            sql += " AND io.farmer_contact_id = %s"
            params.append(s_id)
        except (ValueError, TypeError):
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
                OR LOWER(mr.return_reference_no) LIKE %s
                OR LOWER(mr.receiving_reference_no) LIKE %s
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
        sql += " ORDER BY io.batch_no ASC, mr.created_at DESC"
    elif clean_sort == "batch_desc":
        sql += " ORDER BY io.batch_no DESC, mr.created_at DESC"
    elif clean_sort == "oldest":
        sql += " ORDER BY mr.created_at ASC, mr.return_id ASC"
    elif clean_sort == "newest":
        sql += " ORDER BY mr.created_at DESC, mr.return_id DESC"
    else:
        # Default: Pending first, then newest created
        sql += " ORDER BY CASE WHEN mr.status = 'pending' THEN 0 ELSE 1 END ASC, mr.created_at DESC, mr.return_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    results = []
    for r in rows:
        supplier_name = _compute_supplier_display_name(
            r["organization"], r["supplier_farm"], r["contact_person"]
        )
        status_val = str(r["status"] or "pending").strip().lower()
        results.append({
            "id": r["return_id"],
            "return_id": r["return_id"],
            "return_reference_no": r["return_reference_no"],
            "receiving_reference_no": r["receiving_reference_no"],
            "batch_no": r["batch_no"],
            "supplier": supplier_name,
            "farmer_contact_id": r["farmer_contact_id"],
            "product_name": r["product_name"],
            "variant": r["product_name"],
            "quantity": format_readable_qty(r["quantity_kg"]),
            "quantity_kg": float(r["quantity_kg"] or 0),
            "reason_description": r["reason_description"] or "",
            "status": status_val,
            "status_label": "Pending" if status_val == "pending" else "Returned",
            "created_at": format_readable_date(r["created_at"]),
            "raw_created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "returned_at": format_readable_date(r["returned_at"]) if r["returned_at"] else None,
            "raw_returned_at": r["returned_at"].isoformat() if r["returned_at"] else None,
        })

    return results


def get_return_detail(supplier_profile_id, return_id):
    """
    Fetch comprehensive details for a specific return record.
    Returns 3 sections: Inbound Order, Receiving, Returning.
    """
    sql = """
        SELECT
            mr.return_id,
            mr.supplier_profile_id,
            mr.received_by_employee_id,
            mr.inbound_order_id,
            mr.receiving_id,
            mr.photo_evidence,
            mr.receiving_reference_no,
            mr.return_reference_no,
            mr.quantity_kg,
            mr.reason_description,
            mr.status,
            mr.created_at,
            mr.returned_at,
            io.batch_no,
            io.product_name,
            io.product_description,
            io.product_photo,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status AS inbound_order_status,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.received_at,
            iph.receiving_proof_photo,
            iph.price_per_kg,
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization
        FROM miller_returns mr
        INNER JOIN inbound_order io
            ON io.inbound_order_id = mr.inbound_order_id
        LEFT JOIN inbound_purchase_history iph
            ON iph.receiving_id = mr.receiving_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        WHERE mr.supplier_profile_id = %s
          AND mr.return_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, return_id])
        r = _row_to_dict(cursor)

    if not r:
        return None

    supplier_name = _compute_supplier_display_name(
        r["organization"], r["supplier_farm"], r["contact_person"]
    )
    status_val = str(r["status"] or "pending").strip().lower()

    return {
        "id": r["return_id"],
        "return_id": r["return_id"],
        "return_reference_no": r["return_reference_no"],
        "receiving_reference_no": r["receiving_reference_no"],
        "status": status_val,
        "status_label": "Pending" if status_val == "pending" else "Returned",
        "created_at": format_readable_date_time(r["created_at"]),
        "returned_at": format_readable_date_time(r["returned_at"]) if r["returned_at"] else None,
        # Section 1: Inbound Order
        "batch_no": r["batch_no"],
        "product_variant": r["product_name"],
        "product_description": r["product_description"] or "",
        "supplier": supplier_name,
        "product_photo": _resolve_photo_url(r["product_photo"]),
        "original_order_quantity": format_readable_qty(r["ordered_quantity"]),
        "inbound_order_status": r["inbound_order_status"],
        # Section 2: Receiving
        "total_received": format_readable_qty(r["total_received"]),
        "received_date": format_readable_date(r["received_at"]),
        "receiving_proof_photo": _resolve_photo_url(r["receiving_proof_photo"]),
        # Section 3: Returning
        "defective_quantity": format_readable_qty(r["quantity_kg"]),
        "quantity_kg": float(r["quantity_kg"] or 0),
        "reason_description": str(r["reason_description"]).strip() if (r["reason_description"] and str(r["reason_description"]).strip()) else "—",
        "rejected_goods_photo": _resolve_photo_url(r["photo_evidence"]),
    }


def get_distinct_suppliers(supplier_profile_id):
    """
    Fetch distinct active suppliers that have return records for this miller.
    """
    sql = """
        SELECT DISTINCT
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization
        FROM miller_returns mr
        INNER JOIN inbound_order io
            ON io.inbound_order_id = mr.inbound_order_id
        INNER JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        WHERE mr.supplier_profile_id = %s
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
