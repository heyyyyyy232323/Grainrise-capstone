import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..miller_auth import miller_manager_required
from .selectors import (
    get_miller_branch,
    get_miller_branch_employee,
    list_miller_branch_employees,
    list_miller_branches,
)
from .services import (
    archive_miller_branch_employee,
    create_miller_branch,
    create_miller_branch_employee,
    delete_miller_branch_employee,
    restore_miller_branch_employee,
    update_miller_branch_employee,
)

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@miller_manager_required
def list_branches_view(request):
    """
    Handle Miller Branches collection endpoint:
    - GET  /api/miller/branches/ -> list all owned branches
    - POST /api/miller/branches/ -> create a new branch
    """
    if request.method == "POST":
        return _create_branch(request)

    return _get_branches_list(request)


def _get_branches_list(request):
    """
    GET /api/miller/branches/

    List all branches (supplier_profiles) owned by the currently authenticated
    Miller Manager.

    Security:
    - Protected by @miller_manager_required.
    - Owner is resolved strictly from request.grainrise_miller_id (derived from JWT).
    - user_id from frontend query parameters or payload is never accepted.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        branches = list_miller_branches(miller_user_id)

        return Response(
            {
                "success": True,
                "data": branches,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error retrieving miller branches: %s", exc)
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
    POST /api/miller/branches/

    Create a new Miller branch under the authenticated Miller Manager.

    Owner is resolved strictly from request.grainrise_miller_id.
    Creates:
    1. A supplier_profiles row
    2. A miller_branch_documents row using the new supplier_profile_id
    All in one database transaction.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        created_branch = create_miller_branch(
            miller_user_id=miller_user_id,
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
                "message": "Miller branch successfully registered.",
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
        logger.exception("Error creating miller branch: %s", exc)
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
@miller_manager_required
def branch_employees_view(request, branch_id):
    """
    Handle Miller Branch Employees collection endpoint:
    - GET  /api/miller/branches/<branch_id>/employees/ -> list branch employees
    - POST /api/miller/branches/<branch_id>/employees/ -> add branch employee
    """
    if request.method == "POST":
        return _create_branch_employee(request, branch_id)

    return _get_branch_employees(request, branch_id)


def _get_branch_employees(request, branch_id):
    """
    GET /api/miller/branches/<branch_id>/employees/

    Verify the branch belongs to request.grainrise_miller_id and
    return employees from supplier_employees for that supplier_profile_id.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        branch = get_miller_branch(miller_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        employees = list_miller_branch_employees(numeric_branch_id)

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
    POST /api/miller/branches/<branch_id>/employees/

    Verify the branch belongs to request.grainrise_miller_id and
    insert into supplier_employees for that supplier_profile_id.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        branch = get_miller_branch(miller_user_id, numeric_branch_id)
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

        created_employee = create_miller_branch_employee(
            supplier_profile_id=numeric_branch_id,
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
@miller_manager_required
def branch_employee_detail_view(request, branch_id, employee_id):
    """
    Handle single Miller Branch Employee operations:
    - GET: view employee details
    - PUT/PATCH: update employee details (prefilled form edit)
    - DELETE: permanently delete employee
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        branch = get_miller_branch(miller_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        employee = get_miller_branch_employee(numeric_branch_id, numeric_employee_id)
        if not employee:
            return Response(
                {
                    "success": False,
                    "message": "Employee not found in this branch.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.method == "DELETE":
            delete_miller_branch_employee(
                supplier_profile_id=numeric_branch_id,
                employee_id=numeric_employee_id,
            )
            return Response(
                {
                    "success": True,
                    "message": "Employee permanently deleted successfully.",
                },
                status=status.HTTP_200_OK,
            )

        if request.method in ["PUT", "PATCH"]:
            data = request.data
            first_name = data.get("first_name")
            middle_initial = data.get("middle_initial")
            last_name = data.get("last_name")
            suffix = data.get("suffix")
            position = data.get("position") or data.get("role")
            email = data.get("email") or data.get("official_email")
            contact_number = data.get("contact_number") or data.get("phone")
            password = data.get("password")

            updated_emp = update_miller_branch_employee(
                supplier_profile_id=numeric_branch_id,
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
                    "data": updated_emp,
                },
                status=status.HTTP_200_OK,
            )

        # GET
        return Response(
            {
                "success": True,
                "data": employee,
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
        logger.exception("Error processing branch employee detail: %s", exc)
        payload = {
            "success": False,
            "message": "A database error occurred while processing employee request.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(
            payload,
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@miller_manager_required
def branch_employee_archive_view(request, branch_id, employee_id):
    """
    POST /api/miller/branches/<branch_id>/employees/<employee_id>/archive/

    Archive an employee with a required reason.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        branch = get_miller_branch(miller_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        reason = request.data.get("reason")
        archived_emp = archive_miller_branch_employee(
            supplier_profile_id=numeric_branch_id,
            employee_id=numeric_employee_id,
            reason=reason,
        )

        return Response(
            {
                "success": True,
                "message": "Employee archived successfully.",
                "data": archived_emp,
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
        logger.exception("Error archiving branch employee: %s", exc)
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
@miller_manager_required
def branch_employee_restore_view(request, branch_id, employee_id):
    """
    POST /api/miller/branches/<branch_id>/employees/<employee_id>/restore/

    Restore an employee back to 'active'.
    """
    try:
        miller_user_id = getattr(request, "grainrise_miller_id", None)
        if miller_user_id is None:
            return Response(
                {
                    "success": False,
                    "message": "Authenticated Miller account was not resolved.",
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

        branch = get_miller_branch(miller_user_id, numeric_branch_id)
        if not branch:
            return Response(
                {
                    "success": False,
                    "message": "Branch not found or access denied.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        restored_emp = restore_miller_branch_employee(
            supplier_profile_id=numeric_branch_id,
            employee_id=numeric_employee_id,
        )

        return Response(
            {
                "success": True,
                "message": "Employee restored successfully.",
                "data": restored_emp,
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
        logger.exception("Error restoring branch employee: %s", exc)
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


# Exported aliases
create_branch_view = list_branches_view
branches_view = list_branches_view


