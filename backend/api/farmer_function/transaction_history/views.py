from django.db import DatabaseError

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required

from .selectors import (
    get_farmer_contract_history_details,
    get_farmer_pos_transaction_summary,
    list_farmer_contract_history,
    list_farmer_pos_transactions,
)


# ============================================================
# GRAINRISE
# FARMER > TRANSACTION HISTORY
# VIEWS
# ============================================================
#
# SEGMENTATION:
#
# 1. POS Transactions
#
# 2. Contract History
#
#
# SECURITY:
#
# All endpoints are protected using:
#
#     @farmer_required
#
# Farmer ownership comes exclusively from:
#
#     request.grainrise_farmer_id
#
# NEVER from:
#
#     request.data["farmer_user_id"]
#
#     request.query_params["farmer_user_id"]
#
#
# Therefore:
#
# Farmer A can only retrieve Farmer A's:
#
# - POS transactions
# - POS summary
# - Contract History
# - Contract History details
#
# ============================================================


# ============================================================
# SUCCESS RESPONSE
# ============================================================

def _success(
    *,
    data=None,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }


    if message:
        payload[
            "message"
        ] = message


    if data is not None:
        payload[
            "data"
        ] = data


    return Response(
        payload,
        status=http_status,
    )


# ============================================================
# ERROR RESPONSE
# ============================================================

def _error(
    message,
    *,
    code="error",
    http_status=status.HTTP_400_BAD_REQUEST,
):
    return Response(
        {
            "success": False,
            "code": code,
            "message": message,
        },
        status=http_status,
    )


# ============================================================
# COMMON EXCEPTION HANDLER
# ============================================================

def _handle_exception(
    exc,
):
    """
    Converts known selector/database errors into safe API
    responses.

    Raw database errors must never be exposed to frontend.
    """

    # ========================================================
    # VALIDATION
    # ========================================================

    if isinstance(
        exc,
        ValueError,
    ):
        return _error(
            str(
                exc
            ),
            code="validation_error",
            http_status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )


    # ========================================================
    # DATABASE
    # ========================================================

    if isinstance(
        exc,
        DatabaseError,
    ):
        return _error(
            (
                "Transaction History is temporarily "
                "unavailable. Please try again."
            ),
            code="database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )


    # ========================================================
    # UNKNOWN
    # ========================================================

    return _error(
        (
            "An unexpected Transaction History error "
            "occurred. Please try again."
        ),
        code="internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# QUERY PARAMETER HELPER
# ============================================================

def _query(
    request,
    key,
    default="",
):
    """
    Safely retrieve one query parameter.
    """

    return request.query_params.get(
        key,
        default,
    )


# ============================================================
# POS TRANSACTIONS
# ============================================================
#
# GET
#
# /api/farmer/transaction-history/pos/
#
#
# TABLE COLUMNS:
#
# Transaction ID
# Date
# Buyer / Payee
# Type
# Product
# Qty
# Amount
# Payment
# Status
#
#
# OPTIONAL QUERY PARAMETERS:
#
# search
#
# payment_method:
#     cash
#     card
#
# transaction_status:
#     completed
#     voided
#
# year
#
# month
#
# sort_by:
#     newest
#     oldest
#
# page
#
# page_size
#
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def pos_transactions(
    request,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )


    try:

        result = (
            list_farmer_pos_transactions(
                farmer_user_id,

                search=_query(
                    request,
                    "search",
                ),

                payment_method=_query(
                    request,
                    "payment_method",
                ),

                transaction_status=_query(
                    request,
                    "transaction_status",
                ),

                year=_query(
                    request,
                    "year",
                    None,
                ),

                month=_query(
                    request,
                    "month",
                    None,
                ),

                sort_by=_query(
                    request,
                    "sort_by",
                    "newest",
                ),

                page=_query(
                    request,
                    "page",
                    1,
                ),

                page_size=_query(
                    request,
                    "page_size",
                    10,
                ),
            )
        )


        return _success(
            data=result,
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )


# ============================================================
# POS TRANSACTION SUMMARY
# ============================================================
#
# GET
#
# /api/farmer/transaction-history/pos/summary/
#
#
# CURRENT REAL KPI SOURCES:
#
# completed_transactions
#
# product_lines_sold
#
# total_quantity_sold_kg
#
# total_revenue
#
#
# IMPORTANT:
#
# We do NOT calculate:
#
# Total Expenses
# Net Income
#
# because GrainRise currently has no real Farmer expense
# recording source.
#
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def pos_transaction_summary(
    request,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )


    try:

        result = (
            get_farmer_pos_transaction_summary(
                farmer_user_id
            )
        )


        return _success(
            data=result,
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )


# ============================================================
# CONTRACT HISTORY
# ============================================================
#
# GET
#
# /api/farmer/transaction-history/contracts/
#
#
# TABLE COLUMNS:
#
# Contract ID
# Date
# Product
# Qty
# Price/kg
# Action
#
#
# ACTION:
#
# View Details
#
#
# ONLY HISTORICAL CONTRACTS:
#
# completed
# voided
#
#
# ACTIVE CONTRACTS REMAIN UNDER:
#
# Farmer
#   >
# Contracts
#   >
# Current Contracts
#
#
# OPTIONAL QUERY PARAMETERS:
#
# search
#
# year
#
# month
#
# sort_by:
#     newest
#     oldest
#
# page
#
# page_size
#
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def contract_history(
    request,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )


    try:

        result = (
            list_farmer_contract_history(
                farmer_user_id,

                search=_query(
                    request,
                    "search",
                ),

                year=_query(
                    request,
                    "year",
                    None,
                ),

                month=_query(
                    request,
                    "month",
                    None,
                ),

                sort_by=_query(
                    request,
                    "sort_by",
                    "newest",
                ),

                page=_query(
                    request,
                    "page",
                    1,
                ),

                page_size=_query(
                    request,
                    "page_size",
                    10,
                ),
            )
        )


        return _success(
            data=result,
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )


# ============================================================
# CONTRACT HISTORY DETAILS
# ============================================================
#
# GET
#
# /api/farmer/transaction-history/contracts/<contract_id>/
#
#
# PURPOSE:
#
# Contract History
#      ↓
# View Details
#      ↓
# Complete historical contract information
#
#
# SECURITY:
#
# Selector requires:
#
# contract_id
#
# AND
#
# c.farmer_user_id = authenticated Farmer
#
# AND
#
# contract status is historical.
#
#
# Therefore manually changing contract_id in URL cannot expose
# another Farmer's historical contract.
#
# ============================================================

@api_view([
    "GET",
])
@farmer_required
def contract_history_details(
    request,
    contract_id,
):
    farmer_user_id = (
        request.grainrise_farmer_id
    )


    try:

        result = (
            get_farmer_contract_history_details(
                farmer_user_id,
                contract_id,
            )
        )


        # ====================================================
        # NOT FOUND / NOT OWNED / NOT HISTORICAL
        # ====================================================
        #
        # Same response is used intentionally.
        #
        # We do not reveal whether:
        #
        # - contract does not exist
        # - belongs to another Farmer
        # - is still active
        #
        # ====================================================

        if result is None:

            return _error(
                "Contract history record was not found.",
                code="contract_not_found",
                http_status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )


        return _success(
            data=result,
        )


    except Exception as exc:

        return _handle_exception(
            exc
        )