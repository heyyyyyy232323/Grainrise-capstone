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

