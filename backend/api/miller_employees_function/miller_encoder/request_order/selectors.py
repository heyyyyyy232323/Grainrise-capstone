import datetime
from django.db import connection
from django.utils import timezone


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


def normalize_product_name(name):
    """Normalize product name: trimmed, case-insensitive string."""
    return str(name or "").strip().lower()


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
    return "Unknown Supplier"


def format_display_expiry_date(expiry_date):
    """
    Format date as: Abbreviated month, numeric day, four-digit year.
    Examples: May 2, 2026; Oct 20, 2026; Jan 5, 2027.
    Never outputs YYYY-MM-DD.
    """
    if not expiry_date:
        return None

    if isinstance(expiry_date, str):
        try:
            expiry_date = datetime.date.fromisoformat(expiry_date.strip())
        except ValueError:
            return None

    month_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    return f"{month_names[expiry_date.month - 1]} {expiry_date.day}, {expiry_date.year}"


def get_branch_business_info(supplier_profile_id):
    """
    Retrieve branch business and location details strictly for the authenticated supplier_profile_id.
    """
    sql = """
        SELECT
            sp.supplier_profile_id,
            sp.business_name,
            sp.organization_name,
            sp.province,
            sp.municipality,
            sp.barangay,
            sp.street_address,
            sp.postal_code,
            sp.official_email,
            sp.official_contact_number
        FROM supplier_profiles sp
        WHERE sp.supplier_profile_id = %s
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id])
        return _row_to_dict(cursor)


def is_row_healthy(stock_quantity, expiry_date, today=None):
    """
    Determine if a stock row is healthy:
    - stock_quantity >= 200
    - AND (expiry_date IS NULL OR expiry_date > today + 45 days)
    """
    if today is None:
        today = timezone.localdate()

    stock = float(stock_quantity or 0.0)
    if stock < 200:
        return False

    if expiry_date:
        if isinstance(expiry_date, str):
            try:
                expiry_date = datetime.date.fromisoformat(expiry_date)
            except ValueError:
                expiry_date = None

    if expiry_date:
        days_to_expiry = (expiry_date - today).days
        if days_to_expiry <= 45:
            return False

    return True


def evaluate_product_row_condition(stock_quantity, expiry_date, today=None):
    """
    Evaluate condition of an unhealthy row:
    Prioritizes condition in deterministic order:
    1. Expired (expiry_date < today)
    2. No Stock (stock_quantity == 0)
    3. Near Expiry (expiry_date <= today + 45 days and not expired)
    4. Low Stock (0 < stock_quantity < 200)
    """
    if today is None:
        today = timezone.localdate()

    stock = float(stock_quantity or 0.0)

    parsed_expiry = None
    if expiry_date:
        if isinstance(expiry_date, str):
            try:
                parsed_expiry = datetime.date.fromisoformat(expiry_date)
            except ValueError:
                parsed_expiry = None
        else:
            parsed_expiry = expiry_date

    is_expired = False
    is_near_expiry = False
    days_to_expiry = None
    if parsed_expiry:
        days_to_expiry = (parsed_expiry - today).days
        if days_to_expiry < 0:
            is_expired = True
        elif 0 <= days_to_expiry <= 45:
            is_near_expiry = True

    # Determine primary condition
    if is_expired:
        primary_reason = "Expired"
        priority_rank = 1
    elif stock == 0:
        primary_reason = "No Stock"
        priority_rank = 2
    elif is_near_expiry:
        primary_reason = "Near Expiry"
        priority_rank = 3
    elif 0 < stock < 200:
        primary_reason = "Low Stock"
        priority_rank = 4
    else:
        primary_reason = "Healthy Stock"
        priority_rank = 5

    expiry_status = None
    if is_expired:
        expiry_status = "Expired"
    elif is_near_expiry:
        expiry_status = "Near Expiry"

    return {
        "primary_reason": primary_reason,
        "priority_rank": priority_rank,
        "expiry_status": expiry_status,
        "days_to_expiry": days_to_expiry,
        "parsed_expiry": parsed_expiry,
    }


def list_eligible_request_products(supplier_profile_id):
    """
    Retrieve request-order-eligible product+supplier combinations.

    Eligibility Rules at Product Variant + Supplier Combination Level:
    1. authenticated supplier_profile_id isolation.
    2. Never include 'unmilled' products.
    3. Exclude pair if an inbound_order exists for the same (normalized product_name + farmer_contact_id)
       whose status is anything EXCEPT 'received' (trimmed, case-insensitive).
    4. If ANY active/archived row for the same pair is HEALTHY (stock >= 200 and expiry > 45 days/null),
       exclude the entire product+supplier pair.
    5. A pair qualifies only if all rows are unhealthy.
    6. If multiple unhealthy rows exist for the same pair, return ONE deterministic row:
       - Prefer 'active' over 'archived'
       - Then prioritize condition: 1. Expired, 2. No Stock, 3. Near Expiry, 4. Low Stock
       - Then lowest product_id tie-breaker.
    """
    today = timezone.localdate()

    # Step 1: Query pending non-received inbound orders
    sql_pending = """
        SELECT DISTINCT
            TRIM(LOWER(product_name)) AS norm_name,
            farmer_contact_id
        FROM inbound_order
        WHERE supplier_profile_id = %s
          AND TRIM(LOWER(status)) != 'received'
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_pending, [supplier_profile_id])
        pending_rows = cursor.fetchall()
        blocked_pairs = set((row[0], row[1]) for row in pending_rows)

    # Step 2: Query all active and archived stock for this branch
    sql_products = """
        SELECT
            mp.product_id,
            mp.supplier_profile_id,
            mp.farmer_contact_id,
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
            mp.status,
            fc.supplier_farm,
            fc.organization,
            fc.contact_person
        FROM miller_products mp
        LEFT JOIN farmer_contacts fc
            ON fc.farmer_contact_id = mp.farmer_contact_id
           AND fc.supplier_profile_id = mp.supplier_profile_id
        WHERE mp.supplier_profile_id = %s
          AND LOWER(mp.status) IN ('active', 'archived')
        ORDER BY mp.product_name ASC, mp.product_id ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_products, [supplier_profile_id])
        rows = _rows_to_dicts(cursor)

    # Step 3: Group rows by (normalized_product_name, farmer_contact_id)
    grouped = {}
    for r in rows:
        pair_key = (normalize_product_name(r["product_name"]), r["farmer_contact_id"])
        if pair_key not in grouped:
            grouped[pair_key] = []
        grouped[pair_key].append(r)

    eligible_options = []

    for pair_key, group_rows in grouped.items():
        norm_name, farmer_id = pair_key

        # Rule A: Check pending non-received inbound order exclusion
        if (norm_name, farmer_id) in blocked_pairs:
            continue

        # Rule B: Check if ANY row in this group is healthy -> exclude entire pair
        has_healthy_row = any(
            is_row_healthy(row.get("stock_quantity"), row.get("expiry_date"), today=today)
            for row in group_rows
        )
        if has_healthy_row:
            continue

        # Rule C: All rows in this group are unhealthy -> choose exact source deterministically
        def row_sort_key(item):
            status_prio = 0 if str(item.get("status") or "").strip().lower() == "active" else 1
            cond_info = evaluate_product_row_condition(
                item.get("stock_quantity"),
                item.get("expiry_date"),
                today=today,
            )
            return (status_prio, cond_info["priority_rank"], item["product_id"])

        sorted_rows = sorted(group_rows, key=row_sort_key)
        winner = sorted_rows[0]

        winner_cond = evaluate_product_row_condition(
            winner.get("stock_quantity"),
            winner.get("expiry_date"),
            today=today,
        )

        all_matching_ids = [r["product_id"] for r in group_rows]

        stock_qty = float(winner.get("stock_quantity") or 0.0)
        exp_date_raw = winner.get("expiry_date")
        exp_date_display = format_display_expiry_date(exp_date_raw)

        supplier_display = _compute_supplier_display_name(
            winner.get("organization"),
            winner.get("supplier_farm"),
            winner.get("contact_person"),
        )

        eligible_options.append({
            "product_id": winner["product_id"],
            "id": winner["product_id"],
            "supplier_profile_id": winner["supplier_profile_id"],
            "farmer_contact_id": winner["farmer_contact_id"],
            "product_name": winner["product_name"],
            "normalized_product_name": norm_name,
            "product_code": winner["product_code"],
            "product_description": winner["product_description"],
            "product_image": winner["product_image"],
            "stock_quantity": stock_qty,
            "stock_condition": winner_cond["primary_reason"],
            "eligibility_reason": winner_cond["primary_reason"],
            "expiry_date": str(exp_date_raw) if exp_date_raw else None,
            "expiry_date_display": exp_date_display,
            "expiry_status": winner_cond["expiry_status"],
            "status": winner["status"],
            "unit_cost": float(winner["unit_cost"]) if winner.get("unit_cost") is not None else None,
            "shelf_location": winner.get("shelf_location"),
            "supplier_display_name": supplier_display,
            "all_matching_product_ids": all_matching_ids,
            "is_eligible": True,
        })

    # Sort final options alphabetically by product name, then supplier
    eligible_options.sort(key=lambda x: (x["product_name"].lower(), x["supplier_display_name"].lower()))
    return eligible_options


def get_all_matching_product_ids_for_pair(supplier_profile_id, product_name, farmer_contact_id):
    """
    Retrieve all historical product IDs belonging to the same Product Variant + Supplier pair.
    """
    sql = """
        SELECT product_id
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND TRIM(LOWER(product_name)) = %s
          AND farmer_contact_id = %s
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, [supplier_profile_id, normalize_product_name(product_name), farmer_contact_id])
        rows = cursor.fetchall()
        return [row[0] for row in rows]


