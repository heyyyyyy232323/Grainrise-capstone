from django.urls import path

from . import views


app_name = "farmer_management"


urlpatterns = [

    # ========================================================
    # FARMER MANAGEMENT LIST
    # ========================================================

    path(
        "",
        views.farmer_management_list,
        name="list",
    ),


    # ========================================================
    # FARMER DETAILS
    # Used by:
    # - To Review -> Review Modal
    # - Active -> View Details Modal
    # - Inactive -> View Details Modal
    # ========================================================

    path(
        "<int:user_id>/",
        views.farmer_management_detail,
        name="detail",
    ),


    # ========================================================
    # CONFIRM FARMER APPLICATION
    # inactive -> active
    # ========================================================

    path(
        "<int:user_id>/confirm/",
        views.confirm_farmer_management_application,
        name="confirm",
    ),


    # ========================================================
    # ARCHIVE FARMER ACCOUNT
    # active -> archived
    # ========================================================

    path(
        "<int:user_id>/archive/",
        views.archive_farmer_management_account,
        name="archive",
    ),


    # ========================================================
    # RESTORE FARMER ACCOUNT
    # archived / deactivated -> active
    # ========================================================

    path(
        "<int:user_id>/restore/",
        views.restore_farmer_management_account,
        name="restore",
    ),


    # ========================================================
    # DELETE FARMER ACCOUNT
    # archived / deactivated only
    # ========================================================

    path(
        "<int:user_id>/delete/",
        views.delete_farmer_management_account,
        name="delete",
    ),
]