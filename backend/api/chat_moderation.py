import re
import unicodedata

from django.db import connection


# ============================================================
# GRAINRISE
# CENTRALIZED CHAT MODERATION
# ============================================================
#
# SHARED BY:
#
# users
#   - farmer
#   - miller_manager
#   - warehouse_manager
#   - retailer
#
# supplier_employees
# warehouse_employees
#
#
# RESPONSIBILITIES:
#
# 1. Resolve the actual chat actor.
# 2. Check ACTIVE profanity_chat entries.
# 3. Block prohibited messages.
# 4. Automatically create a report for the offender.
# 5. Route the report to the correct existing report table.
#
# ============================================================


# ============================================================
# ACTOR TYPES
# ============================================================

ACTOR_TYPE_USER = "user"

ACTOR_TYPE_SUPPLIER_EMPLOYEE = (
    "supplier_employee"
)

ACTOR_TYPE_WAREHOUSE_EMPLOYEE = (
    "warehouse_employee"
)


SUPPORTED_ACTOR_TYPES = {
    ACTOR_TYPE_USER,
    ACTOR_TYPE_SUPPLIER_EMPLOYEE,
    ACTOR_TYPE_WAREHOUSE_EMPLOYEE,
}


# ============================================================
# USER ROLES
# ============================================================

ROLE_FARMER = "farmer"

ROLE_MILLER = "miller_manager"

ROLE_WAREHOUSE = (
    "warehouse_manager"
)

ROLE_RETAILER = "retailer"


# ============================================================
# REPORT CONSTANTS
# ============================================================

PROFANITY_REPORT_CATEGORY = (
    "Profanity / Inappropriate Language"
)


# ============================================================
# PROFANITY MATCH
# ============================================================

class ProfanityMatch:
    def __init__(
        self,
        profanity_id,
        prohibited_text,
    ):
        self.profanity_id = (
            profanity_id
        )

        self.prohibited_text = (
            prohibited_text
        )


    def to_dict(self):
        return {
            "profanity_id":
                self.profanity_id,

            "prohibited_text":
                self.prohibited_text,
        }


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_chat_text(
    value,
):
    if value is None:
        return ""


    normalized = (
        unicodedata.normalize(
            "NFKC",
            str(value),
        )
        .casefold()
        .strip()
    )


    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )


    return normalized


# ============================================================
# DISPLAY NAME
# ============================================================

def _build_person_name(
    first_name,
    middle_initial,
    last_name,
    suffix,
):
    values = [
        first_name,
        middle_initial,
        last_name,
        suffix,
    ]


    values = [
        str(value).strip()
        for value in values
        if value is not None
        and str(value).strip()
    ]


    if not values:
        return "Unknown User"


    return " ".join(
        values
    )


# ============================================================
# ACTOR TYPE NORMALIZATION
# ============================================================

def _normalize_actor_type(
    actor_type,
):
    normalized = (
        str(
            actor_type or ""
        )
        .strip()
        .lower()
    )


    if (
        normalized
        not in SUPPORTED_ACTOR_TYPES
    ):
        raise ValueError(
            "Unsupported chat actor type."
        )


    return normalized


# ============================================================
# ACTOR ID NORMALIZATION
# ============================================================

