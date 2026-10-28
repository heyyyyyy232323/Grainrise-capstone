import json
from functools import wraps
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from api.utils import authorization_payload
from .selectors import (
    FarmerPOSSchemaError,
    get_farmer_pos_receipt,
    list_farmer_pos_history,
    list_farmer_pos_products,
)
from .services import FarmerPOSValidationError, checkout


def farmer_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        payload = authorization_payload(request)
        if not payload or payload.get("role") != "farmer":
            return JsonResponse({"detail": "Farmer authentication required."}, status=401)
        try: uid = int(payload.get("sub"))
        except (TypeError, ValueError): return JsonResponse({"detail": "Invalid farmer identity."}, status=401)
        with connection.cursor() as cursor:
            cursor.execute("SELECT user_id FROM users WHERE user_id=%s AND user_role='farmer' AND status='active'", [uid])
            if not cursor.fetchone(): return JsonResponse({"detail": "Farmer account is unavailable."}, status=403)
        request.farmer_user_id = uid
        return view(request, *args, **kwargs)
    return wrapped


def _json(request):
    try: return json.loads(request.body.decode() or "{}")
    except (ValueError, UnicodeDecodeError): raise FarmerPOSValidationError("Invalid JSON body.")


@csrf_exempt
@require_GET
@farmer_required
def products(request):
    try: return JsonResponse({"products": list_farmer_pos_products(request.farmer_user_id)})
    except FarmerPOSSchemaError as exc: return JsonResponse({"detail": str(exc), "code": "schema_unavailable"}, status=503)


@csrf_exempt
@require_POST
@farmer_required
def checkout_view(request):
    try:
        data = _json(request)
        result = checkout(farmer_user_id=request.farmer_user_id, items=data.get("items"),
                          payment_method=data.get("payment_method") or "cash",
                          amount_paid=data.get("amount_paid"),
                          reference_no=data.get("reference_no"),
                          idempotency_key=data.get("idempotency_key") or request.headers.get("X-Idempotency-Key"))
        return JsonResponse({"receipt": result}, status=201)
    except FarmerPOSValidationError as exc: return JsonResponse({"detail": exc.message}, status=exc.status_code)
    except FarmerPOSSchemaError as exc: return JsonResponse({"detail": str(exc), "code": "schema_unavailable"}, status=503)


@csrf_exempt
@require_GET
@farmer_required
def receipt(request, reference_no):
    try: result = get_farmer_pos_receipt(request.farmer_user_id, reference_no)
    except FarmerPOSSchemaError as exc: return JsonResponse({"detail": str(exc), "code": "schema_unavailable"}, status=503)
    return JsonResponse({"receipt": result}, status=200) if result else JsonResponse({"detail": "Receipt not found."}, status=404)


@csrf_exempt
@require_GET
@farmer_required
def history(request):
    """Read-only POS checkout history for the authenticated farmer."""
    try:
        page = max(int(request.GET.get("page", 1)), 1)
        page_size = min(max(int(request.GET.get("page_size", request.GET.get("limit", 25))), 1), 100)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "page and page_size must be positive integers."}, status=400)
    try:
        data = list_farmer_pos_history(
            request.farmer_user_id,
            search=request.GET.get("search", "").strip() or None,
            start_date=request.GET.get("start_date", "").strip() or None,
            end_date=request.GET.get("end_date", "").strip() or None,
            payment_method=request.GET.get("payment_method", "").strip() or None,
            sort_by=request.GET.get("sort_by", request.GET.get("sort", "date-desc")).strip(),
            page=page,
            page_size=page_size,
        )
        return JsonResponse({"sales": data["results"], **{k: v for k, v in data.items() if k != "results"}})
    except FarmerPOSSchemaError as exc:
        return JsonResponse({"detail": str(exc), "code": "schema_unavailable"}, status=503)
