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

    GrainRise Miller structure:

        users
          |
          | 1 : MANY
          v
        supplier_profiles
          |
          | 1 : MANY
          v
        supplier_employees

    Security rules:
    - JWT must be valid and issued by GrainRise centralized login.
    - Account must be a main-user Miller Manager account.
    - Miller identity comes only from JWT `sub`.
    - Account status is re-checked on every request.
    - One Miller user may own multiple supplier_profiles.
    - The earliest/original supplier_profile remains the
      default profile for backward compatibility.

    IMPORTANT:
    Never trust user_id or supplier_profile_id sent by React as
    ownership authority for Miller data.
    """

    # ========================================================
    # 1. READ / VALIDATE JWT
    # ========================================================

    payload = authorization_payload(request)

    if not payload:
        return None

    if payload.get("auth_source") != "grainrise":
        return None

    if payload.get("role") != "miller_manager":
        return None

    if payload.get("account_type") != "main_user":
        return None

    # ========================================================
    # 2. RESOLVE MILLER USER ID FROM JWT
    # ========================================================
    #
    # JWT `sub` is the authoritative Miller users.user_id.
    #
    # React must never decide ownership by supplying user_id.
    #
    # ========================================================

    raw_user_id = payload.get("sub")

    try:
        miller_user_id = int(raw_user_id)

    except (TypeError, ValueError):
        return None

    # ========================================================
    # 3. LOAD ACTIVE MILLER + DEFAULT SUPPLIER PROFILE
    # ========================================================
    #
    # Previously:
    #
    #     one Miller user
    #         ->
    #     one supplier_profile
    #
    # Now:
    #
    #     one Miller user
    #         ->
    #     many supplier_profiles
    #
    #
    # Existing Miller modules such as Contracts currently
    # expect:
    #
    #     request.grainrise_supplier_profile_id
    #
    # We preserve that behavior by treating the earliest
    # supplier_profile as the DEFAULT / ORIGINAL profile.
    #
    #
    # Branch Management must NOT assume this is the only
    # supplier profile.
    #
    # Branch Management should use:
    #
    #     request.grainrise_miller_id
    #
    # and retrieve supplier_profiles using:
    #
    #     WHERE supplier_profiles.user_id =
    #           request.grainrise_miller_id
    #
    # ========================================================

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

                sp.supplier_profile_id,
                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,
                sp.province,
                sp.municipality,
                sp.postal_code,
                sp.barangay,
                sp.street_address,
                sp.created_at,
                sp.updated_at,

                (
                    SELECT COUNT(*)
                    FROM supplier_profiles owned_profile
                    WHERE owned_profile.user_id = u.user_id
                ) AS supplier_profile_count

            FROM users u

            INNER JOIN supplier_profiles sp
                ON sp.user_id = u.user_id

            WHERE
                u.user_id = %s

                AND u.user_role = 'miller_manager'

                AND u.status = 'active'

            ORDER BY
                sp.created_at ASC,
                sp.supplier_profile_id ASC

            LIMIT 1
            """,
            [miller_user_id],
        )

        row = cursor.fetchone()

    # ========================================================
    # ACTIVE MILLER MUST HAVE AT LEAST ONE SUPPLIER PROFILE
    # ========================================================

    if not row:
        return None

    # ========================================================
    # 4. RETURN AUTHENTICATED MILLER CONTEXT
    # ========================================================

    return {
        # ====================================================
        # CENTRALIZED USER ACCOUNT
        # ====================================================

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

        # ====================================================
        # DEFAULT / ORIGINAL SUPPLIER PROFILE
        # ====================================================
        #
        # Keep supplier_profile_id because existing Miller
        # modules already use this key.
        #
        # default_supplier_profile_id is the clearer name that
        # new code may use.
        #
        # ====================================================

        "supplier_profile_id": row[10],

        "default_supplier_profile_id": row[10],

        "business_name": row[11],
        "organization_name": row[12],

        "official_email": row[13],
        "official_contact_number": row[14],

        "province": row[15],
        "municipality": row[16],
        "postal_code": row[17],
        "barangay": row[18],
        "street_address": row[19],

        "supplier_profile_created_at": row[20],
        "supplier_profile_updated_at": row[21],

        # ====================================================
        # NUMBER OF PROFILES / LOCATIONS
        # ====================================================

        "supplier_profile_count": row[22],
    }


# ============================================================
# MILLER MANAGER JWT GUARD
# ============================================================


