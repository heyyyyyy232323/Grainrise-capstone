import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_finance_required
from .selectors import (
    get_warehouse_payables_list,
    get_distinct_warehouse_suppliers,
    get_warehouse_payable_detail,
)
from .services import (
    record_payment,
    initiate_xendit_payment,
    reconcile_xendit_payment,
    cancel_pending_attempt,
    process_xendit_webhook,
    get_xendit_config,
    PayableNotFoundError,
    AlreadyPaidError,
    ActivePaymentAttemptError,
    InvalidPayableStateError,
    DuplicateReferenceError,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@warehouse_finance_required
def list_payables_view(request):
    """
    GET /api/warehouse-function/finance/payables/
    Retrieve outstanding payables for the authenticated Warehouse branch.
    Scoped to request.grainrise_warehouse_profile_ids.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    filters = {
        "search": request.query_params.get("search", ""),
        "supplier": request.query_params.get("supplier", ""),
        "sort_by": request.query_params.get("sort_by", "batch-asc"),
    }

    try:
        data = get_warehouse_payables_list(warehouse_profile_ids, filters)
        distinct_suppliers = get_distinct_warehouse_suppliers(warehouse_profile_ids)
        xendit_cfg = get_xendit_config()

        payer_info = {
            "payer_name": request.grainrise_warehouse_payer_name,
            "business_name": request.grainrise_warehouse_business_name,
            "warehouse_profile_id": request.grainrise_warehouse_profile_id,
            "employee_id": request.grainrise_warehouse_employee_id,
        }

        return Response(
            {
                "success": True,
                "data": {
                    "records": data["records"],
                    "count": data["count"],
                    "suppliers": distinct_suppliers,
                },
                "payer_info": payer_info,
                "xendit_mode": xendit_cfg["mode"],
                "is_sandbox": xendit_cfg["is_sandbox"],
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse payables: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load warehouse payables records. Please refresh the page.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@warehouse_finance_required
def record_payment_view(request):
    """
    POST /api/warehouse-function/finance/payables/pay/
    Record payment for a receiving record in Cash or manual Bank/GCash proof.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    paid_by_employee_id = request.grainrise_warehouse_employee_id
    payer_name = request.grainrise_warehouse_payer_name
    business_name = request.grainrise_warehouse_business_name

    raw_receiving_id = request.data.get("receiving_id")
    try:
        receiving_id = int(raw_receiving_id)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Valid receiving_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    supplier_type = str(request.data.get("supplier_type", "registered_miller")).strip().lower()
    payment_method = request.data.get("payment_method")
    payment_reference = request.data.get("payment_reference")
    receipt_file = request.FILES.get("receipt_file") or request.FILES.get("receipt")

    try:
        receipt_detail = record_payment(
            warehouse_profile_ids=warehouse_profile_ids,
            receiving_id=receiving_id,
            supplier_type=supplier_type,
            payment_method=payment_method,
            payment_reference=payment_reference,
            receipt_file=receipt_file,
            paid_by_employee_id=paid_by_employee_id,
            payer_name=payer_name,
            business_name=business_name,
        )

        return Response(
            {
                "success": True,
                "message": "Payment recorded successfully.",
                "data": receipt_detail,
            },
            status=status.HTTP_200_OK,
        )

    except PayableNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except AlreadyPaidError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_409_CONFLICT)
    except DuplicateReferenceError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_409_CONFLICT)
    except (InvalidPayableStateError, ValueError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Unexpected error recording warehouse payment: %s", exc)
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred while processing the payment. Please try again.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_finance_required
def initiate_xendit_view(request):
    """
    POST /api/warehouse-function/finance/payables/xendit/initiate/
    Initiate Xendit money-in payment session for Registered Millers.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    paid_by_employee_id = request.grainrise_warehouse_employee_id
    payer_name = request.grainrise_warehouse_payer_name
    business_name = request.grainrise_warehouse_business_name

    raw_receiving_id = request.data.get("receiving_id")
    try:
        receiving_id = int(raw_receiving_id)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Valid receiving_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = request.data.get("payment_method", "GCash")
    bank_channel = request.data.get("bank_channel")

    try:
        result = initiate_xendit_payment(
            warehouse_profile_ids=warehouse_profile_ids,
            receiving_id=receiving_id,
            payment_method=payment_method,
            paid_by_employee_id=paid_by_employee_id,
            payer_name=payer_name,
            business_name=business_name,
            bank_channel=bank_channel,
        )

        return Response(result, status=status.HTTP_200_OK)

    except PayableNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except AlreadyPaidError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_409_CONFLICT)
    except Exception as exc:
        logger.exception("Failed to initiate Xendit payment: %s", exc)
        return Response(
            {"success": False, "message": "Failed to initiate online payment session. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_finance_required
def reconcile_xendit_view(request):
    """
    POST /api/warehouse-function/finance/payables/xendit/reconcile/
    Reconcile active Xendit payment attempt or simulate sandbox payment.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    payer_name = request.grainrise_warehouse_payer_name
    business_name = request.grainrise_warehouse_business_name

    raw_receiving_id = request.data.get("receiving_id")
    try:
        receiving_id = int(raw_receiving_id)
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Valid receiving_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    simulate_sandbox = bool(request.data.get("simulate_sandbox_success", False))

    try:
        res = reconcile_xendit_payment(
            warehouse_profile_ids=warehouse_profile_ids,
            receiving_id=receiving_id,
            simulate_sandbox_success=simulate_sandbox,
            payer_name=payer_name,
            business_name=business_name,
        )
        return Response(res, status=status.HTTP_200_OK)

    except PayableNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Failed to reconcile Xendit payment: %s", exc)
        return Response(
            {"success": False, "message": "Failed to reconcile payment status. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_finance_required
def cancel_attempt_view(request):
    """
    POST /api/warehouse-function/finance/payables/xendit/cancel/
    Cancel an active or pending payment attempt.
    """
    warehouse_profile_ids = request.grainrise_warehouse_profile_ids
    raw_receiving_id = request.data.get("receiving_id")
    try:
        receiving_id = int(raw_receiving_id)
    except (TypeError, ValueError):
        return Response({"success": False, "message": "Valid receiving_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        cancel_pending_attempt(warehouse_profile_ids, receiving_id)
        return Response({"success": True, "message": "Payment attempt cancelled."}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Failed to cancel payment attempt: %s", exc)
        return Response({"success": False, "message": "Failed to cancel payment attempt."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@permission_classes([AllowAny])
def xendit_webhook_view(request):
    """
    POST /api/warehouse-function/finance/payables/webhooks/xendit/
    Receives verified Xendit callback events.
    """
    cb_token = request.headers.get("x-callback-token", "")
    try:
        ok = process_xendit_webhook(request.data, cb_token)
        if ok:
            return Response({"status": "received"}, status=status.HTTP_200_OK)
        return Response({"status": "invalid_token"}, status=status.HTTP_401_UNAUTHORIZED)
    except Exception as exc:
        logger.exception("Error in warehouse Xendit webhook: %s", exc)
        return Response({"status": "error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
