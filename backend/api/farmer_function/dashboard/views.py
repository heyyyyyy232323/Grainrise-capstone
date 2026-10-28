"""
GrainRise Farmer Dashboard API Views.
Provides authenticated endpoints for dashboard metrics, climate snapshots, and AI insights.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..farmer_auth import farmer_required
from .services import get_complete_farmer_dashboard
from .selectors import get_farmer_farms

logger = logging.getLogger("grainrise.farmer.dashboard.views")


@api_view(["GET"])
@farmer_required
def farmer_dashboard(request):
    """
    Retrieve complete Farmer Dashboard data for the authenticated farmer.
    Optional query parameter: `farm_id` for farm-specific filtering.
    """
    farmer_user_id = request.grainrise_farmer_id
    farm_id = request.GET.get("farm_id")

    try:
        farm_profile_id = int(farm_id) if farm_id else None
    except (TypeError, ValueError):
        farm_profile_id = None

    try:
        dashboard_data = get_complete_farmer_dashboard(
            farmer_user_id=farmer_user_id,
            farm_profile_id=farm_profile_id,
            force_refresh=False,
        )
        return Response(
            {
                "success": True,
                "data": dashboard_data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to assemble Farmer Dashboard for farmer %s: %s", farmer_user_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load dashboard data. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@farmer_required
def refresh_farmer_insights(request):
    """
    Force-regenerate Copernicus CDS climate and AI insights for the selected farm.
    """
    farmer_user_id = request.grainrise_farmer_id
    farm_id = request.data.get("farm_id") or request.GET.get("farm_id")

    try:
        farm_profile_id = int(farm_id) if farm_id else None
    except (TypeError, ValueError):
        farm_profile_id = None

    try:
        dashboard_data = get_complete_farmer_dashboard(
            farmer_user_id=farmer_user_id,
            farm_profile_id=farm_profile_id,
            force_refresh=True,
        )
        return Response(
            {
                "success": True,
                "message": "Farmer insights successfully refreshed.",
                "data": dashboard_data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to refresh Farmer Dashboard insights for farmer %s: %s", farmer_user_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to refresh insights. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@farmer_required
def farmer_farms_list(request):
    """
    List all farms belonging to the authenticated farmer.
    """
    farmer_user_id = request.grainrise_farmer_id
    try:
        farms = get_farmer_farms(farmer_user_id)
        return Response(
            {
                "success": True,
                "data": farms,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list farmer farms: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve registered farms.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
