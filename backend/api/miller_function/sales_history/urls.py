from django.urls import path

from . import views

urlpatterns = [
    # In-Store Sales History
    path("in-store/", views.manager_in_store_sales_history_view, name="manager_in_store_sales_history"),
    path("in-store", views.manager_in_store_sales_history_view),

    # Online Sales History
    path("online/", views.manager_online_sales_history_view, name="manager_online_sales_history"),
    path("online", views.manager_online_sales_history_view),

    # POS Receipt details (supporting both receipt/<ref>/ and pos/receipt/<ref>/)
    path("receipt/<str:reference_no>/", views.manager_pos_receipt_detail_view, name="manager_pos_receipt_detail"),
    path("receipt/<str:reference_no>", views.manager_pos_receipt_detail_view),
    path("pos/receipt/<str:reference_no>/", views.manager_pos_receipt_detail_view),
    path("pos/receipt/<str:reference_no>", views.manager_pos_receipt_detail_view),
]

