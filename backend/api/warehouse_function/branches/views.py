import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..warehouse_auth import warehouse_manager_required
from .selectors import (
    get_warehouse_branch,
    get_warehouse_branch_employee,
    list_warehouse_branch_employees,
    list_warehouse_branches,
)
from .services import (
    archive_warehouse_branch_employee,
    create_warehouse_branch,
    create_warehouse_branch_employee,
    delete_warehouse_branch_employee,
    restore_warehouse_branch_employee,
    update_warehouse_branch_employee,
)

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@warehouse_manager_required
def list_branches_view(request):
    """
    Handle Warehouse Branches collection endpoint:
    - GET  /api/warehouse/branches/ -> list all owned branches
    - POST /api/warehouse/branches/ -> create a new branch
    """
    if request.method == "POST":
        return _create_branch(request)

    return _get_branches_list(request)


def _get_branches_list(request):
    """
    GET /api/warehouse/branches/

    List all branches (warehouse_profiles) owned by the currently authenticated
    Warehouse Manager.
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        branches = list_warehouse_branches(warehouse_user_id)

        return Response(
            {
                "success": True,
                "data": branches,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error retrieving warehouse branches: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving branches.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _create_branch(request):
    """
    POST /api/warehouse/branches/

    Create a new Warehouse branch under the authenticated Warehouse Manager.
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data
        files = request.FILES

        business_name = data.get("business_name")
        organization_name = data.get("organization_name")
        province = data.get("province")
        municipality = data.get("municipality")
        postal_code = data.get("postal_code")
        barangay = data.get("barangay")
        street_address = data.get("street_address")
        official_email = data.get("official_email") or data.get("email")
        official_contact_number = data.get("official_contact_number") or data.get("phone")

        business_document = files.get("business_document") or data.get("business_document")
        mayors_permit = files.get("mayors_permit") or data.get("mayors_permit")

        created_branch = create_warehouse_branch(
            warehouse_user_id=warehouse_user_id,
            business_name=business_name,
            organization_name=organization_name,
            province=province,
            municipality=municipality,
            postal_code=postal_code,
            barangay=barangay,
            street_address=street_address,
            official_email=official_email,
            official_contact_number=official_contact_number,
            business_document=business_document,
            mayors_permit=mayors_permit,
        )

        return Response(
            {
                "success": True,
                "message": "Warehouse branch successfully registered.",
                "data": created_branch,
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error creating warehouse branch: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while registering the branch.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@warehouse_manager_required
def branch_employees_view(request, branch_id):
    """
    Handle Warehouse Branch Employees collection endpoint:
    - GET  /api/warehouse/branches/<branch_id>/employees/ -> list branch employees
    - POST /api/warehouse/branches/<branch_id>/employees/ -> add branch employee
    """
    if request.method == "POST":
        return _create_branch_employee(request, branch_id)

    return _get_branch_employees(request, branch_id)


def _get_branch_employees(request, branch_id):
    """
    GET /api/warehouse/branches/<branch_id>/employees/
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            numeric_branch_id = int(branch_id)
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        branch = get_warehouse_branch(warehouse_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        employees = list_warehouse_branch_employees(numeric_branch_id)

        return Response(
            {
                "success": True,
                "branch": branch,
                "data": employees,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing branch employees: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while retrieving employees.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


def _create_branch_employee(request, branch_id):
    """
    POST /api/warehouse/branches/<branch_id>/employees/
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            numeric_branch_id = int(branch_id)
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        branch = get_warehouse_branch(warehouse_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data
        first_name = data.get("first_name")
        middle_initial = data.get("middle_initial")
        last_name = data.get("last_name")
        suffix = data.get("suffix")
        position = data.get("position") or data.get("role")
        email = data.get("email") or data.get("official_email")
        contact_number = data.get("contact_number") or data.get("phone")
        password = data.get("password")

        created_employee = create_warehouse_branch_employee(
            warehouse_profile_id=numeric_branch_id,
            first_name=first_name,
            middle_initial=middle_initial,
            last_name=last_name,
            suffix=suffix,
            position=position,
            email=email,
            contact_number=contact_number,
            password=password,
        )

        return Response(
            {
                "success": True,
                "message": "Employee successfully added.",
                "data": created_employee,
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error adding branch employee: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while adding the employee.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@warehouse_manager_required
def branch_employee_detail_view(request, branch_id, employee_id):
    """
    Handle single Warehouse Branch Employee operations:
    - GET: view employee details
    - PUT / PATCH: update employee
    - DELETE: permanently delete employee (archived only, safe only)
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            numeric_branch_id = int(branch_id)
            numeric_employee_id = int(employee_id)
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Branch or employee not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        branch = get_warehouse_branch(warehouse_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        employee = get_warehouse_branch_employee(numeric_branch_id, numeric_employee_id)
        if not employee:
            return Response(
                {
                    "success": False,
                    "message": "Employee not found in this branch.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # GET single employee
        if request.method == "GET":
            return Response(
                {
                    "success": True,
                    "data": employee,
                },
                status=status.HTTP_200_OK,
            )

        # DELETE employee
        if request.method == "DELETE":
            res = delete_warehouse_branch_employee(
                warehouse_profile_id=numeric_branch_id,
                employee_id=numeric_employee_id,
            )
            return Response(
                {
                    "success": True,
                    "message": "Employee permanently deleted.",
                    "data": res,
                },
                status=status.HTTP_200_OK,
            )

        # PUT / PATCH update employee
        data = request.data
        first_name = data.get("first_name") or employee.get("first_name")
        middle_initial = data.get("middle_initial", employee.get("middle_initial"))
        last_name = data.get("last_name") or employee.get("last_name")
        suffix = data.get("suffix", employee.get("suffix"))
        position = data.get("position") or data.get("role") or employee.get("position")
        email = data.get("email") or data.get("official_email") or employee.get("email")
        contact_number = data.get("contact_number") or data.get("phone") or employee.get("contact_number")
        password = data.get("password")

        updated_employee = update_warehouse_branch_employee(
            warehouse_profile_id=numeric_branch_id,
            employee_id=numeric_employee_id,
            first_name=first_name,
            middle_initial=middle_initial,
            last_name=last_name,
            suffix=suffix,
            position=position,
            email=email,
            contact_number=contact_number,
            password=password,
        )

        return Response(
            {
                "success": True,
                "message": "Employee updated successfully.",
                "data": updated_employee,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error in branch employee detail view: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while processing employee details.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_manager_required
def branch_employee_archive_view(request, branch_id, employee_id):
    """
    POST /api/warehouse/branches/<branch_id>/employees/<employee_id>/archive/
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            numeric_branch_id = int(branch_id)
            numeric_employee_id = int(employee_id)
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Branch or employee not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        branch = get_warehouse_branch(warehouse_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason")
        result = archive_warehouse_branch_employee(
            warehouse_profile_id=numeric_branch_id,
            employee_id=numeric_employee_id,
            reason=reason,
        )

        return Response(
            {
                "success": True,
                "message": "Employee archived successfully.",
                "data": result,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error archiving employee: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while archiving the employee.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@warehouse_manager_required
def branch_employee_restore_view(request, branch_id, employee_id):
    """
    POST /api/warehouse/branches/<branch_id>/employees/<employee_id>/restore/
    """
    try:
        warehouse_user_id = getattr(request, "grainrise_warehouse_manager_id", None)
        if warehouse_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Warehouse Manager account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            numeric_branch_id = int(branch_id)
            numeric_employee_id = int(employee_id)
        except (ValueError, TypeError):
            return Response(
                {
                    "success": False,
                    "message": "Branch or employee not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        branch = get_warehouse_branch(warehouse_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        result = restore_warehouse_branch_employee(
            warehouse_profile_id=numeric_branch_id,
            employee_id=numeric_employee_id,
        )

        return Response(
            {
                "success": True,
                "message": "Employee restored to active status.",
                "data": result,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as val_err:
        return Response(
            {
                "success": False,
                "message": str(val_err),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error restoring employee: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while restoring the employee.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

