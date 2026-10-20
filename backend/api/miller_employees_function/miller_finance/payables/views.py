import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_finance_required
from .selectors import get_payables_list, get_payable_detail
from .services import (
    record_payment,
    PayableNotFoundError,
    AlreadyPaidError,
    InvalidPayableStateError,
    DuplicateReferenceError,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_finance_required
def list_payables_view(request):
    """
    GET /api/miller-employees/finance/payables/
    Retrieve payables records awaiting payment for the authenticated Miller Finance employee.
    Strictly scoped to the employee's supplier_profile_id.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    filters = {
        "search": request.query_params.get("search", ""),
        "supplier": request.query_params.get("supplier", ""),
        "sort_by": request.query_params.get("sort_by", "batch-asc"),
    }

    try:
        data = get_payables_list(supplier_profile_id, filters)
        return Response(
            {
                "success": True,
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve payables for supplier_profile_id=%s: %s", supplier_profile_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load payables records. Please try again.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_finance_required
def record_payment_view(request):
    """
    POST /api/miller-employees/finance/payables/pay/
    Record payment for a receiving record in 'request_to_pay' status.
    Supports JSON or multipart/form-data with Bearer JWT authentication.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    paid_by_employee_id = request.grainrise_supplier_employee_id

    raw_receiving_id = request.data.get("receiving_id")
    try:
        receiving_id = int(raw_receiving_id)
    except (TypeError, ValueError):
        return Response(
            {
                "success": False,
                "message": "Valid receiving_id is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    payment_method = request.data.get("payment_method")
    payment_reference = request.data.get("payment_reference")
    receipt_file = request.FILES.get("receipt_file") or request.FILES.get("receipt")

    try:
        receipt_detail = record_payment(
            supplier_profile_id=supplier_profile_id,
            paid_by_employee_id=paid_by_employee_id,
            receiving_id=receiving_id,
            payment_method=payment_method,
            payment_reference=payment_reference,
            receipt_file=receipt_file,
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
        logger.exception("Unexpected error while recording payment for receiving_id=%s: %s", receiving_id, exc)
        return Response(
            {
                "success": False,
                "message": "An unexpected error occurred while processing the payment. Please try again.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
