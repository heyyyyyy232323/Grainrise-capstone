import json
import os
import sys

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "grainrise_project.settings")
django.setup()

from django.db import connection
from django.test import RequestFactory

from api.miller_employees_function.employee_auth import (
    get_authenticated_miller_employee,
    miller_flc_required,
)
from api.miller_employees_function.miller_logistics.selectors import (
    get_flc_vehicle_detail,
    list_flc_active_drivers,
    list_flc_vehicles,
)
from api.miller_employees_function.miller_logistics.services import (
    CrossBranchConflictError,
    DriverNotFoundError,
    VehicleNotFoundError,
    VehicleValidationError,
    update_flc_vehicle_status,
)
from api.miller_employees_function.miller_logistics.views import (
    flc_active_drivers_view,
    flc_vehicle_detail_view,
    flc_vehicle_update_status_view,
    flc_vehicles_list_view,
)
from api.utils import create_access_token


def run_tests():
    print("=" * 70)
    print("RUNNING FLC VEHICLE ASSIGNEE MANAGEMENT BACKEND TEST SUITE")
    print("=" * 70)

    passed = 0
    total = 0

    def assert_true(condition, msg):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {msg}")
        else:
            print(f"  [FAIL] {msg}")
            raise AssertionError(msg)

    # Identifiers from DB snapshot:
    # supplier_profile_id 7 (Riggie Grains, owner user_id 18)
    # supplier_profile_id 13 (Riggie Grains 2, owner user_id 18)
    # FLC employee: ID 23 (Angelito Vallejo, branch 7, position 'fulfillment_logistics_coordinator')
    # Driver employee: ID 26 (BRYANT IVERSON, branch 7, position 'driver')

    branch_id_1 = 7
    branch_id_2 = 13
    owner_user_id = 18
    flc_emp_id = 23
    driver_emp_id = 26

    # Clean up test vehicles/assignments before test run
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM miller_vehicle_assignee WHERE vehicle_id IN (SELECT vehicle_id FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%')")
        cursor.execute("DELETE FROM miller_delivery_vehicle_branches WHERE vehicle_id IN (SELECT vehicle_id FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%')")
        cursor.execute("DELETE FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%'")
        cursor.execute("DELETE FROM supplier_employees WHERE email LIKE 'flctest_%%@grainrise.com'")

    try:
        # -------------------------------------------------------------
        # SETUP TEST DATA
        # -------------------------------------------------------------
        print("\n--- Setting up isolated test records ---")
        with connection.cursor() as cursor:
            # Create a 2nd active driver in branch 7
            cursor.execute(
                """
                INSERT INTO supplier_employees (
                    supplier_profile_id, first_name, last_name, email,
                    contact_number, username, password_hash, position, status, must_change_password
                ) VALUES (
                    %s, 'TEST_DRIVER2_FIRST', 'TEST_DRIVER2_LAST', 'flctest_driver2@grainrise.com',
                    '09123456789', 'flctest_driver2', 'hash', 'driver', 'active', 0
                )
                """,
                [branch_id_1],
            )
            driver2_emp_id = cursor.lastrowid

            # Create an active driver in branch 13
            cursor.execute(
                """
                INSERT INTO supplier_employees (
                    supplier_profile_id, first_name, last_name, email,
                    contact_number, username, password_hash, position, status, must_change_password
                ) VALUES (
                    %s, 'TEST_BRANCH13_DRIVER', 'TEST_BRANCH13_LAST', 'flctest_b13driver@grainrise.com',
                    '09987654321', 'flctest_b13driver', 'hash', 'driver', 'active', 0
                )
                """,
                [branch_id_2],
            )
            driver_branch13_id = cursor.lastrowid

            # Create vehicle 1 designated to branch 7 only
            cursor.execute(
                """
                INSERT INTO miller_delivery_vehicle_management (
                    user_id, type, number_of_wheels, model, plate_number, capacity, status
                ) VALUES (
                    %s, 'Truck', 6, 'FLCTEST ISUZU 1', 'FLCTEST-001', '3000 kg', 'active'
                )
                """,
                [owner_user_id],
            )
            vehicle_1_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO miller_delivery_vehicle_branches (vehicle_id, supplier_profile_id) VALUES (%s, %s)",
                [vehicle_1_id, branch_id_1],
            )

            # Create vehicle 2 designated to branch 7 and branch 13 (multi-branch)
            cursor.execute(
                """
                INSERT INTO miller_delivery_vehicle_management (
                    user_id, type, number_of_wheels, model, plate_number, capacity, status
                ) VALUES (
                    %s, 'Truck', 8, 'FLCTEST FUSO 2', 'FLCTEST-002', '5000 kg', 'active'
                )
                """,
                [owner_user_id],
            )
            vehicle_2_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO miller_delivery_vehicle_branches (vehicle_id, supplier_profile_id) VALUES (%s, %s), (%s, %s)",
                [vehicle_2_id, branch_id_1, vehicle_2_id, branch_id_2],
            )

            # Create vehicle 3 designated to branch 13 ONLY
            cursor.execute(
                """
                INSERT INTO miller_delivery_vehicle_management (
                    user_id, type, number_of_wheels, model, plate_number, capacity, status
                ) VALUES (
                    %s, 'Car', 4, 'FLCTEST TOYOTA 3', 'FLCTEST-003', '1000 kg', 'active'
                )
                """,
                [owner_user_id],
            )
            vehicle_3_id = cursor.lastrowid
            cursor.execute(
                "INSERT INTO miller_delivery_vehicle_branches (vehicle_id, supplier_profile_id) VALUES (%s, %s)",
                [vehicle_3_id, branch_id_2],
            )

        print(f"Created Test Vehicles: V1={vehicle_1_id}, V2={vehicle_2_id}, V3={vehicle_3_id}")
        print(f"Created Test Drivers: D2={driver2_emp_id}, D_b13={driver_branch13_id}")

        # -------------------------------------------------------------
        # TEST 1: EMPLOYEE AUTH & AUTHORIZATION
        # -------------------------------------------------------------
        print("\n--- Test 1: Employee Authentication & Position Guard ---")
        rf = RequestFactory()

        # Generate FLC token
        flc_token = create_access_token(
            {
                "sub": str(flc_emp_id),
                "role": "supplier_employee",
                "account_type": "supplier_employee",
                "organization_type": "supplier",
                "auth_source": "grainrise",
            }
        )

        req_auth = rf.get("/api/miller-employees/logistics/vehicles/", HTTP_AUTHORIZATION=f"Bearer {flc_token}")
        resolved_emp = get_authenticated_miller_employee(req_auth, required_position="fulfillment_logistics_coordinator")
        assert_true(resolved_emp is not None, "Authenticated FLC employee resolved correctly from DB")
        assert_true(resolved_emp["supplier_profile_id"] == branch_id_1, "Authoritative supplier_profile_id matches branch 7")
        assert_true(resolved_emp["owner_user_id"] == owner_user_id, "Authoritative owner_user_id matches 18")

        # Wrong position check
        resolved_wrong = get_authenticated_miller_employee(req_auth, required_position="encoder")
        assert_true(resolved_wrong is None, "Non-matching position 'encoder' blocked")

        # Missing token
        req_anon = rf.get("/api/miller-employees/logistics/vehicles/")
        res_anon = flc_vehicles_list_view(req_anon)
        assert_true(res_anon.status_code == 401, "Anonymous request blocked with 401")

        # -------------------------------------------------------------
        # TEST 2: BRANCH SCOPING FOR VEHICLE LIST & DRIVER LIST
        # -------------------------------------------------------------
        print("\n--- Test 2: Branch Scoping ---")
        vehicles_b1 = list_flc_vehicles(branch_id_1, owner_user_id)
        v1_ids = [v["vehicle_id"] for v in vehicles_b1]
        assert_true(vehicle_1_id in v1_ids, "Branch 7 vehicle 1 is present in list")
        assert_true(vehicle_2_id in v1_ids, "Multi-branch vehicle 2 is present in list for Branch 7")
        assert_true(vehicle_3_id not in v1_ids, "Branch 13 only vehicle 3 is NOT in Branch 7 list")

        drivers_b1 = list_flc_active_drivers(branch_id_1)
        d1_ids = [d["driver_id"] for d in drivers_b1]
        assert_true(driver_emp_id in d1_ids, "Branch 7 driver 26 is present")
        assert_true(driver2_emp_id in d1_ids, "Branch 7 driver 2 is present")
        assert_true(driver_branch13_id not in d1_ids, "Branch 13 driver is NOT in Branch 7 driver list")

        # -------------------------------------------------------------
        # TEST 3: VEHICLE DETAIL SCOPING & BRANCH RETRIEVAL
        # -------------------------------------------------------------
        print("\n--- Test 3: Vehicle Detail Scoping ---")
        v1_detail = get_flc_vehicle_detail(vehicle_1_id, branch_id_1, owner_user_id)
        assert_true(v1_detail is not None, "Vehicle 1 detail retrieved successfully")
        assert_true(v1_detail["plate_number"] == "FLCTEST-001", "Plate number matches")
        assert_true(v1_detail["assigned_driver_name"] == "N/A", "Initial driver is N/A")

        # Detail for vehicle not in branch
        v3_detail = get_flc_vehicle_detail(vehicle_3_id, branch_id_1, owner_user_id)
        assert_true(v3_detail is None, "Vehicle 3 not in Branch 7 returns None")

        # -------------------------------------------------------------
        # TEST 4: DRIVER ASSIGNMENT (MAX 1 ACTIVE & PRESERVE HISTORY)
        # -------------------------------------------------------------
        print("\n--- Test 4: Driver Assignment & History Preservation ---")
        # Assign driver_emp_id (26) to vehicle_1
        res_assign = update_flc_vehicle_status(
            vehicle_id=vehicle_1_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="assign_driver",
            driver_id=driver_emp_id,
        )
        assert_true(res_assign["success"] is True, "Driver 26 assigned to Vehicle 1")

        # Check DB rows in miller_vehicle_assignee
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT assigned_id, status FROM miller_vehicle_assignee WHERE vehicle_id = %s",
                [vehicle_1_id],
            )
            rows = cursor.fetchall()
            assert_true(len(rows) == 1, "Exactly one assignment row exists for vehicle 1")
            assert_true(rows[0][1] == "active", "Assignment row is 'active'")

        # Reassign vehicle_1 to driver2_emp_id
        res_reassign = update_flc_vehicle_status(
            vehicle_id=vehicle_1_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="assign_driver",
            driver_id=driver2_emp_id,
        )
        assert_true(res_reassign["success"] is True, "Reassigned Vehicle 1 to Driver 2")

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT assigned_id, driver_id, status FROM miller_vehicle_assignee WHERE vehicle_id = %s ORDER BY assigned_id ASC",
                [vehicle_1_id],
            )
            rows = cursor.fetchall()
            assert_true(len(rows) == 2, "History preserved: exactly 2 rows exist for vehicle 1")
            assert_true(rows[0][1] == driver_emp_id and rows[0][2] == "changed", "First assignment updated to 'changed'")
            assert_true(rows[1][1] == driver2_emp_id and rows[1][2] == "active", "Second assignment created as 'active'")

        # Now assign driver2_emp_id to vehicle_2 -> Driver 2's assignment on vehicle_1 should become 'changed'!
        res_v2 = update_flc_vehicle_status(
            vehicle_id=vehicle_2_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="assign_driver",
            driver_id=driver2_emp_id,
        )
        assert_true(res_v2["success"] is True, "Assigned Driver 2 to Vehicle 2")

        with connection.cursor() as cursor:
            # Check Vehicle 1: should now have NO active assignments
            cursor.execute(
                "SELECT COUNT(*) FROM miller_vehicle_assignee WHERE vehicle_id = %s AND status = 'active'",
                [vehicle_1_id],
            )
            assert_true(cursor.fetchone()[0] == 0, "Vehicle 1 active assignment deactivated when driver was reassigned to Vehicle 2")

            # Check Driver 2: should have exactly ONE active assignment (on vehicle 2)
            cursor.execute(
                "SELECT vehicle_id, status FROM miller_vehicle_assignee WHERE driver_id = %s AND status = 'active'",
                [driver2_emp_id],
            )
            active_d2 = cursor.fetchall()
            assert_true(len(active_d2) == 1, "Max one ACTIVE vehicle per driver enforced")
            assert_true(active_d2[0][0] == vehicle_2_id, "Driver 2 active on vehicle 2")

        # -------------------------------------------------------------
        # TEST 5: CROSS-BRANCH REASSIGNMENT CONFLICT REPORTING
        # -------------------------------------------------------------
        print("\n--- Test 5: Cross-Branch Conflict Prevention ---")
        # Vehicle 2 is designated to branch 7 and branch 13.
        # Currently, Vehicle 2 has active assignment in Branch 7 (driver 2).
        # An attempt from Branch 13 FLC to assign a driver to Vehicle 2 must raise CrossBranchConflictError!
        try:
            update_flc_vehicle_status(
                vehicle_id=vehicle_2_id,
                supplier_profile_id=branch_id_2,
                miller_user_id=owner_user_id,
                action="assign_driver",
                driver_id=driver_branch13_id,
            )
            assert_true(False, "Should have raised CrossBranchConflictError")
        except CrossBranchConflictError as e:
            assert_true("Riggie Grains" in str(e) or "another branch" in str(e), f"Conflict reported safely: {e}")

        # Ensure Branch 7's assignment was NOT touched
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT supplier_profile_id, status FROM miller_vehicle_assignee WHERE vehicle_id = %s AND status = 'active'",
                [vehicle_2_id],
            )
            active_row = cursor.fetchone()
            assert_true(active_row[0] == branch_id_1, "Branch 7 assignment preserved intact without silent overwrite")

        # -------------------------------------------------------------
        # TEST 6: STATUS TRANSITIONS & ASSIGNMENT NON-DESTRUCTION
        # -------------------------------------------------------------
        print("\n--- Test 6: Status Transitions & Non-destruction of Assignments ---")
        # Mark Vehicle 2 as Inactive with reason
        res_inactive = update_flc_vehicle_status(
            vehicle_id=vehicle_2_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="inactive",
            reason="Transmission repair needed",
        )
        assert_true(res_inactive["success"] is True, "Vehicle marked inactive")

        v2_det_inactive = get_flc_vehicle_detail(vehicle_2_id, branch_id_1, owner_user_id)
        assert_true(v2_det_inactive["status"] == "inactive", "Status is inactive")
        assert_true(v2_det_inactive["inactive_reason"] == "Transmission repair needed", "Inactive reason saved")
        assert_true(v2_det_inactive["maintenance_reason"] is None, "Maintenance reason cleared")
        assert_true(v2_det_inactive["assigned_driver"] is not None, "CRITICAL: Assignment NOT auto-changed when inactive")

        # Mark Vehicle 2 for Maintenance with reason
        res_maint = update_flc_vehicle_status(
            vehicle_id=vehicle_2_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="maintenance",
            reason="Routine brake pad replacement",
        )
        assert_true(res_maint["success"] is True, "Vehicle marked for maintenance")

        v2_det_maint = get_flc_vehicle_detail(vehicle_2_id, branch_id_1, owner_user_id)
        assert_true(v2_det_maint["status"] == "for maintenance", "Status persisted as 'for maintenance'")
        assert_true(v2_det_maint["maintenance_reason"] == "Routine brake pad replacement", "Maintenance reason saved")
        assert_true(v2_det_maint["inactive_reason"] is None, "Inactive reason cleared")
        assert_true(v2_det_maint["assigned_driver"] is not None, "CRITICAL: Assignment NOT auto-changed when for maintenance")

        # Set Vehicle 2 Active
        res_active = update_flc_vehicle_status(
            vehicle_id=vehicle_2_id,
            supplier_profile_id=branch_id_1,
            miller_user_id=owner_user_id,
            action="set_active",
        )
        assert_true(res_active["success"] is True, "Vehicle marked active")

        v2_det_active = get_flc_vehicle_detail(vehicle_2_id, branch_id_1, owner_user_id)
        assert_true(v2_det_active["status"] == "active", "Status is active")
        assert_true(v2_det_active["inactive_reason"] is None, "Inactive reason cleared")
        assert_true(v2_det_active["maintenance_reason"] is None, "Maintenance reason cleared")
        assert_true(v2_det_active["assigned_driver"] is not None, "Assignment preserved")

        # -------------------------------------------------------------
        # TEST 7: HTTP ENDPOINTS TEST VIA DJANGO REQUEST FACTORY
        # -------------------------------------------------------------
        print("\n--- Test 7: HTTP Endpoints & Views ---")
        # GET /api/miller-employees/logistics/vehicles/
        req_list = rf.get("/api/miller-employees/logistics/vehicles/?sort=plate_asc", HTTP_AUTHORIZATION=f"Bearer {flc_token}")
        res_list = flc_vehicles_list_view(req_list)
        assert_true(res_list.status_code == 200, "Vehicles list view returns 200")
        list_json = json.loads(res_list.content)
        assert_true(list_json["success"] is True, "Vehicles list response success=True")
        assert_true(any(v["vehicle_id"] == vehicle_2_id for v in list_json["vehicles"]), "Vehicle 2 in list")

        # GET /api/miller-employees/logistics/vehicles/<id>/
        req_det = rf.get(f"/api/miller-employees/logistics/vehicles/{vehicle_2_id}/", HTTP_AUTHORIZATION=f"Bearer {flc_token}")
        res_det = flc_vehicle_detail_view(req_det, vehicle_id=vehicle_2_id)
        assert_true(res_det.status_code == 200, "Vehicle detail view returns 200")
        det_json = json.loads(res_det.content)
        assert_true(det_json["vehicle"]["plate_number"] == "FLCTEST-002", "Detail view returns correct plate")

        # GET /api/miller-employees/logistics/drivers/
        req_driv = rf.get("/api/miller-employees/logistics/drivers/", HTTP_AUTHORIZATION=f"Bearer {flc_token}")
        res_driv = flc_active_drivers_view(req_driv)
        assert_true(res_driv.status_code == 200, "Drivers view returns 200")
        driv_json = json.loads(res_driv.content)
        assert_true(len(driv_json["drivers"]) >= 2, "Drivers returned for branch 7")

        # POST /api/miller-employees/logistics/vehicles/<id>/update-status/ (assign driver)
        post_assign_body = json.dumps({"action": "assign_driver", "driver_id": driver_emp_id})
        req_post_assign = rf.post(
            f"/api/miller-employees/logistics/vehicles/{vehicle_1_id}/update-status/",
            data=post_assign_body,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {flc_token}",
        )
        res_post_assign = flc_vehicle_update_status_view(req_post_assign, vehicle_id=vehicle_1_id)
        assert_true(res_post_assign.status_code == 200, "Update status endpoint assign_driver returns 200")

        # POST invalid action
        bad_action_body = json.dumps({"action": "fly_to_mars"})
        req_bad = rf.post(
            f"/api/miller-employees/logistics/vehicles/{vehicle_1_id}/update-status/",
            data=bad_action_body,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {flc_token}",
        )
        res_bad = flc_vehicle_update_status_view(req_bad, vehicle_id=vehicle_1_id)
        assert_true(res_bad.status_code == 400, "Invalid action returns 400")

        # POST missing reason for inactive
        no_reason_body = json.dumps({"action": "inactive", "reason": "   "})
        req_no_reason = rf.post(
            f"/api/miller-employees/logistics/vehicles/{vehicle_1_id}/update-status/",
            data=no_reason_body,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {flc_token}",
        )
        res_no_reason = flc_vehicle_update_status_view(req_no_reason, vehicle_id=vehicle_1_id)
        assert_true(res_no_reason.status_code == 400, "Inactive missing reason returns 400")

    finally:
        # Cleanup test records
        print("\n--- Cleaning up test records ---")
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM miller_vehicle_assignee WHERE vehicle_id IN (SELECT vehicle_id FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%')")
            cursor.execute("DELETE FROM miller_delivery_vehicle_branches WHERE vehicle_id IN (SELECT vehicle_id FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%')")
            cursor.execute("DELETE FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'FLCTEST-%%'")
            cursor.execute("DELETE FROM supplier_employees WHERE email LIKE 'flctest_%%@grainrise.com'")
        print("Cleanup completed.")

    print("\n" + "=" * 70)
    print(f"TEST RESULTS: {passed} / {total} PASSED")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
