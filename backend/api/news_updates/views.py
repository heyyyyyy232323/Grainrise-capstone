from api.news_slug_utils import resolve_news_id, get_news_slug, resolve_announcement_id, get_announcement_slug
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
    edit_own_news_comment,
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
    extra=None,
):
    payload = {
        "success": False,
        "code": code,
        "message": message,
    }
    if extra:
        payload.update(extra)
    return Response(
        payload,
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
    from .services import ProfanityDetectedError
    if isinstance(exc, ProfanityDetectedError):
        return _error(
            str(exc),
            code="PROFANITY_DETECTED",
            http_status=status.HTTP_400_BAD_REQUEST,
            extra={
                "blocked": True,
                "detected_words": exc.detected_words,
                "matches": exc.matches,
            },
        )

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
    resolved_news_id = resolve_news_id(news_id)
    if not resolved_news_id:
        return _error("News article not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    news_id = resolved_news_id
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

        if article and isinstance(article, dict):
            article["slug"] = get_news_slug(article.get("news_id") or news_id)

        return _success(
            data={
                "article":
                    article,
                "slug":
                    article.get("slug") if isinstance(article, dict) else get_news_slug(news_id)
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
    resolved_news_id = resolve_news_id(news_id)
    if not resolved_news_id:
        return _error("News article not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    news_id = resolved_news_id
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
    resolved_news_id = resolve_news_id(news_id)
    if not resolved_news_id:
        return _error("News article not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    news_id = resolved_news_id
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

# ============================================================
# REPORT COMMENT
# ============================================================

@api_view(["POST"])
def report_news_comment(
    request,
    comment_id=None,
):
    """
    Report a comment or reply on News & Announcements.
    Supports authenticated reporter via grainrise_news_user_id or JWT token.
    Routes to miller_reports, warehouse_reports, or retailer_reports based on author's role.
    """
    from api.comment_reporting import get_authenticated_user_id, report_comment

    reporter_id = get_authenticated_user_id(request)
    if not reporter_id:
        return _error(
            "Authentication required to report comments.",
            code="unauthorized",
            http_status=status.HTTP_401_UNAUTHORIZED,
        )

    target_comment_id = comment_id or request.data.get("comment_id")
    if not target_comment_id:
        return _error(
            "Comment ID is required.",
            code="validation_error",
            http_status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get("reason")
    comment_type = request.data.get("comment_type")
    title = request.data.get("title")

    try:
        result = report_comment(
            reporter_id,
            comment_id=target_comment_id,
            reason=reason,
            comment_type=comment_type,
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
            http_status=status.HTTP_200_OK,
        )

    except LookupError as exc:
        return _error(
            str(exc),
            code="comment_not_found",
            http_status=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as exc:
        return _error(
            str(exc),
            code="validation_error",
            http_status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return _handle_exception(exc)


# ============================================================
# COMMENTING RESTRICTION STATUS
# ============================================================

@api_view(["GET"])
def commenting_restriction_status(request):
    """
    Check if the authenticated user has active commenting restrictions
    (3 pending issues in 24h, or 6 pending issues in 48h).
    """
    from api.comment_reporting import get_authenticated_user_id, check_user_commenting_restriction

    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error(
            "Authentication required.",
            code="unauthorized",
            http_status=status.HTTP_401_UNAUTHORIZED,
        )

    restriction = check_user_commenting_restriction(user_id)
    return _success(data=restriction)



# ============================================================
# EDIT / DELETE NEWS COMMENT
# ============================================================

@api_view(["PATCH", "DELETE"])
@news_main_user_required
def news_comment_detail(
    request,
    comment_id,
):
    user_id = request.grainrise_news_user_id

    if request.method == "DELETE":
        try:
            result = delete_own_news_comment(
                user_id,
                comment_id,
            )
            return _success(
                data=result,
                message="Comment deleted successfully." if result.get("deleted") else "Comment was already deleted.",
            )
        except Exception as exc:
            return _handle_exception(exc)

    # PATCH (Edit)
    try:
        new_text = request.data.get("comment_text") or request.data.get("comment_content")
        result = edit_own_news_comment(
            user_id,
            comment_id,
            new_text,
        )
        return _success(
            data=result,
            message="Comment edited successfully.",
        )
    except Exception as exc:
        return _handle_exception(exc)


# ============================================================
# PUBLIC NEWS ARTICLE DETAIL (NO AUTH REQUIRED)
# ============================================================

@api_view(["GET"])
def public_news_article(
    request,
    news_id,
):
    resolved_news_id = resolve_news_id(news_id)
    if not resolved_news_id:
        return _error("News article not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    news_id = resolved_news_id
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    na.news_id,
                    na.title,
                    na.description,
                    na.article_body,
                    na.article_url,
                    na.image_url,
                    na.source_name,
                    na.source_domain,
                    na.author,
                    na.category_code,
                    na.published_at,
                    na.status,
                    (SELECT COUNT(*) FROM news_reactions nr WHERE nr.news_id = na.news_id) AS reaction_count,
                    (SELECT COUNT(*) FROM news_comments nc WHERE nc.news_id = na.news_id AND nc.comment_status = 'active') AS comment_count
                FROM news_articles na
                WHERE na.news_id = %s AND na.status = 'active'
                LIMIT 1
                """,
                [news_id],
            )
            row = cursor.fetchone()

        if not row:
            return _error(
                "News article is unavailable.",
                code="news_not_found",
                http_status=status.HTTP_404_NOT_FOUND,
            )

        category_names = {
            "market_updates": "Market Updates",
            "advisory_best_practices": "Advisory & Best Practices",
            "grant_programs_support": "Grant Programs & Support",
            "weather_climate": "Weather & Climate",
            "policy_regulation": "Policy & Regulation",
            "supply_chain": "Supply Chain & Logistics",
            "general_agriculture": "General Agriculture",
        }

        category_code = row[9] or "general_agriculture"
        category_label = category_names.get(category_code, category_code.replace("_", " ").title())

        article = {
            "news_id": row[0],
            "slug": get_news_slug(row[0]),
            "title": row[1],
            "description": row[2],
            "article_body": row[3],
            "article_url": row[4],
            "image_url": row[5],
            "source_name": row[6],
            "source_domain": row[7],
            "author": row[8],
            "category_code": category_code,
            "category": category_label,
            "published_at": row[10].isoformat() if row[10] else None,
            "status": row[11],
            "reaction_count": row[12] or 0,
            "comment_count": row[13] or 0,
        }

        return _success(data={"article": article, "slug": get_news_slug(row[0])})

    except Exception as exc:
        return _handle_exception(exc)


# ============================================================
# COMBINED MILLER NEWS & UPDATES FEED
# Announcements FIRST, then News
# ============================================================

def _resolve_announcement_media_url(request, raw_url):
    if not raw_url:
        return ""
    val = str(raw_url).strip()
    if not val or val.lower() in ("null", "none", "undefined"):
        return ""
    if val.startswith(("http://", "https://", "data:", "blob:")):
        return val
    clean = val.lstrip("/")
    if not clean.startswith("media/"):
        clean = f"media/{clean}"
    rel_url = f"/{clean}"
    try:
        return request.build_absolute_uri(rel_url)
    except Exception:
        return rel_url

@api_view(["GET"])
def combined_news_feed(request):
    """
    Feed for Miller Manager:
    - Announcements FIRST (audience 'miller' or 'all', status 'active')
    - News articles (audience 'miller_manager', status 'active')
    - Search, Category, Date range, and Sort filters
    """
    from django.db import connection
    from api.comment_reporting import get_authenticated_user_id

    user_id = get_authenticated_user_id(request) or getattr(request, "grainrise_news_user_id", None) or 0

    search = (request.query_params.get("search") or "").strip()
    category = (request.query_params.get("category") or "").strip()
    start_date = (request.query_params.get("start_date") or "").strip()
    end_date = (request.query_params.get("end_date") or "").strip()
    sort_by = (request.query_params.get("sort") or "latest").strip().lower()

    if start_date and end_date and end_date < start_date:
        return _error(
            "End Date cannot precede Start Date.",
            code="invalid_date_range",
            http_status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        limit = int(request.query_params.get("limit", 20))
        offset = int(request.query_params.get("offset", 0))
    except (TypeError, ValueError):
        limit = 20
        offset = 0

    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    category_colors = {
        "market_updates": "bg-emerald-100 text-emerald-700 border border-emerald-200",
        "advisory_best_practices": "bg-blue-100 text-blue-700 border border-blue-200",
        "grant_programs_support": "bg-amber-100 text-amber-700 border border-amber-200",
        "weather_climate": "bg-cyan-100 text-cyan-700 border border-cyan-200",
        "policy_regulation": "bg-purple-100 text-purple-700 border border-purple-200",
        "supply_chain": "bg-orange-100 text-orange-700 border border-orange-200",
        "general_agriculture": "bg-green-100 text-green-700 border border-green-200",
        "announcement_admin": "bg-indigo-100 text-indigo-700 border border-indigo-200",
    }

    category_labels = {
        "market_updates": "Market Updates",
        "advisory_best_practices": "Advisory & Best Practices",
        "grant_programs_support": "Grant Programs & Support",
        "weather_climate": "Weather & Climate",
        "policy_regulation": "Policy & Regulation",
        "supply_chain": "Supply Chain & Logistics",
        "general_agriculture": "General Agriculture",
        "announcement_admin": "Announcement from the admin",
    }

    norm_cat = category.lower().replace(" ", "_")
    is_announcement_filter = norm_cat in ("announcement_from_the_admin", "announcement_admin", "announcement", "announcements")
    is_news_category_filter = norm_cat in category_labels and not is_announcement_filter

    items = []

    with connection.cursor() as cursor:
        # 1. FETCH ANNOUNCEMENTS (if not filtered strictly by a news-only category)
        if not is_news_category_filter:
            a_conditions = [
                "a.status = 'active'",
                "a.audience IN ('miller', 'all')",
            ]
            a_params = []

            if search:
                a_conditions.append("(LOWER(a.title) LIKE %s OR LOWER(a.content) LIKE %s)")
                a_params.extend([f"%{search.lower()}%", f"%{search.lower()}%"])

            if start_date:
                a_conditions.append("DATE(COALESCE(a.date_published, a.created_at)) >= %s")
                a_params.append(start_date)

            if end_date:
                a_conditions.append("DATE(COALESCE(a.date_published, a.created_at)) <= %s")
                a_params.append(end_date)

            a_where = "WHERE " + " AND ".join(a_conditions)
            a_query = f"""
                SELECT
                    a.announcement_id AS id,
                    'announcement' AS item_type,
                    a.title,
                    a.content AS description,
                    a.image_url,
                    'GrainRise Admin' AS source_name,
                    'announcement_admin' AS category_code,
                    'Announcement from the admin' AS category,
                    COALESCE(a.date_published, a.created_at) AS pub_date,
                    (SELECT COUNT(*) FROM announcement_likes al WHERE al.announcement_id = a.announcement_id) AS likes,
                    (
                        (SELECT COUNT(*) FROM announcement_comments ac WHERE ac.announcement_id = a.announcement_id AND ac.comment_status = 'active') +
                        (SELECT COUNT(*) FROM announcement_comment_replies acr WHERE acr.announcement_id = a.announcement_id AND acr.reply_status = 'active')
                    ) AS comments,
                    EXISTS (SELECT 1 FROM announcement_likes al WHERE al.announcement_id = a.announcement_id AND al.reactor_id = %s) AS is_liked
                FROM announcements a
                {a_where}
                ORDER BY a.announcement_id DESC
            """
            cursor.execute(a_query, [user_id, *a_params])
            for r in cursor.fetchall():
                pub_date_val = r[8]
                iso_date = pub_date_val.strftime("%Y-%m-%d") if pub_date_val else ""
                disp_date = pub_date_val.strftime("%B %d, %Y · %I:%M %p") if pub_date_val else ""
                items.append({
                    "id": r[0],
                    "feed_id": f"announcement-{r[0]}",
                    "slug": get_announcement_slug(r[0]),
                    "item_type": r[1],
                    "title": r[2],
                    "description": r[3] or "",
                    "image_url": _resolve_announcement_media_url(request, r[4]),
                    "source": r[5],
                    "category_code": r[6],
                    "category": r[7],
                    "category_color": category_colors.get("announcement_admin"),
                    "date": disp_date,
                    "isoDate": iso_date,
                    "likes": r[9] or 0,
                    "comments": r[10] or 0,
                    "is_liked": bool(r[11]),
                })

        # 2. FETCH NEWS ARTICLES (if not filtered strictly by announcement)
        if not is_announcement_filter:
            n_conditions = [
                "na.status = 'active'",
                "EXISTS (SELECT 1 FROM news_article_audiences naa WHERE naa.news_id = na.news_id AND naa.user_role = 'miller_manager')",
            ]
            n_params = []

            if search:
                n_conditions.append("(LOWER(na.title) LIKE %s OR LOWER(COALESCE(na.description, '')) LIKE %s OR LOWER(COALESCE(na.source_name, '')) LIKE %s)")
                pat = f"%{search.lower()}%"
                n_params.extend([pat, pat, pat])

            if is_news_category_filter:
                n_conditions.append("na.category_code = %s")
                n_params.append(norm_cat)

            if start_date:
                n_conditions.append("DATE(na.published_at) >= %s")
                n_params.append(start_date)

            if end_date:
                n_conditions.append("DATE(na.published_at) <= %s")
                n_params.append(end_date)

            n_where = "WHERE " + " AND ".join(n_conditions)
            n_query = f"""
                SELECT
                    na.news_id AS id,
                    'news' AS item_type,
                    na.title,
                    na.description,
                    na.image_url,
                    na.source_name,
                    na.category_code,
                    na.published_at,
                    (SELECT COUNT(*) FROM news_reactions nr WHERE nr.news_id = na.news_id) AS likes,
                    (SELECT COUNT(*) FROM news_comments nc WHERE nc.news_id = na.news_id AND nc.comment_status = 'active') AS comments,
                    EXISTS (SELECT 1 FROM news_reactions nr WHERE nr.news_id = na.news_id AND nr.user_id = %s) AS is_liked
                FROM news_articles na
                {n_where}
                ORDER BY na.published_at DESC, na.news_id DESC
            """
            cursor.execute(n_query, [user_id, *n_params])
            for r in cursor.fetchall():
                pub_date_val = r[7]
                iso_date = pub_date_val.strftime("%Y-%m-%d") if pub_date_val else ""
                disp_date = pub_date_val.strftime("%B %d, %Y · %I:%M %p") if pub_date_val else ""
                cat_code = r[6] or "general_agriculture"
                items.append({
                    "id": r[0],
                    "feed_id": f"news-{r[0]}",
                    "slug": get_news_slug(r[0]),
                    "item_type": r[1],
                    "title": r[2],
                    "description": r[3] or "",
                    "image_url": r[4] or "",
                    "source": r[5] or "GrainRise News",
                    "category_code": cat_code,
                    "category": category_labels.get(cat_code, cat_code.replace("_", " ").title()),
                    "category_color": category_colors.get(cat_code, category_colors["general_agriculture"]),
                    "date": disp_date,
                    "isoDate": iso_date,
                    "likes": r[8] or 0,
                    "comments": r[9] or 0,
                    "is_liked": bool(r[10]),
                })

    # Sort within announcements, then news (preserving Announcements FIRST)
    # If category is specific or all, announcements remain first unless user sorted purely by likes/comments
    if sort_by in ("most_liked", "most liked"):
        announcements = [it for it in items if it["item_type"] == "announcement"]
        news_items = [it for it in items if it["item_type"] == "news"]
        announcements.sort(key=lambda x: x["likes"], reverse=True)
        news_items.sort(key=lambda x: x["likes"], reverse=True)
        items = announcements + news_items
    elif sort_by in ("most_commented", "most commented"):
        announcements = [it for it in items if it["item_type"] == "announcement"]
        news_items = [it for it in items if it["item_type"] == "news"]
        announcements.sort(key=lambda x: x["comments"], reverse=True)
        news_items.sort(key=lambda x: x["comments"], reverse=True)
        items = announcements + news_items

    total_count = len(items)
    paginated_items = items[offset : offset + limit]

    return _success(
        data={
            "items": paginated_items,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "returned": len(paginated_items),
                "has_more": offset + len(paginated_items) < total_count,
            },
        }
    )
