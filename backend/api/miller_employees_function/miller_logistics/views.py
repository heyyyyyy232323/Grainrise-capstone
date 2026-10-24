import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from api.miller_employees_function.employee_auth import miller_flc_required
from .selectors import (
    get_flc_vehicle_detail,
    list_flc_active_drivers,
    list_flc_vehicles,
)
from .services import (
    CrossBranchConflictError,
    DriverNotFoundError,
    VehicleNotFoundError,
    VehicleValidationError,
    update_flc_vehicle_status,
)


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_vehicles_list_view(request):
    """
    GET /api/miller-employees/logistics/vehicles/
    Retrieve delivery vehicles scoped strictly to the authenticated FLC employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    search = request.GET.get("search", "").strip()
    status_filter = request.GET.get("status", "all").strip()
    sort_by = request.GET.get("sort", "").strip()

    try:
        vehicles = list_flc_vehicles(
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
            search=search,
            status_filter=status_filter,
            sort_by=sort_by,
        )
        return JsonResponse(
            {
                "success": True,
                "vehicles": vehicles,
                "total": len(vehicles),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve vehicles: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_vehicle_detail_view(request, vehicle_id):
    """
    GET /api/miller-employees/logistics/vehicles/<vehicle_id>/
    Retrieve full details for a vehicle scoped to the authenticated FLC employee's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    try:
        vehicle = get_flc_vehicle_detail(
            vehicle_id=vehicle_id,
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
        )
        if not vehicle:
            return JsonResponse(
                {
                    "success": False,
                    "message": "Vehicle not found or not designated to your branch.",
                },
                status=404,
            )

        return JsonResponse(
            {
                "success": True,
                "vehicle": vehicle,
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve vehicle details: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["GET"])
@miller_flc_required
def flc_active_drivers_view(request):
    """
    GET /api/miller-employees/logistics/drivers/
    Retrieve active drivers belonging to the SAME branch as the authenticated FLC employee.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    try:
        drivers = list_flc_active_drivers(supplier_profile_id=supplier_profile_id)
        return JsonResponse(
            {
                "success": True,
                "drivers": drivers,
                "total": len(drivers),
            },
            status=200,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Failed to retrieve drivers: {str(e)}",
            },
            status=500,
        )


@csrf_exempt
@require_http_methods(["POST"])
@miller_flc_required
def flc_vehicle_update_status_view(request, vehicle_id):
    """
    POST /api/miller-employees/logistics/vehicles/<vehicle_id>/update-status/
    Execute status update or driver assignment for a vehicle designated to this branch.

    Payload options:
    - { "action": "assign_driver", "driver_id": 123 }
    - { "action": "inactive", "reason": "Repairing suspension" }
    - { "action": "maintenance", "reason": "Scheduled change oil" }
    - { "action": "set_active" }
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    miller_user_id = request.grainrise_owner_user_id

    try:
        body = json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse(
            {
                "success": False,
                "message": "Invalid JSON payload.",
            },
            status=400,
        )

    action = body.get("action")
    driver_id = body.get("driver_id")
    reason = body.get("reason")

    try:
        result = update_flc_vehicle_status(
            vehicle_id=vehicle_id,
            supplier_profile_id=supplier_profile_id,
            miller_user_id=miller_user_id,
            action=action,
            driver_id=driver_id,
            reason=reason,
        )
        return JsonResponse(
            {
                "success": True,
                "message": result.get("message", "Vehicle updated successfully."),
                "data": result,
            },
            status=200,
        )
    except VehicleNotFoundError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=404,
        )
    except DriverNotFoundError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=404,
        )
    except VehicleValidationError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=400,
        )
    except CrossBranchConflictError as e:
        return JsonResponse(
            {
                "success": False,
                "message": str(e),
            },
            status=409,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "message": f"Server error updating vehicle: {str(e)}",
            },
            status=500,
        )

