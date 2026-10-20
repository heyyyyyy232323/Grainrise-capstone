import re
from django.db import connection
from api.miller_function.online_payment_accounts.selectors import mask_account_number

PRESET_REIMBURSEMENT_CATEGORIES = [
    "Transportation & Travel",
    "Meals & Allowances",
    "Emergency",
    "Equipment & Repair",
    "Communication",
    "Logistics",
    "Office & Operating Supplies",
    "Others",
]

PENDING_PAYOUT_STATUSES = {
    "CREATED",
    "ACCEPTED",
    "REQUESTED",
    "ROUTING",
    "READY",
    "LOCKED",
    "PENDING_COMPLIANCE_ASSESSMENT",
    "PENDING",
}

FAILED_PAYOUT_STATUSES = {
    "FAILED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
    "REVERSED",
    "API_ERROR",
}


def compute_initials(full_name: str, fallback: str = "XX") -> str:
    """Extract uppercase initials from a full name (up to 4 characters)."""
    words = [w for w in re.split(r"[^A-Za-z]+", str(full_name or "").strip()) if w]
    if words:
        initials = "".join(w[0].upper() for w in words)[:4]
        if initials:
            return initials
    return fallback


def compute_business_prefix3(business_name: str) -> str:
    """Extract first 3 uppercase alphanumeric characters of business name."""
    clean = re.sub(r"[^A-Za-z0-9]", "", str(business_name or "").strip()).upper()
    if len(clean) >= 3:
        return clean[:3]
    if len(clean) > 0:
        return clean.ljust(3, "X")
    return "GRA"


def _resolve_media_url(raw_path):
    if not raw_path:
        return None
    val = str(raw_path).strip()
    if not val:
        return None
    if (
        val.startswith("http://")
        or val.startswith("https://")
        or val.startswith("data:")
        or val.startswith("/")
    ):
        return val
    return f"/media/{val.lstrip('/')}"


def _format_business_address(street, barangay, municipality, province, postal_code):
    parts = [
        str(p).strip()
        for p in [street, barangay, municipality, province]
        if p and str(p).strip()
    ]
    addr = ", ".join(parts)
    if postal_code and str(postal_code).strip():
        addr += f" {str(postal_code).strip()}"
    return addr or "Address Not Provided"


def _format_business_contact(contact_number, email):
    parts = [str(p).strip() for p in [contact_number, email] if p and str(p).strip()]
    return " • ".join(parts) if parts else "Contact Not Provided"


def _fetch_latest_payout_attempts_map(reimbursement_ids, supplier_profile_id):
    """
    Fetch the latest payout tracking attempt per reimbursement_id from
    miller_reimbursement_payout_tracking.
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
        WHERE pt.supplier_profile_id = %s
          AND pt.reimbursement_id IN ({placeholders})
        ORDER BY pt.payout_attempt_id DESC
    """
    params = [supplier_profile_id, *reimbursement_ids]
    with connection.cursor() as cursor:
        cursor.execute(query, params)
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
            "xendit_environment": env,
            "is_sandbox": env == "test",
            "xendit_business_id": r[8],
            "reference_id": r[9],
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
            "account_number_masked": mask_account_number(r[22], cred_type) if r[22] else None,
            "account_label": (
                f"{r[19] or r[20] or cred_type.upper()} — {r[21] or ''} ({mask_account_number(r[22], cred_type)})"
                if r[22]
                else None
            ),
        }

    for reimb_id, attempt in latest_map.items():
        attempt["attempt_count"] = counts_map.get(reimb_id, 1)

    return latest_map


