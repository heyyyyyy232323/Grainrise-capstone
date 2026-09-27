import smtplib

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import connection, transaction
from django.utils.html import escape

from .selectors import get_warehouse_account_summary


# ============================================================
# GENERAL HELPERS
# ============================================================

def _build_warehouse_display_name(
    warehouse,
):
    first_name = str(
        warehouse.get(
            "first_name"
        )
        or ""
    ).strip()

    last_name = str(
        warehouse.get(
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
        or "Warehouse Partner"
    )


def _clean_archive_reason(
    reason,
):
    cleaned = str(
        reason
        or ""
    ).strip()


    if not cleaned:

        raise ValueError(
            "Archive reason is required."
        )


    if len(cleaned) > 1000:

        raise ValueError(
            "Archive reason must not exceed 1000 characters."
        )


    return cleaned


# ============================================================
# EMPLOYEE HELPERS
# ============================================================

def _get_warehouse_employee(
    user_id,
    employee_id,
):
    """
    Return one employee only when that employee
    belongs to the selected Warehouse Manager.
    """

    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                we.warehouse_employee_id,

                we.warehouse_profile_id,

                we.first_name,

                we.middle_initial,

                we.last_name,

                we.suffix,

                we.email,

                we.position,

                we.status


            FROM warehouse_employees we


            INNER JOIN warehouse_profiles wp

                ON wp.warehouse_profile_id =
                    we.warehouse_profile_id


            INNER JOIN users u

                ON u.user_id =
                    wp.user_id


            WHERE

                we.warehouse_employee_id = %s

                AND u.user_id = %s

                AND u.user_role =
                    'warehouse_manager'::user_role_enum


            LIMIT 1
            """,
            [
                employee_id,
                user_id,
            ],
        )


        row = cursor.fetchone()


    if not row:

        return None


    return {
        "employee_id":
            row[0],

        "warehouse_profile_id":
            row[1],

        "first_name":
            row[2],

        "middle_initial":
            row[3],

        "last_name":
            row[4],

        "suffix":
            row[5],

        "email":
            row[6],

        "position":
            row[7],

        "status":
            row[8],
    }


def _build_employee_display_name(
    employee,
):
    full_name = " ".join(

        str(
            employee.get(key)
            or ""
        ).strip()

        for key in (
            "first_name",
            "middle_initial",
            "last_name",
            "suffix",
        )

        if str(
            employee.get(key)
            or ""
        ).strip()
    )


    return (
        full_name
        or "Warehouse Employee"
    )


# ============================================================
# WAREHOUSE CONFIRMATION EMAIL
# ============================================================

def _send_warehouse_confirmation_email(
    warehouse,
):
    recipient = str(
        warehouse.get(
            "email"
        )
        or ""
    ).strip().lower()


    if not recipient:

        raise ValueError(
            "The Warehouse Manager account does not have a valid email address."
        )


    display_name = (
        _build_warehouse_display_name(
            warehouse
        )
    )


    business_name = str(
        warehouse.get(
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
        "GrainRise Warehouse Application Confirmed"
    )


    business_text = (
        f" for {business_name}"
        if business_name
        else ""
    )


    business_html = (
        f" for <strong>{safe_business_name}</strong>"
        if safe_business_name
        else ""
    )


    text_message = (
        f"Hello {display_name},\n\n"
        f"Your GrainRise Warehouse Manager application"
        f"{business_text} has been confirmed.\n\n"
        "Your account is now active, and you may now "
        "sign in and use the available GrainRise "
        "Warehouse functions.\n\n"
        "Thank you for joining GrainRise.\n\n"
        "GrainRise Account Administration"
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

        <div
            style="
                margin-bottom: 24px;
            "
        >

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
                Warehouse Account Verification
            </p>

        </div>


        <h3
            style="
                margin-bottom: 16px;
            "
        >
            Application Confirmed
        </h3>


        <p>
            Hello
            <strong>
                {safe_display_name}
            </strong>,
        </p>


        <p>
            Your GrainRise Warehouse Manager application
            {business_html}
            has been confirmed by the Account Administrator.
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
            You may now sign in and use the available
            GrainRise Warehouse functions.
        </p>


        <p
            style="
                margin-top: 28px;
            "
        >
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

        sent_count = (
            message.send(
                fail_silently=False
            )
        )


    except smtplib.SMTPAuthenticationError as exc:

        raise RuntimeError(
            "Gmail rejected the configured "
            "EMAIL_USER / EMAIL_APP_PASSWORD."
        ) from exc


    if sent_count < 1:

        raise RuntimeError(
            "The confirmation email could not be sent."
        )


    return True


# ============================================================
# CONFIRM WAREHOUSE APPLICATION
# ============================================================

def confirm_warehouse_application(
    user_id,
):
    from ...models import PartnershipInquiry
    inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    if inquiry:
        from ..partner_account_service import create_partner_user_from_inquiry
        return create_partner_user_from_inquiry(inquiry_id=user_id, expected_role="warehouse")
    """
    Confirm Warehouse Manager application.

    Flow:
        inactive -> active
    """

    warehouse = (
        get_warehouse_account_summary(
            user_id
        )
    )


    if not warehouse:

        raise ValueError(
            "Warehouse Manager account was not found."
        )


    current_status = str(
        warehouse.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "This Warehouse Manager account is already active."
        )


    if current_status != "inactive":

        raise ValueError(
            "Only Warehouse Manager applications currently "
            "under review can be confirmed."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET

                    status =
                        'active'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP


                WHERE

                    user_id = %s

                    AND user_role =
                        'warehouse_manager'::user_role_enum

                    AND status =
                        'inactive'::user_status_enum


                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                ],
            )


            updated = (
                cursor.fetchone()
            )


        if not updated:

            raise RuntimeError(
                "The Warehouse Manager application could not be confirmed "
                "because its account status changed before "
                "the update completed."
            )


    email_sent = False
    email_error = None


    try:

        email_sent = (
            _send_warehouse_confirmation_email(
                warehouse
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

        "message":
            (
                "Warehouse Manager application confirmed successfully."
                if email_sent
                else
                "Warehouse Manager application confirmed, but the "
                "confirmation email could not be sent."
            ),
    }


# ============================================================
# ARCHIVE WAREHOUSE ACCOUNT
# ============================================================

def archive_warehouse_account(
    user_id,
    reason,
):
    from ...models import PartnershipInquiry
    inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    if inquiry:
        cleaned_reason = _clean_archive_reason(reason)
        inquiry.status = PartnershipInquiry.Status.INACTIVE
        inquiry.archive_reason = cleaned_reason
        inquiry.save(update_fields=["status", "archive_reason", "updated_at"])
        return {
            "user_id": str(inquiry.partnership_inquiry_id),
            "status": "inactive",
            "updated_at": inquiry.updated_at,
            "archive_reason_id": None,
            "archive_reason": cleaned_reason,
            "archived_at": inquiry.updated_at,
            "message": "Warehouse application archived successfully.",
        }
    """
    Archive active Warehouse Manager account.

    Flow:
        active -> archived

    Reason:
        warehouse_archive_reasons
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )


    warehouse = (
        get_warehouse_account_summary(
            user_id
        )
    )


    if not warehouse:

        raise ValueError(
            "Warehouse Manager account was not found."
        )


    current_status = str(
        warehouse.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "archived":

        raise ValueError(
            "This Warehouse Manager account is already archived."
        )


    if current_status != "active":

        raise ValueError(
            "Only active Warehouse Manager accounts can be archived."
        )


    with transaction.atomic():

        # ====================================================
        # UPDATE ACCOUNT STATUS
        # ====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET

                    status =
                        'archived'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP


                WHERE

                    user_id = %s

                    AND user_role =
                        'warehouse_manager'::user_role_enum

                    AND status =
                        'active'::user_status_enum


                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                ],
            )


            updated = (
                cursor.fetchone()
            )


        if not updated:

            raise RuntimeError(
                "The Warehouse Manager account could not be archived "
                "because its status changed before the "
                "archive action completed."
            )


        # ====================================================
        # SAVE ARCHIVE REASON
        # ====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO warehouse_archive_reasons
                (
                    user_id,
                    reason
                )

                VALUES
                (
                    %s,
                    %s
                )

                RETURNING

                    warehouse_archive_reason_id,

                    created_at
                """,
                [
                    user_id,
                    cleaned_reason,
                ],
            )


            archive_record = (
                cursor.fetchone()
            )


        if not archive_record:

            raise RuntimeError(
                "The Warehouse archive reason could not be saved."
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
                archive_record[0]
            ),

        "archive_reason":
            cleaned_reason,

        "archived_at":
            archive_record[1],

        "message":
            "Warehouse Manager account archived successfully.",
    }


# ============================================================
# RESTORE WAREHOUSE ACCOUNT
# ============================================================

def restore_warehouse_account(
    user_id,
):
    """
    Restore account from Warehouse Management
    Inactive tab.

    Allowed:
        archived -> active
        deactivated -> active

    Status inactive is reserved for To Review.
    """

    warehouse = (
        get_warehouse_account_summary(
            user_id
        )
    )


    if not warehouse:

        raise ValueError(
            "Warehouse Manager account was not found."
        )


    current_status = str(
        warehouse.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "This Warehouse Manager account is already active."
        )


    if current_status == "inactive":

        raise ValueError(
            "This Warehouse Manager application is still under review "
            "and cannot be restored from the Inactive tab."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:

        raise ValueError(
            "This Warehouse Manager account cannot be restored "
            "from its current status."
        )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE users

                SET

                    status =
                        'active'::user_status_enum,

                    updated_at =
                        CURRENT_TIMESTAMP


                WHERE

                    user_id = %s

                    AND user_role =
                        'warehouse_manager'::user_role_enum

                    AND status IN (
                        'archived'::user_status_enum,
                        'deactivated'::user_status_enum
                    )


                RETURNING

                    user_id,

                    status::text,

                    updated_at
                """,
                [
                    user_id,
                ],
            )


            updated = (
                cursor.fetchone()
            )


        if not updated:

            raise RuntimeError(
                "The Warehouse Manager account could not be restored "
                "because its status changed before the "
                "restore action completed."
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

        "business_name":
            warehouse.get(
                "business_name"
            ),

        "message":
            "Warehouse Manager account restored successfully.",
    }


