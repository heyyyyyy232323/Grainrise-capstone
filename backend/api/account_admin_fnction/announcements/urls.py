from django.urls import path

from . import admin_views
from . import user_views


urlpatterns = [

    # ========================================================
    # ANNOUNCEMENT LIST / CREATE
    #
    # GET:
    # /api/admin/announcements/
    #
    # POST:
    # /api/admin/announcements/
    # ========================================================

    path(
        "",
        admin_views.admin_announcements,
        name="admin-announcements",
    ),


    # ========================================================
    # COUNTS
    #
    # GET:
    # /api/admin/announcements/counts/
    # ========================================================

    path(
        "counts/",
        admin_views.admin_announcement_counts,
        name="admin-announcement-counts",
    ),


    # ========================================================
    # DRAFTS
    #
    # GET:
    # /api/admin/announcements/drafts/
    # ========================================================

    path(
        "drafts/",
        admin_views.admin_announcement_drafts,
        name="admin-announcement-drafts",
    ),


    # ========================================================
    # SAVE NEW DRAFT
    #
    # POST:
    # /api/admin/announcements/save-draft/
    # ========================================================

    path(
        "save-draft/",
        admin_views.admin_save_draft,
        name="admin-announcement-save-draft",
    ),


    # ========================================================
    # PUBLISH NEW ANNOUNCEMENT
    #
    # POST:
    # /api/admin/announcements/publish/
    # ========================================================

    path(
        "publish/",
        admin_views.admin_publish_announcement,
        name="admin-announcement-publish",
    ),


    # ========================================================
    # CLIMATE FORECAST
    #
    # POST:
    # /api/admin/announcements/climate/forecast/
    # ========================================================

    path(
        "climate/forecast/",
        admin_views.admin_climate_forecast,
        name="admin-announcement-climate-forecast",
    ),


    # ========================================================
    # AI CLIMATE-INFORMED ARTICLE GENERATION
    #
    # POST:
    # /api/admin/announcements/climate/generate-article/
    # ========================================================

    path(
        "climate/generate-article/",
        admin_views.admin_generate_climate_article,
        name="admin-announcement-generate-climate-article",
    ),


    # ========================================================
    # MANAGEMENT - COMMENT MODERATION
    #
    # PATCH:
    # /api/admin/announcements/comments/<comment_id>/moderate/
    #
    # actions:
    # hide
    # restore
    # delete
    # ========================================================

    path(
        "comments/<int:comment_id>/moderate/",
        admin_views.admin_moderate_announcement_comment,
        name="admin-announcement-comment-moderate",
    ),


    # ========================================================
    # MANAGEMENT - COMMENT AUTHOR PENALTY
    #
    # POST:
    # /api/admin/announcements/comments/<comment_id>/penalize/
    # ========================================================

    path(
        "comments/<int:comment_id>/penalize/",
        admin_views.admin_penalize_announcement_comment_author,
        name="admin-announcement-comment-penalize",
    ),

    path(
        "comments/<int:comment_id>/report/",
        admin_views.report_announcement_comment_view,
        name="report-announcement-comment",
    ),

    path(
        "comments/<int:comment_id>/report",
        admin_views.report_announcement_comment_view,
        name="report-announcement-comment-no-slash",
    ),


    # ========================================================
    # MANAGEMENT - REPLY MODERATION
    #
    # PATCH:
    # /api/admin/announcements/replies/<reply_id>/moderate/
    #
    # actions:
    # hide
    # restore
    # delete
    # ========================================================

    path(
        "replies/<int:reply_id>/moderate/",
        admin_views.admin_moderate_announcement_reply,
        name="admin-announcement-reply-moderate",
    ),


    # ========================================================
    # MANAGEMENT - REPLY AUTHOR PENALTY
    #
    # POST:
    # /api/admin/announcements/replies/<reply_id>/penalize/
    # ========================================================

    path(
        "replies/<int:reply_id>/penalize/",
        admin_views.admin_penalize_announcement_reply_author,
        name="admin-announcement-reply-penalize",
    ),

    path(
        "replies/<int:reply_id>/report/",
        admin_views.report_announcement_reply_view,
        name="report-announcement-reply",
    ),

    path(
        "replies/<int:reply_id>/report",
        admin_views.report_announcement_reply_view,
        name="report-announcement-reply-no-slash",
    ),


    # ========================================================
    # SAVE EXISTING ANNOUNCEMENT AS DRAFT
    #
    # POST:
    # /api/admin/announcements/<announcement_id>/save-draft/
    # ========================================================

    path(
        "<int:announcement_id>/save-draft/",
        admin_views.admin_save_draft,
        name="admin-announcement-save-existing-draft",
    ),


    # ========================================================
    # PUBLISH EXISTING ANNOUNCEMENT
    #
    # POST:
    # /api/admin/announcements/<announcement_id>/publish/
    # ========================================================

    path(
        "<int:announcement_id>/publish/",
        admin_views.admin_publish_announcement,
        name="admin-announcement-publish-existing",
    ),


    # ========================================================
    # ARCHIVE
    #
    # POST:
    # /api/admin/announcements/<announcement_id>/archive/
    # ========================================================

    path(
        "<int:announcement_id>/archive/",
        admin_views.admin_archive_announcement,
        name="admin-announcement-archive",
    ),


    # ========================================================
    # REACTIVATE / RESTORE
    #
    # POST:
    # /api/admin/announcements/<announcement_id>/reactivate/
    # ========================================================

    path(
        "<int:announcement_id>/reactivate/",
        admin_views.admin_reactivate_announcement,
        name="admin-announcement-reactivate",
    ),


    # ========================================================
    # MANAGEMENT - PERMANENT DELETE
    #
    # DELETE:
    # /api/admin/announcements/<announcement_id>/delete/
    # ========================================================

    path(
        "<int:announcement_id>/delete/",
        admin_views.admin_delete_announcement,
        name="admin-announcement-delete",
    ),


    # ========================================================
    # ANNOUNCEMENT DETAIL / UPDATE
    #
    # GET:
    # /api/admin/announcements/<announcement_id>/
    #
    # PUT / PATCH:
    # /api/admin/announcements/<announcement_id>/
    #
    # IMPORTANT:
    # Keep this generic route LAST.
    # ========================================================


    # ========================================================
    # PUBLIC PREVIEW (NO AUTH)
    # ========================================================
    path(
        "public/<str:announcement_id>/",
        user_views.public_announcement,
        name="public-announcement-detail",
    ),

    # ========================================================
    # USER INTERACTIONS
    # ========================================================
    path(
        "<str:announcement_id>/user-detail/",
        user_views.announcement_user_detail,
        name="user-announcement-detail",
    ),
    path(
        "<str:announcement_id>/reaction/",
        user_views.announcement_reaction,
        name="user-announcement-reaction",
    ),
    path(
        "<str:announcement_id>/comments/",
        user_views.announcement_comments,
        name="user-announcement-comments",
    ),
    path(
        "comments/<int:comment_id>/",
        user_views.announcement_comment_detail,
        name="user-announcement-comment-detail",
    ),
    path(
        "comments/<int:comment_id>/replies/",
        user_views.announcement_comment_replies,
        name="user-announcement-comment-replies",
    ),
    path(
        "replies/<int:reply_id>/",
        user_views.announcement_reply_detail,
        name="user-announcement-reply-detail",
    ),

    path(
        "<int:announcement_id>/",
        admin_views.admin_announcement_detail,
        name="admin-announcement-detail",
    ),
]