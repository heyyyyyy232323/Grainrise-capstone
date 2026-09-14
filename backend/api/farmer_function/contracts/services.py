from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.db import connection, transaction

from api.chat_moderation import (
    moderate_and_report_chat_message,
)


# ============================================================
# GRAINRISE
# FARMER > CONTRACTS
# SERVICES
# ============================================================
#
# Handles:
#
# - Submit Application
# - Cancel Application
# - Create Open Bidding
# - Accept Miller Offer
# - Decline Miller Offer
# - Sign Current Contract
# - Request Contract Void
# - Farmer -> Miller Message
#
#
# SECURITY:
#
# farmer_user_id MUST always come from the authenticated
# Farmer JWT/session.
#
# Never trust farmer_user_id from request.data.
#
# Miller business relationships always use:
#
# supplier_profiles.supplier_profile_id
#
# and NOT a direct Miller users.user_id foreign key.
# ============================================================


# ============================================================
# BASIC HELPERS
# ============================================================

def _text(
    value,
    *,
    required=False,
    field_name="Value",
):
    cleaned = str(
        value or ""
    ).strip()

    if (
        required
        and not cleaned
    ):
        raise ValueError(
            f"{field_name} is required."
        )

    return cleaned


def _normalize_farmer_id(
    farmer_user_id,
):
    try:
        normalized = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid authenticated Farmer account."
        ) from exc


    if normalized <= 0:
        raise ValueError(
            "Invalid authenticated Farmer account."
        )


    return normalized


def _positive_id(
    value,
    field_name,
):
    try:
        normalized = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"{field_name} is invalid."
        ) from exc


    if normalized <= 0:
        raise ValueError(
            f"{field_name} is invalid."
        )


    return normalized


def _positive_decimal(
    value,
    *,
    field_name,
    required=True,
):
    if (
        value is None
        or value == ""
    ):
        if required:
            raise ValueError(
                f"{field_name} is required."
            )

        return None


    try:
        normalized = Decimal(
            str(value)
        )

    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"{field_name} must be a valid number."
        ) from exc


    if normalized <= 0:
        raise ValueError(
            f"{field_name} must be greater than zero."
        )


    return normalized


def _date_value(
    value,
    *,
    field_name,
    required=True,
):
    if (
        value is None
        or value == ""
    ):
        if required:
            raise ValueError(
                f"{field_name} is required."
            )

        return None


    if isinstance(
        value,
        datetime,
    ):
        return value.date()


    if isinstance(
        value,
        date,
    ):
        return value


    try:
        return date.fromisoformat(
            str(value).strip()
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            (
                f"{field_name} must use "
                "YYYY-MM-DD format."
            )
        ) from exc


def _datetime_value(
    value,
    *,
    field_name,
    required=True,
):
    if (
        value is None
        or value == ""
    ):
        if required:
            raise ValueError(
                f"{field_name} is required."
            )

        return None


    if isinstance(
        value,
        datetime,
    ):
        return value


    if isinstance(
        value,
        date,
    ):
        return datetime.combine(
            value,
            datetime.min.time(),
        )


    normalized = (
        str(value)
        .strip()
        .replace(
            "Z",
            "+00:00",
        )
    )


    try:
        parsed = (
            datetime.fromisoformat(
                normalized
            )
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            (
                f"{field_name} must be "
                "a valid date and time."
            )
        ) from exc


    # Database currently uses TIMESTAMP without timezone.
    if parsed.tzinfo is not None:
        parsed = (
            parsed
            .astimezone()
            .replace(
                tzinfo=None
            )
        )


    return parsed


# ============================================================
# DATABASE RESULT
# ============================================================

def _row_to_dict(
    cursor,
    row=None,
):
    if row is None:
        row = cursor.fetchone()


    if row is None:
        return None


    columns = [
        column[0]
        for column
        in cursor.description
    ]


    return dict(
        zip(
            columns,
            row,
        )
    )


# ============================================================
# ACTIVE FARMER
# ============================================================

def _assert_active_farmer(
    cursor,
    farmer_user_id,
):
    cursor.execute(
        """
        SELECT
            user_id

        FROM users

        WHERE
            user_id = %s

            AND user_role::text =
                'farmer'

            AND status::text =
                'active'

        LIMIT 1
        """,
        [
            farmer_user_id,
        ],
    )


    if not cursor.fetchone():
        raise ValueError(
            (
                "Farmer account is unavailable "
                "or inactive."
            )
        )


# ============================================================
# SYSTEM-GENERATED CODE
# ============================================================

def _next_reference(
    cursor,
    *,
    table_name,
    id_column,
    prefix,
):
    """
    Generate both the BIGSERIAL ID and public reference code.

    Example:

        APP-2026-000001
        BID-2026-000001
        CON-2026-000001
    """

    allowed = {
        (
            "farmer_contract_applications",
            "application_id",
            "APP",
        ),

        (
            "farmer_open_biddings",
            "bidding_id",
            "BID",
        ),

        (
            "contracts",
            "contract_id",
            "CON",
        ),
    }


    key = (
        table_name,
        id_column,
        prefix,
    )


    if key not in allowed:
        raise RuntimeError(
            "Unsupported reference sequence."
        )


    cursor.execute(
        """
        SELECT nextval(
            pg_get_serial_sequence(
                %s,
                %s
            )
        )
        """,
        [
            table_name,
            id_column,
        ],
    )


    record_id = (
        cursor.fetchone()[0]
    )


    reference_code = (
        f"{prefix}-"
        f"{date.today().year}-"
        f"{record_id:06d}"
    )


    return (
        record_id,
        reference_code,
    )


