import datetime
from django.db import connection
from api.chat_moderation import find_profanity_matches


def _get_default_warehouse_branch(warehouse_user_id):
    """
    Get the default (primary) warehouse_profile_id for the Warehouse Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT warehouse_profile_id
            FROM warehouse_profiles
            WHERE user_id = %s
            ORDER BY created_at ASC, warehouse_profile_id ASC
            LIMIT 1
            """,
            [warehouse_user_id],
        )
        row = cursor.fetchone()
        return row[0] if row else None


def _format_datetime(dt):
    if not dt:
        return ""
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.isoformat()
    return str(dt)


def get_active_profanity_list():
    """
    Return all active prohibited words from profanity_chat for frontend pre-validation.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT profanity_id, prohibited_text, prohibited_text_normalized
            FROM profanity_chat
            WHERE status = 'active'
            ORDER BY prohibited_text ASC
            """
        )
        rows = cursor.fetchall()
        return [
            {
                "profanity_id": r[0],
                "prohibited_text": r[1],
                "prohibited_text_normalized": r[2] or r[1].lower(),
            }
            for r in rows
        ]


def send_warehouse_message(warehouse_user_id, data):
    """
    Insert a new message into messages table sent by the authenticated Warehouse Manager.
    Validates message content, performs mandatory server-side profanity check,
    resolves sender/receiver branch identities securely, and returns the created message.
    """
    content = str(
        data.get("message_content")
        or data.get("message_text")
        or data.get("message")
        or ""
    ).strip()

    if not content:
        raise ValueError("Message content cannot be empty.")

    if len(content) > 5000:
        raise ValueError("Message content exceeds maximum limit of 5000 characters.")

    # 1. Mandatory server-side profanity check against active profanity_chat records
    matches = find_profanity_matches(content)
    if matches:
        detected_words = list(dict.fromkeys(m["prohibited_text"] for m in matches))
        return {
            "success": False,
            "blocked": True,
            "code": "PROFANITY_DETECTED",
            "message": "Your message contains a prohibited word. Please remove it before submitting.",
            "detected_words": detected_words,
            "matches": matches,
        }

    # 2. Resolve participant
    participant_type = data.get("participant_type")
    participant_id = data.get("participant_id")
    thread_id = data.get("thread_id")

    if thread_id and (not participant_type or not participant_id):
        parts = str(thread_id).split("_", 1)
        if len(parts) == 2:
            participant_type, participant_id = parts[0], parts[1]

    if not participant_type or not participant_id:
        raise ValueError("Recipient participant is required.")

    try:
        participant_id = int(participant_id)
    except (TypeError, ValueError):
        raise ValueError(f"Invalid recipient ID: {participant_id}")

    # 3. Determine sender branch (warehouse_profile_id)
    specified_branch = data.get("warehouse_profile_id")
    if specified_branch:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT warehouse_profile_id
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s AND user_id = %s
                LIMIT 1
                """,
                [specified_branch, warehouse_user_id],
            )
            if not cursor.fetchone():
                specified_branch = None

    sender_warehouse_id = specified_branch or _get_default_warehouse_branch(warehouse_user_id)

    receiver_supplier_id = None
    receiver_warehouse_id = None
    receiver_user_id = None

    with connection.cursor() as cursor:
        if participant_type == "supplier":
            receiver_supplier_id = participant_id
            cursor.execute(
                """
                SELECT user_id
                FROM supplier_profiles
                WHERE supplier_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            sp_row = cursor.fetchone()
            if not sp_row:
                raise ValueError("Target supplier / miller branch was not found.")
            receiver_user_id = sp_row[0]

        elif participant_type == "warehouse":
            receiver_warehouse_id = participant_id
            cursor.execute(
                """
                SELECT user_id
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            wh_row = cursor.fetchone()
            if not wh_row:
                raise ValueError("Target warehouse was not found.")
            receiver_user_id = wh_row[0]

        elif participant_type == "user":
            receiver_user_id = participant_id
            cursor.execute(
                """
                SELECT user_id
                FROM users
                WHERE user_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            if not cursor.fetchone():
                raise ValueError("Target user was not found.")
        else:
            raise ValueError(f"Unsupported participant type: {participant_type}")

    # 4. Reply handling
    replied_to_id = data.get("replied_to_message_id")
    replied_meta = None
    if replied_to_id:
        try:
            replied_to_id = int(replied_to_id)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT message_id, message_content, sender_user_id
                    FROM messages
                    WHERE message_id = %s
                    LIMIT 1
                    """,
                    [replied_to_id],
                )
                r_row = cursor.fetchone()
                if r_row:
                    replied_meta = {
                        "message_id": r_row[0],
                        "message_content": r_row[1] or "",
                        "sender_name": "You" if r_row[2] == warehouse_user_id else "Participant",
                    }
                else:
                    replied_to_id = None
        except (TypeError, ValueError):
            replied_to_id = None

    # 5. Attachment handling (up to 500 characters)
    attachment = data.get("message_attachment")
    if attachment is not None:
        attachment = str(attachment).strip()[:500]
        if not attachment:
            attachment = None

    # 6. Insert into messages table
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO messages (
                sender_supplier_profile_id,
                receiver_supplier_profile_id,
                sender_user_id,
                receiver_user_id,
                sender_warehouse_profile_id,
                receiver_warehouse_profile_id,
                message_content,
                message_attachment,
                created_at,
                seen_at,
                replied_to_message_id
            ) VALUES (
                NULL, %s, %s, %s, %s, %s, %s, %s, NOW(), NULL, %s
            )
            """,
            [
                receiver_supplier_id,
                warehouse_user_id,
                receiver_user_id,
                sender_warehouse_id,
                receiver_warehouse_id,
                content,
                attachment,
                replied_to_id,
            ],
        )
        new_msg_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT created_at
            FROM messages
            WHERE message_id = %s
            """,
            [new_msg_id],
        )
        created_at_row = cursor.fetchone()
        created_at = created_at_row[0] if created_at_row else datetime.datetime.now()

    return {
        "message_id": new_msg_id,
        "sender_type": "warehouse",
        "sender_name": "You",
        "message_content": content,
        "message_text": content,
        "message_attachment": attachment or "",
        "created_at": _format_datetime(created_at),
        "seen_at": "",
        "is_seen": False,
        "is_mine": True,
        "replied_to_message_id": replied_to_id,
        "replied_message": replied_meta,
        "thread_id": f"{participant_type}_{participant_id}",
    }

