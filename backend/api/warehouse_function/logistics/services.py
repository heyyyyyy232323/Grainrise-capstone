import os
import uuid
import base64
import logging
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import connection, transaction
from django.utils import timezone

from .selectors import _format_driver_name, _parse_capacity_kg

logger = logging.getLogger(__name__)


class DeliveryAssignmentError(Exception):
    """Raised when assigning a driver to a forwarded warehouse order fails validation."""
    pass


def assign_order_to_driver(warehouse_profile_ids, online_order_id: int, driver_id: int) -> dict:
    """
    Atomically assign a forwarded warehouse order to an active driver and vehicle.

    Validations:
    - Order must belong to this branch (warehouse_profile_id in warehouse_profile_ids)
    - Order status must be strictly 'Forwarded to Logistics'
    - Order must not already have an active pending assignment in warehouse_driver_assignment
    - Driver must belong to this branch, position in ('driver', 'delivery_driver'), status='active'
    - Driver must have an active vehicle assignment in warehouse_vehicle_assignee
    - Vehicle must be active in warehouse_delivery_vehicle_management
    - Vehicle remaining capacity (capacity - existing pending load) must be >= order.ordered_quantity
      (or replacement quantity if approved product return)

    Atomic operations:
    1. INSERT INTO warehouse_driver_assignment (warehouse_profile_id, online_order_id, delivery_vehicle_id, status, proof_of_delivery)
       VALUES (warehouse_profile_id, online_order_id, vehicle_id, 'Pending', NULL)
    2. UPDATE warehouse_online_customer SET status = 'Assigned to driver', updated_at = CURRENT_TIMESTAMP
       WHERE online_order_id = %s
    """
    if not warehouse_profile_ids:
        raise DeliveryAssignmentError("Branch authorization is required.")
    if not online_order_id:
        raise DeliveryAssignmentError("Online order ID is required.")
    if not driver_id:
        raise DeliveryAssignmentError("Driver ID is required.")

    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    wh_list = list(warehouse_profile_ids)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Fetch & lock order
            cursor.execute(
                """
                SELECT
                    online_order_id,
                    warehouse_profile_id,
                    ordered_quantity,
                    batch_no,
                    status
                FROM warehouse_online_customer
                WHERE online_order_id = %s
                FOR UPDATE
                """,
                [online_order_id],
            )
            order_row = cursor.fetchone()

        if not order_row:
            raise DeliveryAssignmentError(f"Order #{online_order_id} not found.")

        order_wh_id = order_row[1]
        ordered_quantity = order_row[2]
        batch_no = order_row[3] or f"Order #{online_order_id}"
        order_status = order_row[4]

        if order_wh_id is None or order_wh_id not in warehouse_profile_ids:
            raise DeliveryAssignmentError("This order belongs to another warehouse branch.")

        if str(order_status).strip() != "Forwarded to Logistics":
            raise DeliveryAssignmentError(
                f"Order #{online_order_id} has status '{order_status}'. Only orders with status 'Forwarded to Logistics' can be assigned."
            )

        # 1.1 Check if this order has an approved return replacement quantity
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT return_id, quantity, status
                FROM warehouse_online_orders_returns
                WHERE online_order_id = %s
                  AND status = 'Approved'
                ORDER BY return_id DESC
                """,
                [online_order_id],
            )
            approved_returns = cursor.fetchall()

        if approved_returns:
            effective_order_quantity = sum(float(r[1] or 0.0) for r in approved_returns)
        else:
            effective_order_quantity = float(ordered_quantity) if ordered_quantity is not None else 0.0

        # 2. Check for duplicate pending assignment
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT assignment_id, status, delivery_vehicle_id
                FROM warehouse_driver_assignment
                WHERE online_order_id = %s
                  AND status = 'Pending'
                LIMIT 1
                """,
                [online_order_id],
            )
            existing_assignment = cursor.fetchone()

        if existing_assignment:
            raise DeliveryAssignmentError(
                f"Order #{online_order_id} already has a pending driver assignment (Assignment #{existing_assignment[0]})."
            )

        # 3. Validate driver
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    warehouse_employee_id,
                    warehouse_profile_id,
                    first_name,
                    middle_initial,
                    last_name,
                    suffix,
                    position,
                    status
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s
                  AND warehouse_profile_id IN ({p_wh})
                LIMIT 1
                """,
                [driver_id] + wh_list,
            )
            driver_row = cursor.fetchone()

        if not driver_row:
            raise DeliveryAssignmentError(f"Driver #{driver_id} not found or does not belong to this branch.")

        driver_pos = str(driver_row[6] or "").strip().lower()
        if driver_pos not in ("driver", "delivery_driver"):
            raise DeliveryAssignmentError(f"Employee #{driver_id} is not registered as a driver.")

        if str(driver_row[7] or "").strip().lower() != "active":
            raise DeliveryAssignmentError(f"Driver #{driver_id} is currently inactive.")

        driver_name = _format_driver_name(driver_row[2], driver_row[3], driver_row[4], driver_row[5]) or f"Driver #{driver_id}"

        # 4. Resolve active vehicle assignment for driver
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    wva.assigned_id,
                    wva.vehicle_id,
                    v.plate_number,
                    v.model,
                    v.capacity,
                    v.status
                FROM warehouse_vehicle_assignee wva
                INNER JOIN warehouse_delivery_vehicle_management v
                    ON v.vehicle_id = wva.vehicle_id
                WHERE wva.driver_id = %s
                  AND wva.warehouse_profile_id IN ({p_wh})
                  AND wva.status = 'active'
                ORDER BY wva.assigned_id DESC
                LIMIT 1
                """,
                [driver_id] + wh_list,
            )
            vehicle_row = cursor.fetchone()

        if not vehicle_row:
            raise DeliveryAssignmentError(
                f"Driver {driver_name} has no active vehicle assigned."
            )

        vehicle_id = vehicle_row[1]
        plate_number = vehicle_row[2] or "Vehicle"
        vehicle_model = vehicle_row[3] or ""
        vehicle_capacity_raw = vehicle_row[4]
        vehicle_status = vehicle_row[5]

        if vehicle_status and vehicle_status.lower() != "active":
            raise DeliveryAssignmentError(
                f"Assigned vehicle ({plate_number}) status is '{vehicle_status}'. It cannot be assigned for deliveries."
            )

        max_capacity = _parse_capacity_kg(vehicle_capacity_raw)

        # 5. Check pending load on this vehicle
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT COALESCE(
                    SUM(
                        COALESCE(
                            (
                                SELECT SUM(wor.quantity)
                                FROM warehouse_online_orders_returns wor
                                WHERE wor.online_order_id = wda_sub.online_order_id
                                  AND wor.status = 'Approved'
                            ),
                            woc.ordered_quantity
                        )
                    ),
                    0.0
                )
                FROM (
                    SELECT
                        online_order_id,
                        delivery_vehicle_id,
                        warehouse_profile_id
                    FROM warehouse_driver_assignment
                    WHERE status = 'Pending'
                      AND delivery_vehicle_id = %s
                      AND warehouse_profile_id IN ({p_wh})
                    GROUP BY online_order_id, delivery_vehicle_id, warehouse_profile_id
                ) wda_sub
                INNER JOIN warehouse_online_customer woc
                    ON woc.online_order_id = wda_sub.online_order_id
                WHERE woc.status NOT IN ('Delivered', 'Completed', 'Cancelled', 'Declined')
                  AND woc.status = 'Assigned to driver'
                """,
                [vehicle_id] + wh_list,
            )
            pending_row = cursor.fetchone()
            current_pending_load = float(pending_row[0]) if pending_row and pending_row[0] is not None else 0.0

        remaining_capacity = max(0.0, max_capacity - current_pending_load)

        if effective_order_quantity > remaining_capacity:
            raise DeliveryAssignmentError(
                f"Insufficient vehicle capacity. Order requires {effective_order_quantity:,.0f} kg, but vehicle {plate_number} has only {remaining_capacity:,.0f} kg remaining ({current_pending_load:,.0f} / {max_capacity:,.0f} kg currently loaded)."
            )

        # 6. Atomic INSERT into warehouse_driver_assignment and UPDATE warehouse_online_customer
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO warehouse_driver_assignment (
                    warehouse_profile_id,
                    online_order_id,
                    delivery_vehicle_id,
                    status,
                    proof_of_delivery
                ) VALUES (%s, %s, %s, 'Pending', NULL)
                """,
                [order_wh_id, online_order_id, vehicle_id],
            )
            assignment_id = cursor.lastrowid

            cursor.execute(
                """
                UPDATE warehouse_online_customer
                SET status = 'Assigned to driver',
                    updated_at = CURRENT_TIMESTAMP
                WHERE online_order_id = %s
                """,
                [online_order_id],
            )

        logger.info(
            "Assigned order #%s (%s) to driver #%s (%s, vehicle #%s) in warehouse_profile_id=%s",
            online_order_id,
            batch_no,
            driver_id,
            driver_name,
            vehicle_id,
            order_wh_id,
        )

        return {
            "success": True,
            "message": f"Order {batch_no} successfully assigned to driver {driver_name}.",
            "assignment_id": assignment_id,
            "driver_id": driver_id,
            "driver_name": driver_name,
            "vehicle_id": vehicle_id,
            "plate_number": plate_number,
            "vehicle_model": vehicle_model,
            "order_quantity": effective_order_quantity,
            "remaining_capacity": max(0.0, remaining_capacity - effective_order_quantity),
        }


