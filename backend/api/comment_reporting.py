import logging
from django.db import connection, transaction
from api.utils import authorization_payload

logger = logging.getLogger(__name__)

CATEGORY_NEWS_ANNOUNCEMENT_REPORT = "News and Announcement Comment Report"

ROLE_MILLER = "miller"
ROLE_MILLER_MANAGER = "miller_manager"
ROLE_WAREHOUSE = "warehouse"
ROLE_WAREHOUSE_MANAGER = "warehouse_manager"
ROLE_RETAILER = "retailer"


def _positive_integer(value, label="ID"):
    try:
        val = int(value)
        if val <= 0:
            raise ValueError(f"{label} must be a positive integer.")
        return val
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{label} must be a positive integer.") from exc


def get_authenticated_user_id(request):
    """
    Extract authenticated user_id from request.
    Supports grainrise_news_user_id, request.user, and JWT token payload.
    """
    if hasattr(request, "grainrise_news_user_id") and request.grainrise_news_user_id:
        try:
            return int(request.grainrise_news_user_id)
        except (TypeError, ValueError):
            pass

    if hasattr(request, "user") and getattr(request.user, "user_id", None):
        try:
            return int(request.user.user_id)
        except (TypeError, ValueError):
            pass

    payload = authorization_payload(request)
    if payload:
        candidate = payload.get("sub") or payload.get("user_id")
        if candidate:
            try:
                return int(candidate)
            except (TypeError, ValueError):
                pass

    return None


def _get_target_report_destination(author_role):
    """
    Map author's role to the appropriate reports table and foreign key column.
    - Miller author -> miller_reports (miller_user_id)
    - Warehouse author -> warehouse_reports (warehouse_user_id)
    - Retailer author -> retailer_reports (retailer_user_id)
    """
    role_str = str(author_role or "").strip().lower()

    if "retailer" in role_str:
        return {
            "table": "retailer_reports",
            "owner_column": "retailer_user_id",
            "role_group": "retailer",
        }

    if "warehouse" in role_str:
        return {
            "table": "warehouse_reports",
            "owner_column": "warehouse_user_id",
            "role_group": "warehouse",
        }

    if "miller" in role_str or "supplier" in role_str:
        return {
            "table": "miller_reports",
            "owner_column": "miller_user_id",
            "role_group": "miller",
        }

    # Default fallback to retailer_reports if role is retailer, otherwise miller_reports
    return {
        "table": "retailer_reports" if "retail" in role_str else "miller_reports",
        "owner_column": "retailer_user_id" if "retail" in role_str else "miller_user_id",
        "role_group": role_str or "unknown",
    }


def find_comment_info(comment_id, comment_type=None):
    """
    Look up comment, author user ID, author role, and article/announcement title.
    Checks news_comments, announcement_comments, and announcement_comment_replies.
    """
    comment_id = _positive_integer(comment_id, "Comment ID")

    with connection.cursor() as cursor:
        # 1. Try news_comments first if not explicitly announcement
        if comment_type != "announcement" and comment_type != "announcement_reply":
            cursor.execute(
                """
                SELECT
                    nc.comment_id,
                    nc.user_id AS author_id,
                    nc.comment_text,
                    nc.news_id,
                    na.title AS article_title,
                    u.user_role AS author_role
                FROM news_comments nc
                INNER JOIN users u ON u.user_id = nc.user_id
                LEFT JOIN news_articles na ON na.news_id = nc.news_id
                WHERE nc.comment_id = %s
                LIMIT 1
                """,
                [comment_id],
            )
            row = cursor.fetchone()
            if row:
                return {
                    "comment_id": row[0],
                    "author_id": row[1],
                    "comment_text": row[2],
                    "item_id": row[3],
                    "title": row[4] or "News & Updates",
                    "author_role": row[5],
                    "type": "news",
                }

        # 2. Try announcement_comments
        if comment_type != "news" and comment_type != "announcement_reply":
            cursor.execute(
                """
                SELECT
                    ac.comment_id,
                    ac.commentor_id AS author_id,
                    ac.comment_content AS comment_text,
                    ac.announcement_id,
                    a.title AS announcement_title,
                    u.user_role AS author_role
                FROM announcement_comments ac
                INNER JOIN users u ON u.user_id = ac.commentor_id
                LEFT JOIN announcements a ON a.announcement_id = ac.announcement_id
                WHERE ac.comment_id = %s
                LIMIT 1
                """,
                [comment_id],
            )
            row = cursor.fetchone()
            if row:
                return {
                    "comment_id": row[0],
                    "author_id": row[1],
                    "comment_text": row[2],
                    "item_id": row[3],
                    "title": row[4] or "Announcement",
                    "author_role": row[5],
                    "type": "announcement",
                }

        # 3. Try announcement_comment_replies
        if comment_type != "news":
            cursor.execute(
                """
                SELECT
                    acr.reply_id AS comment_id,
                    acr.replier_id AS author_id,
                    acr.reply_content AS comment_text,
                    acr.announcement_id,
                    a.title AS announcement_title,
                    u.user_role AS author_role
                FROM announcement_comment_replies acr
                INNER JOIN users u ON u.user_id = acr.replier_id
                LEFT JOIN announcements a ON a.announcement_id = acr.announcement_id
                WHERE acr.reply_id = %s
                LIMIT 1
                """,
                [comment_id],
            )
            row = cursor.fetchone()
            if row:
                return {
                    "comment_id": row[0],
                    "author_id": row[1],
                    "comment_text": row[2],
                    "item_id": row[3],
                    "title": row[4] or "Announcement",
                    "author_role": row[5],
                    "type": "announcement_reply",
                }

    return None


