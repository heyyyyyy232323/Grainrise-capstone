"""
WebSocket consumer for GrainRise authenticated real-time messaging.

Handles:
- Token-based connection authentication (JWT via query parameter ?token=<jwt>)
- Subscribing to user-specific group gr_msg_user_<user_id>
- Typing indicators (throttled/ephemeral, never stored in DB)
- Forwarding realtime.event payloads to the connected WebSocket client
- Ping/pong heartbeats
"""

import json
import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .broadcast import user_group
from .identity import (
    authenticate_token,
    resolve_thread_target_user,
    sender_branch_thread_ids,
)

logger = logging.getLogger(__name__)


class MessageConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = None
        self.identity = None
        self.group_name = None

    async def connect(self):
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token")
        token = token_list[0] if token_list else None

        if not token:
            logger.warning("WebSocket connection rejected: No token provided.")
            await self.close(code=4001)
            return

        identity = await database_sync_to_async(authenticate_token)(token)
        if not identity:
            logger.warning("WebSocket connection rejected: Invalid or expired token.")
            await self.close(code=4001)
            return

        self.identity = identity
        self.user_id = identity["user_id"]
        self.group_name = user_group(self.user_id)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json({
            "type": "connection.established",
            "user_id": self.user_id,
            "role": self.identity["role"],
        })

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")

        if event_type == "ping":
            await self.send_json({"type": "pong"})
            return

        if event_type == "typing":
            thread_id = content.get("thread_id")
            if not thread_id:
                return

            target_user_id = await database_sync_to_async(resolve_thread_target_user)(thread_id)
            if not target_user_id or target_user_id == self.user_id:
                return

            branch_id = content.get("branch_id")
            candidates = sender_branch_thread_ids(self.identity, branch_id)
            primary_thread_id = candidates[0] if candidates else f"user_{self.user_id}"

            is_typing = bool(content.get("is_typing", False))

            payload = {
                "type": "typing",
                "thread_id": primary_thread_id,
                "thread_ids": candidates,
                "is_typing": is_typing,
                "sender_user_id": self.user_id,
            }

            target_group = user_group(target_user_id)
            await self.channel_layer.group_send(
                target_group,
                {
                    "type": "realtime.event",
                    "payload": payload,
                },
            )

    async def realtime_event(self, event):
        """Handler for events dispatched to group with type='realtime.event'"""
        await self.send_json(event["payload"])

