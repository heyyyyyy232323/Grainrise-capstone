from django.urls import include, path

urlpatterns = [
    path(
        "contracts/",
        include("api.farmer_function.contracts.urls"),
    ),
    path(
        "messages/",
        include("api.farmer_function.messages.urls"),
    ),
]
