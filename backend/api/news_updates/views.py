from django.db import (
    DatabaseError,
    IntegrityError,
)

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .news_auth import (
    news_main_user_required,
)

from .selectors import (
    count_news_feed,
    get_news_article_detail,
    get_news_comments,
    list_news_feed,
)

from .services import (
    add_news_comment,
    delete_own_news_comment,
    toggle_news_like,
)


# ============================================================
# RESPONSE HELPERS
# ============================================================

def _success(
    *,
    data=None,
    message=None,
    http_status=status.HTTP_200_OK,
):
    payload = {
        "success": True,
    }

    if message:
        payload[
            "message"
        ] = message

    if data is not None:
        payload[
            "data"
        ] = data

    return Response(
        payload,
        status=http_status,
    )


def _error(
    message,
    *,
    code="error",
    http_status=status.HTTP_400_BAD_REQUEST,
):
    return Response(
        {
            "success": False,
            "code": code,
            "message": message,
        },
        status=http_status,
    )


def _database_error_text(exc):
    cause = getattr(
        exc,
        "__cause__",
        None,
    )

    diagnostic = getattr(
        cause,
        "diag",
        None,
    )

    primary = getattr(
        diagnostic,
        "message_primary",
        None,
    )

    if primary:
        return str(
            primary
        ).strip()

    return str(
        exc
    ).strip()


# ============================================================
# ERROR HANDLER
# ============================================================

def _handle_exception(exc):
    if isinstance(
        exc,
        ValueError,
    ):
        return _error(
            str(exc),
            code="validation_error",
            http_status=(
                status.HTTP_400_BAD_REQUEST
            ),
        )

    if isinstance(
        exc,
        IntegrityError,
    ):
        return _error(
            (
                "The News & Updates action conflicts "
                "with the current data."
            ),
            code="data_conflict",
            http_status=(
                status.HTTP_409_CONFLICT
            ),
        )

    if isinstance(
        exc,
        DatabaseError,
    ):
        message = (
            _database_error_text(
                exc
            )
        )

        normalized = (
            message.lower()
        )

        if (
            "not available for this user role"
            in normalized
        ):
            return _error(
                (
                    "This news article is not "
                    "available for your account."
                ),
                code="news_not_available",
                http_status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        if (
            "news article does not exist"
            in normalized

            or

            "news article is unavailable"
            in normalized

            or

            "currently unavailable"
            in normalized
        ):
            return _error(
                "News article is unavailable.",
                code="news_not_found",
                http_status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        if (
            "cannot delete another user"
            in normalized
        ):
            return _error(
                (
                    "You can only delete your "
                    "own news comment."
                ),
                code="comment_forbidden",
                http_status=(
                    status.HTTP_403_FORBIDDEN
                ),
            )

        if (
            "news comment does not exist"
            in normalized

            or

            "parent news comment does not exist"
            in normalized
        ):
            return _error(
                "News comment is unavailable.",
                code="comment_not_found",
                http_status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        if (
            "comment cannot be empty"
            in normalized

            or

            "reply must belong"
            in normalized

            or

            "one level deep"
            in normalized

            or

            "unavailable comment"
            in normalized

            or

            "same grainrise role"
            in normalized

            or

            "same role"
            in normalized
        ):
            return _error(
                message,
                code="comment_validation_error",
                http_status=(
                    status.HTTP_400_BAD_REQUEST
                ),
            )

        return _error(
            (
                "News & Updates is temporarily "
                "unavailable. Please try again."
            ),
            code="database_error",
            http_status=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
        )

    return _error(
        (
            "An unexpected News & Updates "
            "error occurred."
        ),
        code="internal_error",
        http_status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
        ),
    )


# ============================================================
# PAGINATION
# ============================================================

def _pagination_values(request):
    try:
        limit = int(
            request.query_params.get(
                "limit",
                20,
            )
        )

        offset = int(
            request.query_params.get(
                "offset",
                0,
            )
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid pagination values."
        ) from exc

    return (
        min(
            max(limit, 1),
            100,
        ),
        max(
            offset,
            0,
        ),
    )


# ============================================================
# NEWS FEED
# ============================================================

@api_view(["GET"])
@news_main_user_required
def news_feed(request):
    user_id = (
        request.grainrise_news_user_id
    )

    try:
        (
            limit,
            offset,
        ) = _pagination_values(
            request
        )

        items = list_news_feed(
            user_id,

            search=
                request.query_params.get(
                    "search"
                ),

            category=
                request.query_params.get(
                    "category"
                ),

            year=
                request.query_params.get(
                    "year"
                ),

            month=
                request.query_params.get(
                    "month"
                ),

            sort_by=
                request.query_params.get(
                    "sort",
                    "latest",
                ),

            limit=limit,
            offset=offset,
        )

        total = count_news_feed(
            user_id,

            search=
                request.query_params.get(
                    "search"
                ),

            category=
                request.query_params.get(
                    "category"
                ),

            year=
                request.query_params.get(
                    "year"
                ),

            month=
                request.query_params.get(
                    "month"
                ),
        )

        return _success(
            data={
                "items": items,

                "pagination": {
                    "total": total,
                    "limit": limit,
                    "offset": offset,
                    "returned":
                        len(items),

                    "has_more":
                        (
                            offset
                            + len(items)
                            < total
                        ),
                },
            }
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# ARTICLE DETAIL
# ============================================================

@api_view(["GET"])
@news_main_user_required
def news_article_detail(
    request,
    news_id,
):
    user_id = (
        request.grainrise_news_user_id
    )

    try:
        article = (
            get_news_article_detail(
                user_id,
                news_id,
            )
        )

        if article is None:
            return _error(
                "News article is unavailable.",
                code="news_not_found",
                http_status=(
                    status.HTTP_404_NOT_FOUND
                ),
            )

        return _success(
            data={
                "article":
                    article
            }
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# LIKE / UNLIKE
# ============================================================

@api_view(["POST"])
@news_main_user_required
def news_reaction(
    request,
    news_id,
):
    try:
        result = toggle_news_like(
            request.grainrise_news_user_id,
            news_id,
        )

        return _success(
            data=result,
            message=(
                "News reaction updated."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# COMMENTS
# ============================================================

@api_view([
    "GET",
    "POST",
])
@news_main_user_required
def news_comments(
    request,
    news_id,
):
    user_id = (
        request.grainrise_news_user_id
    )

    try:
        # GET
        if request.method == "GET":
            (
                limit,
                offset,
            ) = _pagination_values(
                request
            )

            discussion = (
                get_news_comments(
                    user_id,
                    news_id,
                    limit=limit,
                    offset=offset,
                )
            )

            return _success(
                data=discussion
            )

        # POST
        result = (
            add_news_comment(
                user_id,
                news_id,

                request.data.get(
                    "comment_text"
                ),

                parent_comment_id=
                    request.data.get(
                        "parent_comment_id"
                    ),
            )
        )

        return _success(
            data=result,

            message=(
                "Comment posted successfully."
            ),

            http_status=(
                status.HTTP_201_CREATED
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )


# ============================================================
# DELETE OWN COMMENT
# ============================================================

@api_view(["DELETE"])
@news_main_user_required
def delete_news_comment(
    request,
    comment_id,
):
    try:
        result = (
            delete_own_news_comment(
                request.grainrise_news_user_id,
                comment_id,
            )
        )

        return _success(
            data=result,

            message=(
                "Comment deleted successfully."
                if result.get(
                    "deleted"
                )
                else
                "Comment was already deleted."
            ),
        )

    except Exception as exc:
        return _handle_exception(
            exc
        )