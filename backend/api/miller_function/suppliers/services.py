from django.db import connection, transaction


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
    if not contact_person:
        raise ValueError("Contact person is required.")

    contact_number = (contact_number or "").strip()
    if not contact_number:
        raise ValueError("Contact number is required.")

    address = (address or "").strip()
    if not address:
        raise ValueError("Address is required.")

    supplier_farm_clean = (supplier_farm or "").strip() or None
    organization_clean = (organization or "").strip() or None
    email_clean = (email or "").strip().lower() or None

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

            # 2. Insert into farmer_contacts
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
    if not contact_person:
        raise ValueError("Contact person is required.")

    contact_number = (contact_number or "").strip()
    if not contact_number:
        raise ValueError("Contact number is required.")

    address = (address or "").strip()
    if not address:
        raise ValueError("Address is required.")

    supplier_farm_clean = (supplier_farm or "").strip() or None
    organization_clean = (organization or "").strip() or None
    email_clean = (email or "").strip().lower() or None

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

            # 3. Update farmer_contacts
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
