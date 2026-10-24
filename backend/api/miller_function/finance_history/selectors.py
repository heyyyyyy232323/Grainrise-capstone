from decimal import Decimal
from django.db import connection

from api.miller_employees_function.miller_finance.expenses.selectors import (
    PRESET_EXPENSE_TYPES,
)
from api.miller_employees_function.miller_finance.reimbursements.selectors import (
    PRESET_REIMBURSEMENT_CATEGORIES,
    PENDING_PAYOUT_STATUSES,
    FAILED_PAYOUT_STATUSES,
    _format_business_address,
    _resolve_media_url,
    mask_account_number,
)
from api.miller_employees_function.miller_finance.payment_history.selectors import (
    _format_name_or_na,
    _compute_supplier_display_name,
    _to_decimal,
    _serialize_decimal,
    _serialize_datetime,
    _format_date_display,
    _format_datetime_display,
    _format_date_iso,
    _format_qty_kg,
    _format_peso_str,
)


def get_manager_business_context(miller_user_id, branch_id=None):
    """
    Retrieve business context for the authenticated Miller Manager.
    If branch_id is specified, gets the context for that branch.
    Otherwise gets the context for the manager's earliest / default branch.
    """
    if branch_id and str(branch_id).lower() != "all":
        query = """
            SELECT
                sp.business_name,
                sp.street_address,
                sp.barangay,
                sp.municipality,
                sp.province,
                sp.postal_code,
                sp.official_contact_number,
                sp.official_email,
                sp.supplier_profile_id
            FROM supplier_profiles sp
            WHERE sp.user_id = %s AND sp.supplier_profile_id = %s
            LIMIT 1
        """
        params = [miller_user_id, int(branch_id)]
    else:
        query = """
            SELECT
                sp.business_name,
                sp.street_address,
                sp.barangay,
                sp.municipality,
                sp.province,
                sp.postal_code,
                sp.official_contact_number,
                sp.official_email,
                sp.supplier_profile_id
            FROM supplier_profiles sp
            WHERE sp.user_id = %s
            ORDER BY sp.created_at ASC, sp.supplier_profile_id ASC
            LIMIT 1
        """
        params = [miller_user_id]

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        row = cursor.fetchone()

    if not row:
        return {
            "business_name": "N/A",
            "business_address": "N/A",
            "business_contact": "N/A",
            "business_email": "N/A",
            "supplier_profile_id": None,
        }

    (
        b_name,
        street,
        brgy,
        muni,
        prov,
        postal,
        contact,
        email,
        sp_id,
    ) = row

    addr_parts = [
        street,
        f"Brgy. {brgy}" if brgy else None,
        muni,
        f"{prov} {postal}".strip() if prov or postal else None,
    ]
    addr_clean = ", ".join([p.strip() for p in addr_parts if p and p.strip()]) or "N/A"

    return {
        "business_name": (b_name or "").strip() or "N/A",
        "business_address": addr_clean,
        "business_contact": (contact or "").strip() or "N/A",
        "business_email": (email or "").strip() or "N/A",
        "supplier_profile_id": sp_id,
    }


