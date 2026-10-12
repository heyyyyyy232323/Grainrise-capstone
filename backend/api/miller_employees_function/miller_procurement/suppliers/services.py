from django.db import connection, transaction
from api.miller_function.suppliers.services import (
    _validate_supplier_fields,
    check_duplicate_supplier,
)
from .selectors import get_procurement_supplier_detail


def update_procurement_supplier(
    *,
    supplier_profile_id,
    supplier_id,
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
    - Scoped strictly to the employee's branch (supplier_profile_id)
    - Validates required fields, lengths, phone format
    - Validates duplicate farm name, organization, contact person within the branch
    """
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
            # 1. Verify supplier belongs to this branch
            cursor.execute(
                """
                SELECT farmer_contact_id
                FROM farmer_contacts
                WHERE farmer_contact_id = %s AND supplier_profile_id = %s
                LIMIT 1
                """,
                [supplier_id, supplier_profile_id],
            )
            existing = cursor.fetchone()
            if not existing:
                raise ValueError("Supplier not found or access denied.")

            # 2. Check duplicates within the branch excluding current supplier
            check_duplicate_supplier(
                supplier_profile_id=supplier_profile_id,
                supplier_farm=supplier_farm_clean,
                organization=organization_clean,
                contact_person=contact_person,
                exclude_supplier_id=supplier_id,
            )

            # 3. Update farmer_contacts
            cursor.execute(
                """
                UPDATE farmer_contacts
                SET
                    supplier_farm = %s,
                    organization = %s,
                    contact_person = %s,
                    contact_number = %s,
                    email = %s,
                    address = %s,
                    status = %s
                WHERE farmer_contact_id = %s AND supplier_profile_id = %s
                """,
                [
                    supplier_farm_clean,
                    organization_clean,
                    contact_person,
                    contact_number,
                    email_clean,
                    address,
                    status_clean,
                    supplier_id,
                    supplier_profile_id,
                ],
            )

    return get_procurement_supplier_detail(supplier_profile_id, supplier_id)

