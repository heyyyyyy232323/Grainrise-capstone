from datetime import datetime

from django.db import connection


# ============================================================
# HELPERS
# ============================================================

def _rows_to_dicts(cursor):
    columns = [
        column[0]
        for column in cursor.description
    ]

    return [
        dict(zip(columns, row))
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

    return dict(zip(columns, row))


def _normalize_id(value, label):
    try:
        value = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Invalid {label}."
        ) from exc

    if value <= 0:
        raise ValueError(
            f"Invalid {label}."
        )

    return value


def _normalize_text(value):
    return str(value or "").strip()


# ============================================================
# APPLICATIONS
# ============================================================

def list_farmer_applications(
    farmer_user_id,
    search="",
    application_status="",
    year="",
    month="",
    sort_by="newest",
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    conditions = [
        "a.farmer_user_id = %s",
        """
        a.application_status IN (
            'pending',
            'under_review',
            'declined',
            'cancelled'
        )
        """,
    ]

    params = [farmer_id]

    search = _normalize_text(search)

    if search:
        conditions.append(
            """
            (
                a.application_code ILIKE %s
                OR p.posting_code ILIKE %s
                OR p.rice_variety ILIKE %s
                OR sp.business_name ILIKE %s
                OR sp.organization_name ILIKE %s
                OR u.first_name ILIKE %s
                OR u.last_name ILIKE %s
            )
            """
        )

        keyword = f"%{search}%"

        params.extend(
            [keyword] * 7
        )

    application_status = _normalize_text(
        application_status
    ).lower()

    if application_status:
        valid_statuses = {
            "pending",
            "under_review",
            "declined",
            "cancelled",
        }

        if application_status not in valid_statuses:
            raise ValueError(
                "Invalid application status."
            )

        conditions.append(
            "a.application_status = %s"
        )
        params.append(application_status)

    if year:
        year = _normalize_id(
            year,
            "year",
        )

        conditions.append(
            "EXTRACT(YEAR FROM a.created_at) = %s"
        )
        params.append(year)

    if month:
        month = _normalize_id(
            month,
            "month",
        )

        if month > 12:
            raise ValueError(
                "Invalid month."
            )

        conditions.append(
            "EXTRACT(MONTH FROM a.created_at) = %s"
        )
        params.append(month)

    order_by = (
        "a.created_at ASC, a.application_id ASC"
        if sort_by == "oldest"
        else
        "a.created_at DESC, a.application_id DESC"
    )

    query = f"""
        SELECT
            a.application_id,
            a.application_code,

            p.posting_id,
            p.posting_code,

            CONCAT_WS(
                ' ',
                u.first_name,
                NULLIF(u.middle_initial, ''),
                u.last_name,
                NULLIF(u.suffix, '')
            ) AS miller_name,

            sp.business_name,
            sp.organization_name,

            p.rice_variety,

            a.quantity_to_commit_kg,

            a.application_status,

            a.created_at AS application_date

        FROM farmer_contract_applications a

        INNER JOIN contract_postings p
            ON p.posting_id = a.posting_id

        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id =
               p.supplier_profile_id

        INNER JOIN users u
            ON u.user_id = sp.user_id

        WHERE
            {" AND ".join(conditions)}

        ORDER BY
            {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(
            query,
            params,
        )

        return _rows_to_dicts(cursor)


# ============================================================
# APPLICATION DETAILS
# ============================================================

def get_farmer_application_details(
    farmer_user_id,
    application_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    application_id = _normalize_id(
        application_id,
        "application ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                a.application_id,
                a.application_code,
                a.application_status,
                a.created_at
                    AS application_date,

                a.quantity_to_commit_kg,
                a.expected_availability_date,
                a.proposed_selling_price_per_kg,
                a.additional_notes_to_miller,

                a.farmer_signature_path,
                a.farmer_signed_at,

                a.cancellation_reason,
                a.cancellation_remarks,
                a.cancelled_at,

                a.decline_reason,
                a.decline_remarks,
                a.declined_at,

                p.posting_id,
                p.posting_code,

                p.product_type
                    AS required_product_type,

                p.rice_variety
                    AS required_rice_variety,

                p.required_quantity_kg,
                p.buying_price_per_kg,
                p.required_fulfillment_date,

                p.partial_quantity_allowed,
                p.price_negotiation_allowed,

                p.fulfillment_method,

                p.proposed_deal_terms,
                p.additional_notes_to_farmers,

                sp.supplier_profile_id,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,

                sp.street_address
                    AS business_street_address,

                sp.barangay
                    AS business_barangay,

                sp.municipality
                    AS business_municipality,

                sp.province
                    AS business_province,

                sp.postal_code
                    AS business_postal_code,

                fp.farm_product_id,
                fp.product_code,
                fp.product_type,
                fp.rice_variety,
                fp.product_image,
                fp.description
                    AS product_description,
                fp.product_grade,

                fp.available_quantity_kg,

                ff.farm_id,
                ff.farm_name,

                ff.street_address
                    AS farm_street_address,

                ff.barangay
                    AS farm_barangay,

                ff.municipality
                    AS farm_municipality,

                ff.province
                    AS farm_province,

                ff.postal_code
                    AS farm_postal_code

            FROM farmer_contract_applications a

            INNER JOIN contract_postings p
                ON p.posting_id = a.posting_id

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   p.supplier_profile_id

            INNER JOIN users u
                ON u.user_id = sp.user_id

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   a.farm_product_id

            LEFT JOIN farmer_farms ff
                ON ff.farm_id =
                   fp.source_farm_id

            WHERE
                a.application_id = %s
                AND a.farmer_user_id = %s

            LIMIT 1
            """,
            [
                application_id,
                farmer_id,
            ],
        )

        return _row_to_dict(cursor)


