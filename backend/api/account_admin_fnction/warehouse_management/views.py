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
    VALID_WAREHOUSE_TABS,
    get_warehouse_details,
    get_warehouse_status_counts,
    get_warehouse_view_details_data,
    list_warehouses,
)

from .services import (
    archive_warehouse_account,
    archive_warehouse_employee,
    confirm_warehouse_application,
    delete_warehouse_account,
    delete_warehouse_employee,
    restore_warehouse_account,
    restore_warehouse_employee,
)


# ============================================================
# SERIALIZATION HELPERS
# ============================================================

def _serialize_value(value):
    """
    Convert supported Python / PostgreSQL
    values into JSON-safe values.
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
    Convert stored document path into
    an absolute media URL.
    """

    if not relative_path:

        return None


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


    cleaned_path = str(
        relative_path
    ).lstrip("/")


    return request.build_absolute_uri(
        f"{media_url}{cleaned_path}"
    )


# ============================================================
# WAREHOUSE DETAIL RESPONSE BUILDER
# ============================================================

def _build_warehouse_detail_response(
    request,
    row,
):
    """
    Convert the raw Warehouse Manager registration
    result into structured frontend sections.

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
        # WAREHOUSE / BUSINESS INFORMATION
        # ====================================================

        "business_information": {

            "warehouse_profile_id":
                row[
                    "warehouse_profile_id"
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

            "warehouse_document_id":
                row.get(
                    "warehouse_document_id"
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


            "warehouse_license": {

                "path":
                    row.get(
                        "warehouse_license"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "warehouse_license"
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
# WAREHOUSE MANAGEMENT LIST
# ============================================================

@require_GET
@account_admin_required
def warehouse_management_list(
    request,
):
    """
    Main Warehouse Management list.

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
        not in VALID_WAREHOUSE_TABS
    ):

        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Invalid Warehouse Management tab.",

                "allowed_tabs":
                    sorted(
                        VALID_WAREHOUSE_TABS
                    ),
            },
            status=400,
        )


    try:

        rows = list_warehouses(
            tab=tab
        )


        counts = (
            get_warehouse_status_counts()
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
                    "Unable to load Warehouse Manager accounts.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# WAREHOUSE REGISTRATION / OWNER DETAILS
# ============================================================

@require_GET
@account_admin_required
def warehouse_management_detail(
    request,
    user_id,
):
    """
    Complete Warehouse Manager registration details.

    Used by:
        Review Application
        View Owner
    """

    try:

        row = get_warehouse_details(
            user_id
        )


        if not row:

            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Warehouse Manager account was not found.",
                },
                status=404,
            )


        return JsonResponse(
            {
                "success":
                    True,

                "warehouse":
                    _build_warehouse_detail_response(
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
                    "Unable to load Warehouse Manager details.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# WAREHOUSE VIEW DETAILS
# ============================================================

@require_GET
@account_admin_required
def warehouse_management_view_details(
    request,
    user_id,
):
    """
    Complete Warehouse View Details page.

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
            get_warehouse_view_details_data(
                user_id
            )
        )


        if not data:

            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Warehouse Manager account was not found.",
                },
                status=404,
            )


        owner = (
            _build_warehouse_detail_response(
                request,
                data.get(
                    "warehouse"
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


        reports = (
            _serialize_data(
                data.get(
                    "reports"
                )
                or []
            )
        )


        profiles = (
            _serialize_data(
                data.get(
                    "profiles"
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

                    "profiles":
                        profiles,

                    "active_employees":
                        active_employees,

                    "archived_employees":
                        archived_employees,

                    "ratings":
                        ratings,

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
                    "Unable to load Warehouse View Details.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# CONFIRM WAREHOUSE APPLICATION
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def confirm_warehouse_management_application(
    request,
    user_id,
):
    """
    Confirm Warehouse Manager registration.

    Flow:
        inactive
            ->
        active
    """

    try:

        result = (
            confirm_warehouse_application(
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
                    "Unable to confirm the Warehouse Manager application.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# ARCHIVE WAREHOUSE ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_warehouse_management_account(
    request,
    user_id,
):
    """
    Archive active Warehouse Manager account.

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
            archive_warehouse_account(
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
                    "Unable to archive the Warehouse Manager account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# RESTORE WAREHOUSE ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_warehouse_management_account(
    request,
    user_id,
):
    """
    Restore Warehouse Manager account.

    Allowed:
        archived -> active
        deactivated -> active

    status = inactive remains reserved
    for To Review applications.
    """

    try:

        result = (
            restore_warehouse_account(
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
                    "Unable to restore the Warehouse Manager account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# DELETE WAREHOUSE ACCOUNT PERMANENTLY
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_warehouse_management_account(
    request,
    user_id,
):
    """
    Permanently delete Warehouse Manager account.

    Allowed only when:
        archived
        deactivated
    """

    try:

        result = (
            delete_warehouse_account(
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

                    "manager_name":
                        result[
                            "manager_name"
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
                    f"Unable to permanently delete the Warehouse Manager account: {str(exc)}"
                    if str(exc)
                    else "Unable to permanently delete the Warehouse Manager account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# ARCHIVE WAREHOUSE EMPLOYEE
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_warehouse_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Archive one active Warehouse employee.

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
            archive_warehouse_employee(
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
                    "Unable to archive the Warehouse employee.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# RESTORE / RETRIEVE WAREHOUSE EMPLOYEE
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_warehouse_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Retrieve Warehouse employee account.

    Flow:
        archived / inactive / deactivated
                    ->
                  active
    """

    try:

        result = (
            restore_warehouse_employee(
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
                    "Unable to retrieve the Warehouse employee account.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )


# ============================================================
# DELETE WAREHOUSE EMPLOYEE PERMANENTLY
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_warehouse_management_employee(
    request,
    user_id,
    employee_id,
):
    """
    Permanently delete one archived,
    inactive, or deactivated Warehouse employee.
    """

    try:

        result = (
            delete_warehouse_employee(
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
                    "Unable to permanently delete the Warehouse employee.",

                "error":
                    str(
                        exc
                    ),
            },
            status=500,
        )