# ============================================================
# DELETE WAREHOUSE ACCOUNT PERMANENTLY
# ============================================================

def delete_warehouse_account(
    user_id,
):
    from ...models import PartnershipInquiry
    inquiry = PartnershipInquiry.objects.filter(partnership_inquiry_id=user_id).first()
    if inquiry:
        b_name = inquiry.organization_company
        inquiry.delete()
        return {
            "user_id": str(user_id),
            "business_name": b_name,
            "message": "Warehouse inquiry deleted permanently.",
        }
    """
    Permanently delete Warehouse Manager account.

    Allowed only when:
        archived
        deactivated

    Active and To Review accounts cannot
    be permanently deleted here.
    """

    warehouse = (
        get_warehouse_account_summary(
            user_id
        )
    )


    if not warehouse:

        raise ValueError(
            "Warehouse Manager account was not found."
        )


    current_status = str(
        warehouse.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "Active Warehouse Manager accounts must be archived "
            "before they can be permanently deleted."
        )


    if current_status == "inactive":

        raise ValueError(
            "Warehouse Manager applications currently under review "
            "cannot be permanently deleted from this tab."
        )


    if current_status not in {
        "archived",
        "deactivated",
    }:

        raise ValueError(
            "This Warehouse Manager account cannot be permanently "
            "deleted from its current status."
        )


    business_name = (
        warehouse.get(
            "business_name"
        )
    )


    display_name = (
        _build_warehouse_display_name(
            warehouse
        )
    )


    with transaction.atomic():

        with connection.cursor() as cursor:

            cursor.execute(
                """
                DELETE FROM users

                WHERE

                    user_id = %s

                    AND user_role =
                        'warehouse_manager'::user_role_enum

                    AND status IN (
                        'archived'::user_status_enum,
                        'deactivated'::user_status_enum
                    )


                RETURNING
                    user_id
                """,
                [
                    user_id,
                ],
            )


            deleted = (
                cursor.fetchone()
            )


        if not deleted:

            raise RuntimeError(
                "The Warehouse Manager account could not be permanently deleted."
            )


    return {

        "user_id":
            int(
                deleted[0]
            ),

        "manager_name":
            display_name,

        "business_name":
            business_name,

        "message":
            "Warehouse Manager account deleted permanently.",
    }


