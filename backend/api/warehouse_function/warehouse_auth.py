from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload


def get_authenticated_warehouse_manager(request):
    """
    Resolve the currently logged-in Warehouse Manager from the
    existing GrainRise Bearer JWT.

    Security rules:
    - JWT must be valid and issued by GrainRise centralized login.
    - Account must be a main-user Warehouse Manager account.
    - Identity comes only from JWT `sub`.
    - Account status is re-checked on every request against `users` table.
    - One Warehouse Manager user may own multiple warehouse_profiles.
    - The earliest warehouse_profile serves as the default profile.

    IMPORTANT:
    Never trust user_id or warehouse_profile_id sent by React as
    ownership authority for Warehouse data.
    """
    payload = authorization_payload(request)

    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    if payload.get("role") != "warehouse_manager":
        return None

    if payload.get("account_type") != "main_user":
        return None

    raw_user_id = payload.get("sub")
    try:
        warehouse_user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,
                u.first_name,
                u.middle_initial,
                u.last_name,
                u.suffix,
                u.email,
                u.contact_number,
                u.username,
                u.user_role,
                u.status,

                wp.warehouse_profile_id,
                wp.business_name,
                wp.organization_name,
                wp.official_email,
                wp.official_contact_number,
                wp.province,
                wp.municipality,
                wp.postal_code,
                wp.barangay,
                wp.street_address,
                wp.created_at,
                wp.updated_at,

                (
                    SELECT COUNT(*)
                    FROM warehouse_profiles owned_profile
                    WHERE owned_profile.user_id = u.user_id
                ) AS warehouse_profile_count

            FROM users u
            LEFT JOIN warehouse_profiles wp
                ON wp.user_id = u.user_id
            WHERE
                u.user_id = %s
                AND u.user_role = 'warehouse_manager'
                AND u.status = 'active'
            ORDER BY
                wp.created_at ASC,
                wp.warehouse_profile_id ASC
            LIMIT 1
            """,
            [warehouse_user_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    return {
        "user_id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "email": row[5],
        "contact_number": row[6],
        "username": row[7],
        "role": row[8],
        "status": row[9],
        "warehouse_profile_id": row[10],
        "default_warehouse_profile_id": row[10],
        "business_name": row[11],
        "organization_name": row[12],
        "official_email": row[13],
        "official_contact_number": row[14],
        "province": row[15],
        "municipality": row[16],
        "postal_code": row[17],
        "barangay": row[18],
        "street_address": row[19],
        "warehouse_profile_created_at": row[20],
        "warehouse_profile_updated_at": row[21],
        "warehouse_profile_count": row[22],
    }


def warehouse_manager_required(view_func):
    """
    Protect Warehouse Manager-only API endpoints.
    Attaches authenticated Warehouse Manager info to the request object.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        warehouse_mgr = get_authenticated_warehouse_manager(request)
        if not warehouse_mgr:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Warehouse Manager authentication required. Please sign in again.",
                },
                status=401,
            )

        request.grainrise_warehouse_manager = warehouse_mgr
        request.grainrise_warehouse_manager_id = warehouse_mgr["user_id"]
        request.grainrise_default_warehouse_profile_id = warehouse_mgr.get("default_warehouse_profile_id")
        request.grainrise_warehouse_profile_id = warehouse_mgr.get("default_warehouse_profile_id")

        return view_func(request, *args, **kwargs)

    return wrapped_view


