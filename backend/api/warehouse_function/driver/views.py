"""
API Views for Warehouse Driver - My Duties and Live Tracking.
Protected by @warehouse_driver_required.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_driver_required
from .selectors import (
    get_buyer_group_for_tracking,
    get_driver_assigned_conversations,
    get_driver_assigned_vehicle,
    get_driver_conversation_thread,
    get_driver_duties,
    get_driver_payment_submissions,
    get_last_ping_for_orders,
    list_warehouse_driver_fulfillment_history,
    list_warehouse_driver_fulfillment_variants,
    list_warehouse_driver_reimbursement_history,
    list_warehouse_driver_vehicle_assigned_history,
    get_warehouse_driver_reimbursement_categories,
)
from .services import (
    DriverDeliveryError,
    complete_driver_delivery,
    exit_driver_live_tracking,
    get_driver_requester_info,
    get_driver_typing_status,
    record_driver_live_ping,
    record_driver_typing,
    record_retailer_typing,
    save_driver_reimbursement_attachment,
    send_driver_message,
    start_driver_live_tracking,
    submit_driver_cod_payment,
    submit_driver_reimbursement_request,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@warehouse_driver_required
def driver_duties_list_view(request):
    """
    GET /api/warehouse-employees/driver/duties/
    List assigned deliveries for the authenticated warehouse driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    search_query = request.query_params.get("search")
    payment_method_filter = request.query_params.get("payment_method")
    sort_by = request.query_params.get("sort")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    vehicle = get_driver_assigned_vehicle(warehouse_profile_id, driver_id)
    duties = get_driver_duties(
        warehouse_profile_id=warehouse_profile_id,
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
@warehouse_driver_required
def driver_buyer_group_view(request):
    """
    GET /api/warehouse-employees/driver/live-tracking/group/?buyer_group_key=...
    Fetch details of a buyer group for the Live Tracking module.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id
    buyer_group_key = request.query_params.get("buyer_group_key")

    if not buyer_group_key:
        return Response(
            {"success": False, "message": "buyer_group_key parameter is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    buyer_group = get_buyer_group_for_tracking(warehouse_profile_id, driver_id, buyer_group_key=buyer_group_key)
    if not buyer_group:
        return Response(
            {"success": False, "message": "No assigned deliveries found for this buyer group."},
            status=status.HTTP_404_NOT_FOUND,
        )

    assignment_ids = [o["assignment_id"] for o in buyer_group["orders"]]
    last_ping = get_last_ping_for_orders(warehouse_profile_id, driver_id, assignment_ids)

    employee = getattr(request, "warehouse_driver_user", {}) or {}
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
@warehouse_driver_required
def driver_live_tracking_start_view(request):
    """
    POST /api/warehouse-employees/driver/live-tracking/start/
    Start Live Tracking for a buyer group:
    - Sets order status = 'In transit'
    - Upserts last_ping ('inactive')
    - Sends delivery intro message (deduplicated)
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id
    employee = getattr(request, "warehouse_driver_user", {}) or {}

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
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            buyer_group_key=buyer_group_key,
            latitude=lat,
            longitude=lng,
            driver_first_name=employee.get("first_name", ""),
            driver_last_name=employee.get("last_name", ""),
            company_name=employee.get("business_name", ""),
        )
        return Response(result, status=status.HTTP_200_OK)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to start warehouse live tracking: %s", e)
        return Response(
            {"success": False, "message": "Failed to start live tracking."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_driver_required
def driver_live_tracking_ping_view(request):
    """
    POST /api/warehouse-employees/driver/live-tracking/ping/
    Record current GPS coordinates while in the Live Tracking module.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
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
        warehouse_profile_id=warehouse_profile_id,
        driver_id=driver_id,
        assignment_ids=asg_ids,
        latitude=lat,
        longitude=lng,
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_driver_required
def driver_live_tracking_exit_view(request):
    """
    POST /api/warehouse-employees/driver/live-tracking/exit/
    Driver leaves Live Tracking module:
    Sets last-ping status to 'active' so the buyer sees the saved last-known location.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
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
        warehouse_profile_id=warehouse_profile_id,
        driver_id=driver_id,
        assignment_ids=asg_ids,
        latitude=lat,
        longitude=lng,
    )
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_driver_required
def driver_delivery_complete_view(request):
    """
    POST /api/warehouse-employees/driver/delivery/complete/
    Mark as Delivered:
    - Validates proof of delivery and COD payment if applicable
    - Updates warehouse_online_customer to 'Delivered'
    - Updates warehouse_driver_assignment to 'Done'
    - Creates warehouse_online_customer_cash_on_delivery records with 'Handled' status
    - Stops live tracking session
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id
    employee = getattr(request, "warehouse_driver_user", {}) or {}

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
            warehouse_profile_id=warehouse_profile_id,
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
        logger.exception("Failed to complete warehouse delivery: %s", e)
        return Response(
            {"success": False, "message": "Failed to complete delivery."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_messages_conversations_view(request):
    """
    GET /api/warehouse-employees/driver/messages/conversations/
    Retrieve assigned Retailer conversations for the authenticated warehouse driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id
    try:
        conversations = get_driver_assigned_conversations(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
        )
        return Response({"success": True, "conversations": conversations}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Failed to load warehouse driver conversations: %s", e)
        return Response(
            {"success": False, "message": "Failed to load conversations."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_messages_thread_view(request):
    """
    GET /api/warehouse-employees/driver/messages/thread/?recipient_id=...
    Retrieve message history for a specific conversation and mark incoming messages as seen.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    recipient_id = request.query_params.get("recipient_id")
    recipient_type = request.query_params.get("recipient_type", "Retailer")

    if not recipient_id:
        return Response(
            {"success": False, "message": "recipient_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        thread_data = get_driver_conversation_thread(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            recipient_id=int(recipient_id),
            recipient_type=recipient_type,
        )
        return Response({"success": True, "thread": thread_data}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Failed to load warehouse driver thread: %s", e)
        return Response(
            {"success": False, "message": "Failed to load message thread."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_driver_required
def driver_messages_send_view(request):
    """
    POST /api/warehouse-employees/driver/messages/send/
    Send message to assigned Retailer buyer. Strictly enforces active delivery assignment.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    recipient_id = request.data.get("recipient_id")
    recipient_type = request.data.get("recipient_type", "Retailer")
    content = request.data.get("message_content") or request.data.get("content")

    if not recipient_id:
        return Response(
            {"success": False, "message": "recipient_id is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = send_driver_message(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            recipient_id=int(recipient_id),
            recipient_type=recipient_type,
            content=content,
        )
        if isinstance(result, dict) and result.get("blocked"):
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to send warehouse driver message: %s", e)
        return Response(
            {"success": False, "message": "Failed to send message."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@warehouse_driver_required
def driver_messages_typing_view(request):
    """
    GET/POST /api/warehouse-employees/driver/messages/typing/
    Handle ephemeral typing indicators between warehouse driver and retailer.
    Never persisted to DB.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    if request.method == "GET":
        recipient_id = request.query_params.get("recipient_id")
        if not recipient_id:
            return Response({"success": False, "message": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        data = get_driver_typing_status(warehouse_profile_id, driver_id, int(recipient_id))
        return Response(data, status=status.HTTP_200_OK)

    # POST
    recipient_id = request.data.get("recipient_id")
    is_typing = bool(request.data.get("is_typing", False))
    sender_type = request.data.get("sender_type", "driver")

    if not recipient_id:
        return Response({"success": False, "message": "recipient_id is required."}, status=status.HTTP_400_BAD_REQUEST)

    if sender_type == "retailer":
        res = record_retailer_typing(int(recipient_id), warehouse_profile_id, is_typing)
    else:
        res = record_driver_typing(warehouse_profile_id, driver_id, int(recipient_id), is_typing)

    return Response(res, status=status.HTTP_200_OK)


@api_view(["GET"])
@warehouse_driver_required
def driver_payment_submissions_list_view(request):
    """
    GET /api/warehouse-employees/driver/payments/submissions/
    List COD payment collections for the authenticated warehouse driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    search_query = request.query_params.get("search")
    payment_method_filter = request.query_params.get("payment_method")
    status_filter = request.query_params.get("status")
    start_date = request.query_params.get("start_date")
    end_date = request.query_params.get("end_date")

    try:
        submissions = get_driver_payment_submissions(
            warehouse_profile_id=warehouse_profile_id,
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
        logger.exception("Failed to load warehouse driver payment submissions: %s", e)
        return Response(
            {"success": False, "message": "Failed to load payment submissions."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_driver_required
def driver_payment_submit_view(request):
    """
    POST /api/warehouse-employees/driver/payments/submit/
    Submit collected COD payment for a transaction group.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id

    cod_transaction_key = request.data.get("cod_transaction_key")
    if not cod_transaction_key:
        return Response(
            {"success": False, "message": "cod_transaction_key is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = submit_driver_cod_payment(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            cod_transaction_key=cod_transaction_key,
        )
        return Response(result, status=status.HTTP_200_OK)
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to submit warehouse driver COD payment: %s", e)
        return Response(
            {"success": False, "message": "Failed to submit payment."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_reimbursement_requester_view(request):
    """
    GET /api/warehouse-employees/driver/reimbursements/requester/
    Return the authenticated Warehouse Driver's full name and business branch info.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_employee_id = request.grainrise_warehouse_employee_id or request.grainrise_driver_id
    info = get_driver_requester_info(warehouse_profile_id, driver_employee_id)
    return Response({"success": True, **info}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_driver_required
def driver_reimbursement_submit_view(request):
    """
    POST /api/warehouse-employees/driver/reimbursements/submit/
    Submit a reimbursement request for the authenticated Warehouse Driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_employee_id = request.grainrise_warehouse_employee_id or request.grainrise_driver_id

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

    try:
        # Save attachment
        attachment_url = save_driver_reimbursement_attachment(
            file_obj=file_obj,
            base64_str=base64_str,
            warehouse_profile_id=warehouse_profile_id,
        )

        result = submit_driver_reimbursement_request(
            warehouse_profile_id=warehouse_profile_id,
            driver_employee_id=driver_employee_id,
            category=category,
            custom_category=custom_category,
            cost_raw=cost_raw,
            expense_date_raw=expense_date_raw,
            description=description,
            attachment_url=attachment_url,
            title=title,
        )
        return Response(
            {
                "success": True,
                "message": f"Reimbursement request {result.get('request_reference_no')} submitted successfully.",
                "reimbursement": result,
                "request_reference_no": result.get("request_reference_no"),
            },
            status=status.HTTP_201_CREATED,
        )
    except DriverDeliveryError as e:
        return Response({"success": False, "message": e.message}, status=e.status_code)
    except Exception as e:
        logger.exception("Failed to submit warehouse driver reimbursement request: %s", e)
        return Response(
            {"success": False, "message": f"Failed to submit reimbursement: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_fulfillment_history_view(request):
    """
    GET /api/warehouse-employees/driver/fulfillment-history/
    Retrieve fulfillment/receiving records strictly scoped to the authenticated warehouse driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id or request.grainrise_warehouse_employee_id

    search = request.query_params.get("search", "").strip()
    variant = request.query_params.get("variant", "all").strip()
    buyer_type = request.query_params.get("buyer_type", "all").strip()
    start_date = request.query_params.get("start_date", "").strip() or None
    end_date = request.query_params.get("end_date", "").strip() or None
    sort_by = request.query_params.get("sort", "").strip()

    if start_date and end_date and start_date > end_date:
        return Response(
            {"success": False, "message": "Start date cannot be after end date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        records = list_warehouse_driver_fulfillment_history(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            search=search,
            variant_filter=variant,
            buyer_type_filter=buyer_type,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return Response(
            {
                "success": True,
                "fulfillments": records,
                "total": len(records),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Error fetching warehouse driver fulfillment history: %s", e)
        return Response(
            {"success": False, "message": f"Failed to load fulfillment history: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_fulfillment_variants_view(request):
    """
    GET /api/warehouse-employees/driver/fulfillment-history/variants/
    Retrieve distinct variants associated with receiving/fulfillment records for this driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id or request.grainrise_warehouse_employee_id

    try:
        variants = list_warehouse_driver_fulfillment_variants(warehouse_profile_id, driver_id)
        return Response({"success": True, "variants": variants}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception("Error fetching warehouse driver fulfillment variants: %s", e)
        return Response(
            {"success": False, "message": f"Failed to load fulfillment variants: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_vehicle_assigned_history_view(request):
    """
    GET /api/warehouse-employees/driver/vehicle-assigned-history/
    Retrieve all vehicle assignment records belonging to the authenticated warehouse driver.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_driver_id or request.grainrise_warehouse_employee_id

    search = request.query_params.get("search", "").strip()
    status_filter = request.query_params.get("status", "all").strip()
    start_date = request.query_params.get("start_date", "").strip() or None
    end_date = request.query_params.get("end_date", "").strip() or None
    sort_by = request.query_params.get("sort", "date-desc").strip()

    if start_date and end_date and start_date > end_date:
        return Response(
            {"success": False, "message": "Start date cannot be after end date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        assignments = list_warehouse_driver_vehicle_assigned_history(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            search=search,
            status_filter=status_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return Response(
            {
                "success": True,
                "assignments": assignments,
                "total": len(assignments),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Error fetching warehouse driver vehicle assignment history: %s", e)
        return Response(
            {"success": False, "message": f"Failed to load vehicle assignment history: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_reimbursement_history_view(request):
    """
    GET /api/warehouse-employees/driver/reimbursements/history/
    List reimbursement history records for the authenticated Warehouse Driver.
    Strictly scoped to warehouse_profile_id and requested_by = driver_id.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    driver_id = request.grainrise_warehouse_employee_id or request.grainrise_driver_id

    search = request.query_params.get("search", "").strip() or None
    status_filter = request.query_params.get("status", "").strip() or None
    category_filter = request.query_params.get("category", "").strip() or None
    start_date = request.query_params.get("start_date", "").strip() or None
    end_date = request.query_params.get("end_date", "").strip() or None
    sort_by = request.query_params.get("sort_by", "").strip() or None

    if start_date and end_date and start_date > end_date:
        return Response(
            {"success": False, "message": "Start date cannot be after end date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        records = list_warehouse_driver_reimbursement_history(
            warehouse_profile_id=warehouse_profile_id,
            driver_id=driver_id,
            search=search,
            status_filter=status_filter,
            category_filter=category_filter,
            start_date=start_date,
            end_date=end_date,
            sort_by=sort_by,
        )
        return Response(
            {
                "success": True,
                "count": len(records),
                "data": records,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Error fetching warehouse driver reimbursement history: %s", e)
        return Response(
            {"success": False, "message": f"Failed to load reimbursement history: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_driver_required
def driver_reimbursement_categories_view(request):
    """
    GET /api/warehouse-employees/driver/reimbursements/categories/
    Get available reimbursement categories for the authenticated Warehouse Driver's branch.
    """
    warehouse_profile_id = request.grainrise_warehouse_profile_id
    try:
        categories = get_warehouse_driver_reimbursement_categories(warehouse_profile_id)
        return Response(
            {
                "success": True,
                "categories": categories,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        logger.exception("Error fetching warehouse driver reimbursement categories: %s", e)
        return Response(
            {"success": False, "message": f"Failed to load categories: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )




