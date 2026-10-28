import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Pencil, Image as ImageIcon } from "lucide-react";

const STOCK_DOT = {
  in_stock: "bg-emerald-500",
  low_stock: "bg-amber-400",
  out_of_stock: "bg-rose-500",
};

// ─── Modal Detail Row Sub-Component (Matches Miller Order Approval Style) ──────
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : isBadge ? (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeStyle}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

export default function FarmerInventoryProductDetailsModal({
  open,
  product,
  onClose,
  onEdit,
}) {
  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !product) return null;

  const isActive = product.status === "active";
  const isArchived = product.status === "archived";

  const totalStock = parseFloat(product.total_stock_quantity_kg || product.stock_quantity_kg || 0);
  const reservedStock = parseFloat(product.reserved_committed_quantity_kg || 0);
  const availableStock = parseFloat(
    product.available_quantity_kg !== undefined && product.available_quantity_kg !== null
      ? product.available_quantity_kg
      : Math.max(totalStock - reservedStock, 0)
  );

  const stockLevel =
    product.stock_level ||
    (availableStock >= 200 ? "in_stock" : availableStock > 0 ? "low_stock" : "out_of_stock");

  const stockLevelLabel =
    stockLevel === "in_stock"
      ? "In Stock"
      : stockLevel === "low_stock"
      ? "Low Stock"
      : "Out of Stock";

  const stockLevelBadgeStyle =
    stockLevel === "in_stock"
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
      : stockLevel === "low_stock"
      ? "bg-amber-100 text-amber-700 border border-amber-200"
      : "bg-rose-100 text-rose-700 border border-rose-200";

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="farmer-product-details-title"
    >
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Matches Miller Order Approval Style) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="farmer-product-details-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                {product.rice_variety || "Product Details"}
              </h2>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                  isActive
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {isActive ? "Active" : "Archived"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Product Code: <span className="font-mono font-semibold text-slate-700">{product.product_code || "—"}</span>
            </p>
          </div>

          {/* Top-right X Button: Only way to exit */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close details"
            title="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
          {/* ── SECTION 1 — PRODUCT IDENTIFICATION ─────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Product Information
            </div>

            <ModalDetailRow
              label="Rice Variety"
              value={product.rice_variety || "—"}
            />

            <ModalDetailRow
              label="Product Code"
              value={product.product_code || "—"}
            />

            <ModalDetailRow
              label="Product Type"
              value={product.product_type || "—"}
              isBadge
              badgeStyle={
                product.product_type === "Unmilled Palay"
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }
            />

            <ModalDetailRow
              label="Product Grade"
              value={product.product_grade || "Standard"}
            />

            <ModalDetailRow label="Selling Price">
              <span className="font-bold text-emerald-700">
                {product.selling_price_per_kg !== null && product.selling_price_per_kg !== undefined
                  ? `₱${Number(product.selling_price_per_kg).toFixed(2)} / kg`
                  : "Not set"}
              </span>
            </ModalDetailRow>

            <ModalDetailRow
              label="Record Origin"
              value={product.record_source_type || product.record_origin || "Manually Added"}
            />

            <ModalDetailRow
              label="Date Added"
              value={product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}
            />

            {/* Product Photo */}
            <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium shrink-0">
                Product Photo:
              </span>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                {product.product_image ? (
                  <img
                    src={product.product_image}
                    alt={product.rice_variety || "Product photo"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon size={18} />
                    <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                      IMG
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 2 — STOCK & RESERVATION BREAKDOWN ───────────── */}
          <div className="border-t border-slate-100 pt-2" />
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Stock & Reservation Breakdown
            </div>

            {/* Metric Comparison Cards */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-center">
                <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Total Stock
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {totalStock.toLocaleString()} kg
                </span>
              </div>
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 text-center">
                <span className="text-[10px] font-semibold text-amber-600 block uppercase tracking-wider">
                  Reserved
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-800">
                  {reservedStock.toLocaleString()} kg
                </span>
              </div>
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 text-center">
                <span className="text-[10px] font-semibold text-emerald-600 block uppercase tracking-wider">
                  Available
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-800">
                  {availableStock.toLocaleString()} kg
                </span>
              </div>
            </div>

            <div className="pt-1.5 space-y-0.5">
              <ModalDetailRow label="Total Stock Quantity">
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-800">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      STOCK_DOT[stockLevel] || "bg-slate-300"
                    }`}
                  />
                  <span>{totalStock.toLocaleString()} kg</span>
                </div>
              </ModalDetailRow>

              <ModalDetailRow label="Reserved / Committed Stock">
                <span
                  className={`font-semibold ${
                    reservedStock > 0 ? "text-amber-700" : "text-slate-700"
                  }`}
                >
                  {reservedStock.toLocaleString()} kg
                </span>
              </ModalDetailRow>

              <ModalDetailRow label="Available Stock">
                <span className="font-bold text-emerald-700">
                  {availableStock.toLocaleString()} kg
                </span>
              </ModalDetailRow>

              <ModalDetailRow
                label="Stock Level"
                value={stockLevelLabel}
                isBadge
                badgeStyle={stockLevelBadgeStyle}
              />
            </div>
          </div>

          {/* ── SECTION 3 — SOURCE & HARVEST INFORMATION ────────────── */}
          <div className="border-t border-slate-100 pt-2" />
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Source & Harvest Information
            </div>

            <ModalDetailRow
              label="Source Type"
              value={product.acquisition_source_type || product.source_type || "Own Farm"}
            />

            <ModalDetailRow
              label="Source Farm"
              value={product.source_farm_name || "—"}
            />

            <ModalDetailRow
              label="Farm Location"
              value={product.source_farm_location || "—"}
            />

            <ModalDetailRow
              label="Harvest / Acquisition Date"
              value={product.harvest_acquisition_date || "—"}
            />

            {product.source_crop_cycle_number && (
              <ModalDetailRow
                label="Crop Cycle"
                value={`Cycle #${product.source_crop_cycle_number} (${product.source_crop_status || "Harvested"})`}
              />
            )}

            {product.source_acquisition_remarks && (
              <div className="pt-1.5 space-y-1">
                <span className="text-slate-500 font-medium text-xs block">
                  Acquisition Remarks:
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {product.source_acquisition_remarks}
                </p>
              </div>
            )}
          </div>

          {/* ── SECTION 4 — PRODUCT DESCRIPTION (Optional) ──────────── */}
          {product.description && (
            <>
              <div className="border-t border-slate-100 pt-2" />
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Product Description
                </div>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {product.description}
                </p>
              </div>
            </>
          )}

          {/* ── SECTION 5 — ARCHIVE DETAILS (If archived) ───────────── */}
          {isArchived && (
            <>
              <div className="border-t border-slate-100 pt-2" />
              <div className="space-y-1.5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 mb-1">
                  Archive Information
                </div>
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 space-y-1 text-xs">
                  <ModalDetailRow label="Archive Reason">
                    <span className="text-amber-900 font-medium">
                      {product.archive_reason || "Archived by farmer"}
                    </span>
                  </ModalDetailRow>
                  {product.archived_at && (
                    <ModalDetailRow label="Archived Date">
                      <span className="text-amber-800 font-medium">
                        {new Date(product.archived_at).toLocaleString()}
                      </span>
                    </ModalDetailRow>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer: Edit Product as ONLY footer action (Archive removed) */}
        {isActive && (
          <div className="flex items-center justify-end px-6 py-3.5 bg-[#F5F7FF] border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => onEdit?.(product)}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Pencil size={14} />
              Edit Product
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
