from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from api.miller_function.miller_auth import miller_manager_required
from .selectors import get_manager_performance_data


def _add_no_cache_headers(response: JsonResponse) -> JsonResponse:
    response["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response["Pragma"] = "no-cache"
    response["Expires"] = "0"
    return response


@csrf_exempt
@require_GET
@miller_manager_required
def get_manager_performance_monitoring_view(request):
    """
    GET /api/miller/performance-monitoring/
    Query parameters:
      - branch_id: optional supplier_profile_id or "all"
      - product_name: optional variant name or "all"
    """
    miller_user_id = getattr(request, "grainrise_miller_id", None)
    if not miller_user_id:
        return _add_no_cache_headers(
            JsonResponse({"success": False, "message": "Unauthorized."}, status=401)
        )

    branch_id = request.GET.get("branch_id")
    product_name = request.GET.get("product_name")

    try:
        data = get_manager_performance_data(
            miller_user_id=miller_user_id,
            branch_id=branch_id,
            product_name=product_name,
        )
        return _add_no_cache_headers(
            JsonResponse(
                {
                    "success": True,
                    "data": data,
                },
                status=200,
            )
        )
    except Exception as exc:
        return _add_no_cache_headers(
            JsonResponse(
                {
                    "success": False,
                    "message": "Failed to fetch performance monitoring data.",
                    "error": str(exc),
                },
                status=500,
            )
        )

