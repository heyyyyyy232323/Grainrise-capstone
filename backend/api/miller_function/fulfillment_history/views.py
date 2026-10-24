"""
HTTP views for Miller Manager Fulfillment History.
Provides read-only access to completed fulfillment/receiving records
across all branches owned by the authenticated Miller Manager.
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from api.miller_function.miller_auth import miller_manager_required

from .selectors import (
    list_manager_fulfillment_history,
    list_manager_fulfillment_variants,
)


@csrf_exempt
@require_GET
@miller_manager_required
def manager_fulfillment_history_list_view(request):
    """
    GET /api/miller/fulfillment-history/
    Retrieve completed fulfillment and receiving records across all branches
    owned by the authenticated Miller Manager, or filtered by a specific branch.

    Query parameters:
    - branch_id: all | <numeric supplier_profile_id>
    - search: search string (reference no., batch no., product, customer, branch)
    - variant: all | <variant product name>
    - buyer_type: all | retailer | warehouse
    - start_date: YYYY-MM-DD
    - end_date: YYYY-MM-DD
    - sort: variant-asc | variant-desc | customer-asc | customer-desc |
            delivered-desc | delivered-asc | passed-desc | passed-asc |
            failed-desc | failed-asc | cost-desc | cost-asc |
            branch-asc | branch-desc
    """
    miller_user_id = request.grainrise_miller_id

    branch_id = request.GET.get("branch_id") or request.GET.get("branch") or "all"
    search = request.GET.get("search", "").strip() or None
    variant = request.GET.get("variant", "all").strip()
    buyer_type = request.GET.get("buyer_type", "all").strip()
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort", "").strip() or request.GET.get("sort_by", "").strip()

    try:
        records = list_manager_fulfillment_history(
            miller_user_id=miller_user_id,
            branch_id=branch_id,
            search=search,
            variant_filter=variant,
            buyer_type_filter=buyer_type,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "fulfillments": records,
                "total": len(records),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error fetching fulfillment history: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_GET
@miller_manager_required
def manager_fulfillment_variants_view(request):
    """
    GET /api/miller/fulfillment-history/variants/
    Retrieve distinct product variants available in fulfillment records
    across all branches owned by the authenticated Miller Manager.
    """
    miller_user_id = request.grainrise_miller_id
    branch_id = request.GET.get("branch_id") or request.GET.get("branch") or None

    try:
        variants = list_manager_fulfillment_variants(miller_user_id, branch_id=branch_id)
        return JsonResponse({"success": True, "variants": variants}, status=200)
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error fetching fulfillment variants: {str(e)}",
            },
            status=500,
        )
