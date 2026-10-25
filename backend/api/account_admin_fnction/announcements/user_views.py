from api.news_slug_utils import resolve_announcement_id, get_announcement_slug
import json
from django.db import connection, transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.comment_reporting import (
    get_authenticated_user_id,
    check_user_commenting_restriction,
)
from api.chat_moderation import find_profanity_matches


def _resolve_media_url(request, raw_url):
    if not raw_url:
        return None
    val = str(raw_url).strip()
    if not val or val.lower() in ("null", "none", "undefined"):
        return None
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


def _success(data=None, message=None, http_status=status.HTTP_200_OK):
    payload = {"success": True}
    if message:
        payload["message"] = message
    if data is not None:
        payload["data"] = data
    return Response(payload, status=http_status)


def _error(message, code="error", http_status=status.HTTP_400_BAD_REQUEST, extra=None):
    payload = {
        "success": False,
        "code": code,
        "message": message,
    }
    if extra:
        payload.update(extra)
    return Response(payload, status=http_status)


# ============================================================
# PUBLIC ANNOUNCEMENT DETAIL (NO LOGIN REQUIRED)
# ============================================================
@api_view(["GET"])
def public_announcement(request, announcement_id):
    """
    Public read-only announcement detail for external viewers.
    No login required.
    """
    resolved_id = resolve_announcement_id(announcement_id)
    if not resolved_id:
        return _error("Announcement not found or unavailable.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    announcement_id = resolved_id

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                announcement_id,
                title,
                content,
                image_url,
                date_published,
                status,
                created_at
            FROM announcements
            WHERE announcement_id = %s AND status = 'active'
            LIMIT 1
            """,
            [announcement_id],
        )
        row = cursor.fetchone()
        if not row:
            return _error("Announcement not found or unavailable.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)

        cursor.execute(
            "SELECT COUNT(*) FROM announcement_likes WHERE announcement_id = %s",
            [announcement_id],
        )
        like_count = cursor.fetchone()[0] or 0

        cursor.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM announcement_comments WHERE announcement_id = %s AND comment_status = 'active') +
                (SELECT COUNT(*) FROM announcement_comment_replies WHERE announcement_id = %s AND reply_status = 'active')
            """,
            [announcement_id, announcement_id],
        )
        comment_count = cursor.fetchone()[0] or 0

    return _success(
        data={
            "announcement_id": row[0],
            "slug": get_announcement_slug(row[0]),
            "title": row[1],
            "content": row[2],
            "image_url": _resolve_media_url(request, row[3]),
            "date_published": row[4].isoformat() if row[4] else None,
            "status": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
            "reaction_count": like_count,
            "comment_count": comment_count,
            "source_name": "GrainRise Admin",
            "category": "Announcement from the admin",
            "category_code": "announcement_admin",
        }
    )


