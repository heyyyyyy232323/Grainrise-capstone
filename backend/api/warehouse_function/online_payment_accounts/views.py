import logging
from django.db import connection
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.warehouse_function.warehouse_auth import warehouse_payment_security_user_required
from .selectors import (
    get_warehouse_security_status,
    get_warehouse_user_info,
    mask_account_number,
    list_warehouse_employee_payment_accounts,
    get_warehouse_employee_payment_account_detail,
    list_warehouse_employee_positions,
)
from .services import (
    send_first_time_setup_otp,
    setup_security_password,
    verify_security_password,
    send_forgot_security_password_otp,
    reset_security_password,
    archive_employee_payment_account,
    restore_employee_payment_account,
    reveal_employee_account_number,
    issue_action_auth_token,
    check_duplicate_payment_account,
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
@warehouse_payment_security_user_required
def security_status_view(request):
    """
    GET /api/warehouse/payment-accounts/security/status/
    Return the Payment Security Password configuration status for the Warehouse user/employee.
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    try:
        sec_status = get_warehouse_security_status(user_id, is_employee=is_employee)
        user_info = get_warehouse_user_info(user_id, is_employee=is_employee)
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
        logger.exception("Failed to check warehouse security status for user_id=%s: %s", user_id, exc)
        return Response(
            {"success": False, "message": "Failed to check payment security status."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_payment_security_user_required
def send_setup_otp_view(request):
    """
    POST /api/warehouse/payment-accounts/security/send-setup-otp/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    try:
        res = send_first_time_setup_otp(user_id, is_employee=is_employee)
        return Response(res, status=status.HTTP_200_OK)
    except (SecurityAlreadyConfiguredError, OtpCooldownError, PaymentSecurityEmailError, PaymentSecurityError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to send warehouse setup OTP for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to send verification code."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def setup_security_password_view(request):
    """
    POST /api/warehouse/payment-accounts/security/setup-password/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    data = request.data or {}
    otp_code = data.get("otp_code") or data.get("otp")
    password = data.get("password")
    confirm_password = data.get("confirm_password")

    try:
        res = setup_security_password(user_id, otp_code, password, confirm_password, is_employee=is_employee)
        return Response(res, status=status.HTTP_200_OK)
    except (OtpExpiredOrInvalidError, AccountValidationError, PaymentSecurityError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to setup warehouse security password for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to configure payment security password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def verify_security_password_view(request):
    """
    POST /api/warehouse/payment-accounts/security/verify/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    password = (request.data or {}).get("password", "")

    try:
        verify_security_password(user_id, password, is_employee=is_employee)
        return Response({"success": True, "message": "Password verified successfully."}, status=status.HTTP_200_OK)
    except (SecurityNotConfiguredError, SecurityLockedError, InvalidPasswordError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to verify warehouse security password for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to verify password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def authorize_action_view(request):
    """
    POST /api/warehouse/payment-accounts/security/authorize-action/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    data = request.data or {}
    password = data.get("password", "")
    action = data.get("action", "")
    account_id = data.get("account_id", "")

    if not action or account_id is None:
        return Response({"success": False, "message": "action and account_id are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        verify_security_password(user_id, password, is_employee=is_employee)
        token = issue_action_auth_token(user_id, action, account_id)
        return Response({"success": True, "action_token": token, "expires_in": 300}, status=status.HTTP_200_OK)
    except (SecurityNotConfiguredError, SecurityLockedError, InvalidPasswordError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to authorize warehouse action for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to authorize action."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def send_forgot_otp_view(request):
    """
    POST /api/warehouse/payment-accounts/security/send-forgot-otp/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    try:
        res = send_forgot_security_password_otp(user_id, is_employee=is_employee)
        return Response(res, status=status.HTTP_200_OK)
    except (OtpCooldownError, PaymentSecurityEmailError, PaymentSecurityError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to send warehouse forgot-password OTP for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to send reset code."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def reset_security_password_view(request):
    """
    POST /api/warehouse/payment-accounts/security/reset-password/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    data = request.data or {}
    otp_code = data.get("otp_code") or data.get("otp")
    new_password = data.get("new_password") or data.get("password")
    confirm_password = data.get("confirm_password")

    try:
        res = reset_security_password(user_id, otp_code, new_password, confirm_password, is_employee=is_employee)
        return Response(res, status=status.HTTP_200_OK)
    except (OtpExpiredOrInvalidError, AccountValidationError, PaymentSecurityError) as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        logger.exception("Failed to reset warehouse security password for user_id=%s: %s", user_id, exc)
        return Response({"success": False, "message": "Failed to reset security password."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# DUPLICATE ACCOUNT CHECK
# ============================================================

@api_view(["GET", "POST"])
@warehouse_payment_security_user_required
def check_duplicate_account_view(request):
    """
    GET/POST /api/warehouse/payment-accounts/branches/check-duplicate/
    """
    data = request.data if request.method == "POST" else request.GET
    account_number = data.get("account_number", "").strip()
    exclude_id = data.get("exclude_id")
    wh_id = request.grainrise_warehouse_profile_id or 1
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id

    if not account_number:
        return Response({"success": True, "is_duplicate": False}, status=status.HTTP_200_OK)

    try:
        clean_exclude = int(exclude_id) if exclude_id else None
    except (TypeError, ValueError):
        clean_exclude = None

    is_dup = check_duplicate_payment_account(wh_id, emp_id, account_number, exclude_id=clean_exclude)
    return Response(
        {
            "success": True,
            "is_duplicate": is_dup,
            "message": "An active payment account with this number already exists." if is_dup else "Account number is available.",
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# EMPLOYEE PERSONAL ONLINE PAYMENT ACCOUNTS (SELF-SERVICE)
# ============================================================

@api_view(["GET"])
@warehouse_payment_security_user_required
def my_payment_accounts_list_view(request):
    """
    GET /api/warehouse/payment-accounts/my-accounts/
    Returns personal payment accounts for the authenticated warehouse employee.
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                credentials_id,
                warehouse_profile_id,
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
            FROM warehouse_employee_online_transaction_credentials
            WHERE warehouse_employee_id = %s
            ORDER BY is_default DESC, credentials_id DESC
            """,
            [emp_id],
        )
        rows = cursor.fetchall()

    accounts = []
    for r in rows:
        cid, wh_id, acc_type, plat_name, b_name, raw_num, acc_name, verif_stat, is_def, acc_stat, arch_reason, created_at, updated_at = r
        accounts.append({
            "credentials_id": cid,
            "id": cid,
            "warehouse_profile_id": wh_id,
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
@warehouse_payment_security_user_required
def my_payment_accounts_create_view(request):
    """
    POST /api/warehouse/payment-accounts/my-accounts/create/
    Creates a new personal payment account for the authenticated warehouse employee.
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id
    wh_id = getattr(request, "grainrise_warehouse_profile_id", None) or 1
    data = request.data or {}

    acc_type = (data.get("type") or "gcash").strip().lower()
    platform_name = (data.get("platform_name") or ("GCash" if acc_type == "gcash" else data.get("bank_name", "Bank"))).strip()
    bank_name = (data.get("bank_name") or "").strip()
    account_name = (data.get("account_name") or "").strip()
    account_number = (data.get("account_number") or "").strip()
    is_default = 1 if data.get("is_default") else 0

    if not account_name or not account_number:
        return Response({"success": False, "message": "Account name and account number are required."}, status=status.HTTP_400_BAD_REQUEST)

    if check_duplicate_payment_account(wh_id, emp_id, account_number):
        return Response({"success": False, "message": "An active payment account with this number already exists."}, status=status.HTTP_400_BAD_REQUEST)

    verif_status = data.get("verification_status") or ("verified" if data.get("is_verified") else "unverified")

    with connection.cursor() as cursor:
        if is_default:
            cursor.execute("UPDATE warehouse_employee_online_transaction_credentials SET is_default = 0 WHERE warehouse_employee_id = %s", [emp_id])
        cursor.execute(
            """
            INSERT INTO warehouse_employee_online_transaction_credentials (
                warehouse_profile_id,
                warehouse_employee_id,
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
            [wh_id, emp_id, acc_type, platform_name, bank_name, account_number, account_name, verif_status, is_default],
        )
        new_id = cursor.lastrowid

    return Response({"success": True, "message": "Payment account added successfully.", "credentials_id": new_id, "verification_status": verif_status}, status=status.HTTP_201_CREATED)


@api_view(["PUT"])
@warehouse_payment_security_user_required
def my_payment_accounts_update_view(request, pk):
    """
    PUT /api/warehouse/payment-accounts/my-accounts/<pk>/update/
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id
    wh_id = getattr(request, "grainrise_warehouse_profile_id", None) or 1
    data = request.data or {}

    acc_type = (data.get("type") or "gcash").strip().lower()
    platform_name = (data.get("platform_name") or ("GCash" if acc_type == "gcash" else data.get("bank_name", "Bank"))).strip()
    bank_name = (data.get("bank_name") or "").strip()
    account_name = (data.get("account_name") or "").strip()
    account_number = (data.get("account_number") or "").strip()
    is_default = 1 if data.get("is_default") else 0

    if account_number and check_duplicate_payment_account(wh_id, emp_id, account_number, exclude_id=pk):
        return Response({"success": False, "message": "An active payment account with this number already exists."}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        if is_default:
            cursor.execute("UPDATE warehouse_employee_online_transaction_credentials SET is_default = 0 WHERE warehouse_employee_id = %s", [emp_id])
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET type = %s, platform_name = %s, bank_name = %s, account_name = %s,
                account_number = CASE WHEN %s != '' THEN %s ELSE account_number END,
                is_default = %s, updated_at = NOW()
            WHERE credentials_id = %s AND warehouse_employee_id = %s
            """,
            [acc_type, platform_name, bank_name, account_name, account_number, account_number, is_default, pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account updated successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_payment_security_user_required
def my_payment_accounts_archive_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/my-accounts/<pk>/archive/
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id
    reason = (request.data.get("archive_reason") or "Archived by user").strip()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET status = 'archived', archive_reason = %s, updated_at = NOW()
            WHERE credentials_id = %s AND warehouse_employee_id = %s
            """,
            [reason, pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account archived successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_payment_security_user_required
def my_payment_accounts_restore_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/my-accounts/<pk>/restore/
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET status = 'active', archive_reason = NULL, updated_at = NOW()
            WHERE credentials_id = %s AND warehouse_employee_id = %s
            """,
            [pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account restored successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_payment_security_user_required
def my_payment_accounts_verify_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/my-accounts/<pk>/verify/
    Marks an existing employee payment account as verified after client-side screening.
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE warehouse_employee_online_transaction_credentials
            SET verification_status = 'verified', updated_at = NOW()
            WHERE credentials_id = %s AND warehouse_employee_id = %s
            """,
            [pk, emp_id],
        )

    return Response({"success": True, "message": "Payment account verified successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_payment_security_user_required
def my_payment_accounts_reveal_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/my-accounts/<pk>/reveal/
    """
    emp_id = getattr(request, "grainrise_warehouse_employee_id", None) or request.grainrise_warehouse_id
    password = request.data.get("password", "")

    try:
        verify_security_password(emp_id, password, is_employee=getattr(request, "grainrise_is_employee", True))
    except Exception as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT account_number
            FROM warehouse_employee_online_transaction_credentials
            WHERE credentials_id = %s AND warehouse_employee_id = %s
            LIMIT 1
            """,
            [pk, emp_id],
        )
        row = cursor.fetchone()

    if not row:
        return Response({"success": False, "message": "Account not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({"success": True, "account_number": row[0]}, status=status.HTTP_200_OK)


# ============================================================
# EMPLOYEE ONLINE PAYMENT ACCOUNTS (MANAGER / FINANCE TAB)
# ============================================================

@api_view(["GET"])
@warehouse_payment_security_user_required
def list_employee_accounts_view(request):
    """
    GET /api/warehouse/payment-accounts/employee-accounts/
    """
    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    pos_filter = request.GET.get("position", "all")
    stat_filter = request.GET.get("status", "all")
    type_filter = request.GET.get("type", "all")
    verif_filter = request.GET.get("verification", "all")
    search = request.GET.get("search", "")
    sort_by = request.GET.get("sort", "newest")

    try:
        accounts = list_warehouse_employee_payment_accounts(
            warehouse_profile_ids=warehouse_profile_ids,
            position_filter=pos_filter,
            status_filter=stat_filter,
            type_filter=type_filter,
            verification_filter=verif_filter,
            search=search,
            sort_by=sort_by,
        )
        return Response({"success": True, "accounts": accounts, "total": len(accounts)}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Failed to fetch warehouse employee accounts: %s", exc)
        return Response({"success": False, "message": "Failed to retrieve employee payment accounts."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@warehouse_payment_security_user_required
def list_employee_positions_view(request):
    """
    GET /api/warehouse/payment-accounts/employee-positions/
    """
    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    try:
        positions = list_warehouse_employee_positions(warehouse_profile_ids)
        return Response({"success": True, "positions": positions}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Failed to fetch employee positions: %s", exc)
        return Response({"success": False, "message": "Failed to retrieve positions."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@warehouse_payment_security_user_required
def get_employee_account_detail_view(request, pk):
    """
    GET /api/warehouse/payment-accounts/employee-accounts/<pk>/
    """
    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    account = get_warehouse_employee_payment_account_detail(pk, warehouse_profile_ids)
    if not account:
        return Response({"success": False, "message": "Employee payment account not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({"success": True, "account": account}, status=status.HTTP_200_OK)


@api_view(["POST"])
@warehouse_payment_security_user_required
def reveal_employee_account_number_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/employee-accounts/<pk>/reveal/
    """
    user_id = request.grainrise_warehouse_id
    is_employee = getattr(request, "grainrise_is_employee", True)
    password = request.data.get("password", "")

    try:
        verify_security_password(user_id, password, is_employee=is_employee)
    except Exception as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    try:
        acc_num = reveal_employee_account_number(pk, warehouse_profile_ids)
        return Response({"success": True, "account_number": acc_num}, status=status.HTTP_200_OK)
    except AccountNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Failed to reveal employee account number for id=%s: %s", pk, exc)
        return Response({"success": False, "message": "Failed to reveal account number."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def archive_employee_account_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/employee-accounts/<pk>/archive/
    """
    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    reason = request.data.get("reason") or request.data.get("archive_reason") or "Archived by manager"
    try:
        res = archive_employee_payment_account(pk, warehouse_profile_ids, reason=reason)
        return Response(res, status=status.HTTP_200_OK)
    except AccountNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Failed to archive employee account id=%s: %s", pk, exc)
        return Response({"success": False, "message": "Failed to archive account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
@warehouse_payment_security_user_required
def restore_employee_account_view(request, pk):
    """
    POST /api/warehouse/payment-accounts/employee-accounts/<pk>/restore/
    """
    warehouse_profile_ids = getattr(request, "grainrise_warehouse_profile_ids", None)
    if not warehouse_profile_ids:
        single = getattr(request, "grainrise_warehouse_profile_id", None)
        warehouse_profile_ids = [single] if single else [1]

    try:
        res = restore_employee_payment_account(pk, warehouse_profile_ids)
        return Response(res, status=status.HTTP_200_OK)
    except AccountNotFoundError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        logger.exception("Failed to restore employee account id=%s: %s", pk, exc)
        return Response({"success": False, "message": "Failed to restore account."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
