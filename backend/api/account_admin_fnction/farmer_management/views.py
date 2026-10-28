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
    VALID_FARMER_TABS,
    get_farmer_details,
    get_farmer_farms,
    get_farmer_farm_summary,
    get_farmer_rating_summary,
    get_farmer_ratings,
    get_farmer_status_counts,
    list_farmers,
)

from .services import (
    archive_farmer_account,
    confirm_farmer_application,
    delete_farmer_account,
    restore_farmer_account,
)


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    """
    Convert Python/database values into JSON-safe values.
    """

    if isinstance(value, (datetime, date)):
        return value.isoformat()

    if isinstance(value, Decimal):
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
        for key, value in row.items()
    }


def _serialize_rows(rows):
    """
    Serialize multiple dictionary rows.
    """

    return [
        _serialize_row(row)
        for row in rows
    ]


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
        request.content_type or ""
    ).lower()

    if "application/json" in content_type:
        try:
            raw_body = (
                request.body.decode("utf-8")
                if request.body
                else ""
            )

            if not raw_body:
                return {}

            payload = json.loads(raw_body)

            if not isinstance(payload, dict):
                return {}

            return payload

        except (
            UnicodeDecodeError,
            json.JSONDecodeError,
        ) as exc:
            raise ValueError(
                "Invalid JSON request body."
            ) from exc

    return request.POST.dict()


# ============================================================
# DOCUMENT URL
# ============================================================

