import hashlib
import json
import logging
import os
import threading

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

    ClimateQueueLimitExceededError,

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
    error_code=None,
):
    payload = {
        "success": False,
        "detail": str(
            detail
        ),
    }

    if error_code is not None:
        payload["error_code"] = str(error_code)

    return Response(
        payload,
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

_IN_FLIGHT_FORECASTS = {}
_IN_FLIGHT_FORECASTS_LOCK = threading.Lock()


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
            "Forecast location is required."
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
        # 1. FAST CACHE CHECK
        # ----------------------------------------------------
        try:
            cached_forecast = (
                cache.get(
                    cache_key
                )
            )
        except Exception:
            logger.warning(
                "Climate forecast cache read failed.",
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
                    "Climate forecast loaded successfully.",
            )

        # ----------------------------------------------------
        # 2. IN-FLIGHT DEDUPLICATION WITHIN PROCESS
        # Prevent concurrent identical requests from submitting
        # duplicate CDS retrieval jobs.
        # ----------------------------------------------------
        wait_event = None
        is_leader = False

        with _IN_FLIGHT_FORECASTS_LOCK:
            try:
                cached = cache.get(cache_key)
                if isinstance(cached, dict):
                    return _success(
                        data=cached,
                        message="Climate forecast loaded successfully.",
                    )
            except Exception:
                pass

            if cache_key in _IN_FLIGHT_FORECASTS:
                wait_event = _IN_FLIGHT_FORECASTS[cache_key]
            else:
                wait_event = threading.Event()
                _IN_FLIGHT_FORECASTS[cache_key] = wait_event
                is_leader = True

        if not is_leader and wait_event is not None:
            logger.info("Waiting for in-flight CDS forecast for %s...", cache_key)
            wait_event.wait(timeout=120)
            try:
                cached = cache.get(cache_key)
                if isinstance(cached, dict):
                    return _success(
                        data=cached,
                        message="Climate forecast loaded successfully.",
                    )
            except Exception:
                pass

        try:
            # ----------------------------------------------------
            # 3. COPERNICUS CDS (LEADER RETRIEVAL)
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
            # 4. CACHE PROCESSED JSON ONLY
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
                    "Climate forecast cache write failed.",
                    exc_info=True,
                )

            return _success(
                data=
                    forecast,
                message=
                    "Climate forecast retrieved successfully.",
            )

        finally:
            if is_leader:
                with _IN_FLIGHT_FORECASTS_LOCK:
                    _IN_FLIGHT_FORECASTS.pop(cache_key, None)
                    wait_event.set()

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

    except ClimateQueueLimitExceededError as exc:
        logger.warning(
            "Copernicus CDS queue limit reached: %s",
            exc,
        )
        return _error(
            "The Copernicus Climate Data Store queue is temporarily busy processing other requests. Please wait a moment and click Retry.",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="CDS_QUEUE_LIMIT_REACHED",
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

_LAST_WORKING_AI_MODEL = "gemini-3.6-flash"

def _generate_with_article_ai_provider(
    *,
    system_instruction,
    user_prompt,
):
    global _LAST_WORKING_AI_MODEL
    import json
    import urllib.request
    import urllib.error

    api_key = os.getenv("GRAINRISE_AI_API_KEY")
    endpoint = os.getenv("GRAINRISE_AI_ENDPOINT")
    model = os.getenv("GRAINRISE_AI_MODEL", "gemini-3.6-flash")
    fallback_models_str = os.getenv("GRAINRISE_AI_FALLBACK_MODELS", "")
    timeout = min(int(os.getenv("GRAINRISE_AI_TIMEOUT_SECONDS", "60")), 15)

    if not api_key or not endpoint:
        raise AnnouncementAIError(
            "Announcement AI provider is not configured. "
            "Please configure GRAINRISE_AI_API_KEY and GRAINRISE_AI_ENDPOINT."
        )

    candidate_models = []
    if _LAST_WORKING_AI_MODEL:
        candidate_models.append(_LAST_WORKING_AI_MODEL)
    if model and model not in candidate_models:
        candidate_models.append(model)
    if fallback_models_str:
        for fb in fallback_models_str.split(","):
            fb = fb.strip()
            if fb and fb not in candidate_models:
                candidate_models.append(fb)

    for safe_model in ["gemini-3.6-flash", "gemini-3.5-flash"]:
        if safe_model not in candidate_models:
            candidate_models.append(safe_model)

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
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                resp_bytes = response.read()
                result = json.loads(resp_bytes.decode("utf-8", errors="replace"))
                choices = result.get("choices", [])
                if choices and "message" in choices[0]:
                    _LAST_WORKING_AI_MODEL = candidate_model
                    logger.info("AI generation succeeded with model %s", candidate_model)
                    return choices[0]["message"].get("content", "")
                raise AnnouncementAIError("AI provider returned empty choices.")

        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")
            logger.warning(
                "AI provider model %s returned HTTP %s: %s",
                candidate_model,
                exc.code,
                err_body[:200],
            )
            last_error = f"HTTP {exc.code}: {err_body[:200]}"

        except Exception as exc:
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

    # --------------------------------------------------------
    # ARTICLE CACHE CHECK
    # --------------------------------------------------------
    loc_id = ""
    if isinstance(location, dict):
        loc_id = location.get("city_code") or location.get("display_name") or location.get("city") or ""
    else:
        loc_id = str(location or "")
    forecast_hash = hashlib.md5(json.dumps(forecast, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:12]
    article_cache_key = f"grainrise:article_ai:{loc_id}:{audience}:{range_months}:{forecast_hash}"

    try:
        cached_article = cache.get(article_cache_key)
        if isinstance(cached_article, dict):
            return _success(
                data=cached_article,
                message="Climate-informed article loaded successfully.",
            )
    except Exception:
        pass

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

        try:
            cache.set(article_cache_key, response_data, timeout=3600)
        except Exception:
            pass

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

# ============================================================
# REPORT ANNOUNCEMENT COMMENT
# ============================================================

@api_view(["POST"])
def report_announcement_comment_view(request, comment_id):
    from api.comment_reporting import get_authenticated_user_id, report_comment

    reporter_id = get_authenticated_user_id(request)
    if not reporter_id:
        return _error(
            "Authentication required to report comments.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    data = _request_data(request)
    reason = data.get("reason")
    title = data.get("title")

    try:
        result = report_comment(
            reporter_id,
            comment_id=comment_id,
            reason=reason,
            comment_type="announcement",
            title=title,
        )
        msg = (
            result.get("message")
            if result.get("already_reported")
            else "Comment report submitted successfully."
        )
        return _success(
            data=result,
            message=msg,
        )
    except LookupError as exc:
        return _error(exc, status_code=status.HTTP_404_NOT_FOUND)
    except ValueError as exc:
        return _error(exc, status_code=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception("Unable to report announcement comment.")
        return _error("Unable to submit report.", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# REPORT ANNOUNCEMENT REPLY
# ============================================================

@api_view(["POST"])
def report_announcement_reply_view(request, reply_id):
    from api.comment_reporting import get_authenticated_user_id, report_comment

    reporter_id = get_authenticated_user_id(request)
    if not reporter_id:
        return _error(
            "Authentication required to report replies.",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    data = _request_data(request)
    reason = data.get("reason")
    title = data.get("title")

    try:
        result = report_comment(
            reporter_id,
            comment_id=reply_id,
            reason=reason,
            comment_type="announcement_reply",
            title=title,
        )
        msg = (
            result.get("message")
            if result.get("already_reported")
            else "Reply report submitted successfully."
        )
        return _success(
            data=result,
            message=msg,
        )
    except LookupError as exc:
        return _error(exc, status_code=status.HTTP_404_NOT_FOUND)
    except ValueError as exc:
        return _error(exc, status_code=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception("Unable to report announcement reply.")
        return _error("Unable to submit report.", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

