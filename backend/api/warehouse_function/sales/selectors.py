"""
Read queries (selectors) for Warehouse Sales Point of Sale (POS).
All queries are strictly scoped by the authenticated seller's warehouse_profile_id.
"""

from datetime import datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db import connection

PH_TZ = ZoneInfo("Asia/Manila")
KG_PER_SACK = Decimal("25.00")


def _today_ph():
    return datetime.now(PH_TZ).date()


def get_seller_and_branch_context(
    warehouse_employee_id: int | None,
    warehouse_profile_id: int,
) -> dict:
    """
    Fetch the authenticated Warehouse seller's profile and branch business details.
    Supports both Warehouse Employees and Warehouse Managers.
    """
    if warehouse_employee_id:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    we.warehouse_employee_id,
                    we.warehouse_profile_id,
                    we.first_name,
                    we.middle_initial,
                    we.last_name,
                    we.suffix,
                    we.email,
                    we.position,
                    we.status,
                    wp.business_name,
                    wp.organization_name
                FROM warehouse_employees we
                INNER JOIN warehouse_profiles wp
                    ON wp.warehouse_profile_id = we.warehouse_profile_id
                WHERE we.warehouse_employee_id = %s
                  AND we.warehouse_profile_id = %s
                LIMIT 1
                """,
                [warehouse_employee_id, warehouse_profile_id],
            )
            row = cursor.fetchone()

        if row:
            first_name = (row[2] or "").strip()
            middle_initial = (row[3] or "").strip()
            last_name = (row[4] or "").strip()
            suffix = (row[5] or "").strip()
            full_name_parts = [p for p in [first_name, middle_initial, last_name, suffix] if p]
            seller_name = " ".join(full_name_parts) or (row[6] or "Warehouse Seller")

            return {
                "warehouse_employee_id": int(row[0]),
                "warehouse_profile_id": int(row[1]),
                "first_name": first_name,
                "middle_initial": middle_initial,
                "last_name": last_name,
                "suffix": suffix,
                "seller_name": seller_name,
                "email": row[6] or "",
                "position": row[7] or "",
                "status": row[8] or "",
                "business_name": (row[9] or "GrainRise Warehouse").strip(),
                "organization_name": row[10] or "",
            }

    # Fallback to Warehouse Manager user context
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                wp.warehouse_profile_id,
                u.first_name,
                u.middle_initial,
                u.last_name,
                u.suffix,
                u.email,
                wp.business_name,
                wp.organization_name
            FROM warehouse_profiles wp
            INNER JOIN users u
                ON u.user_id = wp.user_id
            WHERE wp.warehouse_profile_id = %s
            LIMIT 1
            """,
            [warehouse_profile_id],
        )
        row = cursor.fetchone()

    if not row:
        return {}

    first_name = (row[1] or "").strip()
    middle_initial = (row[2] or "").strip()
    last_name = (row[3] or "").strip()
    suffix = (row[4] or "").strip()
    full_name_parts = [p for p in [first_name, middle_initial, last_name, suffix] if p]
    seller_name = " ".join(full_name_parts) or "Warehouse Manager"

    return {
        "warehouse_employee_id": None,
        "warehouse_profile_id": int(row[0]),
        "first_name": first_name,
        "middle_initial": middle_initial,
        "last_name": last_name,
        "suffix": suffix,
        "seller_name": seller_name,
        "email": row[5] or "",
        "position": "Warehouse Manager",
        "status": "active",
        "business_name": (row[6] or "GrainRise Warehouse").strip(),
        "organization_name": row[7] or "",
    }