class ReturnActionError(Exception):
    """Raised when approving or rejecting a warehouse product return fails."""
    pass


def _extract_buyer_initials(first_name, last_name, fallback="RET"):
    """
    Generate buyer initials for archived product code.
    Example: 'John Doe' -> 'JD', 'Maria Santos' -> 'MS'
    """
    parts = []
    if first_name and str(first_name).strip():
        parts.append(str(first_name).strip()[0].upper())
    if last_name and str(last_name).strip():
        parts.append(str(last_name).strip()[0].upper())
    initials = "".join(parts)
    return initials if initials else (fallback or "RET")


def process_warehouse_flc_product_return(
    warehouse_profile_ids,
    return_id: int,
    action: str,
    rejection_reason: str = None,
    sender_user_id: int = None,
) -> dict:
    """
    Process Approve or Reject action on a Pending warehouse product return request.

    ARCHIVED PRODUCT RULES (BOTH ACTIONS):
    - INSERT new row into warehouse_products with copied original product information.
    - stock_quantity = returned quantity.
    - status = 'archived'.
    - archive_reason = 'Return product from online customer [Retailer Name]'.
    - Product code: [Original Product Code]-RTRN-[Buyer Initials]-[MMDDYYYY], using return creation date.
    - Preserve original product record.
    - Respect existing UNIQUE product code constraint; report collisions without generating unauthorized suffixes.

    REJECT ACTION:
    - Require non-empty rejection reason.
    - UPDATE return status to 'Rejected' and save rejected_reason.
    - Do NOT deduct original product stock or change original order status.
    - INSERT archived product record.
    - INSERT buyer notification message:
      'Your request to return and replace [Quantity] kg of [Product] from order [Batch Number] has been rejected for the following reason: [Reason].'

    APPROVE ACTION:
    - Validate available original product stock >= return quantity. Block if insufficient.
    - UPDATE return status to 'Approved'.
    - Deduct approved return quantity from the original warehouse_products.stock_quantity.
    - INSERT archived product record.
    - UPDATE original warehouse_online_customer.status to exactly 'Forwarded to Logistics'.
    - INSERT buyer notification message:
      'Your request to return and replace [Quantity] kg of [Product] from order [Batch Number] has been approved. Please wait for the replacement delivery.'
    """
    if not warehouse_profile_ids:
        raise ReturnActionError("Branch authorization is required.")

    clean_action = str(action or "").strip().lower()
    if clean_action not in ("approve", "reject"):
        raise ReturnActionError(f"Invalid action '{action}'. Must be 'approve' or 'reject'.")

    if clean_action == "reject" and not str(rejection_reason or "").strip():
        raise ReturnActionError("Rejection reason is required to reject this return.")

    clean_reason = str(rejection_reason or "").strip()

    with transaction.atomic():
        # 1. Fetch & lock the return record
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    wor.return_id,
                    wor.warehouse_profile_id,
                    wor.online_order_id,
                    wor.retailer_buyer_id,
                    wor.quantity,
                    wor.status,
                    wor.return_reference_no,
                    wor.created_at
                FROM warehouse_online_orders_returns wor
                WHERE wor.return_id = %s
                FOR UPDATE
                """,
                [return_id],
            )
            return_row = cursor.fetchone()

        if not return_row:
            raise ReturnActionError(f"Return request #{return_id} not found.")

        return_wh_id = return_row[1]
        if return_wh_id is None or return_wh_id not in warehouse_profile_ids:
            raise ReturnActionError("This return request belongs to another warehouse branch.")

        if str(return_row[5]).strip() != "Pending":
            raise ReturnActionError(
                f"Return #{return_id} has status '{return_row[5]}'. Only 'Pending' returns can be processed."
            )

        online_order_id = return_row[2]
        retailer_buyer_id = return_row[3]
        return_quantity = float(return_row[4]) if return_row[4] is not None else 0.0
        return_ref_no = return_row[6]
        return_created_at = return_row[7]

        # 2. Fetch & lock the original order
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    woc.online_order_id,
                    woc.batch_no,
                    woc.ordered_quantity,
                    woc.status,
                    woc.warehouse_product_id
                FROM warehouse_online_customer woc
                WHERE woc.online_order_id = %s
                FOR UPDATE
                """,
                [online_order_id],
            )
            order_row = cursor.fetchone()

        if not order_row:
            raise ReturnActionError(f"Original online order #{online_order_id} not found.")

        batch_no = order_row[1] or f"Order #{online_order_id}"
        original_product_id = order_row[4]

        # 3. Fetch & lock original product
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    product_id,
                    warehouse_profile_id,
                    supplier_profile_id,
                    warehouse_nongrainrise_supplier_contact_id,
                    miller_online_receiving_id,
                    product_code,
                    product_name,
                    product_description,
                    product_image,
                    order_date,
                    arrival_date,
                    expiry_date,
                    stock_quantity,
                    unit_cost,
                    shelf_location,
                    archive_reason,
                    status
                FROM warehouse_products
                WHERE product_id = %s
                FOR UPDATE
                """,
                [original_product_id],
            )
            product_row = cursor.fetchone()

        if not product_row:
            raise ReturnActionError(f"Warehouse product #{original_product_id} not found.")

        orig_product_code = product_row[5] or f"PRD{original_product_id}"
        product_name = product_row[6] or "Rice Variant"
        current_stock = float(product_row[12]) if product_row[12] is not None else 0.0

        # 4. Resolve buyer name and initials (Retailer only)
        buyer_name = "Retailer"
        buyer_initials = "RET"

        if retailer_buyer_id:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT first_name, last_name, username
                    FROM users
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    [retailer_buyer_id],
                )
                user_row = cursor.fetchone()
                if user_row:
                    full_name = f"{user_row[0] or ''} {user_row[1] or ''}".strip()
                    buyer_name = full_name or user_row[2] or f"Retailer #{retailer_buyer_id}"
                    buyer_initials = _extract_buyer_initials(user_row[0], user_row[1], "RET")

        # 5. Format return creation date for product code (MMDDYYYY)
        if return_created_at:
            date_code_str = return_created_at.strftime("%m%d%Y")
        else:
            from datetime import date
            date_code_str = date.today().strftime("%m%d%Y")

        archived_product_code = f"{orig_product_code}-RTRN-{buyer_initials}-{date_code_str}"

        # Check for duplicate / colliding product code in warehouse_products
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id
                FROM warehouse_products
                WHERE product_code = %s
                LIMIT 1
                """,
                [archived_product_code],
            )
            existing_prod = cursor.fetchone()

        if existing_prod:
            raise ReturnActionError(
                f"Archived product code collision: '{archived_product_code}' already exists. Cannot generate unauthorized suffixes."
            )

        # Format quantity for messages
        qty_msg_str = f"{return_quantity:,.0f}" if return_quantity.is_integer() else f"{return_quantity:,.2f}"

        # -------------------------------------------------------------
        # ACTION: REJECT
        # -------------------------------------------------------------
        if clean_action == "reject":
            # Update return status to Rejected
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_online_orders_returns
                    SET status = 'Rejected',
                        rejected_reason = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE return_id = %s
                    """,
                    [clean_reason, return_id],
                )

            # Insert archived product record
            archive_reason_str = f"Return product from online customer {buyer_name}."
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO warehouse_products (
                        warehouse_profile_id,
                        supplier_profile_id,
                        warehouse_nongrainrise_supplier_contact_id,
                        miller_online_receiving_id,
                        product_code,
                        product_name,
                        product_description,
                        product_image,
                        order_date,
                        arrival_date,
                        expiry_date,
                        stock_quantity,
                        unit_cost,
                        shelf_location,
                        archive_reason,
                        status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'archived'
                    )
                    """,
                    [
                        product_row[1],   # warehouse_profile_id
                        product_row[2],   # supplier_profile_id
                        product_row[3],   # warehouse_nongrainrise_supplier_contact_id
                        product_row[4],   # miller_online_receiving_id
                        archived_product_code,
                        product_row[6],   # product_name
                        product_row[7],   # product_description
                        product_row[8],   # product_image
                        product_row[9],   # order_date
                        product_row[10],  # arrival_date
                        product_row[11],  # expiry_date
                        return_quantity,  # stock_quantity = returned quantity
                        product_row[13],  # unit_cost
                        product_row[14],  # shelf_location
                        archive_reason_str,
                    ],
                )

            # Insert buyer notification message
            message_content = (
                f"Your request to return and replace {qty_msg_str} kg of {product_name} "
                f"from order {batch_no} has been rejected for the following reason: {clean_reason}."
            )

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO messages (
                        sender_warehouse_profile_id,
                        receiver_user_id,
                        sender_user_id,
                        message_content,
                        created_at
                    ) VALUES (
                        %s, %s, %s, %s, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        return_wh_id,
                        retailer_buyer_id,
                        sender_user_id,
                        message_content,
                    ],
                )

            logger.info(
                "Rejected warehouse return #%s (%s) for retailer #%s with archived code %s",
                return_id,
                return_ref_no,
                retailer_buyer_id,
                archived_product_code,
            )

            return {
                "success": True,
                "action": "reject",
                "message": f"Return request {return_ref_no} successfully rejected.",
                "return_id": return_id,
                "status": "Rejected",
                "archived_product_code": archived_product_code,
            }

        # -------------------------------------------------------------
        # ACTION: APPROVE
        # -------------------------------------------------------------
        elif clean_action == "approve":
            # Stock availability check
            if current_stock < return_quantity:
                raise ReturnActionError(
                    f"Insufficient stock for replacement. Original product has {current_stock:,.0f} kg available, but return replacement requires {return_quantity:,.0f} kg."
                )

            # 1. Update return status to Approved
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_online_orders_returns
                    SET status = 'Approved',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE return_id = %s
                    """,
                    [return_id],
                )

            # 2. Deduct return quantity from original warehouse_products.stock_quantity
            new_stock = current_stock - return_quantity
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_products
                    SET stock_quantity = %s
                    WHERE product_id = %s
                    """,
                    [new_stock, original_product_id],
                )

            # 3. Insert archived product record
            archive_reason_str = f"Return product from online customer {buyer_name}."
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO warehouse_products (
                        warehouse_profile_id,
                        supplier_profile_id,
                        warehouse_nongrainrise_supplier_contact_id,
                        miller_online_receiving_id,
                        product_code,
                        product_name,
                        product_description,
                        product_image,
                        order_date,
                        arrival_date,
                        expiry_date,
                        stock_quantity,
                        unit_cost,
                        shelf_location,
                        archive_reason,
                        status
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'archived'
                    )
                    """,
                    [
                        product_row[1],   # warehouse_profile_id
                        product_row[2],   # supplier_profile_id
                        product_row[3],   # warehouse_nongrainrise_supplier_contact_id
                        product_row[4],   # miller_online_receiving_id
                        archived_product_code,
                        product_row[6],   # product_name
                        product_row[7],   # product_description
                        product_row[8],   # product_image
                        product_row[9],   # order_date
                        product_row[10],  # arrival_date
                        product_row[11],  # expiry_date
                        return_quantity,  # stock_quantity = returned quantity
                        product_row[13],  # unit_cost
                        product_row[14],  # shelf_location
                        archive_reason_str,
                    ],
                )

            # 4. UPDATE original warehouse_online_customer.status to exactly 'Forwarded to Logistics'
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_online_customer
                    SET status = 'Forwarded to Logistics',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE online_order_id = %s
                    """,
                    [online_order_id],
                )

            # 5. Insert buyer notification message
            message_content = (
                f"Your request to return and replace {qty_msg_str} kg of {product_name} "
                f"from order {batch_no} has been approved. Please wait for the replacement delivery."
            )

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO messages (
                        sender_warehouse_profile_id,
                        receiver_user_id,
                        sender_user_id,
                        message_content,
                        created_at
                    ) VALUES (
                        %s, %s, %s, %s, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        return_wh_id,
                        retailer_buyer_id,
                        sender_user_id,
                        message_content,
                    ],
                )

            logger.info(
                "Approved warehouse return #%s (%s) for retailer #%s with replacement deducted: %s kg, remaining stock: %s kg, archived code: %s",
                return_id,
                return_ref_no,
                retailer_buyer_id,
                return_quantity,
                new_stock,
                archived_product_code,
            )

            return {
                "success": True,
                "action": "approve",
                "message": f"Return request {return_ref_no} approved. Replacement is forwarded to logistics.",
                "return_id": return_id,
                "status": "Approved",
                "archived_product_code": archived_product_code,
                "approved_quantity": return_quantity,
                "remaining_stock": new_stock,
            }