# ============================================================
# ARCHIVE WAREHOUSE EMPLOYEE
# ============================================================

def archive_warehouse_employee(
    user_id,
    employee_id,
    reason,
):
    """
    Archive one active Warehouse employee.

    Flow:
        active -> archived

    Reason:
        warehouse_employee_archive_reasons
    """

    cleaned_reason = (
        _clean_archive_reason(
            reason
        )
    )


    employee = (
        _get_warehouse_employee(
            user_id,
            employee_id,
        )
    )


    if not employee:

        raise ValueError(
            "Warehouse employee was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "archived":

        raise ValueError(
            "This Warehouse employee is already archived."
        )


    if current_status != "active":

        raise ValueError(
            "Only active Warehouse employees can be archived."
        )


    employee_name = (
        _build_employee_display_name(
            employee
        )
    )


    with transaction.atomic():

        # ====================================================
        # UPDATE EMPLOYEE STATUS
        # ====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                UPDATE warehouse_employees

                SET

                    status =
                        'archived',

                    updated_at =
                        CURRENT_TIMESTAMP


                WHERE

                    warehouse_employee_id = %s

                    AND status =
                        'active'


                RETURNING

                    warehouse_employee_id,

                    status,

                    updated_at
                """,
                [
                    employee_id,
                ],
            )


            updated = (
                cursor.fetchone()
            )


        if not updated:

            raise RuntimeError(
                "The Warehouse employee could not be archived "
                "because the employee status changed before "
                "the archive action completed."
            )


        # ====================================================
        # SAVE ARCHIVE REASON
        # ====================================================

        with connection.cursor() as cursor:

            cursor.execute(
                """
                INSERT INTO
                    warehouse_employee_archive_reasons
                (
                    warehouse_employee_id,
                    reason
                )

                VALUES
                (
                    %s,
                    %s
                )

                RETURNING

                    warehouse_employee_archive_reason_id,

                    created_at
                """,
                [
                    employee_id,
                    cleaned_reason,
                ],
            )


            archive_record = (
                cursor.fetchone()
            )


        if not archive_record:

            raise RuntimeError(
                "The Warehouse employee archive reason "
                "could not be saved."
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
                archive_record[0]
            ),

        "archive_reason":
            cleaned_reason,

        "archived_at":
            archive_record[1],

        "message":
            "Warehouse employee archived successfully.",
    }


# ============================================================
# RESTORE / RETRIEVE WAREHOUSE EMPLOYEE
# ============================================================

def restore_warehouse_employee(
    user_id,
    employee_id,
):
    """
    Retrieve Warehouse employee account.

    Allowed:
        archived -> active
        inactive -> active
        deactivated -> active

    Previous archive reasons remain stored.
    """

    employee = (
        _get_warehouse_employee(
            user_id,
            employee_id,
        )
    )


    if not employee:

        raise ValueError(
            "Warehouse employee was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "This Warehouse employee is already active."
        )


    if current_status not in {
        "archived",
        "inactive",
        "deactivated",
    }:

        raise ValueError(
            "This Warehouse employee cannot be restored "
            "from its current status."
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
                UPDATE warehouse_employees

                SET

                    status =
                        'active',

                    updated_at =
                        CURRENT_TIMESTAMP


                WHERE

                    warehouse_employee_id = %s

                    AND status IN (
                        'archived',
                        'inactive',
                        'deactivated'
                    )


                RETURNING

                    warehouse_employee_id,

                    status,

                    updated_at
                """,
                [
                    employee_id,
                ],
            )


            updated = (
                cursor.fetchone()
            )


        if not updated:

            raise RuntimeError(
                "The Warehouse employee could not be restored "
                "because the employee status changed before "
                "the restore action completed."
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

        "message":
            "Warehouse employee restored successfully.",
    }


