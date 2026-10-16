from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.db import connection


def _get_deadline_info(deadline_date):
    """
    Calculate derived Overdue / Near Deadline indicators without altering DB status.
    Uses Philippine local date (Asia/Manila).
    - Overdue: deadline < today
    - Near Deadline: today <= deadline <= today + 5 days
    - None: deadline > today + 5 days
    """
    if not deadline_date:
        return None, None

    try:
        now_ph = datetime.now(ZoneInfo("Asia/Manila")).date()
        diff_days = (deadline_date - now_ph).days

        if diff_days < 0:
            return "overdue", diff_days
        elif 0 <= diff_days <= 5:
            return "near_deadline", diff_days
        else:
            return None, diff_days
    except Exception:
        return None, None


def list_manager_owned_branches(miller_user_id):
    """
    Retrieve all supplier_profiles owned by the authenticated Miller Manager.
    Strictly scoped by supplier_profiles.user_id = miller_user_id.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                sp.supplier_profile_id,
                sp.business_name,
                sp.municipality,
                sp.province
            FROM supplier_profiles sp
            WHERE sp.user_id = %s
            ORDER BY sp.business_name ASC, sp.supplier_profile_id ASC
            """,
            [miller_user_id],
        )
        rows = cursor.fetchall()

    branches = []
    for r in rows:
        branches.append(
            {
                "supplier_profile_id": r[0],
                "business_name": r[1] or "Unnamed Branch",
                "municipality": r[2] or "",
                "province": r[3] or "",
                "display_name": f"{r[1] or 'Branch'} ({r[2] or ''}, {r[3] or ''})".strip(),
            }
        )
    return branches


def list_manager_expenses(miller_user_id, filters=None):
    """
    List all expenses across branches owned by the authenticated Miller Manager.
    Supports search, branch filter, type filter, status filter, and sorting.
    """
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    branch_id = filters.get("branch")
    expense_type = str(filters.get("type") or "").strip()
    status_filter = str(filters.get("status") or "").strip().lower()
    sort_by = str(filters.get("sort_by") or "nearest_deadline").strip().lower()

    query = """
        SELECT
            me.expenses_id,
            me.supplier_profile_id,
            sp.business_name AS branch_name,
            me.setting_reference_no,
            me.expense_type,
            me.description,
            me.price,
            me.deadline,
            me.status,
            me.payment_method,
            me.payment_reference_no,
            me.receipt_photo,
            me.payment_date,
            me.created_at,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS set_by_name,
            CONCAT(COALESCE(se.first_name, ''), ' ', COALESCE(se.last_name, '')) AS paid_by_name
        FROM miller_expenses me
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = me.supplier_profile_id
        LEFT JOIN users u
            ON u.user_id = me.set_by_user_id
        LEFT JOIN supplier_employees se
            ON se.supplier_employee_id = me.paid_by_employee_id
        WHERE sp.user_id = %s
    """
    params = [miller_user_id]

    if branch_id and str(branch_id).lower() not in ("all", ""):
        try:
            b_id = int(branch_id)
            query += " AND me.supplier_profile_id = %s"
            params.append(b_id)
        except (ValueError, TypeError):
            pass

    if expense_type and expense_type.lower() not in ("all", ""):
        query += " AND me.expense_type = %s"
        params.append(expense_type)

    now_ph = datetime.now(ZoneInfo("Asia/Manila")).date()
    if status_filter == "pending":
        query += " AND me.status = 'pending'"
    elif status_filter == "paid":
        query += " AND me.status = 'paid'"
    elif status_filter == "overdue":
        query += " AND me.status = 'pending' AND me.deadline < %s"
        params.append(now_ph)
    elif status_filter == "near_deadline":
        five_days_later = now_ph + timedelta(days=5)
        query += " AND me.status = 'pending' AND me.deadline >= %s AND me.deadline <= %s"
        params.extend([now_ph, five_days_later])

    if search:
        search_pattern = f"%{search}%"
        query += """
            AND (
                me.setting_reference_no LIKE %s
                OR sp.business_name LIKE %s
                OR me.expense_type LIKE %s
                OR me.description LIKE %s
                OR me.payment_reference_no LIKE %s
            )
        """
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

    # Sorting
    if sort_by == "farthest_deadline":
        query += " ORDER BY me.deadline DESC, me.expenses_id DESC"
    elif sort_by == "highest_amount":
        query += " ORDER BY me.price DESC, me.expenses_id DESC"
    elif sort_by == "lowest_amount":
        query += " ORDER BY me.price ASC, me.expenses_id ASC"
    else:  # nearest_deadline default
        query += " ORDER BY me.deadline ASC, me.expenses_id ASC"

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    expenses = []
    for r in rows:
        expenses_id = r[0]
        sp_id = r[1]
        branch_name = r[2] or "Unnamed Branch"
        setting_ref = r[3]
        exp_type = r[4]
        desc = r[5]
        price_num = float(r[6] or 0)
        deadline_date = r[7]
        st = str(r[8] or "pending").lower()
        pay_method = r[9]
        pay_ref = r[10]
        receipt_photo = r[11]
        pay_date = r[12]
        created_at = r[13]
        set_by = (r[14] or "").strip() or "Miller Manager"
        paid_by = (r[15] or "").strip() if st == "paid" else None

        deadline_badge, diff_days = _get_deadline_info(deadline_date)

        # Receipt photo full media URL
        receipt_photo_url = None
        if receipt_photo:
            if receipt_photo.startswith("http://") or receipt_photo.startswith("https://") or receipt_photo.startswith("/"):
                receipt_photo_url = receipt_photo
            else:
                receipt_photo_url = f"/media/{receipt_photo.lstrip('/')}"

        expenses.append(
            {
                "id": expenses_id,
                "expenses_id": expenses_id,
                "supplier_profile_id": sp_id,
                "branch_name": branch_name,
                "setting_reference_no": setting_ref,
                "expense_type": exp_type,
                "description": desc,
                "price": f"PHP {price_num:,.2f}",
                "price_raw": price_num,
                "deadline": deadline_date.strftime("%Y-%m-%d") if deadline_date else None,
                "deadline_formatted": deadline_date.strftime("%b %d, %Y") if deadline_date else None,
                "deadline_badge": deadline_badge if st == "pending" else None,
                "diff_days": diff_days,
                "status": st,
                "status_label": "Paid" if st == "paid" else "Pending",
                "payment_method": pay_method,
                "payment_reference_no": pay_ref,
                "receipt_photo": receipt_photo_url,
                "payment_date": pay_date.strftime("%b %d, %Y %I:%M %p") if pay_date else None,
                "created_at": created_at.strftime("%b %d, %Y %I:%M %p") if created_at else None,
                "set_by": set_by,
                "paid_by": paid_by,
            }
        )

    return expenses


