import base64
import json
import logging
import os
import smtplib
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_grainrise_email(
    subject: str,
    text_content: str,
    html_content: str,
    recipient_email: str,
    from_email: str | None = None,
    timeout: int = 12,
) -> tuple[bool, str | None]:
    """
    Unified email sender for GrainRise.

    Delivery strategy:
    1. Production (Cloud/Render Free):
       Attempts Gmail REST API over HTTPS (port 443).
       This bypasses cloud hosting provider blocks on outbound SMTP ports (25, 465, 587)
       and prevents Gunicorn worker timeout crashes (HTTP 503).
    2. Fallback / Local Development:
       Falls back to standard Django Email backend (SMTP).

    Returns:
        (True, None) on success.
        (False, error_message) on failure (does not crash the worker).
    """
    recipient = (recipient_email or "").strip().lower()
    if not recipient or "@" not in recipient:
        return False, "Invalid recipient email address."

    sender = (
        from_email
        or os.getenv("GMAIL_SENDER_EMAIL")
        or getattr(settings, "EMAIL_HOST_USER", "")
        or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        or "capstoneprojectbsis@gmail.com"
    ).strip()

    gmail_client_id = (os.getenv("GMAIL_API_CLIENT_ID") or "").strip()
    gmail_client_secret = (os.getenv("GMAIL_API_CLIENT_SECRET") or "").strip()
    gmail_refresh_token = (os.getenv("GMAIL_API_REFRESH_TOKEN") or "").strip()

    missing_gmail_creds = []
    if not gmail_client_id:
        missing_gmail_creds.append("GMAIL_API_CLIENT_ID")
    if not gmail_client_secret:
        missing_gmail_creds.append("GMAIL_API_CLIENT_SECRET")
    if not gmail_refresh_token:
        missing_gmail_creds.append("GMAIL_API_REFRESH_TOKEN")

    gmail_issue: str | None = None

    # ========================================================
    # 1. GMAIL REST API (HTTPS PORT 443)
    # ========================================================
    if not missing_gmail_creds:
        try:
            # 1a) Exchange long-lived refresh token for short-lived access token
            token_body = urllib.parse.urlencode(
                {
                    "client_id": gmail_client_id,
                    "client_secret": gmail_client_secret,
                    "refresh_token": gmail_refresh_token,
                    "grant_type": "refresh_token",
                }
            ).encode("utf-8")

            token_request = urllib.request.Request(
                "https://oauth2.googleapis.com/token",
                data=token_body,
                method="POST",
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
            )

            with urllib.request.urlopen(token_request, timeout=min(timeout, 10)) as response:
                token_payload = json.loads(
                    response.read().decode("utf-8", errors="replace")
                )

            access_token = str(token_payload.get("access_token") or "").strip()
            if not access_token:
                raise RuntimeError(
                    f"Gmail OAuth response missing access token: {token_payload}"
                )

            # 1b) Build RFC 2822 email message
            msg = EmailMultiAlternatives(
                subject,
                text_content,
                sender,
                [recipient],
            )
            if html_content:
                msg.attach_alternative(html_content, "text/html")

            mime_bytes = msg.message().as_bytes()
            raw_b64 = base64.urlsafe_b64encode(mime_bytes).decode("ascii")

            # 1c) Dispatch via Gmail API
            send_payload = json.dumps({"raw": raw_b64}).encode("utf-8")
            send_request = urllib.request.Request(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                data=send_payload,
                method="POST",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )

            with urllib.request.urlopen(send_request, timeout=timeout) as response:
                response_body = response.read().decode("utf-8", errors="replace")
                if response.status in (200, 201):
                    logger.info(
                        "GrainRise email sent via Gmail API to %s (HTTP %s)",
                        recipient,
                        response.status,
                    )
                    return True, None
                raise RuntimeError(
                    f"Gmail API returned HTTP {response.status}: {response_body}"
                )

        except urllib.error.HTTPError as exc:
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            gmail_issue = f"Gmail API HTTP {exc.code} error: {err_body or exc.reason}"
            logger.warning(
                "Gmail API delivery to %s failed (%s); attempting SMTP fallback.",
                recipient,
                gmail_issue,
            )
        except Exception as exc:
            gmail_issue = f"Gmail API error: {exc}"
            logger.warning(
                "Gmail API delivery to %s failed (%s); attempting SMTP fallback.",
                recipient,
                gmail_issue,
            )
    else:
        gmail_issue = f"Gmail API not configured (missing environment variables: {', '.join(missing_gmail_creds)})"
        logger.info(gmail_issue)

    # ========================================================
    # 2. STANDARD DJANGO EMAIL BACKEND (SMTP / LOCAL)
    # ========================================================
    try:
        msg = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [recipient],
        )
        if html_content:
            msg.attach_alternative(html_content, "text/html")

        # Send via Django backend
        msg.send(fail_silently=False)
        logger.info("GrainRise email sent via Django backend to %s", recipient)
        return True, None

    except (smtplib.SMTPException, OSError, TimeoutError, Exception) as exc:
        err_msg = f"Failed to deliver email to {recipient}: [SMTP] {exc}. [{gmail_issue}]"
        logger.error(err_msg)
        return False, err_msg

