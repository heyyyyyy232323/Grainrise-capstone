from django.db import connection
from api.miller_function.suppliers.selectors import (
    _rows_to_dicts,
    _row_to_dict,
    get_supplier_deliveries_and_ratings,
)


def list_procurement_suppliers(supplier_profile_id):
    """
    Retrieve all farmer_contacts belonging strictly to the procurement employee's
    assigned branch (supplier_profile_id derived from employee JWT session).
    """
    sql = """
        SELECT
            fc.farmer_contact_id,
            fc.farmer_contact_id AS id,
            fc.supplier_profile_id,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person,
            fc.contact_number,
            fc.email,
            fc.address,
            fc.status,
            sp.business_name AS branch_name,
            (
                SELECT ROUND(AVG(fp.farmer_rating), 1)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS performance_rating,
            (
                SELECT ROUND(AVG(fp.farmer_rating), 1)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS avg_rating,
            (
                SELECT COUNT(fp.farmer_rating)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS rating_count,
            (
                SELECT MAX(iph.received_at)
                FROM inbound_purchase_history iph
                WHERE iph.farmer_contact_id = fc.farmer_contact_id
                  AND iph.supplier_profile_id = %s
            ) AS latest_delivery,
            (
                SELECT MIN(iph.received_at)
                FROM inbound_purchase_history iph
                WHERE iph.farmer_contact_id = fc.farmer_contact_id
                  AND iph.supplier_profile_id = %s
            ) AS oldest_delivery
        FROM farmer_contacts fc
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = fc.supplier_profile_id
        WHERE fc.supplier_profile_id = %s
        ORDER BY fc.farmer_contact_id DESC
    """
    params = [supplier_profile_id, supplier_profile_id, supplier_profile_id]

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    for row in rows:
        if row.get("performance_rating") is not None:
            row["performance_rating"] = float(row["performance_rating"])
        if row.get("avg_rating") is not None:
            row["avg_rating"] = float(row["avg_rating"])
        if row.get("rating_count") is not None:
            row["rating_count"] = int(row["rating_count"])
        if row.get("latest_delivery"):
            ld = row["latest_delivery"]
            if hasattr(ld, "strftime"):
                row["latest_delivery_formatted"] = ld.strftime("%b %d, %Y")
            row["latest_delivery"] = str(row["latest_delivery"])
        if row.get("oldest_delivery"):
            row["oldest_delivery"] = str(row["oldest_delivery"])

    return rows


def get_procurement_supplier_detail(supplier_profile_id, supplier_id):
    """
    Retrieve a single farmer_contact by id, ensuring it strictly belongs
    to the procurement employee's branch.
    """
    sql = """
        SELECT
            fc.farmer_contact_id,
            fc.farmer_contact_id AS id,
            fc.supplier_profile_id,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person,
            fc.contact_number,
            fc.email,
            fc.address,
            fc.status,
            sp.business_name AS branch_name,
            (
                SELECT ROUND(AVG(fp.farmer_rating), 1)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS performance_rating,
            (
                SELECT ROUND(AVG(fp.farmer_rating), 1)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS avg_rating,
            (
                SELECT COUNT(fp.farmer_rating)
                FROM farmer_performance fp
                WHERE fp.farmer_contact_id = fc.farmer_contact_id
            ) AS rating_count,
            (
                SELECT MAX(iph.received_at)
                FROM inbound_purchase_history iph
                WHERE iph.farmer_contact_id = fc.farmer_contact_id
                  AND iph.supplier_profile_id = %s
            ) AS latest_delivery
        FROM farmer_contacts fc
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = fc.supplier_profile_id
        WHERE fc.farmer_contact_id = %s
          AND fc.supplier_profile_id = %s
        LIMIT 1
    """
    params = [supplier_profile_id, supplier_id, supplier_profile_id]

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = _row_to_dict(cursor)

    if row:
        if row.get("performance_rating") is not None:
            row["performance_rating"] = float(row["performance_rating"])
        if row.get("avg_rating") is not None:
            row["avg_rating"] = float(row["avg_rating"])
        if row.get("rating_count") is not None:
            row["rating_count"] = int(row["rating_count"])
        if row.get("latest_delivery"):
            ld = row["latest_delivery"]
            if hasattr(ld, "strftime"):
                row["latest_delivery_formatted"] = ld.strftime("%b %d, %Y")
            row["latest_delivery"] = str(row["latest_delivery"])

        # Fetch deliveries and ratings scoped to this branch
        row["deliveries_and_ratings"] = get_supplier_deliveries_and_ratings(
            supplier_id, supplier_profile_id=supplier_profile_id
        )

    return row

