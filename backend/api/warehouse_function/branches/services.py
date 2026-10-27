import os
import re
import secrets
from pathlib import Path

from django.conf import settings
from django.db import IntegrityError, connection, transaction

from api.utils import hash_password


MAX_DOCUMENT_SIZE = 5 * 1024 * 1024
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp"}


def _save_branch_document_file(file_obj, warehouse_profile_id, doc_type):
    """
    Saves an uploaded file to media/warehouse_branch_documents/<warehouse_profile_id>/
    Returns the relative POSIX path.
    """
    if not file_obj or not hasattr(file_obj, "chunks"):
        return None

    file_name = getattr(file_obj, "name", "") or ""
    extension = os.path.splitext(file_name)[1].lower() or ".pdf"

    if extension not in ALLOWED_DOCUMENT_EXTENSIONS:
        raise ValueError(
            f"Invalid file type for {doc_type}. Allowed types: PDF, PNG, JPG, JPEG, WEBP."
        )

    file_size = getattr(file_obj, "size", 0)
    if file_size > MAX_DOCUMENT_SIZE:
        raise ValueError(
            f"File size for {doc_type} exceeds the 5MB limit."
        )

    unique_name = f"{doc_type}_{secrets.token_hex(12)}{extension}"
    rel_directory = Path("warehouse_branch_documents") / str(warehouse_profile_id)
    abs_directory = Path(settings.MEDIA_ROOT) / rel_directory

    abs_directory.mkdir(parents=True, exist_ok=True)
    abs_file_path = abs_directory / unique_name

    with abs_file_path.open("wb") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)

    return (rel_directory / unique_name).as_posix()


def _delete_file_safely(rel_path):
    if not rel_path or not isinstance(rel_path, str):
        return
    try:
        abs_path = Path(settings.MEDIA_ROOT) / rel_path
        if abs_path.is_file():
            abs_path.unlink()
    except Exception:
        pass


def _normalize_branch_name(name):
    if not name:
        return ""
    return re.sub(r"\s+", " ", str(name).strip()).lower()


