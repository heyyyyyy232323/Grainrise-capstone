import datetime
import logging
import re
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
    """Format date/datetime as: Month day, year (e.g. Oct 27, 2026)."""
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


def format_readable_date_time(d):
    """Format datetime as: Month day, year 12-hour time (e.g. Oct 27, 2026 02:30 PM)."""
    if not d:
        return "—"
    if isinstance(d, str):
        try:
            d = datetime.datetime.fromisoformat(d.replace("Z", "+00:00"))
        except Exception:
            return str(d)
    if isinstance(d, datetime.datetime):
        return d.strftime("%b %d, %Y %I:%M %p")
    return str(d)


def extract_last4_batch(batch_no, fallback_id=None):
    """
    Extract LAST4BATCH from batch number.
    Prioritizes the last segment after hyphens if present.
    Example: 'DIN-RI-20261008-0529' -> '0529'
             'PR-0002' -> '0002'
    """
    segments = [s.strip() for s in str(batch_no or "").split("-") if s.strip()]
    if segments:
        last_seg = re.sub(r"[^A-Za-z0-9]", "", segments[-1]).upper()
        if len(last_seg) >= 4:
            return last_seg[-4:]
    clean = re.sub(r"[^A-Za-z0-9]", "", str(batch_no or "").strip()).upper()
    if len(clean) >= 4:
        return clean[-4:]
    if fallback_id:
        try:
            return f"{int(fallback_id):04d}"[-4:]
        except Exception:
            pass
    return clean.zfill(4) if clean else "0001"


def extract_first2_business(business_name):
    """
    Extract FIRST2BUSINESS.
    Example: 'Grainrise' -> 'GR'
             'Riggie Grains' -> 'RI'
    """
    clean = re.sub(r"[^A-Za-z0-9]", "", str(business_name or "").strip()).upper()
    if len(clean) >= 2:
        return clean[:2]
    return clean.ljust(2, "X") if clean else "WH"


def extract_contact_initials(contact_name):
    """
    Extract CONTACTINITIALS.
    Example: 'Juan Magsasaka' -> 'JM'
             'Juan' -> 'JU'
    """
    if not contact_name:
        return "SU"
    words = [w for w in re.split(r"[^A-Za-z0-9]+", str(contact_name).strip()) if w]
    if len(words) >= 2:
        return "".join(w[0].upper() for w in words)[:4]
    elif len(words) == 1:
        clean = re.sub(r"[^A-Za-z0-9]", "", words[0]).upper()
        return clean[:2] if len(clean) >= 2 else clean.ljust(2, "X")
    return "SU"


def format_standard_receiving_reference(batch_no, business_name, contact_person, dt=None, fallback_id=None):
    """
    Generate canonical receiving reference format matching Miller Payables standard:
    Format: LAST4BATCH-FIRST2BUSINESS-CONTACTINITIALS-MMDDYYYY-HHMM
    Example: 0529-RI-JM-10112026-1558
    """
    last4 = extract_last4_batch(batch_no, fallback_id=fallback_id)
    first2_bus = extract_first2_business(business_name)
    contact_init = extract_contact_initials(contact_person)
    if not dt or not hasattr(dt, "strftime"):
        dt = datetime.datetime.now()
    mmddyyyy = dt.strftime("%m%d%Y")
    hhmm = dt.strftime("%H%M")
    return f"{last4}-{first2_bus}-{contact_init}-{mmddyyyy}-{hhmm}"


def normalize_receiving_reference(existing_ref, batch_no, business_name, contact_person, dt=None, fallback_id=None):
    """
    If existing_ref matches the standard pattern (e.g. 0529-RI-JM-10112026-1558), return it.
    If it is a placeholder (like REC-EXT-TEST-001, REC-1, etc.) or None,
    generate the standard canonical reference format.
    """
    s_ref = str(existing_ref or "").strip()
    if re.match(r"^[A-Z0-9]{4}-[A-Z0-9]{2,4}-[A-Z0-9]{2,4}-\d{8}-\d{4}(?:-\d+)?$", s_ref):
        return s_ref
    return format_standard_receiving_reference(batch_no, business_name, contact_person, dt, fallback_id=fallback_id)


