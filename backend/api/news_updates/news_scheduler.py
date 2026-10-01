import logging
import os
import threading

from django.db import close_old_connections, connection
from django.utils import timezone

from .sync_service import run_newsdata_sync


# ============================================================
# GRAINRISE
# NEWS & UPDATES
# AUTOMATIC NEWSDATA SCHEDULER
# ============================================================
#
# PURPOSE:
#
# Automatically checks whether GrainRise needs to fetch fresh
# news from NewsData.
#
# IMPORTANT:
#
# This scheduler DOES NOT call NewsData every time somebody
# opens the News & Updates page.
#
# Normal users:
#
# Farmer
# Miller Manager
# Warehouse Manager
# Retailer
#
# continue reading news only from PostgreSQL.
#
#
# FLOW:
#
# Scheduler
#     ↓
# Is sync due?
#     ↓
# PostgreSQL advisory lock
#     ↓
# run_newsdata_sync()
#     ↓
# NewsData API
#     ↓
# PostgreSQL
#
#
# DEFAULT:
#
# Automatic sync interval:
#     once every 24 hours
#
# This conservative default is intentional while GrainRise
# is using a limited/free NewsData API plan.
#
# ============================================================


logger = logging.getLogger(
    "grainrise.news_scheduler"
)


# ============================================================
# PROVIDER
# ============================================================

NEWS_PROVIDER = "newsdata"


# ============================================================
# POSTGRESQL ADVISORY LOCK
#
# Prevents duplicate API syncs if Django happens to run with
# multiple processes/workers.
#
# Only one process may execute the NewsData sync at a time.
# ============================================================

NEWS_SYNC_ADVISORY_LOCK_ID = 731902260908


# ============================================================
# THREAD STATE
# ============================================================

_scheduler_thread = None

_scheduler_start_lock = (
    threading.Lock()
)

_scheduler_stop_event = (
    threading.Event()
)


# ============================================================
# ENV HELPERS
# ============================================================

def _env_bool(
    name,
    default=False,
):
    value = os.getenv(
        name
    )

    if value is None:
        return bool(
            default
        )

    return (
        str(value)
        .strip()
        .lower()
        in {
            "1",
            "true",
            "yes",
            "on",
        }
    )


