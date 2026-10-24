from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload


# ============================================================
# AUTHENTICATED MILLER EMPLOYEE LOOKUP
# ============================================================

def get_authenticated_miller_employee(request, required_position=None):
    """
    Resolve the authenticated Supplier/Miller Employee from the GrainRise Bearer JWT.

    Validates:
    - JWT is present and valid (via authorization_payload)
    - auth_source == 'grainrise'
    - role == 'supplier_employee'
    - account_type == 'supplier_employee'
    - organization_type == 'supplier'

    Uses JWT sub as supplier_employee_id, then queries supplier_employees + supplier_profiles
    to resolve authoritative:
    - supplier_employee_id
    - supplier_profile_id
    - supplier_profiles.user_id as owner_user_id
    - position
    - status

    Requires DB employee status = active.
    If required_position is provided, verifies DATABASE position, not JWT position.
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    if payload.get("role") != "supplier_employee":
        return None

    if payload.get("account_type") != "supplier_employee":
        return None

    if payload.get("organization_type") != "supplier":
        return None

    raw_emp_id = payload.get("sub")
    try:
        supplier_employee_id = int(raw_emp_id)
    except (TypeError, ValueError):
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.supplier_profile_id,
                sp.user_id AS owner_user_id,
                se.position,
                se.status,
                se.first_name,
                se.last_name,
                se.email,
                sp.business_name
            FROM supplier_employees se
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = se.supplier_profile_id
            WHERE se.supplier_employee_id = %s
            LIMIT 1
            """,
            [supplier_employee_id],
        )
        row = cursor.fetchone()

    if not row:
        return None

    db_status = str(row[4] or "").strip().lower()
    if db_status != "active":
        return None

    db_position = str(row[3] or "").strip().lower()
    if required_position is not None:
        if db_position != str(required_position).strip().lower():
            return None

    return {
        "supplier_employee_id": row[0],
        "supplier_profile_id": row[1],
        "owner_user_id": row[2],
        "position": db_position,
        "status": db_status,
        "first_name": row[5],
        "last_name": row[6],
        "email": row[7],
        "business_name": row[8],
    }


# ============================================================
# MILLER ENCODER GUARD DECORATOR
# ============================================================

def miller_encoder_required(view_func):
    """
    Decorator requiring an authenticated Miller Employee with position == 'encoder'.

    Security rules:
    - Never trust supplier_profile_id from frontend / request query / body.
    - Resolves authoritative identity and branch scoping strictly from the DB.
    - Requires DB employee status == 'active'.
    - Requires DB employee position == 'encoder'.
    - Blocks Finance, Procurement, Seller, Driver, Fulfillment, Branch Manager.

    Attaches to request:
    - request.grainrise_supplier_employee
    - request.grainrise_supplier_employee_id
    - request.grainrise_supplier_profile_id
    - request.grainrise_owner_user_id
    - request.grainrise_employee_position
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Authentication required. Please provide a valid Bearer token.",
                },
                status=401,
            )

        if (
            payload.get("auth_source") != "grainrise"
            or payload.get("role") != "supplier_employee"
            or payload.get("account_type") != "supplier_employee"
            or payload.get("organization_type") != "supplier"
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee authentication required. Please sign in again.",
                },
                status=401,
            )

        raw_emp_id = payload.get("sub")
        try:
            supplier_employee_id = int(raw_emp_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Invalid token subject identifier.",
                },
                status=401,
            )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    se.supplier_employee_id,
                    se.supplier_profile_id,
                    sp.user_id AS owner_user_id,
                    se.position,
                    se.status,
                    se.first_name,
                    se.last_name,
                    se.email,
                    sp.business_name
                FROM supplier_employees se
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = se.supplier_profile_id
                WHERE se.supplier_employee_id = %s
                LIMIT 1
                """,
                [supplier_employee_id],
            )
            row = cursor.fetchone()

        if not row:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account not found.",
                },
                status=401,
            )

        db_status = str(row[4] or "").strip().lower()
        if db_status != "active":
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account is not active. Please contact your manager.",
                },
                status=403,
            )

        db_position = str(row[3] or "").strip().lower()
        if db_position != "encoder":
            return JsonResponse(
                {
                    "success": False,
                    "message": f"Access denied. Encoder position required (current position: {db_position}).",
                },
                status=403,
            )

        employee = {
            "supplier_employee_id": row[0],
            "supplier_profile_id": row[1],
            "owner_user_id": row[2],
            "position": db_position,
            "status": db_status,
            "first_name": row[5],
            "last_name": row[6],
            "email": row[7],
            "business_name": row[8],
        }

        request.grainrise_supplier_employee = employee
        request.grainrise_supplier_employee_id = employee["supplier_employee_id"]
        request.grainrise_supplier_profile_id = employee["supplier_profile_id"]
        request.grainrise_owner_user_id = employee["owner_user_id"]
        request.grainrise_employee_position = employee["position"]

        return view_func(request, *args, **kwargs)

    return wrapped_view


