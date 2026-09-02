from datetime import date, datetime
from decimal import Decimal

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from ..admin_auth import account_admin_required
from .selectors import get_admin_dashboard_data


# ============================================================
# JSON SERIALIZATION
# ============================================================

def _serialize_value(value):
    """
    Convert database/Python values into JSON-safe values.
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

    if isinstance(
        value,
        dict,
    ):
        return {
            key: _serialize_value(item)
            for key, item in value.items()
        }

    if isinstance(
        value,
        (list, tuple),
    ):
        return [
            _serialize_value(item)
            for item in value
        ]

    return value


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@require_GET
@account_admin_required
def admin_dashboard(request):
    """
    Return all Account Admin dashboard data.

    GET:
        /admin/dashboard/

    Includes:
        - clickable management KPI counts
        - overall user count
        - account status summary
        - entity breakdown
        - per-role status breakdown
        - recent user activity

    Existing Account Admin JWT authentication is required.
    """

    try:
        dashboard_data = (
            get_admin_dashboard_data()
        )

        return JsonResponse(
            {
                "success":
                    True,

                "dashboard":
                    _serialize_value(
                        dashboard_data
                    ),

                "fetched_at":
                    timezone.now().isoformat(),
            },
            status=200,
        )

    except Exception as exc:
        return JsonResponse(
            {
                "success":
                    False,

                "message":
                    "Unable to load the admin dashboard.",

                "error":
                    str(exc),
            },
            status=500,
        )