from django.urls import path
from . import views

urlpatterns = [
    path("", views.list_payables_view, name="warehouse_payables_list"),
    path("pay/", views.record_payment_view, name="warehouse_payables_pay"),
    path("xendit/initiate/", views.initiate_xendit_view, name="warehouse_payables_xendit_initiate"),
    path("xendit/reconcile/", views.reconcile_xendit_view, name="warehouse_payables_xendit_reconcile"),
    path("xendit/cancel/", views.cancel_attempt_view, name="warehouse_payables_xendit_cancel"),
    path("webhooks/xendit/", views.xendit_webhook_view, name="warehouse_payables_xendit_webhook"),
]
