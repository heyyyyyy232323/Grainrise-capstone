import logging
import uuid
from decimal import Decimal
from datetime import datetime, date

from django.db import connection, transaction

from .selectors import (
    get_farmer_application_details,
    get_farmer_offer_details,
    get_farmer_contract_details,
)

logger = logging.getLogger(__name__)


# ============================================================
# 1. CANCEL APPLICATION
# ============================================================

def cancel_farmer_application(farm_profile_id, application_id, cancellation_reason, cancellation_remarks=None):
    reason = str(cancellation_reason or "").strip()
    if not reason:
        raise ValueError("A nonempty cancellation reason is required.")

    remarks = str(cancellation_remarks or "").strip()
    full_reason = f"{reason}: {remarks}" if remarks else reason

    try:
        app_id_int = int(application_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid Application ID.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    application_id,
                    application_status,
                    farm_product_id,
                    committed_quantity_kg
                FROM existing_grainrise_farmer_contract_applications
                WHERE application_id = %s
                  AND farm_profile_id = %s
                FOR UPDATE
                """,
                [app_id_int, farm_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Contract application not found or does not belong to your account.")

            app_id, current_status, product_id, committed_qty = row
            status_clean = str(current_status or "").strip().lower()

            if status_clean in ("cancelled", "declined"):
                raise ValueError(f"Application is already {current_status} and cannot be cancelled.")

            if status_clean == "approved":
                raise ValueError("Application has already been approved and converted to a contract. Please use Void Request if applicable.")

            if status_clean not in ("pending", "under review", "under_review"):
                raise ValueError(f"Application cannot be cancelled in its current state ({current_status}).")

            # Update application record
            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_contract_applications
                SET application_status = 'Cancelled',
                    cancellation_reason = %s,
                    cancelled_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE application_id = %s
                """,
                [full_reason, app_id],
            )

            # Release reserved inventory commitment
            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_inventory_commitments
                SET commitment_status = 'Released',
                    released_quantity_kg = committed_quantity_kg,
                    updated_at = CURRENT_TIMESTAMP
                WHERE application_id = %s
                  AND commitment_status = 'Active'
                """,
                [app_id],
            )

    logger.info("Successfully cancelled application %s for farm_profile %s", app_id_int, farm_profile_id)
    return get_farmer_application_details(farm_profile_id, app_id_int)


# ============================================================
# 2. SUBMIT APPLICATION
# ============================================================

def submit_farmer_application(farm_profile_id, data):
    opportunity_id = data.get("opportunity_id") or data.get("posting_id")
    farm_product_id = data.get("farm_product_id")
    quantity = data.get("quantity_to_commit_kg") or data.get("committed_quantity_kg")
    price = data.get("proposed_selling_price_per_kg") or data.get("offered_price_per_kg")
    avail_date = data.get("expected_availability_date")
    notes = str(data.get("additional_notes") or data.get("remarks") or "").strip()
    signature = str(data.get("farmer_signature") or "").strip()

    if not opportunity_id:
        raise ValueError("Opportunity ID is required.")
    if not farm_product_id:
        raise ValueError("Please select a farm product.")
    try:
        qty_dec = Decimal(str(quantity))
        if qty_dec <= 0:
            raise ValueError("Committed quantity must be greater than zero.")
    except Exception:
        raise ValueError("Invalid committed quantity.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Check Opportunity eligibility
            cursor.execute(
                """
                SELECT opportunity_id, opportunity_code, opportunity_status,
                       required_quantity_kg, buying_price_per_kg,
                       partial_quantity_allowed, price_negotiation_allowed
                FROM existing_grainrise_farmer_contract_opportunities
                WHERE opportunity_id = %s
                FOR UPDATE
                """,
                [opportunity_id],
            )
            opp_row = cursor.fetchone()
            if not opp_row:
                raise ValueError("Purchasing opportunity not found.")
            if opp_row[2] != "open":
                raise ValueError("This opportunity is no longer open for applications.")

            req_qty = Decimal(str(opp_row[3]))
            opp_price = Decimal(str(opp_row[4]))
            partial_allowed = bool(opp_row[5])
            price_allowed = bool(opp_row[6])

            if not partial_allowed and qty_dec < req_qty:
                raise ValueError(f"Partial quantity is not allowed. Full requirement is {req_qty} kg.")

            # Validate Farmer Product ownership and available stock
            cursor.execute(
                """
                SELECT farm_product_id, stock_quantity_kg, product_status
                FROM existing_grainrise_farmer_products
                WHERE farm_product_id = %s AND farm_profile_id = %s
                FOR UPDATE
                """,
                [farm_product_id, farm_profile_id],
            )
            prod_row = cursor.fetchone()
            if not prod_row:
                raise ValueError("Selected product was not found or does not belong to your farm.")
            if prod_row[2] != "active":
                raise ValueError("Selected product is not currently active.")

            stock_qty = Decimal(str(prod_row[1]))

            # Check existing active commitments
            cursor.execute(
                """
                SELECT COALESCE(SUM(committed_quantity_kg - released_quantity_kg), 0)
                FROM existing_grainrise_farmer_inventory_commitments
                WHERE farm_product_id = %s AND commitment_status = 'Active'
                """,
                [farm_product_id],
            )
            committed_sum = Decimal(str(cursor.fetchone()[0]))
            avail_stock = stock_qty - committed_sum

            if qty_dec > avail_stock:
                raise ValueError(f"Committed quantity ({qty_dec} kg) exceeds available uncommitted stock ({avail_stock} kg).")

            # Check duplicate active applications to same opportunity
            cursor.execute(
                """
                SELECT application_id
                FROM existing_grainrise_farmer_contract_applications
                WHERE farm_profile_id = %s AND opportunity_id = %s
                  AND application_status IN ('Pending', 'Under Review')
                LIMIT 1
                """,
                [farm_profile_id, opportunity_id],
            )
            if cursor.fetchone():
                raise ValueError("You already have an active application submitted for this opportunity.")

            # Insert application
            app_code = f"APP-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
            final_price = Decimal(str(price)) if (price and price_allowed) else opp_price
            date_val = str(avail_date or date.today().isoformat()).split("T")[0]

            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_contract_applications (
                    farm_profile_id, opportunity_id, farm_product_id, application_code,
                    committed_quantity_kg, proposed_selling_price_per_kg,
                    expected_availability_date, application_status,
                    additional_notes, farmer_signature, farmer_signed_at
                ) VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, 'Pending',
                    %s, %s, %s
                )
                """,
                [
                    farm_profile_id, opportunity_id, farm_product_id, app_code,
                    qty_dec, final_price,
                    date_val,
                    notes, signature or None, datetime.now() if signature else None
                ],
            )
            app_id = cursor.lastrowid

            # Insert reservation commitment
            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_inventory_commitments (
                    farm_profile_id, farm_product_id, application_id,
                    committed_quantity_kg, commitment_status
                ) VALUES (
                    %s, %s, %s,
                    %s, 'Active'
                )
                """,
                [farm_profile_id, farm_product_id, app_id, qty_dec],
            )

    logger.info("Created application %s for farm %s", app_id, farm_profile_id)
    return get_farmer_application_details(farm_profile_id, app_id)


# ============================================================
# 3. CREATE OPEN BIDDING
# ============================================================

def create_farmer_bidding(farm_profile_id, data):
    farm_product_id = data.get("farm_product_id")
    quantity = data.get("quantity_open_for_bidding_kg") or data.get("quantity_open_kg")
    min_price = data.get("minimum_acceptable_price_per_kg") or data.get("minimum_price_per_kg")
    deadline = data.get("bidding_deadline") or data.get("bidding_deadline_at")
    fulfillment_date = data.get("preferred_fulfillment_date") or data.get("proposed_fulfillment_date")
    fulfillment_method = data.get("fulfillment_method") or "Buyer Pickup"
    terms = str(data.get("additional_terms") or "").strip()
    notes = str(data.get("notes_to_buyers") or "").strip()

    if not farm_product_id:
        raise ValueError("Please select a farm product for bidding.")
    try:
        qty_dec = Decimal(str(quantity))
        if qty_dec <= 0:
            raise ValueError("Bidding quantity must be greater than zero.")
    except Exception:
        raise ValueError("Invalid bidding quantity.")

    min_price_dec = None
    if min_price:
        try:
            min_price_dec = Decimal(str(min_price))
            if min_price_dec < 0:
                raise ValueError("Minimum price cannot be negative.")
        except Exception:
            raise ValueError("Invalid minimum acceptable price.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            # Check product stock
            cursor.execute(
                """
                SELECT farm_product_id, stock_quantity_kg, product_status
                FROM existing_grainrise_farmer_products
                WHERE farm_product_id = %s AND farm_profile_id = %s
                FOR UPDATE
                """,
                [farm_product_id, farm_profile_id],
            )
            prod_row = cursor.fetchone()
            if not prod_row:
                raise ValueError("Selected product not found or does not belong to your farm.")
            if prod_row[2] != "active":
                raise ValueError("Selected product is not currently active.")

            stock_qty = Decimal(str(prod_row[1]))

            cursor.execute(
                """
                SELECT COALESCE(SUM(committed_quantity_kg - released_quantity_kg), 0)
                FROM existing_grainrise_farmer_inventory_commitments
                WHERE farm_product_id = %s AND commitment_status = 'Active'
                """,
                [farm_product_id],
            )
            committed_sum = Decimal(str(cursor.fetchone()[0]))
            avail_stock = stock_qty - committed_sum

            if qty_dec > avail_stock:
                raise ValueError(f"Open bidding quantity ({qty_dec} kg) exceeds available uncommitted stock ({avail_stock} kg).")

            bid_code = f"BID-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
            dl_val = str(deadline or f"{date.today().year}-12-31 23:59:59").replace("T", " ")
            if len(dl_val) == 10:
                dl_val = f"{dl_val} 23:59:59"
            ful_date_val = str(fulfillment_date or date.today().isoformat()).split("T")[0]

            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_open_biddings (
                    farm_profile_id, farm_product_id, bidding_code,
                    quantity_open_kg, minimum_price_per_kg,
                    bidding_start_at, bidding_deadline_at,
                    fulfillment_method, preferred_fulfillment_date,
                    additional_terms, notes_to_buyers,
                    bidding_status
                ) VALUES (
                    %s, %s, %s,
                    %s, %s,
                    CURRENT_TIMESTAMP, %s,
                    %s, %s,
                    %s, %s,
                    'open'
                )
                """,
                [
                    farm_profile_id, farm_product_id, bid_code,
                    qty_dec, min_price_dec,
                    dl_val,
                    fulfillment_method, ful_date_val,
                    terms, notes
                ],
            )
            bid_id = cursor.lastrowid

            # Create inventory commitment
            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_inventory_commitments (
                    farm_profile_id, farm_product_id, bidding_id,
                    committed_quantity_kg, commitment_status
                ) VALUES (
                    %s, %s, %s,
                    %s, 'Active'
                )
                """,
                [farm_profile_id, farm_product_id, bid_id, qty_dec],
            )

    logger.info("Created open bidding %s for farm %s", bid_id, farm_profile_id)
    return {"bidding_id": bid_id, "bidding_code": bid_code}


# ============================================================
# 4. ACCEPT / DECLINE BIDDING OFFER
# ============================================================

def accept_bidding_offer(farm_profile_id, offer_id, signature=None):
    try:
        offer_id_int = int(offer_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid Offer ID.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    o.bidding_offer_id, o.bidding_id, o.supplier_profile_id,
                    o.offered_quantity_kg, o.offered_price_per_kg,
                    o.proposed_fulfillment_date, o.fulfillment_method,
                    o.proposed_terms, o.offer_status,
                    b.quantity_open_kg, b.bidding_status, b.farm_product_id,
                    sp.business_name
                FROM existing_grainrise_farmer_bidding_offers o
                INNER JOIN existing_grainrise_farmer_open_biddings b ON b.bidding_id = o.bidding_id
                INNER JOIN supplier_profiles sp ON sp.supplier_profile_id = o.supplier_profile_id
                WHERE o.bidding_offer_id = %s
                  AND b.farm_profile_id = %s
                FOR UPDATE
                """,
                [offer_id_int, farm_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Bidding offer not found or unauthorized.")

            (
                b_offer_id, bidding_id, supplier_id,
                offered_qty, offered_price,
                ful_date, ful_method, proposed_terms, offer_status,
                open_qty, bidding_status, farm_product_id,
                business_name
            ) = row

            if offer_status != "Pending":
                raise ValueError(f"Offer cannot be accepted because its status is already '{offer_status}'.")
            if bidding_status != "open":
                raise ValueError(f"Bidding is already '{bidding_status}'.")

            # Check remaining quantity
            cursor.execute(
                """
                SELECT COALESCE(SUM(offered_quantity_kg), 0)
                FROM existing_grainrise_farmer_bidding_offers
                WHERE bidding_id = %s AND offer_status = 'Accepted'
                """,
                [bidding_id],
            )
            already_accepted = Decimal(str(cursor.fetchone()[0]))
            remaining_qty = Decimal(str(open_qty)) - already_accepted
            offered_qty_dec = Decimal(str(offered_qty))

            if offered_qty_dec > remaining_qty:
                raise ValueError(
                    f"Cannot accept offer of {offered_qty_dec} kg. "
                    f"Only {remaining_qty} kg remaining for this bidding."
                )

            # Update Offer Status to Accepted
            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_bidding_offers
                SET offer_status = 'Accepted',
                    responded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE bidding_offer_id = %s
                """,
                [b_offer_id],
            )

            # Create Contract
            contract_code = f"CTR-{date.today().year}-{uuid.uuid4().hex[:6].upper()}"
            offered_price_dec = Decimal(str(offered_price))
            total_val = round(offered_qty_dec * offered_price_dec, 2)
            sig_text = signature or f"Accepted by Farmer Profile #{farm_profile_id}"

            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_contracts (
                    farm_profile_id, supplier_profile_id, farm_product_id,
                    contract_code, contract_source, bidding_offer_id,
                    contracted_quantity_kg, agreed_price_per_kg,
                    contract_start_date, fulfillment_date, fulfillment_method,
                    agreed_terms, farmer_signature, farmer_signed_at,
                    contract_status
                ) VALUES (
                    %s, %s, %s,
                    %s, 'Bidding Offer', %s,
                    %s, %s,
                    CURRENT_DATE, %s, %s,
                    %s, %s, CURRENT_TIMESTAMP,
                    'Active'
                )
                """,
                [
                    farm_profile_id, supplier_id, farm_product_id,
                    contract_code, b_offer_id,
                    offered_qty_dec, offered_price_dec,
                    ful_date, ful_method or "Buyer Pickup",
                    proposed_terms or "Standard GrainRise Bidding Acceptance terms",
                    sig_text
                ],
            )
            contract_id = cursor.lastrowid

            # Transfer accepted quantity to contract commitment
            cursor.execute(
                """
                INSERT INTO existing_grainrise_farmer_inventory_commitments (
                    farm_profile_id, farm_product_id, contract_id,
                    committed_quantity_kg, commitment_status
                ) VALUES (
                    %s, %s, %s,
                    %s, 'Active'
                )
                """,
                [farm_profile_id, farm_product_id, contract_id, offered_qty_dec],
            )

            # Check if bidding is now fully exhausted
            new_remaining = remaining_qty - offered_qty_dec
            if new_remaining <= 0:
                cursor.execute(
                    """
                    UPDATE existing_grainrise_farmer_open_biddings
                    SET bidding_status = 'closed', updated_at = CURRENT_TIMESTAMP
                    WHERE bidding_id = %s
                    """,
                    [bidding_id],
                )

    logger.info("Accepted offer %s -> Created contract %s", offer_id_int, contract_id)
    return get_farmer_contract_details(farm_profile_id, contract_id)


