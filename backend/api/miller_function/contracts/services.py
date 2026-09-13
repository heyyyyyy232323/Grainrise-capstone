from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from django.db import connection, transaction
from api.chat_moderation import moderate_and_report_chat_message

# GRAINRISE
# MILLER MANAGER > CONTRACTS
# SERVICES
#
# SECURITY:
# - supplier_profile_id must be resolved from authenticated JWT.
# - miller users.user_id must be resolved from authenticated JWT.
# - Never trust supplier_profile_id/user_id from React as ownership.
#
# TRANSACTION RULES:
# - Farmer application quantity is already reserved on submission.
# - Farmer bidding quantity is already reserved when bidding opens.
# - Miller services do not reserve those quantities again.

# BASIC HELPERS

def _text(value, *, required=False, field_name="Value"):
    cleaned = str(value or "").strip()
    if required and not cleaned:
        raise ValueError(f"{field_name} is required.")
    return cleaned

def _positive_id(value, field_name):
    try:
        normalized = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} is invalid.") from exc
    if normalized <= 0:
        raise ValueError(f"{field_name} is invalid.")
    return normalized

def _positive_decimal(value, *, field_name, required=True):
    if value is None or value == "":
        if required:
            raise ValueError(f"{field_name} is required.")
        return None
    try:
        normalized = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid number.") from exc
    if normalized <= 0:
        raise ValueError(f"{field_name} must be greater than zero.")
    return normalized

def _date_value(value, *, field_name, required=True):
    if value is None or value == "":
        if required:
            raise ValueError(f"{field_name} is required.")
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value).strip())
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must use YYYY-MM-DD format.") from exc

def _bool_value(value, *, field_name):
    if isinstance(value, bool):
        return value
    normalized = str(value or "").strip().lower()
    if normalized in {"true", "1", "yes", "on"}:
        return True
    if normalized in {"false", "0", "no", "off"}:
        return False
    raise ValueError(f"{field_name} must be true or false.")

def _row_to_dict(cursor, row=None):
    if row is None:
        row = cursor.fetchone()
    if row is None:
        return None
    return dict(zip([column[0] for column in cursor.description], row))

def _next_reference(cursor, *, table_name, id_column, prefix):
    allowed = {
        ("contract_postings", "posting_id", "PST"),
        ("farmer_bidding_offers", "offer_id", "OFF"),
        ("contracts", "contract_id", "CON"),
    }
    if (table_name, id_column, prefix) not in allowed:
        raise RuntimeError("Unsupported reference sequence.")
    cursor.execute(
        """
        SELECT nextval(pg_get_serial_sequence(%s, %s))
        """,
        [table_name, id_column],
    )
    record_id = cursor.fetchone()[0]
    return record_id, f"{prefix}-{date.today().year}-{record_id:06d}"

