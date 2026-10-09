import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Image as ImageIcon } from "lucide-react";

const procurementStatusStyles = {
  requested: "bg-amber-100 text-amber-700 border border-amber-200",
  ordered: "bg-sky-100 text-sky-700 border border-sky-200",
  partially_received: "bg-purple-100 text-purple-700 border border-purple-200",
  received: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  declined: "bg-rose-100 text-rose-700 border border-rose-200",
};

function DetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
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

export default function GoodsReceiptViewDetailsModal({
  isOpen,
  onClose,
  detail,
  isLoading = false,
  onRequestToPay,
  isSubmitting = false,
  onViewReceipt,
}) {
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false);
  }, [detail?.receiving_proof_photo, detail?.receiving_id, detail?.id]);

  const resolvedPhotoUrl = useMemo(() => {
    const raw = detail?.receiving_proof_photo || detail?.photo || "";
    if (!raw) return null;
    const trimmed = String(raw).trim();
    if (!trimmed) return null;
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("data:") ||
      trimmed.startsWith("blob:")
    ) {
      return trimmed;
    }
    const clean = trimmed.replace(/^\/?(media\/)?/, "");
    const backendBase = (
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    ).replace(/\/$/, "");
    return `${backendBase}/media/${clean}`;
  }, [detail?.receiving_proof_photo, detail?.photo]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const procurementStatus = detail?.procurement_status || "ordered";
  const badgeClass =
    procurementStatusStyles[procurementStatus] ||
    "bg-gray-100 text-gray-700 border border-gray-200";

  const isAlreadyRequested = [
    "request to pay",
    "request_to_pay",
  ].includes(String(detail?.status || "").toLowerCase().trim());

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {detail?.batch_no || "Goods Receipt Details"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Receiving Reference: {detail?.receiving_reference_no || "—"}
            </p>
          </div>

          {/* Single X Exit Button */}
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
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {isLoading && !detail ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Loading receiving details...
              </p>
            </div>
          ) : detail ? (
            <>
              {/* SECTION 1: INBOUND ORDER DETAILS */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Inbound Order Details
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-0.5">
                  <DetailRow label="Product Variant" value={detail.variant} />
                  <DetailRow label="Supplier" value={detail.supplier} />
                  <DetailRow
                    label="Original Order Quantity"
                    value={detail.original_order_quantity}
                  />
                  <DetailRow
                    label="Expected Arrival Date"
                    value={detail.expected_arrival_date}
                  />
                  <DetailRow
                    label="Procurement Status"
                    value={detail.procurement_status_label || detail.procurement_status}
                    isBadge={true}
                    badgeStyle={badgeClass}
                  />
                </div>
              </div>

              {/* SECTION 2: PROCUREMENT RECEIVING */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Procurement Receiving
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-0.5">
                  <DetailRow
                    label="Receiving Reference No."
                    value={detail.receiving_reference_no}
                  />
                  <DetailRow label="Received Date" value={detail.received_date} />
                  <DetailRow label="Total Received" value={detail.total_received} />
                  <DetailRow label="Goods (Passed)" value={detail.received_good} />
                  <DetailRow label="Bad (Rejected)" value={detail.received_bad} />
                  <DetailRow
                    label="Unit Cost / Price per kg"
                    value={detail.price_per_kg || detail.unit_price}
                  />
                  <DetailRow label="Amount to Pay">
                    <span className="font-bold text-emerald-700 text-sm">
                      {detail.amount_to_pay}
                    </span>
                  </DetailRow>

                  {/* Proof of Receiving Photo */}
                  <div className="flex items-center justify-between gap-3 pt-2 text-xs sm:text-sm">
                    <span className="text-slate-500 font-medium shrink-0">
                      Proof of Receiving Photo:
                    </span>
                    <div className="text-right">
                      {resolvedPhotoUrl && !imageLoadError ? (
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs inline-block">
                          <img
                            src={resolvedPhotoUrl}
                            alt="Proof of Receiving"
                            className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition"
                            onError={() => setImageLoadError(true)}
                            onClick={() => {
                              window.open(resolvedPhotoUrl, "_blank");
                            }}
                            title="Click to view full photo"
                          />
                        </div>
                      ) : (
                        <div className="h-14 w-16 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 inline-flex">
                          <ImageIcon size={18} />
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
                            IMG
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer: Centered Green Action Button */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
          {isAlreadyRequested ? (
            <button
              type="button"
              onClick={onViewReceipt}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              View Generated Receipt
            </button>
          ) : (
            <button
              type="button"
              onClick={onRequestToPay}
              disabled={isSubmitting || !detail}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Processing Payment Request...</span>
                </>
              ) : (
                <span>Request to Pay and Generate A Receipt</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
