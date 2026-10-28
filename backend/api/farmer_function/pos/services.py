"""Atomic Farmer POS checkout services."""
import re
import uuid
from decimal import Decimal, InvalidOperation
from django.db import connection, transaction
from .selectors import (
    TRANSACTION_TABLE, PRODUCT_TABLE, COMMITMENT_TABLE,
    FarmerPOSSchemaError, get_farmer_pos_receipt, transaction_columns,
)


class FarmerPOSValidationError(Exception):
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.message, self.status_code = message, status_code


def _reference(value):
    value = re.sub(r"\s+", "", str(value or "")).upper()
    return value or f"FARMER-{uuid.uuid4().hex[:12].upper()}"


def checkout(*, farmer_user_id, items, payment_method="cash", amount_paid=None,
             reference_no=None, idempotency_key=None):
    if not isinstance(items, list) or not items:
        raise FarmerPOSValidationError("Cannot checkout with an empty cart.")
    columns = transaction_columns()
    required = {"farm_profile_id", "farm_product_id", "reference_no",
                "quantity_sold", "price_per_kg", "line_total", "total_payment",
                "amount_paid", "change_amount", "payment_method"}
    missing = sorted(required - columns)
    if missing:
        raise FarmerPOSSchemaError(
            f"{TRANSACTION_TABLE} is unavailable or missing required column(s): "
            + ", ".join(missing)
        )
    merged = {}
    for item in items:
        try:
            pid = int(item.get("farm_product_id") or item.get("product_id") or item.get("id"))
            qty = Decimal(str(item.get("quantity_kg")))
        except (AttributeError, TypeError, ValueError, InvalidOperation):
            raise FarmerPOSValidationError("Each item requires a valid product and quantity.")
        if pid <= 0 or qty <= 0:
            raise FarmerPOSValidationError("Product and quantity must be greater than zero.")
        merged[pid] = merged.get(pid, Decimal("0")) + qty
    method = str(payment_method or "").strip().lower()
    if method not in {"cash", "gcash", "bank", "bank_transfer"}:
        raise FarmerPOSValidationError("Invalid payment method.")
    method = "bank" if method == "bank_transfer" else method
    ref = _reference(reference_no)
    idem = str(idempotency_key or "").strip()[:100] or None
    with transaction.atomic():
        with connection.cursor() as cursor:
            # Idempotency is conditional because the external schema may not expose it.
            cursor.execute(
                f"""SELECT 1 FROM {TRANSACTION_TABLE} t JOIN farm_profile f
                    ON f.farm_profile_id=t.farm_profile_id
                    WHERE f.user_id=%s AND t.reference_no=%s LIMIT 1""",
                [farmer_user_id, ref],
            )
            if cursor.fetchone():
                raise FarmerPOSValidationError(
                    "Reference number has already been used. Submit a new reference number."
                )
            pids = sorted(merged)
            marks = ",".join(["%s"] * len(pids))
            cursor.execute(
                f"""SELECT p.farm_product_id, p.farm_profile_id, p.stock_quantity_kg,
                           p.selling_price_per_kg,
                           COALESCE((SELECT SUM(GREATEST(c.committed_quantity_kg -
                               COALESCE(c.released_quantity_kg, 0), 0))
                               FROM {COMMITMENT_TABLE} c
                              WHERE c.farm_product_id=p.farm_product_id
                                AND LOWER(COALESCE(c.commitment_status,'active'))
                                    IN ('active','approved','committed')), 0)
                      FROM {PRODUCT_TABLE} p WHERE p.farm_product_id IN ({marks})
                      ORDER BY p.farm_product_id FOR UPDATE""", pids)
            rows = {int(r[0]): r for r in cursor.fetchall()}
            lines, total = [], Decimal("0")
            for pid, qty in merged.items():
                row = rows.get(pid)
                if not row:
                    raise FarmerPOSValidationError(f"Product #{pid} was not found.")
                cursor.execute("SELECT user_id FROM farm_profile WHERE farm_profile_id=%s", [row[1]])
                owner = cursor.fetchone()
                if not owner or int(owner[0]) != int(farmer_user_id):
                    raise FarmerPOSValidationError("You do not own one of the selected products.", 403)
                available = Decimal(str(row[2] or 0)) - Decimal(str(row[4] or 0))
                if qty > available:
                    raise FarmerPOSValidationError(f"Insufficient uncommitted stock for product #{pid}.")
                price = Decimal(str(row[3]))
                line_total = qty * price
                lines.append((pid, int(row[1]), qty, price, line_total)); total += line_total
            paid = total if method != "cash" else Decimal(str(amount_paid or 0))
            if paid < total:
                raise FarmerPOSValidationError("Amount paid is less than the checkout total.")
            insert_cols = ["farm_profile_id", "farm_product_id", "reference_no",
                           "quantity_sold", "price_per_kg",
                           "total_payment", "amount_paid", "change_amount", "payment_method"]
            placeholders = ",".join(["%s"] * len(insert_cols))
            for pid, profile_id, qty, price, line_total in lines:
                values = [profile_id, pid, ref, qty, price, total, paid, paid - total, method]
                cursor.execute(
                    f"INSERT INTO {TRANSACTION_TABLE} ({','.join(insert_cols)}) VALUES ({placeholders})",
                    values,
                )
                cursor.execute(
                    f"UPDATE {PRODUCT_TABLE} SET stock_quantity_kg=stock_quantity_kg-%s "
                    "WHERE farm_product_id=%s", [qty, pid])
    return get_farmer_pos_receipt(farmer_user_id, ref)