def _assert_active_miller(cursor, supplier_profile_id, miller_user_id=None):
    supplier_profile_id = _positive_id(supplier_profile_id, "Miller Profile")
    params = [supplier_profile_id]
    user_clause = ""
    if miller_user_id is not None:
        miller_user_id = _positive_id(miller_user_id, "Authenticated Miller")
        user_clause = "AND u.user_id = %s"
        params.append(miller_user_id)
    cursor.execute(
        f"""
        SELECT sp.supplier_profile_id, sp.user_id
        FROM supplier_profiles sp
        INNER JOIN users u ON u.user_id = sp.user_id
        WHERE sp.supplier_profile_id = %s
          {user_clause}
          AND u.user_role::text = 'miller_manager'
          AND u.status::text = 'active'
        LIMIT 1
        """,
        params,
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError("Miller Manager account is unavailable or inactive.")
    return {"supplier_profile_id": row[0], "user_id": row[1]}

def _adjust_reserved_stock(cursor, farm_product_id, quantity_change):
    cursor.execute(
        """
        SELECT total_stock_quantity_kg, reserved_committed_quantity_kg
        FROM farm_products
        WHERE farm_product_id = %s
        FOR UPDATE
        """,
        [farm_product_id],
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError("Farmer Inventory product was not found.")
    total_stock = Decimal(str(row[0]))
    current_reserved = Decimal(str(row[1] or 0))
    new_reserved = current_reserved + Decimal(str(quantity_change))
    if new_reserved < 0:
        raise ValueError("Inventory reservation cannot be lower than zero.")
    if new_reserved > total_stock:
        raise ValueError("Inventory reservation cannot exceed total stock.")
    cursor.execute(
        """
        UPDATE farm_products
        SET reserved_committed_quantity_kg = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE farm_product_id = %s
        """,
        [new_reserved, farm_product_id],
    )

def _consume_reserved_stock(cursor, farm_product_id, quantity):
    quantity = Decimal(str(quantity))
    cursor.execute(
        """
        SELECT total_stock_quantity_kg, reserved_committed_quantity_kg
        FROM farm_products
        WHERE farm_product_id=%s
        FOR UPDATE
        """,
        [farm_product_id],
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError("Farmer Inventory product was not found.")
    total_stock = Decimal(str(row[0]))
    reserved = Decimal(str(row[1] or 0))
    if reserved < quantity or total_stock < quantity:
        raise ValueError("The contract quantity is no longer fully reserved in Farmer Inventory.")
    cursor.execute(
        """
        UPDATE farm_products
        SET total_stock_quantity_kg=total_stock_quantity_kg-%s,
            reserved_committed_quantity_kg=reserved_committed_quantity_kg-%s,
            updated_at=CURRENT_TIMESTAMP
        WHERE farm_product_id=%s
        """,
        [quantity, quantity, farm_product_id],
    )

def _location_text(*parts):
    cleaned = [str(part).strip() for part in parts if part and str(part).strip()]
    return ", ".join(cleaned) or "To be coordinated by both parties."

# POSTINGS

@transaction.atomic
def create_posting(supplier_profile_id, data):
    data = data or {}
    application_deadline = _date_value(
        data.get("application_deadline"), field_name="Application Deadline"
    )
    fulfillment_date = _date_value(
        data.get("required_fulfillment_date"), field_name="Required Fulfillment Date"
    )
    product_type = _text(data.get("product_type"), required=True, field_name="Product Type").lower()
    rice_variety = _text(data.get("rice_variety"), required=True, field_name="Rice Variety")
    product_grade = _text(data.get("product_grade")) or None
    product_image = _text(data.get("product_image")) or None
    product_description = _text(data.get("product_description")) or None
    quantity = _positive_decimal(data.get("required_quantity_kg"), field_name="Required Quantity")
    buying_price = _positive_decimal(data.get("buying_price_per_kg"), field_name="Buying Price")
    partial_allowed = _bool_value(data.get("partial_quantity_allowed", False), field_name="Partial Quantity")
    negotiation_allowed = _bool_value(data.get("price_negotiation_allowed", False), field_name="Price Negotiation")
    fulfillment_method = _text(
        data.get("fulfillment_method"), required=True, field_name="Fulfillment Method"
    ).lower()
    province = _text(data.get("fulfillment_province"), required=True, field_name="Province")
    municipality = _text(data.get("fulfillment_municipality"), required=True, field_name="Municipality")
    barangay = _text(data.get("fulfillment_barangay"), required=True, field_name="Barangay")
    street = _text(data.get("fulfillment_street_address"), required=True, field_name="Street Address")
    postal = _text(data.get("fulfillment_postal_code")) or None
    terms = _text(data.get("proposed_deal_terms")) or None
    notes = _text(data.get("additional_notes_to_farmers")) or None
    if product_type not in {"unmilled_palay", "milled_rice"}:
        raise ValueError("Invalid Product Type.")
    if fulfillment_method not in {"buyer_pickup", "farmer_delivery"}:
        raise ValueError("Invalid Fulfillment Method.")
    if application_deadline < date.today():
        raise ValueError("Application Deadline cannot be in the past.")
    if fulfillment_date < application_deadline:
        raise ValueError("Required Fulfillment Date cannot be before Application Deadline.")
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        posting_id, posting_code = _next_reference(
            cursor, table_name="contract_postings", id_column="posting_id", prefix="PST"
        )
        cursor.execute(
            """
            INSERT INTO contract_postings (
                posting_id, posting_code, supplier_profile_id,
                application_deadline, product_type, rice_variety,
                product_image, product_description, product_grade,
                required_quantity_kg, buying_price_per_kg,
                required_fulfillment_date, partial_quantity_allowed,
                price_negotiation_allowed, fulfillment_method,
                fulfillment_province, fulfillment_municipality,
                fulfillment_postal_code, fulfillment_barangay,
                fulfillment_street_address, proposed_deal_terms,
                additional_notes_to_farmers, posting_status,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING *
            """,
            [
                posting_id, posting_code, supplier_profile_id,
                application_deadline, product_type, rice_variety,
                product_image, product_description, product_grade,
                quantity, buying_price, fulfillment_date,
                partial_allowed, negotiation_allowed, fulfillment_method,
                province, municipality, postal, barangay, street,
                terms, notes,
            ],
        )
        return _row_to_dict(cursor)

@transaction.atomic
def edit_posting(supplier_profile_id, posting_id, data):
    posting_id = _positive_id(posting_id, "Posting ID")
    data = data or {}
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            SELECT posting_status
            FROM contract_postings
            WHERE posting_id = %s AND supplier_profile_id = %s
            FOR UPDATE
            """,
            [posting_id, supplier_profile_id],
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Posting was not found.")
        if row[0] != "open":
            raise ValueError("Only open Postings can be edited.")
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM farmer_contract_applications
            WHERE posting_id = %s
            """,
            [posting_id],
        )
        if cursor.fetchone()[0] > 0:
            raise ValueError(
                "This Posting already has Farmer applications and cannot be edited. "
                "Close it and create a new Posting if the terms must change."
            )

        # Reuse the same validation surface as Create Posting.
        application_deadline = _date_value(data.get("application_deadline"), field_name="Application Deadline")
        fulfillment_date = _date_value(data.get("required_fulfillment_date"), field_name="Required Fulfillment Date")
        product_type = _text(data.get("product_type"), required=True, field_name="Product Type").lower()
        rice_variety = _text(data.get("rice_variety"), required=True, field_name="Rice Variety")
        quantity = _positive_decimal(data.get("required_quantity_kg"), field_name="Required Quantity")
        buying_price = _positive_decimal(data.get("buying_price_per_kg"), field_name="Buying Price")
        partial_allowed = _bool_value(data.get("partial_quantity_allowed", False), field_name="Partial Quantity")
        negotiation_allowed = _bool_value(data.get("price_negotiation_allowed", False), field_name="Price Negotiation")
        fulfillment_method = _text(data.get("fulfillment_method"), required=True, field_name="Fulfillment Method").lower()
        if product_type not in {"unmilled_palay", "milled_rice"}:
            raise ValueError("Invalid Product Type.")
        if fulfillment_method not in {"buyer_pickup", "farmer_delivery"}:
            raise ValueError("Invalid Fulfillment Method.")
        if application_deadline < date.today():
            raise ValueError("Application Deadline cannot be in the past.")
        if fulfillment_date < application_deadline:
            raise ValueError("Required Fulfillment Date cannot be before Application Deadline.")
        cursor.execute(
            """
            UPDATE contract_postings
            SET application_deadline=%s, product_type=%s, rice_variety=%s,
                product_image=%s, product_description=%s, product_grade=%s,
                required_quantity_kg=%s, buying_price_per_kg=%s,
                required_fulfillment_date=%s, partial_quantity_allowed=%s,
                price_negotiation_allowed=%s, fulfillment_method=%s,
                fulfillment_province=%s, fulfillment_municipality=%s,
                fulfillment_postal_code=%s, fulfillment_barangay=%s,
                fulfillment_street_address=%s, proposed_deal_terms=%s,
                additional_notes_to_farmers=%s, updated_at=CURRENT_TIMESTAMP
            WHERE posting_id=%s AND supplier_profile_id=%s
            RETURNING *
            """,
            [
                application_deadline, product_type, rice_variety,
                _text(data.get("product_image")) or None,
                _text(data.get("product_description")) or None,
                _text(data.get("product_grade")) or None,
                quantity, buying_price, fulfillment_date,
                partial_allowed, negotiation_allowed, fulfillment_method,
                _text(data.get("fulfillment_province"), required=True, field_name="Province"),
                _text(data.get("fulfillment_municipality"), required=True, field_name="Municipality"),
                _text(data.get("fulfillment_postal_code")) or None,
                _text(data.get("fulfillment_barangay"), required=True, field_name="Barangay"),
                _text(data.get("fulfillment_street_address"), required=True, field_name="Street Address"),
                _text(data.get("proposed_deal_terms")) or None,
                _text(data.get("additional_notes_to_farmers")) or None,
                posting_id, supplier_profile_id,
            ],
        )
        return _row_to_dict(cursor)

@transaction.atomic
def close_posting(supplier_profile_id, posting_id):
    posting_id = _positive_id(posting_id, "Posting ID")
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            UPDATE contract_postings
            SET posting_status='closed', updated_at=CURRENT_TIMESTAMP
            WHERE posting_id=%s AND supplier_profile_id=%s AND posting_status='open'
            RETURNING posting_id, posting_code, posting_status, updated_at
            """,
            [posting_id, supplier_profile_id],
        )
        result = _row_to_dict(cursor)
        if not result:
            raise ValueError("Posting was not found or is no longer open.")
        return result

# BIDDING OFFERS

def _validate_offer_payload(data):
    data = data or {}
    price = _positive_decimal(data.get("offered_buying_price_per_kg"), field_name="Offered Buying Price")
    quantity = _positive_decimal(data.get("offered_quantity_kg"), field_name="Offered Quantity")
    fulfillment_date = _date_value(data.get("proposed_fulfillment_date"), field_name="Proposed Fulfillment Date")
    fulfillment_method = _text(data.get("fulfillment_method"), required=True, field_name="Fulfillment Method").lower()
    if fulfillment_method not in {"buyer_pickup", "farmer_delivery"}:
        raise ValueError("Invalid Fulfillment Method.")
    signature = _text(data.get("miller_signature_path"), required=True, field_name="Electronic Signature")
    return {
        "price": price,
        "quantity": quantity,
        "fulfillment_date": fulfillment_date,
        "fulfillment_method": fulfillment_method,
        "terms": _text(data.get("proposed_terms")) or None,
        "notes": _text(data.get("additional_notes_to_farmer")) or None,
        "signature": signature,
    }

def _lock_open_bidding(cursor, bidding_id):
    cursor.execute(
        """
        SELECT bidding_id, farmer_user_id, quantity_open_for_bidding_kg,
               minimum_acceptable_price_per_kg, preferred_fulfillment_date,
               bidding_deadline, bidding_status
        FROM farmer_open_biddings
        WHERE bidding_id=%s
        FOR UPDATE
        """,
        [bidding_id],
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError("Farmer bidding was not found.")
    if row[6] != "open":
        raise ValueError("This Farmer bidding is no longer open.")
    if row[5] and row[5] < datetime.now():
        raise ValueError("The bidding deadline has already passed.")
    return row

@transaction.atomic
def submit_offer(supplier_profile_id, bidding_id, data):
    bidding_id = _positive_id(bidding_id, "Bidding ID")
    offer = _validate_offer_payload(data)
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        bidding = _lock_open_bidding(cursor, bidding_id)
        bidding_quantity = Decimal(str(bidding[2]))
        minimum_price = Decimal(str(bidding[3])) if bidding[3] is not None else None
        if offer["quantity"] > bidding_quantity:
            raise ValueError("Offered Quantity exceeds the quantity open for bidding.")
        if minimum_price is not None and offer["price"] < minimum_price:
            raise ValueError("Offered Buying Price is below the Farmer's minimum acceptable price.")
        if offer["fulfillment_date"] < date.today():
            raise ValueError("Proposed Fulfillment Date cannot be in the past.")
        cursor.execute(
            """
            SELECT offer_id FROM farmer_bidding_offers
            WHERE bidding_id=%s AND supplier_profile_id=%s
            LIMIT 1
            """,
            [bidding_id, supplier_profile_id],
        )
        if cursor.fetchone():
            raise ValueError("Your Miller business already has an offer for this bidding.")
        offer_id, offer_code = _next_reference(
            cursor, table_name="farmer_bidding_offers", id_column="offer_id", prefix="OFF"
        )
        cursor.execute(
            """
            INSERT INTO farmer_bidding_offers (
                offer_id, offer_code, bidding_id, supplier_profile_id,
                offered_buying_price_per_kg, offered_quantity_kg,
                proposed_fulfillment_date, fulfillment_method,
                proposed_terms, additional_notes_to_farmer,
                miller_signature_path, miller_signed_at,
                offer_status, responded_at, created_at, updated_at
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP,
                'submitted',NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
            ) RETURNING *
            """,
            [
                offer_id, offer_code, bidding_id, supplier_profile_id,
                offer["price"], offer["quantity"], offer["fulfillment_date"],
                offer["fulfillment_method"], offer["terms"], offer["notes"],
                offer["signature"],
            ],
        )
        return _row_to_dict(cursor)

@transaction.atomic
def edit_offer(supplier_profile_id, offer_id, data):
    offer_id = _positive_id(offer_id, "Offer ID")
    offer = _validate_offer_payload(data)
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            SELECT bidding_id, offer_status
            FROM farmer_bidding_offers
            WHERE offer_id=%s AND supplier_profile_id=%s
            FOR UPDATE
            """,
            [offer_id, supplier_profile_id],
        )
        existing = cursor.fetchone()
        if not existing:
            raise ValueError("Offer was not found.")
        if existing[1] != "submitted":
            raise ValueError("Only submitted offers can be edited.")
        bidding = _lock_open_bidding(cursor, existing[0])
        bidding_quantity = Decimal(str(bidding[2]))
        minimum_price = Decimal(str(bidding[3])) if bidding[3] is not None else None
        if offer["quantity"] > bidding_quantity:
            raise ValueError("Offered Quantity exceeds the quantity open for bidding.")
        if minimum_price is not None and offer["price"] < minimum_price:
            raise ValueError("Offered Buying Price is below the Farmer's minimum acceptable price.")
        if offer["fulfillment_date"] < date.today():
            raise ValueError("Proposed Fulfillment Date cannot be in the past.")
        cursor.execute(
            """
            UPDATE farmer_bidding_offers
            SET offered_buying_price_per_kg=%s, offered_quantity_kg=%s,
                proposed_fulfillment_date=%s, fulfillment_method=%s,
                proposed_terms=%s, additional_notes_to_farmer=%s,
                miller_signature_path=%s, miller_signed_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            WHERE offer_id=%s AND supplier_profile_id=%s
            RETURNING *
            """,
            [
                offer["price"], offer["quantity"], offer["fulfillment_date"],
                offer["fulfillment_method"], offer["terms"], offer["notes"],
                offer["signature"], offer_id, supplier_profile_id,
            ],
        )
        return _row_to_dict(cursor)

@transaction.atomic
def withdraw_offer(supplier_profile_id, offer_id):
    offer_id = _positive_id(offer_id, "Offer ID")
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            SELECT fbo.bidding_id, fbo.offer_status, fob.bidding_status, fob.bidding_deadline
            FROM farmer_bidding_offers fbo
            INNER JOIN farmer_open_biddings fob ON fob.bidding_id=fbo.bidding_id
            WHERE fbo.offer_id=%s AND fbo.supplier_profile_id=%s
            FOR UPDATE OF fbo, fob
            """,
            [offer_id, supplier_profile_id],
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Offer was not found.")
        if row[1] != "submitted":
            raise ValueError("This offer can no longer be withdrawn.")
        if row[2] != "open" or (row[3] and row[3] < datetime.now()):
            raise ValueError("This bidding is no longer open for offer withdrawal.")
        cursor.execute(
            """
            UPDATE farmer_bidding_offers
            SET offer_status='withdrawn', responded_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            WHERE offer_id=%s AND supplier_profile_id=%s
            RETURNING offer_id, offer_code, offer_status, responded_at, updated_at
            """,
            [offer_id, supplier_profile_id],
        )
        return _row_to_dict(cursor)

# FARMER APPLICATION REVIEW

@transaction.atomic
def start_application_review(supplier_profile_id, application_id):
    application_id = _positive_id(application_id, "Application ID")
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            UPDATE farmer_contract_applications fca
            SET application_status='under_review', review_started_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            FROM contract_postings cp
            WHERE fca.application_id=%s
              AND cp.posting_id=fca.posting_id
              AND cp.supplier_profile_id=%s
              AND fca.application_status='pending'
            RETURNING fca.application_id, fca.application_code,
                      fca.application_status, fca.review_started_at, fca.updated_at
            """,
            [application_id, supplier_profile_id],
        )
        result = _row_to_dict(cursor)
        if not result:
            raise ValueError("Application was not found or is no longer Pending.")
        return result

