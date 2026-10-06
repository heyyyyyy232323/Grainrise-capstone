
import os
import re
import secrets
from pathlib import Path

from django.conf import settings
from django.db import connection, transaction


def _save_branch_document_file(file_obj, supplier_profile_id, doc_type):
    """
    Saves an uploaded file to media/miller_branch_documents/<supplier_profile_id>/
    Returns the relative POSIX path.
    """
    if not file_obj or not hasattr(file_obj, "chunks"):
        return None

    extension = os.path.splitext(getattr(file_obj, "name", "") or "")[1].lower() or ".pdf"
    unique_name = f"{doc_type}_{secrets.token_hex(12)}{extension}"
    rel_directory = Path("miller_branch_documents") / str(supplier_profile_id)
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


def create_miller_branch(
    *,
    miller_user_id,
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
    Create a new Miller branch inside one database transaction:
    1. Create one supplier_profiles row.
    2. Create one miller_branch_documents row with the new supplier_profile_id.
    """
    business_name = (business_name or "").strip()
    if not business_name:
        raise ValueError("Business name is required.")

    official_email = (official_email or "").strip()
    if not official_email:
        raise ValueError("Official email address is required.")

    official_contact_number = (official_contact_number or "").strip()
    if not official_contact_number:
        raise ValueError("Official contact number is required.")

    created_files = []

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # 1. Insert supplier_profiles row
                cursor.execute(
                    """
                    INSERT INTO supplier_profiles (
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
                        miller_user_id,
                        business_name,
                        organization_name.strip() if organization_name and isinstance(organization_name, str) else None,
                        province.strip() if province and isinstance(province, str) else None,
                        municipality.strip() if municipality and isinstance(municipality, str) else None,
                        postal_code.strip() if postal_code and isinstance(postal_code, str) else None,
                        barangay.strip() if barangay and isinstance(barangay, str) else None,
                        street_address.strip() if street_address and isinstance(street_address, str) else None,
                        official_email,
                        official_contact_number,
                    ],
                )
                supplier_profile_id = cursor.lastrowid

                # Save or resolve documents
                biz_doc_path = None
                if business_document and hasattr(business_document, "chunks"):
                    biz_doc_path = _save_branch_document_file(business_document, supplier_profile_id, "business_document")
                    if biz_doc_path:
                        created_files.append(biz_doc_path)
                elif isinstance(business_document, str) and business_document.strip():
                    biz_doc_path = business_document.strip()

                mayors_permit_path = None
                if mayors_permit and hasattr(mayors_permit, "chunks"):
                    mayors_permit_path = _save_branch_document_file(mayors_permit, supplier_profile_id, "mayors_permit")
                    if mayors_permit_path:
                        created_files.append(mayors_permit_path)
                elif isinstance(mayors_permit, str) and mayors_permit.strip():
                    mayors_permit_path = mayors_permit.strip()

                # 2. Insert miller_branch_documents row
                cursor.execute(
                    """
                    INSERT INTO miller_branch_documents (
                        supplier_profile_id,
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
                        supplier_profile_id,
                        biz_doc_path,
                        mayors_permit_path,
                    ],
                )
                miller_branch_document_id = cursor.lastrowid

                return {
                    "supplier_profile_id": supplier_profile_id,
                    "miller_branch_document_id": miller_branch_document_id,
                    "business_name": business_name,
                    "organization_name": organization_name.strip() if organization_name and isinstance(organization_name, str) else None,
                    "province": province.strip() if province and isinstance(province, str) else None,
                    "municipality": municipality.strip() if municipality and isinstance(municipality, str) else None,
                    "postal_code": postal_code.strip() if postal_code and isinstance(postal_code, str) else None,
                    "barangay": barangay.strip() if barangay and isinstance(barangay, str) else None,
                    "street_address": street_address.strip() if street_address and isinstance(street_address, str) else None,
                    "official_email": official_email,
                    "official_contact_number": official_contact_number,
                    "business_document": biz_doc_path,
                    "mayors_permit": mayors_permit_path,
                }

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


def create_miller_branch_employee(
    *,
    supplier_profile_id,
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
    Insert a new employee into supplier_employees for the given branch (supplier_profile_id).

    Fields used:
    - supplier_profile_id = branch_id
    - first_name
    - middle_initial
    - last_name
    - suffix
    - position (normalized to database CHECK constraint)
    - email
    - contact_number
    - password (hashed using project's hash_password)
    - status = 'active'
    - must_change_password = 1

    Unused fields (gender, province, municipality, postal_code, barangay, street_address)
    remain NULL as allowed by the database schema.
    """
    from api.utils import hash_password

    first_name = (first_name or "").strip()
    if not first_name:
        raise ValueError("First name is required.")

    last_name = (last_name or "").strip()
    if not last_name:
        raise ValueError("Last name is required.")

    email = (email or "").strip().lower()
    if not email:
        raise ValueError("Email address is required.")

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
            f"Invalid employee role: '{position_str}'. Allowed roles: Driver, Finance, Fulfillment & Logistics, Encoder, Procurement, Sales."
        )

    clean_mi = middle_initial.strip()[:10] if middle_initial and isinstance(middle_initial, str) and middle_initial.strip() else None
    clean_suffix = suffix.strip()[:20] if suffix and isinstance(suffix, str) and suffix.strip() else None

    # Resolve username and hash submitted password
    resolved_username = (username or email).strip()[:150]
    hashed_pwd = hash_password(password_str)


    with transaction.atomic():
        with connection.cursor() as cursor:
            # Check unique email in supplier_employees
            cursor.execute(
                "SELECT supplier_employee_id FROM supplier_employees WHERE LOWER(email) = %s LIMIT 1",
                [email],
            )
            if cursor.fetchone():
                raise ValueError(f"An employee with email '{email}' already exists.")

            # Check unique username in supplier_employees
            cursor.execute(
                "SELECT supplier_employee_id FROM supplier_employees WHERE LOWER(username) = %s LIMIT 1",
                [resolved_username.lower()],
            )
            if cursor.fetchone():
                resolved_username = f"{resolved_username[:140]}_{secrets.token_hex(4)}"

            cursor.execute(
                """
                INSERT INTO supplier_employees (
                    supplier_profile_id,
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
                    supplier_profile_id,
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
                "supplier_employee_id": employee_id,
                "id": employee_id,
                "supplier_profile_id": supplier_profile_id,
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


def update_miller_branch_employee(
    *,
    supplier_profile_id,
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
    Update an existing employee in supplier_employees for the given branch.

    Fields updated:
    - first_name
    - middle_initial
    - last_name
    - suffix
    - position
    - email
    - contact_number
    - password_hash (optional: only if password is provided)
    """
    from api.utils import hash_password

    first_name = (first_name or "").strip()
    if not first_name:
        raise ValueError("First name is required.")

    last_name = (last_name or "").strip()
    if not last_name:
        raise ValueError("Last name is required.")

    email = (email or "").strip().lower()
    if not email:
        raise ValueError("Email address is required.")

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
            f"Invalid employee role: '{position_str}'. Allowed roles: Driver, Finance, Fulfillment & Logistics, Encoder, Procurement, Sales."
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
                SELECT supplier_employee_id
                FROM supplier_employees
                WHERE supplier_employee_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [employee_id, supplier_profile_id],
            )
            if not cursor.fetchone():
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                SELECT supplier_employee_id
                FROM supplier_employees
                WHERE LOWER(email) = %s AND supplier_employee_id != %s
                LIMIT 1
                """,
                [email, employee_id],
            )
            if cursor.fetchone():
                raise ValueError(f"An employee with email '{email}' already exists.")

            if hashed_pwd:
                cursor.execute(
                    """
                    UPDATE supplier_employees
                    SET first_name = %s,
                        middle_initial = %s,
                        last_name = %s,
                        suffix = %s,
                        position = %s,
                        email = %s,
                        contact_number = %s,
                        password_hash = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE supplier_employee_id = %s
                      AND supplier_profile_id = %s
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
                        supplier_profile_id,
                    ],
                )
            else:
                cursor.execute(
                    """
                    UPDATE supplier_employees
                    SET first_name = %s,
                        middle_initial = %s,
                        last_name = %s,
                        suffix = %s,
                        position = %s,
                        email = %s,
                        contact_number = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE supplier_employee_id = %s
                      AND supplier_profile_id = %s
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
                        supplier_profile_id,
                    ],
                )

            name_parts = [first_name, clean_mi, last_name, clean_suffix]
            full_name = " ".join(part for part in name_parts if part).strip()

            return {
                "supplier_employee_id": employee_id,
                "id": employee_id,
                "supplier_profile_id": supplier_profile_id,
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


def archive_miller_branch_employee(
    *,
    supplier_profile_id,
    employee_id,
    reason,
):
    """
    Archive an employee:
    - Set supplier_employees.status = 'archived'
    - Save reason in supplier_employee_archive_reasons
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
                SELECT supplier_employee_id, status
                FROM supplier_employees
                WHERE supplier_employee_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [employee_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                UPDATE supplier_employees
                SET status = 'archived',
                    updated_at = CURRENT_TIMESTAMP
                WHERE supplier_employee_id = %s
                  AND supplier_profile_id = %s
                """,
                [employee_id, supplier_profile_id],
            )

            cursor.execute(
                """
                INSERT INTO supplier_employee_archive_reasons (
                    supplier_employee_id,
                    reason,
                    created_at
                ) VALUES (%s, %s, CURRENT_TIMESTAMP)
                """,
                [employee_id, cleaned_reason],
            )
            archive_reason_id = cursor.lastrowid

            return {
                "supplier_employee_id": employee_id,
                "id": employee_id,
                "status": "archived",
                "archive_reason": cleaned_reason,
                "archive_reason_id": archive_reason_id,
            }


def restore_miller_branch_employee(
    *,
    supplier_profile_id,
    employee_id,
):
    """
    Restore an employee:
    - Set supplier_employees.status = 'active'
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT supplier_employee_id, status
                FROM supplier_employees
                WHERE supplier_employee_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [employee_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                UPDATE supplier_employees
                SET status = 'active',
                    updated_at = CURRENT_TIMESTAMP
                WHERE supplier_employee_id = %s
                  AND supplier_profile_id = %s
                """,
                [employee_id, supplier_profile_id],
            )

            return {
                "supplier_employee_id": employee_id,
                "id": employee_id,
                "status": "active",
            }


def delete_miller_branch_employee(
    *,
    supplier_profile_id,
    employee_id,
):
    """
    Permanently delete an employee from supplier_employees.
    """
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT supplier_employee_id, status
                FROM supplier_employees
                WHERE supplier_employee_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [employee_id, supplier_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Employee not found in this branch.")

            cursor.execute(
                """
                DELETE FROM supplier_employee_archive_reasons
                WHERE supplier_employee_id = %s
                """,
                [employee_id],
            )

            cursor.execute(
                """
                DELETE FROM supplier_employees
                WHERE supplier_employee_id = %s
                  AND supplier_profile_id = %s
                """,
                [employee_id, supplier_profile_id],
            )

            return {
                "supplier_employee_id": employee_id,
                "id": employee_id,
                "deleted": True,
            }


