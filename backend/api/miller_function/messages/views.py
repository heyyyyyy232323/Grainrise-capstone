import logging
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    list_miller_message_threads,
    get_miller_conversation,
)
from .services import send_miller_message

logger = logging.getLogger(__name__)


@api_view(["GET"])
@miller_manager_required
def message_threads_view(request):
    """
    GET /api/miller/messages/threads/
    List conversation threads and available contacts for the authenticated Miller Manager.
    """
    miller_user_id = request.grainrise_miller_id
    search = request.query_params.get("search", "")

    try:
        threads = list_miller_message_threads(miller_user_id, search=search)
        return Response(
            {
                "success": True,
                "count": len(threads),
                "data": threads,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list message threads: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load conversations.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_manager_required
def message_conversation_view(request):
    """
    GET /api/miller/messages/conversation/
    Retrieve chat history between the Miller Manager and a specific participant.
    Also marks incoming unread messages as seen.
    """
    miller_user_id = request.grainrise_miller_id
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
        data = get_miller_conversation(
            miller_user_id,
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
        logger.exception("Failed to retrieve conversation: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load conversation messages.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_manager_required
def send_message_view(request):
    """
    POST /api/miller/messages/send/
    Send a message to a participant, with optional replied_to_message_id.
    """
    miller_user_id = request.grainrise_miller_id

    try:
        new_msg = send_miller_message(miller_user_id, request.data)
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
        logger.exception("Failed to send message: %s", exc)
        return Response(
            {
                "success": False,
                "message": "Failed to send message. Please try again.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

