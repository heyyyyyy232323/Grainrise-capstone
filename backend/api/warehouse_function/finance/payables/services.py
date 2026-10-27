import datetime
import logging
import os
import re
import secrets
import uuid
import requests
from django.conf import settings
from django.db import connection, transaction

from .selectors import (
    normalize_receiving_reference,
    format_standard_receiving_reference,
    format_business_address,
    format_business_contact,
    format_readable_date,
    format_readable_date_time,
)

logger = logging.getLogger(__name__)

XENDIT_PAYMENT_REQUESTS_URL = "https://api.xendit.co/payment_requests"


class PayableNotFoundError(Exception):
    """Raised when the specified receiving record cannot be found or is inaccessible."""
    pass


class AlreadyPaidError(Exception):
    """Raised when payment has already been recorded for this receiving record."""
    pass


class ActivePaymentAttemptError(Exception):
    """Raised when an active online payment attempt is already in progress."""
    pass


class InvalidPayableStateError(Exception):
    """Raised when receiving record is not in a payable state."""
    pass


class DuplicateReferenceError(Exception):
    """Raised when payment reference number collides with an existing payment record."""
    pass


class XenditError(Exception):
    """Raised when Xendit API returns an error or configuration is missing."""
    pass


def get_xendit_config() -> dict:
    """Read Xendit keys from backend/.env or environment."""
    env_file = os.path.join(settings.BASE_DIR, ".env")
    env_dict = {}
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    env_dict[k.strip()] = v.strip().strip("'\"")

    secret_key = (env_dict.get("XENDIT_SECRET_KEY") or os.getenv("XENDIT_SECRET_KEY") or "").strip()
    raw_mode = (env_dict.get("XENDIT_MODE") or os.getenv("XENDIT_MODE") or "test").strip().lower()
    callback_token = (
        env_dict.get("XENDIT_CALLBACK_TOKEN")
        or env_dict.get("XENDIT_WEBHOOK_VERIFICATION_TOKEN")
        or os.getenv("XENDIT_CALLBACK_TOKEN")
        or os.getenv("XENDIT_WEBHOOK_VERIFICATION_TOKEN")
        or ""
    ).strip()

    is_live = raw_mode == "live" and secret_key.startswith("xnd_production_")
    mode = "live" if is_live else "test"

    return {
        "secret_key": secret_key,
        "mode": mode,
        "is_sandbox": mode == "test",
        "has_secret_key": bool(secret_key),
        "callback_token": callback_token,
    }


def generate_warehouse_cash_reference(contact_person, business_name, cursor, warehouse_profile_id):
    """
    Generate Cash payment reference format matching Miller Payables standard:
    CONTACT_INITIALS-BUSINESS_FIRST3-MMDDYYYY-HHMM
    Example: JM-RIC-10272026-1310
    """
    contact = (contact_person or "").strip()
    words = [w for w in re.split(r'[^A-Za-z]+', contact) if w]
    if words:
        initials = "".join([w[0].upper() for w in words])[:4]
    else:
        initials = "WH"
    if not initials:
        initials = "WH"

    biz = re.sub(r'[^A-Za-z0-9]', '', (business_name or "").strip()).upper()
    biz_first3 = (biz[:3] if len(biz) >= 3 else biz.ljust(3, "X"))

    now = datetime.datetime.now()
    base_ref = f"{initials}-{biz_first3}-{now.strftime('%m%d%Y-%H%M')}"

    # Check collision in warehouse_finance_payables_payment_references
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM warehouse_finance_payables_payment_references
        WHERE payment_reference_id = %s
        """,
        [base_ref]
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return base_ref

    for minute_offset in range(1, 60):
        adjusted = now + datetime.timedelta(minutes=minute_offset)
        candidate = f"{initials}-{biz_first3}-{adjusted.strftime('%m%d%Y-%H%M')}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM warehouse_finance_payables_payment_references
            WHERE payment_reference_id = %s
            """,
            [candidate]
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return candidate

    return f"{base_ref}-{secrets.token_hex(2).upper()}"


