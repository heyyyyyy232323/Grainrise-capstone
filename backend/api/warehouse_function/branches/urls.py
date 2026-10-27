from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.list_branches_view,
        name="warehouse-branches-list",
    ),
    path(
        "<str:branch_id>/employees/",
        views.branch_employees_view,
        name="warehouse-branch-employees",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/",
        views.branch_employee_detail_view,
        name="warehouse-branch-employee-detail",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/archive/",
        views.branch_employee_archive_view,
        name="warehouse-branch-employee-archive",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/restore/",
        views.branch_employee_restore_view,
        name="warehouse-branch-employee-restore",
    ),
]