def _fetch_manager_payout_attempts_map(reimbursement_ids):
    """
    Fetch latest payout attempt for a list of reimbursement IDs across any of manager's branches.
    """
    if not reimbursement_ids:
        return {}

    placeholders = ", ".join(["%s"] * len(reimbursement_ids))
    query = f"""
        SELECT
            pt.payout_attempt_id,
            pt.reimbursement_id,
            pt.supplier_profile_id,
            pt.employee_credentials_id,
            pt.initiated_by,
            pt.method,
            pt.amount_centavos,
            pt.xendit_environment,
            pt.xendit_business_id,
            pt.reference_id,
            pt.idempotency_key,
            pt.xendit_payout_id,
            pt.processor_reference,
            pt.payout_status,
            pt.failure_reason,
            pt.receipt_photo,
            pt.created_at,
            pt.updated_at,
            ec.type AS credential_type,
            ec.platform_name,
            ec.bank_name,
            ec.account_name,
            ec.account_number,
            pe.first_name AS payer_first_name,
            pe.last_name AS payer_last_name
        FROM miller_reimbursement_payout_tracking pt
        LEFT JOIN miller_employee_online_transaction_credentials ec
            ON ec.credentials_id = pt.employee_credentials_id
        LEFT JOIN supplier_employees pe
            ON pe.supplier_employee_id = pt.initiated_by
        WHERE pt.reimbursement_id IN ({placeholders})
        ORDER BY pt.payout_attempt_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(query, reimbursement_ids)
        rows = cursor.fetchall()

    latest_map = {}
    counts_map = {}
    for r in rows:
        reimb_id = r[1]
        counts_map[reimb_id] = counts_map.get(reimb_id, 0) + 1
        if reimb_id in latest_map:
            continue

        payout_status = str(r[13] or "CREATED").upper()
        env = str(r[7] or "test").lower()
        cred_type = str(r[18] or "gcash").lower()
        payer_full = f"{(r[23] or '').strip()} {(r[24] or '').strip()}".strip() or None
        latest_map[reimb_id] = {
            "payout_attempt_id": r[0],
            "reimbursement_id": reimb_id,
            "supplier_profile_id": r[2],
            "employee_credentials_id": r[3],
            "initiated_by": r[4],
            "initiated_by_name": payer_full,
            "method": r[5],
            "amount_centavos": int(r[6] or 0),
            "amount": float(r[6] or 0) / 100.0,
            "xendit_environment": env,
            "is_sandbox": env == "test",
            "xendit_business_id": r[8],
            "reference_id": r[9],
            "reference_no": r[12] or r[11] or r[9],
            "idempotency_key": r[10],
            "xendit_payout_id": r[11],
            "processor_reference": r[12],
            "provider_reference": r[12] or r[11] or r[9],
            "payout_status": payout_status,
            "is_pending": payout_status in PENDING_PAYOUT_STATUSES,
            "is_succeeded": payout_status == "SUCCEEDED",
            "is_failed": payout_status in FAILED_PAYOUT_STATUSES,
            "can_retry": payout_status in FAILED_PAYOUT_STATUSES,
            "failure_reason": r[14],
            "receipt_photo": _resolve_media_url(r[15]),
            "created_at": r[16].strftime("%b %d, %Y, %I:%M %p") if r[16] else None,
            "updated_at": r[17].strftime("%b %d, %Y, %I:%M %p") if r[17] else None,
            "account_name": r[21] or None,
            "account_number": r[22] or None,
            "account_number_masked": mask_account_number(r[22], cred_type) if r[22] else None,
        }

    for reimb_id, attempt in latest_map.items():
        attempt["attempt_count"] = counts_map.get(reimb_id, 1)

    return latest_map


def _get_manager_paid_payables_history(miller_user_id, branch_id=None):
    """
    Fetch paid payables across all branches owned by the Miller Manager (sp.user_id = miller_user_id).
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
            mfpr.receipt_image_url AS receipt_image_url,
            mfpr.requested_at AS ref_requested_at,
            mfpr.paid_at AS ref_paid_at,
            sp.supplier_profile_id,
            sp.business_name,
            sp.street_address,
            sp.barangay,
            sp.municipality,
            sp.province,
            sp.postal_code,
            sp.official_contact_number,
            sp.official_email
        FROM inbound_purchase_history iph
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
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
        WHERE sp.user_id = %s
          AND LOWER(COALESCE(iph.status, '')) = 'paid'
    """
    params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            sql += " AND iph.supplier_profile_id = %s"
            params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    sql += " ORDER BY COALESCE(mfpr.paid_at, iph.received_at) DESC, iph.receiving_id DESC"

    records = []
    suppliers_set = set()

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
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
            sp_id,
            sp_b_name,
            sp_street,
            sp_brgy,
            sp_muni,
            sp_prov,
            sp_postal,
            sp_contact,
            sp_email,
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
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        branch_addr_parts = [
            sp_street,
            f"Brgy. {sp_brgy}" if sp_brgy else None,
            sp_muni,
            f"{sp_prov} {sp_postal}".strip() if sp_prov or sp_postal else None,
        ]
        branch_addr_clean = ", ".join([p.strip() for p in branch_addr_parts if p and p.strip()]) or "N/A"

        records.append(
            {
                "id": f"PAY-{receiving_id}",
                "receiving_id": receiving_id,
                "supplier_profile_id": sp_id,
                "supplierProfileId": sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
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
                "paidAt": _format_date_display(effective_paid_at),
                "paid_at": _format_date_display(effective_paid_at),
                "received_at": _format_date_display(received_at),
                "status": "paid",
                "receiving_reference_no": ref_str,
                "receiving_reference_id": ref_str,
                "received_by": received_by_name,
                "received_by_name": received_by_name,
                "requested_by": requested_by_name,
                "requested_by_name": requested_by_name,
                "paid_by": paid_by_name,
                "paid_by_name": paid_by_name,
                "payment_method": effective_method,
                "payment_reference_id": effective_ref_id,
                "receipt_image_url": receipt_image_url or "",
                "requested_at": _format_date_display(effective_requested_at),
                "date_iso": _format_date_iso(effective_paid_at),
                "sort_timestamp": (
                    effective_paid_at.timestamp()
                    if hasattr(effective_paid_at, "timestamp")
                    else 0
                ),
                "business_name": branch_name_val,
                "business_address": branch_addr_clean,
                "business_contact": (sp_contact or "").strip() or "N/A",
                "business_email": (sp_email or "").strip() or "N/A",
            }
        )

    return records, sorted(suppliers_set)


def _get_manager_paid_expenses_history(miller_user_id, branch_id=None):
    """
    Fetch paid expenses across all branches owned by the Miller Manager.
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
            se.suffix AS paid_by_suffix,
            sp.business_name,
            sp.street_address,
            sp.barangay,
            sp.municipality,
            sp.province,
            sp.postal_code,
            sp.official_contact_number,
            sp.official_email
        FROM miller_expenses me
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = me.supplier_profile_id
        LEFT JOIN users u
            ON me.set_by_user_id = u.user_id
        LEFT JOIN supplier_employees se
            ON me.paid_by_employee_id = se.supplier_employee_id
        WHERE sp.user_id = %s
          AND LOWER(COALESCE(me.status, '')) = 'paid'
    """
    params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            sql += " AND me.supplier_profile_id = %s"
            params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    sql += " ORDER BY COALESCE(me.payment_date, me.updated_at, me.created_at) DESC, me.expenses_id DESC"

    records = []
    expense_types_set = set(PRESET_EXPENSE_TYPES)

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    for row in rows:
        (
            expenses_id,
            row_sp_id,
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
            sp_b_name,
            sp_street,
            sp_brgy,
            sp_muni,
            sp_prov,
            sp_postal,
            sp_contact,
            sp_email,
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
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        branch_addr_parts = [
            sp_street,
            f"Brgy. {sp_brgy}" if sp_brgy else None,
            sp_muni,
            f"{sp_prov} {sp_postal}".strip() if sp_prov or sp_postal else None,
        ]
        branch_addr_clean = ", ".join([p.strip() for p in branch_addr_parts if p and p.strip()]) or "N/A"

        records.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "supplier_profile_id": row_sp_id,
                "supplierProfileId": row_sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
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
                "business_name": branch_name_val,
                "business_address": branch_addr_clean,
                "business_contact": (sp_contact or "").strip() or "N/A",
                "business_email": (sp_email or "").strip() or "N/A",
            }
        )

    ordered_types = list(PRESET_EXPENSE_TYPES)
    for t in sorted(expense_types_set):
        if t not in ordered_types:
            ordered_types.append(t)

    return records, ordered_types


def _get_manager_completed_reimbursements_history(miller_user_id, branch_id=None):
    """
    Fetch completed reimbursement transactions across all branches owned by the Miller Manager.
    Includes records where status = 'paid' OR the latest payout attempt had payout_status = 'SUCCEEDED'.
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
            payer.suffix AS payer_suffix,
            sp.business_name,
            sp.street_address,
            sp.barangay,
            sp.municipality,
            sp.province,
            sp.postal_code,
            sp.official_contact_number,
            sp.official_email
        FROM miller_reimbursement mr
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = mr.supplier_profile_id
        LEFT JOIN supplier_employees req
            ON mr.requested_by = req.supplier_employee_id
        LEFT JOIN supplier_employees payer
            ON mr.paid_by = payer.supplier_employee_id
        WHERE sp.user_id = %s
    """
    params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            sql += " AND mr.supplier_profile_id = %s"
            params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    sql += " ORDER BY COALESCE(mr.paid_date, mr.requested_date) DESC, mr.reimbursement_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    reimbursement_ids = [row[0] for row in rows]
    latest_attempts_map = _fetch_manager_payout_attempts_map(reimbursement_ids)

    records = []
    categories_set = set(PRESET_REIMBURSEMENT_CATEGORIES)

    for row in rows:
        (
            reimbursement_id,
            row_sp_id,
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
            sp_b_name,
            sp_street,
            sp_brgy,
            sp_muni,
            sp_prov,
            sp_postal,
            sp_contact,
            sp_email,
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
        price_float = float(price_dec)

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

        effective_method = method or (
            "ONLINE PAYMENT"
            if latest_attempt
            else ("CASH" if is_db_paid else "N/A")
        )
        effective_ref_no = (
            payment_reference_no
            or (latest_attempt.get("reference_no") if latest_attempt else None)
            or "N/A"
        )
        is_sandbox = bool(latest_attempt.get("is_sandbox")) if latest_attempt else False
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        branch_addr_parts = [
            sp_street,
            f"Brgy. {sp_brgy}" if sp_brgy else None,
            sp_muni,
            f"{sp_prov} {sp_postal}".strip() if sp_prov or sp_postal else None,
        ]
        branch_addr_clean = ", ".join([p.strip() for p in branch_addr_parts if p and p.strip()]) or "N/A"

        records.append(
            {
                "id": f"REIMB-{reimbursement_id}",
                "reimbursement_id": reimbursement_id,
                "supplier_profile_id": row_sp_id,
                "supplierProfileId": row_sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
                "request_reference_no": request_reference_no or f"REIMB-{reimbursement_id}",
                "requested_by": requested_by_id,
                "requested_by_name": requester_name,
                "requester": requester_name,
                "requester_position": req_position or "N/A",
                "title": title or "N/A",
                "description": description or "N/A",
                "category": category_clean,
                "types": category_clean,
                "price": price_float,
                "price_raw": price_float,
                "cost": _format_peso_str(price_float),
                "requested_date": _format_date_display(requested_date),
                "photo_evidence": photo_evidence or "",
                "status": "paid",
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
                "business_name": branch_name_val,
                "business_address": branch_addr_clean,
                "business_contact": (sp_contact or "").strip() or "N/A",
                "business_email": (sp_email or "").strip() or "N/A",
            }
        )

    ordered_categories = list(PRESET_REIMBURSEMENT_CATEGORIES)
    for c in sorted(categories_set):
        if c not in ordered_categories:
            ordered_categories.append(c)

    return records, ordered_categories


def get_manager_finance_payment_history_data(miller_user_id, branch_id=None):
    """
    Aggregate all paid data required by Miller Manager Payment History across its 3 tabs:
    1. Payables Payment (paid inbound_purchase_history)
    2. Expenses Payment (paid miller_expenses)
    3. Reimbursements (completed miller_reimbursement)
    Scoped to all branches owned by the Miller Manager (or filtered by branch_id).
    """
    business_info = get_manager_business_context(miller_user_id, branch_id)
    payables, suppliers = _get_manager_paid_payables_history(miller_user_id, branch_id)
    expenses, expense_types = _get_manager_paid_expenses_history(miller_user_id, branch_id)
    reimbursements, reimbursement_categories = _get_manager_completed_reimbursements_history(
        miller_user_id, branch_id
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


def get_manager_finance_report_data(miller_user_id, branch_id=None):
    """
    Fetch ALL existing Finance transactions (both PAID and PENDING) across branches owned
    by this Miller Manager.
    1. PROCUREMENT PAYABLES (status IN ('request_to_pay', 'paid'))
    2. EXPENSES (status IN ('pending', 'paid'))
    3. REIMBURSEMENT (status IN ('requested', 'paid'))
    """
    business_info = get_manager_business_context(miller_user_id, branch_id)

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
            mfpr.paid_at AS ref_paid_at,
            sp.supplier_profile_id,
            sp.business_name
        FROM inbound_purchase_history iph
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = iph.supplier_profile_id
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
        WHERE sp.user_id = %s
          AND LOWER(COALESCE(iph.status, '')) IN ('request_to_pay', 'paid')
    """
    pay_params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            payables_sql += " AND iph.supplier_profile_id = %s"
            pay_params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    payables_sql += " ORDER BY COALESCE(mfpr.paid_at, iph.received_at) DESC, iph.receiving_id DESC"

    payables_report = []
    with connection.cursor() as cursor:
        cursor.execute(payables_sql, pay_params)
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
            sp_id,
            sp_b_name,
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
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        payables_report.append(
            {
                "id": f"PAY-{receiving_id}",
                "receiving_id": receiving_id,
                "supplier_profile_id": sp_id,
                "supplierProfileId": sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
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
            u.first_name AS set_first,
            u.last_name AS set_last,
            se.first_name AS paid_first,
            se.middle_initial AS paid_middle,
            se.last_name AS paid_last,
            se.suffix AS paid_suffix,
            sp.supplier_profile_id,
            sp.business_name
        FROM miller_expenses me
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = me.supplier_profile_id
        LEFT JOIN users u
            ON me.set_by_user_id = u.user_id
        LEFT JOIN supplier_employees se
            ON me.paid_by_employee_id = se.supplier_employee_id
        WHERE sp.user_id = %s
          AND LOWER(COALESCE(me.status, '')) IN ('pending', 'paid')
    """
    exp_params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            expenses_sql += " AND me.supplier_profile_id = %s"
            exp_params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    expenses_sql += " ORDER BY COALESCE(me.payment_date, me.created_at) DESC, me.expenses_id DESC"

    expenses_report = []
    with connection.cursor() as cursor:
        cursor.execute(expenses_sql, exp_params)
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
            set_first,
            set_last,
            paid_first,
            paid_middle,
            paid_last,
            paid_suffix,
            sp_id,
            sp_b_name,
        ) = row

        is_paid = (status_val or "").strip().lower() == "paid"
        set_by_name = _format_name_or_na(set_first, set_last)
        paid_by_name = (
            _format_name_or_na(paid_first, paid_middle, paid_last, paid_suffix)
            if is_paid
            else "N/A"
        )
        amount_val = float(_to_decimal(price))
        filter_dt = (payment_date if is_paid else None) or created_at
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        expenses_report.append(
            {
                "id": f"EXP-{expenses_id}",
                "expenses_id": expenses_id,
                "supplier_profile_id": sp_id,
                "supplierProfileId": sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
                "setting_reference_no": (setting_reference_no or "").strip() or f"EXP-{expenses_id}",
                "set_by": set_by_name,
                "type": (expense_type or "").strip() or "Others",
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "N/A",
                "is_paid": is_paid,
                "payment_method": (payment_method or "").strip() if is_paid else "N/A",
                "payment_reference_no": (payment_reference_no or "").strip() if is_paid else "N/A",
                "payment_date": _format_date_display(payment_date) if is_paid else "N/A",
                "paid_by": paid_by_name,
                "date_iso": _format_date_iso(filter_dt),
            }
        )

    # 3. REIMBURSEMENTS (requested + paid)
    reimbursements_sql = """
        SELECT
            mr.reimbursement_id,
            mr.supplier_profile_id,
            mr.request_reference_no,
            mr.title,
            mr.description,
            mr.types,
            mr.price,
            mr.requested_date,
            mr.status,
            mr.paid_date,
            mr.method,
            mr.payment_reference_no,
            req.first_name AS req_first,
            req.middle_initial AS req_middle,
            req.last_name AS req_last,
            req.suffix AS req_suffix,
            payer.first_name AS payer_first,
            payer.middle_initial AS payer_middle,
            payer.last_name AS payer_last,
            payer.suffix AS payer_suffix,
            sp.business_name
        FROM miller_reimbursement mr
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = mr.supplier_profile_id
        LEFT JOIN supplier_employees req
            ON mr.requested_by = req.supplier_employee_id
        LEFT JOIN supplier_employees payer
            ON mr.paid_by = payer.supplier_employee_id
        WHERE sp.user_id = %s
          AND LOWER(COALESCE(mr.status, '')) IN ('requested', 'paid')
    """
    reimb_params = [miller_user_id]
    if branch_id and str(branch_id).lower() != "all":
        try:
            reimbursements_sql += " AND mr.supplier_profile_id = %s"
            reimb_params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    reimbursements_sql += " ORDER BY COALESCE(mr.paid_date, mr.requested_date) DESC, mr.reimbursement_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(reimbursements_sql, reimb_params)
        reimb_rows = cursor.fetchall()

    reimbursement_ids = [row[0] for row in reimb_rows]
    latest_attempts_map = _fetch_manager_payout_attempts_map(reimbursement_ids)

    reimbursements_report = []
    for row in reimb_rows:
        (
            reimbursement_id,
            sp_id,
            request_reference_no,
            title,
            description,
            reimb_type,
            price,
            requested_date,
            status_val,
            paid_date,
            method,
            payment_reference_no,
            req_first,
            req_middle,
            req_last,
            req_suffix,
            payer_first,
            payer_middle,
            payer_last,
            payer_suffix,
            sp_b_name,
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
        is_paid = is_db_paid or is_attempt_succeeded
        is_sandbox = bool(latest_attempt.get("is_sandbox")) if latest_attempt else False

        requester_name = _format_name_or_na(req_first, req_middle, req_last, req_suffix)
        payer_name = (
            _format_name_or_na(payer_first, payer_middle, payer_last, payer_suffix)
            if is_paid
            else "N/A"
        )
        if payer_name == "N/A" and is_paid and latest_attempt and latest_attempt.get("initiated_by_name"):
            payer_name = latest_attempt.get("initiated_by_name")

        amount_val = float(_to_decimal(price))

        effective_paid_dt = paid_date
        effective_paid_iso = _serialize_datetime(paid_date)
        if not effective_paid_iso and latest_attempt and is_paid:
            effective_paid_iso = (
                latest_attempt.get("updated_at")
                or latest_attempt.get("created_at")
            )

        filter_dt = (
            effective_paid_dt
            if is_paid
            else requested_date
        )
        date_iso = (
            _format_date_iso(effective_paid_dt)
            if is_paid
            else None
        ) or (
            effective_paid_iso[:10]
            if is_paid and effective_paid_iso
            else _format_date_iso(requested_date)
        )

        effective_method = (
            method
            or (
                "ONLINE PAYMENT"
                if latest_attempt
                else ("CASH" if is_db_paid else "N/A")
            )
            if is_paid
            else "N/A"
        )
        effective_ref_no = (
            (
                payment_reference_no
                or (latest_attempt.get("reference_no") if latest_attempt else None)
                or "N/A"
            )
            if is_paid
            else "N/A"
        )
        branch_name_val = (sp_b_name or "").strip() or "N/A"

        reimbursements_report.append(
            {
                "id": f"REIMB-{reimbursement_id}",
                "reimbursement_id": reimbursement_id,
                "supplier_profile_id": sp_id,
                "supplierProfileId": sp_id,
                "branch_name": branch_name_val,
                "branchName": branch_name_val,
                "request_reference_no": (request_reference_no or "").strip() or f"REIMB-{reimbursement_id}",
                "requested_by": requester_name,
                "category": (reimb_type or "").strip() or "Others",
                "type": (title or "").strip() or (reimb_type or "Others"),
                "description": (description or "").strip() or "N/A",
                "price": amount_val,
                "status": "Paid" if is_paid else "Pending",
                "raw_status": status_val or "N/A",
                "is_paid": is_paid,
                "is_sandbox": is_sandbox,
                "payment_method": effective_method,
                "payment_reference_no": effective_ref_no,
                "payment_date": _format_date_display(effective_paid_dt) if is_paid else "N/A",
                "paid_by": payer_name,
                "date_iso": date_iso,
            }
        )

    return {
        "business_info": business_info,
        "payables": payables_report,
        "expenses": expenses_report,
        "reimbursements": reimbursements_report,
    }

