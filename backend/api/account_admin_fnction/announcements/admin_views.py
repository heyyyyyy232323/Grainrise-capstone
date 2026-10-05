import json

import logging

import os

from django.core.cache import cache

from django.utils import timezone

from rest_framework import status

from rest_framework.decorators import api_view

from rest_framework.response import Response

from api.utils import require_admin

from .selectors import (

    get_announcement_by_id,

    list_announcement_drafts,

    list_admin_announcements,

    get_announcement_counts,

)

from .services import (

    create_announcement,

    update_announcement,

    save_as_draft,

    publish_announcement,

    publish_new_announcement,

    archive_announcement,

    reactivate_announcement,

)

from .climate_selectors import (

    ClimateLocationError,

    ClimateLocationNotFoundError,

    resolve_forecast_location,

    build_forecast_cache_key,

)

from .climate_service import (

    ClimateServiceError,

    ClimateDataUnavailableError,

    InvalidClimateAreaError,

    fetch_location_six_month_forecast,

)

from .ai_service import (

    AnnouncementAIError,

    InvalidAnnouncementAIInputError,

    prepare_article_generation,

    validate_generated_article,

)

from .announcement_moderation import (
    delete_admin_announcement,
    moderate_admin_announcement_comment,
    moderate_admin_announcement_reply,
    penalize_announcement_comment_author,
    penalize_announcement_reply_author,
)

logger = logging.getLogger(

    "grainrise.announcements.admin"

)

# ============================================================

# CONFIG

# ============================================================

FORECAST_CACHE_SECONDS = int(

    os.getenv(

        "GRAINRISE_CLIMATE_FORECAST_CACHE_SECONDS",

        str(60 * 60 * 6),

    )

)

# ============================================================

# RESPONSE HELPERS

# ============================================================

def _success(

    *,

    data=None,

    message=None,

    status_code=status.HTTP_200_OK,

):

    payload = {

        "success": True,

    }

    if message is not None:

        payload[

            "message"

        ] = message

    if data is not None:

        payload[

            "data"

        ] = data

    return Response(

        payload,

        status=status_code,

    )

def _error(

    detail,

    *,

    status_code=status.HTTP_400_BAD_REQUEST,

):

    return Response(

        {

            "success": False,

            "detail": str(

                detail

            ),

        },

        status=status_code,

    )

# ============================================================

# ADMIN AUTH

# ============================================================

def _is_admin(

    request,

):

    try:

        return bool(

            require_admin(

                request

            )

        )

    except Exception:

        logger.exception(

            (

                "Unable to validate "

                "announcement admin request."

            )

        )

        return False

def _require_admin_response(

    request,

):

    if _is_admin(

        request

    ):

        return None

    return _error(

        "Admin access is required.",

        status_code=

            status.HTTP_401_UNAUTHORIZED,

    )

# ============================================================

# REQUEST BODY

# ============================================================

def _request_data(

    request,

):

    data = request.data

    if isinstance(

        data,

        dict,

    ):

        return data

    try:

        return dict(

            data

        )

    except Exception:

        return {}

# ============================================================

# ANNOUNCEMENTS — LIST / CREATE

# ============================================================

@api_view(

    [

        "GET",

        "POST",

    ]

)

