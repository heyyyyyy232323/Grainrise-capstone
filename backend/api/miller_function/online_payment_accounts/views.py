import logging
from django.db import IntegrityError, connection
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_function.miller_auth import (
    miller_manager_required,
    miller_payment_security_user_required,
)
from .selectors import (
    get_manager_security_status,
    get_manager_user_info,
    mask_account_number,
    list_manager_branches,
    list_branch_payment_accounts,
    get_branch_payment_account_detail,
    list_employee_payment_accounts,
    get_employee_payment_account_detail,
    list_employee_positions,
)
from .services import (
    send_first_time_setup_otp,
    setup_security_password,
    verify_security_password,
    send_forgot_security_password_otp,
    reset_security_password,
    create_branch_payment_account,
    update_branch_payment_account,
    archive_branch_payment_account,
    restore_branch_payment_account,
    reveal_branch_account_number,
    archive_employee_payment_account,
    restore_employee_payment_account,
    reveal_employee_account_number,
    issue_action_auth_token,
    check_duplicate_payment_account,
    ACTION_TOKEN_MAX_AGE,
    PaymentSecurityError,
    PaymentSecurityEmailError,
    SecurityAlreadyConfiguredError,
    SecurityNotConfiguredError,
    SecurityLockedError,
    InvalidPasswordError,
    OtpExpiredOrInvalidError,
    OtpCooldownError,
    DuplicateAccountError,
    AccountValidationError,
    AccountNotFoundError,
)

logger = logging.getLogger(__name__)


# ============================================================
# SECURITY STATUS & OTP VIEWS
# ============================================================