def miller_manager_required(view_func):
    """
    Protect Miller Manager-only API endpoints.

    Authenticated Miller information is attached to the
    request object.

    Available request values:

    ------------------------------------------------------------
    request.grainrise_miller
    ------------------------------------------------------------

    Complete authenticated Miller information.

    Includes:
    - centralized Miller user account
    - default/original supplier profile
    - supplier profile count


    ------------------------------------------------------------
    request.grainrise_miller_id
    ------------------------------------------------------------

    Authenticated users.user_id.

    THIS is the main ownership authority for modules that need
    access to ALL supplier profiles owned by a Miller.

    Example:

        Branch Management

    Query pattern:

        SELECT ...
        FROM supplier_profiles
        WHERE user_id = request.grainrise_miller_id;


    ------------------------------------------------------------
    request.grainrise_default_supplier_profile_id
    ------------------------------------------------------------

    Earliest/original supplier_profile_id.

    Useful for modules that explicitly need the original/default
    Miller location.


    ------------------------------------------------------------
    request.grainrise_supplier_profile_id
    ------------------------------------------------------------

    Backward-compatible alias.

    Existing Miller modules such as Contracts already use this
    request value.

    For now it continues pointing to the Miller's earliest /
    original supplier_profile.

    This prevents Branch Management changes from suddenly
    breaking existing Contracts behavior.


    ------------------------------------------------------------
    SECURITY
    ------------------------------------------------------------

    Never accept the following values from React as ownership
    authority:

        user_id
        miller_user_id
        supplier_profile_id

    Any requested supplier_profile_id must later be validated
    against:

        supplier_profiles.user_id =
            request.grainrise_miller_id
    """

    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):

        # ====================================================
        # AUTHENTICATE MILLER
        # ====================================================

        miller = get_authenticated_miller_manager(
            request
        )

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

        # ====================================================
        # COMPLETE MILLER CONTEXT
        # ====================================================

        request.grainrise_miller = miller

        # ====================================================
        # AUTHENTICATED MILLER USER ID
        # ====================================================
        #
        # Used by Branch Management to retrieve ALL owned
        # supplier_profiles.
        #
        # ====================================================

        request.grainrise_miller_id = miller[
            "user_id"
        ]

        # ====================================================
        # DEFAULT / ORIGINAL PROFILE
        # ====================================================

        default_supplier_profile_id = miller[
            "default_supplier_profile_id"
        ]

        request.grainrise_default_supplier_profile_id = (
            default_supplier_profile_id
        )

        # ====================================================
        # BACKWARD-COMPATIBLE PROFILE ID
        # ====================================================
        #
        # Existing Contracts selectors/services currently
        # expect this request attribute.
        #
        # Do not remove until those modules are intentionally
        # made profile/branch-aware.
        #
        # ====================================================

        request.grainrise_supplier_profile_id = (
            default_supplier_profile_id
        )

        # ====================================================
        # PROFILE COUNT
        # ====================================================

        request.grainrise_supplier_profile_count = (
            miller["supplier_profile_count"]
        )

        # ====================================================
        # CONTINUE TO PROTECTED VIEW
        # ====================================================

        return view_func(
            request,
            *args,
            **kwargs,
        )

    return wrapped_view


def miller_payment_security_user_required(view_func):
    """
    Authenticate either a Miller Manager or a Miller Employee (e.g. FLC or Driver)
    for Payment Security and Online Payment Account operations.
    Sets:
    - request.grainrise_miller_id = user_id or supplier_employee_id
    - request.grainrise_is_employee = True / False
    - request.grainrise_supplier_profile_id = supplier_profile_id
    - request.grainrise_supplier_employee_id = supplier_employee_id (if employee)
    """
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload or payload.get("auth_source") != "grainrise":
            return JsonResponse({"success": False, "message": "Authentication required. Please sign in again."}, status=401)

        role = payload.get("role")
        account_type = payload.get("account_type")

        # 1. Miller Manager
        if role == "miller_manager" and account_type == "main_user":
            miller = get_authenticated_miller_manager(request)
            if not miller:
                return JsonResponse({"success": False, "message": "Miller Manager authentication required."}, status=401)
            request.grainrise_miller = miller
            request.grainrise_miller_id = miller["user_id"]
            request.grainrise_is_employee = False
            request.grainrise_supplier_profile_id = miller["default_supplier_profile_id"]
            request.grainrise_supplier_employee_id = None
            return view_func(request, *args, **kwargs)

        # 2. Supplier Employee (FLC, Driver, etc.)
        if role == "supplier_employee" or account_type == "supplier_employee":
            raw_emp_id = payload.get("sub")
            try:
                emp_id = int(raw_emp_id)
            except (TypeError, ValueError):
                return JsonResponse({"success": False, "message": "Invalid token subject."}, status=401)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT supplier_employee_id, supplier_profile_id, first_name, last_name, email, position, status
                    FROM supplier_employees
                    WHERE supplier_employee_id = %s
                    LIMIT 1
                    """,
                    [emp_id],
                )
                emp_row = cursor.fetchone()

            if not emp_row or str(emp_row[6] or "").strip().lower() != "active":
                return JsonResponse({"success": False, "message": "Active employee account required."}, status=401)

            request.grainrise_miller = None
            request.grainrise_miller_id = emp_row[0]
            request.grainrise_is_employee = True
            request.grainrise_supplier_profile_id = emp_row[1]
            request.grainrise_supplier_employee_id = emp_row[0]
            request.grainrise_employee_name = f"{emp_row[2]} {emp_row[3]}".strip()
            request.grainrise_employee_email = emp_row[4]
            return view_func(request, *args, **kwargs)

        return JsonResponse({"success": False, "message": "Authorized user required."}, status=401)

    return wrapped_view