def format_business_address(street, barangay, municipality, province, postal_code):
    """Format business street/barangay/municipality/province postal_code."""
    parts = [str(p).strip() for p in [street, barangay, municipality, province] if p and str(p).strip()]
    addr = ", ".join(parts)
    if postal_code and str(postal_code).strip():
        addr += f" {str(postal_code).strip()}"
    return addr or "Address Not Provided"


def format_business_contact(contact_number, email):
    """Format business contact phone and email."""
    parts = [str(p).strip() for p in [contact_number, email] if p and str(p).strip()]
    return " • ".join(parts) if parts else "Contact Not Provided"


def get_distinct_warehouse_suppliers(warehouse_profile_ids):
    """
    Retrieve unique suppliers who have pending payable records for the given warehouse profile(s).
    Includes both Registered Millers and External Suppliers.
    """
    if not warehouse_profile_ids:
        return []

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))
    suppliers = []
    seen = set()

    # 1. Registered Millers from miller_online_customer_receiving_history
    sql_reg = f"""
        SELECT DISTINCT
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.miller_receiving_id = rh.receiving_id
        WHERE (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
          AND (rh.status != 'Paid' OR rh.status IS NULL)
          AND (fpay.paid_at IS NULL)
    """
    params_reg = list(warehouse_profile_ids) + list(warehouse_profile_ids)

    # 2. External Suppliers from warehouse_nongrainrise_supplier_receiving_history
    sql_ext = f"""
        SELECT DISTINCT
            ngsc.warehouse_nongrainrise_supplier_contact_id,
            ngsc.business_name,
            ngsc.contact_person
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
            ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.nongrainrise_receiving_id = rh.receiving_id
        WHERE rh.warehouse_profile_id IN ({placeholders})
          AND (LOWER(rh.status) != 'paid')
          AND (fpay.paid_at IS NULL)
    """
    params_ext = list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(sql_reg, params_reg)
        for r in _rows_to_dicts(cursor):
            name = (r.get("business_name") or r.get("organization_name") or "Registered Miller").strip()
            if name and name not in seen:
                seen.add(name)
                suppliers.append({
                    "id": f"reg_{r.get('supplier_profile_id')}",
                    "name": name,
                    "type": "registered_miller",
                })

        cursor.execute(sql_ext, params_ext)
        for r in _rows_to_dicts(cursor):
            name = (r.get("business_name") or r.get("contact_person") or "External Supplier").strip()
            if name and name not in seen:
                seen.add(name)
                suppliers.append({
                    "id": f"ext_{r.get('warehouse_nongrainrise_supplier_contact_id')}",
                    "name": name,
                    "type": "external_supplier",
                })

    return sorted(suppliers, key=lambda s: s["name"].lower())


