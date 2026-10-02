from django.db import connection


# ============================================================
# CONSTANTS
# ============================================================

RECIPIENT_ALL_USERS = "all_users"
RECIPIENT_MILLER = "miller_manager"
RECIPIENT_WAREHOUSE = "warehouse_manager"
RECIPIENT_RETAILER = "retailer"
RECIPIENT_FARMER = "farmer"
RECIPIENT_SPECIFIC = "specific_user"
RECIPIENT_PARTNERSHIP = "partnership_inquiry"


VALID_RECIPIENT_TYPES = {
    RECIPIENT_ALL_USERS,
    RECIPIENT_MILLER,
    RECIPIENT_WAREHOUSE,
    RECIPIENT_RETAILER,
    RECIPIENT_FARMER,
    RECIPIENT_SPECIFIC,
    RECIPIENT_PARTNERSHIP,
    "user",
}


RECIPIENT_LABELS = {
    RECIPIENT_ALL_USERS: "All Users",
    RECIPIENT_MILLER: "Miller Managers",
    RECIPIENT_WAREHOUSE: "Warehouse Managers",
    RECIPIENT_RETAILER: "Retailers",
    RECIPIENT_FARMER: "Farmers",
    RECIPIENT_SPECIFIC: "Specific User",
    RECIPIENT_PARTNERSHIP: "Partner With Us Applicant",
    "user": "Specific User",
}


# ============================================================
# DATABASE RESULT HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    if not cursor.description:
        return []

    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(
            zip(
                columns,
                row,
            )
        )
        for row in cursor.fetchall()
    ]


def _row_to_dict(cursor):
    row = cursor.fetchone()

    if row is None:
        return None

    columns = [
        column[0]
        for column in cursor.description
    ]

    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# SENT EMAIL HISTORY LIST
# ============================================================

def list_sent_email_history():
    """
    Return persistent sent-email history.

    Newest first.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                h.email_history_id
                    AS id,

                h.email_history_id,

                h.recipient_type,

                h.recipient_label,

                h.recipient_user_id,

                h.recipient_email,

                h.recipient_count,

                h.subject,

                h.message_plain,

                h.sent_by_admin_id,

                h.sent_at,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(a.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.suffix),
                        ''
                    )
                )
                AS sent_by_admin_name,

                a.email
                    AS sent_by_admin_email,

                a.username
                    AS sent_by_admin_username,

                a.admin_role
                    AS sent_by_admin_role

            FROM email_sent_history h

            INNER JOIN admins a
                ON a.admin_id =
                    h.sent_by_admin_id

            ORDER BY
                h.sent_at DESC,
                h.email_history_id DESC
            """
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# SENT EMAIL DETAILS
# ============================================================