class VehicleNotFoundError(Exception):
    """Raised when the specified vehicle does not exist or is not designated to the branch."""
    pass


class DriverNotFoundError(Exception):
    """Raised when the specified driver does not exist in the branch."""
    pass


class VehicleValidationError(Exception):
    """Raised when status or driver update fails business validation rules."""
    pass


class CrossBranchConflictError(Exception):
    """Raised when vehicle or driver is actively assigned in another branch."""
    pass


def update_warehouse_flc_vehicle_status(
    vehicle_id: int,
    warehouse_profile_ids,
    warehouse_user_id=None,
    action=None,
    driver_id=None,
    reason=None,
):
    """
    Process vehicle status updates or driver assignment for an authenticated Warehouse branch.
    Duplicates Miller FLC Vehicle Assignee Management update logic with atomic transaction safety.

    Allowed actions:
    1. 'assign_driver':
       - Validates driver belongs to the branch, position in ('driver', 'delivery_driver'), status='active'.
       - Validates vehicle is designated to the branch.
       - Prevents and reports cross-branch assignment conflicts (never silently override).
       - Enforces max 1 ACTIVE assignment per vehicle and max 1 ACTIVE vehicle per driver globally.
       - Preserves history by updating previous assignments to 'changed' before inserting new 'active'.
       - Atomic transaction with SELECT ... FOR UPDATE prevents race conditions.
    2. 'inactive':
       - Requires non-empty reason string.
       - Persists vehicle status='inactive', inactive_reason=reason, maintenance_reason=NULL.
       - Does NOT alter warehouse_vehicle_assignee assignments.
    3. 'maintenance':
       - Requires non-empty reason string.
       - Persists vehicle status='for maintenance', maintenance_reason=reason, inactive_reason=NULL.
       - Does NOT alter warehouse_vehicle_assignee assignments.
    4. 'set_active':
       - Persists vehicle status='active', clears inactive_reason and maintenance_reason.
       - Does NOT alter warehouse_vehicle_assignee assignments.
    """
    clean_action = str(action or "").strip().lower()
    if clean_action not in ("assign_driver", "inactive", "maintenance", "set_active"):
        raise VehicleValidationError(
            f"Invalid action '{action}'. Must be one of: 'assign_driver', 'inactive', 'maintenance', 'set_active'."
        )

    if not warehouse_profile_ids:
        raise VehicleValidationError("Branch authorization is required.")

    primary_wh_id = warehouse_profile_ids[0]
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock and verify vehicle exists and is designated to current branch
            cursor.execute(
                f"""
                SELECT
                    v.vehicle_id,
                    v.user_id,
                    v.status,
                    v.model,
                    v.plate_number
                FROM warehouse_delivery_vehicle_management v
                INNER JOIN warehouse_delivery_vehicle_branches vb
                    ON vb.vehicle_id = v.vehicle_id
                WHERE v.vehicle_id = %s
                  AND vb.warehouse_profile_id IN ({p_wh})
                FOR UPDATE
                """,
                [vehicle_id] + list(warehouse_profile_ids),
            )
            vehicle_row = cursor.fetchone()

        if not vehicle_row:
            raise VehicleNotFoundError(
                "Vehicle not found or not designated to your branch."
            )

        # -------------------------------------------------------------
        # ACTION: ASSIGN DRIVER
        # -------------------------------------------------------------
        if clean_action == "assign_driver":
            if not driver_id:
                raise VehicleValidationError("Please select a driver to assign.")

            try:
                clean_driver_id = int(driver_id)
            except (ValueError, TypeError):
                raise VehicleValidationError("Invalid driver ID provided.")

            with connection.cursor() as cursor:
                # 2. Lock and verify driver belongs to branch, position='driver', status='active'
                cursor.execute(
                    f"""
                    SELECT
                        we.warehouse_employee_id,
                        we.warehouse_profile_id,
                        we.first_name,
                        we.last_name,
                        we.position,
                        we.status
                    FROM warehouse_employees we
                    WHERE we.warehouse_employee_id = %s
                      AND we.warehouse_profile_id IN ({p_wh})
                    FOR UPDATE
                    """,
                    [clean_driver_id] + list(warehouse_profile_ids),
                )
                driver_row = cursor.fetchone()

            if not driver_row:
                raise DriverNotFoundError(
                    "Selected driver was not found in your branch."
                )

            db_pos = str(driver_row[4] or "").strip().lower()
            db_stat = str(driver_row[5] or "").strip().lower()
            if db_pos not in ("driver", "delivery_driver"):
                raise VehicleValidationError(
                    f"Selected employee is not a driver (current position: {db_pos})."
                )
            if db_stat != "active":
                raise VehicleValidationError(
                    "Selected driver account is not active."
                )

            with connection.cursor() as cursor:
                # 3. Check for any current ACTIVE assignment for this vehicle across all branches
                cursor.execute(
                    """
                    SELECT
                        wva.assigned_id,
                        wva.warehouse_profile_id,
                        wva.driver_id,
                        wp.business_name
                    FROM warehouse_vehicle_assignee wva
                    LEFT JOIN warehouse_profiles wp
                        ON wp.warehouse_profile_id = wva.warehouse_profile_id
                    WHERE wva.vehicle_id = %s
                      AND wva.status = 'active'
                    FOR UPDATE
                    """,
                    [vehicle_id],
                )
                active_vehicle_assignments = cursor.fetchall()

                for a in active_vehicle_assignments:
                    assigned_branch_id = a[1]
                    if int(assigned_branch_id) not in [int(x) for x in warehouse_profile_ids]:
                        other_branch = a[3] or f"Branch #{assigned_branch_id}"
                        raise CrossBranchConflictError(
                            f"Unresolved conflict: This vehicle is currently actively assigned to a driver in another branch ({other_branch}). Cross-branch assignments cannot be modified."
                        )

                # 4. Check for any current ACTIVE assignment for this driver across all branches
                cursor.execute(
                    """
                    SELECT
                        wva.assigned_id,
                        wva.warehouse_profile_id,
                        wva.vehicle_id,
                        wp.business_name
                    FROM warehouse_vehicle_assignee wva
                    LEFT JOIN warehouse_profiles wp
                        ON wp.warehouse_profile_id = wva.warehouse_profile_id
                    WHERE wva.driver_id = %s
                      AND wva.status = 'active'
                    FOR UPDATE
                    """,
                    [clean_driver_id],
                )
                active_driver_assignments = cursor.fetchall()

                for a in active_driver_assignments:
                    assigned_branch_id = a[1]
                    if int(assigned_branch_id) not in [int(x) for x in warehouse_profile_ids]:
                        other_branch = a[3] or f"Branch #{assigned_branch_id}"
                        raise CrossBranchConflictError(
                            f"Unresolved conflict: Selected driver has an active vehicle assignment in another branch ({other_branch}). Cross-branch assignments cannot be modified."
                        )

                # 5. Check if vehicle is already actively assigned to this driver in this branch
                is_already_assigned = any(
                    int(a[1]) in [int(x) for x in warehouse_profile_ids] and int(a[2]) == int(clean_driver_id)
                    for a in active_vehicle_assignments
                )
                if is_already_assigned:
                    return {
                        "success": True,
                        "action": "assign_driver",
                        "message": "Driver is already actively assigned to this vehicle.",
                        "vehicle_id": vehicle_id,
                        "driver_id": clean_driver_id,
                    }

                # 6. Preserve history by updating previous assignments to 'changed'
                # Deactivate any active assignment for this vehicle in this branch
                cursor.execute(
                    f"""
                    UPDATE warehouse_vehicle_assignee
                    SET status = 'changed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                      AND status = 'active'
                      AND warehouse_profile_id IN ({p_wh})
                    """,
                    [vehicle_id] + list(warehouse_profile_ids),
                )

                # Deactivate any active assignment for this driver in this branch
                cursor.execute(
                    f"""
                    UPDATE warehouse_vehicle_assignee
                    SET status = 'changed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE driver_id = %s
                      AND status = 'active'
                      AND warehouse_profile_id IN ({p_wh})
                    """,
                    [clean_driver_id] + list(warehouse_profile_ids),
                )

                # 7. Insert new 'active' assignment
                driver_wh_id = driver_row[1] or primary_wh_id
                cursor.execute(
                    """
                    INSERT INTO warehouse_vehicle_assignee (
                        warehouse_profile_id,
                        vehicle_id,
                        driver_id,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """,
                    [driver_wh_id, vehicle_id, clean_driver_id],
                )

            logger.info(
                "Warehouse FLC: Vehicle #%s assigned to driver #%s in branch #%s",
                vehicle_id,
                clean_driver_id,
                driver_wh_id,
            )

            return {
                "success": True,
                "action": "assign_driver",
                "message": f"Driver {driver_row[2]} {driver_row[3]} successfully assigned to vehicle {vehicle_row[4] or vehicle_row[3]}.",
                "vehicle_id": vehicle_id,
                "driver_id": clean_driver_id,
            }

        # -------------------------------------------------------------
        # ACTION: SET INACTIVE
        # -------------------------------------------------------------
        elif clean_action == "inactive":
            if not reason or not str(reason).strip():
                raise VehicleValidationError(
                    "Please provide a reason for marking the vehicle inactive."
                )

            clean_reason = str(reason).strip()
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_delivery_vehicle_management
                    SET status = 'inactive',
                        inactive_reason = %s,
                        maintenance_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                    """,
                    [clean_reason, vehicle_id],
                )

            logger.info("Warehouse FLC: Vehicle #%s set to inactive. Reason: %s", vehicle_id, clean_reason)
            return {
                "success": True,
                "action": "inactive",
                "message": "Vehicle status set to Inactive successfully.",
                "vehicle_id": vehicle_id,
                "status": "inactive",
                "inactive_reason": clean_reason,
            }

        # -------------------------------------------------------------
        # ACTION: SET FOR MAINTENANCE
        # -------------------------------------------------------------
        elif clean_action == "maintenance":
            if not reason or not str(reason).strip():
                raise VehicleValidationError(
                    "Please provide a reason for placing the vehicle in maintenance."
                )

            clean_reason = str(reason).strip()
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_delivery_vehicle_management
                    SET status = 'for maintenance',
                        maintenance_reason = %s,
                        inactive_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                    """,
                    [clean_reason, vehicle_id],
                )

            logger.info("Warehouse FLC: Vehicle #%s set to for maintenance. Reason: %s", vehicle_id, clean_reason)
            return {
                "success": True,
                "action": "maintenance",
                "message": "Vehicle status set to For Maintenance successfully.",
                "vehicle_id": vehicle_id,
                "status": "for maintenance",
                "maintenance_reason": clean_reason,
            }

        # -------------------------------------------------------------
        # ACTION: SET ACTIVE
        # -------------------------------------------------------------
        elif clean_action == "set_active":
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_delivery_vehicle_management
                    SET status = 'active',
                        inactive_reason = NULL,
                        maintenance_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                    """,
                    [vehicle_id],
                )

            logger.info("Warehouse FLC: Vehicle #%s set to active.", vehicle_id)
            return {
                "success": True,
                "action": "set_active",
                "message": "Vehicle status set to Active successfully.",
                "vehicle_id": vehicle_id,
                "status": "active",
            }


# ─────────────────────────────────────────────────────────────
# WAREHOUSE FLC REIMBURSEMENT REQUEST SERVICES
# ─────────────────────────────────────────────────────────────

def _save_warehouse_reimbursement_attachment(file_obj, base64_str, warehouse_profile_id: int) -> str:
    """
    Validate and persist attachment evidence for a warehouse reimbursement request.
    Accepts PNG, JPG, JPEG, and WEBP files up to 10 MB.
    """
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    max_bytes = 10 * 1024 * 1024  # 10 MB

    if file_obj is not None:
        name = getattr(file_obj, "name", "")
        ext = os.path.splitext(name)[1].lower()
        if ext not in allowed_exts:
            raise ValueError(
                f"Unsupported file format '{ext}'. Only PNG, JPG, JPEG, and WEBP files are accepted."
            )
        if file_obj.size > max_bytes:
            raise ValueError("Attachment file exceeds the 10 MB size limit.")

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
                raise ValueError(
                    "Unsupported image format in captured photo. Only PNG, JPG, and WEBP are accepted."
                )

        try:
            binary_bytes = base64.b64decode(b64_payload, validate=False)
        except Exception as exc:
            raise ValueError("Invalid captured photo data.") from exc

        if not binary_bytes or len(binary_bytes) < 64:
            raise ValueError("Captured photo is empty or corrupted.")

        if len(binary_bytes) > max_bytes:
            raise ValueError("Captured photo exceeds the 10 MB size limit.")

        unique_name = f"reimb_{uuid.uuid4().hex[:12]}{ext}"
        rel_path = f"warehouse/reimbursements/{warehouse_profile_id}/{unique_name}"
        saved_path = default_storage.save(rel_path, ContentFile(binary_bytes))
        media_url = getattr(settings, "MEDIA_URL", "/media/")
        return f"{media_url.rstrip('/')}/{saved_path.lstrip('/')}"

    raise ValueError("Attachment is required. Please upload a receipt or take a photo.")


def submit_warehouse_flc_reimbursement_request(
    warehouse_profile_id: int,
    requested_by_employee_id: int,
    title: str,
    description: str,
    category: str,
    price,
    photo_evidence: str = "",
    expense_date=None,
) -> dict:
    """
    Submit a new reimbursement request into warehouse_reimbursement in 'requested' status.
    Atomically creates a notification for Warehouse Finance so they are notified of the new request.
    Enforces branch isolation and prevents duplicate notifications.
    """
    import datetime
    from decimal import Decimal

    price_dec = Decimal(str(price or "0.00")).quantize(Decimal("0.01"))
    if price_dec <= Decimal("0.00"):
        raise ValueError("Cost must be a positive number greater than zero.")

    # Validate expense_date
    today = timezone.now().date()
    parsed_expense_date = None
    if expense_date:
        if isinstance(expense_date, str):
            try:
                parsed_expense_date = datetime.date.fromisoformat(str(expense_date).strip())
            except ValueError:
                raise ValueError("Invalid expense date format. Must be YYYY-MM-DD.")
        elif isinstance(expense_date, (datetime.date, datetime.datetime)):
            parsed_expense_date = (
                expense_date.date()
                if isinstance(expense_date, datetime.datetime)
                else expense_date
            )
        else:
            raise ValueError("Invalid expense date provided.")

        if parsed_expense_date > today:
            raise ValueError("Expense date cannot be in the future.")
    else:
        parsed_expense_date = today

    clean_category = (category or "").strip() or "Others"
    clean_title = (title or "").strip() or f"{clean_category} Reimbursement"
    clean_desc = (description or "").strip()
    if not clean_desc:
        raise ValueError("Description is required.")
    if len(clean_desc) > 1000:
        raise ValueError("Description cannot exceed 1,000 characters.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Fetch requester name
            cursor.execute(
                """
                SELECT first_name, middle_initial, last_name, suffix
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [requested_by_employee_id, warehouse_profile_id],
            )
            req_row = cursor.fetchone()
            if req_row:
                requester_name = _format_driver_name(req_row[0], req_row[1], req_row[2], req_row[3]) or "Employee"
            else:
                requester_name = "Employee"

            # Determine next reference number: WH-REIMB-YYYYMMDD-XXX
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
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'requested', %s, %s)
                """,
                [
                    warehouse_profile_id,
                    requested_by_employee_id,
                    clean_title,
                    clean_desc,
                    clean_category,
                    price_dec,
                    now,
                    photo_evidence or "",
                    ref_no,
                    parsed_expense_date,
                ],
            )
            new_reimbursement_id = cursor.lastrowid

    # Create notification for Warehouse Finance
    try:
        from api.warehouse_function.finance.notifications.services import (
            notify_finance_on_new_reimbursement,
        )
        notify_finance_on_new_reimbursement(
            warehouse_profile_id=warehouse_profile_id,
            ref_no=ref_no,
            reimbursement_type=clean_category,
            price=float(price_dec),
            requester_name=requester_name,
        )
    except Exception as exc:
        logger.warning("Failed to notify warehouse finance of new reimbursement: %s", exc)

    return {
        "reimbursement_id": new_reimbursement_id,
        "request_reference_no": ref_no,
        "status": "requested",
        "title": clean_title,
        "price": float(price_dec),
        "requested_by": requester_name,
        "expense_date": str(parsed_expense_date),
    }



