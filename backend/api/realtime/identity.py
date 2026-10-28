"""
Identity helpers shared by the WebSocket consumer and the broadcaster.

Identity always comes from the existing GrainRise JWT (`sub`) and the
`users` table. Branch ownership is always resolved server-side from
`supplier_profiles.user_id` / `warehouse_profiles.user_id`.
"""

import re

from django.db import connection

from api.miller_function.miller_auth import get_authenticated_miller_manager
from api.warehouse_function.warehouse_auth import get_authenticated_warehouse_manager
from api.farmer_function.farmer_auth import get_authenticated_farmer

ROLE_MILLER = "miller_manager"
ROLE_WAREHOUSE = "warehouse_manager"
ROLE_FARMER = "farmer"
REALTIME_ROLES = {ROLE_MILLER, ROLE_WAREHOUSE, ROLE_FARMER}

THREAD_ID_RE = re.compile(r"^(supplier|warehouse|user)_(\d{1,18})$")


class _TokenRequest:
    """Minimal request shim so the existing auth helpers can be reused as-is."""

    def __init__(self, token):
        self.headers = {"Authorization": f"Bearer {token}"}


def _owned_ids(table, id_col, user_id):
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {id_col}
            FROM {table}
            WHERE user_id = %s
            ORDER BY created_at ASC, {id_col} ASC
            """,
            [user_id],
        )
        return [r[0] for r in cursor.fetchall()]


def get_identity(user_id, role=None):
    """
    Build the messaging identity for a user.
    Returns None for roles that do not use realtime messaging.
    """
    if role is None:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_role FROM users WHERE user_id = %s LIMIT 1",
                [user_id],
            )
            row = cursor.fetchone()
        role = row[0] if row else None

    if role == ROLE_MILLER:
        return {
            "user_id": user_id,
            "role": ROLE_MILLER,
            "supplier_ids": _owned_ids("supplier_profiles", "supplier_profile_id", user_id),
            "warehouse_ids": [],
        }
    if role == ROLE_WAREHOUSE:
        return {
            "user_id": user_id,
            "role": ROLE_WAREHOUSE,
            "supplier_ids": [],
            "warehouse_ids": _owned_ids("warehouse_profiles", "warehouse_profile_id", user_id),
        }
    if role == ROLE_FARMER:
        return {
            "user_id": user_id,
            "role": ROLE_FARMER,
            "supplier_ids": [],
            "warehouse_ids": [],
        }
    return None


def authenticate_token(token):
    """
    Validate a GrainRise JWT using the SAME helpers that protect the REST
    endpoints (signature, auth_source, role, account_type, active status).
    """
    if not token or len(token) > 4096:
        return None

    shim = _TokenRequest(token)

    miller = get_authenticated_miller_manager(shim)
    if miller:
        return get_identity(int(miller["user_id"]), ROLE_MILLER)

    warehouse = get_authenticated_warehouse_manager(shim)
    if warehouse:
        return get_identity(int(warehouse["user_id"]), ROLE_WAREHOUSE)

    farmer = get_authenticated_farmer(shim)
    if farmer:
        return get_identity(int(farmer["user_id"]), ROLE_FARMER)

    try:
        from api.warehouse_function.warehouse_auth import get_authenticated_warehouse_driver_user
        wh_driver = get_authenticated_warehouse_driver_user(shim)
        if wh_driver:
            return {
                "user_id": int(wh_driver["user_id"]),
                "role": ROLE_WAREHOUSE,
                "supplier_ids": [],
                "warehouse_ids": [int(wh_driver["warehouse_profile_id"])],
                "driver_id": int(wh_driver["driver_id"]),
            }
    except Exception:
        pass

    try:
        from api.utils import decode_access_token
        decoded = decode_access_token(token)
        if decoded and decoded.get("auth_source") == "grainrise":
            role = decoded.get("role")
            sub = decoded.get("sub")
            if role == "retailer" and sub:
                return {
                    "user_id": int(sub),
                    "role": "retailer",
                    "supplier_ids": [],
                    "warehouse_ids": [],
                }
    except Exception:
        pass

    return None


def resolve_thread_target_user(thread_id):
    """
    Resolve the users.user_id that owns the participant referenced by a
    thread id. Returns None for malformed / unknown participants.
    """
    match = THREAD_ID_RE.match(str(thread_id or ""))
    if not match:
        return None

    ptype, pid = match.group(1), int(match.group(2))

    with connection.cursor() as cursor:
        if ptype == "supplier":
            cursor.execute(
                "SELECT user_id FROM supplier_profiles WHERE supplier_profile_id = %s LIMIT 1",
                [pid],
            )
        elif ptype == "warehouse":
            cursor.execute(
                "SELECT user_id FROM warehouse_profiles WHERE warehouse_profile_id = %s LIMIT 1",
                [pid],
            )
        else:
            cursor.execute(
                "SELECT user_id FROM users WHERE user_id = %s LIMIT 1",
                [pid],
            )
        row = cursor.fetchone()

    return int(row[0]) if row and row[0] is not None else None


def sender_branch_thread_ids(identity, requested_branch_id=None):
    """
    Thread ids under which the COUNTERPART sees this identity.

    Mirrors the grouping rules of both thread selectors:
      - Miller sender      -> counterpart thread "supplier_<branch>"
      - Warehouse sender   -> counterpart thread "warehouse_<branch>"
      - legacy user threads -> "user_<user_id>"
    The branch must be owned by the authenticated identity; otherwise the
    default (earliest) branch is used, exactly like the send services.
    """
    candidates = []

    if identity["role"] == ROLE_MILLER and identity["supplier_ids"]:
        candidates.append(f"supplier_{identity['supplier_ids'][0]}")
    elif identity["role"] == ROLE_WAREHOUSE and identity["warehouse_ids"]:
        branch = identity["warehouse_ids"][0]
        try:
            requested = int(requested_branch_id) if requested_branch_id else None
        except (TypeError, ValueError):
            requested = None
        if requested and requested in identity["warehouse_ids"]:
            branch = requested
        candidates.append(f"warehouse_{branch}")

    candidates.append(f"user_{identity['user_id']}")
    return candidates

