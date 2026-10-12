from django.urls import path

from . import views

urlpatterns = [
    path("products/", views.products_collection_view, name="encoder-products-collection"),
    path("products", views.products_collection_view, name="encoder-products-collection-noslash"),
    path("products/<int:product_id>/", views.product_detail_view, name="encoder-product-detail"),
    path("products/<int:product_id>", views.product_detail_view, name="encoder-product-detail-noslash"),
    path("products/<int:product_id>/process/", views.process_product_view, name="encoder-product-process"),
    path("products/<int:product_id>/process", views.process_product_view, name="encoder-product-process-noslash"),
    path("products/<int:product_id>/archive/", views.archive_product_view, name="encoder-product-archive"),
    path("products/<int:product_id>/archive", views.archive_product_view, name="encoder-product-archive-noslash"),
    path("products/<int:product_id>/restore/", views.restore_product_view, name="encoder-product-restore"),
    path("products/<int:product_id>/restore", views.restore_product_view, name="encoder-product-restore-noslash"),
    path("suppliers/", views.suppliers_list_view, name="encoder-suppliers-list"),
    path("suppliers", views.suppliers_list_view, name="encoder-suppliers-list-noslash"),
]

