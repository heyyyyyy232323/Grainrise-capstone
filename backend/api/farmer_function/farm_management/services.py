from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from django.utils.dateparse import parse_date

from .selectors import (
    get_farmer_farm_details,
)


# ============================================================
# BUSINESS CONSTANTS
# ============================================================

VALID_LAND_OWNERSHIP = {
    "owned",
    "leased",
    "tenant",
    "shared",
    "other",
}


VALID_FARM_STATUS = {
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


VALID_PRODUCT_TYPES = {
    "unmilled_palay",
    "milled_rice",
}


# ============================================================
# BUSINESS ERROR
# ============================================================

class FarmManagementError(Exception):
    """
    Controlled business error for Farm Management.

    code:
        Stable backend identifier.

    message:
        Human-readable message for frontend use.

    status:
        Suggested HTTP status for views.py.
    """

    def __init__(
        self,
        code,
        message,
        status=400,
    ):
        super().__init__(
            message
        )

        self.code = code
        self.message = message
        self.status = status


# ============================================================
# NORMALIZATION / VALIDATION HELPERS
# ============================================================

def _text(
    value,
    *,
    required=False,
    field_name="Field",
):
    normalized = str(
        value or ""
    ).strip()

    if (
        required
        and not normalized
    ):
        raise FarmManagementError(
            "validation_error",
            f"{field_name} is required.",
            400,
        )

    return normalized


def _farm_name(
    value,
):
    """
    Farm Name is optional.

    When supplied:
    - trim outer spaces
    - collapse repeated spaces
    - maximum 150 characters

    Examples treated as the same name:

        North Rice Farm
        north rice farm
        North   Rice   Farm
    """

    normalized = " ".join(
        str(
            value or ""
        ).split()
    )

    if not normalized:
        return ""

    if len(normalized) > 150:
        raise FarmManagementError(
            "validation_error",
            (
                "Farm name must not exceed "
                "150 characters."
            ),
            400,
        )

    return normalized


def _positive_decimal(
    value,
    *,
    required=False,
    field_name="Value",
):
    if value in (
        None,
        "",
    ):
        if required:
            raise FarmManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )

        return None

    try:
        normalized = Decimal(
            str(
                value
            )
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise FarmManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "a valid number."
            ),
            400,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "greater than zero."
            ),
            400,
        )

    return normalized


def _positive_integer(
    value,
    *,
    field_name="Value",
):
    try:
        normalized = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise FarmManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "a whole number."
            ),
            400,
        ) from exc

    if normalized <= 0:
        raise FarmManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "greater than zero."
            ),
            400,
        )

    return normalized


def _date(
    value,
    *,
    required=False,
    field_name="Date",
):
    if value in (
        None,
        "",
    ):
        if required:
            raise FarmManagementError(
                "validation_error",
                f"{field_name} is required.",
                400,
            )

        return None

    normalized = parse_date(
        str(
            value
        ).strip()
    )

    if normalized is None:
        raise FarmManagementError(
            "validation_error",
            (
                f"{field_name} must be "
                "a valid date."
            ),
            400,
        )

    return normalized


def _normalize_farmer_id(
    farmer_user_id,
):
    try:
        normalized = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
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


