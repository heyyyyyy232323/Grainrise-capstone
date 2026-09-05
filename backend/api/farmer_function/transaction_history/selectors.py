from math import ceil

from django.db import connection


# ============================================================
# GRAINRISE
# FARMER > TRANSACTION HISTORY
# SELECTORS
# ============================================================
#
# SEGMENTATION:
#
# 1. POS Transactions
#
#    Columns:
#
#    Transaction ID
#    Date
#    Buyer / Payee
#    Type
#    Product
#    Qty
#    Amount
#    Payment
#    Status
#
#
# 2. Contract History
#
#    Columns:
#
#    Contract ID
#    Date
#    Product
#    Qty
#    Price/kg
#    Action -> View Details
#
#
# SECURITY:
#
# farmer_user_id MUST come from:
#
#     request.grainrise_farmer_id
#
# populated by the existing Farmer JWT/session guard.
#
# Never accept farmer_user_id from frontend filters/query params.
#
# ============================================================


# ============================================================
# CONSTANTS
# ============================================================

DEFAULT_PAGE = 1

DEFAULT_PAGE_SIZE = 10

MAX_PAGE_SIZE = 100


HISTORICAL_CONTRACT_STATUSES = (
    "completed",
    "voided",
)


# ============================================================
# DATABASE HELPERS
# ============================================================

def _rows_to_dicts(
    cursor,
):
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


def _row_to_dict(
    cursor,
):
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
# FARMER ID
# ============================================================

def _normalize_farmer_id(
    farmer_user_id,
):
    """
    Farmer ID must come from authenticated session/JWT.
    """

    try:
        normalized = int(
            farmer_user_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:

        raise ValueError(
            "Invalid Farmer session."
        ) from exc


    if normalized <= 0:
        raise ValueError(
            "Invalid Farmer session."
        )


    return normalized


# ============================================================
# TEXT
# ============================================================

def _normalize_text(
    value,
):
    return str(
        value or ""
    ).strip()


# ============================================================
# POSITIVE INTEGER
# ============================================================

def _positive_integer(
    value,
    *,
    default,
    maximum=None,
):
    try:
        normalized = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ):
        normalized = default


    if normalized <= 0:
        normalized = default


    if (
        maximum is not None
        and normalized > maximum
    ):
        normalized = maximum


    return normalized


# ============================================================
# YEAR
# ============================================================

def _normalize_year(
    value,
):
    if value in (
        None,
        "",
    ):
        return None


    try:
        year = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid year."
        ) from exc


    if (
        year < 2000
        or year > 2100
    ):
        raise ValueError(
            "Invalid year."
        )


    return year


# ============================================================
# MONTH
# ============================================================

def _normalize_month(
    value,
):
    if value in (
        None,
        "",
    ):
        return None


    try:
        month = int(
            value
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid month."
        ) from exc


    if (
        month < 1
        or month > 12
    ):
        raise ValueError(
            "Invalid month."
        )


    return month


# ============================================================
# SORT
# ============================================================

def _normalize_sort(
    value,
):
    normalized = (
        _normalize_text(
            value
        ).lower()
    )


    if normalized == "oldest":
        return "oldest"


    return "newest"


# ============================================================
# PAGINATION RESPONSE
# ============================================================

def _pagination_payload(
    *,
    page,
    page_size,
    total_items,
):
    total_pages = (
        ceil(
            total_items
            /
            page_size
        )
        if total_items > 0
        else 0
    )


    return {
        "page":
            page,

        "page_size":
            page_size,

        "total_items":
            total_items,

        "total_pages":
            total_pages,

        "has_previous":
            page > 1,

        "has_next":
            (
                total_pages > 0
                and page < total_pages
            ),
    }


# ============================================================
# POS TRANSACTIONS
# ============================================================

