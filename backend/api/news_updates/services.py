from django.db import (
    connection,
    transaction,
)


ALLOWED_NEWS_AUDIENCE_ROLES = {
    "farmer",
    "miller_manager",
    "warehouse_manager",
    "retailer",
}


ALLOWED_NEWS_CATEGORIES = {
    "market_updates",
    "advisory_best_practices",
    "grant_programs_support",
    "weather_climate",
    "policy_regulation",
    "supply_chain",
    "general_agriculture",
}


# ============================================================
# NORMALIZERS
# ============================================================

def _positive_integer(
    value,
    label,
):
    try:
        value = int(value)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid {label}."
        ) from exc

    if value <= 0:
        raise ValueError(
            f"Invalid {label}."
        )

    return value


def _non_negative_integer(
    value,
    label,
    default=0,
):
    if value in (
        None,
        "",
    ):
        value = default

    try:
        value = int(value)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid {label}."
        ) from exc

    if value < 0:
        raise ValueError(
            f"{label} cannot be negative."
        )

    return value


def _required_text(
    value,
    label,
):
    value = str(
        value or ""
    ).strip()

    if not value:
        raise ValueError(
            f"{label} is required."
        )

    return value


def _optional_text(value):
    value = str(
        value or ""
    ).strip()

    return (
        value
        if value
        else None
    )


def _normalize_audience_roles(
    roles,
):
    if not roles:
        raise ValueError(
            "At least one news audience role is required."
        )

    result = []

    for role in roles:
        role = str(
            role or ""
        ).strip()

        if (
            role
            not in
            ALLOWED_NEWS_AUDIENCE_ROLES
        ):
            raise ValueError(
                (
                    "Invalid News & Updates "
                    f"audience role: {role}"
                )
            )

        if role not in result:
            result.append(role)

    return result


# ============================================================
# USER ROLE
# ============================================================

def _get_active_user_role(
    user_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                user_role

            FROM users

            WHERE
                user_id = %s
                AND status = 'active'

            LIMIT 1
            """,
            [user_id],
        )

        row = cursor.fetchone()

    if not row:
        raise ValueError(
            "Authenticated News user is unavailable."
        )

    role = str(
        row[0]
    )

    if (
        role
        not in
        ALLOWED_NEWS_AUDIENCE_ROLES
    ):
        raise ValueError(
            "This account cannot use News & Updates."
        )

    return role


# ============================================================
# TOGGLE LIKE
# ============================================================

def toggle_news_like(
    user_id,
    news_id,
):
    user_id = _positive_integer(
        user_id,
        "user ID",
    )

    news_id = _positive_integer(
        news_id,
        "news article ID",
    )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT reaction_id
                FROM news_reactions
                WHERE news_id = %s AND user_id = %s
                LIMIT 1
                """,
                [news_id, user_id],
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    DELETE FROM news_reactions
                    WHERE news_id = %s AND user_id = %s
                    """,
                    [news_id, user_id],
                )
                is_liked = False
            else:
                cursor.execute(
                    """
                    INSERT INTO news_reactions (
                        news_id,
                        user_id,
                        reaction_type
                    )
                    VALUES (%s, %s, 'like')
                    """,
                    [news_id, user_id],
                )
                is_liked = True

            cursor.execute(
                """
                SELECT COUNT(*)
                FROM news_reactions
                WHERE news_id = %s
                """,
                [news_id],
            )
            count_row = cursor.fetchone()
            reaction_count = int(count_row[0] or 0) if count_row else 0

    return {
        "is_liked": is_liked,
        "reaction_count": reaction_count,
    }


# ============================================================
# ADD COMMENT / REPLY
# ============================================================

def add_news_comment(
    user_id,
    news_id,
    comment_text,
    *,
    parent_comment_id=None,
):
    user_id = _positive_integer(
        user_id,
        "user ID",
    )

    news_id = _positive_integer(
        news_id,
        "news article ID",
    )

    comment_text = _required_text(
        comment_text,
        "Comment",
    )

    parent_id = None

    if parent_comment_id not in (
        None,
        "",
    ):
        parent_id = _positive_integer(
            parent_comment_id,
            "parent comment ID",
        )


    # ========================================================
    # SECOND-LAYER SAME-ROLE REPLY VALIDATION
    # ========================================================

    if parent_id is not None:
        current_role = (
            _get_active_user_role(
                user_id
            )
        )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    nc.news_id,
                    nc.parent_comment_id,
                    nc.comment_status,
                    u.user_role

                FROM news_comments nc

                INNER JOIN users u
                    ON u.user_id =
                        nc.user_id

                WHERE
                    nc.comment_id = %s

                LIMIT 1
                """,
                [parent_id],
            )

            parent = cursor.fetchone()

        if not parent:
            raise ValueError(
                "Parent news comment does not exist."
            )

        parent_news_id = int(
            parent[0]
        )

        parent_parent_id = (
            parent[1]
        )

        parent_status = str(
            parent[2]
        )

        parent_role = str(
            parent[3]
        )

        if (
            parent_news_id
            != news_id
        ):
            raise ValueError(
                "Reply must belong to the same news article."
            )

        if (
            parent_status
            != "active"
        ):
            raise ValueError(
                "Cannot reply to an unavailable comment."
            )

        if (
            parent_parent_id
            is not None
        ):
            raise ValueError(
                "Replies may only be one level deep."
            )

        if (
            parent_role
            != current_role
        ):
            raise ValueError(
                (
                    "You may only reply to comments "
                    "from the same GrainRise role."
                )
            )


    # ========================================================
    # SAVE THROUGH EXISTING DATABASE FUNCTION
    # ========================================================

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO news_comments (
                    news_id,
                    user_id,
                    comment_text,
                    parent_comment_id,
                    comment_status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    'active'
                )
                """,
                [
                    news_id,
                    user_id,
                    comment_text,
                    parent_id,
                ],
            )
            comment_id = cursor.lastrowid

    if not comment_id:
        raise RuntimeError(
            "Unable to save news comment."
        )

    return {
        "comment_id":
            int(comment_id)
    }


# ============================================================
# DELETE OWN COMMENT
# ============================================================

def delete_own_news_comment(
    user_id,
    comment_id,
):
    user_id = _positive_integer(
        user_id,
        "user ID",
    )

    comment_id = _positive_integer(
        comment_id,
        "comment ID",
    )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE news_comments
                SET
                    comment_status = 'deleted',
                    updated_at = CURRENT_TIMESTAMP(6)
                WHERE
                    comment_id = %s
                    AND user_id = %s
                    AND comment_status != 'deleted'
                """,
                [
                    comment_id,
                    user_id,
                ],
            )
            deleted = bool(cursor.rowcount > 0)

    if not deleted:
        raise RuntimeError(
            "Unable to delete news comment."
        )

    return {
        "deleted":
            deleted
    }


