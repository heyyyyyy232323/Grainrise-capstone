from django.urls import path
from .views import (
    message_threads_view,
    message_conversation_view,
    send_message_view,
)

urlpatterns = [
    path("threads/", message_threads_view, name="farmer_message_threads"),
    path("conversation/", message_conversation_view, name="farmer_message_conversation"),
    path("send/", send_message_view, name="farmer_send_message"),
]
