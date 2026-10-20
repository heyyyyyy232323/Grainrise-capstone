from decimal import Decimal
from django.db import connection
from api.miller_employees_function.miller_finance.expenses.selectors import (
    PRESET_EXPENSE_TYPES,
)
from api.miller_employees_function.miller_finance.reimbursements.selectors import (
    PRESET_REIMBURSEMENT_CATEGORIES,
    _fetch_latest_payout_attempts_map,
    _format_business_address,
)


def _format_name_or_na(*parts):
    cleaned = [str(p).strip() for p in parts if p and str(p).strip()]
    return " ".join(cleaned) if cleaned else "N/A"


def _compute_supplier_display_name(organization, supplier_farm, contact_person):
    org = str(organization or "").strip()
    if org:
        return org
    farm = str(supplier_farm or "").strip()
    if farm:
        return farm
    contact = str(contact_person or "").strip()
    if contact:
        return contact
    return "N/A"


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
    if hasattr(dt, "strftime"):
        return dt.strftime("%b %d, %Y").replace(" 0", " ")
    return str(dt)


def _format_datetime_display(dt):
    if not dt:
        return "N/A"
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
    num = float(val)
    if num.is_integer():
        return f"{int(num):,} kg"
    return f"{num:,.2f} kg"


def _format_peso_str(val):
    if val is None:
        return "₱ 0.00"
    num = float(val)
    return f"₱ {num:,.2f}"