# ============================================================
# FARMER OPEN BIDDINGS / OFFERS
# ============================================================

def list_farmer_biddings(
    farmer_user_id,
    search="",
    bidding_status="",
    year="",
    month="",
    sort_by="newest",
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    conditions = [
        "b.farmer_user_id = %s",
    ]

    params = [farmer_id]

    search = _normalize_text(search)

    if search:
        keyword = f"%{search}%"

        conditions.append(
            """
            (
                b.bidding_code ILIKE %s
                OR fp.product_code ILIKE %s
                OR fp.rice_variety ILIKE %s
                OR fp.description ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 4
        )

    bidding_status = _normalize_text(
        bidding_status
    ).lower()

    if bidding_status:
        valid_statuses = {
            "open",
            "awarded",
            "closed",
            "cancelled",
            "expired",
        }

        if bidding_status not in valid_statuses:
            raise ValueError(
                "Invalid bidding status."
            )

        conditions.append(
            "b.bidding_status = %s"
        )
        params.append(bidding_status)

    if year:
        conditions.append(
            "EXTRACT(YEAR FROM b.created_at) = %s"
        )
        params.append(
            _normalize_id(
                year,
                "year",
            )
        )

    if month:
        month = _normalize_id(
            month,
            "month",
        )

        if month > 12:
            raise ValueError(
                "Invalid month."
            )

        conditions.append(
            "EXTRACT(MONTH FROM b.created_at) = %s"
        )
        params.append(month)

    order_by = (
        "b.created_at ASC, b.bidding_id ASC"
        if sort_by == "oldest"
        else
        "b.created_at DESC, b.bidding_id DESC"
    )

    query = f"""
        SELECT
            b.bidding_id,
            b.bidding_code,

            fp.product_type,
            fp.rice_variety,
            fp.product_image,

            fp.available_quantity_kg,

            b.quantity_open_for_bidding_kg,

            b.created_at
                AS bidding_start_date,

            b.bidding_deadline,

            b.bidding_status,

            COUNT(o.offer_id)
                AS offers_received

        FROM farmer_open_biddings b

        INNER JOIN farm_products fp
            ON fp.farm_product_id =
               b.farm_product_id

        LEFT JOIN farmer_bidding_offers o
            ON o.bidding_id =
               b.bidding_id

        WHERE
            {" AND ".join(conditions)}

        GROUP BY
            b.bidding_id,
            fp.farm_product_id

        ORDER BY
            {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(
            query,
            params,
        )

        return _rows_to_dicts(cursor)


# ============================================================
# BIDDING DETAILS + RECEIVED OFFERS
# ============================================================

def get_farmer_bidding_details(
    farmer_user_id,
    bidding_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    bidding_id = _normalize_id(
        bidding_id,
        "bidding ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                b.bidding_id,
                b.bidding_code,
                b.bidding_status,

                b.created_at
                    AS bidding_start_date,

                b.bidding_deadline,

                b.quantity_open_for_bidding_kg,
                b.minimum_acceptable_price_per_kg,
                b.expected_availability_date,
                b.fulfillment_method,
                b.preferred_fulfillment_date,
                b.additional_terms,
                b.notes_to_millers,

                fp.farm_product_id,
                fp.product_code,
                fp.product_type,
                fp.rice_variety,
                fp.product_image,
                fp.description
                    AS product_description,
                fp.product_grade,
                fp.available_quantity_kg,

                ff.farm_id,
                ff.farm_name,
                ff.street_address,
                ff.barangay,
                ff.municipality,
                ff.province,
                ff.postal_code,

                (
                    SELECT COUNT(*)
                    FROM farmer_bidding_offers o
                    WHERE o.bidding_id = b.bidding_id
                ) AS offers_received

            FROM farmer_open_biddings b

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   b.farm_product_id

            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                   b.farm_id

            WHERE
                b.bidding_id = %s
                AND b.farmer_user_id = %s

            LIMIT 1
            """,
            [
                bidding_id,
                farmer_id,
            ],
        )

        bidding = _row_to_dict(cursor)

        if bidding is None:
            return None

        cursor.execute(
            """
            SELECT
                o.offer_id,
                o.offer_code,
                o.offered_buying_price_per_kg,
                o.offered_quantity_kg,
                o.estimated_offer_value,
                o.proposed_fulfillment_date,
                o.offer_status,
                o.created_at AS offer_date,

                sp.supplier_profile_id,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name

            FROM farmer_bidding_offers o

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   o.supplier_profile_id

            INNER JOIN users u
                ON u.user_id = sp.user_id

            WHERE
                o.bidding_id = %s

            ORDER BY
                o.created_at DESC,
                o.offer_id DESC
            """,
            [bidding_id],
        )

        offers = _rows_to_dicts(cursor)

    return {
        "bidding": bidding,
        "offers": offers,
    }


# ============================================================
# OFFER DETAILS
# ============================================================

def get_farmer_offer_details(
    farmer_user_id,
    offer_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    offer_id = _normalize_id(
        offer_id,
        "offer ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                o.offer_id,
                o.offer_code,
                o.offer_status,
                o.created_at AS offer_date,

                o.offered_buying_price_per_kg,
                o.offered_quantity_kg,
                o.estimated_offer_value,
                o.proposed_fulfillment_date,
                o.fulfillment_method,
                o.proposed_terms,
                o.additional_notes_to_farmer,

                sp.supplier_profile_id,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,
                sp.street_address
                    AS business_street_address,
                sp.barangay
                    AS business_barangay,
                sp.municipality
                    AS business_municipality,
                sp.province
                    AS business_province,
                sp.postal_code
                    AS business_postal_code,

                b.bidding_id,
                b.bidding_code,
                b.quantity_open_for_bidding_kg,
                b.minimum_acceptable_price_per_kg,
                b.bidding_deadline,
                b.bidding_status,

                fp.product_image,
                fp.product_type,
                fp.rice_variety,
                fp.product_grade

            FROM farmer_bidding_offers o

            INNER JOIN farmer_open_biddings b
                ON b.bidding_id =
                   o.bidding_id

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   o.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                   sp.user_id

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   b.farm_product_id

            WHERE
                o.offer_id = %s
                AND b.farmer_user_id = %s

            LIMIT 1
            """,
            [
                offer_id,
                farmer_id,
            ],
        )

        return _row_to_dict(cursor)


# ============================================================
# OPPORTUNITIES
# ============================================================

def list_farmer_opportunities(
    farmer_user_id,
    search="",
    product_type="",
    rice_variety="",
    location="",
    sort_by="newest",
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    conditions = [
        "p.posting_status = 'open'",
        "p.application_deadline >= CURRENT_DATE",
    ]

    params = []

    search = _normalize_text(search)

    if search:
        keyword = f"%{search}%"

        conditions.append(
            """
            (
                p.posting_code ILIKE %s
                OR p.product_type ILIKE %s
                OR p.rice_variety ILIKE %s
                OR p.product_description ILIKE %s
                OR sp.business_name ILIKE %s
                OR sp.organization_name ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 6
        )

    product_type = _normalize_text(
        product_type
    ).lower()

    if product_type:
        conditions.append(
            "p.product_type = %s"
        )
        params.append(product_type)

    rice_variety = _normalize_text(
        rice_variety
    )

    if rice_variety:
        conditions.append(
            "p.rice_variety = %s"
        )
        params.append(rice_variety)

    location = _normalize_text(location)

    if location:
        keyword = f"%{location}%"

        conditions.append(
            """
            (
                sp.province ILIKE %s
                OR sp.municipality ILIKE %s
                OR sp.barangay ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 3
        )

    order_map = {
        "newest": (
            "p.created_at DESC, "
            "p.posting_id DESC"
        ),
        "oldest": (
            "p.created_at ASC, "
            "p.posting_id ASC"
        ),
        "highest_price": (
            "p.buying_price_per_kg DESC, "
            "p.created_at DESC"
        ),
        "lowest_price": (
            "p.buying_price_per_kg ASC, "
            "p.created_at DESC"
        ),
    }

    order_by = order_map.get(
        sort_by,
        order_map["newest"],
    )

    query = f"""
        SELECT
            p.posting_id,
            p.posting_code
                AS opportunity_code,

            sp.supplier_profile_id,

            CONCAT_WS(
                ' ',
                u.first_name,
                NULLIF(u.middle_initial, ''),
                u.last_name,
                NULLIF(u.suffix, '')
            ) AS miller_name,

            sp.business_name,
            sp.organization_name,

            p.product_type,
            p.rice_variety,
            p.product_image,
            p.product_description,

            p.required_quantity_kg,
            p.buying_price_per_kg,
            p.required_fulfillment_date,

            sp.municipality
                AS miller_municipality,

            sp.province
                AS miller_province,

            p.application_deadline,

            EXISTS (
                SELECT 1

                FROM farmer_contract_applications a

                WHERE
                    a.posting_id = p.posting_id
                    AND a.farmer_user_id = %s
                    AND a.application_status IN (
                        'pending',
                        'under_review',
                        'approved'
                    )
            ) AS has_active_application

        FROM contract_postings p

        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id =
               p.supplier_profile_id

        INNER JOIN users u
            ON u.user_id =
               sp.user_id

        WHERE
            {" AND ".join(conditions)}

        ORDER BY
            {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(
            query,
            [farmer_id, *params],
        )

        return _rows_to_dicts(cursor)


# ============================================================
# OPPORTUNITY DETAILS
# ============================================================

def get_farmer_opportunity_details(
    farmer_user_id,
    posting_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    posting_id = _normalize_id(
        posting_id,
        "opportunity ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                p.posting_id,
                p.posting_code
                    AS opportunity_code,

                p.posting_status
                    AS opportunity_status,

                p.created_at
                    AS posted_date,

                p.application_deadline,

                sp.supplier_profile_id,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,

                sp.street_address
                    AS business_street_address,
                sp.barangay
                    AS business_barangay,
                sp.municipality
                    AS business_municipality,
                sp.province
                    AS business_province,
                sp.postal_code
                    AS business_postal_code,

                p.product_type,
                p.rice_variety,
                p.product_image,
                p.product_description,
                p.product_grade,

                p.required_quantity_kg,
                p.buying_price_per_kg,
                p.required_fulfillment_date,
                p.fulfillment_method,

                p.partial_quantity_allowed,
                p.price_negotiation_allowed,

                p.proposed_deal_terms,
                p.additional_notes_to_farmers,

                p.fulfillment_street_address,
                p.fulfillment_barangay,
                p.fulfillment_municipality,
                p.fulfillment_province,
                p.fulfillment_postal_code,

                EXISTS (
                    SELECT 1

                    FROM farmer_contract_applications a

                    WHERE
                        a.posting_id = p.posting_id
                        AND a.farmer_user_id = %s
                        AND a.application_status IN (
                            'pending',
                            'under_review',
                            'approved'
                        )
                ) AS has_active_application

            FROM contract_postings p

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   p.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                   sp.user_id

            WHERE
                p.posting_id = %s

            LIMIT 1
            """,
            [
                farmer_id,
                posting_id,
            ],
        )

        return _row_to_dict(cursor)


# ============================================================
# CURRENT CONTRACTS
# ============================================================

def list_farmer_contracts(
    farmer_user_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                c.contract_id,
                c.contract_code,
                c.contract_source,
                c.contract_status,

                sp.supplier_profile_id,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name,

                fp.product_type,
                fp.rice_variety,
                fp.product_image,

                c.contracted_quantity_kg,
                c.agreed_price_per_kg,
                c.total_contract_value,

                c.fulfillment_date,

                c.created_at

            FROM contracts c

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   c.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                   sp.user_id

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   c.farm_product_id

            WHERE
                c.farmer_user_id = %s

            ORDER BY
                c.created_at DESC,
                c.contract_id DESC
            """,
            [farmer_id],
        )

        return _rows_to_dicts(cursor)


# ============================================================
# CURRENT CONTRACT DETAILS
# ============================================================

def get_farmer_contract_details(
    farmer_user_id,
    contract_id,
):
    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    contract_id = _normalize_id(
        contract_id,
        "contract ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                c.*,

                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(u.middle_initial, ''),
                    u.last_name,
                    NULLIF(u.suffix, '')
                ) AS miller_name,

                sp.business_name,
                sp.organization_name,
                sp.official_email,
                sp.official_contact_number,

                sp.street_address
                    AS business_street_address,

                sp.barangay
                    AS business_barangay,

                sp.municipality
                    AS business_municipality,

                sp.province
                    AS business_province,

                sp.postal_code
                    AS business_postal_code,

                fp.product_code,
                fp.product_image,
                fp.product_type,
                fp.rice_variety,
                fp.description
                    AS product_description,
                fp.product_grade,

                ff.farm_id,
                ff.farm_name

            FROM contracts c

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   c.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                   sp.user_id

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   c.farm_product_id

            LEFT JOIN farmer_farms ff
                ON ff.farm_id =
                   fp.source_farm_id

            WHERE
                c.contract_id = %s
                AND c.farmer_user_id = %s

            LIMIT 1
            """,
            [
                contract_id,
                farmer_id,
            ],
        )

        return _row_to_dict(cursor)


# ============================================================
# FARMER MESSAGE THREADS
# ============================================================

def list_farmer_message_threads(
    farmer_user_id,
):
    """
    Return one latest-message record per Farmer/Miller
    contract-related conversation.

    Conversation identity:

        farmer_user_id
        supplier_profile_id
        reference_type
        reference_id

    No separate conversation table is required.
    """

    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT ON (
                fmm.supplier_profile_id,
                fmm.reference_type,
                fmm.reference_id
            )

                fmm.message_id,

                fmm.farmer_user_id,

                fmm.supplier_profile_id,

                sp.user_id
                    AS miller_user_id,

                sp.business_name
                    AS miller_business_name,

                sp.organization_name
                    AS miller_organization_name,

                u.first_name
                    AS miller_first_name,

                u.middle_initial
                    AS miller_middle_initial,

                u.last_name
                    AS miller_last_name,

                u.suffix
                    AS miller_suffix,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            u.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                u.middle_initial,
                                ''
                            )
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            u.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                u.suffix,
                                ''
                            )
                        ),
                        ''
                    )
                )
                AS miller_name,

                fmm.reference_type,
                fmm.reference_id,

                CASE

                    WHEN
                        fmm.reference_type =
                        'posting'
                    THEN
                        cp.posting_code

                    WHEN
                        fmm.reference_type =
                        'application'
                    THEN
                        fca.application_code

                    WHEN
                        fmm.reference_type =
                        'bidding'
                    THEN
                        fob.bidding_code

                    WHEN
                        fmm.reference_type =
                        'bidding_offer'
                    THEN
                        fbo.offer_code

                    WHEN
                        fmm.reference_type =
                        'contract'
                    THEN
                        c.contract_code

                    ELSE
                        NULL

                END
                AS reference_code,

                fmm.sender_type,

                fmm.message_text
                    AS latest_message,

                fmm.is_read,

                fmm.created_at
                    AS latest_message_at,

                COUNT(*) FILTER (
                    WHERE
                        fmm.sender_type =
                            'miller'

                        AND fmm.is_read =
                            FALSE
                )
                OVER (
                    PARTITION BY
                        fmm.supplier_profile_id,
                        fmm.reference_type,
                        fmm.reference_id
                )
                AS unread_count

            FROM farmer_miller_message fmm

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                    fmm.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                    sp.user_id

            LEFT JOIN contract_postings cp
                ON fmm.reference_type =
                    'posting'

                AND cp.posting_id =
                    fmm.reference_id

            LEFT JOIN farmer_contract_applications fca
                ON fmm.reference_type =
                    'application'

                AND fca.application_id =
                    fmm.reference_id

            LEFT JOIN farmer_open_biddings fob
                ON fmm.reference_type =
                    'bidding'

                AND fob.bidding_id =
                    fmm.reference_id

            LEFT JOIN farmer_bidding_offers fbo
                ON fmm.reference_type =
                    'bidding_offer'

                AND fbo.offer_id =
                    fmm.reference_id

            LEFT JOIN contracts c
                ON fmm.reference_type =
                    'contract'

                AND c.contract_id =
                    fmm.reference_id

            WHERE
                fmm.farmer_user_id =
                    %s

            ORDER BY
                fmm.supplier_profile_id,
                fmm.reference_type,
                fmm.reference_id,
                fmm.created_at DESC,
                fmm.message_id DESC
            """,
            [
                farmer_id,
            ],
        )


        rows = cursor.fetchall()


        columns = [
            column[0]
            for column
            in cursor.description
        ]


        items = [
            dict(
                zip(
                    columns,
                    row,
                )
            )

            for row in rows
        ]


    # DISTINCT ON needs its conversation columns first
    # in SQL ORDER BY.
    #
    # Re-sort after retrieval so the Messages sidebar
    # shows the conversation with the newest activity first.

    items.sort(
        key=lambda item: (
            item.get(
                "latest_message_at"
            )
            or datetime.min
        ),
        reverse=True,
    )


    return items


# ============================================================
# FARMER MESSAGE CONVERSATION
# ============================================================

def list_farmer_messages(
    farmer_user_id,
    supplier_profile_id,
    reference_type,
    reference_id,
):
    """
    Load the complete Farmer/Miller message history
    for one specific contract-related conversation.

    Conversation identity:

        Farmer
        + Miller supplier_profile_id
        + reference_type
        + reference_id
    """

    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )


    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )


    normalized_reference_id = (
        _normalize_id(
            reference_id,
            "message reference ID",
        )
    )


    normalized_reference_type = (
        _normalize_text(
            reference_type
        )
        .lower()
    )


    valid_reference_types = {
        "posting",
        "application",
        "bidding",
        "bidding_offer",
        "contract",
    }


    if (
        normalized_reference_type
        not in valid_reference_types
    ):
        raise ValueError(
            "Invalid message reference type."
        )


    with connection.cursor() as cursor:

        # ====================================================
        # VERIFY CONVERSATION EXISTS
        # ====================================================

        cursor.execute(
            """
            SELECT 1

            FROM farmer_miller_message

            WHERE
                farmer_user_id =
                    %s

                AND supplier_profile_id =
                    %s

                AND reference_type =
                    %s

                AND reference_id =
                    %s

            LIMIT 1
            """,
            [
                farmer_id,
                supplier_id,
                normalized_reference_type,
                normalized_reference_id,
            ],
        )


        if not cursor.fetchone():
            return []


        # ====================================================
        # LOAD COMPLETE CONVERSATION
        # ====================================================

        cursor.execute(
            """
            SELECT
                fmm.message_id,

                fmm.farmer_user_id,

                fmm.supplier_profile_id,

                sp.user_id
                    AS miller_user_id,

                sp.business_name
                    AS miller_business_name,

                sp.organization_name
                    AS miller_organization_name,

                CONCAT_WS(
                    ' ',
                    NULLIF(
                        TRIM(
                            u.first_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                u.middle_initial,
                                ''
                            )
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            u.last_name
                        ),
                        ''
                    ),
                    NULLIF(
                        TRIM(
                            COALESCE(
                                u.suffix,
                                ''
                            )
                        ),
                        ''
                    )
                )
                AS miller_name,

                fmm.reference_type,
                fmm.reference_id,

                CASE

                    WHEN
                        fmm.reference_type =
                        'posting'
                    THEN
                        cp.posting_code

                    WHEN
                        fmm.reference_type =
                        'application'
                    THEN
                        fca.application_code

                    WHEN
                        fmm.reference_type =
                        'bidding'
                    THEN
                        fob.bidding_code

                    WHEN
                        fmm.reference_type =
                        'bidding_offer'
                    THEN
                        fbo.offer_code

                    WHEN
                        fmm.reference_type =
                        'contract'
                    THEN
                        c.contract_code

                    ELSE
                        NULL

                END
                AS reference_code,

                fmm.sender_type,

                fmm.message_text,

                fmm.is_read,

                fmm.read_at,

                fmm.created_at

            FROM farmer_miller_message fmm

            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                    fmm.supplier_profile_id

            INNER JOIN users u
                ON u.user_id =
                    sp.user_id

            LEFT JOIN contract_postings cp
                ON fmm.reference_type =
                    'posting'

                AND cp.posting_id =
                    fmm.reference_id

            LEFT JOIN farmer_contract_applications fca
                ON fmm.reference_type =
                    'application'

                AND fca.application_id =
                    fmm.reference_id

            LEFT JOIN farmer_open_biddings fob
                ON fmm.reference_type =
                    'bidding'

                AND fob.bidding_id =
                    fmm.reference_id

            LEFT JOIN farmer_bidding_offers fbo
                ON fmm.reference_type =
                    'bidding_offer'

                AND fbo.offer_id =
                    fmm.reference_id

            LEFT JOIN contracts c
                ON fmm.reference_type =
                    'contract'

                AND c.contract_id =
                    fmm.reference_id

            WHERE
                fmm.farmer_user_id =
                    %s

                AND fmm.supplier_profile_id =
                    %s

                AND fmm.reference_type =
                    %s

                AND fmm.reference_id =
                    %s

            ORDER BY
                fmm.created_at ASC,
                fmm.message_id ASC
            """,
            [
                farmer_id,
                supplier_id,
                normalized_reference_type,
                normalized_reference_id,
            ],
        )


        return _rows_to_dicts(
            cursor
        )