def get_authenticated_warehouse_finance_user(request):
    """
    Resolve either:
    1. A Warehouse Manager (role='warehouse_manager', account_type='main_user')
    2. A Warehouse Finance / Manager Employee (role='warehouse_employee', account_type='warehouse_employee')

    Returns authoritative context with JWT branch isolation:
    - user_type: 'manager' | 'employee'
    - user_id: int
    - employee_id: int or None
    - warehouse_profile_ids: list of accessible warehouse_profile_ids
    - warehouse_profile_id: primary warehouse_profile_id
    - business_name: str
    - payer_name: str
    - position: str
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    role = payload.get("role")
    account_type = payload.get("account_type")
    raw_sub = payload.get("sub")

    try:
        sub_id = int(raw_sub)
    except (TypeError, ValueError):
        return None

    # Case 1: Main User Warehouse Manager
    if role == "warehouse_manager" and account_type == "main_user":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.status,
                    wp.warehouse_profile_id,
                    wp.business_name
                FROM users u
                INNER JOIN warehouse_profiles wp ON wp.user_id = u.user_id
                WHERE u.user_id = %s
                  AND u.user_role = 'warehouse_manager'
                  AND u.status = 'active'
                ORDER BY wp.created_at ASC
                """,
                [sub_id],
            )
            rows = cursor.fetchall()

        if not rows:
            return None

        primary = rows[0]
        profile_ids = [r[5] for r in rows if r[5] is not None]
        payer_name = f"{primary[1] or ''} {primary[2] or ''}".strip() or "Warehouse Manager"

        return {
            "user_type": "manager",
            "user_id": primary[0],
            "employee_id": None,
            "warehouse_profile_ids": profile_ids,
            "warehouse_profile_id": primary[5],
            "business_name": primary[6] or "GrainRise Warehouse",
            "payer_name": payer_name,
            "position": "Warehouse Manager",
            "email": primary[3],
        }

    # Case 2: Warehouse Employee (finance or manager position)
    if role == "warehouse_employee" or account_type == "warehouse_employee":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.warehouse_profile_id,
                    we.first_name,
                    we.last_name,
                    we.position,
                    we.status,
                    wp.user_id AS owner_user_id,
                    wp.business_name
                FROM warehouse_employees we
                INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                  AND we.status = 'active'
                LIMIT 1
                """,
                [sub_id],
            )
            row = cursor.fetchone()

        if not row:
            return None

        pos = str(row[4] or "").lower()
        # Allow finance employees or managers
        if pos not in ("finance", "manager", "encoder", "procurement"):
            return None

        payer_name = f"{row[2] or ''} {row[3] or ''}".strip() or "Warehouse Finance"

        return {
            "user_type": "employee",
            "user_id": row[6],
            "employee_id": row[0],
            "warehouse_profile_ids": [row[1]],
            "warehouse_profile_id": row[1],
            "business_name": row[7] or "GrainRise Warehouse",
            "payer_name": payer_name,
            "position": row[4],
        }

    return None


def warehouse_finance_required(view_func):
    """
    Protect Warehouse Finance & Payables API endpoints.
    Allows both authenticated Warehouse Manager and Warehouse Finance employees.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        finance_user = get_authenticated_warehouse_finance_user(request)
        if not finance_user:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Warehouse Finance or Manager authentication required. Please sign in again.",
                },
                status=401,
            )

        request.warehouse_finance_user = finance_user
        request.grainrise_warehouse_profile_ids = finance_user["warehouse_profile_ids"]
        request.grainrise_warehouse_profile_id = finance_user["warehouse_profile_id"]
        request.grainrise_warehouse_employee_id = finance_user.get("employee_id")
        request.grainrise_warehouse_business_name = finance_user.get("business_name")
        request.grainrise_warehouse_payer_name = finance_user.get("payer_name")

        return view_func(request, *args, **kwargs)

    return wrapped_view