def get_warehouse_payables_list(warehouse_profile_ids, filters=None):
    """
    Retrieve outstanding payable records for the authenticated Warehouse branch.
    Aggregates:
    - Registered Millers (miller_online_customer_receiving_history)
    - External Suppliers (warehouse_nongrainrise_supplier_receiving_history)
    Filters by search query, supplier, and sorting.
    """
    if not warehouse_profile_ids:
        return {"records": [], "count": 0}

    filters = filters or {}
    search = str(filters.get("search", "")).strip().lower()
    supplier_filter = str(filters.get("supplier", "")).strip()
    sort_by = str(filters.get("sort_by", "batch-asc")).strip().lower()

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    # ============================================================
    # 1. REGISTERED MILLERS QUERY
    # ============================================================
    sql_reg = f"""
        SELECT
            rh.receiving_id,
            'registered_miller' AS supplier_type,
            moc.online_order_id,
            moc.batch_no,
            moc.ordered_quantity AS original_order_quantity,
            moc.total_price AS order_total_price,
            sp.supplier_profile_id,
            COALESCE(NULLIF(sp.business_name, ''), NULLIF(sp.organization_name, ''), 'Registered Miller') AS supplier_name,
            sp.official_contact_number AS supplier_contact_number,
            sp.official_email AS supplier_email,
            mp.product_name,
            mp.product_image,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.payables AS total_payable,
            rh.status AS receiving_status,
            rh.proof AS receiving_proof_photo,
            rh.received_at,
            fpay.payable_reference_id,
            fpay.amount_to_pay,
            fpay.payment_method,
            fpay.payment_reference_id,
            fpay.receipt_image_url,
            fpay.requested_at,
            fpay.paid_at,
            CONCAT_WS(' ', req_emp.first_name, NULLIF(req_emp.middle_initial, ''), req_emp.last_name) AS requested_by_name,
            xpt.payment_attempt_id,
            xpt.payment_status AS xendit_status,
            xpt.payment_link_url AS xendit_payment_link_url,
            xpt.reference_id AS xendit_reference_id
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.miller_receiving_id = rh.receiving_id
        LEFT JOIN warehouse_employees req_emp
            ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
        LEFT JOIN warehouse_miller_purchase_xendit_payment_tracking xpt
            ON xpt.online_order_id = moc.online_order_id
           AND xpt.payment_status IN ('CREATED', 'PENDING')
        WHERE (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
          AND (rh.status != 'Paid' OR rh.status IS NULL)
          AND (fpay.paid_at IS NULL)
    """
    params_reg = list(warehouse_profile_ids) + list(warehouse_profile_ids)

    # ============================================================
    # 2. EXTERNAL SUPPLIERS QUERY
    # ============================================================
    sql_ext = f"""
        SELECT
            rh.receiving_id,
            'external_supplier' AS supplier_type,
            rh.purchase_request_id,
            CONCAT('PR-', LPAD(rh.purchase_request_id, 4, '0')) AS batch_no,
            wpr.ordered_quantity AS original_order_quantity,
            rh.total_price AS order_total_price,
            ngsc.warehouse_nongrainrise_supplier_contact_id,
            COALESCE(NULLIF(ngsc.business_name, ''), NULLIF(ngsc.contact_person, ''), 'External Supplier') AS supplier_name,
            ngsc.contact_number AS supplier_contact_number,
            ngsc.email AS supplier_email,
            ngsc.contact_person AS supplier_contact_person,
            COALESCE(NULLIF(wpr.product_name, ''), 'Palay Grain') AS product_name,
            wpr.product_photo AS product_image,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.price_per_kg,
            rh.total_price AS total_payable,
            rh.status AS receiving_status,
            rh.receiving_proof_photo,
            rh.received_at,
            fpay.payable_reference_id,
            fpay.amount_to_pay,
            fpay.payment_method,
            fpay.payment_reference_id,
            fpay.receipt_image_url,
            fpay.requested_at,
            fpay.paid_at,
            CONCAT_WS(' ', req_emp.first_name, NULLIF(req_emp.middle_initial, ''), req_emp.last_name) AS requested_by_name,
            NULL AS payment_attempt_id,
            NULL AS xendit_status,
            NULL AS xendit_payment_link_url,
            NULL AS xendit_reference_id
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
            ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
        LEFT JOIN warehouse_purchase_requests wpr
            ON wpr.purchase_request_id = rh.purchase_request_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.nongrainrise_receiving_id = rh.receiving_id
        LEFT JOIN warehouse_employees req_emp
            ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
        WHERE rh.warehouse_profile_id IN ({placeholders})
          AND (LOWER(rh.status) != 'paid')
          AND (fpay.paid_at IS NULL)
    """
    params_ext = list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(sql_reg, params_reg)
        reg_rows = _rows_to_dicts(cursor)

        cursor.execute(sql_ext, params_ext)
        ext_rows = _rows_to_dicts(cursor)

    combined_rows = reg_rows + ext_rows
    normalized = []

    for r in combined_rows:
        supplier_type = r.get("supplier_type")
        supplier_name = r.get("supplier_name") or ("Registered Miller" if supplier_type == "registered_miller" else "External Supplier")
        batch_no = r.get("batch_no") or f"BATCH-{r.get('receiving_id')}"
        variant = r.get("product_name") or "Grain Product"
        contact_person = r.get("supplier_contact_person") or r.get("supplier_contact_number") or supplier_name
        ref_no = normalize_receiving_reference(
            existing_ref=r.get("receiving_reference_no"),
            batch_no=batch_no,
            business_name=supplier_name,
            contact_person=contact_person,
            dt=r.get("received_at"),
            fallback_id=r.get("receiving_id"),
        )

        good_qty = float(r.get("received_good") or r.get("total_received") or 0.0)
        tot_payable = float(r.get("total_payable") or 0.0)
        price_per_kg_val = float(r.get("price_per_kg") or 0.0)
        if price_per_kg_val <= 0 and good_qty > 0:
            price_per_kg_val = round(tot_payable / good_qty, 2)

        requested_by = r.get("requested_by_name") or "Procurement Staff"

        # Active Xendit payment tracking
        latest_xendit_attempt = None
        if r.get("payment_attempt_id"):
            latest_xendit_attempt = {
                "payment_attempt_id": r.get("payment_attempt_id"),
                "status": r.get("xendit_status"),
                "payment_link_url": r.get("xendit_payment_link_url"),
                "reference_id": r.get("xendit_reference_id"),
                "is_pending": str(r.get("xendit_status")).upper() in ("CREATED", "PENDING"),
            }

        item = {
            "id": f"{'reg' if supplier_type == 'registered_miller' else 'ext'}_{r.get('receiving_id')}",
            "receiving_id": r.get("receiving_id"),
            "supplier_type": supplier_type,
            "supplier_type_label": "Registered Miller" if supplier_type == "registered_miller" else "External Supplier",
            "is_registered_miller": supplier_type == "registered_miller",
            "batchNo": batch_no,
            "batch_no": batch_no,
            "supplier": supplier_name,
            "supplier_name": supplier_name,
            "supplier_contact": r.get("supplier_contact_person") or r.get("supplier_contact_number") or "",
            "supplier_email": r.get("supplier_email") or "",
            "variant": variant,
            "product_name": variant,
            "stockQty": format_readable_qty(good_qty),
            "unitPrice": format_currency(price_per_kg_val),
            "total": format_currency(tot_payable),
            "total_raw": tot_payable,
            "payable": format_currency(tot_payable),
            "amount_to_pay": format_currency(tot_payable),
            "requestedBy": requested_by,
            "requested_by": requested_by,
            "reference_no": ref_no,
            "receiving_reference_no": ref_no,
            "original_order_quantity": format_readable_qty(r.get("original_order_quantity") or good_qty),
            "total_received": format_readable_qty(r.get("total_received") or good_qty),
            "received_good": format_readable_qty(good_qty),
            "received_bad": format_readable_qty(r.get("received_bad") or 0),
            "price_per_kg": format_currency(price_per_kg_val),
            "product_photo": r.get("product_image") or "",
            "receiving_proof_photo": r.get("receiving_proof_photo") or "",
            "received_at": str(r.get("received_at")) if r.get("received_at") else "",
            "received_date": format_readable_date(r.get("received_at")),
            "online_order_id": r.get("online_order_id"),
            "latest_xendit_attempt": latest_xendit_attempt,
        }

        # Filtering
        if supplier_filter and supplier_filter != "all" and item["supplier"] != supplier_filter:
            continue

        if search:
            combined_search_str = f"{item['batchNo']} {item['supplier']} {item['variant']} {item['reference_no']} {item['supplier_type_label']}".lower()
            if search not in combined_search_str:
                continue

        normalized.append(item)

    # Sorting
    if sort_by == "batch-desc":
        normalized.sort(key=lambda x: str(x["batchNo"]).lower(), reverse=True)
    elif sort_by == "supplier-asc":
        normalized.sort(key=lambda x: str(x["supplier"]).lower())
    elif sort_by == "supplier-desc":
        normalized.sort(key=lambda x: str(x["supplier"]).lower(), reverse=True)
    elif sort_by == "variant-asc":
        normalized.sort(key=lambda x: str(x["variant"]).lower())
    elif sort_by == "variant-desc":
        normalized.sort(key=lambda x: str(x["variant"]).lower(), reverse=True)
    elif sort_by == "total-desc":
        normalized.sort(key=lambda x: float(x["total_raw"]), reverse=True)
    elif sort_by == "total-asc":
        normalized.sort(key=lambda x: float(x["total_raw"]))
    else:  # default batch-asc
        normalized.sort(key=lambda x: str(x["batchNo"]).lower())

    return {
        "records": normalized,
        "count": len(normalized),
    }


