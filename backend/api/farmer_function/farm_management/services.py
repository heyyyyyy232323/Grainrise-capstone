from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from .selectors import (
    get_farmer_farm_details,
    get_farmer_owned_farm,
    get_active_crop_cycle,
    get_latest_crop_cycle,
)


# ============================================================
# BUSINESS CONSTANTS & PERMITTED VALUES
# ============================================================

# Valid values constrained by farm_profile CHECK constraint
# `chk_farm_profile_land_ownership`
VALID_LAND_OWNERSHIP_CHOICES = {
    "owned": "Owned",
    "rented/leased": "Rented/Leased",
    "leased": "Rented/Leased",
    "rented": "Rented/Leased",
    "tenant": "Tenant",
    "other": "Other",
}

# Valid values constrained by farm_profile CHECK constraint
# `chk_farm_profile_rice_variety`
VALID_RICE_VARIETIES = {
    "dinorado": "Dinorado",
    "sinandomeng": "Sinandomeng",
    "jasmine rice": "Jasmine Rice",
    "malagkit": "Malagkit",
    "other": "Other",
}

VALID_FARM_STATUSES = {
    "active",
    "inactive",
}

VALID_FAILURE_REASONS = {
    "severe_weather_typhoon",
    "drought_insufficient_water",
    "pest_disease",
    "low_or_failed_yield",
    "other",
}


# ============================================================
# BUSINESS ERROR
# ============================================================

class FarmManagementError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# ============================================================
# HELPERS
# ============================================================

def _text(value, *, required=False, field_name="Field"):
    normalized = str(value or "").strip()
    if required and not normalized:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )
    return normalized


def _farm_name(value):
    normalized = " ".join(str(value or "").split())
    if not normalized:
        return ""
    if len(normalized) > 150:
        raise FarmManagementError(
            "validation_error",
            "Farm name must not exceed 150 characters.",
            400,
        )
    return normalized


def _positive_decimal(value, *, required=False, field_name="Value"):
    if value in (None, ""):
        if required:
            raise FarmManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )
        return None

    try:
        normalized = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} must be a valid number.",
            400,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} must be greater than zero.",
            400,
        )
    return normalized


def _positive_integer(value, *, default=2, field_name="Value"):
    if value in (None, ""):
        return default
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} must be a whole number.",
            400,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} must be greater than zero.",
            400,
        )
    return normalized


def _date(value, *, required=False, field_name="Date"):
    if value in (None, ""):
        if required:
            raise FarmManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )
        return None

    normalized = parse_date(str(value).strip())
    if normalized is None:
        raise FarmManagementError(
            "validation_error",
            f"{field_name} must be a valid date (YYYY-MM-DD).",
            400,
        )
    return normalized


def _normalize_farmer_id(farmer_user_id):
    try:
        normalized = int(farmer_user_id)
    except (TypeError, ValueError) as exc:
        raise FarmManagementError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "authentication_required",
            "Invalid Farmer session.",
            401,
        )
    return normalized


def _normalize_farm_id(farm_id):
    try:
        normalized = int(farm_id)
    except (TypeError, ValueError) as exc:
        raise FarmManagementError(
            "invalid_farm",
            "Invalid farm ID.",
            400,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "invalid_farm",
            "Invalid farm ID.",
            400,
        )
    return normalized


def _normalize_land_ownership(value):
    raw = str(value or "").strip().lower()
    return VALID_LAND_OWNERSHIP_CHOICES.get(raw, "Owned")


def _normalize_rice_variety(value):
    raw = str(value or "").strip().lower()
    return VALID_RICE_VARIETIES.get(raw, "Other")