def get_product_for_request(supplier_profile_id, product_id, supplier_id=None):
    """
    Retrieve and validate the specific product row for request order creation.
    Confirms product belongs to branch and is part of an eligible pair.
    """
    params = [product_id, supplier_profile_id]
    supplier_clause = ""
    if supplier_id is not None:
        supplier_clause = " AND mp.farmer_contact_id = %s"
        params.append(supplier_id)

    sql = f"""
        SELECT
            mp.product_id,
            mp.supplier_profile_id,
            mp.farmer_contact_id,
            mp.product_code,
            mp.product_name,
            mp.product_description,
            mp.product_image,
            mp.expiry_date,
            mp.stock_quantity,
            mp.unit_cost,
            mp.shelf_location,
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
          AND LOWER(mp.status) IN ('active', 'archived')
          {supplier_clause}
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        row = _row_to_dict(cursor)

    if not row:
        return None

    today = timezone.localdate()
    norm_name = normalize_product_name(row["product_name"])
    farmer_id = row["farmer_contact_id"]

    # Check pending non-received inbound orders
    sql_pending = """
        SELECT 1
        FROM inbound_order
        WHERE supplier_profile_id = %s
          AND TRIM(LOWER(product_name)) = %s
          AND farmer_contact_id = %s
          AND TRIM(LOWER(status)) != 'received'
        LIMIT 1
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_pending, [supplier_profile_id, norm_name, farmer_id])
        if cursor.fetchone():
            return None  # Blocked by non-received inbound order

    # Check if ANY row for this pair is healthy
    sql_check_healthy = """
        SELECT product_id, stock_quantity, expiry_date
        FROM miller_products
        WHERE supplier_profile_id = %s
          AND TRIM(LOWER(product_name)) = %s
          AND farmer_contact_id = %s
          AND LOWER(status) IN ('active', 'archived')
    """
    with connection.cursor() as cursor:
        cursor.execute(sql_check_healthy, [supplier_profile_id, norm_name, farmer_id])
        pair_rows = _rows_to_dicts(cursor)
        for pr in pair_rows:
            if is_row_healthy(pr["stock_quantity"], pr["expiry_date"], today=today):
                return None  # Pair has a healthy row, excluded

    all_matching_ids = [pr["product_id"] for pr in pair_rows]
    cond_info = evaluate_product_row_condition(row["stock_quantity"], row["expiry_date"], today=today)

    row["id"] = row["product_id"]
    row["stock_quantity"] = float(row.get("stock_quantity") or 0.0)
    row["unit_cost"] = float(row["unit_cost"]) if row.get("unit_cost") is not None else None
    row["expiry_date_display"] = format_display_expiry_date(row.get("expiry_date"))
    row["expiry_date"] = str(row["expiry_date"]) if row.get("expiry_date") else None
    row["expiry_status"] = cond_info["expiry_status"]
    row["stock_condition"] = cond_info["primary_reason"]
    row["eligibility_reason"] = cond_info["primary_reason"]
    row["supplier_display_name"] = _compute_supplier_display_name(
        row.get("organization"),
        row.get("supplier_farm"),
        row.get("contact_person"),
    )
    row["all_matching_product_ids"] = all_matching_ids
    row["is_eligible"] = True
    return row


