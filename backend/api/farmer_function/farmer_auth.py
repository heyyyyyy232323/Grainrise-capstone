import logging
from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload

logger = logging.getLogger(__name__)


# ============================================================
# AUTHENTICATED FARMER LOOKUP
# ============================================================

def get_authenticated_farmer(request):
    """
    Resolve the currently logged-in Farmer from the GrainRise Bearer JWT.

    Security rules:
    - JWT must be valid and issued by GrainRise centralized login.
    - Account must be an active Farmer account in `users`.
    - Resolves farmer's primary `farm_profile_id` from `farm_profile`.
    - Never trusts farm_profile_id or user_id sent by React client as ownership authority.
    """
    payload = authorization_payload(request)
    if not payload:
        return None

    # Check auth source if present
    if payload.get("auth_source") and payload.get("auth_source") != "grainrise":
        return None

    # Ensure role is farmer if role is present in payload
    if payload.get("role") and payload.get("role") != "farmer":
        return None

    raw_user_id = payload.get("sub")
    try:
        user_id = int(raw_user_id)
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
                u.barangay,
                fp.farm_profile_id,
                fp.farm_lot_name,
                fp.province,
                fp.municipality,
                fp.street_address
            FROM users u
            LEFT JOIN farm_profile fp ON fp.user_id = u.user_id
            WHERE u.user_id = %s
              AND u.user_role = 'farmer'
              AND u.status = 'active'
            ORDER BY fp.farm_profile_id ASC
            LIMIT 1
            """,
            [user_id],
        )
        row = cursor.fetchone()
        if not row:
            return None

        first_name = row[1] or ""
        last_name = row[3] or ""
        full_name = f"{first_name} {last_name}".strip()

        return {
            "user_id": row[0],
            "id": row[0],
            "first_name": first_name,
            "middle_initial": row[2] or "",
            "last_name": last_name,
            "suffix": row[4] or "",
            "full_name": full_name,
            "email": row[5] or "",
            "contact_number": row[6] or "",
            "username": row[7] or "",
            "user_role": row[8],
            "role": row[8],
            "status": row[9],
            "barangay": row[10] or "",
            "farm_profile_id": row[11],
            "farm_lot_name": row[12] or "",
            "province": row[13] or "",
            "municipality": row[14] or "",
            "street_address": row[15] or "",
        }


# ============================================================
# FARMER JWT / SESSION GUARD
# ============================================================

def farmer_required(view_func):
    """
    Decorator that requires a valid authenticated Farmer account.
    Attaches request.farmer, request.farmer_id, request.grainrise_farmer,
    request.grainrise_farmer_id, and request.farmer_user_id to the request object.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        farmer = get_authenticated_farmer(request)
        if not farmer:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Farmer authentication required. Please sign in again.",
                    "detail": "Authentication credentials were not provided or are invalid.",
                },
                status=401,
            )

        # Contracts module endpoints require a registered farm profile
        if "/contracts/" in request.path and not farmer.get("farm_profile_id"):
            return JsonResponse(
                {
                    "success": False,
                    "message": "No farm profile registered for this farmer account. Please complete your profile.",
                    "detail": "No farm profile registered for this farmer account. Please complete your profile.",
                },
                status=403,
            )

        # Attach all request attributes expected across all modules
        request.farmer = farmer
        request.farmer_id = farmer["user_id"]
        request.farmer_user_id = farmer["user_id"]
        request.grainrise_farmer = farmer
        request.grainrise_farmer_id = farmer["user_id"]

        return view_func(request, *args, **kwargs)

    return wrapped_view
