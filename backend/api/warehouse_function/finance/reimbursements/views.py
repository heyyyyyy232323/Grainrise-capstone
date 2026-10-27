import logging
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import (
    compute_business_prefix3,
    compute_initials,
    get_warehouse_reimbursement_categories,
    get_warehouse_reimbursement_detail,
    list_pending_warehouse_reimbursements,
    list_requester_active_payment_accounts,
)
from .services import (
    AlreadyPaidError,
    DuplicatePayoutError,
    InvalidPaymentAccountError,
    PendingPayoutExistsError,
    ReimbursementNotFoundError,
    WebhookAuthenticationError,
    WebhookConfigMissingError,
    XenditConfigurationError,
    XenditPayoutFailedError,
    auto_reconcile_pending_payouts_for_branch,
    get_xendit_config,
    process_warehouse_reimbursement_payment,
    process_xendit_payout_webhook,
    reconcile_warehouse_xendit_payout_status,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@warehouse_finance_required
def list_reimbursements_view(request):
    """
    GET /api/warehouse/finance/reimbursements/
    Retrieve pending ('requested') reimbursements for the authenticated Warehouse branch.
    Automatically reconciles any pending Xendit payout attempts.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    employee_id = request.grainrise_warehouse_employee_id
    business_name = request.grainrise_warehouse_business_name or "Warehouse"
    payer_name = request.grainrise_warehouse_payer_name or "Finance Staff"

    filters = {
        "search": request.query_params.get("search", ""),
        "category": request.query_params.get("category") or request.query_params.get("type", ""),
        "sort_by": request.query_params.get("sort_by", "category-asc"),
    }

    try:
        newly_succeeded = auto_reconcile_pending_payouts_for_branch(warehouse_profile_ids)
        data = list_pending_warehouse_reimbursements(warehouse_profile_ids, filters)
        categories = get_warehouse_reimbursement_categories(warehouse_profile_ids)
        xendit_cfg = get_xendit_config()

        payer_info = {
            "warehouse_employee_id": employee_id,
            "payer_name": payer_name,
            "payer_initials": compute_initials(payer_name, fallback="WF"),
            "business_name": business_name,
            "business_prefix3": compute_business_prefix3(business_name),
            "xendit_mode": xendit_cfg["mode"],
        }

        return _no_cache_response(
            {
                "success": True,
                "data": data,
                "newly_succeeded": newly_succeeded,
                "categories": categories,
                "payer_info": payer_info,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list warehouse reimbursements: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load reimbursement records. Please try again.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_finance_required
def get_reimbursement_detail_view(request, reimbursement_id: int):
    """
    GET /api/warehouse/finance/reimbursements/<id>/
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    try:
        detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimbursement_id)
        if not detail:
            return _no_cache_response(
                {"success": False, "message": "Reimbursement record not found."},
                status.HTTP_404_NOT_FOUND,
            )
        return _no_cache_response({"success": True, "reimbursement": detail}, status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Failed to get reimbursement detail for id=%s: %s", reimbursement_id, exc)
        return _no_cache_response(
            {"success": False, "message": "Failed to fetch reimbursement details.", "error": str(exc)},
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_finance_required
def list_requester_payment_accounts_view(request, reimbursement_id: int):
    """
    GET /api/warehouse/finance/reimbursements/<id>/employee-accounts/
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    account_type = request.query_params.get("type", None)

    try:
        result = list_requester_active_payment_accounts(warehouse_profile_ids, reimbursement_id, account_type)
        if not result:
            return _no_cache_response(
                {"success": False, "message": "Reimbursement record not found or inaccessible."},
                status.HTTP_404_NOT_FOUND,
            )
        return _no_cache_response(
            {
                "success": True,
                "reimbursement_id": result["reimbursement_id"],
                "requested_by": result["requested_by"],
                "requester_name": result["requester_name"],
                "accounts": result["accounts"],
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list payment accounts for reimbursement_id=%s: %s", reimbursement_id, exc)
        return _no_cache_response(
            {"success": False, "message": "Failed to load payment accounts.", "error": str(exc)},
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@warehouse_finance_required
def process_reimbursement_payment_view(request):
    """
    POST /api/warehouse/finance/reimbursements/pay/
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    paid_by_employee_id = request.grainrise_warehouse_employee_id

    reimbursement_id = request.data.get("reimbursement_id")
    payment_method = request.data.get("payment_method")
    payment_reference = request.data.get("payment_reference")
    employee_credentials_id = request.data.get("employee_credentials_id")
    receipt_file = request.FILES.get("receipt_file")

    if not reimbursement_id:
        return _no_cache_response(
            {"success": False, "message": "reimbursement_id is required."},
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        reimbursement_id = int(reimbursement_id)
        if employee_credentials_id:
            employee_credentials_id = int(employee_credentials_id)
    except (ValueError, TypeError):
        return _no_cache_response(
            {"success": False, "message": "Invalid numeric identifiers provided."},
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        res = process_warehouse_reimbursement_payment(
            warehouse_profile_ids=warehouse_profile_ids,
            paid_by_employee_id=paid_by_employee_id,
            reimbursement_id=reimbursement_id,
            payment_method=payment_method,
            payment_reference=payment_reference,
            employee_credentials_id=employee_credentials_id,
            receipt_file=receipt_file,
        )

        return _no_cache_response(
            {
                "success": True,
                "message": (
                    "Cash payment recorded successfully."
                    if res.get("payment_flow") == "CASH"
                    else "Xendit payout initiated successfully."
                ),
                "data": res,
            },
            status.HTTP_200_OK,
        )
    except ReimbursementNotFoundError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_404_NOT_FOUND)
    except AlreadyPaidError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_409_CONFLICT)
    except DuplicatePayoutError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_409_CONFLICT)
    except PendingPayoutExistsError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_409_CONFLICT)
    except InvalidPaymentAccountError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_400_BAD_REQUEST)
    except XenditConfigurationError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_503_SERVICE_UNAVAILABLE)
    except XenditPayoutFailedError as e:
        return _no_cache_response(
            {
                "success": False,
                "message": str(e),
                "error_code": e.error_code,
                "attempt_data": e.attempt_data,
            },
            status.HTTP_400_BAD_REQUEST,
        )
    except ValueError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Unexpected error processing reimbursement payment: %s", exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "An error occurred while processing the reimbursement payment.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_finance_required
