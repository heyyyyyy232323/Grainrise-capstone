import logging
from datetime import date, datetime
from decimal import Decimal

from django.db import connection

logger = logging.getLogger(__name__)


# ============================================================
# TABLE NAME RESOLVER
# ============================================================

def get_profanity_table_name(cursor=None):
    """
    Resolves the actual profanity table name from the database.
    Checks for `profanity_chats` first, falls back to `profanity_chat`.
    """
    owns_cursor = cursor is None
    db_cursor = connection.cursor() if owns_cursor else cursor
    try:
        db_cursor.execute("SHOW TABLES LIKE 'profanity_chats'")
        if db_cursor.fetchone():
            return "profanity_chats"
        return "profanity_chat"
    finally:
        if owns_cursor:
            db_cursor.close()


# ============================================================
# SUPPORTED STATUSES
# ============================================================

def get_supported_statuses(cursor=None):
    """
    Returns the supported status values defined in the database constraint:
    `chk_profanity_chat_status` -> ('active', 'inactive')
    """
    return ["active", "inactive"]


# ============================================================
# DICTIONARY HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    if not cursor.description:
        return []
    columns = [column[0] for column in cursor.description]
    return [
        dict(zip(columns, row))
        for row in cursor.fetchall()
    ]


def _row_to_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def serialize_value(value):
    """
    Convert date/time and decimal objects into JSON-serializable types.
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def serialize_profanity_record(row):
    """
    Serializes a single profanity record dictionary for API responses.
    """
    if not row:
        return None
    return {
        key: serialize_value(val)
        for key, val in row.items()
    }


# ============================================================
# QUERY SELECTORS
# ============================================================

def list_profanity_words(search=None, status=None, cursor=None):
    """
    Retrieve prohibited words from the database with optional search and status filter.
    Returns list of records ordered by updated_at DESC, profanity_id DESC.
    """
    owns_cursor = cursor is None
    db_cursor = connection.cursor() if owns_cursor else cursor

    try:
        table_name = get_profanity_table_name(db_cursor)
        conditions = []
        params = []

        if search:
            search_term = f"%{str(search).strip()}%"
            conditions.append(
                "(prohibited_text LIKE %s OR prohibited_text_normalized LIKE %s)"
            )
            params.extend([search_term, search_term])

        if status:
            clean_status = str(status).strip().lower()
            if clean_status in get_supported_statuses(db_cursor):
                conditions.append("status = %s")
                params.append(clean_status)

        where_clause = ""
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)

        query = f"""
            SELECT
                profanity_id,
                prohibited_text,
                prohibited_text_normalized,
                status,
                created_at,
                updated_at
            FROM {table_name}
            {where_clause}
            ORDER BY updated_at DESC, profanity_id DESC
        """

        db_cursor.execute(query, params)
        rows = _rows_to_dicts(db_cursor)
        return [serialize_profanity_record(r) for r in rows]

    finally:
        if owns_cursor:
            db_cursor.close()


def get_profanity_by_id(profanity_id, cursor=None):
    """
    Fetch a single prohibited word by its profanity_id.
    """
    owns_cursor = cursor is None
    db_cursor = connection.cursor() if owns_cursor else cursor

    try:
        table_name = get_profanity_table_name(db_cursor)
        query = f"""
            SELECT
                profanity_id,
                prohibited_text,
                prohibited_text_normalized,
                status,
                created_at,
                updated_at
            FROM {table_name}
            WHERE profanity_id = %s
            LIMIT 1
        """
        db_cursor.execute(query, [profanity_id])
        row = _row_to_dict(db_cursor)
        return serialize_profanity_record(row)

    finally:
        if owns_cursor:
            db_cursor.close()


def check_profanity_duplicate(prohibited_text, exclude_id=None, cursor=None):
    """
    Check if a normalized representation of the prohibited text already exists.
    Convention is lower(trim(text)).
    """
    owns_cursor = cursor is None
    db_cursor = connection.cursor() if owns_cursor else cursor

    try:
        table_name = get_profanity_table_name(db_cursor)
        normalized = str(prohibited_text or "").strip().lower()

        conditions = ["prohibited_text_normalized = %s"]
        params = [normalized]

        if exclude_id is not None:
            conditions.append("profanity_id != %s")
            params.append(exclude_id)

        query = f"""
            SELECT profanity_id
            FROM {table_name}
            WHERE {" AND ".join(conditions)}
            LIMIT 1
        """
        db_cursor.execute(query, params)
        return db_cursor.fetchone() is not None

    finally:
        if owns_cursor:
            db_cursor.close()

