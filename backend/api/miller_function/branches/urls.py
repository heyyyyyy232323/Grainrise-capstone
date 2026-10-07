from django.urls import path
from . import views

urlpatterns = [
    path(
        "",
        views.list_branches_view,
        name="miller-branches-list",
    ),
    path(
        "<str:branch_id>/employees/",
        views.branch_employees_view,
        name="miller-branch-employees",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/",
        views.branch_employee_detail_view,
        name="miller-branch-employee-detail",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/archive/",
        views.branch_employee_archive_view,
        name="miller-branch-employee-archive",
    ),
    path(
        "<str:branch_id>/employees/<str:employee_id>/restore/",
        views.branch_employee_restore_view,
        name="miller-branch-employee-restore",
    ),
]