# ============================================================
# MILLER PROCUREMENT GUARD DECORATOR
# ============================================================

def miller_procurement_required(view_func):
    """
    Decorator requiring an authenticated Miller Employee with position == 'procurement'.

    Security rules:
    - Never trust supplier_profile_id from frontend / request query / body.
    - Resolves authoritative identity and branch scoping strictly from the DB.
    - Requires DB employee status == 'active'.
    - Requires DB employee position == 'procurement'.
    - Blocks Encoder, Finance, Seller, Driver, Fulfillment, Branch Manager.

    Attaches to request:
    - request.grainrise_supplier_employee
    - request.grainrise_supplier_employee_id
    - request.grainrise_supplier_profile_id
    - request.grainrise_owner_user_id
    - request.grainrise_employee_position
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Authentication required. Please provide a valid Bearer token.",
                },
                status=401,
            )

        if (
            payload.get("auth_source") != "grainrise"
            or payload.get("role") != "supplier_employee"
            or payload.get("account_type") != "supplier_employee"
            or payload.get("organization_type") != "supplier"
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee authentication required. Please sign in again.",
                },
                status=401,
            )

        raw_emp_id = payload.get("sub")
        try:
            supplier_employee_id = int(raw_emp_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Invalid token subject identifier.",
                },
                status=401,
            )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    se.supplier_employee_id,
                    se.supplier_profile_id,
                    sp.user_id AS owner_user_id,
                    se.position,
                    se.status,
                    se.first_name,
                    se.last_name,
                    se.email,
                    sp.business_name
                FROM supplier_employees se
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = se.supplier_profile_id
                WHERE se.supplier_employee_id = %s
                LIMIT 1
                """,
                [supplier_employee_id],
            )
            row = cursor.fetchone()

        if not row:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account not found.",
                },
                status=401,
            )

        db_status = str(row[4] or "").strip().lower()
        if db_status != "active":
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account is not active. Please contact your manager.",
                },
                status=403,
            )

        db_position = str(row[3] or "").strip().lower()
        if db_position != "procurement":
            return JsonResponse(
                {
                    "success": False,
                    "message": f"Access denied. Procurement position required (current position: {db_position}).",
                },
                status=403,
            )

        employee = {
            "supplier_employee_id": row[0],
            "supplier_profile_id": row[1],
            "owner_user_id": row[2],
            "position": db_position,
            "status": db_status,
            "first_name": row[5],
            "last_name": row[6],
            "email": row[7],
            "business_name": row[8],
        }

        request.grainrise_supplier_employee = employee
        request.grainrise_supplier_employee_id = employee["supplier_employee_id"]
        request.grainrise_supplier_profile_id = employee["supplier_profile_id"]
        request.grainrise_owner_user_id = employee["owner_user_id"]
        request.grainrise_employee_position = employee["position"]

        return view_func(request, *args, **kwargs)

    return wrapped_view


