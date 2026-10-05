import json

from django.db import (

    connection,

    transaction,

)

# ============================================================

# GRAINRISE

# ANNOUNCEMENT ADMIN MODERATION

# ============================================================

COMMENT_ACTIONS = {

    "hide",

    "restore",

    "delete",

}

# ============================================================

# HELPERS

# ============================================================

def _positive_integer(

    value,

    *,

    label="ID",

):

    try:

        value = int(

            value

        )

    except (

        TypeError,

        ValueError,

    ):

        raise ValueError(

            f"{label} must be a valid positive integer."

        )

    if value <= 0:

        raise ValueError(

            f"{label} must be a valid positive integer."

        )

    return value

def _clean_reason(

    reason,

    *,

    required=False,

):

    reason = str(

        reason or ""

    ).strip()

    if required and not reason:

        raise ValueError(

            "Reason is required."

        )

    if len(reason) > 2000:

        raise ValueError(

            "Reason is too long."

        )

    return reason

def _row_to_dict(

    cursor,

):

    row = cursor.fetchone()

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

def _person_name_sql(

    alias="u",

):

    return f"""

        CONCAT_WS(

            ' ',

            NULLIF(TRIM({alias}.first_name), ''),

            NULLIF(TRIM({alias}.middle_initial), ''),

            NULLIF(TRIM({alias}.last_name), ''),

            NULLIF(TRIM({alias}.suffix), '')

        )

    """

# ============================================================

# SYSTEM ACTIVITY

#

# Direct MySQL INSERT.

# No PostgreSQL function dependency.

# ============================================================

def _record_announcement_activity(

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

            INSERT INTO system_activity_logs (

                source_table,

                source_record_id,

                related_user_id,

                related_employee_type,

                related_employee_id,

                entity_type,

                entity_role,

                action,

                title,

                description,

                target_path,

                old_data,

                new_data,

                is_notification_worthy

            )

            VALUES (

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

                %s,

                %s,

                %s,

                %s

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

                "/admin/announcements",

                (

                    json.dumps(

                        old_data,

                        default=str,

                    )

                    if old_data is not None

                    else None

                ),

                (

                    json.dumps(

                        new_data,

                        default=str,

                    )

                    if new_data is not None

                    else None

                ),

                0,

            ],

        )

# ============================================================

# DELETE ANNOUNCEMENT

# ============================================================

@transaction.atomic

