import logging
import os
from pathlib import Path
import secrets

from django.conf import settings
from django.db import connection, transaction

from .selectors import (
    get_miller_vehicle_detail,
    is_plate_number_taken,
    validate_branches_belong_to_miller,
)

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"Truck", "Car", "Motor"}
ALLOWED_STATUSES = {"active", "inactive", "for maintenance"}


class VehicleError(Exception):
    """Base exception for vehicle management operations."""
    pass


class VehicleValidationError(VehicleError):
    """Raised when vehicle data fails validation."""
    pass


class VehicleNotFoundError(VehicleError):
    """Raised when vehicle is not found or not owned by user."""
    pass


class VehicleDuplicatePlateError(VehicleError):
    """Raised when plate number already exists."""
    pass


def save_vehicle_photo(file_obj, miller_user_id):
    """
    Save an uploaded vehicle photo to MEDIA_ROOT/vehicles/<miller_user_id>/
    Returns POSIX relative path: vehicles/<miller_user_id>/veh_<token>.<ext>
    """
    if not file_obj or not hasattr(file_obj, "chunks"):
        return None

    orig_name = getattr(file_obj, "name", "") or ""
    extension = os.path.splitext(orig_name)[1].lower() or ".jpg"
    if extension not in [".jpg", ".jpeg", ".png", ".webp", ".jfif"]:
        extension = ".jpg"

    unique_name = f"veh_{secrets.token_hex(12)}{extension}"

    rel_directory = Path("vehicles") / str(miller_user_id)
    abs_directory = Path(settings.MEDIA_ROOT) / rel_directory
    abs_directory.mkdir(parents=True, exist_ok=True)

    abs_file_path = abs_directory / unique_name
    with abs_file_path.open("wb") as destination:
        for chunk in file_obj.chunks():
            destination.write(chunk)

    return (rel_directory / unique_name).as_posix()


def _normalize_type(raw_type):
    """Match allowed type case-insensitively to exact ENUM value."""
    if not raw_type:
        return None
    cleaned = str(raw_type).strip()
    for allowed in ALLOWED_TYPES:
        if allowed.lower() == cleaned.lower():
            return allowed
    return None


def _normalize_status(raw_status):
    """Match allowed status case-insensitively to exact ENUM value."""
    if not raw_status:
        return None
    cleaned = str(raw_status).strip().lower()
    for allowed in ALLOWED_STATUSES:
        if allowed.lower() == cleaned:
            return allowed
    return None


MOTOR_WHEELS = {2, 3, 4, 6, 8}
CAR_TRUCK_WHEELS = {6, 8, 10, 12}



def _validate_wheels_for_type(vehicle_type, wheels):
    """Validate number of wheels according to vehicle type."""
    if not vehicle_type:
        return
    if vehicle_type.lower() == "motor":
        if wheels not in MOTOR_WHEELS:
            raise VehicleValidationError(
                f"Invalid number of wheels for Motor. Allowed: {', '.join(map(str, sorted(MOTOR_WHEELS)))}."
            )
    else:
        if wheels not in CAR_TRUCK_WHEELS:
            raise VehicleValidationError(
                f"Invalid number of wheels for {vehicle_type}. Allowed: {', '.join(map(str, sorted(CAR_TRUCK_WHEELS)))}."
            )


def _validate_and_normalize_capacity(raw_capacity):
    """Validate positive numeric kg capacity and return normalized string with 'kg' suffix."""
    if raw_capacity is None or str(raw_capacity).strip() == "":
        raise VehicleValidationError("Capacity is required.")

    clean = str(raw_capacity).strip()
    if clean.lower().endswith("kg"):
        clean = clean[:-2].strip()
    clean = clean.replace(",", "").strip()

    try:
        val = float(clean)
        if val <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise VehicleValidationError("Capacity must be a positive numeric value in kg.")

    if val.is_integer():
        return f"{int(val):,} kg"
    return f"{val:g} kg"



