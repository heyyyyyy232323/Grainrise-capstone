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
                "SELECT user_id, password_hash, user_role::text, must_change_password, province, gender, first_name, last_name, email FROM users WHERE user_id = %s",
                [user_id]
            )
        elif identifier:
            cursor.execute(
                "SELECT user_id, password_hash, user_role::text, must_change_password, province, gender, first_name, last_name, email FROM users WHERE LOWER(email) = %s OR LOWER(COALESCE(username, '')) = %s",
                [identifier, identifier]
            )
        else:
            return Response({"detail": "Authentication credentials required."}, status=status.HTTP_401_UNAUTHORIZED)
        
        row = cursor.fetchone()

    if not row:
        return Response({"detail": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    uid, stored_hash, role, must_change_pw, province, gender, fname, lname, uemail = row

    if not verify_password(current_password, stored_hash):
        return Response({"detail": "Current temporary password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

    if not new_password or len(new_password) < 8:
        return Response({"detail": "New password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

    if not any(c.isupper() for c in new_password) or not any(c.islower() for c in new_password) or not any(c.isdigit() for c in new_password):
        return Response({"detail": "New password must contain at least one uppercase letter, one lowercase letter, and one number."}, status=status.HTTP_400_BAD_REQUEST)

    if new_password != confirm_password:
        return Response({"detail": "New password and confirmation do not match."}, status=status.HTTP_400_BAD_REQUEST)

    if current_password == new_password:
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

    profile_incomplete = (not province or not str(province).strip() or not gender or not str(gender).strip())

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
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT user_id, first_name, middle_initial, last_name, suffix, gender,
                   province, municipality, postal_code, barangay, street_address,
                   email, contact_number, username, user_role::text, must_change_password
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

    province = user_row[6]
    gender = user_row[5]
    profile_incomplete = (not province or not str(province).strip() or not gender or not str(gender).strip())

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
        "profile_incomplete": profile_incomplete,
    })


@api_view(["POST"])
def complete_profile(request):
    """
    POST /api/auth/complete-profile/
    Saves missing personal, address, business, and document details.
    """
    import os, secrets
    from django.conf import settings
    from django.db import connection, transaction

    auth = _get_auth_user(request)
    if not auth:
        return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)
    
    user_id = auth[0]
    data = request.data

    with connection.cursor() as cursor:
        cursor.execute("SELECT user_id, user_role::text FROM users WHERE user_id = %s", [user_id])
        user_row = cursor.fetchone()

    if not user_row:
        return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

    role = user_row[1]

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

    if not gender:
        return Response({"detail": "Gender is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not province or not municipality or not barangay or not street_address:
        return Response({"detail": "Complete address (Province, Municipality, Barangay, Street Address) is required."}, status=status.HTTP_400_BAD_REQUEST)

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
                SET gender = %s,
                    province = %s,
                    municipality = %s,
                    barangay = %s,
                    street_address = %s,
                    postal_code = %s,
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
                b_email = str(data.get("official_email") or "").strip()
                b_contact = str(data.get("official_contact_number") or contact_number).strip()

                cursor.execute("""
                    UPDATE supplier_profiles
                    SET business_name = COALESCE(NULLIF(%s, ''), business_name),
                        organization_name = NULLIF(%s, ''),
                        province = %s,
                        municipality = %s,
                        barangay = %s,
                        street_address = %s,
                        postal_code = %s,
                        official_email = COALESCE(NULLIF(%s, ''), official_email),
                        official_contact_number = COALESCE(NULLIF(%s, ''), official_contact_number),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, [
                    b_name, org_name, b_province, b_municipality, b_barangay, b_street, b_postal,
                    b_email, b_contact, user_id
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
                b_email = str(data.get("official_email") or "").strip()
                b_contact = str(data.get("official_contact_number") or contact_number).strip()

                cursor.execute("""
                    UPDATE warehouse_profiles
                    SET business_name = COALESCE(NULLIF(%s, ''), business_name),
                        organization_name = NULLIF(%s, ''),
                        province = %s,
                        municipality = %s,
                        barangay = %s,
                        street_address = %s,
                        postal_code = %s,
                        official_email = COALESCE(NULLIF(%s, ''), official_email),
                        official_contact_number = COALESCE(NULLIF(%s, ''), official_contact_number),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s
                """, [
                    b_name, org_name, b_province, b_municipality, b_barangay, b_street, b_postal,
                    b_email, b_contact, user_id
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

    return Response({
        "success": True,
        "message": "Profile completed successfully! You can now access your dashboard.",
        "profile_incomplete": False,
    }, status=status.HTTP_200_OK)
