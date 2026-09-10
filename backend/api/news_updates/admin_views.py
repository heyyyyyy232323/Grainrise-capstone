import logging

from django.db import (
    close_old_connections,
    connection,
)

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.utils import require_admin

from .news_moderation import (
    delete_admin_news_article,
    get_admin_news_article_detail,
    list_admin_news_articles,
    moderate_admin_news_comment,
    penalize_news_comment_author,
    update_admin_news_article_status,
)

from .news_scheduler import (
    NEWS_SYNC_ADVISORY_LOCK_ID,
)

from .news_status import (
    get_news_sync_status,
)

from .sync_service import (
    run_newsdata_sync,
)


logger = logging.getLogger(
    "grainrise.news_admin"
)


# ============================================================
# RESPONSE HELPERS
# ============================================================

def _success(
    data=None,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }

    if message:
        payload["message"] = message

    if data is not None:
        payload["data"] = data

    return Response(
        payload,
        status=http_status,
    )


def _error(
    message,
    http_status=status.HTTP_400_BAD_REQUEST,
):
    return Response(
        {
            "success": False,
            "detail": str(message),
        },
        status=http_status,
    )


# ============================================================
# ADMIN AUTH
# ============================================================

def _require_news_admin(
    request,
):
    return require_admin(
        request
    )


# ============================================================
# ERROR HANDLER
# ============================================================

def _moderation_error(
    exc,
):
    if isinstance(
        exc,
        LookupError,
    ):
        return _error(
            str(exc),
            status.HTTP_404_NOT_FOUND,
        )

    if isinstance(
        exc,
        ValueError,
    ):
        return _error(
            str(exc),
            status.HTTP_400_BAD_REQUEST,
        )

    logger.exception(
        "News moderation operation failed."
    )

    return _error(
        (
            "Unable to complete the requested "
            "News & Updates operation."
        ),
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ============================================================
# NEWS SYNC LOCK
# ============================================================

def _try_acquire_news_sync_lock():
    close_old_connections()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                pg_try_advisory_lock(%s)
            """,
            [
                NEWS_SYNC_ADVISORY_LOCK_ID,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )


def _release_news_sync_lock():
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pg_advisory_unlock(%s)
                """,
                [
                    NEWS_SYNC_ADVISORY_LOCK_ID,
                ],
            )

    except Exception:
        logger.exception(
            (
                "Unable to release GrainRise "
                "News synchronization lock."
            )
        )

    finally:
        close_old_connections()


# ============================================================
# ADMIN SYNC STATUS
#
# DATABASE ONLY
# DOES NOT CONSUME NEWSDATA CREDITS
# ============================================================

@api_view(["GET"])
def admin_news_sync_status(
    request,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        return _success(
            data=
                get_news_sync_status()
        )

    except Exception:
        logger.exception(
            (
                "Unable to load GrainRise "
                "News synchronization status."
            )
        )

        return _error(
            (
                "Unable to load News & Updates "
                "synchronization status."
            ),
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# ============================================================
# FETCH LATEST NEWS
#
# IMPORTANT:
# THIS CONSUMES NEWSDATA API CREDITS.
# ============================================================

@api_view(["POST"])
def admin_fetch_latest_news(
    request,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        lock_acquired = (
            _try_acquire_news_sync_lock()
        )

    except Exception:
        logger.exception(
            (
                "Unable to acquire GrainRise "
                "News synchronization lock."
            )
        )

        return _error(
            (
                "Unable to start News & Updates "
                "synchronization."
            ),
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if not lock_acquired:
        return _error(
            (
                "News & Updates synchronization "
                "is already running."
            ),
            status.HTTP_409_CONFLICT,
        )

    try:
        sync_result = (
            run_newsdata_sync()
        )

        return _success(
            message=(
                "Latest news has been fetched successfully."
            ),
            data={
                "sync_result":
                    sync_result,

                "sync_status":
                    get_news_sync_status(),
            },
        )

    except Exception:
        logger.exception(
            (
                "Manual GrainRise NewsData "
                "synchronization failed."
            )
        )

        return _error(
            (
                "Unable to fetch the latest news. "
                "Please try again later."
            ),
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    finally:
        _release_news_sync_lock()


# ============================================================
# ADMIN NEWS ARTICLE LIST
#
# DATABASE ONLY
# ============================================================

@api_view(["GET"])
def admin_news_articles(
    request,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        data = (
            list_admin_news_articles(
                search=
                    request.query_params.get(
                        "search",
                        "",
                    ),

                category=
                    request.query_params.get(
                        "category",
                        "",
                    ),

                article_status=
                    request.query_params.get(
                        "status",
                        "",
                    ),

                page=
                    request.query_params.get(
                        "page",
                        1,
                    ),

                page_size=
                    request.query_params.get(
                        "page_size",
                        12,
                    ),
            )
        )

        return _success(
            data=data
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )


# ============================================================
# ADMIN NEWS ARTICLE DETAIL
#
# ARTICLE
# AUDIENCES
# REACTIONS
# COMMENTS / REPLIES
# ============================================================

@api_view(["GET"])
def admin_news_article_detail(
    request,
    news_id,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        data = (
            get_admin_news_article_detail(
                news_id
            )
        )

        return _success(
            data=data
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )


# ============================================================
# ARCHIVE / RESTORE ARTICLE
# ============================================================

@api_view(["PATCH"])
def admin_news_article_status(
    request,
    news_id,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        data = (
            update_admin_news_article_status(
                news_id,

                status_value=
                    request.data.get(
                        "status"
                    ),

                reason=
                    request.data.get(
                        "reason",
                        "",
                    ),
            )
        )

        return _success(
            message=(
                "News article status updated successfully."
            ),
            data=data,
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )


# ============================================================
# DELETE ARTICLE
# ============================================================

@api_view(["DELETE"])
def admin_news_article_delete(
    request,
    news_id,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        delete_admin_news_article(
            news_id,

            reason=
                request.data.get(
                    "reason",
                    "",
                ),
        )

        return _success(
            message=(
                "News article deleted successfully."
            )
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )


# ============================================================
# COMMENT MODERATION
#
# ACTIONS:
# hide
# restore
# delete
# ============================================================

@api_view(["PATCH"])
def admin_news_comment_moderate(
    request,
    comment_id,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        data = (
            moderate_admin_news_comment(
                comment_id,

                action=
                    request.data.get(
                        "action"
                    ),

                reason=
                    request.data.get(
                        "reason",
                        "",
                    ),
            )
        )

        return _success(
            message=(
                "News comment moderation completed."
            ),
            data=data,
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )


# ============================================================
# PENALIZE NEWS COMMENT AUTHOR
#
# IMPORTANT:
#
# - NO redirect to Management
# - stays inside News & Updates
# - reason is REQUIRED
# ============================================================

@api_view(["POST"])
def admin_news_comment_penalize(
    request,
    comment_id,
):
    if not _require_news_admin(
        request
    ):
        return _error(
            "Administrator authentication is required.",
            status.HTTP_401_UNAUTHORIZED,
        )

    try:
        reason = str(
            request.data.get(
                "reason",
                "",
            )
        ).strip()

        if not reason:
            return _error(
                "Reason for penalty is required.",
                status.HTTP_400_BAD_REQUEST,
            )

        data = (
            penalize_news_comment_author(
                comment_id,
                reason=reason,
            )
        )

        return _success(
            message=(
                "The user has been penalized successfully."
            ),
            data=data,
        )

    except Exception as exc:
        return _moderation_error(
            exc
        )