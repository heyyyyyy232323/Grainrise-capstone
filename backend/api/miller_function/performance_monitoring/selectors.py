"""
Selectors for Miller Manager Performance Monitoring across all owned branches.
Read-only queries with server-side reviewer name masking.
"""

from datetime import datetime
from decimal import Decimal
from django.db import connection


def mask_online_order_reviewer(first_name=None, business_name=None) -> str:
    """
    Mask reviewer identity for anonymity:
    - Retailer: first letter of first_name + '***' (e.g. Riggie -> R***)
    - Warehouse: first letter of first word of business_name + '***' (e.g. Riggie Grains -> R***)
    """
    if first_name and str(first_name).strip():
        char = str(first_name).strip()[0].upper()
        return f"{char}***"

    if business_name and str(business_name).strip():
        first_word = str(business_name).strip().split()[0]
        char = first_word[0].upper() if first_word else "W"
        return f"{char}***"

    return "A***"


def get_manager_branches(miller_user_id: int) -> list[dict]:
    """
    Fetch ALL branches owned by the authenticated Miller Manager,
    including branches without transactions or reviews.
    """
    if not miller_user_id:
        return []

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                supplier_profile_id,
                business_name
            FROM supplier_profiles
            WHERE user_id = %s
            ORDER BY business_name ASC
            """,
            [miller_user_id],
        )
        rows = cursor.fetchall()

    return [
        {
            "supplier_profile_id": r[0],
            "business_name": r[1] or f"Branch #{r[0]}",
        }
        for r in rows
    ]


def get_manager_products(miller_user_id: int, branch_id: int | None = None) -> list[str]:
    """
    Fetch distinct product names belonging to manager's owned branches.
    """
    if not miller_user_id:
        return []

    where_clauses = ["sp.user_id = %s", "mp.product_name IS NOT NULL", "TRIM(mp.product_name) != ''"]
    params = [miller_user_id]

    if branch_id:
        where_clauses.append("mp.supplier_profile_id = %s")
        params.append(branch_id)

    query = f"""
        SELECT DISTINCT mp.product_name
        FROM miller_products mp
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = mp.supplier_profile_id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY mp.product_name ASC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    return [r[0] for r in rows if r[0]]


