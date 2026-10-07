import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Archive, AlertTriangle, X } from "lucide-react";

const MAX_REASON_LENGTH = 500;

export default function EncoderArchiveProductModal({
  isOpen,
  onClose,
  onArchive,
  product,
  isLoading = false,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanReason = String(reason || "").trim();
    if (!cleanReason) {
      setError("Please provide a reason for archiving this product.");
      return;
    }

    onArchive?.(cleanReason);
  };

  const productName =
    product?.product_name || product?.variant || "Product";
  const productCode = product?.product_code || product?.productCode || "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      {/* Clicking outside will NOT close the modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-product-title"
        className="w-full max-w-[500px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.28)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Archive size={19} />
            </div>
            <div className="min-w-0">
              <h2
                id="archive-product-title"
                className="text-[17px] font-extrabold text-slate-900"
              >
                Archive Product?
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Move this item to the Archive tab.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close archive modal"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Target Product Identity Card */}
          <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3.5">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
              Selected Product
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900 truncate">
                {productName}
              </span>
              {productCode && (
                <span className="text-xs font-mono font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                  {productCode}
                </span>
              )}
            </div>
          </div>

          {/* Warning Message */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
            <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              This product will be archived and hidden from active stock. You can restore it later from the Archive tab.
            </span>
          </div>

          {/* Reason Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="archive-reason-input"
                className="text-xs font-bold text-slate-700"
              >
                Archive Reason <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {reason.length}/{MAX_REASON_LENGTH}
              </span>
            </div>

            <textarea
              id="archive-reason-input"
              rows={3}
              maxLength={MAX_REASON_LENGTH}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Provide a mandatory reason for archiving this product (e.g., damaged packaging, expired batch)..."
              className={`w-full rounded-xl border p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition resize-none ${
                error
                  ? "border-red-400 focus:border-red-500 focus:ring-red-400"
                  : "border-slate-300 focus:border-amber-500 focus:ring-amber-500"
              }`}
            />

            {error && (
              <p className="text-[11px] font-medium text-red-500 mt-1">{error}</p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-lg transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Archive size={14} />
              {isLoading ? "Archiving..." : "Archive Product"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

