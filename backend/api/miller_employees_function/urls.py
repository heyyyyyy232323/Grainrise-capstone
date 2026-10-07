from django.urls import include, path

urlpatterns = [
    path(
        "encoder/",
        include("api.miller_employees_function.miller_encoder.urls"),
    ),
]

