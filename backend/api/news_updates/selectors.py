from django.db import (
    connection,
    DatabaseError,
)


ALLOWED_NEWS_ROLES = {
    "farmer",
    "miller_manager",
    "warehouse_manager",
    "retailer",
}


# ============================================================
# RESULT HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def _row_to_dict(cursor):
    row = cursor.fetchone()

    if row is None:
        return None

    columns = [
        column[0]
        for column in cursor.description
    ]

    return dict(
        zip(columns, row)
    )


# ============================================================
# NORMALIZERS
# ============================================================

def _normalize_user_id(user_id):
    try:
        value = int(user_id)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid News & Updates session."
        ) from exc

    if value <= 0:
        raise ValueError(
            "Invalid News & Updates session."
        )

    return value


def _normalize_news_id(news_id):
    try:
        value = int(news_id)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid news article ID."
        ) from exc

    if value <= 0:
        raise ValueError(
            "Invalid news article ID."
        )

    return value


def _normalize_optional_text(value):
    value = str(
        value or ""
    ).strip()

    return (
        value
        if value
        else None
    )


def _normalize_optional_integer(
    value,
    label,
):
    if value in (
        None,
        "",
    ):
        return None

    try:
        return int(value)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid {label}."
        ) from exc


def _normalize_limit(
    value,
    default=20,
):
    try:
        value = int(
            value
            if value not in (
                None,
                "",
            )
            else default
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid pagination limit."
        ) from exc

    return min(
        max(value, 1),
        100,
    )


def _normalize_offset(value):
    try:
        value = int(
            value
            if value not in (
                None,
                "",
            )
            else 0
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid pagination offset."
        ) from exc

    return max(
        value,
        0,
    )


# ============================================================
# AUTHENTICATED MAIN USER ROLE
# ============================================================

def _get_user_role(user_id):
    user_id = _normalize_user_id(
        user_id
    )

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
        raise DatabaseError(
            "News & Updates user is unavailable."
        )

    role = str(
        row[0]
    ).strip()

    if role not in ALLOWED_NEWS_ROLES:
        raise DatabaseError(
            "News & Updates user role is unavailable."
        )

    return role


# ============================================================
# ARTICLE ACCESS
# ============================================================