def get_supplier_business_context(supplier_profile_id):
    query = """
        SELECT
            sp.business_name,
            sp.street_address,
            sp.barangay,
            sp.municipality,
            sp.province,
            sp.postal_code,
            sp.official_contact_number,
            sp.official_email
        FROM supplier_profiles sp
        WHERE sp.supplier_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [supplier_profile_id])
        row = cursor.fetchone()

    if not row:
        return {
            "business_name": "N/A",
            "business_address": "N/A",
            "business_contact": "N/A",
            "business_email": "N/A",
        }

    (
        business_name,
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
        "business_name": (business_name or "").strip() or "N/A",
        "business_address": addr,
        "business_contact": (contact_number or "").strip() or "N/A",
        "business_email": (email or "").strip() or "N/A",
    }


def _get_paid_payables_history(supplier_profile_id, business_info):
    """
    Fetch actual paid procurement transactions for this miller branch.
    Includes all fields needed by the Payables Payment table and GoodsReceiptReceiptModal.
    Deduplicates miller_finance_payables_payment_references by selecting only the latest reference per receiving_id.
    """
    sql = """
        SELECT
            iph.receiving_id,
            io.batch_no,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            io.product_name,
            io.ordered_quantity,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.price_per_kg,
            iph.total_price,
            iph.receiving_reference_no,
            iph.received_at,
            iph.status,
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
            paid_emp.suffix AS paid_suffix,
            mfpr.payment_method AS ref_payment_method,
            mfpr.payment_reference_id AS ref_payment_reference_id,
            mfpr.receipt_image_url,
            mfpr.requested_at AS ref_requested_at,
            mfpr.paid_at AS ref_paid_at
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN supplier_employees rec_emp
            ON rec_emp.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN miller_finance_payables_payment_references mfpr
            ON mfpr.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM miller_finance_payables_payment_references m2
                WHERE m2.receiving_id = iph.receiving_id
            )
        LEFT JOIN supplier_employees req_emp
            ON req_emp.supplier_employee_id = mfpr.requested_by_employee_id
        LEFT JOIN supplier_employees paid_emp
            ON paid_emp.supplier_employee_id = COALESCE(mfpr.paid_by_employee_id, iph.paid_by_employee_id)
        WHERE iph.supplier_profile_id = %s
          AND LOWER(COALESCE(iph.status, '')) = 'paid'
        ORDER BY COALESCE(mfpr.paid_at, iph.received_at) DESC, iph.receiving_id DESC
    """
    records = []
    suppliers_set = set()

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = cursor.fetchall()

    for row in rows:
        (
            receiving_id,
            batch_no,
            organization,
            supplier_farm,
            contact_person,
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
            ref_payment_method,
            ref_payment_reference_id,
            receipt_image_url,
            ref_requested_at,
            ref_paid_at,
        ) = row

        effective_paid_at = ref_paid_at or received_at
        effective_requested_at = ref_requested_at or received_at
        effective_method = (ref_payment_method or "").strip() or "N/A"
        effective_ref_id = (ref_payment_reference_id or "").strip() or "N/A"

        received_by_name = _format_name_or_na(rec_first, rec_middle, rec_last, rec_suffix)
        requested_by_name = _format_name_or_na(req_first, req_middle, req_last, req_suffix)
        paid_by_name = _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)

        supplier_clean = _compute_supplier_display_name(
            organization, supplier_farm, contact_person
        )
        if supplier_clean != "N/A":
            suppliers_set.add(supplier_clean)

        good_qty_val = float(received_good or 0)
        ordered_qty_val = float(ordered_quantity or 0)
        received_qty_val = float(total_received or 0)
        rejected_qty_val = float(received_bad or 0)
        unit_price_val = float(price_per_kg or 0)
        total_val = float(total_price or 0)

        batch_str = (batch_no or "").strip() or "N/A"
        ref_str = (receiving_reference_no or "").strip() or "N/A"

        records.append(
            {
                "id": f"PAY-{receiving_id}",
                "receiving_id": receiving_id,
                "batchNo": batch_str,
                "batch_no": batch_str,
                "batch_code": batch_str,
                "supplier": supplier_clean,
                "supplier_name": supplier_clean,
                "variant": (product_name or "").strip() or "N/A",
                "rice_variant": (product_name or "").strip() or "N/A",
                "stockQty": good_qty_val,
                "ordered_quantity": ordered_qty_val,
                "original_order_quantity": _format_qty_kg(ordered_qty_val),
                "received_quantity": received_qty_val,
                "total_received": _format_qty_kg(received_qty_val),
                "good_quantity": good_qty_val,
                "received_good": _format_qty_kg(good_qty_val),
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
                "received_by": received_by_name,
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
                "sort_timestamp": (
                    effective_paid_at.timestamp()
                    if hasattr(effective_paid_at, "timestamp")
                    else (received_at.timestamp() if hasattr(received_at, "timestamp") else 0)
                ),
                "payment_method": effective_method,
                "payment_reference": effective_ref_id,
                "payment_reference_id": effective_ref_id,
                "receipt_image_url": receipt_image_url,
                "is_paid": True,
                "status": "Paid",
                "business_name": business_info.get("business_name") or "N/A",
                "business_address": business_info.get("business_address") or "N/A",
                "business_contact": business_info.get("business_contact") or "N/A",
                "business_email": business_info.get("business_email") or "N/A",
            }
        )

    return records, sorted(suppliers_set)


def _get_paid_expenses_history(supplier_profile_id, business_info):
    """
    Fetch actual paid expense transactions from miller_expenses for this miller branch.
    Includes all fields needed by the Expenses Payment table and FinanceExpenseReceiptModal.
    """
    sql = """
        SELECT
            me.expenses_id,
            me.supplier_profile_id,
            me.set_by_user_id,
            me.expense_type,
            me.description,
            me.price,
            me.deadline,
            me.status,
            me.setting_reference_no,
            me.paid_by_employee_id,
            me.payment_method,
            me.payment_reference_no,
            me.receipt_photo,
            me.payment_date,
            me.created_at,
            me.updated_at,
            u.first_name AS set_by_first_name,
            u.last_name AS set_by_last_name,
            se.first_name AS paid_by_first_name,
            se.middle_initial AS paid_by_middle_name,
            se.last_name AS paid_by_last_name,
            se.suffix AS paid_by_suffix
        FROM miller_expenses me
        LEFT JOIN users u
            ON me.set_by_user_id = u.user_id
        LEFT JOIN supplier_employees se
            ON me.paid_by_employee_id = se.supplier_employee_id
        WHERE me.supplier_profile_id = %s
          AND LOWER(COALESCE(me.status, '')) = 'paid'
        ORDER BY COALESCE(me.payment_date, me.updated_at, me.created_at) DESC, me.expenses_id DESC
    """
    records = []
    expense_types_set = set(PRESET_EXPENSE_TYPES)

    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = cursor.fetchall()

    for row in rows:
        (
            expenses_id,
            row_supplier_profile_id,
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
        paid_by_name = _format_name_or_na(
            paid_by_first_name, paid_by_middle_name, paid_by_last_name, paid_by_suffix
        )
        exp_type_clean = (expense_type or "").strip() or "Others"
        expense_types_set.add(exp_type_clean)

        price_dec = _to_decimal(price)
        price_float = float(price_dec)
        effective_dt = payment_date or updated_at or created_at

        records.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "supplier_profile_id": row_supplier_profile_id,
                "branch_name": business_info.get("business_name") or "N/A",
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
                "setting_reference_no": setting_reference_no or f"EXP-{expenses_id}",
                "paid_by_employee_id": paid_by_employee_id,
                "paid_by": paid_by_name,
                "paid_by_name": paid_by_name,
                "payment_method": payment_method or "N/A",
                "payment_reference_no": payment_reference_no or "N/A",
                "receipt_photo": receipt_photo or "",
                "paymentDate": _format_date_display(payment_date),
                "payment_date": _format_datetime_display(payment_date),
                "payment_date_raw": _serialize_datetime(payment_date),
                "date_iso": _format_date_iso(effective_dt),
                "sort_timestamp": (
                    effective_dt.timestamp() if hasattr(effective_dt, "timestamp") else 0
                ),
                "created_at": _serialize_datetime(created_at),
                "updated_at": _serialize_datetime(updated_at),
                "business_name": business_info.get("business_name") or "N/A",
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


def _get_completed_reimbursements_history(supplier_profile_id, business_info):
    """
    Fetch completed reimbursement transactions for this miller branch.
    Includes records where miller_reimbursement.status = 'paid' OR the latest payout attempt
    in miller_reimbursement_payout_tracking has payout_status = 'SUCCEEDED'.
    Preserves sandbox vs. live distinction so ReimbursementReceiptModal displays Test Mode accurately.
    """
    sql = """
        SELECT
            mr.reimbursement_id,
            mr.supplier_profile_id,
            mr.requested_by,
            mr.title,
            mr.description,
            mr.types,
            mr.price,
            mr.requested_date,
            mr.photo_evidence,
            mr.status,
            mr.request_reference_no,
            mr.paid_by,
            mr.paid_date,
            mr.method,
            mr.receipt_photo,
            mr.payment_reference_no,
            req.first_name AS req_first_name,
            req.middle_initial AS req_middle_name,
            req.last_name AS req_last_name,
            req.suffix AS req_suffix,
            req.position AS req_position,
            payer.first_name AS payer_first_name,
            payer.middle_initial AS payer_middle_name,
            payer.last_name AS payer_last_name,
            payer.suffix AS payer_suffix
        FROM miller_reimbursement mr
        LEFT JOIN supplier_employees req
            ON mr.requested_by = req.supplier_employee_id
        LEFT JOIN supplier_employees payer
            ON mr.paid_by = payer.supplier_employee_id
        WHERE mr.supplier_profile_id = %s
        ORDER BY COALESCE(mr.paid_date, mr.requested_date) DESC, mr.reimbursement_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = cursor.fetchall()

    reimbursement_ids = [row[0] for row in rows]
    latest_attempts_map = _fetch_latest_payout_attempts_map(
        reimbursement_ids, supplier_profile_id
    )

    records = []
    categories_set = set(PRESET_REIMBURSEMENT_CATEGORIES)

    for row in rows:
        (
            reimbursement_id,
            row_supplier_profile_id,
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
        ) or "N/A"
        effective_ref_no = payment_reference_no or (
            latest_attempt.get("xendit_payout_id") or latest_attempt.get("reference_id")
            if latest_attempt
            else None
        ) or "N/A"

        is_sandbox = bool(
            latest_attempt
            and (latest_attempt.get("xendit_environment") or "").lower() == "test"
            and str(effective_method or "").strip().lower() != "cash"
        )

        records.append(
            {
                "id": request_reference_no or f"REIMB-{reimbursement_id}",
                "reimbursement_id": reimbursement_id,
                "supplier_profile_id": row_supplier_profile_id,
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
                "receipt_photo": receipt_photo or "",
                "payment_reference_no": effective_ref_no,
                "is_sandbox": is_sandbox,
                "latest_payout_attempt": latest_attempt,
                "date_iso": date_iso,
                "sort_timestamp": sort_ts,
                "business_name": business_info.get("business_name") or "N/A",
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


def get_finance_payment_history_data(supplier_profile_id):
    """
    Aggregate all data required by /miller-finance/payment-history across its 3 tabs:
    1. Payables Payment (paid inbound_purchase_history)
    2. Expenses Payment (paid miller_expenses)
    3. Reimbursements (completed miller_reimbursement)
    """
    business_info = get_supplier_business_context(supplier_profile_id)
    payables, suppliers = _get_paid_payables_history(supplier_profile_id, business_info)
    expenses, expense_types = _get_paid_expenses_history(supplier_profile_id, business_info)
    reimbursements, reimbursement_categories = _get_completed_reimbursements_history(
        supplier_profile_id, business_info
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


def get_finance_report_data(supplier_profile_id):
    """
    Fetch ALL existing Finance transactions (both PAID and PENDING) for this miller branch
    across:
      1. PROCUREMENT PAYABLES (inbound_purchase_history where status IN ('request_to_pay', 'paid'))
      2. EXPENSES (miller_expenses where status IN ('pending', 'paid'))
      3. REIMBURSEMENT (miller_reimbursement where status IN ('requested', 'paid'))

    Rules enforced:
      - Show 'N/A' when the existing database value is NULL or unavailable. Never fabricate missing values.
      - No duplicate records.
      - Breakdown totals (PAID vs PENDING) reflect actual database financial statuses
        (sandbox-simulated payouts do not inflate actual PAID totals).
    """
    business_info = get_supplier_business_context(supplier_profile_id)

    # 1. PROCUREMENT PAYABLES (request_to_pay + paid)
    payables_sql = """
        SELECT
            iph.receiving_id,
            io.batch_no,
            io.product_name,
            fc.organization,
            fc.supplier_farm,
            fc.contact_person,
            io.ordered_quantity,
            iph.receiving_reference_no,
            iph.total_received,
            iph.received_good,
            iph.received_bad,
            iph.price_per_kg,
            iph.total_price,
            iph.received_at,
            iph.status,
            rec_emp.first_name AS rec_first,
            rec_emp.middle_initial AS rec_middle,
            rec_emp.last_name AS rec_last,
            rec_emp.suffix AS rec_suffix,
            paid_emp.first_name AS paid_first,
            paid_emp.middle_initial AS paid_middle,
            paid_emp.last_name AS paid_last,
            paid_emp.suffix AS paid_suffix,
            mfpr.payment_method AS ref_payment_method,
            mfpr.payment_reference_id AS ref_payment_reference_id,
            mfpr.paid_at AS ref_paid_at
        FROM inbound_purchase_history iph
        INNER JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
           AND io.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = iph.farmer_contact_id
           AND fc.supplier_profile_id = iph.supplier_profile_id
        LEFT JOIN supplier_employees rec_emp
            ON rec_emp.supplier_employee_id = iph.received_by_employee_id
        LEFT JOIN miller_finance_payables_payment_references mfpr
            ON mfpr.payable_reference_id = (
                SELECT MAX(m2.payable_reference_id)
                FROM miller_finance_payables_payment_references m2
                WHERE m2.receiving_id = iph.receiving_id
            )
        LEFT JOIN supplier_employees paid_emp
            ON paid_emp.supplier_employee_id = COALESCE(mfpr.paid_by_employee_id, iph.paid_by_employee_id)
        WHERE iph.supplier_profile_id = %s
          AND LOWER(COALESCE(iph.status, '')) IN ('request_to_pay', 'paid')
        ORDER BY COALESCE(mfpr.paid_at, iph.received_at) DESC, iph.receiving_id DESC
    """
    payables_report = []
    with connection.cursor() as cursor:
        cursor.execute(payables_sql, [supplier_profile_id])
        payable_rows = cursor.fetchall()

    for row in payable_rows:
        (
            receiving_id,
            batch_no,
            product_name,
            organization,
            supplier_farm,
            contact_person,
            ordered_quantity,
            receiving_reference_no,
            total_received,
            received_good,
            received_bad,
            price_per_kg,
            total_price,
            received_at,
            status_val,
            rec_first,
            rec_middle,
            rec_last,
            rec_suffix,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
            ref_payment_method,
            ref_payment_reference_id,
            ref_paid_at,
        ) = row

        is_paid = (status_val or "").strip().lower() == "paid"
        effective_paid_at = ref_paid_at if is_paid else None
        effective_method = ref_payment_method if is_paid else None
        effective_ref_id = ref_payment_reference_id if is_paid else None

        received_by_name = _format_name_or_na(rec_first, rec_middle, rec_last, rec_suffix)
        paid_by_name = (
            _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
            if is_paid
            else "N/A"
        )
        supplier_clean = _compute_supplier_display_name(
            organization, supplier_farm, contact_person
        )

        amount_val = float(_to_decimal(total_price))
        filter_dt = effective_paid_at or received_at

        payables_report.append(
            {
                "id": f"PAY-{receiving_id}",
                "receiving_id": receiving_id,
                "batch_code": (batch_no or "").strip() or "N/A",
                "rice_variant": (product_name or "").strip() or "N/A",
                "supplier_name": supplier_clean,
                "ordered_quantity": float(ordered_quantity) if ordered_quantity is not None else None,
                "receiving_reference_id": (receiving_reference_no or "").strip() or "N/A",
                "received_quantity": float(total_received) if total_received is not None else None,
                "good_quantity": float(received_good) if received_good is not None else None,
                "rejected_quantity": float(received_bad) if received_bad is not None else None,
                "price_per_kg": float(price_per_kg) if price_per_kg is not None else None,
                "total_payable_amount": amount_val,
                "received_by": received_by_name,
                "received_at": _format_date_display(received_at),
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "N/A",
                "is_paid": is_paid,
                "payment_method": (effective_method or "").strip() or "N/A",
                "payment_reference_id": (effective_ref_id or "").strip() or "N/A",
                "paid_at": _format_date_display(effective_paid_at) if is_paid else "N/A",
                "paid_by": paid_by_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # 2. EXPENSES (pending + paid)
    expenses_sql = """
        SELECT
            me.expenses_id,
            me.setting_reference_no,
            me.expense_type,
            me.description,
            me.price,
            me.deadline,
            me.status,
            me.payment_method,
            me.payment_reference_no,
            me.payment_date,
            me.created_at,
            u.first_name AS set_by_first_name,
            u.last_name AS set_by_last_name,
            se.first_name AS paid_by_first_name,
            se.middle_initial AS paid_by_middle_name,
            se.last_name AS paid_by_last_name,
            se.suffix AS paid_by_suffix
        FROM miller_expenses me
        LEFT JOIN users u
            ON me.set_by_user_id = u.user_id
        LEFT JOIN supplier_employees se
            ON me.paid_by_employee_id = se.supplier_employee_id
        WHERE me.supplier_profile_id = %s
          AND LOWER(COALESCE(me.status, '')) IN ('pending', 'paid')
        ORDER BY COALESCE(me.payment_date, me.created_at) DESC, me.expenses_id DESC
    """
    expenses_report = []
    with connection.cursor() as cursor:
        cursor.execute(expenses_sql, [supplier_profile_id])
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
        paid_by_name = (
            _format_name_or_na(
                paid_by_first_name, paid_by_middle_name, paid_by_last_name, paid_by_suffix
            )
            if is_paid
            else "N/A"
        )
        amount_val = float(_to_decimal(price))
        filter_dt = payment_date or created_at or deadline

        expenses_report.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "setting_reference_no": (setting_reference_no or "").strip() or "N/A",
                "set_by": set_by_name,
                "type": (expense_type or "").strip() or "N/A",
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "N/A",
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

    # 3. REIMBURSEMENTS (requested + paid)
    reimbursements_sql = """
        SELECT
            mr.reimbursement_id,
            mr.request_reference_no,
            mr.types,
            mr.title,
            mr.description,
            mr.price,
            mr.requested_date,
            mr.status,
            mr.method,
            mr.payment_reference_no,
            mr.paid_date,
            req.first_name AS req_first_name,
            req.middle_initial AS req_middle_name,
            req.last_name AS req_last_name,
            req.suffix AS req_suffix,
            payer.first_name AS payer_first_name,
            payer.middle_initial AS payer_middle_name,
            payer.last_name AS payer_last_name,
            payer.suffix AS payer_suffix
        FROM miller_reimbursement mr
        LEFT JOIN supplier_employees req
            ON mr.requested_by = req.supplier_employee_id
        LEFT JOIN supplier_employees payer
            ON mr.paid_by = payer.supplier_employee_id
        WHERE mr.supplier_profile_id = %s
          AND LOWER(COALESCE(mr.status, '')) IN ('requested', 'paid')
        ORDER BY COALESCE(mr.paid_date, mr.requested_date) DESC, mr.reimbursement_id DESC
    """
    reimbursements_report = []
    with connection.cursor() as cursor:
        cursor.execute(reimbursements_sql, [supplier_profile_id])
        reimb_rows = cursor.fetchall()

    reimb_ids = [row[0] for row in reimb_rows]
    reimb_attempts_map = _fetch_latest_payout_attempts_map(
        reimb_ids, supplier_profile_id
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

        is_paid = (
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
                "request_reference_no": (request_reference_no or "").strip() or "N/A",
                "requested_by": requester_name,
                "category": (reimb_type or "").strip() or "N/A",
                "type": (title or "").strip() or "N/A",
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "N/A",
                "is_paid": is_paid,
                "is_sandbox": is_sandbox,
                "is_live_paid": bool(is_paid and not is_sandbox),
                "payment_method": display_method,
                "payment_reference_no": effective_ref_no,
                "payment_date": _format_date_display(effective_paid_dt) if is_paid else "N/A",
                "paid_by": payer_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

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