def get_authenticated_warehouse_sales_user(request):
    """
    Resolve either:
    1. A Warehouse Manager (role='warehouse_manager', account_type='main_user')
    2. A Warehouse Sales / Encoder / Branch Employee (role='warehouse_employee', account_type='warehouse_employee')

    Returns authoritative context with JWT branch isolation:
    - user_type: 'manager' | 'employee'
    - user_id: int
    - employee_id: int or None
    - warehouse_profile_id: int
    - business_name: str
    - seller_name: str
    - first_name: str
    - last_name: str
    - position: str
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    role = payload.get("role")
    account_type = payload.get("account_type")
    raw_sub = payload.get("sub")

    try:
        sub_id = int(raw_sub)
    except (TypeError, ValueError):
        return None

    # Case 1: Main User Warehouse Manager
    if role == "warehouse_manager" and account_type == "main_user":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.status,
                    wp.warehouse_profile_id,
                    wp.business_name
                FROM users u
                INNER JOIN warehouse_profiles wp ON wp.user_id = u.user_id
                WHERE u.user_id = %s
                  AND u.user_role = 'warehouse_manager'
                  AND u.status = 'active'
                ORDER BY wp.created_at ASC
                LIMIT 1
                """,
                [sub_id],
            )
            row = cursor.fetchone()

        if not row:
            return None

        seller_name = f"{row[1] or ''} {row[2] or ''}".strip() or "Warehouse Manager"

        return {
            "user_type": "manager",
            "user_id": row[0],
            "employee_id": None,
            "warehouse_profile_id": row[5],
            "business_name": (row[6] or "GrainRise Warehouse").strip(),
            "seller_name": seller_name,
            "first_name": (row[1] or "").strip(),
            "last_name": (row[2] or "").strip(),
            "position": "Warehouse Manager",
            "email": row[3] or "",
        }

    # Case 2: Warehouse Employee
    if role == "warehouse_employee" or account_type == "warehouse_employee":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.warehouse_profile_id,
                    we.first_name,
                    we.middle_initial,
                    we.last_name,
                    we.suffix,
                    we.position,
                    we.status,
                    wp.user_id AS owner_user_id,
                    wp.business_name,
                    we.email
                FROM warehouse_employees we
                INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                  AND we.status = 'active'
                LIMIT 1
                """,
                [sub_id],
            )
            row = cursor.fetchone()

        if not row:
            return None

        first_name = (row[2] or "").strip()
        middle_initial = (row[3] or "").strip()
        last_name = (row[4] or "").strip()
        suffix = (row[5] or "").strip()
        full_name_parts = [p for p in [first_name, middle_initial, last_name, suffix] if p]
        seller_name = " ".join(full_name_parts) or "Warehouse Seller"

        return {
            "user_type": "employee",
            "user_id": row[8],
            "employee_id": row[0],
            "warehouse_profile_id": row[1],
            "business_name": (row[9] or "GrainRise Warehouse").strip(),
            "seller_name": seller_name,
            "first_name": first_name,
            "last_name": last_name,
            "position": row[6] or "Sales",
            "email": row[10] or "",
        }

    return None


def warehouse_sales_required(view_func):
    """
    Protect Warehouse Sales & POS API endpoints.
    Allows both authenticated Warehouse Manager and authorized Warehouse Sales employees.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        sales_user = get_authenticated_warehouse_sales_user(request)
        if not sales_user:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Warehouse Sales or Manager authentication required. Please sign in again.",
                },
                status=401,
            )

        request.warehouse_sales_user = sales_user
        request.grainrise_warehouse_profile_id = sales_user["warehouse_profile_id"]
        request.grainrise_warehouse_employee_id = sales_user.get("employee_id")
        request.grainrise_warehouse_business_name = sales_user.get("business_name")
        request.grainrise_warehouse_seller_name = sales_user.get("seller_name")

        return view_func(request, *args, **kwargs)

    return wrapped_view





