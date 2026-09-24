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
            },
        },
        status=status.HTTP_200_OK,
    )