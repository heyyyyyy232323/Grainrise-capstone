import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Download, Printer, Image as ImageIcon } from "lucide-react";
import { jsPDF } from "jspdf";

function ReceiptRow({ label, value, isAmount = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      <span
        className={`text-right break-words max-w-[60%] ${
          isAmount
            ? "font-extrabold text-emerald-700 text-sm sm:text-base"
            : "font-semibold text-slate-800"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

const sanitizePdfText = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").trim();
  return s || "—";
};

const formatCurrencyForPdf = (val) => {
  if (val === null || val === undefined || val === "") return "PHP 0.00";
  if (typeof val === "number" && !isNaN(val)) {
    return `PHP ${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").replace(/\bPHP\b/gi, "").trim();
  const cleanNum = s.replace(/,/g, "");
  const num = Number(cleanNum);
  if (!isNaN(num) && cleanNum !== "") {
    return `PHP ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return s ? `PHP ${s}` : "PHP 0.00";
};

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

export default function ExpenseReceiptModal({
  isOpen,
  onClose,
  expense,
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setImageError(false);
  }, [expense?.id, expense?.receipt_photo]);

  const resolvedPhotoUrl = useMemo(
    () => resolveReceiptPhotoUrl(expense?.receipt_photo),
    [expense?.receipt_photo]
  );

  if (!isOpen || !expense) return null;

  const isPaid = expense.status === "paid" || expense.is_paid;
  const refNo = expense.setting_reference_no || "EXPENSE-RECEIPT";
  const businessName = expense.branch_name || "GrainRise Miller";

  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableWidth = pageWidth - margin * 2;
    let y = 22;

    // Header: Business Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 93, 30); // #0B5D1E
    doc.text(sanitizePdfText(businessName), margin, y);

    // Subtitle
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      isPaid ? "Official Expense Payment Receipt" : "Official Expense Disbursement Order",
      margin,
      y
    );

    // Right-aligned Reference
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(refNo), pageWidth - margin, y - 6, { align: "right" });

    // Status Pill
    doc.setFontSize(9);
    doc.setTextColor(isPaid ? 16 : 217, isPaid ? 149 : 119, isPaid ? 193 : 6);
    doc.text(
      `STATUS: ${isPaid ? "PAID" : "PENDING"}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );

    // Divider
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Section: Expense Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("EXPENSE DETAILS", margin, y);
    y += 6;

    const printRow = (label, val, isBoldVal = false) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin, y);

      doc.setFont("helvetica", isBoldVal ? "bold" : "normal");
      doc.setTextColor(15, 23, 42);
      const textVal = sanitizePdfText(val);
      doc.text(textVal, pageWidth - margin, y, { align: "right" });
      y += 6;
    };

    printRow("Branch:", businessName);
    printRow("Set By:", expense.set_by || "Miller Manager");
    printRow("Expense Type:", expense.expense_type);
    printRow("Deadline:", expense.deadline_formatted || expense.deadline);

    // Multiline Description
    if (expense.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Description:", margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(sanitizePdfText(expense.description), usableWidth);
      doc.text(splitDesc, margin, y);
      y += splitDesc.length * 4.5 + 4;
    }

    // Amount Box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y - 2, usableWidth, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 93, 30);
    doc.text("Total Expense Amount:", margin + 4, y + 6);
    doc.setFontSize(11);
    doc.text(formatCurrencyForPdf(expense.price_raw || expense.price), pageWidth - margin - 4, y + 6, {
      align: "right",
    });
    y += 18;

    // Section: Payment Details (Only for Paid expenses)
    if (isPaid) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("PAYMENT DETAILS", margin, y);
      y += 6;

      printRow("Payment Status:", "PAID", true);
      printRow("Paid By:", expense.paid_by || "Finance Staff");
      printRow("Payment Method:", expense.payment_method || "Cash");
      printRow("Payment Reference No.:", expense.payment_reference_no, true);
      printRow("Payment Date:", expense.payment_date);
    }

    // Footer
    y = 275;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Generated by GrainRise Miller Expense Management System",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    doc.save(`${refNo}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:p-0 print:bg-white">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 print:border-b-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {businessName}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {isPaid ? "Official Expense Payment Receipt" : "Official Expense Disbursement Order"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-800">
              {refNo}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer print:hidden"
              aria-label="Close receipt"
              title="Close receipt"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-3 print:overflow-visible print:max-h-none">
          {/* Status banner for Pending expenses only (PAID banner removed) */}
          {!isPaid && (
            <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-50 border-amber-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-600">
                  Payment Status
                </span>
                <span className="text-sm font-extrabold text-amber-800">
                  PENDING DISBURSEMENT
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Price
                </span>
                <span className="text-base font-extrabold text-emerald-700">
                  {expense.price}
                </span>
              </div>
            </div>
          )}

          {/* Details list */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Branch" value={businessName} />
            <ReceiptRow label="Set By" value={expense.set_by || "Miller Manager"} />
            <ReceiptRow label="Expense Type" value={expense.expense_type} />
            <ReceiptRow label="Deadline" value={expense.deadline_formatted || expense.deadline} />
            <ReceiptRow label="Price" value={expense.price} isAmount={true} />

            {/* Description multiline */}
            <div className="py-2 text-xs sm:text-sm border-b border-slate-100">
              <span className="text-slate-500 font-medium block mb-1">Description:</span>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {expense.description || "—"}
              </div>
            </div>

            {/* Payment Details if paid */}
            {isPaid && (
              <>
                <div className="pt-2.5 pb-1 border-t border-slate-200/80 my-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Payment Details
                  </span>
                </div>
                <ReceiptRow label="Paid By" value={expense.paid_by || "Finance Staff"} />
                <ReceiptRow label="Payment Method" value={expense.payment_method} />
                <ReceiptRow label="Payment Reference No." value={expense.payment_reference_no} />
                <ReceiptRow label="Payment Date" value={expense.payment_date} />

                {/* Receipt Photo with accessible URL & clean fallback */}
                <div className="pt-2">
                  <span className="text-slate-500 font-medium text-xs block mb-1">
                    Receipt Photo:
                  </span>
                  {resolvedPhotoUrl && !imageError ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white max-h-48 flex items-center justify-center p-2">
                      <img
                        src={resolvedPhotoUrl}
                        alt="Receipt proof"
                        className="max-h-44 object-contain rounded"
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
              </>
            )}
          </div>
        </div>

        {/* Footer: Blue Left & Green Right */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Download size={16} />
            <span>Download as PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
