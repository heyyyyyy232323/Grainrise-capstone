import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";

function fmtMoney(val) {
  const x = typeof val === "number" ? val : parseFloat(val);
  if (Number.isNaN(x)) return "₱0.00";
  return `₱${x.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function DetailRow({ label, value, isAmount = false, isMono = false, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0 pt-0.5">{label}:</span>
      {children ? (
        <div className="text-right flex-1 flex justify-end">{children}</div>
      ) : (
        <span
          className={`text-right break-words max-w-[65%] ${
            isAmount
              ? "font-extrabold text-emerald-700 text-sm sm:text-base"
              : isMono
              ? "font-mono font-bold text-slate-900"
              : "font-semibold text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

export default function DriverSubmitPaymentModal({
  isOpen,
  onClose,
  transaction,
  onSubmit,
  isSubmitting = false,
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

  if (!isOpen || !transaction) return null;

  const items = Array.isArray(transaction.transaction_items)
    ? transaction.transaction_items
    : [];
  const batches = Array.isArray(transaction.transaction_batches)
    ? transaction.transaction_batches
    : [transaction.batch_no || "—"];
  const totalAmount = Number(transaction.transaction_total ?? transaction.amount_num ?? 0);
  const amountPaid = Number(transaction.amount_paid ?? totalAmount);
  const changeAmount = Number(transaction.change ?? 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title, Top-Right X Only (No backdrop click dismissal) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Submit Payment
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Review and submit collected COD payment
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            aria-label="Close modal"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4">
          {/* ── SECTION 1 — ONLINE ORDERS INFORMATION ────────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>Online Orders Information</span>
              <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                Retailer
              </span>
            </div>

            <DetailRow label="Buyer Type" value="Retailer" />
            <DetailRow label="Buyer Name" value={transaction.retailer} />
            <DetailRow label="Batch No.">
              <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                {batches.map((b) => (
                  <span
                    key={b}
                    className="inline-block text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200/90 px-2 py-0.5 rounded-md tracking-tight"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </DetailRow>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 pt-1" />

          {/* ── SECTION 2 — VARIANT INFORMATION (TABLE) ──────────────────── */}
          <div className="space-y-2">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Variant Information
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="px-3.5 py-2.5">Variant</th>
                    <th className="px-2.5 py-2.5 text-center">Quantity</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Cost</th>
                    <th className="px-3.5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => (
                    <tr key={item.online_order_id || idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                        <div>
                          <p>{item.product_name}</p>
                          {item.batch_no && (
                            <p className="text-[10px] text-slate-400 font-normal">
                              {item.batch_no}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-center font-medium text-slate-700">
                        {item.display_quantity || item.ordered_quantity} kg
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium text-slate-600">
                        {item.unit_cost_formatted || fmtMoney(item.unit_cost)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold text-slate-900">
                        {item.total_price_formatted || fmtMoney(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 pt-1" />

          {/* ── SECTION 3 — TRANSACTION DETAILS ──────────────────────────── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Transaction Details
            </div>

            <DetailRow label="Payment Method">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {transaction.payment_method}
              </span>
            </DetailRow>
            <DetailRow
              label="Payment Reference No."
              value={transaction.payment_reference_no}
              isMono={true}
            />
            {transaction.external_payment_reference_no && (
              <DetailRow
                label="External Reference No."
                value={transaction.external_payment_reference_no}
                isMono={true}
              />
            )}
            <DetailRow label="Total">
              <span className="text-base font-extrabold text-[#0B5D1E]">
                {fmtMoney(totalAmount)}
              </span>
            </DetailRow>
            <DetailRow label="Amount Paid" value={fmtMoney(amountPaid)} />
            <DetailRow label="Change" value={fmtMoney(changeAmount)} />
          </div>
        </div>

        {/* Modal Footer: Centered Green "Submit This Payment" Button (No bottom close button) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-center shrink-0">
          <button
            type="button"
            onClick={() => onSubmit(transaction)}
            disabled={isSubmitting}
            className="w-full max-w-xs py-2.5 px-6 rounded-xl bg-[#0B5D1E] hover:bg-[#094d19] text-white font-bold text-sm shadow-md transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Submitting Payment...</span>
              </>
            ) : (
              <span>Submit This Payment</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
