import datetime
from decimal import Decimal
import io
import os
import sys

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "grainrise_project.settings")
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection, transaction
from django.test import RequestFactory
from django.utils import timezone

from api.miller_employees_function.employee_auth import (
    miller_procurement_required,
    miller_encoder_required,
)
from api.miller_employees_function.miller_procurement.receiving_orders.selectors import (
    get_eligible_receiving_orders,
    get_receiving_order_detail,
)
from api.miller_employees_function.miller_procurement.receiving_orders.services import (
    create_receiving_encoder_notification,
    extract_contact_initials,
    extract_first2_business,
    extract_first3_product,
    extract_last4_batch,
    generate_product_code,
    generate_receiving_reference,
    generate_return_reference,
    receive_inbound_order,
    ReceivingValidationError,
    OrderNotFoundError,
    InvalidOrderStateError,
)
from api.miller_employees_function.miller_encoder.notifications.selectors import (
    list_encoder_notifications,
    get_encoder_unseen_notification_count,
)
from api.miller_employees_function.miller_procurement.receiving_orders.views import (
    receiving_orders_list_view,
    receiving_order_detail_view,
    receive_order_view,
)
from api.miller_function.order_approval.selectors import get_manager_order_detail
from api.utils import create_access_token


def run_all_tests():
    print("=" * 60)
    print("RUNNING MILLER PROCUREMENT RECEIVING ORDERS TEST SUITE")
    print("=" * 60)
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

    rf = RequestFactory()

    procurement_token = create_access_token({
        "sub": "20",
        "role": "supplier_employee",
        "account_type": "supplier_employee",
        "organization_type": "supplier",
        "auth_source": "grainrise",
    })
    encoder_token = create_access_token({
        "sub": "19",
        "role": "supplier_employee",
        "account_type": "supplier_employee",
        "organization_type": "supplier",
        "auth_source": "grainrise",
    })

    def make_dummy_photo(name="photo.jpg"):
        content = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 100
        return SimpleUploadedFile(name, content, content_type="image/jpeg")

    # ---------------------------------------------------------
    # TEST 1: IDENTIFIER FORMAT GENERATIONS
    # ---------------------------------------------------------
    print("\n--- Test Suite 1: Reference and Code Formats ---")
    assert_true(extract_last4_batch("DIN-RI-20261008-0529") == "0529", "Extract last 4 of hyphenated batch")
    assert_true(extract_last4_batch("DIN - RI - 20261008 - 0529") == "0529", "Extract last 4 of spaced hyphenated batch")
    assert_true(extract_first2_business("Grainrise") == "GR", "Extract first 2 of business name (Grainrise)")
    assert_true(extract_first2_business("Riggie Grains") == "RI", "Extract first 2 of business name (Riggie Grains)")
    assert_true(extract_contact_initials("Juan Magsasaka") == "JM", "Extract initials of Juan Magsasaka -> JM")
    assert_true(extract_first3_product("Dinurado") == "DIN", "Extract first 3 of product Dinurado -> DIN")
    assert_true(extract_first3_product("Dinorado Palay") == "DIN", "Extract first 3 of product Dinorado Palay -> DIN")

    test_dt = datetime.datetime(2026, 10, 15, 12, 12)
    with connection.cursor() as cursor:
        rec_ref = generate_receiving_reference(
            cursor,
            batch_no="DIN-RI-20261008-0529",
            business_name="Grainrise",
            contact_person="Juan Magsasaka",
            dt=test_dt,
        )
    assert_true(rec_ref == "0529-GR-JM-10152026-1212", f"Generated receiving reference format matches example: {rec_ref}")

    prod_dt = datetime.datetime(2026, 10, 15, 10, 1)
    with connection.cursor() as cursor:
        prod_code = generate_product_code(
            cursor,
            batch_no="DIN-RI-20261008-0529",
            dt=prod_dt,
            business_name="Grainrise",
            product_name="Dinurado",
        )
    assert_true(prod_code == "0529-10152026-1001-GR-DIN", f"Generated product code format matches example: {prod_code}")

    with connection.cursor() as cursor:
        ret_ref = generate_return_reference(
            cursor,
            inbound_order_id=99999,
            receiving_ref="0529-GR-JM-10152026-1212",
            received_bad=Decimal("45.00"),
        )
    assert_true(ret_ref == "0529-GR-JM-10152026-1212-001-0045", f"Generated return reference format matches example: {ret_ref}")

    # ---------------------------------------------------------
    # TEST 2: AUTHENTICATION AND ROLE PERMISSIONS
    # ---------------------------------------------------------
    print("\n--- Test Suite 2: Auth and Scoping Protection ---")
    # No token
    req = rf.get("/api/miller-employees/procurement/receiving-orders/")
    res = receiving_orders_list_view(req)
    assert_true(res.status_code == 401, "Reject unauthenticated request without token (401)")

    # Encoder attempting procurement endpoint
    req = rf.get(
        "/api/miller-employees/procurement/receiving-orders/",
        HTTP_AUTHORIZATION=f"Bearer {encoder_token}",
    )
    res = receiving_orders_list_view(req)
    assert_true(res.status_code == 403, "Reject encoder accessing procurement endpoint (403)")

    # Valid procurement employee
    req = rf.get(
        "/api/miller-employees/procurement/receiving-orders/",
        HTTP_AUTHORIZATION=f"Bearer {procurement_token}",
    )
    res = receiving_orders_list_view(req)
    assert_true(res.status_code == 200, "Allow active procurement employee (200)")
    data = res.data.get("data", [])
    assert_true(len(data) >= 1, f"Returns active receiving orders list ({len(data)} orders found)")

    # ---------------------------------------------------------
    # TEST 3: INPUT VALIDATIONS
    # ---------------------------------------------------------
    print("\n--- Test Suite 3: Input Validations ---")
    proof_photo = make_dummy_photo("proof.jpg")
    evidence_photo = make_dummy_photo("evidence.jpg")

    # 1. Total received <= 0
    try:
        receive_inbound_order(7, 20, 3, 0, False, 0, 25, 5, "Silo 1", "2027-01-01", proof_photo)
        assert_true(False, "Should reject total received <= 0")
    except ReceivingValidationError as e:
        assert_true("greater than zero" in str(e), "Properly rejected total received <= 0")

    # 2. Total received > remaining receivable
    try:
        receive_inbound_order(7, 20, 3, 999999, False, 0, 25, 5, "Silo 1", "2027-01-01", proof_photo)
        assert_true(False, "Should reject total received > remaining receivable")
    except ReceivingValidationError as e:
        assert_true("cannot exceed" in str(e), "Properly rejected total received > remaining")

    # 3. Bad received > total received
    try:
        receive_inbound_order(7, 20, 3, 100, True, 200, 25, 5, "Silo 1", "2027-01-01", proof_photo, evidence_photo)
        assert_true(False, "Should reject bad > total")
    except ReceivingValidationError as e:
        assert_true("cannot exceed total received" in str(e), "Properly rejected bad > total")

    # 4. Missing photo evidence when bad > 0
    try:
        receive_inbound_order(7, 20, 3, 100, True, 20, 25, 5, "Silo 1", "2027-01-01", proof_photo, None)
        assert_true(False, "Should reject missing photo evidence when bad > 0")
    except ReceivingValidationError as e:
        assert_true("Proof of rejected goods photo is required" in str(e), "Properly rejected missing return photo")

    # 5. Past expiry date
    past_date = (timezone.localdate() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
    try:
        receive_inbound_order(7, 20, 3, 100, False, 0, 25, 5, "Silo 1", past_date, proof_photo)
        assert_true(False, "Should reject past expiry date")
    except ReceivingValidationError as e:
        assert_true("past date" in str(e), "Properly rejected past expiry date")

    # 5b. Missing shelf location when accepted good > 0
    try:
        receive_inbound_order(7, 20, 3, 100, False, 0, 25, 5, "", "2027-01-01", proof_photo)
        assert_true(False, "Should reject missing shelf location when good > 0")
    except ReceivingValidationError as e:
        assert_true("Shelf location is required" in str(e), "Properly rejected missing shelf location")

    # 6. Zero/negative price per kg
    try:
        receive_inbound_order(7, 20, 3, 100, False, 0, 0, 5, "Silo 1", "2027-01-01", proof_photo)
        assert_true(False, "Should reject zero price")
    except ReceivingValidationError as e:
        assert_true("greater than zero" in str(e), "Properly rejected price <= 0")

    # 7. Rating outside 1-5
    try:
        receive_inbound_order(7, 20, 3, 100, False, 0, 25, 6, "Silo 1", "2027-01-01", proof_photo)
        assert_true(False, "Should reject rating > 5")
    except ReceivingValidationError as e:
        assert_true("between 1 and 5" in str(e), "Properly rejected rating outside 1-5")

    # 8. Cross-business scoping (supplier_profile_id = 9999)
    try:
        receive_inbound_order(9999, 20, 3, 100, False, 0, 25, 5, "Silo 1", "2027-01-01", proof_photo)
        assert_true(False, "Should reject cross-business access")
    except OrderNotFoundError as e:
        assert_true("not found or does not belong" in str(e), "Properly rejected cross-business access")

    # ---------------------------------------------------------
    # TEST 4: END-TO-END RECEIVING TRANSACTIONS WITH ROLLBACK
    # ---------------------------------------------------------
    print("\n--- Test Suite 4: End-to-End Receiving Flow ---")
    # We will test in an isolated atomic transaction and then roll it back
    with transaction.atomic():
        savepoint = transaction.savepoint()
        try:
            # Create a dedicated test inbound order inside this savepoint
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO inbound_order (
                        supplier_profile_id,
                        farmer_contact_id,
                        batch_no,
                        product_name,
                        product_description,
                        product_photo,
                        ordered_quantity,
                        expected_arrival_date,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        7, 7, 'DIN - RI - 20261008 - 9999', 'Dinorado Palay',
                        'Test product for automated suite.', NULL,
                        2300.00, '2026-10-15', 'ordered', NOW(), NOW()
                    )
                    """
                )
                test_order_id = cursor.lastrowid

            # 1. Partial receiving with both good and bad goods:
            # Total 500 kg: Good 450 kg, Bad 50 kg, Price: 25.00, Rating: 5
            proof_photo1 = make_dummy_photo("proof1.jpg")
            evidence_photo1 = make_dummy_photo("evidence1.jpg")

            res1 = receive_inbound_order(
                supplier_profile_id=7,
                supplier_employee_id=20,
                inbound_order_id=test_order_id,
                total_received="500.00",
                quality_checking_toggle=True,
                received_bad="50.00",
                price_per_kg="25.00",
                farmer_rating=5,
                shelf_location="Silo A, Bay 1",
                expiry_date="2027-04-15",
                receiving_proof_file=proof_photo1,
                photo_evidence_file=evidence_photo1,
            )

            rec_id1 = res1["receiving_id"]
            assert_true(rec_id1 is not None, f"Receiving transaction 1 committed with ID {rec_id1}")
            assert_true(res1["total_received"] == 500.0, "Total received recorded as 500 kg")
            assert_true(res1["received_good"] == 450.0, "Accepted good recorded as 450 kg")
            assert_true(res1["received_bad"] == 50.0, "Rejected bad recorded as 50 kg")
            assert_true(res1["total_price"] == 11250.0, "Total payables: 450 * 25 = 11,250.00")
            assert_true(res1["order_status"] == "partially_received", "Inbound order status updated to 'partially_received'")
            assert_true(res1["remaining_receivable"] == 1850.0, "Remaining receivable updated: 2300 - 450 = 1850 kg")
            assert_true(res1["product_id"] is not None, f"Unmilled product auto-created with ID {res1['product_id']}")
            assert_true(res1["return_id"] is not None, f"Miller return auto-created with ID {res1['return_id']}")
            assert_true(res1["farmer_rating"] == 5, "Farmer rating recorded as 5")

            # Verify original ordered_quantity was NEVER modified!
            with connection.cursor() as cursor:
                cursor.execute("SELECT ordered_quantity, status FROM inbound_order WHERE inbound_order_id = %s", [test_order_id])
                row = cursor.fetchone()
                assert_true(Decimal(str(row[0])) == Decimal("2300.00"), "Original ordered_quantity remains exactly 2,300 kg (UNCHANGED)")
                assert_true(row[1] == "partially_received", "Order status is 'partially_received'")

            # Verify miller_products record
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT product_name, stock_quantity, unit_cost, shelf_location, status, product_image FROM miller_products WHERE product_id = %s",
                    [res1["product_id"]],
                )
                prod_row = cursor.fetchone()
                assert_true(Decimal(str(prod_row[1])) == Decimal("450.00"), "Product stock_quantity == 450.00 (accepted goods)")
                assert_true(Decimal(str(prod_row[2])) == Decimal("28.00"), f"Product unit_cost = 25.00 * (1 + 12%) = 28.00 marked up: {prod_row[2]}")
                assert_true(prod_row[4] == "unmilled", "Product status is 'unmilled'")
                assert_true(prod_row[5] is None, "Product product_image is strictly NULL")

            # Verify inbound_purchase_history record (remains based on original purchase price without markup)
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT price_per_kg, total_price FROM inbound_purchase_history WHERE receiving_id = %s",
                    [rec_id1],
                )
                iph_row = cursor.fetchone()
                assert_true(Decimal(str(iph_row[0])) == Decimal("25.00"), "inbound_purchase_history.price_per_kg is original purchase price 25.00 (no markup)")
                assert_true(Decimal(str(iph_row[1])) == Decimal("11250.00"), "inbound_purchase_history.total_price is 450 * 25.00 = 11,250.00 (no markup)")

            # Verify miller_returns record
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT quantity_kg, status, return_reference_no FROM miller_returns WHERE return_id = %s",
                    [res1["return_id"]],
                )
                ret_row = cursor.fetchone()
                assert_true(Decimal(str(ret_row[0])) == Decimal("50.00"), "Return quantity_kg == 50.00 (exact rejected kg)")
                assert_true(ret_row[1] == "pending", "Return status is 'pending'")
                assert_true(ret_row[2].endswith("-001-0050"), f"Return reference has -001-0050 suffix: {ret_row[2]}")

            # Verify farmer_performance record
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT farmer_rating, receiving_id, rated_by_employee_id FROM farmer_performance WHERE farmer_performance_id = %s",
                    [res1["farmer_performance_id"]],
                )
                fp_row = cursor.fetchone()
                assert_true(fp_row[0] == 5, "Farmer rating == 5")
                assert_true(fp_row[1] == rec_id1, "Farmer performance linked to receiving_id")
                assert_true(fp_row[2] == 20, "Rated by employee 20")

            # Verify Inventory Encoder notification was created for partial receiving
            assert_true(res1.get("notification_id") is not None, "Notification ID returned in receiving result")
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT notification_title, notification_content, action_url, status
                    FROM miller_employee_notifications
                    WHERE notification_id = %s
                    """,
                    [res1["notification_id"]],
                )
                notif1 = cursor.fetchone()
                assert_true(notif1 is not None, "Encoder notification record exists in database")
                assert_true(notif1[0] == "Order Partially Received", f"Notification title: {notif1[0]}")
                assert_true("was partially received" in notif1[1], f"Content has partially received: {notif1[1]}")
                assert_true("450 kg of" in notif1[1], f"Content includes accepted goods: {notif1[1]}")
                assert_true("added to Unmilled Inventory" in notif1[1], f"Content mentions Unmilled Inventory: {notif1[1]}")
                assert_true("Remaining: 1,850 kg" in notif1[1], f"Content includes remaining receivable: {notif1[1]}")
                assert_true(notif1[2] == "/supplier-encoder/stock", f"Action url is /supplier-encoder/stock: {notif1[2]}")
                assert_true(notif1[3] == "unseen", "Notification status is 'unseen'")

            # 2. Entirely rejected delivery:
            # Total 100 kg, Bad 100 kg, Good 0 kg.
            proof_photo2 = make_dummy_photo("proof2.jpg")
            evidence_photo2 = make_dummy_photo("evidence2.jpg")

            res2 = receive_inbound_order(
                supplier_profile_id=7,
                supplier_employee_id=20,
                inbound_order_id=test_order_id,
                total_received="100.00",
                quality_checking_toggle=True,
                received_bad="100.00",
                price_per_kg="25.00",
                farmer_rating=2,
                shelf_location="",
                expiry_date="",
                receiving_proof_file=proof_photo2,
                photo_evidence_file=evidence_photo2,
            )

            assert_true(res2["received_good"] == 0.0, "Entirely rejected delivery: Good is 0 kg")
            assert_true(res2["received_bad"] == 100.0, "Entirely rejected delivery: Bad is 100 kg")
            assert_true(res2["total_price"] == 0.0, "Total payables is 0.00 for entirely rejected delivery")
            assert_true(res2["product_id"] is None, "NO miller_products record created when received_good == 0")
            assert_true(res2["return_id"] is not None, "Miller return created for 100 kg rejected goods")
            assert_true(res2["order_status"] == "partially_received", "Order status remains 'partially_received'")

            # 3. Order detail query via Order Approval module:
            approval_detail = get_manager_order_detail(supplier_profile_id=7, inbound_order_id=test_order_id)
            assert_true(approval_detail is not None, "Order Approval can read the order detail")
            proc_rec = approval_detail.get("procurement_receiving")
            assert_true(proc_rec is not None, "Order Approval sees 'procurement_receiving' block")
            assert_true(len(proc_rec.get("records", [])) == 2, f"Order Approval sees both receiving transactions ({len(proc_rec.get('records', []))} records)")
            assert_true(proc_rec["total_received_raw"] == 600.0, "Order Approval aggregates total received: 500 + 100 = 600 kg")

            # 4. Final delivery: Receive remainder 1850 kg (all good)
            proof_photo3 = make_dummy_photo("proof3.jpg")
            res3 = receive_inbound_order(
                supplier_profile_id=7,
                supplier_employee_id=20,
                inbound_order_id=test_order_id,
                total_received="1850.00",
                quality_checking_toggle=False,
                received_bad="0.00",
                price_per_kg="26.00",
                farmer_rating=4,
                shelf_location="Silo B",
                expiry_date="2027-05-01",
                receiving_proof_file=proof_photo3,
            )
            assert_true(res3["order_status"] == "received", "Final delivery updates order status to 'received'!")
            assert_true(res3["remaining_receivable"] == 0.0, "Remaining receivable is now 0.0 kg")

            # Verify Inventory Encoder notification was created for completed order
            assert_true(res3.get("notification_id") is not None, "Notification ID returned for final receiving")
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT notification_title, notification_content, action_url, status
                    FROM miller_employee_notifications
                    WHERE notification_id = %s
                    """,
                    [res3["notification_id"]],
                )
                notif3 = cursor.fetchone()
                assert_true(notif3 is not None, "Encoder notification 3 exists in database")
                assert_true(notif3[0] == "Order Completed", f"Notification 3 title: {notif3[0]}")
                assert_true("completed and fully received" in notif3[1], f"Content mentions completed and fully received: {notif3[1]}")
                assert_true("added to Unmilled Inventory" in notif3[1], f"Content mentions added to Unmilled Inventory: {notif3[1]}")
                assert_true("Remaining: 0 kg" in notif3[1], f"Content shows Remaining: 0 kg: {notif3[1]}")
                assert_true(notif3[2] == "/supplier-encoder/stock", f"Action url is /supplier-encoder/stock: {notif3[2]}")
                assert_true(notif3[3] == "unseen", "Status is unseen")

            # Verify existing Encoder notification selectors integrate seamlessly
            encoder_notifs = list_encoder_notifications(supplier_profile_id=7)
            assert_true(len(encoder_notifs) >= 2, f"Encoder notification list includes receiving notifications ({len(encoder_notifs)} items)")
            unseen_cnt = get_encoder_unseen_notification_count(supplier_profile_id=7)
            assert_true(unseen_cnt >= 2, f"Encoder unseen count accurately reflects new notifications: {unseen_cnt}")

            # Verify idempotency / duplicate prevention on retries
            with connection.cursor() as cursor:
                dup_notif_id = create_receiving_encoder_notification(
                    cursor=cursor,
                    supplier_profile_id=7,
                    batch_no="TEST-RETRY-BATCH",
                    product_name="Dinorado Palay",
                    received_good=Decimal("500.00"),
                    remaining_receivable=Decimal("1500.00"),
                    order_status="partially_received",
                )
                retry_notif_id = create_receiving_encoder_notification(
                    cursor=cursor,
                    supplier_profile_id=7,
                    batch_no="TEST-RETRY-BATCH",
                    product_name="Dinorado Palay",
                    received_good=Decimal("500.00"),
                    remaining_receivable=Decimal("1500.00"),
                    order_status="partially_received",
                )
                assert_true(dup_notif_id == retry_notif_id, "Retry returns existing notification without creating duplicate")

            # 5. Verify that once fully received, further receiving attempts are blocked
            proof_photo4 = make_dummy_photo("proof4.jpg")
            try:
                receive_inbound_order(
                    supplier_profile_id=7,
                    supplier_employee_id=20,
                    inbound_order_id=test_order_id,
                    total_received="50.00",
                    quality_checking_toggle=False,
                    received_bad="0.00",
                    price_per_kg="25.00",
                    farmer_rating=5,
                    shelf_location="Silo B",
                    expiry_date="2027-05-01",
                    receiving_proof_file=proof_photo4,
                )
                assert_true(False, "Should reject receiving on already fully received order")
            except InvalidOrderStateError as e:
                assert_true("not eligible for receiving" in str(e) or "already been fully received" in str(e), "Blocked receiving on fully received order")

            print("\n  --> End-to-end receiving flow succeeded completely!")

        finally:
            # Rollback all changes so real database stays untouched
            transaction.savepoint_rollback(savepoint)
            print("  --> Transaction safely rolled back! Database state preserved.")

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed_count}/{total_count} TESTS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)
    return passed_count == total_count


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
