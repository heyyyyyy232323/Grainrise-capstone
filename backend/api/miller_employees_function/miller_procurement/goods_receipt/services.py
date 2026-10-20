import logging
from django.db import connection, transaction
from .selectors import get_goods_receipt_detail

logger = logging.getLogger(__name__)


class GoodsReceiptNotFoundError(Exception):
    """Raised when the specified receiving record cannot be found or is inaccessible."""
    pass


class AlreadyRequestedToPayError(Exception):
    """Raised when payment has already been requested for this receiving record."""
    pass


class InvalidReceivingStateError(Exception):
    """Raised when receiving record is in an invalid state for requesting payment."""
    pass


def request_to_pay(supplier_profile_id, receiving_id, requesting_employee_id=None):
    """
    Transition inbound_purchase_history.status from 'pending' to 'request_to_pay'.
    Strictly scoped to the specific receiving_id and authenticated supplier_profile_id.
    Atomically creates a record in miller_finance_payables_payment_references.
    Prevents duplicates and preserves existing status updates.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Lock the target record for update
            cursor.execute(
                """
                SELECT receiving_id, status, receiving_reference_no
                FROM inbound_purchase_history
                WHERE receiving_id = %s AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [receiving_id, supplier_profile_id],
            )
            row = cursor.fetchone()

            if not row:
                raise GoodsReceiptNotFoundError(
                    f"Receiving record #{receiving_id} was not found or access denied."
                )

            current_status = (row[1] or "").strip()
            reference_no = row[2]

            if current_status != "pending":
                raise AlreadyRequestedToPayError(
                    f"Payment request has already been submitted for receiving reference {reference_no} (Status: {current_status})."
                )

            # Update ONLY the selected receiving record with actual DB supported status
            cursor.execute(
                """
                UPDATE inbound_purchase_history
                SET status = 'request_to_pay'
                WHERE receiving_id = %s AND supplier_profile_id = %s
                """,
                [receiving_id, supplier_profile_id],
            )

            # Atomically create payment reference record in miller_finance_payables_payment_references
            cursor.execute(
                """
                INSERT INTO miller_finance_payables_payment_references (
                    receiving_id,
                    supplier_profile_id,
                    requested_by_employee_id,
                    requested_at
                )
                VALUES (%s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    supplier_profile_id = VALUES(supplier_profile_id),
                    requested_by_employee_id = COALESCE(miller_finance_payables_payment_references.requested_by_employee_id, VALUES(requested_by_employee_id))
                """,
                [receiving_id, supplier_profile_id, requesting_employee_id],
            )

    logger.info(
        "Successfully transitioned receiving_id=%s (ref=%s) to 'request_to_pay' and recorded payment reference for supplier_profile_id=%s, employee_id=%s",
        receiving_id,
        reference_no,
        supplier_profile_id,
        requesting_employee_id,
    )

    # Return refreshed receipt detail
    detail = get_goods_receipt_detail(supplier_profile_id, receiving_id)

    # Notify Miller Finance that a payable is newly requested for payment
    try:
        from api.miller_employees_function.miller_finance.notifications.services import (
            create_finance_notification,
        )
        batch_str = (detail.get("batch_no") if detail else None) or "N/A"
        ref_str = (detail.get("receiving_reference_no") if detail else None) or reference_no or f"REC-{receiving_id}"
        amt_val = float(detail.get("total_price") or 0.0) if detail else 0.0
        create_finance_notification(
            supplier_profile_id=supplier_profile_id,
            title="New Payable Requested",
            content=f"Payment requested for Batch {batch_str} (Receiving Ref: {ref_str}) in the amount of ₱ {amt_val:,.2f}.",
            action_url="/miller-finance/payables",
            deduplication_key=ref_str,
        )
    except Exception as notif_err:
        logger.warning("Failed to notify finance of payable request for receiving_id=%s: %s", receiving_id, notif_err)

    return detail
