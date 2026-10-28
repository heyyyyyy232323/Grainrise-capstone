import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.farmer_function.farmer_auth import farmer_required
from .selectors import (
    list_farmer_message_threads,
    get_farmer_conversation,
)
from .services import send_farmer_message

logger = logging.getLogger(__name__)


@require_http_methods(["GET"])
@farmer_required
def message_threads_view(request):
    """
    GET /api/farmer/messages/threads/
    List conversation threads for the authenticated Farmer.
    """
    farmer_user_id = request.farmer["user_id"]
    search = request.GET.get("search", "")

    try:
        threads = list_farmer_message_threads(farmer_user_id, search=search)
        return JsonResponse(
            {
                "success": True,
                "count": len(threads),
                "data": threads,
            },
            status=200,
        )
    except Exception as exc:
        logger.exception("Failed to list farmer message threads: %s", exc)
        return JsonResponse(
            {
                "success": False,
                "message": "Failed to load conversations.",
                "error": str(exc),
            },
            status=500,
        )


@require_http_methods(["GET"])
@farmer_required
def message_conversation_view(request):
    """
    GET /api/farmer/messages/conversation/
    Retrieve chat history between the Farmer and a specific participant.
    Also marks incoming unread messages as seen.
    """
    farmer_user_id = request.farmer["user_id"]
    thread_id = request.GET.get("thread_id")
    participant_type = request.GET.get("participant_type")
    participant_id = request.GET.get("participant_id")

    if not thread_id and (not participant_type or not participant_id):
        return JsonResponse(
            {
                "success": False,
                "message": "thread_id or (participant_type and participant_id) is required.",
            },
            status=400,
        )

    try:
        data = get_farmer_conversation(
            farmer_user_id,
            thread_id=thread_id,
            participant_type=participant_type,
            participant_id=participant_id,
        )

        if data is None:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Conversation participant was not found.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "data": data,
            },
            status=200,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve farmer conversation: %s", exc)
        return JsonResponse(
            {
                "success": False,
                "message": "Failed to load conversation messages.",
                "error": str(exc),
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["POST"])
@farmer_required
def send_message_view(request):
    """
    POST /api/farmer/messages/send/
    Send a message to a participant, with optional replied_to_message_id.
    """
    farmer_user_id = request.farmer["user_id"]

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        body = request.POST.dict()

    try:
        new_msg = send_farmer_message(farmer_user_id, body)
        if isinstance(new_msg, dict) and new_msg.get("blocked"):
            return JsonResponse(new_msg, status=400)

        return JsonResponse(
            {
                "success": True,
                "message": "Message sent successfully.",
                "data": new_msg,
            },
            status=201,
        )
    except ValueError as ve:
        return JsonResponse(
            {
                "success": False,
                "message": str(ve),
            },
            status=400,
        )
    except Exception as exc:
        logger.exception("Failed to send farmer message: %s", exc)
        return JsonResponse(
            {
                "success": False,
                "message": "Failed to send message. Please try again.",
                "error": str(exc),
            },
            status=500,
        )