# ============================================================
# MILLER FINANCE GUARD DECORATOR
# ============================================================

def miller_finance_required(view_func):
    """
    Decorator requiring an authenticated Miller Employee with position == 'finance'.

    Security rules:
    - Never trust supplier_profile_id from frontend / request query / body.
    - Resolves authoritative identity and branch scoping strictly from the DB.
    - Requires DB employee status == 'active'.
    - Requires DB employee position == 'finance'.
    - Blocks Encoder, Procurement, Seller, Driver, Fulfillment, Branch Manager.

    Attaches to request:
    - request.grainrise_supplier_employee
    - request.grainrise_supplier_employee_id
    - request.grainrise_supplier_profile_id
    - request.grainrise_owner_user_id
    - request.grainrise_employee_position
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Authentication required. Please provide a valid Bearer token.",
                },
                status=401,
            )

        if (
            payload.get("auth_source") != "grainrise"
            or payload.get("role") != "supplier_employee"
            or payload.get("account_type") != "supplier_employee"
            or payload.get("organization_type") != "supplier"
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee authentication required. Please sign in again.",
                },
                status=401,
            )

        raw_emp_id = payload.get("sub")
        try:
            supplier_employee_id = int(raw_emp_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Invalid token subject identifier.",
                },
                status=401,
            )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    se.supplier_employee_id,
                    se.supplier_profile_id,
                    sp.user_id AS owner_user_id,
                    se.position,
                    se.status,
                    se.first_name,
                    se.last_name,
                    se.email,
                    sp.business_name
                FROM supplier_employees se
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = se.supplier_profile_id
                WHERE se.supplier_employee_id = %s
                LIMIT 1
                """,
                [supplier_employee_id],
            )
            row = cursor.fetchone()

        if not row:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account not found.",
                },
                status=401,
            )

        db_status = str(row[4] or "").strip().lower()
        if db_status != "active":
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account is not active. Please contact your manager.",
                },
                status=403,
            )

        db_position = str(row[3] or "").strip().lower()
        if db_position != "finance":
            return JsonResponse(
                {
                    "success": False,
                    "message": f"Access denied. Finance position required (current position: {db_position}).",
                },
                status=403,
            )

        employee = {
            "supplier_employee_id": row[0],
            "supplier_profile_id": row[1],
            "owner_user_id": row[2],
            "position": db_position,
            "status": db_status,
            "first_name": row[5],
            "last_name": row[6],
            "email": row[7],
            "business_name": row[8],
        }

        request.grainrise_supplier_employee = employee
        request.grainrise_supplier_employee_id = employee["supplier_employee_id"]
        request.grainrise_supplier_profile_id = employee["supplier_profile_id"]
        request.grainrise_owner_user_id = employee["owner_user_id"]
        request.grainrise_employee_position = employee["position"]

        return view_func(request, *args, **kwargs)

    return wrapped_view


# ============================================================
# MILLER SALES GUARD DECORATOR
# ============================================================