def reconcile_reimbursement_payout_view(request, reimbursement_id: int):
    """
    POST /api/warehouse/finance/reimbursements/<id>/reconcile/
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    simulate_sandbox = (
        str(request.data.get("simulate_sandbox") or request.query_params.get("simulate_sandbox") or "").lower()
        in ("true", "1", "yes")
    )

    try:
        result = reconcile_warehouse_xendit_payout_status(
            warehouse_profile_ids=warehouse_profile_ids,
            reimbursement_id=reimbursement_id,
            simulate_sandbox_success=simulate_sandbox,
        )
        return _no_cache_response(
            {
                "success": True,
                "message": "Payout status reconciled successfully.",
                "data": result,
            },
            status.HTTP_200_OK,
        )
    except ReimbursementNotFoundError as e:
        return _no_cache_response({"success": False, "message": str(e)}, status.HTTP_404_NOT_FOUND)
    except XenditPayoutFailedError as e:
        return _no_cache_response(
            {"success": False, "message": str(e), "error_code": e.error_code},
            status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to reconcile reimbursement payout: %s", exc)
        return _no_cache_response(
            {"success": False, "message": "Failed to reconcile payout status.", "error": str(exc)},
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@parser_classes([JSONParser])
def xendit_payout_webhook_view(request):
    """
    POST /api/warehouse/finance/reimbursements/webhooks/xendit/
    """
    callback_token = (
        request.headers.get("x-callback-token")
        or request.headers.get("webhook-id")
        or request.query_params.get("token")
        or ""
    ).strip()

    try:
        res = process_xendit_payout_webhook(payload=request.data, callback_token=callback_token)
        return Response({"status": "received", "data": res}, status=status.HTTP_200_OK)
    except WebhookAuthenticationError as e:
        return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
    except WebhookConfigMissingError as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as exc:
        logger.exception("Warehouse reimbursement payout webhook error: %s", exc)
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
