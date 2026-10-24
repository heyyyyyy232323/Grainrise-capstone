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

        order_quantity = float(order_row[2]) if order_row[2] is not None else 0.0

        # 2. Check for duplicate assignment
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT assignment_id, status, delivery_vehicle_id
                FROM miller_driver_assignment
                WHERE online_order_id = %s
                LIMIT 1
                """,
                [online_order_id],
            )
            existing_assignment = cursor.fetchone()

        if existing_assignment:
            raise DeliveryAssignmentError(
                f"Order #{online_order_id} is already assigned (Assignment #{existing_assignment[0]})."
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

        # 5. Check pending load on this vehicle
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT COALESCE(SUM(moc.ordered_quantity), 0.0)
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

        if order_quantity > remaining_capacity:
            raise DeliveryAssignmentError(
                f"Insufficient vehicle capacity. Order requires {order_quantity:,.0f} kg, but vehicle {plate_number} has only {remaining_capacity:,.0f} kg remaining ({current_pending_load:,.0f} / {max_capacity:,.0f} kg currently loaded)."
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
            "message": f"Order {order_row[3]} successfully assigned to driver {driver_row[2]} {driver_row[3]} ({plate_number}).",
            "assignment_id": assignment_id,
            "online_order_id": online_order_id,
            "driver_id": driver_id,
            "driver_name": f"{driver_row[2]} {driver_row[3]}",
            "vehicle_id": vehicle_id,
            "plate_number": plate_number,
            "vehicle_model": vehicle_model,
            "order_quantity": order_quantity,
            "remaining_capacity": max(0.0, remaining_capacity - order_quantity),
        }

