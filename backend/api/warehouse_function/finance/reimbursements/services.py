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
    get_warehouse_reimbursement_detail,
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


def _save_receipt_file(receipt_file, warehouse_profile_id: int) -> str:
    """
    Save optional receipt image to MEDIA_ROOT/finance_receipts/{warehouse_profile_id}/.
    """
    if not receipt_file:
        return None

    ext = os.path.splitext(receipt_file.name.lower())[1]
    if not ext or ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        ext = ".jpg"

    unique_token = secrets.token_hex(8)
    today_str = datetime.now(ZoneInfo("Asia/Manila")).strftime("%Y%m%d")
    filename = f"warehouse_reimb_receipt_{today_str}_{unique_token}{ext}"

    rel_dir = os.path.join("finance_receipts", str(warehouse_profile_id))
    abs_dir = os.path.join(settings.MEDIA_ROOT, rel_dir)
    os.makedirs(abs_dir, exist_ok=True)

    abs_path = os.path.join(abs_dir, filename)
    with open(abs_path, "wb") as f:
        for chunk in receipt_file.chunks():
            f.write(chunk)

    return f"/media/finance_receipts/{warehouse_profile_id}/{filename}"


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
    Example: RIC-JI-PF-10272026-1630
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

    # Ensure uniqueness in warehouse_reimbursement.payment_reference_no
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM warehouse_reimbursement
        WHERE payment_reference_no = %s
        """,
        [candidate_ref],
    )
    (count,) = cursor.fetchone()
    if count == 0:
        return candidate_ref

    # Collision detected: advance minute offset
    for minute_offset in range(1, 120):
        shifted_time = now_ph + timedelta(minutes=minute_offset)
        shifted_ref = f"{expected_prefix_hyphen}{shifted_time.strftime('%m%d%Y-%H%M')}"
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM warehouse_reimbursement
            WHERE payment_reference_no = %s
            """,
            [shifted_ref],
        )
        (c,) = cursor.fetchone()
        if c == 0:
            return shifted_ref

    return f"{candidate_ref}-{secrets.token_hex(2).upper()}"


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


def process_warehouse_reimbursement_payment(
    warehouse_profile_ids: list,
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

    # Pre-check if there is an existing pending payout attempt and reconcile its status
    try:
        p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT payout_status, xendit_payout_id
                FROM warehouse_reimbursement_payout_tracking
                WHERE reimbursement_id = %s
                  AND warehouse_profile_id IN ({p_wh})
                ORDER BY payout_attempt_id DESC
                LIMIT 1
                """,
                [reimbursement_id, *warehouse_profile_ids],
            )
            latest_tr = cursor.fetchone()
        if latest_tr and str(latest_tr[0] or "").upper() in PENDING_PAYOUT_STATUSES:
            reconcile_warehouse_xendit_payout_status(warehouse_profile_ids, reimbursement_id)
    except Exception as exc:
        logger.warning("Pre-payment reconciliation check warning for reimbursement_id=%s: %s", reimbursement_id, exc)

    if norm_method == "Cash":
        return _process_cash_reimbursement(
            warehouse_profile_ids=warehouse_profile_ids,
            paid_by_employee_id=paid_by_employee_id,
            reimbursement_id=reimbursement_id,
            client_reference=payment_reference,
            receipt_file=receipt_file,
        )

    return _initiate_xendit_payout_reimbursement(
        warehouse_profile_ids=warehouse_profile_ids,
        paid_by_employee_id=paid_by_employee_id,
        reimbursement_id=reimbursement_id,
        norm_method=norm_method,
        employee_credentials_id=employee_credentials_id,
        receipt_file=receipt_file,
    )


def _process_cash_reimbursement(
    warehouse_profile_ids: list,
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
    - Updates warehouse_reimbursement to status='paid'.
    """
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    wr.reimbursement_id,
                    wr.warehouse_profile_id,
                    wr.requested_by,
                    wr.status,
                    wr.request_reference_no,
                    wr.price,
                    COALESCE(wp.business_name, wp.organization_name, 'Warehouse') AS business_name,
                    CONCAT_WS(' ', COALESCE(req_emp.first_name, ''), COALESCE(req_emp.last_name, '')) AS requester_name,
                    CONCAT_WS(' ', COALESCE(pay_emp.first_name, ''), COALESCE(pay_emp.last_name, '')) AS payer_name
                FROM warehouse_reimbursement wr
                INNER JOIN warehouse_profiles wp
                    ON wp.warehouse_profile_id = wr.warehouse_profile_id
                INNER JOIN warehouse_employees req_emp
                    ON req_emp.warehouse_employee_id = wr.requested_by
                LEFT JOIN warehouse_employees pay_emp
                    ON pay_emp.warehouse_employee_id = %s
                WHERE wr.reimbursement_id = %s
                  AND wr.warehouse_profile_id IN ({p_wh})
                FOR UPDATE
                """,
                [paid_by_employee_id, reimbursement_id, *warehouse_profile_ids],
            )
            row = cursor.fetchone()

            if not row:
                raise ReimbursementNotFoundError("Reimbursement record not found.")

            (
                reimb_id,
                reimb_wh_id,
                requested_by_id,
                current_status,
                req_ref_no,
                price_val,
                business_name,
                requester_name,
                payer_name,
            ) = row

            if str(current_status or "").lower() == "paid":
                raise AlreadyPaidError(f"Reimbursement {req_ref_no} has already been paid.")

            # Check existing payout tracking rows
            cursor.execute(
                """
                SELECT payout_attempt_id, payout_status, xendit_payout_id
                FROM warehouse_reimbursement_payout_tracking
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
                receipt_photo_url = _save_receipt_file(receipt_file, reimb_wh_id)

            now_ph = datetime.now(ZoneInfo("Asia/Manila"))

            cursor.execute(
                """
                UPDATE warehouse_reimbursement
                SET
                    status = 'paid',
                    paid_by = %s,
                    paid_date = %s,
                    method = 'Cash',
                    receipt_photo = %s,
                    payment_reference_no = %s
                WHERE reimbursement_id = %s
                  AND warehouse_profile_id = %s
                """,
                [
                    paid_by_employee_id,
                    now_ph,
                    receipt_photo_url,
                    final_ref,
                    reimb_id,
                    reimb_wh_id,
                ],
            )

    detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimbursement_id)
    return {
        "payment_flow": "CASH",
        "is_sandbox": False,
        "status": "paid",
        "payment_reference_no": final_ref,
        "reimbursement": detail,
    }


