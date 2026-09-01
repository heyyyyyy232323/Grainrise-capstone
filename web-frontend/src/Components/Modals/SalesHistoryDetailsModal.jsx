import { createPortal } from "react-dom";
import { X } from "lucide-react";

const PAYMENT_STATUS_STYLES = {
  Paid: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-100 text-amber-700 border border-amber-200",
  Failed: "bg-rose-100 text-rose-700 border border-rose-200",
};

const DELIVERY_STATUS_STYLES = {
  Completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Preparing: "bg-amber-100 text-amber-700 border border-amber-200",
  "Ready for Pickup": "bg-blue-100 text-blue-700 border border-blue-200",
  Cancelled: "bg-rose-100 text-rose-700 border border-rose-200",
};

const fieldValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return value;
};

export default function SalesHistoryDetailsModal({ isOpen, sale, onClose, type = "in-store" }) {
  if (!isOpen || !sale) return null;

  const isOnline = type === "online";
  const transactionId = fieldValue(sale.transactionId || sale.id || sale.batchNo || "TRX-2026-001");

  const baseRows = isOnline
    ? [
        { label: "Transaction ID", value: transactionId },
        { label: "Retailer", value: fieldValue(sale.retailer) },
        { label: "Variant", value: fieldValue(sale.variant) },
        { label: "Amount Paid", value: fieldValue(sale.amountPaid || sale.totalPrice) },
        { label: "Payment Status", value: sale.paymentStatus, isBadge: true, badgeStyle: PAYMENT_STATUS_STYLES },
        { label: "Delivery Status", value: sale.deliveryStatus, isBadge: true, badgeStyle: DELIVERY_STATUS_STYLES },
      ]
    : [
        { label: "Transaction ID", value: transactionId },
        { label: "Time", value: fieldValue(sale.time) },
        { label: "Rice Variant", value: fieldValue(sale.variant) },
        { label: "Quantity Sold", value: fieldValue(sale.quantity) },
        { label: "Payment Method", value: fieldValue(sale.paymentMethod) },
        { label: "Status", value: fieldValue(sale.status), isBadge: true, badgeStyle: PAYMENT_STATUS_STYLES },
        { label: "Total Amount", value: fieldValue(sale.totalAmount || sale.totalPayment) },
        { label: "Amount Paid", value: fieldValue(sale.amountPaid) },
        { label: "Change (Sukli)", value: fieldValue(sale.change) },
      ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Transaction Details</h2>
            <p className="text-xs text-gray-500">
              {isOnline ? fieldValue(sale.batchNo || "Batch 2026-001") : fieldValue(sale.time || "11:45 AM")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            aria-label="Close transaction details"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {baseRows.map((row) => (
            <div key={row.label} className={`flex justify-between items-center gap-3 py-2 ${row.label !== baseRows[baseRows.length - 1].label ? "border-b border-gray-100" : ""}`}>
              <span className="text-sm font-medium text-gray-600">{row.label}:</span>

              {row.isBadge ? (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.badgeStyle[row.value] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                  {fieldValue(row.value)}
                </span>
              ) : (
                <span className="text-sm font-semibold text-gray-900 text-right max-w-[55%] break-words">
                  {fieldValue(row.value)}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