def list_pending_reimbursements(supplier_profile_id: int, filters: dict = None) -> list:
    """
    Fetch pending ('requested') reimbursement records belonging strictly to
    the authenticated Finance employee's supplier_profile_id.
    Supports functional search, category filtering across all 8 categories,
    and sorting by Price High/Low, Category A-Z/Z-A, and Requester A-Z/Z-A.
    """
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    category = str(filters.get("category") or filters.get("type") or "").strip()
    sort_by = str(filters.get("sort_by") or "category-asc").strip().lower()

    query = """
        SELECT
            mr.reimbursement_id,
            mr.supplier_profile_id,
            sp.business_name,
            mr.requested_by,
            se.first_name,
            se.middle_initial,
            se.last_name,
            se.suffix,
            se.position,
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
        INNER JOIN supplier_employees se
            ON se.supplier_employee_id = mr.requested_by
        WHERE mr.supplier_profile_id = %s
          AND LOWER(TRIM(COALESCE(mr.status, ''))) = 'requested'
          AND mr.paid_date IS NULL
          AND mr.paid_by IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM miller_reimbursement_payout_tracking pt_done
              WHERE pt_done.reimbursement_id = mr.reimbursement_id
                AND pt_done.supplier_profile_id = mr.supplier_profile_id
                AND UPPER(TRIM(COALESCE(pt_done.payout_status, ''))) = 'SUCCEEDED'
          )
    """
    params = [supplier_profile_id]

    if category and category.lower() not in ("all", ""):
        query += " AND mr.types = %s"
        params.append(category)

    if search:
        pattern = f"%{search}%"
        query += """
            AND (
                mr.request_reference_no LIKE %s
                OR mr.types LIKE %s
                OR COALESCE(mr.title, '') LIKE %s
                OR COALESCE(mr.description, '') LIKE %s
                OR CONCAT_WS(' ', COALESCE(se.first_name, ''), COALESCE(se.middle_initial, ''), COALESCE(se.last_name, ''), COALESCE(se.suffix, '')) LIKE %s
            )
        """
        params.extend([pattern, pattern, pattern, pattern, pattern])

    if sort_by in ("cost-desc", "price-desc", "highest_price", "highest_amount"):
        query += " ORDER BY mr.price DESC, mr.reimbursement_id DESC"
    elif sort_by in ("cost-asc", "price-asc", "lowest_price", "lowest_amount"):
        query += " ORDER BY mr.price ASC, mr.reimbursement_id ASC"
    elif sort_by in ("category-desc", "type-desc"):
        query += " ORDER BY mr.types DESC, mr.reimbursement_id DESC"
    elif sort_by in ("requester-asc",):
        query += " ORDER BY CONCAT_WS(' ', TRIM(se.first_name), TRIM(se.last_name)) ASC, mr.reimbursement_id DESC"
    elif sort_by in ("requester-desc",):
        query += " ORDER BY CONCAT_WS(' ', TRIM(se.first_name), TRIM(se.last_name)) DESC, mr.reimbursement_id DESC"
    else:  # category-asc default
        query += " ORDER BY mr.types ASC, mr.reimbursement_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    reimb_ids = [r[0] for r in rows]
    payout_map = _fetch_latest_payout_attempts_map(reimb_ids, supplier_profile_id)

    results = []
    for r in rows:
        reimbursement_id = r[0]
        sp_id = r[1]
        business_name = r[2] or "GrainRise Miller"
        requested_by_id = r[3]
        fn = (r[4] or "").strip()
        mi = (r[5] or "").strip()
        ln = (r[6] or "").strip()
        sfx = (r[7] or "").strip()
        pos = (r[8] or "").strip()
        title = r[9] or ""
        description = r[10] or ""
        category_type = r[11] or "Others"
        price_num = float(r[12] or 0)
        req_date = r[13]
        photo_evidence = _resolve_media_url(r[14])
        st = str(r[15] or "requested").strip().lower()
        req_ref_no = r[16] or f"REIMB-{reimbursement_id}"
        paid_by_id = r[17]
        paid_date = r[18]
        method = r[19]
        receipt_photo = _resolve_media_url(r[20])
        payment_ref_no = r[21]
        business_address = _format_business_address(r[22], r[23], r[24], r[25], r[26])
        business_contact = _format_business_contact(r[27], r[28])

        if st != "requested" or paid_date is not None or paid_by_id is not None:
            continue

        latest_payout = payout_map.get(reimbursement_id)
        if latest_payout and latest_payout.get("is_succeeded"):
            continue

        name_parts = [p for p in [fn, f"{mi}." if mi and not mi.endswith(".") else mi, ln, sfx] if p]
        requester_name = " ".join(name_parts) or f"Employee #{requested_by_id}"
        requester_initials = compute_initials(f"{fn} {ln}", fallback="RQ")
        business_prefix3 = compute_business_prefix3(business_name)

        date_short = req_date.strftime("%b %d, %Y") if hasattr(req_date, "strftime") else str(req_date or "—")
        date_full = req_date.strftime("%b %d, %Y %I:%M %p") if hasattr(req_date, "strftime") else str(req_date or "—")

        results.append(
            {
                "id": reimbursement_id,
                "reimbursement_id": reimbursement_id,
                "supplier_profile_id": sp_id,
                "business_name": business_name,
                "business_address": business_address,
                "business_contact": business_contact,
                "business_prefix3": business_prefix3,
                "request_reference_no": req_ref_no,
                "requested_by": requested_by_id,
                "requested_by_id": requested_by_id,
                "requester": requester_name,
                "requester_name": requester_name,
                "requester_initials": requester_initials,
                "requester_position": pos,
                "category": category_type,
                "types": category_type,
                "title": title,
                "description": description,
                "cost": f"₱{price_num:,.2f}",
                "price": f"₱{price_num:,.2f}",
                "price_raw": price_num,
                "amount_centavos": int(round(price_num * 100)),
                "date": date_short,
                "requested_date": date_full,
                "requested_date_iso": req_date.isoformat() if hasattr(req_date, "isoformat") else None,
                "photo_evidence": photo_evidence,
                "status": st,
                "paid_by": paid_by_id,
                "paid_date": paid_date.strftime("%b %d, %Y, %I:%M %p") if hasattr(paid_date, "strftime") else None,
                "method": method,
                "receipt_photo": receipt_photo,
                "payment_reference_no": payment_ref_no,
                "latest_payout_attempt": latest_payout,
            }
        )

    return results


