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
    if str(acc_type).lower() == "gcash":
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


def get_warehouse_security_status(user_id: int, is_employee: bool = True) -> dict:
    """
    Check if the Warehouse Employee or Manager has configured a Payment Security Password.
    Returns status, failed attempts, and lock state.
    """
    table = "warehouse_employee_payment_account_security" if is_employee else "warehouse_payment_account_security"
    id_col = "warehouse_employee_id" if is_employee else "user_id"
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT security_id, warehouse_profile_id, password_hash, failed_attempts, locked_until
            FROM {table}
            WHERE {id_col} = %s
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()

        if not row and not is_employee:
            cursor.execute(
                """
                SELECT security_id, warehouse_profile_id, password_hash, failed_attempts, locked_until
                FROM warehouse_employee_payment_account_security
                WHERE warehouse_employee_id = %s
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

    security_id, wh_profile_id, password_hash, failed_attempts, locked_until = row
    is_locked = False
    lock_minutes_remaining = 0

    if locked_until:
        now_dt = datetime.now()
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


def get_warehouse_user_info(user_id: int, is_employee: bool = True) -> dict:
    """Retrieve full name, email, and masked email for the authenticated user/employee."""
    with connection.cursor() as cursor:
        if is_employee:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.first_name,
                    we.middle_initial,
                    we.last_name,
                    we.suffix,
                    we.email,
                    we.position,
                    wp.business_name,
                    we.warehouse_profile_id
                FROM warehouse_employees we
                LEFT JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                LIMIT 1
                """,
                [user_id],
            )
            row = cursor.fetchone()
            if row:
                fn, mi, ln, sfx = row[1] or "", row[2] or "", row[3] or "", row[4] or ""
                full_name = f"{fn} {mi} {ln} {sfx}".replace("  ", " ").strip()
                email = row[5] or ""
                return {
                    "user_id": row[0],
                    "employee_id": row[0],
                    "first_name": fn,
                    "middle_initial": mi,
                    "last_name": ln,
                    "suffix": sfx,
                    "full_name": full_name,
                    "email": email,
                    "masked_email": mask_email(email),
                    "position": row[6] or "",
                    "business_name": row[7] or "",
                    "warehouse_profile_id": row[8],
                }
        else:
            cursor.execute(
                """
                SELECT
                    u.user_id,
                    u.first_name,
                    u.middle_initial,
                    u.last_name,
                    u.suffix,
                    u.email,
                    wp.business_name,
                    wp.warehouse_profile_id
                FROM users u
                LEFT JOIN warehouse_profiles wp ON wp.user_id = u.user_id
                WHERE u.user_id = %s
                LIMIT 1
                """,
                [user_id],
            )
            row = cursor.fetchone()
            if row:
                fn, mi, ln, sfx = row[1] or "", row[2] or "", row[3] or "", row[4] or ""
                full_name = f"{fn} {mi} {ln} {sfx}".replace("  ", " ").strip()
                email = row[5] or ""
                return {
                    "user_id": row[0],
                    "first_name": fn,
                    "middle_initial": mi,
                    "last_name": ln,
                    "suffix": sfx,
                    "full_name": full_name,
                    "email": email,
                    "masked_email": mask_email(email),
                    "position": "Warehouse Manager",
                    "business_name": row[6] or "",
                    "warehouse_profile_id": row[7],
                }

    return {"user_id": user_id, "full_name": "", "email": "", "masked_email": ""}


