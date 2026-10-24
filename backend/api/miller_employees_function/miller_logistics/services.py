from django.db import connection, transaction


class VehicleNotFoundError(Exception):
    """Raised when vehicle does not exist or is not designated to the branch."""
    pass


class DriverNotFoundError(Exception):
    """Raised when driver does not exist or is not an active driver in the branch."""
    pass


class VehicleValidationError(Exception):
    """Raised when input validation fails."""
    pass


class CrossBranchConflictError(Exception):
    """Raised when vehicle or driver is actively assigned by another branch."""
    pass


def update_flc_vehicle_status(
    vehicle_id,
    supplier_profile_id,
    miller_user_id,
    action,
    driver_id=None,
    reason=None,
):
    """
    Process vehicle status updates or driver assignment for an FLC employee's branch.

    Allowed actions:
    1. 'assign_driver':
       - Validates driver belongs to the SAME branch, position='driver', status='active'.
       - Validates vehicle is designated to the employee's branch.
       - Prevents and reports cross-branch assignment conflicts (never silently override).
       - Enforces max 1 ACTIVE assignment per vehicle and max 1 ACTIVE vehicle per driver.
       - Preserves history by updating previous assignments to 'changed' before inserting new 'active'.
       - Atomic transaction with SELECT ... FOR UPDATE prevents race conditions.
    2. 'inactive':
       - Requires non-empty reason string.
       - Persists vehicle status='inactive', inactive_reason=reason, maintenance_reason=NULL.
       - Does NOT alter miller_vehicle_assignee assignments.
    3. 'maintenance':
       - Requires non-empty reason string.
       - Persists vehicle status='for maintenance', maintenance_reason=reason, inactive_reason=NULL.
       - Does NOT alter miller_vehicle_assignee assignments.
    4. 'set_active':
       - Persists vehicle status='active', clears inactive_reason and maintenance_reason.
       - Does NOT alter miller_vehicle_assignee assignments.
    """
    clean_action = str(action or "").strip().lower()
    if clean_action not in ("assign_driver", "inactive", "maintenance", "set_active"):
        raise VehicleValidationError(
            f"Invalid action '{action}'. Must be one of: 'assign_driver', 'inactive', 'maintenance', 'set_active'."
        )

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Lock and verify vehicle exists, belongs to miller owner, and is designated to current branch
            cursor.execute(
                """
                SELECT
                    v.vehicle_id,
                    v.user_id,
                    v.status,
                    v.model,
                    v.plate_number
                FROM miller_delivery_vehicle_management v
                INNER JOIN miller_delivery_vehicle_branches vb
                    ON vb.vehicle_id = v.vehicle_id
                WHERE v.vehicle_id = %s
                  AND vb.supplier_profile_id = %s
                  AND v.user_id = %s
                FOR UPDATE
                """,
                [vehicle_id, supplier_profile_id, miller_user_id],
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
                # 2. Lock and verify driver belongs to SAME branch, position='driver', status='active'
                cursor.execute(
                    """
                    SELECT
                        se.supplier_employee_id,
                        se.supplier_profile_id,
                        se.first_name,
                        se.last_name,
                        se.position,
                        se.status
                    FROM supplier_employees se
                    WHERE se.supplier_employee_id = %s
                      AND se.supplier_profile_id = %s
                    FOR UPDATE
                    """,
                    [clean_driver_id, supplier_profile_id],
                )
                driver_row = cursor.fetchone()

            if not driver_row:
                raise DriverNotFoundError(
                    "Selected driver was not found in your branch."
                )

            db_pos = str(driver_row[4] or "").strip().lower()
            db_stat = str(driver_row[5] or "").strip().lower()
            if db_pos != "driver":
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
                        mva.assigned_id,
                        mva.supplier_profile_id,
                        mva.driver_id,
                        sp.business_name
                    FROM miller_vehicle_assignee mva
                    LEFT JOIN supplier_profiles sp
                        ON sp.supplier_profile_id = mva.supplier_profile_id
                    WHERE mva.vehicle_id = %s
                      AND mva.status = 'active'
                    FOR UPDATE
                    """,
                    [vehicle_id],
                )
                active_vehicle_assignments = cursor.fetchall()

                for a in active_vehicle_assignments:
                    assigned_branch_id = a[1]
                    if int(assigned_branch_id) != int(supplier_profile_id):
                        other_branch = a[3] or f"Branch #{assigned_branch_id}"
                        raise CrossBranchConflictError(
                            f"Unresolved conflict: This vehicle is currently actively assigned to a driver in another branch ({other_branch}). Cross-branch assignments cannot be modified."
                        )

                # 4. Check for any current ACTIVE assignment for this driver across all branches
                cursor.execute(
                    """
                    SELECT
                        mva.assigned_id,
                        mva.supplier_profile_id,
                        mva.vehicle_id,
                        sp.business_name
                    FROM miller_vehicle_assignee mva
                    LEFT JOIN supplier_profiles sp
                        ON sp.supplier_profile_id = mva.supplier_profile_id
                    WHERE mva.driver_id = %s
                      AND mva.status = 'active'
                    FOR UPDATE
                    """,
                    [clean_driver_id],
                )
                active_driver_assignments = cursor.fetchall()

                for a in active_driver_assignments:
                    assigned_branch_id = a[1]
                    if int(assigned_branch_id) != int(supplier_profile_id):
                        other_branch = a[3] or f"Branch #{assigned_branch_id}"
                        raise CrossBranchConflictError(
                            f"Unresolved conflict: Selected driver has an active vehicle assignment in another branch ({other_branch}). Cross-branch assignments cannot be modified."
                        )

                # 5. Check if vehicle is already actively assigned to this driver in this branch
                is_already_assigned = any(
                    int(a[1]) == int(supplier_profile_id) and int(a[2]) == int(clean_driver_id)
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
                    """
                    UPDATE miller_vehicle_assignee
                    SET status = 'changed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                      AND status = 'active'
                      AND supplier_profile_id = %s
                    """,
                    [vehicle_id, supplier_profile_id],
                )

                # Deactivate any active assignment for this driver in this branch
                cursor.execute(
                    """
                    UPDATE miller_vehicle_assignee
                    SET status = 'changed',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE driver_id = %s
                      AND status = 'active'
                      AND supplier_profile_id = %s
                    """,
                    [clean_driver_id, supplier_profile_id],
                )

                # 7. Insert new 'active' assignment
                cursor.execute(
                    """
                    INSERT INTO miller_vehicle_assignee (
                        supplier_profile_id,
                        vehicle_id,
                        driver_id,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (%s, %s, %s, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """,
                    [supplier_profile_id, vehicle_id, clean_driver_id],
                )
                new_assigned_id = cursor.lastrowid

            return {
                "success": True,
                "action": "assign_driver",
                "message": f"Driver assigned successfully to vehicle {vehicle_row[4]}.",
                "assigned_id": new_assigned_id,
                "vehicle_id": vehicle_id,
                "driver_id": clean_driver_id,
            }

        # -------------------------------------------------------------
        # ACTION: INACTIVE
        # -------------------------------------------------------------
        elif clean_action == "inactive":
            clean_reason = str(reason or "").strip()
            if not clean_reason:
                raise VehicleValidationError(
                    "Please provide a reason for marking the vehicle inactive."
                )

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_delivery_vehicle_management
                    SET status = 'inactive',
                        inactive_reason = %s,
                        maintenance_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                      AND user_id = %s
                    """,
                    [clean_reason, vehicle_id, miller_user_id],
                )

            # NOTE: Assignments in miller_vehicle_assignee are NOT altered per approved rules.
            return {
                "success": True,
                "action": "inactive",
                "message": f"Vehicle {vehicle_row[4]} marked as inactive.",
                "vehicle_id": vehicle_id,
                "status": "inactive",
                "inactive_reason": clean_reason,
            }

        # -------------------------------------------------------------
        # ACTION: MAINTENANCE
        # -------------------------------------------------------------
        elif clean_action == "maintenance":
            clean_reason = str(reason or "").strip()
            if not clean_reason:
                raise VehicleValidationError(
                    "Please provide a reason for marking the vehicle for maintenance."
                )

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_delivery_vehicle_management
                    SET status = 'for maintenance',
                        maintenance_reason = %s,
                        inactive_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                      AND user_id = %s
                    """,
                    [clean_reason, vehicle_id, miller_user_id],
                )

            # NOTE: Assignments in miller_vehicle_assignee are NOT altered per approved rules.
            return {
                "success": True,
                "action": "maintenance",
                "message": f"Vehicle {vehicle_row[4]} marked for maintenance.",
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
                    UPDATE miller_delivery_vehicle_management
                    SET status = 'active',
                        inactive_reason = NULL,
                        maintenance_reason = NULL,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE vehicle_id = %s
                      AND user_id = %s
                    """,
                    [vehicle_id, miller_user_id],
                )

            # NOTE: Assignments in miller_vehicle_assignee are NOT altered per approved rules.
            return {
                "success": True,
                "action": "set_active",
                "message": f"Vehicle {vehicle_row[4]} marked as active.",
                "vehicle_id": vehicle_id,
                "status": "active",
            }


class DeliveryAssignmentError(Exception):
    """Raised when delivery order assignment validation fails."""
    pass


def assign_order_to_driver(supplier_profile_id, online_order_id, driver_id):
    """
    Atomically assign a forwarded order to an active driver and vehicle.

    Validations:
    - Order must belong to this branch (supplier_profile_id)
    - Order status must be strictly 'Forwarded to Logistics'
    - Order must not already have an assignment in miller_driver_assignment
    - Driver must belong to this branch, position='driver', status='active'
    - Driver must have an active vehicle assignment in miller_vehicle_assignee
    - Vehicle must be active in miller_delivery_vehicle_management
    - Vehicle remaining capacity (capacity - existing pending load) must be >= order.ordered_quantity

    Atomic operations:
    1. INSERT INTO miller_driver_assignment (supplier_profile_id, online_order_id, delivery_vehicle_id, status, proof_of_delivery)
       VALUES (supplier_profile_id, online_order_id, vehicle_id, 'Pending', NULL)
    2. UPDATE miller_online_customer SET status = 'Assigned to driver', updated_at = CURRENT_TIMESTAMP
       WHERE online_order_id = %s
    """
    if not online_order_id:
        raise DeliveryAssignmentError("Online order ID is required.")
    if not driver_id:
        raise DeliveryAssignmentError("Driver ID is required.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Fetch & lock order
            cursor.execute(
                """
                SELECT
                    online_order_id,
                    supplier_profile_id,
                    ordered_quantity,
                    batch_no,
                    status
                FROM miller_online_customer
                WHERE online_order_id = %s
                FOR UPDATE
                """,
                [online_order_id],
            )
            order_row = cursor.fetchone()

        if not order_row:
            raise DeliveryAssignmentError(f"Order #{online_order_id} not found.")

        if int(order_row[1]) != int(supplier_profile_id):
            raise DeliveryAssignmentError("This order belongs to another branch.")

        if str(order_row[4]).strip() != "Forwarded to Logistics":
            raise DeliveryAssignmentError(
                f"Order #{online_order_id} has status '{order_row[4]}'. Only orders with status 'Forwarded to Logistics' can be assigned."
            )

        # 1.1 Check if this order is a return replacement
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT return_id, quantity, status
                FROM miller_online_orders_returns
                WHERE online_order_id = %s
                  AND status = 'Approved'
                ORDER BY return_id DESC
                """,
                [online_order_id],
            )
            approved_returns = cursor.fetchall()

        if len(approved_returns) > 1:
            raise DeliveryAssignmentError(
                f"Multiple approved returns found for Order #{online_order_id}. Replacement assignment is ambiguous and cannot be automatically mapped."
            )

        if len(approved_returns) == 1:
            # Per specification: Replacement quantity displayed and assigned = approved return quantity itself
            effective_order_quantity = float(approved_returns[0][1])
        else:
            effective_order_quantity = float(order_row[2]) if order_row[2] is not None else 0.0

        # 2. Check for duplicate assignment (preserve completed assignments; block if already has Pending assignment)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT assignment_id, status, delivery_vehicle_id
                FROM miller_driver_assignment
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
                """
                SELECT
                    supplier_employee_id,
                    supplier_profile_id,
                    first_name,
                    last_name,
                    position,
                    status
                FROM supplier_employees
                WHERE supplier_employee_id = %s
                LIMIT 1
                """,
                [driver_id],
            )
            driver_row = cursor.fetchone()

        if not driver_row:
            raise DeliveryAssignmentError(f"Driver #{driver_id} not found.")

        if int(driver_row[1]) != int(supplier_profile_id):
            raise DeliveryAssignmentError("Driver belongs to another branch.")

        if str(driver_row[4] or "").strip().lower() != "driver":
            raise DeliveryAssignmentError(f"Employee #{driver_id} is not registered as a driver.")

        if str(driver_row[5] or "").strip().lower() != "active":
            raise DeliveryAssignmentError(f"Driver #{driver_id} is currently inactive.")

        # 4. Resolve active vehicle assignment for driver
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    mva.assigned_id,
                    mva.vehicle_id,
                    v.plate_number,
                    v.model,
                    v.capacity,
                    v.status
                FROM miller_vehicle_assignee mva
                INNER JOIN miller_delivery_vehicle_management v
                    ON v.vehicle_id = mva.vehicle_id
                WHERE mva.driver_id = %s
                  AND mva.supplier_profile_id = %s
                  AND mva.status = 'active'
                LIMIT 1
                """,
                [driver_id, supplier_profile_id],
            )
            vehicle_row = cursor.fetchone()

        if not vehicle_row:
            raise DeliveryAssignmentError(
                f"Driver {driver_row[2]} {driver_row[3]} has no active vehicle assigned."
            )

        vehicle_id = vehicle_row[1]
        plate_number = vehicle_row[2]
        vehicle_model = vehicle_row[3]
        vehicle_capacity_raw = vehicle_row[4]
        vehicle_status = vehicle_row[5]

        if vehicle_status and vehicle_status.lower() != "active":
            raise DeliveryAssignmentError(
                f"Assigned vehicle ({plate_number}) status is '{vehicle_status}'. It cannot be assigned for deliveries."
            )

        # Parse numeric capacity
        cap_str = str(vehicle_capacity_raw or "").lower().replace(",", "").replace("kg", "").strip()
        try:
            max_capacity = float(cap_str)
        except (ValueError, TypeError):
            max_capacity = 0.0

        # 5. Check pending load on this vehicle (accounting for replacement returns)
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COALESCE(
                    SUM(
                        COALESCE(
                            (
                                SELECT mor.quantity
                                FROM miller_online_orders_returns mor
                                WHERE mor.online_order_id = mda.online_order_id
                                  AND mor.status = 'Approved'
                                ORDER BY mor.return_id DESC
                                LIMIT 1
                            ),
                            moc.ordered_quantity
                        )
                    ),
                    0.0
                )
                FROM miller_driver_assignment mda
                INNER JOIN miller_online_customer moc
                    ON moc.online_order_id = mda.online_order_id
                WHERE mda.delivery_vehicle_id = %s
                  AND mda.supplier_profile_id = %s
                  AND mda.status = 'Pending'
                """,
                [vehicle_id, supplier_profile_id],
            )
            pending_row = cursor.fetchone()
            current_pending_load = float(pending_row[0]) if pending_row and pending_row[0] is not None else 0.0

        remaining_capacity = max(0.0, max_capacity - current_pending_load)

        if effective_order_quantity > remaining_capacity:
            raise DeliveryAssignmentError(
                f"Insufficient vehicle capacity. Order requires {effective_order_quantity:,.0f} kg, but vehicle {plate_number} has only {remaining_capacity:,.0f} kg remaining ({current_pending_load:,.0f} / {max_capacity:,.0f} kg currently loaded)."
            )

        # 6. Atomic INSERT into miller_driver_assignment and UPDATE miller_online_customer
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO miller_driver_assignment (
                    supplier_profile_id,
                    online_order_id,
                    delivery_vehicle_id,
                    status,
                    proof_of_delivery
                ) VALUES (%s, %s, %s, 'Pending', NULL)
                """,
                [supplier_profile_id, online_order_id, vehicle_id],
            )
            assignment_id = cursor.lastrowid

            cursor.execute(
                """
                UPDATE miller_online_customer
                SET status = 'Assigned to driver',
                    updated_at = CURRENT_TIMESTAMP
                WHERE online_order_id = %s
                """,
                [online_order_id],
            )

        return {
            "success": True,
            "message": f"Order {batch_no} successfully assigned to driver {driver_name}.",
            "assignment_id": assignment_id,
            "driver_id": driver_id,
            "driver_name": driver_name,
            "vehicle_id": vehicle_id,
            "plate_number": plate_number,
            "order_quantity": effective_order_quantity,
            "remaining_capacity": max(0.0, remaining_capacity - effective_order_quantity),
        }


