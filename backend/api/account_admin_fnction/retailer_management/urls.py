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
        "<int:user_id>/",
        views.retailer_management_detail,
        name="detail",
    ),


    # ========================================================
    # CONFIRM RETAILER APPLICATION
    # inactive -> active
    # ========================================================

    path(
        "<int:user_id>/confirm/",
        views.confirm_retailer_management_application,
        name="confirm",
    ),


    # ========================================================
    # ARCHIVE RETAILER ACCOUNT
    # active -> archived
    # ========================================================

    path(
        "<int:user_id>/archive/",
        views.archive_retailer_management_account,
        name="archive",
    ),


    # ========================================================
    # RESTORE RETAILER ACCOUNT
    # archived/deactivated -> active
    # ========================================================

    path(
        "<int:user_id>/restore/",
        views.restore_retailer_management_account,
        name="restore",
    ),


    # ========================================================
    # DELETE RETAILER ACCOUNT
    # archived/deactivated only
    # ========================================================

    path(
        "<int:user_id>/delete/",
        views.delete_retailer_management_account,
        name="delete",
    ),
]