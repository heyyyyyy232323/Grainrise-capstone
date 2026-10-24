import base64
from datetime import datetime, timedelta
from decimal import Decimal
import hmac
import json
import logging
import os
import re
import secrets
import urllib.error
import urllib.request
import uuid
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone

from .selectors import (
    FAILED_PAYOUT_STATUSES,
    PENDING_PAYOUT_STATUSES,
    compute_business_prefix3,
    compute_initials,
    get_reimbursement_detail,
)

logger = logging.getLogger(__name__)

XENDIT_PAYOUTS_V3_URL = "https://api.xendit.co/v3/payouts"
XENDIT_API_VERSION = "2025-09-01"

# Official SWIFT / BIC codes for Philippine banks in Xendit v3 Payouts
PH_BANK_SWIFT_MAP = {
    "bdo": "BNORPHMM",
    "bdo unibank": "BNORPHMM",
    "bpi": "BOPIPHMM",
    "bank of the philippine islands (bpi)": "BOPIPHMM",
    "bank of the philippine islands": "BOPIPHMM",
    "metrobank": "MBTCPHMM",
    "land bank": "TLBPPHMM",
    "land bank of the philippines": "TLBPPHMM",
    "pnb": "PNBMPHMM",
    "philippine national bank (pnb)": "PNBMPHMM",
    "philippine national bank": "PNBMPHMM",
    "security bank": "SETCPHMM",
    "unionbank": "UBPHPHMM",
    "unionbank of the philippines": "UBPHPHMM",
    "rcbc": "RCBCPHMM",
    "china bank": "CHBKPHMM",
    "china banking corporation (china bank)": "CHBKPHMM",
    "china banking corporation": "CHBKPHMM",
    "eastwest": "EWBCPHMM",
    "eastwest bank": "EWBCPHMM",
    "aub": "AUBKPHMM",
    "asia united bank (aub)": "AUBKPHMM",
    "asia united bank": "AUBKPHMM",
    "dbp": "DBPHPHMM",
    "development bank of the philippines (dbp)": "DBPHPHMM",
    "development bank of the philippines": "DBPHPHMM",
}


class ReimbursementError(Exception):
    """Base exception for reimbursement payment operations."""
    pass


class ReimbursementNotFoundError(ReimbursementError):
    pass


class AlreadyPaidError(ReimbursementError):
    pass


class DuplicatePayoutError(ReimbursementError):
    pass


class PendingPayoutExistsError(ReimbursementError):
    pass


class InvalidPaymentAccountError(ReimbursementError):
    pass


class XenditConfigurationError(ReimbursementError):
    pass


class XenditPayoutFailedError(ReimbursementError):
    def __init__(self, message, error_code=None, attempt_data=None):
        super().__init__(message)
        self.error_code = error_code
        self.attempt_data = attempt_data


class WebhookAuthenticationError(ReimbursementError):
    pass


class WebhookConfigMissingError(ReimbursementError):
    pass


def _read_fresh_env_dict() -> dict:
    """Read key-value pairs directly from backend/.env so runtime edits take effect immediately."""
    env_map = {}
    try:
        env_path = settings.BASE_DIR / ".env"
        if env_path.exists():
            for raw_line in env_path.read_text(encoding="utf-8").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in {'"', "'"}:
                    v = v[1:-1]
                env_map[k] = v
    except Exception as exc:
        logger.warning("Could not read .env directly: %s", exc)
    return env_map


def get_xendit_config() -> dict:
    """
    Read XENDIT_SECRET_KEY, XENDIT_MODE, and XENDIT_CALLBACK_TOKEN from backend/.env (fresh)
    or environment. Never exposes secret values to frontend.
    """
    fresh_env = _read_fresh_env_dict()
    secret_key = (fresh_env.get("XENDIT_SECRET_KEY") or os.getenv("XENDIT_SECRET_KEY") or "").strip()
    raw_mode = (fresh_env.get("XENDIT_MODE") or os.getenv("XENDIT_MODE") or "test").strip().lower()
    callback_token = (
        fresh_env.get("XENDIT_CALLBACK_TOKEN")
        or fresh_env.get("XENDIT_WEBHOOK_VERIFICATION_TOKEN")
        or os.getenv("XENDIT_CALLBACK_TOKEN")
        or os.getenv("XENDIT_WEBHOOK_VERIFICATION_TOKEN")
        or ""
    ).strip()

    if raw_mode == "live" and secret_key.startswith("xnd_production_"):
        environment = "live"
    else:
        environment = "test"

    return {
        "secret_key": secret_key,
        "mode": environment,
        "has_secret_key": bool(secret_key),
        "callback_token": callback_token,
        "has_callback_token": bool(callback_token),
    }


