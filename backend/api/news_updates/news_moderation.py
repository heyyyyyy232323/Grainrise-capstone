import json

from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection, transaction


NEWS_CATEGORIES = {
    "market_updates",
    "advisory_best_practices",
    "grant_programs_support",
    "weather_climate",
    "policy_regulation",
    "supply_chain",
    "general_agriculture",
}

NEWS_STATUSES = {
    "active",
    "archived",
}

COMMENT_ACTIONS = {
    "hide",
    "restore",
    "delete",
}


# ============================================================
# ROW HELPERS
# ============================================================

def _row_to_dict(cursor, row=None):
    if row is None:
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


def _rows_to_dicts(cursor):
    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(
            zip(columns, row)
        )
        for row in cursor.fetchall()
    ]


# ============================================================
# VALUE HELPERS
# ============================================================

def _positive_integer(
    value,
    default=1,
    minimum=1,
    maximum=None,
):
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default

    result = max(
        minimum,
        result,
    )

    if maximum is not None:
        result = min(
            maximum,
            result,
        )

    return result


def _clean_reason(
    value,
    required=False,
):
    reason = str(
        value or ""
    ).strip()

    if required and not reason:
        raise ValueError(
            "Reason is required."
        )

    return reason


def _json_data(value):
    if value is None:
        return None

    return json.dumps(
        value,
        cls=DjangoJSONEncoder,
    )


# ============================================================
# CENTRAL ACTIVITY LOGGER
# ============================================================

