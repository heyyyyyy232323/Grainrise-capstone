import logging
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
from .selectors import (
    compute_business_prefix3,
    compute_initials,
    get_reimbursement_categories,
    get_reimbursement_detail,
    list_pending_reimbursements,
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
    process_reimbursement_payment,
    process_xendit_payout_webhook,
    reconcile_xendit_payout_status,
)

logger = logging.getLogger(__name__)


def _no_cache_response(payload: dict, http_status: int) -> Response:
    resp = Response(payload, status=http_status)
    resp["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp["Pragma"] = "no-cache"
    resp["Expires"] = "0"
    return resp


@api_view(["GET"])
@miller_finance_required
def list_reimbursements_view(request):
    """
    GET /api/miller-employees/finance/reimbursements/
    Retrieve pending ('requested') reimbursements for the authenticated Finance employee's branch.
    Automatically reconciles any pending/accepted Xendit payout attempts via GET /v3/payouts/{id}
    and excludes paid records as well as completed sandbox/live payouts.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    employee = request.grainrise_supplier_employee

    filters = {
        "search": request.query_params.get("search", ""),
        "category": request.query_params.get("category") or request.query_params.get("type", ""),
        "sort_by": request.query_params.get("sort_by", "category-asc"),
    }

    try:
        newly_succeeded = auto_reconcile_pending_payouts_for_branch(supplier_profile_id)
        data = list_pending_reimbursements(supplier_profile_id, filters)
        categories = get_reimbursement_categories(supplier_profile_id)
        xendit_cfg = get_xendit_config()

        payer_full_name = f"{employee.get('first_name') or ''} {employee.get('last_name') or ''}".strip() or "Finance Staff"
        business_name = employee.get("business_name") or "GrainRise Miller"

        payer_info = {
            "supplier_employee_id": employee.get("supplier_employee_id"),
            "payer_name": payer_full_name,
            "payer_initials": compute_initials(payer_full_name, fallback="FN"),
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
        logger.exception("Failed to list reimbursements for supplier_profile_id=%s: %s", supplier_profile_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load reimbursement records. Please try again.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_finance_required
def get_reimbursement_detail_view(request, reimbursement_id):
    """
    GET /api/miller-employees/finance/reimbursements/<reimbursement_id>/
    Retrieve single reimbursement detail scoped strictly to the Finance employee's branch.
    Automatically reconciles any pending/accepted Xendit payout attempt via GET /v3/payouts/{id}.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        detail = get_reimbursement_detail(supplier_profile_id, reimbursement_id)
        if not detail:
            return _no_cache_response(
                {
                    "success": False,
                    "message": "Reimbursement record not found or access denied.",
                },
                status.HTTP_404_NOT_FOUND,
            )

        latest_att = detail.get("latest_payout_attempt")
        if latest_att and latest_att.get("is_pending"):
            try:
                rec_res = reconcile_xendit_payout_status(
                    supplier_profile_id=supplier_profile_id,
                    reimbursement_id=reimbursement_id,
                )
                if rec_res and rec_res.get("reimbursement"):
                    detail = rec_res["reimbursement"]
            except Exception as rec_exc:
                logger.warning("Detail auto-reconcile skipped for reimbursement_id=%s: %s", reimbursement_id, rec_exc)

        return _no_cache_response(
            {
                "success": True,
                "data": detail,
                "reimbursement": detail,
            },
            status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to fetch reimbursement detail=%s: %s", reimbursement_id, exc)
        return _no_cache_response(
            {
                "success": False,
                "message": "Failed to load reimbursement details.",
                "error": str(exc),
            },
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_finance_required
def list_requester_payment_accounts_view(request, reimbursement_id):
    """
    GET /api/miller-employees/finance/reimbursements/<reimbursement_id>/employee-accounts/
    Fetch ONLY active registered payment accounts belonging to the reimbursement's
    requesting employee (mr.requested_by) within the authenticated Finance employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    account_type = request.query_params.get("type", "")

    try:
        res = list_requester_active_payment_accounts(
            supplier_profile_id=supplier_profile_id,
            reimbursement_id=reimbursement_id,
            account_type=account_type,
        )
        if res is None:
            return Response(
                {
                    "success": False,
                    "message": "Reimbursement record not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": True,
                **res,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to fetch requester payment accounts for reimbursement_id=%s: %s", reimbursement_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load employee payment accounts.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_finance_required
def process_reimbursement_payment_view(request):
    """
    POST /api/miller-employees/finance/reimbursements/pay/
    Process payment for a reimbursement via Cash or Xendit v3 Payouts (GCash / Bank).
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    paid_by_employee_id = request.grainrise_supplier_employee_id

    raw_reimb_id = request.data.get("reimbursement_id") or request.data.get("id")
    try:
        reimbursement_id = int(raw_reimb_id)
    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": "Valid reimbursement_id is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = request.data.get("payment_method") or request.data.get("method")
    payment_reference = request.data.get("payment_reference") or request.data.get("payment_reference_no")
    raw_cred_id = request.data.get("employee_credentials_id") or request.data.get("credentials_id")
    employee_credentials_id = None
    if raw_cred_id not in (None, ""):
        try:
            employee_credentials_id = int(raw_cred_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid employee payment account ID.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    receipt_file = request.FILES.get("receipt_file") or request.FILES.get("receipt")

    try:
        result = process_reimbursement_payment(
            supplier_profile_id=supplier_profile_id,
            paid_by_employee_id=paid_by_employee_id,
            reimbursement_id=reimbursement_id,
            payment_method=payment_method,
            payment_reference=payment_reference,
            employee_credentials_id=employee_credentials_id,
            receipt_file=receipt_file,
        )

        if result.get("payment_flow") == "CASH":
            msg = "Cash reimbursement payment recorded and marked as paid."
        else:
            p_stat = result.get("payout_status") or "ACCEPTED"
            if result.get("is_sandbox"):
                msg = (
                    f"Xendit Sandbox payout submitted (Status: {p_stat}). "
                    f"Sandbox payouts are tracked separately and not marked as live financial payments."
                )
            elif p_stat == "SUCCEEDED":
                msg = "Xendit payout succeeded and reimbursement marked as paid."
            else:
                msg = f"Xendit payout initiated (Status: {p_stat}). Awaiting webhook confirmation."

        return Response(
            {
                "success": True,
                "message": msg,
                "data": result,
            },
            status=status.HTTP_200_OK,
        )
    except ReimbursementNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except (AlreadyPaidError, DuplicatePayoutError, PendingPayoutExistsError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_409_CONFLICT)
    except (InvalidPaymentAccountError, XenditConfigurationError, ValueError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except XenditPayoutFailedError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
                "error_code": exc.error_code,
                "data": exc.attempt_data,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as exc:
        logger.exception("Failed to process reimbursement payment: %s", exc)
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred while processing the reimbursement payment.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_finance_required
def reconcile_reimbursement_payout_view(request, reimbursement_id):
    """
    POST /api/miller-employees/finance/reimbursements/<reimbursement_id>/reconcile/
    Reconcile the latest Xendit payout status via GET /v3/payouts/{payout_id}.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        result = reconcile_xendit_payout_status(
            supplier_profile_id=supplier_profile_id,
            reimbursement_id=reimbursement_id,
        )
        p_stat = str(result.get("payout_status") or "").upper()
        if p_stat == "ROUTING":
            msg = (
                "Xendit payout is currently in ROUTING status — Xendit is routing the disbursement "
                "to the recipient channel. Duplicate payment is locked while routing completes."
            )
        elif p_stat == "SUCCEEDED":
            msg = "Xendit payout reconciled as SUCCEEDED."
        else:
            msg = f"Payout status reconciled: {p_stat}"

        return _no_cache_response(
            {
                "success": True,
                "message": msg,
                "data": result,
            },
            status.HTTP_200_OK,
        )
    except ReimbursementNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except XenditConfigurationError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except XenditPayoutFailedError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
                "error_code": exc.error_code,
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as exc:
        logger.exception("Failed to reconcile payout status for reimbursement_id=%s: %s", reimbursement_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to reconcile payout status.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@parser_classes([JSONParser])
def xendit_payout_webhook_view(request):
    """
    POST /api/miller-employees/finance/reimbursements/webhooks/xendit/
    Authenticated Xendit v3 Payout Webhook receiver.
    Verifies x-callback-token against XENDIT_CALLBACK_TOKEN.
    """
    callback_token = (
        request.headers.get("x-callback-token")
        or request.META.get("HTTP_X_CALLBACK_TOKEN")
        or ""
    )

    try:
        result = process_xendit_payout_webhook(
            callback_token_header=callback_token,
            payload=request.data,
        )
        return Response(
            {
                "success": True,
                "data": result,
            },
            status=status.HTTP_200_OK,
        )
    except WebhookConfigMissingError as exc:
        logger.error("Webhook configuration missing: %s", exc)
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except WebhookAuthenticationError as exc:
        logger.warning("Unauthorized Xendit webhook attempt: %s", exc)
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    except ReimbursementNotFoundError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except ValueError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Error processing Xendit payout webhook: %s", exc)
        return Response(
            {"success": False, "message": "Internal webhook processing error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

