from decimal import Decimal, InvalidOperation
from django.db import connection, transaction

from .selectors import get_manager_fare_policy


class FareFeeValidationError(Exception):
    """Raised when fare fee input validation fails."""
    pass


class BranchAccessDeniedError(Exception):
    """Raised when a specified branch is not owned by the authenticated Miller Manager."""
    pass


class FareFeeNotFoundError(Exception):
    """Raised when a fare fee policy cannot be found or is not owned by the Miller Manager."""
    pass


def _clean_numeric_field(val, field_name):
    """
    Validate and return non-negative Decimal value.
    """
    if val is None or val == "":
        raise FareFeeValidationError(f"{field_name} is required.")
    try:
        dec = Decimal(str(val).strip())
    except (InvalidOperation, TypeError, ValueError):
        raise FareFeeValidationError(f"{field_name} must be a valid number.")

    if dec < Decimal("0"):
        raise FareFeeValidationError(f"{field_name} cannot be negative.")

    return dec


def _validate_manager_branches(miller_user_id, branch_ids):
    """
    Validate that all given branch_ids are integers, deduplicate them,
    and verify that all of them belong to the authenticated Miller Manager.
    """
    if not branch_ids or not isinstance(branch_ids, (list, tuple)):
        raise FareFeeValidationError("At least one applicable branch must be selected.")

    cleaned_branch_ids = []
    for bid in branch_ids:
        try:
            cleaned_branch_ids.append(int(bid))
        except (TypeError, ValueError):
            raise FareFeeValidationError(f"Invalid branch ID: {bid}")

    # Deduplicate while preserving order
    dedup_ids = list(dict.fromkeys(cleaned_branch_ids))

    if not dedup_ids:
        raise FareFeeValidationError("At least one applicable branch must be selected.")

    # Check ownership in supplier_profiles
    with connection.cursor() as cursor:
        placeholders = ",".join(["%s"] * len(dedup_ids))
        cursor.execute(
            f"""
            SELECT supplier_profile_id
            FROM supplier_profiles
            WHERE user_id = %s
              AND supplier_profile_id IN ({placeholders})
            """,
            [miller_user_id, *dedup_ids],
        )
        owned_rows = cursor.fetchall()

    owned_ids = {row[0] for row in owned_rows}
    unauthorized = [bid for bid in dedup_ids if bid not in owned_ids]

    if unauthorized:
        raise BranchAccessDeniedError("One or more selected branches do not belong to your account.")

    return dedup_ids


def create_fare_policy(miller_user_id, data):
    """
    Create a new fare policy in miller_fare_fee_management and its branch associations
    in miller_fare_fee_management_effective_branches atomically.
    """
    rate_name = str(data.get("rate_name") or "").strip()
    if not rate_name:
        raise FareFeeValidationError("Rate Name is required.")
    if len(rate_name) > 20:
        raise FareFeeValidationError("Rate Name cannot exceed 20 characters.")

    description = str(data.get("description") or "").strip()
    if len(description) > 50:
        raise FareFeeValidationError("Description cannot exceed 50 characters.")

    free_delivery_distance = _clean_numeric_field(
        data.get("free_delivery_distance"), "Free Delivery Distance"
    )
    base_fee = _clean_numeric_field(
        data.get("base_fee"), "Base Fee"
    )
    additional_fee = _clean_numeric_field(
        data.get("additional_fee_per_kilometers"), "Additional Fee per km"
    )

    branch_ids = _validate_manager_branches(miller_user_id, data.get("branch_ids"))

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO miller_fare_fee_management (
                    set_by,
                    rate_name,
                    description,
                    free_delivery_distance,
                    base_fee,
                    additional_fee_per_kilometers,
                    status,
                    archive_reason,
                    created_at,
                    updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, 'active', NULL, NOW(), NOW()
                )
                """,
                [
                    miller_user_id,
                    rate_name,
                    description or None,
                    free_delivery_distance,
                    base_fee,
                    additional_fee,
                ],
            )
            fare_fee_id = cursor.lastrowid

            for branch_id in branch_ids:
                cursor.execute(
                    """
                    INSERT INTO miller_fare_fee_management_effective_branches (
                        fare_fee_id,
                        supplier_profile_id,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, NOW(), NOW()
                    )
                    """,
                    [fare_fee_id, branch_id],
                )

    return get_manager_fare_policy(miller_user_id, fare_fee_id)


def update_fare_policy(miller_user_id, fare_fee_id, data):
    """
    Update an existing fare policy in miller_fare_fee_management and sync its branch
    assignments in miller_fare_fee_management_effective_branches atomically.
    """
    # Verify policy ownership
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT fare_fee_id, status, archive_reason
            FROM miller_fare_fee_management
            WHERE fare_fee_id = %s
              AND set_by = %s
            LIMIT 1
            """,
            [fare_fee_id, miller_user_id],
        )
        existing = cursor.fetchone()

    if not existing:
        raise FareFeeNotFoundError("Fare policy not found or access denied.")

    rate_name = str(data.get("rate_name") or "").strip()
    if not rate_name:
        raise FareFeeValidationError("Rate Name is required.")
    if len(rate_name) > 20:
        raise FareFeeValidationError("Rate Name cannot exceed 20 characters.")

    description = str(data.get("description") or "").strip()
    if len(description) > 50:
        raise FareFeeValidationError("Description cannot exceed 50 characters.")

    free_delivery_distance = _clean_numeric_field(
        data.get("free_delivery_distance"), "Free Delivery Distance"
    )
    base_fee = _clean_numeric_field(
        data.get("base_fee"), "Base Fee"
    )
    additional_fee = _clean_numeric_field(
        data.get("additional_fee_per_kilometers"), "Additional Fee per km"
    )

    # Status handling (active or archived)
    raw_status = str(data.get("status") or "active").strip().lower()
    if raw_status in ("archive", "archived"):
        status = "archived"
        archive_reason = str(data.get("archive_reason") or "").strip()
        if not archive_reason:
            raise FareFeeValidationError("Archive Reason is required when archiving a fare policy.")
    elif raw_status == "active":
        status = "active"
        archive_reason = None
    else:
        raise FareFeeValidationError("Status must be either 'Active' or 'Archive'.")

    branch_ids = _validate_manager_branches(miller_user_id, data.get("branch_ids"))

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_fare_fee_management
                SET
                    rate_name = %s,
                    description = %s,
                    free_delivery_distance = %s,
                    base_fee = %s,
                    additional_fee_per_kilometers = %s,
                    status = %s,
                    archive_reason = %s,
                    updated_at = NOW()
                WHERE fare_fee_id = %s
                  AND set_by = %s
                """,
                [
                    rate_name,
                    description or None,
                    free_delivery_distance,
                    base_fee,
                    additional_fee,
                    status,
                    archive_reason,
                    fare_fee_id,
                    miller_user_id,
                ],
            )

            # Re-sync effective branches atomically
            cursor.execute(
                """
                DELETE FROM miller_fare_fee_management_effective_branches
                WHERE fare_fee_id = %s
                """,
                [fare_fee_id],
            )

            for branch_id in branch_ids:
                cursor.execute(
                    """
                    INSERT INTO miller_fare_fee_management_effective_branches (
                        fare_fee_id,
                        supplier_profile_id,
                        created_at,
                        updated_at
                    ) VALUES (
                        %s, %s, NOW(), NOW()
                    )
                    """,
                    [fare_fee_id, branch_id],
                )

    return get_manager_fare_policy(miller_user_id, fare_fee_id)