def list_farmer_pos_transactions(
    farmer_user_id,
    *,
    search="",
    payment_method="",
    transaction_status="",
    year=None,
    month=None,
    sort_by="newest",
    page=1,
    page_size=10,
):
    """
    Farmer Transaction History > POS Transactions.


    ONE DATABASE ROW = ONE PRODUCT SOLD.


    Example:

        POS-001 | RC222    | 50 kg

        POS-001 | Dinorado | 25 kg


    Both may share the same transaction_code because they were
    part of one POS checkout.


    REQUIRED TABLE COLUMNS:

        Transaction ID
        Date
        Buyer / Payee
        Type
        Product
        Qty
        Amount
        Payment
        Status


    Type is always:

        Sale

    because farmer_pos_transactions stores Farmer POS sales.


    SECURITY:

        WHERE farmer_user_id = authenticated Farmer ID
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    search = (
        _normalize_text(
            search
        )
    )


    payment_method = (
        _normalize_text(
            payment_method
        ).lower()
    )


    transaction_status = (
        _normalize_text(
            transaction_status
        ).lower()
    )


    year = (
        _normalize_year(
            year
        )
    )


    month = (
        _normalize_month(
            month
        )
    )


    sort_by = (
        _normalize_sort(
            sort_by
        )
    )


    page = (
        _positive_integer(
            page,
            default=DEFAULT_PAGE,
        )
    )


    page_size = (
        _positive_integer(
            page_size,
            default=DEFAULT_PAGE_SIZE,
            maximum=MAX_PAGE_SIZE,
        )
    )


    # ========================================================
    # FILTERS
    # ========================================================

    conditions = [
        "t.farmer_user_id = %s",
    ]


    params = [
        farmer_id,
    ]


    # ========================================================
    # SEARCH
    #
    # Searches visible Transaction History fields:
    #
    # Transaction ID
    # Buyer / Payee
    # Product Type
    # Rice Variety
    # Product Grade
    # ========================================================

    if search:

        keyword = (
            f"%{search}%"
        )


        conditions.append(
            """
            (
                t.transaction_code ILIKE %s

                OR COALESCE(
                    t.buyer_name,
                    ''
                ) ILIKE %s

                OR t.product_type ILIKE %s

                OR t.rice_variety ILIKE %s

                OR COALESCE(
                    t.product_grade,
                    ''
                ) ILIKE %s
            )
            """
        )


        params.extend(
            [
                keyword,
                keyword,
                keyword,
                keyword,
                keyword,
            ]
        )


    # ========================================================
    # PAYMENT METHOD
    # ========================================================

    if payment_method:

        if payment_method not in {
            "cash",
            "card",
        }:
            raise ValueError(
                "Invalid payment method."
            )


        conditions.append(
            "t.payment_method = %s"
        )


        params.append(
            payment_method
        )


    # ========================================================
    # STATUS
    # ========================================================

    if transaction_status:

        if transaction_status not in {
            "completed",
            "voided",
        }:
            raise ValueError(
                "Invalid POS transaction status."
            )


        conditions.append(
            "t.transaction_status = %s"
        )


        params.append(
            transaction_status
        )


    # ========================================================
    # YEAR
    # ========================================================

    if year is not None:

        conditions.append(
            """
            EXTRACT(
                YEAR FROM t.created_at
            ) = %s
            """
        )


        params.append(
            year
        )


    # ========================================================
    # MONTH
    # ========================================================

    if month is not None:

        conditions.append(
            """
            EXTRACT(
                MONTH FROM t.created_at
            ) = %s
            """
        )


        params.append(
            month
        )


    where_clause = (
        "\nAND ".join(
            conditions
        )
    )


    # ========================================================
    # SORT
    # ========================================================

    if sort_by == "oldest":

        order_by = """
            t.created_at ASC,
            t.transaction_id ASC
        """

    else:

        order_by = """
            t.created_at DESC,
            t.transaction_id DESC
        """


    # ========================================================
    # COUNT
    # ========================================================

    with connection.cursor() as cursor:

        cursor.execute(
            f"""
            SELECT
                COUNT(*)

            FROM farmer_pos_transactions t

            WHERE
                {where_clause}
            """,
            params,
        )


        total_items = int(
            cursor.fetchone()[0]
            or 0
        )


        # ====================================================
        # PAGE OFFSET
        # ====================================================

        offset = (
            (
                page - 1
            )
            *
            page_size
        )


        # ====================================================
        # DATA
        # ====================================================

        cursor.execute(
            f"""
            SELECT

                -- ===========================================
                -- INTERNAL ROW ID
                -- ===========================================

                t.transaction_id,


                -- ===========================================
                -- TABLE:
                -- Transaction ID
                -- ===========================================

                t.transaction_code,


                -- ===========================================
                -- TABLE:
                -- Date
                -- ===========================================

                t.created_at
                    AS transaction_date,


                -- ===========================================
                -- TABLE:
                -- Buyer / Payee
                -- ===========================================

                t.buyer_name,


                -- ===========================================
                -- TABLE:
                -- Type
                --
                -- Every record from this table is a POS Sale.
                -- ===========================================

                'Sale'::VARCHAR
                    AS transaction_type,


                -- ===========================================
                -- TABLE:
                -- Product
                -- ===========================================

                t.product_type,

                t.rice_variety,

                t.product_grade,


                -- ===========================================
                -- TABLE:
                -- Qty
                -- ===========================================

                t.quantity_sold_kg,


                -- ===========================================
                -- PRICE SNAPSHOT
                -- ===========================================

                t.selling_price_per_kg,


                -- ===========================================
                -- TABLE:
                -- Amount
                -- ===========================================

                t.line_total_amount
                    AS amount,


                -- ===========================================
                -- TABLE:
                -- Payment
                -- ===========================================

                t.payment_method,


                -- ===========================================
                -- TABLE:
                -- Status
                -- ===========================================

                t.transaction_status


            FROM farmer_pos_transactions t


            WHERE
                {where_clause}


            ORDER BY
                {order_by}


            LIMIT %s

            OFFSET %s
            """,
            [
                *params,
                page_size,
                offset,
            ],
        )


        items = (
            _rows_to_dicts(
                cursor
            )
        )


    return {
        "items":
            items,

        "pagination":
            _pagination_payload(
                page=page,
                page_size=page_size,
                total_items=total_items,
            ),
    }


# ============================================================
# POS SUMMARY
# ============================================================

def get_farmer_pos_transaction_summary(
    farmer_user_id,
):
    """
    Real POS metrics.

    No fake Expenses or Net Income are calculated here because
    GrainRise currently has no Farmer expense-entry source.

    Summary can be used later for KPI cards.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                -- Number of distinct POS checkouts
                COUNT(
                    DISTINCT transaction_code
                )
                FILTER (
                    WHERE transaction_status =
                        'completed'
                )
                    AS completed_transactions,


                -- Total individual product rows sold
                COUNT(*)
                FILTER (
                    WHERE transaction_status =
                        'completed'
                )
                    AS product_lines_sold,


                -- Total quantity sold
                COALESCE(
                    SUM(
                        quantity_sold_kg
                    )
                    FILTER (
                        WHERE transaction_status =
                            'completed'
                    ),
                    0
                )
                    AS total_quantity_sold_kg,


                -- Total sales revenue
                COALESCE(
                    SUM(
                        line_total_amount
                    )
                    FILTER (
                        WHERE transaction_status =
                            'completed'
                    ),
                    0
                )
                    AS total_revenue


            FROM farmer_pos_transactions

            WHERE
                farmer_user_id = %s
            """,
            [
                farmer_id,
            ],
        )


        summary = (
            _row_to_dict(
                cursor
            )
        )


    return (
        summary
        or {
            "completed_transactions":
                0,

            "product_lines_sold":
                0,

            "total_quantity_sold_kg":
                0,

            "total_revenue":
                0,
        }
    )


# ============================================================
# CONTRACT HISTORY
# ============================================================

def list_farmer_contract_history(
    farmer_user_id,
    *,
    search="",
    year=None,
    month=None,
    sort_by="newest",
    page=1,
    page_size=10,
):
    """
    Farmer Transaction History > Contract History.


    TABLE COLUMNS:

        Contract ID
        Date
        Product
        Qty
        Price/kg
        Action -> View Details


    ONLY HISTORICAL CONTRACTS:

        completed
        voided


    NOT INCLUDED:

        active
        void_requested


    because those still belong under:

        Farmer > Contracts > Current Contracts


    SECURITY:

        c.farmer_user_id = authenticated Farmer ID
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    search = (
        _normalize_text(
            search
        )
    )


    year = (
        _normalize_year(
            year
        )
    )


    month = (
        _normalize_month(
            month
        )
    )


    sort_by = (
        _normalize_sort(
            sort_by
        )
    )


    page = (
        _positive_integer(
            page,
            default=DEFAULT_PAGE,
        )
    )


    page_size = (
        _positive_integer(
            page_size,
            default=DEFAULT_PAGE_SIZE,
            maximum=MAX_PAGE_SIZE,
        )
    )


    # ========================================================
    # HISTORY DATE
    #
    # Current contracts table does not use a dedicated
    # historical completed_at/voided_at field in the schema
    # currently used by the project.
    #
    # Therefore:
    #
    # updated_at = date the final historical record was last
    #              updated.
    #
    # This is more appropriate for completed/voided history
    # than the original contract creation date.
    # ========================================================

    history_date_sql = (
        "COALESCE(c.updated_at, c.created_at)"
    )


    # ========================================================
    # BASE CONDITIONS
    # ========================================================

    conditions = [
        "c.farmer_user_id = %s",
        """
        c.contract_status IN (
            'completed',
            'voided'
        )
        """,
    ]


    params = [
        farmer_id,
    ]


    # ========================================================
    # SEARCH
    # ========================================================

    if search:

        keyword = (
            f"%{search}%"
        )


        conditions.append(
            """
            (
                c.contract_code ILIKE %s

                OR fp.product_code ILIKE %s

                OR fp.product_type ILIKE %s

                OR fp.rice_variety ILIKE %s

                OR COALESCE(
                    fp.product_grade,
                    ''
                ) ILIKE %s
            )
            """
        )


        params.extend(
            [
                keyword,
                keyword,
                keyword,
                keyword,
                keyword,
            ]
        )


    # ========================================================
    # YEAR
    # ========================================================

    if year is not None:

        conditions.append(
            f"""
            EXTRACT(
                YEAR FROM {history_date_sql}
            ) = %s
            """
        )


        params.append(
            year
        )


    # ========================================================
    # MONTH
    # ========================================================

    if month is not None:

        conditions.append(
            f"""
            EXTRACT(
                MONTH FROM {history_date_sql}
            ) = %s
            """
        )


        params.append(
            month
        )


    where_clause = (
        "\nAND ".join(
            conditions
        )
    )


    # ========================================================
    # ORDER
    # ========================================================

    if sort_by == "oldest":

        order_by = f"""
            {history_date_sql} ASC,
            c.contract_id ASC
        """

    else:

        order_by = f"""
            {history_date_sql} DESC,
            c.contract_id DESC
        """


    with connection.cursor() as cursor:

        # ====================================================
        # COUNT
        # ====================================================

        cursor.execute(
            f"""
            SELECT
                COUNT(*)

            FROM contracts c

            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   c.farm_product_id

            WHERE
                {where_clause}
            """,
            params,
        )


        total_items = int(
            cursor.fetchone()[0]
            or 0
        )


        offset = (
            (
                page - 1
            )
            *
            page_size
        )


        # ====================================================
        # CONTRACT HISTORY TABLE DATA
        # ====================================================

        cursor.execute(
            f"""
            SELECT

                -- ===========================================
                -- Needed by View Details action
                -- ===========================================

                c.contract_id,


                -- ===========================================
                -- TABLE:
                -- Contract ID
                -- ===========================================

                c.contract_code,


                -- ===========================================
                -- TABLE:
                -- Date
                -- ===========================================

                {history_date_sql}
                    AS contract_date,


                -- ===========================================
                -- TABLE:
                -- Product
                -- ===========================================

                fp.product_code,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,


                -- ===========================================
                -- TABLE:
                -- Qty
                -- ===========================================

                c.contracted_quantity_kg,


                -- ===========================================
                -- TABLE:
                -- Price/kg
                -- ===========================================

                c.agreed_price_per_kg,


                -- ===========================================
                -- INTERNAL STATUS
                --
                -- Not required as table column, but useful
                -- for details/history state.
                -- ===========================================

                c.contract_status


            FROM contracts c


            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   c.farm_product_id


            WHERE
                {where_clause}


            ORDER BY
                {order_by}


            LIMIT %s

            OFFSET %s
            """,
            [
                *params,
                page_size,
                offset,
            ],
        )


        items = (
            _rows_to_dicts(
                cursor
            )
        )


    return {
        "items":
            items,

        "pagination":
            _pagination_payload(
                page=page,
                page_size=page_size,
                total_items=total_items,
            ),
    }


