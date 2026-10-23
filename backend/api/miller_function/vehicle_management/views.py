import json
import logging
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from api.miller_function.miller_auth import miller_manager_required
from .selectors import (
    get_miller_vehicle_detail,
    is_plate_number_taken,
    list_miller_branches,
    list_miller_vehicles,
)
from .services import (
    VehicleDuplicatePlateError,
    VehicleError,
    VehicleNotFoundError,
    VehicleValidationError,
    create_vehicle,
    update_vehicle,
)

logger = logging.getLogger(__name__)


def _extract_branch_ids(request, data=None):
    """
    Safely extract all branch_ids from request (QueryDict, POST, or JSON dict).
    Handles multiple FormData entries ('branch_ids', 'branch_ids[]', 'branch_ids_json'),
    JSON arrays, comma-separated strings, and single values.
    """
    candidates = []

    # 1. From request.data (QueryDict or dict)
    if hasattr(request, "data"):
        req_data = request.data
        if hasattr(req_data, "getlist"):
            for key in ("branch_ids", "branch_ids[]", "branch_ids_json"):
                vals = req_data.getlist(key)
                if vals:
                    candidates.extend(vals)
        elif isinstance(req_data, dict):
            for key in ("branch_ids", "branch_ids[]", "branch_ids_json"):
                val = req_data.get(key)
                if val is not None:
                    if isinstance(val, list):
                        candidates.extend(val)
                    else:
                        candidates.append(val)

    # 2. From request.POST if still needed
    if hasattr(request, "POST") and hasattr(request.POST, "getlist"):
        for key in ("branch_ids", "branch_ids[]", "branch_ids_json"):
            vals = request.POST.getlist(key)
            if vals:
                candidates.extend(vals)

    # 3. From data dict if provided
    if data and isinstance(data, dict):
        for key in ("branch_ids", "branch_ids[]", "branch_ids_json"):
            val = data.get(key)
            if val is not None:
                if isinstance(val, list):
                    candidates.extend(val)
                else:
                    candidates.append(val)

    # 4. Parse candidates into a clean list of unique integer branch IDs
    result = []
    for item in candidates:
        if isinstance(item, int):
            result.append(item)
        elif isinstance(item, str):
            item_str = item.strip()
            if not item_str:
                continue
            if item_str.startswith("[") and item_str.endswith("]"):
                try:
                    parsed = json.loads(item_str)
                    if isinstance(parsed, list):
                        for p in parsed:
                            try:
                                result.append(int(p))
                            except (ValueError, TypeError):
                                pass
                except Exception:
                    pass
            elif "," in item_str:
                for part in item_str.split(","):
                    try:
                        result.append(int(part.strip()))
                    except (ValueError, TypeError):
                        pass
            else:
                try:
                    result.append(int(item_str))
                except (ValueError, TypeError):
                    pass

    # Deduplicate while preserving order
    seen = set()
    unique_ids = []
    for bid in result:
        if bid not in seen:
            seen.add(bid)
            unique_ids.append(bid)
    return unique_ids


def _extract_request_payload(request):
    """Normalize payload from JSON, form-data, or x-www-form-urlencoded."""
    data = {}
    if hasattr(request, "data") and isinstance(request.data, dict):
        for k, v in request.data.items():
            if isinstance(v, list) and len(v) == 1 and k not in ("branch_ids", "branch_ids[]", "branch_ids_json"):
                data[k] = v[0]
            else:
                data[k] = v
    elif hasattr(request, "POST"):
        for k, v in request.POST.items():
            data[k] = v

    data["branch_ids"] = _extract_branch_ids(request, data)
    return data


