import datetime
from django.db import connection

from api.realtime.broadcast import broadcast_message_created


def _format_datetime(dt):
    if not dt:
        return ""
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.isoformat()
    return str(dt)


def send_farmer_message(farmer_user_id, data):
    """
    Insert a new message into messages table sent by the authenticated Farmer.
    Validates profanity, recipient validity, and reply references.
    """
    content = str(data.get("message_content") or data.get("message_text") or data.get("message") or "").strip()
    if not content:
        raise ValueError("Message content cannot be empty.")
    if len(content) > 5000:
        raise ValueError("Message content exceeds maximum limit of 5000 characters.")

    # 1. Profanity Detection & Moderation
    from api.chat_moderation import find_profanity_matches
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

    # 2. Parse Recipient
    participant_type = data.get("participant_type")
    participant_id = data.get("participant_id")
    thread_id = data.get("thread_id")

    if thread_id and (not participant_type or not participant_id):
        parts = str(thread_id).split("_", 1)
        if len(parts) == 2:
            participant_type, participant_id = parts[0], parts[1]

    if not participant_type or not participant_id:
        raise ValueError("A valid message recipient (thread_id or participant_type/participant_id) is required.")

    try:
        participant_id = int(participant_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid recipient ID.")

    receiver_user_id = None
    receiver_supplier_profile_id = None
    receiver_warehouse_profile_id = None

    with connection.cursor() as cursor:
        if participant_type == "supplier":
            cursor.execute(
                """
                SELECT supplier_profile_id, user_id
                FROM supplier_profiles
                WHERE supplier_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Target Miller / Supplier was not found.")
            receiver_supplier_profile_id = row[0]
            receiver_user_id = row[1]

        elif participant_type == "warehouse":
            cursor.execute(
                """
                SELECT warehouse_profile_id, user_id
                FROM warehouse_profiles
                WHERE warehouse_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Target Warehouse was not found.")
            receiver_warehouse_profile_id = row[0]
            receiver_user_id = row[1]

        elif participant_type == "user":
            cursor.execute(
                """
                SELECT user_id
                FROM users
                WHERE user_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Target user was not found.")
            receiver_user_id = row[0]
        else:
            raise ValueError(f"Unsupported participant type: {participant_type}")

    # 3. Validate Reply Reference if provided
    replied_to_id = data.get("replied_to_message_id")
    replied_meta = None
    if replied_to_id:
        try:
            replied_to_id = int(replied_to_id)
        except (TypeError, ValueError):
            replied_to_id = None

    if replied_to_id:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT message_id, message_content, sender_user_id
                FROM messages
                WHERE message_id = %s
                  AND (sender_user_id = %s OR receiver_user_id = %s)
                LIMIT 1
                """,
                [replied_to_id, farmer_user_id, farmer_user_id],
            )
            rep_row = cursor.fetchone()
            if rep_row:
                replied_meta = {
                    "message_id": rep_row[0],
                    "message_content": rep_row[1] or "",
                    "sender_name": "You" if rep_row[2] == farmer_user_id else "Participant",
                }
            else:
                replied_to_id = None

    # 4. Insert Message into shared `messages` table
    attachment = data.get("message_attachment") or None

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
                replied_to_message_id,
                created_at
            ) VALUES (
                NULL,
                %s,
                %s,
                %s,
                NULL,
                %s,
                %s,
                %s,
                %s,
                NOW()
            )
            """,
            [
                receiver_supplier_profile_id,
                farmer_user_id,
                receiver_user_id,
                receiver_warehouse_profile_id,
                content,
                attachment,
                replied_to_id,
            ],
        )
        new_msg_id = cursor.lastrowid

        cursor.execute(
            """
            SELECT message_id, message_content, message_attachment, created_at, seen_at, replied_to_message_id
            FROM messages
            WHERE message_id = %s
            LIMIT 1
            """,
            [new_msg_id],
        )
        saved = cursor.fetchone()

    # Invalidate cached threads and conversation for instant consistency
    try:
        from .selectors import invalidate_farmer_messages_cache
        invalidate_farmer_messages_cache(farmer_user_id, f"{participant_type}_{participant_id}")
        if receiver_user_id:
            invalidate_farmer_messages_cache(receiver_user_id)
    except Exception:
        pass

    # 5. Broadcast real-time WebSocket event
    try:
        broadcast_message_created(new_msg_id)
    except Exception:
        pass

    return {
        "message_id": saved[0],
        "sender_type": "farmer",
        "sender_name": "You",
        "is_mine": True,
        "message_content": saved[1] or "",
        "message_text": saved[1] or "",
        "message_attachment": saved[2] or "",
        "created_at": _format_datetime(saved[3]),
        "seen_at": _format_datetime(saved[4]),
        "is_seen": False,
        "replied_to_message_id": saved[5],
        "replied_message": replied_meta,
    }