# ============================================================
# CONTRACT HISTORY DETAILS
# ============================================================

def get_farmer_contract_history_details(
    farmer_user_id,
    contract_id,
):
    """
    Complete historical contract data for:

        Contract History > View Details


    Security:

        contract_id
        +
        authenticated Farmer ID
        +
        historical status

    must all match.


    This prevents:

        Farmer A
            viewing
        Farmer B's historical contract.
    """

    farmer_id = (
        _normalize_farmer_id(
            farmer_user_id
        )
    )


    try:
        normalized_contract_id = int(
            contract_id
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise ValueError(
            "Invalid contract ID."
        ) from exc


    if normalized_contract_id <= 0:
        raise ValueError(
            "Invalid contract ID."
        )


    with connection.cursor() as cursor:

        cursor.execute(
            """
            SELECT

                -- ===========================================
                -- CONTRACT
                -- ===========================================

                c.contract_id,

                c.contract_code,

                c.contract_source,

                c.contract_status,

                c.created_at,

                c.updated_at,

                c.contract_start_date,

                c.fulfillment_date,


                -- ===========================================
                -- QUANTITY / PRICE
                -- ===========================================

                c.contracted_quantity_kg,

                c.agreed_price_per_kg,

                c.total_contract_value,


                -- ===========================================
                -- FULFILLMENT
                -- ===========================================

                c.fulfillment_method,

                c.fulfillment_location,

                c.fulfillment_status,

                c.quantity_fulfilled_kg,

                c.remaining_quantity_kg,


                -- ===========================================
                -- TERMS
                -- ===========================================

                c.agreed_terms,


                -- ===========================================
                -- SIGNATURE
                -- ===========================================

                c.farmer_signature_path,

                c.farmer_signed_at,

                c.miller_signature_path,

                c.miller_signed_at,


                -- ===========================================
                -- VOID
                -- ===========================================

                c.void_requested_by,

                c.void_reason,

                c.void_remarks,

                c.void_requested_at,


                -- ===========================================
                -- PRODUCT
                -- ===========================================

                fp.product_code,

                fp.product_image,

                fp.product_type,

                fp.rice_variety,

                fp.product_grade,

                fp.description
                    AS product_description,


                -- ===========================================
                -- FARM
                -- ===========================================

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


                -- ===========================================
                -- MILLER
                -- ===========================================

                sp.supplier_profile_id,

                sp.business_name,

                sp.organization_name,

                sp.official_email,

                sp.official_contact_number,


                CONCAT_WS(
                    ' ',
                    u.first_name,
                    NULLIF(
                        u.middle_initial,
                        ''
                    ),
                    u.last_name,
                    NULLIF(
                        u.suffix,
                        ''
                    )
                )
                    AS miller_name


            FROM contracts c


            INNER JOIN farm_products fp
                ON fp.farm_product_id =
                   c.farm_product_id


            LEFT JOIN farmer_farms ff
                ON ff.farm_id =
                   fp.source_farm_id


            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id =
                   c.supplier_profile_id


            INNER JOIN users u
                ON u.user_id =
                   sp.user_id


            WHERE
                c.contract_id = %s

                AND c.farmer_user_id = %s

                AND c.contract_status IN (
                    'completed',
                    'voided'
                )


            LIMIT 1
            """,
            [
                normalized_contract_id,
                farmer_id,
            ],
        )


        return (
            _row_to_dict(
                cursor
            )
        )