def get_reimbursement_categories(supplier_profile_id: int) -> list:
    """
    Return all 8 required reimbursement categories in exact order, plus any custom
    categories present in miller_reimbursement for the branch.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT mr.types
            FROM miller_reimbursement mr
            WHERE mr.supplier_profile_id = %s
              AND mr.types IS NOT NULL
              AND TRIM(mr.types) != ''
            ORDER BY mr.types ASC
            """,
            [supplier_profile_id],
        )
        db_types = [r[0].strip() for r in cursor.fetchall() if r[0] and r[0].strip()]

    categories = list(PRESET_REIMBURSEMENT_CATEGORIES)
    for dt in db_types:
        if dt not in categories:
            categories.append(dt)
    return categories


def get_reimbursement_detail(supplier_profile_id: int, reimbursement_id: int) -> dict:
    """
    Fetch single reimbursement detail strictly scoped to supplier_profile_id,
    including latest_payout_attempt.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mr.reimbursement_id,
                mr.supplier_profile_id,
                sp.business_name,
                mr.requested_by,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.position,
                mr.title,
                mr.description,
                mr.types,
                mr.price,
                mr.requested_date,
                mr.photo_evidence,
                mr.status,
                mr.request_reference_no,
                mr.paid_by,
                CONCAT_WS(' ', COALESCE(pe.first_name, ''), COALESCE(pe.last_name, '')) AS paid_by_name,
                mr.paid_date,
                mr.method,
                mr.receipt_photo,
                mr.payment_reference_no,
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
            INNER JOIN supplier_employees se
                ON se.supplier_employee_id = mr.requested_by
            LEFT JOIN supplier_employees pe
                ON pe.supplier_employee_id = mr.paid_by
            WHERE mr.reimbursement_id = %s
              AND mr.supplier_profile_id = %s
            LIMIT 1
            """,
            [reimbursement_id, supplier_profile_id],
        )
        r = cursor.fetchone()

    if not r:
        return None

    reimb_id = r[0]
    sp_id = r[1]
    business_name = r[2] or "GrainRise Miller"
    requested_by_id = r[3]
    fn = (r[4] or "").strip()
    mi = (r[5] or "").strip()
    ln = (r[6] or "").strip()
    sfx = (r[7] or "").strip()
    pos = (r[8] or "").strip()
    title = r[9] or ""
    description = r[10] or ""
    category_type = r[11] or "Others"
    price_num = float(r[12] or 0)
    req_date = r[13]
    photo_evidence = _resolve_media_url(r[14])
    st = str(r[15] or "requested").lower()
    req_ref_no = r[16] or f"REIMB-{reimb_id}"
    paid_by_id = r[17]
    paid_by_name = (r[18] or "").strip() or None
    paid_date = r[19]
    method = r[20]
    receipt_photo = _resolve_media_url(r[21])
    payment_ref_no = r[22]
    business_address = _format_business_address(r[23], r[24], r[25], r[26], r[27])
    business_contact = _format_business_contact(r[28], r[29])

    name_parts = [p for p in [fn, f"{mi}." if mi and not mi.endswith(".") else mi, ln, sfx] if p]
    requester_name = " ".join(name_parts) or f"Employee #{requested_by_id}"
    requester_initials = compute_initials(f"{fn} {ln}", fallback="RQ")
    business_prefix3 = compute_business_prefix3(business_name)

    payout_map = _fetch_latest_payout_attempts_map([reimb_id], supplier_profile_id)
    latest_payout = payout_map.get(reimb_id)

    return {
        "id": reimb_id,
        "reimbursement_id": reimb_id,
        "supplier_profile_id": sp_id,
        "business_name": business_name,
        "business_address": business_address,
        "business_contact": business_contact,
        "business_prefix3": business_prefix3,
        "request_reference_no": req_ref_no,
        "requested_by": requested_by_id,
        "requested_by_id": requested_by_id,
        "requester": requester_name,
        "requester_name": requester_name,
        "requester_initials": requester_initials,
        "requester_position": pos,
        "category": category_type,
        "types": category_type,
        "title": title,
        "description": description,
        "cost": f"₱{price_num:,.2f}",
        "price": f"₱{price_num:,.2f}",
        "price_raw": price_num,
        "amount_centavos": int(round(price_num * 100)),
        "date": req_date.strftime("%b %d, %Y") if hasattr(req_date, "strftime") else str(req_date or "—"),
        "requested_date": req_date.strftime("%b %d, %Y %I:%M %p") if hasattr(req_date, "strftime") else str(req_date or "—"),
        "photo_evidence": photo_evidence,
        "status": st,
        "paid_by": paid_by_id,
        "paid_by_name": paid_by_name or (latest_payout.get("initiated_by_name") if latest_payout else None),
        "paid_date": paid_date.strftime("%b %d, %Y, %I:%M %p") if hasattr(paid_date, "strftime") else None,
        "method": method,
        "receipt_photo": receipt_photo,
        "payment_reference_no": payment_ref_no,
        "latest_payout_attempt": latest_payout,
    }


