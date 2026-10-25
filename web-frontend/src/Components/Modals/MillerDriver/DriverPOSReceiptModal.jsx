import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Download, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";
import grainriseLogo from "../../../assets/Logo.png";

function fmtMoney(val) {
  const x = typeof val === "number" ? val : parseFloat(val);
  if (Number.isNaN(x)) return "₱0.00";
  return `₱${x.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtMoneyPdf(val) {
  const x = typeof val === "number" ? val : parseFloat(val);
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
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
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

export default function DriverPOSReceiptModal({
  isOpen,
  onClose,
  receiptData,
}) {
  const [downloading, setDownloading] = useState(false);

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

  const businessName = receiptData.business_name || "GrainRise Milling Company";
  const referenceNo = receiptData.reference_no || "—";
  const transactionDateFormatted = receiptData.transaction_date_formatted || new Date().toLocaleString();
  const driverName = receiptData.driver_name || "Assigned Driver";
  const customerName = receiptData.customer_name || "Valued Retailer";
  const buyerType = receiptData.buyer_type || "Retailer";
  const batchNo = receiptData.batch_no || "";
  const paymentMethod = receiptData.payment_method || "Cash";
  const externalRef = receiptData.external_payment_reference_no;
  const receiptPhoto = receiptData.receipt_photo;
  const items = Array.isArray(receiptData.items) ? receiptData.items : [];
  const totalAmount = Number(receiptData.total_amount ?? 0);
  const amountPaid = Number(receiptData.amount_paid ?? totalAmount);
  const changeAmount = Number(receiptData.change_amount ?? 0);

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
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a;">${escapeHtml(item.product_name || "Rice Product")}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #334155;">${escapeHtml(item.display_quantity || item.ordered_quantity || 1)} kg</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #475569;">${escapeHtml(fmtMoney(item.unit_cost || 0))}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; color: #0f172a;">${escapeHtml(fmtMoney(item.total_price || 0))}</td>
        </tr>
      `
      )
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
            :root { color-scheme: light only !important; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              padding: 32px 28px;
              color: #0f172a;
              background: #fff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 12px; margin-bottom: 14px; }
            h1 { font-size: 20px; font-weight: 900; margin-bottom: 4px; color: #0f172a; }
            .badge { display: inline-block; font-size: 11px; font-weight: 700; background: #eaf7e8; color: #0B5D1E; padding: 2px 10px; border-radius: 9999px; text-transform: uppercase; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
            .row:last-child { border-bottom: none; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: 700; color: #0f172a; }
            .value.mono { font-family: monospace; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
            th { background: #f8fafc; padding: 8px 10px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .amount-total { font-size: 16px; font-weight: 900; color: #0B5D1E; }
            .footer-note { text-align: center; font-size: 11px; color: #64748b; font-style: italic; margin-top: 18px; }
            @page { size: auto; margin: 15mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(businessName)}</h1>
            <div class="badge">Official Point of Sale Receipt</div>
          </div>
          <div class="box">
            <div class="row"><span class="label">Payment Reference:</span><span class="value mono">${escapeHtml(referenceNo)}</span></div>
            <div class="row"><span class="label">Transaction Date &amp; Time:</span><span class="value">${escapeHtml(transactionDateFormatted)}</span></div>
            <div class="row"><span class="label">Driver:</span><span class="value">${escapeHtml(driverName)}</span></div>
            <div class="row"><span class="label">Customer:</span><span class="value">${escapeHtml(customerName)}</span></div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${escapeHtml(paymentMethod)}</span></div>
            ${externalRef ? `<div class="row"><span class="label">Ext Ref No:</span><span class="value mono">${escapeHtml(externalRef)}</span></div>` : ""}
          </div>
          <table>
            <thead>
              <tr>
                <th>Variant</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Line Total</th>
              </tr>
            </thead>
            <tbody>${productRowsHtml}</tbody>
          </table>
          <div class="box">
            <div class="row"><span class="label" style="font-weight: 700; font-size: 14px;">Total Amount:</span><span class="amount-total">${escapeHtml(fmtMoney(totalAmount))}</span></div>
            <div class="row"><span class="label">Amount Paid:</span><span class="value">${escapeHtml(fmtMoney(amountPaid))}</span></div>
            ${paymentMethod === "Cash" ? `<div class="row"><span class="label">Change:</span><span class="value">${escapeHtml(fmtMoney(changeAmount))}</span></div>` : ""}
          </div>
          <div class="footer-note">This document serves as official proof of payment and delivery in GrainRise.</div>
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

  const handleDownloadPDF = async () => {
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

      // Header: Business Name & Subtitle
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(15);
      pdf.setTextColor(11, 93, 30);
      pdf.text(String(businessName), pageWidth / 2, y, { align: "center" });
      y += 6;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Official Point of Sale Receipt — COD Delivery", pageWidth / 2, y, { align: "center" });
      y += 7;

      // Divider
      pdf.setDrawColor(11, 93, 30);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 7;

      // Metadata Block
      const metaRows = [
        ["Payment Reference:", String(referenceNo)],
        ["Transaction Date & Time:", String(transactionDateFormatted)],
        ["Driver:", String(driverName)],
        ["Customer:", String(customerName)],
        ["Payment Method:", String(paymentMethod)],
      ];
      if (externalRef) {
        metaRows.push(["External Reference No:", String(externalRef)]);
      }

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

      // Items Table Header
      pdf.setFillColor(248, 250, 252);
      pdf.rect(margin, y - 4.5, contentWidth, 8, "F");

      const colProductX = margin + 2;
      const colQtyX = margin + contentWidth * 0.48;
      const colPriceX = margin + contentWidth * 0.68;
      const colTotalRightX = pageWidth - margin - 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text("Products", colProductX, y);
      pdf.text("Qty", colQtyX, y);
      pdf.text("Unit Price", colPriceX, y);
      pdf.text("Total", colTotalRightX, y, { align: "right" });
      y += 6;

      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, y - 2, pageWidth - margin, y - 2);

      // Items Table Rows
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9.5);
      pdf.setTextColor(15, 23, 42);

      items.forEach((item) => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = 20;
        }
        const prodName = String(item.product_name || "Rice Product");
        const qtyLabel = `${item.display_quantity || item.ordered_quantity || 1} kg`;
        const unitPriceStr = fmtMoneyPdf(item.unit_cost || 0);
        const totalPriceStr = fmtMoneyPdf(item.total_price || 0);

        const wrappedName = pdf.splitTextToSize(prodName, contentWidth * 0.44);
        pdf.setFont("helvetica", "bold");
        pdf.text(wrappedName, colProductX, y + 2);

        pdf.setFont("helvetica", "normal");
        pdf.text(String(qtyLabel), colQtyX, y + 2);
        pdf.text(unitPriceStr, colPriceX, y + 2);

        pdf.setFont("helvetica", "bold");
        pdf.text(totalPriceStr, colTotalRightX, y + 2, { align: "right" });

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

      // Totals
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Total Amount:", margin, y);
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

      if (paymentMethod === "Cash") {
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 116, 139);
        pdf.text("Change:", margin, y);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(fmtMoneyPdf(changeAmount), pageWidth - margin, y, { align: "right" });
        y += 6;
      }

      y += 6;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8.5);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        "This document serves as official proof of payment and delivery in GrainRise.",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      const safeFilename = `Receipt-${String(referenceNo).trim() || "COD"}.pdf`;
      pdf.save(safeFilename);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Please use the Print Receipt button to print or save as PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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

        {/* Modal Body */}
        <div className="px-6 pt-7 pb-5 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
          {/* Header centered */}
          <div className="text-center pb-3 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {businessName}
            </h1>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
              <CheckCircle2 size={13} className="text-[#0B5D1E]" />
              Official Point of Sale Receipt
            </div>
          </div>

          {/* Transaction Metadata Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Buyer Type" value={buyerType} />
            <ReceiptRow label="Buyer Name" value={customerName} />
            {batchNo && <ReceiptRow label="Batch No." value={batchNo} />}
            <ReceiptRow label="Payment Reference" value={referenceNo} isMono={true} />
            <ReceiptRow label="Transaction Date & Time" value={transactionDateFormatted} />
            <ReceiptRow label="Payment Method" value={paymentMethod} />
            {driverName && <ReceiptRow label="Driver" value={driverName} />}
            {externalRef && <ReceiptRow label="External Ref No." value={externalRef} isMono={true} />}
          </div>

          {/* Captured Payment Receipt Photo (GCash/Bank only) */}
          {receiptPhoto && (
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/40">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">
                Captured Payment Receipt Photo
              </span>
              <img
                src={receiptPhoto}
                alt="Payment Receipt"
                className="w-full h-40 object-contain rounded-lg border border-slate-200 bg-white"
              />
            </div>
          )}

          {/* Products Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-3.5 py-2.5">Products</th>
                  <th className="px-2.5 py-2.5 text-center">Qty</th>
                  <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                  <th className="px-3.5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {items.map((item, idx) => {
                  const qtyLabel = `${item.display_quantity || item.ordered_quantity || 1} kg`;
                  return (
                    <tr key={item.online_order_id || idx} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                        {item.product_name}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-center font-medium text-slate-700">
                        {qtyLabel}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium text-slate-600">
                        {fmtMoney(item.unit_cost)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-bold text-slate-900">
                        {fmtMoney(item.total_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow label="Total Amount" value={fmtMoney(totalAmount)} isAmount={true} />
            <ReceiptRow label="Amount Paid" value={fmtMoney(amountPaid)} />
            {paymentMethod === "Cash" && (
              <ReceiptRow label="Change" value={fmtMoney(changeAmount)} />
            )}
          </div>
        </div>

        {/* Footer Actions: Download as PDF (Blue Left) & Print Receipt (Green Right) */}
        <div className="px-6 py-3.5 border-t border-slate-100 shrink-0 bg-white flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Download size={16} />
            <span>{downloading ? "Generating PDF..." : "Download as PDF"}</span>
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