def _save_receipt_file(receipt_file, warehouse_profile_id):
    """
    Save uploaded receipt image/pdf to MEDIA_ROOT/finance_receipts/{warehouse_profile_id}/.
    """
    if not receipt_file:
        return None

    ext = os.path.splitext(receipt_file.name.lower())[1]
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        ext = ".jpg"

    unique_token = secrets.token_hex(8)
    filename = f"receipt_{datetime.date.today().strftime('%Y%m%d')}_{unique_token}{ext}"

    rel_dir = os.path.join("finance_receipts", str(warehouse_profile_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        for chunk in receipt_file.chunks():
            f.write(chunk)

    return f"/media/finance_receipts/{warehouse_profile_id}/{filename}"


def _format_date(d):
    if not d:
        return "—"
    if isinstance(d, datetime.datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            d = datetime.date.fromisoformat(d.split("T")[0].split(" ")[0])
        except Exception:
            return str(d)
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{months[d.month - 1]} {d.day}, {d.year}"


def _format_date_time(d):
    if not d:
        return "—"
    if isinstance(d, datetime.datetime):
        return d.strftime("%b %d, %Y %I:%M %p")
    if isinstance(d, str):
        try:
            parsed = datetime.datetime.fromisoformat(d.replace("Z", "+00:00"))
            return parsed.strftime("%b %d, %Y %I:%M %p")
        except Exception:
            return str(d)
    return str(d)


def record_payment(
    warehouse_profile_ids,
    receiving_id,
    supplier_type,
    payment_method,
    payment_reference=None,
    receipt_file=None,
    paid_by_employee_id=None,
    payer_name=None,
    business_name=None,
):
    """
    Record payment for a receiving record in Cash or manual Bank/GCash.
    Strictly isolated to authenticated warehouse_profile_ids.
    Synchronizes:
    - warehouse_finance_payables_payment_references
    - receiving history status
    - miller_online_customer and miller_online_orders_payment (for registered Millers)
    """
    if not warehouse_profile_ids:
        raise PayableNotFoundError("No accessible warehouse branch found.")

    method_clean = str(payment_method or "").strip()
    if method_clean.lower() == "cash":
        norm_method = "Cash"
    elif method_clean.lower() == "bank":
        norm_method = "Bank"
    elif method_clean.lower() == "gcash":
        norm_method = "GCash"
    else:
        raise ValueError("Invalid payment method. Must be Cash, Bank, or GCash.")

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    with connection.cursor() as cursor:
        with transaction.atomic():
            # Retrieve warehouse profile details for receipt header
            cursor.execute(
                """
                SELECT business_name, organization_name, street_address, barangay, municipality, province, postal_code, official_contact_number, official_email
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s
                LIMIT 1
                """,
                [warehouse_profile_ids[0]],
            )
            wh_prof = cursor.fetchone()
            if wh_prof:
                wh_biz_name = wh_prof[0] or wh_prof[1] or "GrainRise Warehouse"
                wh_address = format_business_address(wh_prof[2], wh_prof[3], wh_prof[4], wh_prof[5], wh_prof[6])
                wh_contact = format_business_contact(wh_prof[7], wh_prof[8])
            else:
                wh_biz_name = "GrainRise Warehouse"
                wh_address = "Address Not Provided"
                wh_contact = "Contact Not Provided"

            if supplier_type == "registered_miller":
                # 1. Fetch Registered Miller receiving record
                cursor.execute(
                    f"""
                    SELECT
                        rh.receiving_id,
                        rh.online_order_id,
                        rh.supplier_profile_id,
                        rh.warehouse_buyer_id,
                        rh.receiving_reference_no,
                        rh.total_received,
                        rh.received_good,
                        rh.received_bad,
                        rh.payables,
                        rh.status,
                        rh.received_at,
                        moc.batch_no,
                        moc.ordered_quantity,
                        moc.total_price,
                        sp.business_name AS supplier_business_name,
                        sp.organization_name AS supplier_org_name,
                        sp.official_contact_number,
                        mp.product_name,
                        fpay.payable_reference_id,
                        fpay.paid_at
                    FROM miller_online_customer_receiving_history rh
                    INNER JOIN miller_online_customer moc
                        ON moc.online_order_id = rh.online_order_id
                    LEFT JOIN supplier_profiles sp
                        ON sp.supplier_profile_id = rh.supplier_profile_id
                    LEFT JOIN miller_products mp
                        ON mp.product_id = moc.miller_product_id
                    LEFT JOIN warehouse_finance_payables_payment_references fpay
                        ON fpay.miller_receiving_id = rh.receiving_id
                    WHERE rh.receiving_id = %s
                      AND (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
                    LIMIT 1
                    FOR UPDATE
                    """,
                    [receiving_id] + list(warehouse_profile_ids) + list(warehouse_profile_ids),
                )
                row = cursor.fetchone()
                if not row:
                    raise PayableNotFoundError("Payable record not found or not accessible for your warehouse branch.")

                (
                    r_id, o_id, sp_id, wh_buyer_id, rec_ref_no,
                    tot_rcvd, rcvd_good, rcvd_bad, payable_amt, r_status, r_at,
                    batch_no, ord_qty, ord_price, sup_biz, sup_org, sup_contact,
                    prod_name, fpay_id, fpay_paid_at
                ) = row

                effective_wh_id = wh_buyer_id or warehouse_profile_ids[0]

                if fpay_paid_at is not None or str(r_status or "").lower() == "paid":
                    raise AlreadyPaidError("This receiving record has already been marked as Paid.")

                # Amount
                amount_to_pay = float(payable_amt or 0.0)

                canonical_rec_ref = normalize_receiving_reference(
                    existing_ref=rec_ref_no,
                    batch_no=batch_no,
                    business_name=sup_biz or sup_org or "Registered Miller",
                    contact_person=sup_contact or sup_biz or "Miller Contact",
                    dt=r_at or datetime.datetime.now(),
                    fallback_id=receiving_id,
                )

                # Payment reference
                if norm_method == "Cash":
                    final_reference = generate_warehouse_cash_reference(
                        contact_person=sup_biz or sup_org or "Miller",
                        business_name=wh_biz_name,
                        cursor=cursor,
                        warehouse_profile_id=effective_wh_id,
                    )
                else:
                    ref_input = str(payment_reference or "").strip()
                    if not ref_input:
                        raise ValueError(f"Payment Reference Number is required for {norm_method} payments.")
                    final_reference = ref_input

                # Save receipt file if uploaded
                receipt_url = _save_receipt_file(receipt_file, effective_wh_id) if receipt_file else None

                now_ts = datetime.datetime.now()

                # Update miller_online_customer_receiving_history
                cursor.execute(
                    """
                    UPDATE miller_online_customer_receiving_history
                    SET status = 'Paid',
                        receiving_reference_no = %s
                    WHERE receiving_id = %s
                    """,
                    [canonical_rec_ref, receiving_id],
                )

                # Update miller_online_customer order
                cursor.execute(
                    """
                    UPDATE miller_online_customer
                    SET status = 'Delivered', updated_at = CURRENT_TIMESTAMP
                    WHERE online_order_id = %s
                    """,
                    [o_id],
                )

                # Synchronize miller_online_orders_payment
                cursor.execute(
                    """
                    SELECT cod_id FROM miller_online_orders_payment
                    WHERE online_order_id = %s
                    LIMIT 1
                    """,
                    [o_id],
                )
                payment_row = cursor.fetchone()
                if payment_row:
                    cod_id = payment_row[0]
                    cursor.execute(
                        """
                        UPDATE miller_online_orders_payment
                        SET payment_reference = %s,
                            amount = %s,
                            payment_method = %s,
                            status = 'Paid',
                            photo_of_receipt = COALESCE(%s, photo_of_receipt)
                        WHERE cod_id = %s
                        """,
                        [final_reference, amount_to_pay, norm_method, receipt_url, cod_id],
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO miller_online_orders_payment (
                            supplier_profile_id,
                            warehouse_payer_id,
                            online_order_id,
                            payment_reference,
                            amount,
                            payment_method,
                            status,
                            photo_of_receipt
                        ) VALUES (%s, %s, %s, %s, %s, %s, 'Paid', %s)
                        """,
                        [sp_id, effective_wh_id, o_id, final_reference, amount_to_pay, norm_method, receipt_url],
                    )
                    cod_id = cursor.lastrowid

                # Synchronize warehouse_finance_payables_payment_references
                if fpay_id:
                    cursor.execute(
                        """
                        UPDATE warehouse_finance_payables_payment_references
                        SET payment_method = %s,
                            payment_reference_id = %s,
                            receipt_image_url = COALESCE(%s, receipt_image_url),
                            paid_at = %s,
                            paid_by_employee_id = %s,
                            amount_to_pay = %s,
                            miller_online_payment_id = %s
                        WHERE payable_reference_id = %s
                        """,
                        [norm_method, final_reference, receipt_url, now_ts, paid_by_employee_id, amount_to_pay, cod_id, fpay_id],
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO warehouse_finance_payables_payment_references (
                            miller_receiving_id,
                            warehouse_profile_id,
                            amount_to_pay,
                            miller_online_payment_id,
                            payment_method,
                            payment_reference_id,
                            receipt_image_url,
                            paid_by_employee_id,
                            requested_at,
                            paid_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        [receiving_id, effective_wh_id, amount_to_pay, cod_id, norm_method, final_reference, receipt_url, paid_by_employee_id, now_ts, now_ts],
                    )

                # Return receipt snapshot
                tot_good = float(rcvd_good or tot_rcvd or 0.0)
                price_kg = round(amount_to_pay / tot_good, 2) if tot_good > 0 else 0.0
                supplier_disp = sup_biz or sup_org or "Registered Miller"

                return {
                    "receiving_id": receiving_id,
                    "order_id": o_id,
                    "batch_no": batch_no or f"BATCH-{receiving_id}",
                    "batchNo": batch_no or f"BATCH-{receiving_id}",
                    "reference_no": canonical_rec_ref,
                    "receiving_reference_no": canonical_rec_ref,
                    "variant": prod_name or "Grain Product",
                    "product_name": prod_name or "Grain Product",
                    "supplier": supplier_disp,
                    "supplier_type": "registered_miller",
                    "supplier_type_label": "Registered Miller",
                    "original_order_quantity": f"{float(ord_qty or 0):,.2f} kg",
                    "ordered_quantity": float(ord_qty or 0),
                    "total_received": f"{float(tot_rcvd or 0):,.2f} kg",
                    "received_good": f"{tot_good:,.2f} kg",
                    "received_bad": f"{float(rcvd_bad or 0):,.2f} kg",
                    "unit_price": f"₱ {price_kg:,.2f}",
                    "price_per_kg": f"₱ {price_kg:,.2f}",
                    "amount_to_pay": f"₱ {amount_to_pay:,.2f}",
                    "payable": f"₱ {amount_to_pay:,.2f}",
                    "total": f"₱ {amount_to_pay:,.2f}",
                    "total_raw": amount_to_pay,
                    "total_price": amount_to_pay,
                    "received_date": _format_date(r_at),
                    "received_at": str(r_at or ""),
                    "requested_date": _format_date(r_at),
                    "requested_at_formatted": _format_date_time(r_at),
                    "paid_date": now_ts.strftime("%b %d, %Y"),
                    "paid_at": now_ts.strftime("%b %d, %Y %I:%M %p"),
                    "paid_at_formatted": now_ts.strftime("%b %d, %Y %I:%M %p"),
                    "paid_by": payer_name or "Warehouse Finance",
                    "payment_method": norm_method,
                    "payment_reference": final_reference,
                    "payment_reference_id": final_reference,
                    "payment_reference_number": final_reference,
                    "business_name": wh_biz_name,
                    "business_address": wh_address,
                    "business_contact": wh_contact,
                    "is_paid": True,
                    "status": "Paid",
                }

            else:
                # 2. Fetch External Supplier receiving record
                cursor.execute(
                    f"""
                    SELECT
                        rh.receiving_id,
                        rh.purchase_request_id,
                        rh.warehouse_profile_id,
                        rh.receiving_reference_no,
                        rh.total_received,
                        rh.received_good,
                        rh.received_bad,
                        rh.price_per_kg,
                        rh.total_price,
                        rh.status,
                        rh.received_at,
                        ngsc.business_name AS supplier_business_name,
                        ngsc.contact_person AS supplier_contact_person,
                        wpr.product_name,
                        wpr.ordered_quantity,
                        fpay.payable_reference_id,
                        fpay.paid_at
                    FROM warehouse_nongrainrise_supplier_receiving_history rh
                    LEFT JOIN warehouse_nongrainrise_supplier_contacts ngsc
                        ON ngsc.warehouse_nongrainrise_supplier_contact_id = rh.warehouse_nongrainrise_supplier_contact_id
                    LEFT JOIN warehouse_purchase_requests wpr
                        ON wpr.purchase_request_id = rh.purchase_request_id
                    LEFT JOIN warehouse_finance_payables_payment_references fpay
                        ON fpay.nongrainrise_receiving_id = rh.receiving_id
                    WHERE rh.receiving_id = %s
                      AND rh.warehouse_profile_id IN ({placeholders})
                    LIMIT 1
                    FOR UPDATE
                    """,
                    [receiving_id] + list(warehouse_profile_ids),
                )
                row = cursor.fetchone()
                if not row:
                    raise PayableNotFoundError("External supplier payable record not found or not accessible.")

                (
                    r_id, pr_id, wh_id, rec_ref_no,
                    tot_rcvd, rcvd_good, rcvd_bad, price_kg, tot_price, r_status, r_at,
                    sup_biz, sup_contact, prod_name, ord_qty, fpay_id, fpay_paid_at
                ) = row

                if fpay_paid_at is not None or str(r_status or "").lower() == "paid":
                    raise AlreadyPaidError("This receiving record has already been marked as Paid.")

                amount_to_pay = float(tot_price or 0.0)

                ext_batch_no = f"PR-{pr_id:04d}" if pr_id else f"BATCH-{receiving_id}"
                canonical_rec_ref = normalize_receiving_reference(
                    existing_ref=rec_ref_no,
                    batch_no=ext_batch_no,
                    business_name=sup_biz or sup_contact or "External Supplier",
                    contact_person=sup_contact or sup_biz or "Supplier Contact",
                    dt=r_at or datetime.datetime.now(),
                    fallback_id=receiving_id,
                )

                if norm_method == "Cash":
                    final_reference = generate_warehouse_cash_reference(
                        contact_person=sup_contact or sup_biz or "External",
                        business_name=wh_biz_name,
                        cursor=cursor,
                        warehouse_profile_id=wh_id,
                    )
                else:
                    ref_input = str(payment_reference or "").strip()
                    if not ref_input:
                        raise ValueError(f"Payment Reference Number is required for {norm_method} payments.")
                    final_reference = ref_input

                receipt_url = _save_receipt_file(receipt_file, wh_id) if receipt_file else None
                now_ts = datetime.datetime.now()

                # Update warehouse_nongrainrise_supplier_receiving_history
                cursor.execute(
                    """
                    UPDATE warehouse_nongrainrise_supplier_receiving_history
                    SET status = 'paid',
                        paid_by_employee_id = %s,
                        receiving_reference_no = %s
                    WHERE receiving_id = %s
                    """,
                    [paid_by_employee_id, canonical_rec_ref, receiving_id],
                )

                # Synchronize warehouse_finance_payables_payment_references
                if fpay_id:
                    cursor.execute(
                        """
                        UPDATE warehouse_finance_payables_payment_references
                        SET payment_method = %s,
                            payment_reference_id = %s,
                            receipt_image_url = COALESCE(%s, receipt_image_url),
                            paid_at = %s,
                            paid_by_employee_id = %s,
                            amount_to_pay = %s
                        WHERE payable_reference_id = %s
                        """,
                        [norm_method, final_reference, receipt_url, now_ts, paid_by_employee_id, amount_to_pay, fpay_id],
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO warehouse_finance_payables_payment_references (
                            nongrainrise_receiving_id,
                            warehouse_profile_id,
                            amount_to_pay,
                            payment_method,
                            payment_reference_id,
                            receipt_image_url,
                            paid_by_employee_id,
                            requested_at,
                            paid_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        [receiving_id, wh_id, amount_to_pay, norm_method, final_reference, receipt_url, paid_by_employee_id, now_ts, now_ts],
                    )

                tot_good = float(rcvd_good or tot_rcvd or 0.0)
                price_val = float(price_kg or 0.0)
                if price_val <= 0 and tot_good > 0:
                    price_val = round(amount_to_pay / tot_good, 2)
                supplier_disp = sup_biz or sup_contact or "External Supplier"

                return {
                    "receiving_id": receiving_id,
                    "batch_no": ext_batch_no,
                    "batchNo": ext_batch_no,
                    "reference_no": canonical_rec_ref,
                    "receiving_reference_no": canonical_rec_ref,
                    "variant": prod_name or "Palay Grain",
                    "product_name": prod_name or "Palay Grain",
                    "supplier": supplier_disp,
                    "supplier_type": "external_supplier",
                    "supplier_type_label": "External Supplier",
                    "original_order_quantity": f"{float(ord_qty or 0):,.2f} kg",
                    "ordered_quantity": float(ord_qty or 0),
                    "total_received": f"{float(tot_rcvd or 0):,.2f} kg",
                    "received_good": f"{tot_good:,.2f} kg",
                    "received_bad": f"{float(rcvd_bad or 0):,.2f} kg",
                    "unit_price": f"₱ {price_val:,.2f}",
                    "price_per_kg": f"₱ {price_val:,.2f}",
                    "amount_to_pay": f"₱ {amount_to_pay:,.2f}",
                    "payable": f"₱ {amount_to_pay:,.2f}",
                    "total": f"₱ {amount_to_pay:,.2f}",
                    "total_raw": amount_to_pay,
                    "total_price": amount_to_pay,
                    "received_date": _format_date(r_at),
                    "received_at": str(r_at or ""),
                    "requested_date": _format_date(r_at),
                    "requested_at_formatted": _format_date_time(r_at),
                    "paid_date": now_ts.strftime("%b %d, %Y"),
                    "paid_at": now_ts.strftime("%b %d, %Y %I:%M %p"),
                    "paid_at_formatted": now_ts.strftime("%b %d, %Y %I:%M %p"),
                    "paid_by": payer_name or "Warehouse Finance",
                    "payment_method": norm_method,
                    "payment_reference": final_reference,
                    "payment_reference_id": final_reference,
                    "payment_reference_number": final_reference,
                    "business_name": wh_biz_name,
                    "business_address": wh_address,
                    "business_contact": wh_contact,
                    "is_paid": True,
                    "status": "Paid",
                }


def initiate_xendit_payment(
    warehouse_profile_ids,
    receiving_id,
    payment_method,
    paid_by_employee_id=None,
    payer_name=None,
    business_name=None,
    bank_channel=None,
):
    """
    Initiate money-in payment session via Xendit Payment Requests API for Registered Millers.
    Strictly checks that the order is not already paid and has no active payment attempt.
    """
    if not warehouse_profile_ids:
        raise PayableNotFoundError("No accessible warehouse branch found.")

    method_clean = str(payment_method or "").strip().lower()
    if method_clean not in ("gcash", "bank"):
        raise ValueError("Xendit online payment is only supported for GCash and Bank methods.")

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                rh.receiving_id,
                rh.online_order_id,
                rh.supplier_profile_id,
                rh.warehouse_buyer_id,
                rh.payables,
                rh.status,
                moc.batch_no,
                sp.business_name AS supplier_business_name,
                fpay.payable_reference_id,
                fpay.paid_at
            FROM miller_online_customer_receiving_history rh
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = rh.online_order_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = rh.supplier_profile_id
            LEFT JOIN warehouse_finance_payables_payment_references fpay
                ON fpay.miller_receiving_id = rh.receiving_id
            WHERE rh.receiving_id = %s
              AND (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
            LIMIT 1
            """,
            [receiving_id] + list(warehouse_profile_ids) + list(warehouse_profile_ids),
        )
        row = cursor.fetchone()
        if not row:
            raise PayableNotFoundError("Registered Miller payable not found.")

        (
            r_id, o_id, sp_id, wh_buyer_id, payable_amt, r_status,
            batch_no, sup_biz, fpay_id, fpay_paid_at
        ) = row

        effective_wh_id = wh_buyer_id or warehouse_profile_ids[0]

        if fpay_paid_at is not None or str(r_status or "").lower() == "paid":
            raise AlreadyPaidError("This receiving record has already been marked as Paid.")

        # Check existing active attempt
        cursor.execute(
            """
            SELECT payment_attempt_id, reference_id, payment_status, payment_link_url, amount
            FROM warehouse_miller_purchase_xendit_payment_tracking
            WHERE online_order_id = %s
              AND payment_status IN ('CREATED', 'PENDING')
            ORDER BY payment_attempt_id DESC
            LIMIT 1
            """,
            [o_id],
        )
        active_attempt = cursor.fetchone()
        if active_attempt:
            return {
                "success": True,
                "is_active_attempt": True,
                "payment_attempt_id": active_attempt[0],
                "reference_id": active_attempt[1],
                "payment_status": active_attempt[2],
                "payment_link_url": active_attempt[3],
                "amount": float(active_attempt[4]),
                "message": "An active payment session is already in progress for this order.",
            }

        amount_val = float(payable_amt or 0.0)
        xendit_cfg = get_xendit_config()
        secret_key = xendit_cfg["secret_key"]

        unique_ref = f"WH-PAY-{effective_wh_id}-{o_id}-{datetime.datetime.now().strftime('%m%d%Y%H%M')}-{secrets.token_hex(2).upper()}"
        idempotency_key = str(uuid.uuid4())

        xendit_payment_request_id = None
        payment_link_url = None
        channel_code = "GCASH" if method_clean == "gcash" else (bank_channel or "PH_BDO")

        if secret_key:
            try:
                # Prepare Xendit Payment Request payload
                # In Xendit API, EWALLET or DIRECT_DEBIT
                payload = {
                    "currency": "PHP",
                    "amount": amount_val,
                    "reference_id": unique_ref,
                    "payment_method": {
                        "type": "EWALLET" if method_clean == "gcash" else "DIRECT_DEBIT",
                        "reusability": "ONE_TIME_USE",
                        **({
                            "ewallet": {
                                "channel_code": "GCASH",
                                "channel_properties": {
                                    "success_return_url": "http://localhost:5173/warehouse-manager/payables?status=success",
                                    "failure_return_url": "http://localhost:5173/warehouse-manager/payables?status=failed",
                                    "cancel_return_url": "http://localhost:5173/warehouse-manager/payables?status=cancelled",
                                },
                            }
                        } if method_clean == "gcash" else {
                            "direct_debit": {
                                "channel_code": channel_code,
                                "channel_properties": {
                                    "success_return_url": "http://localhost:5173/warehouse-manager/payables?status=success",
                                    "failure_return_url": "http://localhost:5173/warehouse-manager/payables?status=failed",
                                },
                            }
                        }),
                    },
                    "description": f"GrainRise Grain Purchase - Batch {batch_no}",
                }

                resp = requests.post(
                    XENDIT_PAYMENT_REQUESTS_URL,
                    auth=(secret_key, ""),
                    json=payload,
                    headers={"idempotency-key": idempotency_key},
                    timeout=15,
                )

                if resp.status_code in (200, 201):
                    xdata = resp.json()
                    xendit_payment_request_id = xdata.get("id")
                    # Extract redirect or checkout url from actions
                    actions = xdata.get("actions", [])
                    for act in actions:
                        if act.get("url"):
                            payment_link_url = act.get("url")
                            break
                    if not payment_link_url:
                        payment_link_url = xdata.get("checkout_url")
                else:
                    logger.warning("Xendit API returned %s: %s", resp.status_code, resp.text)
            except Exception as ex:
                logger.exception("Failed to connect to Xendit API: %s", ex)

        # Fallback for Sandbox / QA simulation when external gateway redirect is bypassed
        if not payment_link_url:
            payment_link_url = f"https://checkout.xendit.co/web/{unique_ref}"

        # Insert tracking record
        cursor.execute(
            """
            INSERT INTO warehouse_miller_purchase_xendit_payment_tracking (
                online_order_id,
                payable_reference_id,
                warehouse_profile_id,
                initiated_by_employee_id,
                amount,
                currency,
                xendit_environment,
                reference_id,
                idempotency_key,
                xendit_payment_request_id,
                payment_link_url,
                channel_code,
                payment_status
            ) VALUES (%s, %s, %s, %s, %s, 'PHP', %s, %s, %s, %s, %s, %s, 'PENDING')
            """,
            [
                o_id,
                fpay_id,
                effective_wh_id,
                paid_by_employee_id,
                amount_val,
                xendit_cfg["mode"],
                unique_ref,
                idempotency_key,
                xendit_payment_request_id,
                payment_link_url,
                channel_code,
            ],
        )
        attempt_id = cursor.lastrowid

        return {
            "success": True,
            "payment_attempt_id": attempt_id,
            "reference_id": unique_ref,
            "payment_status": "PENDING",
            "payment_link_url": payment_link_url,
            "amount": amount_val,
            "channel_code": channel_code,
            "is_sandbox": xendit_cfg["is_sandbox"],
            "message": "Payment session created. Complete payment via the payment link or simulate in sandbox.",
        }


def reconcile_xendit_payment(
    warehouse_profile_ids,
    receiving_id,
    simulate_sandbox_success=False,
    payer_name=None,
    business_name=None,
):
    """
    Check latest status of active Xendit payment attempt.
    If SUCCEEDED (or simulate_sandbox_success in sandbox mode):
    - Updates tracking to PAID
    - Marks receiving history and payable as Paid
    - Synchronizes seller payment records
    - Returns official receipt snapshot
    """
    if not warehouse_profile_ids:
        raise PayableNotFoundError("No accessible warehouse branch found.")

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                rh.receiving_id,
                rh.online_order_id,
                rh.supplier_profile_id,
                rh.warehouse_buyer_id,
                rh.receiving_reference_no,
                rh.total_received,
                rh.received_good,
                rh.received_bad,
                rh.payables,
                rh.status,
                rh.received_at,
                moc.batch_no,
                moc.ordered_quantity,
                sp.business_name AS supplier_business_name,
                sp.organization_name AS supplier_org_name,
                mp.product_name,
                xpt.payment_attempt_id,
                xpt.reference_id,
                xpt.channel_code,
                xpt.amount,
                xpt.xendit_payment_request_id,
                xpt.payment_status,
                xpt.initiated_by_employee_id
            FROM miller_online_customer_receiving_history rh
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = rh.online_order_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = rh.supplier_profile_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            INNER JOIN warehouse_miller_purchase_xendit_payment_tracking xpt
                ON xpt.online_order_id = moc.online_order_id
            WHERE rh.receiving_id = %s
              AND (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
            ORDER BY xpt.payment_attempt_id DESC
            LIMIT 1
            """,
            [receiving_id] + list(warehouse_profile_ids) + list(warehouse_profile_ids),
        )
        row = cursor.fetchone()
        if not row:
            raise PayableNotFoundError("No payment tracking record found for this payable.")

        (
            r_id, o_id, sp_id, wh_buyer_id, rec_ref_no,
            tot_rcvd, rcvd_good, rcvd_bad, payable_amt, r_status, r_at,
            batch_no, ord_qty, sup_biz, sup_org, prod_name,
            attempt_id, ref_id, ch_code, amount_val, req_id, p_stat, emp_id
        ) = row

        effective_wh_id = wh_buyer_id or warehouse_profile_ids[0]
        xendit_cfg = get_xendit_config()

        is_succeeded = False

        if simulate_sandbox_success and xendit_cfg["is_sandbox"]:
            is_succeeded = True
        elif req_id and xendit_cfg["secret_key"]:
            try:
                resp = requests.get(
                    f"{XENDIT_PAYMENT_REQUESTS_URL}/{req_id}",
                    auth=(xendit_cfg["secret_key"], ""),
                    timeout=10,
                )
                if resp.status_code == 200:
                    xstatus = str(resp.json().get("status", "")).upper()
                    if xstatus in ("SUCCEEDED", "PAID"):
                        is_succeeded = True
                    elif xstatus in ("FAILED", "EXPIRED"):
                        cursor.execute(
                            """
                            UPDATE warehouse_miller_purchase_xendit_payment_tracking
                            SET payment_status = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE payment_attempt_id = %s
                            """,
                            [xstatus, attempt_id],
                        )
                        return {
                            "success": True,
                            "is_paid": False,
                            "payment_status": xstatus,
                            "message": f"Payment {xstatus.lower()}. You may attempt payment again.",
                        }
            except Exception as ex:
                logger.warning("Error querying Xendit status: %s", ex)

        if not is_succeeded:
            return {
                "success": True,
                "is_paid": False,
                "payment_status": p_stat,
                "message": "Payment is still pending confirmation from the bank or e-wallet.",
            }

        # Mark paid atomically
        now_ts = datetime.datetime.now()
        amount_to_pay = float(amount_val or payable_amt or 0.0)
        norm_method = "GCash" if "gcash" in str(ch_code).lower() else "Bank"

        with transaction.atomic():
            # Update tracking
            cursor.execute(
                """
                UPDATE warehouse_miller_purchase_xendit_payment_tracking
                SET payment_status = 'PAID',
                    paid_at = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE payment_attempt_id = %s
                """,
                [now_ts, attempt_id],
            )

            canonical_rec_ref = normalize_receiving_reference(
                existing_ref=rec_ref_no,
                batch_no=batch_no,
                business_name=sup_biz or sup_org or "Registered Miller",
                contact_person=sup_contact or sup_biz or "Miller Contact",
                dt=r_at or datetime.datetime.now(),
                fallback_id=receiving_id,
            )

            # Retrieve warehouse profile details for receipt header
            cursor.execute(
                """
                SELECT business_name, organization_name, street_address, barangay, municipality, province, postal_code, official_contact_number, official_email
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s
                LIMIT 1
                """,
                [warehouse_profile_ids[0]],
            )
            wh_prof = cursor.fetchone()
            if wh_prof:
                wh_biz_name = wh_prof[0] or wh_prof[1] or "GrainRise Warehouse"
                wh_address = format_business_address(wh_prof[2], wh_prof[3], wh_prof[4], wh_prof[5], wh_prof[6])
                wh_contact = format_business_contact(wh_prof[7], wh_prof[8])
            else:
                wh_biz_name = "GrainRise Warehouse"
                wh_address = "Address Not Provided"
                wh_contact = "Contact Not Provided"

            # Update receiving history
            cursor.execute(
                """
                UPDATE miller_online_customer_receiving_history
                SET status = 'Paid',
                    receiving_reference_no = %s
                WHERE receiving_id = %s
                """,
                [canonical_rec_ref, receiving_id],
            )

            # Update online order
            cursor.execute(
                """
                UPDATE miller_online_customer
                SET status = 'Delivered', updated_at = CURRENT_TIMESTAMP
                WHERE online_order_id = %s
                """,
                [o_id],
            )

            # Synchronize miller_online_orders_payment
            cursor.execute(
                """
                SELECT cod_id FROM miller_online_orders_payment
                WHERE online_order_id = %s
                LIMIT 1
                """,
                [o_id],
            )
            p_row = cursor.fetchone()
            if p_row:
                cod_id = p_row[0]
                cursor.execute(
                    """
                    UPDATE miller_online_orders_payment
                    SET payment_reference = %s,
                        amount = %s,
                        payment_method = %s,
                        status = 'Paid'
                    WHERE cod_id = %s
                    """,
                    [ref_id, amount_to_pay, norm_method, cod_id],
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO miller_online_orders_payment (
                        supplier_profile_id,
                        warehouse_payer_id,
                        online_order_id,
                        payment_reference,
                        amount,
                        payment_method,
                        status
                    ) VALUES (%s, %s, %s, %s, %s, %s, 'Paid')
                    """,
                    [sp_id, effective_wh_id, o_id, ref_id, amount_to_pay, norm_method],
                )
                cod_id = cursor.lastrowid

            # Synchronize warehouse_finance_payables_payment_references
            cursor.execute(
                """
                SELECT payable_reference_id
                FROM warehouse_finance_payables_payment_references
                WHERE miller_receiving_id = %s
                LIMIT 1
                """,
                [receiving_id],
            )
            fpay_row = cursor.fetchone()
            if fpay_row:
                cursor.execute(
                    """
                    UPDATE warehouse_finance_payables_payment_references
                    SET payment_method = %s,
                        payment_reference_id = %s,
                        paid_at = %s,
                        paid_by_employee_id = %s,
                        amount_to_pay = %s,
                        miller_online_payment_id = %s
                    WHERE payable_reference_id = %s
                    """,
                    [norm_method, ref_id, now_ts, emp_id, amount_to_pay, cod_id, fpay_row[0]],
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO warehouse_finance_payables_payment_references (
                        miller_receiving_id,
                        warehouse_profile_id,
                        amount_to_pay,
                        miller_online_payment_id,
                        payment_method,
                        payment_reference_id,
                        paid_by_employee_id,
                        requested_at,
                        paid_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [receiving_id, effective_wh_id, amount_to_pay, cod_id, norm_method, ref_id, emp_id, now_ts, now_ts],
                )

        tot_good = float(rcvd_good or tot_rcvd or 0.0)
        price_kg = round(amount_to_pay / tot_good, 2) if tot_good > 0 else 0.0
        supplier_disp = sup_biz or sup_org or "Registered Miller"

        return {
            "success": True,
            "is_paid": True,
            "message": "Payment verified and synchronized successfully.",
            "data": {
                "receiving_id": receiving_id,
                "order_id": o_id,
                "batch_no": batch_no or f"BATCH-{receiving_id}",
                "batchNo": batch_no or f"BATCH-{receiving_id}",
                "reference_no": canonical_rec_ref,
                "receiving_reference_no": canonical_rec_ref,
                "variant": prod_name or "Grain Product",
                "product_name": prod_name or "Grain Product",
                "supplier": supplier_disp,
                "supplier_type": "registered_miller",
                "supplier_type_label": "Registered Miller",
                "original_order_quantity": f"{float(ord_qty or 0):,.2f} kg",
                "ordered_quantity": float(ord_qty or 0),
                "total_received": f"{float(tot_rcvd or 0):,.2f} kg",
                "received_good": f"{tot_good:,.2f} kg",
                "received_bad": f"{float(rcvd_bad or 0):,.2f} kg",
                "unit_price": f"₱ {price_kg:,.2f}",
                "price_per_kg": f"₱ {price_kg:,.2f}",
                "amount_to_pay": f"₱ {amount_to_pay:,.2f}",
                "payable": f"₱ {amount_to_pay:,.2f}",
                "total": f"₱ {amount_to_pay:,.2f}",
                "total_raw": amount_to_pay,
                "total_price": amount_to_pay,
                "received_date": _format_date(r_at),
                "received_at": str(r_at or ""),
                "requested_date": _format_date(r_at),
                "requested_at_formatted": _format_date_time(r_at),
                "paid_date": now_ts.strftime("%b %d, %Y"),
                "paid_at": now_ts.strftime("%b %d, %Y %I:%M %p"),
                "paid_at_formatted": now_ts.strftime("%b %d, %Y %I:%M %p"),
                "paid_by": payer_name or "Warehouse Finance",
                "payment_method": norm_method,
                "payment_reference": ref_id,
                "payment_reference_id": ref_id,
                "payment_reference_number": ref_id,
                "business_name": wh_biz_name,
                "business_address": wh_address,
                "business_contact": wh_contact,
                "is_paid": True,
                "status": "Paid",
            },
        }


def cancel_pending_attempt(warehouse_profile_ids, receiving_id):
    """
    Cancel an abandoned or pending payment attempt so a fresh payment attempt can be initiated.
    """
    if not warehouse_profile_ids:
        raise PayableNotFoundError("No accessible warehouse branch found.")

    placeholders = ",".join(["%s"] * len(warehouse_profile_ids))

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT xpt.payment_attempt_id
            FROM warehouse_miller_purchase_xendit_payment_tracking xpt
            INNER JOIN miller_online_customer moc ON moc.online_order_id = xpt.online_order_id
            INNER JOIN miller_online_customer_receiving_history rh ON rh.online_order_id = moc.online_order_id
            WHERE rh.receiving_id = %s
              AND (rh.warehouse_buyer_id IN ({placeholders}) OR moc.warehouse_buyer_id IN ({placeholders}))
              AND xpt.payment_status IN ('CREATED', 'PENDING')
            """,
            [receiving_id] + list(warehouse_profile_ids) + list(warehouse_profile_ids),
        )
        rows = cursor.fetchall()
        for r in rows:
            cursor.execute(
                """
                UPDATE warehouse_miller_purchase_xendit_payment_tracking
                SET payment_status = 'EXPIRED', failure_reason = 'Cancelled by user', updated_at = CURRENT_TIMESTAMP
                WHERE payment_attempt_id = %s
                """,
                [r[0]],
            )

    return True


def process_xendit_webhook(request_body: dict, callback_token_header: str) -> bool:
    """
    Process incoming Xendit webhook notification for payment success.
    """
    cfg = get_xendit_config()
    if cfg["callback_token"] and callback_token_header != cfg["callback_token"]:
        logger.warning("Invalid Xendit callback token in webhook header.")
        return False

    data = request_body.get("data") or request_body
    event = request_body.get("event") or ""
    req_id = data.get("payment_request_id") or data.get("id")
    ref_id = data.get("reference_id")
    status = str(data.get("status", "")).upper()

    if status not in ("SUCCEEDED", "PAID") and "succeeded" not in event.lower():
        return True

    if not req_id and not ref_id:
        return False

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT xpt.payment_attempt_id, rh.receiving_id
            FROM warehouse_miller_purchase_xendit_payment_tracking xpt
            INNER JOIN miller_online_customer moc ON moc.online_order_id = xpt.online_order_id
            INNER JOIN miller_online_customer_receiving_history rh ON rh.online_order_id = moc.online_order_id
            WHERE (xpt.xendit_payment_request_id = %s OR xpt.reference_id = %s)
              AND xpt.payment_status IN ('CREATED', 'PENDING')
            LIMIT 1
            """,
            [req_id, ref_id],
        )
        row = cursor.fetchone()
        if not row:
            return True

        attempt_id, receiving_id = row
        cursor.execute("SELECT warehouse_profile_id FROM warehouse_miller_purchase_xendit_payment_tracking WHERE payment_attempt_id = %s", [attempt_id])
        wh_row = cursor.fetchone()
        wh_id = wh_row[0] if wh_row else 1

        reconcile_xendit_payment([wh_id], receiving_id, simulate_sandbox_success=True)

    return True
