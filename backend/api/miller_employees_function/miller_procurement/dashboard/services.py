import logging
from api.miller_employees_function.miller_encoder.dashboard.services import (
    get_or_refresh_dashboard_cds_snapshot,
)
from .selectors import (
    get_procurement_dashboard_kpis,
    get_receiving_orders_preview,
    get_pending_payables_preview,
    get_supplier_performance_summary,
    get_returns_summary,
    get_recent_procurement_activity,
)

logger = logging.getLogger(__name__)


def get_procurement_dashboard_data(supplier_profile_id):
    """
    Compile complete dashboard data strictly scoped to authenticated supplier_profile_id:
    - KPIs
    - Receiving Orders Preview (Ordered / Partially Received only)
    - Pending Payables Preview
    - Supplier Performance summary
    - Returns summary
    - Recent Procurement Activity
    - Copernicus CDS 3-month Climate & AI Shelf Health Weekly Snapshot (reused from inventory_dashboard_quick_cds_snap)
    """
    kpis = get_procurement_dashboard_kpis(supplier_profile_id)
    receiving_preview = get_receiving_orders_preview(supplier_profile_id)
    payables_preview = get_pending_payables_preview(supplier_profile_id)
    supplier_perf = get_supplier_performance_summary(supplier_profile_id)
    returns_summary = get_returns_summary(supplier_profile_id)
    recent_activity = get_recent_procurement_activity(supplier_profile_id)

    # Reuses the exact same weekly snapshot service and table (inventory_dashboard_quick_cds_snap)
    weekly_cds_snapshot = None
    try:
        weekly_cds_snapshot = get_or_refresh_dashboard_cds_snapshot(supplier_profile_id)
    except Exception as exc:
        logger.warning(
            "Failed to load or refresh weekly CDS snapshot for procurement branch %s: %s",
            supplier_profile_id,
            exc,
        )

    return {
        "kpis": kpis,
        "receiving_orders_preview": receiving_preview,
        "pending_payables_preview": payables_preview,
        "supplier_performance": supplier_perf,
        "returns_summary": returns_summary,
        "recent_activity": recent_activity,
        "weekly_cds_snapshot": weekly_cds_snapshot,
    }