def create_vehicle(miller_user_id, data, photo_file=None):
    """
    Create a new vehicle record and its branch mappings.

    Parameters:
    - miller_user_id: int
    - data: dict containing plate_number, type, model, number_of_wheels, capacity, branch_ids
    - photo_file: optional uploaded file

    Returns:
    - dict: created vehicle details
    """
    # 1. Validate Plate Number
    raw_plate = str(data.get("plate_number") or "").strip().upper()
    if not raw_plate:
        raise VehicleValidationError("Plate number is required.")
    if len(raw_plate) > 30:
        raise VehicleValidationError("Plate number cannot exceed 30 characters.")

    if is_plate_number_taken(raw_plate):
        raise VehicleDuplicatePlateError(f"A vehicle with plate number '{raw_plate}' already exists.")

    # 2. Validate Vehicle Type
    vehicle_type = _normalize_type(data.get("type"))
    if not vehicle_type:
        raise VehicleValidationError(
            f"Invalid vehicle type. Allowed types: {', '.join(sorted(ALLOWED_TYPES))}."
        )

    # 3. Validate Model
    model = str(data.get("model") or "").strip()
    if not model:
        raise VehicleValidationError("Vehicle model is required.")
    if len(model) > 150:
        raise VehicleValidationError("Vehicle model cannot exceed 150 characters.")

    # 4. Validate Number of Wheels
    raw_wheels = data.get("number_of_wheels")
    try:
        number_of_wheels = int(raw_wheels)
        if number_of_wheels <= 0:
            raise ValueError()
    except (ValueError, TypeError):
        raise VehicleValidationError("Number of wheels must be a positive integer.")
    _validate_wheels_for_type(vehicle_type, number_of_wheels)

    # 5. Validate Capacity (Positive numeric kg only)
    capacity = _validate_and_normalize_capacity(data.get("capacity"))


    # 6. Validate Designated Branches (Must belong to authenticated Miller)
    raw_branches = data.get("branch_ids") or []
    try:
        valid_branch_ids = validate_branches_belong_to_miller(miller_user_id, raw_branches)
    except ValueError as exc:
        raise VehicleValidationError(str(exc))

    # 7. Initial status is always 'active'
    status_val = "active"

    # 8. Handle optional photo
    photo_path = save_vehicle_photo(photo_file, miller_user_id) if photo_file else None

    # 9. Transactional insert of vehicle and branch associations
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO miller_delivery_vehicle_management (
                    user_id,
                    type,
                    number_of_wheels,
                    model,
                    plate_number,
                    capacity,
                    photo,
                    status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                [
                    miller_user_id,
                    vehicle_type,
                    number_of_wheels,
                    model,
                    raw_plate,
                    capacity,
                    photo_path,
                    status_val,
                ],
            )
            vehicle_id = cursor.lastrowid

            for bid in valid_branch_ids:
                cursor.execute(
                    """
                    INSERT INTO miller_delivery_vehicle_branches (
                        vehicle_id,
                        supplier_profile_id
                    )
                    VALUES (%s, %s)
                    """,
                    [vehicle_id, bid],
                )

    logger.info("Vehicle %s created successfully for miller user_id %s", vehicle_id, miller_user_id)
    return get_miller_vehicle_detail(miller_user_id, vehicle_id)


