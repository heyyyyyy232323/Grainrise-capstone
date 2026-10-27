import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ..admin_auth import account_admin_required
from .selectors import (
    get_profanity_by_id,
    get_supported_statuses,
    list_profanity_words,
)
from .services import (
    ProfanityNotFoundError,
    ProfanityValidationError,
    create_profanity_word,
    delete_profanity_word,
    update_profanity_word,
)

logger = logging.getLogger(__name__)


def _parse_json_body(request):
    """Safely extracts JSON from request.body."""
    if not request.body:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception as exc:
        raise ProfanityValidationError("Invalid JSON in request body.") from exc


# ============================================================
# LIST & CREATE VIEW
# ============================================================

@csrf_exempt
@account_admin_required
@require_http_methods(["GET", "POST"])
def profanity_list_create_view(request):
    """
    GET: List prohibited words with optional search & status filter.
    POST: Create a new prohibited word.
    """
    if request.method == "GET":
        search = request.GET.get("search", "").strip()
        status = request.GET.get("status", "").strip()

        words = list_profanity_words(
            search=search or None,
            status=status or None,
        )

        return JsonResponse(
            {
                "success": True,
                "data": words,
                "count": len(words),
                "supported_statuses": get_supported_statuses(),
            },
            status=200,
        )

    # POST: Add new prohibited word
    try:
        body = _parse_json_body(request)
        prohibited_text = body.get("prohibited_text", body.get("word"))
        status = body.get("status", "active")

        created = create_profanity_word(
            prohibited_text=prohibited_text,
            status=status,
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Prohibited word added successfully.",
                "data": created,
            },
            status=201,
        )

    except ProfanityValidationError as exc:
        return JsonResponse(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    except Exception as exc:
        logger.exception("Failed to create prohibited word: %s", exc)
        return JsonResponse(
            {
                "success": False,
                "message": "An error occurred while creating the prohibited word.",
            },
            status=500,
        )


# ============================================================
# DETAIL, UPDATE, DELETE VIEW
# ============================================================

@csrf_exempt
@account_admin_required
@require_http_methods(["GET", "PUT", "PATCH", "DELETE"])
def profanity_detail_view(request, profanity_id):
    """
    GET: Fetch a single prohibited word by ID.
    PUT/PATCH: Update prohibited word text and/or status.
    DELETE: Permanently delete prohibited word.
    """
    if request.method == "GET":
        record = get_profanity_by_id(profanity_id)
        if not record:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Prohibited word not found.",
                },
                status=404,
            )
        return JsonResponse(
            {
                "success": True,
                "data": record,
            },
            status=200,
        )

    if request.method in ("PUT", "PATCH"):
        try:
            body = _parse_json_body(request)
            prohibited_text = body.get("prohibited_text", body.get("word"))
            status = body.get("status")

            updated = update_profanity_word(
                profanity_id=profanity_id,
                prohibited_text=prohibited_text,
                status=status,
            )

            return JsonResponse(
                {
                    "success": True,
                    "message": "Prohibited word updated successfully.",
                    "data": updated,
                },
                status=200,
            )

        except ProfanityNotFoundError as exc:
            return JsonResponse(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=404,
            )
        except ProfanityValidationError as exc:
            return JsonResponse(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=400,
            )
        except Exception as exc:
            logger.exception("Failed to update prohibited word: %s", exc)
            return JsonResponse(
                {
                    "success": False,
                    "message": "An error occurred while updating the prohibited word.",
                },
                status=500,
            )

    if request.method == "DELETE":
        try:
            deleted = delete_profanity_word(profanity_id)
            return JsonResponse(
                {
                    "success": True,
                    "message": "Prohibited word deleted successfully.",
                    "data": deleted,
                },
                status=200,
            )
        except ProfanityNotFoundError as exc:
            return JsonResponse(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=404,
            )
        except Exception as exc:
            logger.exception("Failed to delete prohibited word: %s", exc)
            return JsonResponse(
                {
                    "success": False,
                    "message": "An error occurred while deleting the prohibited word.",
                },
                status=500,
            )


# ============================================================
# STATUSES VIEW
# ============================================================

@csrf_exempt
@account_admin_required
@require_http_methods(["GET"])
def profanity_statuses_view(request):
    """
    Returns the supported statuses for prohibited words.
    """
    return JsonResponse(
        {
            "success": True,
            "data": get_supported_statuses(),
        },
        status=200,
    )

