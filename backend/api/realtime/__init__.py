"""
GRAINRISE real-time messaging (Django Channels).

Only ephemeral events travel through this package:
- message.created  -> emitted AFTER a message row is persisted
- messages.seen    -> emitted AFTER seen_at is updated
- typing           -> never stored anywhere

All message data stays in the existing `messages` table.
"""

