"""
API Views for Miller Driver - My Duties and Live Tracking.
Protected by @miller_driver_required.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_driver_required
from .selectors import (
    get_buyer_group_for_tracking,
    get_driver_assigned_conversations,
    get_driver_assigned_vehicle,
    get_driver_conversation_thread,
    get_driver_duties,
    get_driver_payment_submissions,
    get_last_ping_for_orders,
)
from .services import (
    DriverDeliveryError,
    complete_driver_delivery,
    exit_driver_live_tracking,
    record_driver_live_ping,
    send_driver_message,
    start_driver_live_tracking,
    submit_driver_cod_payment,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_driver_required
def driver_duties_list_view(request):
    """
    GET /api/miller-employees/driver/duties/
    List assigned deliveries for the authenticated driver.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    search_query = request.query_params.get("search")
    payment_method_filter = request.query_params.get("payment_method")
    sort_by = request.query_params.get("sort")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    vehicle = get_driver_assigned_vehicle(supplier_profile_id, driver_id)
    duties = get_driver_duties(
        supplier_profile_id=supplier_profile_id,
        driver_id=driver_id,
        search_query=search_query,
        payment_method_filter=payment_method_filter,
        sort_by=sort_by,
        start_date=start_date,
        end_date=end_date,
    )

    return Response(
        {
            "success": True,
            "vehicle": vehicle,
            "count": len(duties),
            "duties": duties,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@miller_driver_required
def driver_buyer_group_view(request):
    """
    GET /api/miller-employees/driver/live-tracking/group/?buyer_group_key=...
    Fetch details of a buyer group for the Live Tracking module.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id
    buyer_group_key = request.query_params.get("buyer_group_key")

    if not buyer_group_key:
        return Response(
            {"success": False, "message": "buyer_group_key parameter is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    buyer_group = get_buyer_group_for_tracking(supplier_profile_id, driver_id, buyer_group_key=buyer_group_key)
    if not buyer_group:
        return Response(
            {"success": False, "message": "No assigned deliveries found for this buyer group."},
            status=status.HTTP_404_NOT_FOUND,
        )

    assignment_ids = [o["assignment_id"] for o in buyer_group["orders"]]
    last_ping = get_last_ping_for_orders(supplier_profile_id, driver_id, assignment_ids)

    employee = request.grainrise_supplier_employee or {}
    driver_info = {
        "driver_id": driver_id,
        "first_name": employee.get("first_name", ""),
        "last_name": employee.get("last_name", ""),
        "business_name": employee.get("business_name", ""),
    }

    return Response(
        {
            "success": True,
            "buyer_group": buyer_group,
            "last_ping": last_ping,
            "driver_info": driver_info,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@miller_driver_required
def driver_live_tracking_start_view(request):
    """
    POST /api/miller-employees/driver/live-tracking/start/
    Start Live Tracking for a buyer group:
    - Sets order status = 'In transit'
    - Upserts last_ping ('inactive')
    - Sends delivery intro message (deduplicated)
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id
    owner_user_id = request.grainrise_owner_user_id
    employee = request.grainrise_supplier_employee or {}

    buyer_group_key = request.data.get("buyer_group_key")
    if not buyer_group_key:
        return Response(
            {"success": False, "message": "buyer_group_key is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")
    try:
        lat = float(latitude) if latitude is not None else None
        lng = float(longitude) if longitude is not None else None
    except (TypeError, ValueError):
        lat = None
        lng = None

    try:
        result = start_driver_live_tracking(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            buyer_group_key=buyer_group_key,
            latitude=lat,
            longitude=lng,
            driver_first_name=employee.get("first_name", ""),
            driver_last_name=employee.get("last_name", ""),
            company_name=employee.get("business_name", ""),
            owner_user_id=owner_user_id,
        )
        return Response(result, status=status.HTTP_200_OK)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to start live tracking: %s", e)
        return Response({"success": False, "message": "Failed to start live tracking."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_driver_required
def driver_live_tracking_ping_view(request):
    """
    POST /api/miller-employees/driver/live-tracking/ping/
    Record current GPS coordinates while in the Live Tracking module.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    assignment_ids = request.data.get("assignment_ids") or []
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    if not assignment_ids or latitude is None or longitude is None:
        return Response(
            {"success": False, "message": "assignment_ids, latitude, and longitude are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat = float(latitude)
        lng = float(longitude)
        asg_ids = [int(x) for x in assignment_ids]
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Invalid coordinates or assignment IDs."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = record_driver_live_ping(
        supplier_profile_id=supplier_profile_id,
        driver_id=driver_id,
        assignment_ids=asg_ids,
        latitude=lat,
        longitude=lng,
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_driver_required
def driver_live_tracking_exit_view(request):
    """
    POST /api/miller-employees/driver/live-tracking/exit/
    Driver leaves Live Tracking module:
    Sets last-ping status to 'active' so the buyer sees the saved last-known location.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    assignment_ids = request.data.get("assignment_ids") or []
    latitude = request.data.get("latitude")
    longitude = request.data.get("longitude")

    try:
        lat = float(latitude) if latitude is not None else None
        lng = float(longitude) if longitude is not None else None
        asg_ids = [int(x) for x in assignment_ids]
    except (TypeError, ValueError):
        lat = None
        lng = None
        asg_ids = []

    result = exit_driver_live_tracking(
        supplier_profile_id=supplier_profile_id,
        driver_id=driver_id,
        assignment_ids=asg_ids,
        latitude=lat,
        longitude=lng,
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_driver_required
def driver_delivery_complete_view(request):
    """
    POST /api/miller-employees/driver/delivery/complete/
    Mark as Delivered:
    - Validates proof of delivery and COD payment if applicable
    - Updates miller_online_customer to 'Delivered'
    - Updates miller_driver_assignment to 'Done'
    - Creates miller_online_customer_cash_on_delivery records with 'Handled' status
    - Stops live tracking session
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id
    employee = request.grainrise_supplier_employee or {}

    buyer_group_key = request.data.get("buyer_group_key")
    if not buyer_group_key:
        return Response(
            {"success": False, "message": "buyer_group_key is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proof_of_delivery_data = request.data.get("proof_of_delivery")
    cod_data = request.data.get("cod_data")
    target_order_ids = request.data.get("order_ids")
    single_order_id = request.data.get("order_id")
    if single_order_id and not target_order_ids:
        target_order_ids = [single_order_id]

    try:
        result = complete_driver_delivery(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            buyer_group_key=buyer_group_key,
            proof_of_delivery_data=proof_of_delivery_data,
            cod_data=cod_data,
            driver_employee=employee,
            order_ids=target_order_ids,
        )
        return Response(result, status=status.HTTP_200_OK)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to complete delivery: %s", e)
        return Response({"success": False, "message": "Failed to complete delivery."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_driver_required
def driver_messages_conversations_view(request):
    """
    GET /api/miller-employees/driver/messages/conversations/
    Retrieve assigned buyer conversations for the authenticated driver.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id
    try:
        conversations = get_driver_assigned_conversations(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
        )
        return Response({"success": True, "conversations": conversations}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Failed to load driver conversations: %s", e)
        return Response({"success": False, "message": "Failed to load conversations."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_driver_required
def driver_messages_thread_view(request):
    """
    GET /api/miller-employees/driver/messages/thread/?recipient_id=...&recipient_type=...
    Retrieve message history for a specific conversation and mark incoming messages as seen.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    recipient_id = request.query_params.get("recipient_id")
    recipient_type = request.query_params.get("recipient_type", "Retailer")

    if not recipient_id:
        return Response({"success": False, "message": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        thread_data = get_driver_conversation_thread(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            recipient_id=int(recipient_id),
            recipient_type=recipient_type,
        )
        return Response({"success": True, "thread": thread_data}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Failed to load driver thread: %s", e)
        return Response({"success": False, "message": "Failed to load message thread."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_driver_required
def driver_messages_send_view(request):
    """
    POST /api/miller-employees/driver/messages/send/
    Send message to assigned buyer. Strictly enforces active delivery assignment.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    recipient_id = request.data.get("recipient_id")
    recipient_type = request.data.get("recipient_type", "Retailer")
    content = request.data.get("message_content") or request.data.get("content")

    if not recipient_id:
        return Response({"success": False, "message": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        result = send_driver_message(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            recipient_id=int(recipient_id),
            recipient_type=recipient_type,
            content=content,
        )
        return Response(result, status=status.HTTP_201_CREATED)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to send driver message: %s", e)
        return Response({"success": False, "message": "Failed to send message."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_driver_required
def driver_payment_submissions_list_view(request):
    """
    GET /api/miller-employees/driver/payments/submissions/
    List COD payment collections for the authenticated driver.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    search_query = request.query_params.get("search")
    payment_method_filter = request.query_params.get("payment_method")
    status_filter = request.query_params.get("status")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    try:
        submissions = get_driver_payment_submissions(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            search_query=search_query,
            payment_method_filter=payment_method_filter,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
        )
        return Response(
            {
                "success": True,
                "submissions": submissions,
                "count": len(submissions),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Failed to load driver payment submissions: %s", e)
        return Response(
            {"success": False, "message": "Failed to load payment submissions."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_driver_required
def driver_payment_submit_view(request):
    """
    POST /api/miller-employees/driver/payments/submit/
    Submit collected COD payment for a transaction group.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    driver_id = request.grainrise_driver_id

    cod_transaction_key = request.data.get("cod_transaction_key")
    if not cod_transaction_key:
        return Response(
            {"success": False, "message": "cod_transaction_key is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = submit_driver_cod_payment(
            supplier_profile_id=supplier_profile_id,
            driver_id=driver_id,
            cod_transaction_key=cod_transaction_key,
        )
        return Response(result, status=status.HTTP_200_OK)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to submit driver COD payment: %s", e)
        return Response(
            {"success": False, "message": "Failed to submit payment."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_driver_required
def driver_reimbursement_submit_view(request):
    """
    POST /api/miller-employees/driver/reimbursements/submit/
    Submit a new reimbursement request for the authenticated Miller Driver.
    Strictly validates branch scoping, driver employee identity, expense categories,
    costs, non-future dates, description length, and attachment validity.
    """
    from api.miller_employees_function.miller_logistics.views import (
        _save_reimbursement_attachment,
    )
    from api.miller_employees_function.miller_finance.reimbursements.services import (
        submit_reimbursement_request,
    )

    supplier_profile_id = request.grainrise_supplier_profile_id
    employee_id = request.grainrise_supplier_employee_id

    # Handle multipart/form-data or JSON
    if request.content_type and "multipart/form-data" in request.content_type:
        category = request.POST.get("category", "").strip()
        custom_category = request.POST.get("custom_category", "").strip()
        cost_raw = request.POST.get("cost", "").strip()
        expense_date_raw = request.POST.get("expense_date", "").strip()
        description = request.POST.get("description", "").strip()
        title = request.POST.get("title", "").strip()
        file_obj = request.FILES.get("attachment") or request.FILES.get("file")
        base64_str = request.POST.get("attachment_base64", "").strip()
    else:
        body = request.data if hasattr(request, "data") else {}
        category = str(body.get("category", "")).strip()
        custom_category = str(body.get("custom_category", "")).strip()
        cost_raw = str(body.get("cost", "")).strip()
        expense_date_raw = str(body.get("expense_date", "")).strip()
        description = str(body.get("description", "")).strip()
        title = str(body.get("title", "")).strip()
        file_obj = None
        base64_str = str(body.get("attachment", "")).strip()

    valid_categories = [
        "Transportation & Travel",
        "Meals & Allowances",
        "Emergency",
        "Equipment & Repair",
        "Communication Expenses",
        "Logistics",
        "Office & Operating Supplies",
        "Others",
    ]
    if not category:
        return Response(
            {"success": False, "message": "Expense category is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if category not in valid_categories:
        return Response(
            {"success": False, "message": "Invalid expense category selected."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if category == "Others":
        if not custom_category:
            return Response(
                {"success": False, "message": "Please specify the custom category for 'Others'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        final_category = custom_category
    else:
        final_category = category

    # Cost validation: numbers only, max 2 decimals, > 0
    try:
        cost = float(cost_raw)
        if cost <= 0:
            return Response(
                {"success": False, "message": "Cost must be a positive number greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "." in cost_raw:
            parts = cost_raw.split(".")
            if len(parts) > 1 and len(parts[1]) > 2:
                return Response(
                    {"success": False, "message": "Cost can have at most two decimal places."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
    except (TypeError, ValueError):
        return Response(
            {"success": False, "message": "Please enter a valid numeric cost amount."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Expense Date validation: required, non-future
    if not expense_date_raw:
        return Response(
            {"success": False, "message": "Expense date is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Description validation: required, <= 1000 characters
    if not description:
        return Response(
            {"success": False, "message": "Description is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(description) > 1000:
        return Response(
            {"success": False, "message": "Description cannot exceed 1,000 characters."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Attachment validation & saving
    try:
        photo_url = _save_reimbursement_attachment(file_obj, base64_str, supplier_profile_id)
    except ValueError as e:
        return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    # Submit reimbursement request into database
    try:
        final_title = title or f"{final_category} Reimbursement"
        result = submit_reimbursement_request(
            supplier_profile_id=supplier_profile_id,
            requested_by_employee_id=employee_id,
            title=final_title,
            description=description,
            category=final_category,
            price=cost,
            photo_evidence=photo_url,
            expense_date=expense_date_raw,
        )
        return Response(
            {
                "success": True,
                "message": f"Reimbursement request {result.get('request_reference_no')} submitted successfully.",
                "reimbursement": result,
            },
            status=status.HTTP_201_CREATED,
        )
    except ValueError as e:
        return Response({"success": False, "message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Server error submitting driver reimbursement request: %s", e)
        return Response(
            {
                "success": False,
                "message": f"Server error submitting reimbursement request: {str(e)}",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