def _ensure_unique_farm_name(cursor, farmer_id, farm_name, *, exclude_farm_id=None):
    if not farm_name:
        return

    normalized_name = farm_name.strip().lower()

    if exclude_farm_id is None:
        cursor.execute(
            """
            SELECT farm_profile_id
            FROM farm_profile
            WHERE user_id = %s
              AND LOWER(TRIM(farm_lot_name)) = %s
            LIMIT 1
            """,
            [farmer_id, normalized_name],
        )
    else:
        cursor.execute(
            """
            SELECT farm_profile_id
            FROM farm_profile
            WHERE user_id = %s
              AND farm_profile_id <> %s
              AND LOWER(TRIM(farm_lot_name)) = %s
            LIMIT 1
            """,
            [farmer_id, exclude_farm_id, normalized_name],
        )

    if cursor.fetchone():
        raise FarmManagementError(
            "duplicate_farm_name",
            "You already have a farm registered with this name. Please choose a different name.",
            409,
        )


def _record_activity(
    cursor,
    *,
    farmer_user_id,
    farm_id,
    activity_type,
    crop_cycle_id=None,
    rice_variety=None,
    farm_crop_status=None,
    details_remarks=None,
):
    try:
        cursor.execute(
            """
            INSERT INTO existing_grainrise_farmer_farm_activity_logs (
                farm_profile_id,
                crop_cycle_id,
                activity_type,
                crop_status,
                rice_variety,
                details,
                performed_by_user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                farm_id,
                crop_cycle_id,
                activity_type,
                farm_crop_status,
                rice_variety,
                details_remarks,
                farmer_user_id,
            ],
        )
        return cursor.lastrowid
    except Exception:
        # Non-fatal if activity log table is unavailable
        return None


def _lock_owned_farm(cursor, farmer_user_id, farm_id):
    cursor.execute(
        """
        SELECT
            fp.farm_profile_id AS farm_id,
            fp.user_id,
            fp.farm_lot_name AS farm_name,
            LOWER(COALESCE(fs.farm_status, 'Active')) AS farm_status,
            fp.rice_variety_currently_planted AS registered_rice_variety
        FROM farm_profile fp
        LEFT JOIN existing_grainrise_farmer_farm_status fs
            ON fs.farm_profile_id = fp.farm_profile_id
        WHERE fp.farm_profile_id = %s
          AND fp.user_id = %s
        FOR UPDATE
        """,
        [farm_id, farmer_user_id],
    )
    row = cursor.fetchone()
    if not row:
        raise FarmManagementError(
            "farm_not_found",
            "Farm not found or you do not have permission to manage it.",
            404,
        )
    return {
        "farm_id": row[0],
        "user_id": row[1],
        "farm_name": row[2],
        "farm_status": row[3],
        "registered_rice_variety": row[4],
    }


def _require_active_farm(farm):
    if farm.get("farm_status") != "active":
        raise FarmManagementError(
            "farm_inactive",
            "This farm is currently inactive. Reactivate it before managing crop activities.",
            409,
        )


# ============================================================
# ADD FARM
# ============================================================

@transaction.atomic
def add_farm(farmer_user_id, data):
    """
    Register a new farm under the authenticated Farmer account.
    """
    farmer_id = _normalize_farmer_id(farmer_user_id)

    farm_name = _farm_name(
        data.get("farm_name") or data.get("farm_lot_name")
    )

    raw_street = _text(data.get("street_address"))
    raw_barangay = _text(data.get("barangay"))

    # Harmonize street address with barangay for complete address
    if raw_street and raw_barangay:
        if raw_barangay.lower() not in raw_street.lower():
            street_address = f"{raw_street}, Brgy. {raw_barangay}"
        else:
            street_address = raw_street
    elif raw_barangay:
        street_address = f"Brgy. {raw_barangay}"
    else:
        street_address = raw_street or "Farm Lot"

    municipality = _text(
        data.get("municipality"),
        required=True,
        field_name="Municipality / City",
    )

    province = _text(
        data.get("province"),
        required=True,
        field_name="Province",
    )

    postal_code = _text(
        data.get("postal_code") or data.get("postalCode") or "3100",
        required=True,
        field_name="Postal Code",
    )

    total_farm_area = _positive_decimal(
        data.get("total_farm_area") or data.get("total_farm_area_hectares"),
        required=True,
        field_name="Total Farm Area",
    )

    land_ownership_status = _normalize_land_ownership(
        data.get("land_ownership_status")
    )

    raw_variety = data.get("rice_variety_currently_planted") or data.get("rice_variety")
    variety_db_choice = _normalize_rice_variety(raw_variety)

    cropping_cycles_per_year = _positive_integer(
        data.get("cropping_cycles_per_year"),
        default=2,
        field_name="Cropping Cycles per Year",
    )

    rsbsa_number = _text(data.get("rsbsa_number")) or None
    rsbsa_id_document = _text(data.get("rsbsa_id_document")) or None

    with connection.cursor() as cursor:
        # Verify authenticated Farmer is active in users table
        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE user_id = %s
              AND user_role = 'farmer'
              AND status = 'active'
            LIMIT 1
            """,
            [farmer_id],
        )
        if not cursor.fetchone():
            raise FarmManagementError(
                "authentication_required",
                "Farmer account is not active. Please sign in again.",
                401,
            )

        # Check name uniqueness for this farmer
        _ensure_unique_farm_name(cursor, farmer_id, farm_name)

        # Insert farm into farm_profile
        cursor.execute(
            """
            INSERT INTO farm_profile (
                user_id,
                farm_lot_name,
                street_address,
                municipality,
                province,
                postal_code,
                total_farm_area_hectares,
                land_ownership_status,
                rice_variety_currently_planted,
                cropping_cycles_per_year,
                rsbsa_number,
                rsbsa_id_document
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                farmer_id,
                farm_name or None,
                street_address,
                municipality,
                province,
                postal_code,
                total_farm_area,
                land_ownership_status,
                variety_db_choice,
                cropping_cycles_per_year,
                rsbsa_number,
                rsbsa_id_document,
            ],
        )
        new_farm_id = cursor.lastrowid

        # Insert active status
        cursor.execute(
            """
            INSERT INTO existing_grainrise_farmer_farm_status (
                farm_profile_id,
                farm_status
            )
            VALUES (%s, 'Active')
            """,
            [new_farm_id],
        )

        # Activity log
        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=new_farm_id,
            activity_type="farm_added",
            rice_variety=raw_variety or variety_db_choice,
            farm_crop_status="available_for_planting",
            details_remarks=f"Farm registered with {total_farm_area} ha.",
        )

    return get_farmer_farm_details(farmer_id, new_farm_id)


# ============================================================
# EDIT FARM INFORMATION
# ============================================================

@transaction.atomic
def update_farm_information(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    farm_name = _farm_name(
        data.get("farm_name") or data.get("farm_lot_name")
    )

    raw_street = _text(data.get("street_address"))
    raw_barangay = _text(data.get("barangay"))

    if raw_street and raw_barangay:
        if raw_barangay.lower() not in raw_street.lower():
            street_address = f"{raw_street}, Brgy. {raw_barangay}"
        else:
            street_address = raw_street
    elif raw_barangay:
        street_address = f"Brgy. {raw_barangay}"
    else:
        street_address = raw_street or "Farm Lot"

    municipality = _text(
        data.get("municipality"),
        required=True,
        field_name="Municipality / City",
    )

    province = _text(
        data.get("province"),
        required=True,
        field_name="Province",
    )

    postal_code = _text(
        data.get("postal_code") or data.get("postalCode") or "3100",
        required=True,
        field_name="Postal Code",
    )

    total_farm_area = _positive_decimal(
        data.get("total_farm_area") or data.get("total_farm_area_hectares"),
        required=True,
        field_name="Total Farm Area",
    )

    land_ownership_status = _normalize_land_ownership(
        data.get("land_ownership_status")
    )

    cropping_cycles_per_year = _positive_integer(
        data.get("cropping_cycles_per_year"),
        default=2,
        field_name="Cropping Cycles per Year",
    )

    with connection.cursor() as cursor:
        _lock_owned_farm(cursor, farmer_id, normalized_farm_id)
        _ensure_unique_farm_name(
            cursor,
            farmer_id,
            farm_name,
            exclude_farm_id=normalized_farm_id,
        )

        cursor.execute(
            """
            UPDATE farm_profile
            SET
                farm_lot_name = %s,
                street_address = %s,
                municipality = %s,
                province = %s,
                postal_code = %s,
                total_farm_area_hectares = %s,
                land_ownership_status = %s,
                cropping_cycles_per_year = %s
            WHERE farm_profile_id = %s
              AND user_id = %s
            """,
            [
                farm_name or None,
                street_address,
                municipality,
                province,
                postal_code,
                total_farm_area,
                land_ownership_status,
                cropping_cycles_per_year,
                normalized_farm_id,
                farmer_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            activity_type="farm_information_updated",
            details_remarks="Farm information updated.",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


# ============================================================
# FARM STATUS (ACTIVE / INACTIVE)
# ============================================================

@transaction.atomic
def set_farm_status(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    if isinstance(data, dict):
        raw_status = _text(
            data.get("status") or data.get("farm_status"),
            required=True,
            field_name="Farm Status",
        ).lower()
        reason = _text(
            data.get("reason") or data.get("inactive_reason"),
            required=(raw_status == "inactive"),
            field_name="Inactive Reason",
        )
    else:
        raw_status = _text(
            data,
            required=True,
            field_name="Farm Status",
        ).lower()
        reason = "Deactivated by farmer." if raw_status == "inactive" else ""

    if raw_status not in VALID_FARM_STATUSES:
        raise FarmManagementError(
            "validation_error",
            "Farm status must be either 'active' or 'inactive'.",
            400,
        )

    with connection.cursor() as cursor:
        _lock_owned_farm(cursor, farmer_id, normalized_farm_id)

        if raw_status == "inactive":
            now_dt = timezone.now()
            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_farm_status (
                    farm_profile_id,
                    farm_status,
                    inactive_reason,
                    inactive_at
                )
                VALUES (%s, 'Inactive', %s, %s)
                ON DUPLICATE KEY UPDATE
                    farm_status = 'Inactive',
                    inactive_reason = VALUES(inactive_reason),
                    inactive_at = VALUES(inactive_at)
                """,
                [normalized_farm_id, reason, now_dt],
            )
            _record_activity(
                cursor,
                farmer_user_id=farmer_id,
                farm_id=normalized_farm_id,
                activity_type="farm_set_inactive",
                details_remarks=f"Farm deactivated: {reason}",
            )
        else:
            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_farm_status (
                    farm_profile_id,
                    farm_status,
                    inactive_reason,
                    inactive_at
                )
                VALUES (%s, 'Active', NULL, NULL)
                ON DUPLICATE KEY UPDATE
                    farm_status = 'Active',
                    inactive_reason = NULL,
                    inactive_at = NULL
                """,
                [normalized_farm_id],
            )
            _record_activity(
                cursor,
                farmer_user_id=farmer_id,
                farm_id=normalized_farm_id,
                activity_type="farm_reactivated",
                details_remarks="Farm reactivated.",
            )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


# ============================================================
# CROP ACTIONS
# ============================================================

@transaction.atomic
def start_land_preparation(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        farm = _lock_owned_farm(cursor, farmer_id, normalized_farm_id)
        _require_active_farm(farm)

        # Check that no active cycle exists
        active_crop = get_active_crop_cycle(farmer_id, normalized_farm_id)
        if active_crop:
            raise FarmManagementError(
                "active_crop_exists",
                "An ongoing crop cycle already exists for this farm. Complete or record failure first.",
                409,
            )

        # Get next cycle number
        cursor.execute(
            """
            SELECT COALESCE(MAX(cycle_number), 0) + 1
            FROM existing_grainrise_farmer_crop_cycles
            WHERE farm_profile_id = %s
            """,
            [normalized_farm_id],
        )
        next_cycle_number = cursor.fetchone()[0]

        prep_date = _date(
            data.get("land_preparation_date"),
            required=False,
            field_name="Land Preparation Date",
        ) or timezone.now().date()

        rice_variety = _text(
            data.get("rice_variety") or farm.get("registered_rice_variety") or "RC 222 (Tubigan 18)"
        )
        remarks = _text(data.get("remarks") or data.get("notes")) or None

        cursor.execute(
            """
            INSERT INTO existing_grainrise_farmer_crop_cycles (
                farm_profile_id,
                cycle_number,
                rice_variety,
                crop_status,
                land_preparation_date,
                remarks
            )
            VALUES (%s, %s, %s, 'Land Preparation', %s, %s)
            """,
            [
                normalized_farm_id,
                next_cycle_number,
                rice_variety,
                prep_date,
                remarks,
            ],
        )
        new_cycle_id = cursor.lastrowid

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            crop_cycle_id=new_cycle_id,
            activity_type="land_preparation_started",
            rice_variety=rice_variety,
            farm_crop_status="land_preparation",
            details_remarks=remarks or f"Cycle #{next_cycle_number} land preparation started.",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


@transaction.atomic
def record_planting(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    planting_date = _date(
        data.get("planting_date"),
        required=True,
        field_name="Planting Date",
    )
    expected_harvest = _date(
        data.get("expected_harvest_date"),
        required=False,
        field_name="Expected Harvest Date",
    )
    expected_yield = _positive_decimal(
        data.get("expected_yield_kg"),
        required=False,
        field_name="Expected Yield (kg)",
    )
    rice_variety = _text(
        data.get("rice_variety") or data.get("current_rice_variety")
    )
    remarks = _text(data.get("remarks") or data.get("notes")) or None

    with connection.cursor() as cursor:
        farm = _lock_owned_farm(cursor, farmer_id, normalized_farm_id)
        _require_active_farm(farm)

        active_crop = get_active_crop_cycle(farmer_id, normalized_farm_id)

        if active_crop:
            cycle_id = active_crop["crop_cycle_id"]
            variety = rice_variety or active_crop.get("rice_variety") or "RC 222 (Tubigan 18)"
            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_crop_cycles
                SET
                    crop_status = 'Planted and Growing',
                    planting_date = %s,
                    expected_harvest_date = COALESCE(%s, expected_harvest_date),
                    expected_yield_kg = COALESCE(%s, expected_yield_kg),
                    rice_variety = %s,
                    remarks = COALESCE(%s, remarks)
                WHERE crop_cycle_id = %s
                """,
                [
                    planting_date,
                    expected_harvest,
                    expected_yield,
                    variety,
                    remarks,
                    cycle_id,
                ],
            )
        else:
            # Create new cycle directly in 'Planted and Growing'
            cursor.execute(
                """
                SELECT COALESCE(MAX(cycle_number), 0) + 1
                FROM existing_grainrise_farmer_crop_cycles
                WHERE farm_profile_id = %s
                """,
                [normalized_farm_id],
            )
            next_cycle_num = cursor.fetchone()[0]
            variety = rice_variety or farm.get("registered_rice_variety") or "RC 222 (Tubigan 18)"

            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_crop_cycles (
                    farm_profile_id,
                    cycle_number,
                    rice_variety,
                    crop_status,
                    planting_date,
                    expected_harvest_date,
                    expected_yield_kg,
                    remarks
                )
                VALUES (%s, %s, %s, 'Planted and Growing', %s, %s, %s, %s)
                """,
                [
                    normalized_farm_id,
                    next_cycle_num,
                    variety,
                    planting_date,
                    expected_harvest,
                    expected_yield,
                    remarks,
                ],
            )
            cycle_id = cursor.lastrowid

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            crop_cycle_id=cycle_id,
            activity_type="planting_recorded",
            rice_variety=variety,
            farm_crop_status="planted_and_growing",
            details_remarks=remarks or f"Planting recorded for {variety}.",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


@transaction.atomic
def update_current_crop(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    with connection.cursor() as cursor:
        farm = _lock_owned_farm(cursor, farmer_id, normalized_farm_id)
        _require_active_farm(farm)

        active_crop = get_active_crop_cycle(farmer_id, normalized_farm_id)
        if not active_crop:
            raise FarmManagementError(
                "no_active_crop",
                "There is no active crop cycle to update.",
                404,
            )

        cycle_id = active_crop["crop_cycle_id"]
        expected_harvest = _date(
            data.get("expected_harvest_date"),
            required=False,
            field_name="Expected Harvest Date",
        )
        expected_yield = _positive_decimal(
            data.get("expected_yield_kg"),
            required=False,
            field_name="Expected Yield (kg)",
        )
        rice_variety = _text(
            data.get("rice_variety") or data.get("current_rice_variety")
        ) or active_crop.get("rice_variety")
        remarks = _text(data.get("remarks") or data.get("notes")) or None

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_crop_cycles
            SET
                expected_harvest_date = COALESCE(%s, expected_harvest_date),
                expected_yield_kg = COALESCE(%s, expected_yield_kg),
                rice_variety = COALESCE(%s, rice_variety),
                remarks = COALESCE(%s, remarks)
            WHERE crop_cycle_id = %s
            """,
            [
                expected_harvest,
                expected_yield,
                rice_variety,
                remarks,
                cycle_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            crop_cycle_id=cycle_id,
            activity_type="crop_status_updated",
            rice_variety=rice_variety,
            farm_crop_status=active_crop["crop_status"],
            details_remarks=remarks or "Crop information updated.",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


@transaction.atomic
def record_harvest(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    actual_harvest_date = _date(
        data.get("actual_harvest_date"),
        required=True,
        field_name="Actual Harvest Date",
    )
    actual_yield_kg = _positive_decimal(
        data.get("actual_yield_kg"),
        required=True,
        field_name="Actual Yield (kg)",
    )
    remarks = _text(data.get("remarks") or data.get("notes")) or None

    with connection.cursor() as cursor:
        farm = _lock_owned_farm(cursor, farmer_id, normalized_farm_id)
        _require_active_farm(farm)

        active_crop = get_active_crop_cycle(farmer_id, normalized_farm_id)
        if not active_crop:
            raise FarmManagementError(
                "no_active_crop",
                "There is no active crop cycle to record harvest for.",
                404,
            )

        cycle_id = active_crop["crop_cycle_id"]

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_crop_cycles
            SET
                crop_status = 'Harvested',
                actual_harvest_date = %s,
                actual_yield_kg = %s,
                remarks = COALESCE(%s, remarks)
            WHERE crop_cycle_id = %s
            """,
            [
                actual_harvest_date,
                actual_yield_kg,
                remarks,
                cycle_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            crop_cycle_id=cycle_id,
            activity_type="harvest_recorded",
            rice_variety=active_crop.get("rice_variety"),
            farm_crop_status="harvested",
            details_remarks=remarks or f"Harvest completed: {actual_yield_kg} kg.",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)


@transaction.atomic
def record_failed_crop(farmer_user_id, farm_id, data):
    farmer_id = _normalize_farmer_id(farmer_user_id)
    normalized_farm_id = _normalize_farm_id(farm_id)

    failure_reason = _text(
        data.get("failure_reason") or data.get("reason"),
        required=True,
        field_name="Failure Reason",
    )
    remarks = _text(data.get("remarks") or data.get("notes") or data.get("failure_remarks")) or None

    with connection.cursor() as cursor:
        farm = _lock_owned_farm(cursor, farmer_id, normalized_farm_id)

        active_crop = get_active_crop_cycle(farmer_id, normalized_farm_id)
        if not active_crop:
            raise FarmManagementError(
                "no_active_crop",
                "There is no active crop cycle to mark as failed.",
                404,
            )

        cycle_id = active_crop["crop_cycle_id"]

        cursor.execute(
            """
            UPDATE existing_grainrise_farmer_crop_cycles
            SET
                crop_status = 'Failed Crop',
                failure_reason = %s,
                remarks = COALESCE(%s, remarks)
            WHERE crop_cycle_id = %s
            """,
            [
                failure_reason,
                remarks,
                cycle_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=farmer_id,
            farm_id=normalized_farm_id,
            crop_cycle_id=cycle_id,
            activity_type="failed_crop_recorded",
            rice_variety=active_crop.get("rice_variety"),
            farm_crop_status="failed_crop",
            details_remarks=remarks or f"Crop failed: {failure_reason}",
        )

    return get_farmer_farm_details(farmer_id, normalized_farm_id)
