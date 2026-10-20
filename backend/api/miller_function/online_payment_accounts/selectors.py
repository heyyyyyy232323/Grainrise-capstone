import logging
from datetime import datetime, timezone
from django.db import connection

logger = logging.getLogger(__name__)


def mask_account_number(account_number: str, acc_type: str = "bank") -> str:
    """
    Mask account number securely for display.
    GCash: 09•••••••89 (shows first 2 and last 2)
    Bank:  ••••••••1234 (shows last 4)
    """
    if not account_number:
        return "—"
    num = str(account_number).strip()
    if acc_type.lower() == "gcash":
        if len(num) >= 6:
            return f"{num[:2]}{'•' * (len(num) - 4)}{num[-2:]}"
        return f"{num[:2]}••••"
    else:
        if len(num) >= 5:
            return f"{'•' * (len(num) - 4)}{num[-4:]}"
        return f"••••{num[-2:]}" if len(num) >= 2 else "••••"


def mask_email(email: str) -> str:
    """Mask email address for privacy e.g. j***@gmail.com"""
    if not email or "@" not in email:
        return "—"
    parts = email.split("@", 1)
    user, domain = parts[0], parts[1]
    if len(user) <= 2:
        masked_user = user[0] + "***" if len(user) == 2 else "***"
    else:
        masked_user = user[:2] + "***"
    return f"{masked_user}@{domain}"


def get_manager_security_status(user_id: int) -> dict:
    """
    Check if the Miller Manager has configured a Payment Security Password.
    Returns status, failed attempts, and lock state.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT security_id, supplier_profile_id, password_hash, failed_attempts, locked_until
            FROM miller_payment_account_security
            WHERE user_id = %s
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()

    if not row:
        return {
            "has_security_password": False,
            "failed_attempts": 0,
            "is_locked": False,
            "locked_until": None,
            "lock_minutes_remaining": 0,
        }

    security_id, supplier_profile_id, password_hash, failed_attempts, locked_until = row
    is_locked = False
    lock_minutes_remaining = 0

    if locked_until:
        now_dt = datetime.now()
        # Handle naive or tz-aware
        if hasattr(locked_until, "tzinfo") and locked_until.tzinfo:
            now_dt = datetime.now(timezone.utc)
        if locked_until > now_dt:
            is_locked = True
            diff_secs = (locked_until - now_dt).total_seconds()
            lock_minutes_remaining = max(1, int(diff_secs // 60) + 1)

    return {
        "has_security_password": True,
        "failed_attempts": int(failed_attempts or 0),
        "is_locked": is_locked,
        "locked_until": locked_until.isoformat() if locked_until else None,
        "lock_minutes_remaining": lock_minutes_remaining,
    }


def get_manager_user_info(user_id: int) -> dict:
    """
    Fetch Manager's registered name, email, and masked email.
    Used for first-time setup prompt and client-side ID comparison.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT user_id, first_name, middle_initial, last_name, suffix, email, contact_number
            FROM users
            WHERE user_id = %s AND user_role = 'miller_manager'
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()

    if not row:
        return {
            "user_id": user_id,
            "first_name": "",
            "middle_initial": "",
            "last_name": "",
            "suffix": "",
            "full_name": "",
            "email": "",
            "masked_email": "",
        }

    uid, fn, mi, ln, sfx, email, contact = row
    name_parts = [fn, mi, ln, sfx]
    clean_parts = [p.strip() for p in name_parts if p and p.strip()]
    full_name = " ".join(clean_parts)

    return {
        "user_id": uid,
        "first_name": fn or "",
        "middle_initial": mi or "",
        "last_name": ln or "",
        "suffix": sfx or "",
        "full_name": full_name,
        "email": email or "",
        "masked_email": mask_email(email),
        "contact_number": contact or "",
    }


def list_manager_branches(user_id: int) -> list:
    """
    List all supplier_profiles owned by the authenticated Miller Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT supplier_profile_id, business_name, organization_name,
                   province, municipality, barangay, street_address
            FROM supplier_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC, supplier_profile_id ASC
            """,
            [user_id],
        )
        rows = cursor.fetchall()

    branches = []
    for r in rows:
        sp_id, biz_name, org_name, prov, mun, brgy, street = r
        loc_parts = [street, brgy, mun, prov]
        clean_loc = ", ".join([p for p in loc_parts if p and p.strip()])
        branches.append({
            "id": sp_id,
            "supplier_profile_id": sp_id,
            "branch_name": biz_name or org_name or f"Branch #{sp_id}",
            "business_name": biz_name or org_name or f"Branch #{sp_id}",
            "organization_name": org_name or "",
            "address": clean_loc or "—",
        })
    return branches


