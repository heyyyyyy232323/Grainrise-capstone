import datetime
from django.db import connection

from api.realtime.broadcast import broadcast_messages_seen


def _get_miller_branch_ids(miller_user_id):
    """
    Get all supplier_profile_ids owned by the Miller Manager.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT supplier_profile_id
            FROM supplier_profiles
            WHERE user_id = %s
            """,
            [miller_user_id],
        )
        return [r[0] for r in cursor.fetchall()]


def _format_datetime(dt):
    if not dt:
        return ""
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.isoformat()
    return str(dt)


def list_miller_message_threads(miller_user_id, search=""):
    """
    List all message threads for the authenticated Miller Manager.
    Also includes registered contacts (warehouses and retailers) so conversations can be started.
    """
    owned_branch_ids = _get_miller_branch_ids(miller_user_id)
    owned_branch_set = set(owned_branch_ids)

    # 1. Fetch all messages involving the miller manager or their branches
    where_clauses = ["m.sender_user_id = %s", "m.receiver_user_id = %s"]
    params = [miller_user_id, miller_user_id]

    if owned_branch_ids:
        placeholders = ",".join(["%s"] * len(owned_branch_ids))
        where_clauses.append(f"m.sender_supplier_profile_id IN ({placeholders})")
        where_clauses.append(f"m.receiver_supplier_profile_id IN ({placeholders})")
        params.extend(owned_branch_ids)
        params.extend(owned_branch_ids)

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
            m.created_at,
            m.seen_at,
            m.replied_to_message_id
        FROM messages m
        WHERE {" OR ".join(where_clauses)}
        ORDER BY m.created_at DESC, m.message_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        message_rows = cursor.fetchall()

    # 2. Group messages by conversation thread
    raw_threads = {}
    for r in message_rows:
        msg_id = r[0]
        s_sp, r_sp, s_u, r_u, s_wh, r_wh, content, created_at, seen_at, reply_id = r[1:]

        is_mine = (s_u == miller_user_id) or (s_sp in owned_branch_set)

        if is_mine:
            other_wh = r_wh
            other_sp = r_sp
            other_u = r_u
        else:
            other_wh = s_wh
            other_sp = s_sp
            other_u = s_u

        if other_wh:
            thread_id = f"warehouse_{other_wh}"
            ptype = "warehouse"
            pid = other_wh
        elif other_sp and other_sp not in owned_branch_set:
            thread_id = f"supplier_{other_sp}"
            ptype = "supplier"
            pid = other_sp
        elif other_u and other_u != miller_user_id:
            thread_id = f"user_{other_u}"
            ptype = "user"
            pid = other_u
        else:
            continue

        if thread_id not in raw_threads:
            raw_threads[thread_id] = {
                "thread_id": thread_id,
                "participant_type": ptype,
                "participant_id": pid,
                "latest_message": content or "",
                "latest_message_at": created_at,
                "is_sender_me": is_mine,
                "unread_count": 0,
                "messages_count": 0,
            }

        raw_threads[thread_id]["messages_count"] += 1
        if not is_mine and seen_at is None:
            raw_threads[thread_id]["unread_count"] += 1

    # 3. Enrich thread participants with metadata (names, roles, subtitles)
    with connection.cursor() as cursor:
        # Load all warehouses
        cursor.execute(
            """
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
            """
        )
        all_warehouses = cursor.fetchall()

        # Load all users (retailers, farmers, etc.)
        cursor.execute(
            """
            SELECT
                u.user_id,
                u.first_name,
                u.last_name,
                u.user_role,
                u.email
            FROM users u
            WHERE u.user_id != %s
            """,
            [miller_user_id],
        )
        all_users = cursor.fetchall()

        # Load all other suppliers
        cursor.execute(
            """
            SELECT
                sp.supplier_profile_id,
                sp.business_name,
                sp.municipality,
                sp.user_id,
                u.first_name,
                u.last_name
            FROM supplier_profiles sp
            LEFT JOIN users u ON u.user_id = sp.user_id
            WHERE sp.user_id != %s
            """,
            [miller_user_id],
        )
        all_suppliers = cursor.fetchall()

    warehouse_dict = {
        w[0]: {
            "name": w[1] or f"Warehouse #{w[0]}",
            "subtitle": f"Warehouse • {w[5]} {w[6]}".strip() if (w[5] or w[6]) else f"Warehouse • {w[2] or ''}".strip(" •"),
            "role": "Warehouse",
            "user_id": w[4],
            "warehouse_profile_id": w[0],
        }
        for w in all_warehouses
    }

    user_dict = {
        u[0]: {
            "name": f"{u[1] or ''} {u[2] or ''}".strip() or f"User #{u[0]}",
            "subtitle": f"{str(u[3] or 'User').replace('_', ' ').title()}",
            "role": str(u[3] or "User").replace("_", " ").title(),
            "user_id": u[0],
            "email": u[4] or "",
        }
        for u in all_users
    }

    supplier_dict = {
        s[0]: {
            "name": s[1] or f"Supplier #{s[0]}",
            "subtitle": "Miller / Supplier",
            "role": "Supplier",
            "user_id": s[3],
            "supplier_profile_id": s[0],
        }
        for s in all_suppliers
    }

    final_threads = []

    # Add existing active threads
    for tid, t in raw_threads.items():
        ptype = t["participant_type"]
        pid = t["participant_id"]

        meta = {}
        if ptype == "warehouse" and pid in warehouse_dict:
            meta = warehouse_dict[pid]
        elif ptype == "user" and pid in user_dict:
            meta = user_dict[pid]
        elif ptype == "supplier" and pid in supplier_dict:
            meta = supplier_dict[pid]

        thread_obj = {
            "thread_id": tid,
            "participant_type": ptype,
            "participant_id": pid,
            "participant_user_id": meta.get("user_id"),
            "participant_warehouse_id": pid if ptype == "warehouse" else None,
            "participant_supplier_id": pid if ptype == "supplier" else None,
            "name": meta.get("name") or f"{ptype.title()} #{pid}",
            "subtitle": meta.get("subtitle") or ptype.title(),
            "role": meta.get("role") or ptype.title(),
            "latest_message": t["latest_message"],
            "latest_message_at": _format_datetime(t["latest_message_at"]),
            "is_sender_me": t["is_sender_me"],
            "unread_count": t["unread_count"],
            "messages_count": t["messages_count"],
        }
        final_threads.append(thread_obj)

    # 4. Apply search filtering if provided (filtering ONLY existing conversations with message history)
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

    # 5. Sort: conversations by their latest actual message timestamp, newest first
    final_threads.sort(key=lambda item: item["latest_message_at"] or "", reverse=True)
    return final_threads


