import logging
from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import authorization_payload

logger = logging.getLogger(__name__)


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
                u.last_name,
                u.email,
                u.contact_number,
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

        return {
            "user_id": row[0],
            "first_name": row[1] or "",
            "last_name": row[2] or "",
            "full_name": f"{row[1] or ''} {row[2] or ''}".strip(),
            "email": row[3] or "",
            "contact_number": row[4] or "",
            "user_role": row[5],
            "status": row[6],
            "barangay": row[7] or "",
            "farm_profile_id": row[8],
            "farm_lot_name": row[9] or "",
            "province": row[10] or "",
            "municipality": row[11] or "",
            "street_address": row[12] or "",
        }


def farmer_required(view_func):
    """
    Decorator that requires a valid authenticated Farmer with an active farm profile.
    Attaches `request.farmer` to the request object.
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        farmer = get_authenticated_farmer(request)
        if not farmer:
            return JsonResponse(
                {"detail": "Authentication credentials were not provided or are invalid."},
                status=401,
            )

        if not farmer.get("farm_profile_id"):
            return JsonResponse(
                {"detail": "No farm profile registered for this farmer account. Please complete your profile."},
                status=403,
            )

        request.farmer = farmer
        return view_func(request, *args, **kwargs)

    return wrapped_view