def get_sent_email_history_detail(
    email_history_id,
):
    """
    Return one complete sent-email record.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                h.email_history_id
                    AS id,

                h.email_history_id,

                h.recipient_type,

                h.recipient_label,

                h.recipient_user_id,

                h.recipient_email,

                h.recipient_count,

                h.subject,

                h.message_html,

                h.message_plain,

                h.sent_by_admin_id,

                h.sent_at,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(a.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.suffix),
                        ''
                    )
                )
                AS sent_by_admin_name,

                a.email
                    AS sent_by_admin_email,

                a.username
                    AS sent_by_admin_username,

                a.admin_role
                    AS sent_by_admin_role,

                u.user_id
                    AS current_recipient_user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS current_recipient_name,

                u.email
                    AS current_recipient_email,

                u.user_role
                    AS current_recipient_role,

                u.status
                    AS current_recipient_status

            FROM email_sent_history h

            INNER JOIN admins a
                ON a.admin_id =
                    h.sent_by_admin_id

            LEFT JOIN users u
                ON u.user_id =
                    h.recipient_user_id

            WHERE
                h.email_history_id = %s

            LIMIT 1
            """,
            [
                email_history_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# SEARCH SPECIFIC USERS
# ============================================================

def search_email_recipients(
    search="",
    limit=50,
):
    """
    Search GrainRise users for the Specific User selector.

    Searchable through:
        first name
        middle initial
        last name
        suffix
        full name
        email
        username

    All account statuses may appear because Account Admin
    can directly communicate with users who are still
    under review or have other account states.

    Only users with an email address are returned.
    """

    cleaned_search = str(
        search or ""
    ).strip()

    try:
        cleaned_limit = int(
            limit
        )
    except (
        TypeError,
        ValueError,
    ):
        cleaned_limit = 50

    cleaned_limit = max(
        1,
        min(
            cleaned_limit,
            100,
        )
    )


    search_pattern = (
        f"%{cleaned_search}%"
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS full_name,

                u.first_name,

                u.middle_initial,

                u.last_name,

                u.suffix,

                u.email,

                u.username,

                u.contact_number,

                u.user_role
                    AS user_role,

                u.status
                    AS status,

                u.created_at

            FROM users u

            WHERE
                u.email IS NOT NULL

                AND LENGTH(
                    TRIM(u.email)
                ) > 0

                AND (
                    %s = ''

                    OR LOWER(u.first_name)
                        LIKE LOWER(%s)

                    OR LOWER(u.middle_initial)
                        LIKE LOWER(%s)

                    OR LOWER(u.last_name)
                        LIKE LOWER(%s)

                    OR LOWER(u.suffix)
                        LIKE LOWER(%s)

                    OR LOWER(u.email)
                        LIKE LOWER(%s)

                    OR LOWER(u.username)
                        LIKE LOWER(%s)

                    OR LOWER(
                        CONCAT_WS(
                            ' ',
                            u.first_name,
                            u.middle_initial,
                            u.last_name,
                            u.suffix
                        )
                    )
                    LIKE LOWER(%s)
                )

            ORDER BY
                u.first_name ASC,
                u.last_name ASC,
                u.user_id ASC

            LIMIT %s
            """,
            [
                cleaned_search,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                search_pattern,
                cleaned_limit,
            ],
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# SPECIFIC USER LOOKUP
# ============================================================

def get_specific_email_recipient(
    user_id,
):
    """
    Return one GrainRise user for direct email.

    No active-status restriction because Account Admin may
    message registrations that are still under review.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS full_name,

                u.first_name,

                u.middle_initial,

                u.last_name,

                u.suffix,

                u.email,

                u.contact_number,

                u.username,

                u.user_role
                    AS user_role,

                u.status
                    AS status

            FROM users u

            WHERE
                u.user_id = %s

            LIMIT 1
            """,
            [
                user_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# USER LOOKUP BY EMAIL
# ============================================================

def get_user_by_email(
    email,
):
    """
    Fallback lookup for direct emails.
    """

    normalized_email = str(
        email or ""
    ).strip().lower()

    if not normalized_email:
        return None


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                u.user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS full_name,

                u.first_name,

                u.middle_initial,

                u.last_name,

                u.suffix,

                u.email,

                u.contact_number,

                u.username,

                u.user_role
                    AS user_role,

                u.status
                    AS status

            FROM users u

            WHERE
                LOWER(
                    TRIM(u.email)
                ) = %s

            LIMIT 1
            """,
            [
                normalized_email,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# BROADCAST RECIPIENTS
# ============================================================

def get_broadcast_email_recipients(
    recipient_type,
):
    """
    Return active users eligible for broadcast email.

    Broadcast groups:
        all_users
        miller_manager
        warehouse_manager
        retailer
        farmer

    Direct Specific User messages are handled separately.
    """

    normalized_type = str(
        recipient_type or ""
    ).strip().lower()


    if normalized_type not in VALID_RECIPIENT_TYPES:
        raise ValueError(
            "Invalid email recipient type."
        )


    if normalized_type == RECIPIENT_SPECIFIC:
        raise ValueError(
            "Specific-user email recipients must be resolved individually."
        )


    if normalized_type == RECIPIENT_ALL_USERS:
        role_condition = ""

        parameters = []

    else:
        role_condition = """
            AND u.user_role = %s
        """

        parameters = [
            normalized_type,
        ]


    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT
                u.user_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(u.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(u.suffix),
                        ''
                    )
                )
                AS full_name,

                u.first_name,

                u.last_name,

                u.email,

                u.user_role
                    AS user_role,

                u.status
                    AS status

            FROM users u

            WHERE
                u.status = 'active'

                AND u.email IS NOT NULL

                AND LENGTH(
                    TRIM(u.email)
                ) > 0

                {role_condition}

            ORDER BY
                u.user_id ASC
            """,
            parameters,
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# BROADCAST RECIPIENT COUNT
# ============================================================

def get_broadcast_recipient_count(
    recipient_type,
):
    return len(
        get_broadcast_email_recipients(
            recipient_type
        )
    )


# ============================================================
# ADMIN LOOKUP
# ============================================================

def get_admin_email_sender(
    admin_id,
):
    """
    Return authenticated admin database record.
    """

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                a.admin_id,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(a.first_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.middle_initial),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.last_name),
                        ''
                    ),
                    NULLIF(
                        TRIM(a.suffix),
                        ''
                    )
                )
                AS full_name,

                a.first_name,

                a.middle_initial,

                a.last_name,

                a.suffix,

                a.email,

                a.username,

                a.admin_role,

                a.status

            FROM admins a

            WHERE
                a.admin_id = %s

            LIMIT 1
            """,
            [
                admin_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# HISTORY EXISTS
# ============================================================

def sent_email_history_exists(
    email_history_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1

                FROM email_sent_history

                WHERE
                    email_history_id = %s
            )
            """,
            [
                email_history_id,
            ],
        )

        row = cursor.fetchone()

    return bool(
        row
        and row[0]
    )