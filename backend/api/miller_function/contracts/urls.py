from django.urls import path

from . import views


urlpatterns = [

    # ========================================================
    # MILLER BUSINESS INFORMATION
    # ========================================================

    path(
        "business-address/",
        views.business_address,
        name="miller-contract-business-address",
    ),


    # ========================================================
    # BIDDING OFFERS
    # ========================================================

    path(
        "bidding-offers/",
        views.bidding_offers,
        name="miller-contract-bidding-offers",
    ),

    path(
        "bidding-offers/<int:bidding_id>/",
        views.bidding_details,
        name="miller-contract-bidding-details",
    ),

    path(
        "bidding-offers/<int:bidding_id>/submit-offer/",
        views.bidding_submit_offer,
        name="miller-contract-submit-offer",
    ),


    # ========================================================
    # MILLER'S EXISTING BIDDING OFFER
    # ========================================================

    path(
        "offers/<int:offer_id>/",
        views.offer_update,
        name="miller-contract-offer-update",
    ),

    path(
        "offers/<int:offer_id>/withdraw/",
        views.offer_withdraw,
        name="miller-contract-offer-withdraw",
    ),


    # ========================================================
    # POSTINGS
    # ========================================================

    path(
        "postings/",
        views.postings,
        name="miller-contract-postings",
    ),

    path(
        "postings/<int:posting_id>/",
        views.posting_details,
        name="miller-contract-posting-details",
    ),

    path(
        "postings/<int:posting_id>/close/",
        views.posting_close,
        name="miller-contract-posting-close",
    ),


    # ========================================================
    # FARMER APPLICATIONS
    # ========================================================

    path(
        "applications/<int:application_id>/",
        views.application_details,
        name="miller-contract-application-details",
    ),

    path(
        "applications/<int:application_id>/review/",
        views.application_start_review,
        name="miller-contract-application-review",
    ),

    path(
        "applications/<int:application_id>/approve/",
        views.application_approve,
        name="miller-contract-application-approve",
    ),

    path(
        "applications/<int:application_id>/decline/",
        views.application_decline,
        name="miller-contract-application-decline",
    ),


    # ========================================================
    # CURRENT CONTRACTS
    # ========================================================

    path(
        "current/",
        views.current_contracts,
        name="miller-current-contracts",
    ),

    path(
        "current/<int:contract_id>/",
        views.current_contract_details,
        name="miller-current-contract-details",
    ),

    path(
        "current/<int:contract_id>/sign/",
        views.contract_sign,
        name="miller-contract-sign",
    ),

    path(
        "current/<int:contract_id>/complete/",
        views.contract_complete,
        name="miller-contract-complete",
    ),

    path(
        "current/<int:contract_id>/void-request/",
        views.contract_void_request,
        name="miller-contract-void-request",
    ),


    # ========================================================
    # MESSAGES
    # ========================================================

    path(
        "messages/threads/",
        views.message_threads,
        name="miller-contract-message-threads",
    ),

    path(
        "messages/conversation/",
        views.message_conversation,
        name="miller-contract-message-conversation",
    ),

    path(
        "messages/send/",
        views.send_message,
        name="miller-contract-send-message",
    ),
]