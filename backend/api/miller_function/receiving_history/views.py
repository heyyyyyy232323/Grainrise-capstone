import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from api.miller_employees_function.miller_procurement.receiving_history.selectors import (
    get_receiving_history,
    get_receiving_history_detail,
    get_distinct_history_suppliers,
)

logger = logging.getLogger(__name__)


# ============================================================
# RECEIVING HISTORY LIST VIEW (MANAGER)
# ============================================================

@api_view(["GET"])
@miller_manager_required
def manager_receiving_history_list_view(request):
    """
    GET /api/miller/receiving-history/
    List historical receiving records scoped to the Miller Manager's business.
    Supports search, date range, supplier, status, and sort_by filters.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        search = request.query_params.get("search")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        supplier_id = request.query_params.get("supplier_id")
        status_filter = request.query_params.get("status")
        sort_by = request.query_params.get("sort_by")

        records = get_receiving_history(
            supplier_profile_id=supplier_profile_id,
            search=search,
            start_date=start_date,
            end_date=end_date,
            supplier_id=supplier_id,
            status_filter=status_filter,
            sort_by=sort_by,
        )

        return Response(
            {
                "success": True,
                "data": records,
                "count": len(records),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing manager receiving history: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving receiving history.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RECEIVING HISTORY DETAIL VIEW (MANAGER)
# ============================================================

@api_view(["GET"])
@miller_manager_required
def manager_receiving_history_detail_view(request, receiving_id):
    """
    GET /api/miller/receiving-history/<receiving_id>/
    Retrieve comprehensive details for a specific historical receiving record.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        detail = get_receiving_history_detail(
            supplier_profile_id=supplier_profile_id,
            receiving_id=receiving_id,
        )

        if not detail:
            return Response(
                {
                    "success": False,
                    "message": f"Receiving record #{receiving_id} was not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": detail,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error retrieving manager receiving history #%s detail: %s", receiving_id, exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving receiving details.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RECEIVING HISTORY SUPPLIERS VIEW (MANAGER)
# ============================================================

@api_view(["GET"])
@miller_manager_required
def manager_receiving_history_suppliers_view(request):
    """
    GET /api/miller/receiving-history/suppliers/
    Fetch distinct active suppliers that have historical receiving records.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        suppliers = get_distinct_history_suppliers(supplier_profile_id=supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": suppliers,
                "count": len(suppliers),
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing manager receiving history suppliers: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving suppliers.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