def get_miller_conversation(miller_user_id, thread_id=None, participant_type=None, participant_id=None):
    """
    Retrieve message history for a conversation between the authenticated Miller Manager
    and the specified participant. Also marks unread messages as seen.
    """
    owned_branch_ids = _get_miller_branch_ids(miller_user_id)
    owned_branch_set = set(owned_branch_ids)

    # Resolve participant
    if thread_id and not participant_type:
        parts = str(thread_id).split("_", 1)
        if len(parts) == 2:
            participant_type, participant_id = parts[0], parts[1]

    if not participant_type or not participant_id:
        return None

    try:
        participant_id = int(participant_id)
    except (TypeError, ValueError):
        return None

    # Load participant details
    participant_user_id = None
    participant_name = ""
    participant_subtitle = ""
    participant_role = ""

    with connection.cursor() as cursor:
        if participant_type == "warehouse":
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
            w_row = cursor.fetchone()
            if w_row:
                participant_name = w_row[1] or f"Warehouse #{w_row[0]}"
                user_full = f"{w_row[4] or ''} {w_row[5] or ''}".strip()
                participant_subtitle = f"Warehouse • {user_full}" if user_full else "Warehouse"
                participant_role = "Warehouse"
                participant_user_id = w_row[3]
        elif participant_type == "supplier":
            cursor.execute(
                """
                SELECT
                    sp.supplier_profile_id,
                    sp.business_name,
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
            s_row = cursor.fetchone()
            if s_row:
                participant_name = s_row[1] or f"Supplier #{s_row[0]}"
                participant_subtitle = "Miller / Supplier"
                participant_role = "Supplier"
                participant_user_id = s_row[2]
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
            u_row = cursor.fetchone()
            if u_row:
                participant_name = f"{u_row[1] or ''} {u_row[2] or ''}".strip() or f"User #{u_row[0]}"
                participant_role = str(u_row[3] or "User").replace("_", " ").title()
                participant_subtitle = f"{participant_role} • {u_row[4] or ''}".strip(" •")
                participant_user_id = u_row[0]

    thread_info = {
        "thread_id": f"{participant_type}_{participant_id}",
        "participant_type": participant_type,
        "participant_id": participant_id,
        "participant_user_id": participant_user_id,
        "participant_warehouse_id": participant_id if participant_type == "warehouse" else None,
        "participant_supplier_id": participant_id if participant_type == "supplier" else None,
        "name": participant_name or f"{participant_type.title()} #{participant_id}",
        "subtitle": participant_subtitle or participant_role,
        "role": participant_role,
    }

    # Build conversation query
    branch_placeholders = ",".join(["%s"] * len(owned_branch_ids)) if owned_branch_ids else "%s"
    branch_args = owned_branch_ids if owned_branch_ids else [0]

    if participant_type == "warehouse":
        filter_sql = f"""
            (
                ((m.sender_user_id = %s OR m.sender_supplier_profile_id IN ({branch_placeholders}))
                 AND (m.receiver_warehouse_profile_id = %s OR (m.receiver_user_id = %s AND %s IS NOT NULL)))
                OR
                ((m.receiver_user_id = %s OR m.receiver_supplier_profile_id IN ({branch_placeholders}))
                 AND (m.sender_warehouse_profile_id = %s OR (m.sender_user_id = %s AND %s IS NOT NULL)))
            )
        """
        filter_params = [
            miller_user_id, *branch_args, participant_id, participant_user_id, participant_user_id,
            miller_user_id, *branch_args, participant_id, participant_user_id, participant_user_id,
        ]
    elif participant_type == "supplier":
        filter_sql = f"""
            (
                ((m.sender_user_id = %s OR m.sender_supplier_profile_id IN ({branch_placeholders}))
                 AND m.receiver_supplier_profile_id = %s)
                OR
                ((m.receiver_user_id = %s OR m.receiver_supplier_profile_id IN ({branch_placeholders}))
                 AND m.sender_supplier_profile_id = %s)
            )
        """
        filter_params = [
            miller_user_id, *branch_args, participant_id,
            miller_user_id, *branch_args, participant_id,
        ]
    else:  # user
        filter_sql = f"""
            (
                ((m.sender_user_id = %s OR m.sender_supplier_profile_id IN ({branch_placeholders}))
                 AND m.receiver_user_id = %s AND m.receiver_warehouse_profile_id IS NULL)
                OR
                ((m.receiver_user_id = %s OR m.receiver_supplier_profile_id IN ({branch_placeholders}))
                 AND m.sender_user_id = %s AND m.sender_warehouse_profile_id IS NULL)
            )
        """
        filter_params = [
            miller_user_id, *branch_args, participant_id,
            miller_user_id, *branch_args, participant_id,
        ]

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

        is_mine = (s_u == miller_user_id) or (s_sp in owned_branch_set)

        if not is_mine and seen_at is None:
            unread_ids_to_mark.append(msg_id)

        replied_meta = None
        if reply_id:
            replied_is_mine = (replied_sender_u == miller_user_id)
            replied_meta = {
                "message_id": reply_id,
                "message_content": replied_content or "",
                "sender_name": "You" if replied_is_mine else participant_name,
            }

        messages_list.append({
            "message_id": msg_id,
            "sender_type": "miller" if is_mine else "other",
            "sender_name": "You" if is_mine else participant_name,
            "message_content": content or "",
            "message_text": content or "",  # backward compatibility
            "message_attachment": attachment or "",
            "created_at": _format_datetime(created_at),
            "seen_at": _format_datetime(seen_at),
            "is_seen": seen_at is not None,
            "replied_to_message_id": reply_id,
            "replied_message": replied_meta,
        })

    # Mark unread messages received by Miller as seen
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

    return {
        "thread": thread_info,
        "messages": messages_list,
    }

