from django.db import connection

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import UserLoginSerializer

from .auth_utils import get_business_user

from .utils import (
    create_access_token,
    verify_password,
)


# ============================================================
# GRAINRISE CENTRALIZED USER LOGIN
# ============================================================
# Handles:
# - Retailer
# - Warehouse Manager
# - Miller / Supplier Manager
# - Warehouse Employees
# - Supplier / Miller Employees
#
# NOTE:
# Admin authentication remains separate.
# ============================================================
# PROFILE COMPLETENESS CHECK HELPER
# ============================================================

def check_profile_incomplete(user_id, role=None):
    """
    Evaluates whether a Miller, Warehouse, or Retailer account has completed all required profile fields.
    Required in users table:
      first_name, last_name, gender, contact_number,
      province, municipality, postal_code, barangay, street_address
    Required for miller_manager in supplier_profiles:
      business_name, province, municipality, postal_code,
      barangay, street_address, official_email, official_contact_number
    Required for warehouse_manager in warehouse_profiles:
      business_name, province, municipality, postal_code,
      barangay, street_address, official_email, official_contact_number
    Retailer: users fields only.
    Returns (is_incomplete: bool, missing_fields: list).
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT first_name, last_name, gender, contact_number,
                   province, municipality, postal_code, barangay, street_address,
                   user_role
            FROM users
            WHERE user_id = %s
            """,
            [user_id]
        )
        row = cursor.fetchone()

    if not row:
        return True, ["user_not_found"]

    (fname, lname, gender, contact,
     prov, muni, postal, brgy, street,
     user_role) = row

    active_role = role or user_role
    if active_role not in ("miller_manager", "warehouse_manager", "retailer"):
        return False, []

    missing = []

    def is_blank(val):
        return val is None or not str(val).strip()

    if is_blank(fname): missing.append("first_name")
    if is_blank(lname): missing.append("last_name")
    if is_blank(gender): missing.append("gender")
    if is_blank(contact): missing.append("contact_number")
    if is_blank(prov): missing.append("province")
    if is_blank(muni): missing.append("municipality")
    if is_blank(postal): missing.append("postal_code")
    if is_blank(brgy): missing.append("barangay")
    if is_blank(street): missing.append("street_address")

    if active_role == "miller_manager":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT business_name, province, municipality, postal_code,
                       barangay, street_address, official_email, official_contact_number
                FROM supplier_profiles
                WHERE user_id = %s
                """,
                [user_id]
            )
            s_row = cursor.fetchone()

        if not s_row:
            missing.extend([
                "business_name", "business_province", "business_municipality",
                "business_postal_code", "business_barangay", "business_street_address",
                "official_email", "official_contact_number"
            ])
        else:
            if is_blank(s_row[0]): missing.append("business_name")
            if is_blank(s_row[1]): missing.append("business_province")
            if is_blank(s_row[2]): missing.append("business_municipality")
            if is_blank(s_row[3]): missing.append("business_postal_code")
            if is_blank(s_row[4]): missing.append("business_barangay")
            if is_blank(s_row[5]): missing.append("business_street_address")
            if is_blank(s_row[6]): missing.append("official_email")
            if is_blank(s_row[7]): missing.append("official_contact_number")

    elif active_role == "warehouse_manager":
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT business_name, province, municipality, postal_code,
                       barangay, street_address, official_email, official_contact_number
                FROM warehouse_profiles
                WHERE user_id = %s
                """,
                [user_id]
            )
            w_row = cursor.fetchone()

        if not w_row:
            missing.extend([
                "business_name", "business_province", "business_municipality",
                "business_postal_code", "business_barangay", "business_street_address",
                "official_email", "official_contact_number"
            ])
        else:
            if is_blank(w_row[0]): missing.append("business_name")
            if is_blank(w_row[1]): missing.append("business_province")
            if is_blank(w_row[2]): missing.append("business_municipality")
            if is_blank(w_row[3]): missing.append("business_postal_code")
            if is_blank(w_row[4]): missing.append("business_barangay")
            if is_blank(w_row[5]): missing.append("business_street_address")
            if is_blank(w_row[6]): missing.append("official_email")
            if is_blank(w_row[7]): missing.append("official_contact_number")

    return len(missing) > 0, missing