def get_manager_expense_detail(miller_user_id, expense_id):
    """
    Get detailed information for a single expense, strictly ensuring the branch
    is owned by the authenticated Miller Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                me.expenses_id,
                me.supplier_profile_id,
                sp.business_name AS branch_name,
                me.setting_reference_no,
                me.expense_type,
                me.description,
                me.price,
                me.deadline,
                me.status,
                me.payment_method,
                me.payment_reference_no,
                me.receipt_photo,
                me.payment_date,
                me.created_at,
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS set_by_name,
                CONCAT(COALESCE(se.first_name, ''), ' ', COALESCE(se.last_name, '')) AS paid_by_name
            FROM miller_expenses me
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = me.supplier_profile_id
            LEFT JOIN users u
                ON u.user_id = me.set_by_user_id
            LEFT JOIN supplier_employees se
                ON se.supplier_employee_id = me.paid_by_employee_id
            WHERE me.expenses_id = %s AND sp.user_id = %s
            LIMIT 1
            """,
            [expense_id, miller_user_id],
        )
        r = cursor.fetchone()

    if not r:
        return None

    expenses_id = r[0]
    sp_id = r[1]
    branch_name = r[2] or "Unnamed Branch"
    setting_ref = r[3]
    exp_type = r[4]
    desc = r[5]
    price_num = float(r[6] or 0)
    deadline_date = r[7]
    st = str(r[8] or "pending").lower()
    pay_method = r[9]
    pay_ref = r[10]
    receipt_photo = r[11]
    pay_date = r[12]
    created_at = r[13]
    set_by = (r[14] or "").strip() or "Miller Manager"
    paid_by = (r[15] or "").strip() if st == "paid" else None

    deadline_badge, diff_days = _get_deadline_info(deadline_date)

    receipt_photo_url = None
    if receipt_photo:
        if receipt_photo.startswith("http://") or receipt_photo.startswith("https://") or receipt_photo.startswith("/"):
            receipt_photo_url = receipt_photo
        else:
            receipt_photo_url = f"/media/{receipt_photo.lstrip('/')}"

    return {
        "id": expenses_id,
        "expenses_id": expenses_id,
        "supplier_profile_id": sp_id,
        "branch_name": branch_name,
        "setting_reference_no": setting_ref,
        "expense_type": exp_type,
        "description": desc,
        "price": f"PHP {price_num:,.2f}",
        "price_raw": price_num,
        "deadline": deadline_date.strftime("%Y-%m-%d") if deadline_date else None,
        "deadline_formatted": deadline_date.strftime("%b %d, %Y") if deadline_date else None,
        "deadline_badge": deadline_badge if st == "pending" else None,
        "diff_days": diff_days,
        "status": st,
        "status_label": "Paid" if st == "paid" else "Pending",
        "payment_method": pay_method,
        "payment_reference_no": pay_ref,
        "receipt_photo": receipt_photo_url,
        "payment_date": pay_date.strftime("%b %d, %Y %I:%M %p") if pay_date else None,
        "created_at": created_at.strftime("%b %d, %Y %I:%M %p") if created_at else None,
        "set_by": set_by,
        "paid_by": paid_by,
    }


PRESET_EXPENSE_TYPES = [
    "Utilities",
    "Transportation",
    "Machinery Maintenance & Repair",
    "Operating Supplies",
    "Rent & Facilities",
    "Salaries & Wages",
    "Taxes & Government Fees",
    "Equipments",
    "Administrative",
    "Others",
]


def get_manager_expense_types(miller_user_id):
    """
    Return all 10 predefined expense categories, plus any unique custom types
    saved in the database for the authenticated manager's branches.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT me.expense_type
            FROM miller_expenses me
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = me.supplier_profile_id
            WHERE sp.user_id = %s
              AND me.expense_type IS NOT NULL
              AND TRIM(me.expense_type) != ''
            ORDER BY me.expense_type ASC
            """,
            [miller_user_id],
        )
        saved_types = [r[0].strip() for r in cursor.fetchall() if r[0] and r[0].strip()]

    result = list(PRESET_EXPENSE_TYPES)
    for st in saved_types:
        if st not in result:
            result.append(st)

    return result

