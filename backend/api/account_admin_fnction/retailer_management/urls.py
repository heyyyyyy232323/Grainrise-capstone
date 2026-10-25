from django.urls import path

from . import views


app_name = "retailer_management"


urlpatterns = [

    # ========================================================
    # RETAILER MANAGEMENT LIST
    # ========================================================

    path(
        "",
        views.retailer_management_list,
        name="list",
    ),


    # ========================================================
    # RETAILER DETAILS
    # Used by:
    # - To Review -> Review Modal
    # - Active -> View Details Modal
    # - Inactive -> View Details Modal
    # ========================================================

    path(
        "<str:user_id>/",
        views.retailer_management_detail,
        name="detail",
    ),


    # ========================================================
    # CONFIRM RETAILER APPLICATION
    # inactive -> active
    # ========================================================

    path(
        "<str:user_id>/confirm/",
        views.confirm_retailer_management_application,
        name="confirm",
    ),


    # ========================================================
    # ARCHIVE RETAILER ACCOUNT
    # active -> archived
    # ========================================================

    path(
        "<str:user_id>/archive/",
        views.archive_retailer_management_account,
        name="archive",
    ),


    # ========================================================
    # RESTORE RETAILER ACCOUNT
    # archived/deactivated -> active
    # ========================================================

    path(
        "<str:user_id>/restore/",
        views.restore_retailer_management_account,
        name="restore",
    ),


    # ========================================================
    # DELETE RETAILER ACCOUNT
    # archived/deactivated only
    # ========================================================

    path(
        "<str:user_id>/delete/",
        views.delete_retailer_management_account,
        name="delete",
    ),


    # ========================================================
    # RESOLVE RETAILER REPORT
    # ========================================================

    path(
        "reports/<int:report_id>/resolve/",
        views.resolve_retailer_management_report,
        name="resolve-report",
    ),

    path(
        "reports/<int:report_id>/resolve",
        views.resolve_retailer_management_report,
        name="resolve-report-no-slash",
    ),

    path(
        "<str:user_id>/reports/<int:report_id>/resolve/",
        views.resolve_retailer_management_report,
        name="resolve-user-report",
    ),

    path(
        "<str:user_id>/reports/<int:report_id>/resolve",
        views.resolve_retailer_management_report,
        name="resolve-user-report-no-slash",
    ),
]