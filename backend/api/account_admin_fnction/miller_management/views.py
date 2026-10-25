import json

from datetime import date, datetime
from decimal import Decimal

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from ..admin_auth import account_admin_required

from .selectors import (
    TAB_TO_REVIEW,
    VALID_MILLER_TABS,
    get_miller_branches,
    get_miller_details,
    get_miller_online_order_ratings,
    get_miller_status_counts,
    get_miller_view_details_data,
    list_millers,
)

from .services import (
    archive_miller_account,
    archive_miller_employee,
    confirm_miller_application,
    delete_miller_account,
    delete_miller_employee,
    restore_miller_account,
    restore_miller_employee,
)


# ============================================================
# SERIALIZATION HELPERS
# ============================================================

def _serialize_value(value):
    """
    Convert supported Python / PostgreSQL values
    into JSON-safe values.
    """

    if isinstance(
        value,
        (datetime, date),
    ):
        return value.isoformat()


    if isinstance(
        value,
        Decimal,
    ):
        return float(
            value
        )


    return value


def _serialize_data(value):
    """
    Recursively serialize:
        dict
        list
        tuple
        date/datetime
        Decimal
    """

    if isinstance(
        value,
        dict,
    ):

        return {
            key: _serialize_data(
                item
            )
            for key, item
            in value.items()
        }


    if isinstance(
        value,
        list,
    ):

        return [
            _serialize_data(
                item
            )
            for item in value
        ]


    if isinstance(
        value,
        tuple,
    ):

        return [
            _serialize_data(
                item
            )
            for item in value
        ]


    return _serialize_value(
        value
    )


def _serialize_row(row):
    """
    Serialize one flat database result row.
    """

    if not row:

        return None


    return {
        key: _serialize_value(
            value
        )
        for key, value
        in row.items()
    }


# ============================================================
# REQUEST DATA HELPER
# ============================================================

def _read_request_data(request):
    """
    Read JSON or normal POST data.

    Supports:
        application/json
        multipart/form-data
        application/x-www-form-urlencoded
    """

    content_type = str(
        request.content_type
        or ""
    ).lower()


    if (
        "application/json"
        in content_type
    ):

        try:

            raw_body = (
                request.body.decode(
                    "utf-8"
                )
                if request.body
                else ""
            )


            if not raw_body:

                return {}


            payload = json.loads(
                raw_body
            )


            if not isinstance(
                payload,
                dict,
            ):

                return {}


            return payload


        except (
            UnicodeDecodeError,
            json.JSONDecodeError,
        ):

            raise ValueError(
                "Invalid JSON request body."
            )


    return request.POST.dict()


# ============================================================
# DOCUMENT URL HELPER
# ============================================================

def _document_url(
    request,
    relative_path,
):
    """
    Convert a stored media path into an
    absolute URL for the React frontend.
    """

    if not relative_path:
        return None

    str_path = str(relative_path).strip()
    if not str_path:
        return None

    if str_path.startswith("http://") or str_path.startswith("https://"):
        return str_path

    media_url = str(
        getattr(
            settings,
            "MEDIA_URL",
            "/media/",
        )
        or "/media/"
    )

    if not media_url.endswith(
        "/"
    ):
        media_url += "/"

    cleaned_path = str_path.replace("\\", "/").lstrip("/")

    return request.build_absolute_uri(
        f"{media_url}{cleaned_path}"
    )


# ============================================================
# MILLER DETAIL RESPONSE BUILDER
# ============================================================