# ============================================================
# AUTHENTICATED ANNOUNCEMENT DETAIL & COMMENTS
# ============================================================
@api_view(["GET"])
def announcement_user_detail(request, announcement_id):
    resolved_id = resolve_announcement_id(announcement_id)
    if not resolved_id:
        return _error("Announcement not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    announcement_id = resolved_id

    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

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
            [announcement_id],
        )
        row = cursor.fetchone()
        if not row:
            return _error("Announcement not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)

        announcement = {
            "announcement_id": row[0],
            "slug": get_announcement_slug(row[0]),
            "title": row[1],
            "audience": row[2],
            "content": row[3],
            "image_url": _resolve_media_url(request, row[4]),
            "date_published": row[5].isoformat() if row[5] else None,
            "status": row[6],
            "created_at": row[7].isoformat() if row[7] else None,
            "source_name": "GrainRise Admin",
            "category": "Announcement from the admin",
            "category_code": "announcement_admin",
        }

        # Likes
        cursor.execute(
            "SELECT COUNT(*) FROM announcement_likes WHERE announcement_id = %s",
            [announcement_id],
        )
        announcement["reaction_count"] = cursor.fetchone()[0] or 0

        cursor.execute(
            "SELECT 1 FROM announcement_likes WHERE announcement_id = %s AND reactor_id = %s LIMIT 1",
            [announcement_id, user_id],
        )
        announcement["is_liked"] = bool(cursor.fetchone())

        # Comments
        cursor.execute(
            f"""
            SELECT
                ac.comment_id,
                ac.announcement_id,
                ac.commentor_id AS user_id,
                CASE WHEN ac.comment_status = 'deleted' THEN '[deleted]' ELSE ac.comment_content END AS comment_content,
                CASE WHEN ac.comment_status = 'deleted' THEN '[deleted]' ELSE ac.comment_content END AS comment_text,
                ac.comment_status,
                ac.created_at,
                {person_name_sql} AS author_name,
                u.user_role AS author_role,
                (ac.commentor_id = %s) AS is_mine
            FROM announcement_comments ac
            LEFT JOIN users u ON u.user_id = ac.commentor_id
            WHERE ac.announcement_id = %s AND ac.comment_status != 'hidden'
            ORDER BY ac.created_at ASC, ac.comment_id ASC
            """,
            [user_id, announcement_id],
        )
        cols = [c[0] for c in cursor.description]
        comments = [dict(zip(cols, r)) for r in cursor.fetchall()]

        # Replies
        cursor.execute(
            f"""
            SELECT
                acr.reply_id,
                acr.comment_id,
                acr.announcement_id,
                acr.replier_id AS user_id,
                CASE WHEN acr.reply_status = 'deleted' THEN '[deleted]' ELSE acr.reply_content END AS reply_content,
                CASE WHEN acr.reply_status = 'deleted' THEN '[deleted]' ELSE acr.reply_content END AS comment_text,
                acr.reply_status AS comment_status,
                acr.created_at,
                {person_name_sql} AS author_name,
                u.user_role AS author_role,
                (acr.replier_id = %s) AS is_mine
            FROM announcement_comment_replies acr
            LEFT JOIN users u ON u.user_id = acr.replier_id
            WHERE acr.announcement_id = %s AND acr.reply_status != 'hidden'
            ORDER BY acr.created_at ASC, acr.reply_id ASC
            """,
            [user_id, announcement_id],
        )
        r_cols = [c[0] for c in cursor.description]
        replies = [dict(zip(r_cols, r)) for r in cursor.fetchall()]

    for c in comments:
        if c.get("created_at"):
            c["created_at"] = c["created_at"].isoformat()
    for r in replies:
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()

    replies_by_comment = {}
    for r in replies:
        replies_by_comment.setdefault(r["comment_id"], []).append(r)

    # Filter out root comments that are deleted AND have 0 replies
    visible_comments = []
    for c in comments:
        c["replies"] = replies_by_comment.get(c["comment_id"], [])
        if c["comment_status"] == "deleted" and len(c["replies"]) == 0:
            continue
        visible_comments.append(c)

    announcement["comments"] = visible_comments
    announcement["comment_count"] = sum(1 for c in visible_comments if c["comment_status"] != "deleted") + sum(len([r for r in c["replies"] if r["comment_status"] != "deleted"]) for c in visible_comments)

    return _success(data={"article": announcement})


# ============================================================
# LIKE / UNLIKE ANNOUNCEMENT
# ============================================================
@api_view(["POST"])
def announcement_reaction(request, announcement_id):
    resolved_id = resolve_announcement_id(announcement_id)
    if not resolved_id:
        return _error("Announcement not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    announcement_id = resolved_id

    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT react_id FROM announcement_likes WHERE announcement_id = %s AND reactor_id = %s LIMIT 1",
                [announcement_id, user_id],
            )
            existing = cursor.fetchone()
            if existing:
                cursor.execute("DELETE FROM announcement_likes WHERE react_id = %s", [existing[0]])
                is_liked = False
            else:
                cursor.execute(
                    "INSERT INTO announcement_likes (announcement_id, reactor_id) VALUES (%s, %s)",
                    [announcement_id, user_id],
                )
                is_liked = True

            cursor.execute(
                "SELECT COUNT(*) FROM announcement_likes WHERE announcement_id = %s",
                [announcement_id],
            )
            reaction_count = cursor.fetchone()[0] or 0

    return _success(
        data={"is_liked": is_liked, "reaction_count": reaction_count},
        message="Reaction updated.",
    )


# ============================================================
# ANNOUNCEMENT COMMENTS (GET / POST)
# ============================================================
@api_view(["GET", "POST"])
def announcement_comments(request, announcement_id):
    resolved_id = resolve_announcement_id(announcement_id)
    if not resolved_id:
        return _error("Announcement not found.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)
    announcement_id = resolved_id

    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

    if request.method == "POST":
        content = str(request.data.get("comment_text") or request.data.get("comment_content") or "").strip()
        if not content:
            return _error("Comment content cannot be empty.", code="validation_error")

        # Commenting restriction check
        restriction = check_user_commenting_restriction(user_id)
        if restriction.get("restricted"):
            return _error(restriction["message"], code="commenting_restricted")

        # Profanity check
        matches = find_profanity_matches(content)
        if matches:
            return _error(
                "Your comment contains inappropriate or prohibited words.",
                code="profanity_detected",
                extra={"matches": matches},
            )

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO announcement_comments (
                        announcement_id,
                        commentor_id,
                        comment_content,
                        comment_status
                    )
                    VALUES (%s, %s, %s, 'active')
                    """,
                    [announcement_id, user_id, content],
                )
                comment_id = cursor.lastrowid

        return _success(
            data={"comment_id": comment_id, "comment_text": content},
            message="Comment posted successfully.",
            http_status=status.HTTP_201_CREATED,
        )

    # GET fallback (handled by announcement_user_detail)
    return announcement_user_detail(request, announcement_id)


# ============================================================
# EDIT / DELETE ANNOUNCEMENT COMMENT
# ============================================================
@api_view(["PATCH", "DELETE"])
def announcement_comment_detail(request, comment_id):
    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

    if request.method == "DELETE":
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE announcement_comments
                    SET comment_status = 'deleted'
                    WHERE comment_id = %s AND commentor_id = %s AND comment_status != 'deleted'
                    """,
                    [comment_id, user_id],
                )
                if cursor.rowcount == 0:
                    return _error("Unable to delete comment. You can only delete your own active comments.", code="forbidden", http_status=status.HTTP_403_FORBIDDEN)

        return _success(data={"deleted": True, "comment_id": comment_id}, message="Comment deleted successfully.")

    # PATCH (Edit)
    content = str(request.data.get("comment_text") or request.data.get("comment_content") or "").strip()
    if not content:
        return _error("Comment text cannot be empty.", code="validation_error")

    restriction = check_user_commenting_restriction(user_id)
    if restriction.get("restricted"):
        return _error(restriction["message"], code="commenting_restricted")

    matches = find_profanity_matches(content)
    if matches:
        return _error(
            "Your comment contains inappropriate or prohibited words.",
            code="profanity_detected",
            extra={"matches": matches},
        )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE announcement_comments
                SET comment_content = %s
                WHERE comment_id = %s AND commentor_id = %s AND comment_status != 'deleted'
                """,
                [content, comment_id, user_id],
            )
            if cursor.rowcount == 0:
                return _error("Unable to edit comment. You can only edit your own active comments.", code="forbidden", http_status=status.HTTP_403_FORBIDDEN)

    return _success(data={"updated": True, "comment_id": comment_id, "comment_text": content}, message="Comment updated successfully.")


# ============================================================
# ADD REPLY TO ANNOUNCEMENT COMMENT
# ============================================================
@api_view(["POST"])
def announcement_comment_replies(request, comment_id):
    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

    content = str(request.data.get("comment_text") or request.data.get("reply_content") or "").strip()
    if not content:
        return _error("Reply content cannot be empty.", code="validation_error")

    restriction = check_user_commenting_restriction(user_id)
    if restriction.get("restricted"):
        return _error(restriction["message"], code="commenting_restricted")

    matches = find_profanity_matches(content)
    if matches:
        return _error(
            "Your reply contains inappropriate or prohibited words.",
            code="profanity_detected",
            extra={"matches": matches},
        )

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT announcement_id, comment_status FROM announcement_comments WHERE comment_id = %s LIMIT 1",
            [comment_id],
        )
        parent = cursor.fetchone()

    if not parent or parent[1] != "active":
        return _error("Cannot reply to an unavailable comment.", code="not_found", http_status=status.HTTP_404_NOT_FOUND)

    announcement_id = parent[0]

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO announcement_comment_replies (
                    comment_id,
                    announcement_id,
                    replier_id,
                    reply_content,
                    reply_status
                )
                VALUES (%s, %s, %s, %s, 'active')
                """,
                [comment_id, announcement_id, user_id, content],
            )
            reply_id = cursor.lastrowid

    return _success(
        data={"reply_id": reply_id, "comment_id": comment_id, "comment_text": content},
        message="Reply posted successfully.",
        http_status=status.HTTP_201_CREATED,
    )


