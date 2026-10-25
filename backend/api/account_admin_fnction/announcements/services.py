import base64
import re
import uuid
from django.conf import settings
from django.db import (
    connection,
    transaction,
)

from .selectors import (
    ALLOWED_AUDIENCES,
    get_announcement_by_id,
)


def _clean_text(
    value,
    field_name,
    *,
    required=True,
):
    cleaned = str(
        value or ""
    ).strip()

    if required and not cleaned:
        raise ValueError(
            f"{field_name} is required."
        )

    return cleaned


def _clean_audience(
    value,
):
    audience = str(
        value or ""
    ).strip().lower()

    if audience not in ALLOWED_AUDIENCES:
        raise ValueError(
            "Invalid announcement audience."
        )

    return audience


def _clean_image_url(
    value,
):
    if not value:
        return None

    cleaned = str(
        value
    ).strip()

    if not cleaned or cleaned.lower() in ("null", "none", "undefined"):
        return None

    if cleaned.startswith("data:image/"):
        try:
            match = re.match(r"^data:image/([a-zA-Z0-9+]+);base64,(.+)$", cleaned, re.DOTALL)
            if match:
                ext = match.group(1).lower()
                if ext == "jpeg":
                    ext = "jpg"
                b64data = match.group(2)
                file_data = base64.b64decode(b64data)
                ann_dir = settings.MEDIA_ROOT / "announcements"
                ann_dir.mkdir(parents=True, exist_ok=True)
                filename = f"announcement_{uuid.uuid4().hex[:12]}.{ext}"
                filepath = ann_dir / filename
                with open(filepath, "wb") as f_out:
                    f_out.write(file_data)
                return f"/media/announcements/{filename}"
        except Exception:
            pass

    return cleaned or None


@transaction.atomic
def create_announcement(
    *,
    title,
    audience,
    content,
    image_url=None,
    publish=False,
):
    title = _clean_text(
        title,
        "Title",
    )

    audience = _clean_audience(
        audience
    )

    content = _clean_text(
        content,
        "Content",
    )

    image_url = _clean_image_url(
        image_url
    )

    status_value = (
        "active"
        if publish
        else "draft"
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO announcements (
                title,
                audience,
                content,
                image_url,
                date_published,
                status,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                CASE
                    WHEN %s = 'active'
                    THEN CURRENT_TIMESTAMP(6)
                    ELSE NULL
                END,
                %s,
                CURRENT_TIMESTAMP(6)
            )
            """,
            [
                title,
                audience,
                content,
                image_url,
                status_value,
                status_value,
            ],
        )

        announcement_id = (
            cursor.lastrowid
        )

    return get_announcement_by_id(
        announcement_id
    )


@transaction.atomic
def update_announcement(
    *,
    announcement_id,
    title,
    audience,
    content,
    image_url=None,
):
    existing = get_announcement_by_id(
        announcement_id
    )

    if (
        existing["status"]
        == "archived"
    ):
        raise ValueError(
            "Archived announcements cannot be edited."
        )

    title = _clean_text(
        title,
        "Title",
    )

    audience = _clean_audience(
        audience
    )

    content = _clean_text(
        content,
        "Content",
    )

    image_url = _clean_image_url(
        image_url
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE announcements

            SET
                title = %s,
                audience = %s,
                content = %s,
                image_url = %s

            WHERE announcement_id = %s
            """,
            [
                title,
                audience,
                content,
                image_url,
                announcement_id,
            ],
        )

    return get_announcement_by_id(
        announcement_id
    )


