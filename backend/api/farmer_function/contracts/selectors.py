import logging
from decimal import Decimal
from datetime import date, datetime

from django.db import connection

logger = logging.getLogger(__name__)


def _serialize_val(val):
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def _normalize_status(status_str):
    if not status_str:
        return "pending"
    s = str(status_str).strip().lower().replace(" ", "_")
    return s


# ============================================================
# 1. APPLICATIONS
# ============================================================

def get_farmer_applications(farm_profile_id, filters=None):
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    status_filter = str(filters.get("status") or "").strip().lower()
    year_filter = str(filters.get("year") or "").strip()
    month_filter = str(filters.get("month") or "").strip()
    sort_by = str(filters.get("sortBy") or "newest").strip().lower()

    params = [farm_profile_id]
    where_clauses = ["fca.farm_profile_id = %s"]

    if search:
        search_pattern = f"%{search}%"
        where_clauses.append(
            """(
                sp.business_name LIKE %s
                OR sp.organization_name LIKE %s
                OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE %s
                OR fca.application_code LIKE %s
                OR fco.opportunity_code LIKE %s
                OR COALESCE(fp.rice_variety, fco.rice_variety) LIKE %s
            )"""
        )
        params.extend([search_pattern] * 6)

    if status_filter:
        status_map = {
            "pending": "Pending",
            "under_review": "Under Review",
            "declined": "Declined",
            "cancelled": "Cancelled",
            "approved": "Approved",
        }
        db_status = status_map.get(status_filter, status_filter.title())
        where_clauses.append("fca.application_status = %s")
        params.append(db_status)

    if year_filter:
        try:
            year_val = int(year_filter)
            where_clauses.append("YEAR(fca.created_at) = %s")
            params.append(year_val)
        except ValueError:
            pass

    if month_filter:
        try:
            month_val = int(month_filter)
            where_clauses.append("MONTH(fca.created_at) = %s")
            params.append(month_val)
        except ValueError:
            pass

    order_by_sql = "fca.created_at DESC" if sort_by != "oldest" else "fca.created_at ASC"
    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            fca.application_id,
            fca.farm_profile_id,
            fca.opportunity_id,
            fca.farm_product_id,
            fca.application_code,
            fca.committed_quantity_kg,
            fca.proposed_selling_price_per_kg,
            fca.expected_availability_date,
            fca.proposed_terms,
            fca.additional_notes,
            fca.farmer_signature,
            fca.farmer_signed_at,
            fca.application_status,
            fca.cancellation_reason,
            fca.cancelled_at,
            fca.created_at,
            fca.updated_at,
            -- Opportunity
            fco.opportunity_code,
            fco.product_type AS opp_product_type,
            fco.rice_variety AS opp_rice_variety,
            fco.product_grade AS opp_product_grade,
            fco.required_quantity_kg AS opp_required_quantity_kg,
            fco.buying_price_per_kg AS opp_buying_price_per_kg,
            fco.required_fulfillment_date AS opp_fulfillment_date,
            fco.fulfillment_method AS opp_fulfillment_method,
            fco.opportunity_status,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_image,
            -- Supplier
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name,
            sp.official_email,
            sp.official_contact_number,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.postal_code AS business_postal_code,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
        FROM existing_grainrise_farmer_contract_applications fca
        INNER JOIN existing_grainrise_farmer_contract_opportunities fco ON fco.opportunity_id = fca.opportunity_id
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = fco.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = fca.farm_product_id
        WHERE {where_sql}
        ORDER BY {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()

    results = []
    for row in rows:
        d = dict(zip(cols, row))
        raw_status = str(d.get("application_status") or "")
        normalized_status = _normalize_status(raw_status)
        rice_var = d.get("rice_variety") or d.get("opp_rice_variety") or "—"
        qty = _serialize_val(d.get("committed_quantity_kg")) or 0.0
        price = _serialize_val(d.get("proposed_selling_price_per_kg") or d.get("opp_buying_price_per_kg"))

        item = {
            "application_id": d["application_id"],
            "application_code": d["application_code"],
            "posting_id": d["opportunity_id"],
            "posting_code": d["opportunity_code"],
            "opportunity_id": d["opportunity_id"],
            "opportunity_code": d["opportunity_code"],
            "farm_profile_id": d["farm_profile_id"],
            "farm_product_id": d["farm_product_id"],
            "product_code": d.get("product_code"),
            "product_type": d.get("product_type") or d.get("opp_product_type"),
            "product_grade": d.get("product_grade") or d.get("opp_product_grade"),
            "product_image": d.get("product_image"),
            "rice_variety": rice_var,
            "quantity_to_commit_kg": qty,
            "committed_quantity_kg": qty,
            "offered_price_per_kg": price,
            "proposed_selling_price_per_kg": price,
            "buying_price_per_kg": _serialize_val(d.get("opp_buying_price_per_kg")),
            "application_date": _serialize_val(d.get("created_at")),
            "created_at": _serialize_val(d.get("created_at")),
            "expected_availability_date": _serialize_val(d.get("expected_availability_date")),
            "application_status": normalized_status,
            "raw_status": raw_status,
            "proposed_terms": d.get("proposed_terms"),
            "additional_notes": d.get("additional_notes"),
            "remarks": d.get("additional_notes") or d.get("cancellation_reason") or "",
            "cancellation_reason": d.get("cancellation_reason"),
            "cancelled_at": _serialize_val(d.get("cancelled_at")),
            "farmer_signature": d.get("farmer_signature"),
            "farmer_signed_at": _serialize_val(d.get("farmer_signed_at")),
            "supplier_profile_id": d["supplier_profile_id"],
            "business_name": d.get("business_name") or "",
            "organization_name": d.get("organization_name") or "",
            "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
            "business_province": d.get("business_province"),
            "business_municipality": d.get("business_municipality"),
            "business_barangay": d.get("business_barangay"),
            "business_street_address": d.get("business_street_address"),
            "business_postal_code": d.get("business_postal_code"),
            "official_email": d.get("official_email"),
            "official_contact_number": d.get("official_contact_number"),
        }
        results.append(item)
    return results


def get_farmer_application_details(farm_profile_id, application_id):
    query = """
        SELECT
            fca.application_id,
            fca.farm_profile_id,
            fca.opportunity_id,
            fca.farm_product_id,
            fca.application_code,
            fca.committed_quantity_kg,
            fca.proposed_selling_price_per_kg,
            fca.expected_availability_date,
            fca.proposed_terms,
            fca.additional_notes,
            fca.farmer_signature,
            fca.farmer_signed_at,
            fca.application_status,
            fca.cancellation_reason,
            fca.cancelled_at,
            fca.created_at,
            fca.updated_at,
            -- Opportunity
            fco.opportunity_code,
            fco.product_type AS opp_product_type,
            fco.rice_variety AS opp_rice_variety,
            fco.product_description AS opp_product_description,
            fco.product_image AS opp_product_image,
            fco.product_grade AS opp_product_grade,
            fco.required_quantity_kg AS opp_required_quantity_kg,
            fco.buying_price_per_kg AS opp_buying_price_per_kg,
            fco.required_fulfillment_date AS opp_fulfillment_date,
            fco.fulfillment_method AS opp_fulfillment_method,
            fco.partial_quantity_allowed,
            fco.price_negotiation_allowed,
            fco.proposed_terms AS opp_proposed_terms,
            fco.application_deadline,
            fco.opportunity_status,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_description,
            fp.product_image,
            fp.stock_quantity_kg,
            -- Supplier / Miller
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name,
            sp.official_email,
            sp.official_contact_number,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.postal_code AS business_postal_code,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name,
            -- Farm Profile
            f.farm_lot_name,
            f.province AS farm_province,
            f.municipality AS farm_municipality,
            f.street_address AS farm_street_address
        FROM existing_grainrise_farmer_contract_applications fca
        INNER JOIN existing_grainrise_farmer_contract_opportunities fco ON fco.opportunity_id = fca.opportunity_id
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = fco.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        INNER JOIN farm_profile f ON f.farm_profile_id = fca.farm_profile_id
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = fca.farm_product_id
        WHERE fca.application_id = %s
          AND fca.farm_profile_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [application_id, farm_profile_id])
        cols = [c[0] for c in cursor.description]
        row = cursor.fetchone()

    if not row:
        return None

    d = dict(zip(cols, row))
    raw_status = str(d.get("application_status") or "")
    normalized_status = _normalize_status(raw_status)
    rice_var = d.get("rice_variety") or d.get("opp_rice_variety") or "—"
    qty = _serialize_val(d.get("committed_quantity_kg")) or 0.0
    price = _serialize_val(d.get("proposed_selling_price_per_kg") or d.get("opp_buying_price_per_kg"))

    return {
        "application_id": d["application_id"],
        "application_code": d["application_code"],
        "posting_id": d["opportunity_id"],
        "posting_code": d["opportunity_code"],
        "opportunity_id": d["opportunity_id"],
        "opportunity_code": d["opportunity_code"],
        "farm_profile_id": d["farm_profile_id"],
        "farm_product_id": d["farm_product_id"],
        "product_code": d.get("product_code") or "—",
        "product_type": d.get("product_type") or d.get("opp_product_type") or "Unmilled Palay",
        "product_grade": d.get("product_grade") or d.get("opp_product_grade") or "Grade 1",
        "product_description": d.get("product_description") or d.get("opp_product_description") or "",
        "product_image": d.get("product_image") or d.get("opp_product_image"),
        "rice_variety": rice_var,
        "quantity_to_commit_kg": qty,
        "committed_quantity_kg": qty,
        "offered_price_per_kg": price,
        "proposed_selling_price_per_kg": price,
        "buying_price_per_kg": _serialize_val(d.get("opp_buying_price_per_kg")),
        "application_date": _serialize_val(d.get("created_at")),
        "created_at": _serialize_val(d.get("created_at")),
        "expected_availability_date": _serialize_val(d.get("expected_availability_date")),
        "application_status": normalized_status,
        "raw_status": raw_status,
        "proposed_terms": d.get("proposed_terms") or d.get("opp_proposed_terms") or "",
        "additional_notes": d.get("additional_notes") or "",
        "remarks": d.get("additional_notes") or d.get("cancellation_reason") or "",
        "cancellation_reason": d.get("cancellation_reason"),
        "cancelled_at": _serialize_val(d.get("cancelled_at")),
        "farmer_signature": d.get("farmer_signature"),
        "farmer_signed_at": _serialize_val(d.get("farmer_signed_at")),
        # Opportunity specs
        "required_rice_variety": d.get("opp_rice_variety"),
        "required_quantity_kg": _serialize_val(d.get("opp_required_quantity_kg")),
        "required_fulfillment_date": _serialize_val(d.get("opp_fulfillment_date")),
        "fulfillment_method": d.get("opp_fulfillment_method") or "Buyer Pickup",
        "partial_quantity_allowed": bool(d.get("partial_quantity_allowed")),
        "price_negotiation_allowed": bool(d.get("price_negotiation_allowed")),
        "application_deadline": _serialize_val(d.get("application_deadline")),
        "opportunity_status": d.get("opportunity_status"),
        # Miller / Buyer
        "supplier_profile_id": d["supplier_profile_id"],
        "business_name": d.get("business_name") or "",
        "organization_name": d.get("organization_name") or "",
        "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
        "official_contact_number": d.get("official_contact_number") or "—",
        "official_email": d.get("official_email") or "—",
        "business_street_address": d.get("business_street_address") or "",
        "business_barangay": d.get("business_barangay") or "",
        "business_municipality": d.get("business_municipality") or "",
        "business_province": d.get("business_province") or "",
        "business_postal_code": d.get("business_postal_code") or "",
        # Farm info
        "farm_lot_name": d.get("farm_lot_name") or "",
        "farm_province": d.get("farm_province") or "",
        "farm_municipality": d.get("farm_municipality") or "",
        "farm_street_address": d.get("farm_street_address") or "",
    }


# ============================================================
# 2. OPPORTUNITIES
# ============================================================

def get_farmer_opportunities(farm_profile_id, filters=None):
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    product_type = str(filters.get("product_type") or "").strip()
    rice_variety = str(filters.get("rice_variety") or "").strip()
    sort_by = str(filters.get("sortBy") or "newest").strip().lower()

    where_clauses = ["fco.opportunity_status = 'open'"]
    params = []

    if search:
        search_pattern = f"%{search}%"
        where_clauses.append(
            """(
                sp.business_name LIKE %s
                OR sp.organization_name LIKE %s
                OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE %s
                OR fco.opportunity_code LIKE %s
                OR fco.rice_variety LIKE %s
            )"""
        )
        params.extend([search_pattern] * 5)

    if product_type:
        where_clauses.append("fco.product_type = %s")
        params.append(product_type)

    if rice_variety:
        where_clauses.append("fco.rice_variety = %s")
        params.append(rice_variety)

    order_map = {
        "newest": "fco.created_at DESC",
        "oldest": "fco.created_at ASC",
        "highest_price": "fco.buying_price_per_kg DESC",
        "lowest_price": "fco.buying_price_per_kg ASC",
        "nearest_fulfillment": "fco.required_fulfillment_date ASC",
    }
    order_by_sql = order_map.get(sort_by, "fco.created_at DESC")
    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            fco.opportunity_id,
            fco.supplier_profile_id,
            fco.opportunity_code,
            fco.product_type,
            fco.rice_variety,
            fco.product_description,
            fco.product_image,
            fco.product_grade,
            fco.required_quantity_kg,
            fco.buying_price_per_kg,
            fco.required_fulfillment_date,
            fco.fulfillment_method,
            fco.partial_quantity_allowed,
            fco.price_negotiation_allowed,
            fco.proposed_terms,
            fco.application_deadline,
            fco.opportunity_status,
            fco.created_at,
            -- Supplier
            sp.business_name,
            sp.organization_name,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.official_email,
            sp.official_contact_number,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name,
            -- Check if this farmer already has an active application
            EXISTS(
                SELECT 1 FROM existing_grainrise_farmer_contract_applications fca
                WHERE fca.opportunity_id = fco.opportunity_id
                  AND fca.farm_profile_id = %s
                  AND fca.application_status IN ('Pending', 'Under Review', 'Approved')
            ) AS has_active_application
        FROM existing_grainrise_farmer_contract_opportunities fco
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = fco.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        WHERE {where_sql}
        ORDER BY {order_by_sql}
    """
    params.insert(0, farm_profile_id)

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()

    results = []
    for row in rows:
        d = dict(zip(cols, row))
        item = {
            "opportunity_id": d["opportunity_id"],
            "posting_id": d["opportunity_id"],
            "opportunity_code": d["opportunity_code"],
            "posting_code": d["opportunity_code"],
            "business_name": d.get("business_name") or "",
            "organization_name": d.get("organization_name") or "",
            "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
            "rice_variety": d.get("rice_variety") or "—",
            "product_grade": d.get("product_grade") or "Grade 1",
            "product_type": d.get("product_type") or "Unmilled Palay",
            "product_description": d.get("product_description") or "",
            "product_image": d.get("product_image"),
            "required_quantity_kg": _serialize_val(d.get("required_quantity_kg")),
            "buying_price_per_kg": _serialize_val(d.get("buying_price_per_kg")),
            "application_deadline": _serialize_val(d.get("application_deadline")),
            "required_fulfillment_date": _serialize_val(d.get("required_fulfillment_date")),
            "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
            "partial_quantity_allowed": bool(d.get("partial_quantity_allowed")),
            "price_negotiation_allowed": bool(d.get("price_negotiation_allowed")),
            "proposed_terms": d.get("proposed_terms") or "",
            "business_province": d.get("business_province") or "",
            "business_municipality": d.get("business_municipality") or "",
            "business_barangay": d.get("business_barangay") or "",
            "business_street_address": d.get("business_street_address") or "",
            "fulfillment_province": d.get("business_province") or "",
            "fulfillment_municipality": d.get("business_municipality") or "",
            "fulfillment_barangay": d.get("business_barangay") or "",
            "official_email": d.get("official_email"),
            "official_contact_number": d.get("official_contact_number"),
            "has_active_application": bool(d.get("has_active_application")),
            "created_at": _serialize_val(d.get("created_at")),
        }
        results.append(item)
    return results


def get_farmer_opportunity_details(opportunity_id, farm_profile_id=None):
    query = """
        SELECT
            fco.opportunity_id,
            fco.supplier_profile_id,
            fco.opportunity_code,
            fco.product_type,
            fco.rice_variety,
            fco.product_description,
            fco.product_image,
            fco.product_grade,
            fco.required_quantity_kg,
            fco.buying_price_per_kg,
            fco.required_fulfillment_date,
            fco.fulfillment_method,
            fco.partial_quantity_allowed,
            fco.price_negotiation_allowed,
            fco.proposed_terms,
            fco.application_deadline,
            fco.opportunity_status,
            fco.created_at,
            sp.business_name,
            sp.organization_name,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.postal_code AS business_postal_code,
            sp.official_email,
            sp.official_contact_number,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
        FROM existing_grainrise_farmer_contract_opportunities fco
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = fco.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        WHERE fco.opportunity_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [opportunity_id])
        cols = [c[0] for c in cursor.description]
        row = cursor.fetchone()

    if not row:
        return None

    d = dict(zip(cols, row))
    return {
        "opportunity_id": d["opportunity_id"],
        "posting_id": d["opportunity_id"],
        "opportunity_code": d["opportunity_code"],
        "posting_code": d["opportunity_code"],
        "business_name": d.get("business_name") or "",
        "organization_name": d.get("organization_name") or "",
        "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
        "rice_variety": d.get("rice_variety") or "—",
        "product_grade": d.get("product_grade") or "Grade 1",
        "product_type": d.get("product_type") or "Unmilled Palay",
        "product_description": d.get("product_description") or "",
        "product_image": d.get("product_image"),
        "required_quantity_kg": _serialize_val(d.get("required_quantity_kg")),
        "buying_price_per_kg": _serialize_val(d.get("buying_price_per_kg")),
        "application_deadline": _serialize_val(d.get("application_deadline")),
        "required_fulfillment_date": _serialize_val(d.get("required_fulfillment_date")),
        "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
        "partial_quantity_allowed": bool(d.get("partial_quantity_allowed")),
        "price_negotiation_allowed": bool(d.get("price_negotiation_allowed")),
        "proposed_terms": d.get("proposed_terms") or "",
        "business_province": d.get("business_province") or "",
        "business_municipality": d.get("business_municipality") or "",
        "business_barangay": d.get("business_barangay") or "",
        "business_street_address": d.get("business_street_address") or "",
        "business_postal_code": d.get("business_postal_code") or "",
        "official_email": d.get("official_email"),
        "official_contact_number": d.get("official_contact_number"),
        "created_at": _serialize_val(d.get("created_at")),
    }


# ============================================================
# 3. OFFERS & OPEN BIDDINGS
# ============================================================

def get_farmer_biddings(farm_profile_id, filters=None):
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    status_filter = str(filters.get("status") or "").strip().lower()
    sort_by = str(filters.get("sortBy") or "newest").strip().lower()

    params = [farm_profile_id]
    where_clauses = ["b.farm_profile_id = %s"]

    if search:
        search_pattern = f"%{search}%"
        where_clauses.append("(b.bidding_code LIKE %s OR fp.rice_variety LIKE %s)")
        params.extend([search_pattern, search_pattern])

    if status_filter:
        where_clauses.append("b.bidding_status = %s")
        params.append(status_filter)

    order_map = {
        "newest": "b.created_at DESC",
        "oldest": "b.created_at ASC",
        "deadline_nearest": "b.bidding_deadline_at ASC",
    }
    order_by_sql = order_map.get(sort_by, "b.created_at DESC")
    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            b.bidding_id,
            b.farm_profile_id,
            b.farm_product_id,
            b.bidding_code,
            b.quantity_open_kg,
            b.minimum_price_per_kg,
            b.bidding_start_at,
            b.bidding_deadline_at,
            b.fulfillment_method,
            b.preferred_fulfillment_date,
            b.additional_terms,
            b.notes_to_buyers,
            b.bidding_status,
            b.created_at,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_image,
            -- Offers Count
            (SELECT COUNT(*) FROM existing_grainrise_farmer_bidding_offers o WHERE o.bidding_id = b.bidding_id) AS offers_received,
            -- Remaining Quantity (subtract accepted offers)
            (b.quantity_open_kg - COALESCE(
                (SELECT SUM(o.offered_quantity_kg) FROM existing_grainrise_farmer_bidding_offers o
                 WHERE o.bidding_id = b.bidding_id AND o.offer_status = 'Accepted'), 0
            )) AS remaining_quantity_kg
        FROM existing_grainrise_farmer_open_biddings b
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = b.farm_product_id
        WHERE {where_sql}
        ORDER BY {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [c[0] for c in cursor.description]
        bidding_rows = cursor.fetchall()

    results = []
    for brow in bidding_rows:
        d = dict(zip(cols, brow))
        bid_id = d["bidding_id"]

        # Fetch offers for this bidding
        offer_query = """
            SELECT
                o.bidding_offer_id,
                o.offer_code,
                o.bidding_id,
                o.supplier_profile_id,
                o.offered_quantity_kg,
                o.offered_price_per_kg,
                o.proposed_fulfillment_date,
                o.fulfillment_method,
                o.proposed_terms,
                o.additional_notes,
                o.offer_status,
                o.created_at,
                sp.business_name,
                sp.organization_name,
                sp.province AS business_province,
                sp.municipality AS business_municipality,
                sp.official_email,
                sp.official_contact_number,
                CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
            FROM existing_grainrise_farmer_bidding_offers o
            INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = o.supplier_profile_id
            LEFT JOIN users u ON u.user_id = sp.user_id
            WHERE o.bidding_id = %s
            ORDER BY o.offered_price_per_kg DESC, o.created_at DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(offer_query, [bid_id])
            ocols = [c[0] for c in cursor.description]
            orows = cursor.fetchall()

        offers_list = []
        for orow in orows:
            od = dict(zip(ocols, orow))
            qty = _serialize_val(od["offered_quantity_kg"]) or 0.0
            price = _serialize_val(od["offered_price_per_kg"]) or 0.0
            offers_list.append({
                "offer_id": od["bidding_offer_id"],
                "bidding_offer_id": od["bidding_offer_id"],
                "offer_code": od["offer_code"],
                "bidding_id": od["bidding_id"],
                "supplier_profile_id": od["supplier_profile_id"],
                "miller_name": (od.get("miller_name") or "").strip() or od.get("business_name") or "Miller",
                "business_name": od.get("business_name") or "",
                "organization_name": od.get("organization_name") or "",
                "offered_buying_price_per_kg": price,
                "offered_price_per_kg": price,
                "offered_quantity_kg": qty,
                "estimated_offer_value": round(qty * price, 2),
                "proposed_fulfillment_date": _serialize_val(od.get("proposed_fulfillment_date")),
                "fulfillment_method": od.get("fulfillment_method") or "Buyer Pickup",
                "proposed_terms": od.get("proposed_terms") or "",
                "additional_notes": od.get("additional_notes") or "",
                "remarks": od.get("additional_notes") or "",
                "offer_status": _normalize_status(od.get("offer_status")),
                "raw_offer_status": od.get("offer_status"),
                "created_at": _serialize_val(od.get("created_at")),
                "official_email": od.get("official_email"),
                "official_contact_number": od.get("official_contact_number"),
            })

        open_qty = _serialize_val(d.get("quantity_open_kg")) or 0.0
        rem_qty = max(0.0, _serialize_val(d.get("remaining_quantity_kg")) or 0.0)

        results.append({
            "bidding_id": bid_id,
            "bidding_code": d["bidding_code"],
            "farm_profile_id": d["farm_profile_id"],
            "farm_product_id": d["farm_product_id"],
            "product_code": d.get("product_code") or "—",
            "product_type": d.get("product_type") or "Unmilled Palay",
            "product_grade": d.get("product_grade") or "Grade 1",
            "product_image": d.get("product_image"),
            "rice_variety": d.get("rice_variety") or "—",
            "quantity_open_for_bidding_kg": open_qty,
            "quantity_open_kg": open_qty,
            "remaining_quantity_kg": rem_qty,
            "minimum_acceptable_price_per_kg": _serialize_val(d.get("minimum_price_per_kg")),
            "minimum_price_per_kg": _serialize_val(d.get("minimum_price_per_kg")),
            "bidding_status": d.get("bidding_status") or "open",
            "bidding_deadline": _serialize_val(d.get("bidding_deadline_at")),
            "bidding_deadline_at": _serialize_val(d.get("bidding_deadline_at")),
            "proposed_fulfillment_date": _serialize_val(d.get("preferred_fulfillment_date")),
            "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
            "additional_terms": d.get("additional_terms") or "",
            "notes_to_buyers": d.get("notes_to_buyers") or "",
            "created_at": _serialize_val(d.get("created_at")),
            "offers_received": len(offers_list),
            "offers": offers_list,
        })

    return results


def get_farmer_offer_details(farm_profile_id, offer_id):
    query = """
        SELECT
            o.bidding_offer_id,
            o.offer_code,
            o.bidding_id,
            o.supplier_profile_id,
            o.offered_quantity_kg,
            o.offered_price_per_kg,
            o.proposed_fulfillment_date,
            o.fulfillment_method,
            o.proposed_terms,
            o.additional_notes,
            o.offer_status,
            o.created_at,
            -- Bidding
            b.bidding_code,
            b.quantity_open_kg,
            b.minimum_price_per_kg,
            b.bidding_deadline_at,
            b.bidding_status,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_image,
            -- Supplier
            sp.business_name,
            sp.organization_name,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.official_email,
            sp.official_contact_number,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
        FROM existing_grainrise_farmer_bidding_offers o
        INNER JOIN existing_grainrise_farmer_open_biddings b ON b.bidding_id = o.bidding_id
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = o.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = b.farm_product_id
        WHERE o.bidding_offer_id = %s
          AND b.farm_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(query, [offer_id, farm_profile_id])
        cols = [c[0] for c in cursor.description]
        row = cursor.fetchone()

    if not row:
        return None

    d = dict(zip(cols, row))
    qty = _serialize_val(d["offered_quantity_kg"]) or 0.0
    price = _serialize_val(d["offered_price_per_kg"]) or 0.0

    return {
        "offer_id": d["bidding_offer_id"],
        "bidding_offer_id": d["bidding_offer_id"],
        "offer_code": d["offer_code"],
        "bidding_id": d["bidding_id"],
        "bidding_code": d.get("bidding_code"),
        "product_type": d.get("product_type") or "Unmilled Palay",
        "rice_variety": d.get("rice_variety") or "—",
        "product_grade": d.get("product_grade") or "Grade 1",
        "product_image": d.get("product_image"),
        "quantity_open_for_bidding_kg": _serialize_val(d.get("quantity_open_kg")),
        "minimum_acceptable_price_per_kg": _serialize_val(d.get("minimum_price_per_kg")),
        "bidding_deadline": _serialize_val(d.get("bidding_deadline_at")),
        "supplier_profile_id": d["supplier_profile_id"],
        "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
        "business_name": d.get("business_name") or "",
        "organization_name": d.get("organization_name") or "",
        "offered_buying_price_per_kg": price,
        "offered_price_per_kg": price,
        "offered_quantity_kg": qty,
        "estimated_offer_value": round(qty * price, 2),
        "proposed_fulfillment_date": _serialize_val(d.get("proposed_fulfillment_date")),
        "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
        "proposed_terms": d.get("proposed_terms") or "",
        "additional_notes": d.get("additional_notes") or "",
        "remarks": d.get("additional_notes") or "",
        "offer_status": _normalize_status(d.get("offer_status")),
        "created_at": _serialize_val(d.get("created_at")),
        "business_province": d.get("business_province"),
        "business_municipality": d.get("business_municipality"),
        "business_barangay": d.get("business_barangay"),
        "business_street_address": d.get("business_street_address"),
        "official_email": d.get("official_email"),
        "official_contact_number": d.get("official_contact_number"),
    }


# ============================================================
# 4. CURRENT CONTRACTS
# ============================================================

def get_farmer_contracts(farm_profile_id, filters=None):
    filters = filters or {}
    search = str(filters.get("search") or "").strip()
    status_filter = str(filters.get("status") or "").strip().lower()
    sort_by = str(filters.get("sortBy") or "newest").strip().lower()

    params = [farm_profile_id]
    where_clauses = ["c.farm_profile_id = %s"]

    if search:
        search_pattern = f"%{search}%"
        where_clauses.append(
            """(
                sp.business_name LIKE %s
                OR sp.organization_name LIKE %s
                OR CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) LIKE %s
                OR c.contract_code LIKE %s
                OR fp.rice_variety LIKE %s
            )"""
        )
        params.extend([search_pattern] * 5)

    if status_filter:
        status_map = {
            "active": "Active",
            "completed": "Completed",
            "void_requested": "Void Requested",
            "voided": "Voided",
        }
        db_status = status_map.get(status_filter, status_filter.title())
        where_clauses.append("c.contract_status = %s")
        params.append(db_status)

    order_map = {
        "newest": "c.created_at DESC",
        "oldest": "c.created_at ASC",
        "fulfillment_nearest": "c.fulfillment_date ASC",
    }
    order_by_sql = order_map.get(sort_by, "c.created_at DESC")
    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            c.contract_id,
            c.farm_profile_id,
            c.supplier_profile_id,
            c.farm_product_id,
            c.contract_code,
            c.contract_source,
            c.application_id,
            c.bidding_offer_id,
            c.contracted_quantity_kg,
            c.agreed_price_per_kg,
            c.total_contract_value,
            c.contract_start_date,
            c.fulfillment_date,
            c.fulfillment_method,
            c.fulfillment_location,
            c.agreed_terms,
            c.farmer_signature,
            c.farmer_signed_at,
            c.miller_signature,
            c.miller_signed_at,
            c.contract_status,
            c.void_reason,
            c.voided_at,
            c.created_at,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_image,
            -- Supplier
            sp.business_name,
            sp.organization_name,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.official_email,
            sp.official_contact_number,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
        FROM existing_grainrise_farmer_contracts c
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = c.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = c.farm_product_id
        WHERE {where_sql}
        ORDER BY {order_by_sql}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        cols = [c[0] for c in cursor.description]
        rows = cursor.fetchall()

    results = []
    for row in rows:
        d = dict(zip(cols, row))
        raw_status = str(d.get("contract_status") or "")
        normalized_status = _normalize_status(raw_status)
        qty = _serialize_val(d["contracted_quantity_kg"]) or 0.0
        price = _serialize_val(d["agreed_price_per_kg"]) or 0.0
        val = _serialize_val(d.get("total_contract_value")) or (qty * price)

        results.append({
            "contract_id": d["contract_id"],
            "contract_code": d["contract_code"],
            "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
            "business_name": d.get("business_name") or "",
            "organization_name": d.get("organization_name") or "",
            "rice_variety": d.get("rice_variety") or "—",
            "product_grade": d.get("product_grade") or "Grade 1",
            "product_type": d.get("product_type") or "Unmilled Palay",
            "product_code": d.get("product_code") or "—",
            "product_image": d.get("product_image"),
            "contracted_quantity_kg": qty,
            "remaining_quantity_kg": qty,
            "agreed_price_per_kg": price,
            "total_contract_value": val,
            "contract_status": normalized_status,
            "raw_contract_status": raw_status,
            "fulfillment_status": "fulfilled" if normalized_status == "completed" else "pending",
            "contract_start_date": _serialize_val(d.get("contract_start_date")),
            "fulfillment_date": _serialize_val(d.get("fulfillment_date")),
            "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
            "fulfillment_location": d.get("fulfillment_location") or "",
            "created_at": _serialize_val(d.get("created_at")),
            "void_reason": d.get("void_reason"),
            "voided_at": _serialize_val(d.get("voided_at")),
            "farmer_signature": d.get("farmer_signature"),
            "farmer_signed_at": _serialize_val(d.get("farmer_signed_at")),
            "miller_signature": d.get("miller_signature"),
            "miller_signed_at": _serialize_val(d.get("miller_signed_at")),
            "official_email": d.get("official_email"),
            "official_contact_number": d.get("official_contact_number"),
        })

    return results


def get_farmer_contract_details(farm_profile_id, contract_id):
    query = """
        SELECT
            c.contract_id,
            c.farm_profile_id,
            c.supplier_profile_id,
            c.farm_product_id,
            c.contract_code,
            c.contract_source,
            c.application_id,
            c.bidding_offer_id,
            c.contracted_quantity_kg,
            c.agreed_price_per_kg,
            c.total_contract_value,
            c.contract_start_date,
            c.fulfillment_date,
            c.fulfillment_method,
            c.fulfillment_location,
            c.agreed_terms,
            c.farmer_signature,
            c.farmer_signed_at,
            c.miller_signature,
            c.miller_signed_at,
            c.contract_status,
            c.void_reason,
            c.voided_at,
            c.created_at,
            -- Product
            fp.product_code,
            fp.product_type,
            fp.rice_variety,
            fp.product_grade,
            fp.product_description,
            fp.product_image,
            -- Supplier
            sp.business_name,
            sp.organization_name,
            sp.province AS business_province,
            sp.municipality AS business_municipality,
            sp.barangay AS business_barangay,
            sp.street_address AS business_street_address,
            sp.postal_code AS business_postal_code,
            sp.official_email,
            sp.official_contact_number,
            CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS miller_name
        FROM existing_grainrise_farmer_contracts c
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = c.supplier_profile_id
        LEFT JOIN users u ON u.user_id = sp.user_id
        LEFT JOIN existing_grainrise_farmer_products fp ON fp.farm_product_id = c.farm_product_id
        WHERE c.contract_id = %s
          AND c.farm_profile_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [contract_id, farm_profile_id])
        cols = [c[0] for c in cursor.description]
        row = cursor.fetchone()

    if not row:
        return None

    d = dict(zip(cols, row))
    raw_status = str(d.get("contract_status") or "")
    normalized_status = _normalize_status(raw_status)
    qty = _serialize_val(d["contracted_quantity_kg"]) or 0.0
    price = _serialize_val(d["agreed_price_per_kg"]) or 0.0
    val = _serialize_val(d.get("total_contract_value")) or (qty * price)

    return {
        "contract_id": d["contract_id"],
        "contract_code": d["contract_code"],
        "contract_source": d.get("contract_source") or "Application",
        "miller_name": (d.get("miller_name") or "").strip() or d.get("business_name") or "Miller",
        "business_name": d.get("business_name") or "",
        "organization_name": d.get("organization_name") or "",
        "rice_variety": d.get("rice_variety") or "—",
        "product_grade": d.get("product_grade") or "Grade 1",
        "product_type": d.get("product_type") or "Unmilled Palay",
        "product_description": d.get("product_description") or "",
        "product_code": d.get("product_code") or "—",
        "product_image": d.get("product_image"),
        "contracted_quantity_kg": qty,
        "remaining_quantity_kg": qty,
        "agreed_price_per_kg": price,
        "total_contract_value": val,
        "contract_status": normalized_status,
        "raw_contract_status": raw_status,
        "fulfillment_status": "fulfilled" if normalized_status == "completed" else "pending",
        "contract_start_date": _serialize_val(d.get("contract_start_date")),
        "fulfillment_date": _serialize_val(d.get("fulfillment_date")),
        "fulfillment_method": d.get("fulfillment_method") or "Buyer Pickup",
        "fulfillment_location": d.get("fulfillment_location") or "",
        "agreed_terms": d.get("agreed_terms") or "",
        "farmer_signature": d.get("farmer_signature"),
        "farmer_signed_at": _serialize_val(d.get("farmer_signed_at")),
        "miller_signature": d.get("miller_signature"),
        "miller_signed_at": _serialize_val(d.get("miller_signed_at")),
        "void_reason": d.get("void_reason"),
        "voided_at": _serialize_val(d.get("voided_at")),
        "created_at": _serialize_val(d.get("created_at")),
        "business_province": d.get("business_province"),
        "business_municipality": d.get("business_municipality"),
        "business_barangay": d.get("business_barangay"),
        "business_street_address": d.get("business_street_address"),
        "business_postal_code": d.get("business_postal_code"),
        "official_email": d.get("official_email"),
        "official_contact_number": d.get("official_contact_number"),
    }
