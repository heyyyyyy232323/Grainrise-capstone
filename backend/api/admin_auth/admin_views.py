from django.contrib.auth.hashers import (
    check_password,
    identify_hasher,
    make_password,
)
from django.db import connection

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..serializers import AdminLoginSerializer
from ..utils import create_access_token


# ============================================================
# GRAINRISE ADMIN LOGIN
# ============================================================
# Uses the custom PostgreSQL "admins" table.
#
# Allowed admin roles:
# - system_admin
# - account_admin
#
# Only status = active can log in.
# ============================================================


def get_admin_account(identifier):
    """
    Find an administrator using email or username.
    """

    normalized_identifier = (
        identifier
        .strip()
        .lower()
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                admin_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                gender,
                email,
                contact_number,
                username,
                password_hash,
                admin_role,
                status
            FROM admins
            WHERE
                LOWER(email) = %s
                OR LOWER(username) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
                normalized_identifier,
            ],
        )

        row = cursor.fetchone()


    if not row:
        return None


    return {
        "id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "gender": row[5],
        "email": row[6],
        "contact_number": row[7],
        "username": row[8],
        "password_hash": row[9],
        "admin_role": row[10],
        "status": row[11],
    }


# ============================================================
# PASSWORD VERIFICATION
# ============================================================

def verify_admin_password(admin, password):
    """
    Supports Django-hashed passwords.

    Also automatically upgrades an existing plaintext password
    to a Django hash. This is included because existing admin
    records may already contain plaintext values.
    """

    stored_password = (
        admin.get("password_hash")
        or ""
    )


    # ========================================================
    # CHECK IF PASSWORD IS ALREADY DJANGO-HASHED
    # ========================================================

    try:
        identify_hasher(stored_password)

        return check_password(
            password,
            stored_password,
        )

    except ValueError:
        pass


    # ========================================================
    # LEGACY PLAINTEXT PASSWORD
    # ========================================================
    # If it matches, immediately replace it with a secure hash.
    # ========================================================

    if stored_password != password:
        return False


    new_password_hash = make_password(
        password
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE admins
            SET
                password_hash = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE admin_id = %s
            """,
            [
                new_password_hash,
                admin["id"],
            ],
        )


    admin["password_hash"] = (
        new_password_hash
    )


    return True


# ============================================================
# ADMIN LOGIN ENDPOINT
# ============================================================

@api_view(["POST"])
def admin_login(request):

    # ========================================================
    # GET LOGIN IDENTIFIER
    # ========================================================

    identifier = (
        request.data.get("email")
        or request.data.get("username")
        or ""
    ).strip()


    password = request.data.get(
        "password",
        "",
    )


    # ========================================================
    # VALIDATE REQUEST
    # ========================================================

    serializer = AdminLoginSerializer(
        data={
            "username": identifier,
            "password": password,
        }
    )


    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


    identifier = (
        serializer
        .validated_data["username"]
        .strip()
    )


    password = (
        serializer
        .validated_data["password"]
    )


    # ========================================================
    # FIND ADMIN
    # ========================================================

    try:

        admin = get_admin_account(
            identifier
        )

    except Exception as exc:

        return Response(
            {
                "detail":
                    f"Database error: {exc}"
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    # ========================================================
    # ACCOUNT NOT FOUND
    # ========================================================

    if not admin:
        return Response(
            {
                "detail":
                    "Incorrect email/username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


    # ========================================================
    # ONLY ACTIVE ADMINS CAN LOGIN
    # ========================================================

    admin_status = str(
        admin.get(
            "status",
            "",
        )
    ).strip().lower()


    if admin_status != "active":
        return Response(
            {
                "detail":
                    (
                        "Your administrator account "
                        "is not active."
                    )
            },
            status=status.HTTP_403_FORBIDDEN,
        )


    # ========================================================
    # VERIFY ADMIN ROLE
    # ========================================================

    admin_role = str(
        admin.get(
            "admin_role",
            "",
        )
    ).strip().lower()


    allowed_admin_roles = {
        "system_admin",
        "account_admin",
    }


    if admin_role not in allowed_admin_roles:
        return Response(
            {
                "detail":
                    "This account is not authorized as an administrator."
            },
            status=status.HTTP_403_FORBIDDEN,
        )


    # ========================================================
    # VERIFY PASSWORD
    # ========================================================

    if not verify_admin_password(
        admin,
        password,
    ):
        return Response(
            {
                "detail":
                    "Incorrect email/username or password."
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )


    # ========================================================
    # CREATE ADMIN TOKEN
    # ========================================================

    access_token = create_access_token(
        {
            "sub":
                str(admin["id"]),

            "role":
                "admin",

            "admin_role":
                admin_role,

            "account_type":
                "administrator",

            "auth_source":
                "grainrise_admin",
        }
    )


    # ========================================================
    # SUCCESS RESPONSE
    # ========================================================

    return Response(
        {
            "access_token":
                access_token,

            "token_type":
                "bearer",

            "user": {

                "id":
                    admin["id"],

                "first_name":
                    admin["first_name"],

                "last_name":
                    admin["last_name"],

                "email":
                    admin["email"],

                "username":
                    admin["username"],

                "role":
                    "admin",

                "admin_role":
                    admin_role,

                "account_type":
                    "administrator",

                "status":
                    admin_status,
            },
        },
        status=status.HTTP_200_OK,
    )