def admin_announcements(

    request,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    # --------------------------------------------------------

    # GET

    # --------------------------------------------------------

    if request.method == "GET":

        search = (

            request.query_params.get(

                "search",

                "",

            )

        )

        audience = (

            request.query_params.get(

                "audience",

                "",

            )

        )

        status_value = (

            request.query_params.get(

                "status",

                "",

            )

        )

        try:

            page = int(

                request.query_params.get(

                    "page",

                    1,

                )

            )

            page_size = int(

                request.query_params.get(

                    "page_size",

                    10,

                )

            )

        except (

            TypeError,

            ValueError,

        ):

            return _error(

                "Invalid pagination values."

            )

        try:

            result = (

                list_admin_announcements(

                    search=

                        search,

                    audience=

                        audience,

                    status_value=

                        status_value,

                    page=

                        page,

                    page_size=

                        page_size,

                )

            )

            return _success(

                data=

                    result

            )

        except Exception as exc:

            logger.exception(

                (

                    "Unable to list "

                    "announcements."

                )

            )

            return _error(

                str(

                    exc

                ),

                status_code=

                    status.HTTP_500_INTERNAL_SERVER_ERROR,

            )

    # --------------------------------------------------------

    # POST

    # --------------------------------------------------------

    data = (

        _request_data(

            request

        )

    )

    try:

        announcement = (

            create_announcement(

                title=

                    data.get(

                        "title"

                    ),

                audience=

                    data.get(

                        "audience"

                    ),

                content=

                    data.get(

                        "content"

                    ),

                image_url=

                    data.get(

                        "image_url"

                    ),

                publish=

                    bool(

                        data.get(

                            "publish",

                            False,

                        )

                    ),

            )

        )

        return _success(

            data=

                announcement,

            message=

                "Announcement created successfully.",

            status_code=

                status.HTTP_201_CREATED,

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to create "

                "announcement."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# ANNOUNCEMENT DETAIL / UPDATE

# ============================================================

@api_view(

    [

        "GET",

        "PUT",

        "PATCH",

    ]

)

def admin_announcement_detail(

    request,

    announcement_id,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    # --------------------------------------------------------

    # GET

    # --------------------------------------------------------

    if request.method == "GET":

        try:

            announcement = (

                get_announcement_by_id(

                    announcement_id

                )

            )

            if not announcement:

                return _error(

                    "Announcement not found.",

                    status_code=

                        status.HTTP_404_NOT_FOUND,

                )

            return _success(

                data=

                    announcement

            )

        except Exception as exc:

            logger.exception(

                (

                    "Unable to retrieve "

                    "announcement."

                )

            )

            return _error(

                str(

                    exc

                ),

                status_code=

                    status.HTTP_500_INTERNAL_SERVER_ERROR,

            )

    # --------------------------------------------------------

    # PUT / PATCH

    # --------------------------------------------------------

    data = (

        _request_data(

            request

        )

    )

    try:

        announcement = (

            update_announcement(

                announcement_id=

                    announcement_id,

                title=

                    data.get(

                        "title"

                    ),

                audience=

                    data.get(

                        "audience"

                    ),

                content=

                    data.get(

                        "content"

                    ),

                image_url=

                    data.get(

                        "image_url"

                    ),

            )

        )

        return _success(

            data=

                announcement,

            message=

                "Announcement updated successfully.",

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to update "

                "announcement."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# DRAFTS

# ============================================================

@api_view(

    [

        "GET",

    ]

)

def admin_announcement_drafts(

    request,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    search = (

        request.query_params.get(

            "search",

            "",

        )

    )

    try:

        drafts = (

            list_announcement_drafts(

                search=

                    search

            )

        )

        return _success(

            data=

                drafts

        )

    except Exception as exc:

        logger.exception(

            "Unable to retrieve drafts."

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# COUNTS

# ============================================================

@api_view(

    [

        "GET",

    ]

)

def admin_announcement_counts(

    request,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    try:

        counts = (

            get_announcement_counts()

        )

        return _success(

            data=

                counts

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to retrieve "

                "announcement counts."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# SAVE DRAFT

#

# announcement_id is optional.

#

# No ID:

#     create new draft

#

# With ID:

#     update existing draft

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_save_draft(

    request,

    announcement_id=None,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    data = (

        _request_data(

            request

        )

    )

    try:

        if announcement_id is None:

            announcement = (

                create_announcement(

                    title=

                        data.get(

                            "title"

                        ),

                    audience=

                        data.get(

                            "audience"

                        ),

                    content=

                        data.get(

                            "content"

                        ),

                    image_url=

                        data.get(

                            "image_url"

                        ),

                    publish=

                        False,

                )

            )

        else:

            announcement = (

                save_as_draft(

                    announcement_id=

                        announcement_id,

                    title=

                        data.get(

                            "title"

                        ),

                    audience=

                        data.get(

                            "audience"

                        ),

                    content=

                        data.get(

                            "content"

                        ),

                    image_url=

                        data.get(

                            "image_url"

                        ),

                )

            )

        return _success(

            data=

                announcement,

            message=

                "Announcement saved as draft.",

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to save "

                "announcement draft."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# PUBLISH

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_publish_announcement(

    request,

    announcement_id=None,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    data = (

        _request_data(

            request

        )

    )

    try:

        if announcement_id is None:

            announcement = (

                publish_new_announcement(

                    title=

                        data.get(

                            "title"

                        ),

                    audience=

                        data.get(

                            "audience"

                        ),

                    content=

                        data.get(

                            "content"

                        ),

                    image_url=

                        data.get(

                            "image_url"

                        ),

                )

            )

        else:

            announcement = (

                publish_announcement(

                    announcement_id=

                        announcement_id,

                    title=

                        data.get(

                            "title"

                        ),

                    audience=

                        data.get(

                            "audience"

                        ),

                    content=

                        data.get(

                            "content"

                        ),

                    image_url=

                        data.get(

                            "image_url"

                        ),

                )

            )

        return _success(

            data=

                announcement,

            message=

                "Announcement published successfully.",

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            "Unable to publish announcement."

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# ARCHIVE

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_archive_announcement(

    request,

    announcement_id,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    try:

        announcement = (

            archive_announcement(

                announcement_id

            )

        )

        return _success(

            data=

                announcement,

            message=

                "Announcement archived successfully.",

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to archive "

                "announcement."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# REACTIVATE

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_reactivate_announcement(

    request,

    announcement_id,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    try:

        announcement = (

            reactivate_announcement(

                announcement_id

            )

        )

        return _success(

            data=

                announcement,

            message=

                "Announcement reactivated successfully.",

        )

    except ValueError as exc:

        return _error(

            exc

        )

    except Exception as exc:

        logger.exception(

            (

                "Unable to reactivate "

                "announcement."

            )

        )

        return _error(

            str(

                exc

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# CLIMATE FORECAST

#

# POST BODY:

#

# {

#   "location": {

#       "country": "Philippines",

#       "country_code": "PH",

#       "province": "Bulacan",

#       "province_code": "...",

#       "city": "City of Malolos",

#       "city_code": "...",

#       "display_name":

#           "City of Malolos, Bulacan, Philippines"

#   }

# }

#

# FLOW:

#

# location

#   ↓

# geocode / resolve compact area

#   ↓

# forecast cache

#   ↓

# CDS if cache miss

#   ↓

# six-month lightweight JSON

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_climate_forecast(

    request,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    data = (

        _request_data(

            request

        )

    )

    location = data.get(

        "location"

    )

    if not location:

        return _error(

            (

                "Forecast location "

                "is required."

            )

        )

    try:

        # ----------------------------------------------------

        # RESOLVE PSGC LOCATION

        # ----------------------------------------------------

        resolved = (

            resolve_forecast_location(

                location

            )

        )

        resolved_location = (

            resolved[

                "location"

            ]

        )

        area = (

            resolved[

                "area"

            ]

        )

        # ----------------------------------------------------

        # CURRENT INITIALIZATION KEY

        #

        # Climate service still controls the actual CDS

        # initialization request.

        #

        # This key prevents repeated downloads for the same

        # city in the same initialization month.

        # ----------------------------------------------------

        now = (

            timezone.now()

        )

        cache_key = (

            build_forecast_cache_key(

                location=

                    resolved_location,

                initialization_year=

                    now.year,

                initialization_month=

                    now.month,

            )

        )

        # ----------------------------------------------------

        # FORECAST CACHE

        # ----------------------------------------------------

        try:

            cached_forecast = (

                cache.get(

                    cache_key

                )

            )

        except Exception:

            logger.warning(

                (

                    "Climate forecast cache "

                    "read failed."

                ),

                exc_info=True,

            )

            cached_forecast = None

        if isinstance(

            cached_forecast,

            dict,

        ):

            return _success(

                data=

                    cached_forecast,

                message=

                    (

                        "Climate forecast "

                        "loaded successfully."

                    ),

            )

        # ----------------------------------------------------

        # COPERNICUS CDS

        # ----------------------------------------------------

        forecast = (

            fetch_location_six_month_forecast(

                location=

                    resolved_location,

                area=

                    area,

            )

        )

        # ----------------------------------------------------

        # CACHE PROCESSED JSON ONLY

        #

        # No NetCDF is cached.

        # ----------------------------------------------------

        try:

            cache.set(

                cache_key,

                forecast,

                timeout=

                    FORECAST_CACHE_SECONDS,

            )

        except Exception:

            logger.warning(

                (

                    "Climate forecast cache "

                    "write failed."

                ),

                exc_info=True,

            )

        return _success(

            data=

                forecast,

            message=

                (

                    "Climate forecast "

                    "retrieved successfully."

                ),

        )

    except ClimateLocationNotFoundError as exc:

        return _error(

            exc,

            status_code=

                status.HTTP_404_NOT_FOUND,

        )

    except (

        ClimateLocationError,

        InvalidClimateAreaError,

    ) as exc:

        return _error(

            exc

        )

    except ClimateDataUnavailableError as exc:

        return _error(

            exc,

            status_code=

                status.HTTP_503_SERVICE_UNAVAILABLE,

        )

    except ClimateServiceError as exc:

        return _error(

            exc,

            status_code=

                status.HTTP_503_SERVICE_UNAVAILABLE,

        )

    except Exception as exc:

        logger.exception(

            (

                "Unexpected climate forecast "

                "endpoint failure."

            )

        )

        return _error(

            (

                "Unable to retrieve the "

                "climate forecast."

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================

# AI PROVIDER HOOK

#

# IMPORTANT:

#

# Intentionally NOT tied to OpenAI / Gemini / Groq yet.

#

# Antigravity should connect the project's chosen provider here

# or replace this helper with the existing GrainRise provider.

#

# Expected return:

#

# dict OR JSON string:

#

# {

#   "title": "...",

#   "content_html": "...",

#   "content_text": "...",

#   "climate_summary": "...",

#   "recommended_actions": [...],

#   "risk_topics": [...]

# }

# ============================================================

def _generate_with_article_ai_provider(
    *,
    system_instruction,
    user_prompt,
):
    import requests

    api_key = os.getenv("GRAINRISE_AI_API_KEY")
    endpoint = os.getenv("GRAINRISE_AI_ENDPOINT")
    model = os.getenv("GRAINRISE_AI_MODEL", "gemini-2.5-flash")
    fallback_models_str = os.getenv("GRAINRISE_AI_FALLBACK_MODELS", "")
    timeout = int(os.getenv("GRAINRISE_AI_TIMEOUT_SECONDS", "60"))

    if not api_key or not endpoint:
        raise AnnouncementAIError(
            "Announcement AI provider is not configured. "
            "Please configure GRAINRISE_AI_API_KEY and GRAINRISE_AI_ENDPOINT."
        )

    candidate_models = [model]
    if fallback_models_str:
        for fb in fallback_models_str.split(","):
            fb = fb.strip()
            if fb and fb not in candidate_models:
                candidate_models.append(fb)

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error = None
    for candidate_model in candidate_models:
        payload = {
            "model": candidate_model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.4,
        }

        try:
            response = requests.post(
                endpoint,
                headers=headers,
                json=payload,
                timeout=timeout,
            )

            if response.status_code == 200:
                result = response.json()
                choices = result.get("choices", [])
                if choices and "message" in choices[0]:
                    return choices[0]["message"].get("content", "")
                raise AnnouncementAIError("AI provider returned empty choices.")

            logger.warning(
                "AI provider model %s returned status %s: %s",
                candidate_model,
                response.status_code,
                response.text,
            )
            last_error = f"Status {response.status_code}: {response.text}"

        except requests.RequestException as exc:
            logger.warning(
                "AI provider model %s request failed: %s",
                candidate_model,
                exc,
            )
            last_error = str(exc)

    raise AnnouncementAIError(
        f"Announcement AI generation failed: {last_error}"
    )

# ============================================================

# PARSE PROVIDER RESPONSE

# ============================================================

def _parse_provider_response(

    provider_response,

):

    if isinstance(

        provider_response,

        dict,

    ):

        return provider_response

    if not isinstance(

        provider_response,

        str,

    ):

        raise AnnouncementAIError(

            (

                "AI provider returned "

                "an unsupported response."

            )

        )

    cleaned = (

        provider_response

        .strip()

    )

    # Defensive cleanup in case provider wraps JSON

    # inside Markdown code fences despite instructions.

    if cleaned.startswith(

        "```"

    ):

        cleaned = (

            cleaned

            .replace(

                "```json",

                "",

                1,

            )

            .replace(

                "```",

                "",

            )

            .strip()

        )

    try:

        return json.loads(

            cleaned

        )

    except json.JSONDecodeError as exc:

        raise AnnouncementAIError(

            (

                "AI provider did not return "

                "valid structured JSON."

            )

        ) from exc

# ============================================================

# GENERATE CLIMATE-INFORMED ARTICLE

#

# POST BODY:

#

# {

#   "location": {...},

#   "audience": "warehouse",

#   "range": 3,

#   "forecast": {...}

# }

#

# AI receives ONLY processed climate JSON.

#

# It NEVER receives:

# - NetCDF

# - CDS credentials

# - raw climate files

# ============================================================

@api_view(

    [

        "POST",

    ]

)

def admin_generate_climate_article(

    request,

):

    denied = (

        _require_admin_response(

            request

        )

    )

    if denied:

        return denied

    data = (

        _request_data(

            request

        )

    )

    forecast = data.get(

        "forecast"

    )

    location = data.get(

        "location"

    )

    audience = data.get(

        "audience"

    )

    range_months = (

        data.get(

            "range"

        )

        or data.get(

            "range_months"

        )

    )

    if not forecast:

        return _error(

            "Climate forecast is required."

        )

    if not location:

        return _error(

            "Forecast location is required."

        )

    if not audience:

        return _error(

            "Article audience is required."

        )

    if not range_months:

        return _error(

            (

                "Forecast range "

                "is required."

            )

        )

    try:

        # ----------------------------------------------------

        # PREPARE GROUNDED PROMPT

        # ----------------------------------------------------

        generation = (

            prepare_article_generation(

                forecast=

                    forecast,

                location=

                    location,

                audience=

                    audience,

                range_months=

                    range_months,

            )

        )

        # ----------------------------------------------------

        # AI PROVIDER

        #

        # Antigravity will connect actual GrainRise provider.

        # ----------------------------------------------------

        provider_response = (

            _generate_with_article_ai_provider(

                system_instruction=

                    generation[

                        "system_instruction"

                    ],

                user_prompt=

                    generation[

                        "user_prompt"

                    ],

            )

        )

        # ----------------------------------------------------

        # PARSE

        # ----------------------------------------------------

        parsed = (

            _parse_provider_response(

                provider_response

            )

        )

        # ----------------------------------------------------

        # VALIDATE

        # ----------------------------------------------------

        article = (

            validate_generated_article(

                parsed

            )

        )

        # ----------------------------------------------------

        # RESPONSE

        #

        # Grounding payload is useful for debugging /

        # traceability but raw climate files are never present.

        # ----------------------------------------------------

        response_data = {

            **article,

            "audience":

                audience,

            "range_months":

                int(

                    range_months

                ),

            "location":

                location,

            "grounding":

                generation[

                    "grounding_payload"

                ],

        }

        return _success(

            data=

                response_data,

            message=

                (

                    "Climate-informed article "

                    "generated successfully."

                ),

        )

    except InvalidAnnouncementAIInputError as exc:

        return _error(

            exc

        )

    except AnnouncementAIError as exc:

        logger.warning(

            (

                "Announcement AI generation "

                "could not be completed: %s"

            ),

            exc,

        )

        return _error(

            exc,

            status_code=

                status.HTTP_503_SERVICE_UNAVAILABLE,

        )

    except Exception:

        logger.exception(

            (

                "Unexpected announcement "

                "AI generation failure."

            )

        )

        return _error(

            (

                "Unable to generate the "

                "climate-informed article."

            ),

            status_code=

                status.HTTP_500_INTERNAL_SERVER_ERROR,

        )

# ============================================================
# ADMIN MANAGEMENT - DELETE ANNOUNCEMENT
# ============================================================

@api_view(["DELETE"])
def admin_delete_announcement(
    request,
    announcement_id,
):
    denied = _require_admin_response(
        request
    )

    if denied:
        return denied

    data = _request_data(
        request
    )

    reason = str(
        data.get(
            "reason",
            "",
        )
    ).strip()

    if not reason:
        return _error(
            "Reason for deletion is required.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        delete_admin_announcement(
            announcement_id,
            reason=reason,
        )

        return _success(
            message="Announcement deleted successfully."
        )

    except LookupError as exc:
        return _error(
            exc,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            exc,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception:
        logger.exception(
            "Unable to delete announcement."
        )

        return _error(
            "Unable to delete announcement.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ============================================================
# ADMIN MANAGEMENT - MODERATE ANNOUNCEMENT COMMENT
# ============================================================

@api_view(["PATCH"])
def admin_moderate_announcement_comment(
    request,
    comment_id,
):
    denied = _require_admin_response(
        request
    )

    if denied:
        return denied

    data = _request_data(
        request
    )

    try:
        result = moderate_admin_announcement_comment(
            comment_id,
            action=data.get("action"),
            reason=data.get("reason", ""),
        )

        return _success(
            data=result,
            message="Announcement comment moderation completed.",
        )

    except LookupError as exc:
        return _error(
            exc,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            exc,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception:
        logger.exception(
            "Unable to moderate announcement comment."
        )

        return _error(
            "Unable to moderate announcement comment.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ============================================================
# ADMIN MANAGEMENT - PENALIZE COMMENT AUTHOR
# ============================================================

@api_view(["POST"])
def admin_penalize_announcement_comment_author(
    request,
    comment_id,
):
    denied = _require_admin_response(
        request
    )

    if denied:
        return denied

    data = _request_data(
        request
    )

    reason = str(
        data.get(
            "reason",
            "",
        )
    ).strip()

    if not reason:
        return _error(
            "Reason for penalty is required.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = penalize_announcement_comment_author(
            comment_id,
            reason=reason,
        )

        return _success(
            data=result,
            message="The user has been penalized successfully.",
        )

    except LookupError as exc:
        return _error(
            exc,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            exc,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception:
        logger.exception(
            "Unable to penalize announcement commenter."
        )

        return _error(
            "Unable to penalize this user.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ============================================================
# ADMIN MANAGEMENT - MODERATE ANNOUNCEMENT REPLY
# ============================================================

@api_view(["PATCH"])
def admin_moderate_announcement_reply(
    request,
    reply_id,
):
    denied = _require_admin_response(
        request
    )

    if denied:
        return denied

    data = _request_data(
        request
    )

    try:
        result = moderate_admin_announcement_reply(
            reply_id,
            action=data.get("action"),
            reason=data.get("reason", ""),
        )

        return _success(
            data=result,
            message="Announcement reply moderation completed.",
        )

    except LookupError as exc:
        return _error(
            exc,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            exc,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception:
        logger.exception(
            "Unable to moderate announcement reply."
        )

        return _error(
            "Unable to moderate announcement reply.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

# ============================================================
# ADMIN MANAGEMENT - PENALIZE REPLY AUTHOR
# ============================================================

@api_view(["POST"])
def admin_penalize_announcement_reply_author(
    request,
    reply_id,
):
    denied = _require_admin_response(
        request
    )

    if denied:
        return denied

    data = _request_data(
        request
    )

    reason = str(
        data.get(
            "reason",
            "",
        )
    ).strip()

    if not reason:
        return _error(
            "Reason for penalty is required.",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = penalize_announcement_reply_author(
            reply_id,
            reason=reason,
        )

        return _success(
            data=result,
            message="The user has been penalized successfully.",
        )

    except LookupError as exc:
        return _error(
            exc,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            exc,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception:
        logger.exception(
            "Unable to penalize announcement reply author."
        )

        return _error(
            "Unable to penalize this user.",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