def get_manager_online_order_ratings(
    miller_user_id: int,
    branch_id: int | None = None,
    product_name: str | None = None,
) -> list[dict]:
    """
    Fetch customer online order ratings for manager-owned branches.
    Server-side masks reviewer names so unmasked identities are never sent over the wire.
    """
    if not miller_user_id:
        return []

    where_clauses = ["sp.user_id = %s"]
    params = [miller_user_id]

    if branch_id:
        where_clauses.append("moor.supplier_profile_id = %s")
        params.append(branch_id)

    if product_name and product_name != "all":
        where_clauses.append("mp.product_name = %s")
        params.append(product_name)

    query = f"""
        SELECT
            moor.rating_id,
            moor.supplier_profile_id,
            sp.business_name AS branch_name,
            moor.online_order_id,
            moc.batch_no AS order_batch_no,
            moor.miller_product_id,
            COALESCE(mp.product_name, 'Unknown Product') AS product_name,
            u.first_name AS retailer_first_name,
            wp.business_name AS warehouse_business_name,
            moor.rating,
            moor.comment,
            moor.created_at
        FROM miller_online_orders_rating moor
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = moor.supplier_profile_id
        LEFT JOIN miller_online_customer moc ON moc.online_order_id = moor.online_order_id
        LEFT JOIN miller_products mp ON mp.product_id = moor.miller_product_id
        LEFT JOIN users u ON u.user_id = moor.user_buyer_id
        LEFT JOIN warehouse_profiles wp ON wp.warehouse_profile_id = moor.warehouse_buyer_id
        WHERE {' AND '.join(where_clauses)}
        ORDER BY moor.created_at DESC, moor.rating_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    if not rows:
        return []

    rating_ids = [r[0] for r in rows]
    attachments_map = {}

    placeholders = ",".join(["%s"] * len(rating_ids))
    att_query = f"""
        SELECT rating_id, attachment
        FROM miller_online_orders_rating_attachment
        WHERE rating_id IN ({placeholders})
        ORDER BY rating_attachment_id ASC
    """
    with connection.cursor() as cursor:
        cursor.execute(att_query, rating_ids)
        att_rows = cursor.fetchall()

    for r_id, att in att_rows:
        if r_id not in attachments_map:
            attachments_map[r_id] = []
        if att:
            attachments_map[r_id].append(att)

    results = []
    for r in rows:
        (
            rating_id,
            supplier_profile_id,
            branch_name,
            online_order_id,
            order_batch_no,
            miller_product_id,
            p_name,
            retailer_first_name,
            warehouse_business_name,
            rating_val,
            comment,
            created_at,
        ) = r

        masked = mask_online_order_reviewer(
            first_name=retailer_first_name,
            business_name=warehouse_business_name,
        )

        date_str = ""
        if created_at:
            if hasattr(created_at, "strftime"):
                date_str = created_at.strftime("%b %d, %Y")
            else:
                date_str = str(created_at)[:10]

        results.append({
            "id": rating_id,
            "rating_id": rating_id,
            "customer": masked,
            "masked_reviewer": masked,
            "rating": float(rating_val) if rating_val is not None else 0.0,
            "comment": comment or "",
            "date": date_str,
            "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            "branch_name": branch_name or f"Branch #{supplier_profile_id}",
            "supplier_profile_id": supplier_profile_id,
            "order_id": order_batch_no or f"ORD-{online_order_id}",
            "product_name": p_name,
            "attachments": attachments_map.get(rating_id, []),
        })

    return results


def get_manager_performance_data(
    miller_user_id: int,
    branch_id: int | None = None,
    product_name: str | None = None,
) -> dict:
    """
    Fetch comprehensive performance data for Miller Manager:
    - All owned branches (including 0 transactions)
    - Available products
    - Reviews and ratings summary
    - Sales overtime (12 months, in-store + completed online)
    - Volume overtime (12 months kg)
    - Purchase breakdown (Completed vs Pending online sales)
    - Real statistics / monetary badges
    """
    branches = get_manager_branches(miller_user_id)
    valid_branch_ids = [b["supplier_profile_id"] for b in branches]

    # Validate branch filter against manager's owned branches
    target_branch_ids = valid_branch_ids
    if branch_id and branch_id != "all":
        try:
            bid = int(branch_id)
            if bid in valid_branch_ids:
                target_branch_ids = [bid]
            else:
                target_branch_ids = []
        except (ValueError, TypeError):
            pass

    products = get_manager_products(
        miller_user_id,
        branch_id=target_branch_ids[0] if len(target_branch_ids) == 1 else None,
    )

    clean_product_name = None
    if product_name and product_name != "all" and product_name.strip():
        clean_product_name = product_name.strip()

    reviews = get_manager_online_order_ratings(
        miller_user_id,
        branch_id=target_branch_ids[0] if len(target_branch_ids) == 1 else None,
        product_name=clean_product_name,
    )

    # Ratings summary
    total_reviews = len(reviews)
    if total_reviews > 0:
        avg_rating = round(sum(r["rating"] for r in reviews) / total_reviews, 1)
    else:
        avg_rating = 0.0

    star_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        star_int = int(round(r["rating"]))
        if 1 <= star_int <= 5:
            star_counts[star_int] += 1

    # Empty branch check
    if not target_branch_ids:
        timeline = []
        now = datetime.now()
        for i in range(11, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            timeline.append({"label": datetime(y, m, 1).strftime("%b %y"), "value": 0.0})

        return {
            "branches": branches,
            "products": products,
            "selected_branch": branch_id or "all",
            "selected_product": product_name or "all",
            "ratings_summary": {
                "average_rating": avg_rating,
                "total_reviews": total_reviews,
                "star_counts": star_counts,
            },
            "reviews": reviews,
            "sales_overtime": timeline,
            "quantity_overtime": timeline,
            "purchase_breakdown": [
                {"label": "Completed (Online Sales)", "value": 0, "color": "#0B5D1E"},
                {"label": "Pending (Online Sales)", "value": 0, "color": "#EAB308"},
            ],
            "statistics": {
                "this_month_sales": 0.0,
                "total_sales": 0.0,
                "this_month_qty": 0.0,
                "total_qty": 0.0,
            },
        }

    # Build 12-month timeline labels
    now = datetime.now()
    month_keys = []
    timeline_labels = []
    for i in range(11, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        month_keys.append(f"{y:04d}-{m:02d}")
        timeline_labels.append(datetime(y, m, 1).strftime("%b %y"))

    pl_target = ",".join(["%s"] * len(target_branch_ids))

    # 1. FTF Sales
    ftf_where = [f"mfs.supplier_profile_id IN ({pl_target})"]
    ftf_params = list(target_branch_ids)
    if clean_product_name:
        ftf_where.append("mp.product_name = %s")
        ftf_params.append(clean_product_name)

    ftf_query = f"""
        SELECT
            DATE_FORMAT(mfs.created_at, '%%Y-%%m') AS m,
            COALESCE(SUM(mfs.total_payment), 0) AS total_amount,
            COALESCE(SUM(mfs.quantity_sold), 0) AS total_qty
        FROM miller_ftf_sales mfs
        LEFT JOIN miller_products mp ON mp.product_id = mfs.miller_product_id
        WHERE {' AND '.join(ftf_where)}
        GROUP BY m
    """

    with connection.cursor() as cursor:
        cursor.execute(ftf_query, ftf_params)
        ftf_monthly = {r[0]: (float(r[1]), float(r[2])) for r in cursor.fetchall()}

    # 2. Completed / Paid Online Sales
    online_where = [f"moc.supplier_profile_id IN ({pl_target})"]
    online_params = list(target_branch_ids)
    if clean_product_name:
        online_where.append("mp.product_name = %s")
        online_params.append(clean_product_name)

    online_query = f"""
        SELECT
            DATE_FORMAT(moc.created_at, '%%Y-%%m') AS m,
            COALESCE(SUM(moc.total_price), 0) AS total_amount,
            COALESCE(SUM(moc.ordered_quantity), 0) AS total_qty
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp ON mp.product_id = moc.miller_product_id
        LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
        WHERE {' AND '.join(online_where)}
          AND (moop.status = 'paid' OR moc.status IN ('Delivered', 'Completed'))
        GROUP BY m
    """

    with connection.cursor() as cursor:
        cursor.execute(online_query, online_params)
        online_monthly = {r[0]: (float(r[1]), float(r[2])) for r in cursor.fetchall()}

    sales_overtime = []
    quantity_overtime = []
    for key, label in zip(month_keys, timeline_labels):
        ftf_amt, ftf_qty = ftf_monthly.get(key, (0.0, 0.0))
        onl_amt, onl_qty = online_monthly.get(key, (0.0, 0.0))
        sales_overtime.append({"label": label, "value": round(ftf_amt + onl_amt, 2)})
        quantity_overtime.append({"label": label, "value": round(ftf_qty + onl_qty, 2)})

    # 3. Purchase Breakdown (Completed vs Pending online sales)
    breakdown_query = f"""
        SELECT
            SUM(CASE WHEN moop.status = 'paid' OR moc.status IN ('Delivered', 'Completed') THEN 1 ELSE 0 END) AS completed_count,
            SUM(CASE WHEN (moop.status IS NULL OR moop.status != 'paid') AND moc.status NOT IN ('Delivered', 'Completed', 'Declined', 'Cancelled') THEN 1 ELSE 0 END) AS pending_count
        FROM miller_online_customer moc
        LEFT JOIN miller_products mp ON mp.product_id = moc.miller_product_id
        LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
        WHERE {' AND '.join(online_where)}
    """

    with connection.cursor() as cursor:
        cursor.execute(breakdown_query, online_params)
        row = cursor.fetchone()
        comp = int(row[0] or 0)
        pend = int(row[1] or 0)

    purchase_breakdown = [
        {"label": "Completed (Online Sales)", "value": comp, "color": "#0B5D1E"},
        {"label": "Pending (Online Sales)", "value": pend, "color": "#EAB308"},
    ]

    # 4. Statistics (Current Month & All-Time Totals)
    current_month_key = now.strftime("%Y-%m")
    this_m_ftf, this_m_ftf_qty = ftf_monthly.get(current_month_key, (0.0, 0.0))
    this_m_onl, this_m_onl_qty = online_monthly.get(current_month_key, (0.0, 0.0))

    this_month_sales = round(this_m_ftf + this_m_onl, 2)
    this_month_qty = round(this_m_ftf_qty + this_m_onl_qty, 2)

    total_sales = round(sum(item["value"] for item in sales_overtime), 2)
    total_qty = round(sum(item["value"] for item in quantity_overtime), 2)

    return {
        "branches": branches,
        "products": products,
        "selected_branch": branch_id or "all",
        "selected_product": clean_product_name or "all",
        "ratings_summary": {
            "average_rating": avg_rating,
            "total_reviews": total_reviews,
            "star_counts": star_counts,
        },
        "reviews": reviews,
        "sales_overtime": sales_overtime,
        "quantity_overtime": quantity_overtime,
        "purchase_breakdown": purchase_breakdown,
        "statistics": {
            "this_month_sales": this_month_sales,
            "total_sales": total_sales,
            "this_month_qty": this_month_qty,
            "total_qty": total_qty,
        },
    }