def get_warehouse_payable_detail(warehouse_profile_ids, receiving_id, supplier_type):
    """
    Retrieve single payable detail for modal or verification.
    """
    if not warehouse_profile_ids:
        return None

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    if supplier_type == "registered_miller":
        sql = f"""
            SELECT
                rh.receiving_id,
                'registered_miller' AS supplier_type,
                moc.online_order_id,
                moc.batch_no,
                moc.ordered_quantity AS original_order_quantity,
                moc.total_price AS order_total_price,
                sp.supplier_profile_id,
                COALESCE(NULLIF(sp.business_name, ''), NULLIF(sp.organization_name, ''), 'Registered Miller') AS supplier_name,
                sp.official_contact_number AS supplier_contact_number,
                sp.official_email AS supplier_email,
                mp.product_name,
                mp.product_image,
                rh.receiving_reference_no,
                rh.total_received,
                rh.received_good,
                rh.received_bad,
                rh.payables AS total_payable,
                rh.status AS receiving_status,
                rh.proof AS receiving_proof_photo,
                rh.received_at,
                fpay.payable_reference_id,
                fpay.amount_to_pay,
                fpay.payment_method,
                fpay.payment_reference_id,
                fpay.paid_at,
                CONCAT_WS(' ', req_emp.first_name, NULLIF(req_emp.middle_initial, ''), req_emp.last_name) AS requested_by_name
            FROM miller_online_customer_receiving_history rh
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = rh.online_order_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = rh.supplier_profile_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            LEFT JOIN warehouse_finance_payables_payment_references fpay
                ON fpay.miller_receiving_id = rh.receiving_id
            LEFT JOIN warehouse_employees req_emp
                ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
            WHERE rh.receiving_id = %s
              AND (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
            LIMIT 1
        """
        params = [receiving_id] + list(warehouse_profile_ids) + list(warehouse_profile_ids)
    else:
        sql = f"""
            SELECT
                rh.receiving_id,
                'external_supplier' AS supplier_type,
                rh.purchase_request_id,
                CONCAT('PR-', LPAD(rh.purchase_request_id, 4, '0')) AS batch_no,
                wpr.ordered_quantity AS original_order_quantity,
                rh.total_price AS order_total_price,
                ngsc.warehouse_nongrainrise_supplier_contact_id,
                COALESCE(NULLIF(ngsc.business_name, ''), NULLIF(ngsc.contact_person, ''), 'External Supplier') AS supplier_name,
                ngsc.contact_number AS supplier_contact_number,
                ngsc.email AS supplier_email,
                ngsc.contact_person AS supplier_contact_person,
                COALESCE(NULLIF(wpr.product_name, ''), 'Palay Grain') AS product_name,
                wpr.product_photo AS product_image,
                rh.receiving_reference_no,
                rh.total_received,
                rh.received_good,
                rh.received_bad,
                rh.price_per_kg,
                rh.total_price AS total_payable,
                rh.status AS receiving_status,
                rh.receiving_proof_photo,
                rh.received_at,
                fpay.payable_reference_id,
                fpay.amount_to_pay,
                fpay.payment_method,
                fpay.payment_reference_id,
                fpay.paid_at,
                CONCAT_WS(' ', req_emp.first_name, NULLIF(req_emp.middle_initial, ''), req_emp.last_name) AS requested_by_name,
                CONCAT_WS(' ', paid_emp.first_name, NULLIF(paid_emp.middle_initial, ''), paid_emp.last_name) AS paid_by_name
            FROM warehouse_nongrainrise_supplier_receiving_history rh
            LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
                ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
            LEFT JOIN warehouse_purchase_requests wpr
                ON wpr.purchase_request_id = rh.purchase_request_id
            LEFT JOIN warehouse_finance_payables_payment_references fpay
                ON fpay.nongrainrise_receiving_id = rh.receiving_id
            LEFT JOIN warehouse_employees req_emp
                ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
            LEFT JOIN warehouse_employees paid_emp
                ON paid_emp.warehouse_employee_id = fpay.paid_by_employee_id
            WHERE rh.receiving_id = %s
              AND rh.warehouse_profile_id IN ({placeholders})
            LIMIT 1
        """
        params = [receiving_id] + list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = _row_to_dict(cursor)

        # Retrieve warehouse profile details for receipt header
        wh_prof_id = warehouse_profile_ids[0]
        cursor.execute(
            """
            SELECT business_name, organization_name, street_address, barangay, municipality, province, postal_code, official_contact_number, official_email
            FROM warehouse_profiles
            WHERE warehouse_profile_id = %s
            LIMIT 1
            """,
            [wh_prof_id],
        )
        wh_prof = cursor.fetchone()

    if not row:
        return None

    if wh_prof:
        wh_biz_name = wh_prof[0] or wh_prof[1] or "GrainRise Warehouse"
        wh_address = format_business_address(wh_prof[2], wh_prof[3], wh_prof[4], wh_prof[5], wh_prof[6])
        wh_contact = format_business_contact(wh_prof[7], wh_prof[8])
    else:
        wh_biz_name = "GrainRise Warehouse"
        wh_address = "Address Not Provided"
        wh_contact = "Contact Not Provided"

    good_qty = float(row.get("received_good") or row.get("total_received") or 0.0)
    tot_payable = float(row.get("total_payable") or 0.0)
    price_per_kg_val = float(row.get("price_per_kg") or 0.0)
    if price_per_kg_val <= 0 and good_qty > 0:
        price_per_kg_val = round(tot_payable / good_qty, 2)

    batch_no = row.get("batch_no") or f"BATCH-{row.get('receiving_id')}"
    supplier_name = row.get("supplier_name") or ("Registered Miller" if supplier_type == "registered_miller" else "External Supplier")
    contact_person = row.get("supplier_contact_person") or row.get("supplier_contact_number") or supplier_name
    canonical_ref = normalize_receiving_reference(
        existing_ref=row.get("receiving_reference_no"),
        batch_no=batch_no,
        business_name=supplier_name,
        contact_person=contact_person,
        dt=row.get("received_at"),
        fallback_id=row.get("receiving_id"),
    )

    is_paid = bool(row.get("paid_at") or (str(row.get("receiving_status") or "").lower() == "paid"))
    payment_ref = row.get("payment_reference_id") or "N/A"

    return {
        "id": f"{'reg' if supplier_type == 'registered_miller' else 'ext'}_{row.get('receiving_id')}",
        "receiving_id": row.get("receiving_id"),
        "supplier_type": supplier_type,
        "supplier_type_label": "Registered Miller" if supplier_type == "registered_miller" else "External Supplier",
        "batch_no": batch_no,
        "batchNo": batch_no,
        "supplier": supplier_name,
        "supplier_contact": row.get("supplier_contact_person") or row.get("supplier_contact_number") or "",
        "variant": row.get("product_name"),
        "product_name": row.get("product_name"),
        "stockQty": format_readable_qty(good_qty),
        "unitPrice": format_currency(price_per_kg_val),
        "total": format_currency(tot_payable),
        "total_raw": tot_payable,
        "payable": format_currency(tot_payable),
        "amount_to_pay": format_currency(tot_payable),
        "reference_no": canonical_ref,
        "receiving_reference_no": canonical_ref,
        "original_order_quantity": format_readable_qty(row.get("original_order_quantity") or good_qty),
        "total_received": format_readable_qty(row.get("total_received") or good_qty),
        "received_good": format_readable_qty(good_qty),
        "received_bad": format_readable_qty(row.get("received_bad") or 0),
        "price_per_kg": format_currency(price_per_kg_val),
        "product_photo": row.get("product_image") or "",
        "receiving_proof_photo": row.get("receiving_proof_photo") or "",
        "received_at": str(row.get("received_at")) if row.get("received_at") else "",
        "received_date": format_readable_date(row.get("received_at")),
        "online_order_id": row.get("online_order_id"),
        "is_paid": is_paid,
        "status": "Paid" if is_paid else "Requested",
        "requested_date": format_readable_date(row.get("requested_at") or row.get("received_at")),
        "requested_at_formatted": format_readable_date_time(row.get("requested_at") or row.get("received_at")),
        "paid_date": format_readable_date(row.get("paid_at")) if row.get("paid_at") else "N/A",
        "paid_at": str(row.get("paid_at")) if row.get("paid_at") else None,
        "paid_at_formatted": format_readable_date_time(row.get("paid_at")) if row.get("paid_at") else "N/A",
        "paid_by": row.get("paid_by_name") or "Warehouse Finance",
        "payment_method": row.get("payment_method") or "N/A",
        "payment_reference": payment_ref,
        "payment_reference_id": payment_ref,
        "payment_reference_number": payment_ref,
        "business_name": wh_biz_name,
        "business_address": wh_address,
        "business_contact": wh_contact,
    }