@transaction.atomic
def report_comment(
    reporter_id,
    *,
    comment_id,
    reason,
    comment_type=None,
    title=None,
):
    """
    Report a comment on News or Announcements.

    REQUIREMENTS:
    - Miller author -> miller_reports
    - Warehouse author -> warehouse_reports
    - Retailer author -> retailer_reports
    - Use authenticated reporter ID from JWT.
    - category = "News and Announcement Comment Report"
    - description = "This user has been reported due to reason of [reason] on the [Title]"
    - New reports default to pending.
    """
    reporter_id = _positive_integer(reporter_id, "Reporter ID")
    comment_id = _positive_integer(comment_id, "Comment ID")

    cleaned_reason = str(reason or "").strip()
    if not cleaned_reason:
        raise ValueError("Reason is required to submit a comment report.")

    comment_info = find_comment_info(comment_id, comment_type=comment_type)
    if not comment_info:
        raise LookupError("The requested comment was not found.")

    author_id = comment_info["author_id"]
    author_role = comment_info["author_role"]
    actual_title = str(title or comment_info.get("title") or "News & Updates").strip()

    if reporter_id == author_id:
        raise ValueError("You cannot report your own comment.")

    destination = _get_target_report_destination(author_role)
    target_table = destination["table"]
    owner_col = destination["owner_column"]

    # Format description exactly per requirements:
    # "This user has been reported due to reason of [reason] on the [Title]"
    description = f"This user has been reported due to reason of {cleaned_reason} on the {actual_title}"
    category = CATEGORY_NEWS_ANNOUNCEMENT_REPORT

    # Check for existing duplicate pending report by this reporter
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT {owner_col}
            FROM {target_table}
            WHERE {owner_col} = %s
              AND reported_by_user_id = %s
              AND category = %s
              AND description = %s
              AND status = 'pending'
            LIMIT 1
            """,
            [author_id, reporter_id, category, description],
        )
        existing = cursor.fetchone()

    if existing:
        return {
            "already_reported": True,
            "message": "You have already submitted a pending report for this comment.",
            "target_table": target_table,
            "author_id": author_id,
            "category": category,
            "status": "pending",
        }

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            INSERT INTO {target_table} (
                {owner_col},
                reported_by_user_id,
                category,
                description,
                status
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                'pending'
            )
            """,
            [author_id, reporter_id, category, description],
        )
        report_id = cursor.lastrowid

    logger.info(
        "Comment report created: ID %s in %s for author %s by reporter %s",
        report_id,
        target_table,
        author_id,
        reporter_id,
    )

    return {
        "report_id": report_id,
        "target_table": target_table,
        "author_id": author_id,
        "author_role": author_role,
        "reporter_id": reporter_id,
        "category": category,
        "description": description,
        "status": "pending",
        "already_reported": False,
    }


def check_user_commenting_restriction(user_id):
    """
    Check commenting restriction for Miller, Warehouse, and Retailer accounts.
    RULES:
    - 3 or more pending issues in 24 hours -> 24-hour commenting restriction.
    - 6 or more pending issues in 48 hours -> 48-hour commenting restriction.
    """
    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return {"restricted": False}

    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT user_role, status FROM users WHERE user_id = %s LIMIT 1",
            [user_id],
        )
        user_row = cursor.fetchone()

    if not user_row:
        return {"restricted": False}

    user_role = str(user_row[0] or "").strip().lower()

    if "retailer" in user_role:
        table = "retailer_reports"
        col = "retailer_user_id"
    elif "warehouse" in user_role:
        table = "warehouse_reports"
        col = "warehouse_user_id"
    elif "miller" in user_role or "supplier" in user_role:
        table = "miller_reports"
        col = "miller_user_id"
    else:
        return {"restricted": False}

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL 24 HOUR THEN 1 END) AS count_24h,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL 48 HOUR THEN 1 END) AS count_48h,
                MAX(created_at) AS latest_created_at
            FROM {table}
            WHERE {col} = %s
              AND status = 'pending'
              AND created_at >= NOW() - INTERVAL 48 HOUR
            """,
            [user_id],
        )
        row = cursor.fetchone()

    count_24h = (row[0] if row else 0) or 0
    count_48h = (row[1] if row else 0) or 0

    if count_48h >= 6:
        return {
            "restricted": True,
            "period": "48h",
            "pending_count": count_48h,
            "threshold": 6,
            "message": "Commenting is temporarily restricted due to 6 pending reports within 48 hours.",
        }

    if count_24h >= 3:
        return {
            "restricted": True,
            "period": "24h",
            "pending_count": count_24h,
            "threshold": 3,
            "message": "Commenting is temporarily restricted due to 3 pending reports within 24 hours.",
        }

    return {
        "restricted": False,
        "count_24h": count_24h,
        "count_48h": count_48h,
    }


@transaction.atomic
def resolve_report_by_type_and_id(report_type, report_id, *, status="resolved"):
    """
    Resolve a report in retailer_reports, miller_reports, or warehouse_reports.
    """
    report_id = _positive_integer(report_id, "Report ID")
    report_type = str(report_type or "").strip().lower()

    if "retailer" in report_type:
        table = "retailer_reports"
        pk_col = "retailer_report_id"
    elif "warehouse" in report_type:
        table = "warehouse_reports"
        pk_col = "warehouse_report_id"
    elif "miller" in report_type:
        table = "miller_reports"
        pk_col = "miller_report_id"
    else:
        raise ValueError(f"Unknown report type: {report_type}")

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE {table}
            SET status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE {pk_col} = %s
            """,
            [status, report_id],
        )
        if cursor.rowcount == 0:
            raise LookupError(f"Report ID {report_id} was not found in {table}.")

    return {
        "report_id": report_id,
        "status": status,
        "table": table,
    }