def _decline_remaining_applications(cursor, posting_id, excluded_application_id):
    cursor.execute(
        """
        SELECT application_id, farm_product_id, quantity_to_commit_kg
        FROM farmer_contract_applications
        WHERE posting_id=%s AND application_id<>%s
          AND application_status IN ('pending','under_review')
        FOR UPDATE
        """,
        [posting_id, excluded_application_id],
    )
    rows = cursor.fetchall()
    for application_id, farm_product_id, quantity in rows:
        _adjust_reserved_stock(cursor, farm_product_id, -Decimal(str(quantity)))
        cursor.execute(
            """
            UPDATE farmer_contract_applications
            SET application_status='declined',
                decline_reason='Posting requirement already fulfilled',
                decline_remarks='The Miller completed the required procurement quantity.',
                declined_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
            WHERE application_id=%s
            """,
            [application_id],
        )

@transaction.atomic
def approve_application(supplier_profile_id, application_id, data=None):
    application_id = _positive_id(application_id, "Application ID")
    data = data or {}
    miller_signature = _text(data.get("miller_signature_path")) or None
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            SELECT
                fca.posting_id, fca.farmer_user_id, fca.farm_product_id,
                fca.quantity_to_commit_kg, fca.expected_availability_date,
                fca.proposed_selling_price_per_kg, fca.farmer_signature_path,
                fca.farmer_signed_at, fca.application_status,
                cp.required_quantity_kg, cp.buying_price_per_kg,
                cp.required_fulfillment_date, cp.partial_quantity_allowed,
                cp.price_negotiation_allowed, cp.fulfillment_method,
                cp.fulfillment_street_address, cp.fulfillment_barangay,
                cp.fulfillment_municipality, cp.fulfillment_province,
                cp.fulfillment_postal_code, cp.proposed_deal_terms,
                cp.posting_status,
                ff.street_address, ff.barangay, ff.municipality, ff.province, ff.postal_code,
                fp.reserved_committed_quantity_kg
            FROM farmer_contract_applications fca
            INNER JOIN contract_postings cp ON cp.posting_id=fca.posting_id
            INNER JOIN farm_products fp ON fp.farm_product_id=fca.farm_product_id
            LEFT JOIN farmer_farms ff ON ff.farm_id=fp.source_farm_id
            WHERE fca.application_id=%s AND cp.supplier_profile_id=%s
            FOR UPDATE OF fca, cp, fp
            """,
            [application_id, supplier_profile_id],
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Application was not found.")
        (
            posting_id, farmer_user_id, farm_product_id, quantity,
            expected_date, proposed_price, farmer_signature, farmer_signed_at,
            application_status, required_quantity, buying_price, fulfillment_date,
            partial_allowed, negotiation_allowed, fulfillment_method,
            fulfillment_street, fulfillment_barangay, fulfillment_municipality,
            fulfillment_province, fulfillment_postal, posting_terms, posting_status,
            farm_street, farm_barangay, farm_municipality, farm_province, farm_postal,
            reserved_quantity,
        ) = row
        if application_status not in {"pending", "under_review"}:
            raise ValueError("This application can no longer be approved.")
        if posting_status == "cancelled":
            raise ValueError("The parent Posting has been cancelled.")
        quantity = Decimal(str(quantity))
        required_quantity = Decimal(str(required_quantity))
        reserved_quantity = Decimal(str(reserved_quantity or 0))
        if reserved_quantity < quantity:
            raise ValueError("The Farmer's committed Inventory quantity is no longer fully reserved.")
        if expected_date > fulfillment_date:
            raise ValueError("The Farmer's availability date does not satisfy the Posting fulfillment date.")
        cursor.execute(
            """
            SELECT COALESCE(SUM(quantity_to_commit_kg),0)
            FROM farmer_contract_applications
            WHERE posting_id=%s AND application_status='approved'
              AND application_id<>%s
            """,
            [posting_id, application_id],
        )
        already_approved = Decimal(str(cursor.fetchone()[0] or 0))
        if already_approved + quantity > required_quantity:
            raise ValueError("Approving this application would exceed the Posting's required quantity.")
        agreed_price = (
            Decimal(str(proposed_price))
            if negotiation_allowed and proposed_price is not None
            else Decimal(str(buying_price))
        )
        fulfillment_location = (
            _location_text(farm_street, farm_barangay, farm_municipality, farm_province, farm_postal)
            if fulfillment_method == "buyer_pickup"
            else _location_text(
                fulfillment_street, fulfillment_barangay, fulfillment_municipality,
                fulfillment_province, fulfillment_postal,
            )
        )
        contract_id, contract_code = _next_reference(
            cursor, table_name="contracts", id_column="contract_id", prefix="CON"
        )
        cursor.execute(
            """
            UPDATE farmer_contract_applications
            SET application_status='approved', approved_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            WHERE application_id=%s
            """,
            [application_id],
        )
        cursor.execute(
            """
            INSERT INTO contracts (
                contract_id, contract_code, contract_source, application_id,
                bidding_offer_id, farmer_user_id, supplier_profile_id,
                farm_product_id, contracted_quantity_kg, agreed_price_per_kg,
                contract_start_date, fulfillment_date, fulfillment_method,
                fulfillment_location, fulfillment_status, quantity_fulfilled_kg,
                agreed_terms, farmer_signature_path, farmer_signed_at,
                miller_signature_path, miller_signed_at, contract_status,
                created_at, updated_at
            ) VALUES (
                %s,%s,'posting_application',%s,NULL,%s,%s,%s,%s,%s,
                CURRENT_DATE,%s,%s,%s,'pending',0,%s,%s,%s,%s,
                CASE WHEN %s IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,
                'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
            ) RETURNING *
            """,
            [
                contract_id, contract_code, application_id, farmer_user_id,
                supplier_profile_id, farm_product_id, quantity, agreed_price,
                fulfillment_date, fulfillment_method, fulfillment_location,
                posting_terms, farmer_signature, farmer_signed_at,
                miller_signature, miller_signature,
            ],
        )
        contract = _row_to_dict(cursor)
        fulfilled_after = already_approved + quantity
        if fulfilled_after >= required_quantity or not partial_allowed:
            cursor.execute(
                """
                UPDATE contract_postings
                SET posting_status='closed', updated_at=CURRENT_TIMESTAMP
                WHERE posting_id=%s
                """,
                [posting_id],
            )
            _decline_remaining_applications(cursor, posting_id, application_id)
        return contract

@transaction.atomic
def decline_application(supplier_profile_id, application_id, data):
    application_id = _positive_id(application_id, "Application ID")
    data = data or {}
    reason = _text(data.get("decline_reason"), required=True, field_name="Reason for Decline")
    remarks = _text(data.get("decline_remarks")) or None
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            SELECT fca.farm_product_id, fca.quantity_to_commit_kg, fca.application_status
            FROM farmer_contract_applications fca
            INNER JOIN contract_postings cp ON cp.posting_id=fca.posting_id
            WHERE fca.application_id=%s AND cp.supplier_profile_id=%s
            FOR UPDATE OF fca
            """,
            [application_id, supplier_profile_id],
        )
        row = cursor.fetchone()
        if not row:
            raise ValueError("Application was not found.")
        if row[2] not in {"pending", "under_review"}:
            raise ValueError("This application can no longer be declined.")
        _adjust_reserved_stock(cursor, row[0], -Decimal(str(row[1])))
        cursor.execute(
            """
            UPDATE farmer_contract_applications
            SET application_status='declined', decline_reason=%s,
                decline_remarks=%s, declined_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            WHERE application_id=%s
            RETURNING application_id, application_code, application_status,
                      decline_reason, decline_remarks, declined_at, updated_at
            """,
            [reason, remarks, application_id],
        )
        return _row_to_dict(cursor)

