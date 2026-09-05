from django.urls import path

from . import views


urlpatterns = [

    # ========================================================
    # APPLICATIONS
    # ========================================================

    path(
        "applications/",
        views.applications,
        name="farmer-contract-applications",
    ),

    path(
        "applications/<int:application_id>/",
        views.application_details,
        name="farmer-contract-application-details",
    ),

    path(
        "applications/<int:application_id>/cancel/",
        views.application_cancel,
        name="farmer-contract-application-cancel",
    ),


    # ========================================================
    # OFFERS / OPEN BIDDINGS
    # ========================================================

    path(
        "biddings/",
        views.biddings,
        name="farmer-contract-biddings",
    ),

    path(
        "biddings/<int:bidding_id>/",
        views.bidding_details,
        name="farmer-contract-bidding-details",
    ),

    path(
        "offers/<int:offer_id>/",
        views.offer_details,
        name="farmer-contract-offer-details",
    ),

    path(
        "offers/<int:offer_id>/accept/",
        views.offer_accept,
        name="farmer-contract-offer-accept",
    ),

    path(
        "offers/<int:offer_id>/decline/",
        views.offer_decline,
        name="farmer-contract-offer-decline",
    ),


    # ========================================================
    # OPPORTUNITIES
    # ========================================================

    path(
        "opportunities/",
        views.opportunities,
        name="farmer-contract-opportunities",
    ),

    path(
        "opportunities/<int:posting_id>/",
        views.opportunity_details,
        name="farmer-contract-opportunity-details",
    ),

    path(
        "opportunities/<int:posting_id>/apply/",
        views.opportunity_apply,
        name="farmer-contract-opportunity-apply",
    ),


    # ========================================================
    # CURRENT CONTRACTS
    # ========================================================

    path(
        "current/",
        views.current_contracts,
        name="farmer-current-contracts",
    ),

    path(
        "current/<int:contract_id>/",
        views.current_contract_details,
        name="farmer-current-contract-details",
    ),

    path(
        "current/<int:contract_id>/void-request/",
        views.contract_void_request,
        name="farmer-contract-void-request",
    ),


    # ========================================================
    # MESSAGES
    # ========================================================

    path(
        "messages/",
        views.send_message,
        name="farmer-contract-send-message",
    ),

]