@api_view(["POST"])
def login(request):

    # ========================================================
    # VALIDATE REQUEST DATA
    # ========================================================

    serializer = UserLoginSerializer(
        data=request.data
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


    # ========================================================
    # GET LOGIN CREDENTIALS
    # ========================================================

    identifier = (
        serializer
        .validated_data["identifier"]
        .strip()
    )

    password = (
        serializer
        .validated_data["password"]
    )


    # ========================================================
    # FIND ACCOUNT
    # ========================================================
    # Checks:
    # 1. users
    # 2. warehouse_employees
    # 3. supplier_employees
    # ========================================================

    try:
        user = get_business_user(
            identifier
        )

    except Exception as exc:
        return Response(
            {
                "detail": f"Database error: {exc}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    # ========================================================
    # INVALID ACCOUNT / PASSWORD
    # ========================================================

    if (
        not user
        or not verify_password(
            password,
            user.get("password_hash"),
        )
    ):
        return Response(
            {
                "detail":
                    "Incorrect email/username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


    # ========================================================
    # ONLY ACTIVE ACCOUNTS CAN LOGIN
    # ========================================================
    #
    # Allowed:
    # active
    #
    # Blocked:
    # inactive
    # deactivated
    # archived
    #
    # Applies to:
    # - users
    # - warehouse_employees
    # - supplier_employees
    # ========================================================

    account_status = str(
        user.get("status", "")
    ).strip().lower()

    if account_status != "active":
        return Response(
            {
                "detail":
                    (
                        "Your account is not active. "
                        "Please contact the administrator."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )


    # ========================================================
    # CREATE ACCESS TOKEN
    # ========================================================

    access_token = create_access_token(
        {
            # Account ID
            "sub": str(user["id"]),

            # Main role
            #
            # Possible examples:
            # retailer
            # warehouse_manager
            # miller_manager
            # warehouse_employee
            # supplier_employee
            "role": str(user["role"]),

            # Main user or employee
            "account_type": user.get(
                "account_type"
            ),

            # Employee position
            #
            # Examples:
            # encoder
            # procurement
            # finance
            # seller
            # fulfillment_logistics_coordinator
            # driver
            # branch_manager
            #
            # None for main users.
            "position": user.get(
                "position"
            ),

            # warehouse / supplier
            #
            # None for retailer
            "organization_type": user.get(
                "organization_type"
            ),

            # Owner / manager user_id
            "owner_user_id": user.get(
                "owner_user_id"
            ),

            # Identify GrainRise authentication
            "auth_source": "grainrise",
        }
    )

    # Calculate profile completeness for main accounts
    if user.get("role") in ("miller_manager", "warehouse_manager", "retailer") or user.get("account_type") == "main_user":
        profile_incomplete, _ = check_profile_incomplete(user["id"], user.get("role"))
        user["profile_incomplete"] = profile_incomplete

    # ========================================================
    # LOGIN RESPONSE
    # ========================================================

    return Response(
        {
            "access_token": access_token,
            "token_type": "bearer",

            "user": {
                # ====================================================
                # BASIC ACCOUNT INFORMATION
                # ====================================================

                "id": user["id"],

                "first_name": user[
                    "first_name"
                ],

                "last_name": user[
                    "last_name"
                ],

                "email": user[
                    "email"
                ],

                "contact_number": user.get(
                    "contact_number"
                ),

                "username": user[
                    "username"
                ],


                # ====================================================
                # ACCOUNT ROLE
                # ====================================================

                "role": str(
                    user["role"]
                ),

                "status": str(
                    user["status"]
                ),


                # ====================================================
                # CENTRALIZED LOGIN METADATA
                # ====================================================

                # main_user
                # warehouse_employee
                # supplier_employee
                "account_type": user.get(
                    "account_type"
                ),

                # Employee position.
                # None for main accounts.
                "position": user.get(
                    "position"
                ),

                # warehouse / supplier
                # None for farmer / retailer
                "organization_type": user.get(
                    "organization_type"
                ),

                # Warehouse/Supplier profile ID.
                # None for retailer.
                "profile_id": user.get(
                    "profile_id"
                ),

                # Main manager / owner user_id.
                "owner_user_id": user.get(
                    "owner_user_id"
                ),

                "must_change_password": bool(
                    user.get("must_change_password", False)
                ),

                "profile_incomplete": bool(
                    user.get("profile_incomplete", False)
                ),
            },

            "must_change_password": bool(
                user.get("must_change_password", False)
            ),

            "profile_incomplete": bool(
                user.get("profile_incomplete", False)
            ),
        },
        status=status.HTTP_200_OK,
    )

# ============================================================
# PARTNER FIRST LOGIN / CHANGE TEMPORARY PASSWORD
# ============================================================

def _get_auth_user(request):
    auth_header = request.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header[7:].strip()
    try:
        from .utils import decode_access_token
        payload = decode_access_token(token)
        return str(payload.get("sub")), payload
    except Exception:
        return None

@api_view(["POST"])
def change_temporary_password(request):
    """
    POST /api/auth/change-temporary-password/
    Allows newly approved partners to change their temporary password.
    """
    from django.db import connection
    from django.contrib.auth.hashers import make_password
    from .utils import verify_password, create_access_token

    data = request.data
    current_password = str(data.get("current_password") or "").strip()
    new_password = str(data.get("new_password") or "").strip()
    confirm_password = str(data.get("confirm_password") or "").strip()

    auth = _get_auth_user(request)
    user_id = auth[0] if auth else None
    identifier = str(data.get("identifier") or data.get("email") or "").strip().lower()

    with connection.cursor() as cursor:
        if user_id:
            cursor.execute(
                "SELECT user_id, password_hash, user_role, must_change_password, province, gender, first_name, last_name, email FROM users WHERE user_id = %s",
                [user_id]
            )
        elif identifier:
            cursor.execute(
                "SELECT user_id, password_hash, user_role, must_change_password, province, gender, first_name, last_name, email FROM users WHERE LOWER(email) = %s OR LOWER(COALESCE(username, '')) = %s",
                [identifier, identifier]
            )
        else:
            return Response({"detail": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)
        
        row = cursor.fetchone()

    if not row:
        return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    uid, stored_hash, role, must_change_pw, province, gender, fname, lname, uemail = row

    if current_password:
        if not verify_password(current_password, stored_hash):
            return Response({"detail": "Current temporary password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
    elif not (user_id and must_change_pw):
        return Response({"detail": "Current temporary password is required."}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

    if not any(c.isupper() for c in new_password) or not any(c.islower() for c in new_password) or not any(c.isdigit() for c in new_password):
        return Response({"detail": "New password must contain at least one uppercase letter, one lowercase letter, and one number."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"detail": "New password and confirmation do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if (current_password and current_password == new_password) or verify_password(new_password, stored_hash):
        return Response({"detail": "New password must be different from your temporary password."}, status=status.HTTP_400_BAD_REQUEST)

    new_hash = make_password(new_password)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE users
            SET password_hash = %s,
                must_change_password = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """,
            [new_hash, uid]
        )

    profile_incomplete, _ = check_profile_incomplete(uid, role)

    new_token = create_access_token({
        "sub": str(uid),
        "role": str(role),
        "account_type": "main_user",
        "position": None,
        "organization_type": None,
        "owner_user_id": uid,
        "auth_source": "grainrise",
    })

    return Response({
        "success": True,
        "message": "Password changed successfully.",
        "access_token": new_token,
        "token_type": "bearer",
        "user": {
            "id": uid,
            "first_name": fname,
            "last_name": lname,
            "email": uemail,
            "role": role,
            "must_change_password": False,
            "profile_incomplete": profile_incomplete,
        },
        "must_change_password": False,
        "profile_incomplete": profile_incomplete,
    }, status=status.HTTP_200_OK)


# ============================================================
# AUTHENTICATED USER PROFILE HELPER
# ============================================================

def get_authenticated_user_profile(user_id, payload=None):
    """
    Retrieves the user profile from the database across all roles:
    - admins (admin_role: system_admin, account_admin)
    - warehouse_employees
    - supplier_employees
    - users (retailer, warehouse_manager, miller_manager, farmer)
    Returns (user_data_dict, table_name, id_column) or (None, None, None).
    """
    from django.db import connection

    if not user_id:
        return None, None, None

    payload = payload or {}
    jwt_role = str(payload.get("role") or "").strip().lower()
    auth_source = str(payload.get("auth_source") or "").strip().lower()
    account_type = str(payload.get("account_type") or "").strip().lower()
    position = str(payload.get("position") or "").strip().lower()
    org_type = str(payload.get("organization_type") or "").strip().lower()

    candidates = []
    if auth_source == "django_admin" or jwt_role in ("admin", "account_admin", "system_admin"):
        candidates.append(("admins", "admin_id", "admin"))
    elif account_type == "main_user" or jwt_role in ("retailer", "warehouse_manager", "miller_manager", "farmer"):
        candidates.append(("users", "user_id", "main_user"))
    elif account_type == "warehouse_employee" or jwt_role == "warehouse_employee" or org_type == "warehouse" or (jwt_role.startswith("warehouse_") and jwt_role != "warehouse_manager"):
        candidates.append(("warehouse_employees", "warehouse_employee_id", "warehouse_employee"))
        candidates.append(("supplier_employees", "supplier_employee_id", "supplier_employee"))
    elif account_type == "supplier_employee" or jwt_role == "supplier_employee" or org_type == "supplier" or jwt_role.startswith("supplier_") or (jwt_role.startswith("miller_") and jwt_role != "miller_manager"):
        candidates.append(("supplier_employees", "supplier_employee_id", "supplier_employee"))
        candidates.append(("warehouse_employees", "warehouse_employee_id", "warehouse_employee"))

    all_tables = [
        ("admins", "admin_id", "admin"),
        ("users", "user_id", "main_user"),
        ("warehouse_employees", "warehouse_employee_id", "warehouse_employee"),
        ("supplier_employees", "supplier_employee_id", "supplier_employee"),
    ]
    for table_info in all_tables:
        if table_info not in candidates:
            candidates.append(table_info)

    with connection.cursor() as cursor:
        for table, id_col, acct_kind in candidates:
            role_col = "admin_role" if table == "admins" else ("position" if "employees" in table else "user_role")
            cursor.execute(f"""
                SELECT {id_col}, first_name, middle_initial, last_name, suffix, gender,
                       province, municipality, postal_code, barangay, street_address,
                       email, contact_number, username, {role_col}, status, must_change_password
                FROM {table}
                WHERE {id_col} = %s
                LIMIT 1
            """, [user_id])
            row = cursor.fetchone()
            if row:
                raw_role = row[14]
                if table == "admins":
                    resolved_role = raw_role or "account_admin"
                    resolved_acct_type = "admin"
                    resolved_pos = None
                elif table == "warehouse_employees":
                    resolved_role = "warehouse_employee"
                    resolved_acct_type = "warehouse_employee"
                    resolved_pos = raw_role or position
                elif table == "supplier_employees":
                    resolved_role = "supplier_employee"
                    resolved_acct_type = "supplier_employee"
                    resolved_pos = raw_role or position
                else: # users
                    resolved_role = raw_role or "retailer"
                    resolved_acct_type = "main_user"
                    resolved_pos = None

                user_dict = {
                    "id": row[0],
                    "first_name": row[1] or "",
                    "middle_initial": row[2] or "",
                    "last_name": row[3] or "",
                    "suffix": row[4] or "",
                    "gender": row[5] or "",
                    "province": row[6] or "",
                    "municipality": row[7] or "",
                    "postal_code": row[8] or "",
                    "barangay": row[9] or "",
                    "street_address": row[10] or "",
                    "email": row[11] or "",
                    "contact_number": row[12] or "",
                    "username": row[13] or "",
                    "role": resolved_role,
                    "account_type": resolved_acct_type,
                    "position": resolved_pos,
                    "status": row[15] or "active",
                    "must_change_password": bool(row[16]),
                    "table": table,
                    "id_column": id_col,
                }
                return user_dict, table, id_col

    return None, None, None


# ============================================================
# PROFILE STATUS & COMPLETION
# ============================================================

@api_view(["GET"])
def get_profile_status(request):
    """
    GET /api/auth/profile-status/
    Returns current profile completeness status and existing data.
    """
    from django.db import connection
    auth = _get_auth_user(request)
    if not auth:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    
    user_id = auth[0]
    payload = auth[1] if len(auth) > 1 and isinstance(auth[1], dict) else {}

    user_data, table, id_col = get_authenticated_user_profile(user_id, payload)
    if table == 'admins' and user_data:
        return Response({
            'user': user_data,
            'profile': {},
            'documents': {},
            'must_change_password': user_data.get('must_change_password', False),
            'profile_incomplete': False,
            'missing_fields': [],
        })

    account_type = str(payload.get("account_type") or "").strip().lower()
    jwt_role = str(payload.get("role") or "").strip().lower()
    position = str(payload.get("position") or "").strip().lower()
    org_type = str(payload.get("organization_type") or "").strip().lower()

    is_employee = (
        account_type in ("supplier_employee", "warehouse_employee")
        or jwt_role in ("supplier_employee", "warehouse_employee")
        or bool(position)
    )

    if is_employee:
        is_warehouse = (
            account_type == "warehouse_employee"
            or jwt_role == "warehouse_employee"
            or org_type == "warehouse"
            or jwt_role.startswith("warehouse_")
            or jwt_role == "branch_manager"
        )
        emp_table = "warehouse_employees" if is_warehouse else "supplier_employees"
        id_col = "warehouse_employee_id" if is_warehouse else "supplier_employee_id"

        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT {id_col}, first_name, middle_initial, last_name, suffix, gender,
                       province, municipality, postal_code, barangay, street_address,
                       email, contact_number, username, position, status
                FROM {emp_table}
                WHERE {id_col} = %s
            """, [user_id])
            emp_row = cursor.fetchone()

            if not emp_row:
                fallback_table = "supplier_employees" if is_warehouse else "warehouse_employees"
                fallback_id_col = "supplier_employee_id" if is_warehouse else "warehouse_employee_id"
                cursor.execute(f"""
                    SELECT {fallback_id_col}, first_name, middle_initial, last_name, suffix, gender,
                           province, municipality, postal_code, barangay, street_address,
                           email, contact_number, username, position, status
                    FROM {fallback_table}
                    WHERE {fallback_id_col} = %s
                """, [user_id])
                emp_row = cursor.fetchone()
                if emp_row:
                    emp_table = fallback_table

        if not emp_row:
            return Response({"detail": "Employee account not found."}, status=status.HTTP_404_NOT_FOUND)

        # Validate REQUIRED fields only for employees:
        # first_name, last_name, email, contact_number, username, position
        # Nullable fields (middle_initial, suffix, gender, province, municipality, postal_code, barangay, street_address) are optional
        missing_fields = []
        if not str(emp_row[1] or "").strip(): missing_fields.append("first_name")
        if not str(emp_row[3] or "").strip(): missing_fields.append("last_name")
        if not str(emp_row[11] or "").strip(): missing_fields.append("email")
        if not str(emp_row[12] or "").strip(): missing_fields.append("contact_number")
        if not str(emp_row[13] or "").strip(): missing_fields.append("username")
        if not str(emp_row[14] or "").strip(): missing_fields.append("position")

        profile_incomplete = len(missing_fields) > 0
        resolved_account_type = "warehouse_employee" if emp_table == "warehouse_employees" else "supplier_employee"

        return Response({
            "user": {
                "id": emp_row[0],
                "first_name": emp_row[1],
                "middle_initial": emp_row[2],
                "last_name": emp_row[3],
                "suffix": emp_row[4],
                "gender": emp_row[5],
                "province": emp_row[6],
                "municipality": emp_row[7],
                "postal_code": emp_row[8],
                "barangay": emp_row[9],
                "street_address": emp_row[10],
                "email": emp_row[11],
                "contact_number": emp_row[12],
                "username": emp_row[13],
                "role": jwt_role or resolved_account_type,
                "account_type": resolved_account_type,
                "position": emp_row[14],
                "must_change_password": False,
                "profile_incomplete": profile_incomplete,
            },
            "profile": {},
            "documents": {},
            "must_change_password": False,
            "profile_incomplete": profile_incomplete,
            "missing_fields": missing_fields,
        })

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT user_id, first_name, middle_initial, last_name, suffix, gender,
                   province, municipality, postal_code, barangay, street_address,
                   email, contact_number, username, user_role, must_change_password
            FROM users
            WHERE user_id = %s
        """, [user_id])
        user_row = cursor.fetchone()

    if not user_row:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    role = user_row[14]
    profile_data = {}
    docs_data = {}

    with connection.cursor() as cursor:
        if role == "miller_manager":
            cursor.execute("SELECT business_name, organization_name, province, municipality, postal_code, barangay, street_address, official_email, official_contact_number FROM supplier_profiles WHERE user_id = %s", [user_id])
            p_row = cursor.fetchone()
            if p_row:
                profile_data = {
                    "business_name": p_row[0], "organization_name": p_row[1],
                    "province": p_row[2], "municipality": p_row[3], "postal_code": p_row[4],
                    "barangay": p_row[5], "street_address": p_row[6],
                    "official_email": p_row[7], "official_contact_number": p_row[8]
                }
            cursor.execute("SELECT government_issued_id, business_permit, business_registration, milling_license FROM supplier_documents WHERE user_id = %s", [user_id])
            d_row = cursor.fetchone()
            if d_row:
                docs_data = {"government_issued_id": d_row[0], "business_permit": d_row[1], "business_registration": d_row[2], "milling_license": d_row[3]}

        elif role == "warehouse_manager":
            cursor.execute("SELECT business_name, organization_name, province, municipality, postal_code, barangay, street_address, official_email, official_contact_number FROM warehouse_profiles WHERE user_id = %s", [user_id])
            p_row = cursor.fetchone()
            if p_row:
                profile_data = {
                    "business_name": p_row[0], "organization_name": p_row[1],
                    "province": p_row[2], "municipality": p_row[3], "postal_code": p_row[4],
                    "barangay": p_row[5], "street_address": p_row[6],
                    "official_email": p_row[7], "official_contact_number": p_row[8]
                }
            cursor.execute("SELECT government_issued_id, business_permit, business_registration, warehouse_license FROM warehouse_documents WHERE user_id = %s", [user_id])
            d_row = cursor.fetchone()
            if d_row:
                docs_data = {"government_issued_id": d_row[0], "business_permit": d_row[1], "business_registration": d_row[2], "warehouse_license": d_row[3]}

        elif role == "retailer":
            cursor.execute("SELECT barangay_permit, valid_id FROM retailer_documents WHERE user_id = %s", [user_id])
            d_row = cursor.fetchone()
            if d_row:
                docs_data = {"barangay_permit": d_row[0], "valid_id": d_row[1]}

    profile_incomplete, missing_fields = check_profile_incomplete(user_id, role)

    return Response({
        "user": {
            "id": user_row[0], "first_name": user_row[1], "middle_initial": user_row[2],
            "last_name": user_row[3], "suffix": user_row[4], "gender": user_row[5],
            "province": user_row[6], "municipality": user_row[7], "postal_code": user_row[8],
            "barangay": user_row[9], "street_address": user_row[10],
            "email": user_row[11], "contact_number": user_row[12], "username": user_row[13],
            "role": role, "must_change_password": user_row[15],
            "profile_incomplete": profile_incomplete,
        },
        "profile": profile_data,
        "documents": docs_data,
        "must_change_password": user_row[15],
        "profile_incomplete": profile_incomplete,
        "missing_fields": missing_fields,
    })


@api_view(["POST"])
def complete_profile(request):
    """
    POST /api/auth/complete-profile/
    Saves missing personal, address, business, and document details.
    Supports is_partial=true for saving progress between multi-step wizard steps.
    """
    import os, secrets
    from django.conf import settings
    from django.db import connection, transaction

    auth = _get_auth_user(request)
    if not auth:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    
    user_id = auth[0]
    data = request.data
    is_partial = str(data.get("is_partial", "")).lower() in ("true", "1")

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id, user_role, email FROM users WHERE user_id = %s", [user_id])
        user_row = cursor.fetchone()

    if not user_row:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    role = user_row[1]
    user_email = user_row[2] or ""

    first_name = str(data.get("first_name") or "").strip()
    middle_initial = str(data.get("middle_initial") or "").strip()
    last_name = str(data.get("last_name") or "").strip()
    suffix = str(data.get("suffix") or "").strip()
    gender = str(data.get("gender") or "").strip()
    province = str(data.get("province") or "").strip()
    municipality = str(data.get("municipality") or "").strip()
    barangay = str(data.get("barangay") or "").strip()
    street_address = str(data.get("street_address") or "").strip()
    postal_code = str(data.get("postal_code") or "").strip()
    contact_number = str(data.get("contact_number") or "").strip()

    def save_uploaded_file(file_obj, subfolder):
        if not file_obj:
            return None
        ext = os.path.splitext(file_obj.name.lower())[1]
        unique_name = f"doc_{secrets.token_hex(12)}{ext}"
        rel_dir = os.path.join(subfolder, str(user_id))
        abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
        os.makedirs(abs_dir, exist_ok=True)
        abs_path = os.path.join(abs_dir, unique_name)
        with open(abs_path, "wb") as f:
            for chunk in file_obj.chunks():
                f.write(chunk)
        return os.path.join(rel_dir, unique_name).replace("\\", "/")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE users
                SET gender = COALESCE(NULLIF(%s, ''), gender),
                    province = COALESCE(NULLIF(%s, ''), province),
                    municipality = COALESCE(NULLIF(%s, ''), municipality),
                    barangay = COALESCE(NULLIF(%s, ''), barangay),
                    street_address = COALESCE(NULLIF(%s, ''), street_address),
                    postal_code = COALESCE(NULLIF(%s, ''), postal_code),
                    first_name = COALESCE(NULLIF(%s, ''), first_name),
                    middle_initial = NULLIF(%s, ''),
                    last_name = COALESCE(NULLIF(%s, ''), last_name),
                    suffix = NULLIF(%s, ''),
                    contact_number = COALESCE(NULLIF(%s, ''), contact_number),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, [
                gender, province, municipality, barangay, street_address, postal_code,
                first_name, middle_initial, last_name, suffix, contact_number,
                user_id
            ])

            if role == "miller_manager":
                b_name = str(data.get("business_name") or "").strip()
                org_name = str(data.get("organization_name") or "").strip()
                b_province = str(data.get("business_province") or province).strip()
                b_municipality = str(data.get("business_municipality") or municipality).strip()
                b_barangay = str(data.get("business_barangay") or barangay).strip()
                b_street = str(data.get("business_street_address") or street_address).strip()
                b_postal = str(data.get("business_postal_code") or postal_code).strip()
                b_email = str(data.get("official_email") or user_email).strip()
                b_contact = str(data.get("official_contact_number") or contact_number).strip()

                cursor.execute("""
                    UPDATE supplier_profiles
                    SET business_name = COALESCE(NULLIF(%s, ''), business_name),
                        organization_name = NULLIF(%s, ''),
                        province = COALESCE(NULLIF(%s, ''), province),
                        municipality = COALESCE(NULLIF(%s, ''), municipality),
                        barangay = COALESCE(NULLIF(%s, ''), barangay),
                        street_address = COALESCE(NULLIF(%s, ''), street_address),
                        postal_code = COALESCE(NULLIF(%s, ''), postal_code),
                        official_email = COALESCE(NULLIF(%s, ''), official_email),
                        official_contact_number = COALESCE(NULLIF(%s, ''), official_contact_number),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, [
                    b_name, org_name, b_province, b_municipality, b_barangay, b_street, b_postal,
                    b_email, b_contact, user_id
                ])

                if cursor.rowcount == 0:
                    cursor.execute("""
                        INSERT INTO supplier_profiles (
                            user_id, business_name, organization_name,
                            province, municipality, postal_code, barangay, street_address,
                            official_email, official_contact_number, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                    """, [
                        user_id, b_name or "Milling Facility", org_name or None,
                        b_province or None, b_municipality or None, b_postal or None,
                        b_barangay or None, b_street or None,
                        b_email or None, b_contact or None
                    ])

                gov_id = save_uploaded_file(request.FILES.get("government_issued_id"), "supplier_documents")
                biz_permit = save_uploaded_file(request.FILES.get("business_permit"), "supplier_documents")
                biz_reg = save_uploaded_file(request.FILES.get("business_registration"), "supplier_documents")
                mill_lic = save_uploaded_file(request.FILES.get("milling_license"), "supplier_documents")

                updates = []
                params = []
                if gov_id: updates.append("government_issued_id = %s"); params.append(gov_id)
                if biz_permit: updates.append("business_permit = %s"); params.append(biz_permit)
                if biz_reg: updates.append("business_registration = %s"); params.append(biz_reg)
                if mill_lic: updates.append("milling_license = %s"); params.append(mill_lic)

                if updates:
                    updates.append("updated_at = CURRENT_TIMESTAMP")
                    params.append(user_id)
                    cursor.execute(f"UPDATE supplier_documents SET {', '.join(updates)} WHERE user_id = %s", params)

            elif role == "warehouse_manager":
                b_name = str(data.get("business_name") or "").strip()
                org_name = str(data.get("organization_name") or "").strip()
                b_province = str(data.get("business_province") or province).strip()
                b_municipality = str(data.get("business_municipality") or municipality).strip()
                b_barangay = str(data.get("business_barangay") or barangay).strip()
                b_street = str(data.get("business_street_address") or street_address).strip()
                b_postal = str(data.get("business_postal_code") or postal_code).strip()
                b_email = str(data.get("official_email") or user_email).strip()
                b_contact = str(data.get("official_contact_number") or contact_number).strip()

                target_profile_id = data.get("warehouse_profile_id")
                if not target_profile_id:
                    cursor.execute(
                        "SELECT warehouse_profile_id FROM warehouse_profiles WHERE user_id = %s ORDER BY warehouse_profile_id ASC LIMIT 1",
                        [user_id]
                    )
                    first_profile = cursor.fetchone()
                    if first_profile:
                        target_profile_id = first_profile[0]

                if target_profile_id:
                    cursor.execute("""
                        UPDATE warehouse_profiles
                        SET business_name = COALESCE(NULLIF(%s, ''), business_name),
                            organization_name = NULLIF(%s, ''),
                            province = COALESCE(NULLIF(%s, ''), province),
                            municipality = COALESCE(NULLIF(%s, ''), municipality),
                            barangay = COALESCE(NULLIF(%s, ''), barangay),
                            street_address = COALESCE(NULLIF(%s, ''), street_address),
                            postal_code = COALESCE(NULLIF(%s, ''), postal_code),
                            official_email = COALESCE(NULLIF(%s, ''), official_email),
                            official_contact_number = COALESCE(NULLIF(%s, ''), official_contact_number),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE warehouse_profile_id = %s AND user_id = %s
                    """, [
                        b_name, org_name, b_province, b_municipality, b_barangay, b_street, b_postal,
                        b_email, b_contact, target_profile_id, user_id
                    ])
                else:
                    cursor.execute("""
                        INSERT INTO warehouse_profiles (
                            user_id, business_name, organization_name,
                            province, municipality, postal_code, barangay, street_address,
                            official_email, official_contact_number, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                        )
                    """, [
                        user_id, b_name or "Warehouse Facility", org_name or None,
                        b_province or None, b_municipality or None, b_postal or None,
                        b_barangay or None, b_street or None,
                        b_email or None, b_contact or None
                    ])

                gov_id = save_uploaded_file(request.FILES.get("government_issued_id"), "warehouse_documents")
                biz_permit = save_uploaded_file(request.FILES.get("business_permit"), "warehouse_documents")
                biz_reg = save_uploaded_file(request.FILES.get("business_registration"), "warehouse_documents")
                wh_lic = save_uploaded_file(request.FILES.get("warehouse_license"), "warehouse_documents")

                updates = []
                params = []
                if gov_id: updates.append("government_issued_id = %s"); params.append(gov_id)
                if biz_permit: updates.append("business_permit = %s"); params.append(biz_permit)
                if biz_reg: updates.append("business_registration = %s"); params.append(biz_reg)
                if wh_lic: updates.append("warehouse_license = %s"); params.append(wh_lic)

                if updates:
                    updates.append("updated_at = CURRENT_TIMESTAMP")
                    params.append(user_id)
                    cursor.execute(f"UPDATE warehouse_documents SET {', '.join(updates)} WHERE user_id = %s", params)

            elif role == "retailer":
                brgy_permit = save_uploaded_file(request.FILES.get("barangay_permit"), "retailer_documents")
                valid_id = save_uploaded_file(request.FILES.get("valid_id"), "retailer_documents")

                updates = []
                params = []
                if brgy_permit: updates.append("barangay_permit = %s"); params.append(brgy_permit)
                if valid_id: updates.append("valid_id = %s"); params.append(valid_id)

                if updates:
                    updates.append("updated_at = CURRENT_TIMESTAMP")
                    params.append(user_id)
                    cursor.execute(f"UPDATE retailer_documents SET {', '.join(updates)} WHERE user_id = %s", params)

    profile_incomplete, missing_fields = check_profile_incomplete(user_id, role)

    if not is_partial and profile_incomplete:
        return Response({
            "detail": f"Profile is incomplete. Missing required fields: {', '.join(missing_fields)}.",
            "missing_fields": missing_fields,
            "profile_incomplete": True,
            "is_partial": False,
        }, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "success": True,
        "message": "Profile completed successfully! You can now access your dashboard." if not profile_incomplete else "Progress saved.",
        "profile_incomplete": profile_incomplete,
        "is_partial": is_partial,
        "missing_fields": missing_fields if profile_incomplete else [],
    }, status=status.HTTP_200_OK)

# ============================================================
# AUTHENTICATED USER PROFILE (GET & PATCH/PUT)
# ============================================================

@api_view(["GET", "PATCH", "PUT"])
def user_profile(request):
    """
    GET /api/auth/profile/
    Returns the authenticated user's profile across all roles (admins, employees, main users).

    PATCH/PUT /api/auth/profile/
    Updates personal info (first_name, middle_initial, last_name, suffix, gender)
    and/or address info (province, municipality, postal_code, barangay, street_address).
    """
    from django.db import connection

    auth = _get_auth_user(request)
    if not auth:
        return Response({"detail": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = auth[0]
    payload = auth[1] if len(auth) > 1 and isinstance(auth[1], dict) else {}

    user_data, table, id_col = get_authenticated_user_profile(user_id, payload)
    if not user_data:
        return Response({"detail": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response({
            "success": True,
            "user": user_data
        }, status=status.HTTP_200_OK)

    # PATCH / PUT
    data = request.data
    field_mapping = {
        "first_name": ["first_name", "firstName"],
        "middle_initial": ["middle_initial", "middleInitial"],
        "last_name": ["last_name", "lastName"],
        "suffix": ["suffix"],
        "gender": ["gender"],
        "province": ["province"],
        "municipality": ["municipality"],
        "postal_code": ["postal_code", "postalCode"],
        "barangay": ["barangay"],
        "street_address": ["street_address", "streetAddress"],
    }

    updates = []
    params = []

    for col, keys in field_mapping.items():
        matched_key = next((k for k in keys if k in data), None)
        if matched_key is not None:
            raw_val = data.get(matched_key)
            cleaned_val = str(raw_val or "").strip()
            # Validation
            if col == "first_name" and not cleaned_val:
                return Response({"detail": "First name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            if col == "last_name" and not cleaned_val:
                return Response({"detail": "Last name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            if col == "middle_initial" and len(cleaned_val) > 10:
                cleaned_val = cleaned_val[:10]

            updates.append(f"{col} = %s")
            params.append(cleaned_val if cleaned_val else None)

    if not updates:
        return Response({
            "success": True,
            "message": "No profile fields to update.",
            "user": user_data
        }, status=status.HTTP_200_OK)

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(user_id)

    with connection.cursor() as cursor:
        cursor.execute(
            f"UPDATE {table} SET {', '.join(updates)} WHERE {id_col} = %s",
            params
        )

    # Re-fetch updated profile
    updated_user, _, _ = get_authenticated_user_profile(user_id, payload)

    return Response({
        "success": True,
        "message": "Profile updated successfully.",
        "user": updated_user or user_data
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
def user_change_password(request):
    """
    POST /api/auth/change-password/
    Allows an authenticated user (admin, employee, main user) to change their password.
    """
    from django.db import connection
    from django.contrib.auth.hashers import make_password
    from .utils import verify_password

    auth = _get_auth_user(request)
    if not auth:
        return Response({"detail": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)

    user_id = auth[0]
    payload = auth[1] if len(auth) > 1 and isinstance(auth[1], dict) else {}

    user_data, table, id_col = get_authenticated_user_profile(user_id, payload)
    if not user_data:
        return Response({"detail": "User account not found."}, status=status.HTTP_404_NOT_FOUND)

    data = request.data or {}
    current_password = str(data.get("current_password") or data.get("currentPassword") or "").strip()
    new_password = str(data.get("new_password") or data.get("newPassword") or "").strip()
    confirm_password = str(data.get("confirm_password") or data.get("confirmPassword") or "").strip()

    if not current_password:
        return Response({"detail": "Current password is required."}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"SELECT password_hash FROM {table} WHERE {id_col} = %s LIMIT 1", [user_id])
        row = cursor.fetchone()

    if not row or not row[0]:
        return Response({"detail": "Could not retrieve account security information."}, status=status.HTTP_400_BAD_REQUEST)

    stored_hash = row[0]
    if not verify_password(current_password, stored_hash):
        return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

    if not any(c.isupper() for c in new_password) or not any(c.islower() for c in new_password) or not any(c.isdigit() for c in new_password):
        return Response({"detail": "New password must contain at least one uppercase letter, one lowercase letter, and one number."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"detail": "New password and confirmation do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if current_password == new_password or verify_password(new_password, stored_hash):
        return Response({"detail": "New password cannot be the same as your current password."}, status=status.HTTP_400_BAD_REQUEST)

    new_hash = make_password(new_password)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE {table}
            SET password_hash = %s,
                must_change_password = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE {id_col} = %s
            """,
            [new_hash, user_id]
        )

    return Response({
        "success": True,
        "message": "Password updated successfully."
    }, status=status.HTTP_200_OK)
