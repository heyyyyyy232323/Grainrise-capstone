import re
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from zoneinfo import ZoneInfo
from django.db import connection, transaction


class ExpenseValidationError(Exception):
    """Raised when expense input validation fails."""
    pass


class BranchAccessDeniedError(Exception):
    """Raised when the specified branch is not owned by the authenticated Miller Manager."""
    pass


def generate_setting_reference_no(business_name, cursor):
    """
    Generate Setting Reference No. format:
    BUSINESS_FIRST2-MMDDYYYY-HHMM
    Example: GR-10152026-1205

    - BUSINESS_FIRST2: First 2 alphanumeric characters of business name (uppercase).
      Pads with 'X' if fewer than 2 characters.
    - MMDDYYYY-HHMM: Current Philippine local timestamp (Asia/Manila).
    - Detects and handles duplicate reference collisions safely by advancing minute offset.
    """
    clean_biz = re.sub(r'[^A-Za-z0-9]', '', str(business_name or "").strip()).upper()
    if len(clean_biz) >= 2:
        prefix = clean_biz[:2]
    elif len(clean_biz) == 1:
        prefix = f"{clean_biz}X"
    else:
        prefix = "GR"

    now_ph = datetime.now(ZoneInfo("Asia/Manila"))
    base_ref = f"{prefix}-{now_ph.strftime('%m%d%Y-%H%M')}"

    # Check for collision
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM miller_expenses
        WHERE setting_reference_no = %s
        """,
        [base_ref],
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return base_ref

    # Collision detected: advance minute offset safely
    for minute_offset in range(1, 120):
        candidate_time = now_ph + timedelta(minutes=minute_offset)
        candidate_ref = f"{prefix}-{candidate_time.strftime('%m%d%Y-%H%M')}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_expenses
            WHERE setting_reference_no = %s
            """,
            [candidate_ref],
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return candidate_ref

    return base_ref


