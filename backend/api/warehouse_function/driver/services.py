"""
Business Services for Warehouse Driver - Delivery Management and Live Tracking.
Atomic database operations for Live Tracking, COD payments, Proof of Delivery, and Status Updates.
"""

import base64
import logging
import os
import re
import uuid
from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection, transaction

from .selectors import get_buyer_group_for_tracking

logger = logging.getLogger(__name__)

PH_TZ = ZoneInfo("Asia/Manila")


class DriverDeliveryError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _save_data_uri_or_file(raw_data: str | None, folder: str = "proof_of_delivery") -> str | None:
    """
    Save base64 data URI or binary file to media storage and return the relative path.
    """
    if not raw_data:
        return None

    trimmed = raw_data.strip()
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
    fi = fn[0] if fn else "X"
    li = ln[0] if ln else "X"
    return f"{fi}{li}"


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
    First Two Words of Warehouse Business Name + Driver Initials + Payment Date (MMDDYYYY) + Payment Time (HHMM) + Buyer Initials
    """
    if not tx_datetime:
        tx_datetime = datetime.now(PH_TZ)

    words = _extract_alpha_words(company_name)
    if len(words) >= 2:
        comp_part = (words[0] + words[1]).upper()
    elif len(words) == 1:
        comp_part = (words[0] + "WH").upper()
    else:
        comp_part = "GRAINRISE"

    driver_in = _build_initials(driver_first_name, driver_last_name)
    buyer_in = _build_initials(buyer_first_name, buyer_last_name)
    date_str = tx_datetime.strftime("%m%d%Y")
    time_str = tx_datetime.strftime("%H%M")

    return f"{comp_part}{driver_in}{date_str}{time_str}{buyer_in}"


def start_driver_live_tracking(
    warehouse_profile_id: int,
    driver_id: int,
    buyer_group_key: str,
    latitude: float | None = None,
    longitude: float | None = None,
    driver_first_name: str = "",
    driver_last_name: str = "",
    company_name: str = "",
) -> dict:
    """
    When Driver starts Live Tracking:
    1. Update warehouse_online_customer.status from Assigned to driver to In transit.
    2. Keep warehouse_driver_assignment.status = 'Pending'.
    3. Update/insert warehouse_last_ping with status = 'inactive' (tracking inside module).
    4. Automatically send delivery introduction message to buyer if not already sent.
    """
    buyer_group = get_buyer_group_for_tracking(warehouse_profile_id, driver_id, buyer_group_key=buyer_group_key)
    if not buyer_group or not buyer_group["orders"]:
        raise DriverDeliveryError("No active assigned orders found for this buyer group.", 404)

    orders = buyer_group["orders"]
    order_ids = [o["online_order_id"] for o in orders]
    assignment_ids = [o["assignment_id"] for o in orders]
    buyer_id = buyer_group["buyer_id"]

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Update online customer status to 'In transit' if currently 'Assigned to driver'
            placeholders = ",".join(["%s"] * len(order_ids))
            cursor.execute(
                f"""
                UPDATE warehouse_online_customer
                SET status = 'In transit', updated_at = NOW()
                WHERE warehouse_profile_id = %s
                  AND online_order_id IN ({placeholders})
                  AND status = 'Assigned to driver'
                """,
                [warehouse_profile_id, *order_ids],
            )

            # 2. Maintain / upsert warehouse_last_ping for all assignments
            # Note: assignment_id has a UNIQUE key in warehouse_last_ping
            for asg_id in assignment_ids:
                cursor.execute(
                    """
                    INSERT INTO warehouse_last_ping (
                        warehouse_profile_id,
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
                        warehouse_profile_id,
                        driver_id,
                        asg_id,
                        latitude,
                        longitude,
                        latitude,
                        longitude,
                    ],
                )

        # 3. Automatic Delivery Introduction Message
        batch_numbers = [o["batch_no"] for o in orders]
        intro_content = (
            f"Hello! I'm {driver_first_name} {driver_last_name} from {company_name or 'GrainRise Warehouse'}. "
            f"I'll be delivering the following orders to you:\n\n"
            + "\n".join(f"{idx + 1}. {b}" for idx, b in enumerate(batch_numbers))
        )

        with connection.cursor() as cursor:
            # Check if an intro message has already been sent for these batches
            first_batch = batch_numbers[0] if batch_numbers else ""
            cursor.execute(
                """
                SELECT message_id FROM messages
                WHERE sender_warehouse_profile_id = %s
                  AND receiver_user_id = %s
                  AND message_content LIKE %s
                LIMIT 1
                """,
                [warehouse_profile_id, buyer_id, f"%{first_batch}%"],
            )
            already_sent = cursor.fetchone()

            if not already_sent and batch_numbers:
                cursor.execute(
                    """
                    INSERT INTO messages (
                        sender_warehouse_profile_id,
                        receiver_user_id,
                        message_content,
                        created_at
                    ) VALUES (%s, %s, %s, NOW())
                    """,
                    [
                        warehouse_profile_id,
                        buyer_id,
                        intro_content,
                    ],
                )

    return {
        "success": True,
        "message": "Live tracking started successfully.",
        "order_ids": order_ids,
        "assignment_ids": assignment_ids,
        "status": "In transit",
    }