def _document_url(
    request,
    relative_path,
):
    """
    Convert a stored Farmer document path
    into an absolute media URL.
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

    if not media_url.endswith("/"):
        media_url += "/"

    cleaned_path = str(
        relative_path
    ).lstrip("/")

    return request.build_absolute_uri(
        f"{media_url}{cleaned_path}"
    )


# ============================================================
# FARM ADDRESS
# ============================================================

def _build_farm_address(farm):
    """
    Build one complete Farmer farm address.
    """

    parts = [
        farm.get("street_address"),
        farm.get("barangay"),
        farm.get("municipality"),
        farm.get("province"),
        farm.get("postal_code"),
    ]

    cleaned = [
        str(value).strip()
        for value in parts
        if str(value or "").strip()
    ]

    return ", ".join(cleaned)


# ============================================================
# FARM RESPONSE
# ============================================================

def _build_farm_response(farm):
    """
    Structure one registered farm.
    """

    return {
        "farm_id": farm.get(
            "farm_id"
        ),

        "farm_name": farm.get(
            "farm_name"
        ),

        "location": {
            "province": farm.get(
                "province"
            ),

            "municipality": farm.get(
                "municipality"
            ),

            "postal_code": farm.get(
                "postal_code"
            ),

            "barangay": farm.get(
                "barangay"
            ),

            "street_address": farm.get(
                "street_address"
            ),

            "complete_address": _build_farm_address(
                farm
            ),
        },

        "total_farm_area": _serialize_value(
            farm.get(
                "total_farm_area"
            )
        ),

        "land_ownership_status": farm.get(
            "land_ownership_status"
        ),

        "rice_variety_currently_planted": farm.get(
            "rice_variety_currently_planted"
        ),

        "cropping_cycles_per_year": farm.get(
            "cropping_cycles_per_year"
        ),

        "farm_status": farm.get(
            "farm_status"
        ),

        "created_at": _serialize_value(
            farm.get(
                "created_at"
            )
        ),

        "updated_at": _serialize_value(
            farm.get(
                "updated_at"
            )
        ),
    }


# ============================================================
# RATING SUMMARY RESPONSE
# ============================================================

def _build_rating_summary_response(
    rating_summary,
):
    """
    Structure Farmer rating summary.
    """

    rating_summary = (
        rating_summary or {}
    )

    return {
        "average_rating": _serialize_value(
            rating_summary.get(
                "average_rating"
            )
            or 0
        ),

        "rating_count": int(
            rating_summary.get(
                "rating_count"
            )
            or 0
        ),

        "five_star": int(
            rating_summary.get(
                "five_star"
            )
            or 0
        ),

        "four_star": int(
            rating_summary.get(
                "four_star"
            )
            or 0
        ),

        "three_star": int(
            rating_summary.get(
                "three_star"
            )
            or 0
        ),

        "two_star": int(
            rating_summary.get(
                "two_star"
            )
            or 0
        ),

        "one_star": int(
            rating_summary.get(
                "one_star"
            )
            or 0
        ),
    }


# ============================================================
# RATING RESPONSE
# ============================================================

def _build_rating_response(rating):
    """
    Structure one Farmer rating.
    """

    return {
        "farmer_rating_id": rating.get(
            "farmer_rating_id"
        ),

        "farmer_user_id": rating.get(
            "farmer_user_id"
        ),

        "reviewer": {
            "user_id": rating.get(
                "reviewer_user_id"
            ),

            "name": rating.get(
                "reviewer_name"
            ),

            "email": rating.get(
                "reviewer_email"
            ),

            "role": rating.get(
                "reviewer_role"
            ),
        },

        "rating": int(
            rating.get(
                "rating"
            )
            or 0
        ),

        "comment": rating.get(
            "comment"
        ),

        "created_at": _serialize_value(
            rating.get(
                "created_at"
            )
        ),
    }


# ============================================================
# COMPLETE FARMER DETAIL RESPONSE
# ============================================================

def _build_farmer_detail_response(
    request,
    row,
    farms,
    farm_summary,
    rating_summary,
    ratings,
):
    """
    Structure complete Farmer details.

    Used by:
        Review Modal
        View Details Modal
    """

    if not row:
        return None

    rsbsa_document = row.get(
        "rsbsa_document"
    )
    government_issued_id = row.get(
        "government_issued_id"
    )

    return {
        # ====================================================
        # ACCOUNT ROOT
        # ====================================================

        "user_id": row.get(
            "user_id"
        ),

        "is_partnership": bool(
            row.get("is_partnership", False)
        ),

        "message": row.get(
            "message"
        ) or "",

        "status": row.get(
            "status"
        ),

        "user_role": row.get(
            "user_role"
        ),

        "government_issued_id": {
            "path": government_issued_id,
            "url": _document_url(
                request,
                government_issued_id,
            ),
        } if government_issued_id else None,


        # ====================================================
        # PERSONAL INFORMATION
        # ====================================================

        "personal_information": {
            "first_name": row.get(
                "first_name"
            ),

            "middle_initial": row.get(
                "middle_initial"
            ),

            "last_name": row.get(
                "last_name"
            ),

            "suffix": row.get(
                "suffix"
            ),

            "gender": row.get(
                "gender"
            ),
        },


        # ====================================================
        # ADDRESS INFORMATION
        # ====================================================

        "address_information": {
            "province": row.get(
                "province"
            ),

            "municipality": row.get(
                "municipality"
            ),

            "postal_code": row.get(
                "postal_code"
            ),

            "barangay": row.get(
                "barangay"
            ),

            "street_address": row.get(
                "street_address"
            ),
        },


        # ====================================================
        # ACCOUNT INFORMATION
        # ====================================================

        "account_information": {
            "email": row.get(
                "email"
            ),

            "contact_number": row.get(
                "contact_number"
            ),

            "username": row.get(
                "username"
            ),

            "created_at": _serialize_value(
                row.get(
                    "created_at"
                )
            ),

            "updated_at": _serialize_value(
                row.get(
                    "updated_at"
                )
            ),
        },


        # ====================================================
        # RSBSA COMPLIANCE
        # ====================================================

        "compliance": {
            "farmer_compliance_id": row.get(
                "farmer_compliance_id"
            ),

            "rsbsa_number": row.get(
                "rsbsa_number"
            ),

            "submission_method": row.get(
                "submission_method"
            ),

            "rsbsa_document": {
                "path": rsbsa_document,

                "url": _document_url(
                    request,
                    rsbsa_document,
                ),
            },

            "government_issued_id": {
                "path": government_issued_id,

                "url": _document_url(
                    request,
                    government_issued_id,
                ),
            } if government_issued_id else None,

            "created_at": _serialize_value(
                row.get(
                    "compliance_created_at"
                )
            ),

            "updated_at": _serialize_value(
                row.get(
                    "compliance_updated_at"
                )
            ),
        },


        # ====================================================
        # FARM SUMMARY
        # ====================================================

        "farm_summary": {
            "farm_count": int(
                farm_summary.get(
                    "farm_count"
                )
                or 0
            ),

            "active_farm_count": int(
                farm_summary.get(
                    "active_farm_count"
                )
                or 0
            ),

            "inactive_farm_count": int(
                farm_summary.get(
                    "inactive_farm_count"
                )
                or 0
            ),

            "total_farm_area": _serialize_value(
                farm_summary.get(
                    "total_farm_area"
                )
                or 0
            ),
        },


        # ====================================================
        # REGISTERED FARMS
        # ====================================================

        "farms": [
            _build_farm_response(
                farm
            )
            for farm in farms
        ],


        # ====================================================
        # RATINGS
        # ====================================================

        "rating_summary": (
            _build_rating_summary_response(
                rating_summary
            )
        ),

        "ratings": [
            _build_rating_response(
                rating
            )
            for rating in ratings
        ],
    }


# ============================================================
# FARMER MANAGEMENT LIST
# ============================================================

@require_GET
@account_admin_required
def farmer_management_list(request):
    """
    Farmer Management list.

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

    if tab not in VALID_FARMER_TABS:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Invalid Farmer Management tab."
                ),

                "allowed_tabs": sorted(
                    VALID_FARMER_TABS
                ),
            },
            status=400,
        )

    try:
        rows = list_farmers(
            tab=tab
        )

        counts = (
            get_farmer_status_counts()
        )

        return JsonResponse(
            {
                "success": True,

                "tab": tab,

                "counts": {
                    "to_review": int(
                        counts.get(
                            "to_review"
                        )
                        or 0
                    ),

                    "active": int(
                        counts.get(
                            "active"
                        )
                        or 0
                    ),

                    "inactive": int(
                        counts.get(
                            "inactive"
                        )
                        or 0
                    ),
                },

                "results": _serialize_rows(
                    rows
                ),

                "total": len(
                    rows
                ),
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to load Farmer accounts."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )


# ============================================================
# FARMER DETAILS
# ============================================================

@require_GET
@account_admin_required
def farmer_management_detail(
    request,
    user_id,
):
    """
    Complete Farmer information.

    Used by:
        To Review -> Review Modal
        Active -> View Details Modal
        Inactive -> View Details Modal

    Includes:
        personal information
        address
        account
        RSBSA compliance
        farms
        rating summary
        rating history

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        row = get_farmer_details(
            user_id
        )

        if not row:
            return JsonResponse(
                {
                    "success": False,

                    "message": (
                        "Farmer account was not found."
                    ),
                },
                status=404,
            )

        farms = get_farmer_farms(
            user_id
        )

        farm_summary = (
            get_farmer_farm_summary(
                user_id
            )
        )

        rating_summary = (
            get_farmer_rating_summary(
                user_id
            )
        )

        ratings = get_farmer_ratings(
            user_id
        )

        farmer = (
            _build_farmer_detail_response(
                request,
                row,
                farms,
                farm_summary,
                rating_summary,
                ratings,
            )
        )

        return JsonResponse(
            {
                "success": True,

                "farmer": farmer,
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to load Farmer details."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )


# ============================================================
# CONFIRM FARMER APPLICATION
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def confirm_farmer_management_application(
    request,
    user_id,
):
    """
    Confirm Farmer registration.

    inactive -> active

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            confirm_farmer_application(
                user_id
            )
        )

        return JsonResponse(
            {
                "success": True,

                "message": result.get(
                    "message"
                ),

                "data": {
                    "user_id": result.get(
                        "user_id"
                    ),

                    "farmer_name": result.get(
                        "farmer_name"
                    ),

                    "status": result.get(
                        "status"
                    ),

                    "updated_at": _serialize_value(
                        result.get(
                            "updated_at"
                        )
                    ),

                    "email_sent": result.get(
                        "email_sent",
                        False,
                    ),

                    "email_error": result.get(
                        "email_error"
                    ),

                    "sms_sent": result.get(
                        "sms_sent",
                        False,
                    ),

                    "sms_error": result.get(
                        "sms_error"
                    ),
                },
            },
            status=200,
        )

    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,

                "message": str(
                    exc
                ),
            },
            status=400,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to confirm the Farmer application."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )


