import datetime
from decimal import Decimal
from django.db import connection
from api.warehouse_function.finance.expenses.selectors import (
    PRESET_EXPENSE_TYPES,
)
from api.warehouse_function.finance.reimbursements.selectors import (
    PRESET_REIMBURSEMENT_CATEGORIES,
    _fetch_latest_payout_attempts_map,
)


def _format_name_or_na(*parts):
    cleaned = [str(p).strip() for p in parts if p and str(p).strip()]
    return " ".join(cleaned) if cleaned else "N/A"


def _to_decimal(val):
    if val is None or val == "":
        return Decimal("0.00")
    try:
        return Decimal(str(val))
    except Exception:
        return Decimal("0.00")


def _serialize_decimal(val):
    dec = _to_decimal(val)
    return f"{dec:.2f}"


def _serialize_datetime(dt):
    if not dt:
        return None
    if hasattr(dt, "isoformat"):
        return dt.isoformat()
    return str(dt)


def _format_date_display(dt):
    if not dt:
        return "N/A"
    if isinstance(dt, str):
        try:
            clean = dt.split("T")[0].split(" ")[0].strip()
            dt = datetime.date.fromisoformat(clean)
        except Exception:
            return dt
    if hasattr(dt, "strftime"):
        return dt.strftime("%b %d, %Y").replace(" 0", " ")
    return str(dt)


def _format_datetime_display(dt):
    if not dt:
        return "N/A"
    if isinstance(dt, str):
        try:
            dt = datetime.datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return dt
    if hasattr(dt, "strftime"):
        date_part = dt.strftime("%b %d, %Y").replace(" 0", " ")
        time_part = dt.strftime("%I:%M %p").lstrip("0")
        return f"{date_part} - {time_part}"
    return str(dt)


def _format_date_iso(dt):
    if not dt:
        return None
    if hasattr(dt, "strftime"):
        return dt.strftime("%Y-%m-%d")
    raw = str(dt).strip()
    return raw[:10] if len(raw) >= 10 else None


def _format_qty_kg(val):
    if val is None:
        return "N/A"
    try:
        num = float(val)
        if num.is_integer():
            return f"{int(num):,} kg"
        return f"{num:,.2f} kg"
    except (ValueError, TypeError):
        return f"{val} kg"


def _format_peso_str(val):
    if val is None:
        return "₱ 0.00"
    try:
        num = float(val)
        return f"₱ {num:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def _format_business_address(street, barangay, municipality, province, postal_code):
    parts = [str(p).strip() for p in [street, barangay, municipality, province, postal_code] if p and str(p).strip()]
    return ", ".join(parts) if parts else "Address Not Provided"


