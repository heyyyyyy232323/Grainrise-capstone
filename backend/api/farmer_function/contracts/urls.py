from django.urls import path

from . import views

urlpatterns = [
    # 1. Applications
    path(
        "applications/",
        views.applications_list,
        name="farmer-contracts-applications",
    ),
    path(
        "applications/<int:application_id>/",
        views.application_detail,
        name="farmer-contracts-application-detail",
    ),
    path(
        "applications/<int:application_id>/cancel/",
        views.application_cancel,
        name="farmer-contracts-application-cancel",
    ),

    # 2. Opportunities
    path(
        "opportunities/",
        views.opportunities_list,
        name="farmer-contracts-opportunities",
    ),
    path(
        "opportunities/<int:opportunity_id>/",
        views.opportunity_detail,
        name="farmer-contracts-opportunity-detail",
    ),
    path(
        "opportunities/apply/",
        views.opportunity_apply,
        name="farmer-contracts-opportunity-apply",
    ),

    # 3. Offers / Biddings
    path(
        "biddings/",
        views.biddings_list,
        name="farmer-contracts-biddings",
    ),
    path(
        "biddings/create/",
        views.bidding_create,
        name="farmer-contracts-bidding-create",
    ),
    path(
        "offers/<int:offer_id>/",
        views.offer_detail,
        name="farmer-contracts-offer-detail",
    ),
    path(
        "offers/<int:offer_id>/accept/",
        views.offer_accept,
        name="farmer-contracts-offer-accept",
    ),
    path(
        "offers/<int:offer_id>/decline/",
        views.offer_decline,
        name="farmer-contracts-offer-decline",
    ),

    # 4. Current Contracts
    path(
        "current/",
        views.contracts_list,
        name="farmer-contracts-current-list",
    ),
    path(
        "current/<int:contract_id>/",
        views.contract_detail,
        name="farmer-contracts-current-detail",
    ),
    path(
        "current/<int:contract_id>/void-request/",
        views.contract_void_request,
        name="farmer-contracts-void-request",
    ),
    path(
        "current/<int:contract_id>/sign/",
        views.contract_sign,
        name="farmer-contracts-sign",
    ),
]
