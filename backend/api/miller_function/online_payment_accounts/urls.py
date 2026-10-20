from django.urls import path
from . import views

urlpatterns = [
    # Security Setup, Status & Verification
    path("security/status/", views.security_status_view, name="miller_payment_security_status"),
    path("security/send-setup-otp/", views.send_setup_otp_view, name="miller_payment_security_send_setup_otp"),
    path("security/setup-password/", views.setup_security_password_view, name="miller_payment_security_setup_password"),
    path("security/verify/", views.verify_security_password_view, name="miller_payment_security_verify"),
    path("security/authorize-action/", views.authorize_action_view, name="miller_payment_security_authorize_action"),
    path("security/send-forgot-otp/", views.send_forgot_otp_view, name="miller_payment_security_send_forgot_otp"),
    path("security/forgot-password/request-otp/", views.send_forgot_otp_view, name="miller_payment_security_forgot_request_otp"),
    path("security/reset-password/", views.reset_security_password_view, name="miller_payment_security_reset_password"),
    path("security/forgot-password/reset/", views.reset_security_password_view, name="miller_payment_security_forgot_reset"),

    # Branches list for dropdowns (Physical mill branches)
    path("branches/authorized/", views.list_branches_view, name="miller_payment_branches_authorized"),

    # Duplicate check endpoint
    path("branches/check-duplicate/", views.check_duplicate_account_view, name="miller_payment_check_duplicate"),
    path("branch-accounts/check-duplicate/", views.check_duplicate_account_view, name="miller_payment_check_duplicate_alt"),

    # Branch Online Payment Accounts (Collection: GET list, POST create)
    path("branches/", views.branch_accounts_collection_view, name="miller_branch_accounts_collection"),
    path("branches/<int:pk>/", views.branch_account_detail_view, name="miller_branch_accounts_detail"),
    path("branches/<int:pk>/reveal/", views.reveal_branch_account_number_view, name="miller_branch_accounts_reveal"),
    path("branches/<int:pk>/update/", views.update_branch_account_view, name="miller_branch_accounts_update"),
    path("branches/<int:pk>/archive/", views.archive_branch_account_view, name="miller_branch_accounts_archive"),
    path("branches/<int:pk>/restore/", views.restore_branch_account_view, name="miller_branch_accounts_restore"),

    # Backwards-compatible / alias branch-accounts/ routes
    path("branch-accounts/", views.branch_accounts_collection_view, name="miller_branch_accounts_alt_list"),
    path("branch-accounts/create/", views.create_branch_account_view, name="miller_branch_accounts_alt_create"),
    path("branch-accounts/<int:pk>/", views.branch_account_detail_view, name="miller_branch_accounts_alt_detail"),
    path("branch-accounts/<int:pk>/reveal/", views.reveal_branch_account_number_view, name="miller_branch_accounts_alt_reveal"),
    path("branch-accounts/<int:pk>/update/", views.update_branch_account_view, name="miller_branch_accounts_alt_update"),
    path("branch-accounts/<int:pk>/archive/", views.archive_branch_account_view, name="miller_branch_accounts_alt_archive"),
    path("branch-accounts/<int:pk>/restore/", views.restore_branch_account_view, name="miller_branch_accounts_alt_restore"),

    # Employee Online Payment Accounts (Manager Tab)
    path("employees/", views.list_employee_accounts_view, name="miller_employee_accounts_list"),
    path("employees/<int:pk>/", views.get_employee_account_detail_view, name="miller_employee_accounts_detail"),
    path("employees/<int:pk>/reveal/", views.reveal_employee_account_number_view, name="miller_employee_accounts_reveal"),
    path("employees/<int:pk>/archive/", views.archive_employee_account_view, name="miller_employee_accounts_archive"),
    path("employees/<int:pk>/restore/", views.restore_employee_account_view, name="miller_employee_accounts_restore"),

    # Backwards-compatible / alias employee-accounts/ routes
    path("employee-accounts/", views.list_employee_accounts_view, name="miller_employee_accounts_alt_list"),
    path("employee-positions/", views.list_employee_positions_view, name="miller_employee_positions"),
    path("employee-accounts/<int:pk>/", views.get_employee_account_detail_view, name="miller_employee_accounts_alt_detail"),
    path("employee-accounts/<int:pk>/reveal/", views.reveal_employee_account_number_view, name="miller_employee_accounts_alt_reveal"),
    path("employee-accounts/<int:pk>/archive/", views.archive_employee_account_view, name="miller_employee_accounts_alt_archive"),
    path("employee-accounts/<int:pk>/restore/", views.restore_employee_account_view, name="miller_employee_accounts_alt_restore"),
]