# CURRENT CONTRACT ACTIONS

@transaction.atomic
def sign_contract(supplier_profile_id, contract_id, miller_signature_path):
    contract_id = _positive_id(contract_id, "Contract ID")
    signature = _text(miller_signature_path, required=True, field_name="Miller Electronic Signature")
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            UPDATE contracts
            SET miller_signature_path=%s, miller_signed_at=CURRENT_TIMESTAMP,
                updated_at=CURRENT_TIMESTAMP
            WHERE contract_id=%s AND supplier_profile_id=%s
              AND contract_status IN ('active','void_requested')
              AND miller_signature_path IS NULL
            RETURNING contract_id, contract_code, miller_signature_path,
                      miller_signed_at, contract_status, updated_at
            """,
            [signature, contract_id, supplier_profile_id],
        )
        result = _row_to_dict(cursor)
        if not result:
            raise ValueError("Contract was not found, is closed, or is already signed by the Miller.")
        return result

@transaction.atomic
def mark_contract_completed(supplier_profile_id, contract_id):
    """
    Miller confirmation that the full contracted quantity has been received.

    This is the terminal fulfillment action for the current Miller Contracts
    workflow. Because there is no separate Miller fulfillment-confirmation
    endpoint in this module, Mark as Completed performs both final fulfillment
    confirmation and contract completion atomically.

    Inventory behavior:
    - Only the still-unfulfilled quantity is consumed from Farmer Inventory.
    - The same quantity is removed from reserved/committed stock.
    - Contract quantity is then set fully fulfilled.
    - Contract status becomes completed.

    The row and Inventory product are locked inside one database transaction,
    so a partial failure rolls the entire operation back.
    """
    contract_id = _positive_id(
        contract_id,
        "Contract ID",
    )

    with connection.cursor() as cursor:
        _assert_active_miller(
            cursor,
            supplier_profile_id,
        )

        cursor.execute(
            """
            SELECT
                farm_product_id,
                contracted_quantity_kg,
                quantity_fulfilled_kg,
                fulfillment_status,
                contract_status
            FROM contracts
            WHERE contract_id = %s
              AND supplier_profile_id = %s
            FOR UPDATE
            """,
            [
                contract_id,
                supplier_profile_id,
            ],
        )

        row = cursor.fetchone()

        if not row:
            raise ValueError(
                "Contract was not found."
            )

        (
            farm_product_id,
            contracted,
            fulfilled,
            fulfillment_status,
            status,
        ) = row

        contracted = Decimal(
            str(contracted)
        )

        fulfilled = Decimal(
            str(fulfilled or 0)
        )

        if status != "active":
            raise ValueError(
                "Only active contracts can be marked Completed."
            )

        if fulfilled < 0:
            raise ValueError(
                "Contract fulfilled quantity is invalid."
            )

        if fulfilled > contracted:
            raise ValueError(
                "Contract fulfilled quantity cannot exceed the contracted quantity."
            )

        remaining = (
            contracted
            - fulfilled
        )

        # Mark as Completed acts as the Miller's final receipt confirmation.
        # Only the remaining commitment is consumed so any previously recorded
        # fulfillment is not deducted twice.
        if remaining > 0:
            _consume_reserved_stock(
                cursor,
                farm_product_id,
                remaining,
            )

        cursor.execute(
            """
            UPDATE contracts
            SET
                quantity_fulfilled_kg = contracted_quantity_kg,
                fulfillment_status = 'fulfilled',
                contract_status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE contract_id = %s
              AND supplier_profile_id = %s
              AND contract_status = 'active'
            RETURNING
                contract_id,
                contract_code,
                contract_status,
                fulfillment_status,
                contracted_quantity_kg,
                quantity_fulfilled_kg,
                remaining_quantity_kg,
                updated_at
            """,
            [
                contract_id,
                supplier_profile_id,
            ],
        )

        result = _row_to_dict(
            cursor
        )

        if not result:
            raise ValueError(
                "Contract could not be marked Completed."
            )

        return result

@transaction.atomic
def request_contract_void(supplier_profile_id, contract_id, data):
    contract_id = _positive_id(contract_id, "Contract ID")
    data = data or {}
    reason = _text(data.get("void_reason"), required=True, field_name="Reason for Void Request")
    remarks = _text(data.get("void_remarks")) or None
    with connection.cursor() as cursor:
        _assert_active_miller(cursor, supplier_profile_id)
        cursor.execute(
            """
            UPDATE contracts
            SET contract_status='void_requested', void_requested_by='miller',
                void_reason=%s, void_remarks=%s,
                void_requested_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
            WHERE contract_id=%s AND supplier_profile_id=%s
              AND contract_status='active'
            RETURNING contract_id, contract_code, contract_status,
                      void_requested_by, void_reason, void_remarks,
                      void_requested_at, updated_at
            """,
            [reason, remarks, contract_id, supplier_profile_id],
        )
        result = _row_to_dict(cursor)
        if not result:
            raise ValueError("Contract was not found or is no longer eligible for a void request.")
        return result

# MILLER -> FARMER MESSAGES

def _resolve_miller_message_farmer(
    cursor, *, supplier_profile_id, reference_type, reference_id, requested_farmer_id=None
):
    if reference_type == "application":
        cursor.execute(
            """
            SELECT fca.farmer_user_id
            FROM farmer_contract_applications fca
            INNER JOIN contract_postings cp ON cp.posting_id=fca.posting_id
            WHERE fca.application_id=%s AND cp.supplier_profile_id=%s
            LIMIT 1
            """,
            [reference_id, supplier_profile_id],
        )
    elif reference_type == "bidding":
        cursor.execute(
            """
            SELECT fob.farmer_user_id
            FROM farmer_open_biddings fob
            INNER JOIN farmer_bidding_offers fbo ON fbo.bidding_id=fob.bidding_id
            WHERE fob.bidding_id=%s AND fbo.supplier_profile_id=%s
            LIMIT 1
            """,
            [reference_id, supplier_profile_id],
        )
    elif reference_type == "bidding_offer":
        cursor.execute(
            """
            SELECT fob.farmer_user_id
            FROM farmer_bidding_offers fbo
            INNER JOIN farmer_open_biddings fob ON fob.bidding_id=fbo.bidding_id
            WHERE fbo.offer_id=%s AND fbo.supplier_profile_id=%s
            LIMIT 1
            """,
            [reference_id, supplier_profile_id],
        )
    elif reference_type == "contract":
        cursor.execute(
            """
            SELECT farmer_user_id FROM contracts
            WHERE contract_id=%s AND supplier_profile_id=%s
            LIMIT 1
            """,
            [reference_id, supplier_profile_id],
        )
    elif reference_type == "posting":
        farmer_id = _positive_id(requested_farmer_id, "Farmer")
        cursor.execute(
            """
            SELECT fca.farmer_user_id
            FROM farmer_contract_applications fca
            INNER JOIN contract_postings cp ON cp.posting_id=fca.posting_id
            WHERE cp.posting_id=%s AND cp.supplier_profile_id=%s
              AND fca.farmer_user_id=%s
            LIMIT 1
            """,
            [reference_id, supplier_profile_id, farmer_id],
        )
    else:
        raise ValueError("Invalid message reference type.")
    row = cursor.fetchone()
    if not row:
        raise ValueError("You cannot message a Farmer using this transaction reference.")
    return row[0]

@transaction.atomic
def send_miller_message(miller_user_id, supplier_profile_id, data):
    data = data or {}
    reference_type = _text(
        data.get("reference_type"), required=True, field_name="Message Reference Type"
    ).lower()
    reference_id = _positive_id(data.get("reference_id"), "Message Reference")
    message_text = _text(data.get("message_text"), required=True, field_name="Message")
    if reference_type not in {"posting", "application", "bidding", "bidding_offer", "contract"}:
        raise ValueError("Invalid message reference type.")
    if len(message_text) > 5000:
        raise ValueError("Message cannot exceed 5000 characters.")
    with connection.cursor() as cursor:
        actor = _assert_active_miller(cursor, supplier_profile_id, miller_user_id)
        farmer_user_id = _resolve_miller_message_farmer(
            cursor,
            supplier_profile_id=supplier_profile_id,
            reference_type=reference_type,
            reference_id=reference_id,
            requested_farmer_id=data.get("farmer_user_id"),
        )
        moderation = moderate_and_report_chat_message(
            message_text=message_text,
            sender_actor_type="user",
            sender_actor_id=actor["user_id"],
            reported_by_user_id=farmer_user_id,
            reference_type=reference_type,
            reference_id=reference_id,
            cursor=cursor,
        )
        if not moderation.get("allowed"):
            return {
                "success": False,
                "blocked": True,
                "code": "PROFANITY_DETECTED",
                "message": (
                    "Your message contains language that is not allowed under "
                    "GrainRise communication guidelines."
                ),
            }

        cursor.execute(
            """
            INSERT INTO farmer_miller_message (
                farmer_user_id, supplier_profile_id, reference_type,
                reference_id, sender_type, message_text,
                is_read, read_at, created_at
            ) VALUES (%s,%s,%s,%s,'miller',%s,FALSE,NULL,CURRENT_TIMESTAMP)
            RETURNING message_id, farmer_user_id, supplier_profile_id,
                      reference_type, reference_id, sender_type,
                      message_text, is_read, read_at, created_at
            """,
            [farmer_user_id, supplier_profile_id, reference_type, reference_id, message_text],
        )
        return {
            "success": True,
            "blocked": False,
            "code": "MESSAGE_SENT",
            "message": _row_to_dict(cursor),
        }
