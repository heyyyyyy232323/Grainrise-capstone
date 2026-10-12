import logging
from django.db import connection, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


class ReturnNotFoundError(Exception):
    """Raised when the specified return record is not found or does not belong to the business."""
    pass


class AlreadyReturnedError(Exception):
    """Raised when the return record is already marked as returned."""
    pass


class ReturnValidationError(Exception):
    """Raised when return input or state validation fails."""
    pass


def mark_as_returned(supplier_profile_id, return_id):
    """
    Mark a pending return as returned.
    Updates status = 'returned' and returned_at = CURRENT_TIMESTAMP.
    Prevents duplicate updates and ensures atomic business-scoped execution.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Lock return record and verify ownership
            cursor.execute(
                """
                SELECT return_id, status, return_reference_no
                FROM miller_returns
                WHERE return_id = %s
                  AND supplier_profile_id = %s
                FOR UPDATE
                """,
                [return_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ReturnNotFoundError("Return record not found or does not belong to your business.")

            current_status = str(row[1] or "").strip().lower()
            if current_status == "returned":
                raise AlreadyReturnedError("This return record has already been marked as returned.")
            if current_status != "pending":
                raise ReturnValidationError(
                    f"Cannot mark return with status '{current_status}' as returned."
                )

            now_dt = timezone.localtime(timezone.now())
            cursor.execute(
                """
                UPDATE miller_returns
                SET status = 'returned',
                    returned_at = %s
                WHERE return_id = %s
                  AND supplier_profile_id = %s
                """,
                [now_dt, return_id, supplier_profile_id],
            )

    return {
        "return_id": return_id,
        "return_reference_no": row[2],
        "status": "returned",
        "returned_at": now_dt.isoformat(),
    }

