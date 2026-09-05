from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.farmer_function.farmer_auth import (
    farmer_required,
)

from .selectors import (
    list_farmer_applications,
    get_farmer_application_details,

    list_farmer_biddings,
    get_farmer_bidding_details,
    get_farmer_offer_details,

    list_farmer_opportunities,
    get_farmer_opportunity_details,

    list_farmer_contracts,
    get_farmer_contract_details,

    list_farmer_message_threads,
    list_farmer_messages,
)

from .services import (
    submit_application,
    cancel_application,

    create_open_bidding,
    accept_bidding_offer,
    decline_bidding_offer,

    request_contract_void,

    send_farmer_message,
)


# ============================================================
# GRAINRISE
# FARMER > CONTRACTS
# VIEWS
# ============================================================
#
# Farmer identity always comes from farmer_required.
#
# Never accept farmer_user_id from frontend request.data.
#
# ============================================================


# ============================================================
# AUTHENTICATED FARMER ID
# ============================================================

def _get_farmer_user_id(request):
    """
    Resolve authenticated Farmer ID from farmer_required.

    Supported guard values:

        request.farmer_id

    or:

        request.grainrise_farmer

    Farmer ID is NEVER read from request.data.
    """

    farmer_id = getattr(
        request,
        "farmer_id",
        None,
    )

    if farmer_id:
        return int(
            farmer_id
        )


    farmer = getattr(
        request,
        "grainrise_farmer",
        None,
    )


    if isinstance(
        farmer,
        dict,
    ):
        candidate = (
            farmer.get("user_id")
            or farmer.get("farmer_id")
            or farmer.get("id")
        )

        if candidate:
            return int(
                candidate
            )


    candidate = getattr(
        farmer,
        "user_id",
        None,
    )

    if candidate:
        return int(
            candidate
        )


    candidate = getattr(
        farmer,
        "farmer_id",
        None,
    )

    if candidate:
        return int(
            candidate
        )


    candidate = getattr(
        farmer,
        "id",
        None,
    )

    if candidate:
        return int(
            candidate
        )


    raise ValueError(
        "Authenticated Farmer account is unavailable."
    )


