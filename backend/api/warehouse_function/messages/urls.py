from django.urls import path
from .views import (
    warehouse_message_threads_view,
    warehouse_message_conversation_view,
    warehouse_send_message_view,
    warehouse_active_profanity_view,
)

urlpatterns = [
    path("threads/", warehouse_message_threads_view, name="warehouse_message_threads"),
    path("conversation/", warehouse_message_conversation_view, name="warehouse_message_conversation"),
    path("send/", warehouse_send_message_view, name="warehouse_send_message"),
    path("active-profanity/", warehouse_active_profanity_view, name="warehouse_active_profanity"),
]