@api_view(["GET"])
@miller_payment_security_user_required
def security_status_view(request):
    """
    GET /api/miller/payment-accounts/security/status/
    Return the Payment Security Password configuration status for the Manager.
    Also returns user full name and masked email for verification and setup.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    try:
        sec_status = get_manager_security_status(user_id, is_employee=is_employee)
        user_info = get_manager_user_info(user_id, is_employee=is_employee)
        payload = {
            **sec_status,
            "masked_email": user_info.get("masked_email", ""),
            "full_name": user_info.get("full_name", ""),
            "first_name": user_info.get("first_name", ""),
            "middle_initial": user_info.get("middle_initial", ""),
            "last_name": user_info.get("last_name", ""),
            "suffix": user_info.get("suffix", ""),
        }
        return Response(
            {
                "success": True,
                **payload,
                "data": payload,
                "user": user_info,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to check security status for user_id=%s: %s", user_id, exc)
        return Response(
            {"success": False, "message": "Failed to check payment security status."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_payment_security_user_required
def send_setup_otp_view(request):
    """
    POST /api/miller/payment-accounts/security/send-setup-otp/
    Send 6-digit OTP for initial security password setup.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    try:
        res = send_first_time_setup_otp(user_id, is_employee=is_employee)
        return Response(
            {
                "success": True,
                "message": f"Verification code sent to {res.get('masked_email')}.",
                "retry_after": res.get("retry_after", 60),
                "expires_in": res.get("expires_in", 300),
                "masked_email": res.get("masked_email", ""),
            },
            status=status.HTTP_200_OK,
        )
    except SecurityAlreadyConfiguredError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except OtpCooldownError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except PaymentSecurityEmailError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except PaymentSecurityError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Setup OTP send failed: %s", exc)
        return Response({"success": False, "message": "Failed to send verification code. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_payment_security_user_required
def setup_security_password_view(request):
    """
    POST /api/miller/payment-accounts/security/setup-password/
    Verify OTP and configure the initial Payment Security Password.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    otp = request.data.get("otp", "")
    new_password = request.data.get("new_password", "")
    confirm_password = request.data.get("confirm_password", "")

    try:
        res = setup_security_password(user_id, otp, new_password, confirm_password, is_employee=is_employee)
        return Response(res, status=status.HTTP_201_CREATED)
    except SecurityAlreadyConfiguredError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except OtpExpiredOrInvalidError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except AccountValidationError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Setup password failed: %s", exc)
        return Response({"success": False, "message": "Failed to set up payment security password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_payment_security_user_required
def verify_security_password_view(request):
    """
    POST /api/miller/payment-accounts/security/verify/
    Verify the Payment Security Password before entering edit or sensitive operations.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    password = request.data.get("password", "")

    try:
        verify_security_password(user_id, password, is_employee=is_employee)
        return Response(
            {"success": True, "message": "Payment security authorization confirmed."},
            status=status.HTTP_200_OK,
        )
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Password verification failed: %s", exc)
        return Response({"success": False, "message": "Verification error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_payment_security_user_required
def authorize_action_view(request):
    """
    POST /api/miller/payment-accounts/security/authorize-action/
    Verify the Payment Security Password and issue a short-lived (5 min), single-use,
    action/account-scoped authorization token for sensitive actions (edit, archive, restore, reveal).
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    action = str(request.data.get("action", "")).strip()
    raw_account_id = request.data.get("account_id")

    ALLOWED_ACTIONS = {
        "edit_branch_account",
        "archive_branch_account",
        "restore_branch_account",
        "reveal_branch_account",
        "edit_employee_account",
        "archive_employee_account",
        "restore_employee_account",
        "reveal_employee_account",
    }

    if not action or action not in ALLOWED_ACTIONS:
        return Response({"success": False, "message": "Invalid or missing action parameter."}, status=status.HTTP_400_BAD_REQUEST)

    if raw_account_id is None:
        return Response({"success": False, "message": "Target account ID is required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        account_id = int(raw_account_id)
    except (ValueError, TypeError):
        return Response({"success": False, "message": "Invalid account ID."}, status=status.HTTP_400_BAD_REQUEST)

    is_employee = getattr(request, "grainrise_is_employee", False)
    if is_employee:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT credentials_id FROM miller_employee_online_transaction_credentials WHERE credentials_id = %s AND supplier_employee_id = %s LIMIT 1",
                [account_id, user_id],
            )
            if not cursor.fetchone():
                return Response({"success": False, "message": "Employee account record not found or not authorized."}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Validate that the target account belongs to one of the manager's authorized branches
        if "branch" in action:
            detail = get_branch_payment_account_detail(user_id, account_id)
            if not detail:
                return Response({"success": False, "message": "Account record not found or not authorized."}, status=status.HTTP_404_NOT_FOUND)
        else:
            detail = get_employee_payment_account_detail(user_id, account_id)
            if not detail:
                return Response({"success": False, "message": "Employee account record not found or not authorized."}, status=status.HTTP_404_NOT_FOUND)

    try:
        verify_security_password(user_id, password, is_employee=is_employee)
        token = issue_action_auth_token(user_id, action, account_id)
        return Response(
            {
                "success": True,
                "auth_token": token,
                "expires_in": ACTION_TOKEN_MAX_AGE,
                "action": action,
                "account_id": account_id,
                "message": "Authorization confirmed.",
            },
            status=status.HTTP_200_OK,
        )
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Authorize action failed: %s", exc)
        return Response({"success": False, "message": "Authorization failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_payment_security_user_required
def send_forgot_otp_view(request):
    """
    POST /api/miller/payment-accounts/security/send-forgot-otp/
    Send OTP to reset forgotten Payment Security Password.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    try:
        res = send_forgot_security_password_otp(user_id, is_employee=is_employee)
        return Response(
            {
                "success": True,
                "message": f"Verification code sent to {res.get('masked_email')}.",
                "retry_after": res.get("retry_after", 60),
                "expires_in": res.get("expires_in", 300),
                "masked_email": res.get("masked_email", ""),
            },
            status=status.HTTP_200_OK,
        )
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except OtpCooldownError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    except PaymentSecurityEmailError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except PaymentSecurityError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Forgot OTP send failed: %s", exc)
        return Response({"success": False, "message": "Failed to send reset code. Please try again."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_payment_security_user_required
def reset_security_password_view(request):
    """
    POST /api/miller/payment-accounts/security/reset-password/
    Reset Payment Security Password via verified OTP.
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    otp = request.data.get("otp", "")
    new_password = request.data.get("new_password", "")
    confirm_password = request.data.get("confirm_password", "")

    try:
        res = reset_security_password(user_id, otp, new_password, confirm_password, is_employee=is_employee)
        return Response(res, status=status.HTTP_200_OK)
    except OtpExpiredOrInvalidError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except AccountValidationError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except Exception as exc:
        logger.exception("Password reset failed: %s", exc)
        return Response({"success": False, "message": "Failed to reset payment security password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# BRANCH ONLINE PAYMENT ACCOUNTS VIEWS
# ============================================================

@api_view(["GET"])
@miller_manager_required
def list_branches_view(request):
    """
    GET /api/miller/payment-accounts/branches/
    List Manager-owned branches for filter and modal dropdowns.
    """
    user_id = request.grainrise_miller_id
    try:
        branches = list_manager_branches(user_id)
        return Response({"success": True, "data": branches}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("List branches failed: %s", exc)
        return Response({"success": False, "message": "Failed to load branches."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _list_branch_accounts_logic(request):
    user_id = request.grainrise_miller_id
    filters = {
        "search": request.query_params.get("search", ""),
        "branch": request.query_params.get("branch", ""),
        "status": request.query_params.get("status", "all"),
        "type": request.query_params.get("type", "all"),
        "verification_status": request.query_params.get("verification_status", "all"),
        "sort_by": request.query_params.get("sort_by", "name_asc"),
    }
    try:
        data = list_branch_payment_accounts(user_id, filters)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("List branch accounts failed: %s", exc)
        return Response({"success": False, "message": "Failed to load branch payment accounts."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST", "GET"])
@miller_payment_security_user_required
def check_duplicate_account_view(request):
    """
    POST/GET /api/miller/payment-accounts/branches/check-duplicate/
    Lightweight authenticated endpoint to check if an account number already exists
    within the Manager's or Employee's authorized branches (active or archived).
    """
    user_id = request.grainrise_miller_id
    is_employee = getattr(request, "grainrise_is_employee", False)
    sp_id = getattr(request, "grainrise_supplier_profile_id", None)
    data = request.data if request.method == "POST" else request.query_params
    account_type = data.get("account_type") or data.get("type")
    account_number = data.get("account_number") or data.get("number")
    bank_name = data.get("bank_name")
    exclude_id = data.get("exclude_id")

    try:
        res = check_duplicate_payment_account(
            user_id=user_id,
            account_type=account_type,
            account_number=account_number,
            bank_name=bank_name,
            exclude_id=exclude_id,
            is_employee=is_employee,
            supplier_profile_id=sp_id,
        )
        return Response({"success": True, **res}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Check duplicate account failed: %s", exc)
        return Response(
            {"success": False, "is_duplicate": False, "message": "Failed to check account duplicate."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _create_branch_account_logic(request):
    user_id = request.grainrise_miller_id
    try:
        created = create_branch_payment_account(user_id, request.data)
        return Response(
            {
                "success": True,
                "data": created,
                "message": "Branch payment account registered successfully.",
            },
            status=status.HTTP_201_CREATED,
        )
    except (DuplicateAccountError, AccountValidationError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as exc:
        logger.warning("Integrity error on account creation: %s", exc)
        return Response({"success": False, "message": "This payment account is already registered in GRAINRISE."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Create branch account failed: %s", exc)
        return Response({"success": False, "message": "Failed to register payment account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
@miller_manager_required
def branch_accounts_collection_view(request):
    """
    Handles both GET (list branch payment accounts) and POST (create branch payment account).
    Enables /branches/ and /branch-accounts/ to support both operations cleanly.
    """
    if request.method == "POST":
        return _create_branch_account_logic(request)
    return _list_branch_accounts_logic(request)


@api_view(["GET"])
@miller_manager_required
def list_branch_accounts_view(request):
    """
    GET /api/miller/payment-accounts/branch-accounts/
    List branch accounts for the Manager's authorized branches.
    """
    return _list_branch_accounts_logic(request)


@api_view(["POST"])
@miller_manager_required
def create_branch_account_view(request):
    """
    POST /api/miller/payment-accounts/branch-accounts/create/
    Register a new branch payment account after client-side ID/Face screening.
    """
    return _create_branch_account_logic(request)


def _get_branch_account_detail_logic(request, pk):
    user_id = request.grainrise_miller_id
    try:
        detail = get_branch_payment_account_detail(user_id, pk)
        if not detail:
            return Response({"success": False, "message": "Account record not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Get branch account detail failed: %s", exc)
        return Response({"success": False, "message": "Failed to load account details."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _update_branch_account_logic(request, pk):
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    try:
        res = update_branch_payment_account(user_id, pk, request.data, password=password, auth_token=auth_token)
        return Response({"success": True, "data": res, "message": res.get("message")}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountValidationError, DuplicateAccountError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as exc:
        logger.warning("Integrity error on account update: %s", exc)
        return Response({"success": False, "message": "This payment account is already registered in GRAINRISE."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Update branch account failed: %s", exc)
        return Response({"success": False, "message": "Failed to update account details."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "PUT"])
@miller_manager_required
def branch_account_detail_view(request, pk):
    """
    Handles both GET (view details) and PUT (update details with security password or auth token).
    """
    if request.method == "PUT":
        return _update_branch_account_logic(request, pk)
    return _get_branch_account_detail_logic(request, pk)


@api_view(["GET"])
@miller_manager_required
def get_branch_account_detail_view(request, pk):
    """
    GET /api/miller/payment-accounts/branch-accounts/<int:pk>/
    View details for a branch payment account.
    """
    return _get_branch_account_detail_logic(request, pk)


@api_view(["POST"])
@miller_manager_required
def reveal_branch_account_number_view(request, pk):
    """
    POST /api/miller/payment-accounts/branch-accounts/<int:pk>/reveal/
    Reveal full unmasked account number using Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    try:
        res = reveal_branch_account_number(user_id, pk, password=password, auth_token=auth_token)
        return Response({"success": True, "account_number": res.get("account_number"), "data": res}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Reveal branch account number failed: %s", exc)
        return Response({"success": False, "message": "Failed to reveal account number."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["PUT"])
@miller_manager_required
def update_branch_account_view(request, pk):
    """
    PUT /api/miller/payment-accounts/branch-accounts/<int:pk>/update/
    Update branch payment account using Payment Security Password or auth token.
    """
    return _update_branch_account_logic(request, pk)


@api_view(["POST"])
@miller_manager_required
def archive_branch_account_view(request, pk):
    """
    POST /api/miller/payment-accounts/branch-accounts/<int:pk>/archive/
    Archive branch account with mandatory archive reason and Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    archive_reason = request.data.get("archive_reason", "")
    try:
        res = archive_branch_payment_account(user_id, pk, archive_reason, password=password, auth_token=auth_token)
        return Response({"success": True, "data": res, "message": res.get("message")}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountValidationError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Archive branch account failed: %s", exc)
        return Response({"success": False, "message": "Failed to archive account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_manager_required
def restore_branch_account_view(request, pk):
    """
    POST /api/miller/payment-accounts/branch-accounts/<int:pk>/restore/
    Restore archived branch account with Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    try:
        res = restore_branch_payment_account(user_id, pk, password=password, auth_token=auth_token)
        return Response({"success": True, "data": res, "message": res.get("message")}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountValidationError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Restore branch account failed: %s", exc)
        return Response({"success": False, "message": "Failed to restore account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# EMPLOYEE ONLINE PAYMENT ACCOUNTS VIEWS (MANAGER TAB)
# ============================================================

@api_view(["GET"])
@miller_manager_required
def list_employee_accounts_view(request):
    """
    GET /api/miller/payment-accounts/employee-accounts/
    List employee accounts under Manager's authorized branches.
    """
    user_id = request.grainrise_miller_id
    filters = {
        "search": request.query_params.get("search", ""),
        "branch": request.query_params.get("branch", ""),
        "status": request.query_params.get("status", "all"),
        "type": request.query_params.get("type", "all"),
        "employee_type": request.query_params.get("employee_type", "all"),
        "verification_status": request.query_params.get("verification_status", "all"),
        "sort_by": request.query_params.get("sort_by", "name_asc"),
    }

    try:
        data = list_employee_payment_accounts(user_id, filters)
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("List employee accounts failed: %s", exc)
        return Response({"success": False, "message": "Failed to load employee payment accounts."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_manager_required
def list_employee_positions_view(request):
    """
    GET /api/miller/payment-accounts/employee-positions/
    List distinct positions for filtering Employee Accounts.
    """
    user_id = request.grainrise_miller_id
    try:
        positions = list_employee_positions(user_id)
        return Response({"success": True, "data": positions}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("List positions failed: %s", exc)
        return Response({"success": False, "message": "Failed to load employee positions."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@miller_manager_required
def get_employee_account_detail_view(request, pk):
    """
    GET /api/miller/payment-accounts/employee-accounts/<int:pk>/
    View details for an employee payment account.
    """
    user_id = request.grainrise_miller_id
    try:
        detail = get_employee_payment_account_detail(user_id, pk)
        if not detail:
            return Response({"success": False, "message": "Employee account record not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({"success": True, "data": detail}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Get employee account detail failed: %s", exc)
        return Response({"success": False, "message": "Failed to load employee account details."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_manager_required
def reveal_employee_account_number_view(request, pk):
    """
    POST /api/miller/payment-accounts/employee-accounts/<int:pk>/reveal/
    Reveal full unmasked account number using Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    try:
        res = reveal_employee_account_number(user_id, pk, password=password, auth_token=auth_token)
        return Response({"success": True, "account_number": res.get("account_number"), "data": res}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Reveal employee account number failed: %s", exc)
        return Response({"success": False, "message": "Failed to reveal account number."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_manager_required
def archive_employee_account_view(request, pk):
    """
    POST /api/miller/payment-accounts/employee-accounts/<int:pk>/archive/
    Archive employee account with mandatory reason and Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    archive_reason = request.data.get("archive_reason", "")
    try:
        res = archive_employee_payment_account(user_id, pk, archive_reason, password=password, auth_token=auth_token)
        return Response({"success": True, "data": res, "message": res.get("message")}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountValidationError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Archive employee account failed: %s", exc)
        return Response({"success": False, "message": "Failed to archive employee account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@miller_manager_required
def restore_employee_account_view(request, pk):
    """
    POST /api/miller/payment-accounts/employee-accounts/<int:pk>/restore/
    Restore archived employee account with Payment Security Password or auth token.
    """
    user_id = request.grainrise_miller_id
    password = request.data.get("password", "")
    auth_token = request.data.get("auth_token", "")
    try:
        res = restore_employee_payment_account(user_id, pk, password=password, auth_token=auth_token)
        return Response({"success": True, "data": res, "message": res.get("message")}, status=status.HTTP_200_OK)
    except SecurityLockedError as exc:
        return Response({"success": False, "message": str(exc), "locked": True}, status=status.HTTP_423_LOCKED)
    except (InvalidPasswordError, AccountValidationError, AccountNotFoundError, SecurityNotConfiguredError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Restore employee account failed: %s", exc)
        return Response({"success": False, "message": "Failed to restore employee account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# EMPLOYEE PERSONAL ONLINE PAYMENT ACCOUNTS (FLC / DRIVER)
# ============================================================

@api_view(["GET"])
@miller_payment_security_user_required
def my_payment_accounts_list_view(request):
    """
    GET /api/miller/payment-accounts/my-accounts/
    Returns personal payment accounts for the authenticated employee.
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                credentials_id,
                supplier_profile_id,
                type,
                platform_name,
                bank_name,
                account_number,
                account_name,
                verification_status,
                is_default,
                status,
                archive_reason,
                created_at,
                updated_at
            FROM miller_employee_online_transaction_credentials
            WHERE supplier_employee_id = %s
            ORDER BY is_default DESC, credentials_id DESC
            """,
            [emp_id],
        )
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        cid, sp_id, acc_type, plat_name, b_name, raw_num, acc_name, verif_stat, is_def, acc_stat, arch_reason, created_at, updated_at = r
        accounts.append({
            "credentials_id": cid,
            "id": cid,
            "supplier_profile_id": sp_id,
            "type": acc_type,
            "platform_name": plat_name or ("GCash" if acc_type == "gcash" else (b_name or "Bank")),
            "bank_name": b_name or ("—" if acc_type == "gcash" else "Bank"),
            "account_name": acc_name,
            "account_number_masked": mask_account_number(raw_num, acc_type),
            "verification_status": verif_stat or "unverified",
            "is_default": bool(is_def),
            "status": acc_stat or "active",
            "archive_reason": arch_reason or "",
            "created_at": created_at.strftime("%Y-%m-%d %H:%M") if hasattr(created_at, "strftime") else str(created_at),
        })

    return Response({"success": True, "accounts": accounts}, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_payment_security_user_required
def my_payment_accounts_create_view(request):
    """
    POST /api/miller/payment-accounts/my-accounts/create/
    Creates a new personal payment account for the authenticated employee.
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id
    sp_id = getattr(request, "grainrise_supplier_profile_id", None) or 1
    data = request.data or {}

    acc_type = (data.get("type") or "gcash").strip().lower()
    platform_name = (data.get("platform_name") or ("GCash" if acc_type == "gcash" else data.get("bank_name", "Bank"))).strip()
    bank_name = (data.get("bank_name") or "").strip()
    account_name = (data.get("account_name") or "").strip()
    account_number = (data.get("account_number") or "").strip()
    is_default = 1 if data.get("is_default") else 0

    if not account_name or not account_number:
        return Response({"success": False, "message": "Account name and account number are required."}, status=status.HTTP_400_BAD_REQUEST)

    verif_status = data.get("verification_status") or ("verified" if data.get("is_verified") else "unverified")

    with connection.cursor() as cursor:
        if is_default:
            cursor.execute("UPDATE miller_employee_online_transaction_credentials SET is_default = 0 WHERE supplier_employee_id = %s", [emp_id])
        cursor.execute(
            """
            INSERT INTO miller_employee_online_transaction_credentials (
                supplier_profile_id,
                supplier_employee_id,
                type,
                platform_name,
                bank_name,
                account_number,
                account_name,
                verification_status,
                is_default,
                status,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'active', NOW(), NOW())
            """,
            [sp_id, emp_id, acc_type, platform_name, bank_name, account_number, account_name, verif_status, is_default],
        )
        new_id = cursor.lastrowid

    return Response({"success": True, "message": "Payment account added successfully.", "credentials_id": new_id, "verification_status": verif_status}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
@miller_payment_security_user_required
def my_payment_accounts_update_view(request, pk):
    """
    PUT /api/miller/payment-accounts/my-accounts/<pk>/update/
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id
    data = request.data or {}

    acc_type = (data.get("type") or "gcash").strip().lower()
    platform_name = (data.get("platform_name") or ("GCash" if acc_type == "gcash" else data.get("bank_name", "Bank"))).strip()
    bank_name = (data.get("bank_name") or "").strip()
    account_name = (data.get("account_name") or "").strip()
    account_number = (data.get("account_number") or "").strip()
    is_default = 1 if data.get("is_default") else 0

    with connection.cursor() as cursor:
        if is_default:
            cursor.execute("UPDATE miller_employee_online_transaction_credentials SET is_default = 0 WHERE supplier_employee_id = %s", [emp_id])
        cursor.execute(
            """
            UPDATE miller_employee_online_transaction_credentials
            SET type = %s, platform_name = %s, bank_name = %s, account_name = %s,
                account_number = CASE WHEN %s != '' THEN %s ELSE account_number END,
                is_default = %s, updated_at = NOW()
            WHERE credentials_id = %s AND supplier_employee_id = %s
            """,
            [acc_type, platform_name, bank_name, account_name, account_number, account_number, is_default, pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account updated successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_payment_security_user_required
def my_payment_accounts_archive_view(request, pk):
    """
    POST /api/miller/payment-accounts/my-accounts/<pk>/archive/
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id
    reason = (request.data.get("archive_reason") or "Archived by user").strip()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE miller_employee_online_transaction_credentials
            SET status = 'archived', archive_reason = %s, updated_at = NOW()
            WHERE credentials_id = %s AND supplier_employee_id = %s
            """,
            [reason, pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account archived successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_payment_security_user_required
def my_payment_accounts_restore_view(request, pk):
    """
    POST /api/miller/payment-accounts/my-accounts/<pk>/restore/
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE miller_employee_online_transaction_credentials
            SET status = 'active', archive_reason = NULL, updated_at = NOW()
            WHERE credentials_id = %s AND supplier_employee_id = %s
            """,
            [pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account restored successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_payment_security_user_required
def my_payment_accounts_verify_view(request, pk):
    """
    POST /api/miller/payment-accounts/my-accounts/<pk>/verify/
    Marks an existing employee payment account as verified after client-side screening.
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE miller_employee_online_transaction_credentials
            SET verification_status = 'verified', updated_at = NOW()
            WHERE credentials_id = %s AND supplier_employee_id = %s
            """,
            [pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account verified successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@miller_payment_security_user_required
def my_payment_accounts_reveal_view(request, pk):
    """
    POST /api/miller/payment-accounts/my-accounts/<pk>/reveal/
    """
    emp_id = getattr(request, "grainrise_supplier_employee_id", None) or request.grainrise_miller_id
    password = request.data.get("password", "")

    try:
        verify_security_password(request.grainrise_miller_id, password, is_employee=getattr(request, "grainrise_is_employee", False))
    except Exception as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT account_number
            FROM miller_employee_online_transaction_credentials
            WHERE credentials_id = %s AND supplier_employee_id = %s
            LIMIT 1
            """,
            [pk, emp_id],
        )
        row = cursor.fetchone()

    if not row:
        return Response({"success": False, "message": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({"success": True, "account_number": row[0]}, status=status.HTTP_200_OK)


