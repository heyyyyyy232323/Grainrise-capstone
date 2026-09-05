from django.urls import path

from .views import (
    contract_history,
    contract_history_details,
    pos_transaction_summary,
    pos_transactions,
)


# ============================================================
# GRAINRISE
# FARMER > TRANSACTION HISTORY
# URLS
# ============================================================
#
# PARENT ROUTE:
#
# /api/farmer/transaction-history/
#
#
# SEGMENTS:
#
# 1. POS Transactions
#
# 2. Contract History
#
#
# ENDPOINTS:
#
# GET
# /api/farmer/transaction-history/pos/
#
# GET
# /api/farmer/transaction-history/pos/summary/
#
# GET
# /api/farmer/transaction-history/contracts/
#
# GET
# /api/farmer/transaction-history/contracts/<contract_id>/
#
# ============================================================


urlpatterns = [

    # ========================================================
    # POS TRANSACTIONS
    # ========================================================

    path(
        "pos/",
        pos_transactions,
        name="farmer-transaction-history-pos",
    ),


    # ========================================================
    # POS SUMMARY
    # ========================================================

    path(
        "pos/summary/",
        pos_transaction_summary,
        name="farmer-transaction-history-pos-summary",
    ),


    # ========================================================
    # CONTRACT HISTORY
    # ========================================================

    path(
        "contracts/",
        contract_history,
        name="farmer-transaction-history-contracts",
    ),


    # ========================================================
    # CONTRACT HISTORY DETAILS
    # ========================================================

    path(
        "contracts/<int:contract_id>/",
        contract_history_details,
        name="farmer-transaction-history-contract-details",
    ),

]