def delete_admin_announcement(

    announcement_id,

    *,

    reason,

):

    announcement_id = (

        _positive_integer(

            announcement_id,

            label="Announcement ID",

        )

    )

    reason = _clean_reason(

        reason,

        required=True,

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

            FROM

                announcements

            WHERE

                announcement_id = %s

            LIMIT 1

            """,

            [

                announcement_id,

            ],

        )

        announcement = (

            _row_to_dict(

                cursor

            )

        )

    if announcement is None:

        raise LookupError(

            "Announcement was not found."

        )

    _record_announcement_activity(

        source_table=

            "announcements",

        source_record_id=

            announcement_id,

        entity_type=

            "announcement",

        action=

            "deleted",

        title=

            "Announcement Deleted",

        description=(

            f'Announcement "{announcement["title"]}" '

            f"was permanently deleted. "

            f"Reason: {reason}"

        ),

        old_data=

            announcement,

        new_data=

            None,

    )

    # --------------------------------------------------------

    # Explicit child cleanup

    #

    # Do not depend on ON DELETE CASCADE being present in every

    # imported GrainRise database.

    # --------------------------------------------------------

    with connection.cursor() as cursor:

        cursor.execute(

            """

            DELETE FROM

                announcement_comment_replies

            WHERE

                announcement_id = %s

            """,

            [

                announcement_id,

            ],

        )

        cursor.execute(

            """

            DELETE FROM

                announcement_comments

            WHERE

                announcement_id = %s

            """,

            [

                announcement_id,

            ],

        )

        cursor.execute(

            """

            DELETE FROM

                announcement_likes

            WHERE

                announcement_id = %s

            """,

            [

                announcement_id,

            ],

        )

        cursor.execute(

            """

            DELETE FROM

                announcements

            WHERE

                announcement_id = %s

            """,

            [

                announcement_id,

            ],

        )

    return True

# ============================================================

# GET COMMENT FOR ADMIN MODERATION

# ============================================================

def _get_comment_for_moderation(

    comment_id,

):

    comment_id = (

        _positive_integer(

            comment_id,

            label="Comment ID",

        )

    )

    person_name_sql = (

        _person_name_sql(

            "u"

        )

    )

    with connection.cursor() as cursor:

        cursor.execute(

            f"""

            SELECT

                ac.comment_id,

                ac.announcement_id,

                ac.commentor_id

                    AS user_id,

                ac.comment_content,

                ac.comment_status,

                {person_name_sql}

                    AS author_name,

                u.user_role

                    AS author_role,

                u.status

                    AS user_status

            FROM

                announcement_comments ac

            INNER JOIN

                users u

                ON u.user_id =

                    ac.commentor_id

            WHERE

                ac.comment_id = %s

            LIMIT 1

            """,

            [

                comment_id,

            ],

        )

        return (

            _row_to_dict(

                cursor

            )

        )

# ============================================================

# COMMENT MODERATION

#

# Same behavior as Manage News:

#

# hide

# restore

# delete

# ============================================================

@transaction.atomic

def moderate_admin_announcement_comment(

    comment_id,

    *,

    action,

    reason="",

):

    comment_id = (

        _positive_integer(

            comment_id,

            label="Comment ID",

        )

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

    old_comment = (

        _get_comment_for_moderation(

            comment_id

        )

    )

    if old_comment is None:

        raise LookupError(

            "Announcement comment was not found."

        )

    current_status = str(

        old_comment.get(

            "comment_status"

        )

        or "active"

    ).lower()

    if action == "hide":

        if current_status == "hidden":

            raise ValueError(

                "This comment is already hidden."

            )

        if current_status == "deleted":

            raise ValueError(

                "A deleted comment cannot be hidden."

            )

        new_status = "hidden"

    elif action == "restore":

        if current_status == "active":

            raise ValueError(

                "This comment is already active."

            )

        if current_status == "deleted":

            raise ValueError(

                "A deleted comment cannot be restored."

            )

        new_status = "active"

    else:

        if current_status == "deleted":

            raise ValueError(

                "This comment is already deleted."

            )

        new_status = "deleted"

    with connection.cursor() as cursor:

        cursor.execute(

            """

            UPDATE

                announcement_comments

            SET

                comment_status = %s

            WHERE

                comment_id = %s

            """,

            [

                new_status,

                comment_id,

            ],

        )

    updated_comment = (

        _get_comment_for_moderation(

            comment_id

        )

    )

    action_label = {

        "hide":

            "Hidden",

        "restore":

            "Restored",

        "delete":

            "Deleted",

    }[

        action

    ]

    _record_announcement_activity(

        source_table=

            "announcement_comments",

        source_record_id=

            comment_id,

        related_user_id=

            old_comment.get(

                "user_id"

            ),

        entity_type=

            "announcement_comment",

        entity_role=

            old_comment.get(

                "author_role"

            ),

        action=

            action,

        title=

            f"Announcement Comment {action_label}",

        description=(

            f'Comment by '

            f'{old_comment.get("author_name") or "Unknown User"} '

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

# GET REPLY FOR ADMIN MODERATION

# ============================================================

def _get_reply_for_moderation(

    reply_id,

):

    reply_id = (

        _positive_integer(

            reply_id,

            label="Reply ID",

        )

    )

    person_name_sql = (

        _person_name_sql(

            "u"

        )

    )

    with connection.cursor() as cursor:

        cursor.execute(

            f"""

            SELECT

                acr.reply_id,

                acr.comment_id,

                acr.announcement_id,

                acr.replier_id

                    AS user_id,

                acr.reply_content,

                acr.reply_status,

                {person_name_sql}

                    AS author_name,

                u.user_role

                    AS author_role,

                u.status

                    AS user_status

            FROM

                announcement_comment_replies acr

            INNER JOIN

                users u

                ON u.user_id =

                    acr.replier_id

            WHERE

                acr.reply_id = %s

            LIMIT 1

            """,

            [

                reply_id,

            ],

        )

        return (

            _row_to_dict(

                cursor

            )

        )

# ============================================================

# REPLY MODERATION

# ============================================================

@transaction.atomic

def moderate_admin_announcement_reply(

    reply_id,

    *,

    action,

    reason="",

):

    reply_id = (

        _positive_integer(

            reply_id,

            label="Reply ID",

        )

    )

    action = str(

        action or ""

    ).strip().lower()

    if action not in COMMENT_ACTIONS:

        raise ValueError(

            "Reply action must be hide, restore, or delete."

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

    old_reply = (

        _get_reply_for_moderation(

            reply_id

        )

    )

    if old_reply is None:

        raise LookupError(

            "Announcement reply was not found."

        )

    current_status = str(

        old_reply.get(

            "reply_status"

        )

        or "active"

    ).lower()

    if action == "hide":

        if current_status == "hidden":

            raise ValueError(

                "This reply is already hidden."

            )

        if current_status == "deleted":

            raise ValueError(

                "A deleted reply cannot be hidden."

            )

        new_status = "hidden"

    elif action == "restore":

        if current_status == "active":

            raise ValueError(

                "This reply is already active."

            )

        if current_status == "deleted":

            raise ValueError(

                "A deleted reply cannot be restored."

            )

        new_status = "active"

    else:

        if current_status == "deleted":

            raise ValueError(

                "This reply is already deleted."

            )

        new_status = "deleted"

    with connection.cursor() as cursor:

        cursor.execute(

            """

            UPDATE

                announcement_comment_replies

            SET

                reply_status = %s

            WHERE

                reply_id = %s

            """,

            [

                new_status,

                reply_id,

            ],

        )

    updated_reply = (

        _get_reply_for_moderation(

            reply_id

        )

    )

    action_label = {

        "hide":

            "Hidden",

        "restore":

            "Restored",

        "delete":

            "Deleted",

    }[

        action

    ]

    _record_announcement_activity(

        source_table=

            "announcement_comment_replies",

        source_record_id=

            reply_id,

        related_user_id=

            old_reply.get(

                "user_id"

            ),

        entity_type=

            "announcement_reply",

        entity_role=

            old_reply.get(

                "author_role"

            ),

        action=

            action,

        title=

            f"Announcement Reply {action_label}",

        description=(

            f'Reply by '

            f'{old_reply.get("author_name") or "Unknown User"} '

            f'was {action_label.lower()}.'

            + (

                f" Reason: {reason}"

                if reason

                else ""

            )

        ),

        old_data=

            old_reply,

        new_data=

            updated_reply,

    )

    return updated_reply

# ============================================================

# USER PENALTY

# ============================================================

@transaction.atomic

def _penalize_user(

    *,

    user_id,

    author_name,

    author_role,

    user_status,

    source_table,

    source_record_id,

    entity_type,

    reason,

):

    reason = _clean_reason(

        reason,

        required=True,

    )

    user_id = (

        _positive_integer(

            user_id,

            label="User ID",

        )

    )

    current_status = str(

        user_status or ""

    ).lower()

    if current_status == "deactivated":

        raise ValueError(

            "This user account is already deactivated."

        )

    if current_status != "active":

        raise ValueError(

            "Only active user accounts can be penalized."

        )

    with connection.cursor() as cursor:

        cursor.execute(

            """

            UPDATE

                users

            SET

                status = 'deactivated',

                updated_at =

                    CURRENT_TIMESTAMP

            WHERE

                user_id = %s

            """,

            [

                user_id,

            ],

        )

        cursor.execute(

            """

            SELECT

                user_id,

                user_role,

                status,

                updated_at

            FROM

                users

            WHERE

                user_id = %s

            LIMIT 1

            """,

            [

                user_id,

            ],

        )

        updated_user = (

            _row_to_dict(

                cursor

            )

        )

    _record_announcement_activity(

        source_table=

            source_table,

        source_record_id=

            source_record_id,

        related_user_id=

            user_id,

        entity_type=

            entity_type,

        entity_role=

            author_role,

        action=

            "penalized",

        title=

            "Announcement User Penalized",

        description=(

            f'{author_name or "User"} was penalized '

            f"for an Announcement interaction. "

            f"Reason: {reason}"

        ),

        old_data={

            "user_id":

                user_id,

            "user_status":

                current_status,

            "author_name":

                author_name,

            "author_role":

                author_role,

        },

        new_data=

            updated_user,

    )

    return updated_user

# ============================================================

# PENALIZE COMMENT AUTHOR

# ============================================================

@transaction.atomic

def penalize_announcement_comment_author(

    comment_id,

    *,

    reason,

):

    comment = (

        _get_comment_for_moderation(

            comment_id

        )

    )

    if comment is None:

        raise LookupError(

            "Announcement comment was not found."

        )

    return _penalize_user(

        user_id=

            comment["user_id"],

        author_name=

            comment.get(

                "author_name"

            ),

        author_role=

            comment.get(

                "author_role"

            ),

        user_status=

            comment.get(

                "user_status"

            ),

        source_table=

            "announcement_comments",

        source_record_id=

            comment["comment_id"],

        entity_type=

            "announcement_comment_penalty",

        reason=

            reason,

    )

# ============================================================

# PENALIZE REPLY AUTHOR

# ============================================================

@transaction.atomic

def penalize_announcement_reply_author(

    reply_id,

    *,

    reason,

):

    reply = (

        _get_reply_for_moderation(

            reply_id

        )

    )

    if reply is None:

        raise LookupError(

            "Announcement reply was not found."

        )

    return _penalize_user(

        user_id=

            reply["user_id"],

        author_name=

            reply.get(

                "author_name"

            ),

        author_role=

            reply.get(

                "author_role"

            ),

        user_status=

            reply.get(

                "user_status"

            ),

        source_table=

            "announcement_comment_replies",

        source_record_id=

            reply["reply_id"],

        entity_type=

            "announcement_reply_penalty",

        reason=

            reason,

    )