# ============================================================
# EDIT / DELETE ANNOUNCEMENT REPLY
# ============================================================
@api_view(["PATCH", "DELETE"])
def announcement_reply_detail(request, reply_id):
    user_id = get_authenticated_user_id(request)
    if not user_id:
        return _error("Authentication required.", code="unauthorized", http_status=status.HTTP_401_UNAUTHORIZED)

    if request.method == "DELETE":
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE announcement_comment_replies
                    SET reply_status = 'deleted'
                    WHERE reply_id = %s AND replier_id = %s AND reply_status != 'deleted'
                    """,
                    [reply_id, user_id],
                )
                if cursor.rowcount == 0:
                    return _error("Unable to delete reply. You can only delete your own active replies.", code="forbidden", http_status=status.HTTP_403_FORBIDDEN)

        return _success(data={"deleted": True, "reply_id": reply_id}, message="Reply deleted successfully.")

    # PATCH (Edit)
    content = str(request.data.get("comment_text") or request.data.get("reply_content") or "").strip()
    if not content:
        return _error("Reply text cannot be empty.", code="validation_error")

    restriction = check_user_commenting_restriction(user_id)
    if restriction.get("restricted"):
        return _error(restriction["message"], code="commenting_restricted")

    matches = find_profanity_matches(content)
    if matches:
        return _error(
            "Your reply contains inappropriate or prohibited words.",
            code="profanity_detected",
            extra={"matches": matches},
        )

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE announcement_comment_replies
                SET reply_content = %s
                WHERE reply_id = %s AND replier_id = %s AND reply_status != 'deleted'
                """,
                [content, reply_id, user_id],
            )
            if cursor.rowcount == 0:
                return _error("Unable to edit reply. You can only edit your own active replies.", code="forbidden", http_status=status.HTTP_403_FORBIDDEN)

    return _success(data={"updated": True, "reply_id": reply_id, "comment_text": content}, message="Reply updated successfully.")