def list_requester_active_payment_accounts(
    supplier_profile_id: int,
    reimbursement_id: int,
    account_type: str = None,
) -> dict:
    """
    Fetch ONLY active registered payment accounts belonging to the reimbursement's
    requesting employee (mr.requested_by) and matching supplier_profile_id.
    Never returns accounts belonging to any other employee or branch.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mr.reimbursement_id,
                mr.requested_by,
                se.first_name,
                se.last_name
            FROM miller_reimbursement mr
            INNER JOIN supplier_employees se
                ON se.supplier_employee_id = mr.requested_by
            WHERE mr.reimbursement_id = %s
              AND mr.supplier_profile_id = %s
            LIMIT 1
            """,
            [reimbursement_id, supplier_profile_id],
        )
        reimb_row = cursor.fetchone()

    if not reimb_row:
        return None

    _, requested_by_emp_id, req_fn, req_ln = reimb_row
    requester_name = f"{req_fn or ''} {req_ln or ''}".strip() or f"Employee #{requested_by_emp_id}"

    query = """
        SELECT
            ec.credentials_id,
            ec.supplier_profile_id,
            ec.supplier_employee_id,
            ec.type,
            ec.platform_name,
            ec.bank_name,
            ec.account_number,
            ec.account_name,
            ec.verification_status,
            ec.is_default,
            ec.status
        FROM miller_employee_online_transaction_credentials ec
        WHERE ec.supplier_profile_id = %s
          AND ec.supplier_employee_id = %s
          AND ec.status = 'active'
    """
    params = [supplier_profile_id, requested_by_emp_id]

    if account_type and str(account_type).strip().lower() in ("gcash", "bank"):
        query += " AND ec.type = %s"
        params.append(str(account_type).strip().lower())

    query += " ORDER BY ec.is_default DESC, ec.credentials_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        cid, sp_id, emp_id, acc_type, plat_name, bank_name, raw_num, acc_name, verif_stat, is_def, st = r
        acc_type_clean = str(acc_type or "").lower()
        provider_label = "GCash" if acc_type_clean == "gcash" else (bank_name or plat_name or "Bank")
        masked_num = mask_account_number(raw_num, acc_type_clean)

        accounts.append(
            {
                "credentials_id": cid,
                "id": cid,
                "supplier_profile_id": sp_id,
                "supplier_employee_id": emp_id,
                "type": acc_type_clean,
                "type_display": "GCash" if acc_type_clean == "gcash" else "Bank",
                "platform_name": plat_name or provider_label,
                "bank_name": bank_name or ("—" if acc_type_clean == "gcash" else "Bank"),
                "account_name": acc_name or requester_name,
                "account_number_masked": masked_num,
                "display_label": f"{provider_label} — {acc_name} ({masked_num})",
                "verification_status": verif_stat or "unverified",
                "is_default": bool(is_def),
                "status": st or "active",
            }
        )

    return {
        "reimbursement_id": reimbursement_id,
        "requested_by": requested_by_emp_id,
        "requester_name": requester_name,
        "accounts": accounts,
    }