def list_pos_products(warehouse_profile_id: int) -> list[dict]:
    """
    Fetch POS-eligible products from `warehouse_products` for the authenticated Warehouse branch:
    - Belongs to `warehouse_profile_id`
    - `status = 'active'` (excludes archived, expired, no-stock, etc.)
    - `expiry_date IS NOT NULL AND expiry_date > today (Asia/Manila)`
    - `stock_quantity >= 25` kg (at least 1 full sack of 25 kg)
    - `unit_cost > 0`
    """
    today_ph = _today_ph()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                wp.product_id,
                wp.warehouse_profile_id,
                wp.product_code,
                wp.product_name,
                wp.product_description,
                wp.product_image,
                wp.order_date,
                wp.arrival_date,
                wp.expiry_date,
                wp.stock_quantity,
                wp.unit_cost,
                wp.shelf_location,
                wp.status
            FROM warehouse_products wp
            WHERE wp.warehouse_profile_id = %s
              AND LOWER(TRIM(wp.status)) = 'active'
              AND wp.expiry_date IS NOT NULL
              AND wp.expiry_date > %s
              AND wp.stock_quantity >= 25
              AND wp.unit_cost IS NOT NULL
              AND wp.unit_cost > 0
            ORDER BY wp.product_name ASC, wp.expiry_date ASC, wp.product_id ASC
            """,
            [warehouse_profile_id, today_ph],
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
                "warehouse_product_id": int(row[0]),
                "warehouse_profile_id": int(row[1]),
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


def list_pos_payment_accounts(warehouse_profile_id: int) -> list[dict]:
    """
    Fetch active GCash and Bank Transfer payment accounts configured for this Warehouse branch
    from `warehouse_online_transaction_credentials`.
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                credentials_id,
                warehouse_profile_id,
                type,
                platform_name,
                bank_name,
                provider_name,
                account_name,
                account_number,
                is_default,
                status,
                updated_at
            FROM warehouse_online_transaction_credentials
            WHERE warehouse_profile_id = %s
              AND LOWER(TRIM(status)) = 'active'
            ORDER BY
                is_default DESC,
                CASE WHEN LOWER(type) = 'gcash' THEN 0 ELSE 1 END,
                updated_at DESC,
                credentials_id DESC
            """,
            [warehouse_profile_id],
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
                "warehouse_profile_id": int(row[1]),
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


def get_pos_checkout_receipt(warehouse_profile_id: int, reference_no: str) -> dict | None:
    """
    Build the complete Sales Receipt payload for a completed POS checkout (`reference_no`)
    scoped to `warehouse_profile_id`.
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
                s.warehouse_profile_id,
                s.warehouse_product_id,
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
                wp.product_name,
                wp.product_code,
                wp.expiry_date,
                wp.unit_cost,
                prof.business_name,
                we.first_name,
                we.middle_initial,
                we.last_name,
                we.suffix,
                wotc.platform_name,
                wotc.bank_name,
                wotc.provider_name,
                wotc.account_name,
                wotc.account_number,
                u.first_name,
                u.middle_initial,
                u.last_name,
                u.suffix
            FROM warehouse_ftf_sales s
            INNER JOIN warehouse_profiles prof
                ON prof.warehouse_profile_id = s.warehouse_profile_id
            LEFT JOIN warehouse_products wp
                ON wp.product_id = s.warehouse_product_id
            LEFT JOIN warehouse_employees we
                ON we.warehouse_employee_id = s.sold_by_employee_id
            LEFT JOIN users u
                ON u.user_id = prof.user_id
            LEFT JOIN warehouse_online_transaction_credentials wotc
                ON wotc.credentials_id = s.payment_credentials_id
            WHERE s.warehouse_profile_id = %s
              AND s.reference_no = %s
            ORDER BY s.transaction_id ASC
            """,
            [warehouse_profile_id, clean_ref],
        )
        rows = cursor.fetchall()

    if not rows:
        return None

    # Calculate checkout total via SQL SUM(total_payment) for all rows sharing reference_no
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COALESCE(SUM(total_payment), 0)
            FROM warehouse_ftf_sales
            WHERE warehouse_profile_id = %s
              AND reference_no = %s
            """,
            [warehouse_profile_id, clean_ref],
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
            tx_dt_ph = tx_dt
        date_formatted = tx_dt_ph.strftime("%b %d, %Y %I:%M %p")
        date_iso = tx_dt_ph.isoformat()
    else:
        now_ph = datetime.now(PH_TZ)
        date_formatted = now_ph.strftime("%b %d, %Y %I:%M %p")
        date_iso = now_ph.isoformat()

    # Seller name: from employee first, else owner user
    first_name = (first[18] or "").strip()
    middle_initial = (first[19] or "").strip()
    last_name = (first[20] or "").strip()
    suffix = (first[21] or "").strip()
    if not first_name and not last_name:
        first_name = (first[27] or "").strip()
        middle_initial = (first[28] or "").strip()
        last_name = (first[29] or "").strip()
        suffix = (first[30] or "").strip()

    name_parts = [p for p in [first_name, middle_initial, last_name, suffix] if p]
    seller_name = " ".join(name_parts) or "Warehouse Seller"

    # Payment account label if GCash/Bank
    payment_account_info = None
    if first[11]:
        cred_provider = (first[24] or first[23] or first[22] or payment_method_label).strip()
        acct_name = (first[25] or "").strip()
        acct_num = (first[26] or "").strip()
        payment_account_info = {
            "credentials_id": int(first[11]),
            "provider_name": cred_provider,
            "account_name": acct_name,
            "account_number": acct_num,
            "label": f"{cred_provider} - {acct_name} ({acct_num})" if acct_num else cred_provider,
        }

    items = []
    for r in rows:
        qty_kg = Decimal(str(r[4] or "0"))
        qty_sacks = int(qty_kg // KG_PER_SACK)
        line_total = Decimal(str(r[5] or "0.00")).quantize(Decimal("0.01"))
        unit_cost = Decimal(str(r[16] or "0.00"))
        sack_price = (unit_cost * KG_PER_SACK).quantize(Decimal("0.01"))

        expiry_obj = r[15]
        expiry_formatted = expiry_obj.strftime("%m/%d/%Y") if expiry_obj else "—"

        items.append(
            {
                "transaction_id": int(r[0]),
                "product_id": int(r[2]) if r[2] else None,
                "warehouse_product_id": int(r[2]) if r[2] else None,
                "product_name": r[13] or "Warehouse Product",
                "product_code": r[14] or "",
                "quantity_kg": float(qty_kg),
                "quantity_sacks": qty_sacks,
                "quantity_label": f"{qty_sacks} {'sack' if qty_sacks == 1 else 'sacks'}",
                "unit_cost_per_kg": float(unit_cost),
                "price_per_sack": float(sack_price),
                "line_total": float(line_total),
                "expiry_date": expiry_obj.isoformat() if expiry_obj else None,
                "expiry_formatted": expiry_formatted,
            }
        )

    return {
        "reference_no": clean_ref,
        "warehouse_profile_id": int(first[1]),
        "business_name": (first[17] or "GrainRise Warehouse").strip(),
        "transaction_date": date_iso,
        "transaction_date_formatted": date_formatted,
        "seller_name": seller_name,
        "sold_by_employee_id": int(first[10]) if first[10] else None,
        "payment_method": raw_payment_method,
        "payment_method_label": payment_method_label,
        "payment_credentials_id": int(first[11]) if first[11] else None,
        "payment_account": payment_account_info,
        "payment_proof_image": first[12] or "",
        "items": items,
        "items_count": len(items),
        "total_amount": float(checkout_total),
        "amount_paid": float(amount_paid),
        "change_amount": float(change_amount),
    }