def _build_miller_detail_response(
    request,
    row,
):
    """
    Convert the raw Miller registration row
    into structured frontend sections.

    Used by:
        Review Application
        View Owner
        View Details
    """

    if not row:

        return None


    return {

        # ====================================================
        # ROOT
        # ====================================================

        "user_id":
            row["user_id"],

        "is_partnership":
            bool(row.get("is_partnership", False)),

        "status":
            row["status"],

        "user_role":
            row["user_role"],

        "message":
            row.get("message") or "",


        # ====================================================
        # PERSONAL INFORMATION
        # ====================================================

        "personal_information": {

            "first_name":
                row["first_name"],

            "middle_initial":
                row["middle_initial"],

            "last_name":
                row["last_name"],

            "suffix":
                row["suffix"],

            "gender":
                row["gender"],
        },


        # ====================================================
        # PERSONAL ADDRESS
        # ====================================================

        "personal_address": {

            "province":
                row["province"],

            "municipality":
                row["municipality"],

            "postal_code":
                row["postal_code"],

            "barangay":
                row["barangay"],

            "street_address":
                row["street_address"],
        },


        # ====================================================
        # ACCOUNT INFORMATION
        # ====================================================

        "account_information": {

            "email":
                row["email"],

            "contact_number":
                row["contact_number"],

            "username":
                row["username"],

            "message":
                row.get("message") or "",

            "created_at":
                _serialize_value(
                    row["created_at"]
                ),

            "updated_at":
                _serialize_value(
                    row["updated_at"]
                ),
        },


        # ====================================================
        # BUSINESS INFORMATION
        # ====================================================

        "business_information": {

            "supplier_profile_id":
                row[
                    "supplier_profile_id"
                ],

            "business_name":
                row[
                    "business_name"
                ],

            "organization_name":
                row[
                    "organization_name"
                ],

            "province":
                row[
                    "business_province"
                ],

            "municipality":
                row[
                    "business_municipality"
                ],

            "postal_code":
                row[
                    "business_postal_code"
                ],

            "barangay":
                row[
                    "business_barangay"
                ],

            "street_address":
                row[
                    "business_street_address"
                ],

            "official_email":
                row[
                    "official_email"
                ],

            "official_contact_number":
                row[
                    "official_contact_number"
                ],

            "created_at":
                _serialize_value(
                    row[
                        "business_created_at"
                    ]
                ),

            "updated_at":
                _serialize_value(
                    row[
                        "business_updated_at"
                    ]
                ),
        },


        # ====================================================
        # DOCUMENTS
        # ====================================================

        "documents": {

            "supplier_document_id":
                row.get(
                    "supplier_document_id"
                ),


            "government_issued_id": {

                "path":
                    row.get(
                        "government_issued_id"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "government_issued_id"
                        ),
                    ),
            },


            "business_permit": {

                "path":
                    row.get(
                        "business_permit"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "business_permit"
                        ),
                    ),
            },


            "business_registration": {

                "path":
                    row.get(
                        "business_registration"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "business_registration"
                        ),
                    ),
            },


            "milling_license": {

                "path":
                    row.get(
                        "milling_license"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "milling_license"
                        ),
                    ),
            },


            "created_at":
                _serialize_value(
                    row.get(
                        "documents_created_at"
                    )
                ),

            "updated_at":
                _serialize_value(
                    row.get(
                        "documents_updated_at"
                    )
                ),
        },
    }


# ============================================================
# MILLER MANAGEMENT LIST
# ============================================================

