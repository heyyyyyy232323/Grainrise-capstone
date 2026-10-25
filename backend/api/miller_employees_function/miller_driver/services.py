"""
Business logic and atomic operations for Miller Driver My Duties and Live Tracking.
Strictly isolated to authenticated branch and driver.
"""

import base64
import os
import re
import uuid
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection, transaction

from .selectors import get_buyer_group_for_tracking, get_driver_duties

PH_TZ = ZoneInfo("Asia/Manila")


class DriverDeliveryError(Exception):
    """Domain exception for driver delivery errors."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _save_data_uri_or_file(file_data: str | None, folder: str = "proof_of_delivery") -> str | None:
    """
    Save base64 data URI or file path to Django media storage.
    """
    if not file_data or not isinstance(file_data, str):
        return None

    trimmed = file_data.strip()
    if not trimmed:
        return None

    # Already a stored path
    if not trimmed.startswith("data:"):
        return trimmed

    match = re.match(r"^data:(image/[a-zA-Z0-9.+]+);base64,(.+)$", trimmed)
    if not match:
        return None

    mime_type = match.group(1).lower()
    raw_b64 = match.group(2)
    ext = "jpg"
    if "png" in mime_type:
        ext = "png"
    elif "webp" in mime_type:
        ext = "webp"

    try:
        binary_data = base64.b64decode(raw_b64)
    except Exception:
        return None

    filename = f"{uuid.uuid4().hex[:16]}.{ext}"
    rel_path = os.path.join(folder, filename)
    saved_path = default_storage.save(rel_path, ContentFile(binary_data))
    return saved_path


def _extract_alpha_words(text: str) -> list[str]:
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", text or "")
    return [w for w in clean.split() if w]


def _build_initials(first_name: str, last_name: str) -> str:
    fn = "".join(c for c in (first_name or "") if c.isalpha()).upper()
    ln = "".join(c for c in (last_name or "") if c.isalpha()).upper()
    f = fn[0] if fn else "X"
    l = ln[0] if ln else "X"
    return f"{f}{l}"


def generate_driver_payment_reference(
    company_name: str,
    driver_first_name: str,
    driver_last_name: str,
    buyer_first_name: str,
    buyer_last_name: str,
    tx_datetime: datetime | None = None,
) -> str:
    """
    Format:
    First Two Words of Milling Company Name + Driver Initials + Payment Date (MMDDYYYY) + Payment Time (HHMM) + Buyer Initials
    """
    if not tx_datetime:
        tx_datetime = datetime.now(PH_TZ)

    # First Two Words of Milling Company Name
    words = _extract_alpha_words(company_name)
    if len(words) >= 2:
        comp_part = (words[0] + words[1]).upper()
    elif len(words) == 1:
        comp_part = (words[0] + "MIL").upper()
    else:
        comp_part = "GRAINRISE"

    driver_in = _build_initials(driver_first_name, driver_last_name)
    buyer_in = _build_initials(buyer_first_name, buyer_last_name)
    date_str = tx_datetime.strftime("%m%d%Y")
    time_str = tx_datetime.strftime("%H%M")

    return f"{comp_part}{driver_in}{date_str}{time_str}{buyer_in}"


def start_driver_live_tracking(
    supplier_profile_id: int,
    driver_id: int,
    buyer_group_key: str,
    latitude: float | None = None,
    longitude: float | None = None,
    driver_first_name: str = "",
    driver_last_name: str = "",
    company_name: str = "",
    owner_user_id: int | None = None,
) -> dict:
    """
    When Driver starts Live Tracking:
    1. Update miller_online_customer.status from Assigned to driver to In transit.
    2. Keep miller_driver_assignment.status = 'Pending'.
    3. Update/insert miller_last_ping with status = 'inactive' (tracking inside module).
    4. Automatically send delivery introduction message to buyer if not already sent.
    """
    buyer_group = get_buyer_group_for_tracking(supplier_profile_id, driver_id, buyer_group_key=buyer_group_key)
    if not buyer_group or not buyer_group["orders"]:
        raise DriverDeliveryError("No active assigned orders found for this buyer group.", 404)

    orders = buyer_group["orders"]
    order_ids = [o["online_order_id"] for o in orders]
    assignment_ids = [o["assignment_id"] for o in orders]
    customer_type = buyer_group["customer_type"]
    buyer_id = buyer_group["buyer_id"]

    now = datetime.now(PH_TZ)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Update online customer status to 'In transit' if currently 'Assigned to driver'
            placeholders = ",".join(["%s"] * len(order_ids))
            cursor.execute(
                f"""
                UPDATE miller_online_customer
                SET status = 'In transit', updated_at = NOW()
                WHERE supplier_profile_id = %s
                  AND online_order_id IN ({placeholders})
                  AND status = 'Assigned to driver'
                """,
                [supplier_profile_id, *order_ids],
            )

            # 2. Maintain / upsert miller_last_ping for all assignments
            # Note: assignment_id has a UNIQUE key in miller_last_ping
            for asg_id in assignment_ids:
                cursor.execute(
                    """
                    INSERT INTO miller_last_ping (
                        supplier_profile_id,
                        driver_id,
                        assignment_id,
                        latitude,
                        longitude,
                        last_ping_at,
                        status
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), 'inactive')
                    ON DUPLICATE KEY UPDATE
                        latitude = COALESCE(%s, latitude),
                        longitude = COALESCE(%s, longitude),
                        last_ping_at = NOW(),
                        status = 'inactive'
                    """,
                    [
                        supplier_profile_id,
                        driver_id,
                        asg_id,
                        latitude,
                        longitude,
                        latitude,
                        longitude,
                    ],
                )

        # 3. Automatic Delivery Introduction Message
        # One message per buyer group, listing relevant batch numbers.
        # Check deduplication to prevent duplicate introductions.
        batch_numbers = [o["batch_no"] for o in orders]
        intro_content = (
            f"Hello! I'm {driver_first_name} {driver_last_name} from {company_name or 'GrainRise Milling'}. "
            f"I'll be delivering the following orders to you:\n\n"
            + "\n".join(f"{idx + 1}. {b}" for idx, b in enumerate(batch_numbers))
        )

        with connection.cursor() as cursor:
            # Check if an intro message has already been sent for these batches
            check_sql = """
                SELECT message_id FROM messages
                WHERE sender_supplier_profile_id = %s
                  AND %s = %s
                  AND message_content LIKE %s
                LIMIT 1
            """
            target_col = "receiver_user_id" if customer_type == "Retailer" else "receiver_warehouse_profile_id"
            check_sql = f"""
                SELECT message_id FROM messages
                WHERE sender_supplier_profile_id = %s
                  AND {target_col} = %s
                  AND message_content LIKE %s
                LIMIT 1
            """
            first_batch = batch_numbers[0] if batch_numbers else ""
            cursor.execute(check_sql, [supplier_profile_id, buyer_id, f"%{first_batch}%"])
            already_sent = cursor.fetchone()

            if not already_sent and batch_numbers:
                rx_user_id = buyer_id if customer_type == "Retailer" else None
                rx_warehouse_id = buyer_id if customer_type == "Warehouse" else None
                cursor.execute(
                    """
                    INSERT INTO messages (
                        sender_supplier_profile_id,
                        receiver_supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        sender_warehouse_profile_id,
                        receiver_warehouse_profile_id,
                        message_content,
                        created_at
                    ) VALUES (%s, NULL, %s, %s, NULL, %s, %s, NOW())
                    """,
                    [
                        supplier_profile_id,
                        owner_user_id,
                        rx_user_id,
                        rx_warehouse_id,
                        intro_content,
                    ],
                )

    return {
        "success": True,
        "message": "Live tracking started successfully.",
        "order_ids": order_ids,
        "assignment_ids": assignment_ids,
    }


def record_driver_live_ping(
    supplier_profile_id: int,
    driver_id: int,
    assignment_ids: list[int],
    latitude: float,
    longitude: float,
) -> dict:
    """
    Record current GPS coordinates while driver remains inside Live Tracking module.
    Status remains 'inactive' (meaning active live stream).
    """
    if not assignment_ids:
        return {"success": False, "message": "No assignments provided."}

    with connection.cursor() as cursor:
        for asg_id in assignment_ids:
            cursor.execute(
                """
                INSERT INTO miller_last_ping (
                    supplier_profile_id,
                    driver_id,
                    assignment_id,
                    latitude,
                    longitude,
                    last_ping_at,
                    status
                ) VALUES (%s, %s, %s, %s, %s, NOW(), 'inactive')
                ON DUPLICATE KEY UPDATE
                    latitude = %s,
                    longitude = %s,
                    last_ping_at = NOW(),
                    status = 'inactive'
                """,
                [
                    supplier_profile_id,
                    driver_id,
                    asg_id,
                    latitude,
                    longitude,
                    latitude,
                    longitude,
                ],
            )

    return {"success": True, "message": "Ping recorded."}


def exit_driver_live_tracking(
    supplier_profile_id: int,
    driver_id: int,
    assignment_ids: list[int],
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict:
    """
    When Driver exits Live Tracking:
    Save latest available coordinates, timestamp, and set last-ping status to 'active'
    so the buyer can see the saved last-known location.
    Does NOT revert order status.
    """
    if not assignment_ids:
        return {"success": True, "message": "No assignments to update."}

    with connection.cursor() as cursor:
        for asg_id in assignment_ids:
            if latitude is not None and longitude is not None:
                cursor.execute(
                    """
                    INSERT INTO miller_last_ping (
                        supplier_profile_id,
                        driver_id,
                        assignment_id,
                        latitude,
                        longitude,
                        last_ping_at,
                        status
                    ) VALUES (%s, %s, %s, %s, %s, NOW(), 'active')
                    ON DUPLICATE KEY UPDATE
                        latitude = %s,
                        longitude = %s,
                        last_ping_at = NOW(),
                        status = 'active'
                    """,
                    [
                        supplier_profile_id,
                        driver_id,
                        asg_id,
                        latitude,
                        longitude,
                        latitude,
                        longitude,
                    ],
                )
            else:
                cursor.execute(
                    """
                    UPDATE miller_last_ping
                    SET status = 'active', last_ping_at = NOW()
                    WHERE supplier_profile_id = %s
                      AND driver_id = %s
                      AND assignment_id = %s
                    """,
                    [supplier_profile_id, driver_id, asg_id],
                )

    return {"success": True, "message": "Live tracking exited; last ping activated."}


def complete_driver_delivery(
    supplier_profile_id: int,
    driver_id: int,
    buyer_group_key: str,
    proof_of_delivery_data: str | None = None,
    cod_data: dict | None = None,
    driver_employee: dict | None = None,
    order_ids: list[int] | None = None,
) -> dict:
    """
    Atomic Mark as Delivered:
    1. Online Payment: save proof_of_delivery to miller_driver_assignment.
    2. Retailer COD:
       - Insert into miller_online_customer_cash_on_delivery with Handled status and shared cod_transaction_key.
       - Generate proper payment reference format.
    3. Update miller_online_customer.status = 'Delivered'.
    4. Update miller_driver_assignment.status = 'Done'.
    5. Stop active GPS tracking session in miller_last_ping if all group orders are completed.
    6. Strictly NO insert into miller_online_customer_receiving_history.
    """
    buyer_group = get_buyer_group_for_tracking(supplier_profile_id, driver_id, buyer_group_key=buyer_group_key)
    if not buyer_group or not buyer_group["orders"]:
        raise DriverDeliveryError("No active assigned orders found for this delivery.", 404)

    all_orders = buyer_group["orders"]
    if order_ids:
        target_set = {int(x) for x in order_ids}
        orders = [o for o in all_orders if int(o["online_order_id"]) in target_set]
        if not orders:
            raise DriverDeliveryError("None of the specified orders were found in this delivery.", 404)
    else:
        orders = all_orders

    completed_order_ids = [o["online_order_id"] for o in orders]
    completed_assignment_ids = [o["assignment_id"] for o in orders]
    customer_type = buyer_group["customer_type"]

    # Separate COD orders vs Prepaid orders
    cod_orders = [o for o in orders if o["payment_method"] == "Cash on Delivery"]
    has_cod = len(cod_orders) > 0 and customer_type == "Retailer"
    has_prepaid = any(o["payment_method"] != "Cash on Delivery" for o in orders)

    # Handle Proof of Delivery file
    pod_saved_path = None
    if proof_of_delivery_data:
        pod_saved_path = _save_data_uri_or_file(proof_of_delivery_data, folder="proof_of_delivery")

    if has_prepaid and not pod_saved_path and not has_cod:
        raise DriverDeliveryError("Proof of delivery is required for prepaid Online Payment orders.", 400)

    tx_time = datetime.now(PH_TZ)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Retailer COD Handling
            payment_reference_no = None
            if has_cod:
                if not cod_data:
                    raise DriverDeliveryError("COD payment information is required for Cash on Delivery orders.", 400)

                payment_method = cod_data.get("payment_method") or "Cash"
                if payment_method not in ("Cash", "GCash", "Bank"):
                    payment_method = "Cash"

                total_amount_due = sum(Decimal(str(o["total_price"])) for o in cod_orders)
                amount_paid = Decimal(str(cod_data.get("amount_paid") or total_amount_due))
                if amount_paid < total_amount_due:
                    raise DriverDeliveryError(
                        f"Amount paid (₱{amount_paid:,.2f}) cannot be less than total amount due (₱{total_amount_due:,.2f}).",
                        400,
                    )
                change_val = max(Decimal("0.00"), amount_paid - total_amount_due)

                cod_transaction_key = str(uuid.uuid4())

                receipt_photo_data = cod_data.get("receipt_photo")
                receipt_photo_path = None
                if receipt_photo_data:
                    receipt_photo_path = _save_data_uri_or_file(receipt_photo_data, folder="cod_receipts")

                external_ref = cod_data.get("external_payment_reference_no")

                # Generate or accept official Payment Reference
                provided_ref = (cod_data.get("payment_reference_no") or "").strip()
                if provided_ref:
                    payment_reference_no = provided_ref
                else:
                    company_name = (driver_employee or {}).get("business_name")
                    if not company_name:
                        cursor.execute(
                            "SELECT business_name FROM supplier_profiles WHERE supplier_profile_id = %s LIMIT 1",
                            [supplier_profile_id],
                        )
                        c_row = cursor.fetchone()
                        if c_row and c_row[0]:
                            company_name = c_row[0]
                    if not company_name:
                        company_name = "GrainRise Milling"

                    driver_fn = (driver_employee or {}).get("first_name") or ""
                    driver_ln = (driver_employee or {}).get("last_name") or ""
                    if not driver_fn and not driver_ln:
                        cursor.execute(
                            "SELECT first_name, last_name FROM supplier_employees WHERE supplier_employee_id = %s LIMIT 1",
                            [driver_id],
                        )
                        d_row = cursor.fetchone()
                        if d_row:
                            driver_fn = d_row[0] or ""
                            driver_ln = d_row[1] or ""

                    buyer_name = buyer_group["customer_name"]
                    buyer_parts = buyer_name.split()
                    buyer_fn = buyer_parts[0] if buyer_parts else "C"
                    buyer_ln = buyer_parts[-1] if len(buyer_parts) > 1 else "U"

                    payment_reference_no = generate_driver_payment_reference(
                        company_name=company_name,
                        driver_first_name=driver_fn,
                        driver_last_name=driver_ln,
                        buyer_first_name=buyer_fn,
                        buyer_last_name=buyer_ln,
                        tx_datetime=tx_time,
                    )

                for o in cod_orders:
                    cursor.execute(
                        """
                        INSERT INTO miller_online_customer_cash_on_delivery (
                            cod_transaction_key,
                            online_order_id,
                            supplier_profile_id,
                            driver_id,
                            payment_method,
                            total,
                            amount_paid,
                            `change`,
                            payment_reference_no,
                            external_payment_reference_no,
                            receipt_photo,
                            status,
                            handled_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Handled', NOW()
                        )
                        """,
                        [
                            cod_transaction_key,
                            o["online_order_id"],
                            supplier_profile_id,
                            driver_id,
                            payment_method,
                            o["total_price"],
                            amount_paid,
                            change_val,
                            payment_reference_no,
                            external_ref,
                            receipt_photo_path,
                        ],
                    )

            # 2. Update assignments to 'Done' and attach proof of delivery
            asg_placeholders = ",".join(["%s"] * len(completed_assignment_ids))
            if pod_saved_path:
                cursor.execute(
                    f"""
                    UPDATE miller_driver_assignment
                    SET status = 'Done',
                        proof_of_delivery = %s,
                        updated_at = NOW()
                    WHERE supplier_profile_id = %s
                      AND assignment_id IN ({asg_placeholders})
                    """,
                    [pod_saved_path, supplier_profile_id, *completed_assignment_ids],
                )
            else:
                cursor.execute(
                    f"""
                    UPDATE miller_driver_assignment
                    SET status = 'Done',
                        updated_at = NOW()
                    WHERE supplier_profile_id = %s
                      AND assignment_id IN ({asg_placeholders})
                    """,
                    [supplier_profile_id, *completed_assignment_ids],
                )

            # 3. Update orders to 'Delivered'
            order_placeholders = ",".join(["%s"] * len(completed_order_ids))
            cursor.execute(
                f"""
                UPDATE miller_online_customer
                SET status = 'Delivered',
                    updated_at = NOW()
                WHERE supplier_profile_id = %s
                  AND online_order_id IN ({order_placeholders})
                """,
                [supplier_profile_id, *completed_order_ids],
            )

            # 4. Stop active GPS tracking session in miller_last_ping if all group orders are completed
            remaining_orders = [o for o in all_orders if o["online_order_id"] not in completed_order_ids]
            has_remaining = len(remaining_orders) > 0
            if not has_remaining:
                for asg_id in completed_assignment_ids:
                    cursor.execute(
                        """
                        UPDATE miller_last_ping
                        SET status = 'active', last_ping_at = NOW()
                        WHERE supplier_profile_id = %s
                          AND driver_id = %s
                          AND assignment_id = %s
                        """,
                        [supplier_profile_id, driver_id, asg_id],
                    )

    return {
        "success": True,
        "message": "Delivery completed successfully.",
        "order_ids": completed_order_ids,
        "assignment_ids": completed_assignment_ids,
        "payment_reference_no": payment_reference_no,
        "proof_of_delivery": pod_saved_path,
        "has_remaining_orders": has_remaining,
    }


def send_driver_message(
    supplier_profile_id: int,
    driver_id: int,
    recipient_id: int,
    recipient_type: str,
    content: str,
) -> dict:
    """
    Send a message from the authenticated Miller Driver to an assigned buyer.
    Strictly verifies that an active delivery assignment exists for this buyer before inserting.
    Sender identity is set to the authenticated Miller branch.
    """
    trimmed = (content or "").strip()
    if not trimmed:
        raise DriverDeliveryError("Message content cannot be empty.", 400)

    is_retailer = recipient_type.lower() == "retailer"

    with connection.cursor() as cursor:
        # 1. Strictly validate active delivery assignment
        target_buyer_filter = "moc.user_buyer_id = %s" if is_retailer else "moc.warehouse_buyer_id = %s"
        cursor.execute(
            f"""
            SELECT 1
            FROM miller_driver_assignment mda
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = mda.online_order_id
            INNER JOIN miller_vehicle_assignee mva
                ON mva.vehicle_id = mda.delivery_vehicle_id
                AND mva.driver_id = %s
                AND mva.supplier_profile_id = %s
                AND mva.status = 'active'
            WHERE mda.supplier_profile_id = %s
              AND mda.status = 'Pending'
              AND moc.status IN ('Assigned to driver', 'In transit')
              AND {target_buyer_filter}
            LIMIT 1
            """,
            [driver_id, supplier_profile_id, supplier_profile_id, recipient_id],
        )
        if not cursor.fetchone():
            raise DriverDeliveryError(
                "Cannot send message: You do not have an active delivery assignment for this buyer.",
                403,
            )

        # 2. Get owner user ID of the supplier profile
        cursor.execute(
            "SELECT user_id FROM supplier_profiles WHERE supplier_profile_id = %s LIMIT 1",
            [supplier_profile_id],
        )
        owner_row = cursor.fetchone()
        owner_user_id = owner_row[0] if owner_row else None

        # 3. Insert message into messages table
        rx_user_id = recipient_id if is_retailer else None
        rx_warehouse_id = recipient_id if not is_retailer else None

        cursor.execute(
            """
            INSERT INTO messages (
                sender_supplier_profile_id,
                receiver_supplier_profile_id,
                sender_user_id,
                receiver_user_id,
                sender_warehouse_profile_id,
                receiver_warehouse_profile_id,
                message_content,
                created_at,
                seen_at
            ) VALUES (
                %s, NULL, %s, %s, NULL, %s, %s, NOW(), NULL
            )
            """,
            [
                supplier_profile_id,
                owner_user_id,
                rx_user_id,
                rx_warehouse_id,
                trimmed,
            ],
        )
        new_msg_id = cursor.lastrowid

        cursor.execute(
            "SELECT created_at FROM messages WHERE message_id = %s",
            [new_msg_id],
        )
        created_row = cursor.fetchone()
        created_at = created_row[0] if created_row else datetime.now()

    time_str = created_at.strftime("%I:%M %p")

    return {
        "success": True,
        "message": "Message sent successfully.",
        "data": {
            "id": new_msg_id,
            "sender": "me",
            "text": trimmed,
            "time": time_str,
            "timestamp": created_at.isoformat() if hasattr(created_at, "isoformat") else None,
            "seen": False,
        },
    }


def submit_driver_cod_payment(
    supplier_profile_id: int,
    driver_id: int,
    cod_transaction_key: str,
) -> dict:
    """
    Submit collected COD payment for a transaction group.
    - Strictly validates driver ownership and branch scoping for the cod_transaction_key.
    - Ensures status is strictly 'Handled' (rejects already 'Submitted' to prevent duplicate submission).
    - Atomically updates all rows sharing the cod_transaction_key to 'Submitted' and saves submitted_at = NOW().
    - Returns full receipt payload for immediate POS receipt modal display.
    """
    if not cod_transaction_key or not cod_transaction_key.strip():
        raise DriverDeliveryError("cod_transaction_key is required.", 400)

    clean_key = cod_transaction_key.strip()

    with connection.cursor() as cursor:
        # 1. Check ownership and current statuses
        cursor.execute(
            """
            SELECT
                cod.cod_id,
                cod.status,
                cod.payment_method,
                cod.payment_reference_no,
                cod.external_payment_reference_no,
                cod.receipt_photo,
                cod.amount_paid,
                cod.`change`,
                cod.handled_at,
                moc.online_order_id,
                moc.batch_no,
                moc.ordered_quantity,
                COALESCE(mp.unit_cost, 0.0) AS unit_cost,
                moc.total_price,
                COALESCE(mp.product_name, 'Rice Product') AS product_name,
                TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
                COALESCE(sp.business_name, 'GrainRise Milling Company') AS business_name,
                TRIM(CONCAT_WS(' ', se.first_name, se.last_name)) AS driver_name
            FROM miller_online_customer_cash_on_delivery cod
            INNER JOIN miller_online_customer moc
                ON moc.online_order_id = cod.online_order_id
            LEFT JOIN miller_products mp
                ON mp.product_id = moc.miller_product_id
            LEFT JOIN users u
                ON u.user_id = moc.user_buyer_id
            LEFT JOIN supplier_profiles sp
                ON sp.supplier_profile_id = cod.supplier_profile_id
            LEFT JOIN supplier_employees se
                ON se.supplier_employee_id = cod.driver_id
            WHERE cod.cod_transaction_key = %s
              AND cod.supplier_profile_id = %s
              AND cod.driver_id = %s
            ORDER BY cod.cod_id ASC
            """,
            [clean_key, supplier_profile_id, driver_id],
        )
        rows = cursor.fetchall()

        if not rows:
            raise DriverDeliveryError("Transaction not found or you are not authorized to submit it.", 404)

        # Check if already submitted
        statuses = [r[1] for r in rows]
        if any(s == "Submitted" for s in statuses):
            raise DriverDeliveryError("This payment transaction has already been submitted.", 400)

        if any(s != "Handled" for s in statuses):
            raise DriverDeliveryError("Payment transaction cannot be submitted due to invalid status.", 400)

        # 2. Atomically update all rows in this transaction to 'Submitted'
        cursor.execute(
            """
            UPDATE miller_online_customer_cash_on_delivery
            SET status = 'Submitted',
                submitted_at = NOW()
            WHERE cod_transaction_key = %s
              AND supplier_profile_id = %s
              AND driver_id = %s
              AND status = 'Handled'
            """,
            [clean_key, supplier_profile_id, driver_id],
        )

    # 3. Construct receipt payload
    first = rows[0]
    tx_total = sum(float(r[13] or 0) for r in rows)
    items_payload = [
        {
            "online_order_id": r[9],
            "product_name": r[14],
            "batch_no": r[10] or "—",
            "ordered_quantity": float(r[11] or 0),
            "display_quantity": f"{float(r[11] or 0):,.0f}" if float(r[11] or 0).is_integer() else f"{float(r[11] or 0):,.2f}",
            "unit_cost": float(r[12] or 0),
            "unit_cost_formatted": f"₱{float(r[12] or 0):,.2f}",
            "total_price": float(r[13] or 0),
            "total_price_formatted": f"₱{float(r[13] or 0):,.2f}",
        }
        for r in rows
    ]

    all_batches = list(dict.fromkeys(r[10] for r in rows if r[10]))

    receipt_data = {
        "business_name": first[16],
        "reference_no": first[3],
        "transaction_date_formatted": first[8].strftime("%Y-%m-%d %I:%M %p") if first[8] else "",
        "driver_name": first[17] or "Assigned Driver",
        "customer_name": first[15] or "Valued Retailer",
        "buyer_type": "Retailer",
        "batch_no": ", ".join(all_batches),
        "payment_method": first[2],
        "external_payment_reference_no": first[4],
        "receipt_photo": first[5],
        "items": items_payload,
        "total_amount": tx_total,
        "total_amount_formatted": f"₱{tx_total:,.2f}",
        "amount_paid": float(first[6] or 0),
        "amount_paid_formatted": f"₱{float(first[6] or 0):,.2f}",
        "change_amount": float(first[7] or 0),
        "change_amount_formatted": f"₱{float(first[7] or 0):,.2f}",
        "status": "Submitted",
    }

    return {
        "success": True,
        "message": "Payment submitted successfully.",
        "cod_transaction_key": clean_key,
        "receipt_data": receipt_data,
    }