def list_branch_payment_accounts(user_id: int, filters: dict) -> list:
    """
    List all branch accounts belonging strictly to the authenticated Miller Manager's branches.
    Supports search, branch, status, type, verification_status, and sort_by.
    """
    query = """
        SELECT
            c.credentials_id,
            c.supplier_profile_id,
            sp.business_name,
            c.type,
            c.platform_name,
            c.bank_name,
            c.account_number,
            c.account_name,
            c.card_expiry,
            c.card_last4,
            c.verification_status,
            c.is_default,
            c.status,
            c.archive_reason,
            c.created_at,
            c.updated_at
        FROM miller_online_transaction_credentials c
        INNER JOIN supplier_profiles sp ON c.supplier_profile_id = sp.supplier_profile_id
        WHERE sp.user_id = %s
    """
    params = [user_id]

    # Filters
    search = filters.get("search", "").strip()
    if search:
        query += """
            AND (
                sp.business_name LIKE %s
                OR c.account_name LIKE %s
                OR c.bank_name LIKE %s
                OR c.account_number LIKE %s
                OR c.platform_name LIKE %s
            )
        """
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern, pattern, pattern])

    branch_id = filters.get("branch", "").strip()
    if branch_id and branch_id.lower() != "all":
        try:
            query += " AND c.supplier_profile_id = %s"
            params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    status_filter = filters.get("status", "").strip().lower()
    if status_filter and status_filter != "all":
        query += " AND c.status = %s"
        params.append(status_filter)

    type_filter = filters.get("type", "").strip().lower()
    if type_filter and type_filter != "all":
        query += " AND c.type = %s"
        params.append(type_filter)

    verif_filter = filters.get("verification_status", "").strip().lower()
    if verif_filter and verif_filter != "all":
        query += " AND c.verification_status = %s"
        params.append(verif_filter)

    # Sorting
    sort_by = filters.get("sort_by", "name_asc").strip().lower()
    if sort_by == "name_desc":
        query += " ORDER BY c.account_name DESC, c.credentials_id DESC"
    else:
        query += " ORDER BY c.account_name ASC, c.credentials_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        (
            cid, sp_id, b_name, acc_type, plat_name, b_name_val,
            raw_acc_num, acc_name, card_exp, card_l4, verif_stat,
            is_def, acc_stat, arch_reason, created_at, updated_at
        ) = r

        accounts.append({
            "credentials_id": cid,
            "id": cid,
            "supplier_profile_id": sp_id,
            "branch_id": sp_id,
            "branch": b_name or f"Branch #{sp_id}",
            "branch_name": b_name or f"Branch #{sp_id}",
            "type": acc_type,
            "account_type": acc_type,
            "type_display": "GCash" if acc_type == "gcash" else "Bank",
            "platform_name": plat_name or ("GCash" if acc_type == "gcash" else (b_name_val or "Bank")),
            "bank_name": b_name_val or ("—" if acc_type == "gcash" else "Bank"),
            "account_name": acc_name,
            "account_number_masked": mask_account_number(raw_acc_num, acc_type),
            "card_expiry": card_exp or "",
            "card_last4": card_l4 or "",
            "verification_status": verif_stat or "unverified",
            "is_default": bool(is_def),
            "status": acc_stat or "active",
            "archive_reason": arch_reason or "",
            "created_at": created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, "strftime") else str(created_at),
        })

    return accounts


def get_branch_payment_account_detail(user_id: int, credentials_id: int, include_unmasked: bool = False) -> dict:
    """
    Fetch a single branch payment account belonging to the manager.
    If include_unmasked is True, returns raw account_number.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                c.credentials_id,
                c.supplier_profile_id,
                sp.business_name,
                c.type,
                c.platform_name,
                c.bank_name,
                c.account_number,
                c.account_name,
                c.card_expiry,
                c.card_last4,
                c.verification_status,
                c.is_default,
                c.status,
                c.archive_reason,
                c.created_at,
                c.updated_at
            FROM miller_online_transaction_credentials c
            INNER JOIN supplier_profiles sp ON c.supplier_profile_id = sp.supplier_profile_id
            WHERE c.credentials_id = %s AND sp.user_id = %s
            LIMIT 1
            """,
            [credentials_id, user_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    (
        cid, sp_id, b_name, acc_type, plat_name, b_name_val,
        raw_acc_num, acc_name, card_exp, card_l4, verif_stat,
        is_def, acc_stat, arch_reason, created_at, updated_at
    ) = row

    res = {
        "credentials_id": cid,
        "id": cid,
        "supplier_profile_id": sp_id,
        "branch_id": sp_id,
        "branch": b_name or f"Branch #{sp_id}",
        "branch_name": b_name or f"Branch #{sp_id}",
        "type": acc_type,
        "account_type": acc_type,
        "type_display": "GCash" if acc_type == "gcash" else "Bank",
        "platform_name": plat_name or ("GCash" if acc_type == "gcash" else (b_name_val or "Bank")),
        "bank_name": b_name_val or ("—" if acc_type == "gcash" else "Bank"),
        "account_name": acc_name,
        "account_number_masked": mask_account_number(raw_acc_num, acc_type),
        "card_expiry": card_exp or "",
        "card_last4": card_l4 or "",
        "verification_status": verif_stat or "unverified",
        "is_default": bool(is_def),
        "status": acc_stat or "active",
        "archive_reason": arch_reason or "",
        "created_at": created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, "strftime") else str(created_at),
        "updated_at": updated_at.strftime("%Y-%m-%d %H:%M") if hasattr(updated_at, "strftime") else str(updated_at),
    }

    if include_unmasked:
        res["account_number"] = raw_acc_num

    return res


