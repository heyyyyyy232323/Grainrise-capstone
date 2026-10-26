import re
from django.db import connection, transaction


def _validate_philippine_phone(value):
    if not value or not str(value).strip():
        return "Contact number is required."
    cleaned = re.sub(r"[\s-]", "", str(value).strip())
    if not re.match(r"^(\+639\d{9}|639\d{9}|09\d{9})$", cleaned):
        return "Contact number must be a valid Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX)."
    return None


def _validate_email(value):
    if not value or not str(value).strip():
        return None
    val = str(value).strip()
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.\w+$", val):
        return "Enter a valid email address."
    return None


def create_nongrainrise_miller(
    *,
    warehouse_user_id,
    warehouse_profile_id,
    business_name,
    business_address,
    contact_person,
    contact_number,
    email=None,
    status="active",
):
    """
    Create a new external Non-GRAINRISE Miller contact.
    """
    # 1. Verify owned branch
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT warehouse_profile_id
            FROM warehouse_profiles
            WHERE warehouse_profile_id = %s AND user_id = %s
            LIMIT 1
            """,
            [warehouse_profile_id, warehouse_user_id],
        )
        if not cursor.fetchone():
            raise ValueError("Selected warehouse branch is invalid or not owned by you.")

    # 2. Validation
    b_name = (business_name or "").strip()
    if not b_name:
        raise ValueError("Business / Branch Name is required.")

    b_addr = (business_address or "").strip()
    if not b_addr:
        raise ValueError("Business Address is required.")

    cp = (contact_person or "").strip()
    if not cp:
        raise ValueError("Contact Person is required.")

    cn_err = _validate_philippine_phone(contact_number)
    if cn_err:
        raise ValueError(cn_err)
    cleaned_phone = re.sub(r"[\s-]", "", str(contact_number).strip())

    em = (email or "").strip() or None
    if em:
        em_err = _validate_email(em)
        if em_err:
            raise ValueError(em_err)

    clean_status = (status or "active").strip().lower()
    if clean_status not in ("active", "inactive"):
        raise ValueError("Status must be either 'active' or 'inactive'.")

    # 3. Insert into database
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO warehouse_nongrainrise_supplier_contacts (
                    warehouse_profile_id,
                    business_name,
                    business_address,
                    contact_person,
                    contact_number,
                    email,
                    status,
                    created_at,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """,
                [
                    warehouse_profile_id,
                    b_name,
                    b_addr,
                    cp,
                    cleaned_phone,
                    em,
                    clean_status,
                ],
            )
            created_id = cursor.lastrowid

    return {
        "warehouse_nongrainrise_supplier_contact_id": created_id,
        "id": created_id,
        "warehouse_profile_id": warehouse_profile_id,
        "business_name": b_name,
        "business_address": b_addr,
        "contact_person": cp,
        "contact_number": cleaned_phone,
        "email": em or "",
        "status": clean_status,
    }


def update_nongrainrise_miller(
    *,
    warehouse_user_id,
    contact_id,
    business_name,
    business_address,
    contact_person,
    contact_number,
    email=None,
    status="active",
):
    """
    Update an external Non-GRAINRISE Miller contact.
    """
    # 1. Verify contact exists and belongs to a branch owned by this manager
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT ngsc.warehouse_nongrainrise_supplier_contact_id, ngsc.warehouse_profile_id
            FROM warehouse_nongrainrise_supplier_contacts ngsc
            INNER JOIN warehouse_profiles wp
                ON wp.warehouse_profile_id = ngsc.warehouse_profile_id
            WHERE ngsc.warehouse_nongrainrise_supplier_contact_id = %s
              AND wp.user_id = %s
            LIMIT 1
            """,
            [contact_id, warehouse_user_id],
        )
        existing = cursor.fetchone()
        if not existing:
            raise ValueError("External supplier contact not found or access denied.")

    # 2. Validation
    b_name = (business_name or "").strip()
    if not b_name:
        raise ValueError("Business / Branch Name is required.")

    b_addr = (business_address or "").strip()
    if not b_addr:
        raise ValueError("Business Address is required.")

    cp = (contact_person or "").strip()
    if not cp:
        raise ValueError("Contact Person is required.")

    cn_err = _validate_philippine_phone(contact_number)
    if cn_err:
        raise ValueError(cn_err)
    cleaned_phone = re.sub(r"[\s-]", "", str(contact_number).strip())

    em = (email or "").strip() or None
    if em:
        em_err = _validate_email(em)
        if em_err:
            raise ValueError(em_err)

    clean_status = (status or "active").strip().lower()
    if clean_status not in ("active", "inactive"):
        raise ValueError("Status must be either 'active' or 'inactive'.")

    # 3. Update database
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE warehouse_nongrainrise_supplier_contacts
                SET
                    business_name = %s,
                    business_address = %s,
                    contact_person = %s,
                    contact_number = %s,
                    email = %s,
                    status = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE warehouse_nongrainrise_supplier_contact_id = %s
                """,
                [
                    b_name,
                    b_addr,
                    cp,
                    cleaned_phone,
                    em,
                    clean_status,
                    contact_id,
                ],
            )

    return {
        "warehouse_nongrainrise_supplier_contact_id": contact_id,
        "id": contact_id,
        "business_name": b_name,
        "business_address": b_addr,
        "contact_person": cp,
        "contact_number": cleaned_phone,
        "email": em or "",
        "status": clean_status,
    }


def cancel_grainrise_order(
    *,
    warehouse_user_id,
    online_order_id,
    reason,
):
    """
    Order cancellation service for GRAINRISE Miller online purchases.
    Validates buyer ownership, confirms 'Ordered' status, and enforces
    safe approved cancellation requirements.
    """
    reason_clean = (reason or "").strip()
    if not reason_clean:
        raise ValueError("A non-empty cancellation reason is required.")

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                moc.online_order_id,
                moc.batch_no,
                moc.ordered_quantity,
                moc.status,
                moc.supplier_profile_id,
                mp.product_name
            FROM miller_online_customer moc
            INNER JOIN warehouse_profiles wp
                ON wp.warehouse_profile_id = moc.warehouse_buyer_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            WHERE moc.online_order_id = %s
              AND wp.user_id = %s
            LIMIT 1
            """,
            [online_order_id, warehouse_user_id],
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Order was not found or is not associated with your warehouse branches.")

        current_status = row[3]
        if current_status != "Ordered":
            raise ValueError(
                f"Order cancellation is only permitted while status is 'Ordered'. Current status is '{current_status}'."
            )

    # In accordance with the project cancellation rules:
    # Check if a safe approved cancellation workflow exists.
    # The database schema check constraint (`chk_miller_online_status`) restricts status
    # strictly to ('Add to cart', 'Requested', 'Ordered', 'Processing', 'Assigned to driver',
    # 'In transit', 'Delivered', 'Forwarded to Logistics', 'Declined') and lacks a persistent
    # 'Cancelled' status and automated inventory/payment reversal workflow.
    # Therefore, we safely report the exact blocker.
    return {
        "success": False,
        "allowed": False,
        "blocker": (
            "Order cancellation cannot be completed because the database schema (`chk_miller_online_status`) "
            "does not permit a persistent 'Cancelled' status, and no safe inventory or payment reversal workflow "
            "is currently implemented for online orders. Direct status mutation without stock and payment reversal "
            "is disabled to protect database integrity."
        ),
    }