def list_warehouse_employee_payment_accounts(
    warehouse_profile_ids,
    position_filter=None,
    status_filter=None,
    type_filter=None,
    verification_filter=None,
    search=None,
    sort_by=None,
):
    """
    List employee payment accounts scoped strictly to the authenticated Warehouse branch.
    For Warehouse Manager/Finance shared tab view.
    """
    if not warehouse_profile_ids:
        return []

    if isinstance(warehouse_profile_ids, (int, str)):
        warehouse_profile_ids = [warehouse_profile_ids]
    else:
        warehouse_profile_ids = list(warehouse_profile_ids)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    params = list(warehouse_profile_ids)
    where_clauses = [f"c.warehouse_profile_id IN ({p_wh})"]

    if status_filter and status_filter.lower() != "all":
        where_clauses.append("c.status = %s")
        params.append(status_filter.lower())

    if type_filter and type_filter.lower() != "all":
        where_clauses.append("c.type = %s")
        params.append(type_filter.lower())

    if verification_filter and verification_filter.lower() != "all":
        where_clauses.append("c.verification_status = %s")
        params.append(verification_filter.lower())

    if position_filter and position_filter.lower() != "all":
        where_clauses.append("LOWER(we.position) = LOWER(%s)")
        params.append(position_filter.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        where_clauses.append(
            """(
                c.account_name LIKE %s
                OR c.account_number LIKE %s
                OR c.bank_name LIKE %s
                OR c.platform_name LIKE %s
                OR CONCAT_WS(' ', we.first_name, we.last_name) LIKE %s
            )"""
        )
        params.extend([term, term, term, term, term])

    where_sql = " AND ".join(where_clauses)

    order_sql = "ORDER BY c.is_default DESC, c.credentials_id DESC"
    sort_clean = (sort_by or "").lower().strip()
    if sort_clean == "name_asc":
        order_sql = "ORDER BY c.account_name ASC, c.credentials_id DESC"
    elif sort_clean == "name_desc":
        order_sql = "ORDER BY c.account_name DESC, c.credentials_id DESC"
    elif sort_clean == "oldest":
        order_sql = "ORDER BY c.credentials_id ASC"
    elif sort_clean == "newest":
        order_sql = "ORDER BY c.credentials_id DESC"

    sql = f"""
        SELECT
            c.credentials_id,
            c.warehouse_profile_id,
            c.warehouse_employee_id,
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
            c.updated_at,
            we.first_name,
            we.middle_initial,
            we.last_name,
            we.suffix,
            we.email,
            we.contact_number,
            we.position,
            wp.business_name
        FROM warehouse_employee_online_transaction_credentials c
        INNER JOIN warehouse_employees we
            ON we.warehouse_employee_id = c.warehouse_employee_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = c.warehouse_profile_id
        WHERE {where_sql}
        {order_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        cid, wh_id, emp_id, acc_type, plat, bank, raw_num, acc_name, exp, last4, verif, is_def, acc_stat, arch_rsn, cr_at, up_at = r[:16]
        fn, mi, ln, sfx, emp_email, emp_contact, emp_pos, b_name = r[16:]

        emp_full = f"{fn or ''} {mi or ''} {ln or ''} {sfx or ''}".replace("  ", " ").strip()

        accounts.append({
            "credentials_id": cid,
            "id": cid,
            "warehouse_profile_id": wh_id,
            "warehouse_employee_id": emp_id,
            "employee_id": emp_id,
            "employee_name": emp_full,
            "employee_email": emp_email or "—",
            "employee_contact_number": emp_contact or "—",
            "employee_position": emp_pos or "Employee",
            "branch_name": b_name or f"Branch #{wh_id}",
            "type": acc_type,
            "platform_name": plat or ("GCash" if acc_type == "gcash" else (bank or "Bank")),
            "bank_name": bank or ("—" if acc_type == "gcash" else "Bank"),
            "account_name": acc_name,
            "account_number_masked": mask_account_number(raw_num, acc_type),
            "verification_status": verif or "unverified",
            "is_default": bool(is_def),
            "status": acc_stat or "active",
            "archive_reason": arch_rsn or "",
            "created_at": cr_at.strftime("%Y-%m-%d %H:%M") if hasattr(cr_at, "strftime") else str(cr_at),
        })

    return accounts


def get_warehouse_employee_payment_account_detail(credentials_id: int, warehouse_profile_ids):
    """Retrieve details for a single employee payment account."""
    if not warehouse_profile_ids or not credentials_id:
        return None

    if isinstance(warehouse_profile_ids, (int, str)):
        warehouse_profile_ids = [warehouse_profile_ids]
    else:
        warehouse_profile_ids = list(warehouse_profile_ids)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT
            c.credentials_id,
            c.warehouse_profile_id,
            c.warehouse_employee_id,
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
            c.updated_at,
            we.first_name,
            we.middle_initial,
            we.last_name,
            we.suffix,
            we.email,
            we.contact_number,
            we.position,
            wp.business_name
        FROM warehouse_employee_online_transaction_credentials c
        INNER JOIN warehouse_employees we
            ON we.warehouse_employee_id = c.warehouse_employee_id
        LEFT JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id = c.warehouse_profile_id
        WHERE c.credentials_id = %s
          AND c.warehouse_profile_id IN ({p_wh})
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(sql, [credentials_id] + list(warehouse_profile_ids))
        r = cursor.fetchone()

    if not r:
        return None

    cid, wh_id, emp_id, acc_type, plat, bank, raw_num, acc_name, exp, last4, verif, is_def, acc_stat, arch_rsn, cr_at, up_at = r[:16]
    fn, mi, ln, sfx, emp_email, emp_contact, emp_pos, b_name = r[16:]
    emp_full = f"{fn or ''} {mi or ''} {ln or ''} {sfx or ''}".replace("  ", " ").strip()

    return {
        "credentials_id": cid,
        "id": cid,
        "warehouse_profile_id": wh_id,
        "warehouse_employee_id": emp_id,
        "employee_id": emp_id,
        "employee_name": emp_full,
        "employee_email": emp_email or "—",
        "employee_contact_number": emp_contact or "—",
        "employee_position": emp_pos or "Employee",
        "branch_name": b_name or f"Branch #{wh_id}",
        "type": acc_type,
        "platform_name": plat or ("GCash" if acc_type == "gcash" else (bank or "Bank")),
        "bank_name": bank or ("—" if acc_type == "gcash" else "Bank"),
        "account_name": acc_name,
        "account_number_masked": mask_account_number(raw_num, acc_type),
        "verification_status": verif or "unverified",
        "is_default": bool(is_def),
        "status": acc_stat or "active",
        "archive_reason": arch_rsn or "",
        "created_at": cr_at.strftime("%Y-%m-%d %H:%M") if hasattr(cr_at, "strftime") else str(cr_at),
    }


def list_warehouse_employee_positions(warehouse_profile_ids):
    """Retrieve distinct positions of employees in the branch who have payment accounts."""
    if not warehouse_profile_ids:
        return []

    if isinstance(warehouse_profile_ids, (int, str)):
        warehouse_profile_ids = [warehouse_profile_ids]
    else:
        warehouse_profile_ids = list(warehouse_profile_ids)

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    sql = f"""
        SELECT DISTINCT we.position
        FROM warehouse_employees we
        INNER JOIN warehouse_employee_online_transaction_credentials c
            ON c.warehouse_employee_id = we.warehouse_employee_id
        WHERE c.warehouse_profile_id IN ({p_wh})
          AND we.position IS NOT NULL
        ORDER BY we.position ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, list(warehouse_profile_ids))
        rows = cursor.fetchall()

    return [r[0] for r in rows if r[0]]