def get_authenticated_warehouse_logistics_user(request):
    """
    Resolve either:
    1. A Warehouse Manager (role='warehouse_manager', account_type='main_user')
    2. A Warehouse FLC / Logistics Employee (role='warehouse_employee', account_type='warehouse_employee')

    Returns authoritative context with JWT branch isolation:
    - user_type: 'manager' | 'employee'
    - user_id: int (owner_user_id)
    - employee_id: int or None
    - warehouse_profile_ids: list of accessible warehouse_profile_ids
    - warehouse_profile_id: primary warehouse_profile_id
    - business_name: str
    - first_name: str
    - last_name: str
    - position: str
    - email: str
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    role = payload.get("role")
    account_type = payload.get("account_type")
    raw_sub = payload.get("sub")

    try:
        sub_id = int(raw_sub)
    except (TypeError, ValueError):
        return None

    # Case 1: Main User Warehouse Manager
    if role == "warehouse_manager" and account_type == "main_user":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.status,
                    wp.warehouse_profile_id,
                    wp.business_name
                FROM users u
                INNER JOIN warehouse_profiles wp ON wp.user_id = u.user_id
                WHERE u.user_id = %s
                  AND u.user_role = 'warehouse_manager'
                  AND u.status = 'active'
                ORDER BY wp.created_at ASC
                """,
                [sub_id],
            )
            rows = cursor.fetchall()

        if not rows:
            return None

        primary = rows[0]
        profile_ids = [r[5] for r in rows if r[5] is not None]

        return {
            "user_type": "manager",
            "user_id": primary[0],
            "employee_id": None,
            "warehouse_profile_ids": profile_ids,
            "warehouse_profile_id": primary[5],
            "business_name": primary[6] or "GrainRise Warehouse",
            "first_name": (primary[1] or "").strip(),
            "last_name": (primary[2] or "").strip(),
            "position": "Warehouse Manager",
            "email": primary[3] or "",
        }

    # Case 2: Warehouse Employee (FLC / Logistics)
    if (
        role in ("warehouse_employee", "warehouse_logistics", "warehouse_flc")
        or account_type == "warehouse_employee"
        or payload.get("organization_type") == "warehouse"
    ):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.warehouse_profile_id,
                    we.first_name,
                    we.middle_initial,
                    we.last_name,
                    we.suffix,
                    we.position,
                    we.status,
                    wp.user_id AS owner_user_id,
                    wp.business_name,
                    we.email
                FROM warehouse_employees we
                INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                  AND we.status = 'active'
                LIMIT 1
                """,
                [sub_id],
            )
            row = cursor.fetchone()

        if not row:
            return None

        pos = str(row[6] or "").strip().lower()
        allowed_positions = (
            "fulfillment_logistics_coordinator",
            "fulfillment & logistics",
            "fulfillment and logistics",
            "logistics",
            "flc",
        )
        if pos not in allowed_positions:
            return None

        return {
            "user_type": "employee",
            "user_id": row[8],
            "employee_id": row[0],
            "warehouse_profile_ids": [row[1]],
            "warehouse_profile_id": row[1],
            "business_name": (row[9] or "GrainRise Warehouse").strip(),
            "first_name": (row[2] or "").strip(),
            "last_name": (row[4] or "").strip(),
            "position": row[6] or "Fulfillment & Logistics",
            "email": row[10] or "",
        }

    return None


def warehouse_logistics_required(view_func):
    """
    Protect Warehouse Fulfillment & Logistics Coordinator (FLC) API endpoints.
    Allows authenticated Warehouse Manager and authorized Warehouse FLC employees.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        logistics_user = get_authenticated_warehouse_logistics_user(request)
        if not logistics_user:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Warehouse Logistics Coordinator or Manager authentication required. Please sign in again.",
                    "message": "Warehouse Logistics Coordinator or Manager authentication required. Please sign in again.",
                },
                status=401,
            )

        request.warehouse_logistics_user = logistics_user
        request.grainrise_warehouse_profile_ids = logistics_user["warehouse_profile_ids"]
        request.grainrise_warehouse_profile_id = logistics_user["warehouse_profile_id"]
        request.grainrise_warehouse_employee_id = logistics_user.get("employee_id")
        request.grainrise_warehouse_business_name = logistics_user.get("business_name")

        return view_func(request, *args, **kwargs)

    return wrapped_view


warehouse_flc_required = warehouse_logistics_required


