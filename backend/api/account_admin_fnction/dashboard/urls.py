from django.urls import path

from . import views


app_name = "dashboard"


urlpatterns = [
    # ========================================================
    # ADMIN DASHBOARD
    # ========================================================

    path(
        "",
        views.admin_dashboard,
        name="dashboard",
    ),
]