def list_employee_positions(user_id: int) -> list:
    """
    Get distinct employee positions across all branches owned by the Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT se.position
            FROM supplier_employees se
            INNER JOIN supplier_profiles sp ON se.supplier_profile_id = sp.supplier_profile_id
            WHERE sp.user_id = %s AND se.position IS NOT NULL AND TRIM(se.position) != ''
            ORDER BY se.position ASC
            """,
            [user_id],
        )
        rows = cursor.fetchall()
    return [r[0].strip() for r in rows if r[0] and r[0].strip()]


def list_employee_payment_accounts(user_id: int, filters: dict) -> list:
    """
    List employee accounts under all branches owned by the Miller Manager.
    Supports search, branch, status, type, employee_type (position), verification_status, and sort_by.
    """
    query = """
        SELECT
            ec.credentials_id,
            ec.supplier_profile_id,
            sp.business_name,
            ec.supplier_employee_id,
            se.first_name,
            se.last_name,
            se.position,
            ec.type,
            ec.platform_name,
            ec.bank_name,
            ec.account_number,
            ec.account_name,
            ec.card_expiry,
            ec.card_last4,
            ec.verification_status,
            ec.is_default,
            ec.status,
            ec.archive_reason,
            ec.created_at,
            ec.updated_at
        FROM miller_employee_online_transaction_credentials ec
        INNER JOIN supplier_employees se ON ec.supplier_employee_id = se.supplier_employee_id
        INNER JOIN supplier_profiles sp ON ec.supplier_profile_id = sp.supplier_profile_id
        WHERE sp.user_id = %s
    """
    params = [user_id]

    # Search
    search = filters.get("search", "").strip()
    if search:
        query += """
            AND (
                sp.business_name LIKE %s
                OR se.first_name LIKE %s
                OR se.last_name LIKE %s
                OR ec.account_name LIKE %s
                OR ec.bank_name LIKE %s
                OR ec.account_number LIKE %s
                OR ec.platform_name LIKE %s
            )
        """
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern, pattern, pattern, pattern, pattern])

    # Branch
    branch_id = filters.get("branch", "").strip()
    if branch_id and branch_id.lower() != "all":
        try:
            query += " AND ec.supplier_profile_id = %s"
            params.append(int(branch_id))
        except (ValueError, TypeError):
            pass

    # Status
    status_filter = filters.get("status", "").strip().lower()
    if status_filter and status_filter != "all":
        query += " AND ec.status = %s"
        params.append(status_filter)

    # Type
    type_filter = filters.get("type", "").strip().lower()
    if type_filter and type_filter != "all":
        query += " AND ec.type = %s"
        params.append(type_filter)

    # Employee Type (Position)
    emp_type = filters.get("employee_type", "").strip().lower()
    if emp_type and emp_type != "all":
        query += " AND LOWER(se.position) = %s"
        params.append(emp_type)

    # Verification Status
    verif_filter = filters.get("verification_status", "").strip().lower()
    if verif_filter and verif_filter != "all":
        query += " AND ec.verification_status = %s"
        params.append(verif_filter)

    # Sort
    sort_by = filters.get("sort_by", "name_asc").strip().lower()
    if sort_by in ("emp_asc", "employee_asc", "employee_name_asc"):
        query += " ORDER BY CONCAT_WS(' ', TRIM(se.first_name), TRIM(se.last_name)) ASC, ec.credentials_id DESC"
    elif sort_by in ("emp_desc", "employee_desc", "employee_name_desc"):
        query += " ORDER BY CONCAT_WS(' ', TRIM(se.first_name), TRIM(se.last_name)) DESC, ec.credentials_id DESC"
    elif sort_by == "name_desc":
        query += " ORDER BY ec.account_name DESC, ec.credentials_id DESC"
    elif sort_by == "newest":
        query += " ORDER BY ec.created_at DESC, ec.credentials_id DESC"
    elif sort_by == "oldest":
        query += " ORDER BY ec.created_at ASC, ec.credentials_id ASC"
    else:
        query += " ORDER BY ec.account_name ASC, ec.credentials_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        (
            cid, sp_id, b_name, emp_id, e_fn, e_ln, e_pos, acc_type,
            plat_name, b_name_val, raw_acc_num, acc_name, card_exp, card_l4,
            verif_stat, is_def, acc_stat, arch_reason, created_at, updated_at
        ) = r

        emp_full_name = f"{e_fn or ''} {e_ln or ''}".strip() or f"Employee #{emp_id}"
        pos_display = (e_pos or "Staff").capitalize()

        accounts.append({
            "credentials_id": cid,
            "id": cid,
            "supplier_profile_id": sp_id,
            "branch_id": sp_id,
            "branch": b_name or f"Branch #{sp_id}",
            "branch_name": b_name or f"Branch #{sp_id}",
            "supplier_employee_id": emp_id,
            "employee_name": emp_full_name,
            "employee_type": pos_display,
            "employee_position": pos_display,
            "type": acc_type,
            "account_type": acc_type,
            "type_display": "GCash" if acc_type == "gcash" else "Bank",
            "platform_name": plat_name or ("GCash" if acc_type == "gcash" else (b_name_val or "Bank")),
            "bank_name": b_name_val or ("—" if acc_type == "gcash" else "Bank"),
            "account_name": acc_name,
            "account_number_masked": mask_account_number(raw_acc_num, acc_type),
            "card_expiry": card_exp or "",
            "card_last4": card_l4 or "",
            "verification_status": verif_stat or "unverified",
            "is_default": bool(is_def),
            "status": acc_stat or "active",
            "archive_reason": arch_reason or "",
            "created_at": created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, "strftime") else str(created_at),
        })

    return accounts


