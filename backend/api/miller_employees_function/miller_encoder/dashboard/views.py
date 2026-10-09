import logging
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from api.miller_employees_function.employee_auth import miller_encoder_required
from .selectors import (
    get_encoder_dashboard_kpis,
    get_inventory_status_breakdown,
    get_inventory_overview_distribution,
    get_low_stock_distribution,
    get_recent_inventory_activity,
    get_pending_order_requests,
)
from .services import get_or_refresh_dashboard_cds_snapshot

logger = logging.getLogger("grainrise.encoder.dashboard.views")


@csrf_exempt
@miller_encoder_required
def dashboard_overview_view(request):
    """
    GET: Retrieve Miller Encoder Dashboard data strictly scoped to authenticated supplier_profile_id.
    Returns:
    - Top KPIs (Product Variants, Inventory Value, Low Stock, Out of Stock)
    - Inventory Status breakdown (In Stock, Low Stock, Out of Stock)
    - Inventory Overview by variant
    - Low Stock Distributions by variant
    - Recent Inventory Activity
    - Pending Order Requests
    - Weekly 3-Month CDS Climate & AI Shelf Health snapshot (read from DB unless >= 7 days old)
    """
    if request.method != "GET":
        return JsonResponse(
            {"success": False, "message": "Method not allowed. Use GET."},
            status=405,
        )

    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        # 1. KPIs
        kpis = get_encoder_dashboard_kpis(supplier_profile_id)

        # 2. Charts
        inv_status = get_inventory_status_breakdown(supplier_profile_id)
        inv_overview = get_inventory_overview_distribution(supplier_profile_id)
        low_stock_dist = get_low_stock_distribution(supplier_profile_id)

        # 3. Activities & Pending
        recent_activity = get_recent_inventory_activity(supplier_profile_id, limit=5)
        pending_orders = get_pending_order_requests(supplier_profile_id, limit=5)

        # 4. Weekly 3-Month CDS Climate & AI Shelf Health Snapshot
        # Enforces 7-day rule: reads DB only while valid; generates only when missing or expired
        weekly_snapshot = get_or_refresh_dashboard_cds_snapshot(supplier_profile_id)

        return JsonResponse(
            {
                "success": True,
                "data": {
                    "kpis": kpis,
                    "inventory_status": inv_status,
                    "inventory_overview": inv_overview,
                    "low_stock_distributions": low_stock_dist,
                    "recent_activity": recent_activity,
                    "pending_orders": pending_orders,
                    "weekly_cds_snapshot": weekly_snapshot,
                },
            },
            status=200,
        )

    except Exception as exc:
        logger.exception("Error loading Miller Encoder Dashboard: %s", exc)
        return JsonResponse(
            {"success": False, "message": "Failed to load dashboard data."},
            status=500,
        )

