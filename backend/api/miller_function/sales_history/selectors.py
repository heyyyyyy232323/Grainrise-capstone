"""
Selectors for Miller Manager Sales History across all owned branches.
"""

from decimal import Decimal
from django.db import connection

from api.miller_employees_function.miller_sales.selectors import (
    format_display_currency,
    format_display_date,
    format_display_qty,
    get_pos_checkout_receipt,
)


def list_manager_in_store_sales(
    miller_user_id: int,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = "date-desc",
) -> list[dict]:
    """
    Fetch completed in-store sales transactions from `miller_ftf_sales`
    joined with `miller_products` and `supplier_profiles`, scoped to all branches
    owned by the authenticated Miller Manager (sp.user_id = miller_user_id).
    """
    if not miller_user_id:
        return []

    where_clauses = ["sp.user_id = %s"]
    params = [miller_user_id]

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
                OR LOWER(COALESCE(sp.business_name, '')) LIKE %s
                OR CAST(mfs.total_payment AS CHAR) LIKE %s
                OR CAST(mfs.quantity_sold AS CHAR) LIKE %s
            )"""
        )
        params.extend([s_query, s_query, s_query, s_query, s_query, s_query, s_query])

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
            mp.stock_quantity,
            sp.business_name
        FROM miller_ftf_sales mfs
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = mfs.supplier_profile_id
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
        supplier_profile_id = int(r[1])
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
        branch_name = (r[18] or "Miller Branch").strip()

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
            "branchName": branch_name,
            "branch": branch_name,
            "supplierProfileId": supplier_profile_id,
            "sortTimestamp": int(created_at.timestamp()) if created_at else 0,
        })

    return results


def list_manager_online_sales(
    miller_user_id: int,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    sort_by: str = "date-desc",
) -> list[dict]:
    """
    Fetch online sales transactions from `miller_online_orders_payment`
    joined with `miller_online_customer` and `supplier_profiles`, scoped to all branches
    owned by the authenticated Miller Manager (sp.user_id = miller_user_id).
    """
    if not miller_user_id:
        return []

    where_clauses = ["sp.user_id = %s"]
    params = [miller_user_id]

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
                OR LOWER(COALESCE(sp.business_name, '')) LIKE %s
                OR LOWER(COALESCE(moop.payment_method, '')) LIKE %s
                OR LOWER(COALESCE(moop.status, '')) LIKE %s
                OR LOWER(COALESCE(moc.status, '')) LIKE %s
                OR CAST(moc.total_price AS CHAR) LIKE %s
            )"""
        )
        params.extend([s_query, s_query, s_query, s_query, s_query, s_query, s_query, s_query, s_query, s_query])

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
            COALESCE(moop.supplier_profile_id, moc.supplier_profile_id) AS supplier_profile_id,
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
            END AS buyer_type,
            sp.business_name
        FROM miller_online_orders_payment moop
        JOIN miller_online_customer moc ON moop.online_order_id = moc.online_order_id
        INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = COALESCE(moop.supplier_profile_id, moc.supplier_profile_id)
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
        supplier_profile_id = int(r[1])
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
        branch_name = (r[25] or "Miller Branch").strip()

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
            "branchName": branch_name,
            "branch": branch_name,
            "supplierProfileId": supplier_profile_id,
            "sortTimestamp": int(date_ordered.timestamp()) if date_ordered else 0,
        })

    return results


def get_manager_pos_checkout_receipt(miller_user_id: int, reference_no: str) -> dict | None:
    """
    Build the complete Sales Receipt payload for a completed POS checkout (`reference_no`)
    validating server-side that the checkout belongs to a branch (supplier_profile)
    owned by the authenticated Miller Manager (`sp.user_id = miller_user_id`).
    """
    clean_ref = (reference_no or "").strip()
    if not miller_user_id or not clean_ref:
        return None

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT s.supplier_profile_id, sp.business_name
            FROM miller_ftf_sales s
            INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = s.supplier_profile_id
            WHERE sp.user_id = %s
              AND s.reference_no = %s
            LIMIT 1
            """,
            [miller_user_id, clean_ref],
        )
        row = cursor.fetchone()

    if not row:
        return None

    supplier_profile_id = int(row[0])
    receipt = get_pos_checkout_receipt(supplier_profile_id, clean_ref)
    if receipt:
        receipt["branchName"] = receipt.get("business_name")
        receipt["supplierProfileId"] = supplier_profile_id

    return receipt

