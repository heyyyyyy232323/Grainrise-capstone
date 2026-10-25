import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from .selectors import get_miller_account_summary


# ============================================================
# CONSTANTS
# ============================================================

MILLER_ROLE = "miller_manager"

MAX_ARCHIVE_REASON_LENGTH = 1000


# ============================================================
# BASIC HELPERS
# ============================================================

def _table_exists(table_name):
    """
    Return True when a MySQL table exists.
    """

    normalized_name = str(
        table_name or ""
    ).strip()

    if not normalized_name:
        return False

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
              AND table_name = %s
            LIMIT 1
            """,
            [
                normalized_name,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )


def _require_table(
    table_name,
    friendly_name,
):
    """
    Fail with a clear error when a required support
    table has not yet been created.
    """

    if not _table_exists(
        table_name
    ):
        raise ValueError(
            f"{friendly_name} is not available in the current database."
        )


def _clean_archive_reason(
    reason,
):
    """
    Normalize and validate archive reasons.
    """

    cleaned = str(
        reason or ""
    ).strip()

    if not cleaned:
        raise ValueError(
            "Archive reason is required."
        )

    if len(cleaned) > MAX_ARCHIVE_REASON_LENGTH:
        raise ValueError(
            "Archive reason must not exceed 1000 characters."
        )

    return cleaned


def _build_miller_display_name(
    miller,
):
    """
    Build the Miller Manager's display name.
    """

    first_name = str(
        miller.get(
            "first_name"
        )
        or ""
    ).strip()

    last_name = str(
        miller.get(
            "last_name"
        )
        or ""
    ).strip()

    full_name = " ".join(
        part
        for part in (
            first_name,
            last_name,
        )
        if part
    )

    return (
        full_name
        or "Miller Partner"
    )


def _build_employee_display_name(
    employee,
):
    """
    Build an employee display name.
    """

    parts = [
        employee.get(
            "first_name"
        ),
        employee.get(
            "middle_initial"
        ),
        employee.get(
            "last_name"
        ),
        employee.get(
            "suffix"
        ),
    ]

    cleaned_parts = [
        str(part).strip()
        for part in parts
        if str(
            part or ""
        ).strip()
    ]

    return (
        " ".join(
            cleaned_parts
        )
        or "Miller Employee"
    )


# ============================================================
# MILLER EMPLOYEE LOOKUP
# ============================================================

def _get_miller_employee(
    user_id,
    employee_id,
):
    """
    Return one Supplier/Miller employee only when
    the employee belongs to the selected Miller.

    This prevents an Account Admin request for one
    Miller from modifying another Miller's employee.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT

                se.supplier_employee_id
                    AS employee_id,

                se.supplier_profile_id,

                se.first_name,

                se.middle_initial,

                se.last_name,

                se.suffix,

                se.email,

                se.contact_number,

                se.position,

                se.status,

                se.created_at,

                se.updated_at,

                p.user_id,

                p.business_name


            FROM supplier_employees se


            INNER JOIN supplier_profiles p
                ON p.supplier_profile_id =
                    se.supplier_profile_id


            INNER JOIN users u
                ON u.user_id =
                    p.user_id


            WHERE

                se.supplier_employee_id = %s

                AND u.user_id = %s

                AND u.user_role = %s


            LIMIT 1
            """,
            [
                employee_id,
                user_id,
                MILLER_ROLE,
            ],
        )

        row = cursor.fetchone()

        if not row:
            return None

        columns = [
            column[0]
            for column
            in cursor.description
        ]

    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# CONFIRMATION EMAIL
# ============================================================

def _send_miller_confirmation_email(
    miller,
):
    """
    Send confirmation email after successful approval.
    """

    recipient = str(
        miller.get(
            "email"
        )
        or ""
    ).strip().lower()

    if not recipient:
        raise ValueError(
            "The Miller account does not have a valid email address."
        )


    display_name = (
        _build_miller_display_name(
            miller
        )
    )

    business_name = str(
        miller.get(
            "business_name"
        )
        or ""
    ).strip()


    safe_display_name = escape(
        display_name
    )

    safe_business_name = escape(
        business_name
    )


    subject = (
        "GrainRise Miller Application Confirmed"
    )


    business_line = (
        f" for {business_name}"
        if business_name
        else ""
    )


    text_message = (
        f"Hello {display_name},\n\n"
        f"Your GrainRise Miller application"
        f"{business_line} has been confirmed.\n\n"
        "Your GrainRise account is now active. "
        "You may now sign in and use the available "
        "Miller functions.\n\n"
        "Thank you for joining GrainRise.\n\n"
        "GrainRise Account Administration"
    )


    html_business_line = (
        f" for <strong>{safe_business_name}</strong>"
        if safe_business_name
        else ""
    )


    html_message = f"""
    <div
        style="
            font-family: Arial, sans-serif;
            max-width: 620px;
            margin: 0 auto;
            color: #1f2937;
            padding: 24px;
        "
    >
        <div style="margin-bottom: 24px;">
            <h2
                style="
                    color: #08511f;
                    margin: 0 0 8px 0;
                "
            >
                GrainRise
            </h2>

            <p
                style="
                    margin: 0;
                    color: #6b7280;
                "
            >
                Miller Account Verification
            </p>
        </div>

        <h3 style="margin-bottom: 16px;">
            Application Confirmed
        </h3>

        <p>
            Hello
            <strong>{safe_display_name}</strong>,
        </p>

        <p>
            Your GrainRise Miller application
            {html_business_line}
            has been confirmed by the
            Account Administrator.
        </p>

        <div
            style="
                margin: 24px 0;
                padding: 18px;
                background: #f0f8f2;
                border: 1px solid #cce5d1;
                border-radius: 12px;
            "
        >
            <p
                style="
                    margin: 0;
                    color: #08511f;
                    font-weight: 700;
                "
            >
                Your GrainRise account is now active.
            </p>
        </div>

        <p>
            You may now sign in and use the
            available GrainRise Miller functions.
        </p>

        <p style="margin-top: 28px;">
            Thank you for joining GrainRise.
        </p>

        <p
            style="
                margin-top: 28px;
                color: #6b7280;
                font-size: 13px;
            "
        >
            GrainRise Account Administration
        </p>
    </div>
    """


    message = EmailMultiAlternatives(
        subject,
        text_message,
        settings.DEFAULT_FROM_EMAIL,
        [
            recipient,
        ],
    )


    message.attach_alternative(
        html_message,
        "text/html",
    )


    try:
        sent_count = message.send(
            fail_silently=False
        )

    except smtplib.SMTPAuthenticationError as exc:
        raise RuntimeError(
            "Gmail rejected the configured EMAIL_USER / "
            "EMAIL_APP_PASSWORD. Use a valid Google App "
            "Password for the configured sender account."
        ) from exc


    if sent_count < 1:
        raise RuntimeError(
            "The confirmation email could not be sent."
        )


    return True


# ============================================================
# CONFIRM MILLER APPLICATION
# ============================================================

def confirm_miller_application(
    user_id,
):
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None
    if inquiry:
        from ..partner_account_service import create_partner_user_from_inquiry
        return create_partner_user_from_inquiry(inquiry_id=user_id, expected_role="miller")
    """
    Confirm a pending Miller application.

    Allowed:
        inactive -> active

    Database approval is committed before sending
    the confirmation email.

    If email sending fails, the account remains active.
    """

    miller = (
        get_miller_account_summary(
            user_id
        )
    )


    if not miller:
        raise ValueError(
            "Miller account was not found."
        )


    current_status = str(
        miller.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "This Miller account is already active."
        )


    if current_status != "inactive":
        raise ValueError(
            "Only Miller applications currently under review "
            "can be confirmed."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status =
                        'active',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role = %s

                    AND status = 'inactive'
                """,
                [
                    user_id,
                    MILLER_ROLE,
                ],
            )


            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller application could not be confirmed "
                    "because its account status changed before the "
                    "update completed."
                )

            cursor.execute(
                """
                SELECT
                    user_id,
                    status,
                    updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )

            updated = cursor.fetchone()


    email_sent = False
    email_error = None


    try:

        email_sent = (
            _send_miller_confirmation_email(
                miller
            )
        )

    except Exception as exc:

        email_error = str(
            exc
        )


    return {
        "user_id":
            int(
                updated[0]
            ),

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "email_sent":
            email_sent,

        "email_error":
            email_error,

        "message": (
            "Miller application confirmed successfully."
            if email_sent
            else (
                "Miller application confirmed, but the "
                "confirmation email could not be sent."
            )
        ),
    }


# ============================================================
# ARCHIVE MILLER ACCOUNT
# ============================================================

def archive_miller_account(
    user_id,
    reason,
):
    """
    Archive an active Miller account.

    Allowed:
        active -> archived

    A required archive reason is stored in
    miller_archive_reasons.
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )

    # 1. Check actual users record FIRST.
    miller = None
    numeric_user_id = None
    try:
        numeric_user_id = int(user_id)
        miller = get_miller_account_summary(numeric_user_id)
    except (ValueError, TypeError):
        miller = None

    # 2. If confirmed user exists:
    if miller:
        _require_table(
            "miller_archive_reasons",
            "Miller archive history",
        )

        current_status = str(
            miller.get(
                "status"
            )
            or ""
        ).strip().lower()

        if current_status == "archived":
            raise ValueError(
                "This Miller account is already archived."
            )

        if current_status != "active":
            raise ValueError(
                "Only active Miller accounts can be archived."
            )

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE users

                    SET
                        status =
                            'archived',

                        updated_at =
                            CURRENT_TIMESTAMP

                    WHERE

                        user_id = %s

                        AND user_role = %s

                        AND status = 'active'
                    """,
                    [
                        numeric_user_id,
                        MILLER_ROLE,
                    ],
                )

                if cursor.rowcount == 0:
                    raise RuntimeError(
                        "The Miller account could not be archived "
                        "because its status changed before the update "
                        "completed."
                    )

                cursor.execute(
                    """
                    SELECT
                        user_id,
                        status,
                        updated_at
                    FROM users
                    WHERE user_id = %s
                    """,
                    [numeric_user_id],
                )

                updated = cursor.fetchone()

                cursor.execute(
                    """
                    INSERT INTO miller_archive_reasons
                    (
                        user_id,
                        reason
                    )

                    VALUES
                    (
                        %s,
                        %s
                    )
                    """,
                    [
                        numeric_user_id,
                        cleaned_reason,
                    ],
                )

                archive_id = cursor.lastrowid

                cursor.execute(
                    """
                    SELECT
                        miller_archive_reason_id,
                        reason,
                        created_at
                    FROM miller_archive_reasons
                    WHERE miller_archive_reason_id = %s
                    """,
                    [archive_id],
                )

                archive_row = (
                    cursor.fetchone()
                )

                if not archive_row:
                    raise RuntimeError(
                        "The Miller archive reason could not be saved."
                    )

        return {
            "user_id":
                int(
                    updated[0]
                ),

            "status":
                updated[1],

            "updated_at":
                updated[2],

            "archive_reason_id":
                int(
                    archive_row[0]
                ),

            "archive_reason":
                archive_row[1],

            "archived_at":
                archive_row[2],

            "message":
                "Miller account archived successfully.",
        }

    # 3. Only if no user exists, archive pending inquiry:
    #    - filter correct partner_role
    #    - status='to_review'
    #    - set inquiry.status = inactive
    # IMPORTANT: partnership_inquiries has NO archive_reason field.
    # Do not use inquiry.archive_reason.
    # Do not delete inquiries or documents.
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(
            partnership_inquiry_id=user_id,
            partner_role="miller",
            status=PartnershipInquiry.Status.TO_REVIEW,
        ).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        inquiry.status = PartnershipInquiry.Status.INACTIVE
        inquiry.save(update_fields=["status", "updated_at"])
        return {
            "user_id": str(inquiry.partnership_inquiry_id),
            "status": "inactive",
            "updated_at": inquiry.updated_at,
            "archive_reason_id": None,
            "archive_reason": None,
            "archived_at": inquiry.updated_at,
            "message": "Miller application archived successfully.",
        }

    raise ValueError(
        "Miller account was not found."
    )


# ============================================================
# RESTORE MILLER ACCOUNT
# ============================================================

def restore_miller_account(
    user_id,
):
    """
    Restore a Miller account from Management Inactive.

    Allowed:
        archived -> active
        deactivated -> active

    Important:
        inactive is registration To Review status and
        must not be restored through this action.
    """

    miller = (
        get_miller_account_summary(
            user_id
        )
    )


    if not miller:
        raise ValueError(
            "Miller account was not found."
        )


    current_status = str(
        miller.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "This Miller account is already active."
        )


    if current_status == "inactive":
        raise ValueError(
            "This Miller application is still under review "
            "and cannot be restored."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:
        raise ValueError(
            "Only archived or deactivated Miller accounts "
            "can be restored."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET
                    status =
                        'active',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    user_id = %s

                    AND user_role = %s

                    AND status IN (
                        'archived',
                        'deactivated'
                    )
                """,
                [
                    user_id,
                    MILLER_ROLE,
                ],
            )


            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller account could not be restored "
                    "because its status changed before the update "
                    "completed."
                )

            cursor.execute(
                """
                SELECT
                    user_id,
                    status,
                    updated_at
                FROM users
                WHERE user_id = %s
                """,
                [user_id],
            )

            updated = cursor.fetchone()


    return {
        "user_id":
            int(
                updated[0]
            ),

        "business_name":
            str(
                miller.get(
                    "business_name"
                )
                or ""
            ).strip(),

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "message":
            "Miller account restored successfully.",
    }