# ============================================================
# UPSERT ARTICLE
# ============================================================

def upsert_news_article(
    *,
    api_provider,
    external_article_id,
    title,
    article_url,
    source_name,
    published_at,
    category_code,
    audience_roles,
    description=None,
    article_body=None,
    image_url=None,
    source_domain=None,
    author=None,
    language_code=None,
    country_code=None,
):
    provider = _required_text(
        api_provider,
        "News API provider",
    ).lower()

    external_id = _required_text(
        external_article_id,
        "External article ID",
    )

    title = _required_text(
        title,
        "Article title",
    )

    article_url = _required_text(
        article_url,
        "Article URL",
    )

    source_name = _required_text(
        source_name,
        "Article source",
    )

    category = str(
        category_code or ""
    ).strip()

    if (
        category
        not in
        ALLOWED_NEWS_CATEGORIES
    ):
        raise ValueError(
            "Invalid GrainRise news category."
        )

    roles = _normalize_audience_roles(
        audience_roles
    )

    if published_at is None:
        raise ValueError(
            "Article publication date is required."
        )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT news_id
                FROM news_articles
                WHERE api_provider = %s AND external_article_id = %s
                LIMIT 1
                """,
                [provider, external_id],
            )
            existing = cursor.fetchone()

            if existing:
                news_id = int(existing[0])
                cursor.execute(
                    """
                    UPDATE news_articles
                    SET
                        title = %s,
                        article_url = %s,
                        source_name = %s,
                        published_at = %s,
                        category_code = %s,
                        description = COALESCE(%s, description),
                        article_body = COALESCE(%s, article_body),
                        image_url = COALESCE(%s, image_url),
                        source_domain = COALESCE(%s, source_domain),
                        author = COALESCE(%s, author),
                        language_code = COALESCE(%s, language_code),
                        country_code = COALESCE(%s, country_code),
                        last_fetched_at = CURRENT_TIMESTAMP(6),
                        updated_at = CURRENT_TIMESTAMP(6)
                    WHERE news_id = %s
                    """,
                    [
                        title,
                        article_url,
                        source_name,
                        published_at,
                        category,
                        _optional_text(description),
                        _optional_text(article_body),
                        _optional_text(image_url),
                        _optional_text(source_domain),
                        _optional_text(author),
                        _optional_text(language_code),
                        _optional_text(country_code),
                        news_id,
                    ],
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO news_articles (
                        api_provider,
                        external_article_id,
                        title,
                        article_url,
                        source_name,
                        published_at,
                        category_code,
                        description,
                        article_body,
                        image_url,
                        source_domain,
                        author,
                        language_code,
                        country_code,
                        status,
                        first_fetched_at,
                        last_fetched_at
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active',
                        CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)
                    )
                    """,
                    [
                        provider,
                        external_id,
                        title,
                        article_url,
                        source_name,
                        published_at,
                        category,
                        _optional_text(description),
                        _optional_text(article_body),
                        _optional_text(image_url),
                        _optional_text(source_domain),
                        _optional_text(author),
                        _optional_text(language_code),
                        _optional_text(country_code),
                    ],
                )
                news_id = cursor.lastrowid

            if roles:
                for role in roles:
                    cursor.execute(
                        """
                        INSERT IGNORE INTO news_article_audiences (
                            news_id,
                            user_role,
                            created_at
                        )
                        VALUES (%s, %s, CURRENT_TIMESTAMP(6))
                        """,
                        [news_id, role],
                    )

    if not news_id:
        raise RuntimeError(
            "Unable to save external news article."
        )

    return {
        "news_id":
            int(news_id)
    }


