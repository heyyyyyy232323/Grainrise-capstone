from django.urls import path

from . import views


app_name = "warehouse_management"


urlpatterns = [

    # ========================================================
    # WAREHOUSE MANAGEMENT LIST
    # ========================================================

    path(
        "",
        views.warehouse_management_list,
        name="list",
    ),


    # ========================================================
    # WAREHOUSE VIEW DETAILS
    # ========================================================

    path(
        "<str:user_id>/view-details/",
        views.warehouse_management_view_details,
        name="view-details",
    ),


    # ========================================================
    # CONFIRM WAREHOUSE APPLICATION
    # ========================================================

    path(
        "<str:user_id>/confirm/",
        views.confirm_warehouse_management_application,
        name="confirm",
    ),


    # ========================================================
    # ARCHIVE WAREHOUSE ACCOUNT
    # ========================================================

    path(
        "<str:user_id>/archive/",
        views.archive_warehouse_management_account,
        name="archive",
    ),


    # ========================================================
    # RESTORE WAREHOUSE ACCOUNT
    # ========================================================

    path(
        "<str:user_id>/restore/",
        views.restore_warehouse_management_account,
        name="restore",
    ),


    # ========================================================
    # DELETE WAREHOUSE ACCOUNT PERMANENTLY
    # ========================================================

    path(
        "<str:user_id>/delete/",
        views.delete_warehouse_management_account,
        name="delete",
    ),


    # ========================================================
    # ARCHIVE WAREHOUSE EMPLOYEE
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/archive/",
        views.archive_warehouse_management_employee,
        name="archive-employee",
    ),


    # ========================================================
    # RESTORE / RETRIEVE WAREHOUSE EMPLOYEE
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/restore/",
        views.restore_warehouse_management_employee,
        name="restore-employee",
    ),


    # ========================================================
    # DELETE WAREHOUSE EMPLOYEE PERMANENTLY
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/delete/",
        views.delete_warehouse_management_employee,
        name="delete-employee",
    ),


    # ========================================================
    # WAREHOUSE OWNER / REGISTRATION DETAILS
    # ========================================================

    path(
        "<str:user_id>/",
        views.warehouse_management_detail,
        name="detail",
    ),

]