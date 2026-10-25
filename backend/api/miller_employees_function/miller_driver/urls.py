"""
URL patterns for Miller Driver endpoints.
"""

from django.urls import path
from .views import (
    driver_buyer_group_view,
    driver_delivery_complete_view,
    driver_duties_list_view,
    driver_live_tracking_exit_view,
    driver_live_tracking_ping_view,
    driver_live_tracking_start_view,
    driver_messages_conversations_view,
    driver_messages_send_view,
    driver_messages_thread_view,
    driver_payment_submissions_list_view,
    driver_payment_submit_view,
    driver_reimbursement_submit_view,
    driver_reimbursement_history_view,
    driver_reimbursement_categories_view,
    driver_fulfillment_history_view,
    driver_fulfillment_variants_view,
    driver_vehicle_assigned_history_view,
)

urlpatterns = [
    path("duties/", driver_duties_list_view, name="driver-duties-list"),
    path("live-tracking/group/", driver_buyer_group_view, name="driver-live-tracking-group"),
    path("live-tracking/start/", driver_live_tracking_start_view, name="driver-live-tracking-start"),
    path("live-tracking/ping/", driver_live_tracking_ping_view, name="driver-live-tracking-ping"),
    path("live-tracking/exit/", driver_live_tracking_exit_view, name="driver-live-tracking-exit"),
    path("delivery/complete/", driver_delivery_complete_view, name="driver-delivery-complete"),
    path("messages/conversations/", driver_messages_conversations_view, name="driver-messages-conversations"),
    path("messages/thread/", driver_messages_thread_view, name="driver-messages-thread"),
    path("messages/send/", driver_messages_send_view, name="driver-messages-send"),
    path("payments/submissions/", driver_payment_submissions_list_view, name="driver-payment-submissions-list"),
    path("payments/submit/", driver_payment_submit_view, name="driver-payment-submit"),
    path("reimbursements/submit/", driver_reimbursement_submit_view, name="driver-reimbursement-submit"),
    path("reimbursements/history/", driver_reimbursement_history_view, name="driver-reimbursement-history"),
    path("reimbursements/categories/", driver_reimbursement_categories_view, name="driver-reimbursement-categories"),
    path("fulfillment-history/", driver_fulfillment_history_view, name="driver-fulfillment-history"),
    path("fulfillment-history/variants/", driver_fulfillment_variants_view, name="driver-fulfillment-variants"),
    path("vehicle-assigned-history/", driver_vehicle_assigned_history_view, name="driver-vehicle-assigned-history"),
]
