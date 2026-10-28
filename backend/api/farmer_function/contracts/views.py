import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.farmer_function.farmer_auth import farmer_required
from .selectors import (
    get_farmer_applications,
    get_farmer_application_details,
    get_farmer_opportunities,
    get_farmer_opportunity_details,
    get_farmer_biddings,
    get_farmer_offer_details,
    get_farmer_contracts,
    get_farmer_contract_details,
)
from .services import (
    cancel_farmer_application,
    submit_farmer_application,
    create_farmer_bidding,
    accept_bidding_offer,
    decline_bidding_offer,
    request_void_contract,
    sign_contract,
)

logger = logging.getLogger(__name__)


# ============================================================
# 1. APPLICATIONS
# ============================================================

@require_http_methods(["GET"])
@farmer_required
def applications_list(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    filters = {
        "search": request.GET.get("search", ""),
        "status": request.GET.get("status", ""),
        "year": request.GET.get("year", ""),
        "month": request.GET.get("month", ""),
        "sortBy": request.GET.get("sortBy", "newest"),
    }
    try:
        applications = get_farmer_applications(farm_profile_id, filters)
        return JsonResponse({"success": True, "data": applications, "applications": applications}, status=200)
    except Exception as exc:
        logger.error("Error fetching farmer applications: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to fetch applications."}, status=500)