def _env_int(
    name,
    default,
    minimum=None,
    maximum=None,
):
    try:

        value = int(
            os.getenv(
                name,
                str(default),
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        value = int(
            default
        )

    if minimum is not None:

        value = max(
            int(minimum),
            value,
        )

    if maximum is not None:

        value = min(
            int(maximum),
            value,
        )

    return value


# ============================================================
# CONFIGURATION
# ============================================================

def news_auto_sync_enabled():
    """
    Automatic syncing is explicitly enabled through backend/.env.

    Example:

        NEWS_AUTO_SYNC_ENABLED=true

    Default is FALSE for safety so simply importing this module
    never consumes NewsData credits unexpectedly.
    """

    return _env_bool(
        "NEWS_AUTO_SYNC_ENABLED",
        False,
    )


def news_auto_sync_interval_hours():
    """
    Minimum time between successful automatic syncs.

    Default:
        24 hours
    """

    return _env_int(
        "NEWS_AUTO_SYNC_INTERVAL_HOURS",
        24,
        minimum=1,
        maximum=168,
    )


def news_auto_sync_check_minutes():
    """
    How often the local scheduler checks PostgreSQL to see
    whether a new sync is due.

    This does NOT mean an API call happens this often.

    Default:
        every 30 minutes
    """

    return _env_int(
        "NEWS_AUTO_SYNC_CHECK_MINUTES",
        30,
        minimum=1,
        maximum=1440,
    )


def news_auto_sync_startup_delay_seconds():
    """
    Delay after Django startup before the first due-check.

    This gives Django/database initialization time to settle.

    Default:
        60 seconds
    """

    return _env_int(
        "NEWS_AUTO_SYNC_STARTUP_DELAY_SECONDS",
        60,
        minimum=5,
        maximum=3600,
    )


# ============================================================
# TIMEZONE HELPER
# ============================================================

def _ensure_aware(value):
    if value is None:
        return None
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


# ============================================================
# LAST SUCCESSFUL SYNC
# ============================================================

def get_last_completed_news_sync():
    """
    Return the timestamp of the most recent successful
    NewsData synchronization.

    Returns:
        datetime | None
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
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
                NEWS_PROVIDER
            ],
        )

        row = (
            cursor.fetchone()
        )

    if not row:
        return None

    return _ensure_aware(row[0])


# ============================================================
# DUE CHECK
# ============================================================

def is_news_sync_due():
    """
    Determine whether GrainRise should fetch fresh NewsData.

    If there has never been a successful sync:
        TRUE

    Otherwise:
        TRUE only after the configured interval has elapsed.
    """

    last_completed_at = _ensure_aware(
        get_last_completed_news_sync()
    )

    if last_completed_at is None:
        return True

    now = timezone.now()

    elapsed_seconds = (
        now
        -
        last_completed_at
    ).total_seconds()

    required_seconds = (
        news_auto_sync_interval_hours()
        *
        60
        *
        60
    )

    return (
        elapsed_seconds
        >=
        required_seconds
    )


# ============================================================
# POSTGRESQL LOCK
# ============================================================

def _try_acquire_sync_lock():
    """
    Attempt to obtain a PostgreSQL advisory lock.

    Returns:
        True  -> this process may sync
        False -> another process is already syncing
    """

    close_old_connections()

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT GET_LOCK(%s, 0)
            """,
            [
                str(NEWS_SYNC_ADVISORY_LOCK_ID)
            ],
        )

        row = (
            cursor.fetchone()
        )

    return bool(
        row
        and row[0] == 1
    )


def _release_sync_lock():
    """
    Release the MySQL lock.
    """

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT RELEASE_LOCK(%s)
                """,
                [
                    str(NEWS_SYNC_ADVISORY_LOCK_ID)
                ],
            )

    except Exception:

        logger.exception(
            "Unable to release GrainRise news sync lock."
        )


# ============================================================
# AUTOMATIC SYNC ATTEMPT
# ============================================================

def run_automatic_news_sync_if_due():
    """
    Run one automatic sync attempt.

    IMPORTANT:
    This function calls NewsData ONLY when:

        1. automatic sync is enabled
        2. the configured interval has elapsed
        3. no other process currently owns the sync lock
    """

    if not news_auto_sync_enabled():

        return {
            "status":
                "disabled",

            "synced":
                False,
        }

    close_old_connections()

    # ========================================================
    # FIRST DUE CHECK
    # ========================================================

    try:

        if not is_news_sync_due():

            return {
                "status":
                    "not_due",

                "synced":
                    False,
            }

    except Exception:

        logger.exception(
            "Unable to determine whether NewsData sync is due."
        )

        return {
            "status":
                "due_check_failed",

            "synced":
                False,
        }

    # ========================================================
    # PREVENT DUPLICATE WORKERS
    # ========================================================

    try:

        lock_acquired = (
            _try_acquire_sync_lock()
        )

    except Exception:

        logger.exception(
            "Unable to acquire GrainRise news sync lock."
        )

        return {
            "status":
                "lock_failed",

            "synced":
                False,
        }

    if not lock_acquired:

        return {
            "status":
                "already_running",

            "synced":
                False,
        }

    try:

        # ====================================================
        # SECOND DUE CHECK
        #
        # Important when two workers started at nearly the same
        # time. The first worker may have completed before this
        # worker obtained the advisory lock.
        # ====================================================

        if not is_news_sync_due():

            return {
                "status":
                    "not_due",

                "synced":
                    False,
            }

        logger.info(
            "Starting automatic GrainRise NewsData sync."
        )

        # ====================================================
        # EXISTING CENTRALIZED SYNC SERVICE
        #
        # We DO NOT rebuild the NewsData pipeline here.
        # ====================================================

        result = (
            run_newsdata_sync()
        )

        logger.info(
            "Automatic GrainRise NewsData sync completed."
        )

        return {
            "status":
                "completed",

            "synced":
                True,

            "result":
                result,
        }

    except Exception as exc:

        logger.exception(
            "Automatic GrainRise NewsData sync failed."
        )

        return {
            "status":
                "failed",

            "synced":
                False,

            "error":
                str(
                    exc
                ),
        }

    finally:

        _release_sync_lock()

        close_old_connections()


# ============================================================
# BACKGROUND LOOP
# ============================================================

def _news_scheduler_loop():
    """
    Background scheduler loop.

    PostgreSQL is checked periodically.

    NewsData itself is contacted ONLY when the due-check allows it.
    """

    startup_delay = (
        news_auto_sync_startup_delay_seconds()
    )

    # ========================================================
    # STARTUP DELAY
    # ========================================================

    if _scheduler_stop_event.wait(
        startup_delay
    ):
        return

    while not (
        _scheduler_stop_event.is_set()
    ):

        try:

            result = (
                run_automatic_news_sync_if_due()
            )

            logger.debug(
                "News scheduler check result: %s",
                result.get(
                    "status"
                ),
            )

        except Exception:

            # Scheduler must never crash the Django server.
            logger.exception(
                "Unexpected GrainRise news scheduler error."
            )

        finally:

            close_old_connections()

        # ====================================================
        # WAIT UNTIL NEXT DB CHECK
        #
        # Example default:
        #
        # every 30 minutes:
        #     check DB
        #
        # only once every 24 hours:
        #     actually call NewsData
        # ====================================================

        wait_seconds = (
            news_auto_sync_check_minutes()
            *
            60
        )

        if _scheduler_stop_event.wait(
            wait_seconds
        ):
            break


# ============================================================
# START SCHEDULER
# ============================================================

def start_news_scheduler():
    """
    Start the GrainRise automatic news scheduler.

    Safe to call more than once inside the same Django process.
    """

    global _scheduler_thread

    # ========================================================
    # FEATURE DISABLED
    # ========================================================

    if not news_auto_sync_enabled():

        logger.info(
            (
                "GrainRise automatic NewsData sync is disabled. "
                "Set NEWS_AUTO_SYNC_ENABLED=true to enable it."
            )
        )

        return False

    # ========================================================
    # PREVENT DUPLICATE THREAD INSIDE SAME PROCESS
    # ========================================================

    with _scheduler_start_lock:

        if (
            _scheduler_thread is not None
            and
            _scheduler_thread.is_alive()
        ):

            return True

        _scheduler_stop_event.clear()

        _scheduler_thread = threading.Thread(
            target=(
                _news_scheduler_loop
            ),
            name=(
                "grainrise-news-scheduler"
            ),
            daemon=True,
        )

        _scheduler_thread.start()

    logger.info(
        (
            "GrainRise automatic NewsData scheduler started. "
            "Sync interval: %s hour(s). "
            "DB check interval: %s minute(s)."
        ),
        news_auto_sync_interval_hours(),
        news_auto_sync_check_minutes(),
    )

    return True


# ============================================================
# STOP SCHEDULER
# ============================================================

def stop_news_scheduler():
    """
    Signal the background scheduler thread to stop.

    Mostly useful for tests/shutdown handling.
    """

    _scheduler_stop_event.set()