def _normalize_farm_id(
    farm_id,
):
    try:
        normalized = int(
            farm_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
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


# ============================================================
# UNIQUE FARM NAME
# ============================================================

def _ensure_unique_farm_name(
    cursor,
    farm_name,
    *,
    exclude_farm_id=None,
):
    """
    GrainRise rule:

    If a Farm / Farm Lot Name is supplied,
    it must be globally unique.

    Comparison is:
    - case-insensitive
    - repeated-whitespace-insensitive

    The advisory transaction lock reduces the chance that
    simultaneous requests create the same normalized farm name.
    """

    if not farm_name:
        return

    normalized_name = (
        farm_name.lower()
    )

    cursor.execute(
        """
        SELECT pg_advisory_xact_lock(
            hashtext(%s)
        )
        """,
        [
            normalized_name,
        ],
    )

    if (
        exclude_farm_id
        is None
    ):
        cursor.execute(
            """
            SELECT
                farm_id
            FROM farmer_farms
            WHERE farm_name IS NOT NULL
              AND LOWER(
                    REGEXP_REPLACE(
                        TRIM(farm_name),
                        '[[:space:]]+',
                        ' ',
                        'g'
                    )
                  ) = %s
            LIMIT 1
            """,
            [
                normalized_name,
            ],
        )

    else:
        cursor.execute(
            """
            SELECT
                farm_id
            FROM farmer_farms
            WHERE farm_name IS NOT NULL
              AND farm_id <> %s
              AND LOWER(
                    REGEXP_REPLACE(
                        TRIM(farm_name),
                        '[[:space:]]+',
                        ' ',
                        'g'
                    )
                  ) = %s
            LIMIT 1
            """,
            [
                exclude_farm_id,
                normalized_name,
            ],
        )

    if cursor.fetchone():
        raise FarmManagementError(
            "duplicate_farm_name",
            (
                "This farm name is already in use. "
                "Please choose a different farm name."
            ),
            409,
        )


# ============================================================
# PRODUCT CODE
# ============================================================

def _build_harvest_product_code(
    crop_cycle_id,
):
    """
    System-generated Inventory Product Code.

    crop_cycle_id is globally unique, so it gives the
    harvested product a stable traceable code.

    Example:
        FRM-HRV-00000042
    """

    return (
        "FRM-HRV-"
        f"{int(crop_cycle_id):08d}"
    )


# ============================================================
# SECURE FARM OWNERSHIP LOCK
# ============================================================

def _lock_owned_farm(
    cursor,
    farmer_user_id,
    farm_id,
):
    """
    Lock and return one farm only when it belongs to
    the authenticated Farmer.

    farmer_user_id MUST come from the verified JWT Farmer guard.
    """

    cursor.execute(
        """
        SELECT
            farm_id,
            user_id,
            farm_name,
            farm_status,
            rice_variety_currently_planted
        FROM farmer_farms
        WHERE farm_id = %s
          AND user_id = %s
        FOR UPDATE
        """,
        [
            farm_id,
            farmer_user_id,
        ],
    )

    row = cursor.fetchone()

    if not row:
        raise FarmManagementError(
            "farm_not_found",
            "Farm not found.",
            404,
        )

    return {
        "farm_id":
            row[0],

        "user_id":
            row[1],

        "farm_name":
            row[2],

        "farm_status":
            row[3],

        "registered_rice_variety":
            row[4],
    }


def _require_active_farm(
    farm,
):
    if (
        farm["farm_status"]
        != "active"
    ):
        raise FarmManagementError(
            "farm_inactive",
            (
                "This farm is inactive. "
                "Reactivate it before managing its crop."
            ),
            409,
        )


# ============================================================
# FARM ACTIVITY LOG WRITER
# ============================================================

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
    """
    performed_by_user_id is always derived from the
    authenticated Farmer session.
    """

    cursor.execute(
        """
        INSERT INTO farmer_farm_activity_logs (
            farm_id,
            crop_cycle_id,
            activity_type,
            rice_variety,
            farm_crop_status,
            details_remarks,
            performed_by_user_id
        )
        VALUES (
            %s,
            %s,
            %s,
            %s,
            %s,
            %s,
            %s
        )
        RETURNING farm_activity_id
        """,
        [
            farm_id,
            crop_cycle_id,
            activity_type,
            rice_variety,
            farm_crop_status,
            details_remarks,
            farmer_user_id,
        ],
    )

    return (
        cursor.fetchone()[0]
    )


# ============================================================
# ADD FARM
# ============================================================

@transaction.atomic
def add_farm(
    farmer_user_id,
    data,
):
    """
    Add New Farm.

    Ownership comes only from authenticated Farmer JWT.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    farm_name = _farm_name(
        data.get(
            "farm_name"
        )
    )

    street_address = _text(
        data.get(
            "street_address"
        ),
        required=True,
        field_name="Farm address",
    )

    municipality = _text(
        data.get(
            "municipality"
        ),
        required=True,
        field_name=(
            "City / Municipality"
        ),
    )

    province = _text(
        data.get(
            "province"
        ),
        required=True,
        field_name="Province",
    )

    postal_code = _text(
        data.get(
            "postal_code"
        ),
    )

    barangay = _text(
        data.get(
            "barangay"
        ),
        required=True,
        field_name="Barangay",
    )

    total_farm_area = (
        _positive_decimal(
            data.get(
                "total_farm_area"
            ),
            required=True,
            field_name=(
                "Total Farm Area"
            ),
        )
    )

    land_ownership_status = (
        _text(
            data.get(
                "land_ownership_status"
            ),
            required=True,
            field_name=(
                "Land Ownership Status"
            ),
        ).lower()
    )

    if (
        land_ownership_status
        not in VALID_LAND_OWNERSHIP
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Invalid land ownership "
                "status."
            ),
            400,
        )

    rice_variety = _text(
        data.get(
            "rice_variety_currently_planted"
        ),
        required=True,
        field_name=(
            "Rice Variety Currently Planted"
        ),
    )

    cropping_cycles_per_year = (
        _positive_integer(
            data.get(
                "cropping_cycles_per_year"
            ),
            field_name=(
                "Number of Cropping Cycles per Year"
            ),
        )
    )

    with connection.cursor() as cursor:

        # ----------------------------------------------------
        # RE-CHECK ACTIVE FARMER ACCOUNT
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT 1
            FROM users
            WHERE user_id = %s
              AND user_role::text = 'farmer'
              AND status::text = 'active'
            LIMIT 1
            """,
            [
                farmer_id,
            ],
        )

        if not cursor.fetchone():
            raise FarmManagementError(
                "authentication_required",
                (
                    "Farmer account is not active. "
                    "Please sign in again."
                ),
                401,
            )

        # ----------------------------------------------------
        # GLOBAL FARM NAME UNIQUENESS
        # ----------------------------------------------------

        _ensure_unique_farm_name(
            cursor,
            farm_name,
        )

        # ----------------------------------------------------
        # CREATE FARM
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO farmer_farms (
                user_id,
                farm_name,
                province,
                municipality,
                postal_code,
                barangay,
                street_address,
                total_farm_area,
                land_ownership_status,
                rice_variety_currently_planted,
                cropping_cycles_per_year,
                farm_status,
                created_at,
                updated_at
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'active',
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING farm_id
            """,
            [
                farmer_id,
                farm_name or None,
                province,
                municipality,
                postal_code or None,
                barangay,
                street_address,
                total_farm_area,
                land_ownership_status,
                rice_variety,
                cropping_cycles_per_year,
            ],
        )

        farm_id = (
            cursor.fetchone()[0]
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=farm_id,
            activity_type=(
                "farm_added"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "available_for_planting"
            ),
            details_remarks=(
                "Farm record added."
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        farm_id,
    )


# ============================================================
# EDIT FARM INFORMATION
# ============================================================

@transaction.atomic
def update_farm_information(
    farmer_user_id,
    farm_id,
    data,
):
    """
    Edit Farm Information.

    Crop-cycle information is intentionally excluded.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    farm_name = _farm_name(
        data.get(
            "farm_name"
        )
    )

    street_address = _text(
        data.get(
            "street_address"
        ),
        required=True,
        field_name="Farm address",
    )

    municipality = _text(
        data.get(
            "municipality"
        ),
        required=True,
        field_name=(
            "City / Municipality"
        ),
    )

    province = _text(
        data.get(
            "province"
        ),
        required=True,
        field_name="Province",
    )

    postal_code = _text(
        data.get(
            "postal_code"
        ),
    )

    barangay = _text(
        data.get(
            "barangay"
        ),
        required=True,
        field_name="Barangay",
    )

    total_farm_area = (
        _positive_decimal(
            data.get(
                "total_farm_area"
            ),
            required=True,
            field_name=(
                "Total Farm Area"
            ),
        )
    )

    land_ownership_status = (
        _text(
            data.get(
                "land_ownership_status"
            ),
            required=True,
            field_name=(
                "Land Ownership Status"
            ),
        ).lower()
    )

    if (
        land_ownership_status
        not in VALID_LAND_OWNERSHIP
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Invalid land ownership "
                "status."
            ),
            400,
        )

    cropping_cycles_per_year = (
        _positive_integer(
            data.get(
                "cropping_cycles_per_year"
            ),
            field_name=(
                "Number of Cropping Cycles per Year"
            ),
        )
    )

    with connection.cursor() as cursor:

        _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _ensure_unique_farm_name(
            cursor,
            farm_name,
            exclude_farm_id=(
                normalized_farm_id
            ),
        )

        cursor.execute(
            """
            UPDATE farmer_farms
            SET
                farm_name = %s,
                street_address = %s,
                barangay = %s,
                municipality = %s,
                province = %s,
                postal_code = %s,
                total_farm_area = %s,
                land_ownership_status = %s,
                cropping_cycles_per_year = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_id = %s
              AND user_id = %s
            """,
            [
                farm_name or None,
                street_address,
                barangay,
                municipality,
                province,
                postal_code or None,
                total_farm_area,
                land_ownership_status,
                cropping_cycles_per_year,
                normalized_farm_id,
                farmer_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            activity_type=(
                "farm_information_updated"
            ),
            details_remarks=(
                "Farm information updated."
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# SET FARM ACTIVE / INACTIVE
# ============================================================

@transaction.atomic
def set_farm_status(
    farmer_user_id,
    farm_id,
    new_status,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    normalized_status = (
        _text(
            new_status,
            required=True,
            field_name="Farm Status",
        ).lower()
    )

    if (
        normalized_status
        not in VALID_FARM_STATUS
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Farm status must be "
                "active or inactive."
            ),
            400,
        )

    with connection.cursor() as cursor:

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        if (
            farm["farm_status"]
            == normalized_status
        ):
            return (
                get_farmer_farm_details(
                    farmer_id,
                    normalized_farm_id,
                )
            )

        if (
            normalized_status
            == "inactive"
        ):
            cursor.execute(
                """
                SELECT 1
                FROM farmer_crop_cycles
                WHERE farm_id = %s
                  AND crop_status IN (
                      'land_preparation',
                      'planted_and_growing'
                  )
                LIMIT 1
                """,
                [
                    normalized_farm_id,
                ],
            )

            if cursor.fetchone():
                raise FarmManagementError(
                    "active_crop_exists",
                    (
                        "This farm has an ongoing crop cycle. "
                        "Complete or record the crop outcome "
                        "before setting the farm inactive."
                    ),
                    409,
                )

        cursor.execute(
            """
            UPDATE farmer_farms
            SET
                farm_status = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_id = %s
              AND user_id = %s
            """,
            [
                normalized_status,
                normalized_farm_id,
                farmer_id,
            ],
        )

        if (
            normalized_status
            == "inactive"
        ):
            activity_type = (
                "farm_set_inactive"
            )

            details = (
                "Farm status changed to inactive."
            )

        else:
            activity_type = (
                "farm_reactivated"
            )

            details = (
                "Farm status changed to active."
            )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            activity_type=(
                activity_type
            ),
            details_remarks=(
                details
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# START LAND PREPARATION
# ============================================================

@transaction.atomic
def start_land_preparation(
    farmer_user_id,
    farm_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    land_preparation_date = _date(
        data.get(
            "land_preparation_date"
        ),
        required=True,
        field_name=(
            "Land Preparation Date"
        ),
    )

    with connection.cursor() as cursor:

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _require_active_farm(
            farm
        )

        cursor.execute(
            """
            SELECT
                crop_cycle_id
            FROM farmer_crop_cycles
            WHERE farm_id = %s
              AND crop_status IN (
                  'land_preparation',
                  'planted_and_growing'
              )
            LIMIT 1
            FOR UPDATE
            """,
            [
                normalized_farm_id,
            ],
        )

        if cursor.fetchone():
            raise FarmManagementError(
                "active_crop_exists",
                (
                    "This farm already has an "
                    "ongoing cropping cycle."
                ),
                409,
            )

        cursor.execute(
            """
            INSERT INTO farmer_crop_cycles (
                farm_id,
                rice_variety,
                crop_status,
                land_preparation_date,
                created_at,
                updated_at
            )
            VALUES (
                %s,
                NULL,
                'land_preparation',
                %s,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING crop_cycle_id
            """,
            [
                normalized_farm_id,
                land_preparation_date,
            ],
        )

        crop_cycle_id = (
            cursor.fetchone()[0]
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "land_preparation_started"
            ),
            farm_crop_status=(
                "land_preparation"
            ),
            details_remarks=(
                "Land preparation started."
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# RECORD PLANTING
# ============================================================

@transaction.atomic
def record_planting(
    farmer_user_id,
    farm_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    rice_variety = _text(
        data.get(
            "rice_variety"
        ),
        required=True,
        field_name="Rice Variety",
    )

    planting_date = _date(
        data.get(
            "planting_date"
        ),
        required=True,
        field_name="Planting Date",
    )

    expected_harvest_date = (
        _date(
            data.get(
                "expected_harvest_date"
            ),
            required=True,
            field_name=(
                "Expected Harvest Date"
            ),
        )
    )

    expected_yield = (
        _positive_decimal(
            data.get(
                "expected_yield_kg"
            ),
            required=False,
            field_name=(
                "Expected Yield"
            ),
        )
    )

    if (
        expected_harvest_date
        < planting_date
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Expected Harvest Date cannot "
                "be earlier than Planting Date."
            ),
            400,
        )

    with connection.cursor() as cursor:

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _require_active_farm(
            farm
        )

        cursor.execute(
            """
            SELECT
                crop_cycle_id,
                land_preparation_date
            FROM farmer_crop_cycles
            WHERE farm_id = %s
              AND crop_status =
                  'land_preparation'
            ORDER BY
                created_at DESC,
                crop_cycle_id DESC
            LIMIT 1
            FOR UPDATE
            """,
            [
                normalized_farm_id,
            ],
        )

        row = cursor.fetchone()

        if not row:
            raise FarmManagementError(
                "invalid_crop_state",
                (
                    "Start Land Preparation before "
                    "recording planting."
                ),
                409,
            )

        crop_cycle_id = row[0]

        land_preparation_date = (
            row[1]
        )

        if (
            land_preparation_date
            and planting_date
            < land_preparation_date
        ):
            raise FarmManagementError(
                "validation_error",
                (
                    "Planting Date cannot be earlier "
                    "than Land Preparation Date."
                ),
                400,
            )

        cursor.execute(
            """
            UPDATE farmer_crop_cycles
            SET
                rice_variety = %s,
                crop_status =
                    'planted_and_growing',
                planting_date = %s,
                expected_harvest_date = %s,
                expected_yield_kg = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE crop_cycle_id = %s
              AND farm_id = %s
            """,
            [
                rice_variety,
                planting_date,
                expected_harvest_date,
                expected_yield,
                crop_cycle_id,
                normalized_farm_id,
            ],
        )

        cursor.execute(
            """
            UPDATE farmer_farms
            SET
                rice_variety_currently_planted = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE farm_id = %s
              AND user_id = %s
            """,
            [
                rice_variety,
                normalized_farm_id,
                farmer_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "planting_recorded"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "planted_and_growing"
            ),
            details_remarks=(
                f"Planting recorded for "
                f"{rice_variety}."
            ),
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "crop_status_updated"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "planted_and_growing"
            ),
            details_remarks=(
                "Crop status updated to "
                "Planted and Growing."
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# UPDATE CURRENT CROP
# ============================================================

@transaction.atomic
def update_current_crop(
    farmer_user_id,
    farm_id,
    data,
):
    """
    Normal Update Crop action only.

    This does NOT mark the crop Harvested.

    Supported fields:
    - Expected Harvest Date
    - Expected Yield
    - Crop Update / Remarks
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    expected_harvest_raw = (
        data.get(
            "expected_harvest_date"
        )
    )

    expected_yield_raw = (
        data.get(
            "expected_yield_kg"
        )
    )

    remarks = _text(
        data.get(
            "remarks"
        ),
    )

    expected_harvest_date = (
        _date(
            expected_harvest_raw,
            required=False,
            field_name=(
                "Expected Harvest Date"
            ),
        )
        if expected_harvest_raw
        not in (
            None,
            "",
        )
        else None
    )

    expected_yield = (
        _positive_decimal(
            expected_yield_raw,
            required=False,
            field_name=(
                "Expected Yield"
            ),
        )
        if expected_yield_raw
        not in (
            None,
            "",
        )
        else None
    )

    if (
        expected_harvest_date
        is None
        and expected_yield
        is None
        and not remarks
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Provide at least one crop "
                "update before saving."
            ),
            400,
        )

    with connection.cursor() as cursor:

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _require_active_farm(
            farm
        )

        cursor.execute(
            """
            SELECT
                crop_cycle_id,
                rice_variety,
                planting_date,
                expected_harvest_date,
                expected_yield_kg
            FROM farmer_crop_cycles
            WHERE farm_id = %s
              AND crop_status =
                  'planted_and_growing'
            ORDER BY
                created_at DESC,
                crop_cycle_id DESC
            LIMIT 1
            FOR UPDATE
            """,
            [
                normalized_farm_id,
            ],
        )

        row = cursor.fetchone()

        if not row:
            raise FarmManagementError(
                "invalid_crop_state",
                (
                    "There is no Planted and Growing "
                    "crop to update."
                ),
                409,
            )

        crop_cycle_id = (
            row[0]
        )

        rice_variety = (
            row[1]
        )

        planting_date = (
            row[2]
        )

        old_expected_harvest = (
            row[3]
        )

        old_expected_yield = (
            row[4]
        )

        new_expected_harvest = (
            expected_harvest_date
            if expected_harvest_date
            is not None
            else old_expected_harvest
        )

        new_expected_yield = (
            expected_yield
            if expected_yield
            is not None
            else old_expected_yield
        )

        if (
            new_expected_harvest
            and planting_date
            and new_expected_harvest
            < planting_date
        ):
            raise FarmManagementError(
                "validation_error",
                (
                    "Expected Harvest Date cannot "
                    "be earlier than Planting Date."
                ),
                400,
            )

        cursor.execute(
            """
            UPDATE farmer_crop_cycles
            SET
                expected_harvest_date = %s,
                expected_yield_kg = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE crop_cycle_id = %s
              AND farm_id = %s
            """,
            [
                new_expected_harvest,
                new_expected_yield,
                crop_cycle_id,
                normalized_farm_id,
            ],
        )

        if (
            expected_harvest_date
            is not None
            and expected_harvest_date
            != old_expected_harvest
        ):
            _record_activity(
                cursor,
                farmer_user_id=(
                    farmer_id
                ),
                farm_id=(
                    normalized_farm_id
                ),
                crop_cycle_id=(
                    crop_cycle_id
                ),
                activity_type=(
                    "expected_harvest_updated"
                ),
                rice_variety=(
                    rice_variety
                ),
                farm_crop_status=(
                    "planted_and_growing"
                ),
                details_remarks=(
                    "Expected harvest date updated."
                ),
            )

        if (
            expected_yield
            is not None
            or remarks
        ):
            details = (
                remarks
                or (
                    "Current crop information "
                    "updated."
                )
            )

            _record_activity(
                cursor,
                farmer_user_id=(
                    farmer_id
                ),
                farm_id=(
                    normalized_farm_id
                ),
                crop_cycle_id=(
                    crop_cycle_id
                ),
                activity_type=(
                    "crop_status_updated"
                ),
                rice_variety=(
                    rice_variety
                ),
                farm_crop_status=(
                    "planted_and_growing"
                ),
                details_remarks=(
                    details
                ),
            )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# RECORD FAILED CROP
# ============================================================

@transaction.atomic
def record_failed_crop(
    farmer_user_id,
    farm_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )

    failure_reason = (
        _text(
            data.get(
                "failure_reason"
            ),
            required=True,
            field_name=(
                "Failure Reason"
            ),
        ).lower()
    )

    if (
        failure_reason
        not in VALID_FAILURE_REASONS
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Please select a valid "
                "failure reason."
            ),
            400,
        )

    remarks = _text(
        data.get(
            "additional_remarks"
        ),
    )

    with connection.cursor() as cursor:

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _require_active_farm(
            farm
        )

        cursor.execute(
            """
            SELECT
                crop_cycle_id,
                rice_variety,
                crop_status
            FROM farmer_crop_cycles
            WHERE farm_id = %s
              AND crop_status IN (
                  'land_preparation',
                  'planted_and_growing'
              )
            ORDER BY
                created_at DESC,
                crop_cycle_id DESC
            LIMIT 1
            FOR UPDATE
            """,
            [
                normalized_farm_id,
            ],
        )

        row = cursor.fetchone()

        if not row:
            raise FarmManagementError(
                "invalid_crop_state",
                (
                    "There is no active cropping cycle "
                    "to mark as failed."
                ),
                409,
            )

        crop_cycle_id = (
            row[0]
        )

        rice_variety = (
            row[1]
        )

        cursor.execute(
            """
            UPDATE farmer_crop_cycles
            SET
                crop_status = 'failed_crop',
                failure_reason = %s,
                failure_remarks = %s,
                completed_at =
                    CURRENT_TIMESTAMP,
                updated_at =
                    CURRENT_TIMESTAMP
            WHERE crop_cycle_id = %s
              AND farm_id = %s
            """,
            [
                failure_reason,
                remarks or None,
                crop_cycle_id,
                normalized_farm_id,
            ],
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "failed_crop_recorded"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "failed_crop"
            ),
            details_remarks=(
                remarks
                or (
                    "Failed crop recorded. "
                    f"Reason: {failure_reason}."
                )
            ),
        )

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "crop_status_updated"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "failed_crop"
            ),
            details_remarks=(
                "Crop status updated to "
                "Failed Crop."
            ),
        )

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )


# ============================================================
# RECORD HARVEST
# ============================================================

@transaction.atomic
def record_harvest(
    farmer_user_id,
    farm_id,
    data,
):
    """
    Record a successful harvest and create its Farmer Inventory
    product in ONE database transaction.

    Required:
        product_type
        actual_harvest_date
        actual_yield_kg

    Optional product information:
        product_image
        description
        product_grade

    Automatic:
        product_code
        rice_variety
        record_source_type
        acquisition_source_type
        source_farm_id
        source_crop_cycle_id
        harvest_acquisition_date
        total_stock_quantity_kg
        reserved_committed_quantity_kg
        available_quantity_kg
        stock_level
        selling_price_per_kg
        status
        created_at
        updated_at

    Important:
        user_id NEVER comes from frontend data.
    """

    # ========================================================
    # AUTH / FARM ID
    # ========================================================

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )

    normalized_farm_id = (
        _normalize_farm_id(
            farm_id
        )
    )


    # ========================================================
    # MANUAL HARVEST INPUT
    # ========================================================

    product_type = (
        _text(
            data.get(
                "product_type"
            ),
            required=True,
            field_name=(
                "Product Type"
            ),
        ).lower()
    )

    if (
        product_type
        not in VALID_PRODUCT_TYPES
    ):
        raise FarmManagementError(
            "validation_error",
            (
                "Please select either "
                "Unmilled Palay or Milled Rice."
            ),
            400,
        )


    actual_harvest_date = (
        _date(
            data.get(
                "actual_harvest_date"
            ),
            required=True,
            field_name=(
                "Actual Harvest Date"
            ),
        )
    )


    actual_yield_kg = (
        _positive_decimal(
            data.get(
                "actual_yield_kg"
            ),
            required=True,
            field_name=(
                "Actual Yield"
            ),
        )
    )


    # ========================================================
    # OPTIONAL INVENTORY PRODUCT FIELDS
    # ========================================================

    product_image = _text(
        data.get(
            "product_image"
        ),
    )


    product_description = _text(
        data.get(
            "description"
        ),
    )


    product_grade = _text(
        data.get(
            "product_grade"
        ),
    )


    # ========================================================
    # TRANSACTION
    # ========================================================

    with connection.cursor() as cursor:

        # ----------------------------------------------------
        # LOCK FARM + CONFIRM OWNERSHIP
        # ----------------------------------------------------

        farm = _lock_owned_farm(
            cursor,
            farmer_id,
            normalized_farm_id,
        )

        _require_active_farm(
            farm
        )


        # ----------------------------------------------------
        # LOCK CURRENT PLANTED CROP
        #
        # Harvest is only valid when the crop is currently
        # Planted and Growing.
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                crop_cycle_id,
                rice_variety,
                planting_date,
                expected_harvest_date,
                expected_yield_kg
            FROM farmer_crop_cycles
            WHERE farm_id = %s
              AND crop_status =
                  'planted_and_growing'
            ORDER BY
                created_at DESC,
                crop_cycle_id DESC
            LIMIT 1
            FOR UPDATE
            """,
            [
                normalized_farm_id,
            ],
        )

        row = cursor.fetchone()

        if not row:
            raise FarmManagementError(
                "invalid_crop_state",
                (
                    "There is no Planted and Growing "
                    "crop available to harvest."
                ),
                409,
            )


        crop_cycle_id = (
            row[0]
        )

        rice_variety = (
            row[1]
        )

        planting_date = (
            row[2]
        )


        # ----------------------------------------------------
        # SAFETY
        # ----------------------------------------------------

        if not rice_variety:
            raise FarmManagementError(
                "invalid_crop_state",
                (
                    "The current cropping cycle does not "
                    "have a recorded rice variety."
                ),
                409,
            )


        if (
            planting_date
            and actual_harvest_date
            < planting_date
        ):
            raise FarmManagementError(
                "validation_error",
                (
                    "Actual Harvest Date cannot "
                    "be earlier than Planting Date."
                ),
                400,
            )


        # ----------------------------------------------------
        # DUPLICATE HARVEST / INVENTORY SAFETY
        # ----------------------------------------------------

        cursor.execute(
            """
            SELECT
                farm_product_id,
                product_code
            FROM farm_products
            WHERE source_crop_cycle_id = %s
              AND record_source_type =
                  'harvest_generated'
            LIMIT 1
            FOR UPDATE
            """,
            [
                crop_cycle_id,
            ],
        )

        existing_inventory = (
            cursor.fetchone()
        )

        if existing_inventory:
            raise FarmManagementError(
                "harvest_already_recorded",
                (
                    "This harvest has already been "
                    "recorded in Inventory."
                ),
                409,
            )


        # ----------------------------------------------------
        # SYSTEM GENERATED PRODUCT CODE
        # ----------------------------------------------------

        product_code = (
            _build_harvest_product_code(
                crop_cycle_id
            )
        )


        # ----------------------------------------------------
        # MARK CROPPING CYCLE HARVESTED
        # ----------------------------------------------------

        cursor.execute(
            """
            UPDATE farmer_crop_cycles
            SET
                crop_status =
                    'harvested',

                actual_harvest_date =
                    %s,

                actual_yield_kg =
                    %s,

                failure_reason =
                    NULL,

                failure_remarks =
                    NULL,

                completed_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE crop_cycle_id = %s
              AND farm_id = %s
              AND crop_status =
                    'planted_and_growing'
            """,
            [
                actual_harvest_date,
                actual_yield_kg,
                crop_cycle_id,
                normalized_farm_id,
            ],
        )


        if (
            cursor.rowcount
            != 1
        ):
            raise FarmManagementError(
                "harvest_conflict",
                (
                    "The crop changed while the harvest "
                    "was being recorded. Please refresh "
                    "and try again."
                ),
                409,
            )


        # ----------------------------------------------------
        # CREATE FARMER INVENTORY PRODUCT
        #
        # AUTOMATED:
        #
        # record_source_type
        # acquisition_source_type
        # farm
        # crop cycle
        # rice variety
        # stock quantity
        # reserved quantity
        # available quantity (DB generated)
        # stock level
        # status
        #
        # Selling Price deliberately starts NULL.
        # ----------------------------------------------------

        cursor.execute(
            """
            INSERT INTO farm_products (
                user_id,

                product_code,
                product_image,
                product_type,
                rice_variety,
                product_grade,
                description,

                record_source_type,
                acquisition_source_type,

                source_farm_id,
                source_crop_cycle_id,

                harvest_acquisition_date,
                source_acquisition_remarks,

                total_stock_quantity_kg,
                reserved_committed_quantity_kg,

                stock_level,

                selling_price_per_kg,

                status,

                created_at,
                updated_at
            )
            VALUES (
                %s,

                %s,
                %s,
                %s,
                %s,
                %s,
                %s,

                'harvest_generated',
                'own_farm',

                %s,
                %s,

                %s,
                NULL,

                %s,
                0,

                'in_stock',

                NULL,

                'active',

                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING
                farm_product_id,
                product_code,
                available_quantity_kg
            """,
            [
                farmer_id,

                product_code,
                product_image or None,
                product_type,
                rice_variety,
                product_grade or None,
                product_description or None,

                normalized_farm_id,
                crop_cycle_id,

                actual_harvest_date,

                actual_yield_kg,
            ],
        )


        inventory_row = (
            cursor.fetchone()
        )


        if not inventory_row:
            raise FarmManagementError(
                "inventory_creation_failed",
                (
                    "The harvested product could not "
                    "be added to Inventory."
                ),
                500,
            )


        farm_product_id = (
            inventory_row[0]
        )

        created_product_code = (
            inventory_row[1]
        )


        # ----------------------------------------------------
        # FARM ACTIVITY:
        # HARVEST RECORDED
        # ----------------------------------------------------

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "harvest_recorded"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "harvested"
            ),
            details_remarks=(
                "Harvest recorded for "
                f"{rice_variety}: "
                f"{actual_yield_kg} kg."
            ),
        )


        # ----------------------------------------------------
        # FARM ACTIVITY:
        # CROP STATUS -> HARVESTED
        # ----------------------------------------------------

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "crop_status_updated"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "harvested"
            ),
            details_remarks=(
                "Crop status updated to Harvested."
            ),
        )


        # ----------------------------------------------------
        # FARM ACTIVITY:
        # INVENTORY RECORD CREATED
        # ----------------------------------------------------

        _record_activity(
            cursor,
            farmer_user_id=(
                farmer_id
            ),
            farm_id=(
                normalized_farm_id
            ),
            crop_cycle_id=(
                crop_cycle_id
            ),
            activity_type=(
                "inventory_record_created"
            ),
            rice_variety=(
                rice_variety
            ),
            farm_crop_status=(
                "harvested"
            ),
            details_remarks=(
                "Inventory record created: "
                f"{created_product_code} — "
                f"{rice_variety} — "
                f"{actual_yield_kg} kg."
            ),
        )


        # ----------------------------------------------------
        # farm_product_id intentionally obtained here so the
        # transaction guarantees the inventory record exists.
        # ----------------------------------------------------

        if not farm_product_id:
            raise FarmManagementError(
                "inventory_creation_failed",
                (
                    "Inventory record could not "
                    "be confirmed."
                ),
                500,
            )


    # ========================================================
    # RETURN UPDATED FARM
    # ========================================================

    return get_farmer_farm_details(
        farmer_id,
        normalized_farm_id,
    )