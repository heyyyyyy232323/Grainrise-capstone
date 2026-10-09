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


def request_to_pay(supplier_profile_id, receiving_id):
    """
    Transition inbound_purchase_history.status from 'pending' to 'request to pay'.
    Strictly scoped to the specific receiving_id and authenticated supplier_profile_id.
    Prevents duplicate requests and does NOT affect other receiving records in the same batch.
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

    logger.info(
        "Successfully transitioned receiving_id=%s (ref=%s) to 'request_to_pay' for supplier_profile_id=%s",
        receiving_id,
        reference_no,
        supplier_profile_id,
    )

    # Return refreshed receipt detail
    detail = get_goods_receipt_detail(supplier_profile_id, receiving_id)
    return detail
