from django.db import connection


ALLOWED_AUDIENCES = {
    "all",
    "farmer",
    "miller",
    "warehouse",
    "retailer",
}

ALLOWED_STATUSES = {
    "active",
    "archived",
    "draft",
}


def _fetchone_dict(cursor):
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


def _fetchall_dict(cursor):
    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def _clean_positive_int(
    value,
    *,
    default,
    minimum=1,
    maximum=None,
):
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    number = max(
        minimum,
        number,
    )

    if maximum is not None:
        number = min(
            maximum,
            number,
        )

    return number


def get_announcement_comments(
    announcement_id,
):
    try:
        announcement_id = int(
            announcement_id
        )
    except (TypeError, ValueError):
        return []

    person_name_sql = """
        CONCAT_WS(
            ' ',
            NULLIF(TRIM(u.first_name), ''),
            NULLIF(TRIM(u.middle_initial), ''),
            NULLIF(TRIM(u.last_name), ''),
            NULLIF(TRIM(u.suffix), '')
        )
    """

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                ac.comment_id,
                ac.announcement_id,
                ac.commentor_id AS user_id,
                ac.comment_content,
                ac.comment_content AS comment_text,
                ac.comment_status,
                ac.created_at,
                {person_name_sql} AS author_name,
                u.user_role AS author_role,
                u.status AS user_status
            FROM announcement_comments ac
            LEFT JOIN users u ON u.user_id = ac.commentor_id
            WHERE ac.announcement_id = %s
            ORDER BY ac.created_at ASC
            """,
            [announcement_id],
        )
        comments = _fetchall_dict(cursor)

        cursor.execute(
            f"""
            SELECT
                acr.reply_id,
                acr.comment_id,
                acr.announcement_id,
                acr.replier_id AS user_id,
                acr.reply_content,
                acr.reply_content AS comment_text,
                acr.reply_status,
                acr.reply_status AS comment_status,
                acr.created_at,
                {person_name_sql} AS author_name,
                u.user_role AS author_role,
                u.status AS user_status
            FROM announcement_comment_replies acr
            LEFT JOIN users u ON u.user_id = acr.replier_id
            WHERE acr.announcement_id = %s
            ORDER BY acr.created_at ASC
            """,
            [announcement_id],
        )
        replies = _fetchall_dict(cursor)

    replies_by_comment = {}
    for r in replies:
        replies_by_comment.setdefault(r["comment_id"], []).append(r)

    for c in comments:
        c["replies"] = replies_by_comment.get(c["comment_id"], [])

    return comments


def get_announcement_by_id(
    announcement_id,
):
    try:
        announcement_id = int(
            announcement_id
        )
    except (TypeError, ValueError):
        raise ValueError(
            "Invalid announcement ID."
        )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                announcement_id,
                title,
                audience,
                content,
                image_url,
                date_published,
                status,
                created_at

            FROM announcements

            WHERE announcement_id = %s

            LIMIT 1
            """,
            [
                announcement_id,
            ],
        )

        announcement = _fetchone_dict(
            cursor
        )

        if announcement is not None:
            cursor.execute(
                """
                SELECT COUNT(*)
                FROM announcement_likes
                WHERE announcement_id = %s
                """,
                [announcement_id],
            )
            likes_row = cursor.fetchone()
            announcement["reactions_count"] = likes_row[0] if likes_row else 0

    if announcement is None:
        raise LookupError(
            "Announcement not found."
        )

    announcement["comments"] = get_announcement_comments(
        announcement_id
    )

    return announcement


