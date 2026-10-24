"""
HTTP views for Miller Manager Sales History.
Provides read-only access to in-store records, online records, and POS receipts
across all branches owned by the authenticated Miller Manager.
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from api.miller_function.miller_auth import miller_manager_required

from .selectors import (
    get_manager_pos_checkout_receipt,
    list_manager_in_store_sales,
    list_manager_online_sales,
)


@csrf_exempt
@require_GET
@miller_manager_required
def manager_in_store_sales_history_view(request):
    """
    GET /api/miller/sales-history/in-store/
    Returns completed in-store sales transactions for all branches owned by
    the authenticated Miller Manager.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    miller_user_id = request.grainrise_miller_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_manager_in_store_sales(
        miller_user_id=miller_user_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


@csrf_exempt
@require_GET
@miller_manager_required
def manager_online_sales_history_view(request):
    """
    GET /api/miller/sales-history/online/
    Returns online sales transactions for all branches owned by
    the authenticated Miller Manager.
    Supports query parameters: search, start_date, end_date, sort_by.
    """
    miller_user_id = request.grainrise_miller_id
    search = request.GET.get("search", "").strip() or None
    start_date = request.GET.get("start_date", "").strip() or None
    end_date = request.GET.get("end_date", "").strip() or None
    sort_by = request.GET.get("sort_by", "date-desc").strip()

    sales = list_manager_online_sales(
        miller_user_id=miller_user_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
    )
    return JsonResponse({"sales": sales, "total_count": len(sales)}, status=200)


@csrf_exempt
@require_GET
@miller_manager_required
def manager_pos_receipt_detail_view(request, reference_no: str):
    """
    GET /api/miller/sales-history/receipt/<reference_no>/
    Fetches the complete Sales Receipt for a checkout reference number,
    verifying server-side that the branch belongs to the authenticated Miller Manager.
    """
    miller_user_id = request.grainrise_miller_id
    receipt = get_manager_pos_checkout_receipt(miller_user_id, reference_no)
    if not receipt:
        return JsonResponse({"detail": "Sales receipt not found or access denied."}, status=404)
    return JsonResponse({"receipt": receipt}, status=200)