@require_GET
@account_admin_required
def miller_management_list(
    request,
):
    """
    Main Miller Management list.

    Tabs:
        to-review
        active
        inactive
    """

    tab = str(
        request.GET.get(
            "tab"
        )
        or TAB_TO_REVIEW
    ).strip().lower()


    if (
        tab
        not in VALID_MILLER_TABS
    ):

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Invalid Miller Management tab.",

                "allowed_tabs":
                    sorted(
                        VALID_MILLER_TABS
                    ),
            },
            status=400,
        )


    try:

        rows = list_millers(
            tab=tab
        )


        counts = (
            get_miller_status_counts()
        )


        return JsonResponse(
            {
                "success":
                    True,


                "tab":
                    tab,


                "counts": {

                    "to_review":
                        int(
                            counts.get(
                                "to_review"
                            )
                            or 0
                        ),

                    "active":
                        int(
                            counts.get(
                                "active"
                            )
                            or 0
                        ),

                    "inactive":
                        int(
                            counts.get(
                                "inactive"
                            )
                            or 0
                        ),
                },


                "results": [
                    _serialize_row(
                        row
                    )
                    for row in rows
                ],


                "total":
                    len(
                        rows
                    ),
            },
            status=200,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load Miller accounts.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# MILLER REGISTRATION / OWNER DETAILS
# ============================================================

@require_GET
@account_admin_required
def miller_management_detail(
    request,
    user_id,
):
    """
    Complete registration details.

    Used by:
        Review Application
        View Owner
    """

    try:

        row = get_miller_details(
            user_id
        )


        if not row:

            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Miller account was not found.",
                },
                status=404,
            )


        return JsonResponse(
            {
                "success":
                    True,

                "miller":
                    _build_miller_detail_response(
                        request,
                        row,
                    ),
            },
            status=200,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load Miller details.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# MILLER VIEW DETAILS
# ============================================================

@require_GET
@account_admin_required
def miller_management_view_details(
    request,
    user_id,
):
    """
    Complete Miller details page.

    Includes:
        overview
        owner
        active employees
        archived employees
        ratings
        reports
    """

    try:

        data = (
            get_miller_view_details_data(
                user_id
            )
        )


        if not data:

            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Miller account was not found.",
                },
                status=404,
            )


        owner = (
            _build_miller_detail_response(
                request,
                data.get(
                    "miller"
                ),
            )
        )


        overview = (
            _serialize_data(
                data.get(
                    "overview"
                )
                or {}
            )
        )


        active_employees = (
            _serialize_data(
                data.get(
                    "active_employees"
                )
                or []
            )
        )


        archived_employees = (
            _serialize_data(
                data.get(
                    "archived_employees"
                )
                or []
            )
        )


        ratings = (
            _serialize_data(
                data.get(
                    "ratings"
                )
                or []
            )
        )


        online_order_ratings = (
            _serialize_data(
                data.get(
                    "online_order_ratings"
                )
                or []
            )
        )


        branches = (
            _serialize_data(
                data.get(
                    "branches"
                )
                or []
            )
        )


        reports = (
            _serialize_data(
                data.get(
                    "reports"
                )
                or []
            )
        )


        return JsonResponse(
            {
                "success":
                    True,


                "data": {

                    "overview":
                        overview,

                    "owner":
                        owner,

                    "active_employees":
                        active_employees,

                    "archived_employees":
                        archived_employees,

                    "ratings":
                        ratings,

                    "online_order_ratings":
                        online_order_ratings,

                    "branches":
                        branches,

                    "reports":
                        reports,


                    "counts": {

                        "active_employees":
                            len(
                                active_employees
                            ),

                        "archived_employees":
                            len(
                                archived_employees
                            ),

                        "ratings":
                            len(
                                ratings
                            ),

                        "reports":
                            len(
                                reports
                            ),
                    },
                },
            },
            status=200,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load Miller View Details.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# CONFIRM MILLER APPLICATION
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def confirm_miller_management_application(
    request,
    user_id,
):
    """
    Confirm Miller registration.

    Flow:
        inactive
            ->
        active
    """

    try:

        result = (
            confirm_miller_application(
                user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "status":
                        result[
                            "status"
                        ],

                    "updated_at":
                        _serialize_value(
                            result[
                                "updated_at"
                            ]
                        ),

                    "email_sent":
                        result[
                            "email_sent"
                        ],

                    "email_error":
                        result[
                            "email_error"
                        ],
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to confirm the Miller application.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# ARCHIVE MILLER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_miller_management_account(
    request,
    user_id,
):
    """
    Archive active Miller.

    Expected body:

        {
            "reason": "..."
        }

    Flow:
        active
            ->
        archived
    """

    try:

        data = (
            _read_request_data(
                request
            )
        )


        reason = str(
            data.get(
                "reason"
            )
            or ""
        ).strip()


        result = (
            archive_miller_account(
                user_id=user_id,
                reason=reason,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "status":
                        result[
                            "status"
                        ],

                    "updated_at":
                        _serialize_value(
                            result[
                                "updated_at"
                            ]
                        ),

                    "archive_reason_id":
                        result[
                            "archive_reason_id"
                        ],

                    "archive_reason":
                        result[
                            "archive_reason"
                        ],

                    "archived_at":
                        _serialize_value(
                            result[
                                "archived_at"
                            ]
                        ),
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to archive the Miller account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# RESTORE MILLER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_miller_management_account(
    request,
    user_id,
):
    """
    Restore Miller from the management
    Inactive tab.

    Allowed:
        archived -> active
        deactivated -> active

    To Review status:
        inactive

    is deliberately not restored here.
    """

    try:

        result = (
            restore_miller_account(
                user_id=user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "business_name":
                        result[
                            "business_name"
                        ],

                    "status":
                        result[
                            "status"
                        ],

                    "updated_at":
                        _serialize_value(
                            result[
                                "updated_at"
                            ]
                        ),
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to restore the Miller account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# DELETE MILLER ACCOUNT PERMANENTLY
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_miller_management_account(
    request,
    user_id,
):
    """
    Permanently delete one Miller account.

    Allowed only when:
        archived
        deactivated

    Active and To Review accounts are rejected.
    """

    try:

        result = (
            delete_miller_account(
                user_id=user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "miller_name":
                        result[
                            "miller_name"
                        ],

                    "business_name":
                        result[
                            "business_name"
                        ],
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    f"Unable to permanently delete the Miller account: {str(exc)}"
                    if str(exc)
                    else "Unable to permanently delete the Miller account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# ARCHIVE MILLER EMPLOYEE
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_miller_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Archive one active employee.

    Expected body:

        {
            "reason": "..."
        }
    """

    try:

        data = (
            _read_request_data(
                request
            )
        )


        reason = str(
            data.get(
                "reason"
            )
            or ""
        ).strip()


        result = (
            archive_miller_employee(
                user_id=user_id,
                employee_id=employee_id,
                reason=reason,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "employee_id":
                        result[
                            "employee_id"
                        ],

                    "employee_name":
                        result[
                            "employee_name"
                        ],

                    "status":
                        result[
                            "status"
                        ],

                    "updated_at":
                        _serialize_value(
                            result[
                                "updated_at"
                            ]
                        ),

                    "archive_reason_id":
                        result[
                            "archive_reason_id"
                        ],

                    "archive_reason":
                        result[
                            "archive_reason"
                        ],

                    "archived_at":
                        _serialize_value(
                            result[
                                "archived_at"
                            ]
                        ),
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to archive the Miller employee.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# RESTORE / RETRIEVE MILLER EMPLOYEE
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_miller_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Retrieve employee account.

    Flow:
        archived / inactive / deactivated
                    ->
                  active
    """

    try:

        result = (
            restore_miller_employee(
                user_id=user_id,
                employee_id=employee_id,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "employee_id":
                        result[
                            "employee_id"
                        ],

                    "employee_name":
                        result[
                            "employee_name"
                        ],

                    "status":
                        result[
                            "status"
                        ],

                    "updated_at":
                        _serialize_value(
                            result[
                                "updated_at"
                            ]
                        ),
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to retrieve the Miller employee account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# DELETE MILLER EMPLOYEE PERMANENTLY
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_miller_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Permanently delete one archived,
    inactive, or deactivated Miller employee.
    """

    try:

        result = (
            delete_miller_employee(
                user_id=user_id,
                employee_id=employee_id,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result[
                        "message"
                    ],


                "data": {

                    "employee_id":
                        result[
                            "employee_id"
                        ],

                    "employee_name":
                        result[
                            "employee_name"
                        ],
                },
            },
            status=200,
        )


    except ValueError as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    str(
                        exc
                    ),
            },
            status=400,
        )


    except Exception as exc:

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to permanently delete the Miller employee.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# MILLER ONLINE ORDER RATINGS
# ============================================================

@csrf_exempt
@require_GET
@account_admin_required
def get_miller_online_order_ratings_view(
    request,
    user_id,
):
    """
    GET /admin/millers/<user_id>/online-order-ratings/
    Accepts optional branch_id query parameter.
    """
    branch_id = request.GET.get("branch_id")
    ratings = get_miller_online_order_ratings(
        user_id,
        branch_id=branch_id,
    )
    branches = get_miller_branches(
        user_id
    )

    return JsonResponse(
        {
            "status": "success",
            "data": _serialize_data(ratings),
            "branches": _serialize_data(branches),
        },
        status=200,
    )

# ============================================================
# RESOLVE MILLER REPORT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def resolve_miller_management_report(
    request,
    report_id=None,
    user_id=None,
):
    from .services import resolve_miller_report
    try:
        data = _read_request_data(request)
        target_report_id = report_id or data.get("report_id")

        result = resolve_miller_report(target_report_id)

        return JsonResponse(
            {
                "success": True,
                "message": "Miller report marked as resolved successfully.",
                "data": result,
            },
            status=200,
        )
    except LookupError as exc:
        return JsonResponse({"success": False, "message": str(exc)}, status=404)
    except ValueError as exc:
        return JsonResponse({"success": False, "message": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"success": False, "message": "Unable to resolve report.", "error": str(exc)}, status=500)