def _save_receipt_file(receipt_file, supplier_profile_id: int) -> str:
    """
    Save optional receipt image to MEDIA_ROOT/finance_receipts/{supplier_profile_id}/.
    """
    if not receipt_file:
        return None

    ext = os.path.splitext(receipt_file.name.lower())[1]
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        ext = ".jpg"

    unique_token = secrets.token_hex(8)
    today_str = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y%m%d")
    filename = f"reimb_receipt_{today_str}_{unique_token}{ext}"

    rel_dir = os.path.join("finance_receipts", str(supplier_profile_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        for chunk in receipt_file.chunks():
            f.write(chunk)

    return f"/media/finance_receipts/{supplier_profile_id}/{filename}"


def generate_and_validate_cash_reference(
    business_name: str,
    requester_name: str,
    payer_name: str,
    client_reference: str,
    cursor,
) -> str:
    """
    Cash payment reference contract:
    Format: BUSINESS3-REQUESTER_INITIALS-PAYER_INITIALS-MMDDYYYY-HHMM
    (Also accepts unhyphenated BUSINESS3REQUESTER_INITIALSPAYER_INITIALSMMDDYYYYHHMM
    and validates prefix components against authoritative DB business, requester, and payer names.)
    """
    biz3 = compute_business_prefix3(business_name)
    req_init = compute_initials(requester_name, fallback="RQ")
    pay_init = compute_initials(payer_name, fallback="FN")
    now_ph = datetime.now(ZoneInfo("Asia/Manila"))

    expected_prefix_hyphen = f"{biz3}-{req_init}-{pay_init}-"
    expected_prefix_compact = f"{biz3}{req_init}{pay_init}"

    candidate_ref = None
    raw_client = str(client_reference or "").strip().upper()

    if raw_client:
        pattern_hyphen = rf"^{re.escape(biz3)}-{re.escape(req_init)}-{re.escape(pay_init)}-(\d{{8}})-(\d{{4}})$"
        pattern_compact = rf"^{re.escape(biz3)}{re.escape(req_init)}{re.escape(pay_init)}(\d{{8}})(\d{{4}})$"
        m_hyphen = re.match(pattern_hyphen, raw_client)
        m_compact = re.match(pattern_compact, raw_client)

        if m_hyphen:
            date_part, time_part = m_hyphen.group(1), m_hyphen.group(2)
            try:
                datetime.strptime(f"{date_part}{time_part}", "%m%d%Y%H%M")
                candidate_ref = f"{expected_prefix_hyphen}{date_part}-{time_part}"
            except ValueError:
                raise ValueError("Invalid date/time segment in Cash payment reference.")
        elif m_compact:
            date_part, time_part = m_compact.group(1), m_compact.group(2)
            try:
                datetime.strptime(f"{date_part}{time_part}", "%m%d%Y%H%M")
                candidate_ref = f"{expected_prefix_hyphen}{date_part}-{time_part}"
            except ValueError:
                raise ValueError("Invalid date/time segment in Cash payment reference.")
        else:
            raise ValueError(
                f"Invalid Cash payment reference format. Expected format: "
                f"{biz3}-{req_init}-{pay_init}-MMDDYYYY-HHMM."
            )

    if not candidate_ref:
        candidate_ref = f"{expected_prefix_hyphen}{now_ph.strftime('%m%d%Y-%H%M')}"

    # Ensure uniqueness in miller_reimbursement.payment_reference_no
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM miller_reimbursement
        WHERE payment_reference_no = %s
        """,
        [candidate_ref],
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return candidate_ref

    for minute_offset in range(1, 120):
        adj_time = now_ph + timedelta(minutes=minute_offset)
        fallback_ref = f"{expected_prefix_hyphen}{adj_time.strftime('%m%d%Y-%H%M')}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_reimbursement
            WHERE payment_reference_no = %s
            """,
            [fallback_ref],
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return fallback_ref

    return candidate_ref


def _map_bank_to_swift(bank_name: str, platform_name: str = "") -> str:
    """Map registered Philippine bank name to Xendit v3 SWIFT code."""
    for candidate in (bank_name, platform_name):
        key = str(candidate or "").strip().lower()
        if not key:
            continue
        if key in PH_BANK_SWIFT_MAP:
            return PH_BANK_SWIFT_MAP[key]
        for known_key, swift_code in PH_BANK_SWIFT_MAP.items():
            if known_key in key:
                return swift_code
    return "BNORPHMM"


def _split_person_name(full_name: str):
    """Split full name into given_name and surname for Xendit v3 recipient object."""
    parts = [p for p in str(full_name or "").strip().split() if p]
    if not parts:
        return "Employee", "Recipient"
    if len(parts) == 1:
        return parts[0][:50], parts[0][:50]
    given_name = " ".join(parts[:-1])[:50]
    surname = parts[-1][:50]
    return given_name, surname


def _format_ph_mobile(raw_phone: str) -> str:
    """Normalize PH mobile number into E.164 (+639XXXXXXXXX) or valid 11-digit string."""
    digits = re.sub(r"\D", "", str(raw_phone or ""))
    if len(digits) == 11 and digits.startswith("09"):
        return f"+63{digits[1:]}"
    if len(digits) == 12 and digits.startswith("639"):
        return f"+{digits}"
    if len(digits) == 10 and digits.startswith("9"):
        return f"+63{digits}"
    return "+639170000000"


def _call_xendit_v3_create_payout(
    secret_key: str,
    idempotency_key: str,
    payload: dict,
) -> tuple[int, dict]:
    """
    Execute HTTP POST to https://api.xendit.co/v3/payouts with Basic Auth,
    Api-version: 2025-09-01, and Idempotency-key header.
    """
    auth_token = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("ascii")
    body_bytes = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        XENDIT_PAYOUTS_V3_URL,
        data=body_bytes,
        method="POST",
        headers={
            "Authorization": f"Basic {auth_token}",
            "Api-version": XENDIT_API_VERSION,
            "Idempotency-key": idempotency_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw_body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(raw_body) if raw_body else {}
            return resp.status, data
    except urllib.error.HTTPError as http_err:
        raw_err = http_err.read().decode("utf-8", errors="replace")
        try:
            err_data = json.loads(raw_err) if raw_err else {}
        except Exception:
            err_data = {"error_code": f"HTTP_{http_err.code}", "message": raw_err[:200]}
        return http_err.code, err_data
    except Exception as exc:
        return 503, {
            "error_code": "NETWORK_ERROR",
            "message": f"Unable to reach Xendit Payouts API: {exc}",
        }


def _call_xendit_v3_get_payout(secret_key: str, xendit_payout_id: str) -> tuple[int, dict]:
    """
    Execute HTTP GET to https://api.xendit.co/v3/payouts/{payout_id}
    for payout status reconciliation.
    """
    auth_token = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("ascii")
    url = f"{XENDIT_PAYOUTS_V3_URL}/{xendit_payout_id}"

    req = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Authorization": f"Basic {auth_token}",
            "Api-version": XENDIT_API_VERSION,
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw_body = resp.read().decode("utf-8", errors="replace")
            data = json.loads(raw_body) if raw_body else {}
            return resp.status, data
    except urllib.error.HTTPError as http_err:
        raw_err = http_err.read().decode("utf-8", errors="replace")
        try:
            err_data = json.loads(raw_err) if raw_err else {}
        except Exception:
            err_data = {"error_code": f"HTTP_{http_err.code}", "message": raw_err[:200]}
        return http_err.code, err_data
    except Exception as exc:
        return 503, {
            "error_code": "NETWORK_ERROR",
            "message": f"Unable to reach Xendit Payouts API: {exc}",
        }


def process_reimbursement_payment(
    supplier_profile_id: int,
    paid_by_employee_id: int,
    reimbursement_id: int,
    payment_method: str,
    payment_reference: str = None,
    employee_credentials_id: int = None,
    receipt_file=None,
) -> dict:
    """
    Process a reimbursement payment via Cash or Xendit v3 Payouts (GCash / Bank).
    If an existing payout attempt is currently in a pending state, reconciles it via
    Xendit GET Payout API first so accepted/pending or succeeded payouts never create duplicates.
    """
    method_raw = str(payment_method or "").strip().lower()
    if method_raw == "cash":
        norm_method = "Cash"
    elif method_raw == "gcash":
        norm_method = "GCash"
    elif method_raw == "bank":
        norm_method = "Bank"
    else:
        raise ValueError("Invalid payment method. Must be Cash, GCash, or Bank.")

    # Pre-check if there is an existing pending payout attempt and reconcile its status via GET /v3/payouts/{id}
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT payout_status, xendit_payout_id
                FROM miller_reimbursement_payout_tracking
                WHERE reimbursement_id = %s
                  AND supplier_profile_id = %s
                ORDER BY payout_attempt_id DESC
                LIMIT 1
                """,
                [reimbursement_id, supplier_profile_id],
            )
            latest_tr = cursor.fetchone()
        if latest_tr and str(latest_tr[0] or "").upper() in PENDING_PAYOUT_STATUSES:
            reconcile_xendit_payout_status(supplier_profile_id, reimbursement_id)
    except Exception as exc:
        logger.warning("Pre-payment reconciliation check warning for reimbursement_id=%s: %s", reimbursement_id, exc)

    if norm_method == "Cash":
        return _process_cash_reimbursement(
            supplier_profile_id=supplier_profile_id,
            paid_by_employee_id=paid_by_employee_id,
            reimbursement_id=reimbursement_id,
            client_reference=payment_reference,
            receipt_file=receipt_file,
        )

    return _initiate_xendit_payout_reimbursement(
        supplier_profile_id=supplier_profile_id,
        paid_by_employee_id=paid_by_employee_id,
        reimbursement_id=reimbursement_id,
        norm_method=norm_method,
        employee_credentials_id=employee_credentials_id,
        receipt_file=receipt_file,
    )


def _process_cash_reimbursement(
    supplier_profile_id: int,
    paid_by_employee_id: int,
    reimbursement_id: int,
    client_reference: str = None,
    receipt_file=None,
) -> dict:
    """
    Record manual Cash reimbursement payment:
    - Enforces branch ownership and 'requested' status.
    - Ensures no pending or succeeded online payout attempt exists.
    - Validates/generates BUSINESS3-REQUESTER_INITIALS-PAYER_INITIALS-MMDDYYYY-HHMM reference.
    - Updates miller_reimbursement to status='paid'.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    mr.reimbursement_id,
                    mr.supplier_profile_id,
                    mr.requested_by,
                    mr.status,
                    mr.request_reference_no,
                    mr.price,
                    sp.business_name,
                    CONCAT_WS(' ', COALESCE(req_emp.first_name, ''), COALESCE(req_emp.last_name, '')) AS requester_name,
                    CONCAT_WS(' ', COALESCE(pay_emp.first_name, ''), COALESCE(pay_emp.last_name, '')) AS payer_name
                FROM miller_reimbursement mr
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = mr.supplier_profile_id
                INNER JOIN supplier_employees req_emp
                    ON req_emp.supplier_employee_id = mr.requested_by
                LEFT JOIN supplier_employees pay_emp
                    ON pay_emp.supplier_employee_id = %s
                WHERE mr.reimbursement_id = %s
                FOR UPDATE
                """,
                [paid_by_employee_id, reimbursement_id],
            )
            row = cursor.fetchone()

            if not row:
                raise ReimbursementNotFoundError("Reimbursement record not found.")

            (
                reimb_id,
                reimb_sp_id,
                requested_by_id,
                current_status,
                req_ref_no,
                price_val,
                business_name,
                requester_name,
                payer_name,
            ) = row

            if int(reimb_sp_id) != int(supplier_profile_id):
                raise ReimbursementNotFoundError(
                    "Access denied. Reimbursement does not belong to your assigned branch."
                )

            if str(current_status or "").lower() == "paid":
                raise AlreadyPaidError(f"Reimbursement {req_ref_no} has already been paid.")

            # Check existing payout tracking rows to prevent paying Cash while an online payout is pending or succeeded
            cursor.execute(
                """
                SELECT payout_attempt_id, payout_status, xendit_payout_id
                FROM miller_reimbursement_payout_tracking
                WHERE reimbursement_id = %s
                ORDER BY payout_attempt_id DESC
                FOR UPDATE
                """,
                [reimb_id],
            )
            tracking_rows = cursor.fetchall()
            for tr in tracking_rows:
                st_upper = str(tr[1] or "").upper()
                if st_upper == "SUCCEEDED":
                    raise DuplicatePayoutError(
                        f"Cannot mark as Cash paid: Xendit payout ({tr[2] or tr[0]}) already succeeded for {req_ref_no}."
                    )
                if st_upper in PENDING_PAYOUT_STATUSES:
                    raise PendingPayoutExistsError(
                        f"Cannot mark as Cash paid while Xendit payout ({tr[2] or tr[0]}) is currently {st_upper}."
                    )

            final_ref = generate_and_validate_cash_reference(
                business_name=business_name,
                requester_name=requester_name,
                payer_name=payer_name,
                client_reference=client_reference,
                cursor=cursor,
            )

            receipt_photo_url = None
            if receipt_file:
                receipt_photo_url = _save_receipt_file(receipt_file, supplier_profile_id)

            now_ph = datetime.now(ZoneInfo("Asia/Manila"))

            cursor.execute(
                """
                UPDATE miller_reimbursement
                SET
                    status = 'paid',
                    paid_by = %s,
                    paid_date = %s,
                    method = 'Cash',
                    receipt_photo = %s,
                    payment_reference_no = %s
                WHERE reimbursement_id = %s
                  AND supplier_profile_id = %s
                """,
                [
                    paid_by_employee_id,
                    now_ph,
                    receipt_photo_url,
                    final_ref,
                    reimb_id,
                    supplier_profile_id,
                ],
            )

    detail = get_reimbursement_detail(supplier_profile_id, reimbursement_id)
    return {
        "payment_flow": "CASH",
        "is_sandbox": False,
        "status": "paid",
        "payment_reference_no": final_ref,
        "reimbursement": detail,
    }


def _initiate_xendit_payout_reimbursement(
    supplier_profile_id: int,
    paid_by_employee_id: int,
    reimbursement_id: int,
    norm_method: str,
    employee_credentials_id: int,
    receipt_file=None,
) -> dict:
    """
    Initiate an official Xendit /v3/payouts disbursement for GCash or Bank:
    - Validates employee_credentials_id belongs strictly to mr.requested_by and is active.
    - Tracks attempt in miller_reimbursement_payout_tracking with PHP centavo amount and idempotency.
    - Prevents duplicate payouts while pending or after success; allows safe retry after failure.
    - Keeps miller_reimbursement.status = 'requested' for pending/failed or sandbox ('test') simulated payouts;
      marks miller_reimbursement.status = 'paid' only for verified live SUCCEEDED payouts.
    """
    if not employee_credentials_id:
        raise InvalidPaymentAccountError(
            f"Please select an active registered {norm_method} account for the requesting employee."
        )

    xendit_cfg = get_xendit_config()
    if not xendit_cfg["has_secret_key"]:
        raise XenditConfigurationError("XENDIT_SECRET_KEY is not configured on the backend server.")

    expected_cred_type = "gcash" if norm_method == "GCash" else "bank"

    # Phase 1: Atomic DB lock, validation, and tracking row creation
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    mr.reimbursement_id,
                    mr.supplier_profile_id,
                    mr.requested_by,
                    mr.status,
                    mr.request_reference_no,
                    mr.price,
                    mr.title,
                    mr.types,
                    sp.business_name,
                    sp.municipality,
                    sp.province,
                    sp.street_address,
                    se.first_name,
                    se.last_name
                FROM miller_reimbursement mr
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = mr.supplier_profile_id
                INNER JOIN supplier_employees se
                    ON se.supplier_employee_id = mr.requested_by
                WHERE mr.reimbursement_id = %s
                FOR UPDATE
                """,
                [reimbursement_id],
            )
            reimb_row = cursor.fetchone()

            if not reimb_row:
                raise ReimbursementNotFoundError("Reimbursement record not found.")

            (
                reimb_id,
                reimb_sp_id,
                requested_by_id,
                current_status,
                req_ref_no,
                price_val,
                reimb_title,
                reimb_type,
                business_name,
                municipality,
                province,
                street_address,
                req_first_name,
                req_last_name,
            ) = reimb_row

            if int(reimb_sp_id) != int(supplier_profile_id):
                raise ReimbursementNotFoundError(
                    "Access denied. Reimbursement does not belong to your assigned branch."
                )

            if str(current_status or "").lower() == "paid":
                raise AlreadyPaidError(f"Reimbursement {req_ref_no} has already been paid.")

            # Lock existing payout attempts for this reimbursement
            cursor.execute(
                """
                SELECT
                    payout_attempt_id,
                    payout_status,
                    xendit_payout_id,
                    reference_id,
                    xendit_environment
                FROM miller_reimbursement_payout_tracking
                WHERE reimbursement_id = %s
                ORDER BY payout_attempt_id DESC
                FOR UPDATE
                """,
                [reimb_id],
            )
            existing_attempts = cursor.fetchall()

            for att in existing_attempts:
                att_id, att_status, att_xendit_id, att_ref_id, att_env = att
                st_upper = str(att_status or "").upper()
                if st_upper == "SUCCEEDED":
                    raise DuplicatePayoutError(
                        f"Payout already succeeded ({att_xendit_id or att_ref_id}) in {str(att_env).upper()} mode. Duplicate payouts are blocked."
                    )
                if st_upper == "CREATED" and not att_xendit_id:
                    cursor.execute(
                        """
                        UPDATE miller_reimbursement_payout_tracking
                        SET
                            payout_status = 'FAILED',
                            failure_reason = COALESCE(failure_reason, 'Unaccepted request: Xendit never assigned a payout_id (e.g. 401 INVALID_API_KEY).'),
                            updated_at = NOW()
                        WHERE payout_attempt_id = %s
                        """,
                        [att_id],
                    )
                    continue
                if st_upper in PENDING_PAYOUT_STATUSES:
                    raise PendingPayoutExistsError(
                        f"A payout attempt ({att_xendit_id or att_ref_id}) is currently {st_upper}. Please reconcile or wait for completion before retrying."
                    )

            # Verify employee payment account ownership, active status, and method match
            cursor.execute(
                """
                SELECT
                    ec.credentials_id,
                    ec.supplier_profile_id,
                    ec.supplier_employee_id,
                    ec.type,
                    ec.platform_name,
                    ec.bank_name,
                    ec.account_number,
                    ec.account_name,
                    ec.status
                FROM miller_employee_online_transaction_credentials ec
                WHERE ec.credentials_id = %s
                LIMIT 1
                """,
                [employee_credentials_id],
            )
            cred_row = cursor.fetchone()

            if not cred_row:
                raise InvalidPaymentAccountError("Selected payment account was not found.")

            (
                cred_id,
                cred_sp_id,
                cred_emp_id,
                cred_type,
                cred_platform,
                cred_bank,
                cred_acc_num,
                cred_acc_name,
                cred_status,
            ) = cred_row

            if int(cred_sp_id) != int(supplier_profile_id) or int(cred_emp_id) != int(requested_by_id):
                raise InvalidPaymentAccountError(
                    "Security error: Selected payment account does not belong to the requesting employee."
                )

            if str(cred_status or "").lower() != "active":
                raise InvalidPaymentAccountError("Selected payment account is no longer active.")

            if str(cred_type or "").lower() != expected_cred_type:
                raise InvalidPaymentAccountError(
                    f"Selected account type ({cred_type}) does not match payment method ({norm_method})."
                )

            # Calculate exact PHP centavos (minor units)
            price_dec = Decimal(str(price_val or "0.00"))
            amount_centavos = int((price_dec * Decimal("100")).quantize(Decimal("1")))
            if amount_centavos <= 0:
                raise ValueError("Reimbursement amount must be greater than zero.")

            attempt_number = len(existing_attempts) + 1
            short_token = secrets.token_hex(4).upper()
            reference_id = f"REIMB-{reimb_id}-A{attempt_number}-{short_token}"[:100]
            idempotency_key = f"idem-reimb-{reimb_id}-a{attempt_number}-{uuid.uuid4().hex[:16]}"[:100]

            receipt_photo_url = None
            if receipt_file:
                receipt_photo_url = _save_receipt_file(receipt_file, supplier_profile_id)

            cursor.execute(
                """
                INSERT INTO miller_reimbursement_payout_tracking (
                    reimbursement_id,
                    supplier_profile_id,
                    employee_credentials_id,
                    initiated_by,
                    method,
                    amount_centavos,
                    xendit_environment,
                    reference_id,
                    idempotency_key,
                    payout_status,
                    receipt_photo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'CREATED', %s)
                """,
                [
                    reimb_id,
                    supplier_profile_id,
                    cred_id,
                    paid_by_employee_id,
                    norm_method,
                    amount_centavos,
                    xendit_cfg["mode"],
                    reference_id,
                    idempotency_key,
                    receipt_photo_url,
                ],
            )
            payout_attempt_id = cursor.lastrowid

    # Phase 2: Build official Xendit /v3/payouts request payload
    holder_name = (cred_acc_name or f"{req_first_name or ''} {req_last_name or ''}").strip() or "Employee Recipient"
    given_name, surname = _split_person_name(holder_name)
    clean_acc_number = re.sub(r"[\s\-]", "", str(cred_acc_num or "").strip())

    if expected_cred_type == "gcash":
        routing_type_1 = "WALLET"
        routing_value_1 = "PH_GCASH"
        mobile_num = _format_ph_mobile(clean_acc_number)
    else:
        routing_type_1 = "SWIFT"
        routing_value_1 = _map_bank_to_swift(cred_bank, cred_platform)
        mobile_num = "+639170000000"

    xendit_payload = {
        "reference_id": reference_id,
        "recipient": {
            "type": "INDIVIDUAL",
            "given_name": given_name,
            "surname": surname,
            "relationship": "EMPLOYEE",
            "details": {
                "personal_mobile_number": mobile_num,
            },
            "address": {
                "country": "PH",
                "province_state": (province or "Metro Manila")[:100],
                "city": (municipality or "Manila")[:100],
                "street_line_1": (street_address or business_name or "Manila")[:100],
                "postal_code": "1000",
            },
            "account_details": {
                "currency": "PHP",
                "account_country": "PH",
                "account_holder_name": holder_name[:255],
                "account_number": clean_acc_number,
                "routing_type_1": routing_type_1,
                "routing_value_1": routing_value_1,
            },
        },
        "payout_details": {
            "source_currency": "PHP",
            "source_amount": amount_centavos,
            "destination_currency": "PHP",
        },
        "source_of_fund": "BUSINESS_REVENUE",
        "purpose_code": "SALARY",
        "description": f"Reimbursement {req_ref_no}"[:100],
        "metadata": {
            "reimbursement_id": str(reimb_id),
            "supplier_profile_id": str(supplier_profile_id),
            "request_reference_no": str(req_ref_no),
            "xendit_environment": xendit_cfg["mode"],
        },
    }

    http_status, resp_data = _call_xendit_v3_create_payout(
        secret_key=xendit_cfg["secret_key"],
        idempotency_key=idempotency_key,
        payload=xendit_payload,
    )

    # Phase 3: Reconcile Xendit response into miller_reimbursement_payout_tracking
    failed_err_code = None
    failed_err_msg = None

    with transaction.atomic():
        with connection.cursor() as cursor:
            if 200 <= http_status < 300 and resp_data.get("payout_id"):
                xendit_payout_id = str(resp_data.get("payout_id")).strip()
                provider_status = str(resp_data.get("status") or "ACCEPTED").upper()
                processor_ref = resp_data.get("processor_reference")
                business_id = resp_data.get("business_id")
                failure_code = resp_data.get("failure_code")

                cursor.execute(
                    """
                    UPDATE miller_reimbursement_payout_tracking
                    SET
                        xendit_payout_id = %s,
                        processor_reference = %s,
                        xendit_business_id = %s,
                        payout_status = %s,
                        failure_reason = %s,
                        updated_at = NOW()
                    WHERE payout_attempt_id = %s
                    """,
                    [
                        xendit_payout_id,
                        processor_ref,
                        business_id,
                        provider_status,
                        failure_code,
                        payout_attempt_id,
                    ],
                )

                # Atomically synchronize miller_reimbursement when Xendit returns verified SUCCEEDED (Test or Live),
                # while preserving miller_reimbursement_payout_tracking (including xendit_environment).
                if provider_status == "SUCCEEDED":
                    _sync_succeeded_payout_to_reimbursement(
                        cursor=cursor,
                        reimbursement_id=reimb_id,
                        supplier_profile_id=supplier_profile_id,
                        paid_by_employee_id=paid_by_employee_id,
                        method=norm_method,
                        processor_reference=processor_ref,
                        xendit_payout_id=xendit_payout_id,
                        receipt_photo=receipt_photo_url,
                        confirmed_paid_at=resp_data.get("updated") or resp_data.get("created"),
                    )
            else:
                failed_err_code = str(resp_data.get("error_code") or f"HTTP_{http_status}").strip()
                failed_err_msg = str(resp_data.get("message") or "Xendit payout creation failed.").strip()
                failure_summary = f"{failed_err_code}: {failed_err_msg}"[:255]

                cursor.execute(
                    """
                    UPDATE miller_reimbursement_payout_tracking
                    SET
                        payout_status = 'FAILED',
                        failure_reason = %s,
                        updated_at = NOW()
                    WHERE payout_attempt_id = %s
                    """,
                    [failure_summary, payout_attempt_id],
                )

    if failed_err_code is not None:
        detail_after_fail = get_reimbursement_detail(supplier_profile_id, reimb_id)
        raise XenditPayoutFailedError(
            f"Xendit Payout API ({failed_err_code}): {failed_err_msg}",
            error_code=failed_err_code,
            attempt_data=detail_after_fail,
        )

    updated_detail = get_reimbursement_detail(supplier_profile_id, reimb_id)
    latest_attempt = updated_detail.get("latest_payout_attempt") or {}

    return {
        "payment_flow": "XENDIT_PAYOUT",
        "is_sandbox": xendit_cfg["mode"] == "test",
        "xendit_environment": xendit_cfg["mode"],
        "payout_status": latest_attempt.get("payout_status"),
        "xendit_payout_id": latest_attempt.get("xendit_payout_id"),
        "processor_reference": latest_attempt.get("processor_reference"),
        "reference_id": latest_attempt.get("reference_id"),
        "reimbursement": updated_detail,
    }


def _parse_confirmed_payout_datetime(provider_timestamp_str=None, fallback_dt=None) -> datetime:
    """
    Convert a verified Xendit ISO-8601 timestamp (e.g. '2026-10-20T10:18:25.146147Z')
    or fallback tracking datetime into Asia/Manila time for miller_reimbursement.paid_date.
    """
    if provider_timestamp_str:
        try:
            clean = str(provider_timestamp_str).strip()
            if clean.endswith("Z"):
                clean = clean[:-1] + "+00:00"
            dt = datetime.fromisoformat(clean)
            if dt.tzinfo is not None:
                return dt.astimezone(ZoneInfo("Asia/Manila"))
            return dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Manila"))
        except Exception:
            pass

    if isinstance(fallback_dt, datetime):
        if fallback_dt.tzinfo is not None:
            return fallback_dt.astimezone(ZoneInfo("Asia/Manila"))
        return fallback_dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(ZoneInfo("Asia/Manila"))

    return datetime.now(ZoneInfo("Asia/Manila"))


def _sync_succeeded_payout_to_reimbursement(
    cursor,
    reimbursement_id: int,
    supplier_profile_id: int,
    paid_by_employee_id: int,
    method: str,
    processor_reference: str,
    xendit_payout_id: str,
    receipt_photo: str = None,
    confirmed_paid_at=None,
    fallback_dt=None,
) -> bool:
    """
    Atomically and idempotently synchronize miller_reimbursement when Xendit confirms
    payout_status == 'SUCCEEDED' (Test or Live).
    Never overwrites existing Cash payments and strictly enforces branch ownership.
    """
    final_payment_ref = (
        str(processor_reference or "").strip()
        or str(xendit_payout_id or "").strip()
    )
    if not final_payment_ref:
        return False

    paid_dt = _parse_confirmed_payout_datetime(
        provider_timestamp_str=confirmed_paid_at,
        fallback_dt=fallback_dt,
    )

    cursor.execute(
        """
        UPDATE miller_reimbursement
        SET
            status = 'paid',
            paid_by = COALESCE(paid_by, %s),
            paid_date = COALESCE(paid_date, %s),
            method = COALESCE(NULLIF(TRIM(method), ''), %s),
            receipt_photo = COALESCE(%s, receipt_photo),
            payment_reference_no = COALESCE(NULLIF(TRIM(payment_reference_no), ''), %s)
        WHERE reimbursement_id = %s
          AND supplier_profile_id = %s
          AND LOWER(TRIM(COALESCE(method, ''))) != 'cash'
          AND (
              LOWER(TRIM(COALESCE(status, ''))) != 'paid'
              OR paid_by IS NULL
              OR paid_date IS NULL
              OR method IS NULL
              OR TRIM(COALESCE(method, '')) = ''
              OR payment_reference_no IS NULL
              OR TRIM(COALESCE(payment_reference_no, '')) = ''
          )
        """,
        [
            paid_by_employee_id,
            paid_dt,
            method,
            receipt_photo,
            final_payment_ref,
            reimbursement_id,
            supplier_profile_id,
        ],
    )
    return cursor.rowcount > 0


def reconcile_xendit_payout_status(
    supplier_profile_id: int,
    reimbursement_id: int,
) -> dict:
    """
    Poll Xendit GET /v3/payouts/{payout_id} to reconcile the latest payout attempt
    status for a reimbursement belonging to supplier_profile_id.
    When Xendit confirms SUCCEEDED (Test or Live), atomically synchronizes miller_reimbursement.
    """
    xendit_cfg = get_xendit_config()
    if not xendit_cfg["has_secret_key"]:
        raise XenditConfigurationError("XENDIT_SECRET_KEY is not configured on the backend server.")

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                pt.payout_attempt_id,
                pt.reimbursement_id,
                pt.supplier_profile_id,
                pt.initiated_by,
                pt.method,
                pt.xendit_environment,
                pt.xendit_payout_id,
                pt.reference_id,
                pt.payout_status,
                pt.receipt_photo,
                pt.processor_reference,
                pt.updated_at
            FROM miller_reimbursement_payout_tracking pt
            WHERE pt.reimbursement_id = %s
              AND pt.supplier_profile_id = %s
            ORDER BY pt.payout_attempt_id DESC
            LIMIT 1
            """,
            [reimbursement_id, supplier_profile_id],
        )
        att_row = cursor.fetchone()

    if not att_row:
        raise ReimbursementNotFoundError("No payout tracking attempt found for this reimbursement.")

    (
        payout_attempt_id,
        reimb_id,
        sp_id,
        initiated_by,
        method,
        xendit_env,
        xendit_payout_id,
        reference_id,
        current_payout_status,
        receipt_photo,
        existing_processor_ref,
        tracking_updated_at,
    ) = att_row

    if not xendit_payout_id:
        if str(current_payout_status).upper() == "CREATED":
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE miller_reimbursement_payout_tracking
                        SET
                            payout_status = 'FAILED',
                            failure_reason = COALESCE(failure_reason, 'INVALID_API_KEY: Previous request was rejected before Xendit assigned a payout_id.'),
                            updated_at = NOW()
                        WHERE payout_attempt_id = %s
                        """,
                        [payout_attempt_id],
                    )
            current_payout_status = "FAILED"
        detail = get_reimbursement_detail(supplier_profile_id, reimb_id)
        return {
            "reconciled": True,
            "payout_status": current_payout_status,
            "is_sandbox": str(xendit_env).lower() == "test",
            "reimbursement": detail,
        }

    http_status, resp_data = _call_xendit_v3_get_payout(
        secret_key=xendit_cfg["secret_key"],
        xendit_payout_id=xendit_payout_id,
    )

    if not (200 <= http_status < 300):
        err_code = resp_data.get("error_code") or f"HTTP_{http_status}"
        err_msg = resp_data.get("message") or "Unable to fetch payout status from Xendit."
        raise XenditPayoutFailedError(f"Xendit Status Check ({err_code}): {err_msg}", error_code=err_code)

    # Verify payout identity from Xendit response before updating
    returned_payout_id = str(resp_data.get("payout_id") or "").strip()
    returned_ref_id = str(resp_data.get("reference_id") or "").strip()
    if returned_payout_id and returned_payout_id != str(xendit_payout_id).strip():
        raise ValueError(
            f"Payout ID mismatch from Xendit API: expected {xendit_payout_id}, got {returned_payout_id}."
        )
    if reference_id and returned_ref_id and returned_ref_id != str(reference_id).strip():
        raise ValueError(
            f"Reference ID mismatch from Xendit API: expected {reference_id}, got {returned_ref_id}."
        )

    provider_status = str(resp_data.get("status") or current_payout_status).upper()
    processor_ref = resp_data.get("processor_reference") or existing_processor_ref
    business_id = resp_data.get("business_id")
    failure_code = resp_data.get("failure_code")
    provider_updated_str = resp_data.get("updated") or resp_data.get("created")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_reimbursement_payout_tracking
                SET
                    payout_status = %s,
                    processor_reference = COALESCE(%s, processor_reference),
                    xendit_business_id = COALESCE(%s, xendit_business_id),
                    failure_reason = COALESCE(%s, failure_reason),
                    updated_at = NOW()
                WHERE payout_attempt_id = %s
                """,
                [
                    provider_status,
                    processor_ref,
                    business_id,
                    failure_code,
                    payout_attempt_id,
                ],
            )

            # Never mark REQUESTED, ACCEPTED, or ROUTING as paid; only verified SUCCEEDED
            if provider_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    supplier_profile_id=sp_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=processor_ref,
                    xendit_payout_id=xendit_payout_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=provider_updated_str,
                    fallback_dt=tracking_updated_at,
                )

    detail = get_reimbursement_detail(supplier_profile_id, reimb_id)
    return {
        "reconciled": True,
        "previous_payout_status": str(current_payout_status or "").upper(),
        "payout_status": provider_status,
        "provider_updated_at": resp_data.get("updated"),
        "is_sandbox": str(xendit_env).lower() == "test",
        "xendit_environment": str(xendit_env).lower(),
        "xendit_payout_id": xendit_payout_id,
        "processor_reference": processor_ref,
        "reimbursement": detail,
    }


def auto_reconcile_pending_payouts_for_branch(supplier_profile_id: int) -> list:
    """
    Automatically reconcile any requested reimbursement for this branch whose latest
    payout tracking attempt is in PENDING_PAYOUT_STATUSES (e.g. ACCEPTED, REQUESTED, ROUTING)
    OR whose latest attempt is already SUCCEEDED while miller_reimbursement is still 'requested',
    by querying Xendit's read-only GET /v3/payouts/{payout_id} endpoint.
    Never initiates a new payout.
    Returns a list of reimbursement detail dicts ONLY for payouts that transitioned from
    pending to SUCCEEDED during this reconciliation pass (so historical completed payouts
    never re-trigger receipt modals).
    """
    newly_succeeded_details = []
    try:
        statuses_to_check = [*list(PENDING_PAYOUT_STATUSES), "SUCCEEDED"]
        status_placeholders = ", ".join(["%s"] * len(statuses_to_check))
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT DISTINCT pt.reimbursement_id, UPPER(TRIM(COALESCE(pt.payout_status, '')))
                FROM miller_reimbursement_payout_tracking pt
                INNER JOIN miller_reimbursement mr
                    ON mr.reimbursement_id = pt.reimbursement_id
                WHERE pt.supplier_profile_id = %s
                  AND mr.supplier_profile_id = %s
                  AND LOWER(TRIM(COALESCE(mr.status, ''))) = 'requested'
                  AND pt.payout_attempt_id = (
                      SELECT MAX(pt2.payout_attempt_id)
                      FROM miller_reimbursement_payout_tracking pt2
                      WHERE pt2.reimbursement_id = pt.reimbursement_id
                        AND pt2.supplier_profile_id = pt.supplier_profile_id
                  )
                  AND UPPER(TRIM(COALESCE(pt.payout_status, ''))) IN ({status_placeholders})
                """,
                [supplier_profile_id, supplier_profile_id, *statuses_to_check],
            )
            reimb_rows = cursor.fetchall()

        for r_id, prev_status in reimb_rows:
            try:
                rec_res = reconcile_xendit_payout_status(
                    supplier_profile_id=supplier_profile_id,
                    reimbursement_id=int(r_id),
                )
                if (
                    rec_res
                    and prev_status in PENDING_PAYOUT_STATUSES
                    and str(rec_res.get("payout_status") or "").upper() == "SUCCEEDED"
                ):
                    reimb_detail = rec_res.get("reimbursement")
                    if reimb_detail:
                        newly_succeeded_details.append(reimb_detail)
            except Exception as inner_exc:
                logger.warning(
                    "Auto-reconcile skipped for reimbursement_id=%s: %s",
                    r_id,
                    inner_exc,
                )
    except Exception as exc:
        logger.warning(
            "Failed to scan pending payouts for auto-reconcile (supplier_profile_id=%s): %s",
            supplier_profile_id,
            exc,
        )
    return newly_succeeded_details


