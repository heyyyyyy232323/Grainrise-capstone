from datetime import timedelta

from django.db import close_old_connections, connection
from django.utils import timezone

from .news_scheduler import (
    NEWS_PROVIDER,
    news_auto_sync_enabled,
    news_auto_sync_interval_hours,
    news_auto_sync_check_minutes,
)


# ============================================================
# GRAINRISE
# NEWS & UPDATES
# AUTOMATIC SYNC STATUS
# ============================================================
#
# PURPOSE:
#
# Provides the information needed later by the Admin UI:
#
#   Automatic Sync: Enabled
#   Last Sync
#   Last Successful Sync
#   Next Sync
#   Sync Status
#   API Requests
#   Articles Received
#   Articles Processed
#   Articles Failed
#
#
# IMPORTANT:
#
# This module NEVER calls NewsData.
#
# PostgreSQL read only.
# ============================================================


# ============================================================
# ROW HELPER
# ============================================================

def _row_to_dict(
    cursor,
    row,
):
    if row is None:
        return None

    columns = [
        column[0]
        for column
        in cursor.description
    ]

    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# LATEST SYNC
# ============================================================

def get_latest_news_sync():
    """
    Return the most recent NewsData synchronization attempt.

    This may be:
        running
        completed
        failed
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                sync_id,
                api_provider,
                sync_status,
                request_count,
                articles_received,
                articles_processed,
                articles_failed,
                error_message,
                started_at,
                completed_at

            FROM grainrise_latest_news_sync_view

            WHERE
                api_provider = %s

            LIMIT 1
            """,
            [
                NEWS_PROVIDER,
            ],
        )

        row = cursor.fetchone()

        return _row_to_dict(
            cursor,
            row,
        )


# ============================================================
# LAST SUCCESSFUL SYNC
# ============================================================

def get_last_successful_news_sync():
    """
    Return the latest COMPLETED NewsData sync.

    Failed/running syncs are ignored here because the automatic
    scheduler bases its interval on successful completion.
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                sync_id,
                api_provider,
                sync_status,
                request_count,
                articles_received,
                articles_processed,
                articles_failed,
                started_at,
                completed_at

            FROM news_sync_runs

            WHERE
                api_provider = %s

                AND sync_status = 'completed'

                AND completed_at IS NOT NULL

            ORDER BY
                completed_at DESC,
                sync_id DESC

            LIMIT 1
            """,
            [
                NEWS_PROVIDER,
            ],
        )

        row = cursor.fetchone()

        return _row_to_dict(
            cursor,
            row,
        )


# ============================================================
# ACTIVE FETCH QUERY COUNT
# ============================================================

def get_active_news_query_count():
    """
    Count active NewsData fetch configurations.

    Useful later for Admin visibility because each active query
    normally represents at least one provider request per sync
    when max_pages = 1.
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                COUNT(*)::INTEGER

            FROM news_fetch_queries

            WHERE
                api_provider = %s

                AND is_active = TRUE
            """,
            [
                NEWS_PROVIDER,
            ],
        )

        row = cursor.fetchone()

    if not row:
        return 0

    return int(
        row[0]
        or 0
    )


# ============================================================
# TOTAL STORED NEWS
# ============================================================

def get_news_article_counts():
    """
    Return total/active/archived article counts currently
    stored in GrainRise PostgreSQL.
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                COUNT(*)::INTEGER
                    AS total_articles,

                COUNT(*) FILTER (
                    WHERE status = 'active'
                )::INTEGER
                    AS active_articles,

                COUNT(*) FILTER (
                    WHERE status = 'archived'
                )::INTEGER
                    AS archived_articles

            FROM news_articles
            """
        )

        row = cursor.fetchone()

    if not row:
        return {
            "total_articles": 0,
            "active_articles": 0,
            "archived_articles": 0,
        }

    return {
        "total_articles":
            int(
                row[0]
                or 0
            ),

        "active_articles":
            int(
                row[1]
                or 0
            ),

        "archived_articles":
            int(
                row[2]
                or 0
            ),
    }


# ============================================================
# BUILD COMPLETE STATUS
# ============================================================

def get_news_sync_status():
    """
    Build one centralized News Sync status payload.

    This is intended to be returned later by an authenticated
    Admin API endpoint.
    """

    latest_sync = (
        get_latest_news_sync()
    )

    last_successful_sync = (
        get_last_successful_news_sync()
    )

    article_counts = (
        get_news_article_counts()
    )

    enabled = (
        news_auto_sync_enabled()
    )

    interval_hours = (
        news_auto_sync_interval_hours()
    )

    check_minutes = (
        news_auto_sync_check_minutes()
    )

    now = timezone.now()

    # ========================================================
    # NEXT AUTOMATIC SYNC
    # ========================================================

    last_completed_at = None

    if last_successful_sync:

        last_completed_at = (
            last_successful_sync.get(
                "completed_at"
            )
        )

    if (
        enabled
        and last_completed_at
    ):

        next_sync_at = (
            last_completed_at
            +
            timedelta(
                hours=interval_hours
            )
        )

        sync_due = (
            now
            >=
            next_sync_at
        )

    elif enabled:

        # No successful sync yet.
        # Scheduler should fetch on the next scheduled check.
        next_sync_at = None
        sync_due = True

    else:

        next_sync_at = None
        sync_due = False

    # ========================================================
    # FRIENDLY STATE
    # ========================================================

    if not enabled:

        automatic_sync_status = (
            "disabled"
        )

    elif (
        latest_sync
        and
        latest_sync.get(
            "sync_status"
        ) == "running"
    ):

        automatic_sync_status = (
            "syncing"
        )

    elif sync_due:

        automatic_sync_status = (
            "due"
        )

    else:

        automatic_sync_status = (
            "scheduled"
        )

    # ========================================================
    # RESPONSE
    # ========================================================

    return {
        "provider":
            NEWS_PROVIDER,

        "automatic_sync": {
            "enabled":
                enabled,

            "status":
                automatic_sync_status,

            "interval_hours":
                interval_hours,

            "check_interval_minutes":
                check_minutes,

            "due":
                sync_due,

            "next_sync_at":
                next_sync_at,
        },

        "latest_sync":
            latest_sync,

        "last_successful_sync":
            last_successful_sync,

        "active_fetch_queries":
            get_active_news_query_count(),

        "articles":
            article_counts,

        "server_time":
            now,
    }