def update_vehicle(miller_user_id, vehicle_id, data, photo_file=None, remove_photo=False):
    """
    Update vehicle information and branch mappings.

    Parameters:
    - miller_user_id: int
    - vehicle_id: int
    - data: dict containing updated fields
    - photo_file: optional new photo file
    - remove_photo: bool flag to remove existing photo

    Returns:
    - dict: updated vehicle details
    """
    existing = get_miller_vehicle_detail(miller_user_id, vehicle_id)
    if not existing:
        raise VehicleNotFoundError("Vehicle not found or you do not have permission to modify it.")

    # 1. Plate Number
    if "plate_number" in data:
        raw_plate = str(data.get("plate_number") or "").strip().upper()
        if not raw_plate:
            raise VehicleValidationError("Plate number is required.")
        if len(raw_plate) > 30:
            raise VehicleValidationError("Plate number cannot exceed 30 characters.")
        if is_plate_number_taken(raw_plate, exclude_vehicle_id=vehicle_id):
            raise VehicleDuplicatePlateError(f"A vehicle with plate number '{raw_plate}' already exists.")
    else:
        raw_plate = existing["plate_number"]

    # 2. Type
    if "type" in data:
        vehicle_type = _normalize_type(data.get("type"))
        if not vehicle_type:
            raise VehicleValidationError(
                f"Invalid vehicle type. Allowed types: {', '.join(sorted(ALLOWED_TYPES))}."
            )
    else:
        vehicle_type = existing["type"]

    # 3. Model
    if "model" in data:
        model = str(data.get("model") or "").strip()
        if not model:
            raise VehicleValidationError("Vehicle model is required.")
        if len(model) > 150:
            raise VehicleValidationError("Vehicle model cannot exceed 150 characters.")
    else:
        model = existing["model"]

    # 4. Number of Wheels
    if "number_of_wheels" in data:
        raw_wheels = data.get("number_of_wheels")
        try:
            number_of_wheels = int(raw_wheels)
            if number_of_wheels <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise VehicleValidationError("Number of wheels must be a positive integer.")
    else:
        number_of_wheels = existing["number_of_wheels"]

    _validate_wheels_for_type(vehicle_type, number_of_wheels)

    # 5. Capacity (Positive numeric kg only)
    if "capacity" in data:
        capacity = _validate_and_normalize_capacity(data.get("capacity"))
    else:
        capacity = existing["capacity"]


    # 6. Status
    if "status" in data:
        status_val = _normalize_status(data.get("status"))
        if not status_val:
            raise VehicleValidationError(
                f"Invalid status. Allowed statuses: {', '.join(sorted(ALLOWED_STATUSES))}."
            )
    else:
        status_val = existing["status"]

    # 7. Designated Branches
    if "branch_ids" in data:
        raw_branches = data.get("branch_ids") or []
        try:
            valid_branch_ids = validate_branches_belong_to_miller(miller_user_id, raw_branches)
        except ValueError as exc:
            raise VehicleValidationError(str(exc))
    else:
        valid_branch_ids = existing["branch_ids"]

    # 8. Photo
    if photo_file:
        photo_path = save_vehicle_photo(photo_file, miller_user_id)
    elif remove_photo:
        photo_path = None
    else:
        photo_path = existing.get("photo")

    # 9. Transactional update
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE miller_delivery_vehicle_management
                SET
                    type = %s,
                    number_of_wheels = %s,
                    model = %s,
                    plate_number = %s,
                    capacity = %s,
                    photo = %s,
                    status = %s
                WHERE vehicle_id = %s
                  AND user_id = %s
                """,
                [
                    vehicle_type,
                    number_of_wheels,
                    model,
                    raw_plate,
                    capacity,
                    photo_path,
                    status_val,
                    vehicle_id,
                    miller_user_id,
                ],
            )

            # Update designated branches
            cursor.execute(
                """
                DELETE FROM miller_delivery_vehicle_branches
                WHERE vehicle_id = %s
                """,
                [vehicle_id],
            )

            for bid in valid_branch_ids:
                cursor.execute(
                    """
                    INSERT INTO miller_delivery_vehicle_branches (
                        vehicle_id,
                        supplier_profile_id
                    )
                    VALUES (%s, %s)
                    """,
                    [vehicle_id, bid],
                )

    logger.info("Vehicle %s updated successfully for miller user_id %s", vehicle_id, miller_user_id)
    return get_miller_vehicle_detail(miller_user_id, vehicle_id)

