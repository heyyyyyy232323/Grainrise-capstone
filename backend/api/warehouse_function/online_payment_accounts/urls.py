from django.urls import path
from . import views

urlpatterns = [
    # Security Setup, Status & Verification
    path("security/status/", views.security_status_view, name="warehouse_payment_security_status"),
    path("security/send-setup-otp/", views.send_setup_otp_view, name="warehouse_payment_security_send_setup_otp"),
    path("security/setup-password/", views.setup_security_password_view, name="warehouse_payment_security_setup_password"),
    path("security/verify/", views.verify_security_password_view, name="warehouse_payment_security_verify"),
    path("security/authorize-action/", views.authorize_action_view, name="warehouse_payment_security_authorize_action"),
    path("security/send-forgot-otp/", views.send_forgot_otp_view, name="warehouse_payment_security_send_forgot_otp"),
    path("security/forgot-password/request-otp/", views.send_forgot_otp_view, name="warehouse_payment_security_forgot_request_otp"),
    path("security/reset-password/", views.reset_security_password_view, name="warehouse_payment_security_reset_password"),
    path("security/forgot-password/reset/", views.reset_security_password_view, name="warehouse_payment_security_forgot_reset"),

    # Duplicate check endpoint
    path("branches/check-duplicate/", views.check_duplicate_account_view, name="warehouse_payment_check_duplicate"),
    path("branch-accounts/check-duplicate/", views.check_duplicate_account_view, name="warehouse_payment_check_duplicate_alt"),

    # Employee Online Payment Accounts (Manager / Finance Tab)
    path("employees/", views.list_employee_accounts_view, name="warehouse_employee_accounts_list"),
    path("employees/<int:pk>/", views.get_employee_account_detail_view, name="warehouse_employee_accounts_detail"),
    path("employees/<int:pk>/reveal/", views.reveal_employee_account_number_view, name="warehouse_employee_accounts_reveal"),
    path("employees/<int:pk>/archive/", views.archive_employee_account_view, name="warehouse_employee_accounts_archive"),
    path("employees/<int:pk>/restore/", views.restore_employee_account_view, name="warehouse_employee_accounts_restore"),

    # Backwards-compatible / alias employee-accounts/ routes
    path("employee-accounts/", views.list_employee_accounts_view, name="warehouse_employee_accounts_alt_list"),
    path("employee-positions/", views.list_employee_positions_view, name="warehouse_employee_positions"),
    path("employee-accounts/<int:pk>/", views.get_employee_account_detail_view, name="warehouse_employee_accounts_alt_detail"),
    path("employee-accounts/<int:pk>/reveal/", views.reveal_employee_account_number_view, name="warehouse_employee_accounts_alt_reveal"),
    path("employee-accounts/<int:pk>/archive/", views.archive_employee_account_view, name="warehouse_employee_accounts_alt_archive"),
    path("employee-accounts/<int:pk>/restore/", views.restore_employee_account_view, name="warehouse_employee_accounts_alt_restore"),

    # Employee Personal Online Payment Accounts (Self-service for FLC / Driver / Staff)
    path("my-accounts/", views.my_payment_accounts_list_view, name="warehouse_my_payment_accounts_list"),
    path("my-accounts/create/", views.my_payment_accounts_create_view, name="warehouse_my_payment_accounts_create"),
    path("my-accounts/<int:pk>/update/", views.my_payment_accounts_update_view, name="warehouse_my_payment_accounts_update"),
    path("my-accounts/<int:pk>/archive/", views.my_payment_accounts_archive_view, name="warehouse_my_payment_accounts_archive"),
    path("my-accounts/<int:pk>/restore/", views.my_payment_accounts_restore_view, name="warehouse_my_payment_accounts_restore"),
    path("my-accounts/<int:pk>/verify/", views.my_payment_accounts_verify_view, name="warehouse_my_payment_accounts_verify"),
    path("my-accounts/<int:pk>/reveal/", views.my_payment_accounts_reveal_view, name="warehouse_my_payment_accounts_reveal"),
]