def record_driver_live_ping(
    warehouse_profile_id: int,
    driver_id: int,
    assignment_ids: list[int],
    latitude: float,
    longitude: float,
) -> dict:
    """
    Record continuous GPS coordinates while driver is inside the Live Tracking module.
    Status remains 'inactive' because the driver is actively viewing the live route.
    """
    if not assignment_ids:
        return {"success": True, "message": "No assignments to ping."}

    with connection.cursor() as cursor:
        for asg_id in assignment_ids:
            cursor.execute(
                """
                INSERT INTO warehouse_last_ping (
                    warehouse_profile_id,
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
                    warehouse_profile_id,
                    driver_id,
                    asg_id,
                    latitude,
                    longitude,
                    latitude,
                    longitude,
                ],
            )

    return {
        "success": True,
        "message": "Live coordinates updated.",
        "latitude": latitude,
        "longitude": longitude,
    }


def exit_driver_live_tracking(
    warehouse_profile_id: int,
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
                    INSERT INTO warehouse_last_ping (
                        warehouse_profile_id,
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
                        warehouse_profile_id,
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
                    UPDATE warehouse_last_ping
                    SET status = 'active', last_ping_at = NOW()
                    WHERE warehouse_profile_id = %s
                      AND driver_id = %s
                      AND assignment_id = %s
                    """,
                    [warehouse_profile_id, driver_id, asg_id],
                )

    return {"success": True, "message": "Live tracking exited; last ping activated."}