def create_warehouse_branch(
    *,
    warehouse_user_id,
    business_name,
    organization_name=None,
    province=None,
    municipality=None,
    postal_code=None,
    barangay=None,
    street_address=None,
    official_email,
    official_contact_number,
    business_document=None,
    mayors_permit=None,
):
    """
    Create a new Warehouse branch inside one database transaction:
    1. Validate branch name uniqueness (case-insensitively, normalized repeated whitespace).
    2. Insert warehouse_profiles row.
    3. Insert warehouse_branch_documents row with the new warehouse_profile_id.
    """
    business_name = (business_name or "").strip()
    if not business_name:
        raise ValueError("Business name is required.")

    norm_name = _normalize_branch_name(business_name)

    official_email = (official_email or "").strip()
    if not official_email:
        raise ValueError("Official email address is required.")

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", official_email):
        raise ValueError("Enter a valid official email address.")

    official_contact_number = (official_contact_number or "").strip()
    if not official_contact_number:
        raise ValueError("Official contact number is required.")

    cleaned_phone = re.sub(r"[\s\-]", "", official_contact_number)
    if not re.match(r"^(09\d{9}|\+639\d{9})$", cleaned_phone):
        raise ValueError(
            "Contact number must be a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX)."
        )

    created_files = []

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Backend duplicate branch name validation across ALL warehouse_profiles
                cursor.execute("SELECT warehouse_profile_id, business_name FROM warehouse_profiles")
                for _, existing_bname in cursor.fetchall():
                    if _normalize_branch_name(existing_bname) == norm_name:
                        raise ValueError(
                            "This branch name is already registered. Please use a different branch name."
                        )

                # 1. Insert warehouse_profiles row
                cursor.execute(
                    """
                    INSERT INTO warehouse_profiles (
                        user_id,
                        business_name,
                        organization_name,
                        province,
                        municipality,
                        postal_code,
                        barangay,
                        street_address,
                        official_email,
                        official_contact_number,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        warehouse_user_id,
                        business_name,
                        organization_name.strip() if organization_name and isinstance(organization_name, str) and organization_name.strip() else None,
                        province.strip() if province and isinstance(province, str) and province.strip() else None,
                        municipality.strip() if municipality and isinstance(municipality, str) and municipality.strip() else None,
                        postal_code.strip() if postal_code and isinstance(postal_code, str) and postal_code.strip() else None,
                        barangay.strip() if barangay and isinstance(barangay, str) and barangay.strip() else None,
                        street_address.strip() if street_address and isinstance(street_address, str) and street_address.strip() else None,
                        official_email,
                        cleaned_phone,
                    ],
                )
                warehouse_profile_id = cursor.lastrowid

                # Save documents
                biz_doc_path = None
                if business_document and hasattr(business_document, "chunks"):
                    biz_doc_path = _save_branch_document_file(business_document, warehouse_profile_id, "business_document")
                    if biz_doc_path:
                        created_files.append(biz_doc_path)
                elif isinstance(business_document, str) and business_document.strip():
                    biz_doc_path = business_document.strip()

                mayors_permit_path = None
                if mayors_permit and hasattr(mayors_permit, "chunks"):
                    mayors_permit_path = _save_branch_document_file(mayors_permit, warehouse_profile_id, "mayors_permit")
                    if mayors_permit_path:
                        created_files.append(mayors_permit_path)
                elif isinstance(mayors_permit, str) and mayors_permit.strip():
                    mayors_permit_path = mayors_permit.strip()

                # 2. Insert warehouse_branch_documents row
                cursor.execute(
                    """
                    INSERT INTO warehouse_branch_documents (
                        warehouse_profile_id,
                        business_document,
                        mayors_permit,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, %s,
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                    """,
                    [
                        warehouse_profile_id,
                        biz_doc_path,
                        mayors_permit_path,
                    ],
                )
                warehouse_branch_document_id = cursor.lastrowid

                return {
                    "warehouse_profile_id": warehouse_profile_id,
                    "warehouse_branch_document_id": warehouse_branch_document_id,
                    "business_name": business_name,
                    "organization_name": organization_name.strip() if organization_name and isinstance(organization_name, str) and organization_name.strip() else None,
                    "province": province.strip() if province and isinstance(province, str) and province.strip() else None,
                    "municipality": municipality.strip() if municipality and isinstance(municipality, str) and municipality.strip() else None,
                    "postal_code": postal_code.strip() if postal_code and isinstance(postal_code, str) and postal_code.strip() else None,
                    "barangay": barangay.strip() if barangay and isinstance(barangay, str) and barangay.strip() else None,
                    "street_address": street_address.strip() if street_address and isinstance(street_address, str) and street_address.strip() else None,
                    "official_email": official_email,
                    "official_contact_number": cleaned_phone,
                    "business_document": biz_doc_path,
                    "mayors_permit": mayors_permit_path,
                }

    except IntegrityError as exc:
        for file_path in created_files:
            _delete_file_safely(file_path)
        err_msg = str(exc)
        if "business_name" in err_msg.lower() or "uq_" in err_msg.lower():
            raise ValueError(
                "This branch name is already registered. Please use a different branch name."
            )
        raise
    except Exception:
        for file_path in created_files:
            _delete_file_safely(file_path)
        raise


POSITION_CHOICES = {
    "encoder": "encoder",
    "procurement": "procurement",
    "finance": "finance",
    "sales": "seller",
    "seller": "seller",
    "fulfillment & logistics": "fulfillment_logistics_coordinator",
    "fulfillment and logistics": "fulfillment_logistics_coordinator",
    "fulfillment_logistics_coordinator": "fulfillment_logistics_coordinator",
    "driver": "driver",
    "branch manager": "branch_manager",
    "branch_manager": "branch_manager",
}

DISPLAY_ROLES = {
    "encoder": "Encoder",
    "procurement": "Procurement",
    "finance": "Finance",
    "seller": "Sales",
    "fulfillment_logistics_coordinator": "Fulfillment & Logistics",
    "driver": "Driver",
    "branch_manager": "Branch Manager",
}


def create_warehouse_branch_employee(
    *,
    warehouse_profile_id,
    first_name,
    middle_initial=None,
    last_name,
    suffix=None,
    position,
    email,
    contact_number,
    password,
    username=None,
):
    """
    Insert a new employee into warehouse_employees for the given branch (warehouse_profile_id).
    """
    first_name = (first_name or "").strip()
    if not first_name:
        raise ValueError("First name is required.")

    last_name = (last_name or "").strip()
    if not last_name:
        raise ValueError("Last name is required.")

    email = (email or "").strip().lower()
    if not email:
        raise ValueError("Email address is required.")

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("Enter a valid email address.")

    contact_number = (contact_number or "").strip()
    if not contact_number:
        raise ValueError("Contact phone number is required.")

    cleaned_phone = re.sub(r"[\s\-]", "", contact_number)
    if not re.match(r"^(09\d{9}|\+639\d{9})$", cleaned_phone):
        raise ValueError(
            "Contact phone must be a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX)."
        )

    password_str = (password or "").strip()
    if not password_str:
        raise ValueError("Password is required.")
    if len(password_str) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password_str):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password_str):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password_str):
        raise ValueError("Password must contain at least one number.")

    position_str = (position or "").strip()
    if not position_str:
        raise ValueError("Employee role is required.")

    normalized_position = POSITION_CHOICES.get(position_str.lower())
    if not normalized_position:
        raise ValueError(
            f"Invalid employee role: '{position_str}'. Allowed roles: Driver, Finance, Fulfillment & Logistics, Encoder, Procurement, Sales, Branch Manager."
        )

    clean_mi = middle_initial.strip()[:10] if middle_initial and isinstance(middle_initial, str) and middle_initial.strip() else None
    clean_suffix = suffix.strip()[:20] if suffix and isinstance(suffix, str) and suffix.strip() else None

    resolved_username = (username or email).strip()[:150]
    hashed_pwd = hash_password(password_str)

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Check unique email in warehouse_employees
            cursor.execute(
                "SELECT warehouse_employee_id FROM warehouse_employees WHERE LOWER(email) = %s LIMIT 1",
                [email],
            )
            if cursor.fetchone():
                raise ValueError(f"An employee with email '{email}' already exists.")

            # Check unique username in warehouse_employees
            cursor.execute(
                "SELECT warehouse_employee_id FROM warehouse_employees WHERE LOWER(username) = %s LIMIT 1",
                [resolved_username.lower()],
            )
            if cursor.fetchone():
                resolved_username = f"{resolved_username[:140]}_{secrets.token_hex(4)}"

            cursor.execute(
                """
                INSERT INTO warehouse_employees (
                    warehouse_profile_id,
                    first_name,
                    middle_initial,
                    last_name,
                    suffix,
                    gender,
                    province,
                    municipality,
                    postal_code,
                    barangay,
                    street_address,
                    email,
                    contact_number,
                    username,
                    password_hash,
                    position,
                    status,
                    must_change_password,
                    created_at,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    NULL, NULL, NULL, NULL, NULL, NULL,
                    %s, %s, %s, %s, %s,
                    'active', 1,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """,
                [
                    warehouse_profile_id,
                    first_name,
                    clean_mi,
                    last_name,
                    clean_suffix,
                    email,
                    cleaned_phone,
                    resolved_username,
                    hashed_pwd,
                    normalized_position,
                ],
            )
            employee_id = cursor.lastrowid

            name_parts = [first_name, clean_mi, last_name, clean_suffix]
            full_name = " ".join(part for part in name_parts if part).strip()

            return {
                "warehouse_employee_id": employee_id,
                "id": employee_id,
                "warehouse_profile_id": warehouse_profile_id,
                "first_name": first_name,
                "middle_initial": clean_mi,
                "last_name": last_name,
                "suffix": clean_suffix,
                "name": full_name,
                "role": DISPLAY_ROLES.get(normalized_position, normalized_position),
                "position": normalized_position,
                "email": email,
                "contact_number": cleaned_phone,
                "phone": cleaned_phone,
                "status": "active",
            }


def update_warehouse_branch_employee(
    *,
    warehouse_profile_id,
    employee_id,
    first_name,
    middle_initial=None,
    last_name,
    suffix=None,
    position,
    email,
    contact_number,
    password=None,
):
    """
    Update an existing employee in warehouse_employees for the given branch.
    """
    first_name = (first_name or "").strip()
    if not first_name:
        raise ValueError("First name is required.")

    last_name = (last_name or "").strip()
    if not last_name:
        raise ValueError("Last name is required.")

    email = (email or "").strip().lower()
    if not email:
        raise ValueError("Email address is required.")

    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise ValueError("Enter a valid email address.")

    contact_number = (contact_number or "").strip()
    if not contact_number:
        raise ValueError("Contact phone number is required.")

    cleaned_phone = re.sub(r"[\s\-]", "", contact_number)
    if not re.match(r"^(09\d{9}|\+639\d{9})$", cleaned_phone):
        raise ValueError(
            "Contact phone must be a valid Philippine mobile number (e.g., 09XXXXXXXXX or +639XXXXXXXXX)."
        )

    position_str = (position or "").strip()
    if not position_str:
        raise ValueError("Employee role is required.")

    normalized_position = POSITION_CHOICES.get(position_str.lower())
    if not normalized_position:
        raise ValueError(
            f"Invalid employee role: '{position_str}'. Allowed roles: Driver, Finance, Fulfillment & Logistics, Encoder, Procurement, Sales, Branch Manager."
        )

    clean_mi = middle_initial.strip()[:10] if middle_initial and isinstance(middle_initial, str) and middle_initial.strip() else None
    clean_suffix = suffix.strip()[:20] if suffix and isinstance(suffix, str) and suffix.strip() else None

    # Password validation: optional during edit
    hashed_pwd = None
    if password is not None and str(password).strip():
        password_str = str(password).strip()
        if len(password_str) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not re.search(r"[A-Z]", password_str):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not re.search(r"[a-z]", password_str):
            raise ValueError("Password must contain at least one lowercase letter.")
        if not re.search(r"[0-9]", password_str):
            raise ValueError("Password must contain at least one number.")
        hashed_pwd = hash_password(password_str)

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT warehouse_employee_id
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [employee_id, warehouse_profile_id],
            )
            if not cursor.fetchone():
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                SELECT warehouse_employee_id
                FROM warehouse_employees
                WHERE LOWER(email) = %s AND warehouse_employee_id != %s
                LIMIT 1
                """,
                [email, employee_id],
            )
            if cursor.fetchone():
                raise ValueError(f"An employee with email '{email}' already exists.")

            if hashed_pwd:
                cursor.execute(
                    """
                    UPDATE warehouse_employees
                    SET first_name = %s,
                        middle_initial = %s,
                        last_name = %s,
                        suffix = %s,
                        position = %s,
                        email = %s,
                        contact_number = %s,
                        password_hash = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE warehouse_employee_id = %s
                      AND warehouse_profile_id = %s
                    """,
                    [
                        first_name,
                        clean_mi,
                        last_name,
                        clean_suffix,
                        normalized_position,
                        email,
                        cleaned_phone,
                        hashed_pwd,
                        employee_id,
                        warehouse_profile_id,
                    ],
                )
            else:
                cursor.execute(
                    """
                    UPDATE warehouse_employees
                    SET first_name = %s,
                        middle_initial = %s,
                        last_name = %s,
                        suffix = %s,
                        position = %s,
                        email = %s,
                        contact_number = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE warehouse_employee_id = %s
                      AND warehouse_profile_id = %s
                    """,
                    [
                        first_name,
                        clean_mi,
                        last_name,
                        clean_suffix,
                        normalized_position,
                        email,
                        cleaned_phone,
                        employee_id,
                        warehouse_profile_id,
                    ],
                )

            name_parts = [first_name, clean_mi, last_name, clean_suffix]
            full_name = " ".join(part for part in name_parts if part).strip()

            return {
                "warehouse_employee_id": employee_id,
                "id": employee_id,
                "warehouse_profile_id": warehouse_profile_id,
                "first_name": first_name,
                "middle_initial": clean_mi,
                "last_name": last_name,
                "suffix": clean_suffix,
                "name": full_name,
                "role": DISPLAY_ROLES.get(normalized_position, normalized_position),
                "position": normalized_position,
                "email": email,
                "contact_number": cleaned_phone,
                "phone": cleaned_phone,
            }


def archive_warehouse_branch_employee(
    *,
    warehouse_profile_id,
    employee_id,
    reason,
):
    """
    Archive an employee:
    - Set warehouse_employees.status = 'archived'
    - Save reason in warehouse_employee_archive_reasons
    """
    cleaned_reason = (reason or "").strip()
    if not cleaned_reason:
        raise ValueError("Archive reason is required.")

    if len(cleaned_reason) > 1000:
        raise ValueError("Archive reason must not exceed 1000 characters.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT warehouse_employee_id, status
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [employee_id, warehouse_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                UPDATE warehouse_employees
                SET status = 'archived',
                    updated_at = CURRENT_TIMESTAMP
                WHERE warehouse_employee_id = %s
                  AND warehouse_profile_id = %s
                """,
                [employee_id, warehouse_profile_id],
            )

            cursor.execute(
                """
                INSERT INTO warehouse_employee_archive_reasons (
                    warehouse_employee_id,
                    reason,
                    created_at
                ) VALUES (%s, %s, CURRENT_TIMESTAMP)
                """,
                [employee_id, cleaned_reason],
            )
            archive_reason_id = cursor.lastrowid

            return {
                "warehouse_employee_id": employee_id,
                "id": employee_id,
                "status": "archived",
                "archive_reason": cleaned_reason,
                "archive_reason_id": archive_reason_id,
            }


def restore_warehouse_branch_employee(
    *,
    warehouse_profile_id,
    employee_id,
):
    """
    Restore an employee:
    - Set warehouse_employees.status = 'active'
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT warehouse_employee_id, status
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [employee_id, warehouse_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                UPDATE warehouse_employees
                SET status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE warehouse_employee_id = %s
                  AND warehouse_profile_id = %s
                """,
                [employee_id, warehouse_profile_id],
            )

            return {
                "warehouse_employee_id": employee_id,
                "id": employee_id,
                "status": "active",
            }


OPERATIONAL_TABLE_CHECKS = [
    ("warehouse_expenses", "paid_by_employee_id", "expenses records"),
    ("warehouse_ftf_sales", "sold_by_employee_id", "sales records"),
    ("warehouse_purchase_requests", "requested_by_employee_id", "purchase requests"),
    ("warehouse_vehicle_assignee", "driver_id", "vehicle assignments"),
    ("warehouse_reimbursement", "requested_by", "reimbursement requests"),
    ("warehouse_reimbursement", "paid_by", "reimbursement payments"),
    ("warehouse_online_customer_cash_on_delivery", "driver_id", "cash on delivery duties"),
    ("warehouse_last_ping", "driver_id", "driver location records"),
    ("warehouse_finance_payables_payment_references", "requested_by_employee_id", "finance payable requests"),
    ("warehouse_finance_payables_payment_references", "paid_by_employee_id", "finance payable payments"),
    ("warehouse_nongrainrise_supplier_receiving_history", "received_by_employee_id", "receiving history records"),
    ("warehouse_nongrainrise_supplier_receiving_history", "paid_by_employee_id", "receiving payment records"),
    ("miller_online_orders_returns", "received_by_employee_id", "returns records"),
    ("warehouse_demand_forecasting_support_from_request_orders", "generated_by_employee_id", "demand forecasting records"),
    ("warehouse_miller_purchase_xendit_payment_tracking", "initiated_by_employee_id", "payment tracking records"),
    ("warehouse_nongrainrise_supplier_contacts_ratings", "rated_by_employee_id", "supplier rating records"),
    ("warehouse_reimbursement_payout_tracking", "initiated_by", "reimbursement payout records"),
    ("warehouse_inbound_date_requirements", "set_by_employee_id", "inbound date requirements"),
]


def delete_warehouse_branch_employee(
    *,
    warehouse_profile_id,
    employee_id,
):
    """
    Permanently delete an employee from warehouse_employees.
    Rules:
    - Permitted only for archived employees.
    - Blocked if employee is linked to historical operational records.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT warehouse_employee_id, status
                FROM warehouse_employees
                WHERE warehouse_employee_id = %s AND warehouse_profile_id = %s
                LIMIT 1
                """,
                [employee_id, warehouse_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            emp_status = (row[1] or "").lower()
            if emp_status != "archived":
                raise ValueError(
                    "Only archived employees can be permanently deleted. Please archive this employee first."
                )

            # Check dependent operational records
            for table_name, col_name, description in OPERATIONAL_TABLE_CHECKS:
                try:
                    cursor.execute(
                        f"SELECT 1 FROM {table_name} WHERE {col_name} = %s LIMIT 1",
                        [employee_id],
                    )
                    if cursor.fetchone():
                        raise ValueError(
                            f"Cannot delete this employee permanently because they have associated {description}. Keep the employee archived instead."
                        )
                except ValueError:
                    raise
                except Exception:
                    # Table may not exist in some environments; skip if so
                    pass

            # Safe cleanup of ancillary records
            for ancillary_table, fk_col in [
                ("warehouse_employee_archive_reasons", "warehouse_employee_id"),
                ("warehouse_employee_notifications", "seen_by_employee_id"),
                ("warehouse_employee_online_transaction_credentials", "warehouse_employee_id"),
                ("warehouse_employee_payment_account_security", "warehouse_employee_id"),
            ]:
                try:
                    cursor.execute(
                        f"DELETE FROM {ancillary_table} WHERE {fk_col} = %s",
                        [employee_id],
                    )
                except Exception:
                    pass

            try:
                cursor.execute(
                    """
                    DELETE FROM warehouse_employees
                    WHERE warehouse_employee_id = %s
                      AND warehouse_profile_id = %s
                    """,
                    [employee_id, warehouse_profile_id],
                )
            except IntegrityError as exc:
                raise ValueError(
                    "Cannot delete this employee permanently because they are associated with existing operational records. Keep the employee archived instead."
                ) from exc

            return {
                "warehouse_employee_id": employee_id,
                "id": employee_id,
                "deleted": True,
            }

