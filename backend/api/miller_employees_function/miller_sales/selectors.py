"""
Read queries (selectors) for Miller Sales Point of Sale (POS).
All queries are strictly scoped by the authenticated seller's supplier_profile_id.
"""

import calendar
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db import connection

PH_TZ = ZoneInfo("Asia/Manila")
KG_PER_SACK = Decimal("25.00")


def _today_ph():
    return datetime.now(PH_TZ).date()


def get_seller_and_branch_context(supplier_employee_id: int, supplier_profile_id: int) -> dict:
    """
    Fetch the authenticated Miller seller's profile and branch business details.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                se.supplier_employee_id,
                se.supplier_profile_id,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                se.email,
                se.position,
                se.status,
                sp.business_name,
                sp.organization_name
            FROM supplier_employees se
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = se.supplier_profile_id
            WHERE se.supplier_employee_id = %s
              AND se.supplier_profile_id = %s
            LIMIT 1
            """,
            [supplier_employee_id, supplier_profile_id],
        )
        row = cursor.fetchone()

    if not row:
        return {}

    first_name = (row[2] or "").strip()
    middle_initial = (row[3] or "").strip()
    last_name = (row[4] or "").strip()
    suffix = (row[5] or "").strip()
    full_name_parts = [p for p in [first_name, middle_initial, last_name, suffix] if p]
    seller_name = " ".join(full_name_parts) or (row[6] or "Miller Seller")

    return {
        "supplier_employee_id": int(row[0]),
        "supplier_profile_id": int(row[1]),
        "first_name": first_name,
        "middle_initial": middle_initial,
        "last_name": last_name,
        "suffix": suffix,
        "seller_name": seller_name,
        "email": row[6] or "",
        "position": row[7] or "",
        "status": row[8] or "",
        "business_name": (row[9] or "Miller Branch").strip(),
        "organization_name": row[10] or "",
    }


