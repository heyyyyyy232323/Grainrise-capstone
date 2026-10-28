from django.urls import include, path

urlpatterns = [
    path("notifications/", include("api.warehouse_function.logistics.notifications.urls")),
    path("notifications", include("api.warehouse_function.logistics.notifications.urls")),
]

