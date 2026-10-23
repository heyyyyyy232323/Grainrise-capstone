import io
import os
import sys

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "grainrise_project.settings")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import RequestFactory

from api.miller_function.vehicle_management.selectors import (
    get_miller_vehicle_detail,
    is_plate_number_taken,
    list_miller_branches,
    list_miller_vehicles,
    validate_branches_belong_to_miller,
)
from api.miller_function.vehicle_management.services import (
    VehicleDuplicatePlateError,
    VehicleNotFoundError,
    VehicleValidationError,
    create_vehicle,
    update_vehicle,
)
from api.utils import create_access_token


def run_all_tests():
    print("=" * 70)
    print("RUNNING MILLER OWNER VEHICLE MANAGEMENT TEST SUITE")
    print("=" * 70)
    passed_count = 0
    total_count = 0

    def assert_true(condition, msg):
        nonlocal passed_count, total_count
        total_count += 1
        if condition:
            passed_count += 1
            print(f"  [PASS] {msg}")
        else:
            print(f"  [FAIL] {msg}")
            raise AssertionError(msg)

    # Setup test identifiers
    miller_id = 18
    other_miller_id = 19
    miller_branch_1 = 7
    miller_branch_2 = 13
    other_miller_branch = 8
    test_plate_1 = "TEST-ABC123"
    test_plate_2 = "TEST-XYZ789"

    # Cleanup any old test rows before starting
    with connection.cursor() as cursor:
        cursor.execute(
            "DELETE FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'TEST-%%'"
        )

    try:
        # ─── 1. SELECTORS: BRANCH LIST & VALIDATION ───────────────────────
        print("\n--- 1. Testing Selectors: Branches & Security Isolation ---")
        branches = list_miller_branches(miller_id)
        assert_true(len(branches) >= 2, "Miller 18 has multiple branches loaded")
        b_ids = [b["supplier_profile_id"] for b in branches]
        assert_true(miller_branch_1 in b_ids, f"Branch {miller_branch_1} belongs to Miller 18")
        assert_true(miller_branch_2 in b_ids, f"Branch {miller_branch_2} belongs to Miller 18")
        assert_true(
            other_miller_branch not in b_ids,
            f"Other Miller branch {other_miller_branch} is NOT exposed to Miller 18",
        )

        valid_b = validate_branches_belong_to_miller(miller_id, [miller_branch_1, miller_branch_2])
        assert_true(valid_b == [miller_branch_1, miller_branch_2], "validate_branches returns valid IDs")

        # Designation of unauthorized branch must fail
        unauth_failed = False
        try:
            validate_branches_belong_to_miller(miller_id, [other_miller_branch])
        except ValueError:
            unauth_failed = True
        assert_true(unauth_failed, "Designating other Miller branch was correctly rejected")

        # Empty branch list must fail
        empty_failed = False
        try:
            validate_branches_belong_to_miller(miller_id, [])
        except ValueError:
            empty_failed = True
        assert_true(empty_failed, "Designating empty branch list was correctly rejected")

        # ─── 2. SERVICES: VEHICLE CREATION ────────────────────────────────
        print("\n--- 2. Testing Services: Vehicle Creation & Integrity ---")
        vehicle_data = {
            "plate_number": test_plate_1,
            "type": "Truck",
            "model": "Isuzu Forward 6-Wheeler",
            "number_of_wheels": 6,
            "capacity": "5,000 kg",
            "branch_ids": [miller_branch_1, miller_branch_2],
        }

        created = create_vehicle(miller_id, vehicle_data)
        v_id = created["id"]
        assert_true(v_id is not None, f"Vehicle created with ID {v_id}")
        assert_true(created["plate_number"] == test_plate_1, "Plate number matches")
        assert_true(created["type"] == "Truck", "Type matches enum 'Truck'")
        assert_true(created["number_of_wheels"] == 6, "Number of wheels is 6")
        assert_true(created["status"] == "active", "Initial status is 'active'")
        assert_true(len(created["branches"]) == 2, "Designated to 2 branches")

        # Verify plate number uniqueness check
        assert_true(is_plate_number_taken(test_plate_1), "is_plate_number_taken detects existing plate")

        dup_failed = False
        try:
            create_vehicle(miller_id, vehicle_data)
        except VehicleDuplicatePlateError:
            dup_failed = True
        assert_true(dup_failed, "Duplicate plate creation was rejected with VehicleDuplicatePlateError")

        # QA: Capacity rejection tests (letters & negative)
        bad_capacity_failed = False
        try:
            create_vehicle(miller_id, {**vehicle_data, "plate_number": "TEST-BADCAP1", "capacity": "AAAA"})

        except VehicleValidationError:
            bad_capacity_failed = True
        assert_true(bad_capacity_failed, "Capacity with letters ('AAAA') was rejected with VehicleValidationError")

        neg_capacity_failed = False
        try:
            create_vehicle(miller_id, {**vehicle_data, "plate_number": "TEST-BADCAP2", "capacity": "-500 kg"})
        except VehicleValidationError:
            neg_capacity_failed = True
        assert_true(neg_capacity_failed, "Negative capacity was rejected with VehicleValidationError")

        # QA: Wheels validation tests
        bad_truck_wheels_failed = False
        try:
            create_vehicle(miller_id, {**vehicle_data, "plate_number": "TEST-BADW1", "number_of_wheels": 4})
        except VehicleValidationError:
            bad_truck_wheels_failed = True
        assert_true(bad_truck_wheels_failed, "Truck with 4 wheels was rejected (only 6, 8, 10, 12 allowed)")

        bad_motor_wheels_failed = False
        try:
            create_vehicle(miller_id, {**vehicle_data, "plate_number": "TEST-BADW2", "type": "Motor", "number_of_wheels": 10})
        except VehicleValidationError:
            bad_motor_wheels_failed = True
        assert_true(bad_motor_wheels_failed, "Motor with 10 wheels was rejected (only 2, 3, 4, 6, 8 allowed)")

        # ─── 3. SELECTORS: VEHICLE LIST & DETAIL ─────────────────────────

        print("\n--- 3. Testing Selectors: List, Filtering, and Privacy ---")
        v_list = list_miller_vehicles(miller_id, search=test_plate_1)
        assert_true(len(v_list) == 1, "list_miller_vehicles returns created vehicle for Miller 18")
        assert_true(v_list[0]["plate_number"] == test_plate_1, "Returned vehicle plate matches")
        assert_true("branch" in v_list[0], "Vehicle list row includes 'branch' table column")

        # Cross-tenant privacy check: Other miller cannot see this vehicle
        v_list_other = list_miller_vehicles(other_miller_id, search=test_plate_1)
        assert_true(
            len(v_list_other) == 0,
            "Other Miller (19) cannot see Miller 18's vehicle in vehicle list",
        )

        detail = get_miller_vehicle_detail(miller_id, v_id)
        assert_true(detail is not None, "get_miller_vehicle_detail retrieves vehicle for owner")
        assert_true(detail["plate_number"] == test_plate_1, "Detail plate matches")

        detail_other = get_miller_vehicle_detail(other_miller_id, v_id)
        assert_true(
            detail_other is None,
            "Other Miller (19) cannot retrieve detail of Miller 18's vehicle (returns None)",
        )

        # ─── 4. SERVICES: VEHICLE UPDATE & BRANCH RE-MAPPING ──────────────
        print("\n--- 4. Testing Services: Update & Branch Re-mapping ---")
        updated = update_vehicle(
            miller_id,
            v_id,
            {
                "model": "Isuzu Giga Heavy Duty",
                "capacity": "10,000 kg",
                "status": "for maintenance",
                "branch_ids": [miller_branch_1],  # Change to 1 branch
            },
        )
        assert_true(updated["model"] == "Isuzu Giga Heavy Duty", "Model updated")
        assert_true(updated["capacity"] == "10,000 kg", "Capacity updated")
        assert_true(updated["status"] == "for maintenance", "Status updated to 'for maintenance'")
        assert_true(len(updated["branches"]) == 1, "Branch re-mapped to 1 branch transactionally")
        assert_true(
            updated["branches"][0]["supplier_profile_id"] == miller_branch_1,
            "Remaining branch is branch 7",
        )

        # Unauthorized update check
        unauth_update_failed = False
        try:
            update_vehicle(other_miller_id, v_id, {"model": "Tampered"})
        except VehicleNotFoundError:
            unauth_update_failed = True
        assert_true(unauth_update_failed, "Other Miller cannot update vehicle (VehicleNotFoundError)")

        # ─── 5. PHOTO UPLOAD & REMOVAL ───────────────────────────────────
        print("\n--- 5. Testing Photo Upload & Removal ---")
        dummy_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
            b"\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
            b"\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        photo_file = SimpleUploadedFile("delivery_truck.png", dummy_png, content_type="image/png")

        created_photo_v = create_vehicle(
            miller_id,
            {
                "plate_number": test_plate_2,
                "type": "Motor",
                "model": "Honda TMX 125",
                "number_of_wheels": 2,
                "capacity": "150 kg",
                "branch_ids": [miller_branch_1],
            },
            photo_file=photo_file,
        )
        photo_v_id = created_photo_v["id"]
        assert_true(created_photo_v["photo"] is not None, "Photo path stored in database")
        assert_true(
            created_photo_v["photo_url"].startswith("/media/vehicles/"),
            "Photo URL resolved to /media/vehicles/ path",
        )

        # Remove photo via update
        updated_remove_p = update_vehicle(
            miller_id,
            photo_v_id,
            {},
            remove_photo=True,
        )
        assert_true(updated_remove_p["photo"] is None, "Photo path cleared in database on remove")
        assert_true(updated_remove_p["photo_url"] is None, "Photo URL resolved to None")

        # ─── 6. VIEWS INTEGRATION VIA REST API ───────────────────────────
        print("\n--- 6. Testing Views Integration & Permissions ---")
        from rest_framework.test import APIRequestFactory
        from api.miller_function.vehicle_management.views import (
            list_vehicles_view,
            list_branches_view,
            check_plate_view,
            create_vehicle_view,
            detail_vehicle_view,
            update_vehicle_view,
        )

        api_factory = APIRequestFactory()

        # Generate actual JWT for Miller Manager (User 18)
        miller_token = create_access_token(
            {
                "sub": "18",
                "role": "miller_manager",
                "account_type": "main_user",
                "auth_source": "grainrise",
            }
        )

        # GET /api/miller/vehicles/
        req = api_factory.get("/api/miller/vehicles/", HTTP_AUTHORIZATION=f"Bearer {miller_token}")
        resp = list_vehicles_view(req)
        assert_true(resp.status_code == 200, f"list_vehicles_view returned HTTP 200 (got {resp.status_code})")
        assert_true(resp.data.get("success") is True, "Response success is True")
        assert_true(len(resp.data.get("vehicles", [])) >= 2, "Vehicles list returned for Miller 18")

        # GET /api/miller/vehicles/branches/
        req_b = api_factory.get("/api/miller/vehicles/branches/", HTTP_AUTHORIZATION=f"Bearer {miller_token}")
        resp_b = list_branches_view(req_b)
        assert_true(resp_b.status_code == 200, f"list_branches_view returned HTTP 200 (got {resp_b.status_code})")
        assert_true(len(resp_b.data.get("branches", [])) >= 2, "Branches returned for Miller 18")

        # GET /api/miller/vehicles/check-plate/
        req_cp = api_factory.get(
            f"/api/miller/vehicles/check-plate/?plate_number={test_plate_1}",
            HTTP_AUTHORIZATION=f"Bearer {miller_token}",
        )
        resp_cp = check_plate_view(req_cp)
        assert_true(resp_cp.status_code == 200, "check_plate_view returned HTTP 200")
        assert_true(resp_cp.data.get("is_unique") is False, "test_plate_1 correctly reported as not unique")

        # GET /api/miller/vehicles/<id>/
        req_det = api_factory.get(f"/api/miller/vehicles/{v_id}/", HTTP_AUTHORIZATION=f"Bearer {miller_token}")
        resp_det = detail_vehicle_view(req_det, vehicle_id=v_id)
        assert_true(resp_det.status_code == 200, "detail_vehicle_view returned HTTP 200")
        assert_true(resp_det.data.get("vehicle", {}).get("plate_number") == test_plate_1, "Vehicle plate in detail matches")

        # Multi-branch Create via View
        req_mv_create = api_factory.post(
            "/api/miller/vehicles/create/",
            {
                "plate_number": "TEST-MULTI-BR1",
                "type": "Truck",
                "model": "Isuzu Forward Multi-Branch",
                "number_of_wheels": 6,
                "capacity": "6000 kg",
                "branch_ids": [miller_branch_1, miller_branch_2],
                "branch_ids_json": f"[{miller_branch_1}, {miller_branch_2}]",
            },
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {miller_token}",
        )
        resp_mv_create = create_vehicle_view(req_mv_create)
        assert_true(resp_mv_create.status_code == 201, "create_vehicle_view with multiple branches returned 201")
        mv_id = resp_mv_create.data.get("vehicle", {}).get("vehicle_id")
        created_branches = resp_mv_create.data.get("vehicle", {}).get("branches", [])
        assert_true(len(created_branches) == 2, f"Created vehicle has all 2 branches (got {len(created_branches)})")

        # Multi-branch Detail via View (ALL branches displayed)
        req_mv_det = api_factory.get(f"/api/miller/vehicles/{mv_id}/", HTTP_AUTHORIZATION=f"Bearer {miller_token}")
        resp_mv_det = detail_vehicle_view(req_mv_det, vehicle_id=mv_id)
        assert_true(resp_mv_det.status_code == 200, "detail_vehicle_view returned 200")
        det_branches = resp_mv_det.data.get("vehicle", {}).get("branches", [])
        assert_true(len(det_branches) == 2, f"detail_vehicle_view returned ALL 2 assigned branches (got {len(det_branches)})")

        # Multi-branch Update via View
        req_mv_update = api_factory.post(
            f"/api/miller/vehicles/{mv_id}/edit/",
            {
                "plate_number": "TEST-MULTI-BR1",
                "type": "Truck",
                "model": "Isuzu Forward Multi-Branch Updated",
                "number_of_wheels": 6,
                "capacity": "7500 kg",
                "status": "active",
                "branch_ids": [miller_branch_1, miller_branch_2],
                "branch_ids_json": f"[{miller_branch_1}, {miller_branch_2}]",
            },
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {miller_token}",
        )
        resp_mv_update = update_vehicle_view(req_mv_update, vehicle_id=mv_id)
        assert_true(resp_mv_update.status_code == 200, "update_vehicle_view with multiple branches returned 200")
        upd_branches = resp_mv_update.data.get("vehicle", {}).get("branches", [])
        assert_true(len(upd_branches) == 2, f"update_vehicle_view preserved ALL 2 assigned branches (got {len(upd_branches)})")

        # Unauthenticated request check
        req_unauth = api_factory.get("/api/miller/vehicles/")
        resp_unauth = list_vehicles_view(req_unauth)
        assert_true(resp_unauth.status_code == 401, "Unauthenticated request correctly returned HTTP 401")

        print("\n" + "=" * 70)
        print(f"ALL TESTS PASSED SUCCESSFULLY! ({passed_count}/{total_count})")
        print("=" * 70)

    finally:
        # Cleanup test vehicles
        with connection.cursor() as cursor:
            cursor.execute(
                "DELETE FROM miller_delivery_vehicle_management WHERE plate_number LIKE 'TEST-%%'"
            )


if __name__ == "__main__":
    run_all_tests()