def reconcile_and_sync_unsynced_succeeded_payouts(supplier_profile_id: int = None) -> list:
    """
    Safely reconcile existing reimbursements whose latest payout tracking attempt is
    SUCCEEDED (or pending) while the main miller_reimbursement record is still 'requested'.
    Verifies payout identity and provider status via Xendit GET /v3/payouts/{payout_id}
    before updating miller_reimbursement. Never creates or retries payouts, and never
    overwrites Cash payments.
    """
    results = []
    params = []
    branch_filter = ""
    if supplier_profile_id is not None:
        branch_filter = "AND mr.supplier_profile_id = %s AND pt.supplier_profile_id = %s"
        params.extend([supplier_profile_id, supplier_profile_id])

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                mr.reimbursement_id,
                mr.supplier_profile_id,
                mr.request_reference_no,
                mr.status,
                pt.payout_attempt_id,
                pt.xendit_payout_id,
                pt.payout_status,
                pt.xendit_environment
            FROM miller_reimbursement mr
            INNER JOIN miller_reimbursement_payout_tracking pt
                ON pt.reimbursement_id = mr.reimbursement_id
               AND pt.supplier_profile_id = mr.supplier_profile_id
            WHERE LOWER(TRIM(COALESCE(mr.status, ''))) = 'requested'
              AND LOWER(TRIM(COALESCE(mr.method, ''))) != 'cash'
              AND pt.payout_attempt_id = (
                  SELECT MAX(pt2.payout_attempt_id)
                  FROM miller_reimbursement_payout_tracking pt2
                  WHERE pt2.reimbursement_id = mr.reimbursement_id
                    AND pt2.supplier_profile_id = mr.supplier_profile_id
              )
              AND pt.xendit_payout_id IS NOT NULL
              AND TRIM(pt.xendit_payout_id) != ''
              {branch_filter}
            ORDER BY mr.reimbursement_id ASC
            """,
            params,
        )
        candidates = cursor.fetchall()

    for (
        reimb_id,
        sp_id,
        req_ref_no,
        mr_status,
        attempt_id,
        xendit_payout_id,
        pt_status,
        xendit_env,
    ) in candidates:
        rec = reconcile_xendit_payout_status(
            supplier_profile_id=int(sp_id),
            reimbursement_id=int(reimb_id),
        )
        results.append(
            {
                "reimbursement_id": reimb_id,
                "request_reference_no": req_ref_no,
                "payout_attempt_id": attempt_id,
                "xendit_payout_id": xendit_payout_id,
                "verified_provider_status": rec.get("payout_status"),
                "processor_reference": rec.get("processor_reference"),
                "xendit_environment": rec.get("xendit_environment"),
                "reimbursement_status_after": (rec.get("reimbursement") or {}).get("status"),
                "paid_by_after": (rec.get("reimbursement") or {}).get("paid_by"),
                "paid_date_after": (rec.get("reimbursement") or {}).get("paid_date"),
                "method_after": (rec.get("reimbursement") or {}).get("method"),
                "payment_reference_no_after": (rec.get("reimbursement") or {}).get("payment_reference_no"),
            }
        )

    return results


def process_xendit_payout_webhook(callback_token_header: str, payload: dict) -> dict:
    """
    Handle authenticated Xendit v3 Payout webhook events:
    - v3_payout.succeeded
    - v3_payout.failed
    - v3_payout.reversed
    - v3_payout.rejected
    - v3_payout.pending_compliance

    Enforces:
    1. Constant-time verification of x-callback-token against XENDIT_CALLBACK_TOKEN.
    2. Replay-safe, idempotent updates locked via SELECT ... FOR UPDATE.
    3. Ownership verification between tracking row and miller_reimbursement.
    4. Atomically synchronizes miller_reimbursement when status == 'SUCCEEDED' (Test or Live)
       while preserving xendit_environment in miller_reimbursement_payout_tracking.
    """
    cfg = get_xendit_config()
    expected_token = cfg["callback_token"]
    if not expected_token:
        raise WebhookConfigMissingError(
            "XENDIT_CALLBACK_TOKEN is not configured in backend/.env. Cannot verify webhook."
        )

    provided_token = str(callback_token_header or "").strip()
    if not provided_token or not hmac.compare_digest(provided_token, expected_token):
        raise WebhookAuthenticationError("Invalid or missing x-callback-token header.")

    if not isinstance(payload, dict):
        raise ValueError("Invalid webhook JSON payload.")

    event_name = str(payload.get("event") or "").strip()
    business_id = payload.get("business_id")
    data = payload.get("data") or {}
    if not isinstance(data, dict):
        raise ValueError("Webhook payload missing 'data' object.")

    xendit_payout_id = str(data.get("payout_id") or "").strip()
    reference_id = str(data.get("reference_id") or "").strip()
    incoming_status = str(data.get("status") or "").strip().upper()
    processor_ref = data.get("processor_reference")
    failure_code = data.get("failure_code")
    provider_updated_str = data.get("updated") or data.get("created") or payload.get("created")

    if not xendit_payout_id and not reference_id:
        raise ValueError("Webhook data missing payout_id and reference_id.")

    if not incoming_status:
        event_status_map = {
            "v3_payout.succeeded": "SUCCEEDED",
            "v3_payout.failed": "FAILED",
            "v3_payout.reversed": "REVERSED",
            "v3_payout.rejected": "REJECTED",
            "v3_payout.pending_compliance": "PENDING_COMPLIANCE_ASSESSMENT",
        }
        incoming_status = event_status_map.get(event_name, "UNKNOWN")

    with transaction.atomic():
        with connection.cursor() as cursor:
            if xendit_payout_id:
                cursor.execute(
                    """
                    SELECT
                        pt.payout_attempt_id,
                        pt.reimbursement_id,
                        pt.supplier_profile_id,
                        pt.initiated_by,
                        pt.method,
                        pt.amount_centavos,
                        pt.xendit_environment,
                        pt.payout_status,
                        pt.receipt_photo,
                        pt.processor_reference,
                        pt.xendit_payout_id,
                        pt.updated_at,
                        mr.supplier_profile_id AS mr_supplier_profile_id,
                        mr.status AS mr_status
                    FROM miller_reimbursement_payout_tracking pt
                    INNER JOIN miller_reimbursement mr
                        ON mr.reimbursement_id = pt.reimbursement_id
                    WHERE pt.xendit_payout_id = %s
                    LIMIT 1
                    FOR UPDATE
                    """,
                    [xendit_payout_id],
                )
            else:
                cursor.execute(
                    """
                    SELECT
                        pt.payout_attempt_id,
                        pt.reimbursement_id,
                        pt.supplier_profile_id,
                        pt.initiated_by,
                        pt.method,
                        pt.amount_centavos,
                        pt.xendit_environment,
                        pt.payout_status,
                        pt.receipt_photo,
                        pt.processor_reference,
                        pt.xendit_payout_id,
                        pt.updated_at,
                        mr.supplier_profile_id AS mr_supplier_profile_id,
                        mr.status AS mr_status
                    FROM miller_reimbursement_payout_tracking pt
                    INNER JOIN miller_reimbursement mr
                        ON mr.reimbursement_id = pt.reimbursement_id
                    WHERE pt.reference_id = %s
                    LIMIT 1
                    FOR UPDATE
                    """,
                    [reference_id],
                )

            row = cursor.fetchone()
            if not row:
                raise ReimbursementNotFoundError(
                    f"No matching payout tracking record found for payout_id={xendit_payout_id} reference_id={reference_id}."
                )

            (
                payout_attempt_id,
                reimb_id,
                sp_id,
                initiated_by,
                method,
                amount_centavos,
                xendit_env,
                existing_status,
                receipt_photo,
                existing_proc_ref,
                existing_xendit_id,
                tracking_updated_at,
                mr_sp_id,
                mr_status,
            ) = row

            # Ownership check
            if int(sp_id) != int(mr_sp_id):
                raise ValueError("Branch ownership mismatch on reimbursement payout tracking record.")

            effective_proc_ref = processor_ref or existing_proc_ref
            effective_xendit_id = xendit_payout_id or existing_xendit_id

            # Replay safety: if already SUCCEEDED and incoming is SUCCEEDED, ensure main record is synced idempotently
            if str(existing_status).upper() == "SUCCEEDED" and incoming_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    supplier_profile_id=sp_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=effective_proc_ref,
                    xendit_payout_id=effective_xendit_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=provider_updated_str,
                    fallback_dt=tracking_updated_at,
                )
                return {
                    "replayed": True,
                    "payout_attempt_id": payout_attempt_id,
                    "reimbursement_id": reimb_id,
                    "payout_status": "SUCCEEDED",
                    "xendit_environment": xendit_env,
                }

            cursor.execute(
                """
                UPDATE miller_reimbursement_payout_tracking
                SET
                    xendit_payout_id = COALESCE(%s, xendit_payout_id),
                    processor_reference = COALESCE(%s, processor_reference),
                    xendit_business_id = COALESCE(%s, xendit_business_id),
                    payout_status = %s,
                    failure_reason = COALESCE(%s, failure_reason),
                    updated_at = NOW()
                WHERE payout_attempt_id = %s
                """,
                [
                    xendit_payout_id or None,
                    processor_ref,
                    business_id,
                    incoming_status,
                    failure_code,
                    payout_attempt_id,
                ],
            )

            if incoming_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    supplier_profile_id=sp_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=effective_proc_ref,
                    xendit_payout_id=effective_xendit_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=provider_updated_str,
                    fallback_dt=tracking_updated_at,
                )

    return {
        "replayed": False,
        "payout_attempt_id": payout_attempt_id,
        "reimbursement_id": reimb_id,
        "payout_status": incoming_status,
        "xendit_environment": xendit_env,
        "is_sandbox": str(xendit_env).lower() == "test",
    }


def submit_reimbursement_request(
    supplier_profile_id: int,
    requested_by_employee_id: int,
    title: str,
    description: str,
    category: str,
    price,
    photo_evidence: str = "",
    expense_date=None,
) -> dict:
    """
    Submit a new reimbursement request into miller_reimbursement in 'requested' status.
    Atomically creates a notification for Miller Finance so they are notified of the new request.
    Enforces branch isolation and prevents duplicate notifications.
    """
    import datetime
    from decimal import Decimal
    from api.miller_employees_function.miller_finance.notifications.services import (
        create_finance_notification,
    )

    price_dec = Decimal(str(price or "0.00")).quantize(Decimal("0.01"))
    if price_dec <= Decimal("0.00"):
        raise ValueError("Reimbursement price must be greater than zero.")

    # Validate expense_date
    today = timezone.now().date()
    parsed_expense_date = None
    if expense_date:
        if isinstance(expense_date, str):
            try:
                parsed_expense_date = datetime.date.fromisoformat(str(expense_date).strip())
            except ValueError:
                raise ValueError("Invalid expense date format. Must be YYYY-MM-DD.")
        elif isinstance(expense_date, (datetime.date, datetime.datetime)):
            parsed_expense_date = (
                expense_date.date()
                if isinstance(expense_date, datetime.datetime)
                else expense_date
            )
        else:
            raise ValueError("Invalid expense date provided.")

        if parsed_expense_date > today:
            raise ValueError("Expense date cannot be in the future.")
    else:
        parsed_expense_date = today

    clean_title = (title or "").strip() or "Reimbursement Request"
    clean_desc = (description or "").strip() or "N/A"
    clean_type = (category or "").strip() or "Others"

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Fetch requester name
            cursor.execute(
                """
                SELECT first_name, last_name
                FROM supplier_employees
                WHERE supplier_employee_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [requested_by_employee_id, supplier_profile_id],
            )
            req_row = cursor.fetchone()
            if req_row:
                requester_name = f"{req_row[0] or ''} {req_row[1] or ''}".strip() or "Employee"
            else:
                requester_name = "Employee"

            # Determine next reference number
            cursor.execute(
                """
                SELECT COALESCE(MAX(reimbursement_id), 0) + 1
                FROM miller_reimbursement
                """
            )
            next_id = int(cursor.fetchone()[0] or 1)
            ref_no = f"REIMB-{supplier_profile_id}-{next_id:04d}"

            now = timezone.now()
            cursor.execute(
                """
                INSERT INTO miller_reimbursement (
                    supplier_profile_id,
                    requested_by,
                    title,
                    description,
                    types,
                    price,
                    requested_date,
                    photo_evidence,
                    status,
                    request_reference_no,
                    expense_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'requested', %s, %s)
                """,
                [
                    supplier_profile_id,
                    requested_by_employee_id,
                    clean_title,
                    clean_desc,
                    clean_type,
                    price_dec,
                    now,
                    photo_evidence or "",
                    ref_no,
                    parsed_expense_date,
                ],
            )
            new_reimbursement_id = cursor.lastrowid

    # Create notification for Miller Finance
    try:
        create_finance_notification(
            supplier_profile_id=supplier_profile_id,
            title="New Reimbursement Request",
            content=f"New {clean_type} reimbursement request ({ref_no}) submitted by {requester_name} for ₱ {float(price_dec):,.2f}.",
            action_url="/miller-finance/reimburse",
            deduplication_key=ref_no,
        )
    except Exception as exc:
        logger.warning("Failed to notify finance of new reimbursement: %s", exc)

    return {
        "reimbursement_id": new_reimbursement_id,
        "request_reference_no": ref_no,
        "status": "requested",
        "title": clean_title,
        "price": float(price_dec),
        "requested_by": requester_name,
        "expense_date": str(parsed_expense_date),
    }