def get_historical_product_demand(supplier_profile_id, product_ids):
    """
    Calculate historical demand over the last 12 months aggregated across ALL matching
    product IDs for the Product Variant + Supplier pair.
    Sources:
    1. miller_ftf_sales: quantity_sold
    2. miller_online_customer: ordered_quantity WHERE TRIM(LOWER(status)) = 'delivered'

    Aggregated monthly.
    Months with zero/no sales are EXCLUDED.
    """
    if not product_ids:
        return []

    if isinstance(product_ids, (int, str)):
        product_ids = [int(product_ids)]

    now = timezone.now()
    twelve_months_ago = (now - datetime.timedelta(days=365)).replace(day=1, hour=0, minute=0, second=0)

    placeholders = ", ".join(["%s"] * len(product_ids))

    # 1. FTF Sales
    sql_ftf = f"""
        SELECT
            DATE_FORMAT(created_at, '%%%%Y-%%%%m') AS sale_month,
            SUM(quantity_sold) AS total_sold
        FROM miller_ftf_sales
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND created_at >= %s
        GROUP BY DATE_FORMAT(created_at, '%%%%Y-%%%%m')
    """

    # 2. Online Sales (only 'Delivered')
    sql_online = f"""
        SELECT
            DATE_FORMAT(created_at, '%%%%Y-%%%%m') AS sale_month,
            SUM(ordered_quantity) AS total_sold
        FROM miller_online_customer
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND TRIM(LOWER(status)) = 'delivered'
          AND created_at >= %s
        GROUP BY DATE_FORMAT(created_at, '%%%%Y-%%%%m')
    """

    monthly_totals = {}

    params_ftf = [supplier_profile_id] + list(product_ids) + [twelve_months_ago]
    params_online = [supplier_profile_id] + list(product_ids) + [twelve_months_ago]

    with connection.cursor() as cursor:
        cursor.execute(sql_ftf, params_ftf)
        for row in cursor.fetchall():
            m_key = row[0]
            qty = float(row[1] or 0.0)
            if qty > 0:
                monthly_totals[m_key] = monthly_totals.get(m_key, 0.0) + qty

        cursor.execute(sql_online, params_online)
        for row in cursor.fetchall():
            m_key = row[0]
            qty = float(row[1] or 0.0)
            if qty > 0:
                monthly_totals[m_key] = monthly_totals.get(m_key, 0.0) + qty

    # Sort chronologically
    sorted_months = sorted(monthly_totals.keys())

    results = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m_key in sorted_months:
        val = monthly_totals[m_key]
        if val <= 0:
            continue
        try:
            y, m = map(int, m_key.split("-"))
            label = f"{month_names[m - 1]} {y}"
            short_label = month_names[m - 1]
        except Exception:
            label = m_key
            short_label = m_key

        results.append({
            "month_key": m_key,
            "month": label,
            "short_label": short_label,
            "total_sold": round(val, 2),
        })

    return results