def _validate_article_access(
    user_id,
    news_id,
):
    role = _get_user_role(
        user_id
    )

    news_id = _normalize_news_id(
        news_id
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                na.status,

                EXISTS (
                    SELECT 1

                    FROM news_article_audiences naa

                    WHERE
                        naa.news_id = na.news_id
                        AND naa.user_role IN (%s, 'all')
                )
                    AS has_audience

            FROM news_articles na

            WHERE
                na.news_id = %s

            LIMIT 1
            """,
            [
                role,
                news_id,
            ],
        )

        row = cursor.fetchone()

    if not row:
        raise DatabaseError(
            "News article does not exist."
        )

    article_status = row[0]
    has_audience = bool(
        row[1]
    )

    if article_status != "active":
        raise DatabaseError(
            "News article is currently unavailable."
        )

    if not has_audience:
        raise DatabaseError(
            "News article is not available for this user role."
        )

    return role


# ============================================================
# ROLE-SPECIFIC COMMENT COUNTS
# ============================================================

def _get_role_comment_counts(
    news_ids,
    role,
):
    news_ids = [
        int(news_id)
        for news_id in news_ids
        if news_id
    ]

    if not news_ids:
        return {}

    with connection.cursor() as cursor:
        placeholders = ", ".join(["%s"] * len(news_ids))
        cursor.execute(
            f"""
            SELECT
                nc.news_id,

                COALESCE(
                    SUM(
                        CASE
                            WHEN nc.comment_status = 'active'
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                    AS comment_count,

                COALESCE(
                    SUM(
                        CASE
                            WHEN nc.comment_status = 'active'
                                AND nc.parent_comment_id IS NULL
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                    AS root_comment_count,

                COALESCE(
                    SUM(
                        CASE
                            WHEN nc.comment_status = 'active'
                                AND nc.parent_comment_id IS NOT NULL
                            THEN 1
                            ELSE 0
                        END
                    ),
                    0
                )
                    AS reply_count

            FROM news_comments nc

            INNER JOIN users u
                ON u.user_id = nc.user_id

            WHERE
                nc.news_id IN ({placeholders})
                AND u.user_role = %s

            GROUP BY
                nc.news_id
            """,
            [
                *news_ids,
                role,
            ],
        )

        rows = cursor.fetchall()

    counts = {}

    for row in rows:
        counts[
            int(row[0])
        ] = {
            "comment_count":
                int(
                    row[1] or 0
                ),

            "root_comment_count":
                int(
                    row[2] or 0
                ),

            "reply_count":
                int(
                    row[3] or 0
                ),
        }

    return counts


# ============================================================
# FEED
# ============================================================

def list_news_feed(
    user_id,
    *,
    search=None,
    category=None,
    year=None,
    month=None,
    sort_by="latest",
    limit=20,
    offset=0,
):
    user_id = _normalize_user_id(
        user_id
    )

    role = _get_user_role(
        user_id
    )

    search = _normalize_optional_text(
        search
    )

    category = _normalize_optional_text(
        category
    )

    year = _normalize_optional_integer(
        year,
        "news year",
    )

    month = _normalize_optional_integer(
        month,
        "news month",
    )

    sort_by = str(
        sort_by or "latest"
    ).strip().lower()

    limit = _normalize_limit(
        limit
    )

    offset = _normalize_offset(
        offset
    )

    conditions = [
        "na.status = 'active'",
        "EXISTS (SELECT 1 FROM news_article_audiences naa WHERE naa.news_id = na.news_id AND naa.user_role = %s)",
    ]
    params = [role]

    if search:
        pattern = f"%{search}%"
        conditions.append(
            """
            (
                LOWER(COALESCE(na.title, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(na.description, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(na.source_name, '')) LIKE LOWER(%s)
            )
            """
        )
        params.extend([pattern, pattern, pattern])

    if category:
        conditions.append("na.category_code = %s")
        params.append(category)

    if year is not None:
        conditions.append("YEAR(na.published_at) = %s")
        params.append(year)

    if month is not None:
        conditions.append("MONTH(na.published_at) = %s")
        params.append(month)

    where_sql = "WHERE " + " AND ".join(conditions)

    if sort_by == "popular":
        order_sql = "ORDER BY reaction_count DESC, (na.published_at IS NULL) ASC, na.published_at DESC, na.news_id DESC"
    else:
        order_sql = "ORDER BY (na.published_at IS NULL) ASC, na.published_at DESC, na.news_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                na.news_id,
                na.title,
                na.description,
                na.article_url,
                na.image_url,
                na.source_name,
                na.source_domain,
                na.author,
                na.category_code,
                na.published_at,
                na.status,
                (SELECT COUNT(*) FROM news_reactions nr WHERE nr.news_id = na.news_id) AS reaction_count,
                0 AS comment_count,
                0 AS root_comment_count,
                0 AS reply_count,
                EXISTS (
                    SELECT 1 FROM news_reactions nr
                    WHERE nr.news_id = na.news_id AND nr.user_id = %s
                ) AS has_liked,
                EXISTS (
                    SELECT 1 FROM news_reactions nr
                    WHERE nr.news_id = na.news_id AND nr.user_id = %s
                ) AS is_liked,
                na.first_fetched_at,
                na.last_fetched_at
            FROM
                news_articles na
            {where_sql}
            {order_sql}
            LIMIT %s
            OFFSET %s
            """,
            [
                user_id,
                user_id,
                *params,
                limit,
                offset,
            ],
        )

        items = _rows_to_dicts(
            cursor
        )

    # --------------------------------------------------------
    # Override old/global DB comment counts.
    # Main users only see counts from their own role.
    # --------------------------------------------------------

    counts = _get_role_comment_counts(
        [
            item.get(
                "news_id"
            )
            for item in items
        ],
        role,
    )

    for item in items:
        news_id = int(
            item["news_id"]
        )

        role_counts = counts.get(
            news_id,
            {
                "comment_count": 0,
                "root_comment_count": 0,
                "reply_count": 0,
            },
        )

        item.update(
            role_counts
        )

    return items


# ============================================================
# FEED COUNT
# ============================================================

def count_news_feed(
    user_id,
    *,
    search=None,
    category=None,
    year=None,
    month=None,
):
    user_id = _normalize_user_id(
        user_id
    )

    search = _normalize_optional_text(
        search
    )

    category = _normalize_optional_text(
        category
    )

    year = _normalize_optional_integer(
        year,
        "news year",
    )

    month = _normalize_optional_integer(
        month,
        "news month",
    )

    role = _get_user_role(
        user_id
    )

    conditions = [
        "na.status = 'active'",
        "EXISTS (SELECT 1 FROM news_article_audiences naa WHERE naa.news_id = na.news_id AND naa.user_role = %s)",
    ]
    params = [role]

    if search:
        pattern = f"%{search}%"
        conditions.append(
            """
            (
                LOWER(COALESCE(na.title, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(na.description, '')) LIKE LOWER(%s)
                OR LOWER(COALESCE(na.source_name, '')) LIKE LOWER(%s)
            )
            """
        )
        params.extend([pattern, pattern, pattern])

    if category:
        conditions.append("na.category_code = %s")
        params.append(category)

    if year is not None:
        conditions.append("YEAR(na.published_at) = %s")
        params.append(year)

    if month is not None:
        conditions.append("MONTH(na.published_at) = %s")
        params.append(month)

    where_sql = "WHERE " + " AND ".join(conditions)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT COUNT(*)
            FROM news_articles na
            {where_sql}
            """,
            params,
        )

        row = cursor.fetchone()

    return int(
        row[0] or 0
    ) if row else 0


# ============================================================
# ARTICLE DETAIL
# ============================================================

def get_news_article_detail(
    user_id,
    news_id,
):
    user_id = _normalize_user_id(
        user_id
    )

    news_id = _normalize_news_id(
        news_id
    )

    role = _validate_article_access(
        user_id,
        news_id,
    )

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
                na.first_fetched_at,
                na.last_fetched_at,
                na.status,
                (SELECT COUNT(*) FROM news_reactions nr WHERE nr.news_id = na.news_id)
                    AS reaction_count,
                0 AS comment_count,
                0 AS root_comment_count,
                0 AS reply_count,
                EXISTS (
                    SELECT 1 FROM news_reactions nr
                    WHERE nr.news_id = na.news_id AND nr.user_id = %s
                ) AS has_liked,
                EXISTS (
                    SELECT 1 FROM news_reactions nr
                    WHERE nr.news_id = na.news_id AND nr.user_id = %s
                ) AS is_liked
            FROM news_articles na
            WHERE na.news_id = %s
            LIMIT 1
            """,
            [
                user_id,
                user_id,
                news_id,
            ],
        )

        article = _row_to_dict(
            cursor
        )

    if article is None:
        return None

    counts = _get_role_comment_counts(
        [news_id],
        role,
    ).get(
        news_id,
        {
            "comment_count": 0,
            "root_comment_count": 0,
            "reply_count": 0,
        },
    )

    article.update(
        counts
    )

    return article


# ============================================================
# ROLE-SEPARATED COMMENTS / REPLIES
#
# IMPORTANT:
#
# We intentionally read directly from:
#
#   news_comments
#   users
#
# instead of relying on the old JSON-returning database
# function.
#
# Farmer    -> Farmer only
# Retailer  -> Retailer only
# Miller    -> Miller only
# Warehouse -> Warehouse only
# ============================================================

def get_news_comments(
    user_id,
    news_id,
    *,
    limit=20,
    offset=0,
):
    user_id = _normalize_user_id(
        user_id
    )

    news_id = _normalize_news_id(
        news_id
    )

    limit = _normalize_limit(
        limit
    )

    offset = _normalize_offset(
        offset
    )

    role = _validate_article_access(
        user_id,
        news_id,
    )


    # ========================================================
    # TOTAL VISIBLE ROOT THREADS
    #
    # hidden = not visible
    # deleted = kept so active replies retain their hierarchy
    # ========================================================

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*)

            FROM news_comments nc

            INNER JOIN users u
                ON u.user_id = nc.user_id

            WHERE
                nc.news_id = %s
                AND nc.parent_comment_id IS NULL
                AND u.user_role = %s
                AND nc.comment_status <> 'hidden'
            """,
            [
                news_id,
                role,
            ],
        )

        total_root_comments = int(
            cursor.fetchone()[0] or 0
        )


    # ========================================================
    # SELECT PAGINATED ROOT COMMENTS
    # ========================================================

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                nc.comment_id

            FROM news_comments nc

            INNER JOIN users u
                ON u.user_id = nc.user_id

            WHERE
                nc.news_id = %s
                AND nc.parent_comment_id IS NULL
                AND u.user_role = %s
                AND nc.comment_status <> 'hidden'

            ORDER BY
                nc.created_at DESC,
                nc.comment_id DESC

            LIMIT %s
            OFFSET %s
            """,
            [
                news_id,
                role,
                limit,
                offset,
            ],
        )

        root_ids = [
            int(row[0])
            for row in cursor.fetchall()
        ]


    if not root_ids:
        return {
            "news_id": news_id,
            "user_role": role,
            "total_root_comments":
                total_root_comments,
            "limit": limit,
            "offset": offset,
            "has_more": (
                offset
                + limit
                < total_root_comments
            ),
            "comments": [],
        }


    # ========================================================
    # FETCH ROOT COMMENTS + THEIR REPLIES
    #
    # Role filter is applied AGAIN to replies.
    # ========================================================

    with connection.cursor() as cursor:
        placeholders = ", ".join(["%s"] * len(root_ids))
        cursor.execute(
            f"""
            SELECT
                nc.comment_id,
                nc.news_id,
                nc.user_id,
                nc.parent_comment_id,

                CASE
                    WHEN nc.parent_comment_id IS NULL
                        THEN 'comment'
                    ELSE 'reply'
                END
                    AS comment_type,

                CASE
                    WHEN nc.comment_status = 'deleted'
                        THEN '[deleted]'
                    ELSE nc.comment_text
                END
                    AS comment_text,

                nc.comment_status
                    AS comment_status,

                nc.created_at,
                nc.updated_at,

                CONCAT_WS(
                    ' ',
                    NULLIF(TRIM(u.first_name), ''),
                    NULLIF(TRIM(u.middle_initial), ''),
                    NULLIF(TRIM(u.last_name), ''),
                    NULLIF(TRIM(u.suffix), '')
                )
                    AS author_name,

                u.user_role
                    AS author_role,

                u.status
                    AS user_status,

                (
                    nc.user_id = %s
                )
                    AS is_mine

            FROM news_comments nc

            INNER JOIN users u
                ON u.user_id = nc.user_id

            WHERE
                nc.news_id = %s

                AND (
                    nc.comment_id IN ({placeholders})
                    OR
                    nc.parent_comment_id IN ({placeholders})
                )

                AND u.user_role = %s
                AND nc.comment_status <> 'hidden'

            ORDER BY
                nc.created_at ASC,
                nc.comment_id ASC
            """,
            [
                user_id,
                news_id,
                *root_ids,
                *root_ids,
                role,
            ],
        )

        rows = _rows_to_dicts(
            cursor
        )


    # ========================================================
    # BUILD THREAD HIERARCHY
    # ========================================================

    root_map = {}

    for row in rows:
        if (
            row.get(
                "parent_comment_id"
            )
            is None
        ):
            row["replies"] = []
            row["reply_count"] = 0

            root_map[
                int(
                    row["comment_id"]
                )
            ] = row


    for row in rows:
        parent_id = row.get(
            "parent_comment_id"
        )

        if parent_id is None:
            continue

        parent = root_map.get(
            int(parent_id)
        )

        if not parent:
            continue

        row["replies"] = []

        parent[
            "replies"
        ].append(row)


    comments = [
        root_map[root_id]
        for root_id in root_ids
        if root_id in root_map
    ]


    # ========================================================
    # ACTIVE REPLY COUNTS
    # ========================================================

    for comment in comments:
        comment["reply_count"] = sum(
            1
            for reply
            in comment["replies"]
            if (
                reply.get(
                    "comment_status"
                )
                == "active"
            )
        )


    return {
        "news_id":
            news_id,

        "user_role":
            role,

        "total_root_comments":
            total_root_comments,

        "limit":
            limit,

        "offset":
            offset,

        "has_more":
            (
                offset
                + len(comments)
                < total_root_comments
            ),

        "comments":
            comments,
    }


# ============================================================
# ACTIVE FETCH QUERIES
# ============================================================

def list_active_news_fetch_queries(
    api_provider=None,
):
    provider = _normalize_optional_text(
        api_provider
    )

    conditions = ["is_active = 1"]
    params = []

    if provider:
        conditions.append("api_provider = %s")
        params.append(provider)

    where_sql = "WHERE " + " AND ".join(conditions)

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT *
            FROM news_fetch_queries
            {where_sql}
            ORDER BY
                fetch_priority ASC,
                query_id ASC
            """,
            params,
        )

        return _rows_to_dicts(
            cursor
        )