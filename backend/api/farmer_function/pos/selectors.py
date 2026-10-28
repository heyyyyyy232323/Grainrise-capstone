"""Read-only queries for the farmer POS.

The POS transaction table is an externally-owned table.  It is deliberately
not represented by a managed Django model or a migration.
"""
from django.db import connection
from decimal import Decimal

TRANSACTION_TABLE = "existing_grainrise_farmer_pos_transactions"
PRODUCT_TABLE = "existing_grainrise_farmer_products"
COMMITMENT_TABLE = "existing_grainrise_farmer_inventory_commitments"


class FarmerPOSSchemaError(RuntimeError):
    """The deployed GrainRise schema cannot support this operation."""


def _columns(table):
    table_names = {
        entry.name
        for entry in connection.introspection.get_table_list(connection.cursor())
    }
    if table not in table_names:
        return set()
    with connection.cursor() as cursor:
        return {
            column.name
            for column in connection.introspection.get_table_description(cursor, table)
        }


def transaction_columns():
    return _columns(TRANSACTION_TABLE)


def _require_transaction_schema():
    columns = transaction_columns()
    required = {
        "farm_profile_id", "farm_product_id", "reference_no",
        "quantity_sold", "price_per_kg", "line_total", "total_payment",
        "amount_paid", "change_amount", "payment_method", "created_at",
    }
    missing = sorted(required - columns)
    if missing:
        raise FarmerPOSSchemaError(
            f"{TRANSACTION_TABLE} is unavailable or missing required column(s): "
            + ", ".join(missing)
        )
    return columns


def list_farmer_pos_products(farmer_user_id):
    """Return active, sellable inventory, excluding committed stock."""
    columns = _columns(PRODUCT_TABLE)
    required = {
        "farm_product_id", "farm_profile_id", "stock_quantity_kg",
        "selling_price_per_kg", "product_status",
    }
    missing = sorted(required - columns)
    if missing:
        raise FarmerPOSSchemaError("existing_grainrise_farmer_products is missing: " + ", ".join(missing))
    name = "rice_variety" if "rice_variety" in columns else "product_type"
    predicates = ["f.user_id = %s", "p.stock_quantity_kg > COALESCE(c.committed, 0)",
                  "p.selling_price_per_kg IS NOT NULL", "p.selling_price_per_kg > 0",
                  "LOWER(COALESCE(p.product_status, 'active')) NOT IN ('archived', 'inactive')"]
    params = [farmer_user_id]
    query = f"""SELECT p.farm_product_id, p.{name}, p.stock_quantity_kg,
                       COALESCE(c.committed, 0), p.selling_price_per_kg
                  FROM {PRODUCT_TABLE} p
                  JOIN farm_profile f ON f.farm_profile_id = p.farm_profile_id
             LEFT JOIN (SELECT farm_product_id,
                               SUM(GREATEST(committed_quantity_kg - COALESCE(released_quantity_kg, 0), 0)) committed
                          FROM {COMMITMENT_TABLE}
                         WHERE LOWER(COALESCE(commitment_status, 'active')) IN
                               ('active', 'approved', 'committed')
                         GROUP BY farm_product_id) c ON c.farm_product_id = p.farm_product_id
                 WHERE {' AND '.join(predicates)}
                 ORDER BY p.{name}, p.farm_product_id"""
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        rows = cursor.fetchall()
    return [
        {
            "id": int(row[0]), "farm_product_id": int(row[0]),
            "product_name": row[1] or "Farmer product",
            "total_stock_quantity_kg": float(row[2] or 0),
            "reserved_committed_quantity_kg": float(row[3] or 0),
            "available_stock_quantity_kg": float((row[2] or 0) - (row[3] or 0)),
            "selling_price_per_kg": float(row[4]),
        }
        for row in rows
    ]


def get_farmer_pos_receipt(farmer_user_id, reference_no):
    columns = _require_transaction_schema()
    product_columns = _columns(PRODUCT_TABLE)
    product_name_column = (
        "product_name"
        if "product_name" in product_columns
        else "rice_variety"
        if "rice_variety" in product_columns
        else None
    )
    product_name = f"fp.{product_name_column}" if product_name_column else "NULL"
    with connection.cursor() as cursor:
        cursor.execute(
            f"""SELECT t.transaction_id, t.farm_product_id, {product_name}, t.quantity_sold,
                       t.price_per_kg, t.line_total, t.total_payment, t.amount_paid,
                       t.change_amount, t.payment_method, t.created_at
                  FROM {TRANSACTION_TABLE} t
             LEFT JOIN {PRODUCT_TABLE} fp ON fp.farm_product_id=t.farm_product_id
             JOIN farm_profile f ON f.farm_profile_id=t.farm_profile_id
                 WHERE f.user_id=%s AND t.reference_no=%s
                 ORDER BY t.farm_product_id""",
            [farmer_user_id, reference_no.strip()],
        )
        rows = cursor.fetchall()
    if not rows:
        return None
    return {
        "reference_no": reference_no.strip(),
        "farmer_user_id": int(farmer_user_id),
        "payment_method": rows[0][9],
        "transaction_date": rows[0][10].isoformat() if rows[0][10] else None,
        "items": [
            {
                "farm_product_id": int(r[1]),
                "product_name": r[2] or "Farmer product",
                "quantity_kg": float(r[3]), "quantity_label": f"{float(r[3]):g} kg",
                "unit_price": float(r[4]), "line_total": float(r[5]),
                "line_subtotal": float(r[5]),
            }
            for r in rows
        ],
        "total_amount": float(rows[0][6]),
        "amount_paid": float(rows[0][7]), "change_amount": float(rows[0][8]),
    }