class ReturnActionError(Exception):
    """Raised when processing a product return request fails validation."""
    pass


def _extract_buyer_initials(first_name, last_name, business_name):
    """
    Generate buyer initials for archived product code.
    Example: 'John Doe' -> 'JD', 'Rice Central Warehouse' -> 'RCW', 'Retailer' -> 'RET'
    """
    if business_name and str(business_name).strip():
        words = [w.strip() for w in str(business_name).strip().split() if w.strip()]
        initials = "".join([w[0].upper() for w in words if w[0].isalnum()])
        return initials if initials else "BYR"
    parts = []
    if first_name and str(first_name).strip():
        parts.append(str(first_name).strip()[0].upper())
    if last_name and str(last_name).strip():
        parts.append(str(last_name).strip()[0].upper())
    return "".join(parts) if parts else "BYR"


def process_return_action(
    supplier_profile_id,
    return_id,
    action,
    rejection_reason=None,
    sender_user_id=None,
):
    """
    Process Approve or Reject action on a Pending product return request.

    ARCHIVED PRODUCT RULES (BOTH ACTIONS):
    - INSERT new row into miller_products with copied original product information.
    - stock_quantity = returned quantity.
    - status = 'archived'.
    - archive_reason = 'Return product from online customer [Buyer Name]'.
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
    - Deduct approved return quantity from the original miller_products.stock_quantity.
    - INSERT archived product record.
    - UPDATE original miller_online_customer.status to exactly 'Forwarded to Logistics'.
    - INSERT buyer notification message:
      'Your request to return and replace [Quantity] kg of [Product] from order [Batch Number] has been approved. Please wait for the replacement delivery.'
    """
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
                    mor.return_id,
                    mor.supplier_profile_id,
                    mor.online_order_id,
                    mor.retailer_buyer_id,
                    mor.warehouse_buyer_id,
                    mor.quantity,
                    mor.status,
                    mor.return_reference_no,
                    mor.created_at
                FROM miller_online_orders_returns mor
                WHERE mor.return_id = %s
                FOR UPDATE
                """,
                [return_id],
            )
            return_row = cursor.fetchone()

        if not return_row:
            raise ReturnActionError(f"Return request #{return_id} not found.")

        if int(return_row[1]) != int(supplier_profile_id):
            raise ReturnActionError("This return request belongs to another branch.")

        if str(return_row[6]).strip() != "Pending":
            raise ReturnActionError(
                f"Return #{return_id} has status '{return_row[6]}'. Only 'Pending' returns can be processed."
            )

        online_order_id = return_row[2]
        retailer_buyer_id = return_row[3]
        warehouse_buyer_id = return_row[4]
        return_quantity = float(return_row[5]) if return_row[5] is not None else 0.0
        return_ref_no = return_row[7]
        return_created_at = return_row[8]

        # 2. Fetch & lock the original order
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    moc.online_order_id,
                    moc.batch_no,
                    moc.ordered_quantity,
                    moc.status,
                    moc.miller_product_id
                FROM miller_online_customer moc
                WHERE moc.online_order_id = %s
                FOR UPDATE
                """,
                [online_order_id],
            )
            order_row = cursor.fetchone()

        if not order_row:
            raise ReturnActionError(f"Original order #{online_order_id} not found.")

        batch_no = order_row[1]
        original_product_id = order_row[4]

        # 3. Fetch & lock the original product
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    product_id,
                    supplier_profile_id,
                    farmer_contact_id,
                    inbound_purchase_history_id,
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
                FROM miller_products
                WHERE product_id = %s
                FOR UPDATE
                """,
                [original_product_id],
            )
            product_row = cursor.fetchone()

        if not product_row:
            raise ReturnActionError(f"Product #{original_product_id} not found.")

        orig_product_code = product_row[4]
        product_name = product_row[5]
        current_stock = float(product_row[11]) if product_row[11] is not None else 0.0

        # 4. Resolve buyer name and contact for messages and archive reason
        buyer_name = "Buyer"
        buyer_initials = "BYR"
        receiver_user_id = None
        receiver_warehouse_profile_id = None

        if warehouse_buyer_id:
            receiver_warehouse_profile_id = warehouse_buyer_id
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT business_name, organization_name
                    FROM warehouse_profiles
                    WHERE warehouse_profile_id = %s
                    LIMIT 1
                    """,
                    [warehouse_buyer_id],
                )
                wh_row = cursor.fetchone()
                if wh_row:
                    buyer_name = wh_row[0] or wh_row[1] or f"Warehouse #{warehouse_buyer_id}"
                    buyer_initials = _extract_buyer_initials(None, None, buyer_name)
        elif retailer_buyer_id:
            receiver_user_id = retailer_buyer_id
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT first_name, last_name
                    FROM users
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    [retailer_buyer_id],
                )
                user_row = cursor.fetchone()
                if user_row:
                    buyer_name = f"{user_row[0] or ''} {user_row[1] or ''}".strip() or f"Retailer #{retailer_buyer_id}"
                    buyer_initials = _extract_buyer_initials(user_row[0], user_row[1], None)

        # 5. Format return creation date for product code (MMDDYYYY)
        if return_created_at:
            date_code_str = return_created_at.strftime("%m%d%Y")
        else:
            from datetime import date
            date_code_str = date.today().strftime("%m%d%Y")

        archived_product_code = f"{orig_product_code}-RTRN-{buyer_initials}-{date_code_str}"

        # Check for duplicate / colliding product code in miller_products
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT product_id
                FROM miller_products
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

        # Format quantity for message
        qty_msg_str = f"{return_quantity:,.0f}" if return_quantity.is_integer() else f"{return_quantity:,.2f}"

        # -------------------------------------------------------------
        # ACTION: REJECT
        # -------------------------------------------------------------
        if clean_action == "reject":
            # Update return status to Rejected
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_online_orders_returns
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
                    INSERT INTO miller_products (
                        supplier_profile_id,
                        farmer_contact_id,
                        inbound_purchase_history_id,
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
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'archived'
                    )
                    """,
                    [
                        product_row[1],   # supplier_profile_id
                        product_row[2],   # farmer_contact_id
                        product_row[3],   # inbound_purchase_history_id
                        archived_product_code,
                        product_row[5],   # product_name
                        product_row[6],   # product_description
                        product_row[7],   # product_image
                        product_row[8],   # order_date
                        product_row[9],   # arrival_date
                        product_row[10],  # expiry_date
                        return_quantity,  # stock_quantity = returned quantity
                        product_row[12],  # unit_cost
                        product_row[13],  # shelf_location
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
                        sender_supplier_profile_id,
                        receiver_supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        sender_warehouse_profile_id,
                        receiver_warehouse_profile_id,
                        message_content,
                        message_attachment,
                        created_at
                    ) VALUES (
                        %s, NULL, %s, %s, NULL, %s, %s, NULL, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        receiver_warehouse_profile_id,
                        message_content,
                    ],
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
                    UPDATE miller_online_orders_returns
                    SET status = 'Approved',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE return_id = %s
                    """,
                    [return_id],
                )

            # 2. Deduct return quantity from original miller_products.stock_quantity
            new_stock = current_stock - return_quantity
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_products
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
                    INSERT INTO miller_products (
                        supplier_profile_id,
                        farmer_contact_id,
                        inbound_purchase_history_id,
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
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'archived'
                    )
                    """,
                    [
                        product_row[1],   # supplier_profile_id
                        product_row[2],   # farmer_contact_id
                        product_row[3],   # inbound_purchase_history_id
                        archived_product_code,
                        product_row[5],   # product_name
                        product_row[6],   # product_description
                        product_row[7],   # product_image
                        product_row[8],   # order_date
                        product_row[9],   # arrival_date
                        product_row[10],  # expiry_date
                        return_quantity,  # stock_quantity = returned quantity
                        product_row[12],  # unit_cost
                        product_row[13],  # shelf_location
                        archive_reason_str,
                    ],
                )

            # 4. UPDATE original miller_online_customer.status to exactly 'Forwarded to Logistics'
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE miller_online_customer
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
                        sender_supplier_profile_id,
                        receiver_supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        sender_warehouse_profile_id,
                        receiver_warehouse_profile_id,
                        message_content,
                        message_attachment,
                        created_at
                    ) VALUES (
                        %s, NULL, %s, %s, NULL, %s, %s, NULL, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        supplier_profile_id,
                        sender_user_id,
                        receiver_user_id,
                        receiver_warehouse_profile_id,
                        message_content,
                    ],
                )

            return {
                "success": True,
                "action": "approve",
                "message": f"Return request {return_ref_no} approved. Replacement order forwarded to logistics.",
                "return_id": return_id,
                "status": "Approved",
                "archived_product_code": archived_product_code,
                "remaining_stock": new_stock,
            }


