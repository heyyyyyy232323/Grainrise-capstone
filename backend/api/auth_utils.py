from django.db import connection


# ============================================================
# GRAINRISE BUSINESS ACCOUNT LOOKUP
# ============================================================

def get_business_user(identifier):
    """
    Hanapin ang GrainRise account gamit ang email o username.

    Checks:
    1. Main users
    2. Warehouse employees
    3. Supplier/Miller employees
    """

    normalized_identifier = identifier.strip().lower()


    # ========================================================
    # 1. MAIN USERS
    # Retailer, Warehouse Manager, Miller Manager
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
                password_hash,
                user_role,
                status,
                must_change_password,
                province,
                gender
            FROM users
            WHERE
                LOWER(email) = %s
                OR LOWER(COALESCE(username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
                normalized_identifier,
            ],
        )

        row = cursor.fetchone()

    if row:
        must_change_pw = bool(row[11])
        province = row[12]
        gender = row[13]
        profile_incomplete = (not province or not str(province).strip() or not gender or not str(gender).strip())
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

            "role": str(row[9]),
            "status": str(row[10]),

            "account_type": "main_user",
            "position": None,
            "organization_type": None,
            "profile_id": None,
            "owner_user_id": row[0],
            "must_change_password": must_change_pw,
            "profile_incomplete": profile_incomplete,
        }


    # ========================================================
    # 2. WAREHOUSE EMPLOYEES
    # ========================================================

    with connection.cursor() as cursor:
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
                OR LOWER(COALESCE(we.username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
                normalized_identifier,
            ],
        )

        row = cursor.fetchone()

    if row:
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

            # user_id ng Warehouse Manager / Owner
            "owner_user_id": row[12],
        }


    # ========================================================
    # 3. SUPPLIER / MILLER EMPLOYEES
    # ========================================================

    with connection.cursor() as cursor:
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
                OR LOWER(COALESCE(se.username, '')) = %s
            LIMIT 1
            """,
            [
                normalized_identifier,
                normalized_identifier,
            ],
        )

        row = cursor.fetchone()

    if row:
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

            # user_id ng Supplier / Miller Manager / Owner
            "owner_user_id": row[12],
        }


    # ========================================================
    # ACCOUNT NOT FOUND
    # ========================================================

    return None