def list_pos_products(supplier_profile_id: int) -> list[dict]:
    """
    Fetch POS-eligible products from `miller_products` for the authenticated Miller branch:
    - Belongs to `supplier_profile_id`
    - `status = 'active'` (excludes archived, unmilled, expired, no-stock, etc.)
    - `expiry_date IS NOT NULL AND expiry_date > today (Asia/Manila)`
    - `stock_quantity >= 25` kg (at least 1 full sack of 25 kg)
    - `unit_cost > 0`
    """
    today_ph = _today_ph()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                mp.product_id,
                mp.supplier_profile_id,
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
                mp.status
            FROM miller_products mp
            WHERE mp.supplier_profile_id = %s
              AND LOWER(TRIM(mp.status)) = 'active'
              AND mp.expiry_date IS NOT NULL
              AND mp.expiry_date > %s
              AND mp.stock_quantity >= 25
              AND mp.unit_cost IS NOT NULL
              AND mp.unit_cost > 0
            ORDER BY mp.product_name ASC, mp.expiry_date ASC, mp.product_id ASC
            """,
            [supplier_profile_id, today_ph],
        )
        rows = cursor.fetchall()

    products = []
    for row in rows:
        stock_kg = Decimal(str(row[9] or "0"))
        unit_cost_per_kg = Decimal(str(row[10] or "0"))
        available_sacks = int(stock_kg // KG_PER_SACK)
        if available_sacks < 1 or unit_cost_per_kg <= Decimal("0"):
            continue

        selling_price_per_sack = (unit_cost_per_kg * KG_PER_SACK).quantize(Decimal("0.01"))
        expiry_date_obj = row[8]
        expiry_iso = expiry_date_obj.isoformat() if expiry_date_obj else None
        expiry_formatted = expiry_date_obj.strftime("%m/%d/%Y") if expiry_date_obj else "—"

        products.append(
            {
                "id": int(row[0]),
                "product_id": int(row[0]),
                "miller_product_id": int(row[0]),
                "supplier_profile_id": int(row[1]),
                "sku": row[2] or "",
                "product_code": row[2] or "",
                "productName": row[3] or "Unnamed Product",
                "product_name": row[3] or "Unnamed Product",
                "description": row[4] or "",
                "category": row[11] or "Rice",
                "qualityGrade": row[2] or "",
                "stock_quantity_kg": float(stock_kg),
                "stockAvailable": available_sacks,
                "available_sacks": available_sacks,
                "stockDisplay": f"{available_sacks} sacks",
                "unit_cost_per_kg": float(unit_cost_per_kg),
                "price": float(selling_price_per_sack),
                "selling_price_per_sack": float(selling_price_per_sack),
                "orderDate": row[6].isoformat() if row[6] else None,
                "arrivalDate": row[7].isoformat() if row[7] else None,
                "expiryDate": expiry_iso,
                "expiryFormatted": expiry_formatted,
                "image": row[5] or "",
                "shelfLocation": row[11] or "",
                "status": "Active",
            }
        )

    return products


def list_pos_payment_accounts(supplier_profile_id: int) -> list[dict]:
    """
    Fetch active GCash and Bank Transfer payment accounts configured for this Miller branch
    from `miller_online_transaction_credentials`.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                credentials_id,
                supplier_profile_id,
                type,
                platform_name,
                bank_name,
                provider_name,
                account_name,
                account_number,
                is_default,
                status,
                updated_at
            FROM miller_online_transaction_credentials
            WHERE supplier_profile_id = %s
              AND LOWER(TRIM(status)) = 'active'
            ORDER BY
                is_default DESC,
                CASE WHEN LOWER(type) = 'gcash' THEN 0 ELSE 1 END,
                updated_at DESC,
                credentials_id DESC
            """,
            [supplier_profile_id],
        )
        rows = cursor.fetchall()

    accounts = []
    for row in rows:
        acct_type = (row[2] or "").strip().lower()
        display_provider = (
            row[5]
            or row[4]
            or row[3]
            or ("GCash" if acct_type == "gcash" else "Bank Transfer")
        ).strip()
        accounts.append(
            {
                "credentials_id": int(row[0]),
                "supplier_profile_id": int(row[1]),
                "type": acct_type,  # 'gcash' or 'bank'
                "platform_name": (row[3] or "").strip(),
                "bank_name": (row[4] or "").strip(),
                "provider_name": display_provider,
                "account_name": (row[6] or "").strip(),
                "account_number": (row[7] or "").strip(),
                "qr_image_url": "",
                "is_default": bool(row[8]),
                "is_active": (row[9] or "").strip().lower() == "active",
            }
        )
    return accounts


def get_pos_checkout_receipt(supplier_profile_id: int, reference_no: str) -> dict | None:
    """
    Build the complete Sales Receipt payload for a completed POS checkout (`reference_no`)
    scoped to `supplier_profile_id`.
    Aggregates all product rows sharing `reference_no` and computes `Total = SUM(total_payment)`
    while reading checkout-level `amount_paid` and `change_amount` without double counting.
    """
    clean_ref = (reference_no or "").strip()
    if not clean_ref:
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                s.transaction_id,
                s.supplier_profile_id,
                s.miller_product_id,
                s.reference_no,
                s.quantity_sold,
                s.total_payment,
                s.amount_paid,
                s.change_amount,
                s.payment_method,
                s.created_at,
                s.sold_by_employee_id,
                s.payment_credentials_id,
                s.payment_proof_image,
                mp.product_name,
                mp.product_code,
                mp.expiry_date,
                mp.unit_cost,
                sp.business_name,
                se.first_name,
                se.middle_initial,
                se.last_name,
                se.suffix,
                motc.platform_name,
                motc.bank_name,
                motc.provider_name,
                motc.account_name,
                motc.account_number
            FROM miller_ftf_sales s
            INNER JOIN supplier_profiles sp
                ON sp.supplier_profile_id = s.supplier_profile_id
            LEFT JOIN miller_products mp
                ON mp.product_id = s.miller_product_id
            LEFT JOIN supplier_employees se
                ON se.supplier_employee_id = s.sold_by_employee_id
            LEFT JOIN miller_online_transaction_credentials motc
                ON motc.credentials_id = s.payment_credentials_id
            WHERE s.supplier_profile_id = %s
              AND s.reference_no = %s
            ORDER BY s.transaction_id ASC
            """,
            [supplier_profile_id, clean_ref],
        )
        rows = cursor.fetchall()

    if not rows:
        return None

    # Calculate checkout total via SQL SUM(total_payment) for all rows sharing reference_no
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(total_payment), 0)
            FROM miller_ftf_sales
            WHERE supplier_profile_id = %s
              AND reference_no = %s
            """,
            [supplier_profile_id, clean_ref],
        )
        sum_row = cursor.fetchone()
        checkout_total = Decimal(
            str(sum_row[0] if sum_row and sum_row[0] is not None else "0.00")
        ).quantize(Decimal("0.01"))

    first = rows[0]
    raw_payment_method = (first[8] or "cash").strip().lower()
    if raw_payment_method == "gcash":
        payment_method_label = "GCash"
    elif raw_payment_method in ("bank", "bank_transfer", "bank transfer"):
        payment_method_label = "Bank Transfer"
    else:
        payment_method_label = "Cash"

    amount_paid = Decimal(str(first[6] or "0.00")).quantize(Decimal("0.01"))
    change_amount = Decimal(str(first[7] or "0.00")).quantize(Decimal("0.01"))
    if raw_payment_method != "cash":
        change_amount = Decimal("0.00")

    tx_dt = first[9]
    if tx_dt is not None:
        if getattr(tx_dt, "tzinfo", None) is not None:
            tx_dt_ph = tx_dt.astimezone(PH_TZ)
        else:
            tx_dt_ph = tx_dt.replace(tzinfo=ZoneInfo("UTC")).astimezone(PH_TZ)
        tx_date_iso = tx_dt_ph.isoformat()
        tx_date_formatted = tx_dt_ph.strftime("%b %d, %Y, %I:%M %p")
    else:
        now_ph = datetime.now(PH_TZ)
        tx_date_iso = now_ph.isoformat()
        tx_date_formatted = now_ph.strftime("%b %d, %Y, %I:%M %p")

    business_name = (first[17] or "Miller Branch").strip()
    seller_parts = [
        (first[18] or "").strip(),
        (first[19] or "").strip(),
        (first[20] or "").strip(),
        (first[21] or "").strip(),
    ]
    seller_name = " ".join([p for p in seller_parts if p]) or "Miller Seller"

    provider_label = (first[24] or first[23] or first[22] or "").strip()

    items = []
    for row in rows:
        qty_kg = Decimal(str(row[4] or "0.00")).quantize(Decimal("0.01"))
        qty_sacks = int(qty_kg // KG_PER_SACK)
        line_subtotal = Decimal(str(row[5] or "0.00")).quantize(Decimal("0.01"))
        unit_price_sack = (
            (line_subtotal / Decimal(qty_sacks)).quantize(Decimal("0.01"))
            if qty_sacks > 0
            else Decimal("0.00")
        )
        expiry_obj = row[15]
        expiry_mmddyyyy = expiry_obj.strftime("%m/%d/%Y") if expiry_obj else "—"
        expiry_iso = expiry_obj.isoformat() if expiry_obj else None

        items.append(
            {
                "transaction_id": int(row[0]),
                "miller_product_id": int(row[2]) if row[2] is not None else None,
                "product_name": row[13] or f"Product #{row[2]}",
                "product_code": row[14] or "",
                "quantity_sacks": qty_sacks,
                "quantity_label": f"{qty_sacks} {'sack' if qty_sacks == 1 else 'sacks'}",
                "quantity_kg": float(qty_kg),
                "unit_price": float(unit_price_sack),
                "line_subtotal": float(line_subtotal),
                "expiry_date": expiry_iso,
                "expiry_formatted": expiry_mmddyyyy,
            }
        )

    return {
        "reference_no": clean_ref,
        "supplier_profile_id": int(first[1]),
        "business_name": business_name,
        "seller_name": seller_name,
        "sold_by_employee_id": int(first[10]) if first[10] is not None else None,
        "payment_method": raw_payment_method,
        "payment_method_label": payment_method_label,
        "payment_provider_name": provider_label,
        "payment_account_name": first[25] or "",
        "payment_account_number": first[26] or "",
        "payment_proof_image": first[12] or "",
        "transaction_date": tx_date_iso,
        "transaction_date_formatted": tx_date_formatted,
        "items": items,
        "total_amount": float(checkout_total),
        "amount_paid": float(amount_paid),
        "change_amount": float(change_amount),
    }


# ============================================================
# MILLER SALES ONLINE ORDERS SELECTORS
# ============================================================

def format_display_date(d):
    """
    Format date/datetime as: Abbreviated month, numeric day, four-digit year.
    Example: Oct 27, 2026.
    """
    if not d:
        return "—"
    if isinstance(d, datetime):
        d = d.date()
    elif isinstance(d, str):
        try:
            d = datetime.fromisoformat(d.split("T")[0].split(" ")[0]).date()
        except Exception:
            return str(d)
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{month_names[d.month - 1]} {d.day}, {d.year}"


def format_display_currency(val):
    """Format monetary value as Philippine Peso (e.g. ₱ 45.00)."""
    if val is None:
        return "₱ 0.00"
    try:
        f_val = float(val)
        return f"₱ {f_val:,.2f}"
    except (ValueError, TypeError):
        return f"₱ {val}"


def format_display_qty(qty):
    """Format quantity with kg unit (e.g. 10.00 kg)."""
    if qty is None:
        return "0.00 kg"
    try:
        val = float(qty)
        if val % 1 == 0:
            return f"{int(val):,} kg"
        return f"{val:,.2f} kg"
    except (ValueError, TypeError):
        return f"{qty} kg"


def list_miller_online_orders(
    supplier_profile_id: int,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    status_filter: str = None,
) -> dict:
    """
    Fetch actual miller_online_customer orders for the authenticated Miller branch,
    including Retailer and Warehouse buyers.
    """
    where_clauses = ["moc.supplier_profile_id = %s"]
    params = [supplier_profile_id]

    # Server-side filter: Display ONLY records whose status is 'Ordered'
    if status_filter and status_filter.strip().lower() == "all":
        pass
    elif status_filter:
        where_clauses.append("TRIM(LOWER(moc.status)) = %s")
        params.append(status_filter.strip().lower())
    else:
        where_clauses.append("TRIM(LOWER(moc.status)) = 'ordered'")

    if start_date:
        where_clauses.append("DATE(moc.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(moc.created_at) <= %s")
        params.append(end_date)

    if search:
        s_query = f"%{search.strip().lower()}%"
        where_clauses.append(
            """(
                LOWER(moc.batch_no) LIKE %s
                OR LOWER(mp.product_name) LIKE %s
                OR LOWER(mp.product_code) LIKE %s
                OR LOWER(COALESCE(CONCAT_WS(' ', u.first_name, u.last_name), '')) LIKE %s
                OR LOWER(COALESCE(wp.business_name, '')) LIKE %s
            )"""
        )
        params.extend([s_query, s_query, s_query, s_query, s_query])

    where_sql = " AND ".join(where_clauses)

    query = f"""
        SELECT
            moc.online_order_id,
            moc.batch_no,
            moc.supplier_profile_id,
            moc.miller_product_id,
            moc.user_buyer_id,
            moc.warehouse_buyer_id,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN CONCAT_WS(' ', u.first_name, u.last_name)
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN wp.business_name
                ELSE 'Unknown Buyer'
            END AS buyer_name,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN 'Retailer'
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN 'Warehouse'
                ELSE 'Unknown'
            END AS buyer_type,
            COALESCE(u.email, wp.official_email) AS buyer_email,
            COALESCE(u.contact_number, wp.official_contact_number) AS buyer_contact,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            mp.stock_quantity,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.expected_arrival_date,
            moc.status,
            moc.created_at,
            moc.updated_at
        FROM miller_online_customer moc
        LEFT JOIN users u ON moc.user_buyer_id = u.user_id
        LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE {where_sql}
        ORDER BY moc.created_at DESC, moc.online_order_id DESC
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    orders = []
    for r in rows:
        order_id = int(r[0])
        batch_no = r[1] or f"ORDER-{order_id}"
        product_id = int(r[3]) if r[3] is not None else None
        buyer_name = (r[6] or "").strip() or "Unknown Buyer"
        buyer_type = r[7] or "Unknown"
        buyer_email = r[8] or ""
        buyer_contact = r[9] or ""
        product_name = r[10] or "Product"
        product_code = r[11] or ""
        unit_cost = Decimal(str(r[12] or "0.00"))
        stock_quantity = Decimal(str(r[13] or "0.00"))
        ordered_quantity = Decimal(str(r[14] or "0.00"))
        fare_fee = Decimal(str(r[15] or "0.00"))
        total_price = Decimal(str(r[16] or "0.00"))
        expected_arrival_date = r[17]
        status = r[18] or "Ordered"
        created_at = r[19]

        created_iso = created_at.isoformat() if created_at else ""
        created_formatted = format_display_date(created_at)
        arrival_formatted = format_display_date(expected_arrival_date)
        arrival_iso = expected_arrival_date.isoformat() if expected_arrival_date else ""

        orders.append({
            "id": f"order-{order_id}",
            "orderId": order_id,
            "onlineOrderId": order_id,
            "batchNo": batch_no,
            "retailerName": buyer_name,
            "buyerName": buyer_name,
            "buyerType": buyer_type,
            "buyerEmail": buyer_email,
            "buyerContact": buyer_contact,
            "userBuyerId": int(r[4]) if r[4] is not None else None,
            "warehouseBuyerId": int(r[5]) if r[5] is not None else None,
            "variant": product_name,
            "productName": product_name,
            "productCode": product_code,
            "productId": product_id,
            "unitCost": float(unit_cost),
            "unitCostFormatted": format_display_currency(unit_cost),
            "stockQuantity": float(stock_quantity),
            "stockQuantityFormatted": format_display_qty(stock_quantity),
            "orderedQuantity": float(ordered_quantity),
            "orderedQuantityFormatted": format_display_qty(ordered_quantity),
            "fareFee": float(fare_fee),
            "fareFeeFormatted": format_display_currency(fare_fee),
            "totalPrice": format_display_currency(total_price),
            "totalPriceNum": float(total_price),
            "expectedArrivalDate": arrival_iso,
            "expectedArrivalDateFormatted": arrival_formatted,
            "status": status,
            "createdAt": created_iso,
            "createdAtFormatted": created_formatted,
            "orderDate": created_iso.split("T")[0] if created_iso else "",
            "sortTimestamp": int(created_at.timestamp()) if created_at else 0,
        })

    # Authoritative branch pending count
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM miller_online_customer
            WHERE supplier_profile_id = %s
              AND TRIM(LOWER(status)) = 'ordered'
            """,
            [supplier_profile_id],
        )
        pending_count = cursor.fetchone()[0] or 0

    return {
        "orders": orders,
        "total_count": len(orders),
        "pending_count": pending_count,
    }


def get_miller_online_order_detail(supplier_profile_id: int, online_order_id: int) -> dict | None:
    """
    Fetch comprehensive details for a single miller_online_customer order.
    """
    query = """
        SELECT
            moc.online_order_id,
            moc.batch_no,
            moc.supplier_profile_id,
            moc.miller_product_id,
            moc.user_buyer_id,
            moc.warehouse_buyer_id,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN CONCAT_WS(' ', u.first_name, u.last_name)
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN wp.business_name
                ELSE 'Unknown Buyer'
            END AS buyer_name,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN 'Retailer'
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN 'Warehouse'
                ELSE 'Unknown'
            END AS buyer_type,
            COALESCE(u.email, wp.official_email) AS buyer_email,
            COALESCE(u.contact_number, wp.official_contact_number) AS buyer_contact,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            mp.stock_quantity,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.expected_arrival_date,
            moc.status,
            moc.created_at,
            moc.updated_at
        FROM miller_online_customer moc
        LEFT JOIN users u ON moc.user_buyer_id = u.user_id
        LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE moc.online_order_id = %s AND moc.supplier_profile_id = %s
        LIMIT 1
    """

    with connection.cursor() as cursor:
        cursor.execute(query, [online_order_id, supplier_profile_id])
        r = cursor.fetchone()

    if not r:
        return None

    order_id = int(r[0])
    batch_no = r[1] or f"ORDER-{order_id}"
    product_id = int(r[3]) if r[3] is not None else None
    buyer_name = (r[6] or "").strip() or "Unknown Buyer"
    buyer_type = r[7] or "Unknown"
    buyer_email = r[8] or ""
    buyer_contact = r[9] or ""
    product_name = r[10] or "Product"
    product_code = r[11] or ""
    unit_cost = Decimal(str(r[12] or "0.00"))
    stock_quantity = Decimal(str(r[13] or "0.00"))
    ordered_quantity = Decimal(str(r[14] or "0.00"))
    fare_fee = Decimal(str(r[15] or "0.00"))
    total_price = Decimal(str(r[16] or "0.00"))
    expected_arrival_date = r[17]
    status = r[18] or "Ordered"
    created_at = r[19]

    created_iso = created_at.isoformat() if created_at else ""
    created_formatted = format_display_date(created_at)
    arrival_formatted = format_display_date(expected_arrival_date)
    arrival_iso = expected_arrival_date.isoformat() if expected_arrival_date else ""

    return {
        "id": f"order-{order_id}",
        "orderId": order_id,
        "onlineOrderId": order_id,
        "batchNo": batch_no,
        "retailerName": buyer_name,
        "buyerName": buyer_name,
        "buyerType": buyer_type,
        "buyerEmail": buyer_email,
        "buyerContact": buyer_contact,
        "userBuyerId": int(r[4]) if r[4] is not None else None,
        "warehouseBuyerId": int(r[5]) if r[5] is not None else None,
        "variant": product_name,
        "productName": product_name,
        "productCode": product_code,
        "productId": product_id,
        "unitCost": float(unit_cost),
        "unitCostFormatted": format_display_currency(unit_cost),
        "stockQuantity": float(stock_quantity),
        "stockQuantityFormatted": format_display_qty(stock_quantity),
        "orderedQuantity": float(ordered_quantity),
        "orderedQuantityFormatted": format_display_qty(ordered_quantity),
        "fareFee": float(fare_fee),
        "fareFeeFormatted": format_display_currency(fare_fee),
        "totalPrice": format_display_currency(total_price),
        "totalPriceNum": float(total_price),
        "expectedArrivalDate": arrival_iso,
        "expectedArrivalDateFormatted": arrival_formatted,
        "status": status,
        "createdAt": created_iso,
        "createdAtFormatted": created_formatted,
        "orderDate": created_iso.split("T")[0] if created_iso else "",
        "sortTimestamp": int(created_at.timestamp()) if created_at else 0,
    }


def list_in_store_sales(
    supplier_profile_id: int,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = "date-desc",
) -> list[dict]:
    """
    Fetch completed in-store sales transactions from `miller_ftf_sales`
    joined with `miller_products`, scoped to `supplier_profile_id`.
    """
    where_clauses = ["mfs.supplier_profile_id = %s"]
    params = [supplier_profile_id]

    if start_date:
        where_clauses.append("DATE(mfs.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(mfs.created_at) <= %s")
        params.append(end_date)

    if search:
        s_query = f"%{search.strip().lower()}%"
        where_clauses.append(
            """(
                LOWER(mfs.reference_no) LIKE %s
                OR LOWER(COALESCE(mp.product_name, '')) LIKE %s
                OR LOWER(COALESCE(mp.product_code, '')) LIKE %s
                OR LOWER(COALESCE(mfs.payment_method, '')) LIKE %s
                OR CAST(mfs.total_payment AS CHAR) LIKE %s
                OR CAST(mfs.quantity_sold AS CHAR) LIKE %s
            )"""
        )
        params.extend([s_query, s_query, s_query, s_query, s_query, s_query])

    order_by = "mfs.created_at DESC, mfs.transaction_id DESC"
    if sort_by == "date-asc":
        order_by = "mfs.created_at ASC, mfs.transaction_id ASC"
    elif sort_by == "variant-asc":
        order_by = "mp.product_name ASC, mfs.created_at DESC"
    elif sort_by == "qty-desc":
        order_by = "mfs.quantity_sold DESC, mfs.created_at DESC"
    elif sort_by == "qty-asc":
        order_by = "mfs.quantity_sold ASC, mfs.created_at DESC"

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT
            mfs.transaction_id,
            mfs.supplier_profile_id,
            mfs.sold_by_employee_id,
            mfs.miller_product_id,
            mfs.quantity_sold,
            mfs.total_payment,
            mfs.amount_paid,
            mfs.change_amount,
            mfs.payment_method,
            mfs.payment_credentials_id,
            mfs.reference_no,
            mfs.payment_proof_image,
            mfs.idempotency_key,
            mfs.created_at,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            mp.stock_quantity
        FROM miller_ftf_sales mfs
        LEFT JOIN miller_products mp ON mfs.miller_product_id = mp.product_id
        WHERE {where_sql}
        ORDER BY {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    results = []
    for r in rows:
        tx_id = int(r[0])
        ref_no = r[10] or f"TXN-{tx_id}"
        qty_sold = Decimal(str(r[4] or "0.00"))
        tot_payment = Decimal(str(r[5] or "0.00"))
        amt_paid = Decimal(str(r[6] or "0.00"))
        change_amt = Decimal(str(r[7] or "0.00"))
        pay_method_raw = (r[8] or "Cash").strip()
        created_at = r[13]
        prod_name = r[14] or "Rice Product"
        prod_code = r[15] or ""
        unit_cost = Decimal(str(r[16] or "0.00"))

        if pay_method_raw.lower() == "gcash":
            pay_method = "GCash"
        elif pay_method_raw.lower() in ("bank", "bank transfer"):
            pay_method = "Bank Transfer"
        elif pay_method_raw.lower() == "cash":
            pay_method = "Cash"
        else:
            pay_method = pay_method_raw.capitalize()

        time_str = created_at.strftime("%I:%M %p") if created_at else ""
        date_iso = created_at.date().isoformat() if created_at else ""
        date_str = format_display_date(created_at)
        purchase_datetime = created_at.strftime("%b %d, %Y %I:%M %p") if created_at else "-"

        results.append({
            "id": f"txn-{tx_id}",
            "transactionId": ref_no,
            "referenceNo": ref_no,
            "dbTransactionId": tx_id,
            "time": time_str,
            "date": date_iso,
            "dateFormatted": date_str,
            "purchaseDateFormatted": purchase_datetime,
            "datetimeFormatted": purchase_datetime,
            "variant": prod_name,
            "productName": prod_name,
            "productCode": prod_code,
            "quantity": format_display_qty(qty_sold),
            "quantityNum": float(qty_sold),
            "unitCost": float(unit_cost),
            "unitCostFormatted": format_display_currency(unit_cost),
            "totalPayment": format_display_currency(tot_payment),
            "totalPaymentNum": float(tot_payment),
            "totalAmount": format_display_currency(tot_payment),
            "amountPaid": format_display_currency(amt_paid),
            "amountPaidNum": float(amt_paid),
            "change": format_display_currency(change_amt),
            "changeNum": float(change_amt),
            "paymentMethod": pay_method,
            "status": "Paid",
            "sortTimestamp": int(created_at.timestamp()) if created_at else 0,
        })

    return results


def list_online_sales(
    supplier_profile_id: int,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = "date-desc",
) -> list[dict]:
    """
    Fetch online sales transactions from `miller_online_orders_payment`
    joined with `miller_online_customer`, scoped to `supplier_profile_id`.
    """
    where_clauses = ["(moop.supplier_profile_id = %s OR (moop.supplier_profile_id IS NULL AND moc.supplier_profile_id = %s))"]
    params = [supplier_profile_id, supplier_profile_id]

    if start_date:
        where_clauses.append("DATE(moc.created_at) >= %s")
        params.append(start_date)

    if end_date:
        where_clauses.append("DATE(moc.created_at) <= %s")
        params.append(end_date)

    if search:
        s_query = f"%{search.strip().lower()}%"
        where_clauses.append(
            """(
                LOWER(moc.batch_no) LIKE %s
                OR LOWER(COALESCE(mp.product_name, '')) LIKE %s
                OR LOWER(COALESCE(mp.product_code, '')) LIKE %s
                OR LOWER(COALESCE(CONCAT_WS(' ', u.first_name, u.last_name), '')) LIKE %s
                OR LOWER(COALESCE(wp.business_name, '')) LIKE %s
                OR LOWER(COALESCE(moop.payment_method, '')) LIKE %s
                OR LOWER(COALESCE(moop.status, '')) LIKE %s
                OR LOWER(COALESCE(moc.status, '')) LIKE %s
                OR CAST(moc.total_price AS CHAR) LIKE %s
            )"""
        )
        params.extend([s_query, s_query, s_query, s_query, s_query, s_query, s_query, s_query, s_query])

    order_by = "moc.created_at DESC, moop.cod_id DESC"
    if sort_by == "date-asc":
        order_by = "moc.created_at ASC, moop.cod_id ASC"
    elif sort_by == "variant-asc":
        order_by = "mp.product_name ASC, moc.created_at DESC"
    elif sort_by == "qty-desc":
        order_by = "moc.ordered_quantity DESC, moc.created_at DESC"
    elif sort_by == "qty-asc":
        order_by = "moc.ordered_quantity ASC, moc.created_at DESC"

    where_sql = " AND ".join(where_clauses)
    query = f"""
        SELECT
            moop.cod_id,
            moop.supplier_profile_id,
            moop.online_order_id,
            moop.payment_reference,
            moop.amount,
            moop.payment_method,
            moop.status AS payment_status,
            moop.photo_of_receipt,
            moop.proof_of_submission,
            moc.batch_no,
            moc.miller_product_id,
            moc.user_buyer_id,
            moc.warehouse_buyer_id,
            moc.expected_arrival_date,
            moc.ordered_quantity,
            moc.fare_fee,
            moc.total_price,
            moc.status AS delivery_status,
            moc.created_at AS date_ordered,
            moc.updated_at AS recent_update_date,
            mp.product_name,
            mp.product_code,
            mp.unit_cost,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN CONCAT_WS(' ', u.first_name, u.last_name)
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN wp.business_name
                ELSE 'Unknown Buyer'
            END AS buyer_name,
            CASE
                WHEN moc.user_buyer_id IS NOT NULL THEN 'Retailer'
                WHEN moc.warehouse_buyer_id IS NOT NULL THEN 'Warehouse'
                ELSE 'Unknown'
            END AS buyer_type
        FROM miller_online_orders_payment moop
        JOIN miller_online_customer moc ON moop.online_order_id = moc.online_order_id
        LEFT JOIN users u ON moc.user_buyer_id = u.user_id
        LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
        LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
        WHERE {where_sql}
        ORDER BY {order_by}
    """

    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()

    results = []
    for r in rows:
        cod_id = int(r[0])
        online_order_id = int(r[2]) if r[2] is not None else None
        payment_reference = r[3] or ""
        amount = Decimal(str(r[4] or "0.00"))
        payment_method_raw = (r[5] or "cash/cod").strip().lower()
        payment_status_raw = (r[6] or "pending").strip().lower()
        batch_no = r[9] or f"BATCH-{online_order_id}"
        expected_arrival_date = r[13]
        ordered_qty = Decimal(str(r[14] or "0.00"))
        fare_fee = Decimal(str(r[15] or "0.00"))
        total_price = Decimal(str(r[16] or "0.00"))
        delivery_status = r[17] or "Ordered"
        date_ordered = r[18]
        recent_update_date = r[19]
        prod_name = r[20] or "Rice Product"
        prod_code = r[21] or ""
        unit_cost = Decimal(str(r[22] or "0.00"))
        buyer_name = (r[23] or "").strip() or "Unknown Buyer"
        buyer_type = r[24] or "Retailer"

        if payment_method_raw == "gcash":
            payment_method_label = "GCash"
        elif payment_method_raw in ("bank", "bank transfer"):
            payment_method_label = "Bank Transfer"
        elif payment_method_raw in ("cash", "cod", "cash/cod"):
            payment_method_label = "Cash / COD"
        else:
            payment_method_label = payment_method_raw.capitalize()

        if payment_status_raw == "paid":
            payment_status_label = "Paid"
        elif payment_status_raw == "submitted to driver":
            payment_status_label = "Submitted to Driver"
        else:
            payment_status_label = "Pending"

        order_date_iso = date_ordered.date().isoformat() if date_ordered else ""
        time_str = date_ordered.strftime("%I:%M %p") if date_ordered else ""
        date_str = format_display_date(date_ordered)

        results.append({
            "id": f"online-pay-{cod_id}",
            "codId": cod_id,
            "onlineOrderId": online_order_id,
            "batchNo": batch_no,
            "retailer": buyer_name,
            "buyerName": buyer_name,
            "buyerType": buyer_type,
            "variant": prod_name,
            "productName": prod_name,
            "productCode": prod_code,
            "orderedQuantity": format_display_qty(ordered_qty),
            "orderedQuantityFormatted": format_display_qty(ordered_qty),
            "orderedQuantityNum": float(ordered_qty),
            "unitCost": float(unit_cost),
            "unitCostFormatted": format_display_currency(unit_cost),
            "fareFee": float(fare_fee),
            "fareFeeFormatted": format_display_currency(fare_fee),
            "totalCost": format_display_currency(total_price),
            "totalCostFormatted": format_display_currency(total_price),
            "totalPrice": format_display_currency(total_price),
            "totalPriceNum": float(total_price),
            "paymentReference": payment_reference,
            "paymentMethod": payment_method_label,
            "paymentStatus": payment_status_label,
            "deliveryStatus": delivery_status,
            "expectedArrivalDate": format_display_date(expected_arrival_date),
            "expectedArrivalDateFormatted": format_display_date(expected_arrival_date),
            "recentUpdateDate": recent_update_date.strftime("%b %d, %Y %I:%M %p") if recent_update_date else "-",
            "recentUpdateDateFormatted": recent_update_date.strftime("%b %d, %Y %I:%M %p") if recent_update_date else "-",
            "dateOrdered": date_ordered.strftime("%b %d, %Y %I:%M %p") if date_ordered else "-",
            "dateOrderedFormatted": date_ordered.strftime("%b %d, %Y %I:%M %p") if date_ordered else "-",
            "date": order_date_iso,
            "dateFormatted": date_str,
            "time": time_str,
            "sortTimestamp": int(date_ordered.timestamp()) if date_ordered else 0,
        })

    return results


def get_sales_dashboard_data(supplier_profile_id: int) -> dict:
    """
    Fetch comprehensive, live sales dashboard data for the authenticated Miller branch:
    - KPIs: Today's Sales, Sales This Month, Potential Sales, Pending Online Orders
    - Sales Trend: Weekly (Mon-Sun) and Monthly (Week 1-4) revenue series
    - Sales Distribution: In-Store vs Online revenue percentages
    - Recent Order Activity: Latest in-store and online order activities
    - Top Selling Products: Ranked by actual quantity sold (kg)
    """
    now_ph = datetime.now(PH_TZ)
    today = now_ph.date()
    current_year = today.year
    current_month = today.month

    with connection.cursor() as cur:
        # 1. In-Store Sales (miller_ftf_sales)
        # All completed in-store sales
        cur.execute(
            """
            SELECT COALESCE(SUM(total_payment), 0)
            FROM miller_ftf_sales
            WHERE supplier_profile_id = %s
            """,
            [supplier_profile_id],
        )
        in_store_total = float(cur.fetchone()[0] or 0.0)

        # In-store today
        cur.execute(
            """
            SELECT COALESCE(SUM(total_payment), 0)
            FROM miller_ftf_sales
            WHERE supplier_profile_id = %s
              AND DATE(created_at) = %s
            """,
            [supplier_profile_id, today],
        )
        in_store_today = float(cur.fetchone()[0] or 0.0)

        # In-store this month
        cur.execute(
            """
            SELECT COALESCE(SUM(total_payment), 0)
            FROM miller_ftf_sales
            WHERE supplier_profile_id = %s
              AND YEAR(created_at) = %s
              AND MONTH(created_at) = %s
            """,
            [supplier_profile_id, current_year, current_month],
        )
        in_store_month = float(cur.fetchone()[0] or 0.0)

        # 2. Online Sales (miller_online_orders_payment + miller_online_customer)
        # Count only completed / paid online sales without duplicates
        cur.execute(
            """
            SELECT COALESCE(SUM(COALESCE(moop.amount, moc.total_price)), 0)
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id = %s
              AND (
                  LOWER(TRIM(moop.status)) = 'paid'
                  OR (moop.status IS NULL AND LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
              )
            """,
            [supplier_profile_id],
        )
        online_total = float(cur.fetchone()[0] or 0.0)

        # Online today
        cur.execute(
            """
            SELECT COALESCE(SUM(COALESCE(moop.amount, moc.total_price)), 0)
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id = %s
              AND (
                  LOWER(TRIM(moop.status)) = 'paid'
                  OR (moop.status IS NULL AND LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
              )
              AND DATE(moc.created_at) = %s
            """,
            [supplier_profile_id, today],
        )
        online_today = float(cur.fetchone()[0] or 0.0)

        # Online this month
        cur.execute(
            """
            SELECT COALESCE(SUM(COALESCE(moop.amount, moc.total_price)), 0)
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id = %s
              AND (
                  LOWER(TRIM(moop.status)) = 'paid'
                  OR (moop.status IS NULL AND LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
              )
              AND YEAR(moc.created_at) = %s
              AND MONTH(moc.created_at) = %s
            """,
            [supplier_profile_id, current_year, current_month],
        )
        online_month = float(cur.fetchone()[0] or 0.0)

        # 3. Potential Sales: active stock value in inventory + pending online orders total price
        cur.execute(
            """
            SELECT COALESCE(SUM(stock_quantity * unit_cost), 0)
            FROM miller_products
            WHERE supplier_profile_id = %s
              AND LOWER(TRIM(status)) = 'active'
              AND stock_quantity > 0
              AND unit_cost > 0
            """,
            [supplier_profile_id],
        )
        stock_potential = float(cur.fetchone()[0] or 0.0)

        cur.execute(
            """
            SELECT COALESCE(SUM(total_price), 0)
            FROM miller_online_customer
            WHERE supplier_profile_id = %s
              AND LOWER(TRIM(status)) = 'ordered'
            """,
            [supplier_profile_id],
        )
        pending_online_val = float(cur.fetchone()[0] or 0.0)
        potential_sales_amount = round(stock_potential + pending_online_val, 2)

        # 4. Pending Online Orders Count
        cur.execute(
            """
            SELECT COUNT(*)
            FROM miller_online_customer
            WHERE supplier_profile_id = %s
              AND LOWER(TRIM(status)) = 'ordered'
            """,
            [supplier_profile_id],
        )
        pending_online_count = int(cur.fetchone()[0] or 0)

        # 5. Combined Revenue by Date for Trend Chart
        cur.execute(
            """
            SELECT DATE(created_at), SUM(total_payment)
            FROM miller_ftf_sales
            WHERE supplier_profile_id = %s
            GROUP BY DATE(created_at)
            """,
            [supplier_profile_id],
        )
        ftf_by_date = {row[0]: float(row[1] or 0.0) for row in cur.fetchall()}

        cur.execute(
            """
            SELECT DATE(moc.created_at), SUM(COALESCE(moop.amount, moc.total_price))
            FROM miller_online_customer moc
            LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
            WHERE moc.supplier_profile_id = %s
              AND (
                  LOWER(TRIM(moop.status)) = 'paid'
                  OR (moop.status IS NULL AND LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
              )
            GROUP BY DATE(moc.created_at)
            """,
            [supplier_profile_id],
        )
        online_by_date = {row[0]: float(row[1] or 0.0) for row in cur.fetchall()}

        # 6. Recent Activities (Latest in-store sales & latest online orders)
        cur.execute(
            """
            SELECT
                mfs.transaction_id,
                mfs.reference_no,
                mfs.total_payment,
                mfs.created_at,
                COALESCE(mp.product_name, 'Rice Product')
            FROM miller_ftf_sales mfs
            LEFT JOIN miller_products mp ON mfs.miller_product_id = mp.product_id
            WHERE mfs.supplier_profile_id = %s
            ORDER BY mfs.created_at DESC
            LIMIT 5
            """,
            [supplier_profile_id],
        )
        ftf_activities_raw = cur.fetchall()

        cur.execute(
            """
            SELECT
                moc.online_order_id,
                moc.batch_no,
                moc.total_price,
                moc.status,
                moc.created_at,
                moc.updated_at,
                COALESCE(mp.product_name, 'Rice Product'),
                CASE
                    WHEN moc.user_buyer_id IS NOT NULL THEN CONCAT_WS(' ', u.first_name, u.last_name)
                    WHEN moc.warehouse_buyer_id IS NOT NULL THEN wp.business_name
                    ELSE 'Customer'
                END AS buyer_name
            FROM miller_online_customer moc
            LEFT JOIN users u ON moc.user_buyer_id = u.user_id
            LEFT JOIN warehouse_profiles wp ON moc.warehouse_buyer_id = wp.warehouse_profile_id
            LEFT JOIN miller_products mp ON moc.miller_product_id = mp.product_id
            WHERE moc.supplier_profile_id = %s
            ORDER BY COALESCE(moc.updated_at, moc.created_at) DESC
            LIMIT 5
            """,
            [supplier_profile_id],
        )
        online_activities_raw = cur.fetchall()

        # 7. Top Selling Products (Rank by actual quantity sold in kg)
        cur.execute(
            """
            SELECT
                mp.product_id,
                mp.product_name,
                COALESCE(ftf.ftf_qty, 0) + COALESCE(online.online_qty, 0) AS total_kg
            FROM miller_products mp
            LEFT JOIN (
                SELECT miller_product_id, SUM(quantity_sold) AS ftf_qty
                FROM miller_ftf_sales
                WHERE supplier_profile_id = %s
                GROUP BY miller_product_id
            ) ftf ON mp.product_id = ftf.miller_product_id
            LEFT JOIN (
                SELECT moc.miller_product_id, SUM(moc.ordered_quantity) AS online_qty
                FROM miller_online_customer moc
                LEFT JOIN miller_online_orders_payment moop ON moop.online_order_id = moc.online_order_id
                WHERE moc.supplier_profile_id = %s
                  AND (
                      LOWER(TRIM(moop.status)) = 'paid'
                      OR (moop.status IS NULL AND LOWER(TRIM(moc.status)) IN ('delivered', 'completed'))
                  )
                GROUP BY moc.miller_product_id
            ) online ON mp.product_id = online.miller_product_id
            WHERE mp.supplier_profile_id = %s
              AND (COALESCE(ftf.ftf_qty, 0) + COALESCE(online.online_qty, 0)) > 0
            ORDER BY total_kg DESC
            LIMIT 5
            """,
            [supplier_profile_id, supplier_profile_id, supplier_profile_id],
        )
        top_selling_raw = cur.fetchall()

    # Sales Distribution calculation
    total_sales = round(in_store_total + online_total, 2)
    if total_sales > 0:
        in_store_pct = round((in_store_total / total_sales) * 100)
        online_pct = 100 - in_store_pct
    else:
        in_store_pct = 0
        online_pct = 0

    sales_distribution = [
        {"label": "Walk-in Sales", "value": in_store_pct, "amount": in_store_total, "color": "#0B7A2A"},
        {"label": "Online Sales", "value": online_pct, "amount": online_total, "color": "#E0AC1C"},
    ]

    # Combined Revenue by Date mapping
    all_rev_dates = set(ftf_by_date.keys()) | set(online_by_date.keys())
    revenue_by_date = {d: ftf_by_date.get(d, 0.0) + online_by_date.get(d, 0.0) for d in all_rev_dates}

    # Week Series (Mon - Sun of current week)
    start_of_week = today - timedelta(days=today.weekday())
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    week_data = []
    for i in range(7):
        day_date = start_of_week + timedelta(days=i)
        val = round(revenue_by_date.get(day_date, 0.0), 2)
        week_data.append({"label": day_labels[i], "value": val})

    # Month Series (Weeks 1 - 4 of current month)
    _, days_in_month = calendar.monthrange(current_year, current_month)
    month_data = [
        {"label": "Week 1", "value": round(sum(v for d, v in revenue_by_date.items() if d.year == current_year and d.month == current_month and 1 <= d.day <= 7), 2)},
        {"label": "Week 2", "value": round(sum(v for d, v in revenue_by_date.items() if d.year == current_year and d.month == current_month and 8 <= d.day <= 14), 2)},
        {"label": "Week 3", "value": round(sum(v for d, v in revenue_by_date.items() if d.year == current_year and d.month == current_month and 15 <= d.day <= 21), 2)},
        {"label": "Week 4", "value": round(sum(v for d, v in revenue_by_date.items() if d.year == current_year and d.month == current_month and 22 <= d.day <= days_in_month), 2)},
    ]

    max_week_val = max([item["value"] for item in week_data] + [10000.0])
    max_month_val = max([item["value"] for item in month_data] + [50000.0])

    # Recent Activities Feed
    recent_activities = []
    for r in ftf_activities_raw:
        tx_id, ref_no, amount, created_at, prod_name = r
        clean_ref = ref_no or f"TXN-{tx_id}"
        time_str = created_at.strftime("%I:%M %p") if created_at else ""
        if created_at and created_at.date() != today:
            time_str = f"{created_at.strftime('%b %d')}, {time_str}"
        recent_activities.append({
            "id": f"ftf-{tx_id}",
            "title": "In-Store POS Sale",
            "description": f"Receipt #{clean_ref} — {format_display_currency(amount)} ({prod_name})",
            "time": time_str,
            "timestamp": int(created_at.timestamp()) if created_at else 0,
            "type": "in-store",
            "color": "#0B7A2A",
        })

    for r in online_activities_raw:
        order_id, batch_no, price, status, created_at, updated_at, prod_name, buyer_name = r
        activity_dt = updated_at or created_at
        clean_batch = batch_no or f"ORDER-{order_id}"
        time_str = activity_dt.strftime("%I:%M %p") if activity_dt else ""
        if activity_dt and activity_dt.date() != today:
            time_str = f"{activity_dt.strftime('%b %d')}, {time_str}"
        status_label = status or "Received"
        recent_activities.append({
            "id": f"online-{order_id}",
            "title": f"Online Order {status_label}",
            "description": f"Batch #{clean_batch} from {buyer_name} — {format_display_currency(price)}",
            "time": time_str,
            "timestamp": int(activity_dt.timestamp()) if activity_dt else 0,
            "type": "online",
            "color": "#E0AC1C" if (status or "").lower() == "ordered" else "#2563EB",
        })

    recent_activities.sort(key=lambda x: x["timestamp"], reverse=True)
    recent_activities = recent_activities[:5]

    # Top Selling Products Feed
    top_selling_products = []
    for idx, r in enumerate(top_selling_raw):
        p_id, p_name, qty_kg = r
        top_selling_products.append({
            "id": int(p_id),
            "rank": idx + 1,
            "product": p_name or "Rice Product",
            "quantity": format_display_qty(qty_kg),
            "quantityNum": float(qty_kg),
        })

    # KPIs mapping
    today_sales_total = round(in_store_today + online_today, 2)
    month_sales_total = round(in_store_month + online_month, 2)

    kpis = {
        "today_sales": {
            "title": "TODAY'S SALES",
            "amount": today_sales_total,
            "value": format_display_currency(today_sales_total),
            "trend": "Sales recorded today",
            "tone": "success",
        },
        "month_sales": {
            "title": "SALES THIS MONTH",
            "amount": month_sales_total,
            "value": format_display_currency(month_sales_total),
            "trend": "Accumulated monthly revenue",
            "tone": "success",
        },
        "potential_sales": {
            "title": "POTENTIAL SALES",
            "amount": potential_sales_amount,
            "value": format_display_currency(potential_sales_amount),
            "trend": "Estimated revenue from active inventory and pending sales",
            "tone": "success",
        },
        "pending_online_orders": {
            "title": "PENDING ONLINE ORDERS",
            "count": pending_online_count,
            "value": f"{pending_online_count} {'Order' if pending_online_count == 1 else 'Orders'}",
            "trend": "Requires seller attention",
            "tone": "warning",
        },
    }

    return {
        "kpis": kpis,
        "sales_trend": {
            "week": week_data,
            "month": month_data,
            "max_week": max_week_val,
            "max_month": max_month_val,
        },
        "sales_distribution": sales_distribution,
        "recent_activities": recent_activities,
        "top_selling_products": top_selling_products,
        "last_updated": now_ph.strftime("%I:%M %p"),
    }




