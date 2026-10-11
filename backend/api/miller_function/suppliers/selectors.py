from django.db import connection


def _rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def get_supplier_deliveries_and_ratings(farmer_contact_id, supplier_profile_id=None):
    """
    Retrieve historical deliveries and their ratings from farmer_performance
    for a given farmer_contact_id.
    """
    sql = """
        SELECT
            iph.receiving_id,
            iph.receiving_reference_no,
            iph.received_at,
            fp.farmer_rating AS rating,
            io.batch_no,
            io.product_name
        FROM inbound_purchase_history iph
        LEFT JOIN inbound_order io
            ON io.inbound_order_id = iph.order_id
        LEFT JOIN farmer_performance fp
            ON fp.receiving_id = iph.receiving_id
        WHERE iph.farmer_contact_id = %s
    """
    params = [farmer_contact_id]
    if supplier_profile_id:
        sql += " AND iph.supplier_profile_id = %s"
        params.append(supplier_profile_id)
    sql += " ORDER BY iph.received_at DESC, iph.receiving_id DESC"

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)

    for r in rows:
        if r.get("received_at"):
            rec_dt = r["received_at"]
            if hasattr(rec_dt, "strftime"):
                r["received_date"] = rec_dt.strftime("%b %d, %Y")
            r["received_at"] = str(r["received_at"])
        if r.get("rating") is not None:
            r["rating"] = int(r["rating"])

    return rows


def list_miller_suppliers(miller_user_id, branch_id=None):
    """
    Retrieve all farmer_contacts belonging to branches (supplier_profiles)
    owned by the authenticated Miller Manager.

    Security:
    - Authoritative owner is resolved strictly from request.grainrise_miller_id (derived from JWT).
    - Returns only records where supplier_profiles.user_id = miller_user_id.
    - If branch_id is specified, filters by supplier_profile_id while strictly enforcing user_id ownership.
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
            ) AS latest_delivery,
            (
                SELECT MIN(iph.received_at)
                FROM inbound_purchase_history iph
                WHERE iph.farmer_contact_id = fc.farmer_contact_id
            ) AS oldest_delivery
        FROM farmer_contacts fc
        INNER JOIN supplier_profiles sp
            ON sp.supplier_profile_id = fc.supplier_profile_id
        WHERE sp.user_id = %s
    """
    params = [miller_user_id]

    if branch_id and str(branch_id).lower() != "all":
        try:
            b_id = int(branch_id)
            sql += " AND fc.supplier_profile_id = %s"
            params.append(b_id)
        except (ValueError, TypeError):
            pass

    sql += " ORDER BY fc.farmer_contact_id DESC"

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


def get_miller_supplier_by_id(miller_user_id, supplier_id):
    """
    Retrieve a single farmer_contact by id and verify ownership by the authenticated Miller.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
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
                ) AS latest_delivery
            FROM farmer_contacts fc
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = fc.supplier_profile_id
            WHERE fc.farmer_contact_id = %s
              AND sp.user_id = %s
            LIMIT 1
            """,
            [supplier_id, miller_user_id],
        )
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

        # Attach deliveries and ratings list
        row["deliveries_and_ratings"] = get_supplier_deliveries_and_ratings(
            farmer_contact_id=row["farmer_contact_id"],
            supplier_profile_id=row["supplier_profile_id"],
        )

    return row


def list_supplier_active_orders(miller_user_id, supplier_id):
    """
    Load active orders from inbound_order for a given supplier where status = 'ordered',
    protected by Miller ownership.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                io.inbound_order_id,
                io.inbound_order_id AS id,
                io.supplier_profile_id,
                io.farmer_contact_id,
                io.batch_no,
                io.product_name,
                io.product_description,
                io.product_photo,
                io.ordered_quantity,
                io.expected_arrival_date,
                io.status,
                io.created_at,
                io.updated_at
            FROM inbound_order io
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = io.supplier_profile_id
            WHERE io.farmer_contact_id = %s
              AND sp.user_id = %s
              AND io.status IN ('ordered', 'partially_received', 'partially received')
            ORDER BY io.expected_arrival_date ASC, io.inbound_order_id DESC
            """,
            [supplier_id, miller_user_id],
        )
        rows = _rows_to_dicts(cursor)
        for row in rows:
            if row.get("ordered_quantity") is not None:
                row["ordered_quantity"] = float(row["ordered_quantity"])
            if row.get("expected_arrival_date"):
                row["expected_arrival_date"] = str(row["expected_arrival_date"])
            if row.get("created_at"):
                row["created_at"] = str(row["created_at"])
            if row.get("updated_at"):
                row["updated_at"] = str(row["updated_at"])
        return rows


def list_supplier_purchase_history(miller_user_id, supplier_id):
    """
    Load purchase history for a given supplier using inbound_purchase_history
    joined with inbound_order, where inbound_order.status IN ('received', 'partially_received'),
    protected by Miller ownership.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                iph.receiving_id,
                iph.receiving_id AS id,
                iph.order_id,
                iph.receiving_reference_no,
                iph.total_received,
                iph.received_good,
                iph.received_bad,
                iph.price_per_kg,
                iph.total_price,
                iph.status AS payment_status,
                iph.received_at,
                io.batch_no,
                io.product_name,
                io.product_description,
                io.product_photo,
                io.ordered_quantity,
                io.expected_arrival_date,
                io.status AS fulfillment_status
            FROM inbound_purchase_history iph
            INNER JOIN inbound_order io
                ON io.inbound_order_id = iph.order_id
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = iph.supplier_profile_id
            WHERE iph.farmer_contact_id = %s
              AND sp.user_id = %s
              AND io.status IN ('received', 'partially_received', 'partially received')
            ORDER BY iph.receiving_id DESC
            """,
            [supplier_id, miller_user_id],
        )
        rows = _rows_to_dicts(cursor)
        for row in rows:
            for num_col in ("total_received", "received_good", "received_bad", "price_per_kg", "total_price", "ordered_quantity"):
                if row.get(num_col) is not None:
                    row[num_col] = float(row[num_col])
            if row.get("expected_arrival_date"):
                row["expected_arrival_date"] = str(row["expected_arrival_date"])
            if row.get("received_at"):
                rec_dt = row["received_at"]
                if hasattr(rec_dt, "strftime"):
                    row["received_date"] = rec_dt.strftime("%b %d, %Y")
                row["received_at"] = str(row["received_at"])
        return rows