# ============================================================
# ARCHIVE FARMER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def archive_farmer_management_account(
    request,
    user_id,
):
    """
    Archive an active Farmer.

    active -> archived

    Required body:
        {
            "reason": "..."
        }

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        data = _read_request_data(
            request
        )

        reason = str(
            data.get(
                "reason"
            )
            or ""
        ).strip()

        result = (
            archive_farmer_account(
                user_id=user_id,
                reason=reason,
            )
        )

        return JsonResponse(
            {
                "success": True,

                "message": result.get(
                    "message"
                ),

                "data": {
                    "user_id": result.get(
                        "user_id"
                    ),

                    "farmer_name": result.get(
                        "farmer_name"
                    ),

                    "status": result.get(
                        "status"
                    ),

                    "updated_at": _serialize_value(
                        result.get(
                            "updated_at"
                        )
                    ),

                    "archive_reason_id": result.get(
                        "archive_reason_id"
                    ),

                    "archive_reason": result.get(
                        "archive_reason"
                    ),

                    "archived_at": _serialize_value(
                        result.get(
                            "archived_at"
                        )
                    ),
                },
            },
            status=200,
        )

    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,

                "message": str(
                    exc
                ),
            },
            status=400,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to archive the Farmer account."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )


# ============================================================
# RESTORE FARMER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def restore_farmer_management_account(
    request,
    user_id,
):
    """
    Restore Farmer from Management Inactive.

    archived -> active
    deactivated -> active

    Registration inactive remains under To Review.

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            restore_farmer_account(
                user_id=user_id
            )
        )

        return JsonResponse(
            {
                "success": True,

                "message": result.get(
                    "message"
                ),

                "data": {
                    "user_id": result.get(
                        "user_id"
                    ),

                    "farmer_name": result.get(
                        "farmer_name"
                    ),

                    "status": result.get(
                        "status"
                    ),

                    "updated_at": _serialize_value(
                        result.get(
                            "updated_at"
                        )
                    ),
                },
            },
            status=200,
        )

    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,

                "message": str(
                    exc
                ),
            },
            status=400,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to restore the Farmer account."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )


# ============================================================
# DELETE FARMER ACCOUNT
# ============================================================

@csrf_exempt
@require_POST
@account_admin_required
def delete_farmer_management_account(
    request,
    user_id,
):
    """
    Permanently delete Farmer.

    Allowed:
        archived
        deactivated

    JWT ADMIN SESSION REQUIRED.
    """

    try:
        result = (
            delete_farmer_account(
                user_id=user_id
            )
        )

        return JsonResponse(
            {
                "success": True,

                "message": result.get(
                    "message"
                ),

                "data": {
                    "user_id": result.get(
                        "user_id"
                    ),

                    "farmer_name": result.get(
                        "farmer_name"
                    ),

                    "email": result.get(
                        "email"
                    ),
                },
            },
            status=200,
        )

    except ValueError as exc:
        return JsonResponse(
            {
                "success": False,

                "message": str(
                    exc
                ),
            },
            status=400,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success": False,

                "message": (
                    "Unable to permanently delete the Farmer account."
                ),

                "error": str(
                    exc
                ),
            },
            status=500,
        )