def get_warehouse_business_context(warehouse_profile_ids):
    """
    Fetch business details of the authenticated warehouse branch.
    """
    if not warehouse_profile_ids:
        return {
            "business_name": "GrainRise Warehouse",
            "business_address": "N/A",
            "business_contact": "N/A",
            "business_email": "N/A",
        }

    query = """
        SELECT
            COALESCE(NULLIF(wp.business_name, ''), NULLIF(wp.organization_name, ''), 'GrainRise Warehouse') AS biz_name,
            wp.street_address,
            wp.barangay,
            wp.municipality,
            wp.province,
            wp.postal_code,
            wp.official_contact_number,
            wp.official_email
        FROM warehouse_profiles wp
        WHERE wp.warehouse_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [warehouse_profile_ids[0]])
        row = cursor.fetchone()

    if not row:
        return {
            "business_name": "GrainRise Warehouse",
            "business_address": "N/A",
            "business_contact": "N/A",
            "business_email": "N/A",
        }

    (
        biz_name,
        street_address,
        barangay,
        municipality,
        province,
        postal_code,
        contact_number,
        email,
    ) = row

    addr = _format_business_address(
        street_address, barangay, municipality, province, postal_code
    )
    if addr == "Address Not Provided":
        addr = "N/A"

    return {
        "business_name": (biz_name or "").strip() or "GrainRise Warehouse",
        "business_address": addr,
        "business_contact": (contact_number or "").strip() or "N/A",
        "business_email": (email or "").strip() or "N/A",
    }


def _get_paid_payables_history(warehouse_profile_ids, business_info):
    """
    Fetch confirmed paid procurement transactions for this warehouse branch from both:
    1. Registered Millers (miller_online_customer_receiving_history)
    2. External Suppliers (warehouse_nongrainrise_supplier_receiving_history)

    Deduplicates payments via warehouse_finance_payables_payment_references selecting MAX(payable_reference_id).
    """
    if not warehouse_profile_ids:
        return [], []

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    records = []
    suppliers_set = set()

    # 1. REGISTERED MILLERS
    sql_reg = f"""
        SELECT
            rh.receiving_id,
            moc.online_order_id,
            moc.batch_no,
            COALESCE(NULLIF(sp.business_name, ''), NULLIF(sp.organization_name, ''), 'Registered Miller') AS supplier_name,
            COALESCE(NULLIF(mp.product_name, ''), 'Rice Product') AS product_name,
            moc.ordered_quantity,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.payables AS total_price,
            rh.receiving_reference_no,
            rh.received_at,
            rh.status AS receiving_status,
            fpay.payment_method AS ref_payment_method,
            fpay.payment_reference_id AS ref_payment_reference_id,
            fpay.receipt_image_url,
            fpay.requested_at AS ref_requested_at,
            fpay.paid_at AS ref_paid_at,
            fpay.amount_to_pay,
            req_emp.first_name AS req_first,
            req_emp.middle_initial AS req_middle,
            req_emp.last_name AS req_last,
            req_emp.suffix AS req_suffix,
            paid_emp.first_name AS paid_first,
            paid_emp.middle_initial AS paid_middle,
            paid_emp.last_name AS paid_last,
            paid_emp.suffix AS paid_suffix,
            mop.payment_method AS mop_method,
            mop.payment_reference AS mop_ref,
            xpt.channel_code AS xendit_channel,
            xpt.payment_status AS xendit_status,
            xpt.reference_id AS xendit_ref,
            xpt.paid_at AS xendit_paid_at
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM warehouse_finance_payables_payment_references m2
                WHERE m2.miller_receiving_id = rh.receiving_id
            )
        LEFT JOIN warehouse_employees req_emp
            ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
        LEFT JOIN warehouse_employees paid_emp
            ON paid_emp.warehouse_employee_id = fpay.paid_by_employee_id
        LEFT JOIN miller_online_orders_payment mop
            ON mop.online_order_id = moc.online_order_id
        LEFT JOIN warehouse_miller_purchase_xendit_payment_tracking xpt
            ON xpt.online_order_id = moc.online_order_id
           AND UPPER(TRIM(COALESCE(xpt.payment_status, ''))) = 'SUCCEEDED'
        WHERE (rh.warehouse_buyer_id IN ({p_wh}) OR moc.warehouse_buyer_id IN ({p_wh}))
          AND (
              LOWER(TRIM(COALESCE(rh.status, ''))) = 'paid'
              OR fpay.paid_at IS NOT NULL
              OR LOWER(TRIM(COALESCE(mop.status, ''))) = 'paid'
              OR UPPER(TRIM(COALESCE(xpt.payment_status, ''))) = 'SUCCEEDED'
          )
        ORDER BY COALESCE(fpay.paid_at, xpt.paid_at, rh.received_at) DESC, rh.receiving_id DESC
    """
    params_reg = list(warehouse_profile_ids) + list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(sql_reg, params_reg)
        reg_rows = cursor.fetchall()

    for row in reg_rows:
        (
            receiving_id,
            online_order_id,
            batch_no,
            supplier_name,
            product_name,
            ordered_quantity,
            total_received,
            received_good,
            received_bad,
            total_price,
            receiving_reference_no,
            received_at,
            status_val,
            ref_payment_method,
            ref_payment_reference_id,
            receipt_image_url,
            ref_requested_at,
            ref_paid_at,
            amount_to_pay,
            req_first,
            req_middle,
            req_last,
            req_suffix,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
            mop_method,
            mop_ref,
            xendit_channel,
            xendit_status,
            xendit_ref,
            xendit_paid_at,
        ) = row

        effective_paid_at = ref_paid_at or xendit_paid_at or received_at
        effective_requested_at = ref_requested_at or received_at
        effective_method = (
            ref_payment_method
            or mop_method
            or xendit_channel
            or "Cash"
        ).strip()
        effective_ref_id = (
            ref_payment_reference_id
            or mop_ref
            or xendit_ref
            or "N/A"
        ).strip()

        requested_by_name = _format_name_or_na(req_first, req_middle, req_last, req_suffix)
        paid_by_name = _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
        if paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        supplier_clean = (supplier_name or "").strip() or "Registered Miller"
        suppliers_set.add(supplier_clean)

        good_qty_val = float(received_good or total_received or 0)
        ordered_qty_val = float(ordered_quantity or 0)
        received_qty_val = float(total_received or 0)
        rejected_qty_val = float(received_bad or 0)
        total_val = float(amount_to_pay or total_price or 0)
        unit_price_val = round(total_val / good_qty_val, 2) if good_qty_val > 0 else 0.0

        batch_str = (batch_no or "").strip() or f"BATCH-{receiving_id}"
        ref_str = (receiving_reference_no or "").strip() or f"REC-{receiving_id}"

        sort_ts = 0
        if hasattr(effective_paid_at, "timestamp"):
            sort_ts = effective_paid_at.timestamp()
        elif hasattr(received_at, "timestamp"):
            sort_ts = received_at.timestamp()

        records.append(
            {
                "id": f"REG-{receiving_id}",
                "receiving_id": receiving_id,
                "supplier_type": "registered_miller",
                "batchNo": batch_str,
                "batch_no": batch_str,
                "batch_code": batch_str,
                "supplier": supplier_clean,
                "supplier_name": supplier_clean,
                "variant": (product_name or "").strip() or "N/A",
                "rice_variant": (product_name or "").strip() or "N/A",
                "product_name": (product_name or "").strip() or "N/A",
                "stockQty": good_qty_val,
                "good_quantity": good_qty_val,
                "received_good": _format_qty_kg(good_qty_val),
                "ordered_quantity": ordered_qty_val,
                "original_order_quantity": _format_qty_kg(ordered_qty_val),
                "received_quantity": received_qty_val,
                "total_received": _format_qty_kg(received_qty_val),
                "rejected_quantity": rejected_qty_val,
                "unitPrice": unit_price_val,
                "price_per_kg": _format_peso_str(unit_price_val),
                "unit_price": _format_peso_str(unit_price_val),
                "total": total_val,
                "total_payable_amount": total_val,
                "amount_to_pay": _format_peso_str(total_val),
                "receiving_reference_id": ref_str,
                "receiving_reference_no": ref_str,
                "reference_no": ref_str,
                "received_by": "Warehouse Personnel",
                "received_date": _format_date_display(received_at),
                "received_at": _format_datetime_display(received_at),
                "received_at_raw": _serialize_datetime(received_at),
                "requested_by": requested_by_name,
                "requested_date": _format_datetime_display(effective_requested_at),
                "requested_at_formatted": _format_datetime_display(effective_requested_at),
                "paid_by": paid_by_name,
                "paidAt": _format_date_display(effective_paid_at),
                "paid_date": _format_datetime_display(effective_paid_at),
                "paid_at_formatted": _format_datetime_display(effective_paid_at),
                "paid_at": _format_datetime_display(effective_paid_at),
                "paid_at_raw": _serialize_datetime(effective_paid_at),
                "date_iso": _format_date_iso(effective_paid_at or received_at),
                "sort_timestamp": sort_ts,
                "payment_method": effective_method,
                "payment_reference": effective_ref_id,
                "payment_reference_id": effective_ref_id,
                "receipt_image_url": receipt_image_url,
                "is_paid": True,
                "status": "Paid",
                "business_name": business_info.get("business_name") or "GrainRise Warehouse",
                "business_address": business_info.get("business_address") or "N/A",
                "business_contact": business_info.get("business_contact") or "N/A",
                "business_email": business_info.get("business_email") or "N/A",
            }
        )

    # 2. EXTERNAL SUPPLIERS
    sql_ext = f"""
        SELECT
            rh.receiving_id,
            rh.purchase_request_id,
            CONCAT('PR-', LPAD(rh.purchase_request_id, 4, '0')) AS batch_no,
            COALESCE(NULLIF(ngsc.business_name, ''), NULLIF(ngsc.contact_person, ''), 'External Supplier') AS supplier_name,
            COALESCE(NULLIF(wpr.product_name, ''), 'Palay Grain') AS product_name,
            wpr.ordered_quantity,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.price_per_kg,
            rh.total_price,
            rh.receiving_reference_no,
            rh.received_at,
            rh.status AS receiving_status,
            fpay.payment_method AS ref_payment_method,
            fpay.payment_reference_id AS ref_payment_reference_id,
            fpay.receipt_image_url,
            fpay.requested_at AS ref_requested_at,
            fpay.paid_at AS ref_paid_at,
            fpay.amount_to_pay,
            rec_emp.first_name AS rec_first,
            rec_emp.middle_initial AS rec_middle,
            rec_emp.last_name AS rec_last,
            rec_emp.suffix AS rec_suffix,
            req_emp.first_name AS req_first,
            req_emp.middle_initial AS req_middle,
            req_emp.last_name AS req_last,
            req_emp.suffix AS req_suffix,
            paid_emp.first_name AS paid_first,
            paid_emp.middle_initial AS paid_middle,
            paid_emp.last_name AS paid_last,
            paid_emp.suffix AS paid_suffix
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
            ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
        LEFT JOIN warehouse_purchase_requests wpr
            ON wpr.purchase_request_id = rh.purchase_request_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM warehouse_finance_payables_payment_references m2
                WHERE m2.nongrainrise_receiving_id = rh.receiving_id
            )
        LEFT JOIN warehouse_employees rec_emp
            ON rec_emp.warehouse_employee_id = rh.received_by_employee_id
        LEFT JOIN warehouse_employees req_emp
            ON req_emp.warehouse_employee_id = fpay.requested_by_employee_id
        LEFT JOIN warehouse_employees paid_emp
            ON paid_emp.warehouse_employee_id = COALESCE(fpay.paid_by_employee_id, rh.paid_by_employee_id)
        WHERE rh.warehouse_profile_id IN ({p_wh})
          AND (
              LOWER(TRIM(COALESCE(rh.status, ''))) = 'paid'
              OR fpay.paid_at IS NOT NULL
          )
        ORDER BY COALESCE(fpay.paid_at, rh.received_at) DESC, rh.receiving_id DESC
    """
    params_ext = list(warehouse_profile_ids)

    with connection.cursor() as cursor:
        cursor.execute(sql_ext, params_ext)
        ext_rows = cursor.fetchall()

    for row in ext_rows:
        (
            receiving_id,
            purchase_request_id,
            batch_no,
            supplier_name,
            product_name,
            ordered_quantity,
            total_received,
            received_good,
            received_bad,
            price_per_kg,
            total_price,
            receiving_reference_no,
            received_at,
            status_val,
            ref_payment_method,
            ref_payment_reference_id,
            receipt_image_url,
            ref_requested_at,
            ref_paid_at,
            amount_to_pay,
            rec_first,
            rec_middle,
            rec_last,
            rec_suffix,
            req_first,
            req_middle,
            req_last,
            req_suffix,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
        ) = row

        effective_paid_at = ref_paid_at or received_at
        effective_requested_at = ref_requested_at or received_at
        effective_method = (ref_payment_method or "Cash").strip()
        effective_ref_id = (ref_payment_reference_id or "N/A").strip()

        received_by_name = _format_name_or_na(rec_first, rec_middle, rec_last, rec_suffix)
        requested_by_name = _format_name_or_na(req_first, req_middle, req_last, req_suffix)
        paid_by_name = _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
        if paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        supplier_clean = (supplier_name or "").strip() or "External Supplier"
        suppliers_set.add(supplier_clean)

        good_qty_val = float(received_good or total_received or 0)
        ordered_qty_val = float(ordered_quantity or 0)
        received_qty_val = float(total_received or 0)
        rejected_qty_val = float(received_bad or 0)
        total_val = float(amount_to_pay or total_price or 0)
        unit_price_val = float(price_per_kg or 0)
        if unit_price_val <= 0 and good_qty_val > 0:
            unit_price_val = round(total_val / good_qty_val, 2)

        batch_str = (batch_no or "").strip() or f"PR-{receiving_id}"
        ref_str = (receiving_reference_no or "").strip() or f"REC-{receiving_id}"

        sort_ts = 0
        if hasattr(effective_paid_at, "timestamp"):
            sort_ts = effective_paid_at.timestamp()
        elif hasattr(received_at, "timestamp"):
            sort_ts = received_at.timestamp()

        records.append(
            {
                "id": f"EXT-{receiving_id}",
                "receiving_id": receiving_id,
                "supplier_type": "external_supplier",
                "batchNo": batch_str,
                "batch_no": batch_str,
                "batch_code": batch_str,
                "supplier": supplier_clean,
                "supplier_name": supplier_clean,
                "variant": (product_name or "").strip() or "N/A",
                "rice_variant": (product_name or "").strip() or "N/A",
                "product_name": (product_name or "").strip() or "N/A",
                "stockQty": good_qty_val,
                "good_quantity": good_qty_val,
                "received_good": _format_qty_kg(good_qty_val),
                "ordered_quantity": ordered_qty_val,
                "original_order_quantity": _format_qty_kg(ordered_qty_val),
                "received_quantity": received_qty_val,
                "total_received": _format_qty_kg(received_qty_val),
                "rejected_quantity": rejected_qty_val,
                "unitPrice": unit_price_val,
                "price_per_kg": _format_peso_str(unit_price_val),
                "unit_price": _format_peso_str(unit_price_val),
                "total": total_val,
                "total_payable_amount": total_val,
                "amount_to_pay": _format_peso_str(total_val),
                "receiving_reference_id": ref_str,
                "receiving_reference_no": ref_str,
                "reference_no": ref_str,
                "received_by": received_by_name if received_by_name != "N/A" else "Warehouse Receiving",
                "received_date": _format_date_display(received_at),
                "received_at": _format_datetime_display(received_at),
                "received_at_raw": _serialize_datetime(received_at),
                "requested_by": requested_by_name,
                "requested_date": _format_datetime_display(effective_requested_at),
                "requested_at_formatted": _format_datetime_display(effective_requested_at),
                "paid_by": paid_by_name,
                "paidAt": _format_date_display(effective_paid_at),
                "paid_date": _format_datetime_display(effective_paid_at),
                "paid_at_formatted": _format_datetime_display(effective_paid_at),
                "paid_at": _format_datetime_display(effective_paid_at),
                "paid_at_raw": _serialize_datetime(effective_paid_at),
                "date_iso": _format_date_iso(effective_paid_at or received_at),
                "sort_timestamp": sort_ts,
                "payment_method": effective_method,
                "payment_reference": effective_ref_id,
                "payment_reference_id": effective_ref_id,
                "receipt_image_url": receipt_image_url,
                "is_paid": True,
                "status": "Paid",
                "business_name": business_info.get("business_name") or "GrainRise Warehouse",
                "business_address": business_info.get("business_address") or "N/A",
                "business_contact": business_info.get("business_contact") or "N/A",
                "business_email": business_info.get("business_email") or "N/A",
            }
        )

    # Sort all payables by sort_timestamp descending initially
    records.sort(key=lambda x: x["sort_timestamp"], reverse=True)
    return records, sorted(suppliers_set)


def _get_paid_expenses_history(warehouse_profile_ids, business_info):
    """
    Fetch actual paid expense transactions from warehouse_expenses for this branch.
    Includes all fields needed by Expenses Payment table and WarehouseExpenseReceiptModal.
    """
    if not warehouse_profile_ids:
        return [], list(PRESET_EXPENSE_TYPES)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT
            we.expenses_id,
            we.warehouse_profile_id,
            we.set_by_user_id,
            we.expense_type,
            we.description,
            we.price,
            we.deadline,
            we.status,
            we.setting_reference_no,
            we.paid_by_employee_id,
            we.payment_method,
            we.payment_reference_no,
            we.receipt_photo,
            we.payment_date,
            we.created_at,
            we.updated_at,
            u.first_name AS set_by_first_name,
            u.last_name AS set_by_last_name,
            emp.first_name AS paid_by_first_name,
            emp.middle_initial AS paid_by_middle_name,
            emp.last_name AS paid_by_last_name,
            emp.suffix AS paid_by_suffix
        FROM warehouse_expenses we
        LEFT JOIN users u
            ON we.set_by_user_id = u.user_id
        LEFT JOIN warehouse_employees emp
            ON we.paid_by_employee_id = emp.warehouse_employee_id
        WHERE we.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(COALESCE(we.status, ''))) = 'paid'
        ORDER BY COALESCE(we.payment_date, we.updated_at, we.created_at) DESC, we.expenses_id DESC
    """
    records = []
    expense_types_set = set(PRESET_EXPENSE_TYPES)

    with connection.cursor() as cursor:
        cursor.execute(sql, list(warehouse_profile_ids))
        rows = cursor.fetchall()

    for row in rows:
        (
            expenses_id,
            row_wh_id,
            set_by_user_id,
            expense_type,
            description,
            price,
            deadline,
            status_val,
            setting_reference_no,
            paid_by_employee_id,
            payment_method,
            payment_reference_no,
            receipt_photo,
            payment_date,
            created_at,
            updated_at,
            set_by_first_name,
            set_by_last_name,
            paid_by_first_name,
            paid_by_middle_name,
            paid_by_last_name,
            paid_by_suffix,
        ) = row

        set_by_name = _format_name_or_na(set_by_first_name, set_by_last_name)
        if set_by_name == "N/A":
            set_by_name = "Warehouse Manager"

        paid_by_name = _format_name_or_na(
            paid_by_first_name, paid_by_middle_name, paid_by_last_name, paid_by_suffix
        )
        if paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        exp_type_clean = (expense_type or "").strip() or "Others"
        expense_types_set.add(exp_type_clean)

        price_dec = _to_decimal(price)
        price_float = float(price_dec)
        effective_dt = payment_date or updated_at or created_at

        sort_ts = 0
        if hasattr(effective_dt, "timestamp"):
            sort_ts = effective_dt.timestamp()

        # Format receipt photo URL
        photo_url = receipt_photo or ""
        if photo_url and not (photo_url.startswith("http://") or photo_url.startswith("https://") or photo_url.startswith("/")):
            photo_url = f"/media/{photo_url.lstrip('/')}"

        records.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "warehouse_profile_id": row_wh_id,
                "branch_name": business_info.get("business_name") or "GrainRise Warehouse",
                "set_by_user_id": set_by_user_id,
                "set_by": set_by_name,
                "set_by_name": set_by_name,
                "expenseType": exp_type_clean,
                "expense_type": exp_type_clean,
                "description": description or "N/A",
                "price": _format_peso_str(price_float),
                "price_raw": price_float,
                "price_display": _serialize_decimal(price_dec),
                "deadline": deadline.isoformat() if deadline else None,
                "deadline_formatted": _format_date_display(deadline),
                "status": "paid",
                "status_label": "Paid",
                "setting_reference_no": setting_reference_no or f"EXP-{expenses_id}",
                "paid_by_employee_id": paid_by_employee_id,
                "paid_by": paid_by_name,
                "paid_by_name": paid_by_name,
                "payment_method": payment_method or "Cash",
                "payment_reference_no": payment_reference_no or "N/A",
                "receipt_photo": photo_url,
                "paymentDate": _format_date_display(payment_date),
                "payment_date": _format_datetime_display(payment_date),
                "payment_date_raw": _serialize_datetime(payment_date),
                "date_iso": _format_date_iso(effective_dt),
                "sort_timestamp": sort_ts,
                "created_at": _serialize_datetime(created_at),
                "updated_at": _serialize_datetime(updated_at),
                "business_name": business_info.get("business_name") or "GrainRise Warehouse",
                "business_address": business_info.get("business_address") or "N/A",
                "business_contact": business_info.get("business_contact") or "N/A",
                "business_email": business_info.get("business_email") or "N/A",
            }
        )

    ordered_types = list(PRESET_EXPENSE_TYPES)
    for t in sorted(expense_types_set):
        if t not in ordered_types:
            ordered_types.append(t)

    return records, ordered_types


