import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_manager_required
from .selectors import (
    list_warehouse_message_threads,
    get_warehouse_conversation,
)
from .services import (
    send_warehouse_message,
    get_active_profanity_list,
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@warehouse_manager_required
def warehouse_message_threads_view(request):
    """
    GET /api/warehouse/messages/threads/
    List conversation threads, available contacts, and owned branches for the authenticated Warehouse Manager.
    """
    warehouse_user_id = request.grainrise_warehouse_manager_id
    search = request.query_params.get("search", "")

    try:
        data = list_warehouse_message_threads(warehouse_user_id, search=search)
        return Response(
            {
                "success": True,
                "count": len(data["threads"]),
                "data": data["threads"],
                "branches": data.get("branches", []),
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list warehouse message threads: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load conversations.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def warehouse_message_conversation_view(request):
    """
    GET /api/warehouse/messages/conversation/
    Retrieve chat history between the Warehouse Manager and a specific participant.
    Marks incoming unread messages as seen.
    """
    warehouse_user_id = request.grainrise_warehouse_manager_id
    thread_id = request.query_params.get("thread_id")
    participant_type = request.query_params.get("participant_type")
    participant_id = request.query_params.get("participant_id")

    if not thread_id and (not participant_type or not participant_id):
        return Response(
            {
                "success": False,
                "message": "thread_id or (participant_type and participant_id) is required.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        data = get_warehouse_conversation(
            warehouse_user_id,
            thread_id=thread_id,
            participant_type=participant_type,
            participant_id=participant_id,
        )

        if data is None:
            return Response(
                {
                    "success": False,
                    "message": "Conversation participant was not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to retrieve warehouse conversation: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load conversation messages.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_manager_required
def warehouse_send_message_view(request):
    """
    POST /api/warehouse/messages/send/
    Send a message to a participant with mandatory server-side profanity validation.
    """
    warehouse_user_id = request.grainrise_warehouse_manager_id

    try:
        new_msg = send_warehouse_message(warehouse_user_id, request.data)
        if isinstance(new_msg, dict) and new_msg.get("blocked"):
            return Response(new_msg, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "success": True,
                "message": "Message sent successfully.",
                "data": new_msg,
            },
            status=status.HTTP_201_CREATED,
        )
    except ValueError as ve:
        return Response(
            {
                "success": False,
                "message": str(ve),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to send warehouse message: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to send message. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@warehouse_manager_required
def warehouse_active_profanity_view(request):
    """
    GET /api/warehouse/messages/active-profanity/
    Retrieve the current active prohibited terms from profanity_chat for instant client-side validation.
    """
    try:
        words = get_active_profanity_list()
        return Response(
            {
                "success": True,
                "count": len(words),
                "data": words,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to load active profanity terms: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load active profanity terms.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

