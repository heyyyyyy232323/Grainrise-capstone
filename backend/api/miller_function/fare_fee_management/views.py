import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    list_manager_fare_policies,
    get_manager_fare_policy,
    get_manager_branches,
)
from .services import (
    create_fare_policy,
    update_fare_policy,
    FareFeeValidationError,
    BranchAccessDeniedError,
    FareFeeNotFoundError,
)

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@miller_manager_required
def list_create_fare_policies_view(request):
    """
    GET /api/miller/fare-fee/
    List all fare policies and owned branches for the authenticated Miller Manager.

    POST /api/miller/fare-fee/
    Create a new active fare policy and assign its effective branches atomically.
    """
    miller_user_id = request.grainrise_miller_id

    if request.method == "POST":
        try:
            policy = create_fare_policy(miller_user_id, request.data)
            return Response(
                {
                    "success": True,
                    "message": "Fare policy created successfully.",
                    "data": policy,
                },
                status=status.HTTP_201_CREATED,
            )
        except FareFeeValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BranchAccessDeniedError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as exc:
            logger.exception("Failed to create fare policy: %s", exc)
            return Response(
                {
                    "success": False,
                    "message": "An unexpected error occurred while creating the fare policy.",
                    "error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # GET request
    try:
        policies = list_manager_fare_policies(miller_user_id)
        branches = get_manager_branches(miller_user_id)
        return Response(
            {
                "success": True,
                "count": len(policies),
                "data": policies,
                "branches": branches,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list manager fare policies: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve fare fee policies.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT", "PATCH"])
@miller_manager_required
def detail_update_fare_policy_view(request, fare_fee_id):
    """
    GET /api/miller/fare-fee/<fare_fee_id>/
    Retrieve a specific fare policy owned by the Miller Manager.

    PUT / PATCH /api/miller/fare-fee/<fare_fee_id>/
    Update policy details, status (active/archived), archive reason, and branch assignments atomically.
    """
    miller_user_id = request.grainrise_miller_id

    if request.method in ("PUT", "PATCH"):
        try:
            updated_policy = update_fare_policy(miller_user_id, fare_fee_id, request.data)
            return Response(
                {
                    "success": True,
                    "message": "Fare policy updated successfully.",
                    "data": updated_policy,
                },
                status=status.HTTP_200_OK,
            )
        except FareFeeNotFoundError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except FareFeeValidationError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except BranchAccessDeniedError as e:
            return Response(
                {
                    "success": False,
                    "message": str(e),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        except Exception as exc:
            logger.exception("Failed to update fare policy: %s", exc)
            return Response(
                {
                    "success": False,
                    "message": "An unexpected error occurred while updating the fare policy.",
                    "error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # GET request
    try:
        policy = get_manager_fare_policy(miller_user_id, fare_fee_id)
        if not policy:
            return Response(
                {
                    "success": False,
                    "message": "Fare policy not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": policy,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to get fare policy detail: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve fare policy.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