def _get_completed_reimbursements_history(warehouse_profile_ids, business_info):
    """
    Fetch completed reimbursement transactions for this warehouse branch.
    Includes records where warehouse_reimbursement.status = 'paid' OR latest payout attempt
    in warehouse_reimbursement_payout_tracking is 'SUCCEEDED'.
    Preserves sandbox vs. live distinction so receipt modals display Test Mode accurately.
    """
    if not warehouse_profile_ids:
        return [], list(PRESET_REIMBURSEMENT_CATEGORIES)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT
            wr.reimbursement_id,
            wr.warehouse_profile_id,
            wr.requested_by,
            wr.title,
            wr.description,
            wr.types,
            wr.price,
            wr.requested_date,
            wr.photo_evidence,
            wr.status,
            wr.request_reference_no,
            wr.paid_by,
            wr.paid_date,
            wr.method,
            wr.receipt_photo,
            wr.payment_reference_no,
            req.first_name AS req_first_name,
            req.middle_initial AS req_middle_name,
            req.last_name AS req_last_name,
            req.suffix AS req_suffix,
            req.position AS req_position,
            payer.first_name AS payer_first_name,
            payer.middle_initial AS payer_middle_name,
            payer.last_name AS payer_last_name,
            payer.suffix AS payer_suffix
        FROM warehouse_reimbursement wr
        LEFT JOIN warehouse_employees req
            ON wr.requested_by = req.warehouse_employee_id
        LEFT JOIN warehouse_employees payer
            ON wr.paid_by = payer.warehouse_employee_id
        WHERE wr.warehouse_profile_id IN ({p_wh})
        ORDER BY COALESCE(wr.paid_date, wr.requested_date) DESC, wr.reimbursement_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, list(warehouse_profile_ids))
        rows = cursor.fetchall()

    reimbursement_ids = [row[0] for row in rows]
    latest_attempts_map = _fetch_latest_payout_attempts_map(
        reimbursement_ids, warehouse_profile_ids
    )

    records = []
    categories_set = set(PRESET_REIMBURSEMENT_CATEGORIES)

    for row in rows:
        (
            reimbursement_id,
            row_wh_id,
            requested_by_id,
            title,
            description,
            reimb_type,
            price,
            requested_date,
            photo_evidence,
            status_val,
            request_reference_no,
            paid_by_id,
            paid_date,
            method,
            receipt_photo,
            payment_reference_no,
            req_first_name,
            req_middle_name,
            req_last_name,
            req_suffix,
            req_position,
            payer_first_name,
            payer_middle_name,
            payer_last_name,
            payer_suffix,
        ) = row

        status_lower = (status_val or "").strip().lower()
        latest_attempt = latest_attempts_map.get(reimbursement_id)
        attempt_status = (
            (latest_attempt.get("payout_status") or "").strip().upper()
            if latest_attempt
            else ""
        )

        is_db_paid = status_lower == "paid"
        is_attempt_succeeded = attempt_status == "SUCCEEDED"

        if not (is_db_paid or is_attempt_succeeded):
            continue

        requester_name = _format_name_or_na(
            req_first_name, req_middle_name, req_last_name, req_suffix
        )
        payer_name = _format_name_or_na(
            payer_first_name, payer_middle_name, payer_last_name, payer_suffix
        )
        if payer_name == "N/A" and latest_attempt and latest_attempt.get("initiated_by_name"):
            payer_name = latest_attempt.get("initiated_by_name")
        if payer_name == "N/A":
            payer_name = "Warehouse Finance"

        category_clean = (reimb_type or "").strip() or "Others"
        categories_set.add(category_clean)

        price_dec = _to_decimal(price)

        effective_paid_dt = paid_date
        effective_paid_iso = _serialize_datetime(paid_date)
        if not effective_paid_iso and latest_attempt:
            effective_paid_iso = (
                latest_attempt.get("updated_at")
                or latest_attempt.get("created_at")
            )

        date_iso = (
            _format_date_iso(effective_paid_dt)
            or (effective_paid_iso[:10] if effective_paid_iso else None)
            or _format_date_iso(requested_date)
        )

        sort_ts = 0
        if hasattr(effective_paid_dt, "timestamp"):
            sort_ts = effective_paid_dt.timestamp()
        elif hasattr(requested_date, "timestamp"):
            sort_ts = requested_date.timestamp()

        effective_method = method or (
            latest_attempt.get("method") if latest_attempt else None
        ) or "Cash"
        effective_ref_no = payment_reference_no or (
            latest_attempt.get("processor_reference")
            or latest_attempt.get("xendit_payout_id")
            or latest_attempt.get("reference_id")
            if latest_attempt
            else None
        ) or "N/A"

        is_sandbox = bool(
            latest_attempt
            and (latest_attempt.get("xendit_environment") or "").lower() == "test"
            and str(effective_method or "").strip().lower() != "cash"
        )

        # Photo URL
        photo_url = receipt_photo or ""
        if photo_url and not (photo_url.startswith("http://") or photo_url.startswith("https://") or photo_url.startswith("/")):
            photo_url = f"/media/{photo_url.lstrip('/')}"

        records.append(
            {
                "id": request_reference_no or f"REIMB-{reimbursement_id}",
                "reimbursement_id": reimbursement_id,
                "warehouse_profile_id": row_wh_id,
                "request_reference_no": request_reference_no or f"REIMB-{reimbursement_id}",
                "requested_by": requested_by_id,
                "requested_by_name": requester_name,
                "requester": requester_name,
                "requested_by_role": req_position or "",
                "category": category_clean,
                "types": category_clean,
                "title": title or "N/A",
                "description": description or "N/A",
                "cost": float(price_dec),
                "price": float(price_dec),
                "price_display": _serialize_decimal(price_dec),
                "requested_date": _serialize_datetime(requested_date),
                "requested_date_display": _format_datetime_display(requested_date),
                "photo_evidence": photo_evidence or "",
                "status": status_val or "paid",
                "paid_by": paid_by_id,
                "paid_by_name": payer_name,
                "paid_date": effective_paid_iso,
                "method": effective_method,
                "receipt_photo": photo_url,
                "payment_reference_no": effective_ref_no,
                "is_sandbox": is_sandbox,
                "latest_payout_attempt": latest_attempt,
                "date_iso": date_iso,
                "sort_timestamp": sort_ts,
                "business_name": business_info.get("business_name") or "GrainRise Warehouse",
                "business_address": business_info.get("business_address") or "N/A",
                "business_contact": business_info.get("business_contact") or "N/A",
                "business_email": business_info.get("business_email") or "N/A",
            }
        )

    ordered_categories = list(PRESET_REIMBURSEMENT_CATEGORIES)
    for c in sorted(categories_set):
        if c not in ordered_categories:
            ordered_categories.append(c)

    return records, ordered_categories


