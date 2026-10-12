import logging
from django.db import connection, transaction
from .selectors import get_encoder_notification_by_id

logger = logging.getLogger(__name__)


def mark_notification_as_seen(supplier_profile_id, supplier_employee_id, notification_id):
    """
    Mark an individual notification as seen.

    Rules:
    - Scoped strictly to supplier_profile_id and employee_type = 'encoder'.
    - If status = 'unseen':
      set status = 'seen', seen_by_employee_id = supplier_employee_id, seen_at = NOW().
    - If already 'seen', do NOT overwrite seen_by_employee_id or seen_at.
    - Returns current notification record, or None if notification not found in this branch.
    """
    notification = get_encoder_notification_by_id(supplier_profile_id, notification_id)
    if not notification:
        return None

    if notification["status"] == "unseen":
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_employee_notifications
                    SET
                        status = 'seen',
                        seen_by_employee_id = %s,
                        seen_at = NOW()
                    WHERE notification_id = %s
                      AND supplier_profile_id = %s
                      AND employee_type = 'encoder'
                      AND status = 'unseen'
                    """,
                    [supplier_employee_id, notification_id, supplier_profile_id],
                )

        # Refresh with newly recorded seen_by and seen_at
        notification = get_encoder_notification_by_id(supplier_profile_id, notification_id)

    return notification
