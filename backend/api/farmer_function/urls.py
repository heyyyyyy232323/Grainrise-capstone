from django.urls import include, path

from api.farmer_function.pos.views import history as farmer_pos_history

urlpatterns = [
    # ========================================================
    # 1. CONTRACTS (Bry's implementation)
    # ========================================================
    path(
        "contracts/",
        include("api.farmer_function.contracts.urls"),
    ),

    # ========================================================
    # 2. MESSAGES (Bry's implementation)
    # ========================================================
    path(
        "messages/",
        include("api.farmer_function.messages.urls"),
    ),

    # ========================================================
    # 3. DASHBOARD (Restored implementation)
    # ========================================================
    path(
        "dashboard/",
        include("api.farmer_function.dashboard.urls"),
    ),

    # ========================================================
    # 4. FARM MANAGEMENT & INVENTORY (Restored implementation)
    # ========================================================
    path(
        "farm-management/",
        include("api.farmer_function.farm_management.urls"),
    ),

    # ========================================================
    # 5. POINT OF SALE (POS)
    # ========================================================
    path(
        "pos/",
        include("api.farmer_function.pos.urls"),
    ),
    path(
        "point-of-sale/",
        include("api.farmer_function.point_of_sale.urls"),
    ),

    # ========================================================
    # 6. TRANSACTION HISTORY
    # ========================================================
    path(
        "transaction-history/pos/",
        farmer_pos_history,
        name="farmer-transaction-history-pos",
    ),
    path(
        "transaction-history/",
        include("api.farmer_function.transaction_history.urls"),
    ),

    # ========================================================
    # 7. NOTIFICATIONS
    # ========================================================
    path(
        "notifications/",
        include("api.farmer_function.notifications.urls"),
    ),
]
