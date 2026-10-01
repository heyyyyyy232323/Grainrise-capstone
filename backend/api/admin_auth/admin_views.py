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
# Uses the custom "admins" table.
#
# Allowed admin roles:
# - system_admin
# - account_admin
#
# Only status = active can log in.
#
# IMPORTANT:
# The generated JWT uses:
#
#     role = "admin"
#     auth_source = "django_admin"
#
# This matches the existing centralized require_admin()
# authentication contract used by the current GrainRise
# Account Admin APIs.
#
# The actual administrator record still comes from the
# custom "admins" table.
# ============================================================


# ============================================================
# GET ADMIN ACCOUNT
# ============================================================

def get_admin_account(identifier):
    """
    Find an administrator using email or username.
    """

    normalized_identifier = (
        str(identifier or "")
        .strip()
        .lower()
    )


    if not normalized_identifier:
        return None


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
        "id":
            row[0],

        "first_name":
            row[1],

        "middle_initial":
            row[2],

        "last_name":
            row[3],

        "suffix":
            row[4],

        "gender":
            row[5],

        "email":
            row[6],

        "contact_number":
            row[7],

        "username":
            row[8],

        "password_hash":
            row[9],

        "admin_role":
            row[10],

        "status":
            row[11],
    }


# ============================================================
# PASSWORD VERIFICATION
# ============================================================

def verify_admin_password(
    admin,
    password,
):
    """
    Supports Django-hashed passwords.

    Also automatically upgrades an existing plaintext
    admin password to a Django password hash.

    This preserves compatibility with existing records
    in the custom admins table.
    """

    stored_password = str(
        admin.get(
            "password_hash"
        )
        or ""
    )


    # ========================================================
    # ALREADY DJANGO-HASHED
    # ========================================================

    try:
        identify_hasher(
            stored_password
        )

        return check_password(
            password,
            stored_password,
        )

    except ValueError:
        pass


    # ========================================================
    # LEGACY PLAINTEXT PASSWORD
    # ========================================================

    if stored_password != password:
        return False


    new_password_hash = (
        make_password(
            password
        )
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE admins

            SET
                password_hash = %s,
                updated_at = CURRENT_TIMESTAMP

            WHERE
                admin_id = %s
            """,
            [
                new_password_hash,
                admin["id"],
            ],
        )


    admin[
        "password_hash"
    ] = new_password_hash


    return True


# ============================================================
# ADMIN LOGIN ENDPOINT
# ============================================================

@api_view(["POST"])
def admin_login(request):
    """
    Authenticate a GrainRise administrator using
    the custom admins table.

    Successful login returns:
        access_token
        token_type
        user

    The JWT is compatible with the existing
    require_admin() authorization helper.
    """

    # ========================================================
    # GET LOGIN IDENTIFIER
    # ========================================================

    identifier = (
        request.data.get(
            "email"
        )
        or request.data.get(
            "username"
        )
        or ""
    )


    identifier = str(
        identifier
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
            "username":
                identifier,

            "password":
                password,
        }
    )


    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


    identifier = (
        serializer
        .validated_data[
            "username"
        ]
        .strip()
    )


    password = (
        serializer
        .validated_data[
            "password"
        ]
    )


    # ========================================================
    # FIND ADMIN
    # ========================================================

    try:
        admin = (
            get_admin_account(
                identifier
            )
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    f"Database error: {exc}"
            },
            status=
                status.HTTP_500_INTERNAL_SERVER_ERROR,
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
            status=
                status.HTTP_401_UNAUTHORIZED,
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


    if (
        admin_status !=
        "active"
    ):
        return Response(
            {
                "detail":
                    (
                        "Your administrator account "
                        "is not active."
                    )
            },
            status=
                status.HTTP_403_FORBIDDEN,
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


    if (
        admin_role
        not in
        allowed_admin_roles
    ):
        return Response(
            {
                "detail":
                    (
                        "This account is not authorized "
                        "as an administrator."
                    )
            },
            status=
                status.HTTP_403_FORBIDDEN,
        )


    # ========================================================
    # VERIFY PASSWORD
    # ========================================================

    try:
        password_is_valid = (
            verify_admin_password(
                admin,
                password,
            )
        )

    except Exception as exc:
        return Response(
            {
                "detail":
                    (
                        "Unable to verify administrator "
                        f"credentials: {exc}"
                    )
            },
            status=
                status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    if not password_is_valid:
        return Response(
            {
                "detail":
                    "Incorrect email/username or password."
            },
            status=
                status.HTTP_401_UNAUTHORIZED,
        )


    # ========================================================
    # CREATE ADMIN TOKEN
    # ========================================================
    #
    # CRITICAL:
    #
    # Existing backend require_admin() expects:
    #
    #     role == "admin"
    #     auth_source == "django_admin"
    #
    # Previously this file generated:
    #
    #     auth_source == "grainrise_admin"
    #
    # which caused all protected Account Admin APIs
    # to reject a successfully logged-in administrator
    # with HTTP 401.
    #
    # We retain:
    #     admin_role
    #     account_type
    #
    # so no existing administrator information is lost.
    # ========================================================

    access_token = create_access_token(
        {
            "sub":
                str(
                    admin["id"]
                ),

            "role":
                "admin",

            "admin_role":
                admin_role,

            "account_type":
                "administrator",

            "auth_source":
                "django_admin",
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
                    admin[
                        "first_name"
                    ],

                "middle_initial":
                    admin[
                        "middle_initial"
                    ],

                "last_name":
                    admin[
                        "last_name"
                    ],

                "suffix":
                    admin[
                        "suffix"
                    ],

                "gender":
                    admin[
                        "gender"
                    ],

                "email":
                    admin[
                        "email"
                    ],

                "contact_number":
                    admin[
                        "contact_number"
                    ],

                "username":
                    admin[
                        "username"
                    ],

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
        status=
            status.HTTP_200_OK,
    )