def get_authenticated_warehouse_driver_user(request):
    """
    Resolve either:
    1. A Warehouse Manager (role='warehouse_manager', account_type='main_user')
    2. A Warehouse Driver Employee (role='warehouse_employee', account_type='warehouse_employee')

    Returns authoritative context with JWT branch isolation:
    - user_type: 'manager' | 'employee'
    - user_id: int (owner_user_id)
    - employee_id: int or None
    - driver_id: int or None
    - warehouse_profile_ids: list of accessible warehouse_profile_ids
    - warehouse_profile_id: primary warehouse_profile_id
    - business_name: str
    - first_name: str
    - last_name: str
    - position: str
    - email: str
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    role = payload.get("role")
    account_type = payload.get("account_type")
    raw_sub = payload.get("sub")

    try:
        sub_id = int(raw_sub)
    except (TypeError, ValueError):
        return None

    # Case 1: Main User Warehouse Manager
    if role == "warehouse_manager" and account_type == "main_user":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    u.user_id,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.status,
                    wp.warehouse_profile_id,
                    wp.business_name
                FROM users u
                INNER JOIN warehouse_profiles wp ON wp.user_id = u.user_id
                WHERE u.user_id = %s
                  AND u.user_role = 'warehouse_manager'
                  AND u.status = 'active'
                ORDER BY wp.created_at ASC
                """,
                [sub_id],
            )
            rows = cursor.fetchall()

        if not rows:
            return None

        primary = rows[0]
        profile_ids = [r[5] for r in rows if r[5] is not None]

        return {
            "user_type": "manager",
            "user_id": primary[0],
            "employee_id": None,
            "driver_id": None,
            "warehouse_profile_ids": profile_ids,
            "warehouse_profile_id": primary[5],
            "business_name": primary[6] or "GrainRise Warehouse",
            "first_name": (primary[1] or "").strip(),
            "last_name": (primary[2] or "").strip(),
            "position": "Warehouse Manager",
            "email": primary[3] or "",
        }

    # Case 2: Warehouse Employee (Driver)
    if (
        role in ("warehouse_employee", "warehouse_driver")
        or account_type == "warehouse_employee"
        or payload.get("organization_type") == "warehouse"
    ):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.warehouse_profile_id,
                    we.first_name,
                    we.middle_initial,
                    we.last_name,
                    we.suffix,
                    we.position,
                    we.status,
                    wp.user_id AS owner_user_id,
                    wp.business_name,
                    we.email
                FROM warehouse_employees we
                INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                  AND we.status = 'active'
                LIMIT 1
                """,
                [sub_id],
            )
            row = cursor.fetchone()

        if not row:
            return None

        pos = str(row[6] or "").strip().lower()
        if pos not in ("driver", "delivery_driver"):
            return None

        return {
            "user_type": "employee",
            "user_id": row[8],
            "employee_id": row[0],
            "driver_id": row[0],
            "warehouse_profile_ids": [row[1]],
            "warehouse_profile_id": row[1],
            "business_name": (row[9] or "GrainRise Warehouse").strip(),
            "first_name": (row[2] or "").strip(),
            "last_name": (row[4] or "").strip(),
            "position": row[6] or "Driver",
            "email": row[10] or "",
        }

    return None


def warehouse_driver_required(view_func):
    """
    Protect Warehouse Driver API endpoints.
    Allows authenticated Warehouse Driver employees and Warehouse Manager.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        driver_user = get_authenticated_warehouse_driver_user(request)
        if not driver_user:
            return JsonResponse(
                {
                    "success": False,
                    "detail": "Warehouse Driver authentication required. Please sign in again.",
                    "message": "Warehouse Driver authentication required. Please sign in again.",
                },
                status=401,
            )

        request.warehouse_driver_user = driver_user
        request.grainrise_warehouse_profile_ids = driver_user["warehouse_profile_ids"]
        request.grainrise_warehouse_profile_id = driver_user["warehouse_profile_id"]
        request.grainrise_warehouse_employee_id = driver_user.get("employee_id")
        request.grainrise_driver_id = driver_user.get("driver_id")
        request.grainrise_warehouse_business_name = driver_user.get("business_name")

        return view_func(request, *args, **kwargs)

    return wrapped_view


