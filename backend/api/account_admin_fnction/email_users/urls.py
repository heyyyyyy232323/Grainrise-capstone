from django.urls import path

from . import views


app_name = "email_users"


urlpatterns = [
    # ========================================================
    # SEARCH SPECIFIC USERS
    # ========================================================

    path(
        "recipients/",
        views.email_users_recipients,
        name="recipients",
    ),


    # ========================================================
    # SENT HISTORY LIST
    # ========================================================

    path(
        "history/",
        views.email_users_history,
        name="history",
    ),


    # ========================================================
    # SENT EMAIL DETAILS
    # ========================================================

    path(
        "history/<int:email_history_id>/",
        views.email_users_history_detail,
        name="history-detail",
    ),


    # ========================================================
    # SEND EMAIL
    # ========================================================

    path(
        "send/",
        views.email_users_send,
        name="send",
    ),
]