def list_announcement_drafts(
    *,
    search="",
):
    search = str(
        search or ""
    ).strip()

    conditions = [
        "status = 'draft'"
    ]

    params = []

    if search:
        search_pattern = (
            f"%{search}%"
        )

        conditions.append(
            """
            (
                LOWER(COALESCE(title, ''))
                LIKE LOWER(%s)

                OR LOWER(COALESCE(content, ''))
                LIKE LOWER(%s)

                OR LOWER(COALESCE(audience, ''))
                LIKE LOWER(%s)
            )
            """
        )

        params.extend(
            [
                search_pattern,
                search_pattern,
                search_pattern,
            ]
        )

    where_sql = (
        "WHERE "
        + " AND ".join(
            conditions
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                announcement_id,
                title,
                audience,
                content,
                image_url,
                date_published,
                status,
                created_at

            FROM announcements

            {where_sql}

            ORDER BY
                created_at DESC,
                announcement_id DESC
            """,
            params,
        )

        return _fetchall_dict(
            cursor
        )


def list_admin_announcements(
    *,
    search="",
    audience="",
    status_value="",
    page=1,
    page_size=10,
):
    search = str(
        search or ""
    ).strip()

    audience = str(
        audience or ""
    ).strip().lower()

    status_value = str(
        status_value or ""
    ).strip().lower()

    page = _clean_positive_int(
        page,
        default=1,
    )

    page_size = _clean_positive_int(
        page_size,
        default=10,
        maximum=100,
    )

    if (
        audience
        and audience
        not in ALLOWED_AUDIENCES
    ):
        raise ValueError(
            "Invalid announcement audience."
        )

    if (
        status_value
        and status_value
        not in ALLOWED_STATUSES
    ):
        raise ValueError(
            "Invalid announcement status."
        )

    conditions = []
    params = []

    if search:
        search_pattern = (
            f"%{search}%"
        )

        conditions.append(
            """
            (
                LOWER(COALESCE(title, ''))
                LIKE LOWER(%s)

                OR LOWER(COALESCE(content, ''))
                LIKE LOWER(%s)
            )
            """
        )

        params.extend(
            [
                search_pattern,
                search_pattern,
            ]
        )

    if audience:
        conditions.append(
            "audience = %s"
        )
        params.append(
            audience
        )

    if status_value:
        conditions.append(
            "status = %s"
        )
        params.append(
            status_value
        )

    where_sql = ""

    if conditions:
        where_sql = (
            "WHERE "
            + " AND ".join(
                conditions
            )
        )

    offset = (
        page - 1
    ) * page_size

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                COUNT(*)

            FROM announcements

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
                announcement_id,
                title,
                audience,
                content,
                image_url,
                date_published,
                status,
                created_at

            FROM announcements

            {where_sql}

            ORDER BY
                CASE
                    WHEN status = 'draft'
                    THEN 0

                    WHEN status = 'active'
                    THEN 1

                    ELSE 2
                END,
                COALESCE(
                    date_published,
                    created_at
                ) DESC,
                announcement_id DESC

            LIMIT %s
            OFFSET %s
            """,
            [
                *params,
                page_size,
                offset,
            ],
        )

        items = _fetchall_dict(
            cursor
        )

    total_pages = (
        total + page_size - 1
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


def get_announcement_counts():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'active'
                        THEN 1
                        ELSE 0
                    END
                ) AS active,

                SUM(
                    CASE
                        WHEN status = 'draft'
                        THEN 1
                        ELSE 0
                    END
                ) AS draft,

                SUM(
                    CASE
                        WHEN status = 'archived'
                        THEN 1
                        ELSE 0
                    END
                ) AS archived

            FROM announcements
            """
        )

        row = _fetchone_dict(
            cursor
        )

    return {
        "total": int(
            row.get("total") or 0
        ),
        "active": int(
            row.get("active") or 0
        ),
        "draft": int(
            row.get("draft") or 0
        ),
        "archived": int(
            row.get("archived") or 0
        ),
    }


def announcement_exists(
    announcement_id,
):
    try:
        announcement_id = int(
            announcement_id
        )
    except (TypeError, ValueError):
        return False

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1

            FROM announcements

            WHERE announcement_id = %s

            LIMIT 1
            """,
            [
                announcement_id,
            ],
        )

        return (
            cursor.fetchone()
            is not None
        )