@require_http_methods(["GET"])
@farmer_required
def application_detail(request, application_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]
    try:
        app_id_int = int(application_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid application ID."}, status=400)

    try:
        application = get_farmer_application_details(farm_profile_id, app_id_int)
        if not application:
            return JsonResponse({"detail": "Application not found or unauthorized."}, status=404)
        return JsonResponse({"success": True, "data": application, "application": application}, status=200)
    except Exception as exc:
        logger.error("Error fetching application details: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load application details."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def application_cancel(request, application_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]
    try:
        app_id_int = int(application_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid application ID."}, status=400)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    reason = body.get("reason") or body.get("cancellation_reason") or ""
    remarks = body.get("remarks") or body.get("cancellation_remarks") or ""

    if not str(reason).strip():
        return JsonResponse({"detail": "Cancellation reason cannot be empty."}, status=400)

    try:
        updated = cancel_farmer_application(farm_profile_id, app_id_int, reason, remarks)
        return JsonResponse({
            "success": True,
            "message": "Application has been successfully cancelled.",
            "data": updated,
            "application": updated,
        }, status=200)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error cancelling application: %s", exc, exc_info=True)
        return JsonResponse({"detail": "An unexpected error occurred while cancelling the application."}, status=500)


# ============================================================
# 2. OPPORTUNITIES
# ============================================================

@require_http_methods(["GET"])
@farmer_required
def opportunities_list(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    filters = {
        "search": request.GET.get("search", ""),
        "product_type": request.GET.get("product_type", ""),
        "rice_variety": request.GET.get("rice_variety", ""),
        "sortBy": request.GET.get("sortBy", "newest"),
    }
    try:
        opps = get_farmer_opportunities(farm_profile_id, filters)
        return JsonResponse({"success": True, "data": opps, "opportunities": opps}, status=200)
    except Exception as exc:
        logger.error("Error fetching opportunities: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load opportunities."}, status=500)


@require_http_methods(["GET"])
@farmer_required
def opportunity_detail(request, opportunity_id):
    try:
        opp_id_int = int(opportunity_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid opportunity ID."}, status=400)

    try:
        opp = get_farmer_opportunity_details(opp_id_int)
        if not opp:
            return JsonResponse({"detail": "Opportunity not found."}, status=404)
        return JsonResponse({"success": True, "data": opp, "opportunity": opp}, status=200)
    except Exception as exc:
        logger.error("Error fetching opportunity detail: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load opportunity details."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def opportunity_apply(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    try:
        created = submit_farmer_application(farm_profile_id, body)
        return JsonResponse({
            "success": True,
            "message": "Application submitted successfully.",
            "data": created,
            "application": created,
        }, status=201)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error submitting application: %s", exc, exc_info=True)
        return JsonResponse({"detail": "An error occurred while submitting the application."}, status=500)


# ============================================================
# 3. OFFERS & OPEN BIDDINGS
# ============================================================

@require_http_methods(["GET"])
@farmer_required
def biddings_list(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    filters = {
        "search": request.GET.get("search", ""),
        "status": request.GET.get("status", ""),
        "sortBy": request.GET.get("sortBy", "newest"),
    }
    try:
        bids = get_farmer_biddings(farm_profile_id, filters)
        return JsonResponse({"success": True, "data": bids, "biddings": bids}, status=200)
    except Exception as exc:
        logger.error("Error fetching biddings: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load open biddings."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def bidding_create(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"detail": "Invalid request body."}, status=400)

    try:
        created = create_farmer_bidding(farm_profile_id, body)
        return JsonResponse({
            "success": True,
            "message": "Open bidding created successfully.",
            "data": created,
        }, status=201)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error creating bidding: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to create open bidding."}, status=500)


@require_http_methods(["GET"])
@farmer_required
def offer_detail(request, offer_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        oid = int(offer_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid offer ID."}, status=400)

    try:
        off = get_farmer_offer_details(farm_profile_id, oid)
        if not off:
            return JsonResponse({"detail": "Offer not found or unauthorized."}, status=404)
        return JsonResponse({"success": True, "data": off, "offer": off}, status=200)
    except Exception as exc:
        logger.error("Error loading offer: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load offer details."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def offer_accept(request, offer_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        oid = int(offer_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid offer ID."}, status=400)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    sig = body.get("signature") or body.get("farmer_signature")

    try:
        contract = accept_bidding_offer(farm_profile_id, oid, sig)
        return JsonResponse({
            "success": True,
            "message": "Offer accepted successfully and contract generated.",
            "data": contract,
            "contract": contract,
        }, status=200)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error accepting offer: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to accept offer."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def offer_decline(request, offer_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        oid = int(offer_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid offer ID."}, status=400)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    reason = body.get("reason") or "Declined by Farmer"

    try:
        updated = decline_bidding_offer(farm_profile_id, oid, reason)
        return JsonResponse({
            "success": True,
            "message": "Offer has been declined.",
            "data": updated,
            "offer": updated,
        }, status=200)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error declining offer: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to decline offer."}, status=500)


# ============================================================
# 4. CURRENT CONTRACTS
# ============================================================

@require_http_methods(["GET"])
@farmer_required
def contracts_list(request):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    filters = {
        "search": request.GET.get("search", ""),
        "status": request.GET.get("status", ""),
        "sortBy": request.GET.get("sortBy", "newest"),
    }
    try:
        ctrs = get_farmer_contracts(farm_profile_id, filters)
        return JsonResponse({"success": True, "data": ctrs, "contracts": ctrs}, status=200)
    except Exception as exc:
        logger.error("Error fetching contracts: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load current contracts."}, status=500)


@require_http_methods(["GET"])
@farmer_required
def contract_detail(request, contract_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        cid = int(contract_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid contract ID."}, status=400)

    try:
        ctr = get_farmer_contract_details(farm_profile_id, cid)
        if not ctr:
            return JsonResponse({"detail": "Contract not found or unauthorized."}, status=404)
        return JsonResponse({"success": True, "data": ctr, "contract": ctr}, status=200)
    except Exception as exc:
        logger.error("Error loading contract detail: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to load contract details."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def contract_void_request(request, contract_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        cid = int(contract_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid contract ID."}, status=400)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    reason = body.get("reason") or body.get("void_reason") or ""
    remarks = body.get("remarks") or body.get("void_remarks") or ""

    if not str(reason).strip():
        return JsonResponse({"detail": "Void request reason cannot be empty."}, status=400)

    try:
        updated = request_void_contract(farm_profile_id, cid, reason, remarks)
        return JsonResponse({
            "success": True,
            "message": "Void request submitted successfully.",
            "data": updated,
            "contract": updated,
        }, status=200)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error submitting void request: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to submit void request."}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def contract_sign(request, contract_id):
    farmer = request.farmer
    farm_profile_id = farmer["farm_profile_id"]

    try:
        cid = int(contract_id)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "Invalid contract ID."}, status=400)

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = {}

    sig = body.get("signature") or body.get("farmer_signature") or ""
    if not str(sig).strip():
        return JsonResponse({"detail": "Signature cannot be empty."}, status=400)

    try:
        updated = sign_contract(farm_profile_id, cid, sig)
        return JsonResponse({
            "success": True,
            "message": "Contract signed successfully.",
            "data": updated,
            "contract": updated,
        }, status=200)
    except ValueError as val_err:
        return JsonResponse({"detail": str(val_err)}, status=400)
    except Exception as exc:
        logger.error("Error signing contract: %s", exc, exc_info=True)
        return JsonResponse({"detail": "Failed to sign contract."}, status=500)