def get_current_month_sales(supplier_profile_id, product_ids):
    """
    Retrieve actual current-month sales aggregated across ALL matching product IDs
    for the selected Product Variant + Supplier pair.
    Sources: FTF sales + Delivered online orders.
    """
    if not product_ids:
        return {"total_actual_sales": 0.0}

    if isinstance(product_ids, (int, str)):
        product_ids = [int(product_ids)]

    now = timezone.now()
    start_of_current_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    placeholders = ", ".join(["%s"] * len(product_ids))

    sql_ftf = f"""
        SELECT SUM(quantity_sold)
        FROM miller_ftf_sales
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND created_at >= %s
    """

    sql_online = f"""
        SELECT SUM(ordered_quantity)
        FROM miller_online_customer
        WHERE supplier_profile_id = %s
          AND miller_product_id IN ({placeholders})
          AND TRIM(LOWER(status)) = 'delivered'
          AND created_at >= %s
    """

    total_actual = 0.0
    params = [supplier_profile_id] + list(product_ids) + [start_of_current_month]

    with connection.cursor() as cursor:
        cursor.execute(sql_ftf, params)
        ftf_val = cursor.fetchone()[0]
        if ftf_val:
            total_actual += float(ftf_val)

        cursor.execute(sql_online, params)
        online_val = cursor.fetchone()[0]
        if online_val:
            total_actual += float(online_val)

    return {
        "total_actual_sales": round(total_actual, 2),
    }