def decline_bidding_offer(farm_profile_id, offer_id, reason=None):
    try:
        offer_id_int = int(offer_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid Offer ID.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT o.bidding_offer_id, o.offer_status
                FROM existing_grainrise_farmer_bidding_offers o
                INNER JOIN existing_grainrise_farmer_open_biddings b ON b.bidding_id = o.bidding_id
                WHERE o.bidding_offer_id = %s AND b.farm_profile_id = %s
                FOR UPDATE
                """,
                [offer_id_int, farm_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Offer not found or unauthorized.")
            if row[1] != "Pending":
                raise ValueError(f"Offer is already '{row[1]}' and cannot be declined.")

            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_bidding_offers
                SET offer_status = 'Declined',
                    withdrawal_reason = %s,
                    withdrawn_at = CURRENT_TIMESTAMP,
                    responded_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE bidding_offer_id = %s
                """,
                [str(reason or "Declined by Farmer"), offer_id_int],
            )

    return get_farmer_offer_details(farm_profile_id, offer_id_int)


# ============================================================
# 5. VOID REQUEST CONTRACT
# ============================================================

def request_void_contract(farm_profile_id, contract_id, void_reason, remarks=None):
    reason = str(void_reason or "").strip()
    if not reason:
        raise ValueError("A nonempty void request reason is required.")

    full_reason = f"{reason}: {remarks}" if remarks else reason

    try:
        cid_int = int(contract_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid Contract ID.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT contract_id, contract_status
                FROM existing_grainrise_farmer_contracts
                WHERE contract_id = %s AND farm_profile_id = %s
                FOR UPDATE
                """,
                [cid_int, farm_profile_id],
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError("Contract not found or unauthorized.")
            if row[1] != "Active":
                raise ValueError(f"Contract cannot be voided in '{row[1]}' state.")

            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_contracts
                SET contract_status = 'Void Requested',
                    void_reason = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE contract_id = %s
                """,
                [full_reason, cid_int],
            )

    return get_farmer_contract_details(farm_profile_id, cid_int)


def sign_contract(farm_profile_id, contract_id, signature):
    sig = str(signature or "").strip()
    if not sig:
        raise ValueError("Signature cannot be empty.")

    try:
        cid_int = int(contract_id)
    except (TypeError, ValueError):
        raise ValueError("Invalid Contract ID.")

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE existing_grainrise_farmer_contracts
                SET farmer_signature = %s,
                    farmer_signed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE contract_id = %s AND farm_profile_id = %s
                """,
                [sig, cid_int, farm_profile_id],
            )

    return get_farmer_contract_details(farm_profile_id, cid_int)
