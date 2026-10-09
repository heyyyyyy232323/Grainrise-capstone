import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, Printer } from "lucide-react";
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

// Clean string and strip non-ASCII / problematic glyphs like ± or ₱
const sanitizePdfText = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").trim();
  return s || "—";
};

// Formats currency as clean standard 'PHP X,XXX.XX' without character spacing bugs
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

// Formats quantity ensuring clean standard 'X,XXX kg'
const formatQuantityForPdf = (val) => {
  if (val === null || val === undefined || val === "") return "—";
  let s = String(val).trim();
  if (!s) return "—";
  if (!s.toLowerCase().endsWith("kg")) {
    const cleanNum = s.replace(/,/g, "");
    const num = Number(cleanNum);
    if (!isNaN(num)) {
      return `${num.toLocaleString("en-US")} kg`;
    }
  }
  return s;
};

export default function GoodsReceiptReceiptModal({
  isOpen,
  onClose,
  receipt,
}) {
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

  if (!isOpen || !receipt) return null;

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

    // Header: Business Name (H1)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(11, 93, 30); // #0B5D1E
    doc.text(sanitizePdfText(receipt.business_name || "GrainRise Miller"), pageWidth / 2, y, {
      align: "center",
    });
    y += 6.5;

    // Header: Address & Contact (H2)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate-500
    const addressStr = sanitizePdfText(receipt.business_address || "");
    const contactStr = sanitizePdfText(receipt.business_contact || "");
    const subtext = [addressStr, contactStr].filter((s) => s && s !== "—").join(" | ");
    const splitSubtext = doc.splitTextToSize(subtext, usableWidth);
    doc.text(splitSubtext, pageWidth / 2, y, { align: "center" });
    y += splitSubtext.length * 4.2 + 3.5;

    // Separator line
    doc.setDrawColor(11, 93, 30);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6.5;

    // Receipt Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("OFFICIAL GOODS RECEIPT", pageWidth / 2, y, { align: "center" });
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const dateStr =
      sanitizePdfText(receipt.received_date) !== "—"
        ? receipt.received_date
        : new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
    doc.text(`Received Date: ${dateStr}`, pageWidth / 2, y, { align: "center" });
    y += 8;

    // Details Box
    const boxStartY = y;
    const rowHeight = 9.8;
    const rows = [
      ["Batch No.", sanitizePdfText(receipt.batch_no)],
      [
        "Reference No.",
        sanitizePdfText(receipt.receiving_reference_no || receipt.reference_no),
      ],
      ["Product Variant", sanitizePdfText(receipt.variant)],
      ["Supplier", sanitizePdfText(receipt.supplier)],
      [
        "Order Quantity",
        formatQuantityForPdf(receipt.original_order_quantity || receipt.ordered_quantity),
      ],
      ["Received Quantity", formatQuantityForPdf(receipt.total_received)],
      [
        "Quantity to Pay (Received Good)",
        formatQuantityForPdf(receipt.received_good),
      ],
      [
        "Unit Cost / Price per kg",
        formatCurrencyForPdf(receipt.price_per_kg || receipt.unit_price),
      ],
      ["Amount to Pay", formatCurrencyForPdf(receipt.amount_to_pay)],
    ];
    const boxHeight = rows.length * rowHeight + 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxStartY, usableWidth, boxHeight, 3, 3, "FD");

    let rowY = boxStartY + 7.5;
    rows.forEach(([label, value], idx) => {
      // Label
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin + 8, rowY);

      // Value
      if (idx === rows.length - 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(11, 93, 30);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
      }

      // Truncate long value if necessary to avoid overlapping label
      let displayVal = value;
      const maxValWidth = 85;
      if (doc.getTextWidth(displayVal) > maxValWidth) {
        while (doc.getTextWidth(displayVal + "...") > maxValWidth && displayVal.length > 0) {
          displayVal = displayVal.slice(0, -1);
        }
        displayVal = displayVal + "...";
      }

      doc.text(displayVal, pageWidth - margin - 8, rowY, { align: "right" });

      if (idx < rows.length - 1) {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(margin + 8, rowY + 3.2, pageWidth - margin - 8, rowY + 3.2);
      }
      rowY += rowHeight;
    });

    y = boxStartY + boxHeight + 8;

    // Footer note
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "This document serves as proof of goods received and payment request in GrainRise.",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    const cleanRefNo = String(
      receipt.receiving_reference_no || receipt.reference_no || "goods_receipt"
    ).replace(/[^\w.-]/g, "_");
    const filename = `${cleanRefNo}.pdf`;
    doc.save(filename);
  };

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.receiving_reference_no || receipt.reference_no || ""}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 36px 32px; color: #0f172a; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { font-size: 24px; font-weight: 800; color: #0B5D1E; margin-bottom: 4px; letter-spacing: -0.5px; }
            .header h2 { font-size: 13px; font-weight: 500; color: #64748b; line-height: 1.4; max-width: 500px; margin: 0 auto; }
            .badge-title { text-align: center; font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 18px; letter-spacing: 0.5px; text-transform: uppercase; }
            .receipt-box { border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 12px 20px; margin-bottom: 24px; }
            .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .row:last-child { border-bottom: none; }
            .row .label { color: #64748b; font-weight: 500; }
            .row .value { font-weight: 700; color: #0f172a; text-align: right; }
            .amount-row .value { color: #0B5D1E; font-size: 16px; font-weight: 800; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 24px; }
            @page { size: auto; margin: 15mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${receipt.business_name || "GrainRise Miller"}</h1>
            <h2>${receipt.business_address || "Address"} • ${receipt.business_contact || "Contact"}</h2>
          </div>
          <div class="badge-title">OFFICIAL GOODS RECEIPT</div>
          <div class="receipt-box">
            <div class="row"><span class="label">Batch No.:</span><span class="value">${receipt.batch_no || "—"}</span></div>
            <div class="row"><span class="label">Reference No.:</span><span class="value">${receipt.receiving_reference_no || receipt.reference_no || "—"}</span></div>
            <div class="row"><span class="label">Product Variant:</span><span class="value">${receipt.variant || "—"}</span></div>
            <div class="row"><span class="label">Supplier:</span><span class="value">${receipt.supplier || "—"}</span></div>
            <div class="row"><span class="label">Order Quantity:</span><span class="value">${receipt.original_order_quantity || receipt.ordered_quantity || "—"}</span></div>
            <div class="row"><span class="label">Received Quantity:</span><span class="value">${receipt.total_received || "—"}</span></div>
            <div class="row"><span class="label">Quantity to Pay (Received Good):</span><span class="value">${receipt.received_good || "—"}</span></div>
            <div class="row"><span class="label">Unit Cost / Price per kg:</span><span class="value">${receipt.price_per_kg || receipt.unit_price || "—"}</span></div>
            <div class="row amount-row"><span class="label">Amount to Pay:</span><span class="value">${receipt.amount_to_pay || "—"}</span></div>
          </div>
          <div class="footer-note">This document serves as proof of goods received and payment request in GrainRise.</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Single Exit Control: closes everything and returns to Goods Receipt page */}
        <div className="absolute top-4 right-4 z-10">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close receipt"
            title="Close receipt"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 pt-7 pb-5 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
          {/* Header centered */}
          <div className="text-center pb-2 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {receipt.business_name || "GrainRise Miller"}
            </h1>
            <h2 className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto leading-relaxed">
              {receipt.business_address}
              {receipt.business_contact && (
                <>
                  <br />
                  {receipt.business_contact}
                </>
              )}
            </h2>
            <div className="mt-3 inline-flex items-center px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
              Official Goods Receipt
            </div>
          </div>

          {/* Details in left-label/right-value rows */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Batch No." value={receipt.batch_no} />
            <ReceiptRow
              label="Reference No."
              value={receipt.receiving_reference_no || receipt.reference_no}
            />
            <ReceiptRow label="Product Variant" value={receipt.variant} />
            <ReceiptRow label="Supplier" value={receipt.supplier} />
            <ReceiptRow
              label="Order Quantity"
              value={receipt.original_order_quantity || receipt.ordered_quantity}
            />
            <ReceiptRow label="Received Quantity" value={receipt.total_received} />
            <ReceiptRow
              label="Quantity to Pay (Received Good)"
              value={receipt.received_good}
            />
            <ReceiptRow
              label="Unit Cost / Price per kg"
              value={receipt.price_per_kg || receipt.unit_price}
            />
            <ReceiptRow
              label="Amount to Pay"
              value={receipt.amount_to_pay}
              isAmount={true}
            />
          </div>
        </div>

        {/* Footer Buttons: Blue Left (Download as PDF) & Green Right (Print) */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center gap-3">
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

