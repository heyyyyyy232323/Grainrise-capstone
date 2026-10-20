import datetime
import logging
import os
import re
import secrets
from django.conf import settings
from django.db import connection, transaction

from api.miller_employees_function.miller_procurement.payment_history.selectors import (
    get_payment_history_detail,
)

logger = logging.getLogger(__name__)


class PayableNotFoundError(Exception):
    """Raised when the specified receiving record cannot be found or is inaccessible."""
    pass


class AlreadyPaidError(Exception):
    """Raised when payment has already been recorded for this receiving record."""
    pass


class InvalidPayableStateError(Exception):
    """Raised when receiving record is not in request_to_pay status."""
    pass


class DuplicateReferenceError(Exception):
    """Raised when payment reference number collides with an existing payment record."""
    pass


def generate_cash_payment_reference(contact_person, business_name, cursor, supplier_profile_id):
    """
    Generate Cash payment reference format:
    CONTACT_INITIALS-BUSINESS_FIRST3-MMDDYYYY-HHMM
    Example: JM-GRA-10152026-1012

    - Uses actual supplier contact person, Miller business name, and payment timestamp.
    - Handles reference collisions safely without changing the required display format.
    """
    # 1. Contact initials
    contact = (contact_person or "").strip()
    words = [w for w in re.split(r'[^A-Za-z]+', contact) if w]
    if words:
        initials = "".join([w[0].upper() for w in words])[:4]
    else:
        initials = "SU"
    if not initials:
        initials = "SU"

    # 2. Business first 3 letters
    biz = re.sub(r'[^A-Za-z0-9]', '', (business_name or "").strip()).upper()
    biz_first3 = (biz[:3] if len(biz) >= 3 else biz.ljust(3, "X"))

    # 3. Timestamp MMDDYYYY-HHMM
    now = datetime.datetime.now()
    base_ref = f"{initials}-{biz_first3}-{now.strftime('%m%d%Y-%H%M')}"

    # 4. Check for collision in miller_finance_payables_payment_references
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM miller_finance_payables_payment_references
        WHERE payment_reference_id = %s
        """,
        [base_ref]
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return base_ref

    # Collision detected: advance minute offset to safely resolve collision while strictly preserving format
    for minute_offset in range(1, 60):
        adjusted_time = now + datetime.timedelta(minutes=minute_offset)
        candidate = f"{initials}-{biz_first3}-{adjusted_time.strftime('%m%d%Y-%H%M')}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_finance_payables_payment_references
            WHERE payment_reference_id = %s
            """,
            [candidate]
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return candidate

    return base_ref