# ============================================================
# INVENTORY RESERVATION
# ============================================================

def _adjust_reserved_stock(
    cursor,
    farm_product_id,
    quantity_change,
):
    """
    Positive quantity_change:
        reserve stock.

    Negative quantity_change:
        release stock.
    """

    cursor.execute(
        """
        SELECT
            farm_product_id,
            total_stock_quantity_kg,
            reserved_committed_quantity_kg

        FROM farm_products

        WHERE
            farm_product_id = %s

        FOR UPDATE
        """,
        [
            farm_product_id,
        ],
    )


    row = cursor.fetchone()


    if not row:
        raise ValueError(
            "Inventory product was not found."
        )


    total_stock = Decimal(
        str(
            row[1]
        )
    )


    current_reserved = Decimal(
        str(
            row[2] or 0
        )
    )


    new_reserved = (
        current_reserved
        +
        Decimal(
            str(
                quantity_change
            )
        )
    )


    if new_reserved < 0:
        raise ValueError(
            (
                "Inventory reservation cannot "
                "be lower than zero."
            )
        )


    if new_reserved > total_stock:
        raise ValueError(
            (
                "Not enough available Inventory "
                "quantity for this commitment."
            )
        )


    cursor.execute(
        """
        UPDATE farm_products

        SET
            reserved_committed_quantity_kg =
                %s,

            updated_at =
                CURRENT_TIMESTAMP

        WHERE
            farm_product_id =
                %s
        """,
        [
            new_reserved,
            farm_product_id,
        ],
    )


# ============================================================
# SUBMIT APPLICATION
# ============================================================