@api_view(["GET"])
@miller_manager_required
def list_vehicles_view(request):
    """
    GET /api/miller/vehicles/
    List all vehicles owned by the authenticated Miller.
    Supports search, sort_by (plate_asc/plate_desc), wheels, and type.
    """
    miller_user_id = request.grainrise_miller_id

    search = request.query_params.get("search", "").strip()
    sort_by = request.query_params.get("sort_by", "plate_asc").strip()
    wheels = request.query_params.get("wheels", "all").strip()
    type_filter = request.query_params.get("type", "all").strip()

    try:
        vehicles = list_miller_vehicles(
            miller_user_id=miller_user_id,
            search=search,
            sort_by=sort_by,
            wheels_filter=wheels,
            type_filter=type_filter,
        )
        return Response(
            {
                "success": True,
                "count": len(vehicles),
                "vehicles": vehicles,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list vehicles for miller_user_id=%s: %s", miller_user_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve vehicle list.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@miller_manager_required
def list_branches_view(request):
    """
    GET /api/miller/vehicles/branches/
    List all supplier_profiles owned by the authenticated Miller for branch selection.
    """
    miller_user_id = request.grainrise_miller_id
    try:
        branches = list_miller_branches(miller_user_id)
        return Response(
            {
                "success": True,
                "count": len(branches),
                "branches": branches,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to list branches for miller_user_id=%s: %s", miller_user_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to load branches.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@miller_manager_required
def check_plate_view(request):
    """
    GET/POST /api/miller/vehicles/check-plate/
    Check if a plate number already exists in the system.
    """
    data = request.data if request.method == "POST" else request.query_params
    plate_number = data.get("plate_number", "").strip()
    exclude_id = data.get("exclude_id")

    try:
        exclude_val = int(exclude_id) if exclude_id else None
    except (ValueError, TypeError):
        exclude_val = None

    if not plate_number:
        return Response(
            {"success": True, "is_unique": True, "message": "Empty plate number."},
            status=status.HTTP_200_OK,
        )

    taken = is_plate_number_taken(plate_number, exclude_vehicle_id=exclude_val)
    return Response(
        {
            "success": True,
            "is_unique": not taken,
            "plate_number": plate_number,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@miller_manager_required
def detail_vehicle_view(request, vehicle_id):
    """
    GET /api/miller/vehicles/<vehicle_id>/
    Retrieve comprehensive details for a single vehicle.
    """
    miller_user_id = request.grainrise_miller_id

    try:
        vehicle = get_miller_vehicle_detail(miller_user_id, vehicle_id)
        if not vehicle:
            return Response(
                {
                    "success": False,
                    "message": "Vehicle not found or you do not have permission to view it.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "vehicle": vehicle,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:
        logger.exception("Failed to get vehicle detail vehicle_id=%s: %s", vehicle_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to retrieve vehicle details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_manager_required
def create_vehicle_view(request):
    """
    POST /api/miller/vehicles/create/
    Create a new vehicle for the authenticated Miller.
    """
    miller_user_id = request.grainrise_miller_id
    payload = _extract_request_payload(request)
    photo_file = request.FILES.get("photo")

    try:
        vehicle = create_vehicle(
            miller_user_id=miller_user_id,
            data=payload,
            photo_file=photo_file,
        )
        return Response(
            {
                "success": True,
                "message": "Vehicle successfully added.",
                "vehicle": vehicle,
            },
            status=status.HTTP_201_CREATED,
        )
    except VehicleDuplicatePlateError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
                "error_code": "DUPLICATE_PLATE",
                "field": "plate_number",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except VehicleValidationError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to create vehicle for miller_user_id=%s: %s", miller_user_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to add vehicle.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST", "PUT"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
@miller_manager_required
def update_vehicle_view(request, vehicle_id):
    """
    POST/PUT /api/miller/vehicles/<vehicle_id>/edit/
    Update vehicle details and branch mappings.
    """
    miller_user_id = request.grainrise_miller_id
    payload = _extract_request_payload(request)
    photo_file = request.FILES.get("photo")
    remove_photo = str(payload.get("remove_photo", "")).strip().lower() in ("true", "1", "yes")

    try:
        updated_vehicle = update_vehicle(
            miller_user_id=miller_user_id,
            vehicle_id=vehicle_id,
            data=payload,
            photo_file=photo_file,
            remove_photo=remove_photo,
        )
        return Response(
            {
                "success": True,
                "message": "Vehicle details successfully updated.",
                "vehicle": updated_vehicle,
            },
            status=status.HTTP_200_OK,
        )
    except VehicleNotFoundError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except VehicleDuplicatePlateError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
                "error_code": "DUPLICATE_PLATE",
                "field": "plate_number",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    except VehicleValidationError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as exc:
        logger.exception("Failed to update vehicle vehicle_id=%s: %s", vehicle_id, exc)
        return Response(
            {
                "success": False,
                "message": "Failed to update vehicle details.",
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