def complete_driver_delivery(
    warehouse_profile_id: int,
    driver_id: int,
    buyer_group_key: str,
    proof_of_delivery_data: str | None = None,
    cod_data: dict | None = None,
    driver_employee: dict | None = None,
    order_ids: list[int] | None = None,
) -> dict:
    """
    Atomic Mark as Delivered:
    1. Online Payment: save proof_of_delivery to warehouse_driver_assignment.
    2. Retailer COD:
       - Insert into warehouse_online_customer_cash_on_delivery with Handled status and shared cod_transaction_key.
       - Generate proper payment reference format.
    3. Update warehouse_online_customer.status = 'Delivered'.
    4. Update warehouse_driver_assignment.status = 'Done'.
    5. Stop active GPS tracking session in warehouse_last_ping if all group orders are completed.
    6. Strictly NO insert into warehouse_online_customer_receiving_history.
    """
    buyer_group = get_buyer_group_for_tracking(warehouse_profile_id, driver_id, buyer_group_key=buyer_group_key)
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

    # Separate COD orders vs Prepaid orders
    cod_orders = [o for o in orders if o["payment_method"] == "Cash on Delivery"]
    has_cod = len(cod_orders) > 0
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
                            "SELECT business_name FROM warehouse_profiles WHERE warehouse_profile_id = %s LIMIT 1",
                            [warehouse_profile_id],
                        )
                        c_row = cursor.fetchone()
                        if c_row and c_row[0]:
                            company_name = c_row[0]
                    if not company_name:
                        company_name = "GrainRise Warehouse"

                    driver_fn = (driver_employee or {}).get("first_name") or ""
                    driver_ln = (driver_employee or {}).get("last_name") or ""
                    if not driver_fn and not driver_ln:
                        cursor.execute(
                            "SELECT first_name, last_name FROM warehouse_employees WHERE warehouse_employee_id = %s LIMIT 1",
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
                        INSERT INTO warehouse_online_customer_cash_on_delivery (
                            cod_transaction_key,
                            online_order_id,
                            warehouse_profile_id,
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
                            warehouse_profile_id,
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

            # 2. Update warehouse_online_customer.status to 'Delivered'
            order_placeholders = ",".join(["%s"] * len(completed_order_ids))
            cursor.execute(
                f"""
                UPDATE warehouse_online_customer
                SET status = 'Delivered', updated_at = NOW()
                WHERE warehouse_profile_id = %s
                  AND online_order_id IN ({order_placeholders})
                """,
                [warehouse_profile_id, *completed_order_ids],
            )

            # 3. Update warehouse_driver_assignment.status to 'Done' and save proof_of_delivery
            asg_placeholders = ",".join(["%s"] * len(completed_assignment_ids))
            if pod_saved_path:
                cursor.execute(
                    f"""
                    UPDATE warehouse_driver_assignment
                    SET status = 'Done',
                        proof_of_delivery = %s,
                        updated_at = NOW()
                    WHERE warehouse_profile_id = %s
                      AND assignment_id IN ({asg_placeholders})
                    """,
                    [pod_saved_path, warehouse_profile_id, *completed_assignment_ids],
                )
            else:
                cursor.execute(
                    f"""
                    UPDATE warehouse_driver_assignment
                    SET status = 'Done',
                        updated_at = NOW()
                    WHERE warehouse_profile_id = %s
                      AND assignment_id IN ({asg_placeholders})
                    """,
                    [warehouse_profile_id, *completed_assignment_ids],
                )

            # 4. If all orders in group are done, clean up / activate final last_ping
            remaining = [o for o in all_orders if o["online_order_id"] not in completed_order_ids]
            if not remaining:
                cursor.execute(
                    f"""
                    UPDATE warehouse_last_ping
                    SET status = 'active', last_ping_at = NOW()
                    WHERE warehouse_profile_id = %s
                      AND driver_id = %s
                      AND assignment_id IN ({asg_placeholders})
                    """,
                    [warehouse_profile_id, driver_id, *completed_assignment_ids],
                )

    remaining_count = len([o for o in all_orders if o["online_order_id"] not in completed_order_ids])

    return {
        "success": True,
        "message": f"Successfully delivered {len(completed_order_ids)} order(s).",
        "order_ids": completed_order_ids,
        "delivered_orders": completed_order_ids,
        "remaining_orders_count": remaining_count,
        "has_remaining_orders": remaining_count > 0,
        "payment_reference_no": payment_reference_no,
        "proof_of_delivery": pod_saved_path,
    }


def send_driver_message(
    warehouse_profile_id: int,
    driver_id: int,
    recipient_id: int,
    recipient_type: str,
    content: str,
) -> dict:
    """
    Send a message from the authenticated Warehouse Driver to an assigned Retailer buyer.
    Strictly verifies that an active delivery assignment exists for this buyer before inserting.
    Sender identity is set to the authenticated Warehouse branch.
    """
    trimmed = (content or "").strip()
    if not trimmed:
        raise DriverDeliveryError("Message content cannot be empty.", 400)

    from api.chat_moderation import find_profanity_matches
    matches = find_profanity_matches(trimmed)
    if matches:
        detected_words = list(dict.fromkeys(m["prohibited_text"] for m in matches))
        return {
            "success": False,
            "blocked": True,
            "code": "PROFANITY_DETECTED",
            "message": "Your message contains a prohibited word. Please remove it before submitting.",
            "detected_words": detected_words,
            "matches": matches,
        }

    with connection.cursor() as cursor:
        # 1. Strictly validate active delivery assignment
        cursor.execute(
            """
            SELECT 1
            FROM warehouse_driver_assignment wda
            INNER JOIN warehouse_online_customer woc
                ON woc.online_order_id = wda.online_order_id
            INNER JOIN warehouse_vehicle_assignee wva
                ON wva.vehicle_id = wda.delivery_vehicle_id
                AND wva.driver_id = %s
                AND wva.warehouse_profile_id = %s
                AND LOWER(wva.status) = 'active'
            WHERE wda.warehouse_profile_id = %s
              AND wda.status = 'Pending'
              AND woc.status IN ('Assigned to driver', 'In transit')
              AND woc.retailer_buyer_id = %s
            LIMIT 1
            """,
            [driver_id, warehouse_profile_id, warehouse_profile_id, recipient_id],
        )
        if not cursor.fetchone():
            raise DriverDeliveryError(
                "Cannot send message: You do not have an active delivery assignment for this buyer.",
                403,
            )

        # 2. Get owner user ID of the warehouse profile
        cursor.execute(
            "SELECT user_id FROM warehouse_profiles WHERE warehouse_profile_id = %s LIMIT 1",
            [warehouse_profile_id],
        )
        owner_row = cursor.fetchone()
        owner_user_id = owner_row[0] if owner_row else None

        # 3. Insert message into messages table
        cursor.execute(
            """
            INSERT INTO messages (
                sender_warehouse_profile_id,
                receiver_warehouse_profile_id,
                sender_user_id,
                receiver_user_id,
                sender_supplier_profile_id,
                receiver_supplier_profile_id,
                message_content,
                created_at,
                seen_at
            ) VALUES (
                %s, NULL, %s, %s, NULL, NULL, %s, NOW(), NULL
            )
            """,
            [
                warehouse_profile_id,
                owner_user_id,
                recipient_id,
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

    # Clear driver typing state
    from django.core.cache import cache
    cache.delete(f"wh_{warehouse_profile_id}_driver_{driver_id}_typing_to_retailer_{recipient_id}")

    # Broadcast created event
    try:
        from api.realtime.broadcast import broadcast_message_created
        broadcast_message_created(new_msg_id)
    except Exception:
        pass

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


def record_driver_typing(
    warehouse_profile_id: int,
    driver_id: int,
    recipient_id: int,
    is_typing: bool,
) -> dict:
    """
    Record or clear ephemeral typing status from the driver to the retailer.
    Never persisted to DB. Stored with a 4-second TTL.
    Broadcasts via Channels to the retailer user group if available.
    """
    from django.core.cache import cache
    cache_key = f"wh_{warehouse_profile_id}_driver_{driver_id}_typing_to_retailer_{recipient_id}"
    if is_typing:
        cache.set(cache_key, True, timeout=4)
    else:
        cache.delete(cache_key)

    try:
        from api.realtime.broadcast import publish_typing
        publish_typing(recipient_id, {
            "type": "typing",
            "thread_id": f"warehouse_{warehouse_profile_id}",
            "is_typing": is_typing,
            "sender_type": "driver",
            "sender_driver_id": driver_id,
        })
    except Exception:
        pass

    return {"success": True, "is_typing": is_typing}


def get_driver_typing_status(
    warehouse_profile_id: int,
    driver_id: int,
    recipient_id: int,
) -> dict:
    """
    Check if the assigned retailer is currently typing to the warehouse.
    Returns ephemeral state without querying the database.
    """
    from django.core.cache import cache
    cache_key = f"retailer_{recipient_id}_typing_to_warehouse_{warehouse_profile_id}"
    is_typing = bool(cache.get(cache_key, False))
    return {
        "success": True,
        "is_typing": is_typing,
        "recipient_id": recipient_id,
    }


def record_retailer_typing(
    recipient_id: int,
    warehouse_profile_id: int,
    is_typing: bool,
) -> dict:
    """
    Record or clear ephemeral typing status from the retailer to the warehouse.
    Never persisted to DB. Stored with a 4-second TTL.
    """
    from django.core.cache import cache
    cache_key = f"retailer_{recipient_id}_typing_to_warehouse_{warehouse_profile_id}"
    if is_typing:
        cache.set(cache_key, True, timeout=4)
    else:
        cache.delete(cache_key)
    return {"success": True, "is_typing": is_typing}


def submit_driver_cod_payment(
    warehouse_profile_id: int,
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
                woc.online_order_id,
                woc.batch_no,
                woc.ordered_quantity,
                COALESCE(wp.unit_cost, 0.0) AS unit_cost,
                woc.total_price,
                COALESCE(wp.product_name, 'Rice Product') AS product_name,
                TRIM(CONCAT_WS(' ', u.first_name, u.middle_initial, u.last_name, u.suffix)) AS retailer_name,
                COALESCE(wp_prof.business_name, 'GrainRise Warehouse') AS business_name,
                TRIM(CONCAT_WS(' ', we.first_name, we.last_name)) AS driver_name
            FROM warehouse_online_customer_cash_on_delivery cod
            INNER JOIN warehouse_online_customer woc
                ON woc.online_order_id = cod.online_order_id
            LEFT JOIN warehouse_products wp
                ON wp.product_id = woc.warehouse_product_id
            LEFT JOIN users u
                ON u.user_id = woc.retailer_buyer_id
            LEFT JOIN warehouse_profiles wp_prof
                ON wp_prof.warehouse_profile_id = cod.warehouse_profile_id
            LEFT JOIN warehouse_employees we
                ON we.warehouse_employee_id = cod.driver_id
            WHERE cod.cod_transaction_key = %s
              AND cod.warehouse_profile_id = %s
              AND cod.driver_id = %s
            ORDER BY cod.cod_id ASC
            """,
            [clean_key, warehouse_profile_id, driver_id],
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
            UPDATE warehouse_online_customer_cash_on_delivery
            SET status = 'Submitted',
                submitted_at = NOW()
            WHERE cod_transaction_key = %s
              AND warehouse_profile_id = %s
              AND driver_id = %s
              AND status = 'Handled'
            """,
            [clean_key, warehouse_profile_id, driver_id],
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
        "transaction_date_formatted": first[8].strftime("%Y-%m-%d %H:%M:%S") if first[8] else "",
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
        "amount_paid": float(first[6] or tx_total),
        "amount_paid_formatted": f"₱{float(first[6] or tx_total):,.2f}",
        "change_amount": float(first[7] or 0),
        "change_amount_formatted": f"₱{float(first[7] or 0):,.2f}",
        "status": "Submitted",
    }

    return {
        "success": True,
        "message": "Payment submitted successfully.",
        "receipt_data": receipt_data,
    }


def save_driver_reimbursement_attachment(file_obj, base64_str, warehouse_profile_id: int) -> str:
    """
    Validate and persist attachment evidence for a warehouse driver reimbursement request.
    Accepts PNG, JPG, JPEG, and WEBP files up to 10 MB.
    """
    from django.conf import settings

    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    max_bytes = 10 * 1024 * 1024  # 10 MB

    if file_obj is not None:
        name = getattr(file_obj, "name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in allowed_exts:
            raise DriverDeliveryError(
                f"Unsupported file format '{ext}'. Only PNG, JPG, JPEG, and WEBP files are accepted.",
                400,
            )
        if file_obj.size > max_bytes:
            raise DriverDeliveryError("Attachment file exceeds the 10 MB size limit.", 400)

        unique_name = f"reimb_{uuid.uuid4().hex[:12]}{ext}"
        rel_path = f"warehouse/reimbursements/{warehouse_profile_id}/{unique_name}"
        saved_path = default_storage.save(rel_path, file_obj)
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    if base64_str and str(base64_str).strip():
        raw_str = str(base64_str).strip()
        ext = ".jpg"
        b64_payload = raw_str
        if raw_str.startswith("data:"):
            header, _, b64_payload = raw_str.partition(",")
            if "image/png" in header:
                ext = ".png"
            elif "image/webp" in header:
                ext = ".webp"
            elif "image/jpeg" in header or "image/jpg" in header:
                ext = ".jpg"
            else:
                raise DriverDeliveryError(
                    "Unsupported image format in captured photo. Only PNG, JPG, and WEBP are accepted.",
                    400,
                )

        try:
            binary_bytes = base64.b64decode(b64_payload, validate=False)
        except Exception as exc:
            raise DriverDeliveryError("Invalid captured photo data.", 400) from exc

        if not binary_bytes or len(binary_bytes) < 64:
            raise DriverDeliveryError("Captured photo is empty or corrupted.", 400)

        if len(binary_bytes) > max_bytes:
            raise DriverDeliveryError("Captured photo exceeds the 10 MB size limit.", 400)

        unique_name = f"reimb_{uuid.uuid4().hex[:12]}{ext}"
        rel_path = f"warehouse/reimbursements/{warehouse_profile_id}/{unique_name}"
        saved_path = default_storage.save(rel_path, ContentFile(binary_bytes))
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    raise DriverDeliveryError("Attachment is required. Please upload a receipt or take a photo.", 400)


def submit_driver_reimbursement_request(
    warehouse_profile_id: int,
    driver_employee_id: int,
    category: str,
    custom_category: str,
    cost_raw: str | float,
    expense_date_raw: str,
    description: str,
    attachment_url: str,
    title: str = "",
) -> dict:
    """
    Atomically insert driver reimbursement request into warehouse_reimbursement with status = 'requested'.
    Generates reference number WH-REIMB-YYYYMMDD-XXX and triggers Warehouse Finance notification.
    """
    from datetime import date
    from django.utils import timezone
    from api.warehouse_function.finance.notifications.services import (
        notify_finance_on_new_reimbursement,
    )

    valid_categories = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication Expenses",
        "Communication",
        "Logistics",
        "Office & Operating Supplies",
        "Others",
    ]
    clean_cat = (category or "").strip()
    if not clean_cat or clean_cat not in valid_categories:
        raise DriverDeliveryError("Invalid expense category selected.", 400)

    if clean_cat == "Others":
        clean_custom = (custom_category or "").strip()
        if not clean_custom:
            raise DriverDeliveryError("Please specify the custom category for 'Others'.", 400)
        final_category = clean_custom
    elif clean_cat == "Communication":
        final_category = "Communication Expenses"
    else:
        final_category = clean_cat

    # Cost validation
    try:
        cost_str = str(cost_raw).strip()
        price_dec = Decimal(cost_str).quantize(Decimal("0.01"))
        if price_dec <= Decimal("0.00"):
            raise DriverDeliveryError("Cost must be a positive number greater than zero.", 400)
        if "." in cost_str:
            parts = cost_str.split(".")
            if len(parts) > 1 and len(parts[1]) > 2:
                raise DriverDeliveryError("Cost can have at most two decimal places.", 400)
    except (TypeError, ValueError, ArithmeticError) as e:
        raise DriverDeliveryError("Please enter a valid numeric cost amount.", 400) from e

    # Expense Date validation
    if not expense_date_raw:
        raise DriverDeliveryError("Expense date is required.", 400)
    today = datetime.now(PH_TZ).date()
    try:
        parsed_expense_date = date.fromisoformat(str(expense_date_raw).strip()[:10])
    except ValueError as e:
        raise DriverDeliveryError("Invalid expense date format. Must be YYYY-MM-DD.", 400) from e

    if parsed_expense_date > today:
        raise DriverDeliveryError("Expense date cannot be in the future.", 400)

    # Description validation
    clean_desc = (description or "").strip()
    if not clean_desc:
        raise DriverDeliveryError("Description is required.", 400)
    if len(clean_desc) > 1000:
        raise DriverDeliveryError("Description cannot exceed 1,000 characters.", 400)

    # Attachment URL validation
    if not attachment_url:
        raise DriverDeliveryError("Attachment is required.", 400)

    final_title = (title or "").strip() or f"{final_category} Reimbursement"

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Fetch authenticated Driver employee name
            cursor.execute(
                """
                SELECT first_name, middle_initial, last_name, suffix
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s
                  AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [driver_employee_id, warehouse_profile_id],
            )
            emp_row = cursor.fetchone()
            if emp_row:
                parts = [emp_row[0], emp_row[1], emp_row[2], emp_row[3]]
                requester_name = " ".join([p.strip() for p in parts if p and p.strip()]) or "Assigned Driver"
            else:
                requester_name = "Assigned Driver"

            # 2. Determine next reference number: WH-REIMB-YYYYMMDD-XXX
            cursor.execute(
                """
                SELECT COALESCE(MAX(reimbursement_id), 0) + 1
                FROM warehouse_reimbursement
                """
            )
            next_id = int(cursor.fetchone()[0] or 1)
            date_prefix = timezone.now().strftime("%Y%m%d")
            ref_no = f"WH-REIMB-{date_prefix}-{next_id:03d}"

            now = timezone.now()
            cursor.execute(
                """
                INSERT INTO warehouse_reimbursement (
                    warehouse_profile_id,
                    requested_by,
                    title,
                    description,
                    types,
                    price,
                    requested_date,
                    photo_evidence,
                    status,
                    request_reference_no,
                    expense_date
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, 'requested', %s, %s
                )
                """,
                [
                    warehouse_profile_id,
                    driver_employee_id,
                    final_title,
                    clean_desc,
                    final_category,
                    price_dec,
                    now,
                    attachment_url,
                    ref_no,
                    parsed_expense_date,
                ],
            )
            new_id = cursor.lastrowid

    # 3. Trigger Finance Notification
    try:
        notify_finance_on_new_reimbursement(
            warehouse_profile_id=warehouse_profile_id,
            ref_no=ref_no,
            reimbursement_type=final_category,
            price=float(price_dec),
            requester_name=requester_name,
        )
    except Exception as exc:
        logger.warning("Failed to notify warehouse finance of new driver reimbursement: %s", exc)

    return {
        "reimbursement_id": new_id,
        "request_reference_no": ref_no,
        "status": "requested",
        "title": final_title,
        "category": final_category,
        "price": float(price_dec),
        "requested_by": requester_name,
        "expense_date": str(parsed_expense_date),
    }


def get_driver_requester_info(warehouse_profile_id: int, driver_employee_id: int) -> dict:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                wp.business_name
            FROM warehouse_employees we
            INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
            WHERE we.warehouse_employee_id = %s
              AND we.warehouse_profile_id = %s
            LIMIT 1
            """,
            [driver_employee_id, warehouse_profile_id],
        )
        row = cursor.fetchone()
        if not row:
            return {"requester_name": "Assigned Driver", "business_name": "GrainRise Warehouse"}

        parts = [row[1], row[2], row[3], row[4]]
        name = " ".join([p.strip() for p in parts if p and p.strip()]) or "Assigned Driver"
        return {
            "driver_id": row[0],
            "requester_name": name,
            "business_name": (row[5] or "GrainRise Warehouse").strip(),
        }



