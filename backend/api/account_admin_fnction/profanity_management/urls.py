from django.urls import path

from .views import (
    profanity_detail_view,
    profanity_list_create_view,
    profanity_statuses_view,
)

urlpatterns = [
    path(
        "",
        profanity_list_create_view,
        name="profanity_list_create",
    ),
    path(
        "statuses/",
        profanity_statuses_view,
        name="profanity_statuses",
    ),
    path(
        "<int:profanity_id>/",
        profanity_detail_view,
        name="profanity_detail",
    ),
]