def _record_news_activity(
    *,
    source_table,
    source_record_id,
    entity_type,
    action,
    title,
    description,
    related_user_id=None,
    entity_role=None,
    old_data=None,
    new_data=None,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT grainrise_record_system_activity(
                %s,
                %s,

                %s,

                NULL,
                NULL,

                %s,
                %s,

                %s,

                %s,
                %s,

                '/admin/news-updates',

                %s::jsonb,
                %s::jsonb,

                FALSE,
                NULL
            )
            """,
            [
                source_table,
                source_record_id,

                related_user_id,

                entity_type,
                entity_role,

                action,

                title,
                description,

                _json_data(old_data),
                _json_data(new_data),
            ],
        )


# ============================================================
# ADMIN ARTICLE LIST
# ============================================================

def list_admin_news_articles(
    *,
    search="",
    category="",
    article_status="",
    page=1,
    page_size=12,
):
    search = str(
        search or ""
    ).strip()

    category = str(
        category or ""
    ).strip()

    article_status = str(
        article_status or ""
    ).strip().lower()

    page = _positive_integer(
        page,
        1,
    )

    page_size = _positive_integer(
        page_size,
        12,
        maximum=48,
    )

    if (
        category
        and category not in NEWS_CATEGORIES
    ):
        raise ValueError(
            "Invalid news category."
        )

    if (
        article_status
        and article_status not in NEWS_STATUSES
    ):
        raise ValueError(
            "Invalid news status."
        )

    conditions = []
    params = []

    if search:
        pattern = f"%{search}%"

        conditions.append(
            """
            (
                COALESCE(article.title, '') ILIKE %s
                OR COALESCE(article.description, '') ILIKE %s
                OR COALESCE(article.source_name, '') ILIKE %s
            )
            """
        )

        params.extend(
            [
                pattern,
                pattern,
                pattern,
            ]
        )

    if category:
        conditions.append(
            "article.category_code = %s"
        )
        params.append(category)

    if article_status:
        conditions.append(
            "article.status = %s"
        )
        params.append(
            article_status
        )

    where_sql = (
        "WHERE "
        + " AND ".join(conditions)
        if conditions
        else ""
    )

    offset = (
        page - 1
    ) * page_size

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                COUNT(*)::BIGINT

            FROM
                grainrise_news_article_detail_view
                    AS article

            {where_sql}
            """,
            params,
        )

        total = int(
            cursor.fetchone()[0]
        )

        cursor.execute(
            f"""
            SELECT
                article.news_id,

                article.title,
                article.description,

                article.article_url,
                article.image_url,

                article.source_name,
                article.source_domain,
                article.author,

                article.category_code,
                article.published_at,

                article.status,

                article.reaction_count,
                article.comment_count,
                article.root_comment_count,
                article.reply_count,

                article.first_fetched_at,
                article.last_fetched_at

            FROM
                grainrise_news_article_detail_view
                    AS article

            {where_sql}

            ORDER BY
                article.published_at DESC NULLS LAST,
                article.news_id DESC

            LIMIT %s
            OFFSET %s
            """,
            [
                *params,
                page_size,
                offset,
            ],
        )

        items = _rows_to_dicts(
            cursor
        )

    total_pages = (
        total
        + page_size
        - 1
    ) // page_size

    return {
        "items": items,

        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


# ============================================================
# ADMIN ARTICLE DETAIL
# ============================================================

def get_admin_news_article_detail(
    news_id,
):
    news_id = _positive_integer(
        news_id
    )

    with connection.cursor() as cursor:
        # ARTICLE
        cursor.execute(
            """
            SELECT *

            FROM
                grainrise_news_article_detail_view

            WHERE
                news_id = %s

            LIMIT 1
            """,
            [news_id],
        )

        article = _row_to_dict(
            cursor
        )

        if article is None:
            raise LookupError(
                "News article was not found."
            )

        # AUDIENCE
        cursor.execute(
            """
            SELECT
                user_role::TEXT

            FROM
                news_article_audiences

            WHERE
                news_id = %s

            ORDER BY
                user_role::TEXT ASC
            """,
            [news_id],
        )

        audiences = [
            row[0]
            for row in cursor.fetchall()
        ]

        # REACTIONS
        cursor.execute(
            """
            SELECT
                nr.reaction_id,
                nr.news_id,
                nr.user_id,
                nr.reaction_type,
                nr.created_at,

                grainrise_build_person_name(
                    u.first_name,
                    u.middle_initial,
                    u.last_name,
                    u.suffix
                )
                    AS user_name,

                u.user_role::TEXT
                    AS user_role,

                u.status::TEXT
                    AS user_status

            FROM
                news_reactions nr

            INNER JOIN
                users u

                ON u.user_id =
                    nr.user_id

            WHERE
                nr.news_id = %s

            ORDER BY
                nr.created_at DESC,
                nr.reaction_id DESC
            """,
            [news_id],
        )

        reactions = _rows_to_dicts(
            cursor
        )

        # COMMENTS + REPLIES
        cursor.execute(
            """
            SELECT
                nc.comment_id,
                nc.news_id,
                nc.user_id,
                nc.parent_comment_id,

                CASE
                    WHEN nc.parent_comment_id IS NULL
                        THEN 'comment'
                    ELSE
                        'reply'
                END
                    AS comment_type,

                nc.comment_text,
                nc.comment_status,
                nc.created_at,
                nc.updated_at,

                grainrise_build_person_name(
                    u.first_name,
                    u.middle_initial,
                    u.last_name,
                    u.suffix
                )
                    AS author_name,

                u.user_role::TEXT
                    AS author_role,

                u.status::TEXT
                    AS user_status

            FROM
                news_comments nc

            INNER JOIN
                users u

                ON u.user_id =
                    nc.user_id

            WHERE
                nc.news_id = %s

            ORDER BY
                nc.created_at ASC,
                nc.comment_id ASC
            """,
            [news_id],
        )

        comment_rows = _rows_to_dicts(
            cursor
        )

    comment_map = {}

    for comment in comment_rows:
        comment["replies"] = []

        comment_map[
            comment["comment_id"]
        ] = comment

    root_comments = []

    for comment in comment_rows:
        parent_id = comment.get(
            "parent_comment_id"
        )

        if parent_id is None:
            root_comments.append(
                comment
            )
            continue

        parent = comment_map.get(
            parent_id
        )

        if parent:
            parent["replies"].append(
                comment
            )
        else:
            root_comments.append(
                comment
            )

    return {
        "article": article,
        "audiences": audiences,
        "reactions": reactions,
        "comments": root_comments,
    }


# ============================================================
# ARCHIVE / RESTORE ARTICLE
# ============================================================

@transaction.atomic
def update_admin_news_article_status(
    news_id,
    *,
    status_value,
    reason="",
):
    news_id = _positive_integer(
        news_id
    )

    status_value = str(
        status_value or ""
    ).strip().lower()

    if status_value not in NEWS_STATUSES:
        raise ValueError(
            "Status must be active or archived."
        )

    reason = _clean_reason(
        reason,
        required=(
            status_value
            == "archived"
        ),
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                news_id,
                title,
                description,
                category_code,
                source_name,
                published_at,
                status,
                updated_at

            FROM
                news_articles

            WHERE
                news_id = %s

            LIMIT 1
            """,
            [news_id],
        )

        old_article = _row_to_dict(
            cursor
        )

        if old_article is None:
            raise LookupError(
                "News article was not found."
            )

        cursor.execute(
            """
            UPDATE
                news_articles

            SET
                status = %s

            WHERE
                news_id = %s

            RETURNING
                news_id,
                title,
                status,
                updated_at
            """,
            [
                status_value,
                news_id,
            ],
        )

        updated_article = _row_to_dict(
            cursor
        )

    is_archive = (
        status_value
        == "archived"
    )

    _record_news_activity(
        source_table=
            "news_articles",

        source_record_id=
            news_id,

        entity_type=
            "news_article",

        action=(
            "archived"
            if is_archive
            else "restored"
        ),

        title=(
            "News Article Archived"
            if is_archive
            else "News Article Restored"
        ),

        description=(
            (
                f'News article "{old_article["title"]}" '
                f"was archived. Reason: {reason}"
            )
            if is_archive
            else (
                f'News article "{old_article["title"]}" '
                "was restored."
            )
        ),

        old_data=
            old_article,

        new_data=
            updated_article,
    )

    return updated_article


# ============================================================
# DELETE ARTICLE
# ============================================================

@transaction.atomic
def delete_admin_news_article(
    news_id,
    *,
    reason,
):
    news_id = _positive_integer(
        news_id
    )

    reason = _clean_reason(
        reason,
        required=True,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                news_id,
                title,
                description,
                category_code,
                source_name,
                published_at,
                status

            FROM
                news_articles

            WHERE
                news_id = %s

            LIMIT 1
            """,
            [news_id],
        )

        article = _row_to_dict(
            cursor
        )

        if article is None:
            raise LookupError(
                "News article was not found."
            )

    _record_news_activity(
        source_table=
            "news_articles",

        source_record_id=
            news_id,

        entity_type=
            "news_article",

        action=
            "deleted",

        title=
            "News Article Deleted",

        description=(
            f'News article "{article["title"]}" '
            f"was deleted. Reason: {reason}"
        ),

        old_data=
            article,

        new_data=
            None,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM
                news_articles

            WHERE
                news_id = %s
            """,
            [news_id],
        )

    return True


# ============================================================
# COMMENT MODERATION
# ============================================================

@transaction.atomic
def moderate_admin_news_comment(
    comment_id,
    *,
    action,
    reason="",
):
    comment_id = _positive_integer(
        comment_id
    )

    action = str(
        action or ""
    ).strip().lower()

    if action not in COMMENT_ACTIONS:
        raise ValueError(
            "Comment action must be hide, restore, or delete."
        )

    reason = _clean_reason(
        reason,
        required=(
            action
            in {
                "hide",
                "delete",
            }
        ),
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                nc.comment_id,
                nc.news_id,
                nc.user_id,
                nc.parent_comment_id,
                nc.comment_text,
                nc.comment_status,

                u.user_role::TEXT
                    AS author_role,

                grainrise_build_person_name(
                    u.first_name,
                    u.middle_initial,
                    u.last_name,
                    u.suffix
                )
                    AS author_name

            FROM
                news_comments nc

            INNER JOIN
                users u

                ON u.user_id =
                    nc.user_id

            WHERE
                nc.comment_id = %s

            LIMIT 1
            """,
            [comment_id],
        )

        old_comment = _row_to_dict(
            cursor
        )

        if old_comment is None:
            raise LookupError(
                "News comment was not found."
            )

        if action == "hide":
            cursor.execute(
                """
                UPDATE
                    news_comments

                SET
                    comment_status = 'hidden'

                WHERE
                    comment_id = %s

                RETURNING
                    comment_id,
                    news_id,
                    user_id,
                    parent_comment_id,
                    comment_text,
                    comment_status,
                    updated_at
                """,
                [comment_id],
            )

        elif action == "restore":
            if (
                old_comment[
                    "comment_status"
                ]
                == "deleted"
            ):
                raise ValueError(
                    "Deleted comments cannot be restored."
                )

            cursor.execute(
                """
                UPDATE
                    news_comments

                SET
                    comment_status = 'active'

                WHERE
                    comment_id = %s

                RETURNING
                    comment_id,
                    news_id,
                    user_id,
                    parent_comment_id,
                    comment_text,
                    comment_status,
                    updated_at
                """,
                [comment_id],
            )

        else:
            cursor.execute(
                """
                UPDATE
                    news_comments

                SET
                    comment_status = 'deleted',
                    comment_text = '[deleted]'

                WHERE
                    comment_id = %s

                RETURNING
                    comment_id,
                    news_id,
                    user_id,
                    parent_comment_id,
                    comment_text,
                    comment_status,
                    updated_at
                """,
                [comment_id],
            )

        updated_comment = _row_to_dict(
            cursor
        )

    action_label = {
        "hide": "Hidden",
        "restore": "Restored",
        "delete": "Deleted",
    }[action]

    _record_news_activity(
        source_table=
            "news_comments",

        source_record_id=
            comment_id,

        related_user_id=
            old_comment[
                "user_id"
            ],

        entity_type=
            "news_comment",

        entity_role=
            old_comment[
                "author_role"
            ],

        action=
            action,

        title=
            f"News Comment {action_label}",

        description=(
            f'Comment by '
            f'{old_comment["author_name"]} '
            f'was {action_label.lower()}.'
            + (
                f" Reason: {reason}"
                if reason
                else ""
            )
        ),

        old_data=
            old_comment,

        new_data=
            updated_comment,
    )

    return updated_comment


# ============================================================
# PENALIZE NEWS COMMENT AUTHOR
#
# Stays entirely inside News moderation.
#
# Penalty:
# users.status -> deactivated
#
# Reason is REQUIRED.
# ============================================================

@transaction.atomic
def penalize_news_comment_author(
    comment_id,
    *,
    reason,
):
    comment_id = _positive_integer(
        comment_id
    )

    reason = _clean_reason(
        reason,
        required=True,
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                nc.comment_id,
                nc.news_id,
                nc.comment_text,
                nc.comment_status,

                u.user_id,

                grainrise_build_person_name(
                    u.first_name,
                    u.middle_initial,
                    u.last_name,
                    u.suffix
                )
                    AS user_name,

                u.user_role::TEXT
                    AS user_role,

                u.status::TEXT
                    AS user_status

            FROM
                news_comments nc

            INNER JOIN
                users u

                ON u.user_id =
                    nc.user_id

            WHERE
                nc.comment_id = %s

            LIMIT 1
            """,
            [comment_id],
        )

        target = _row_to_dict(
            cursor
        )

    if target is None:
        raise LookupError(
            "News comment was not found."
        )

    if (
        target["user_status"]
        == "deactivated"
    ):
        raise ValueError(
            "This user account is already deactivated."
        )

    if (
        target["user_status"]
        != "active"
    ):
        raise ValueError(
            "Only active user accounts can be penalized through News moderation."
        )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE
                users

            SET
                status =
                    'deactivated'::user_status_enum,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                user_id = %s

            RETURNING
                user_id,

                user_role::TEXT
                    AS user_role,

                status::TEXT
                    AS status,

                updated_at
            """,
            [
                target[
                    "user_id"
                ]
            ],
        )

        updated_user = _row_to_dict(
            cursor
        )

    # Users trigger already records status change.
    # This second activity records the NEWS-specific reason/context.

    _record_news_activity(
        source_table=
            "news_comments",

        source_record_id=
            comment_id,

        related_user_id=
            target[
                "user_id"
            ],

        entity_type=
            "news_comment_penalty",

        entity_role=
            target[
                "user_role"
            ],

        action=
            "penalized",

        title=
            "News Comment User Penalized",

        description=(
            f'{target["user_name"]} was penalized '
            f'for a News & Updates comment. '
            f'Reason: {reason}'
        ),

        old_data={
            "comment_id":
                target[
                    "comment_id"
                ],

            "news_id":
                target[
                    "news_id"
                ],

            "comment_text":
                target[
                    "comment_text"
                ],

            "comment_status":
                target[
                    "comment_status"
                ],

            "user_id":
                target[
                    "user_id"
                ],

            "user_role":
                target[
                    "user_role"
                ],

            "user_status":
                target[
                    "user_status"
                ],
        },

        new_data={
            "penalty":
                "account_deactivation",

            "reason":
                reason,

            "user_status":
                updated_user[
                    "status"
                ],
        },
    )

    return {
        "comment_id":
            target[
                "comment_id"
            ],

        "news_id":
            target[
                "news_id"
            ],

        "user_id":
            target[
                "user_id"
            ],

        "user_name":
            target[
                "user_name"
            ],

        "user_role":
            target[
                "user_role"
            ],

        "penalty":
            "account_deactivation",

        "reason":
            reason,

        "user_status":
            updated_user[
                "status"
            ],
    }