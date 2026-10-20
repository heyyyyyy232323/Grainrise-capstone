import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import grainriseLogo from "../../../assets/Logo.png";

function fmtMoney(n) {
  const x = typeof n === "number" ? n : parseFloat(n);
  if (Number.isNaN(x)) return "₱0.00";
  return `₱${x.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtMoneyPdf(n) {
  const x = typeof n === "number" ? n : parseFloat(n);
  if (Number.isNaN(x)) return "PHP 0.00";
  return `PHP ${x.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ReceiptRow({ label, value, isAmount = false, isMono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      <span
        className={`text-right break-words max-w-[62%] ${
          isAmount
            ? "font-extrabold text-emerald-700 text-sm sm:text-base"
            : isMono
            ? "font-mono font-bold text-slate-900"
            : "font-semibold text-slate-800"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

export default function POSSalesReceiptModal({ isOpen, onClose, receiptData }) {
  const [downloading, setDownloading] = useState(false);

  // Prevent background scrolling when modal is open (matches GoodsReceiptReceiptModal.jsx)
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !receiptData) return null;

  const businessName = receiptData.business_name || "GrainRise Miller";
  const referenceNo = receiptData.reference_no || "—";
  const transactionDateFormatted = receiptData.transaction_date_formatted || "—";
  const sellerName = receiptData.seller_name || "Miller Seller";
  const paymentMethodLabel = receiptData.payment_method_label || "Cash";
  const items = Array.isArray(receiptData.items) ? receiptData.items : [];
  const totalAmount = Number(receiptData.total_amount ?? 0);
  const amountPaid = Number(receiptData.amount_paid ?? totalAmount);
  const changeAmount =
    (receiptData.payment_method || "cash").toLowerCase() === "cash"
      ? Number(receiptData.change_amount ?? Math.max(0, amountPaid - totalAmount))
      : 0;

  const handlePrint = () => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const productRowsHtml = items
      .map((item) => {
        const qtyLabel =
          item.quantity_label ||
          `${item.quantity_sacks} ${Number(item.quantity_sacks) === 1 ? "sack" : "sacks"}`;
        return `
          <tr>
            <td class="col-product">${escapeHtml(item.product_name || "Product")}</td>
            <td class="col-qty">${escapeHtml(qtyLabel)}</td>
            <td class="col-expiry">${escapeHtml(item.expiry_formatted || "—")}</td>
            <td class="col-price">${escapeHtml(fmtMoney(item.line_subtotal))}</td>
          </tr>
        `;
      })
      .join("");

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${escapeHtml(referenceNo)}</title>
          <style>
            :root {
              color-scheme: light only !important;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              filter: none !important;
              -webkit-filter: none !important;
            }
            html, body {
              background: #ffffff !important;
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 36px 32px;
              line-height: 1.5;
              color-scheme: light !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #0B5D1E;
              padding-bottom: 16px;
              margin-bottom: 20px;
              background: #ffffff !important;
            }
            .header h1 {
              font-size: 24px;
              font-weight: 800;
              color: #0B5D1E !important;
              margin-bottom: 4px;
              letter-spacing: -0.5px;
            }
            .badge-title {
              text-align: center;
              font-size: 14px;
              font-weight: 700;
              color: #1e293b !important;
              margin-bottom: 18px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .receipt-box {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              background: #f8fafc !important;
              padding: 12px 20px;
              margin-bottom: 18px;
            }
            .row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 9px 0;
              border-bottom: 1px solid #e2e8f0;
              font-size: 13px;
            }
            .row:last-child {
              border-bottom: none;
            }
            .row .label {
              color: #64748b !important;
              font-weight: 500;
            }
            .row .value {
              font-weight: 700;
              color: #0f172a !important;
              text-align: right;
            }
            .amount-row .value {
              color: #0B5D1E !important;
              font-size: 16px;
              font-weight: 800;
            }
            .table-wrap {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              overflow: hidden;
              background: #ffffff !important;
              margin-bottom: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              background: #ffffff !important;
            }
            thead tr {
              background: #f8fafc !important;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              color: #475569 !important;
              text-align: left;
            }
            th.col-price, td.col-price {
              text-align: right;
            }
            td {
              padding: 10px 14px;
              font-size: 13px;
              color: #0f172a !important;
              border-bottom: 1px solid #f1f5f9;
              background: #ffffff !important;
            }
            tbody tr:last-child td {
              border-bottom: none;
            }
            td.col-product {
              font-weight: 700;
              color: #0f172a !important;
            }
            td.col-qty {
              font-weight: 600;
              color: #334155 !important;
              white-space: nowrap;
            }
            td.col-expiry {
              color: #475569 !important;
              white-space: nowrap;
            }
            td.col-price {
              font-weight: 700;
              color: #0f172a !important;
              white-space: nowrap;
            }
            .footer-note {
              text-align: center;
              font-size: 11px;
              color: #64748b !important;
              font-style: italic;
              margin-top: 20px;
            }
            @page {
              size: auto;
              margin: 15mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(businessName)}</h1>
          </div>
          <div class="badge-title">OFFICIAL POINT OF SALE RECEIPT</div>

          <div class="receipt-box">
            <div class="row">
              <span class="label">Reference Number:</span>
              <span class="value">${escapeHtml(referenceNo)}</span>
            </div>
            <div class="row">
              <span class="label">Transaction Date &amp; Time:</span>
              <span class="value">${escapeHtml(transactionDateFormatted)}</span>
            </div>
            <div class="row">
              <span class="label">Seller:</span>
              <span class="value">${escapeHtml(sellerName)}</span>
            </div>
            <div class="row">
              <span class="label">Payment Method:</span>
              <span class="value">${escapeHtml(paymentMethodLabel)}</span>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Products</th>
                  <th>Qty</th>
                  <th>Expiry</th>
                  <th class="col-price">Price</th>
                </tr>
              </thead>
              <tbody>
                ${productRowsHtml}
              </tbody>
            </table>
          </div>

          <div class="receipt-box">
            <div class="row amount-row">
              <span class="label">Total:</span>
              <span class="value">${escapeHtml(fmtMoney(totalAmount))}</span>
            </div>
            <div class="row">
              <span class="label">Amount Paid:</span>
              <span class="value">${escapeHtml(fmtMoney(amountPaid))}</span>
            </div>
            <div class="row">
              <span class="label">Change:</span>
              <span class="value">${escapeHtml(fmtMoney(changeAmount))}</span>
            </div>
          </div>

          <div class="footer-note">
            This document serves as official proof of sale in GrainRise Miller POS.
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 300);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      let y = 18;

      // Try embedding logo
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = grainriseLogo;
        });
        const logoH = 11;
        const logoW = (img.width / img.height) * logoH;
        pdf.addImage(img, "PNG", (pageWidth - logoW) / 2, y, logoW, logoH);
        y += logoH + 6;
      } catch {
        y += 4;
      }

      // Header: Business Name & Receipt Subtitle
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(11, 93, 30);
      pdf.text(String(businessName), pageWidth / 2, y, { align: "center" });
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Official Point of Sale Receipt", pageWidth / 2, y, { align: "center" });
      y += 7;

      // Divider
      pdf.setDrawColor(11, 93, 30);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Metadata block (without redundant Miller Business Name row)
      const metaRows = [
        ["Reference Number:", String(referenceNo)],
        ["Transaction Date & Time:", String(transactionDateFormatted)],
        ["Seller:", String(sellerName)],
        ["Payment Method:", String(paymentMethodLabel)],
      ];

      pdf.setFontSize(9.5);
      metaRows.forEach(([label, val]) => {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, margin, y);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(val, pageWidth - margin, y, { align: "right" });
        y += 6;
      });

      y += 2;
      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Products Table Header
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 4.5, contentWidth, 8, "F");

      const colProductX = margin + 2;
      const colQtyX = margin + contentWidth * 0.48;
      const colExpiryX = margin + contentWidth * 0.68;
      const colPriceRightX = pageWidth - margin - 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text("Products", colProductX, y);
      pdf.text("Qty", colQtyX, y);
      pdf.text("Expiry", colExpiryX, y);
      pdf.text("Price", colPriceRightX, y, { align: "right" });
      y += 6;

      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y - 2, pageWidth - margin, y - 2);

      // Products Table Rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);

      items.forEach((item) => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = 20;
        }
        const prodName = String(item.product_name || "Product");
        const qtyLabel =
          item.quantity_label ||
          `${item.quantity_sacks} ${Number(item.quantity_sacks) === 1 ? "sack" : "sacks"}`;
        const expiryStr = String(item.expiry_formatted || "—");
        const priceStr = fmtMoneyPdf(item.line_subtotal);

        const wrappedName = pdf.splitTextToSize(prodName, contentWidth * 0.44);
        pdf.setFont("helvetica", "bold");
        pdf.text(wrappedName, colProductX, y + 2);

        pdf.setFont("helvetica", "normal");
        pdf.text(String(qtyLabel), colQtyX, y + 2);
        pdf.text(expiryStr, colExpiryX, y + 2);

        pdf.setFont("helvetica", "bold");
        pdf.text(priceStr, colPriceRightX, y + 2, { align: "right" });

        const rowHeight = Math.max(wrappedName.length * 4.5, 6.5);
        y += rowHeight + 2;

        pdf.setDrawColor(241, 245, 249);
        pdf.line(margin, y - 1, pageWidth - margin, y - 1);
      });

      y += 4;
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Totals Summary
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Total:", margin, y);
      pdf.setTextColor(11, 93, 30);
      pdf.text(fmtMoneyPdf(totalAmount), pageWidth - margin, y, { align: "right" });
      y += 6.5;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Amount Paid:", margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(fmtMoneyPdf(amountPaid), pageWidth - margin, y, { align: "right" });
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 116, 139);
      pdf.text("Change:", margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.text(fmtMoneyPdf(changeAmount), pageWidth - margin, y, { align: "right" });
      y += 12;

      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "This document serves as official proof of sale in GrainRise Miller POS.",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      const safeFilename = `${String(referenceNo).trim() || "RECEIPT"}.pdf`;
      pdf.save(safeFilename);
    } catch (err) {
      console.error("Failed to generate POS receipt PDF:", err);
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-Right Single Exit Control */}
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

        {/* Modal Body — Exact structure & spacing matched to GoodsReceiptReceiptModal.jsx */}
        <div className="px-6 pt-7 pb-5 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
          {/* Header centered */}
          <div className="text-center pb-3 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {businessName}
            </h1>
            <div className="mt-2.5 inline-flex items-center px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
              Official Point of Sale Receipt
            </div>
          </div>

          {/* Transaction Metadata Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Reference Number" value={referenceNo} isMono={true} />
            <ReceiptRow label="Transaction Date & Time" value={transactionDateFormatted} />
            <ReceiptRow label="Seller" value={sellerName} />
            <ReceiptRow label="Payment Method" value={paymentMethodLabel} />
          </div>

          {/* Products Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-3.5 py-2.5">Products</th>
                  <th className="px-2.5 py-2.5">Qty</th>
                  <th className="px-2.5 py-2.5">Expiry</th>
                  <th className="px-3.5 py-2.5 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => {
                  const qtyLabel =
                    item.quantity_label ||
                    `${item.quantity_sacks} ${
                      Number(item.quantity_sacks) === 1 ? "sack" : "sacks"
                    }`;
                  return (
                    <tr key={item.transaction_id || idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                        {item.product_name}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 font-medium text-slate-700">
                        {qtyLabel}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-slate-600">
                        {item.expiry_formatted || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold text-slate-900">
                        {fmtMoney(item.line_subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Total" value={fmtMoney(totalAmount)} isAmount={true} />
            <ReceiptRow label="Amount Paid" value={fmtMoney(amountPaid)} />
            <ReceiptRow label="Change" value={fmtMoney(changeAmount)} />
          </div>
        </div>

        {/* Footer Actions: Download as PDF (Blue Left) & Print Receipt (Green Right) */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Download size={16} />
            <span>{downloading ? "Downloading..." : "Download as PDF"}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