# ============================================================
# DELETE MILLER ACCOUNT PERMANENTLY
# ============================================================

def delete_miller_account(
    user_id,
):
    from django.core.exceptions import ValidationError
    from ...models import PartnershipInquiry
    try:
        inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    except (ValueError, TypeError, ValidationError):
        inquiry = None

    if inquiry:
        b_name = inquiry.organization_company or inquiry.name or "Miller Partner"
        m_name = inquiry.name or "Miller Applicant"
        inquiry.delete()
        return {
            "user_id": str(user_id),
            "miller_name": m_name,
            "business_name": b_name,
            "message": "Miller inquiry deleted permanently.",
        }
    """
    Permanently delete a Miller account.

    Allowed:
        archived
        deactivated

    Dependent records (employees, documents, profiles, archive reasons,
    ratings, reports, reactions, comments) are explicitly deleted within
    a transaction to avoid foreign key constraint failures.
    """

    miller = (
        get_miller_account_summary(
            user_id
        )
    )


    if not miller:
        raise ValueError(
            "Miller account was not found."
        )


    current_status = str(
        miller.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "Archive the Miller account before permanently deleting it."
        )


    if current_status == "inactive":
        raise ValueError(
            "Miller applications under review cannot be permanently deleted "
            "through the Management Inactive action."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:
        raise ValueError(
            "Only archived or deactivated Miller accounts "
            "can be permanently deleted."
        )


    miller_name = (
        _build_miller_display_name(
            miller
        )
    )


    business_name = str(
        miller.get(
            "business_name"
        )
        or ""
    ).strip()


    with transaction.atomic():

        with connection.cursor() as cursor:

            # 1. Supplier employee archive reasons
            if (
                _table_exists("supplier_employee_archive_reasons")
                and _table_exists("supplier_employees")
                and _table_exists("supplier_profiles")
            ):
                cursor.execute(
                    """
                    DELETE FROM supplier_employee_archive_reasons
                    WHERE supplier_employee_id IN (
                        SELECT se.supplier_employee_id
                        FROM supplier_employees se
                        JOIN supplier_profiles sp ON se.supplier_profile_id = sp.supplier_profile_id
                        WHERE sp.user_id = %s
                    )
                    """,
                    [user_id],
                )

            # 2. Supplier employees
            if (
                _table_exists("supplier_employees")
                and _table_exists("supplier_profiles")
            ):
                cursor.execute(
                    """
                    DELETE FROM supplier_employees
                    WHERE supplier_profile_id IN (
                        SELECT supplier_profile_id
                        FROM supplier_profiles
                        WHERE user_id = %s
                    )
                    """,
                    [user_id],
                )

            # 3. Supplier documents
            if _table_exists("supplier_documents"):
                cursor.execute(
                    """
                    DELETE FROM supplier_documents
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 4. Supplier profiles
            if _table_exists("supplier_profiles"):
                cursor.execute(
                    """
                    DELETE FROM supplier_profiles
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 5. Miller archive reasons
            if _table_exists("miller_archive_reasons"):
                cursor.execute(
                    """
                    DELETE FROM miller_archive_reasons
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 6. Miller ratings
            if _table_exists("miller_ratings"):
                cursor.execute(
                    """
                    DELETE FROM miller_ratings
                    WHERE miller_user_id = %s
                       OR reviewer_user_id = %s
                    """,
                    [user_id, user_id],
                )

            # 7. Miller reports
            if _table_exists("miller_reports"):
                cursor.execute(
                    """
                    DELETE FROM miller_reports
                    WHERE miller_user_id = %s
                       OR reported_by_user_id = %s
                    """,
                    [user_id, user_id],
                )

            # 8. News comments
            if _table_exists("news_comments"):
                cursor.execute(
                    """
                    UPDATE news_comments
                    SET parent_comment_id = NULL
                    WHERE parent_comment_id IN (
                        SELECT c.comment_id FROM (
                            SELECT comment_id FROM news_comments WHERE user_id = %s
                        ) c
                    )
                    """,
                    [user_id],
                )
                cursor.execute(
                    """
                    DELETE FROM news_comments
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 9. News reactions
            if _table_exists("news_reactions"):
                cursor.execute(
                    """
                    DELETE FROM news_reactions
                    WHERE user_id = %s
                    """,
                    [user_id],
                )

            # 10. Admin notifications
            if _table_exists("admin_notifications"):
                cursor.execute(
                    """
                    UPDATE admin_notifications
                    SET related_user_id = NULL
                    WHERE related_user_id = %s
                    """,
                    [user_id],
                )

            # 11. System activity logs
            if _table_exists("system_activity_logs"):
                cursor.execute(
                    """
                    UPDATE system_activity_logs
                    SET related_user_id = NULL
                    WHERE related_user_id = %s
                    """,
                    [user_id],
                )

            # 12. Email sent history
            if _table_exists("email_sent_history"):
                cursor.execute(
                    """
                    UPDATE email_sent_history
                    SET recipient_user_id = NULL
                    WHERE recipient_user_id = %s
                    """,
                    [user_id],
                )

            # 13. Users
            cursor.execute(
                """
                DELETE FROM users

                WHERE

                    user_id = %s

                    AND user_role = %s

                    AND status IN (
                        'archived',
                        'deactivated'
                    )
                """,
                [
                    user_id,
                    MILLER_ROLE,
                ],
            )


            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller account could not be permanently deleted "
                    "because its status changed before the deletion completed."
                )

            deleted = (user_id,)


    return {
        "user_id":
            int(
                deleted[0]
            ),

        "miller_name":
            miller_name,

        "business_name":
            business_name,

        "message":
            "Miller account permanently deleted successfully.",
    }


# ============================================================
# ARCHIVE MILLER EMPLOYEE
# ============================================================

def archive_miller_employee(
    user_id,
    employee_id,
    reason,
):
    """
    Archive one active employee belonging to a Miller.

    Allowed:
        active -> archived
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )


    _require_table(
        "supplier_employee_archive_reasons",
        "Miller employee archive history",
    )


    employee = (
        _get_miller_employee(
            user_id=user_id,
            employee_id=employee_id,
        )
    )


    if not employee:
        raise ValueError(
            "Miller employee account was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "archived":
        raise ValueError(
            "This employee account is already archived."
        )


    if current_status != "active":
        raise ValueError(
            "Only active Miller employee accounts can be archived."
        )


    employee_name = (
        _build_employee_display_name(
            employee
        )
    )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE supplier_employees

                SET
                    status = 'archived',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    supplier_employee_id = %s

                    AND supplier_profile_id = %s

                    AND status = 'active'
                """,
                [
                    employee_id,
                    employee[
                        "supplier_profile_id"
                    ],
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller employee could not be archived "
                    "because the account status changed before "
                    "the update completed."
                )

            cursor.execute(
                """
                SELECT
                    supplier_employee_id,
                    status,
                    updated_at
                FROM supplier_employees
                WHERE supplier_employee_id = %s
                """,
                [employee_id],
            )

            updated = cursor.fetchone()


            cursor.execute(
                """
                INSERT INTO supplier_employee_archive_reasons
                (
                    supplier_employee_id,
                    reason
                )

                VALUES
                (
                    %s,
                    %s
                )
                """,
                [
                    employee_id,
                    cleaned_reason,
                ],
            )

            archive_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT
                    supplier_employee_archive_reason_id,
                    reason,
                    created_at
                FROM supplier_employee_archive_reasons
                WHERE supplier_employee_archive_reason_id = %s
                """,
                [archive_id],
            )

            archive_row = (
                cursor.fetchone()
            )


            if not archive_row:
                raise RuntimeError(
                    "The Miller employee archive reason could not be saved."
                )


    return {
        "employee_id":
            int(
                updated[0]
            ),

        "employee_name":
            employee_name,

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "archive_reason_id":
            int(
                archive_row[0]
            ),

        "archive_reason":
            archive_row[1],

        "archived_at":
            archive_row[2],

        "message":
            "Miller employee archived successfully.",
    }


# ============================================================
# RESTORE / RETRIEVE MILLER EMPLOYEE
# ============================================================

def restore_miller_employee(
    user_id,
    employee_id,
):
    """
    Retrieve an employee account.

    Allowed:
        archived -> active
        inactive -> active
        deactivated -> active
    """

    employee = (
        _get_miller_employee(
            user_id=user_id,
            employee_id=employee_id,
        )
    )


    if not employee:
        raise ValueError(
            "Miller employee account was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "This employee account is already active."
        )


    if current_status not in {
        "inactive",
        "deactivated",
        "archived",
    }:
        raise ValueError(
            "This Miller employee account cannot be retrieved."
        )


    employee_name = (
        _build_employee_display_name(
            employee
        )
    )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE supplier_employees

                SET
                    status = 'active',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE

                    supplier_employee_id = %s

                    AND supplier_profile_id = %s

                    AND status IN (
                        'inactive',
                        'deactivated',
                        'archived'
                    )
                """,
                [
                    employee_id,
                    employee[
                        "supplier_profile_id"
                    ],
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller employee account could not be retrieved "
                    "because its status changed before the update completed."
                )

            cursor.execute(
                """
                SELECT
                    supplier_employee_id,
                    status,
                    updated_at
                FROM supplier_employees
                WHERE supplier_employee_id = %s
                """,
                [employee_id],
            )

            updated = cursor.fetchone()


    return {
        "employee_id":
            int(
                updated[0]
            ),

        "employee_name":
            employee_name,

        "status":
            updated[1],

        "updated_at":
            updated[2],

        "message":
            "Miller employee account retrieved successfully.",
    }


# ============================================================
# DELETE MILLER EMPLOYEE PERMANENTLY
# ============================================================

def delete_miller_employee(
    user_id,
    employee_id,
):
    """
    Permanently delete one Miller employee.

    Allowed:
        inactive
        deactivated
        archived

    Active employees must be archived first.
    """

    employee = (
        _get_miller_employee(
            user_id=user_id,
            employee_id=employee_id,
        )
    )


    if not employee:
        raise ValueError(
            "Miller employee account was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":
        raise ValueError(
            "Archive the Miller employee account before permanently deleting it."
        )


    if current_status not in {
        "inactive",
        "deactivated",
        "archived",
    }:
        raise ValueError(
            "This Miller employee account cannot be permanently deleted."
        )


    employee_name = (
        _build_employee_display_name(
            employee
        )
    )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM supplier_employees

                WHERE

                    supplier_employee_id = %s

                    AND supplier_profile_id = %s

                    AND status IN (
                        'inactive',
                        'deactivated',
                        'archived'
                    )
                """,
                [
                    employee_id,
                    employee[
                        "supplier_profile_id"
                    ],
                ],
            )

            if cursor.rowcount == 0:
                raise RuntimeError(
                    "The Miller employee account could not be permanently "
                    "deleted because its status changed before the deletion "
                    "completed."
                )

            deleted = (employee_id,)


    return {
        "employee_id":
            int(
                deleted[0]
            ),

        "employee_name":
            employee_name,

        "message":
            "Miller employee account permanently deleted successfully.",
    }

# ============================================================
# RESOLVE MILLER REPORT
# ============================================================

@transaction.atomic
def resolve_miller_report(
    report_id,
    *,
    status="resolved",
):
    from api.comment_reporting import resolve_report_by_type_and_id
    return resolve_report_by_type_and_id(
        "miller",
        report_id,
        status=status,
    )