def _initiate_xendit_payout_reimbursement(
    warehouse_profile_ids: list,
    paid_by_employee_id: int,
    reimbursement_id: int,
    norm_method: str,
    employee_credentials_id: int,
    receipt_file=None,
) -> dict:
    """
    Initiate an official Xendit /v3/payouts disbursement for GCash or Bank:
    - Validates employee_credentials_id belongs strictly to wr.requested_by and is active.
    - Tracks attempt in warehouse_reimbursement_payout_tracking with PHP centavo amount and idempotency.
    - Prevents duplicate payouts while pending or after success; allows safe retry after failure.
    - Marks warehouse_reimbursement.status = 'paid' only for verified live/test SUCCEEDED payouts.
    """
    if not employee_credentials_id:
        raise InvalidPaymentAccountError(
            f"Please select an active registered {norm_method} account for the requesting employee."
        )

    xendit_cfg = get_xendit_config()
    if not xendit_cfg["has_secret_key"]:
        raise XenditConfigurationError("XENDIT_SECRET_KEY is not configured on the backend server.")

    expected_cred_type = "gcash" if norm_method == "GCash" else "bank"
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    # Phase 1: Atomic DB lock, validation, and tracking row creation
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    wr.reimbursement_id,
                    wr.warehouse_profile_id,
                    wr.requested_by,
                    wr.status,
                    wr.request_reference_no,
                    wr.price,
                    wr.title,
                    wr.types,
                    COALESCE(wp.business_name, wp.organization_name, 'Warehouse') AS business_name,
                    wp.municipality,
                    wp.province,
                    wp.street_address,
                    we.first_name,
                    we.last_name
                FROM warehouse_reimbursement wr
                INNER JOIN warehouse_profiles wp
                    ON wp.warehouse_profile_id = wr.warehouse_profile_id
                INNER JOIN warehouse_employees we
                    ON we.warehouse_employee_id = wr.requested_by
                WHERE wr.reimbursement_id = %s
                  AND wr.warehouse_profile_id IN ({p_wh})
                FOR UPDATE
                """,
                [reimbursement_id, *warehouse_profile_ids],
            )
            reimb_row = cursor.fetchone()

            if not reimb_row:
                raise ReimbursementNotFoundError("Reimbursement record not found.")

            (
                reimb_id,
                reimb_wh_id,
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

            if str(current_status or "").lower() == "paid":
                raise AlreadyPaidError(f"Reimbursement {req_ref_no} has already been paid.")

            # Lock existing payout attempts
            cursor.execute(
                """
                SELECT
                    payout_attempt_id,
                    payout_status,
                    xendit_payout_id,
                    reference_id,
                    xendit_environment
                FROM warehouse_reimbursement_payout_tracking
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
                        UPDATE warehouse_reimbursement_payout_tracking
                        SET
                            payout_status = 'FAILED',
                            failure_reason = COALESCE(failure_reason, 'Unaccepted request: Xendit never assigned a payout_id.'),
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

            # Verify employee payment account ownership and active status
            cursor.execute(
                """
                SELECT
                    ec.credentials_id,
                    ec.warehouse_profile_id,
                    ec.warehouse_employee_id,
                    ec.type,
                    ec.platform_name,
                    ec.bank_name,
                    ec.account_number,
                    ec.account_name,
                    ec.status
                FROM warehouse_employee_online_transaction_credentials ec
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
                cred_wh_id,
                cred_emp_id,
                cred_type,
                cred_platform,
                cred_bank,
                cred_acc_num,
                cred_acc_name,
                cred_status,
            ) = cred_row

            if int(cred_wh_id) != int(reimb_wh_id):
                raise InvalidPaymentAccountError("Selected account does not belong to your warehouse branch.")

            if int(cred_emp_id) != int(requested_by_id):
                raise InvalidPaymentAccountError("Selected payment account does not belong to the requesting employee.")

            if str(cred_status or "").lower() != "active":
                raise InvalidPaymentAccountError("Selected payment account is not active.")

            if str(cred_type or "").lower() != expected_cred_type:
                raise InvalidPaymentAccountError(
                    f"Selected account type ({cred_type}) does not match payment method {norm_method}."
                )

            # Build payout reference
            now_ph = datetime.now(ZoneInfo("Asia/Manila"))
            timestamp_ms = int(now_ph.timestamp() * 1000)
            reference_id = f"WHR-{reimb_id}-{timestamp_ms}"
            idempotency_key = f"whr-payout-{reimb_id}-{timestamp_ms}"

            price_dec = Decimal(str(price_val or 0))
            amount_centavos = int(round(price_dec * 100))
            if amount_centavos <= 0:
                raise ValueError("Reimbursement price must be greater than zero.")

            receipt_photo_url = None
            if receipt_file:
                receipt_photo_url = _save_receipt_file(receipt_file, reimb_wh_id)

            cursor.execute(
                """
                INSERT INTO warehouse_reimbursement_payout_tracking (
                    reimbursement_id,
                    warehouse_profile_id,
                    employee_credentials_id,
                    initiated_by,
                    method,
                    amount_centavos,
                    xendit_environment,
                    reference_id,
                    idempotency_key,
                    payout_status,
                    receipt_photo,
                    created_at,
                    updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'CREATED', %s, NOW(), NOW())
                """,
                [
                    reimb_id,
                    reimb_wh_id,
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

    # Phase 2: Call Xendit v3 Payouts API
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
            "warehouse_profile_id": str(reimb_wh_id),
            "request_reference_no": str(req_ref_no),
            "xendit_environment": xendit_cfg["mode"],
        },
    }

    http_status, resp_data = _call_xendit_v3_create_payout(
        secret_key=xendit_cfg["secret_key"],
        idempotency_key=idempotency_key,
        payload=xendit_payload,
    )

    is_success_http = 200 <= http_status < 300
    payout_id = resp_data.get("payout_id") or resp_data.get("id")
    payout_status = str(resp_data.get("status") or ("ACCEPTED" if is_success_http else "FAILED")).upper()
    processor_ref = resp_data.get("processor_reference") or None
    xendit_biz_id = resp_data.get("business_id") or None
    failure_reason = None
    if not is_success_http:
        failure_reason = resp_data.get("message") or resp_data.get("error_code") or f"HTTP_{http_status}"

    # Phase 3: Update tracking row with Xendit response
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE warehouse_reimbursement_payout_tracking
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
                    payout_id,
                    processor_ref,
                    xendit_biz_id,
                    payout_status,
                    failure_reason,
                    payout_attempt_id,
                ],
            )

            # If immediately SUCCEEDED, mark warehouse_reimbursement as paid
            if payout_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    warehouse_profile_id=reimb_wh_id,
                    paid_by_employee_id=paid_by_employee_id,
                    method=norm_method,
                    processor_reference=processor_ref,
                    xendit_payout_id=payout_id,
                    receipt_photo=receipt_photo_url,
                    confirmed_paid_at=resp_data.get("updated") or resp_data.get("created"),
                    fallback_dt=None,
                )

    if not is_success_http:
        err_msg = failure_reason or "Xendit payout request failed."
        raise XenditPayoutFailedError(
            f"Xendit Payout Failed ({http_status}): {err_msg}",
            error_code=resp_data.get("error_code") or f"HTTP_{http_status}",
            attempt_data={
                "payout_attempt_id": payout_attempt_id,
                "reference_id": reference_id,
                "payout_status": payout_status,
                "failure_reason": failure_reason,
            },
        )

    detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimb_id)
    return {
        "payment_flow": "XENDIT_V3_PAYOUT",
        "is_sandbox": xendit_cfg["mode"] == "test",
        "payout_status": payout_status,
        "xendit_payout_id": payout_id,
        "reference_id": reference_id,
        "processor_reference": processor_ref,
        "reimbursement": detail,
    }


def _sync_succeeded_payout_to_reimbursement(
    cursor,
    reimbursement_id: int,
    warehouse_profile_id: int,
    paid_by_employee_id: int,
    method: str,
    processor_reference: str,
    xendit_payout_id: str,
    receipt_photo: str,
    confirmed_paid_at=None,
    fallback_dt=None,
) -> bool:
    """
    Atomic helper: Marks warehouse_reimbursement as 'paid' ONLY when Xendit confirms SUCCEEDED.
    """
    final_payment_ref = (
        processor_reference
        or xendit_payout_id
        or f"XND-{reimbursement_id}"
    )

    paid_dt = None
    if confirmed_paid_at:
        try:
            if isinstance(confirmed_paid_at, datetime):
                paid_dt = confirmed_paid_at
            else:
                paid_dt = datetime.fromisoformat(str(confirmed_paid_at).replace("Z", "+00:00"))
        except Exception:
            paid_dt = None

    if not paid_dt:
        paid_dt = fallback_dt or datetime.now(ZoneInfo("Asia/Manila"))

    cursor.execute(
        """
        UPDATE warehouse_reimbursement
        SET
            status = 'paid',
            paid_by = COALESCE(paid_by, %s),
            paid_date = COALESCE(paid_date, %s),
            method = COALESCE(NULLIF(TRIM(method), ''), %s),
            receipt_photo = COALESCE(%s, receipt_photo),
            payment_reference_no = COALESCE(NULLIF(TRIM(payment_reference_no), ''), %s)
        WHERE reimbursement_id = %s
          AND warehouse_profile_id = %s
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
            warehouse_profile_id,
        ],
    )
    return cursor.rowcount > 0