def miller_sales_required(view_func):
    """
    Decorator requiring an authenticated Miller Employee with position in ('seller', 'sales').

    Security rules:
    - Never trust supplier_profile_id from frontend / request query / body.
    - Resolves authoritative identity and branch scoping strictly from the DB.
    - Requires DB employee status == 'active'.
    - Requires DB employee position in ('seller', 'sales').
    - Blocks Encoder, Procurement, Finance, Driver, Fulfillment, Branch Manager.

    Attaches to request:
    - request.grainrise_supplier_employee
    - request.grainrise_supplier_employee_id
    - request.grainrise_supplier_profile_id
    - request.grainrise_owner_user_id
    - request.grainrise_employee_position
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Authentication required. Please provide a valid Bearer token.",
                },
                status=401,
            )

        if (
            payload.get("auth_source") != "grainrise"
            or payload.get("role") != "supplier_employee"
            or payload.get("account_type") != "supplier_employee"
            or payload.get("organization_type") != "supplier"
        ):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee authentication required. Please sign in again.",
                },
                status=401,
            )

        raw_emp_id = payload.get("sub")
        try:
            supplier_employee_id = int(raw_emp_id)
        except (TypeError, ValueError):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Invalid token subject identifier.",
                },
                status=401,
            )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    se.supplier_employee_id,
                    se.supplier_profile_id,
                    sp.user_id AS owner_user_id,
                    se.position,
                    se.status,
                    se.first_name,
                    se.middle_initial,
                    se.last_name,
                    se.suffix,
                    se.email,
                    sp.business_name,
                    sp.street_address,
                    sp.barangay,
                    sp.municipality,
                    sp.province,
                    sp.official_contact_number
                FROM supplier_employees se
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = se.supplier_profile_id
                WHERE se.supplier_employee_id = %s
                LIMIT 1
                """,
                [supplier_employee_id],
            )
            row = cursor.fetchone()

        if not row:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account not found.",
                },
                status=401,
            )

        db_status = str(row[4] or "").strip().lower()
        if db_status != "active":
            return JsonResponse(
                {
                    "success": False,
                    "message": "Supplier employee account is not active. Please contact your manager.",
                },
                status=403,
            )

        db_position = str(row[3] or "").strip().lower()
        if db_position not in ("seller", "sales"):
            return JsonResponse(
                {
                    "success": False,
                    "message": f"Access denied. Sales position required (current position: {db_position}).",
                },
                status=403,
            )

        address_parts = [row[11], row[12], row[13], row[14]]
        business_address = ", ".join(
            str(p).strip() for p in address_parts if p and str(p).strip()
        )

        employee = {
            "supplier_employee_id": row[0],
            "supplier_profile_id": row[1],
            "owner_user_id": row[2],
            "position": db_position,
            "status": db_status,
            "first_name": row[5] or "",
            "middle_initial": row[6] or "",
            "last_name": row[7] or "",
            "suffix": row[8] or "",
            "email": row[9] or "",
            "business_name": row[10] or "",
            "business_address": business_address,
            "business_contact": row[15] or "",
        }

        request.grainrise_supplier_employee = employee
        request.grainrise_supplier_employee_id = employee["supplier_employee_id"]
        request.grainrise_supplier_profile_id = employee["supplier_profile_id"]
        request.grainrise_owner_user_id = employee["owner_user_id"]
        request.grainrise_employee_position = employee["position"]

        return view_func(request, *args, **kwargs)

    return wrapped_view


# ============================================================
# MILLER FULFILLMENT & LOGISTICS COORDINATOR GUARD DECORATOR
# ============================================================

def miller_flc_required(view_func):
    """
    Decorator requiring an authenticated Miller Employee with position == 'fulfillment_logistics_coordinator'.

    Security rules:
    - Never trust supplier_profile_id from frontend / request query / body.
    - Resolves authoritative identity and branch scoping strictly from the DB via get_authenticated_miller_employee.
    - Requires DB employee status == 'active'.
    - Requires DB employee position == 'fulfillment_logistics_coordinator'.
    - Blocks Encoder, Procurement, Finance, Seller, Driver, Branch Manager.

    Attaches to request:
    - request.grainrise_supplier_employee
    - request.grainrise_supplier_employee_id
    - request.grainrise_supplier_profile_id
    - request.grainrise_owner_user_id
    - request.grainrise_employee_position
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        employee = get_authenticated_miller_employee(
            request, required_position="fulfillment_logistics_coordinator"
        )
        if not employee:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Fulfillment Logistics Coordinator authentication required. Please sign in again.",
                },
                status=401,
            )

        request.grainrise_supplier_employee = employee
        request.grainrise_supplier_employee_id = employee["supplier_employee_id"]
        request.grainrise_supplier_profile_id = employee["supplier_profile_id"]
        request.grainrise_owner_user_id = employee["owner_user_id"]
        request.grainrise_employee_position = employee["position"]

        return view_func(request, *args, **kwargs)

    return wrapped_view
