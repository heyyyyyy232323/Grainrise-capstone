import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, AlertTriangle, RotateCcw, X, Loader2 } from "lucide-react";

export const INVENTORY_ARCHIVE_ACTION = "archive";
export const INVENTORY_RESTORE_ACTION = "restore";

const MAX_REASON_LENGTH = 500;

export default function FarmerInventoryStatusConfirmModal({
  open,
  action = INVENTORY_ARCHIVE_ACTION,
  product,
  isSaving = false,
  error = "",
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");

  const isArchive = action === INVENTORY_ARCHIVE_ACTION;

  useEffect(() => {
    if (open) {
      setReason("");
      setLocalError("");
    }
  }, [open]);

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

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (isArchive) {
      const cleanReason = String(reason || "").trim();
      if (!cleanReason) {
        setLocalError("Please provide a mandatory reason for archiving this product.");
        return;
      }
      onConfirm(product.farm_product_id, cleanReason);
    } else {
      onConfirm(product.farm_product_id);
    }
  };

  const varietyName = product.rice_variety || product.variety || "Product";
  const productCode = product.product_code || "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      {/* Backdrop click does NOT close the modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        className="w-full max-w-[500px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Matches Miller EncoderArchiveProductModal) */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                isArchive
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {isArchive ? <Archive size={19} /> : <RotateCcw size={19} />}
            </div>
            <div className="min-w-0">
              <h2
                id="status-modal-title"
                className="text-[17px] font-extrabold text-slate-900"
              >
                {isArchive ? "Archive Product?" : "Restore Product?"}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {isArchive
                  ? "Move this item to the Archive tab."
                  : "Restore this item back to Active Stock."}
              </p>
            </div>
          </div>

          {/* Top-right X is the ONLY exit control */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Target Product Identity Card */}
          <div
            className={`rounded-xl border p-3.5 ${
              isArchive
                ? "border-amber-200/70 bg-amber-50/40"
                : "border-emerald-200/70 bg-emerald-50/40"
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${
                isArchive ? "text-amber-800" : "text-emerald-800"
              }`}
            >
              Selected Product
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900 truncate">
                {varietyName}
              </span>
              {productCode && (
                <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  {productCode}
                </span>
              )}
            </div>
          </div>

          {/* Warning Message Card */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
            <AlertTriangle
              size={15}
              className={`shrink-0 mt-0.5 ${
                isArchive ? "text-amber-500" : "text-emerald-600"
              }`}
            />
            <span>
              {isArchive
                ? "This product will be archived and hidden from active stock. You can restore it later from the Archive tab."
                : "This product will be restored to your Active Stock with its original stock balance and details."}
            </span>
          </div>

          {/* Archive Reason Textarea (Required for Archive) */}
          {isArchive && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="farmer-archive-reason"
                  className="text-xs font-bold text-slate-700"
                >
                  Archive Reason <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {reason.length}/{MAX_REASON_LENGTH}
                </span>
              </div>

              <textarea
                id="farmer-archive-reason"
                rows={3}
                maxLength={MAX_REASON_LENGTH}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (localError) setLocalError("");
                }}
                placeholder="Provide a mandatory reason for archiving this product (e.g., damaged packaging, expired batch, seasonal storage shift)..."
                className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition resize-none ${
                  localError || error
                    ? "border-red-400 focus:border-red-500 focus:ring-red-400"
                    : "border-slate-300 focus:border-amber-500 focus:ring-amber-500"
                }`}
              />

              {(localError || error) && (
                <p className="text-[11px] font-medium text-red-500 mt-1">
                  {localError || error}
                </p>
              )}
            </div>
          )}

          {/* Footer: NO Cancel button, ONLY Confirm button */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white active:scale-95 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50 ${
                isArchive
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-[#0B5D1E] hover:bg-[#084b18]"
              }`}
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
              {!isSaving &&
                (isArchive ? <Archive size={14} /> : <RotateCcw size={14} />)}
              <span>
                {isSaving
                  ? isArchive
                    ? "Archiving..."
                    : "Restoring..."
                  : isArchive
                  ? "Confirm Archive"
                  : "Confirm Restore"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
