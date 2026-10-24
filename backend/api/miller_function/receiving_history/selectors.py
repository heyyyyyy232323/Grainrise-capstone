import datetime
import logging
from django.db import connection

from api.miller_employees_function.miller_procurement.receiving_history.selectors import (
    _rows_to_dicts,
    _row_to_dict,
    _compute_supplier_display_name,
    format_readable_date,
    format_readable_date_time,
    format_readable_qty,
    format_readable_currency,
    _resolve_photo_url,
    _compute_receiver_name,
)

logger = logging.getLogger(__name__)


def get_manager_receiving_history(
    miller_user_id,
    branch_id=None,
    search=None,
    start_date=None,
    end_date=None,
    supplier_id=None,
    status_filter=None,
    sort_by=None,
):
    """
    Fetch historical receiving records from inbound_purchase_history joined with inbound_order
    and supplier_profiles, scoped across ALL branches owned by the Miller Manager (sp.user_id = miller_user_id).

    Supports optional branch_id filter (supplier_profile_id).
    """
    if not miller_user_id:
        return []

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
            sp.business_name AS branch_name,
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
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
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
        WHERE sp.user_id = %s
    """
    params = [miller_user_id]

    # Optional branch filter
    if branch_id and str(branch_id).lower() != "all":
        try:
            b_id = int(branch_id)
            sql += " AND iph.supplier_profile_id = %s"
            params.append(b_id)
        except (ValueError, TypeError):
            pass

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
                OR LOWER(COALESCE(sp.business_name, '')) LIKE %s
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

        branch_title = r.get("branch_name") or ""

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
            "supplier_profile_id": r["supplier_profile_id"],
            "supplierProfileId": r["supplier_profile_id"],
            "branch_name": branch_title,
            "branchName": branch_title,
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


def get_manager_receiving_history_detail(miller_user_id, receiving_id):
    """
    Fetch comprehensive details for a specific historical receiving record.
    Scoped to verify server-side that the receiving record's branch belongs to
    the authenticated Miller Manager (sp.user_id = miller_user_id).
    """
    if not miller_user_id or not receiving_id:
        return None

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
            sp.business_name AS branch_name,
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
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
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
        WHERE sp.user_id = %s
          AND iph.receiving_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [miller_user_id, receiving_id])
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
    branch_title = r.get("branch_name") or ""

    return {
        "id": r["receiving_id"],
        "receiving_id": r["receiving_id"],
        "order_id": r["order_id"],
        "receiving_reference_no": r["receiving_reference_no"],
        "batch_no": r["batch_no"],
        "supplier_profile_id": r["supplier_profile_id"],
        "supplierProfileId": r["supplier_profile_id"],
        "branch_name": branch_title,
        "branchName": branch_title,
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


def get_manager_distinct_history_suppliers(miller_user_id, branch_id=None):
    """
    Fetch distinct active suppliers that have historical receiving records across
    branches owned by this Miller Manager.
    """
    if not miller_user_id:
        return []

    sql = """
        SELECT DISTINCT
            fc.farmer_contact_id,
            fc.contact_person,
            fc.supplier_farm,
            fc.organization
        FROM inbound_purchase_history iph
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        INNER JOIN farmer_contacts fc
            ON fc.farmer_contact_id = io.farmer_contact_id
        WHERE sp.user_id = %s
    """
    params = [miller_user_id]

    if branch_id and str(branch_id).lower() != "all":
        try:
            b_id = int(branch_id)
            sql += " AND iph.supplier_profile_id = %s"
            params.append(b_id)
        except (ValueError, TypeError):
            pass

    sql += " ORDER BY COALESCE(fc.organization, fc.supplier_farm, fc.contact_person) ASC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
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

