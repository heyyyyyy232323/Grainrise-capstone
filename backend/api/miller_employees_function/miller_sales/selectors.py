"""
Read queries (selectors) for Miller Sales Point of Sale (POS).
All queries are strictly scoped by the authenticated seller's supplier_profile_id.
"""

from datetime import datetime
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