@transaction.atomic
def save_as_draft(
    *,
    announcement_id=None,
    title,
    audience,
    content,
    image_url=None,
):
    if announcement_id:
        existing = get_announcement_by_id(
            announcement_id
        )

        if (
            existing["status"]
            == "archived"
        ):
            raise ValueError(
                "Archived announcements cannot be saved as draft."
            )

        if (
            existing["status"]
            == "active"
        ):
            raise ValueError(
                "Published announcements cannot be returned to draft."
            )

        title = _clean_text(
            title,
            "Title",
            required=False,
        )

        audience = str(
            audience or ""
        ).strip().lower()

        if (
            audience
            and audience
            not in ALLOWED_AUDIENCES
        ):
            raise ValueError(
                "Invalid announcement audience."
            )

        content = _clean_text(
            content,
            "Content",
            required=False,
        )

        image_url = _clean_image_url(
            image_url
        )

        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE announcements

                SET
                    title = %s,
                    audience = %s,
                    content = %s,
                    image_url = %s,
                    status = 'draft',
                    date_published = NULL

                WHERE announcement_id = %s
                """,
                [
                    title,
                    audience,
                    content,
                    image_url,
                    announcement_id,
                ],
            )

        return get_announcement_by_id(
            announcement_id
        )

    title = _clean_text(
        title,
        "Title",
        required=False,
    )

    audience = str(
        audience or ""
    ).strip().lower()

    if (
        audience
        and audience
        not in ALLOWED_AUDIENCES
    ):
        raise ValueError(
            "Invalid announcement audience."
        )

    content = _clean_text(
        content,
        "Content",
        required=False,
    )

    image_url = _clean_image_url(
        image_url
    )

    if not any(
        [
            title,
            audience,
            content,
            image_url,
        ]
    ):
        raise ValueError(
            "Cannot save an empty draft."
        )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO announcements (
                title,
                audience,
                content,
                image_url,
                date_published,
                status,
                created_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                NULL,
                'draft',
                CURRENT_TIMESTAMP(6)
            )
            """,
            [
                title,
                audience,
                content,
                image_url,
            ],
        )

        new_id = (
            cursor.lastrowid
        )

    return get_announcement_by_id(
        new_id
    )


@transaction.atomic
def publish_announcement(
    *,
    announcement_id,
    title=None,
    audience=None,
    content=None,
    image_url=None,
):
    existing = get_announcement_by_id(
        announcement_id
    )

    if (
        existing["status"]
        == "archived"
    ):
        raise ValueError(
            "Archived announcements must be reactivated before publishing."
        )

    final_title = _clean_text(
        title
        if title is not None
        else existing["title"],
        "Title",
    )

    final_audience = _clean_audience(
        audience
        if audience is not None
        else existing["audience"]
    )

    final_content = _clean_text(
        content
        if content is not None
        else existing["content"],
        "Content",
    )

    final_image_url = _clean_image_url(
        image_url
        if image_url is not None
        else existing.get(
            "image_url"
        )
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE announcements

            SET
                title = %s,
                audience = %s,
                content = %s,
                image_url = %s,
                status = 'active',
                date_published =
                    COALESCE(
                        date_published,
                        CURRENT_TIMESTAMP(6)
                    )

            WHERE announcement_id = %s
            """,
            [
                final_title,
                final_audience,
                final_content,
                final_image_url,
                announcement_id,
            ],
        )

    return get_announcement_by_id(
        announcement_id
    )


@transaction.atomic
def publish_new_announcement(
    *,
    title,
    audience,
    content,
    image_url=None,
):
    return create_announcement(
        title=title,
        audience=audience,
        content=content,
        image_url=image_url,
        publish=True,
    )


@transaction.atomic
def archive_announcement(
    announcement_id,
):
    existing = get_announcement_by_id(
        announcement_id
    )

    if (
        existing["status"]
        == "archived"
    ):
        return existing

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE announcements

            SET status = 'archived'

            WHERE announcement_id = %s
            """,
            [
                announcement_id,
            ],
        )

    return get_announcement_by_id(
        announcement_id
    )


@transaction.atomic
def reactivate_announcement(
    announcement_id,
):
    existing = get_announcement_by_id(
        announcement_id
    )

    if (
        existing["status"]
        != "archived"
    ):
        raise ValueError(
            "Only archived announcements can be reactivated."
        )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE announcements

            SET status = 'active'

            WHERE announcement_id = %s
            """,
            [
                announcement_id,
            ],
        )

    return get_announcement_by_id(
        announcement_id
    )