# ============================================================
# COMMON ERROR RESPONSE
# ============================================================

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


    return Response(
        {
            "success": False,
            "message": (
                "Something went wrong while "
                "processing the request."
            ),
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ============================================================
# APPLICATIONS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def applications(request):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        items = (
            list_farmer_applications(
                farmer_user_id=(
                    farmer_user_id
                ),

                search=(
                    request.query_params.get(
                        "search"
                    )
                    or ""
                ),

                application_status=(
                    request.query_params.get(
                        "status"
                    )
                    or ""
                ),

                year=(
                    request.query_params.get(
                        "year"
                    )
                    or ""
                ),

                month=(
                    request.query_params.get(
                        "month"
                    )
                    or ""
                ),

                sort_by=(
                    request.query_params.get(
                        "sort_by"
                    )
                    or "newest"
                ),
            )
        )


        return Response(
            {
                "items": items,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# APPLICATION DETAILS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def application_details(
    request,
    application_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        item = (
            get_farmer_application_details(
                farmer_user_id=(
                    farmer_user_id
                ),

                application_id=(
                    application_id
                ),
            )
        )


        if not item:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Application was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            item,
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# CANCEL APPLICATION
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def application_cancel(
    request,
    application_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        result = (
            cancel_application(
                farmer_user_id=(
                    farmer_user_id
                ),

                application_id=(
                    application_id
                ),

                data=(
                    request.data
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Application cancelled "
                    "successfully."
                ),

                "application": result,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# FARMER OPEN BIDDINGS / OFFERS
# ============================================================

@api_view([
    "GET",
    "POST",
])
@farmer_required
def biddings(request):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        # ====================================================
        # GET
        # ====================================================

        if request.method == "GET":

            items = (
                list_farmer_biddings(
                    farmer_user_id=(
                        farmer_user_id
                    ),

                    search=(
                        request.query_params.get(
                            "search"
                        )
                        or ""
                    ),

                    bidding_status=(
                        request.query_params.get(
                            "status"
                        )
                        or ""
                    ),

                    year=(
                        request.query_params.get(
                            "year"
                        )
                        or ""
                    ),

                    month=(
                        request.query_params.get(
                            "month"
                        )
                        or ""
                    ),

                    sort_by=(
                        request.query_params.get(
                            "sort_by"
                        )
                        or "newest"
                    ),
                )
            )


            return Response(
                {
                    "items": items,
                },
                status=status.HTTP_200_OK,
            )


        # ====================================================
        # POST
        # CREATE OPEN BIDDING
        # ====================================================

        result = (
            create_open_bidding(
                farmer_user_id=(
                    farmer_user_id
                ),

                data=(
                    request.data
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Open bidding created "
                    "successfully."
                ),

                "bidding": result,
            },
            status=status.HTTP_201_CREATED,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# BIDDING DETAILS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def bidding_details(
    request,
    bidding_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        item = (
            get_farmer_bidding_details(
                farmer_user_id=(
                    farmer_user_id
                ),

                bidding_id=(
                    bidding_id
                ),
            )
        )


        if not item:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Bidding was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            item,
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# OFFER DETAILS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def offer_details(
    request,
    offer_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        item = (
            get_farmer_offer_details(
                farmer_user_id=(
                    farmer_user_id
                ),

                offer_id=(
                    offer_id
                ),
            )
        )


        if not item:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Offer was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            item,
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# ACCEPT OFFER
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def offer_accept(
    request,
    offer_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        farmer_signature_path = (
            request.data.get(
                "farmer_signature_path"
            )
        )


        result = (
            accept_bidding_offer(
                farmer_user_id=(
                    farmer_user_id
                ),

                offer_id=(
                    offer_id
                ),

                farmer_signature_path=(
                    farmer_signature_path
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Offer accepted successfully. "
                    "Current Contract has been created."
                ),

                "contract": result,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# DECLINE OFFER
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def offer_decline(
    request,
    offer_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        result = (
            decline_bidding_offer(
                farmer_user_id=(
                    farmer_user_id
                ),

                offer_id=(
                    offer_id
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Offer declined successfully."
                ),

                "offer": result,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# OPPORTUNITIES
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def opportunities(request):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        items = (
            list_farmer_opportunities(
                farmer_user_id=(
                    farmer_user_id
                ),

                search=(
                    request.query_params.get(
                        "search"
                    )
                    or ""
                ),

                product_type=(
                    request.query_params.get(
                        "product_type"
                    )
                    or ""
                ),

                rice_variety=(
                    request.query_params.get(
                        "rice_variety"
                    )
                    or ""
                ),

                location=(
                    request.query_params.get(
                        "location"
                    )
                    or ""
                ),

                sort_by=(
                    request.query_params.get(
                        "sort_by"
                    )
                    or "newest"
                ),
            )
        )


        return Response(
            {
                "items": items,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# OPPORTUNITY DETAILS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def opportunity_details(
    request,
    posting_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        item = (
            get_farmer_opportunity_details(
                farmer_user_id=(
                    farmer_user_id
                ),

                posting_id=(
                    posting_id
                ),
            )
        )


        if not item:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Opportunity was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            item,
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# APPLY TO OPPORTUNITY
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def opportunity_apply(
    request,
    posting_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        result = (
            submit_application(
                farmer_user_id=(
                    farmer_user_id
                ),

                posting_id=(
                    posting_id
                ),

                data=(
                    request.data
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Application submitted "
                    "successfully."
                ),

                "application": result,
            },
            status=status.HTTP_201_CREATED,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# CURRENT CONTRACTS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def current_contracts(request):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        items = (
            list_farmer_contracts(
                farmer_user_id
            )
        )


        return Response(
            {
                "items": items,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# CURRENT CONTRACT DETAILS
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def current_contract_details(
    request,
    contract_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        item = (
            get_farmer_contract_details(
                farmer_user_id=(
                    farmer_user_id
                ),

                contract_id=(
                    contract_id
                ),
            )
        )


        if not item:
            return Response(
                {
                    "success": False,
                    "message": (
                        "Contract was not found."
                    ),
                },
                status=status.HTTP_404_NOT_FOUND,
            )


        return Response(
            item,
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# REQUEST CONTRACT VOID
# ============================================================

@api_view([
    "POST",
])
@farmer_required
def contract_void_request(
    request,
    contract_id,
):
    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        result = (
            request_contract_void(
                farmer_user_id=(
                    farmer_user_id
                ),

                contract_id=(
                    contract_id
                ),

                data=(
                    request.data
                ),
            )
        )


        return Response(
            {
                "success": True,

                "message": (
                    "Void request submitted "
                    "successfully."
                ),

                "contract": result,
            },
            status=status.HTTP_200_OK,
        )


    except Exception as error:
        return _handle_error(
            error
        )


# ============================================================
# FARMER MESSAGES
# ============================================================

@api_view([
    "GET",
    "POST",
])
@farmer_required
def send_message(request):
    """
    SAME ENDPOINT:

        GET /farmer/contracts/messages/

            Without conversation query:
                -> list message threads

            With:
                supplier_profile_id
                reference_type
                reference_id

                -> load full conversation


        POST /farmer/contracts/messages/

            -> send Farmer message
            -> global profanity moderation
    """

    try:
        farmer_user_id = (
            _get_farmer_user_id(
                request
            )
        )


        # ====================================================
        # GET
        # ====================================================

        if request.method == "GET":

            supplier_profile_id = (
                request.query_params.get(
                    "supplier_profile_id"
                )
            )


            reference_type = (
                request.query_params.get(
                    "reference_type"
                )
            )


            reference_id = (
                request.query_params.get(
                    "reference_id"
                )
            )


            supplied_conversation_values = [
                supplier_profile_id,
                reference_type,
                reference_id,
            ]


            has_any_conversation_value = any(
                value not in (
                    None,
                    "",
                )

                for value
                in supplied_conversation_values
            )


            has_all_conversation_values = all(
                value not in (
                    None,
                    "",
                )

                for value
                in supplied_conversation_values
            )


            # =================================================
            # INVALID PARTIAL CONVERSATION QUERY
            # =================================================

            if (
                has_any_conversation_value
                and
                not has_all_conversation_values
            ):
                raise ValueError(
                    (
                        "supplier_profile_id, "
                        "reference_type, and "
                        "reference_id are all required "
                        "when loading a conversation."
                    )
                )


            # =================================================
            # FULL CONVERSATION
            # =================================================

            if has_all_conversation_values:

                items = (
                    list_farmer_messages(
                        farmer_user_id=(
                            farmer_user_id
                        ),

                        supplier_profile_id=(
                            supplier_profile_id
                        ),

                        reference_type=(
                            reference_type
                        ),

                        reference_id=(
                            reference_id
                        ),
                    )
                )


                return Response(
                    {
                        "type":
                            "conversation",

                        "items":
                            items,
                    },
                    status=(
                        status.HTTP_200_OK
                    ),
                )


            # =================================================
            # MESSAGE THREADS
            # =================================================

            items = (
                list_farmer_message_threads(
                    farmer_user_id=(
                        farmer_user_id
                    )
                )
            )


            return Response(
                {
                    "type":
                        "threads",

                    "items":
                        items,
                },
                status=(
                    status.HTTP_200_OK
                ),
            )


        # ====================================================
        # POST
        # SEND FARMER MESSAGE
        # ====================================================

        result = (
            send_farmer_message(
                farmer_user_id=(
                    farmer_user_id
                ),

                data=(
                    request.data
                ),
            )
        )


        # ====================================================
        # PROFANITY BLOCK
        # ====================================================

        if (
            result.get(
                "blocked"
            )
            or
            result.get(
                "code"
            )
            ==
            "PROFANITY_DETECTED"
        ):
            return Response(
                {
                    "success":
                        False,

                    "blocked":
                        True,

                    "code":
                        "PROFANITY_DETECTED",

                    "message":
                        (
                            result.get(
                                "message"
                            )
                            or
                            (
                                "Your message contains "
                                "language that is not "
                                "allowed under GrainRise "
                                "communication guidelines."
                            )
                        ),
                },
                status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )


        # ====================================================
        # MESSAGE SENT
        # ====================================================

        return Response(
            {
                "success":
                    True,

                "blocked":
                    False,

                "code":
                    "MESSAGE_SENT",

                "message":
                    "Message sent successfully.",

                "data":
                    result.get(
                        "message"
                    ),
            },
            status=(
                status.HTTP_201_CREATED
            ),
        )


    except Exception as error:
        return _handle_error(
            error
        )