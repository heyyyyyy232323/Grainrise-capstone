from functools import wraps

from django.http import JsonResponse

from api.utils import require_admin


def account_admin_required(view_func):
    """
    Protect Account Admin API endpoints.

    Only requests with a valid GrainRise
    administrator Bearer token are allowed.
    """

    @wraps(view_func)
    def wrapped_view(
        request,
        *args,
        **kwargs,
    ):
        if not require_admin(request):
            return JsonResponse(
                {
                    "success": False,
                    "message": "Administrator authentication required.",
                },
                status=401,
            )

        return view_func(
            request,
            *args,
            **kwargs,
        )

    return wrapped_view