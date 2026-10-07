import logging

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from api.miller_employees_function.employee_auth import miller_encoder_required
from .selectors import (
    get_encoder_product,
    list_encoder_products,
    list_encoder_suppliers,
)
from .services import (
    archive_product,
    create_manual_product,
    delete_archived_product,
    process_unmilled_product,
    restore_product,
    save_product_image_file,
    update_active_product,
)

logger = logging.getLogger(__name__)


# ============================================================
# PRODUCTS COLLECTION (GET list, POST create)
# ============================================================

@api_view(["GET", "POST"])
@miller_encoder_required
def products_collection_view(request):
    """
    GET  /api/miller-employees/encoder/stock-management/products/
    POST /api/miller-employees/encoder/stock-management/products/
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    if request.method == "POST":
        return _create_product(request, supplier_profile_id)
    return _list_products(request, supplier_profile_id)


def _list_products(request, supplier_profile_id):
    """List products with optional ?status=unmilled|active|archived."""
    try:
        raw_status = request.query_params.get("status")
        status_filter = None

        if raw_status is not None and str(raw_status).strip() != "":
            status_filter = str(raw_status).strip().lower()
            allowed_statuses = {"unmilled", "active", "archived"}
            if status_filter not in allowed_statuses:
                return Response(
                    {
                        "success": False,
                        "message": (
                            f"Invalid status filter '{status_filter}'. "
                            "Allowed values: unmilled, active, archived."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        products = list_encoder_products(supplier_profile_id, status_filter=status_filter)
        return Response(
            {
                "success": True,
                "data": products,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing encoder products: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving products.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _create_product(request, supplier_profile_id):
    """Create a manual active product."""
    try:
        data = request.data

        # Handle file upload or image string
        product_image = None
        if "product_image" in request.FILES:
            product_image = save_product_image_file(
                request.FILES["product_image"],
                supplier_profile_id,
            )
        elif "product_image" in data:
            product_image = data.get("product_image")

        farmer_contact_id = data.get("farmer_contact_id")
        product_name = data.get("product_name")
        stock_quantity = data.get("stock_quantity")
        product_description = data.get("product_description")
        order_date = data.get("order_date")
        arrival_date = data.get("arrival_date")
        expiry_date = data.get("expiry_date")
        unit_cost = data.get("unit_cost")
        shelf_location = data.get("shelf_location")

        created = create_manual_product(
            supplier_profile_id=supplier_profile_id,
            farmer_contact_id=farmer_contact_id,
            product_name=product_name,
            stock_quantity=stock_quantity,
            product_description=product_description,
            product_image=product_image,
            order_date=order_date,
            arrival_date=arrival_date,
            expiry_date=expiry_date,
            unit_cost=unit_cost,
            shelf_location=shelf_location,
        )

        return Response(
            {
                "success": True,
                "data": created,
                "message": "Product created successfully.",
            },
            status=status.HTTP_201_CREATED,
        )

    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error creating manual product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while creating the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# PRODUCT DETAIL (GET, PATCH, DELETE)
# ============================================================

@api_view(["GET", "PATCH", "DELETE"])
@miller_encoder_required
def product_detail_view(request, product_id):
    """
    GET    /api/miller-employees/encoder/stock-management/products/<int:product_id>/
    PATCH  /api/miller-employees/encoder/stock-management/products/<int:product_id>/
    DELETE /api/miller-employees/encoder/stock-management/products/<int:product_id>/
    """
    supplier_profile_id = request.grainrise_supplier_profile_id

    if request.method == "GET":
        return _get_product_detail(supplier_profile_id, product_id)
    elif request.method == "PATCH":
        return _patch_product_detail(request, supplier_profile_id, product_id)
    elif request.method == "DELETE":
        return _delete_product_detail(supplier_profile_id, product_id)


def _get_product_detail(supplier_profile_id, product_id):
    try:
        product = get_encoder_product(supplier_profile_id, product_id)
        if not product:
            return Response(
                {
                    "success": False,
                    "message": "Product not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                "success": True,
                "data": product,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error fetching product detail: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _patch_product_detail(request, supplier_profile_id, product_id):
    try:
        data = dict(request.data)

        # Handle uploaded image if present
        if "product_image" in request.FILES:
            data["product_image"] = save_product_image_file(
                request.FILES["product_image"],
                supplier_profile_id,
            )

        # Ensure single values when data originates from QueryDict
        patch_payload = {}
        for k, v in data.items():
            if isinstance(v, list) and len(v) == 1:
                patch_payload[k] = v[0]
            else:
                patch_payload[k] = v

        updated = update_active_product(
            supplier_profile_id=supplier_profile_id,
            product_id=product_id,
            data=patch_payload,
        )

        return Response(
            {
                "success": True,
                "data": updated,
                "message": "Product updated successfully.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        msg = str(exc)
        if msg == "Product not found.":
            return Response(
                {
                    "success": False,
                    "message": msg,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": False,
                "message": msg,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error updating product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while updating the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _delete_product_detail(supplier_profile_id, product_id):
    try:
        result = delete_archived_product(
            supplier_profile_id=supplier_profile_id,
            product_id=product_id,
        )

        return Response(
            {
                "success": True,
                "data": result,
                "message": "Archived product permanently deleted.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        msg = str(exc)
        if msg == "Product not found.":
            return Response(
                {
                    "success": False,
                    "message": msg,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": False,
                "message": msg,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error deleting archived product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while deleting the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# PROCESS UNMILLED PRODUCT
# ============================================================

@api_view(["PATCH"])
@miller_encoder_required
def process_product_view(request, product_id):
    """
    PATCH /api/miller-employees/encoder/stock-management/products/<int:product_id>/process/
    Processes an unmilled product into active stock.
    Requires: expiry_date, stock_quantity, unit_cost, shelf_location.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        data = request.data
        expiry_date = data.get("expiry_date")
        stock_quantity = data.get("stock_quantity")
        unit_cost = data.get("unit_cost")
        shelf_location = data.get("shelf_location")

        processed = process_unmilled_product(
            supplier_profile_id=supplier_profile_id,
            product_id=product_id,
            expiry_date=expiry_date,
            stock_quantity=stock_quantity,
            unit_cost=unit_cost,
            shelf_location=shelf_location,
        )

        return Response(
            {
                "success": True,
                "data": processed,
                "message": "Unmilled product processed into active stock.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        msg = str(exc)
        if msg == "Product not found.":
            return Response(
                {
                    "success": False,
                    "message": msg,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": False,
                "message": msg,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error processing unmilled product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while processing the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# ARCHIVE PRODUCT
# ============================================================

@api_view(["POST"])
@miller_encoder_required
def archive_product_view(request, product_id):
    """
    POST /api/miller-employees/encoder/stock-management/products/<int:product_id>/archive/
    Body:
    {
      "reason": "..."
    }
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        reason = request.data.get("reason")
        if not reason or not str(reason).strip():
            return Response(
                {
                    "success": False,
                    "message": "Archive reason is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        archived = archive_product(
            supplier_profile_id=supplier_profile_id,
            product_id=product_id,
            reason=reason,
        )

        return Response(
            {
                "success": True,
                "data": archived,
                "message": "Product archived successfully.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        msg = str(exc)
        if msg == "Product not found.":
            return Response(
                {
                    "success": False,
                    "message": msg,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": False,
                "message": msg,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error archiving product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while archiving the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# RESTORE PRODUCT
# ============================================================

@api_view(["POST"])
@miller_encoder_required
def restore_product_view(request, product_id):
    """
    POST /api/miller-employees/encoder/stock-management/products/<int:product_id>/restore/
    Restores an archived product back to active status.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        restored = restore_product(
            supplier_profile_id=supplier_profile_id,
            product_id=product_id,
        )

        return Response(
            {
                "success": True,
                "data": restored,
                "message": "Product restored successfully.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as exc:
        msg = str(exc)
        if msg == "Product not found.":
            return Response(
                {
                    "success": False,
                    "message": msg,
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                "success": False,
                "message": msg,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        logger.exception("Error restoring product: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while restoring the product.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# SUPPLIERS LIST
# ============================================================

@api_view(["GET"])
@miller_encoder_required
def suppliers_list_view(request):
    """
    GET /api/miller-employees/encoder/stock-management/suppliers/
    Retrieves farmer contacts for the authenticated encoder's branch.
    """
    supplier_profile_id = request.grainrise_supplier_profile_id
    try:
        suppliers = list_encoder_suppliers(supplier_profile_id)
        return Response(
            {
                "success": True,
                "data": suppliers,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as exc:
        logger.exception("Error listing encoder suppliers: %s", exc)
        payload = {
            "success": False,
            "message": "An unexpected error occurred while retrieving suppliers.",
        }
        if settings.DEBUG:
            payload["debug"] = f"{exc.__class__.__name__}: {exc}"
        return Response(payload, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

