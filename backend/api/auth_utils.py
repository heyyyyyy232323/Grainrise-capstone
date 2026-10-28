import re
from django.db import connection


# ============================================================
# PHONE NORMALIZATION HELPER
# ============================================================

def normalize_ph_mobile(phone):
    """
    Normalize Philippine mobile numbers to +639XXXXXXXXX format.
    Accepts:
        09XXXXXXXXX (11 digits)
        639XXXXXXXXX (12 digits)
        +639XXXXXXXXX (13 chars)
        9XXXXXXXXX (10 digits)
    Returns normalized string (+639XXXXXXXXX) or None if not a valid PH mobile.
    """
    if not phone:
        return None
    cleaned = re.sub(r"[\s\-\(\)\.]", "", str(phone).strip())
    if cleaned.startswith("+639") and len(cleaned) == 13 and cleaned[1:].isdigit():
        return cleaned
    if cleaned.startswith("639") and len(cleaned) == 12 and cleaned.isdigit():
        return f"+{cleaned}"
    if cleaned.startswith("09") and len(cleaned) == 11 and cleaned.isdigit():
        return f"+63{cleaned[1:]}"
    if cleaned.startswith("9") and len(cleaned) == 10 and cleaned.isdigit():
        return f"+63{cleaned}"
    return None


def _row_to_main_user(row):
    must_change_pw = bool(row[11])
    province = row[12]
    gender = row[13]
    profile_incomplete = (not province or not str(province).strip() or not gender or not str(gender).strip())
    role = str(row[9])
    email_val = row[5] or ""
    if role == "farmer" and email_val.endswith("@grainrise.local"):
        email_val = ""

    return {
        "id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "email": email_val,
        "contact_number": row[6],
        "username": row[7],
        "password_hash": row[8],
        "role": role,
        "status": str(row[10]),
        "account_type": "main_user",
        "position": None,
        "organization_type": None,
        "profile_id": None,
        "owner_user_id": row[0],
        "must_change_password": must_change_pw,
        "profile_incomplete": profile_incomplete,
    }


def _row_to_supplier_employee(row):
    return {
        "id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "email": row[5],
        "contact_number": row[6],
        "username": row[7],
        "password_hash": row[8],
        "role": "supplier_employee",
        "position": str(row[9]),
        "status": str(row[10]),
        "account_type": "supplier_employee",
        "organization_type": "supplier",
        "profile_id": row[11],
        "owner_user_id": row[12],
    }


def _row_to_warehouse_employee(row):
    return {
        "id": row[0],
        "first_name": row[1],
        "middle_initial": row[2],
        "last_name": row[3],
        "suffix": row[4],
        "email": row[5],
        "contact_number": row[6],
        "username": row[7],
        "password_hash": row[8],
        "role": "warehouse_employee",
        "position": str(row[9]),
        "status": str(row[10]),
        "account_type": "warehouse_employee",
        "organization_type": "warehouse",
        "profile_id": row[11],
        "owner_user_id": row[12],
    }


# ============================================================
# GRAINRISE BUSINESS ACCOUNT LOOKUP
# ============================================================

def get_business_user(identifier):
    """
    Hanapin ang GrainRise account gamit ang email, username, o contact number (farmer).

    Checks:
    1. Exact email match (or farmer contact number) across:
       - Main users (users)
       - Supplier/Miller employees (supplier_employees)
       - Warehouse employees (warehouse_employees)
    2. Username match across:
       - Main users (users)
       - Supplier/Miller employees (supplier_employees)
       - Warehouse employees (warehouse_employees)
    """

    raw_identifier = str(identifier or "").strip()
    normalized_identifier = raw_identifier.lower()
    norm_phone = normalize_ph_mobile(raw_identifier)

    with connection.cursor() as cursor:
        # ========================================================
        # 1. EXACT EMAIL MATCH (and Farmer Phone)
        # ========================================================
        if norm_phone:
            p_09 = f"0{norm_phone[3:]}"
            p_639 = norm_phone[1:]
            p_9 = norm_phone[3:]
            cursor.execute(
                """
                SELECT
                    user_id, first_name, middle_initial, last_name, suffix,
                    email, contact_number, username, password_hash, user_role,
                    status, must_change_password, province, gender
                FROM users
                WHERE
                    LOWER(email) = %s
                    OR (
                        user_role = 'farmer'
                        AND contact_number IN (%s, %s, %s, %s)
                    )
                LIMIT 1
                """,
                [
                    normalized_identifier,
                    norm_phone,
                    p_09,
                    p_639,
                    p_9,
                ],
            )
        else:
            cursor.execute(
                """
                SELECT
                    user_id, first_name, middle_initial, last_name, suffix,
                    email, contact_number, username, password_hash, user_role,
                    status, must_change_password, province, gender
                FROM users
                WHERE
                    LOWER(email) = %s
                LIMIT 1
                """,
                [
                    normalized_identifier,
                ],
            )

        row = cursor.fetchone()
        if row:
            return _row_to_main_user(row)

        # Supplier / Miller employees (exact email)
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.email,
                se.contact_number,
                se.username,
                se.password_hash,
                se.position,
                se.status,
                se.supplier_profile_id,
                sp.user_id
            FROM supplier_employees se
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = se.supplier_profile_id
            WHERE
                LOWER(se.email) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
            ],
        )
        row = cursor.fetchone()
        if row:
            return _row_to_supplier_employee(row)

        # Warehouse employees (exact email)
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.email,
                we.contact_number,
                we.username,
                we.password_hash,
                we.position,
                we.status,
                we.warehouse_profile_id,
                wp.user_id
            FROM warehouse_employees we
            INNER JOIN warehouse_profiles wp
                ON wp.warehouse_profile_id = we.warehouse_profile_id
            WHERE
                LOWER(we.email) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
            ],
        )
        row = cursor.fetchone()
        if row:
            return _row_to_warehouse_employee(row)

        # ========================================================
        # 2. USERNAME MATCH (Fall back if identifier is not an email)
        # ========================================================
        # Main users (username)
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
                password_hash,
                user_role,
                status,
                must_change_password,
                province,
                gender
            FROM users
            WHERE
                LOWER(COALESCE(username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
            ],
        )
        row = cursor.fetchone()
        if row:
            return _row_to_main_user(row)

        # Supplier / Miller employees (username)
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.email,
                se.contact_number,
                se.username,
                se.password_hash,
                se.position,
                se.status,
                se.supplier_profile_id,
                sp.user_id
            FROM supplier_employees se
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = se.supplier_profile_id
            WHERE
                LOWER(COALESCE(se.username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
            ],
        )
        row = cursor.fetchone()
        if row:
            return _row_to_supplier_employee(row)

        # Warehouse employees (username)
        cursor.execute(
            """
            SELECT
                we.warehouse_employee_id,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                we.email,
                we.contact_number,
                we.username,
                we.password_hash,
                we.position,
                we.status,
                we.warehouse_profile_id,
                wp.user_id
            FROM warehouse_employees we
            INNER JOIN warehouse_profiles wp
                ON wp.warehouse_profile_id = we.warehouse_profile_id
            WHERE
                LOWER(COALESCE(we.username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
            ],
        )
        row = cursor.fetchone()
        if row:
            return _row_to_warehouse_employee(row)

    return None
