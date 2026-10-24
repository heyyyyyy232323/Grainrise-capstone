from django.urls import include, path


# ============================================================
# GRAINRISE
# MILLER MANAGER FUNCTION URLS
# ============================================================
#
# BASE ROUTE:
#
# /api/miller/
#
#
# CURRENT MILLER MODULES:
#
# /api/miller/contracts/
#
#
# NOTE:
# Additional Miller modules should be added here later using
# the same feature-folder pattern already used by Farmer.
# ============================================================


urlpatterns = [

    # ========================================================
    # CONTRACTS
    # ========================================================

    path(
        "contracts/",
        include(
            "api.miller_function.contracts.urls"
        ),
    ),

    # ========================================================
    # BRANCHES
    # ========================================================

    path(
        "branches/",
        include(
            "api.miller_function.branches.urls"
        ),
    ),

    # ========================================================
    # SUPPLIERS
    # ========================================================

    path(
        "suppliers/",
        include(
            "api.miller_function.suppliers.urls"
        ),
    ),

    # ========================================================
    # ORDER APPROVAL
    # ========================================================

    path(
        "order-approval/",
        include(
            "api.miller_function.order_approval.urls"
        ),
    ),
    path(
        "order-approval",
        include(
            "api.miller_function.order_approval.urls"
        ),
    ),

    # ========================================================
    # RECEIVING HISTORY
    # ========================================================

    path(
        "receiving-history/",
        include(
            "api.miller_function.receiving_history.urls"
        ),
    ),

    # ========================================================
    # EXPENSES
    # ========================================================

    path(
        "expenses/",
        include(
            "api.miller_function.expenses.urls"
        ),
    ),
    path(
        "expenses",
        include(
            "api.miller_function.expenses.urls"
        ),
    ),

    # ========================================================
    # ONLINE PAYMENT ACCOUNTS
    # ========================================================

    path(
        "payment-accounts/",
        include(
            "api.miller_function.online_payment_accounts.urls"
        ),
    ),
    path(
        "payment-accounts",
        include(
            "api.miller_function.online_payment_accounts.urls"
        ),
    ),

    # ========================================================
    # VEHICLE MANAGEMENT
    # ========================================================

    path(
        "vehicles/",
        include(
            "api.miller_function.vehicle_management.urls"
        ),
    ),
    path(
        "vehicles",
        include(
            "api.miller_function.vehicle_management.urls"
        ),
    ),

    # ========================================================
    # SALES HISTORY
    # ========================================================

    path(
        "sales-history/",
        include(
            "api.miller_function.sales_history.urls"
        ),
    ),
    path(
        "sales-history",
        include(
            "api.miller_function.sales_history.urls"
        ),
    ),

    # ========================================================
    # FINANCE MANAGEMENT HISTORY & REPORTS
    # ========================================================

    path(
        "finance-history/",
        include(
            "api.miller_function.finance_history.urls"
        ),
    ),
    path(
        "finance-history",
        include(
            "api.miller_function.finance_history.urls"
        ),
    ),

    # ========================================================
    # PERFORMANCE MONITORING
    # ========================================================

    path(
        "performance-monitoring/",
        include(
            "api.miller_function.performance_monitoring.urls"
        ),
    ),
    path(
        "performance-monitoring",
        include(
            "api.miller_function.performance_monitoring.urls"
        ),
    ),

    # ========================================================
    # FARE FEE MANAGEMENT
    # ========================================================

    path(
        "fare-fee/",
        include(
            "api.miller_function.fare_fee_management.urls"
        ),
    ),
    path(
        "fare-fee",
        include(
            "api.miller_function.fare_fee_management.urls"
        ),
    ),

    # ========================================================
    # MESSAGES
    # ========================================================

    path(
        "messages/",
        include(
            "api.miller_function.messages.urls"
        ),
    ),
    path(
        "messages",
        include(
            "api.miller_function.messages.urls"
        ),
    ),

    # ========================================================
    # FULFILLMENT HISTORY
    # ========================================================

    path(
        "fulfillment-history/",
        include(
            "api.miller_function.fulfillment_history.urls"
        ),
    ),
    path(
        "fulfillment-history",
        include(
            "api.miller_function.fulfillment_history.urls"
        ),
    ),
]




