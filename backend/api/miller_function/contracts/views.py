import logging

from django.conf import settings
from django.db import DatabaseError, IntegrityError

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..miller_auth import miller_manager_required

from .selectors import (
    get_miller_application_details,
    get_miller_bidding_details,
    get_miller_business_address,
    get_miller_contract_details,
    get_miller_posting_details,
    list_miller_biddings,
    list_miller_contracts,
    list_miller_message_threads,
    list_miller_messages,
    list_miller_postings,
)

from .services import (
    approve_application,
    close_posting,
    create_posting,
    decline_application,
    edit_offer,
    edit_posting,
    mark_contract_completed,
    request_contract_void,
    send_miller_message,
    sign_contract,
    start_application_review,
    submit_offer,
    withdraw_offer,
)


logger = logging.getLogger(__name__)


# ============================================================
# RESPONSE HELPERS
# ============================================================

def _success(
    data=None,
    *,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }

    if message is not None:
        payload["message"] = message

    if data is not None:
        payload["data"] = data

    return Response(
        payload,
        status=http_status,
    )


def _not_found(message):
    return Response(
        {
            "success": False,
            "message": message,
        },
        status=status.HTTP_404_NOT_FOUND,
    )


def _handle_error(error):
    if isinstance(
        error,
        ValueError,
    ):
        return Response(
            {
                "success": False,
                "message": str(error),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(
        error,
        IntegrityError,
    ):
        logger.exception(
            "Miller Contracts integrity error: %s",
            error,
        )

        payload = {
            "success": False,
            "message": (
                "The requested action conflicts with the "
                "current Contracts data."
            ),
        }

        if settings.DEBUG:
            payload["debug"] = (
                f"{error.__class__.__name__}: {error}"
            )

        return Response(
            payload,
            status=status.HTTP_409_CONFLICT,
        )

    if isinstance(
        error,
        DatabaseError,
    ):
        logger.exception(
            "Miller Contracts database error: %s",
            error,
        )

        payload = {
            "success": False,
            "message": (
                "A database error occurred while processing "
                "the Contracts request."
            ),
        }

        if settings.DEBUG:
            payload["debug"] = (
                f"{error.__class__.__name__}: {error}"
            )

        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    logger.exception(
        "Unexpected Miller Contracts error: %s",
        error,
    )

    payload = {
        "success": False,
        "message": (
            "Something went wrong while processing "
            "the Contracts request."
        ),
    }

    if settings.DEBUG:
        payload["debug"] = (
            f"{error.__class__.__name__}: {error}"
        )

    return Response(
        payload,
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ============================================================
# AUTHENTICATED MILLER
# ============================================================

def _supplier_profile_id(request):
    supplier_id = getattr(
        request,
        "grainrise_supplier_profile_id",
        None,
    )

    if supplier_id is None:
        raise ValueError(
            "Authenticated Miller business profile was not resolved."
        )

    return supplier_id


def _miller_user_id(request):
    user_id = getattr(
        request,
        "grainrise_miller_id",
        None,
    )

    if user_id is None:
        raise ValueError(
            "Authenticated Miller account was not resolved."
        )

    return user_id


# ============================================================
# MILLER BUSINESS ADDRESS
# ============================================================

@api_view(["GET"])
@miller_manager_required
def business_address(request):
    try:
        result = get_miller_business_address(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
        )

        if not result:
            return _not_found(
                "Miller business address was not found."
            )

        return _success(
            result
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# BIDDING OFFERS
# ============================================================

@api_view(["GET"])
@miller_manager_required
def bidding_offers(request):
    try:
        rows = list_miller_biddings(
            supplier_profile_id=_supplier_profile_id(
                request
            ),

            search=request.query_params.get(
                "search",
                "",
            ),

            product_type=request.query_params.get(
                "product_type",
                "",
            ),

            rice_variety=request.query_params.get(
                "rice_variety",
                "",
            ),

            farmer_location=request.query_params.get(
                "farmer_location",
                "",
            ),

            bidding_status=request.query_params.get(
                "status",
                "",
            ),

            bidding_deadline=request.query_params.get(
                "bidding_deadline",
                "",
            ),

            sort_by=request.query_params.get(
                "sort_by",
                "newest",
            ),
        )

        return _success(rows)

    except Exception as exc:
        return _handle_error(exc)


@api_view(["GET"])
@miller_manager_required
def bidding_details(
    request,
    bidding_id,
):
    try:
        data = get_miller_bidding_details(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            bidding_id=bidding_id,
        )

        if not data:
            return _not_found(
                "Farmer bidding was not found or is unavailable."
            )

        return _success(data)

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def bidding_submit_offer(
    request,
    bidding_id,
):
    try:
        result = submit_offer(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            bidding_id=bidding_id,
            data=request.data,
        )

        return _success(
            result,
            message="Offer submitted successfully.",
            http_status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# MILLER'S EXISTING OFFER
# ============================================================

@api_view([
    "PATCH",
    "PUT",
])
@miller_manager_required
def offer_update(
    request,
    offer_id,
):
    try:
        result = edit_offer(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            offer_id=offer_id,
            data=request.data,
        )

        return _success(
            result,
            message="Offer updated successfully.",
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def offer_withdraw(
    request,
    offer_id,
):
    try:
        result = withdraw_offer(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            offer_id=offer_id,
        )

        return _success(
            result,
            message="Offer withdrawn successfully.",
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# POSTINGS
# ============================================================

@api_view([
    "GET",
    "POST",
])
@miller_manager_required
def postings(request):
    try:
        supplier_id = _supplier_profile_id(
            request
        )

        if request.method == "GET":
            rows = list_miller_postings(
                supplier_profile_id=supplier_id,

                search=request.query_params.get(
                    "search",
                    "",
                ),

                posting_status=request.query_params.get(
                    "status",
                    "",
                ),

                product_type=request.query_params.get(
                    "product_type",
                    "",
                ),

                rice_variety=request.query_params.get(
                    "rice_variety",
                    "",
                ),

                year=request.query_params.get(
                    "year",
                    "",
                ),

                month=request.query_params.get(
                    "month",
                    "",
                ),

                sort_by=request.query_params.get(
                    "sort_by",
                    "newest",
                ),
            )

            return _success(rows)

        result = create_posting(
            supplier_profile_id=supplier_id,
            data=request.data,
        )

        return _success(
            result,
            message="Procurement Posting created successfully.",
            http_status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view([
    "GET",
    "PATCH",
    "PUT",
])
@miller_manager_required
def posting_details(
    request,
    posting_id,
):
    try:
        supplier_id = _supplier_profile_id(
            request
        )

        if request.method == "GET":
            data = get_miller_posting_details(
                supplier_profile_id=supplier_id,
                posting_id=posting_id,

                search=request.query_params.get(
                    "search",
                    "",
                ),

                application_status=request.query_params.get(
                    "application_status",
                    "",
                ),

                farmer_location=request.query_params.get(
                    "farmer_location",
                    "",
                ),

                sort_by=request.query_params.get(
                    "sort_by",
                    "newest",
                ),
            )

            if not data:
                return _not_found(
                    "Posting was not found."
                )

            return _success(data)

        result = edit_posting(
            supplier_profile_id=supplier_id,
            posting_id=posting_id,
            data=request.data,
        )

        return _success(
            result,
            message="Posting updated successfully.",
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def posting_close(
    request,
    posting_id,
):
    try:
        result = close_posting(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            posting_id=posting_id,
        )

        return _success(
            result,
            message="Posting closed successfully.",
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# FARMER APPLICATIONS
# ============================================================

@api_view(["GET"])
@miller_manager_required
def application_details(
    request,
    application_id,
):
    try:
        result = get_miller_application_details(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            application_id=application_id,
        )

        if not result:
            return _not_found(
                "Farmer application was not found."
            )

        return _success(
            {
                "application": result,
            }
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def application_start_review(
    request,
    application_id,
):
    try:
        result = start_application_review(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            application_id=application_id,
        )

        return _success(
            result,
            message="Application is now under review.",
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def application_approve(
    request,
    application_id,
):
    try:
        result = approve_application(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            application_id=application_id,
            data=request.data,
        )

        return _success(
            {
                "contract": result,
            },
            message=(
                "Farmer application approved and "
                "contract created successfully."
            ),
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def application_decline(
    request,
    application_id,
):
    try:
        result = decline_application(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            application_id=application_id,
            data=request.data,
        )

        return _success(
            result,
            message="Farmer application declined.",
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# CURRENT CONTRACTS
# ============================================================

@api_view(["GET"])
@miller_manager_required
def current_contracts(request):
    try:
        rows = list_miller_contracts(
            supplier_profile_id=_supplier_profile_id(
                request
            ),

            search=request.query_params.get(
                "search",
                "",
            ),

            contract_status=request.query_params.get(
                "status",
                "",
            ),

            product_type=request.query_params.get(
                "product_type",
                "",
            ),

            rice_variety=request.query_params.get(
                "rice_variety",
                "",
            ),

            year=request.query_params.get(
                "year",
                "",
            ),

            month=request.query_params.get(
                "month",
                "",
            ),

            sort_by=request.query_params.get(
                "sort_by",
                "newest",
            ),
        )

        return _success(rows)

    except Exception as exc:
        return _handle_error(exc)


@api_view(["GET"])
@miller_manager_required
def current_contract_details(
    request,
    contract_id,
):
    try:
        result = get_miller_contract_details(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            contract_id=contract_id,
        )

        if not result:
            return _not_found(
                "Contract was not found."
            )

        return _success(
            {
                "contract": result,
            }
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def contract_sign(
    request,
    contract_id,
):
    try:
        result = sign_contract(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            contract_id=contract_id,
            miller_signature_path=request.data.get(
                "miller_signature_path"
            ),
        )

        return _success(
            result,
            message="Contract signed successfully.",
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def contract_complete(
    request,
    contract_id,
):
    try:
        result = mark_contract_completed(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            contract_id=contract_id,
        )

        return _success(
            result,
            message="Contract marked as completed.",
        )

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def contract_void_request(
    request,
    contract_id,
):
    try:
        result = request_contract_void(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            contract_id=contract_id,
            data=request.data,
        )

        return _success(
            result,
            message="Contract void request submitted.",
        )

    except Exception as exc:
        return _handle_error(exc)


# ============================================================
# MESSAGES
# ============================================================

@api_view(["GET"])
@miller_manager_required
def message_threads(request):
    try:
        rows = list_miller_message_threads(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            search=request.query_params.get(
                "search",
                "",
            ),
        )

        return _success(rows)

    except Exception as exc:
        return _handle_error(exc)


@api_view(["GET"])
@miller_manager_required
def message_conversation(request):
    try:
        farmer_user_id = request.query_params.get(
            "farmer_user_id"
        )

        reference_type = request.query_params.get(
            "reference_type"
        )

        reference_id = request.query_params.get(
            "reference_id"
        )

        if not farmer_user_id:
            raise ValueError(
                "Farmer is required."
            )

        if not reference_type:
            raise ValueError(
                "Message reference type is required."
            )

        if not reference_id:
            raise ValueError(
                "Message reference is required."
            )

        rows = list_miller_messages(
            supplier_profile_id=_supplier_profile_id(
                request
            ),
            farmer_user_id=farmer_user_id,
            reference_type=reference_type,
            reference_id=reference_id,
        )

        return _success(rows)

    except Exception as exc:
        return _handle_error(exc)


@api_view(["POST"])
@miller_manager_required
def send_message(request):
    try:
        result = send_miller_message(
            miller_user_id=_miller_user_id(
                request
            ),

            supplier_profile_id=_supplier_profile_id(
                request
            ),

            data=request.data,
        )

        if (
            isinstance(
                result,
                dict,
            )
            and result.get(
                "blocked"
            )
        ):
            return Response(
                result,
                status=status.HTTP_400_BAD_REQUEST,
            )

        return _success(
            result,
            message="Message sent successfully.",
            http_status=status.HTTP_201_CREATED,
        )

    except Exception as exc:
        return _handle_error(exc)