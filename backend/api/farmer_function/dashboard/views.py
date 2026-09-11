"""
GrainRise Farmer Dashboard API views.

This module is intentionally thin:
- protect the endpoint with the existing Farmer JWT guard
- resolve Farmer ownership from request.grainrise_farmer_id
- call Dashboard selectors
- return one dashboard-ready response

No Farmer user_id is accepted from frontend input.
"""

import logging
from datetime import date, datetime
from decimal import Decimal

from django.db import DatabaseError

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required
from .selectors import get_farmer_dashboard_data


logger = logging.getLogger(__name__)


# ============================================================
# RESPONSE SERIALIZATION
# ============================================================


def _serialize(value):
    """Convert database-friendly values into JSON-safe values."""

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, dict):
        return {
            key: _serialize(item)
            for key, item in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            _serialize(item)
            for item in value
        ]

    return value


# ============================================================
# RESPONSE HELPERS
# ============================================================


def _success(data):
    return Response(
        {
            "success": True,
            "data": _serialize(data),
        },
        status=status.HTTP_200_OK,
    )


def _error(
    message,
    *,
    code,
    http_status,
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
# ERROR HANDLING
# ============================================================


def _handle_exception(exc):
    if isinstance(exc, ValueError):
        return _error(
            str(exc),
            code="dashboard_validation_error",
            http_status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, DatabaseError):
        logger.exception(
            "Farmer Dashboard database error."
        )

        return _error(
            (
                "Farmer Dashboard data is temporarily "
                "unavailable. Please try again."
            ),
            code="dashboard_database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )

    logger.exception(
        "Unexpected Farmer Dashboard API error."
    )

    return _error(
        (
            "Something went wrong while loading the "
            "Farmer Dashboard."
        ),
        code="dashboard_internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# FARMER DASHBOARD
# GET /api/farmer/dashboard/
# ============================================================


@api_view(["GET"])
@farmer_required
def farmer_dashboard(request):
    """
    Return the complete Dashboard payload for the authenticated Farmer.

    SECURITY:
        Farmer ownership comes only from the verified JWT through
        request.grainrise_farmer_id.

        No user_id query parameter or request body value is accepted.
    """

    try:
        farmer_user_id = (
            request.grainrise_farmer_id
        )

        dashboard_data = (
            get_farmer_dashboard_data(
                farmer_user_id
            )
        )

        return _success(
            dashboard_data
        )

    except Exception as exc:
        return _handle_exception(exc)
