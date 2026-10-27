import os
import re
import secrets
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from django.conf import settings
from django.db import connection, transaction


class ExpenseNotFoundError(Exception):
    """Raised when the specified expense record cannot be found or is inaccessible."""
    pass


class AlreadyPaidError(Exception):
    """Raised when payment has already been recorded for this expense."""
    pass


class InvalidExpenseStateError(Exception):
    """Raised when expense record is not in a valid state for payment."""
    pass


class DuplicateReferenceError(Exception):
    """Raised when payment reference number collides with an existing payment record."""
    pass


def generate_warehouse_cash_expense_reference(business_name, payer_name, cursor):
    """
    Generate Cash payment reference format:
    BUSINESS_FIRST2-MMDDYYYY-HHMM-PAYER_INITIALS
    Example: WH-10272026-1520-PF

    - BUSINESS_FIRST2: First 2 alphanumeric characters of business name (uppercase).
    - MMDDYYYY-HHMM: Current Philippine local timestamp (Asia/Manila).
    - PAYER_INITIALS: Initials of the paying finance staff/manager.
    - Handles collisions safely by advancing minute offset.
    """
    clean_biz = re.sub(r'[^A-Za-z0-9]', '', str(business_name or "").strip()).upper()
    if len(clean_biz) >= 2:
        prefix = clean_biz[:2]
    elif len(clean_biz) == 1:
        prefix = f"{clean_biz}X"
    else:
        prefix = "WH"

    # Payer initials
    words = [w for w in re.split(r'[^A-Za-z]+', str(payer_name or "").strip()) if w]
    if words:
        initials = "".join([w[0].upper() for w in words])[:4]
    else:
        initials = "WF"
    if not initials:
        initials = "WF"

    now_ph = datetime.now(ZoneInfo("Asia/Manila"))
    base_ref = f"{prefix}-{now_ph.strftime('%m%d%Y-%H%M')}-{initials}"

    cursor.execute(
        """
        SELECT COUNT(*)
        FROM warehouse_expenses
        WHERE payment_reference_no = %s
        """,
        [base_ref],
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return base_ref

    # Collision detected: advance minute offset safely
    for minute_offset in range(1, 120):
        candidate_time = now_ph + timedelta(minutes=minute_offset)
        candidate_ref = f"{prefix}-{candidate_time.strftime('%m%d%Y-%H%M')}-{initials}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM warehouse_expenses
            WHERE payment_reference_no = %s
            """,
            [candidate_ref],
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return candidate_ref

    return f"{base_ref}-{secrets.token_hex(2).upper()}"


def _save_receipt_file(receipt_file, warehouse_profile_id):
    """
    Save uploaded receipt file to MEDIA_ROOT under warehouse_expense_receipts/{warehouse_profile_id}/.
    Returns relative media URL e.g. /media/warehouse_expense_receipts/{warehouse_profile_id}/{filename}.
    """
    if not receipt_file:
        return None

    ext = os.path.splitext(receipt_file.name.lower())[1]
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        ext = ".jpg"

    unique_token = secrets.token_hex(8)
    today_str = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y%m%d")
    filename = f"warehouse_expense_receipt_{today_str}_{unique_token}{ext}"

    rel_dir = os.path.join("warehouse_expense_receipts", str(warehouse_profile_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        for chunk in receipt_file.chunks():
            f.write(chunk)

    return f"/media/warehouse_expense_receipts/{warehouse_profile_id}/{filename}"


def record_warehouse_expense_payment(
    warehouse_profile_ids,
    paid_by_employee_id,
    expense_id,
    payment_method,
    payment_reference=None,
    receipt_file=None,
    payer_name=None,
    business_name=None,
):
    """
    Record payment for an expense in 'pending' status.
    - Atomically updates warehouse_expenses status to 'paid'.
    - Generates Cash reference or validates Bank/GCash reference.
    - Prevents double payments and enforces branch isolation.
    """
    if not warehouse_profile_ids:
        raise ExpenseNotFoundError("No accessible warehouse branch found.")

    method_clean = str(payment_method or "").strip().lower()
    if method_clean == "cash":
        norm_method = "Cash"
    elif method_clean == "bank":
        norm_method = "Bank"
    elif method_clean == "gcash":
        norm_method = "GCash"
    else:
        raise ValueError("Invalid payment method. Must be Cash, Bank, or GCash.")

    ref_clean = str(payment_reference or "").strip()
    if norm_method in ("Bank", "GCash") and not ref_clean:
        raise ValueError(f"Payment Reference Number is required for {norm_method} payments.")

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock the expense record for update
            cursor.execute(
                f"""
                SELECT
                    we.expenses_id,
                    we.warehouse_profile_id,
                    we.status,
                    we.setting_reference_no,
                    we.expense_type,
                    we.description,
                    we.price,
                    we.deadline,
                    COALESCE(wp.business_name, wp.organization_name, 'Warehouse Branch') AS branch_name,
                    CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS set_by_name
                FROM warehouse_expenses we
                INNER JOIN warehouse_profiles wp
                    ON wp.warehouse_profile_id = we.warehouse_profile_id
                LEFT JOIN users u
                    ON u.user_id = we.set_by_user_id
                WHERE we.expenses_id = %s
                FOR UPDATE
                """,
                [expense_id],
            )
            expense_row = cursor.fetchone()

            if not expense_row:
                raise ExpenseNotFoundError("Expense record not found.")

            (
                exp_id,
                exp_wh_id,
                current_status,
                setting_ref,
                exp_type,
                desc,
                price_val,
                deadline_val,
                branch_name,
                set_by_name,
            ) = expense_row

            # 2. Check branch ownership
            if exp_wh_id not in warehouse_profile_ids:
                raise ExpenseNotFoundError("Access denied. Expense does not belong to your assigned warehouse branch.")

            # 3. Check status is pending
            if str(current_status or "").lower() == "paid":
                raise AlreadyPaidError(f"Expense {setting_ref} has already been marked as Paid.")
            elif str(current_status or "").lower() != "pending":
                raise InvalidExpenseStateError(f"Expense is not in pending status (current status: {current_status}).")

            effective_wh_id = exp_wh_id
            effective_biz = business_name or branch_name

            # 4. Resolve payer employee full name and ID
            resolved_emp_id = paid_by_employee_id
            final_payer_name = payer_name

            if not final_payer_name:
                if resolved_emp_id:
                    cursor.execute(
                        """
                        SELECT CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))
                        FROM warehouse_employees
                        WHERE warehouse_employee_id = %s
                        LIMIT 1
                        """,
                        [resolved_emp_id],
                    )
                    emp_row = cursor.fetchone()
                    final_payer_name = emp_row[0].strip() if emp_row and emp_row[0] else "Warehouse Finance"
                else:
                    final_payer_name = "Warehouse Manager"

            # If resolved_emp_id is None, see if there is an active finance employee for this warehouse
            if not resolved_emp_id:
                cursor.execute(
                    """
                    SELECT warehouse_employee_id
                    FROM warehouse_employees
                    WHERE warehouse_profile_id = %s AND LOWER(position) = 'finance' AND status = 'active'
                    LIMIT 1
                    """,
                    [effective_wh_id],
                )
                f_emp = cursor.fetchone()
                if f_emp:
                    resolved_emp_id = f_emp[0]

            # 5. Determine payment reference
            if norm_method == "Cash":
                final_ref = generate_warehouse_cash_expense_reference(effective_biz, final_payer_name, cursor)
            else:
                final_ref = ref_clean

            # 6. Check duplicate reference if provided manually
            if norm_method != "Cash":
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_expenses
                    WHERE payment_reference_no = %s AND expenses_id != %s
                    """,
                    [final_ref, exp_id],
                )
                (dup_count,) = cursor.fetchone()
                if dup_count > 0:
                    raise DuplicateReferenceError(
                        f"Payment Reference Number '{final_ref}' has already been used for another expense."
                    )

            # 7. Save receipt photo if uploaded
            receipt_photo_url = None
            if receipt_file:
                receipt_photo_url = _save_receipt_file(receipt_file, effective_wh_id)

            # 8. Record payment timestamp in Philippine local time
            now_ph = datetime.now(ZoneInfo("Asia/Manila"))

            cursor.execute(
                """
                UPDATE warehouse_expenses
                SET
                    status = 'paid',
                    paid_by_employee_id = %s,
                    payment_method = %s,
                    payment_reference_no = %s,
                    receipt_photo = %s,
                    payment_date = %s,
                    updated_at = NOW()
                WHERE expenses_id = %s
                """,
                [
                    resolved_emp_id,
                    norm_method,
                    final_ref,
                    receipt_photo_url,
                    now_ph,
                    exp_id,
                ],
            )

    price_num = float(price_val or 0)
    return {
        "id": exp_id,
        "expenses_id": exp_id,
        "setting_reference_no": setting_ref,
        "branch_name": branch_name,
        "business_name": branch_name,
        "set_by": set_by_name or "Warehouse Manager",
        "expense_type": exp_type,
        "description": desc,
        "price": f"PHP {price_num:,.2f}",
        "price_raw": price_num,
        "paid_amount": f"PHP {price_num:,.2f}",
        "deadline": deadline_val.strftime("%Y-%m-%d") if deadline_val else None,
        "deadline_formatted": deadline_val.strftime("%b %d, %Y") if deadline_val else None,
        "status": "paid",
        "status_label": "Paid",
        "paid_by": final_payer_name or "Warehouse Finance",
        "payment_method": norm_method,
        "payment_reference_no": final_ref,
        "payment_date": now_ph.strftime("%b %d, %Y %I:%M %p"),
        "receipt_photo": receipt_photo_url,
    }
