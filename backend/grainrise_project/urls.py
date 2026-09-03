from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [

    # Django admin
    path(
        "admin/",
        admin.site.urls,
    ),

    # GrainRise API
    path(
        "api/",
        include("api.urls"),
    ),
]


# Development-only media serving
if settings.DEBUG:

    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )