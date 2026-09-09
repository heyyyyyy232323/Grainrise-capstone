from django.urls import path

from . import admin_views
from . import views


urlpatterns = [

    # ========================================================
    # ADMIN
    # ========================================================

    # Sync status
    # DB only
    path(
        "admin/status/",
        admin_views.admin_news_sync_status,
        name="admin-news-sync-status",
    ),


    # Fetch latest news
    # IMPORTANT: consumes NewsData credits
    path(
        "admin/fetch-latest/",
        admin_views.admin_fetch_latest_news,
        name="admin-fetch-latest-news",
    ),


    # Admin article list
    path(
        "admin/articles/",
        admin_views.admin_news_articles,
        name="admin-news-articles",
    ),


    # Admin article detail
    path(
        "admin/articles/<int:news_id>/",
        admin_views.admin_news_article_detail,
        name="admin-news-article-detail",
    ),


    # Archive / restore
    path(
        "admin/articles/<int:news_id>/status/",
        admin_views.admin_news_article_status,
        name="admin-news-article-status",
    ),


    # Delete article
    path(
        "admin/articles/<int:news_id>/delete/",
        admin_views.admin_news_article_delete,
        name="admin-news-article-delete",
    ),


    # Comment moderation
    # hide / restore / delete
    path(
        "admin/comments/<int:comment_id>/moderate/",
        admin_views.admin_news_comment_moderate,
        name="admin-news-comment-moderate",
    ),


    # Penalize commenter
    # no redirect
    # reason required
    path(
        "admin/comments/<int:comment_id>/penalize/",
        admin_views.admin_news_comment_penalize,
        name="admin-news-comment-penalize",
    ),


    # ========================================================
    # MAIN USER NEWS
    # ========================================================

    # Feed
    path(
        "",
        views.news_feed,
        name="news-feed",
    ),


    # Article detail
    path(
        "<int:news_id>/",
        views.news_article_detail,
        name="news-article-detail",
    ),


    # Like / unlike
    path(
        "<int:news_id>/reaction/",
        views.news_reaction,
        name="news-reaction",
    ),


    # Comments / replies
    path(
        "<int:news_id>/comments/",
        views.news_comments,
        name="news-comments",
    ),


    # Delete own comment
    path(
        "comments/<int:comment_id>/",
        views.delete_news_comment,
        name="delete-news-comment",
    ),
]