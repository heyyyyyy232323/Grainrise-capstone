from django.db import connection


def _rows_to_dicts(cursor):
    """Convert cursor results to a list of dicts."""
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _row_to_dict(cursor):
    """Convert a single cursor result to a dict."""
    row = cursor.fetchone()
    if row is None:
        return None
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))


def _compute_supplier_display_name(organization, supplier_farm, contact_person):
    """
    Determine supplier display name according to the priority:
    organization -> supplier_farm -> contact_person
    """
    org = str(organization or "").strip()
    if org:
        return org
    farm = str(supplier_farm or "").strip()
    if farm:
        return farm
    contact = str(contact_person or "").strip()
    if contact:
        return contact
    return ""


def _format_product_row(row):
    """Format numeric and date types for clean JSON response."""
    if not row:
        return None
    product = dict(row)
    product["id"] = product.get("product_id")

    if product.get("stock_quantity") is not None:
        product["stock_quantity"] = float(product["stock_quantity"])

    if product.get("unit_cost") is not None:
        product["unit_cost"] = float(product["unit_cost"])
    else:
        product["unit_cost"] = None

    for date_field in ("order_date", "arrival_date", "expiry_date"):
        if product.get(date_field):
            product[date_field] = str(product[date_field])
        else:
            product[date_field] = None

    product["supplier_display_name"] = _compute_supplier_display_name(
        product.get("organization"),
        product.get("supplier_farm"),
        product.get("contact_person"),
    )
    return product


def _format_supplier_row(row):
    """Format farmer_contacts row with computed display name."""
    if not row:
        return None
    supplier = dict(row)
    supplier["id"] = supplier.get("farmer_contact_id")
    supplier["supplier_display_name"] = _compute_supplier_display_name(
        supplier.get("organization"),
        supplier.get("supplier_farm"),
        supplier.get("contact_person"),
    )
    return supplier


def list_encoder_products(supplier_profile_id, status_filter=None):
    """
    Retrieve products belonging strictly to the authenticated supplier_profile_id.

    Optional status_filter: 'unmilled', 'active', 'archived'.
    Joins farmer_contacts for supplier details and supplier_display_name.
    Ordered by product_id DESC.
    """
    params = [supplier_profile_id]
    status_clause = ""
    if status_filter:
        clean_status = str(status_filter).strip().lower()
        status_clause = " AND mp.status = %s"
        params.append(clean_status)

    sql = f"""
        SELECT
            mp.product_id,
            mp.supplier_profile_id,
            mp.farmer_contact_id,
            mp.inbound_purchase_history_id,
            mp.product_code,
            mp.product_name,
            mp.product_description,
            mp.product_image,
            mp.order_date,
            mp.arrival_date,
            mp.expiry_date,
            mp.stock_quantity,
            mp.unit_cost,
            mp.shelf_location,
            mp.archive_reason,
            mp.status,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person
        FROM miller_products mp
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = mp.farmer_contact_id
           AND fc.supplier_profile_id = mp.supplier_profile_id
        WHERE mp.supplier_profile_id = %s{status_clause}
        ORDER BY mp.product_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        rows = _rows_to_dicts(cursor)
        return [_format_product_row(row) for row in rows]


def get_encoder_product(supplier_profile_id, product_id):
    """
    Retrieve a single product by validating BOTH product_id and supplier_profile_id.
    """
    sql = """
        SELECT
            mp.product_id,
            mp.supplier_profile_id,
            mp.farmer_contact_id,
            mp.inbound_purchase_history_id,
            mp.product_code,
            mp.product_name,
            mp.product_description,
            mp.product_image,
            mp.order_date,
            mp.arrival_date,
            mp.expiry_date,
            mp.stock_quantity,
            mp.unit_cost,
            mp.shelf_location,
            mp.archive_reason,
            mp.status,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person
        FROM miller_products mp
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = mp.farmer_contact_id
           AND fc.supplier_profile_id = mp.supplier_profile_id
        WHERE mp.product_id = %s
          AND mp.supplier_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [product_id, supplier_profile_id])
        row = _row_to_dict(cursor)
        return _format_product_row(row)


def list_encoder_suppliers(supplier_profile_id):
    """
    Retrieve active farmer_contacts records belonging to the authenticated supplier_profile_id.
    """
    sql = """
        SELECT
            fc.farmer_contact_id,
            fc.supplier_profile_id,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person,
            fc.contact_number,
            fc.email,
            fc.address,
            fc.status
        FROM farmer_contacts fc
        WHERE fc.supplier_profile_id = %s
          AND LOWER(fc.status) = 'active'
        ORDER BY fc.farmer_contact_id DESC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)
        return [_format_supplier_row(row) for row in rows]