def reconcile_warehouse_xendit_payout_status(
    warehouse_profile_ids: list,
    reimbursement_id: int,
    simulate_sandbox_success: bool = False,
) -> dict:
    """
    Poll Xendit GET /v3/payouts/{payout_id} to reconcile the latest payout attempt
    status for a reimbursement belonging to warehouse_profile_ids.
    When Xendit confirms SUCCEEDED (Test or Live), atomically synchronizes warehouse_reimbursement.
    Supports simulate_sandbox_success for QA testing in test mode.
    """
    xendit_cfg = get_xendit_config()
    p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))

    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                pt.payout_attempt_id,
                pt.reimbursement_id,
                pt.warehouse_profile_id,
                pt.initiated_by,
                pt.method,
                pt.xendit_environment,
                pt.xendit_payout_id,
                pt.reference_id,
                pt.payout_status,
                pt.receipt_photo,
                pt.processor_reference,
                pt.updated_at
            FROM warehouse_reimbursement_payout_tracking pt
            WHERE pt.reimbursement_id = %s
              AND pt.warehouse_profile_id IN ({p_wh})
            ORDER BY pt.payout_attempt_id DESC
            LIMIT 1
            """,
            [reimbursement_id, *warehouse_profile_ids],
        )
        att_row = cursor.fetchone()

    if not att_row:
        raise ReimbursementNotFoundError("No payout tracking attempt found for this reimbursement.")

    (
        payout_attempt_id,
        reimb_id,
        wh_id,
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

    # Sandbox manual success simulation if requested in test mode
    is_test_mode = str(xendit_env).lower() == "test" or xendit_cfg["mode"] == "test"
    if simulate_sandbox_success and is_test_mode:
        sim_proc_ref = existing_processor_ref or f"SIM-TEST-{reimb_id}-{secrets.token_hex(4).upper()}"
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE warehouse_reimbursement_payout_tracking
                    SET
                        payout_status = 'SUCCEEDED',
                        processor_reference = %s,
                        updated_at = NOW()
                    WHERE payout_attempt_id = %s
                    """,
                    [sim_proc_ref, payout_attempt_id],
                )
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    warehouse_profile_id=wh_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=sim_proc_ref,
                    xendit_payout_id=xendit_payout_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=datetime.now(ZoneInfo("Asia/Manila")),
                    fallback_dt=tracking_updated_at,
                )
        detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimb_id)
        return {
            "reconciled": True,
            "previous_payout_status": str(current_payout_status or "").upper(),
            "payout_status": "SUCCEEDED",
            "is_sandbox": True,
            "simulated": True,
            "xendit_payout_id": xendit_payout_id,
            "processor_reference": sim_proc_ref,
            "reimbursement": detail,
        }

    if not xendit_payout_id:
        detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimb_id)
        return {
            "reconciled": True,
            "payout_status": current_payout_status,
            "is_sandbox": str(xendit_env).lower() == "test",
            "reimbursement": detail,
        }

    if not xendit_cfg["has_secret_key"]:
        raise XenditConfigurationError("XENDIT_SECRET_KEY is not configured on the backend server.")

    http_status, resp_data = _call_xendit_v3_get_payout(
        secret_key=xendit_cfg["secret_key"],
        xendit_payout_id=xendit_payout_id,
    )

    if not (200 <= http_status < 300):
        err_code = resp_data.get("error_code") or f"HTTP_{http_status}"
        err_msg = resp_data.get("message") or "Unable to fetch payout status from Xendit."
        raise XenditPayoutFailedError(f"Xendit Status Check ({err_code}): {err_msg}", error_code=err_code)

    provider_status = str(resp_data.get("status") or current_payout_status).upper()
    processor_ref = resp_data.get("processor_reference") or existing_processor_ref
    business_id = resp_data.get("business_id")
    failure_code = resp_data.get("failure_code")
    provider_updated_str = resp_data.get("updated") or resp_data.get("created")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE warehouse_reimbursement_payout_tracking
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

            if provider_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    warehouse_profile_id=wh_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=processor_ref,
                    xendit_payout_id=xendit_payout_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=provider_updated_str,
                    fallback_dt=tracking_updated_at,
                )

    detail = get_warehouse_reimbursement_detail(warehouse_profile_ids, reimb_id)
    return {
        "reconciled": True,
        "previous_payout_status": str(current_payout_status or "").upper(),
        "payout_status": provider_status,
        "is_sandbox": str(xendit_env).lower() == "test",
        "xendit_payout_id": xendit_payout_id,
        "processor_reference": processor_ref,
        "reimbursement": detail,
    }


