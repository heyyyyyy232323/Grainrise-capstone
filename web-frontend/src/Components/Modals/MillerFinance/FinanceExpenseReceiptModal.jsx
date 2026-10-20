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

export default function FinanceExpenseReceiptModal({
  isOpen,
  onClose,
  receipt,
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
  }, [receipt?.id, receipt?.receipt_photo]);

  const resolvedPhotoUrl = useMemo(
    () => resolveReceiptPhotoUrl(receipt?.receipt_photo),
    [receipt?.receipt_photo]
  );

  if (!isOpen || !receipt) return null;

  const refNo = receipt.setting_reference_no || "EXPENSE-PAYMENT";
  const businessName = receipt.branch_name || "GrainRise Miller";

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
    doc.text("Official Expense Disbursement Receipt", margin, y);

    // Right-aligned Reference
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(sanitizePdfText(refNo), pageWidth - margin, y - 6, { align: "right" });

    // Status Pill
    doc.setFontSize(9);
    doc.setTextColor(16, 149, 193);
    doc.text("STATUS: PAID", pageWidth - margin, y, { align: "right" });

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
    doc.text("EXPENSE DISBURSEMENT DETAILS", margin, y);
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

    printRow("Set By:", receipt.set_by || "Miller Manager");
    printRow("Expense Type:", receipt.expense_type);
    printRow("Deadline:", receipt.deadline_formatted || receipt.deadline);

    // Multiline Description
    if (receipt.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Description:", margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      const splitDesc = doc.splitTextToSize(sanitizePdfText(receipt.description), usableWidth);
      doc.text(splitDesc, margin, y);
      y += splitDesc.length * 4.5 + 4;
    }

    // Amount Box
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(margin, y - 2, usableWidth, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(11, 93, 30);
    doc.text("Disbursed Amount:", margin + 4, y + 6);
    doc.setFontSize(11);
    doc.text(formatCurrencyForPdf(receipt.price_raw || receipt.price), pageWidth - margin - 4, y + 6, {
      align: "right",
    });
    y += 18;

    // Payment Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("PAYMENT RECORD", margin, y);
    y += 6;

    printRow("Paid By:", receipt.paid_by || "Finance Staff");
    printRow("Payment Method:", receipt.payment_method || "Cash");
    printRow("Payment Reference No.:", receipt.payment_reference_no, true);
    printRow("Payment Date:", receipt.payment_date);

    // Footer
    y = 275;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Generated by GrainRise Miller Finance System",
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
            <p className="text-xs text-slate-500 font-medium">Official Expense Disbursement Receipt</p>
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
          {/* Details list (DISBURSED / PAID banner removed; price displayed below) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Set By" value={receipt.set_by || "Miller Manager"} />
            <ReceiptRow label="Expense Type" value={receipt.expense_type} />
            <ReceiptRow label="Deadline" value={receipt.deadline_formatted || receipt.deadline} />
            <ReceiptRow label="Price" value={receipt.price} isAmount={true} />

            {/* Description multiline */}
            <div className="py-2 text-xs sm:text-sm border-b border-slate-100">
              <span className="text-slate-500 font-medium block mb-1">Description:</span>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {receipt.description || "—"}
              </div>
            </div>

            {/* Payment Details */}
            <div className="pt-2.5 pb-1 border-t border-slate-200/80 my-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Payment Details
              </span>
            </div>
            <ReceiptRow label="Paid By" value={receipt.paid_by || "Finance Staff"} />
            <ReceiptRow label="Payment Method" value={receipt.payment_method} />
            <ReceiptRow label="Payment Reference No." value={receipt.payment_reference_no} />
            <ReceiptRow label="Payment Date" value={receipt.payment_date} />

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
          </div>
        </div>

        {/* Footer: Blue Left (Download as PDF) & Green Right (Print) */}
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

