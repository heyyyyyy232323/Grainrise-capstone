import logging
from django.db import connection
from django.utils import timezone

from .selectors import get_warehouse_finance_notification_by_id

logger = logging.getLogger(__name__)


def create_warehouse_finance_notification(
    warehouse_profile_id: int,
    title: str,
    content: str,
    action_url: str = "/warehouse-finance/dashboard",
    created_at=None,
    deduplication_key: str = None,
) -> bool:
    """
    Safely create a notification for Warehouse Finance belonging to warehouse_profile_id.
    Prevents duplicates by checking existing notification_content for this branch and employee_type = 'finance'.
    """
    if not warehouse_profile_id or not title or not content:
        return False

    clean_content = content.strip()
    clean_title = title.strip()
    clean_url = (action_url or "/warehouse-finance/dashboard").strip()
    effective_dt = created_at or timezone.now()

    try:
        with connection.cursor() as cursor:
            # Deduplication check
            if deduplication_key:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_employee_notifications
                    WHERE warehouse_profile_id = %s
                      AND employee_type = 'finance'
                      AND notification_content LIKE %s
                    """,
                    [warehouse_profile_id, f"%{deduplication_key}%"],
                )
            else:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM warehouse_employee_notifications
                    WHERE warehouse_profile_id = %s
                      AND employee_type = 'finance'
                      AND notification_content = %s
                    """,
                    [warehouse_profile_id, clean_content],
                )

            row = cursor.fetchone()
            if row and row[0] > 0:
                logger.info(
                    "Skipping duplicate finance notification for warehouse_profile_id=%s, title=%s",
                    warehouse_profile_id,
                    clean_title,
                )
                return False

            sql_insert = """
                INSERT INTO warehouse_employee_notifications (
                    warehouse_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    created_at,
                    status
                ) VALUES (%s, 'finance', %s, %s, %s, %s, 'unseen')
            """
            cursor.execute(
                sql_insert,
                [warehouse_profile_id, clean_title, clean_content, clean_url, effective_dt],
            )
            logger.info(
                "Created warehouse finance notification for warehouse_profile_id=%s, title=%s",
                warehouse_profile_id,
                clean_title,
            )
            return True
    except Exception as exc:
        logger.warning(
            "Failed to create warehouse finance notification for warehouse_profile_id=%s: %s",
            warehouse_profile_id,
            exc,
        )
        return False


def mark_warehouse_finance_notification_as_seen(
    warehouse_profile_ids: list,
    notification_id: int,
    employee_id: int = None,
):
    """
    Mark a single warehouse finance notification as seen, scoped strictly to warehouse_profile_ids.
    """
    if not warehouse_profile_ids or not notification_id:
        return None

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM warehouse_employees WHERE warehouse_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    params = [valid_emp_id, now, notification_id] + list(warehouse_profile_ids)

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE notification_id = %s
          AND warehouse_profile_id IN ({p_wh})
          AND employee_type = 'finance'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows_affected = cursor.rowcount

    if rows_affected == 0:
        return None

    return get_warehouse_finance_notification_by_id(warehouse_profile_ids, notification_id)


def mark_all_warehouse_finance_notifications_seen(
    warehouse_profile_ids: list,
    employee_id: int = None,
):
    """
    Mark all unseen finance notifications as seen for this warehouse branch.
    """
    if not warehouse_profile_ids:
        return 0

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    valid_emp_id = None
    if employee_id:
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM warehouse_employees WHERE warehouse_employee_id = %s LIMIT 1",
                    [employee_id],
                )
                if cursor.fetchone():
                    valid_emp_id = employee_id
        except Exception:
            valid_emp_id = None

    now = timezone.now()
    params = [valid_emp_id, now] + list(warehouse_profile_ids)

    query = f"""
        UPDATE warehouse_employee_notifications
        SET status = 'seen',
            seen_by_employee_id = %s,
            seen_at = %s
        WHERE warehouse_profile_id IN ({p_wh})
          AND employee_type = 'finance'
          AND status = 'unseen'
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.rowcount


# =========================================================================
# TRIGGER HELPERS
# =========================================================================

def notify_finance_on_new_payable_request(
    warehouse_profile_id: int,
    reference_no: str,
    batch_no: str = "N/A",
    amount: float = 0.0,
) -> bool:
    """
    Trigger 1: Warehouse Procurement submits a new payable/request to pay.
    """
    clean_ref = str(reference_no or "").strip()
    clean_batch = str(batch_no or "N/A").strip()
    title = "New Payable Requested"
    content = (
        f"Payment requested for Batch {clean_batch} "
        f"(Receiving Ref: {clean_ref}) in the amount of ₱ {amount:,.2f}."
    )
    return create_warehouse_finance_notification(
        warehouse_profile_id=warehouse_profile_id,
        title=title,
        content=content,
        action_url="/warehouse-finance/payables",
        deduplication_key=clean_ref,
    )


def notify_finance_on_new_expense(
    warehouse_profile_id: int,
    ref_no: str,
    expense_type: str,
    price: float,
    deadline=None,
    business_name: str = "Warehouse",
) -> bool:
    """
    Trigger 2: Warehouse Manager creates a new expense.
    """
    clean_ref = str(ref_no or "").strip()
    clean_type = str(expense_type or "Expense").strip()
    deadline_str = (
        deadline.strftime("%b %d, %Y")
        if hasattr(deadline, "strftime")
        else str(deadline or "N/A")
    )
    title = "New Expense Created"
    content = (
        f"New {clean_type} expense (#{clean_ref}) of PHP {price:,.2f} set for {business_name}. "
        f"Deadline: {deadline_str}."
    )
    return create_warehouse_finance_notification(
        warehouse_profile_id=warehouse_profile_id,
        title=title,
        content=content,
        action_url="/warehouse-finance/expenses",
        deduplication_key=clean_ref,
    )


def notify_finance_on_new_reimbursement(
    warehouse_profile_id: int,
    ref_no: str,
    reimbursement_type: str,
    price: float,
    requester_name: str = "Employee",
) -> bool:
    """
    Trigger 3: Warehouse employee submits a reimbursement request.
    """
    clean_ref = str(ref_no or "").strip()
    clean_type = str(reimbursement_type or "Reimbursement").strip()
    clean_name = str(requester_name or "Employee").strip()
    title = "New Reimbursement Request"
    content = (
        f"New {clean_type} reimbursement request ({clean_ref}) submitted by {clean_name} for ₱ {price:,.2f}."
    )
    return create_warehouse_finance_notification(
        warehouse_profile_id=warehouse_profile_id,
        title=title,
        content=content,
        action_url="/warehouse-finance/reimburse",
        deduplication_key=clean_ref,
    )