def auto_reconcile_pending_payouts_for_branch(warehouse_profile_ids: list) -> list:
    """
    Automatically reconcile any requested reimbursement for this branch whose latest
    payout tracking attempt is in PENDING_PAYOUT_STATUSES (e.g. ACCEPTED, REQUESTED, ROUTING)
    OR whose latest attempt is already SUCCEEDED while warehouse_reimbursement is still 'requested'.
    Returns newly succeeded reimbursement detail dicts.
    """
    if not warehouse_profile_ids:
        return []

    newly_succeeded_details = []
    try:
        p_wh = ", ".join(["%s"] * len(warehouse_profile_ids))
        statuses_to_check = [*list(PENDING_PAYOUT_STATUSES), "SUCCEEDED"]
        status_placeholders = ", ".join(["%s"] * len(statuses_to_check))
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT DISTINCT pt.reimbursement_id, UPPER(TRIM(COALESCE(pt.payout_status, '')))
                FROM warehouse_reimbursement_payout_tracking pt
                INNER JOIN warehouse_reimbursement wr
                    ON wr.reimbursement_id = pt.reimbursement_id
                WHERE pt.warehouse_profile_id IN ({p_wh})
                  AND wr.warehouse_profile_id IN ({p_wh})
                  AND LOWER(TRIM(COALESCE(wr.status, ''))) = 'requested'
                  AND pt.payout_attempt_id = (
                      SELECT MAX(pt2.payout_attempt_id)
                      FROM warehouse_reimbursement_payout_tracking pt2
                      WHERE pt2.reimbursement_id = pt.reimbursement_id
                        AND pt2.warehouse_profile_id = pt.warehouse_profile_id
                  )
                  AND UPPER(TRIM(COALESCE(pt.payout_status, ''))) IN ({status_placeholders})
                """,
                [*warehouse_profile_ids, *warehouse_profile_ids, *statuses_to_check],
            )
            reimb_rows = cursor.fetchall()

        for r_id, prev_status in reimb_rows:
            try:
                res = reconcile_warehouse_xendit_payout_status(warehouse_profile_ids, r_id)
                new_status = str(res.get("payout_status") or "").upper()
                if new_status == "SUCCEEDED" and prev_status != "SUCCEEDED":
                    reimb_data = res.get("reimbursement")
                    if reimb_data:
                        newly_succeeded_details.append(reimb_data)
            except Exception as e:
                logger.warning("Auto-reconcile individual attempt error for reimb_id=%s: %s", r_id, e)
    except Exception as exc:
        logger.warning("Auto-reconcile pending payouts batch warning: %s", exc)

    return newly_succeeded_details


def process_xendit_payout_webhook(payload: dict, callback_token: str) -> dict:
    """
    Process Xendit v3 Payout Webhook notification for warehouse reimbursements.
    """
    xendit_cfg = get_xendit_config()
    expected_token = xendit_cfg.get("callback_token")
    if not expected_token:
        raise WebhookConfigMissingError("XENDIT_CALLBACK_TOKEN is not configured on the server.")

    if not callback_token or callback_token != expected_token:
        raise WebhookAuthenticationError("Invalid webhook callback verification token.")

    data = payload.get("data") if isinstance(payload, dict) and "data" in payload else payload
    payout_id = data.get("payout_id") or data.get("id")
    reference_id = data.get("reference_id")
    payout_status = str(data.get("status") or "").upper()
    processor_ref = data.get("processor_reference")
    failure_code = data.get("failure_code")

    if not payout_id and not reference_id:
        raise ValueError("Webhook payload missing payout_id and reference_id.")

    with connection.cursor() as cursor:
        if payout_id:
            cursor.execute(
                """
                SELECT payout_attempt_id, reimbursement_id, warehouse_profile_id, initiated_by, method, receipt_photo, updated_at
                FROM warehouse_reimbursement_payout_tracking
                WHERE xendit_payout_id = %s
                LIMIT 1
                """,
                [payout_id],
            )
        else:
            cursor.execute(
                """
                SELECT payout_attempt_id, reimbursement_id, warehouse_profile_id, initiated_by, method, receipt_photo, updated_at
                FROM warehouse_reimbursement_payout_tracking
                WHERE reference_id = %s
                LIMIT 1
                """,
                [reference_id],
            )
        row = cursor.fetchone()

    if not row:
        return {"processed": False, "message": "Payout tracking record not found."}

    att_id, reimb_id, wh_id, initiated_by, method, receipt_photo, tracking_dt = row

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE warehouse_reimbursement_payout_tracking
                SET
                    payout_status = %s,
                    processor_reference = COALESCE(%s, processor_reference),
                    failure_reason = COALESCE(%s, failure_reason),
                    updated_at = NOW()
                WHERE payout_attempt_id = %s
                """,
                [payout_status, processor_ref, failure_code, att_id],
            )

            if payout_status == "SUCCEEDED":
                _sync_succeeded_payout_to_reimbursement(
                    cursor=cursor,
                    reimbursement_id=reimb_id,
                    warehouse_profile_id=wh_id,
                    paid_by_employee_id=initiated_by,
                    method=method,
                    processor_reference=processor_ref,
                    xendit_payout_id=payout_id,
                    receipt_photo=receipt_photo,
                    confirmed_paid_at=data.get("updated") or data.get("created"),
                    fallback_dt=tracking_dt,
                )

    return {
        "processed": True,
        "reimbursement_id": reimb_id,
        "payout_status": payout_status,
        "processor_reference": processor_ref,
    }