def _save_receipt_file(receipt_file, supplier_profile_id):
    """
    Save uploaded receipt file to MEDIA_ROOT under finance_receipts/{supplier_profile_id}/.
    Returns relative media URL e.g. /media/finance_receipts/{supplier_profile_id}/{filename}.
    """
    if not receipt_file:
        return None

    ext = os.path.splitext(receipt_file.name.lower())[1]
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        ext = ".jpg"

    unique_token = secrets.token_hex(8)
    filename = f"receipt_{datetime.date.today().strftime('%Y%m%d')}_{unique_token}{ext}"

    rel_dir = os.path.join("finance_receipts", str(supplier_profile_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        for chunk in receipt_file.chunks():
            f.write(chunk)

    return f"/media/finance_receipts/{supplier_profile_id}/{filename}"


def record_payment(
    supplier_profile_id,
    paid_by_employee_id,
    receiving_id,
    payment_method,
    payment_reference=None,
    receipt_file=None,
):
    """
    Record payment for a receiving record in 'request_to_pay' status.
    - Atomically updates inbound_purchase_history status to 'paid'.
    - Updates miller_finance_payables_payment_references with payment method, reference, paid_by, and timestamp.
    - Prevents double payments and enforces business/branch isolation.
    """
    method_clean = str(payment_method or "").strip()
    if method_clean.lower() == "cash":
        norm_method = "Cash"
    elif method_clean.lower() == "bank":
        norm_method = "Bank"
    elif method_clean.lower() == "gcash":
        norm_method = "GCash"
    else:
        raise ValueError("Invalid payment method. Must be Cash, Bank, or GCash.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock the receiving record for update
            cursor.execute(
                """
                SELECT
                    iph.receiving_id,
                    iph.status,
                    iph.receiving_reference_no,
                    fc.contact_person,
                    sp.business_name
                FROM inbound_purchase_history iph
                LEFT JOIN farmer_contacts fc
                    ON fc.farmer_contact_id = iph.farmer_contact_id
                   AND fc.supplier_profile_id = iph.supplier_profile_id
                LEFT JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = iph.supplier_profile_id
                WHERE iph.receiving_id = %s
                  AND iph.supplier_profile_id = %s
                FOR UPDATE
                """,
                [receiving_id, supplier_profile_id],
            )
            row = cursor.fetchone()

            if not row:
                raise PayableNotFoundError(
                    f"Payable record #{receiving_id} not found or access denied."
                )

            current_status = (row[1] or "").strip().lower()
            ref_no = row[2]
            contact_person = row[3]
            business_name = row[4]

            if current_status == "paid":
                raise AlreadyPaidError(
                    f"Payment has already been completed for receiving reference {ref_no}."
                )

            if current_status != "request_to_pay":
                raise InvalidPayableStateError(
                    f"Cannot process payment. Current status is '{current_status}', but expected 'request_to_pay'."
                )

            # 2. Determine payment reference
            if norm_method == "Cash":
                final_reference = generate_cash_payment_reference(
                    contact_person=contact_person,
                    business_name=business_name,
                    cursor=cursor,
                    supplier_profile_id=supplier_profile_id,
                )
            else:
                final_reference = str(payment_reference or "").strip()
                if not final_reference:
                    raise ValueError(
                        f"Payment Reference Number is required for {norm_method} payments."
                    )

                # Check if this reference number is already used for another receiving record
                cursor.execute(
                    """
                    SELECT receiving_id
                    FROM miller_finance_payables_payment_references
                    WHERE payment_reference_id = %s
                      AND receiving_id != %s
                    LIMIT 1
                    """,
                    [final_reference, receiving_id],
                )
                existing = cursor.fetchone()
                if existing:
                    raise DuplicateReferenceError(
                        f"Payment reference '{final_reference}' has already been used for receiving record #{existing[0]}."
                    )

            # 3. Handle receipt file upload if provided
            receipt_image_url = None
            if receipt_file:
                receipt_image_url = _save_receipt_file(receipt_file, supplier_profile_id)

            # 4. Update inbound_purchase_history
            cursor.execute(
                """
                UPDATE inbound_purchase_history
                SET status = 'paid',
                    paid_by_employee_id = %s
                WHERE receiving_id = %s
                  AND supplier_profile_id = %s
                """,
                [paid_by_employee_id, receiving_id, supplier_profile_id],
            )

            # 5. Insert / Update miller_finance_payables_payment_references
            cursor.execute(
                """
                INSERT INTO miller_finance_payables_payment_references (
                    receiving_id,
                    supplier_profile_id,
                    paid_by_employee_id,
                    payment_method,
                    payment_reference_id,
                    receipt_image_url,
                    paid_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    supplier_profile_id = VALUES(supplier_profile_id),
                    paid_by_employee_id = VALUES(paid_by_employee_id),
                    payment_method = VALUES(payment_method),
                    payment_reference_id = VALUES(payment_reference_id),
                    receipt_image_url = COALESCE(VALUES(receipt_image_url), miller_finance_payables_payment_references.receipt_image_url),
                    paid_at = NOW()
                """,
                [
                    receiving_id,
                    supplier_profile_id,
                    paid_by_employee_id,
                    norm_method,
                    final_reference,
                    receipt_image_url,
                ],
            )

    logger.info(
        "Successfully recorded payment for receiving_id=%s, ref=%s, method=%s, payment_ref=%s by employee_id=%s",
        receiving_id,
        ref_no,
        norm_method,
        final_reference,
        paid_by_employee_id,
    )

    # 6. Retrieve full receipt details for modal and Procurement Payment History
    receipt_detail = get_payment_history_detail(supplier_profile_id, receiving_id)
    return receipt_detail

