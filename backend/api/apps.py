import os
import sys

from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        """
        Start GrainRise background services when Django starts.

        News automatic sync is still controlled by:

            NEWS_AUTO_SYNC_ENABLED

        in backend/.env.

        Important:
        - Do not start scheduler during normal management commands.
        - Avoid duplicate scheduler in Django runserver autoreloader.
        - Production application servers may start it normally.
        """

        if not self._should_start_news_scheduler():
            return

        try:
            from api.news_updates.news_scheduler import (
                start_news_scheduler,
            )

            start_news_scheduler()

        except Exception:
            # Scheduler failure must NEVER prevent Django
            # itself from starting.
            import logging

            logger = logging.getLogger(
                "grainrise.news_scheduler"
            )

            logger.exception(
                "Unable to start GrainRise news scheduler."
            )

    @staticmethod
    def _should_start_news_scheduler():
        """
        Determine whether this Django process should start
        the automatic News & Updates scheduler.
        """

        # ====================================================
        # FEATURE DISABLED
        # ====================================================

        enabled = (
            str(
                os.getenv(
                    "NEWS_AUTO_SYNC_ENABLED",
                    "false",
                )
            )
            .strip()
            .lower()
            in {
                "1",
                "true",
                "yes",
                "on",
            }
        )

        if not enabled:
            return False

        # ====================================================
        # DJANGO DEVELOPMENT SERVER
        #
        # runserver starts:
        #
        # 1. autoreloader parent process
        # 2. actual Django child process
        #
        # Only the child should start the scheduler.
        # ====================================================

        if "runserver" in sys.argv:

            return (
                os.environ.get(
                    "RUN_MAIN"
                )
                ==
                "true"
            )

        # ====================================================
        # MANAGEMENT COMMANDS
        #
        # Do not start automatic NewsData syncing during:
        #
        # check
        # migrate
        # makemigrations
        # shell
        # test
        # collectstatic
        # etc.
        # ====================================================

        management_commands_to_skip = {
            "check",
            "migrate",
            "makemigrations",
            "shell",
            "test",
            "collectstatic",
            "createsuperuser",
            "showmigrations",
            "sqlmigrate",
            "dbshell",
            "flush",
        }

        if any(
            command in sys.argv
            for command in management_commands_to_skip
        ):
            return False

        # ====================================================
        # PRODUCTION SERVER
        #
        # WSGI / ASGI server processes may proceed.
        #
        # PostgreSQL advisory locking inside news_scheduler.py
        # protects the actual NewsData sync from overlapping.
        # ====================================================

        return True