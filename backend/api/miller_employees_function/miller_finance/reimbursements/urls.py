from django.urls import path
from .views import (
    get_reimbursement_detail_view,
    list_reimbursements_view,
    list_requester_payment_accounts_view,
    process_reimbursement_payment_view,
    reconcile_reimbursement_payout_view,
    xendit_payout_webhook_view,
)

urlpatterns = [
    path("", list_reimbursements_view, name="list_miller_reimbursements"),
    path("pay/", process_reimbursement_payment_view, name="process_miller_reimbursement_payment"),
    path("webhooks/xendit/", xendit_payout_webhook_view, name="xendit_reimbursement_payout_webhook"),
    path("<int:reimbursement_id>/", get_reimbursement_detail_view, name="get_miller_reimbursement_detail"),
    path(
        "<int:reimbursement_id>/employee-accounts/",
        list_requester_payment_accounts_view,
        name="list_requester_payment_accounts",
    ),
    path(
        "<int:reimbursement_id>/reconcile/",
        reconcile_reimbursement_payout_view,
        name="reconcile_miller_reimbursement_payout",
    ),
]

