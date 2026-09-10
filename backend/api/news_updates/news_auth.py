from functools import wraps

from django.db import connection
from django.http import JsonResponse

from api.utils import (
    authorization_payload,
)


ALLOWED_NEWS_MAIN_USER_ROLES = {
    "farmer",
    "miller_manager",
    "warehouse_manager",
    "retailer",
}


# ============================================================
# AUTHENTICATED MAIN USER
# ============================================================

def get_authenticated_news_user(
    request,
):
    payload = (
        authorization_payload(
            request
        )
    )

    if not payload:
        return None


    # Centralized GrainRise login only.

    if (
        payload.get(
            "auth_source"
        )
        != "grainrise"
    ):
        return None


    # Main users only.
    # Employees are intentionally excluded.

    if (
        payload.get(
            "account_type"
        )
        != "main_user"
    ):
        return None


    token_role = str(
        payload.get(
            "role",
            "",
        )
    ).strip()


    if (
        token_role
        not in
        ALLOWED_NEWS_MAIN_USER_ROLES
    ):
        return None


    try:
        user_id = int(
            payload.get(
                "sub"
            )
        )

    except (
        TypeError,
        ValueError,
    ):
        return None


    if user_id <= 0:
        return None


    # ========================================================
    # RE-CHECK CURRENT DB STATUS + ROLE
    # ========================================================

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                user_id,
                first_name,
                middle_initial,
                last_name,
                suffix,
                email,
                contact_number,
                username,
                user_role::TEXT,
                status::TEXT

            FROM users

            WHERE
                user_id = %s

                AND user_role::TEXT = %s

                AND status::TEXT =
                    'active'

            LIMIT 1
            """,
            [
                user_id,
                token_role,
            ],
        )

        row = cursor.fetchone()


    if not row:
        return None


    return {
        "user_id":
            row[0],

        "first_name":
            row[1],

        "middle_initial":
            row[2],

        "last_name":
            row[3],

        "suffix":
            row[4],

        "email":
            row[5],

        "contact_number":
            row[6],

        "username":
            row[7],

        "role":
            row[8],

        "status":
            row[9],

        "account_type":
            "main_user",
    }


# ============================================================
# NEWS MAIN USER GUARD
# ============================================================

def news_main_user_required(
    view_func,
):

    @wraps(view_func)
    def wrapped_view(
        request,
        *args,
        **kwargs,
    ):
        news_user = (
            get_authenticated_news_user(
                request
            )
        )

        if not news_user:
            return JsonResponse(
                {
                    "success":
                        False,

                    "message": (
                        "News & Updates authentication "
                        "required. Please sign in using "
                        "an active GrainRise main account."
                    ),
                },
                status=401,
            )


        request.grainrise_news_user = (
            news_user
        )

        request.grainrise_news_user_id = (
            news_user[
                "user_id"
            ]
        )

        request.grainrise_news_user_role = (
            news_user[
                "role"
            ]
        )


        return view_func(
            request,
            *args,
            **kwargs,
        )


    return wrapped_view