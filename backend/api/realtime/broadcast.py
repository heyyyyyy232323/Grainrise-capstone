"""
Server-side broadcaster for persisted message events.

Events are computed PER RECIPIENT, using the same thread-grouping rules as
the existing Miller / Warehouse thread selectors, so every client receives
the thread id exactly as it appears in its own conversation list.

Delivery is limited to the `sender_user_id` and `receiver_user_id` of the
persisted row (the only two accounts already allowed to read it through
the REST endpoints). Broadcasting never raises: a channel-layer failure can
never turn a successfully saved message into an API error.
"""

import datetime
import logging

from asgiref.sync import async_to_sync
from django.db import connection, transaction

from .identity import ROLE_MILLER, ROLE_WAREHOUSE, ROLE_FARMER, get_identity

logger = logging.getLogger(__name__)


def user_group(user_id):
    return f"gr_msg_user_{int(user_id)}"


def _fmt(dt):
    if not dt:
        return ""
    if isinstance(dt, (datetime.datetime, datetime.date)):
        return dt.isoformat()
    return str(dt)


def _channel_layer():
    try:
        from channels.layers import get_channel_layer

        return get_channel_layer()
    except Exception:  # pragma: no cover - channels missing/misconfigured
        logger.exception("Channel layer unavailable; realtime event skipped.")
        return None


def _send(groups_payloads):
    layer = _channel_layer()
    if layer is None:
        return
    for group, payload in groups_payloads:
        try:
            async_to_sync(layer.group_send)(group, {"type": "realtime.event", "payload": payload})
        except Exception:
            logger.exception("Failed to publish realtime event to %s", group)


def _thread_for(identity, row):
    """
    Return (thread_id, is_mine) for `identity`, mirroring the selectors.
    """
    s_sp, r_sp, s_u, r_u, s_wh, r_wh = row
    uid = identity["user_id"]

    if identity["role"] == ROLE_MILLER:
        owned = set(identity["supplier_ids"])
        is_mine = (s_u == uid) or (s_sp in owned)
        o_wh, o_sp, o_u = (r_wh, r_sp, r_u) if is_mine else (s_wh, s_sp, s_u)
        if o_wh:
            return f"warehouse_{o_wh}", is_mine
        if o_sp and o_sp not in owned:
            return f"supplier_{o_sp}", is_mine
        if o_u and o_u != uid:
            return f"user_{o_u}", is_mine
        return None, is_mine

    if identity["role"] == ROLE_WAREHOUSE:
        owned = set(identity["warehouse_ids"])
        is_mine = (s_u == uid) or (s_wh in owned)
        o_wh, o_sp, o_u = (r_wh, r_sp, r_u) if is_mine else (s_wh, s_sp, s_u)
        if o_sp:
            return f"supplier_{o_sp}", is_mine
        if o_wh and o_wh not in owned:
            return f"warehouse_{o_wh}", is_mine
        if o_u and o_u != uid:
            return f"user_{o_u}", is_mine
        return None, is_mine

    if identity["role"] == ROLE_FARMER:
        is_mine = (s_u == uid)
        o_wh, o_sp, o_u = (r_wh, r_sp, r_u) if is_mine else (s_wh, s_sp, s_u)
        if o_sp:
            return f"supplier_{o_sp}", is_mine
        if o_wh:
            return f"warehouse_{o_wh}", is_mine
        if o_u and o_u != uid:
            return f"user_{o_u}", is_mine
        return None, is_mine

    return None, False


def _load_message(message_id):
    with connection.cursor() as cursor:
        cursor.execute(
            """
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
                replied.message_content,
                replied.sender_user_id
            FROM messages m
            LEFT JOIN messages replied ON replied.message_id = m.replied_to_message_id
            WHERE m.message_id = %s
            LIMIT 1
            """,
            [message_id],
        )
        return cursor.fetchone()


