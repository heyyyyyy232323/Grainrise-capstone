import datetime
from django.core.cache import cache
from django.db import connection

from api.realtime.broadcast import broadcast_messages_seen


def invalidate_farmer_messages_cache(user_id=None, thread_id=None):
    """Invalidate cached conversation threads and message history for a user."""
    if user_id:
        cache.delete(f"farmer_threads_{user_id}")
        if thread_id:
            cache.delete(f"farmer_conv_{user_id}_{thread_id}")


def _format_datetime(dt):
    if not dt:
        return ""
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.isoformat()
    return str(dt)


def list_farmer_message_threads(farmer_user_id, search=""):
    """
    List all active message threads for the authenticated Farmer.
    Security rule: Only display contacts where actual conversation history exists.
    """
    clean_search = (search or "").strip()
    cache_key = f"farmer_threads_{farmer_user_id}"

    if not clean_search:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
    query = """
        SELECT
            m.message_id,
            m.sender_supplier_profile_id,
            m.receiver_supplier_profile_id,
            m.sender_user_id,
            m.receiver_user_id,
            m.sender_warehouse_profile_id,
            m.receiver_warehouse_profile_id,
            m.message_content,
            m.created_at,
            m.seen_at,
            m.replied_to_message_id
        FROM messages m
        WHERE m.sender_user_id = %s OR m.receiver_user_id = %s
        ORDER BY m.created_at DESC, m.message_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [farmer_user_id, farmer_user_id])
        message_rows = cursor.fetchall()

    # Group messages by conversation thread
    raw_threads = {}
    for r in message_rows:
        msg_id = r[0]
        s_sp, r_sp, s_u, r_u, s_wh, r_wh, content, created_at, seen_at, reply_id = r[1:]

        is_mine = (s_u == farmer_user_id)

        # Counterparty reference
        o_sp = r_sp if is_mine else s_sp
        o_wh = r_wh if is_mine else s_wh
        o_u = r_u if is_mine else s_u

        if o_sp:
            tid = f"supplier_{o_sp}"
            ptype = "supplier"
            pid = o_sp
        elif o_wh:
            tid = f"warehouse_{o_wh}"
            ptype = "warehouse"
            pid = o_wh
        elif o_u and o_u != farmer_user_id:
            tid = f"user_{o_u}"
            ptype = "user"
            pid = o_u
        else:
            continue

        if tid not in raw_threads:
            raw_threads[tid] = {
                "participant_type": ptype,
                "participant_id": pid,
                "latest_message": content or "",
                "latest_message_at": created_at,
                "is_sender_me": is_mine,
                "unread_count": 0,
                "messages_count": 0,
            }

        raw_threads[tid]["messages_count"] += 1
        if not is_mine and seen_at is None:
            raw_threads[tid]["unread_count"] += 1

    if not raw_threads:
        return []

    # Resolve participant metadata
    supplier_ids = [t["participant_id"] for t in raw_threads.values() if t["participant_type"] == "supplier"]
    warehouse_ids = [t["participant_id"] for t in raw_threads.values() if t["participant_type"] == "warehouse"]
    user_ids = [t["participant_id"] for t in raw_threads.values() if t["participant_type"] == "user"]

    supplier_dict = {}
    warehouse_dict = {}
    user_dict = {}

    with connection.cursor() as cursor:
        if supplier_ids:
            ph = ",".join(["%s"] * len(supplier_ids))
            cursor.execute(
                f"""
                SELECT
                    sp.supplier_profile_id,
                    sp.business_name,
                    sp.organization_name,
                    sp.municipality,
                    sp.province,
                    sp.user_id,
                    u.first_name,
                    u.last_name,
                    u.email
                FROM supplier_profiles sp
                LEFT JOIN users u ON u.user_id = sp.user_id
                WHERE sp.supplier_profile_id IN ({ph})
                """,
                supplier_ids,
            )
            for row in cursor.fetchall():
                biz_name = row[1] or row[2] or f"Miller #{row[0]}"
                owner_name = f"{row[6] or ''} {row[7] or ''}".strip()
                loc = f"{row[3] or ''}, {row[4] or ''}".strip(", ")
                sub = f"{biz_name} • {loc}" if loc else biz_name
                supplier_dict[row[0]] = {
                    "name": biz_name,
                    "subtitle": sub,
                    "role": "Miller / Supplier",
                    "user_id": row[5],
                    "supplier_profile_id": row[0],
                }

        if warehouse_ids:
            ph = ",".join(["%s"] * len(warehouse_ids))
            cursor.execute(
                f"""
                SELECT
                    wp.warehouse_profile_id,
                    wp.business_name,
                    wp.municipality,
                    wp.province,
                    wp.user_id,
                    u.first_name,
                    u.last_name
                FROM warehouse_profiles wp
                LEFT JOIN users u ON u.user_id = wp.user_id
                WHERE wp.warehouse_profile_id IN ({ph})
                """,
                warehouse_ids,
            )
            for row in cursor.fetchall():
                w_name = row[1] or f"Warehouse #{row[0]}"
                warehouse_dict[row[0]] = {
                    "name": w_name,
                    "subtitle": f"Warehouse • {row[2] or ''}".strip(" •"),
                    "role": "Warehouse",
                    "user_id": row[4],
                    "warehouse_profile_id": row[0],
                }

        if user_ids:
            ph = ",".join(["%s"] * len(user_ids))
            cursor.execute(
                f"""
                SELECT user_id, first_name, last_name, user_role, email
                FROM users
                WHERE user_id IN ({ph})
                """,
                user_ids,
            )
            for row in cursor.fetchall():
                u_name = f"{row[1] or ''} {row[2] or ''}".strip() or f"User #{row[0]}"
                role = str(row[3] or "User").replace("_", " ").title()
                user_dict[row[0]] = {
                    "name": u_name,
                    "subtitle": f"{role} • {row[4] or ''}".strip(" •"),
                    "role": role,
                    "user_id": row[0],
                }

    final_threads = []
    for tid, t in raw_threads.items():
        ptype = t["participant_type"]
        pid = t["participant_id"]

        meta = {}
        if ptype == "supplier" and pid in supplier_dict:
            meta = supplier_dict[pid]
        elif ptype == "warehouse" and pid in warehouse_dict:
            meta = warehouse_dict[pid]
        elif ptype == "user" and pid in user_dict:
            meta = user_dict[pid]

        final_threads.append({
            "thread_id": tid,
            "participant_type": ptype,
            "participant_id": pid,
            "participant_user_id": meta.get("user_id"),
            "participant_supplier_id": pid if ptype == "supplier" else None,
            "participant_warehouse_id": pid if ptype == "warehouse" else None,
            "name": meta.get("name") or f"{ptype.title()} #{pid}",
            "subtitle": meta.get("subtitle") or ptype.title(),
            "role": meta.get("role") or ptype.title(),
            "latest_message": t["latest_message"],
            "latest_message_at": _format_datetime(t["latest_message_at"]),
            "is_sender_me": t["is_sender_me"],
            "unread_count": t["unread_count"],
            "messages_count": t["messages_count"],
        })

    # Filter by search term if provided
    clean_search = (search or "").strip().lower()
    if clean_search:
        filtered = []
        for t in final_threads:
            if (
                clean_search in t["name"].lower()
                or clean_search in t["subtitle"].lower()
                or clean_search in t["role"].lower()
                or clean_search in t["latest_message"].lower()
            ):
                filtered.append(t)
        final_threads = filtered

    # Sort conversations by latest message descending
    final_threads.sort(
        key=lambda x: x["latest_message_at"] or "",
        reverse=True,
    )

    if not clean_search:
        cache.set(cache_key, final_threads, timeout=60)

    return final_threads


def get_farmer_conversation(farmer_user_id, thread_id=None, participant_type=None, participant_id=None):
    """
    Retrieve message history between Farmer and a specific participant.
    Marks all incoming unread messages as seen.
    """
    if thread_id and (not participant_type or not participant_id):
        parts = str(thread_id).split("_", 1)
        if len(parts) == 2:
            participant_type, participant_id = parts[0], parts[1]

    if not participant_type or not participant_id:
        return None

    try:
        participant_id = int(participant_id)
    except (TypeError, ValueError):
        return None

    actual_thread_id = f"{participant_type}_{participant_id}"
    cache_key = f"farmer_conv_{farmer_user_id}_{actual_thread_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    participant_user_id = None
    participant_name = ""
    participant_subtitle = ""
    participant_role = ""

    with connection.cursor() as cursor:
        if participant_type == "supplier":
            cursor.execute(
                """
                SELECT
                    sp.supplier_profile_id,
                    sp.business_name,
                    sp.organization_name,
                    sp.municipality,
                    sp.province,
                    sp.user_id,
                    u.first_name,
                    u.last_name
                FROM supplier_profiles sp
                LEFT JOIN users u ON u.user_id = sp.user_id
                WHERE sp.supplier_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if row:
                participant_name = row[1] or row[2] or f"Miller #{row[0]}"
                participant_role = "Miller / Supplier"
                loc = f"{row[3] or ''}, {row[4] or ''}".strip(", ")
                participant_subtitle = f"{participant_name} • {loc}" if loc else participant_name
                participant_user_id = row[5]

        elif participant_type == "warehouse":
            cursor.execute(
                """
                SELECT
                    wp.warehouse_profile_id,
                    wp.business_name,
                    wp.municipality,
                    wp.user_id,
                    u.first_name,
                    u.last_name
                FROM warehouse_profiles wp
                LEFT JOIN users u ON u.user_id = wp.user_id
                WHERE wp.warehouse_profile_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if row:
                participant_name = row[1] or f"Warehouse #{row[0]}"
                participant_role = "Warehouse"
                participant_subtitle = f"Warehouse • {row[2] or ''}".strip(" •")
                participant_user_id = row[3]

        else:  # 'user'
            cursor.execute(
                """
                SELECT user_id, first_name, last_name, user_role, email
                FROM users
                WHERE user_id = %s
                LIMIT 1
                """,
                [participant_id],
            )
            row = cursor.fetchone()
            if row:
                participant_name = f"{row[1] or ''} {row[2] or ''}".strip() or f"User #{row[0]}"
                participant_role = str(row[3] or "User").replace("_", " ").title()
                participant_subtitle = f"{participant_role} • {row[4] or ''}".strip(" •")
                participant_user_id = row[0]

    thread_info = {
        "thread_id": f"{participant_type}_{participant_id}",
        "participant_type": participant_type,
        "participant_id": participant_id,
        "participant_user_id": participant_user_id,
        "participant_supplier_id": participant_id if participant_type == "supplier" else None,
        "participant_warehouse_id": participant_id if participant_type == "warehouse" else None,
        "name": participant_name or f"{participant_type.title()} #{participant_id}",
        "subtitle": participant_subtitle or participant_role,
        "role": participant_role,
    }

    # Query message history
    if participant_type == "supplier":
        filter_sql = """
            (
                (m.sender_user_id = %s AND (m.receiver_supplier_profile_id = %s OR (m.receiver_user_id = %s AND %s IS NOT NULL)))
                OR
                (m.receiver_user_id = %s AND (m.sender_supplier_profile_id = %s OR (m.sender_user_id = %s AND %s IS NOT NULL)))
            )
        """
        filter_params = [
            farmer_user_id, participant_id, participant_user_id, participant_user_id,
            farmer_user_id, participant_id, participant_user_id, participant_user_id,
        ]
    elif participant_type == "warehouse":
        filter_sql = """
            (
                (m.sender_user_id = %s AND (m.receiver_warehouse_profile_id = %s OR (m.receiver_user_id = %s AND %s IS NOT NULL)))
                OR
                (m.receiver_user_id = %s AND (m.sender_warehouse_profile_id = %s OR (m.sender_user_id = %s AND %s IS NOT NULL)))
            )
        """
        filter_params = [
            farmer_user_id, participant_id, participant_user_id, participant_user_id,
            farmer_user_id, participant_id, participant_user_id, participant_user_id,
        ]
    else:  # user
        filter_sql = """
            (
                (m.sender_user_id = %s AND m.receiver_user_id = %s)
                OR
                (m.receiver_user_id = %s AND m.sender_user_id = %s)
            )
        """
        filter_params = [farmer_user_id, participant_id, farmer_user_id, participant_id]

    query = f"""
        SELECT
            m.message_id,
            m.sender_supplier_profile_id,
            m.receiver_supplier_profile_id,
            m.sender_user_id,
            m.receiver_user_id,
            m.sender_warehouse_profile_id,
            m.receiver_warehouse_profile_id,
            m.message_content,
            m.message_attachment,
            m.created_at,
            m.seen_at,
            m.replied_to_message_id,
            replied.message_content AS replied_content,
            replied.sender_user_id AS replied_sender_user_id
        FROM messages m
        LEFT JOIN messages replied ON replied.message_id = m.replied_to_message_id
        WHERE {filter_sql}
        ORDER BY m.created_at ASC, m.message_id ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, filter_params)
        rows = cursor.fetchall()

    messages_list = []
    unread_ids_to_mark = []

    for r in rows:
        msg_id = r[0]
        s_sp, r_sp, s_u, r_u, s_wh, r_wh, content, attachment, created_at, seen_at, reply_id, replied_content, replied_sender_u = r[1:]

        is_mine = (s_u == farmer_user_id)

        if not is_mine and seen_at is None:
            unread_ids_to_mark.append(msg_id)

        replied_meta = None
        if reply_id:
            replied_is_mine = (replied_sender_u == farmer_user_id)
            replied_meta = {
                "message_id": reply_id,
                "message_content": replied_content or "",
                "sender_name": "You" if replied_is_mine else participant_name,
            }

        messages_list.append({
            "message_id": msg_id,
            "sender_type": "farmer" if is_mine else "other",
            "sender_name": "You" if is_mine else participant_name,
            "is_mine": is_mine,
            "message_content": content or "",
            "message_text": content or "",
            "message_attachment": attachment or "",
            "created_at": _format_datetime(created_at),
            "seen_at": _format_datetime(seen_at),
            "is_seen": seen_at is not None,
            "replied_to_message_id": reply_id,
            "replied_message": replied_meta,
        })

    # Mark unread incoming messages as seen
    if unread_ids_to_mark:
        with connection.cursor() as cursor:
            in_ph = ",".join(["%s"] * len(unread_ids_to_mark))
            cursor.execute(
                f"""
                UPDATE messages
                SET seen_at = NOW()
                WHERE message_id IN ({in_ph})
                """,
                unread_ids_to_mark,
            )
        broadcast_messages_seen(unread_ids_to_mark)
        # Clear cached threads to reflect read status
        cache.delete(f"farmer_threads_{farmer_user_id}")

    result = {
        "thread": thread_info,
        "messages": messages_list,
    }

    cache.set(cache_key, result, timeout=60)
    return result
