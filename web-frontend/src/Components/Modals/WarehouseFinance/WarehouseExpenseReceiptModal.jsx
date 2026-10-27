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

export default function WarehouseExpenseReceiptModal({
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
  const businessName = receipt.branch_name || receipt.business_name || "GrainRise Warehouse";

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
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Expense Information", margin, y);
    y += 6;

    const leftCol = margin;
    const rightCol = margin + 55;
    const rightColWidth = usableWidth - 55;
    const rowGap = 5.5;

    const addRow = (label, value, isAmount = false) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(label, leftCol, y);

      if (isAmount) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(11, 93, 30);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
      }

      const splitVal = doc.splitTextToSize(sanitizePdfText(value), rightColWidth);
      doc.text(splitVal, rightCol, y);
      y += Math.max(rowGap, splitVal.length * 4.2 + 1.5);
    };

    addRow("Setting Reference No.:", receipt.setting_reference_no);
    addRow("Expense Type:", receipt.expense_type);
    addRow("Description:", receipt.description);
    addRow("Deadline:", receipt.deadline_formatted || receipt.deadline);
    addRow("Set By:", receipt.set_by || "Warehouse Manager");
    addRow("Paid Amount:", formatCurrencyForPdf(receipt.price || receipt.paid_amount), true);

    y += 3;
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Section: Payment & Audit Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Disbursement & Audit Details", margin, y);
    y += 6;

    addRow("Payment Method:", receipt.payment_method);
    addRow("Payment Reference:", receipt.payment_reference_no);
    addRow("Payment Date:", receipt.payment_date);
    addRow("Disbursed By:", receipt.paid_by || "Warehouse Finance");

    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Footer note
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "This document certifies that the operational expense listed above has been verified and settled.",
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
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4 print:max-h-none print:overflow-visible">
          {/* Status Banner */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Disbursement Completed
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
              PAID
            </span>
          </div>

          {/* Expense Information */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-0.5">
            <ReceiptRow label="Setting Reference No." value={receipt.setting_reference_no} />
            <ReceiptRow label="Expense Type" value={receipt.expense_type} />
            <ReceiptRow label="Description" value={receipt.description} />
            <ReceiptRow label="Deadline" value={receipt.deadline_formatted || receipt.deadline} />
            <ReceiptRow label="Set By" value={receipt.set_by || "Warehouse Manager"} />
            <ReceiptRow label="Paid Amount" value={receipt.price || receipt.paid_amount} isAmount />
          </div>

          {/* Payment & Audit Info */}
          <div className="p-3.5 rounded-xl border border-slate-100 bg-white space-y-0.5">
            <ReceiptRow label="Payment Method" value={receipt.payment_method} />
            <ReceiptRow label="Payment Reference" value={receipt.payment_reference_no} />
            <ReceiptRow label="Payment Date" value={receipt.payment_date} />
            <ReceiptRow label="Disbursed By" value={receipt.paid_by || "Warehouse Finance"} />
          </div>

          {/* Uploaded Receipt Preview */}
          {resolvedPhotoUrl && !imageError && (
            <div className="space-y-1 pt-1 print:break-inside-avoid">
              <span className="text-xs font-bold text-slate-700 block">Attached Receipt Photo:</span>
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center max-h-60">
                <img
                  src={resolvedPhotoUrl}
                  alt="Receipt Proof"
                  onError={() => setImageError(true)}
                  className="max-h-60 w-auto object-contain"
                />
              </div>
            </div>
          )}

          {resolvedPhotoUrl && imageError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <ImageIcon size={16} className="text-slate-400 shrink-0" />
              <span>Receipt image attached on server.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-xs"
            >
              <Download size={14} className="text-[#0B5D1E]" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-xs"
            >
              <Printer size={14} className="text-slate-600" />
              <span>Print</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
