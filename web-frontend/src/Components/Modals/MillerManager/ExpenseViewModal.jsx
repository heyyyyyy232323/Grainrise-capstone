import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, Image as ImageIcon } from "lucide-react";
import ExpenseReceiptModal from "./ExpenseReceiptModal";

function ModalRow({ label, value, isAmount = false, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span
          className={`text-right break-words max-w-[60%] ${
            isAmount
              ? "font-bold text-[#0B5D1E] text-sm sm:text-base"
              : "font-normal text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
      )}
    </div>
  );
}

const resolveReceiptPhotoUrl = (raw) => {
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
};

export default function ExpenseViewModal({
  isOpen,
  onClose,
  expense,
}) {
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen || isReceiptOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, isReceiptOpen]);

  useEffect(() => {
    setImageError(false);
  }, [expense?.id, expense?.receipt_photo]);

  const resolvedPhotoUrl = useMemo(
    () => resolveReceiptPhotoUrl(expense?.receipt_photo),
    [expense?.receipt_photo]
  );

  if (!isOpen || !expense) return null;

  const isPaid = expense.status === "paid" || expense.is_paid;

  // Unstacked flow: if Receipt modal is open, parent View modal is hidden
  if (isReceiptOpen) {
    return (
      <ExpenseReceiptModal
        isOpen={true}
        onClose={() => setIsReceiptOpen(false)}
        expense={expense}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {expense.setting_reference_no || "Expense Details"}
            </h2>
            <p className="text-xs text-slate-500 font-medium">Expense Information & Status</p>
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

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3">
          {/* ── SECTION 1 — EXPENSE DETAILS ── */}
          <div className="space-y-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Expense Details
            </div>

            <ModalRow label="Branch" value={expense.branch_name} />
            <ModalRow label="Setting Reference No." value={expense.setting_reference_no} />
            <ModalRow label="Set By" value={expense.set_by || "Miller Manager"} />
            <ModalRow label="Type" value={expense.expense_type} />

            {/* Description — large bordered multiline display */}
            <div className="py-1.5 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium block mb-1">Description:</span>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {expense.description || "—"}
              </div>
            </div>

            {/* Deadline Row */}
            <ModalRow label="Deadline">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="font-normal text-slate-800">
                  {expense.deadline_formatted || expense.deadline}
                </span>
                {!isPaid && expense.deadline_badge === "overdue" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    Overdue
                  </span>
                )}
                {!isPaid && expense.deadline_badge === "near_deadline" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    Near Deadline
                  </span>
                )}
              </div>
            </ModalRow>

            <ModalRow label="Price" value={expense.price} isAmount={true} />

            <ModalRow label="Status">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {isPaid ? "Paid" : "Pending"}
              </span>
            </ModalRow>
          </div>

          {/* ── SECTION 2 — PAYMENT DETAILS (Only if Paid) ── */}
          {isPaid && (
            <>
              <div className="border-t border-slate-100 pt-2" />
              <div className="space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Payment Details
                </div>

                <ModalRow label="Paid By" value={expense.paid_by || "Finance Staff"} />
                <ModalRow label="Payment Method" value={expense.payment_method || "Cash"} />
                <ModalRow label="Payment Reference No." value={expense.payment_reference_no} />
                <ModalRow label="Payment Date" value={expense.payment_date} />

                {/* Receipt Photo with accessible URL & clean fallback placeholder */}
                <div className="pt-2">
                  <span className="text-slate-500 font-medium text-xs block mb-1.5">
                    Receipt Photo:
                  </span>
                  {resolvedPhotoUrl && !imageError ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex items-center justify-center max-h-64">
                      <img
                        src={resolvedPhotoUrl}
                        alt="Receipt preview"
                        className="max-h-60 object-contain rounded"
                        onError={() => setImageError(true)}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 flex flex-col items-center justify-center text-center">
                      <ImageIcon size={22} className="text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">No Receipt Photo Attached</span>
                      <span className="text-[10px] text-slate-400">Payment was confirmed without an uploaded receipt</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer: Centered green Get Receipt action for BOTH Pending and Paid */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex justify-center">
          <button
            type="button"
            onClick={() => setIsReceiptOpen(true)}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-[#018311] hover:bg-[#016b0f] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Receipt size={16} />
            <span>Get Receipt</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
