import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Image as ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";

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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const cleanStr = String(dateStr).split("T")[0].split(" ")[0].trim();
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${monthNames[monthIndex]} ${day}, ${year}`;
      }
    }
  } catch {}
  return String(dateStr);
}

export default function InboundOrderDetailsModal({
  isOpen,
  onClose,
  order,
  isGrainrise = true,
  onCancelOrder,
}) {
  const [photoError, setPhotoError] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  if (!isOpen || !order) return null;

  const currentStatus = String(order.status || "Ordered").trim();
  const isCancellable = currentStatus.toLowerCase() === "ordered";

  const handleOpenCancelPrompt = () => {
    setShowCancelPrompt(true);
    setCancelReason("");
    setCancelError("");
    setCancelResult(null);
  };

  const handleCloseCancelPrompt = () => {
    if (isCancelling) return;
    setShowCancelPrompt(false);
    setCancelReason("");
    setCancelError("");
    setCancelResult(null);
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    setCancelError("");
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setCancelError("Please provide a cancellation reason.");
      return;
    }

    try {
      setIsCancelling(true);
      if (onCancelOrder) {
        const res = await onCancelOrder(order, trimmedReason);
        if (res && res.success) {
          setCancelResult({ success: true, message: res.message || "Order cancelled successfully." });
        } else {
          setCancelResult({
            success: false,
            message: res?.message || "Order cancellation is not permitted at this stage.",
          });
        }
      } else {
        setCancelResult({
          success: false,
          message: "Cancellation workflow is not configured for this order type.",
        });
      }
    } catch (err) {
      setCancelResult({
        success: false,
        message: err.message || "Failed to process cancellation.",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const resolvedPhoto = resolvePhotoUrl(order.product_photo);

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Inbound Order Details
            </h2>
            <p className="text-xs text-slate-500">
              Batch: {order.batch_no || "Not yet available"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="space-y-4 overflow-y-auto px-6 py-5 text-xs text-slate-700">
          {/* Product Photo */}
          <div className="w-full h-44 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
            {resolvedPhoto && !photoError ? (
              <img
                src={resolvedPhoto}
                alt={order.product_name}
                className="w-full h-full object-cover"
                onError={() => setPhotoError(true)}
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-slate-400">
                <ImageIcon size={30} />
                <span className="text-xs font-medium">No product photo uploaded</span>
              </div>
            )}
          </div>

          {/* Order Info Fields */}
          <div className="space-y-2 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Batch Number:</span>
              <span className="font-bold text-slate-900">
                {order.batch_no || "Not yet available"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Product Variant:</span>
              <span className="font-semibold text-slate-900">
                {order.product_name || "—"}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Miller:</span>
              <span className="font-medium text-slate-800">
                {order.miller_name || "—"}
              </span>
            </div>

            <div className="py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium block mb-1">Product Description:</span>
              <span className="font-normal text-slate-700 leading-relaxed">
                {order.product_description || "No description provided."}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Order Quantity:</span>
              <span className="font-bold text-slate-900">
                {order.ordered_quantity != null ? `${Number(order.ordered_quantity).toLocaleString()} kg` : "—"}
              </span>
            </div>

            {order.unit_cost != null && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Unit Cost:</span>
                <span className="font-semibold text-slate-900">
                  ₱{Number(order.unit_cost).toFixed(2)} / kg
                </span>
              </div>
            )}

            {order.total_price != null && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Total Price:</span>
                <span className="font-bold text-emerald-800">
                  ₱{Number(order.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Expected Arrival Date:</span>
              <span className="font-medium text-slate-900">
                {formatDate(order.expected_arrival_date)}
              </span>
            </div>

            <div className="flex justify-between py-1 items-center">
              <span className="text-slate-500 font-medium">Status:</span>
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                {order.status || "Ordered"}
              </span>
            </div>
          </div>

          {/* Conditional Cancel Order Action */}
          {isGrainrise ? (
            isCancellable ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenCancelPrompt}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-300 text-rose-700 font-semibold hover:bg-rose-50 transition cursor-pointer text-center text-xs"
                >
                  Cancel Order
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic text-center py-1">
                Order cannot be cancelled in status &ldquo;{currentStatus}&rdquo;.
              </div>
            )
          ) : null}
        </div>

        {/* Cancellation Reason Confirmation Sub-Modal */}
        {showCancelPrompt && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-xs p-6 z-10 flex flex-col justify-between animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  Cancel Inbound Order
                </h3>
                <button
                  type="button"
                  onClick={handleCloseCancelPrompt}
                  disabled={isCancelling}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              {cancelResult ? (
                <div className="my-6 space-y-3">
                  <div
                    className={`p-4 rounded-xl text-xs flex items-start gap-2.5 leading-relaxed ${
                      cancelResult.success
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border border-rose-200 text-rose-800"
                    }`}
                  >
                    {cancelResult.success ? (
                      <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold mb-1">
                        {cancelResult.success ? "Cancellation Request Completed" : "Order Cancellation Notice"}
                      </p>
                      <p>{cancelResult.message}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmCancel} className="space-y-4 my-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Please provide a clear cancellation reason for batch{" "}
                    <span className="font-semibold text-slate-900">{order.batch_no || "N/A"}</span>.
                    {isGrainrise && (
                      <span className="block mt-1 text-slate-500 text-[11px]">
                        Upon approved cancellation, an official notification will be transmitted to the Miller.
                      </span>
                    )}
                  </p>

                  {cancelError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{cancelError}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Reason for Cancellation <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Schedule misalignment or inventory adjustment..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-600 outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCloseCancelPrompt}
                      className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isCancelling}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isCancelling ? "Processing..." : "Confirm Cancellation"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {cancelResult && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseCancelPrompt}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Close Notice
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
