import datetime
import logging
from decimal import Decimal
from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from .selectors import get_manager_order_detail

logger = logging.getLogger(__name__)


class OrderApprovalError(Exception):
    """Base exception for order approval operations."""
    pass


class OrderNotFoundError(OrderApprovalError):
    """Raised when an order is not found for the given branch."""
    pass


class InvalidOrderStateError(OrderApprovalError):
    """Raised when an action is performed on an order with incompatible status."""
    pass


def edit_manager_order(
    supplier_profile_id,
    manager_user_id,
    inbound_order_id,
    ordered_quantity,
    expected_arrival_date,
    target_arrival_date,
    required_by_date,
):
    """
    Switch existing View modal into edit mode and save adjustments.
    Only editable:
    - Order Quantity
    - Expected Arrival Date
    - Target Arrival Date
    - Required By Date

    Validation rules matching Encoder Request Order:
    - Order Quantity must be greater than 0
    - Expected Arrival Date must be at least 3 days from today
    - Target Arrival Date must be at least 3 days from today
    - Required By Date must be at least 4 days after Target Arrival Date
    - Do not allow past or present invalid dates
    - All four editable fields are required
    - batch_no remains immutable

    On save:
    - update inbound_order.ordered_quantity
    - update inbound_order.expected_arrival_date
    - update miller_inbound_date_requirements.target_arrival_date
    - update miller_inbound_date_requirements.required_by_date
    - set miller_inbound_date_requirements.adjusted_by_user_id = logged-in Manager user ID
    """
    # 1. Require all four fields
    if ordered_quantity is None or str(ordered_quantity).strip() == "":
        raise OrderApprovalError("Order quantity is required.")
    if not expected_arrival_date:
        raise OrderApprovalError("Expected Arrival Date is required.")
    if not target_arrival_date:
        raise OrderApprovalError("Target Arrival Date is required.")
    if not required_by_date:
        raise OrderApprovalError("Required By Date is required.")

    # 2. Validate quantity > 0
    try:
        qty_val = Decimal(str(ordered_quantity).strip())
        if qty_val <= 0:
            raise ValueError()
    except Exception:
        raise OrderApprovalError("Order quantity must be greater than 0 kg.")

    # 3. Validate date formats
    try:
        if isinstance(expected_arrival_date, str):
            exp_date = datetime.date.fromisoformat(expected_arrival_date.strip())
        else:
            exp_date = expected_arrival_date
    except Exception:
        raise OrderApprovalError("Invalid Expected Arrival Date format (YYYY-MM-DD required).")

    try:
        if isinstance(target_arrival_date, str):
            tgt_date = datetime.date.fromisoformat(target_arrival_date.strip())
        else:
            tgt_date = target_arrival_date
    except Exception:
        raise OrderApprovalError("Invalid Target Arrival Date format (YYYY-MM-DD required).")

    try:
        if isinstance(required_by_date, str):
            req_date = datetime.date.fromisoformat(required_by_date.strip())
        else:
            req_date = required_by_date
    except Exception:
        raise OrderApprovalError("Invalid Required By Date format (YYYY-MM-DD required).")

    today = timezone.localdate()

    # 4. Expected Arrival Date >= today + 3 days
    min_expected = today + datetime.timedelta(days=3)
    if exp_date < min_expected:
        raise OrderApprovalError(
            f"Expected Arrival Date must be at least 3 days from today (earliest allowed: {min_expected.isoformat()})."
        )

    # 5. Target Arrival Date >= today + 3 days
    min_target = today + datetime.timedelta(days=3)
    if tgt_date < min_target:
        raise OrderApprovalError(
            f"Target Arrival Date must be at least 3 days from today (earliest allowed: {min_target.isoformat()})."
        )

    # 6. Required By Date >= Target Arrival Date + 4 days
    min_required = tgt_date + datetime.timedelta(days=4)
    if req_date < min_required:
        raise OrderApprovalError(
            f"Required By Date must be at least 4 days after Target Arrival Date (earliest allowed: {min_required.isoformat()})."
        )

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Check order existence and status
            cursor.execute(
                """
                SELECT status
                FROM inbound_order
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [inbound_order_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise OrderNotFoundError("Order not found or access denied.")

            current_status = str(row[0]).lower().strip()
            if current_status != "requested":
                raise InvalidOrderStateError(
                    f"Only requested orders can be edited. Current status is '{current_status}'."
                )

            # Update inbound_order
            cursor.execute(
                """
                UPDATE inbound_order
                SET ordered_quantity = %s,
                    expected_arrival_date = %s,
                    updated_at = NOW()
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                  AND status = 'requested'
                """,
                [qty_val, exp_date, inbound_order_id, supplier_profile_id],
            )

            # Update or insert date requirements
            cursor.execute(
                """
                UPDATE miller_inbound_date_requirements
                SET target_arrival_date = %s,
                    required_by_date = %s,
                    adjusted_by_user_id = %s,
                    updated_at = NOW()
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                """,
                [tgt_date, req_date, manager_user_id, inbound_order_id, supplier_profile_id],
            )

    return get_manager_order_detail(supplier_profile_id, inbound_order_id)


def decline_manager_order(supplier_profile_id, inbound_order_id, reason):
    """
    Decline an order in ONE atomic transaction:
    - validate same supplier_profile_id
    - validate inbound_order.status = requested
    - insert into miller_inbound_declined_reason
    - update inbound_order.status = 'declined'
    - insert encoder notification into miller_employee_notifications
    """
    clean_reason = str(reason or "").strip()
    if not clean_reason:
        raise OrderApprovalError("Declining reason is required and cannot be empty.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_name, ordered_quantity, status
                FROM inbound_order
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [inbound_order_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise OrderNotFoundError("Order not found or access denied.")

            product_name = str(row[0] or "Product")
            ordered_qty = float(row[1]) if row[1] is not None else 0.0
            current_status = str(row[2]).lower().strip()

            if current_status != "requested":
                raise InvalidOrderStateError(
                    f"Only requested orders can be declined. Current status is '{current_status}'."
                )

            # Format quantity string (e.g. 2,300 or 2,300.5)
            if ordered_qty % 1 == 0:
                qty_str = f"{int(ordered_qty):,}"
            else:
                qty_str = f"{ordered_qty:,.2f}"

            # Insert or update decline reason
            cursor.execute(
                """
                INSERT INTO miller_inbound_declined_reason
                (supplier_profile_id, inbound_order_id, reason, created_at)
                VALUES (%s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE reason = VALUES(reason), created_at = VALUES(created_at)
                """,
                [supplier_profile_id, inbound_order_id, clean_reason],
            )

            # Update status to declined
            cursor.execute(
                """
                UPDATE inbound_order
                SET status = 'declined',
                    updated_at = NOW()
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                  AND status = 'requested'
                """,
                [inbound_order_id, supplier_profile_id],
            )

            # Insert Encoder notification
            encoder_content = (
                f"Your request for {qty_str} kg of {product_name} was declined by the Branch Manager. Reason: {clean_reason}"
            )
            cursor.execute(
                """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    status,
                    seen_by_employee_id,
                    seen_at
                )
                VALUES (%s, 'encoder', %s, %s, %s, 'unseen', NULL, NULL)
                """,
                [
                    supplier_profile_id,
                    "Request Order Declined",
                    encoder_content,
                    "/supplier-encoder/orders",
                ],
            )

    return True


def approve_manager_order(supplier_profile_id, inbound_order_id):
    """
    Approve an order in ONE atomic transaction:
    1. validate same supplier_profile_id
    2. validate current status = requested
    3. update inbound_order.status = 'ordered'
    4. insert encoder notification
    5. insert procurement notification

    If notification insert fails, rollback approval.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_name, ordered_quantity, status
                FROM inbound_order
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [inbound_order_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise OrderNotFoundError("Order not found or access denied.")

            product_name = str(row[0] or "Product")
            ordered_qty = float(row[1]) if row[1] is not None else 0.0
            current_status = str(row[2]).lower().strip()

            if current_status != "requested":
                raise InvalidOrderStateError(
                    f"Only requested orders can be approved. Current status is '{current_status}'."
                )

            # Format quantity string (e.g. 2,300 or 2,300.5)
            if ordered_qty % 1 == 0:
                qty_str = f"{int(ordered_qty):,}"
            else:
                qty_str = f"{ordered_qty:,.2f}"

            # 3. Update status to ordered
            cursor.execute(
                """
                UPDATE inbound_order
                SET status = 'ordered',
                    updated_at = NOW()
                WHERE inbound_order_id = %s
                  AND supplier_profile_id = %s
                  AND status = 'requested'
                """,
                [inbound_order_id, supplier_profile_id],
            )

            # 4. Insert Encoder notification
            encoder_content = (
                f"Your request for {qty_str} kg of {product_name} has been approved by the Branch Manager."
            )
            cursor.execute(
                """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    status,
                    seen_by_employee_id,
                    seen_at
                )
                VALUES (%s, 'encoder', %s, %s, %s, 'unseen', NULL, NULL)
                """,
                [
                    supplier_profile_id,
                    "Request Order Approved",
                    encoder_content,
                    "/supplier-encoder/orders",
                ],
            )

            # 5. Insert Procurement notification
            procurement_content = (
                f"A new inbound order for {product_name} has been approved and is now awaiting procurement receiving."
            )
            cursor.execute(
                """
                INSERT INTO miller_employee_notifications (
                    supplier_profile_id,
                    employee_type,
                    notification_title,
                    notification_content,
                    action_url,
                    status,
                    seen_by_employee_id,
                    seen_at
                )
                VALUES (%s, 'procurement', %s, %s, %s, 'unseen', NULL, NULL)
                """,
                [
                    supplier_profile_id,
                    "New Approved Inbound Order",
                    procurement_content,
                    "/miller-procurement/receiving-orders",
                ],
            )

    return True

