import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Receipt } from "lucide-react";

const PAYMENT_STATUS_STYLES = {
  Paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  "Submitted to Driver": "bg-blue-100 text-blue-700 border border-blue-200",
  "submitted to driver": "bg-blue-100 text-blue-700 border border-blue-200",
  Failed: "bg-rose-100 text-rose-700 border border-rose-200",
  failed: "bg-rose-100 text-rose-700 border border-rose-200",
};

const DELIVERY_STATUS_STYLES = {
  Completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  "Forwarded to Logistics": "bg-blue-100 text-blue-700 border border-blue-200",
  "forwarded to logistics": "bg-blue-100 text-blue-700 border border-blue-200",
  Preparing: "bg-amber-100 text-amber-700 border border-amber-200",
  preparing: "bg-amber-100 text-amber-700 border border-amber-200",
  "Ready for Pickup": "bg-blue-100 text-blue-700 border border-blue-200",
  "ready for pickup": "bg-blue-100 text-blue-700 border border-blue-200",
  Cancelled: "bg-rose-100 text-rose-700 border border-rose-200",
  cancelled: "bg-rose-100 text-rose-700 border border-rose-200",
  Declined: "bg-rose-100 text-rose-700 border border-rose-200",
  declined: "bg-rose-100 text-rose-700 border border-rose-200",
  Ordered: "bg-amber-100 text-amber-700 border border-amber-200",
  ordered: "bg-amber-100 text-amber-700 border border-amber-200",
  Delivered: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  delivered: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

function ModalDetailRow({ label, value, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value || "—"}
        </span>
      )}
    </div>
  );
}

export default function MillerSalesHistoryDetailsModal({
  isOpen,
  sale,
  onClose,
  type = "in-store",
  onGetReceipt,
  isReceiptLoading = false,
}) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const isOnline = type === "online";
  const headerTitle = isOnline
    ? sale.batchNo || "Batch No."
    : sale.referenceNo || sale.transactionId || "Reference No.";
  const headerSubtitle = isOnline
    ? "Online Order Details"
    : "In-Store Transaction Details";

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Reference No. / Batch No. as header, top-right X button only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {headerTitle}
            </h2>
            <p className="text-xs text-slate-500 font-medium">{headerSubtitle}</p>
          </div>

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
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-1">
            {isOnline ? (
              <>
                {/* 1. Buyer */}
                <ModalDetailRow label="Buyer" value={sale.buyerName || sale.retailer} />

                {/* 2. Buyer Type badge */}
                <ModalDetailRow label="Buyer Type">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                      sale.buyerType === "Warehouse"
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-blue-100 text-blue-700 border border-blue-200"
                    }`}
                  >
                    {sale.buyerType || "Retailer"}
                  </span>
                </ModalDetailRow>

                {/* Branch Name */}
                {(sale.branchName || sale.branch) && (
                  <ModalDetailRow label="Branch Name" value={sale.branchName || sale.branch} />
                )}

                {/* 3. Product */}
                <ModalDetailRow label="Product" value={sale.productName || sale.variant} />

                {/* 4. Ordered Quantity */}
                <ModalDetailRow
                  label="Ordered Quantity"
                  value={sale.orderedQuantityFormatted || sale.orderedQuantity}
                />

                {/* 5. Unit Cost (miller_products) */}
                <ModalDetailRow
                  label="Unit Cost"
                  value={sale.unitCostFormatted || (sale.unitCost ? `₱${Number(sale.unitCost).toFixed(2)}` : "—")}
                />

                {/* 6. Fare Fee */}
                <ModalDetailRow
                  label="Fare Fee"
                  value={sale.fareFeeFormatted || (sale.fareFee !== undefined ? `₱${Number(sale.fareFee).toFixed(2)}` : "—")}
                />

                {/* 7. Total Cost */}
                <ModalDetailRow label="Total Cost">
                  <span className="text-base font-extrabold text-[#0B5D1E]">
                    {sale.totalCostFormatted || sale.totalPrice}
                  </span>
                </ModalDetailRow>

                {/* 8. Payment Status */}
                <ModalDetailRow label="Payment Status">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      PAYMENT_STATUS_STYLES[sale.paymentStatus] ||
                      "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {sale.paymentStatus || "Pending"}
                  </span>
                </ModalDetailRow>

                {/* 9. Expected Arrival Date */}
                <ModalDetailRow
                  label="Expected Arrival Date"
                  value={sale.expectedArrivalDateFormatted || sale.expectedArrivalDate}
                />

                {/* 10. Delivery Status */}
                <ModalDetailRow label="Delivery Status">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      DELIVERY_STATUS_STYLES[sale.deliveryStatus] ||
                      "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {sale.deliveryStatus || "Ordered"}
                  </span>
                </ModalDetailRow>

                {/* 11. Recent Update Date */}
                <ModalDetailRow
                  label="Recent Update Date"
                  value={sale.recentUpdateDateFormatted || sale.recentUpdateDate}
                />

                {/* 12. Date Ordered */}
                <ModalDetailRow
                  label="Date Ordered"
                  value={sale.dateOrderedFormatted || sale.dateOrdered}
                />
              </>
            ) : (
              <>
                {/* Branch Name */}
                {(sale.branchName || sale.branch) && (
                  <ModalDetailRow label="Branch Name" value={sale.branchName || sale.branch} />
                )}

                {/* 1. Product */}
                <ModalDetailRow label="Product" value={sale.productName || sale.variant} />

                {/* 2. Quantity */}
                <ModalDetailRow label="Quantity" value={sale.quantity} />

                {/* 3. Unit Cost (miller_products) */}
                <ModalDetailRow
                  label="Unit Cost"
                  value={sale.unitCostFormatted || (sale.unitCost ? `₱${Number(sale.unitCost).toFixed(2)}` : "—")}
                />

                {/* 4. Total */}
                <ModalDetailRow label="Total">
                  <span className="text-base font-extrabold text-[#0B5D1E]">
                    {sale.totalPayment || sale.totalAmount}
                  </span>
                </ModalDetailRow>

                {/* 5. Amount Paid */}
                <ModalDetailRow label="Amount Paid" value={sale.amountPaid} />

                {/* 6. Change */}
                <ModalDetailRow label="Change" value={sale.change} />

                {/* 7. Payment Method */}
                <ModalDetailRow label="Payment Method" value={sale.paymentMethod} />

                {/* 8. Date of Purchase */}
                <ModalDetailRow
                  label="Date of Purchase"
                  value={sale.purchaseDateFormatted || sale.datetimeFormatted || sale.time}
                />
              </>
            )}
          </div>
        </div>

        {/* Modal Footer:
            In-Store: Centered blue Get Receipt button.
            Online: No footer actions (X button only at top-right).
        */}
        {!isOnline && (
          <div className="flex items-center justify-center p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => onGetReceipt?.(sale.referenceNo || sale.transactionId, sale)}
              disabled={isReceiptLoading}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Receipt size={15} />
              <span>{isReceiptLoading ? "Loading Receipt..." : "Get Receipt"}</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

