from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload


# ============================================================
# AUTHENTICATED FARMER LOOKUP
# ============================================================

def get_authenticated_farmer(request):
    """
    Resolve the currently logged-in Farmer from the existing
    GrainRise Bearer JWT.

    Security rules:
    - JWT must be valid.
    - Token must come from GrainRise centralized login.
    - Account must be a main-user Farmer account.
    - Farmer identity comes from JWT `sub`.
    - Account status is re-checked against PostgreSQL on every
      protected request so an inactive/deactivated/archived
      account cannot keep using an old unexpired token.

    Never trust a user_id sent by the frontend for ownership.
    """

    payload = authorization_payload(request)

    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    if payload.get("role") != "farmer":
        return None

    if payload.get("account_type") != "main_user":
        return None

    raw_user_id = payload.get("sub")

    try:
        farmer_user_id = int(raw_user_id)
    except (TypeError, ValueError):
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                user_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                email,
                contact_number,
                username,
                user_role::text,
                status::text
            FROM users
            WHERE user_id = %s
              AND user_role::text = 'farmer'
              AND status::text = 'active'
            LIMIT 1
            """,
            [farmer_user_id],
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
    }


# ============================================================
# FARMER JWT / SESSION GUARD
# ============================================================

def farmer_required(view_func):
    """
    Protect Farmer-only API endpoints.

    The authenticated Farmer is attached to:

        request.grainrise_farmer
        request.grainrise_farmer_id

    Farm Management code must use these authenticated values
    instead of accepting user_id from request data.
    """

    @wraps(view_func)
    def wrapped_view(
        request,
        *args,
        **kwargs,
    ):
        farmer = get_authenticated_farmer(
            request
        )

        if not farmer:
            return JsonResponse(
                {
                    "success": False,
                    "message": (
                        "Farmer authentication required. "
                        "Please sign in again."
                    ),
                },
                status=401,
            )

        request.grainrise_farmer = farmer
        request.grainrise_farmer_id = (
            farmer["user_id"]
        )

        return view_func(
            request,
            *args,
            **kwargs,
        )

    return wrapped_view
