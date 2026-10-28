import sys
import os
import django

# Setup django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'grainrise_project.settings')
django.setup()

import unittest
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from api import auth_views
from api.utils import create_access_token, hash_password
from api.warehouse_function.warehouse_auth import (
    get_authenticated_warehouse_driver_user,
    get_authenticated_warehouse_logistics_user,
    get_authenticated_warehouse_employee,
    warehouse_driver_required,
    warehouse_logistics_required,
)
from api.warehouse_function.driver.notifications import views as wh_driver_views
from api.warehouse_function.logistics.notifications import views as wh_logistics_views
from api.miller_employees_function.miller_driver import views as miller_driver_views
from api.miller_employees_function.miller_logistics.notifications import views as miller_logistics_views


class WarehouseFlcDriverAuthTests(unittest.TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_warehouse_driver_login_and_notifications(self):
        # 1. Login with warehouse driver account (bryant@rice.com)
        req = self.factory.post(
            '/api/auth/login',
            {'identifier': 'bryant@rice.com', 'password': 'Password123!'},
            format='json'
        )
        resp = auth_views.login(req)
        self.assertEqual(resp.status_code, 200, f"Driver login failed: {resp.data}")
        self.assertIn('access_token', resp.data)
        user = resp.data['user']
        self.assertEqual(user['role'], 'warehouse_employee')
        self.assertEqual(user['account_type'], 'warehouse_employee')
        self.assertEqual(user['position'], 'driver')
        self.assertEqual(user['organization_type'], 'warehouse')
        self.assertEqual(user['status'], 'active')
        self.assertEqual(user['profile_id'], 6)
        self.assertEqual(user['owner_user_id'], 21)

        token = resp.data['access_token']

        # 2. Driver calls warehouse driver notifications -> HTTP 200
        req_notif = self.factory.get(
            '/api/warehouse/driver/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        resp_notif = wh_driver_views.driver_notifications_list_view(req_notif)
        self.assertEqual(resp_notif.status_code, 200)
        self.assertTrue(resp_notif.data['success'])
        self.assertIn('notifications', resp_notif.data)
        self.assertIn('unseen_count', resp_notif.data)

        # 3. Driver calls Miller driver notifications -> MUST return HTTP 401
        req_miller = self.factory.get(
            '/api/miller-employees/driver/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        resp_miller = miller_driver_views.driver_notifications_list_view(req_miller)
        self.assertEqual(resp_miller.status_code, 401)
        self.assertIn("Miller Driver authentication required", resp_miller.content.decode())

    def test_miller_driver_login_and_notifications(self):
        # 1. Login with Miller driver account (bryant@grains.com)
        req = self.factory.post(
            '/api/auth/login',
            {'identifier': 'bryant@grains.com', 'password': 'Password123!'},
            format='json'
        )
        resp = auth_views.login(req)
        self.assertEqual(resp.status_code, 200, f"Miller Driver login failed: {resp.data}")
        self.assertIn('access_token', resp.data)
        user = resp.data['user']
        self.assertEqual(user['role'], 'supplier_employee')
        self.assertEqual(user['account_type'], 'supplier_employee')
        self.assertEqual(user['position'], 'driver')
        self.assertEqual(user['organization_type'], 'supplier')
        self.assertEqual(user['status'], 'active')

        token = resp.data['access_token']

        # 2. Miller Driver calls Miller driver notifications -> HTTP 200
        req_miller = self.factory.get(
            '/api/miller-employees/driver/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        resp_miller = miller_driver_views.driver_notifications_list_view(req_miller)
        self.assertEqual(resp_miller.status_code, 200)

        # 3. Miller Driver calls Warehouse driver notifications -> MUST return HTTP 401
        req_wh = self.factory.get(
            '/api/warehouse/driver/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {token}'
        )
        resp_wh = wh_driver_views.driver_notifications_list_view(req_wh)
        self.assertEqual(resp_wh.status_code, 401)
        self.assertIn("Warehouse Driver authentication required", resp_wh.content.decode())

    def test_warehouse_flc_login_and_notifications(self):
        # angelo@rice.com is active warehouse FLC (position = fulfillment_logistics_coordinator)
        req = self.factory.post(
            '/api/auth/login',
            {'identifier': 'angelo@rice.com', 'password': 'Password123!'},
            format='json'
        )
        resp = auth_views.login(req)
        self.assertEqual(resp.status_code, 200, f"Warehouse FLC login failed: {resp.data}")
        user = resp.data['user']
        self.assertEqual(user['role'], 'warehouse_employee')
        self.assertEqual(user['account_type'], 'warehouse_employee')
        self.assertEqual(user['position'], 'fulfillment_logistics_coordinator')
        self.assertEqual(user['organization_type'], 'warehouse')
        self.assertEqual(user['status'], 'active')

        flc_token = resp.data['access_token']

        # 2. FLC calls warehouse logistics notifications -> HTTP 200
        req_notif = self.factory.get(
            '/api/warehouse/logistics/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {flc_token}'
        )
        resp_notif = wh_logistics_views.list_notifications_view(req_notif)
        self.assertEqual(resp_notif.status_code, 200)
        self.assertTrue(resp_notif.data['success'])
        self.assertIn('notifications', resp_notif.data)
        self.assertIn('unseen_count', resp_notif.data)

        # 3. FLC calls Miller logistics notifications -> MUST return HTTP 401
        req_miller = self.factory.get(
            '/api/miller-employees/logistics/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {flc_token}'
        )
        resp_miller = miller_logistics_views.notifications_list_view(req_miller)
        self.assertEqual(resp_miller.status_code, 401)
        self.assertIn("Fulfillment Logistics Coordinator authentication required", resp_miller.content.decode())

    def test_miller_flc_login_and_notifications(self):
        # angelo@grains.com is active Miller FLC (position = fulfillment_logistics_coordinator)
        req = self.factory.post(
            '/api/auth/login',
            {'identifier': 'angelo@grains.com', 'password': 'Password123!'},
            format='json'
        )
        resp = auth_views.login(req)
        self.assertEqual(resp.status_code, 200, f"Miller FLC login failed: {resp.data}")
        user = resp.data['user']
        self.assertEqual(user['role'], 'supplier_employee')
        self.assertEqual(user['account_type'], 'supplier_employee')
        self.assertEqual(user['position'], 'fulfillment_logistics_coordinator')
        self.assertEqual(user['organization_type'], 'supplier')
        self.assertEqual(user['status'], 'active')

        flc_token = resp.data['access_token']

        # 2. Miller FLC calls Miller logistics notifications -> HTTP 200
        req_miller = self.factory.get(
            '/api/miller-employees/logistics/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {flc_token}'
        )
        resp_miller = miller_logistics_views.notifications_list_view(req_miller)
        self.assertEqual(resp_miller.status_code, 200)

        # 3. Miller FLC calls Warehouse logistics notifications -> MUST return HTTP 401
        req_wh = self.factory.get(
            '/api/warehouse/logistics/notifications/',
            HTTP_AUTHORIZATION=f'Bearer {flc_token}'
        )
        resp_wh = wh_logistics_views.list_notifications_view(req_wh)
        self.assertEqual(resp_wh.status_code, 401)
        self.assertIn("Warehouse Logistics Coordinator", resp_wh.content.decode())

    def test_warehouse_notification_lifecycle(self):
        # Insert test notifications for driver and logistics
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO warehouse_employee_notifications
                (warehouse_profile_id, employee_type, notification_title, notification_content, action_url, status)
                VALUES
                (6, 'driver', 'Driver Alert', 'Test driver alert', '/warehouse-driver/my-duties', 'unseen'),
                (6, 'logistics', 'FLC Alert', 'Test logistics alert', '/warehouse-logistics/dashboard', 'unseen')
            """)
            cursor.execute("SELECT notification_id, employee_type FROM warehouse_employee_notifications WHERE notification_title IN ('Driver Alert', 'FLC Alert')")
            inserted_rows = cursor.fetchall()

        driver_notif_id = [r[0] for r in inserted_rows if r[1] == 'driver'][0]
        flc_notif_id = [r[0] for r in inserted_rows if r[1] == 'logistics'][0]

        try:
            # Login as warehouse driver (bryant@rice.com)
            req = self.factory.post(
                '/api/auth/login',
                {'identifier': 'bryant@rice.com', 'password': 'Password123!'},
                format='json'
            )
            resp = auth_views.login(req)
            driver_token = resp.data['access_token']

            # 1. Fetch driver notifications -> driver notif present
            req_list = self.factory.get('/api/warehouse/driver/notifications/', HTTP_AUTHORIZATION=f'Bearer {driver_token}')
            resp_list = wh_driver_views.driver_notifications_list_view(req_list)
            self.assertEqual(resp_list.status_code, 200)
            notif_ids = [n['id'] for n in resp_list.data['notifications']]
            self.assertIn(driver_notif_id, notif_ids)
            self.assertNotIn(flc_notif_id, notif_ids) # FLC notif not leaked to driver

            # 2. Mark driver notif seen
            req_seen = self.factory.post(f'/api/warehouse/driver/notifications/{driver_notif_id}/seen/', HTTP_AUTHORIZATION=f'Bearer {driver_token}')
            resp_seen = wh_driver_views.driver_notification_seen_view(req_seen, notification_id=driver_notif_id)
            self.assertEqual(resp_seen.status_code, 200)
            self.assertTrue(resp_seen.data['success'])

            # 3. Mark all seen
            req_all = self.factory.post('/api/warehouse/driver/notifications/mark-all-seen/', HTTP_AUTHORIZATION=f'Bearer {driver_token}')
            resp_all = wh_driver_views.driver_notifications_mark_all_seen_view(req_all)
            self.assertEqual(resp_all.status_code, 200)
            self.assertTrue(resp_all.data['success'])
            self.assertEqual(resp_all.data['unseen_count'], 0)

        finally:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM warehouse_employee_notifications WHERE notification_id IN (%s, %s)", [driver_notif_id, flc_notif_id])

    def test_warehouse_manager_access(self):
        # Warehouse Manager (user_id=21)
        mgr_token = create_access_token({
            "sub": "21",
            "role": "warehouse_manager",
            "account_type": "main_user",
            "auth_source": "grainrise"
        })

        req_log = self.factory.get('/api/warehouse/logistics/notifications/', HTTP_AUTHORIZATION=f'Bearer {mgr_token}')
        resp_log = wh_logistics_views.list_notifications_view(req_log)
        self.assertEqual(resp_log.status_code, 200)

        req_drv = self.factory.get('/api/warehouse/driver/notifications/', HTTP_AUTHORIZATION=f'Bearer {mgr_token}')
        resp_drv = wh_driver_views.driver_notifications_list_view(req_drv)
        self.assertEqual(resp_drv.status_code, 200)

    def test_reject_expired_and_inactive_tokens(self):
        # Expired token
        expired_token = create_access_token({
            "sub": "1008",
            "role": "warehouse_employee",
            "account_type": "warehouse_employee",
            "auth_source": "grainrise"
        }, expires_delta=timezone.timedelta(seconds=-60))

        req = self.factory.get('/api/warehouse/driver/notifications/', HTTP_AUTHORIZATION=f'Bearer {expired_token}')
        resp = wh_driver_views.driver_notifications_list_view(req)
        self.assertEqual(resp.status_code, 401)

        # Inactive user token (sub that does not exist or is inactive)
        invalid_token = create_access_token({
            "sub": "999999",
            "role": "warehouse_employee",
            "account_type": "warehouse_employee",
            "auth_source": "grainrise"
        })
        req_inval = self.factory.get('/api/warehouse/driver/notifications/', HTTP_AUTHORIZATION=f'Bearer {invalid_token}')
        resp_inval = wh_driver_views.driver_notifications_list_view(req_inval)
        self.assertEqual(resp_inval.status_code, 401)


if __name__ == '__main__':
    unittest.main()
