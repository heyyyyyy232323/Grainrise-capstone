from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload


# ============================================================
# AUTHENTICATED MILLER MANAGER LOOKUP
# ============================================================


def get_authenticated_miller_manager(request):
    """
    Resolve the currently logged-in Miller Manager from the
    existing GrainRise Bearer JWT.

    Security rules:
    - JWT must be valid and issued by GrainRise centralized login.
    - Account must be a main-user Miller Manager account.
    - Miller identity comes only from JWT `sub`.
    - Account status is re-checked in PostgreSQL on every request.
    - The Miller business is resolved through supplier_profiles.

    Never trust user_id or supplier_profile_id sent by React as
    ownership authority for Miller data.
    """

    payload = authorization_payload(request)

    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    if payload.get("role") != "miller_manager":
        return None

    if payload.get("account_type") != "main_user":
        return None

    raw_user_id = payload.get("sub")

    try:
        miller_user_id = int(raw_user_id)
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
                u.user_role::text,
                u.status::text,
                sp.supplier_profile_id,
                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,
                sp.province,
                sp.municipality,
                sp.postal_code,
                sp.barangay,
                sp.street_address
            FROM users u
            INNER JOIN supplier_profiles sp
                ON sp.user_id = u.user_id
            WHERE u.user_id = %s
              AND u.user_role::text = 'miller_manager'
              AND u.status::text = 'active'
            LIMIT 1
            """,
            [miller_user_id],
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
        "supplier_profile_id": row[10],
        "business_name": row[11],
        "organization_name": row[12],
        "official_email": row[13],
        "official_contact_number": row[14],
        "province": row[15],
        "municipality": row[16],
        "postal_code": row[17],
        "barangay": row[18],
        "street_address": row[19],
    }


# ============================================================
# MILLER MANAGER JWT GUARD
# ============================================================


def miller_manager_required(view_func):
    """
    Protect Miller Manager-only API endpoints.

    The authenticated account is attached to:

        request.grainrise_miller
        request.grainrise_miller_id
        request.grainrise_supplier_profile_id

    Contracts selectors/services must scope private Miller data
    using request.grainrise_supplier_profile_id rather than an ID
    supplied by the frontend.
    """

    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        miller = get_authenticated_miller_manager(request)

        if not miller:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "Miller Manager authentication required. "
                        "Please sign in again."
                    ),
                },
                status=401,
            )

        request.grainrise_miller = miller
        request.grainrise_miller_id = miller["user_id"]
        request.grainrise_supplier_profile_id = miller[
            "supplier_profile_id"
        ]

        return view_func(request, *args, **kwargs)

    return wrapped_view
