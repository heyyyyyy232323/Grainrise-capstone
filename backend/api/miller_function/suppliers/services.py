import re
from django.db import connection, transaction


def _validate_supplier_fields(
    *,
    contact_person,
    contact_number,
    supplier_farm_clean,
    organization_clean,
):
    if not contact_person:
        raise ValueError("Contact person is required.")
    if len(contact_person) > 20:
        raise ValueError("Contact person cannot exceed 20 characters.")
    if not re.match(r"^[a-zA-Z\s]+$", contact_person):
        raise ValueError("Contact person must contain letters and spaces only.")

    if not contact_number:
        raise ValueError("Contact number is required.")
    if not re.match(r"^\d+$", contact_number):
        raise ValueError("Contact number must contain digits only.")
    if not re.match(r"^(09\d{9}|639\d{9})$", contact_number):
        raise ValueError("Contact number must be in Philippine mobile format (09XXXXXXXXX or 639XXXXXXXXX).")

    if supplier_farm_clean and len(supplier_farm_clean) > 20:
        raise ValueError("Supplier / Farm Name cannot exceed 20 characters.")

    if organization_clean and len(organization_clean) > 20:
        raise ValueError("Organization / Co-op cannot exceed 20 characters.")


def check_duplicate_supplier(
    *,
    supplier_profile_id,
    supplier_farm=None,
    organization=None,
    contact_person=None,
    exclude_supplier_id=None,
):
    """
    Prevent duplicate Farm Name, Organization, or Contact Person within the same branch
    (case-insensitive, trimmed). Excludes current record during Edit.
    """
    with connection.cursor() as cursor:
        if supplier_farm and str(supplier_farm).strip():
            sql = """
                SELECT farmer_contact_id FROM farmer_contacts
                WHERE supplier_profile_id = %s
                  AND LOWER(TRIM(COALESCE(supplier_farm, ''))) = LOWER(TRIM(%s))
            """
            params = [supplier_profile_id, str(supplier_farm).strip()]
            if exclude_supplier_id:
                sql += " AND farmer_contact_id != %s"
                params.append(exclude_supplier_id)
            sql += " LIMIT 1"
            cursor.execute(sql, params)
            if cursor.fetchone():
                raise ValueError("A supplier with this Farm Name already exists in this branch.")

        if organization and str(organization).strip():
            sql = """
                SELECT farmer_contact_id FROM farmer_contacts
                WHERE supplier_profile_id = %s
                  AND LOWER(TRIM(COALESCE(organization, ''))) = LOWER(TRIM(%s))
            """
            params = [supplier_profile_id, str(organization).strip()]
            if exclude_supplier_id:
                sql += " AND farmer_contact_id != %s"
                params.append(exclude_supplier_id)
            sql += " LIMIT 1"
            cursor.execute(sql, params)
            if cursor.fetchone():
                raise ValueError("A supplier with this Organization / Co-op already exists in this branch.")

        if contact_person and str(contact_person).strip():
            sql = """
                SELECT farmer_contact_id FROM farmer_contacts
                WHERE supplier_profile_id = %s
                  AND LOWER(TRIM(COALESCE(contact_person, ''))) = LOWER(TRIM(%s))
            """
            params = [supplier_profile_id, str(contact_person).strip()]
            if exclude_supplier_id:
                sql += " AND farmer_contact_id != %s"
                params.append(exclude_supplier_id)
            sql += " LIMIT 1"
            cursor.execute(sql, params)
            if cursor.fetchone():
                raise ValueError("A supplier with this Contact Person already exists in this branch.")



