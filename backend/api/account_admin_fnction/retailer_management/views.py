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
    VALID_RETAILER_TABS,
    get_retailer_details,
    get_retailer_status_counts,
    list_retailers,
)

from .services import (
    archive_retailer_account,
    confirm_retailer_application,
    delete_retailer_account,
    restore_retailer_account,
)


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    """
    Convert Python/database values into JSON-safe values.
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
        return float(value)

    return value


def _serialize_row(row):
    """
    Serialize one dictionary row.
    """

    if not row:
        return None

    return {
        key: _serialize_value(value)
        for key, value
        in row.items()
    }


# ============================================================
# REQUEST BODY
# ============================================================

def _read_request_data(request):
    """
    Support:
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
# DOCUMENT URL
# ============================================================

def _document_url(
    request,
    relative_path,
):
    """
    Convert stored Retailer document path
    into an absolute frontend-accessible media URL.
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
# RETAILER DETAIL RESPONSE
# ============================================================

def _build_retailer_detail_response(
    request,
    row,
):
    """
    Structure Retailer information for both:

        Review Application Modal
        View Details Modal

    There is intentionally no separate RetailerInfo page.
    """

    if not row:
        return None


    return {

        # ====================================================
        # ROOT ACCOUNT
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

        "business_name":
            row.get("business_name") or row.get("organization_name") or "",

        "organization_name":
            row.get("organization_name") or row.get("business_name") or "",


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
        # ADDRESS
        # ====================================================

        "address_information": {

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

            "business_name":
                row.get("business_name") or row.get("organization_name") or "",

            "organization_name":
                row.get("organization_name") or row.get("business_name") or "",
        },


        # ====================================================
        # DOCUMENTS
        # ====================================================

        "documents": {

            "retailer_document_id":
                row.get(
                    "retailer_document_id"
                ),


            "barangay_permit": {

                "path":
                    row.get(
                        "barangay_permit"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "barangay_permit"
                        ),
                    ),
            },


            "valid_id": {

                "path":
                    row.get(
                        "valid_id"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "valid_id"
                        ),
                    ),
            },


            "government_issued_id": {

                "path":
                    row.get(
                        "government_issued_id"
                    ) or row.get(
                        "valid_id"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "government_issued_id"
                        ) or row.get(
                            "valid_id"
                        ),
                    ),
            },


            "business_verification_document": {

                "path":
                    row.get(
                        "barangay_permit"
                    ),

                "url":
                    _document_url(
                        request,
                        row.get(
                            "barangay_permit"
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
# RETAILER MANAGEMENT LIST
# ============================================================

@require_GET
@account_admin_required
def retailer_management_list(
    request,
):
    """
    Main Retailer Management list.

    Tabs:
        to-review
        active
        inactive

    JWT ADMIN SESSION REQUIRED.
    """

    tab = str(
        request.GET.get(
            "tab"
        )
        or TAB_TO_REVIEW
    ).strip().lower()


    if (
        tab
        not in
        VALID_RETAILER_TABS
    ):
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Invalid Retailer Management tab.",

                "allowed_tabs":
                    sorted(
                        VALID_RETAILER_TABS
                    ),
            },
            status=400,
        )


    try:
        rows = list_retailers(
            tab=tab
        )


        counts = (
            get_retailer_status_counts()
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
                    "Unable to load Retailer accounts.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# RETAILER DETAILS
# ============================================================

@require_GET
@account_admin_required
def retailer_management_detail(
    request,
    user_id,
):
    """
    Fetch complete Retailer information.

    Used by:
        Review Modal
        Active -> View Details Modal
        Inactive -> View Details Modal

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        row = get_retailer_details(
            user_id
        )


        if not row:
            return JsonResponse(
                {
                    "success":
                        False,

                    "message":
                        "Retailer account was not found.",
                },
                status=404,
            )


        retailer = (
            _build_retailer_detail_response(
                request,
                row,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "retailer":
                    retailer,
            },
            status=200,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load Retailer details.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# CONFIRM RETAILER APPLICATION
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def confirm_retailer_management_application(
    request,
    user_id,
):
    """
    Confirm Retailer registration.

    Flow:
        inactive -> active

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            confirm_retailer_application(
                user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result["message"],

                "data": {

                    "user_id":
                        result["user_id"],

                    "status":
                        result["status"],

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
                    str(exc),
            },
            status=400,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to confirm the Retailer application.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# ARCHIVE RETAILER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_retailer_management_account(
    request,
    user_id,
):
    """
    Archive active Retailer account.

    Expected body:

        {
            "reason": "..."
        }

    Flow:
        active -> archived

    JWT ADMIN SESSION REQUIRED.
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
            archive_retailer_account(
                user_id=user_id,
                reason=reason,
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result["message"],

                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "retailer_name":
                        result.get(
                            "retailer_name"
                        ),

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
                    str(exc),
            },
            status=400,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to archive the Retailer account.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# RESTORE RETAILER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_retailer_management_account(
    request,
    user_id,
):
    """
    Restore Retailer from Management Inactive.

    Allowed:
        archived -> active
        deactivated -> active

    Registration:
        inactive

    remains in To Review and cannot be restored here.

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            restore_retailer_account(
                user_id=user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result["message"],

                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "retailer_name":
                        result[
                            "retailer_name"
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
                    str(exc),
            },
            status=400,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to restore the Retailer account.",

                "error":
                    str(exc),
            },
            status=500,
        )


# ============================================================
# DELETE RETAILER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_retailer_management_account(
    request,
    user_id,
):
    """
    Permanently delete Retailer.

    Allowed:
        archived
        deactivated

    Active and registration-pending accounts
    are rejected.

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            delete_retailer_account(
                user_id=user_id
            )
        )


        return JsonResponse(
            {
                "success":
                    True,

                "message":
                    result["message"],

                "data": {

                    "user_id":
                        result[
                            "user_id"
                        ],

                    "retailer_name":
                        result[
                            "retailer_name"
                        ],

                    "email":
                        result[
                            "email"
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
                    str(exc),
            },
            status=400,
        )


    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    f"Unable to permanently delete the Retailer account: {str(exc)}"
                    if str(exc)
                    else "Unable to permanently delete the Retailer account.",

                "error":
                    str(exc),
            },
            status=500,
        )