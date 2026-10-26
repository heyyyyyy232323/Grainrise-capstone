import logging
from django.db import connection, transaction

from .selectors import (
    check_profanity_duplicate,
    get_profanity_by_id,
    get_profanity_table_name,
    get_supported_statuses,
)

logger = logging.getLogger(__name__)


# ============================================================
# EXCEPTIONS
# ============================================================

class ProfanityValidationError(Exception):
    """Raised when word data fails validation."""
    pass


class ProfanityNotFoundError(Exception):
    """Raised when a prohibited word is not found."""
    pass


# ============================================================
# VALIDATION
# ============================================================

def validate_prohibited_word(prohibited_text, max_length=20):
    """
    Validate that the prohibited word:
    - is not None
    - is not empty or whitespace-only
    - does not exceed max_length (20 characters)
    Returns the stripped prohibited word.
    """
    if prohibited_text is None:
        raise ProfanityValidationError("Prohibited word is required.")

    cleaned = str(prohibited_text).strip()
    if not cleaned:
        raise ProfanityValidationError("Prohibited word cannot be empty or whitespace only.")

    if len(cleaned) > max_length:
        raise ProfanityValidationError(f"Prohibited word cannot exceed {max_length} characters.")

    return cleaned


def validate_status(status, cursor=None):
    """
    Validate that status is in the supported statuses ('active', 'inactive').
    Defaults to 'active' if empty/None.
    """
    if not status:
        return "active"

    clean_status = str(status).strip().lower()
    supported = get_supported_statuses(cursor)
    if clean_status not in supported:
        raise ProfanityValidationError(
            f"Invalid status '{status}'. Supported statuses are: {', '.join(supported)}."
        )

    return clean_status


# ============================================================
# SERVICES
# ============================================================

def create_profanity_word(prohibited_text, status="active"):
    """
    Creates a new prohibited word in the database.
    Normalizes representation using the existing lower(trim(text)) convention.
    """
    cleaned_text = validate_prohibited_word(prohibited_text)
    clean_status = validate_status(status)

    with connection.cursor() as cursor:
        table_name = get_profanity_table_name(cursor)

        # Check for duplicate normalized word
        if check_profanity_duplicate(cleaned_text, cursor=cursor):
            raise ProfanityValidationError("This prohibited word already exists.")

        try:
            insert_query = f"""
                INSERT INTO {table_name} (
                    prohibited_text,
                    status
                ) VALUES (%s, %s)
            """
            cursor.execute(insert_query, [cleaned_text, clean_status])
            new_id = cursor.lastrowid
        except Exception as exc:
            # Handle unique constraint violation from MySQL (error code 1062)
            if "Duplicate entry" in str(exc) or (hasattr(exc, "args") and exc.args and exc.args[0] == 1062):
                raise ProfanityValidationError("This prohibited word already exists.") from exc
            logger.error("Error creating prohibited word: %s", exc)
            raise

    return get_profanity_by_id(new_id)


def update_profanity_word(profanity_id, prohibited_text=None, status=None):
    """
    Updates an existing prohibited word and/or its status.
    Maintains normalized representation automatically.
    """
    existing = get_profanity_by_id(profanity_id)
    if not existing:
        raise ProfanityNotFoundError("Prohibited word not found.")

    new_text = (
        validate_prohibited_word(prohibited_text)
        if prohibited_text is not None
        else existing["prohibited_text"]
    )
    new_status = (
        validate_status(status)
        if status is not None
        else existing["status"]
    )

    with connection.cursor() as cursor:
        table_name = get_profanity_table_name(cursor)

        # Check duplicate if prohibited text changed
        if check_profanity_duplicate(new_text, exclude_id=profanity_id, cursor=cursor):
            raise ProfanityValidationError("This prohibited word already exists.")

        try:
            update_query = f"""
                UPDATE {table_name}
                SET
                    prohibited_text = %s,
                    status = %s
                WHERE profanity_id = %s
            """
            cursor.execute(update_query, [new_text, new_status, profanity_id])
        except Exception as exc:
            if "Duplicate entry" in str(exc) or (hasattr(exc, "args") and exc.args and exc.args[0] == 1062):
                raise ProfanityValidationError("This prohibited word already exists.") from exc
            logger.error("Error updating prohibited word: %s", exc)
            raise

    return get_profanity_by_id(profanity_id)


def delete_profanity_word(profanity_id):
    """
    Permanently deletes a prohibited word from the database.
    """
    existing = get_profanity_by_id(profanity_id)
    if not existing:
        raise ProfanityNotFoundError("Prohibited word not found.")

    with connection.cursor() as cursor:
        table_name = get_profanity_table_name(cursor)
        delete_query = f"""
            DELETE FROM {table_name}
            WHERE profanity_id = %s
        """
        cursor.execute(delete_query, [profanity_id])

    return existing

