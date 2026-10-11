import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Image as ImageIcon, CheckCircle2 } from "lucide-react";

function resolvePhotoUrl(raw) {
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
}

// ─── Modal Detail Row (Matches Miller Order Approval Details modal) ───────────
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

export default function ReturnDetailsModal({
  isOpen,
  onClose,
  detail,
  isLoading = false,
  onMarkAsReturned,
  isSubmitting = false,
}) {
  const [productPhotoError, setProductPhotoError] = useState(false);
  const [receivingPhotoError, setReceivingPhotoError] = useState(false);
  const [rejectedPhotoError, setRejectedPhotoError] = useState(false);

  useEffect(() => {
    setProductPhotoError(false);
    setReceivingPhotoError(false);
    setRejectedPhotoError(false);
  }, [
    detail?.id,
    detail?.return_id,
    detail?.product_photo,
    detail?.receiving_proof_photo,
    detail?.rejected_goods_photo,
  ]);

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

  const resolvedProductPhotoUrl = useMemo(
    () => resolvePhotoUrl(detail?.product_photo),
    [detail?.product_photo]
  );

  const resolvedReceivingPhotoUrl = useMemo(
    () => resolvePhotoUrl(detail?.receiving_proof_photo),
    [detail?.receiving_proof_photo]
  );

  const resolvedRejectedPhotoUrl = useMemo(
    () => resolvePhotoUrl(detail?.rejected_goods_photo),
    [detail?.rejected_goods_photo]
  );

  if (!isOpen) return null;

  const isPending =
    String(detail?.status || "").toLowerCase().trim() === "pending";

  const statusBadgeClass = isPending
    ? "bg-amber-100 text-amber-700 border border-amber-200"
    : "bg-emerald-100 text-emerald-700 border border-emerald-200";

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Matches Order Approval Details modal header) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {detail?.batch_no || "Return Details"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Return Details</p>
          </div>

          {/* X Button: Only way to close */}
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

        {/* Modal Body (Matches Order Approval padding, spacing, and typography) */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
          {isLoading && !detail ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
              <p className="text-sm font-medium text-slate-600">
                Loading return details...
              </p>
            </div>
          ) : detail ? (
            <>
              {/* ── SECTION 1 — INBOUND ORDER ──────────────────────────────── */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Inbound Order
                </div>

                <ModalDetailRow
                  label="Product Variant"
                  value={detail.product_variant || detail.product_name}
                />

                <ModalDetailRow label="Supplier" value={detail.supplier} />

                {/* Product Photo */}
                <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
                  <span className="text-slate-500 font-medium shrink-0">
                    Product Photo:
                  </span>
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                    {resolvedProductPhotoUrl && !productPhotoError ? (
                      <img
                        src={resolvedProductPhotoUrl}
                        alt={detail.product_variant || "Product photo"}
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition"
                        onError={() => setProductPhotoError(true)}
                        onClick={() => window.open(resolvedProductPhotoUrl, "_blank")}
                        title="Click to view full photo"
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

                <ModalDetailRow
                  label="Original Order Quantity"
                  value={detail.original_order_quantity}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 pt-2" />

              {/* ── SECTION 2 — RECEIVING ─────────────────────────────────── */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Receiving
                </div>

                <ModalDetailRow
                  label="Receiving Reference"
                  value={detail.receiving_reference_no}
                />

                <ModalDetailRow
                  label="Total Received"
                  value={detail.total_received}
                />

                {detail.received_date && (
                  <ModalDetailRow
                    label="Received Date"
                    value={detail.received_date}
                  />
                )}

                {/* Centered Proof of Receiving Photo (Large & Centered) */}
                <div className="flex flex-col items-center justify-center pt-3 pb-1">
                  <span className="text-slate-500 font-medium text-xs mb-2">
                    Proof of Receiving Photo
                  </span>
                  {resolvedReceivingPhotoUrl && !receivingPhotoError ? (
                    <div className="h-44 w-full sm:w-80 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                      <img
                        src={resolvedReceivingPhotoUrl}
                        alt="Proof of Receiving Photo"
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition"
                        onError={() => setReceivingPhotoError(true)}
                        onClick={() => window.open(resolvedReceivingPhotoUrl, "_blank")}
                        title="Click to view full photo"
                      />
                    </div>
                  ) : (
                    <div className="h-36 w-full sm:w-80 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                        IMG
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 pt-2" />

              {/* ── SECTION 3 — RETURNING ─────────────────────────────────── */}
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Returning
                </div>

                <ModalDetailRow
                  label="Return Reference"
                  value={detail.return_reference_no}
                />

                <ModalDetailRow
                  label="Defective Quantity"
                  value={detail.defective_quantity || detail.quantity}
                />

                <ModalDetailRow
                  label="Reason & Description"
                  value={detail.reason_description}
                />

                {detail.returned_at && (
                  <ModalDetailRow
                    label="Returned At"
                    value={detail.returned_at}
                  />
                )}

                <ModalDetailRow
                  label="Status"
                  value={detail.status_label || (isPending ? "Pending" : "Returned")}
                  isBadge={true}
                  badgeStyle={statusBadgeClass}
                />

                {/* Centered Proof of Rejected Goods Photo (Large & Centered) */}
                <div className="flex flex-col items-center justify-center pt-3 pb-1">
                  <span className="text-slate-500 font-medium text-xs mb-2">
                    Proof of Rejected Goods Photo
                  </span>
                  {resolvedRejectedPhotoUrl && !rejectedPhotoError ? (
                    <div className="h-44 w-full sm:w-80 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                      <img
                        src={resolvedRejectedPhotoUrl}
                        alt="Proof of Rejected Goods Photo"
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition"
                        onError={() => setRejectedPhotoError(true)}
                        onClick={() => window.open(resolvedRejectedPhotoUrl, "_blank")}
                        title="Click to view full photo"
                      />
                    </div>
                  ) : (
                    <div className="h-36 w-full sm:w-80 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={28} />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
                        IMG
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer: Centered Green Action Button (Only for Pending) */}
        {isPending && (
          <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
            <button
              type="button"
              onClick={onMarkAsReturned}
              disabled={isSubmitting || !detail}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Processing Status Update...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Mark as Returned</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