def create_manager_expense(
    miller_user_id,
    supplier_profile_id,
    expense_type,
    description,
    price,
    deadline,
):
    """
    Create a new expense record in miller_expenses.
    Enforces strict backend ownership checks and input validation:
    - supplier_profile_id MUST be owned by miller_user_id.
    - expense_type must be non-empty string.
    - description must be 1-10,000 characters.
    - price must be numeric > 0 with at most 2 decimal places.
    - deadline must be at least 5 calendar days from today (Asia/Manila).
    - setting_reference_no generated securely.
    """
    # 1. Validate branch ownership
    try:
        branch_id = int(supplier_profile_id)
    except (TypeError, ValueError):
        raise ExpenseValidationError("Invalid branch selected.")

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT supplier_profile_id, business_name
            FROM supplier_profiles
            WHERE supplier_profile_id = %s AND user_id = %s
            LIMIT 1
            """,
            [branch_id, miller_user_id],
        )
        branch_row = cursor.fetchone()

    if not branch_row:
        raise BranchAccessDeniedError("Branch not found or access denied. You can only set expenses for your own branches.")

    business_name = branch_row[1] or "Branch"

    # 2. Validate expense_type
    type_clean = str(expense_type or "").strip()
    if not type_clean:
        raise ExpenseValidationError("Expense type is required.")
    if len(type_clean) > 150:
        raise ExpenseValidationError("Expense type cannot exceed 150 characters.")

    # 3. Validate description
    desc_clean = str(description or "").strip()
    if not desc_clean:
        raise ExpenseValidationError("Description is required.")
    if len(desc_clean) > 10000:
        raise ExpenseValidationError("Description cannot exceed 10,000 characters.")

    # 4. Validate price
    try:
        price_dec = Decimal(str(price).strip().replace(",", ""))
    except (InvalidOperation, TypeError, ValueError):
        raise ExpenseValidationError("Price must be a valid numeric value.")

    if price_dec <= Decimal("0"):
        raise ExpenseValidationError("Price must be greater than zero.")

    # Check decimal places
    if price_dec.as_tuple().exponent < -2:
        raise ExpenseValidationError("Price cannot have more than 2 decimal places.")

    # 5. Validate deadline
    if not deadline:
        raise ExpenseValidationError("Deadline is required.")

    if isinstance(deadline, str):
        try:
            deadline_date = datetime.strptime(deadline.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise ExpenseValidationError("Invalid deadline date format. Expected YYYY-MM-DD.")
    elif isinstance(deadline, datetime):
        deadline_date = deadline.date()
    else:
        deadline_date = deadline

    now_ph = datetime.now(ZoneInfo("Asia/Manila")).date()
    min_deadline = now_ph + timedelta(days=5)
    if deadline_date < min_deadline:
        raise ExpenseValidationError(
            f"Deadline must be at least 5 calendar days from today ({min_deadline.strftime('%b %d, %Y')} or later in Philippine Time)."
        )

    # 6. Insert atomically
    with transaction.atomic():
        with connection.cursor() as cursor:
            ref_no = generate_setting_reference_no(business_name, cursor)

            cursor.execute(
                """
                INSERT INTO miller_expenses (
                    supplier_profile_id,
                    set_by_user_id,
                    expense_type,
                    description,
                    price,
                    deadline,
                    status,
                    setting_reference_no,
                    created_at,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'pending', %s, NOW(), NOW()
                )
                """,
                [
                    branch_id,
                    miller_user_id,
                    type_clean,
                    desc_clean,
                    price_dec,
                    deadline_date,
                    ref_no,
                ],
            )
            expense_id = cursor.lastrowid

            # 7. Send ONE notification per active Finance employee for this branch
            _notify_finance_employees_on_expense_created(
                cursor=cursor,
                branch_id=branch_id,
                business_name=business_name,
                ref_no=ref_no,
                expense_type=type_clean,
                price_dec=price_dec,
                deadline_date=deadline_date,
            )

    return {
        "expenses_id": expense_id,
        "setting_reference_no": ref_no,
        "branch_name": business_name,
        "expense_type": type_clean,
        "price": f"PHP {float(price_dec):,.2f}",
        "deadline": deadline_date.strftime("%Y-%m-%d"),
        "status": "pending",
    }


def _notify_finance_employees_on_expense_created(
    cursor, branch_id, business_name, ref_no, expense_type, price_dec, deadline_date
):
    """
    Send ONE notification per active Finance employee belonging to the selected supplier_profile_id.
    Includes branch, expense type, amount, deadline, and setting reference.
    Prevents duplicates and enforces branch isolation.
    """
    try:
        # Fetch active finance employees belonging to this branch
        cursor.execute(
            """
            SELECT supplier_employee_id
            FROM supplier_employees
            WHERE supplier_profile_id = %s
              AND LOWER(TRIM(position)) = 'finance'
              AND LOWER(TRIM(status)) = 'active'
            """,
            [branch_id],
        )
        finance_employees = cursor.fetchall()
        if not finance_employees:
            return

        # Check for duplicate notification by reference
        ref_pattern = f"%{ref_no}%"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_employee_notifications
            WHERE supplier_profile_id = %s
              AND employee_type = 'finance'
              AND notification_content LIKE %s
            """,
            [branch_id, ref_pattern],
        )
        (existing_count,) = cursor.fetchone()
        if existing_count > 0:
            return

        deadline_str = (
            deadline_date.strftime("%b %d, %Y")
            if hasattr(deadline_date, "strftime")
            else str(deadline_date)
        )
        title = "New Expense Created"
        content = (
            f"New {expense_type} expense (#{ref_no}) of PHP {price_dec:,.2f} set for {business_name}. "
            f"Deadline: {deadline_str}."
        )
        action_url = "/miller-finance/expenses"

        insert_sql = """
            INSERT INTO miller_employee_notifications (
                supplier_profile_id,
                employee_type,
                notification_title,
                notification_content,
                action_url,
                created_at,
                status
            ) VALUES (%s, 'finance', %s, %s, %s, NOW(), 'unseen')
        """
        cursor.execute(insert_sql, [branch_id, title, content, action_url])
    except Exception as exc:
        # Avoid rolling back main expense creation if notification table insert hits a transient issue
        import logging
        logging.getLogger(__name__).warning("Failed to send finance expense notification: %s", exc)


