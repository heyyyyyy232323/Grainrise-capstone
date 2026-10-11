from django.urls import path
from . import views

urlpatterns = [
    path("", views.returns_list_view, name="miller_returns_list"),
    path("suppliers/", views.return_suppliers_view, name="miller_returns_suppliers"),
    path("<int:return_id>/", views.return_detail_view, name="miller_return_detail"),
    path("<int:return_id>/mark-returned/", views.mark_as_returned_view, name="miller_return_mark_returned"),
]