def _recipient_identities(*user_ids):
    seen = set()
    identities = []
    for uid in user_ids:
        if uid is None or uid in seen:
            continue
        seen.add(uid)
        ident = get_identity(int(uid))
        if ident:
            identities.append(ident)
    return identities


def _publish_message_created(message_id):
    row = _load_message(message_id)
    if not row:
        return

    (
        msg_id, s_sp, r_sp, s_u, r_u, s_wh, r_wh,
        content, attachment, created_at, seen_at,
        reply_id, replied_content, replied_sender_u,
    ) = row
    core = (s_sp, r_sp, s_u, r_u, s_wh, r_wh)

    out = []
    for ident in _recipient_identities(s_u, r_u):
        thread_id, is_mine = _thread_for(ident, core)
        if not thread_id:
            continue

        if ident["role"] == ROLE_MILLER:
            mine_type = "miller"
        elif ident["role"] == ROLE_WAREHOUSE:
            mine_type = "warehouse"
        elif ident["role"] == ROLE_FARMER:
            mine_type = "farmer"
        else:
            mine_type = "user"

        replied_meta = None
        if reply_id:
            replied_meta = {
                "message_id": reply_id,
                "message_content": replied_content or "",
                # Counterpart name is filled in by the client from its thread header.
                "sender_name": "You" if replied_sender_u == ident["user_id"] else None,
            }

        out.append((
            user_group(ident["user_id"]),
            {
                "type": "message.created",
                "thread_id": thread_id,
                "is_mine": is_mine,
                "message": {
                    "message_id": msg_id,
                    "sender_type": mine_type if is_mine else "other",
                    "sender_name": "You" if is_mine else None,
                    "message_content": content or "",
                    "message_text": content or "",
                    "message_attachment": attachment or "",
                    "created_at": _fmt(created_at),
                    "seen_at": _fmt(seen_at),
                    "is_seen": seen_at is not None,
                    "is_mine": is_mine,
                    "replied_to_message_id": reply_id,
                    "replied_message": replied_meta,
                },
            },
        ))

    _send(out)


def _publish_messages_seen(message_ids):
    if not message_ids:
        return

    placeholders = ",".join(["%s"] * len(message_ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                message_id,
                sender_supplier_profile_id,
                receiver_supplier_profile_id,
                sender_user_id,
                receiver_user_id,
                sender_warehouse_profile_id,
                receiver_warehouse_profile_id
            FROM messages
            WHERE message_id IN ({placeholders})
            """,
            list(message_ids),
        )
        rows = cursor.fetchall()

    identity_cache = {}
    grouped = {}  # (user_id, thread_id, is_mine) -> [message_ids]

    for r in rows:
        msg_id, core = r[0], tuple(r[1:])
        for uid in (core[2], core[3]):
            if uid is None:
                continue
            if uid not in identity_cache:
                identity_cache[uid] = get_identity(int(uid))
            ident = identity_cache[uid]
            if not ident:
                continue
            thread_id, is_mine = _thread_for(ident, core)
            if thread_id:
                grouped.setdefault((ident["user_id"], thread_id, is_mine), []).append(msg_id)

    _send([
        (
            user_group(uid),
            {
                "type": "messages.seen",
                "thread_id": thread_id,
                "is_mine": is_mine,
                "message_ids": ids,
            },
        )
        for (uid, thread_id, is_mine), ids in grouped.items()
    ])


def broadcast_message_created(message_id):
    """Publish only after the INSERT is committed."""

    def _run():
        try:
            _publish_message_created(message_id)
        except Exception:
            logger.exception("Realtime broadcast failed for message %s", message_id)

    transaction.on_commit(_run)


def broadcast_messages_seen(message_ids):
    ids = [int(i) for i in (message_ids or [])]
    if not ids:
        return

    def _run():
        try:
            _publish_messages_seen(ids)
        except Exception:
            logger.exception("Realtime seen broadcast failed")

    transaction.on_commit(_run)


def publish_typing(target_user_id, payload):
    _send([(user_group(target_user_id), payload)])