def get_authenticated_warehouse_employee(request, required_position=None):
    """
    Generic helper to authenticate a warehouse employee and verify their role/position.
    """
    payload = authorization_payload(request)
    if not payload or payload.get("auth_source") != "grainrise":
        return None

    role = payload.get("role")
    account_type = payload.get("account_type")
    raw_sub = payload.get("sub")

    try:
        sub_id = int(raw_sub)
    except (TypeError, ValueError):
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.warehouse_profile_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.position,
                we.status,
                wp.user_id AS owner_user_id,
                wp.business_name,
                we.email
            FROM warehouse_employees we
            INNER JOIN warehouse_profiles wp ON wp.warehouse_profile_id = we.warehouse_profile_id
            WHERE we.warehouse_employee_id = %s
              AND we.status = 'active'
            LIMIT 1
            """,
            [sub_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    db_position = str(row[6] or "").strip().lower()
    if required_position is not None:
        req_norm = str(required_position).strip().lower()
        if req_norm in ("fulfillment_logistics_coordinator", "logistics", "flc"):
            if db_position not in ("fulfillment_logistics_coordinator", "fulfillment & logistics", "fulfillment and logistics", "logistics", "flc"):
                return None
        elif req_norm in ("driver", "delivery_driver"):
            if db_position not in ("driver", "delivery_driver"):
                return None
        elif db_position != req_norm:
            return None

    return {
        "user_type": "employee",
        "user_id": row[8],
        "employee_id": row[0],
        "warehouse_profile_ids": [row[1]],
        "warehouse_profile_id": row[1],
        "business_name": (row[9] or "GrainRise Warehouse").strip(),
        "first_name": (row[2] or "").strip(),
        "last_name": (row[4] or "").strip(),
        "position": row[6],
        "status": row[7],
        "email": row[10] or "",
    }


def warehouse_payment_security_user_required(view_func):
    """
    Authenticate either a Warehouse Manager or a Warehouse Employee (FLC, Driver, Finance, etc.)
    for Payment Security and Online Payment Account operations.
    Sets:
    - request.grainrise_warehouse_id = user_id or warehouse_employee_id
    - request.grainrise_is_employee = True / False
    - request.grainrise_warehouse_profile_id = warehouse_profile_id
    - request.grainrise_warehouse_employee_id = warehouse_employee_id (if employee)
    - request.grainrise_employee_name = employee name
    - request.grainrise_employee_email = employee email
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload or payload.get("auth_source") != "grainrise":
            return JsonResponse({"success": False, "message": "Authentication required. Please sign in again."}, status=401)

        role = payload.get("role")
        account_type = payload.get("account_type")

        # 1. Warehouse Manager
        if role == "warehouse_manager" and account_type == "main_user":
            manager = get_authenticated_warehouse_manager(request)
            if not manager:
                return JsonResponse({"success": False, "message": "Warehouse Manager authentication required."}, status=401)
            request.grainrise_warehouse = manager
            request.grainrise_warehouse_id = manager["user_id"]
            request.grainrise_is_employee = False
            request.grainrise_warehouse_profile_id = manager["warehouse_profile_id"]
            request.grainrise_warehouse_profile_ids = manager["warehouse_profile_ids"]
            request.grainrise_warehouse_employee_id = None
            return view_func(request, *args, **kwargs)

        # 2. Warehouse Employee (FLC, Driver, Finance, etc.)
        if (
            role in ("warehouse_employee", "warehouse_logistics", "warehouse_flc", "warehouse_driver", "warehouse_finance")
            or account_type == "warehouse_employee"
            or payload.get("organization_type") == "warehouse"
        ):
            raw_emp_id = payload.get("sub")
            try:
                emp_id = int(raw_emp_id)
            except (TypeError, ValueError):
                return JsonResponse({"success": False, "message": "Invalid token subject."}, status=401)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT we.warehouse_employee_id, we.warehouse_profile_id, we.first_name, we.last_name, we.email, we.position, we.status
                    FROM warehouse_employees we
                    WHERE we.warehouse_employee_id = %s
                    LIMIT 1
                    """,
                    [emp_id],
                )
                emp_row = cursor.fetchone()

            if not emp_row or str(emp_row[6] or "").strip().lower() != "active":
                return JsonResponse({"success": False, "message": "Active employee account required."}, status=401)

            request.grainrise_warehouse = None
            request.grainrise_warehouse_id = emp_row[0]
            request.grainrise_is_employee = True
            request.grainrise_warehouse_profile_id = emp_row[1]
            request.grainrise_warehouse_profile_ids = [emp_row[1]]
            request.grainrise_warehouse_employee_id = emp_row[0]
            request.grainrise_employee_name = f"{emp_row[2]} {emp_row[3]}".strip()
            request.grainrise_employee_email = emp_row[4]
            return view_func(request, *args, **kwargs)

        return JsonResponse({"success": False, "message": "Authorized user required."}, status=401)

    return wrapped_view