@transaction.atomic
def submit_application(
    farmer_user_id,
    posting_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    posting_id = (
        _positive_id(
            posting_id,
            "Opportunity ID",
        )
    )


    data = data or {}


    farm_product_id = (
        _positive_id(
            data.get(
                "farm_product_id"
            ),
            "Inventory Product",
        )
    )


    quantity = (
        _positive_decimal(
            data.get(
                "quantity_to_commit_kg"
            ),
            field_name=(
                "Quantity to Commit"
            ),
        )
    )


    expected_date = (
        _date_value(
            data.get(
                "expected_availability_date"
            ),
            field_name=(
                "Expected Availability Date"
            ),
        )
    )


    proposed_price = (
        _positive_decimal(
            data.get(
                "proposed_selling_price_per_kg"
            ),
            field_name=(
                "Proposed Selling Price"
            ),
            required=False,
        )
    )


    notes = _text(
        data.get(
            "additional_notes_to_miller"
        )
    )


    farmer_signature = _text(
        data.get(
            "farmer_signature_path"
        ),
        required=True,
        field_name=(
            "Electronic Signature"
        ),
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        # ====================================================
        # POSTING
        # ====================================================

        cursor.execute(
            """
            SELECT
                cp.posting_id,
                cp.supplier_profile_id,

                cp.application_deadline,

                cp.product_type,
                cp.rice_variety,
                cp.product_grade,

                cp.required_quantity_kg,

                cp.buying_price_per_kg,

                cp.required_fulfillment_date,

                cp.partial_quantity_allowed,
                cp.price_negotiation_allowed,

                cp.posting_status

            FROM contract_postings cp

            WHERE
                cp.posting_id = %s

            FOR UPDATE
            """,
            [
                posting_id,
            ],
        )


        posting = cursor.fetchone()


        if not posting:
            raise ValueError(
                "Opportunity was not found."
            )


        (
            _posting_id,
            _supplier_profile_id,
            application_deadline,
            required_product_type,
            required_variety,
            required_grade,
            required_quantity,
            _buying_price,
            required_fulfillment_date,
            partial_allowed,
            negotiation_allowed,
            posting_status,
        ) = posting


        if (
            posting_status !=
            "open"
        ):
            raise ValueError(
                (
                    "This opportunity is no "
                    "longer accepting applications."
                )
            )


        if (
            application_deadline
            <
            date.today()
        ):
            cursor.execute(
                """
                UPDATE contract_postings

                SET
                    posting_status =
                        'expired',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE posting_id = %s
                  AND posting_status = 'open'
                """,
                [
                    posting_id,
                ],
            )


            raise ValueError(
                (
                    "The application deadline "
                    "has already passed."
                )
            )


        # ====================================================
        # DUPLICATE ACTIVE APPLICATION
        # ====================================================

        cursor.execute(
            """
            SELECT 1

            FROM farmer_contract_applications

            WHERE
                posting_id = %s

                AND farmer_user_id =
                    %s

                AND application_status
                    IN (
                        'pending',
                        'under_review',
                        'approved'
                    )

            LIMIT 1
            """,
            [
                posting_id,
                farmer_id,
            ],
        )


        if cursor.fetchone():
            raise ValueError(
                (
                    "You already have an active "
                    "application for this opportunity."
                )
            )


        # ====================================================
        # INVENTORY PRODUCT
        # ====================================================

        cursor.execute(
            """
            SELECT
                fp.farm_product_id,

                fp.product_type,
                fp.rice_variety,
                fp.product_grade,

                fp.available_quantity_kg,

                fp.status

            FROM farm_products fp

            WHERE
                fp.farm_product_id =
                    %s

                AND fp.user_id =
                    %s

            FOR UPDATE
            """,
            [
                farm_product_id,
                farmer_id,
            ],
        )


        product = cursor.fetchone()


        if not product:
            raise ValueError(
                (
                    "Selected Inventory product "
                    "does not belong to this Farmer."
                )
            )


        (
            _product_id,
            product_type,
            rice_variety,
            product_grade,
            available_quantity,
            product_status,
        ) = product


        if (
            product_status !=
            "active"
        ):
            raise ValueError(
                (
                    "Selected Inventory product "
                    "is not active."
                )
            )


        if (
            product_type !=
            required_product_type
        ):
            raise ValueError(
                (
                    "Selected product type does "
                    "not match this opportunity."
                )
            )


        if (
            str(
                rice_variety or ""
            ).strip().casefold()
            !=
            str(
                required_variety or ""
            ).strip().casefold()
        ):
            raise ValueError(
                (
                    "Selected rice variety does "
                    "not match this opportunity."
                )
            )


        if (
            required_grade
            and str(
                product_grade or ""
            ).strip().casefold()
            !=
            str(
                required_grade
            ).strip().casefold()
        ):
            raise ValueError(
                (
                    "Selected product grade does "
                    "not match this opportunity."
                )
            )


        available_quantity = Decimal(
            str(
                available_quantity or 0
            )
        )


        required_quantity = Decimal(
            str(
                required_quantity
            )
        )


        if (
            quantity >
            available_quantity
        ):
            raise ValueError(
                (
                    "Quantity to Commit exceeds "
                    "your available Inventory."
                )
            )


        if quantity > required_quantity:
            raise ValueError(
                (
                    "Quantity to Commit exceeds "
                    "the Miller's required quantity."
                )
            )


        if (
            not partial_allowed
            and quantity !=
            required_quantity
        ):
            raise ValueError(
                (
                    "This opportunity does not "
                    "allow partial quantity."
                )
            )


        if (
            proposed_price is not None
            and not negotiation_allowed
        ):
            raise ValueError(
                (
                    "Price negotiation is not "
                    "allowed for this opportunity."
                )
            )


        if (
            expected_date >
            required_fulfillment_date
        ):
            raise ValueError(
                (
                    "Expected Availability Date "
                    "cannot be later than the "
                    "required fulfillment date."
                )
            )


        # ====================================================
        # RESERVE INVENTORY
        # ====================================================

        _adjust_reserved_stock(
            cursor,
            farm_product_id,
            quantity,
        )


        # ====================================================
        # APPLICATION ID
        # ====================================================

        (
            application_id,
            application_code,
        ) = _next_reference(
            cursor,
            table_name=(
                "farmer_contract_applications"
            ),
            id_column=(
                "application_id"
            ),
            prefix="APP",
        )


        # ====================================================
        # INSERT
        # ====================================================

        cursor.execute(
            """
            INSERT INTO farmer_contract_applications (
                application_id,
                application_code,

                posting_id,
                farmer_user_id,
                farm_product_id,

                quantity_to_commit_kg,

                expected_availability_date,

                proposed_selling_price_per_kg,

                additional_notes_to_miller,

                farmer_signature_path,
                farmer_signed_at,

                application_status,

                created_at,
                updated_at
            )

            VALUES (
                %s,
                %s,

                %s,
                %s,
                %s,

                %s,

                %s,

                %s,

                %s,

                %s,
                CURRENT_TIMESTAMP,

                'pending',

                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )

            RETURNING
                application_id,
                application_code,
                posting_id,
                farmer_user_id,
                farm_product_id,
                quantity_to_commit_kg,
                expected_availability_date,
                proposed_selling_price_per_kg,
                additional_notes_to_miller,
                farmer_signed_at,
                application_status,
                created_at,
                updated_at
            """,
            [
                application_id,
                application_code,

                posting_id,
                farmer_id,
                farm_product_id,

                quantity,

                expected_date,

                proposed_price,

                notes or None,

                farmer_signature,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# CANCEL APPLICATION
# ============================================================

@transaction.atomic
def cancel_application(
    farmer_user_id,
    application_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    application_id = (
        _positive_id(
            application_id,
            "Application ID",
        )
    )


    data = data or {}


    reason = _text(
        data.get(
            "cancellation_reason"
        ),
        required=True,
        field_name=(
            "Cancellation Reason"
        ),
    )


    remarks = _text(
        data.get(
            "cancellation_remarks"
        )
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        cursor.execute(
            """
            SELECT
                application_id,
                farm_product_id,
                quantity_to_commit_kg,
                application_status

            FROM farmer_contract_applications

            WHERE
                application_id =
                    %s

                AND farmer_user_id =
                    %s

            FOR UPDATE
            """,
            [
                application_id,
                farmer_id,
            ],
        )


        row = cursor.fetchone()


        if not row:
            raise ValueError(
                "Application was not found."
            )


        (
            _application_id,
            farm_product_id,
            quantity,
            application_status,
        ) = row


        if (
            application_status !=
            "pending"
        ):
            raise ValueError(
                (
                    "Only a pending application "
                    "can be cancelled."
                )
            )


        _adjust_reserved_stock(
            cursor,
            farm_product_id,
            -Decimal(
                str(
                    quantity
                )
            ),
        )


        cursor.execute(
            """
            UPDATE farmer_contract_applications

            SET
                application_status =
                    'cancelled',

                cancellation_reason =
                    %s,

                cancellation_remarks =
                    %s,

                cancelled_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                application_id =
                    %s

                AND farmer_user_id =
                    %s

            RETURNING
                application_id,
                application_code,
                application_status,
                cancellation_reason,
                cancellation_remarks,
                cancelled_at,
                updated_at
            """,
            [
                reason,
                remarks or None,
                application_id,
                farmer_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# CREATE OPEN BIDDING
# ============================================================

@transaction.atomic
def create_open_bidding(
    farmer_user_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    data = data or {}


    farm_id = (
        _positive_id(
            data.get(
                "farm_id"
            ),
            "Farm ID",
        )
    )


    farm_product_id = (
        _positive_id(
            data.get(
                "farm_product_id"
            ),
            "Inventory Product",
        )
    )


    quantity = (
        _positive_decimal(
            data.get(
                "quantity_open_for_bidding_kg"
            ),
            field_name=(
                "Quantity Open for Bidding"
            ),
        )
    )


    minimum_price = (
        _positive_decimal(
            data.get(
                "minimum_acceptable_price_per_kg"
            ),
            field_name=(
                "Minimum Acceptable Price"
            ),
            required=False,
        )
    )


    expected_date = (
        _date_value(
            data.get(
                "expected_availability_date"
            ),
            field_name=(
                "Expected Availability Date"
            ),
        )
    )


    bidding_deadline = (
        _datetime_value(
            data.get(
                "bidding_deadline"
            ),
            field_name=(
                "Bidding Deadline"
            ),
        )
    )


    fulfillment_method = (
        _text(
            data.get(
                "fulfillment_method"
            ),
            required=True,
            field_name=(
                "Fulfillment Method"
            ),
        )
        .lower()
    )


    preferred_date = (
        _date_value(
            data.get(
                "preferred_fulfillment_date"
            ),
            field_name=(
                "Preferred Fulfillment Date"
            ),
        )
    )


    additional_terms = _text(
        data.get(
            "additional_terms"
        )
    )


    notes = _text(
        data.get(
            "notes_to_millers"
        )
    )


    farmer_signature = _text(
        data.get(
            "farmer_signature_path"
        ),
        required=True,
        field_name=(
            "Farmer Electronic Signature"
        ),
    )


    if (
        fulfillment_method
        not in {
            "buyer_pickup",
            "farmer_delivery",
        }
    ):
        raise ValueError(
            "Invalid Fulfillment Method."
        )


    if (
        bidding_deadline <=
        datetime.now()
    ):
        raise ValueError(
            (
                "Bidding Deadline must be "
                "in the future."
            )
        )


    if (
        preferred_date <
        bidding_deadline.date()
    ):
        raise ValueError(
            (
                "Preferred Fulfillment Date "
                "cannot be earlier than the "
                "Bidding Deadline."
            )
        )


    if (
        expected_date >
        preferred_date
    ):
        raise ValueError(
            (
                "Expected Availability Date "
                "cannot be later than the "
                "Preferred Fulfillment Date."
            )
        )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        # ====================================================
        # FARM
        # ====================================================

        cursor.execute(
            """
            SELECT
                farm_id,
                farm_status

            FROM farmer_farms

            WHERE
                farm_id = %s

                AND user_id =
                    %s

            FOR UPDATE
            """,
            [
                farm_id,
                farmer_id,
            ],
        )


        farm = cursor.fetchone()


        if not farm:
            raise ValueError(
                (
                    "Selected Farm does not "
                    "belong to this Farmer."
                )
            )


        if farm[1] != "active":
            raise ValueError(
                (
                    "Selected Farm must be active "
                    "before creating a bidding."
                )
            )


        # ====================================================
        # PRODUCT
        # ====================================================

        cursor.execute(
            """
            SELECT
                farm_product_id,
                source_farm_id,
                acquisition_source_type,
                available_quantity_kg,
                status

            FROM farm_products

            WHERE
                farm_product_id =
                    %s

                AND user_id =
                    %s

            FOR UPDATE
            """,
            [
                farm_product_id,
                farmer_id,
            ],
        )


        product = cursor.fetchone()


        if not product:
            raise ValueError(
                "Inventory product was not found."
            )


        (
            _product_id,
            source_farm_id,
            acquisition_source_type,
            available_quantity,
            product_status,
        ) = product


        if (
            product_status !=
            "active"
        ):
            raise ValueError(
                "Inventory product is not active."
            )


        if (
            acquisition_source_type !=
            "own_farm"
        ):
            raise ValueError(
                (
                    "Only products from your own "
                    "Farm can be opened for bidding."
                )
            )


        if (
            source_farm_id !=
            farm_id
        ):
            raise ValueError(
                (
                    "Selected product does not "
                    "belong to the selected Farm."
                )
            )


        available_quantity = Decimal(
            str(
                available_quantity or 0
            )
        )


        if (
            quantity >
            available_quantity
        ):
            raise ValueError(
                (
                    "Quantity Open for Bidding "
                    "exceeds available Inventory."
                )
            )


        # ====================================================
        # RESERVE STOCK
        # ====================================================

        _adjust_reserved_stock(
            cursor,
            farm_product_id,
            quantity,
        )


        # ====================================================
        # GENERATE BIDDING
        # ====================================================

        (
            bidding_id,
            bidding_code,
        ) = _next_reference(
            cursor,
            table_name=(
                "farmer_open_biddings"
            ),
            id_column=(
                "bidding_id"
            ),
            prefix="BID",
        )


        cursor.execute(
            """
            INSERT INTO farmer_open_biddings (
                bidding_id,
                bidding_code,

                farmer_user_id,
                farm_id,
                farm_product_id,

                quantity_open_for_bidding_kg,

                minimum_acceptable_price_per_kg,

                expected_availability_date,

                bidding_deadline,

                fulfillment_method,

                preferred_fulfillment_date,

                additional_terms,
                notes_to_millers,

                farmer_signature_path,
                farmer_signed_at,

                bidding_status,

                created_at,
                updated_at
            )

            VALUES (
                %s,
                %s,

                %s,
                %s,
                %s,

                %s,

                %s,

                %s,

                %s,

                %s,

                %s,

                %s,
                %s,

                %s,
                CURRENT_TIMESTAMP,

                'open',

                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )

            RETURNING
                bidding_id,
                bidding_code,
                farmer_user_id,
                farm_id,
                farm_product_id,
                quantity_open_for_bidding_kg,
                minimum_acceptable_price_per_kg,
                expected_availability_date,
                bidding_deadline,
                fulfillment_method,
                preferred_fulfillment_date,
                additional_terms,
                notes_to_millers,
                farmer_signed_at,
                bidding_status,
                created_at,
                updated_at
            """,
            [
                bidding_id,
                bidding_code,

                farmer_id,
                farm_id,
                farm_product_id,

                quantity,

                minimum_price,

                expected_date,

                bidding_deadline,

                fulfillment_method,

                preferred_date,

                additional_terms or None,
                notes or None,

                farmer_signature,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# ACCEPT BIDDING OFFER
# ============================================================

@transaction.atomic
def accept_bidding_offer(
    farmer_user_id,
    offer_id,
    farmer_signature_path,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    offer_id = (
        _positive_id(
            offer_id,
            "Offer ID",
        )
    )


    farmer_signature = _text(
        farmer_signature_path,
        required=True,
        field_name=(
            "Farmer Electronic Signature"
        ),
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        cursor.execute(
            """
            SELECT
                fbo.offer_id,
                fbo.bidding_id,
                fbo.supplier_profile_id,

                fbo.offered_buying_price_per_kg,
                fbo.offered_quantity_kg,

                fbo.proposed_fulfillment_date,
                fbo.fulfillment_method,

                fbo.proposed_terms,

                fbo.miller_signature_path,
                fbo.miller_signed_at,

                fbo.offer_status,

                fob.farmer_user_id,
                fob.farm_id,
                fob.farm_product_id,

                fob.quantity_open_for_bidding_kg,

                fob.bidding_deadline,

                fob.additional_terms,

                fob.bidding_status,

                CONCAT_WS(
                    ', ',
                    NULLIF(
                        TRIM(
                            ff.street_address
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            ff.barangay
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            ff.municipality
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            ff.province
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                ff.postal_code,
                                ''
                            )
                        ),
                        ''
                    )
                )
                AS farm_location,

                CONCAT_WS(
                    ', ',
                    NULLIF(
                        TRIM(
                            sp.street_address
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            sp.barangay
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            sp.municipality
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            sp.province
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                sp.postal_code,
                                ''
                            )
                        ),
                        ''
                    )
                )
                AS miller_location

            FROM farmer_bidding_offers fbo

            INNER JOIN farmer_open_biddings fob
                ON fob.bidding_id =
                    fbo.bidding_id

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                    fob.farm_product_id

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    fob.farm_id

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                    fbo.supplier_profile_id

            WHERE
                fbo.offer_id =
                    %s

                AND fob.farmer_user_id =
                    %s

            FOR UPDATE OF
                fbo,
                fob,
                fp
            """,
            [
                offer_id,
                farmer_id,
            ],
        )


        row = cursor.fetchone()


        if not row:
            raise ValueError(
                "Bidding offer was not found."
            )


        (
            _offer_id,
            bidding_id,
            supplier_profile_id,

            offered_price,
            offered_quantity,

            fulfillment_date,
            fulfillment_method,

            proposed_terms,

            miller_signature,
            miller_signed_at,

            offer_status,

            _farmer_id,
            _farm_id,
            farm_product_id,

            bidding_quantity,

            bidding_deadline,

            bidding_terms,

            bidding_status,

            farm_location,
            miller_location,
        ) = row


        if (
            offer_status !=
            "submitted"
        ):
            raise ValueError(
                (
                    "This offer can no longer "
                    "be accepted."
                )
            )


        if (
            bidding_status !=
            "open"
        ):
            raise ValueError(
                (
                    "This bidding is no longer "
                    "open."
                )
            )


        if (
            bidding_deadline
            and bidding_deadline <
            datetime.now()
        ):
            cursor.execute(
                """
                UPDATE farmer_open_biddings

                SET
                    bidding_status =
                        'expired',

                    updated_at =
                        CURRENT_TIMESTAMP

                WHERE bidding_id = %s
                """,
                [
                    bidding_id,
                ],
            )


            raise ValueError(
                (
                    "The bidding deadline "
                    "has already passed."
                )
            )


        offered_quantity = Decimal(
            str(
                offered_quantity
            )
        )


        bidding_quantity = Decimal(
            str(
                bidding_quantity
            )
        )


        if (
            offered_quantity >
            bidding_quantity
        ):
            raise ValueError(
                (
                    "Miller offered quantity exceeds "
                    "the quantity opened for bidding."
                )
            )


        # ====================================================
        # CONTRACT LOCATION
        # ====================================================

        if (
            fulfillment_method ==
            "buyer_pickup"
        ):
            fulfillment_location = (
                farm_location
            )

        else:
            fulfillment_location = (
                miller_location
            )


        fulfillment_location = (
            _text(
                fulfillment_location
            )
            or "To be coordinated by both parties."
        )


        agreed_terms = (
            _text(
                proposed_terms
            )
            or
            _text(
                bidding_terms
            )
            or None
        )


        # ====================================================
        # GENERATE CONTRACT
        # ====================================================

        (
            contract_id,
            contract_code,
        ) = _next_reference(
            cursor,
            table_name=(
                "contracts"
            ),
            id_column=(
                "contract_id"
            ),
            prefix="CON",
        )


        # ====================================================
        # ACCEPT OFFER
        # ====================================================

        cursor.execute(
            """
            UPDATE farmer_bidding_offers

            SET
                offer_status =
                    'accepted',

                responded_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE offer_id = %s
            """,
            [
                offer_id,
            ],
        )


        # ====================================================
        # DECLINE OTHER OFFERS
        # ====================================================

        cursor.execute(
            """
            UPDATE farmer_bidding_offers

            SET
                offer_status =
                    'declined',

                responded_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                bidding_id =
                    %s

                AND offer_id <>
                    %s

                AND offer_status =
                    'submitted'
            """,
            [
                bidding_id,
                offer_id,
            ],
        )


        # ====================================================
        # AWARD BIDDING
        # ====================================================

        cursor.execute(
            """
            UPDATE farmer_open_biddings

            SET
                bidding_status =
                    'awarded',

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE bidding_id =
                %s
            """,
            [
                bidding_id,
            ],
        )


        # ====================================================
        # RELEASE UNUSED RESERVED QUANTITY
        #
        # Example:
        #
        # Bidding reserved = 1000 kg
        # Accepted offer   = 700 kg
        #
        # Release          = 300 kg
        # Contract retains = 700 kg reservation
        # ====================================================

        unused_quantity = (
            bidding_quantity
            -
            offered_quantity
        )


        if unused_quantity > 0:
            _adjust_reserved_stock(
                cursor,
                farm_product_id,
                -unused_quantity,
            )


        # ====================================================
        # CREATE CONTRACT
        # ====================================================

        cursor.execute(
            """
            INSERT INTO contracts (
                contract_id,
                contract_code,

                contract_source,

                application_id,
                bidding_offer_id,

                farmer_user_id,
                supplier_profile_id,

                farm_product_id,

                contracted_quantity_kg,

                agreed_price_per_kg,

                contract_start_date,

                fulfillment_date,
                fulfillment_method,
                fulfillment_location,

                fulfillment_status,
                quantity_fulfilled_kg,

                agreed_terms,

                farmer_signature_path,
                farmer_signed_at,

                miller_signature_path,
                miller_signed_at,

                contract_status,

                created_at,
                updated_at
            )

            VALUES (
                %s,
                %s,

                'bidding_offer',

                NULL,
                %s,

                %s,
                %s,

                %s,

                %s,

                %s,

                CURRENT_DATE,

                %s,
                %s,
                %s,

                'pending',
                0,

                %s,

                %s,
                CURRENT_TIMESTAMP,

                %s,
                %s,

                'active',

                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )

            RETURNING
                contract_id,
                contract_code,
                contract_source,
                bidding_offer_id,
                farmer_user_id,
                supplier_profile_id,
                farm_product_id,
                contracted_quantity_kg,
                agreed_price_per_kg,
                total_contract_value,
                contract_start_date,
                fulfillment_date,
                fulfillment_method,
                fulfillment_location,
                fulfillment_status,
                quantity_fulfilled_kg,
                remaining_quantity_kg,
                agreed_terms,
                farmer_signed_at,
                miller_signed_at,
                contract_status,
                created_at,
                updated_at
            """,
            [
                contract_id,
                contract_code,

                offer_id,

                farmer_id,
                supplier_profile_id,

                farm_product_id,

                offered_quantity,

                offered_price,

                fulfillment_date,
                fulfillment_method,
                fulfillment_location,

                agreed_terms,

                farmer_signature,

                miller_signature,
                miller_signed_at,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# DECLINE BIDDING OFFER
# ============================================================

@transaction.atomic
def decline_bidding_offer(
    farmer_user_id,
    offer_id,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    offer_id = (
        _positive_id(
            offer_id,
            "Offer ID",
        )
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        cursor.execute(
            """
            SELECT
                fbo.offer_id,
                fbo.offer_status,
                fob.bidding_status

            FROM farmer_bidding_offers fbo

            INNER JOIN farmer_open_biddings fob
                ON fob.bidding_id =
                    fbo.bidding_id

            WHERE
                fbo.offer_id =
                    %s

                AND fob.farmer_user_id =
                    %s

            FOR UPDATE OF
                fbo,
                fob
            """,
            [
                offer_id,
                farmer_id,
            ],
        )


        row = cursor.fetchone()


        if not row:
            raise ValueError(
                "Bidding offer was not found."
            )


        (
            _offer_id,
            offer_status,
            bidding_status,
        ) = row


        if (
            bidding_status !=
            "open"
        ):
            raise ValueError(
                (
                    "Offers for this bidding "
                    "can no longer be changed."
                )
            )


        if (
            offer_status !=
            "submitted"
        ):
            raise ValueError(
                (
                    "Only a submitted offer "
                    "can be declined."
                )
            )


        cursor.execute(
            """
            UPDATE farmer_bidding_offers

            SET
                offer_status =
                    'declined',

                responded_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE offer_id =
                %s

            RETURNING
                offer_id,
                offer_code,
                bidding_id,
                supplier_profile_id,
                offer_status,
                responded_at,
                updated_at
            """,
            [
                offer_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# SIGN CURRENT CONTRACT
# ============================================================

@transaction.atomic
def sign_contract(
    farmer_user_id,
    contract_id,
    farmer_signature_path,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    contract_id = (
        _positive_id(
            contract_id,
            "Contract ID",
        )
    )


    farmer_signature = _text(
        farmer_signature_path,
        required=True,
        field_name=(
            "Farmer Electronic Signature"
        ),
    )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        cursor.execute(
            """
            SELECT
                contract_id,
                contract_status,
                farmer_signature_path

            FROM contracts

            WHERE
                contract_id =
                    %s

                AND farmer_user_id =
                    %s

            FOR UPDATE
            """,
            [
                contract_id,
                farmer_id,
            ],
        )


        row = cursor.fetchone()


        if not row:
            raise ValueError(
                "Contract was not found."
            )


        (
            _contract_id,
            contract_status,
            existing_signature,
        ) = row


        if (
            contract_status !=
            "active"
        ):
            raise ValueError(
                (
                    "Only an active contract can "
                    "be electronically signed."
                )
            )


        if existing_signature:
            raise ValueError(
                (
                    "This contract has already "
                    "been signed by the Farmer."
                )
            )


        cursor.execute(
            """
            UPDATE contracts

            SET
                farmer_signature_path =
                    %s,

                farmer_signed_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                contract_id =
                    %s

                AND farmer_user_id =
                    %s

            RETURNING
                contract_id,
                contract_code,
                farmer_user_id,
                supplier_profile_id,
                farmer_signed_at,
                miller_signed_at,
                contract_status,
                updated_at
            """,
            [
                farmer_signature,
                contract_id,
                farmer_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# REQUEST CONTRACT VOID
# ============================================================

@transaction.atomic
def request_contract_void(
    farmer_user_id,
    contract_id,
    data,
):
    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    contract_id = (
        _positive_id(
            contract_id,
            "Contract ID",
        )
    )


    data = data or {}


    reason = _text(
        data.get(
            "reason"
        ),
        required=True,
        field_name=(
            "Void Request Reason"
        ),
    )


    remarks = _text(
        data.get(
            "remarks"
        )
    )


    if len(reason) > 255:
        raise ValueError(
            (
                "Void Request Reason cannot "
                "exceed 255 characters."
            )
        )


    with connection.cursor() as cursor:

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        cursor.execute(
            """
            SELECT
                contract_id,
                contract_status

            FROM contracts

            WHERE
                contract_id =
                    %s

                AND farmer_user_id =
                    %s

            FOR UPDATE
            """,
            [
                contract_id,
                farmer_id,
            ],
        )


        row = cursor.fetchone()


        if not row:
            raise ValueError(
                "Contract was not found."
            )


        contract_status = (
            row[1]
        )


        if (
            contract_status !=
            "active"
        ):
            if (
                contract_status ==
                "void_requested"
            ):
                raise ValueError(
                    (
                        "A void request has already "
                        "been submitted for this contract."
                    )
                )


            raise ValueError(
                (
                    "Only an active contract can "
                    "receive a void request."
                )
            )


        cursor.execute(
            """
            UPDATE contracts

            SET
                contract_status =
                    'void_requested',

                void_requested_by =
                    'farmer',

                void_reason =
                    %s,

                void_remarks =
                    %s,

                void_requested_at =
                    CURRENT_TIMESTAMP,

                updated_at =
                    CURRENT_TIMESTAMP

            WHERE
                contract_id =
                    %s

                AND farmer_user_id =
                    %s

            RETURNING
                contract_id,
                contract_code,
                contract_status,
                void_requested_by,
                void_reason,
                void_remarks,
                void_requested_at,
                updated_at
            """,
            [
                reason,
                remarks or None,
                contract_id,
                farmer_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# MESSAGE REFERENCE VALIDATION
# ============================================================

def _validate_farmer_message_reference(
    cursor,
    *,
    farmer_user_id,
    supplier_profile_id,
    reference_type,
    reference_id,
):
    """
    Ensure the Farmer cannot fabricate a reference_id or
    supplier_profile_id to message an unrelated Miller.
    """

    if (
        reference_type ==
        "posting"
    ):
        cursor.execute(
            """
            SELECT 1

            FROM contract_postings cp

            WHERE
                cp.posting_id =
                    %s

                AND cp.supplier_profile_id =
                    %s

            LIMIT 1
            """,
            [
                reference_id,
                supplier_profile_id,
            ],
        )


    elif (
        reference_type ==
        "application"
    ):
        cursor.execute(
            """
            SELECT 1

            FROM farmer_contract_applications fca

            INNER JOIN contract_postings cp
                ON cp.posting_id =
                    fca.posting_id

            WHERE
                fca.application_id =
                    %s

                AND fca.farmer_user_id =
                    %s

                AND cp.supplier_profile_id =
                    %s

            LIMIT 1
            """,
            [
                reference_id,
                farmer_user_id,
                supplier_profile_id,
            ],
        )


    elif (
        reference_type ==
        "bidding"
    ):
        cursor.execute(
            """
            SELECT 1

            FROM farmer_open_biddings fob

            INNER JOIN farmer_bidding_offers fbo
                ON fbo.bidding_id =
                    fob.bidding_id

            WHERE
                fob.bidding_id =
                    %s

                AND fob.farmer_user_id =
                    %s

                AND fbo.supplier_profile_id =
                    %s

            LIMIT 1
            """,
            [
                reference_id,
                farmer_user_id,
                supplier_profile_id,
            ],
        )


    elif (
        reference_type ==
        "bidding_offer"
    ):
        cursor.execute(
            """
            SELECT 1

            FROM farmer_bidding_offers fbo

            INNER JOIN farmer_open_biddings fob
                ON fob.bidding_id =
                    fbo.bidding_id

            WHERE
                fbo.offer_id =
                    %s

                AND fbo.supplier_profile_id =
                    %s

                AND fob.farmer_user_id =
                    %s

            LIMIT 1
            """,
            [
                reference_id,
                supplier_profile_id,
                farmer_user_id,
            ],
        )


    elif (
        reference_type ==
        "contract"
    ):
        cursor.execute(
            """
            SELECT 1

            FROM contracts c

            WHERE
                c.contract_id =
                    %s

                AND c.farmer_user_id =
                    %s

                AND c.supplier_profile_id =
                    %s

            LIMIT 1
            """,
            [
                reference_id,
                farmer_user_id,
                supplier_profile_id,
            ],
        )


    else:
        return False


    return bool(
        cursor.fetchone()
    )


# ============================================================
# SEND FARMER MESSAGE
# ============================================================

@transaction.atomic
def send_farmer_message(
    farmer_user_id,
    data,
):
    """
    Farmer -> Miller contract-related message.

    FLOW:

    1. Authenticated Farmer validation
    2. Miller validation
    3. Transaction/reference ownership validation
    4. Global profanity moderation
    5A. Profanity:
        - message blocked
        - automatic report created
        - NO farmer_miller_message insert
    5B. Clean:
        - insert farmer_miller_message
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    data = data or {}


    supplier_profile_id = (
        _positive_id(
            data.get(
                "supplier_profile_id"
            ),
            "Miller Profile",
        )
    )


    reference_type = (
        _text(
            data.get(
                "reference_type"
            ),
            required=True,
            field_name=(
                "Message Reference Type"
            ),
        )
        .lower()
    )


    reference_id = (
        _positive_id(
            data.get(
                "reference_id"
            ),
            "Message Reference",
        )
    )


    message_text = _text(
        data.get(
            "message_text"
        ),
        required=True,
        field_name="Message",
    )


    valid_reference_types = {
        "posting",
        "application",
        "bidding",
        "bidding_offer",
        "contract",
    }


    if (
        reference_type
        not in valid_reference_types
    ):
        raise ValueError(
            "Invalid message reference type."
        )


    if len(message_text) > 5000:
        raise ValueError(
            (
                "Message cannot exceed "
                "5000 characters."
            )
        )


    with connection.cursor() as cursor:

        # ====================================================
        # FARMER
        # ====================================================

        _assert_active_farmer(
            cursor,
            farmer_id,
        )


        # ====================================================
        # MILLER PROFILE
        #
        # supplier_profile_id
        #       ↓
        # supplier_profiles.user_id
        #       ↓
        # Miller users.user_id
        #
        # Miller users.user_id is also used as the recipient
        # / reported_by user when profanity is auto-reported.
        # ====================================================

        cursor.execute(
            """
            SELECT
                sp.supplier_profile_id,

                sp.user_id,

                u.status::text

            FROM supplier_profiles sp

            INNER JOIN users u
                ON u.user_id =
                    sp.user_id

            WHERE
                sp.supplier_profile_id =
                    %s

                AND u.user_role::text =
                    'miller_manager'

            LIMIT 1
            """,
            [
                supplier_profile_id,
            ],
        )


        miller = cursor.fetchone()


        if not miller:
            raise ValueError(
                "Miller / Buyer was not found."
            )


        miller_user_id = (
            miller[1]
        )


        if (
            miller[2] !=
            "active"
        ):
            raise ValueError(
                (
                    "Miller / Buyer account "
                    "is currently unavailable."
                )
            )


        # ====================================================
        # REFERENCE OWNERSHIP
        # ====================================================

        reference_valid = (
            _validate_farmer_message_reference(
                cursor,
                farmer_user_id=(
                    farmer_id
                ),
                supplier_profile_id=(
                    supplier_profile_id
                ),
                reference_type=(
                    reference_type
                ),
                reference_id=(
                    reference_id
                ),
            )
        )


        if not reference_valid:
            raise ValueError(
                (
                    "You cannot send a message "
                    "using this transaction reference."
                )
            )


        # ====================================================
        # GLOBAL PROFANITY MODERATION
        # ====================================================

        moderation = (
            moderate_and_report_chat_message(
                message_text=(
                    message_text
                ),

                sender_actor_type=(
                    "user"
                ),

                sender_actor_id=(
                    farmer_id
                ),

                # Backend-resolved recipient.
                # NEVER frontend-supplied.
                reported_by_user_id=(
                    miller_user_id
                ),

                reference_type=(
                    reference_type
                ),

                reference_id=(
                    reference_id
                ),

                cursor=cursor,
            )
        )


        # ====================================================
        # BLOCKED
        #
        # Important:
        # We RETURN instead of raising an exception here.
        #
        # The profanity report must remain committed.
        # ====================================================

        if not moderation.get(
            "allowed"
        ):
            return {
                "success":
                    False,

                "blocked":
                    True,

                "code":
                    "PROFANITY_DETECTED",

                "message":
                    (
                        "Your message contains "
                        "language that is not allowed "
                        "under GrainRise communication "
                        "guidelines."
                    ),
            }


        # ====================================================
        # CLEAN MESSAGE
        # ====================================================

        cursor.execute(
            """
            INSERT INTO farmer_miller_message (
                farmer_user_id,
                supplier_profile_id,

                reference_type,
                reference_id,

                sender_type,

                message_text,

                is_read,
                read_at,

                created_at
            )

            VALUES (
                %s,
                %s,

                %s,
                %s,

                'farmer',

                %s,

                FALSE,
                NULL,

                CURRENT_TIMESTAMP
            )

            RETURNING
                message_id,

                farmer_user_id,
                supplier_profile_id,

                reference_type,
                reference_id,

                sender_type,

                message_text,

                is_read,
                read_at,

                created_at
            """,
            [
                farmer_id,
                supplier_profile_id,

                reference_type,
                reference_id,

                message_text,
            ],
        )


        message = _row_to_dict(
            cursor
        )


        return {
            "success":
                True,

            "blocked":
                False,

            "code":
                "MESSAGE_SENT",

            "message":
                message,
        }