def _checkout_total(values):
    """Handle legacy tables which stored the checkout total on every line."""
    amounts = [Decimal(str(value or 0)) for value in values]
    if not amounts:
        return Decimal("0")
    if len(amounts) > 1 and len(set(amounts)) == 1:
        return amounts[0]
    return sum(amounts, Decimal("0"))


def list_farmer_pos_history(farmer_user_id, search=None, start_date=None,
                            end_date=None, payment_method=None,
                            sort_by="date-desc", page=1, page_size=25):
    """List one row per checkout, scoped to the authenticated farmer."""
    columns = _require_transaction_schema()
    product_columns = _columns(PRODUCT_TABLE)
    name = "product_name" if "product_name" in product_columns else (
        "rice_variety" if "rice_variety" in product_columns else None
    )
    created = "t.created_at"
    product_name = f"fp.{name}" if name else "NULL"
    where = ["f.user_id = %s"]
    params = [farmer_user_id]
    if start_date and "created_at" in columns:
        where.append("DATE(t.created_at) >= %s"); params.append(start_date)
    if end_date and "created_at" in columns:
        where.append("DATE(t.created_at) <= %s"); params.append(end_date)
    if payment_method:
        where.append("LOWER(TRIM(t.payment_method)) = %s")
        params.append(payment_method.lower().replace("bank_transfer", "bank"))
    if search:
        term = f"%{search.lower()}%"
        where.append(
            "(LOWER(t.reference_no) LIKE %s OR LOWER(COALESCE(t.payment_method,'')) LIKE %s "
            f"OR LOWER(COALESCE({product_name},'')) LIKE %s OR CAST(t.total_payment AS CHAR) LIKE %s)"
        )
        params.extend([term, term, term, term])
    order = "t.created_at DESC, t.transaction_id DESC"
    if sort_by == "date-asc":
        order = "t.created_at ASC, t.transaction_id ASC"
    elif sort_by in ("amount-desc", "total-desc"):
        order = "t.total_payment DESC"
    elif sort_by in ("amount-asc", "total-asc"):
        order = "t.total_payment ASC"
    elif sort_by == "reference-asc":
        order = "t.reference_no ASC"
    with connection.cursor() as cursor:
        cursor.execute(
            f"""SELECT t.transaction_id, t.reference_no, t.farm_product_id, {product_name},
                       t.quantity_sold, t.price_per_kg, t.line_total, t.total_payment,
                       t.payment_method, t.created_at
                  FROM {TRANSACTION_TABLE} t
                  JOIN farm_profile f ON f.farm_profile_id=t.farm_profile_id
                  LEFT JOIN {PRODUCT_TABLE} fp ON fp.farm_product_id=t.farm_product_id
                 WHERE {' AND '.join(where)} ORDER BY {order}""", params)
        rows = cursor.fetchall()
    grouped = {}
    for row in rows:
        ref = (row[1] or "").strip()
        quantity = float(row[4] or 0)
        line_total = float(row[6] or 0)
        item = {"farm_product_id": int(row[2]), "product_name": row[3] or "Farmer product",
                "quantity_kg": quantity, "line_total": line_total,
                "unit_price": float(row[5] or 0)}
        grouped.setdefault(ref, {"reference_no": ref, "payment_method": row[8],
                                 "transaction_date": row[9], "checkout_total": row[7],
                                 "items": []})["items"].append(item)
    results = []
    for ref, sale in grouped.items():
        total = Decimal(str(sale["checkout_total"] or 0))
        quantity = sum(item["quantity_kg"] for item in sale["items"])
        results.append({
            "reference_no": ref, "transaction_id": ref, "payment_method": sale["payment_method"],
            "transaction_date": sale["transaction_date"].isoformat() if sale["transaction_date"] else None,
            "quantity_kg": quantity, "quantity_sold_kg": quantity,
            "total_amount": float(total), "amount": float(total), "items": sale["items"],
        })
    if sort_by in ("amount-desc", "total-desc"):
        results.sort(key=lambda x: (x["total_amount"], x["reference_no"]), reverse=True)
    elif sort_by in ("amount-asc", "total-asc"):
        results.sort(key=lambda x: (x["total_amount"], x["reference_no"]))
    elif sort_by == "reference-asc":
        results.sort(key=lambda x: x["reference_no"])
    else:
        results.sort(key=lambda x: (x["transaction_date"] or "", x["reference_no"]),
                     reverse=sort_by != "date-asc")
    total_count = len(results)
    start = max(page - 1, 0) * page_size
    return {"results": results[start:start + page_size], "total_count": total_count,
            "page": page, "page_size": page_size, "total_pages": (total_count + page_size - 1) // page_size}
