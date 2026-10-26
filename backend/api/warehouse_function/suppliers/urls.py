from django.urls import path
from . import views

urlpatterns = [
    # Branches helper for modal
    path(
        "branches/",
        views.manager_branches_view,
        name="warehouse-suppliers-branches",
    ),

    # GRAINRISE Millers
    path(
        "grainrise/",
        views.grainrise_millers_list_view,
        name="warehouse-suppliers-grainrise-list",
    ),
    path(
        "grainrise/<int:supplier_profile_id>/",
        views.grainrise_miller_detail_view,
        name="warehouse-suppliers-grainrise-detail",
    ),
    path(
        "grainrise/receiving-history/<int:receiving_id>/",
        views.grainrise_receiving_detail_view,
        name="warehouse-suppliers-grainrise-receiving-detail",
    ),
    path(
        "grainrise/orders/<int:online_order_id>/cancel/",
        views.cancel_grainrise_order_view,
        name="warehouse-suppliers-grainrise-order-cancel",
    ),

    # Non-GRAINRISE Millers
    path(
        "non-grainrise/",
        views.nongrainrise_millers_collection_view,
        name="warehouse-suppliers-nongrainrise-collection",
    ),
    path(
        "non-grainrise/<int:contact_id>/",
        views.nongrainrise_miller_detail_view,
        name="warehouse-suppliers-nongrainrise-detail",
    ),
    path(
        "non-grainrise/receiving-history/<int:receiving_id>/",
        views.nongrainrise_receiving_detail_view,
        name="warehouse-suppliers-nongrainrise-receiving-detail",
    ),
]