def create_miller_supplier(
    *,
    miller_user_id,
    supplier_profile_id,
    supplier_farm=None,
    organization=None,
    contact_person,
    contact_number,
    email=None,
    address,
    status="active",
):
    """
    Create a new supplier record in farmer_contacts:
    - Verifies supplier_profile_id belongs to request.grainrise_miller_id
    - Validates required fields
    """
    if not supplier_profile_id:
        raise ValueError("Branch (supplier_profile_id) is required.")

    contact_person = (contact_person or "").strip()
    contact_number = (contact_number or "").strip()
    address = (address or "").strip()
    if not address:
        raise ValueError("Address is required.")

    supplier_farm_clean = (supplier_farm or "").strip() or None
    organization_clean = (organization or "").strip() or None
    email_clean = (email or "").strip().lower() or None

    _validate_supplier_fields(
        contact_person=contact_person,
        contact_number=contact_number,
        supplier_farm_clean=supplier_farm_clean,
        organization_clean=organization_clean,
    )

    status_clean = (status or "active").strip().lower()
    if status_clean not in ("active", "inactive"):
        status_clean = "active"

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Verify supplier_profile_id belongs to the authenticated Miller Manager
            cursor.execute(
                """
                SELECT supplier_profile_id, business_name
                FROM supplier_profiles
                WHERE supplier_profile_id = %s AND user_id = %s
                LIMIT 1
                """,
                [supplier_profile_id, miller_user_id],
            )
            profile_row = cursor.fetchone()
            if not profile_row:
                raise ValueError("Selected branch was not found or does not belong to your account.")

            branch_name = profile_row[1]

            # 2. Check duplicates within the selected branch
            check_duplicate_supplier(
                supplier_profile_id=supplier_profile_id,
                supplier_farm=supplier_farm_clean,
                organization=organization_clean,
                contact_person=contact_person,
                exclude_supplier_id=None,
            )

            # 3. Insert into farmer_contacts
            cursor.execute(
                """
                INSERT INTO farmer_contacts (
                    supplier_profile_id,
                    supplier_farm,
                    organization,
                    contact_person,
                    contact_number,
                    email,
                    address,
                    status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
                """,
                [
                    supplier_profile_id,
                    supplier_farm_clean,
                    organization_clean,
                    contact_person,
                    contact_number,
                    email_clean,
                    address,
                    status_clean,
                ],
            )
            supplier_id = cursor.lastrowid

            return {
                "farmer_contact_id": supplier_id,
                "id": supplier_id,
                "supplier_profile_id": supplier_profile_id,
                "supplier_farm": supplier_farm_clean,
                "organization": organization_clean,
                "contact_person": contact_person,
                "contact_number": contact_number,
                "email": email_clean,
                "address": address,
                "status": status_clean,
                "branch_name": branch_name,
            }


def update_miller_supplier(
    *,
    miller_user_id,
    supplier_id,
    supplier_profile_id=None,
    supplier_farm=None,
    organization=None,
    contact_person,
    contact_number,
    email=None,
    address,
    status="active",
):
    """
    Update an existing supplier in farmer_contacts:
    - Verifies supplier currently belongs to miller_user_id
    - If supplier_profile_id is passed, verifies new branch belongs to miller_user_id
    - Validates required fields
    """
    from .selectors import get_miller_supplier_by_id

    contact_person = (contact_person or "").strip()
    contact_number = (contact_number or "").strip()
    address = (address or "").strip()
    if not address:
        raise ValueError("Address is required.")

    supplier_farm_clean = (supplier_farm or "").strip() or None
    organization_clean = (organization or "").strip() or None
    email_clean = (email or "").strip().lower() or None

    _validate_supplier_fields(
        contact_person=contact_person,
        contact_number=contact_number,
        supplier_farm_clean=supplier_farm_clean,
        organization_clean=organization_clean,
    )

    status_clean = (status or "active").strip().lower()
    if status_clean not in ("active", "inactive"):
        status_clean = "active"

    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. Verify supplier belongs to this Miller
            cursor.execute(
                """
                SELECT fc.farmer_contact_id, fc.supplier_profile_id
                FROM farmer_contacts fc
                INNER JOIN supplier_profiles sp
                    ON sp.supplier_profile_id = fc.supplier_profile_id
                WHERE fc.farmer_contact_id = %s AND sp.user_id = %s
                LIMIT 1
                """,
                [supplier_id, miller_user_id],
            )
            existing = cursor.fetchone()
            if not existing:
                raise ValueError("Supplier not found or access denied.")

            target_profile_id = supplier_profile_id or existing[1]

            # 2. Verify target_profile_id belongs to this Miller
            cursor.execute(
                """
                SELECT supplier_profile_id, business_name
                FROM supplier_profiles
                WHERE supplier_profile_id = %s AND user_id = %s
                LIMIT 1
                """,
                [target_profile_id, miller_user_id],
            )
            profile_row = cursor.fetchone()
            if not profile_row:
                raise ValueError("Selected branch was not found or does not belong to your account.")

            # 3. Check duplicates within the target branch (excluding current record)
            check_duplicate_supplier(
                supplier_profile_id=target_profile_id,
                supplier_farm=supplier_farm_clean,
                organization=organization_clean,
                contact_person=contact_person,
                exclude_supplier_id=supplier_id,
            )

            # 4. Update farmer_contacts
            cursor.execute(
                """
                UPDATE farmer_contacts
                SET
                    supplier_profile_id = %s,
                    supplier_farm = %s,
                    organization = %s,
                    contact_person = %s,
                    contact_number = %s,
                    email = %s,
                    address = %s,
                    status = %s
                WHERE farmer_contact_id = %s
                """,
                [
                    target_profile_id,
                    supplier_farm_clean,
                    organization_clean,
                    contact_person,
                    contact_number,
                    email_clean,
                    address,
                    status_clean,
                    supplier_id,
                ],
            )

    return get_miller_supplier_by_id(miller_user_id, supplier_id)