def _normalize_actor_id(
    actor_id,
):
    try:
        normalized = int(
            actor_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise ValueError(
            "Invalid chat actor ID."
        ) from exc


    if normalized <= 0:
        raise ValueError(
            "Invalid chat actor ID."
        )


    return normalized


# ============================================================
# ACTIVE PROFANITY
# ============================================================

def get_active_profanity_entries(
    cursor=None,
):
    """
    Only profanity_chat records with:

        status = active

    participate in moderation.
    """

    owns_cursor = (
        cursor is None
    )


    db_cursor = (
        connection.cursor()
        if owns_cursor
        else cursor
    )


    try:
        db_cursor.execute(
            """
            SELECT
                profanity_id,
                prohibited_text

            FROM profanity_chat

            WHERE
                status = 'active'

            ORDER BY
                LENGTH(
                    prohibited_text
                ) DESC,

                profanity_id ASC
            """
        )


        rows = (
            db_cursor.fetchall()
        )


        return [
            {
                "profanity_id":
                    row[0],

                "prohibited_text":
                    row[1],
            }

            for row in rows
        ]


    finally:
        if owns_cursor:
            db_cursor.close()


# ============================================================
# PROFANITY REGEX
# ============================================================

def _build_profanity_pattern(
    prohibited_text,
):
    """
    Example stored phrase:

        bad word

    Matches:

        bad word
        BAD WORD
        bad   word
        bad-word
        bad_word
        bad.word

    Word boundaries also reduce accidental substring matches.
    """

    normalized = (
        normalize_chat_text(
            prohibited_text
        )
    )


    if not normalized:
        return None


    words = re.findall(
        r"\w+",
        normalized,
        flags=re.UNICODE,
    )


    if not words:
        return re.compile(
            re.escape(
                normalized
            ),
            flags=(
                re.IGNORECASE |
                re.UNICODE
            ),
        )


    joined = (
        r"[\W_]+".join(
            re.escape(word)

            for word in words
        )
    )


    return re.compile(
        (
            rf"(?<!\w)"
            rf"{joined}"
            rf"(?!\w)"
        ),

        flags=(
            re.IGNORECASE |
            re.UNICODE
        ),
    )


# ============================================================
# FIND PROFANITY
# ============================================================

def find_profanity_matches(
    message_text,
    cursor=None,
):
    normalized_message = (
        normalize_chat_text(
            message_text
        )
    )


    if not normalized_message:
        return []


    entries = (
        get_active_profanity_entries(
            cursor=cursor
        )
    )


    matches = []


    for entry in entries:

        pattern = (
            _build_profanity_pattern(
                entry[
                    "prohibited_text"
                ]
            )
        )


        if pattern is None:
            continue


        if pattern.search(
            normalized_message
        ):
            matches.append(
                ProfanityMatch(
                    profanity_id=(
                        entry[
                            "profanity_id"
                        ]
                    ),

                    prohibited_text=(
                        entry[
                            "prohibited_text"
                        ]
                    ),
                ).to_dict()
            )


    return matches


# ============================================================
# BOOLEAN CHECK
# ============================================================

def contains_profanity(
    message_text,
    cursor=None,
):
    return bool(
        find_profanity_matches(
            message_text,
            cursor=cursor,
        )
    )


# ============================================================
# RESOLVE MAIN USER
# ============================================================

def _resolve_user_actor(
    actor_id,
    cursor,
):
    cursor.execute(
        """
        SELECT
            u.user_id,

            u.first_name,
            u.middle_initial,
            u.last_name,
            u.suffix,

            u.user_role::text,
            u.status::text,

            u.email,
            u.username

        FROM users u

        WHERE
            u.user_id = %s

        LIMIT 1
        """,
        [
            actor_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        return None


    return {
        "actor_type":
            ACTOR_TYPE_USER,

        "actor_id":
            row[0],

        "owner_user_id":
            row[0],

        "display_name":
            _build_person_name(
                row[1],
                row[2],
                row[3],
                row[4],
            ),

        "user_role":
            row[5],

        "status":
            row[6],

        "email":
            row[7],

        "username":
            row[8],

        "employee_type":
            None,

        "employee_id":
            None,

        "position":
            None,

        "supplier_profile_id":
            None,

        "warehouse_profile_id":
            None,
    }


# ============================================================
# RESOLVE SUPPLIER / MILLER EMPLOYEE
# ============================================================

def _resolve_supplier_employee_actor(
    actor_id,
    cursor,
):
    cursor.execute(
        """
        SELECT
            se.supplier_employee_id,

            se.first_name,
            se.middle_initial,
            se.last_name,
            se.suffix,

            se.position,
            se.status,

            se.email,
            se.username,

            se.supplier_profile_id,

            sp.user_id,

            u.user_role::text

        FROM supplier_employees se

        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id =
                se.supplier_profile_id

        INNER JOIN users u
            ON u.user_id =
                sp.user_id

        WHERE
            se.supplier_employee_id =
                %s

        LIMIT 1
        """,
        [
            actor_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        return None


    return {
        "actor_type":
            ACTOR_TYPE_SUPPLIER_EMPLOYEE,

        "actor_id":
            row[0],

        # Main Miller Manager account
        "owner_user_id":
            row[10],

        "display_name":
            _build_person_name(
                row[1],
                row[2],
                row[3],
                row[4],
            ),

        "user_role":
            row[11],

        "status":
            row[6],

        "email":
            row[7],

        "username":
            row[8],

        "employee_type":
            ACTOR_TYPE_SUPPLIER_EMPLOYEE,

        "employee_id":
            row[0],

        "position":
            row[5],

        "supplier_profile_id":
            row[9],

        "warehouse_profile_id":
            None,
    }


# ============================================================
# RESOLVE WAREHOUSE EMPLOYEE
# ============================================================

def _resolve_warehouse_employee_actor(
    actor_id,
    cursor,
):
    cursor.execute(
        """
        SELECT
            we.warehouse_employee_id,

            we.first_name,
            we.middle_initial,
            we.last_name,
            we.suffix,

            we.position,
            we.status,

            we.email,
            we.username,

            we.warehouse_profile_id,

            wp.user_id,

            u.user_role::text

        FROM warehouse_employees we

        INNER JOIN warehouse_profiles wp
            ON wp.warehouse_profile_id =
                we.warehouse_profile_id

        INNER JOIN users u
            ON u.user_id =
                wp.user_id

        WHERE
            we.warehouse_employee_id =
                %s

        LIMIT 1
        """,
        [
            actor_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        return None


    return {
        "actor_type":
            ACTOR_TYPE_WAREHOUSE_EMPLOYEE,

        "actor_id":
            row[0],

        # Main Warehouse Manager account
        "owner_user_id":
            row[10],

        "display_name":
            _build_person_name(
                row[1],
                row[2],
                row[3],
                row[4],
            ),

        "user_role":
            row[11],

        "status":
            row[6],

        "email":
            row[7],

        "username":
            row[8],

        "employee_type":
            ACTOR_TYPE_WAREHOUSE_EMPLOYEE,

        "employee_id":
            row[0],

        "position":
            row[5],

        "supplier_profile_id":
            None,

        "warehouse_profile_id":
            row[9],
    }


# ============================================================
# PUBLIC ACTOR RESOLVER
# ============================================================

def resolve_chat_actor(
    actor_type,
    actor_id,
    cursor=None,
):
    actor_type = (
        _normalize_actor_type(
            actor_type
        )
    )


    actor_id = (
        _normalize_actor_id(
            actor_id
        )
    )


    owns_cursor = (
        cursor is None
    )


    db_cursor = (
        connection.cursor()
        if owns_cursor
        else cursor
    )


    try:
        if (
            actor_type ==
            ACTOR_TYPE_USER
        ):
            actor = (
                _resolve_user_actor(
                    actor_id,
                    db_cursor,
                )
            )


        elif (
            actor_type ==
            ACTOR_TYPE_SUPPLIER_EMPLOYEE
        ):
            actor = (
                _resolve_supplier_employee_actor(
                    actor_id,
                    db_cursor,
                )
            )


        else:
            actor = (
                _resolve_warehouse_employee_actor(
                    actor_id,
                    db_cursor,
                )
            )


        if actor is None:
            raise ValueError(
                "Chat actor was not found."
            )


        return actor


    finally:
        if owns_cursor:
            db_cursor.close()


# ============================================================
# DETERMINE REPORT DESTINATION
# ============================================================

def _get_report_destination(
    offender,
):
    """
    Returns:

        table
        owner column

    Employee violations are routed to the report table of
    their owning business account, while exact employee
    information remains stored inside the report description.
    """

    actor_type = (
        offender[
            "actor_type"
        ]
    )


    role = (
        offender[
            "user_role"
        ]
    )


    # --------------------------------------------------------
    # SUPPLIER EMPLOYEE
    # -> owning Miller account
    # --------------------------------------------------------

    if (
        actor_type ==
        ACTOR_TYPE_SUPPLIER_EMPLOYEE
    ):
        return {
            "table":
                "miller_reports",

            "owner_column":
                "miller_user_id",
        }


    # --------------------------------------------------------
    # WAREHOUSE EMPLOYEE
    # -> owning Warehouse account
    # --------------------------------------------------------

    if (
        actor_type ==
        ACTOR_TYPE_WAREHOUSE_EMPLOYEE
    ):
        return {
            "table":
                "warehouse_reports",

            "owner_column":
                "warehouse_user_id",
        }


    # --------------------------------------------------------
    # MAIN USERS
    # --------------------------------------------------------

    if role == ROLE_FARMER:
        return {
            "table":
                "farmer_reports",

            "owner_column":
                "farmer_user_id",
        }


    if role == ROLE_MILLER:
        return {
            "table":
                "miller_reports",

            "owner_column":
                "miller_user_id",
        }


    if role == ROLE_WAREHOUSE:
        return {
            "table":
                "warehouse_reports",

            "owner_column":
                "warehouse_user_id",
        }


    if role == ROLE_RETAILER:
        return {
            "table":
                "retailer_reports",

            "owner_column":
                "retailer_user_id",
        }


    raise ValueError(
        (
            "No profanity report destination "
            f"is configured for role: {role}"
        )
    )


# ============================================================
# BUILD REPORT DESCRIPTION
# ============================================================

def _build_profanity_report_description(
    offender,
    message_text,
    matches,
    reference_type=None,
    reference_id=None,
):
    """
    Preserve enough evidence for Account Admin review.

    For employees we also preserve the exact employee identity
    even though the report belongs to the owning business
    account.
    """

    lines = [
        (
            "Automatic GrainRise chat moderation "
            "detected prohibited language."
        ),

        "",

        (
            "Offender Name: "
            f"{offender['display_name']}"
        ),

        (
            "Offender Account Type: "
            f"{offender['actor_type']}"
        ),

        (
            "Account Role: "
            f"{offender['user_role']}"
        ),
    ]


    if offender.get(
        "employee_id"
    ):
        lines.extend(
            [
                (
                    "Employee ID: "
                    f"{offender['employee_id']}"
                ),

                (
                    "Employee Type: "
                    f"{offender['employee_type']}"
                ),

                (
                    "Employee Position: "
                    f"{offender.get('position') or '—'}"
                ),
            ]
        )


    if reference_type:
        lines.append(
            (
                "Chat Reference Type: "
                f"{reference_type}"
            )
        )


    if reference_id is not None:
        lines.append(
            (
                "Chat Reference ID: "
                f"{reference_id}"
            )
        )


    matched_texts = [
        match[
            "prohibited_text"
        ]

        for match in matches

        if match.get(
            "prohibited_text"
        )
    ]


    if matched_texts:
        lines.append(
            (
                "Matched Prohibited Text: "
                +
                ", ".join(
                    matched_texts
                )
            )
        )


    lines.extend(
        [
            "",
            "Attempted Message:",
            str(
                message_text
            ).strip(),
        ]
    )


    return "\n".join(
        lines
    )


# ============================================================
# CHECK TABLE EXISTS
# ============================================================

def _report_table_exists(
    cursor,
    table_name,
):
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1

            FROM information_schema.tables

            WHERE
                table_schema = 'public'

                AND table_name = %s
        )
        """,
        [
            table_name,
        ],
    )


    return bool(
        cursor.fetchone()[0]
    )


# ============================================================
# CHECK REPORT COLUMNS
# ============================================================

def _get_table_columns(
    cursor,
    table_name,
):
    cursor.execute(
        """
        SELECT
            column_name

        FROM information_schema.columns

        WHERE
            table_schema = 'public'

            AND table_name = %s
        """,
        [
            table_name,
        ],
    )


    return {
        row[0]

        for row in (
            cursor.fetchall()
        )
    }


# ============================================================
# CREATE PROFANITY REPORT
# ============================================================

def create_profanity_report(
    *,
    offender,
    reported_by_user_id,
    message_text,
    matches,
    reference_type=None,
    reference_id=None,
    cursor=None,
):
    """
    Automatically create a report after profanity detection.

    IMPORTANT:

    reported_by_user_id must come from the VALIDATED chat
    recipient/context.

    Never accept it directly from an untrusted frontend body.

    Example Farmer -> Miller:

        offender:
            authenticated Farmer

        reported_by_user_id:
            supplier_profiles.user_id
            resolved by backend from the validated
            supplier_profile_id

    Example Miller -> Farmer:

        offender:
            Miller / Miller employee

        reported_by_user_id:
            validated Farmer users.user_id
    """

    try:
        reporter_id = int(
            reported_by_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            (
                "A valid reporting/recipient "
                "user ID is required."
            )
        ) from exc


    if reporter_id <= 0:
        raise ValueError(
            (
                "A valid reporting/recipient "
                "user ID is required."
            )
        )


    destination = (
        _get_report_destination(
            offender
        )
    )


    table_name = (
        destination[
            "table"
        ]
    )


    owner_column = (
        destination[
            "owner_column"
        ]
    )


    owner_user_id = (
        offender[
            "owner_user_id"
        ]
    )


    description = (
        _build_profanity_report_description(
            offender,
            message_text,
            matches,
            reference_type=(
                reference_type
            ),
            reference_id=(
                reference_id
            ),
        )
    )


    owns_cursor = (
        cursor is None
    )


    db_cursor = (
        connection.cursor()
        if owns_cursor
        else cursor
    )


    try:
        # ----------------------------------------------------
        # VERIFY REPORT TABLE
        # ----------------------------------------------------

        if not _report_table_exists(
            db_cursor,
            table_name,
        ):
            raise RuntimeError(
                (
                    "Required report table "
                    f"'{table_name}' does not exist."
                )
            )


        columns = (
            _get_table_columns(
                db_cursor,
                table_name,
            )
        )


        required_columns = {
            owner_column,
            "reported_by_user_id",
            "category",
            "description",
            "status",
        }


        missing_columns = (
            required_columns -
            columns
        )


        if missing_columns:
            raise RuntimeError(
                (
                    f"{table_name} is missing "
                    "required moderation columns: "
                    +
                    ", ".join(
                        sorted(
                            missing_columns
                        )
                    )
                )
            )


        # ----------------------------------------------------
        # VALIDATE REPORTER EXISTS
        # ----------------------------------------------------

        db_cursor.execute(
            """
            SELECT 1

            FROM users

            WHERE
                user_id = %s

            LIMIT 1
            """,
            [
                reporter_id,
            ],
        )


        if not db_cursor.fetchone():
            raise ValueError(
                (
                    "Validated chat recipient "
                    "user account was not found."
                )
            )


        # ----------------------------------------------------
        # INSERT
        #
        # Static SQL branches are intentional.
        # Table/column identifiers are NOT supplied by clients.
        # ----------------------------------------------------

        if (
            table_name ==
            "farmer_reports"
        ):
            db_cursor.execute(
                """
                INSERT INTO farmer_reports (
                    farmer_user_id,
                    reported_by_user_id,
                    category,
                    description,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    'pending'
                )
                RETURNING farmer_report_id
                """,
                [
                    owner_user_id,
                    reporter_id,
                    PROFANITY_REPORT_CATEGORY,
                    description,
                ],
            )


        elif (
            table_name ==
            "miller_reports"
        ):
            db_cursor.execute(
                """
                INSERT INTO miller_reports (
                    miller_user_id,
                    reported_by_user_id,
                    category,
                    description,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    'pending'
                )
                RETURNING miller_report_id
                """,
                [
                    owner_user_id,
                    reporter_id,
                    PROFANITY_REPORT_CATEGORY,
                    description,
                ],
            )


        elif (
            table_name ==
            "warehouse_reports"
        ):
            db_cursor.execute(
                """
                INSERT INTO warehouse_reports (
                    warehouse_user_id,
                    reported_by_user_id,
                    category,
                    description,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    'pending'
                )
                RETURNING warehouse_report_id
                """,
                [
                    owner_user_id,
                    reporter_id,
                    PROFANITY_REPORT_CATEGORY,
                    description,
                ],
            )


        elif (
            table_name ==
            "retailer_reports"
        ):
            db_cursor.execute(
                """
                INSERT INTO retailer_reports (
                    retailer_user_id,
                    reported_by_user_id,
                    category,
                    description,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    'pending'
                )
                RETURNING retailer_report_id
                """,
                [
                    owner_user_id,
                    reporter_id,
                    PROFANITY_REPORT_CATEGORY,
                    description,
                ],
            )


        else:
            raise RuntimeError(
                (
                    "Unsupported profanity "
                    "report destination."
                )
            )


        report_id = (
            db_cursor.fetchone()[0]
        )


        return {
            "report_id":
                report_id,

            "report_table":
                table_name,

            "reported_user_id":
                owner_user_id,

            "reported_by_user_id":
                reporter_id,

            "category":
                PROFANITY_REPORT_CATEGORY,

            "status":
                "pending",
        }


    finally:
        if owns_cursor:
            db_cursor.close()


# ============================================================
# BASIC MODERATION
# ============================================================

def moderate_chat_message(
    message_text,
    actor_type,
    actor_id,
    cursor=None,
):
    """
    Checks the sender + message.

    Does NOT automatically report.

    Useful when only detection is needed.
    """

    normalized_message = (
        normalize_chat_text(
            message_text
        )
    )


    if not normalized_message:
        raise ValueError(
            "Message text is required."
        )


    owns_cursor = (
        cursor is None
    )


    db_cursor = (
        connection.cursor()
        if owns_cursor
        else cursor
    )


    try:
        actor = (
            resolve_chat_actor(
                actor_type,
                actor_id,
                cursor=db_cursor,
            )
        )


        matches = (
            find_profanity_matches(
                message_text,
                cursor=db_cursor,
            )
        )


        return {
            "allowed":
                not bool(matches),

            "code":
                (
                    "MESSAGE_ALLOWED"
                    if not matches
                    else
                    "PROFANITY_DETECTED"
                ),

            "actor":
                actor,

            "matches":
                matches,
        }


    finally:
        if owns_cursor:
            db_cursor.close()


# ============================================================
# MODERATE + AUTO REPORT
# ============================================================

def moderate_and_report_chat_message(
    *,
    message_text,

    sender_actor_type,
    sender_actor_id,

    reported_by_user_id,

    reference_type=None,
    reference_id=None,

    cursor=None,
):
    """
    MAIN function to use in GrainRise messaging services.

    FLOW:

        sender
          ↓
        resolve actor
          ↓
        profanity_chat
          ↓
        CLEAN
          -> allowed = True

        PROFANITY
          -> message must NOT be inserted
          -> automatic report created
          -> allowed = False


    IMPORTANT TRANSACTION RULE:

    The caller should NOT insert the blocked chat message.

    If the caller uses the SAME database transaction/cursor,
    do not intentionally roll back the transaction after this
    function has inserted the report, otherwise the report
    would also be rolled back.
    """

    normalized_message = (
        normalize_chat_text(
            message_text
        )
    )


    if not normalized_message:
        raise ValueError(
            "Message text is required."
        )


    owns_cursor = (
        cursor is None
    )


    db_cursor = (
        connection.cursor()
        if owns_cursor
        else cursor
    )


    try:
        # ----------------------------------------------------
        # SENDER
        # ----------------------------------------------------

        offender = (
            resolve_chat_actor(
                sender_actor_type,
                sender_actor_id,
                cursor=db_cursor,
            )
        )


        # ----------------------------------------------------
        # PROFANITY CHECK
        # ----------------------------------------------------

        matches = (
            find_profanity_matches(
                message_text,
                cursor=db_cursor,
            )
        )


        # ----------------------------------------------------
        # CLEAN MESSAGE
        # ----------------------------------------------------

        if not matches:
            return {
                "allowed":
                    True,

                "code":
                    "MESSAGE_ALLOWED",

                "message":
                    "Message passed chat moderation.",

                "actor":
                    offender,

                "matches":
                    [],

                "report":
                    None,
            }


        # ----------------------------------------------------
        # PROFANITY FOUND
        #
        # Do NOT insert the actual chat message.
        # Create report instead.
        # ----------------------------------------------------

        report = (
            create_profanity_report(
                offender=(
                    offender
                ),

                reported_by_user_id=(
                    reported_by_user_id
                ),

                message_text=(
                    message_text
                ),

                matches=(
                    matches
                ),

                reference_type=(
                    reference_type
                ),

                reference_id=(
                    reference_id
                ),

                cursor=db_cursor,
            )
        )


        return {
            "allowed":
                False,

            "code":
                "PROFANITY_DETECTED",

            "message":
                (
                    "Your message contains language "
                    "that is not allowed under "
                    "GrainRise communication guidelines."
                ),

            "actor":
                offender,

            # Internal information.
            # Frontend does not need to display the words.
            "matches":
                matches,

            "report":
                report,
        }


    finally:
        if owns_cursor:
            db_cursor.close()