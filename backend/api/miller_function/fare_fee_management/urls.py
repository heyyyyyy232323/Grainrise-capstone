from django.urls import path
from .views import (
    list_create_fare_policies_view,
    detail_update_fare_policy_view,
)

urlpatterns = [
    path("", list_create_fare_policies_view, name="miller_fare_policies"),
    path("<int:fare_fee_id>/", detail_update_fare_policy_view, name="miller_fare_policy_detail"),
    path("<int:fare_fee_id>", detail_update_fare_policy_view),
]