# ============================================================
# DELETE WAREHOUSE EMPLOYEE PERMANENTLY
# ============================================================

def delete_warehouse_employee(
    user_id,
    employee_id,
):
    """
    Permanently delete one archived,
    inactive, or deactivated Warehouse employee.

    Active employees must be archived first.
    """

    employee = (
        _get_warehouse_employee(
            user_id,
            employee_id,
        )
    )


    if not employee:

        raise ValueError(
            "Warehouse employee was not found."
        )


    current_status = str(
        employee.get(
            "status"
        )
        or ""
    ).strip().lower()


    if current_status == "active":

        raise ValueError(
            "Active Warehouse employees must be archived "
            "before they can be permanently deleted."
        )


    if current_status not in {
        "archived",
        "inactive",
        "deactivated",
    }:

        raise ValueError(
            "This Warehouse employee cannot be permanently "
            "deleted from its current status."
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
                DELETE FROM warehouse_employees

                WHERE
                    warehouse_employee_id = %s


                RETURNING
                    warehouse_employee_id
                """,
                [
                    employee_id,
                ],
            )


            deleted = (
                cursor.fetchone()
            )


        if not deleted:

            raise RuntimeError(
                "The Warehouse employee could not be permanently deleted."
            )


    return {

        "employee_id":
            int(
                deleted[0]
            ),

        "employee_name":
            employee_name,

        "message":
            "Warehouse employee deleted permanently.",
    }