# ============================================================
# SYNC AUDIT
# ============================================================

def start_news_sync(
    api_provider,
):
    provider = _required_text(
        api_provider,
        "News API provider",
    ).lower()

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO news_sync_runs (
                    api_provider,
                    sync_status,
                    started_at
                )
                VALUES (
                    %s,
                    'running',
                    CURRENT_TIMESTAMP(6)
                )
                """,
                [provider],
            )
            sync_id = cursor.lastrowid

    if not sync_id:
        raise RuntimeError(
            "Unable to start news synchronization."
        )

    return int(
        sync_id
    )


def complete_news_sync(
    sync_id,
    *,
    request_count=0,
    articles_received=0,
    articles_processed=0,
    articles_failed=0,
):
    sync_id = _positive_integer(
        sync_id,
        "sync ID",
    )

    request_count = _non_negative_integer(
        request_count,
        "Request count",
    )

    articles_received = _non_negative_integer(
        articles_received,
        "Articles received",
    )

    articles_processed = _non_negative_integer(
        articles_processed,
        "Articles processed",
    )

    articles_failed = _non_negative_integer(
        articles_failed,
        "Articles failed",
    )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE news_sync_runs
                SET
                    sync_status = 'completed',
                    request_count = %s,
                    articles_received = %s,
                    articles_processed = %s,
                    articles_failed = %s,
                    completed_at = CURRENT_TIMESTAMP(6)
                WHERE
                    sync_id = %s
                """,
                [
                    request_count,
                    articles_received,
                    articles_processed,
                    articles_failed,
                    sync_id,
                ],
            )

    return {
        "sync_id": sync_id,
        "sync_status": "completed",
    }


def fail_news_sync(
    sync_id,
    error_message,
    *,
    request_count=0,
    articles_received=0,
    articles_processed=0,
    articles_failed=0,
):
    sync_id = _positive_integer(
        sync_id,
        "sync ID",
    )

    error_message = _required_text(
        error_message,
        "Synchronization error",
    )

    request_count = _non_negative_integer(
        request_count,
        "Request count",
    )

    articles_received = _non_negative_integer(
        articles_received,
        "Articles received",
    )

    articles_processed = _non_negative_integer(
        articles_processed,
        "Articles processed",
    )

    articles_failed = _non_negative_integer(
        articles_failed,
        "Articles failed",
    )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE news_sync_runs
                SET
                    sync_status = 'failed',
                    error_message = %s,
                    request_count = %s,
                    articles_received = %s,
                    articles_processed = %s,
                    articles_failed = %s,
                    completed_at = CURRENT_TIMESTAMP(6)
                WHERE
                    sync_id = %s
                """,
                [
                    error_message,
                    request_count,
                    articles_received,
                    articles_processed,
                    articles_failed,
                    sync_id,
                ],
            )

    return {
        "sync_id": sync_id,
        "sync_status": "failed",
    }