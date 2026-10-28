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

export default function WarehouseDriverPOSReceiptModal({
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

  const businessName = receiptData.business_name || "GrainRise Warehouse";
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
                <th>Product</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${productRowsHtml}
            </tbody>
          </table>
          <div class="box">
            <div class="row"><span class="label">Total Amount:</span><span class="value amount-total">${escapeHtml(fmtMoney(totalAmount))}</span></div>
            <div class="row"><span class="label">Amount Paid:</span><span class="value">${escapeHtml(fmtMoney(amountPaid))}</span></div>
            <div class="row"><span class="label">Change:</span><span class="value">${escapeHtml(fmtMoney(changeAmount))}</span></div>
          </div>
          <p class="footer-note">Thank you for your business! This document serves as your official payment acknowledgment.</p>
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
    }, 250);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 40;

      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text(businessName, pageWidth / 2, y, { align: "center" });

      y += 18;
      pdf.setFontSize(11);
      pdf.setTextColor(11, 93, 30);
      pdf.text("OFFICIAL POINT OF SALE RECEIPT", pageWidth / 2, y, { align: "center" });

      y += 20;
      pdf.setDrawColor(11, 93, 30);
      pdf.setLineWidth(1.5);
      pdf.line(40, y, pageWidth - 40, y);

      y += 20;

      // Meta Box
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(1);
      pdf.roundedRect(40, y, pageWidth - 80, 110, 6, 6, "FD");

      const printRow = (label, val, posY) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, 55, posY);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(String(val), pageWidth - 55, posY, { align: "right" });
      };

      printRow("Payment Reference:", referenceNo, y + 20);
      printRow("Transaction Date & Time:", transactionDateFormatted, y + 36);
      printRow("Driver:", driverName, y + 52);
      printRow("Customer:", customerName, y + 68);
      printRow("Payment Method:", paymentMethod, y + 84);
      if (externalRef) {
        printRow("External Ref No:", externalRef, y + 100);
      }

      y += 130;

      // Items Table Header
      pdf.setFillColor(241, 245, 249);
      pdf.rect(40, y, pageWidth - 80, 22, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text("PRODUCT", 50, y + 15);
      pdf.text("QTY", 260, y + 15, { align: "center" });
      pdf.text("UNIT PRICE", 380, y + 15, { align: "right" });
      pdf.text("TOTAL", pageWidth - 50, y + 15, { align: "right" });

      y += 22;

      // Items Rows
      items.forEach((item) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(item.product_name || "Rice Product", 50, y + 16);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(51, 65, 85);
        pdf.text(`${item.display_quantity || item.ordered_quantity || 1} kg`, 260, y + 16, { align: "center" });
        pdf.text(fmtMoneyPdf(item.unit_cost || 0), 380, y + 16, { align: "right" });

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(15, 23, 42);
        pdf.text(fmtMoneyPdf(item.total_price || 0), pageWidth - 50, y + 16, { align: "right" });

        y += 22;
        pdf.setDrawColor(241, 245, 249);
        pdf.setLineWidth(0.75);
        pdf.line(40, y, pageWidth - 40, y);
      });

      y += 15;

      // Summary Box
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(40, y, pageWidth - 80, 68, 6, 6, "FD");

      printRow("Total Amount:", fmtMoneyPdf(totalAmount), y + 20);
      printRow("Amount Paid:", fmtMoneyPdf(amountPaid), y + 38);
      printRow("Change:", fmtMoneyPdf(changeAmount), y + 56);

      y += 90;
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        "Thank you for your business! This document serves as your official payment acknowledgment.",
        pageWidth / 2,
        y,
        { align: "center" }
      );

      pdf.save(`POS-Receipt-${referenceNo}.pdf`);
    } catch {
      // PDF download error handling
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
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
              Official POS Receipt
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Point of sale transaction acknowledgment
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close receipt modal"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Receipt Content Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4 bg-white">
          {/* Receipt Brand Banner */}
          <div className="text-center py-2 border-b-2 border-[#0B5D1E]/40 pb-3">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {businessName}
            </h1>
            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              Official Point of Sale Receipt
            </span>
          </div>

          {/* Meta Details Card */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
            <ReceiptRow label="Payment Reference" value={referenceNo} isMono />
            <ReceiptRow label="Transaction Date & Time" value={transactionDateFormatted} />
            <ReceiptRow label="Driver" value={driverName} />
            <ReceiptRow label="Customer" value={customerName} />
            <ReceiptRow label="Buyer Type" value={buyerType} />
            {batchNo && <ReceiptRow label="Batch No." value={batchNo} />}
            <ReceiptRow
              label="Payment Method"
              value={paymentMethod === "Cash" ? "Cash on Delivery" : paymentMethod}
            />
            {externalRef && (
              <ReceiptRow label="External Ref No." value={externalRef} isMono />
            )}
          </div>

          {/* Itemized Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-3.5 py-2.5">Product</th>
                  <th className="px-2.5 py-2.5 text-center">Qty</th>
                  <th className="px-3.5 py-2.5 text-right">Unit Price</th>
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
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-xs text-slate-400 italic">
                      No item details available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
            <ReceiptRow label="Total Amount" value={fmtMoney(totalAmount)} isAmount />
            <ReceiptRow label="Amount Paid" value={fmtMoney(amountPaid)} />
            <ReceiptRow label="Change" value={fmtMoney(changeAmount)} />
          </div>

          {/* Receipt Proof Photo Attachment (If GCash / Bank) */}
          {receiptPhoto && (
            <div className="pt-1">
              <span className="text-slate-500 font-medium text-xs block mb-1.5">
                Attached Payment Proof:
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 max-h-48 flex items-center justify-center p-1">
                <img
                  src={receiptPhoto}
                  alt="Receipt Attachment"
                  className="max-h-44 object-contain rounded-lg shadow-2xs"
                />
              </div>
            </div>
          )}

          <p className="text-center text-[11px] text-slate-400 italic pt-1">
            Thank you for your business! This document serves as your official payment acknowledgment.
          </p>
        </div>

        {/* Modal Action Buttons Footer: Download as PDF (Blue, left), Print Receipt (Green, right) */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition shadow-sm active:scale-98 cursor-pointer disabled:opacity-50"
          >
            <Download size={15} />
            <span>{downloading ? "Generating PDF..." : "Download as PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs sm:text-sm font-bold transition shadow-sm active:scale-98 cursor-pointer"
          >
            <Printer size={15} />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
