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
    E.g. 2300 -> '2,300 kg', 2300.5 -> '2,300.5 kg'
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
    E.g. 24.5 -> '₱ 24.50', 56350 -> '₱ 56,350.00'
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


def _format_business_address(street, barangay, municipality, province, postal_code):
    """Format business street/barangay/municipality/province postal_code."""
    parts = [str(p).strip() for p in [street, barangay, municipality, province] if p and str(p).strip()]
    addr = ", ".join(parts)
    if postal_code and str(postal_code).strip():
        addr += f" {str(postal_code).strip()}"
    return addr or "Address Not Provided"


def _format_business_contact(contact_number, email):
    """Format contact details string."""
    parts = []
    if contact_number and str(contact_number).strip():
        parts.append(str(contact_number).strip())
    if email and str(email).strip():
        parts.append(str(email).strip())
    return " • ".join(parts) or "Contact Not Provided"


def get_pending_goods_receipts(supplier_profile_id, search=None, sort_by=None):
    """
    Fetch inbound_purchase_history records with status = 'pending',
    scoped strictly to the authenticated Miller business (supplier_profile_id).

    Sorting:
      - 'oldest': Oldest -> Newest (received_at ASC, default)
      - 'newest': Newest -> Oldest (received_at DESC)
      - 'batch_asc': Batch A-Z (batch_no ASC)
      - 'batch_desc': Batch Z-A (batch_no DESC)
    """
    where_clauses = [
        "iph.supplier_profile_id = %s",
        "iph.status = 'pending'",
    ]
    params = [supplier_profile_id]

    # Search filter: batch_no, receiving_reference_no, product_name, supplier (case-insensitive)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        where_clauses.append(
            """(
                LOWER(io.batch_no) LIKE %s
                OR LOWER(iph.receiving_reference_no) LIKE %s
                OR LOWER(io.product_name) LIKE %s
                OR LOWER(fc.organization) LIKE %s
                OR LOWER(fc.supplier_farm) LIKE %s
                OR LOWER(fc.contact_person) LIKE %s
            )"""
        )
        params.extend([term, term, term, term, term, term])

    # Sort orders: default Oldest -> Newest
    sort_key = (sort_by or "oldest").strip().lower()
    if sort_key == "newest":
        order_clause = "ORDER BY iph.received_at DESC, iph.receiving_id DESC"
    elif sort_key == "batch_asc":
        order_clause = "ORDER BY io.batch_no ASC, iph.receiving_id ASC"
    elif sort_key == "batch_desc":
        order_clause = "ORDER BY io.batch_no DESC, iph.receiving_id DESC"
    else:  # oldest (default)
        order_clause = "ORDER BY iph.received_at ASC, iph.receiving_id ASC"

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
            iph.status,
            iph.received_at,
            iph.receiving_proof_photo,
            io.batch_no,
            io.product_name,
            io.ordered_quantity,
            io.expected_arrival_date,
            io.status AS order_procurement_status,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
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

        results.append({
            "id": row["receiving_id"],
            "receiving_id": row["receiving_id"],
            "order_id": row["order_id"],
            "batch_no": row["batch_no"],
            "reference_no": row["receiving_reference_no"],
            "receiving_reference_no": row["receiving_reference_no"],
            "supplier": supplier_display,
            "variant": row["product_name"] or "—",
            "total_received": total_received,
            "received_good": received_good,
            "received_bad": received_bad,
            "price_per_kg": price_per_kg,
            "total_price": total_price,
            "status": row["status"],
            "received_at": str(row["received_at"]) if row.get("received_at") else None,
            "ordered_quantity": ordered_quantity,
            "expected_arrival_date": str(row["expected_arrival_date"]) if row.get("expected_arrival_date") else None,
            "order_procurement_status": row.get("order_procurement_status"),
            # Formatted fields for table display
            "formatted_total_received": format_readable_qty(total_received),
            "formatted_received_good": format_readable_qty(received_good),
            "formatted_received_bad": format_readable_qty(received_bad),
            "formatted_unit_price": format_readable_currency(price_per_kg),
            "formatted_total_price": format_readable_currency(total_price),
            "formatted_received_date": format_readable_date(row.get("received_at")),
            "receiving_proof_photo": _resolve_photo_url(row.get("receiving_proof_photo")),
        })

    return results


def get_goods_receipt_detail(supplier_profile_id, receiving_id):
    """
    Retrieve single receiving record detail along with inbound order details
    and business profile information.
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
            sp.official_contact_number
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
        WHERE iph.supplier_profile_id = %s
          AND iph.receiving_id = %s
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

    # Format business address and contact
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

    # Inbound order procurement status formatting
    procurement_status = row.get("order_procurement_status") or "ordered"
    status_display = procurement_status.replace("_", " ").title()

    return {
        "receiving_id": row["receiving_id"],
        "order_id": row["inbound_order_id"],
        "batch_no": row["batch_no"],
        "receiving_reference_no": row["receiving_reference_no"],
        "reference_no": row["receiving_reference_no"],
        "status": row["receiving_status"],
        "is_pending": row["receiving_status"] == "pending",
        # Inbound Order Details
        "variant": row["product_name"] or "—",
        "supplier": supplier_display,
        "original_order_quantity": format_readable_qty(ordered_quantity),
        "raw_ordered_quantity": ordered_quantity,
        "expected_arrival_date": format_readable_date(row.get("expected_arrival_date")),
        "procurement_status": procurement_status,
        "procurement_status_label": status_display,
        # Procurement Receiving
        "received_date": format_readable_date_time(row.get("received_at")),
        "received_at": str(row["received_at"]) if row.get("received_at") else None,
        "total_received": format_readable_qty(total_received),
        "received_good": format_readable_qty(received_good),
        "received_bad": format_readable_qty(received_bad),
        "raw_total_received": total_received,
        "raw_received_good": received_good,
        "raw_received_bad": received_bad,
        "price_per_kg": format_readable_currency(price_per_kg),
        "amount_to_pay": format_readable_currency(total_price),
        "raw_total_price": total_price,
        "raw_price_per_kg": price_per_kg,
        "receiving_proof_photo": _resolve_photo_url(row.get("receiving_proof_photo")),
        # Business Details for Receipt Header
        "business_name": business_name,
        "business_address": business_address,
        "business_contact": business_contact,
        "business_header_subtitle": f"{business_address} • {business_contact}",
    }

