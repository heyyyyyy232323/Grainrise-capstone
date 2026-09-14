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


def _normalize_id(
    value,
    label,
):
    try:
        value = int(value)

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            f"Invalid {label}."
        ) from exc

    if value <= 0:
        raise ValueError(
            f"Invalid {label}."
        )

    return value


def _normalize_text(value):
    return str(
        value or ""
    ).strip()


def _normalize_choice(
    value,
    valid_values,
    label,
):
    value = _normalize_text(
        value
    ).lower()

    if (
        value
        and value not in valid_values
    ):
        raise ValueError(
            f"Invalid {label}."
        )

    return value


def _normalize_month(value):
    if not value:
        return None

    month = _normalize_id(
        value,
        "month",
    )

    if month > 12:
        raise ValueError(
            "Invalid month."
        )

    return month


# ============================================================
# AUTHENTICATED MILLER BUSINESS ADDRESS
# ============================================================

def get_miller_business_address(
    supplier_profile_id,
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                supplier_profile_id,
                user_id,

                business_name,
                organization_name,

                province,
                municipality,
                postal_code,
                barangay,
                street_address,

                official_email,
                official_contact_number

            FROM supplier_profiles

            WHERE
                supplier_profile_id = %s

            LIMIT 1
            """,
            [
                supplier_id,
            ],
        )

        return _row_to_dict(
            cursor
        )


# ============================================================
# BIDDING OFFERS
# ============================================================

def list_miller_biddings(
    supplier_profile_id,
    search="",
    product_type="",
    rice_variety="",
    farmer_location="",
    bidding_status="",
    bidding_deadline="",
    sort_by="newest",
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    conditions = [
        """
        (
            (
                b.bidding_status = 'open'
                AND b.bidding_deadline > CURRENT_TIMESTAMP
            )
            OR own_offer.offer_id IS NOT NULL
        )
        """
    ]

    params = []


    search = _normalize_text(
        search
    )

    if search:
        keyword = f"%{search}%"

        conditions.append(
            """
            (
                b.bidding_code ILIKE %s
                OR fp.product_code ILIKE %s
                OR fp.rice_variety ILIKE %s
                OR fp.description ILIKE %s
                OR ff.farm_name ILIKE %s
                OR fu.first_name ILIKE %s
                OR fu.last_name ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 7
        )


    product_type = _normalize_choice(
        product_type,
        {
            "unmilled_palay",
            "milled_rice",
        },
        "product type",
    )

    if product_type:
        conditions.append(
            "fp.product_type = %s"
        )

        params.append(
            product_type
        )


    rice_variety = _normalize_text(
        rice_variety
    )

    if rice_variety:
        conditions.append(
            "fp.rice_variety ILIKE %s"
        )

        params.append(
            f"%{rice_variety}%"
        )


    farmer_location = _normalize_text(
        farmer_location
    )

    if farmer_location:
        keyword = (
            f"%{farmer_location}%"
        )

        conditions.append(
            """
            (
                ff.province ILIKE %s
                OR ff.municipality ILIKE %s
                OR ff.barangay ILIKE %s
                OR ff.street_address ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 4
        )


    bidding_status = _normalize_choice(
        bidding_status,
        {
            "open",
            "awarded",
            "closed",
            "cancelled",
            "expired",
        },
        "bidding status",
    )

    if bidding_status:
        conditions.append(
            "b.bidding_status = %s"
        )

        params.append(
            bidding_status
        )


    bidding_deadline = _normalize_text(
        bidding_deadline
    )

    if bidding_deadline:
        conditions.append(
            "b.bidding_deadline::date = %s::date"
        )

        params.append(
            bidding_deadline
        )


    order_map = {
        "oldest":
            "b.created_at ASC, b.bidding_id ASC",

        "quantity_high":
            """
            b.quantity_open_for_bidding_kg DESC,
            b.created_at DESC
            """,

        "quantity_low":
            """
            b.quantity_open_for_bidding_kg ASC,
            b.created_at DESC
            """,

        "deadline":
            """
            b.bidding_deadline ASC,
            b.bidding_id ASC
            """,

        "newest":
            """
            b.created_at DESC,
            b.bidding_id DESC
            """,
    }

    order_by = order_map.get(
        sort_by,
        order_map["newest"],
    )

    params = [
        supplier_id,
    ] + params


    query = f"""
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

            b.preferred_fulfillment_date,

            b.fulfillment_method,


            fu.user_id
                AS farmer_user_id,

            CONCAT_WS(
                ' ',
                fu.first_name,
                NULLIF(
                    fu.middle_initial,
                    ''
                ),
                fu.last_name,
                NULLIF(
                    fu.suffix,
                    ''
                )
            )
                AS farmer_name,


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
                AS farm_postal_code,


            fp.farm_product_id,

            fp.product_code,

            fp.product_image,

            fp.product_type,

            fp.rice_variety,

            fp.product_grade,

            fp.description
                AS product_description,

            fp.available_quantity_kg,


            own_offer.offer_id
                AS own_offer_id,

            own_offer.offer_code
                AS own_offer_code,

            own_offer.offer_status
                AS own_offer_status,

            own_offer.offered_buying_price_per_kg
                AS own_offered_price_per_kg,

            own_offer.offered_quantity_kg
                AS own_offered_quantity_kg


        FROM farmer_open_biddings b


        INNER JOIN users fu
            ON fu.user_id =
                b.farmer_user_id


        INNER JOIN farmer_farms ff
            ON ff.farm_id =
                b.farm_id


        INNER JOIN farm_products fp
            ON fp.farm_product_id =
                b.farm_product_id


        LEFT JOIN farmer_bidding_offers own_offer

            ON own_offer.bidding_id =
                b.bidding_id

            AND own_offer.supplier_profile_id = %s


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

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# BIDDING DETAILS
# ============================================================

def get_miller_bidding_details(
    supplier_profile_id,
    bidding_id,
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
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


                fu.user_id
                    AS farmer_user_id,

                CONCAT_WS(
                    ' ',
                    fu.first_name,
                    NULLIF(
                        fu.middle_initial,
                        ''
                    ),
                    fu.last_name,
                    NULLIF(
                        fu.suffix,
                        ''
                    )
                )
                    AS farmer_name,

                fu.email
                    AS farmer_email,

                fu.contact_number
                    AS farmer_contact_number,


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
                    AS farm_postal_code,


                fp.farm_product_id,

                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,

                fp.description
                    AS product_description,

                fp.available_quantity_kg,


                own_offer.offer_id
                    AS own_offer_id,

                own_offer.offer_code
                    AS own_offer_code,

                own_offer.offer_status
                    AS own_offer_status,

                own_offer.offered_buying_price_per_kg,

                own_offer.offered_quantity_kg,

                own_offer.estimated_offer_value,

                own_offer.proposed_fulfillment_date,

                own_offer.fulfillment_method
                    AS own_offer_fulfillment_method,

                own_offer.proposed_terms,

                own_offer.additional_notes_to_farmer,

                own_offer.miller_signature_path,

                own_offer.miller_signed_at,

                own_offer.created_at
                    AS own_offer_date


            FROM farmer_open_biddings b


            INNER JOIN users fu
                ON fu.user_id =
                    b.farmer_user_id


            INNER JOIN farmer_farms ff
                ON ff.farm_id =
                    b.farm_id


            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                    b.farm_product_id


            LEFT JOIN farmer_bidding_offers own_offer

                ON own_offer.bidding_id =
                    b.bidding_id

                AND own_offer.supplier_profile_id = %s


            WHERE
                b.bidding_id = %s

                AND (
                    (
                        b.bidding_status = 'open'
                        AND b.bidding_deadline > CURRENT_TIMESTAMP
                    )
                    OR own_offer.offer_id IS NOT NULL
                )


            LIMIT 1
            """,
            [
                supplier_id,
                bidding_id,
            ],
        )


        bidding = _row_to_dict(
            cursor
        )


        if bidding is None:
            return None


        cursor.execute(
            """
            SELECT
                o.offer_id,

                sp.business_name,

                sp.organization_name,

                sp.municipality
                    AS business_municipality,

                sp.province
                    AS business_province,

                o.offered_buying_price_per_kg,

                (
                    o.supplier_profile_id = %s
                )
                    AS is_own_offer


            FROM farmer_bidding_offers o


            INNER JOIN supplier_profiles sp

                ON sp.supplier_profile_id =
                    o.supplier_profile_id


            WHERE
                o.bidding_id = %s

                AND o.offer_status <> 'withdrawn'


            ORDER BY
                o.offered_buying_price_per_kg DESC,
                o.created_at ASC
            """,
            [
                supplier_id,
                bidding_id,
            ],
        )


        competing_offers = _rows_to_dicts(
            cursor
        )


    return {
        "bidding":
            bidding,

        "competing_offers":
            competing_offers,
    }


# ============================================================
# POSTINGS
# ============================================================

def list_miller_postings(
    supplier_profile_id,
    search="",
    posting_status="",
    product_type="",
    rice_variety="",
    year="",
    month="",
    sort_by="newest",
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    conditions = [
        "p.supplier_profile_id = %s"
    ]

    params = [
        supplier_id
    ]


    search = _normalize_text(
        search
    )

    if search:
        keyword = f"%{search}%"

        conditions.append(
            """
            (
                p.posting_code ILIKE %s
                OR p.rice_variety ILIKE %s
                OR p.product_description ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 3
        )


    posting_status = _normalize_choice(
        posting_status,
        {
            "open",
            "closed",
            "cancelled",
            "expired",
        },
        "posting status",
    )

    if posting_status:
        conditions.append(
            "p.posting_status = %s"
        )

        params.append(
            posting_status
        )


    product_type = _normalize_choice(
        product_type,
        {
            "unmilled_palay",
            "milled_rice",
        },
        "product type",
    )

    if product_type:
        conditions.append(
            "p.product_type = %s"
        )

        params.append(
            product_type
        )


    rice_variety = _normalize_text(
        rice_variety
    )

    if rice_variety:
        conditions.append(
            "p.rice_variety ILIKE %s"
        )

        params.append(
            f"%{rice_variety}%"
        )


    if year:
        conditions.append(
            "EXTRACT(YEAR FROM p.created_at) = %s"
        )

        params.append(
            _normalize_id(
                year,
                "year",
            )
        )


    month = _normalize_month(
        month
    )

    if month:
        conditions.append(
            "EXTRACT(MONTH FROM p.created_at) = %s"
        )

        params.append(
            month
        )


    order_map = {
        "oldest":
            """
            p.created_at ASC,
            p.posting_id ASC
            """,

        "fulfillment":
            """
            p.required_fulfillment_date ASC,
            p.posting_id ASC
            """,

        "newest":
            """
            p.created_at DESC,
            p.posting_id DESC
            """,
    }


    order_by = order_map.get(
        sort_by,
        order_map["newest"],
    )


    query = f"""
        SELECT
            p.posting_id,

            p.posting_code,

            p.posting_status,

            p.created_at
                AS posting_date,

            p.application_deadline,

            p.product_type,

            p.rice_variety,

            p.product_image,

            p.product_description,

            p.product_grade,

            p.required_quantity_kg,

            p.buying_price_per_kg,

            p.required_fulfillment_date,

            p.partial_quantity_allowed,

            p.price_negotiation_allowed,

            p.fulfillment_method,

            p.fulfillment_street_address,

            p.fulfillment_barangay,

            p.fulfillment_municipality,

            p.fulfillment_province,

            p.fulfillment_postal_code,

            COUNT(
                a.application_id
            )
                AS applications_received


        FROM contract_postings p


        LEFT JOIN farmer_contract_applications a

            ON a.posting_id =
                p.posting_id


        WHERE
            {" AND ".join(conditions)}


        GROUP BY
            p.posting_id


        ORDER BY
            {order_by}
    """


    with connection.cursor() as cursor:
        cursor.execute(
            query,
            params,
        )

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# POSTING DETAILS
# ============================================================

def get_miller_posting_details(
    supplier_profile_id,
    posting_id,
    search="",
    application_status="",
    farmer_location="",
    sort_by="newest",
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    posting_id = _normalize_id(
        posting_id,
        "posting ID",
    )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT
                p.*,

                COUNT(
                    a.application_id
                )
                    AS applications_received


            FROM contract_postings p


            LEFT JOIN farmer_contract_applications a

                ON a.posting_id =
                    p.posting_id


            WHERE
                p.posting_id = %s

                AND p.supplier_profile_id = %s


            GROUP BY
                p.posting_id


            LIMIT 1
            """,
            [
                posting_id,
                supplier_id,
            ],
        )


        posting = _row_to_dict(
            cursor
        )


        if posting is None:
            return None


        conditions = [
            "a.posting_id = %s",
            "p.supplier_profile_id = %s",
        ]

        params = [
            posting_id,
            supplier_id,
        ]


        search = _normalize_text(
            search
        )

        if search:
            keyword = f"%{search}%"

            conditions.append(
                """
                (
                    a.application_code ILIKE %s
                    OR fu.first_name ILIKE %s
                    OR fu.last_name ILIKE %s
                    OR fp.product_code ILIKE %s
                    OR fp.rice_variety ILIKE %s
                )
                """
            )

            params.extend(
                [keyword] * 5
            )


        application_status = _normalize_choice(
            application_status,
            {
                "pending",
                "under_review",
                "approved",
                "declined",
                "cancelled",
            },
            "application status",
        )


        if application_status:
            conditions.append(
                "a.application_status = %s"
            )

            params.append(
                application_status
            )


        farmer_location = _normalize_text(
            farmer_location
        )


        if farmer_location:
            keyword = (
                f"%{farmer_location}%"
            )

            conditions.append(
                """
                (
                    ff.province ILIKE %s
                    OR ff.municipality ILIKE %s
                    OR ff.barangay ILIKE %s
                    OR ff.street_address ILIKE %s
                )
                """
            )

            params.extend(
                [keyword] * 4
            )


        order_map = {
            "oldest":
                """
                a.created_at ASC,
                a.application_id ASC
                """,

            "quantity_high":
                """
                a.quantity_to_commit_kg DESC,
                a.created_at DESC
                """,

            "quantity_low":
                """
                a.quantity_to_commit_kg ASC,
                a.created_at DESC
                """,

            "newest":
                """
                a.created_at DESC,
                a.application_id DESC
                """,
        }


        order_by = order_map.get(
            sort_by,
            order_map["newest"],
        )


        query = f"""
            SELECT
                a.application_id,

                a.application_code,

                a.application_status,

                a.created_at
                    AS application_date,

                a.quantity_to_commit_kg,

                a.proposed_selling_price_per_kg,

                a.expected_availability_date,


                fu.user_id
                    AS farmer_user_id,

                CONCAT_WS(
                    ' ',
                    fu.first_name,
                    NULLIF(
                        fu.middle_initial,
                        ''
                    ),
                    fu.last_name,
                    NULLIF(
                        fu.suffix,
                        ''
                    )
                )
                    AS farmer_name,


                ff.farm_id,

                ff.farm_name,

                ff.municipality
                    AS farm_municipality,

                ff.province
                    AS farm_province,


                fp.farm_product_id,

                fp.product_code,

                fp.product_type,

                fp.rice_variety,

                fp.product_image,

                fp.product_grade,

                fp.available_quantity_kg


            FROM farmer_contract_applications a


            INNER JOIN contract_postings p

                ON p.posting_id =
                    a.posting_id


            INNER JOIN users fu

                ON fu.user_id =
                    a.farmer_user_id


            INNER JOIN farm_products fp

                ON fp.farm_product_id =
                    a.farm_product_id


            LEFT JOIN farmer_farms ff

                ON ff.farm_id =
                    fp.source_farm_id


            WHERE
                {" AND ".join(conditions)}


            ORDER BY
                {order_by}
        """


        cursor.execute(
            query,
            params,
        )


        applications = _rows_to_dicts(
            cursor
        )


    return {
        "posting":
            posting,

        "applications":
            applications,
    }


# ============================================================
# APPLICATION DETAILS
# ============================================================

def get_miller_application_details(
    supplier_profile_id,
    application_id,
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
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

                a.review_started_at,

                a.decline_reason,

                a.decline_remarks,

                a.declined_at,

                a.approved_at,


                fu.user_id
                    AS farmer_user_id,

                CONCAT_WS(
                    ' ',
                    fu.first_name,
                    NULLIF(
                        fu.middle_initial,
                        ''
                    ),
                    fu.last_name,
                    NULLIF(
                        fu.suffix,
                        ''
                    )
                )
                    AS farmer_name,

                fu.email
                    AS farmer_email,

                fu.contact_number
                    AS farmer_contact_number,


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
                    AS farm_postal_code,


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


                fp.farm_product_id,

                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,

                fp.description
                    AS product_description,

                fp.available_quantity_kg


            FROM farmer_contract_applications a


            INNER JOIN contract_postings p

                ON p.posting_id =
                    a.posting_id


            INNER JOIN users fu

                ON fu.user_id =
                    a.farmer_user_id


            INNER JOIN farm_products fp

                ON fp.farm_product_id =
                    a.farm_product_id


            LEFT JOIN farmer_farms ff

                ON ff.farm_id =
                    fp.source_farm_id


            WHERE
                a.application_id = %s

                AND p.supplier_profile_id = %s


            LIMIT 1
            """,
            [
                application_id,
                supplier_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# CURRENT CONTRACTS
# ============================================================

def list_miller_contracts(
    supplier_profile_id,
    search="",
    contract_status="",
    product_type="",
    rice_variety="",
    year="",
    month="",
    sort_by="newest",
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    conditions = [
        "c.supplier_profile_id = %s"
    ]

    params = [
        supplier_id
    ]


    search = _normalize_text(
        search
    )

    if search:
        keyword = f"%{search}%"

        conditions.append(
            """
            (
                c.contract_code ILIKE %s
                OR fu.first_name ILIKE %s
                OR fu.last_name ILIKE %s
                OR fp.product_code ILIKE %s
                OR fp.rice_variety ILIKE %s
            )
            """
        )

        params.extend(
            [keyword] * 5
        )


    contract_status = _normalize_choice(
        contract_status,
        {
            "active",
            "void_requested",
            "completed",
            "voided",
        },
        "contract status",
    )


    if contract_status:
        conditions.append(
            "c.contract_status = %s"
        )

        params.append(
            contract_status
        )


    product_type = _normalize_choice(
        product_type,
        {
            "unmilled_palay",
            "milled_rice",
        },
        "product type",
    )


    if product_type:
        conditions.append(
            "fp.product_type = %s"
        )

        params.append(
            product_type
        )


    rice_variety = _normalize_text(
        rice_variety
    )


    if rice_variety:
        conditions.append(
            "fp.rice_variety ILIKE %s"
        )

        params.append(
            f"%{rice_variety}%"
        )


    if year:
        conditions.append(
            "EXTRACT(YEAR FROM c.created_at) = %s"
        )

        params.append(
            _normalize_id(
                year,
                "year",
            )
        )


    month = _normalize_month(
        month
    )


    if month:
        conditions.append(
            "EXTRACT(MONTH FROM c.created_at) = %s"
        )

        params.append(
            month
        )


    order_map = {
        "oldest":
            """
            c.created_at ASC,
            c.contract_id ASC
            """,

        "fulfillment":
            """
            c.fulfillment_date ASC,
            c.contract_id ASC
            """,

        "newest":
            """
            c.created_at DESC,
            c.contract_id DESC
            """,
    }


    order_by = order_map.get(
        sort_by,
        order_map["newest"],
    )


    query = f"""
        SELECT
            c.contract_id,

            c.contract_code,

            c.contract_source,

            c.contract_status,

            c.fulfillment_status,

            c.created_at,

            c.fulfillment_date,

            c.contracted_quantity_kg,

            c.agreed_price_per_kg,

            c.total_contract_value,


            fu.user_id
                AS farmer_user_id,

            CONCAT_WS(
                ' ',
                fu.first_name,
                NULLIF(
                    fu.middle_initial,
                    ''
                ),
                fu.last_name,
                NULLIF(
                    fu.suffix,
                    ''
                )
            )
                AS farmer_name,


            ff.farm_id,

            ff.farm_name,

            ff.municipality
                AS farm_municipality,

            ff.province
                AS farm_province,


            fp.farm_product_id,

            fp.product_code,

            fp.product_image,

            fp.product_type,

            fp.rice_variety,

            fp.product_grade


        FROM contracts c


        INNER JOIN users fu

            ON fu.user_id =
                c.farmer_user_id


        INNER JOIN farm_products fp

            ON fp.farm_product_id =
                c.farm_product_id


        LEFT JOIN farmer_farms ff

            ON ff.farm_id =
                fp.source_farm_id


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

        return _rows_to_dicts(
            cursor
        )


# ============================================================
# CURRENT CONTRACT DETAILS
# ============================================================

def get_miller_contract_details(
    supplier_profile_id,
    contract_id,
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
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


                fu.user_id
                    AS farmer_user_id,

                CONCAT_WS(
                    ' ',
                    fu.first_name,
                    NULLIF(
                        fu.middle_initial,
                        ''
                    ),
                    fu.last_name,
                    NULLIF(
                        fu.suffix,
                        ''
                    )
                )
                    AS farmer_name,

                fu.email
                    AS farmer_email,

                fu.contact_number
                    AS farmer_contact_number,


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
                    AS farm_postal_code,


                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.description
                    AS product_description,

                fp.product_grade


            FROM contracts c


            INNER JOIN users fu

                ON fu.user_id =
                    c.farmer_user_id


            INNER JOIN farm_products fp

                ON fp.farm_product_id =
                    c.farm_product_id


            LEFT JOIN farmer_farms ff

                ON ff.farm_id =
                    fp.source_farm_id


            WHERE
                c.contract_id = %s

                AND c.supplier_profile_id = %s


            LIMIT 1
            """,
            [
                contract_id,
                supplier_id,
            ],
        )


        return _row_to_dict(
            cursor
        )


# ============================================================
# MESSAGE THREADS
# ============================================================

def list_miller_message_threads(
    supplier_profile_id,
    search="",
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    search = _normalize_text(
        search
    )

    params = [
        supplier_id
    ]

    search_sql = ""


    if search:
        keyword = f"%{search}%"

        search_sql = """
            AND (
                fu.first_name ILIKE %s
                OR fu.last_name ILIKE %s

                OR COALESCE(
                    app_ff.farm_name,
                    bid_ff.farm_name,
                    offer_ff.farm_name,
                    contract_ff.farm_name,
                    ''
                ) ILIKE %s

                OR fmm.message_text ILIKE %s
                OR cp.posting_code ILIKE %s
                OR fca.application_code ILIKE %s
                OR fob.bidding_code ILIKE %s
                OR fbo.offer_code ILIKE %s
                OR c.contract_code ILIKE %s
            )
        """

        params.extend(
            [keyword] * 9
        )


    query = f"""
        SELECT DISTINCT ON (
            fmm.farmer_user_id,
            fmm.reference_type,
            fmm.reference_id
        )

            fmm.farmer_user_id,


            CONCAT_WS(
                ' ',
                fu.first_name,
                NULLIF(
                    fu.middle_initial,
                    ''
                ),
                fu.last_name,
                NULLIF(
                    fu.suffix,
                    ''
                )
            )
                AS farmer_name,


            COALESCE(
                app_ff.farm_id,
                bid_ff.farm_id,
                offer_ff.farm_id,
                contract_ff.farm_id
            )
                AS farm_id,


            COALESCE(
                app_ff.farm_name,
                bid_ff.farm_name,
                offer_ff.farm_name,
                contract_ff.farm_name
            )
                AS farm_name,


            fmm.reference_type,

            fmm.reference_id,


            CASE

                WHEN fmm.reference_type = 'posting'
                    THEN cp.posting_code

                WHEN fmm.reference_type = 'application'
                    THEN fca.application_code

                WHEN fmm.reference_type = 'bidding'
                    THEN fob.bidding_code

                WHEN fmm.reference_type = 'bidding_offer'
                    THEN fbo.offer_code

                WHEN fmm.reference_type = 'contract'
                    THEN c.contract_code

            END
                AS reference_code,


            fmm.sender_type,

            fmm.message_text
                AS latest_message,

            fmm.created_at
                AS latest_message_at,


            COUNT(*) FILTER (

                WHERE
                    fmm.sender_type = 'farmer'

                    AND fmm.is_read = FALSE

            ) OVER (

                PARTITION BY
                    fmm.farmer_user_id,
                    fmm.reference_type,
                    fmm.reference_id

            )
                AS unread_count


        FROM farmer_miller_message fmm


        INNER JOIN users fu

            ON fu.user_id =
                fmm.farmer_user_id


        LEFT JOIN farmer_contract_applications app_owner

            ON fmm.reference_type = 'application'

            AND app_owner.application_id =
                fmm.reference_id

            AND app_owner.farmer_user_id =
                fmm.farmer_user_id


        LEFT JOIN farm_products app_fp

            ON app_fp.farm_product_id =
                app_owner.farm_product_id


        LEFT JOIN farmer_farms app_ff

            ON app_ff.farm_id =
                app_fp.source_farm_id


        LEFT JOIN farmer_open_biddings bid_owner

            ON fmm.reference_type = 'bidding'

            AND bid_owner.bidding_id =
                fmm.reference_id

            AND bid_owner.farmer_user_id =
                fmm.farmer_user_id


        LEFT JOIN farmer_farms bid_ff

            ON bid_ff.farm_id =
                bid_owner.farm_id


        LEFT JOIN farmer_bidding_offers offer_owner

            ON fmm.reference_type = 'bidding_offer'

            AND offer_owner.offer_id =
                fmm.reference_id

            AND offer_owner.supplier_profile_id =
                fmm.supplier_profile_id


        LEFT JOIN farmer_open_biddings offer_bid

            ON offer_bid.bidding_id =
                offer_owner.bidding_id

            AND offer_bid.farmer_user_id =
                fmm.farmer_user_id


        LEFT JOIN farmer_farms offer_ff

            ON offer_ff.farm_id =
                offer_bid.farm_id


        LEFT JOIN contracts contract_owner

            ON fmm.reference_type = 'contract'

            AND contract_owner.contract_id =
                fmm.reference_id

            AND contract_owner.supplier_profile_id =
                fmm.supplier_profile_id

            AND contract_owner.farmer_user_id =
                fmm.farmer_user_id


        LEFT JOIN farm_products contract_fp

            ON contract_fp.farm_product_id =
                contract_owner.farm_product_id


        LEFT JOIN farmer_farms contract_ff

            ON contract_ff.farm_id =
                contract_fp.source_farm_id


        LEFT JOIN contract_postings cp

            ON fmm.reference_type = 'posting'

            AND cp.posting_id =
                fmm.reference_id


        LEFT JOIN farmer_contract_applications fca

            ON fmm.reference_type = 'application'

            AND fca.application_id =
                fmm.reference_id


        LEFT JOIN farmer_open_biddings fob

            ON fmm.reference_type = 'bidding'

            AND fob.bidding_id =
                fmm.reference_id


        LEFT JOIN farmer_bidding_offers fbo

            ON fmm.reference_type = 'bidding_offer'

            AND fbo.offer_id =
                fmm.reference_id


        LEFT JOIN contracts c

            ON fmm.reference_type = 'contract'

            AND c.contract_id =
                fmm.reference_id


        WHERE
            fmm.supplier_profile_id = %s

            {search_sql}


        ORDER BY
            fmm.farmer_user_id,
            fmm.reference_type,
            fmm.reference_id,
            fmm.created_at DESC,
            fmm.message_id DESC
    """


    with connection.cursor() as cursor:
        cursor.execute(
            query,
            params,
        )

        items = _rows_to_dicts(
            cursor
        )


    items.sort(
        key=lambda item:
            item.get(
                "latest_message_at"
            )
            or datetime.min,

        reverse=True,
    )


    return items


# ============================================================
# MESSAGE CONVERSATION
# ============================================================

def list_miller_messages(
    supplier_profile_id,
    farmer_user_id,
    reference_type,
    reference_id,
):
    supplier_id = _normalize_id(
        supplier_profile_id,
        "Miller Profile ID",
    )

    farmer_id = _normalize_id(
        farmer_user_id,
        "Farmer ID",
    )

    reference_id = _normalize_id(
        reference_id,
        "message reference ID",
    )


    reference_type = _normalize_choice(
        reference_type,
        {
            "posting",
            "application",
            "bidding",
            "bidding_offer",
            "contract",
        },
        "message reference type",
    )


    if not reference_type:
        raise ValueError(
            "Invalid message reference type."
        )


    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                fmm.message_id,

                fmm.farmer_user_id,

                fmm.supplier_profile_id,

                fmm.reference_type,

                fmm.reference_id,


                CASE

                    WHEN fmm.reference_type = 'posting'
                        THEN cp.posting_code

                    WHEN fmm.reference_type = 'application'
                        THEN fca.application_code

                    WHEN fmm.reference_type = 'bidding'
                        THEN fob.bidding_code

                    WHEN fmm.reference_type = 'bidding_offer'
                        THEN fbo.offer_code

                    WHEN fmm.reference_type = 'contract'
                        THEN c.contract_code

                END
                    AS reference_code,


                fmm.sender_type,

                fmm.message_text,

                fmm.is_read,

                fmm.read_at,

                fmm.created_at


            FROM farmer_miller_message fmm


            LEFT JOIN contract_postings cp

                ON fmm.reference_type = 'posting'

                AND cp.posting_id =
                    fmm.reference_id


            LEFT JOIN farmer_contract_applications fca

                ON fmm.reference_type = 'application'

                AND fca.application_id =
                    fmm.reference_id


            LEFT JOIN farmer_open_biddings fob

                ON fmm.reference_type = 'bidding'

                AND fob.bidding_id =
                    fmm.reference_id


            LEFT JOIN farmer_bidding_offers fbo

                ON fmm.reference_type = 'bidding_offer'

                AND fbo.offer_id =
                    fmm.reference_id


            LEFT JOIN contracts c

                ON fmm.reference_type = 'contract'

                AND c.contract_id =
                    fmm.reference_id


            WHERE
                fmm.supplier_profile_id = %s

                AND fmm.farmer_user_id = %s

                AND fmm.reference_type = %s

                AND fmm.reference_id = %s


            ORDER BY
                fmm.created_at ASC,
                fmm.message_id ASC
            """,
            [
                supplier_id,
                farmer_id,
                reference_type,
                reference_id,
            ],
        )


        return _rows_to_dicts(
            cursor
        )