def get_employee_payment_account_detail(user_id: int, credentials_id: int, include_unmasked: bool = False) -> dict:
    """
    Fetch a single employee payment account under the manager's branches.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                ec.credentials_id,
                ec.supplier_profile_id,
                sp.business_name,
                ec.supplier_employee_id,
                se.first_name,
                se.last_name,
                se.position,
                ec.type,
                ec.platform_name,
                ec.bank_name,
                ec.account_number,
                ec.account_name,
                ec.card_expiry,
                ec.card_last4,
                ec.verification_status,
                ec.is_default,
                ec.status,
                ec.archive_reason,
                ec.created_at,
                ec.updated_at
            FROM miller_employee_online_transaction_credentials ec
            INNER JOIN supplier_employees se ON ec.supplier_employee_id = se.supplier_employee_id
            INNER JOIN supplier_profiles sp ON ec.supplier_profile_id = sp.supplier_profile_id
            WHERE ec.credentials_id = %s AND sp.user_id = %s
            LIMIT 1
            """,
            [credentials_id, user_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    (
        cid, sp_id, b_name, emp_id, e_fn, e_ln, e_pos, acc_type,
        plat_name, b_name_val, raw_acc_num, acc_name, card_exp, card_l4,
        verif_stat, is_def, acc_stat, arch_reason, created_at, updated_at
    ) = row

    emp_full_name = f"{e_fn or ''} {e_ln or ''}".strip() or f"Employee #{emp_id}"

    pos_display = (e_pos or "Staff").capitalize()
    res = {
        "credentials_id": cid,
        "id": cid,
        "supplier_profile_id": sp_id,
        "branch_id": sp_id,
        "branch": b_name or f"Branch #{sp_id}",
        "branch_name": b_name or f"Branch #{sp_id}",
        "supplier_employee_id": emp_id,
        "employee_name": emp_full_name,
        "employee_type": pos_display,
        "employee_position": pos_display,
        "type": acc_type,
        "account_type": acc_type,
        "type_display": "GCash" if acc_type == "gcash" else "Bank",
        "platform_name": plat_name or ("GCash" if acc_type == "gcash" else (b_name_val or "Bank")),
        "bank_name": b_name_val or ("—" if acc_type == "gcash" else "Bank"),
        "account_name": acc_name,
        "account_number_masked": mask_account_number(raw_acc_num, acc_type),
        "card_expiry": card_exp or "",
        "card_last4": card_l4 or "",
        "verification_status": verif_stat or "unverified",
        "is_default": bool(is_def),
        "status": acc_stat or "active",
        "archive_reason": arch_reason or "",
        "created_at": created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, "strftime") else str(created_at),
        "updated_at": updated_at.strftime("%Y-%m-%d %H:%M") if hasattr(updated_at, "strftime") else str(updated_at),
    }

    if include_unmasked:
        res["account_number"] = raw_acc_num

    return res

