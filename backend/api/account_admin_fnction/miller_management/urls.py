from django.urls import path

from . import views


app_name = "miller_management"


urlpatterns = [

    # ========================================================
    # MILLER MANAGEMENT LIST
    # ========================================================

    path(
        "",
        views.miller_management_list,
        name="list",
    ),


    # ========================================================
    # MILLER VIEW DETAILS
    # ========================================================

    path(
        "<str:user_id>/view-details/",
        views.miller_management_view_details,
        name="view-details",
    ),


    # ========================================================
    # ONLINE ORDER RATINGS
    # ========================================================

    path(
        "<str:user_id>/online-order-ratings/",
        views.get_miller_online_order_ratings_view,
        name="online-order-ratings",
    ),
    path(
        "<str:user_id>/online-order-ratings",
        views.get_miller_online_order_ratings_view,
        name="online-order-ratings-no-slash",
    ),


    # ========================================================
    # CONFIRM APPLICATION
    # ========================================================

    path(
        "<str:user_id>/confirm/",
        views.confirm_miller_management_application,
        name="confirm",
    ),


    # ========================================================
    # ARCHIVE MILLER ACCOUNT
    # ========================================================

    path(
        "<str:user_id>/archive/",
        views.archive_miller_management_account,
        name="archive",
    ),


    # ========================================================
    # RESTORE MILLER ACCOUNT
    # ========================================================

    path(
        "<str:user_id>/restore/",
        views.restore_miller_management_account,
        name="restore",
    ),


    # ========================================================
    # DELETE MILLER ACCOUNT
    # ========================================================

    path(
        "<str:user_id>/delete/",
        views.delete_miller_management_account,
        name="delete",
    ),


    # ========================================================
    # ARCHIVE MILLER EMPLOYEE
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/archive/",
        views.archive_miller_management_employee,
        name="archive-employee",
    ),


    # ========================================================
    # RESTORE / RETRIEVE MILLER EMPLOYEE
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/restore/",
        views.restore_miller_management_employee,
        name="restore-employee",
    ),


    # ========================================================
    # DELETE MILLER EMPLOYEE
    # ========================================================

    path(
        "<str:user_id>/employees/<int:employee_id>/delete/",
        views.delete_miller_management_employee,
        name="delete-employee",
    ),


    # ========================================================
    # MILLER REGISTRATION / OWNER DETAILS
    # IMPORTANT:
    # Keep this LAST so it does not conflict with
    # view-details / confirm / archive / restore / delete.
    # ========================================================

    path(
        "reports/<int:report_id>/resolve/",
        views.resolve_miller_management_report,
        name="resolve-report",
    ),
    path(
        "reports/<int:report_id>/resolve",
        views.resolve_miller_management_report,
        name="resolve-report-no-slash",
    ),
    path(
        "<str:user_id>/reports/<int:report_id>/resolve/",
        views.resolve_miller_management_report,
        name="resolve-user-report",
    ),
    path(
        "<str:user_id>/reports/<int:report_id>/resolve",
        views.resolve_miller_management_report,
        name="resolve-user-report-no-slash",
    ),
    path(
        "<str:user_id>/",
        views.miller_management_detail,
        name="detail",
    ),
]