def get_finance_payment_history_data(warehouse_profile_ids):
    """
    Aggregate all paid data required by /warehouse-finance/payment-history across its 3 tabs:
    1. Payables Payment (confirmed paid registered millers & external suppliers)
    2. Expenses Payment (paid warehouse_expenses)
    3. Reimbursements (completed warehouse_reimbursement)
    """
    business_info = get_warehouse_business_context(warehouse_profile_ids)
    payables, suppliers = _get_paid_payables_history(warehouse_profile_ids, business_info)
    expenses, expense_types = _get_paid_expenses_history(warehouse_profile_ids, business_info)
    reimbursements, reimbursement_categories = _get_completed_reimbursements_history(
        warehouse_profile_ids, business_info
    )

    return {
        "business_info": business_info,
        "payables": payables,
        "expenses": expenses,
        "reimbursements": reimbursements,
        "filters": {
            "suppliers": suppliers,
            "expense_types": expense_types,
            "reimbursement_categories": reimbursement_categories,
        },
    }


def get_finance_report_data(warehouse_profile_ids):
    """
    Fetch ALL existing Finance transactions (both PAID and PENDING) for this warehouse branch across:
      1. PROCUREMENT PAYABLES (registered millers & external suppliers)
      2. EXPENSES (warehouse_expenses where status IN ('pending', 'paid'))
      3. REIMBURSEMENT (warehouse_reimbursement where status IN ('requested', 'paid'))

    Enforces:
      - Validated status mappings without double-counting
      - Sandbox payouts distinguished from live fund movements
      - Proper date ISO formatting for range filtering
    """
    if not warehouse_profile_ids:
        return {
            "business_info": {},
            "payables": [],
            "expenses": [],
            "reimbursements": [],
            "live_summary": {"total_expenses": 0.0, "total_paid": 0.0, "total_pending": 0.0},
        }

    business_info = get_warehouse_business_context(warehouse_profile_ids)
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    # ============================================================
    # 1. PROCUREMENT PAYABLES (BOTH PAID AND PENDING)
    # ============================================================
    payables_report = []

    # Registered Millers
    sql_reg_report = f"""
        SELECT
            rh.receiving_id,
            moc.batch_no,
            COALESCE(NULLIF(mp.product_name, ''), 'Rice Product') AS product_name,
            COALESCE(NULLIF(sp.business_name, ''), NULLIF(sp.organization_name, ''), 'Registered Miller') AS supplier_name,
            moc.ordered_quantity,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.payables AS total_price,
            rh.received_at,
            rh.status AS receiving_status,
            fpay.payment_method AS ref_payment_method,
            fpay.payment_reference_id AS ref_payment_reference_id,
            fpay.paid_at AS ref_paid_at,
            paid_emp.first_name AS paid_first,
            paid_emp.middle_initial AS paid_middle,
            paid_emp.last_name AS paid_last,
            paid_emp.suffix AS paid_suffix,
            mop.status AS mop_status,
            mop.payment_method AS mop_method,
            mop.payment_reference AS mop_ref,
            xpt.payment_status AS xendit_status,
            xpt.reference_id AS xendit_ref,
            xpt.paid_at AS xendit_paid_at
        FROM miller_online_customer_receiving_history rh
        INNER JOIN miller_online_customer moc
            ON moc.online_order_id = rh.online_order_id
        LEFT JOIN supplier_profiles sp
            ON sp.supplier_profile_id = rh.supplier_profile_id
        LEFT JOIN miller_products mp
            ON mp.product_id = moc.miller_product_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM warehouse_finance_payables_payment_references m2
                WHERE m2.miller_receiving_id = rh.receiving_id
            )
        LEFT JOIN warehouse_employees paid_emp
            ON paid_emp.warehouse_employee_id = fpay.paid_by_employee_id
        LEFT JOIN miller_online_orders_payment mop
            ON mop.online_order_id = moc.online_order_id
        LEFT JOIN warehouse_miller_purchase_xendit_payment_tracking xpt
            ON xpt.online_order_id = moc.online_order_id
           AND UPPER(TRIM(COALESCE(xpt.payment_status, ''))) = 'SUCCEEDED'
        WHERE (rh.warehouse_buyer_id IN ({p_wh}) OR moc.warehouse_buyer_id IN ({p_wh}))
        ORDER BY COALESCE(fpay.paid_at, xpt.paid_at, rh.received_at) DESC, rh.receiving_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_reg_report, list(warehouse_profile_ids) + list(warehouse_profile_ids))
        reg_rows = cursor.fetchall()

    for row in reg_rows:
        (
            receiving_id,
            batch_no,
            product_name,
            supplier_name,
            ordered_quantity,
            receiving_reference_no,
            total_received,
            received_good,
            received_bad,
            total_price,
            received_at,
            status_val,
            ref_payment_method,
            ref_payment_reference_id,
            ref_paid_at,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
            mop_status,
            mop_method,
            mop_ref,
            xendit_status,
            xendit_ref,
            xendit_paid_at,
        ) = row

        is_paid = bool(
            (status_val or "").strip().lower() == "paid"
            or ref_paid_at is not None
            or (mop_status or "").strip().lower() == "paid"
            or (xendit_status or "").strip().upper() == "SUCCEEDED"
        )
        effective_paid_at = (ref_paid_at or xendit_paid_at) if is_paid else None
        effective_method = (ref_payment_method or mop_method or "Cash") if is_paid else "N/A"
        effective_ref_id = (ref_payment_reference_id or mop_ref or xendit_ref or "N/A") if is_paid else "N/A"

        paid_by_name = (
            _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
            if is_paid
            else "N/A"
        )
        if is_paid and paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        good_qty_val = float(received_good or total_received or 0)
        ordered_qty_val = float(ordered_quantity or 0)
        received_qty_val = float(total_received or 0)
        rejected_qty_val = float(received_bad or 0)
        amount_val = float(_to_decimal(total_price))
        unit_price_val = round(amount_val / good_qty_val, 2) if good_qty_val > 0 else 0.0

        filter_dt = effective_paid_at or received_at

        payables_report.append(
            {
                "id": f"PAY-REG-{receiving_id}",
                "receiving_id": receiving_id,
                "batch_code": (batch_no or "").strip() or f"BATCH-{receiving_id}",
                "rice_variant": (product_name or "").strip() or "N/A",
                "supplier_name": (supplier_name or "").strip() or "Registered Miller",
                "ordered_quantity": ordered_qty_val,
                "receiving_reference_id": (receiving_reference_no or "").strip() or f"REC-{receiving_id}",
                "received_quantity": received_qty_val,
                "good_quantity": good_qty_val,
                "rejected_quantity": rejected_qty_val,
                "price_per_kg": unit_price_val,
                "total_payable_amount": amount_val,
                "received_by": "Warehouse Personnel",
                "received_at": _format_date_display(received_at),
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "Pending",
                "is_paid": is_paid,
                "payment_method": effective_method,
                "payment_reference_id": effective_ref_id,
                "paid_at": _format_date_display(effective_paid_at) if is_paid else "N/A",
                "paid_by": paid_by_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # External Suppliers
    sql_ext_report = f"""
        SELECT
            rh.receiving_id,
            CONCAT('PR-', LPAD(rh.purchase_request_id, 4, '0')) AS batch_no,
            COALESCE(NULLIF(wpr.product_name, ''), 'Palay Grain') AS product_name,
            COALESCE(NULLIF(ngsc.business_name, ''), NULLIF(ngsc.contact_person, ''), 'External Supplier') AS supplier_name,
            wpr.ordered_quantity,
            rh.receiving_reference_no,
            rh.total_received,
            rh.received_good,
            rh.received_bad,
            rh.price_per_kg,
            rh.total_price,
            rh.received_at,
            rh.status AS receiving_status,
            fpay.payment_method AS ref_payment_method,
            fpay.payment_reference_id AS ref_payment_reference_id,
            fpay.paid_at AS ref_paid_at,
            rec_emp.first_name AS rec_first,
            rec_emp.middle_initial AS rec_middle,
            rec_emp.last_name AS rec_last,
            rec_emp.suffix AS rec_suffix,
            paid_emp.first_name AS paid_first,
            paid_emp.middle_initial AS paid_middle,
            paid_emp.last_name AS paid_last,
            paid_emp.suffix AS paid_suffix
        FROM warehouse_nongrainrise_supplier_receiving_history rh
        LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
            ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
        LEFT JOIN warehouse_purchase_requests wpr
            ON wpr.purchase_request_id = rh.purchase_request_id
        LEFT JOIN warehouse_finance_payables_payment_references fpay
            ON fpay.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM warehouse_finance_payables_payment_references m2
                WHERE m2.nongrainrise_receiving_id = rh.receiving_id
            )
        LEFT JOIN warehouse_employees rec_emp
            ON rec_emp.warehouse_employee_id = rh.received_by_employee_id
        LEFT JOIN warehouse_employees paid_emp
            ON paid_emp.warehouse_employee_id = COALESCE(fpay.paid_by_employee_id, rh.paid_by_employee_id)
        WHERE rh.warehouse_profile_id IN ({p_wh})
        ORDER BY COALESCE(fpay.paid_at, rh.received_at) DESC, rh.receiving_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_ext_report, list(warehouse_profile_ids))
        ext_rows = cursor.fetchall()

    for row in ext_rows:
        (
            receiving_id,
            batch_no,
            product_name,
            supplier_name,
            ordered_quantity,
            receiving_reference_no,
            total_received,
            received_good,
            received_bad,
            price_per_kg,
            total_price,
            received_at,
            status_val,
            ref_payment_method,
            ref_payment_reference_id,
            ref_paid_at,
            rec_first,
            rec_middle,
            rec_last,
            rec_suffix,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
        ) = row

        is_paid = bool(
            (status_val or "").strip().lower() == "paid"
            or ref_paid_at is not None
        )
        effective_paid_at = ref_paid_at if is_paid else None
        effective_method = (ref_payment_method or "Cash") if is_paid else "N/A"
        effective_ref_id = (ref_payment_reference_id or "N/A") if is_paid else "N/A"

        received_by_name = _format_name_or_na(rec_first, rec_middle, rec_last, rec_suffix)
        paid_by_name = (
            _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
            if is_paid
            else "N/A"
        )
        if is_paid and paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        good_qty_val = float(received_good or total_received or 0)
        ordered_qty_val = float(ordered_quantity or 0)
        received_qty_val = float(total_received or 0)
        rejected_qty_val = float(received_bad or 0)
        amount_val = float(_to_decimal(total_price))
        unit_price_val = float(price_per_kg or 0)
        if unit_price_val <= 0 and good_qty_val > 0:
            unit_price_val = round(amount_val / good_qty_val, 2)

        filter_dt = effective_paid_at or received_at

        payables_report.append(
            {
                "id": f"PAY-EXT-{receiving_id}",
                "receiving_id": receiving_id,
                "batch_code": (batch_no or "").strip() or f"PR-{receiving_id}",
                "rice_variant": (product_name or "").strip() or "N/A",
                "supplier_name": (supplier_name or "").strip() or "External Supplier",
                "ordered_quantity": ordered_qty_val,
                "receiving_reference_id": (receiving_reference_no or "").strip() or f"REC-{receiving_id}",
                "received_quantity": received_qty_val,
                "good_quantity": good_qty_val,
                "rejected_quantity": rejected_qty_val,
                "price_per_kg": unit_price_val,
                "total_payable_amount": amount_val,
                "received_by": received_by_name if received_by_name != "N/A" else "Warehouse Receiving",
                "received_at": _format_date_display(received_at),
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "Pending",
                "is_paid": is_paid,
                "payment_method": effective_method,
                "payment_reference_id": effective_ref_id,
                "paid_at": _format_date_display(effective_paid_at) if is_paid else "N/A",
                "paid_by": paid_by_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # ============================================================
    # 2. EXPENSES (BOTH PAID AND PENDING)
    # ============================================================
    expenses_report = []
    expenses_sql = f"""
        SELECT
            we.expenses_id,
            we.setting_reference_no,
            we.expense_type,
            we.description,
            we.price,
            we.deadline,
            we.status,
            we.payment_method,
            we.payment_reference_no,
            we.payment_date,
            we.created_at,
            u.first_name AS set_by_first_name,
            u.last_name AS set_by_last_name,
            emp.first_name AS paid_by_first_name,
            emp.middle_initial AS paid_by_middle_name,
            emp.last_name AS paid_by_last_name,
            emp.suffix AS paid_by_suffix
        FROM warehouse_expenses we
        LEFT JOIN users u
            ON we.set_by_user_id = u.user_id
        LEFT JOIN warehouse_employees emp
            ON we.paid_by_employee_id = emp.warehouse_employee_id
        WHERE we.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(COALESCE(we.status, ''))) IN ('pending', 'paid')
        ORDER BY COALESCE(we.payment_date, we.created_at) DESC, we.expenses_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(expenses_sql, list(warehouse_profile_ids))
        expense_rows = cursor.fetchall()

    for row in expense_rows:
        (
            expenses_id,
            setting_reference_no,
            expense_type,
            description,
            price,
            deadline,
            status_val,
            payment_method,
            payment_reference_no,
            payment_date,
            created_at,
            set_by_first_name,
            set_by_last_name,
            paid_by_first_name,
            paid_by_middle_name,
            paid_by_last_name,
            paid_by_suffix,
        ) = row

        is_paid = (status_val or "").strip().lower() == "paid"
        set_by_name = _format_name_or_na(set_by_first_name, set_by_last_name)
        if set_by_name == "N/A":
            set_by_name = "Warehouse Manager"

        paid_by_name = (
            _format_name_or_na(
                paid_by_first_name, paid_by_middle_name, paid_by_last_name, paid_by_suffix
            )
            if is_paid
            else "N/A"
        )
        if is_paid and paid_by_name == "N/A":
            paid_by_name = "Warehouse Finance"

        amount_val = float(_to_decimal(price))
        filter_dt = payment_date or created_at or deadline

        expenses_report.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "setting_reference_no": (setting_reference_no or "").strip() or f"EXP-{expenses_id}",
                "set_by": set_by_name,
                "type": (expense_type or "").strip() or "N/A",
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "Pending",
                "is_paid": is_paid,
                "payment_method": ((payment_method or "").strip() or "N/A") if is_paid else "N/A",
                "payment_reference_no": (
                    ((payment_reference_no or "").strip() or "N/A") if is_paid else "N/A"
                ),
                "payment_date": _format_date_display(payment_date) if is_paid else "N/A",
                "paid_by": paid_by_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # ============================================================
    # 3. REIMBURSEMENTS (BOTH PAID AND PENDING)
    # ============================================================
    reimbursements_report = []
    reimb_sql = f"""
        SELECT
            wr.reimbursement_id,
            wr.request_reference_no,
            wr.types,
            wr.title,
            wr.description,
            wr.price,
            wr.requested_date,
            wr.status,
            wr.method,
            wr.payment_reference_no,
            wr.paid_date,
            req.first_name AS req_first_name,
            req.middle_initial AS req_middle_name,
            req.last_name AS req_last_name,
            req.suffix AS req_suffix,
            payer.first_name AS payer_first_name,
            payer.middle_initial AS payer_middle_name,
            payer.last_name AS payer_last_name,
            payer.suffix AS payer_suffix
        FROM warehouse_reimbursement wr
        LEFT JOIN warehouse_employees req
            ON wr.requested_by = req.warehouse_employee_id
        LEFT JOIN warehouse_employees payer
            ON wr.paid_by = payer.warehouse_employee_id
        WHERE wr.warehouse_profile_id IN ({p_wh})
          AND LOWER(TRIM(COALESCE(wr.status, ''))) IN ('requested', 'pending', 'paid')
        ORDER BY COALESCE(wr.paid_date, wr.requested_date) DESC, wr.reimbursement_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(reimb_sql, list(warehouse_profile_ids))
        reimb_rows = cursor.fetchall()

    reimb_ids = [row[0] for row in reimb_rows]
    reimb_attempts_map = _fetch_latest_payout_attempts_map(
        reimb_ids, warehouse_profile_ids
    )

    for row in reimb_rows:
        (
            reimbursement_id,
            request_reference_no,
            reimb_type,
            title,
            description,
            price,
            requested_date,
            status_val,
            method,
            payment_reference_no,
            paid_date,
            req_first_name,
            req_middle_name,
            req_last_name,
            req_suffix,
            payer_first_name,
            payer_middle_name,
            payer_last_name,
            payer_suffix,
        ) = row

        latest_attempt = reimb_attempts_map.get(reimbursement_id)
        attempt_status = (
            (latest_attempt.get("payout_status") or "").strip().upper()
            if latest_attempt
            else ""
        )

        is_paid = bool(
            (status_val or "").strip().lower() == "paid"
            or attempt_status == "SUCCEEDED"
        )
        raw_method = (
            method
            or (latest_attempt.get("method") if latest_attempt and is_paid else "")
            or ""
        ).strip()

        is_sandbox = bool(
            latest_attempt
            and (latest_attempt.get("xendit_environment") or "").lower() == "test"
            and raw_method.lower() != "cash"
            and is_paid
        )

        requester_name = _format_name_or_na(
            req_first_name, req_middle_name, req_last_name, req_suffix
        )
        payer_name = (
            _format_name_or_na(
                payer_first_name, payer_middle_name, payer_last_name, payer_suffix
            )
            if is_paid
            else "N/A"
        )
        if payer_name == "N/A" and is_paid and latest_attempt and latest_attempt.get("initiated_by_name"):
            payer_name = latest_attempt.get("initiated_by_name")
        if is_paid and payer_name == "N/A":
            payer_name = "Warehouse Finance"

        effective_ref_no = (
            (
                payment_reference_no
                or (
                    latest_attempt.get("processor_reference")
                    or latest_attempt.get("xendit_payout_id")
                    if latest_attempt
                    else ""
                )
                or ""
            ).strip()
            or "N/A"
        ) if is_paid else "N/A"

        display_method = (
            f"{raw_method} (Test Mode)"
            if (is_paid and is_sandbox and raw_method)
            else ((raw_method or "N/A") if is_paid else "N/A")
        )

        amount_val = float(_to_decimal(price))
        effective_paid_dt = paid_date or (
            latest_attempt.get("updated_at") if (latest_attempt and is_paid) else None
        )
        filter_dt = effective_paid_dt if is_paid and effective_paid_dt else requested_date

        reimbursements_report.append(
            {
                "id": f"REIMB-{reimbursement_id}",
                "reimbursement_id": reimbursement_id,
                "request_reference_no": (request_reference_no or "").strip() or f"REIMB-{reimbursement_id}",
                "requested_by": requester_name,
                "category": (reimb_type or "").strip() or "N/A",
                "type": (title or "").strip() or "N/A",
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "Pending",
                "is_paid": is_paid,
                "is_sandbox": is_sandbox,
                "is_live_paid": bool(is_paid and not is_sandbox),
                "payment_method": display_method,
                "payment_reference_no": effective_ref_id,
                "payment_date": _format_date_display(effective_paid_dt) if is_paid else "N/A",
                "paid_by": payer_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # Summary calculations (excluding sandbox from paid live total)
    live_total_paid = 0.0
    live_total_pending = 0.0

    for row in payables_report:
        amt = float(row.get("total_payable_amount") or 0.0)
        if row.get("is_paid"):
            live_total_paid += amt
        else:
            live_total_pending += amt

    for row in expenses_report:
        amt = float(row.get("price") or 0.0)
        if row.get("is_paid"):
            live_total_paid += amt
        else:
            live_total_pending += amt

    for row in reimbursements_report:
        if row.get("is_sandbox"):
            continue
        amt = float(row.get("price") or 0.0)
        if row.get("is_paid"):
            live_total_paid += amt
        else:
            live_total_pending += amt

    return {
        "business_info": business_info,
        "payables": payables_report,
        "expenses": expenses_report,
        "reimbursements": reimbursements_report,
        "live_summary": {
            "total_expenses": round(live_total_paid + live_total_pending, 2),
            "total_paid": round(live_total_paid, 2),
            "total_pending": round(live_total_pending, 2),
        },
    }
