import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";

function ReceiptRow({ label, value, isAmount = false, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-xs sm:text-sm border-b border-slate-100 last:border-b-0">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right max-w-[62%]">{children}</div>
      ) : (
        <span
          className={`text-right break-words break-all max-w-[62%] ${
            isAmount
              ? "font-extrabold text-emerald-700 text-sm sm:text-base"
              : "font-semibold text-slate-800"
          }`}
        >
          {value || "—"}
        </span>
      )}
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
    return `PHP ${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  let s = String(val).trim();
  s = s
    .replace(/[₱\u20B1±\u00B1]/g, "")
    .replace(/\bPHP\b/gi, "")
    .trim();
  const cleanNum = s.replace(/,/g, "");
  const num = Number(cleanNum);
  if (!isNaN(num) && cleanNum !== "") {
    return `PHP ${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return s ? `PHP ${s}` : "PHP 0.00";
};

function resolveOnlineAccountFields({
  isOnlineMethod,
  methodRaw,
  selectedAccountObj,
  attempt,
  fallbackRecipientAccount,
}) {
  if (!isOnlineMethod) {
    return {
      accountType: null,
      accountName: null,
      accountNumber: null,
    };
  }

  const accountType =
    String(methodRaw || "").toLowerCase() === "gcash" ||
    String(selectedAccountObj?.type || "").toLowerCase() === "gcash"
      ? "GCash"
      : "Bank";

  let parsedName = "";
  let parsedNumber = "";
  const labelStr = String(
    attempt?.account_label ||
      selectedAccountObj?.display_label ||
      fallbackRecipientAccount ||
      ""
  ).trim();

  if (labelStr && labelStr !== "—") {
    const dashParts = labelStr.split(/\s+—\s+|\s+-\s+/);
    const rightSide =
      dashParts.length > 1 ? dashParts.slice(1).join(" — ").trim() : labelStr;
    const parenMatch = rightSide.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    if (parenMatch) {
      parsedName = parenMatch[1].trim();
      parsedNumber = parenMatch[2].trim();
    } else {
      parsedName = rightSide.trim();
    }
  }

  const accountName =
    (
      selectedAccountObj?.account_name ||
      attempt?.account_name ||
      parsedName ||
      ""
    ).trim() || "—";

  const accountNumber =
    (
      selectedAccountObj?.account_number_masked ||
      attempt?.account_number_masked ||
      parsedNumber ||
      ""
    ).trim() || "—";

  return {
    accountType,
    accountName,
    accountNumber,
  };
}

export function buildReimbursementReceiptSnapshot(firstArg, secondArg) {
  let reimbursement,
    resultData,
    payerInfo,
    selectedMethod,
    selectedAccountObj,
    latestPayoutAttempt,
    cashReference;

  if (
    firstArg &&
    (firstArg.reimbursement ||
      firstArg.resultData ||
      firstArg.latestPayoutAttempt ||
      firstArg.selectedMethod ||
      firstArg.payerInfo)
  ) {
    ({
      reimbursement,
      resultData,
      payerInfo,
      selectedMethod,
      selectedAccountObj,
      latestPayoutAttempt,
      cashReference,
    } = firstArg);
  } else {
    reimbursement = firstArg;
    const opts = secondArg || {};
    resultData = opts.resultData;
    payerInfo = opts.payerInfo || {
      payer_name: opts.paidByName,
      business_name: firstArg?.business_name,
    };
    selectedMethod = opts.selectedMethod || opts.paymentMethod || firstArg?.method;
    selectedAccountObj = opts.selectedAccountObj;
    latestPayoutAttempt =
      opts.latestPayoutAttempt || opts.payoutAttempt || firstArg?.latest_payout_attempt;
    cashReference = opts.cashReference || opts.paymentReferenceNo || firstArg?.payment_reference_no;
  }

  const reimb = resultData?.reimbursement || reimbursement || {};
  const attempt =
    reimb?.latest_payout_attempt ||
    resultData?.latest_payout_attempt ||
    latestPayoutAttempt ||
    null;

  const rawFlow = String(resultData?.payment_flow || "").toUpperCase();
  const methodRaw =
    (rawFlow === "CASH" ? "Cash" : null) ||
    attempt?.method ||
    reimb?.method ||
    selectedMethod ||
    "Cash";

  const isOnlineMethod = ["GCash", "Bank"].includes(methodRaw);
  const isSandbox = Boolean(
    isOnlineMethod &&
      (resultData?.is_sandbox ||
        attempt?.is_sandbox ||
        String(
          resultData?.xendit_environment || attempt?.xendit_environment || ""
        ).toLowerCase() === "test")
  );

  const paymentMethodDisplay = isOnlineMethod
    ? isSandbox
      ? `${methodRaw} (Test Mode)`
      : methodRaw
    : "Cash";

  const recipientAccount = isOnlineMethod
    ? attempt?.account_label ||
      selectedAccountObj?.display_label ||
      (selectedAccountObj
        ? `${
            selectedAccountObj.type === "gcash"
              ? "GCash"
              : selectedAccountObj.bank_name || "Bank"
          } — ${selectedAccountObj.account_name || ""} (${
            selectedAccountObj.account_number_masked || ""
          })`
        : "—")
    : null;

  const { accountType, accountName, accountNumber } = resolveOnlineAccountFields({
    isOnlineMethod,
    methodRaw,
    selectedAccountObj,
    attempt,
    fallbackRecipientAccount: recipientAccount,
  });

  const paymentReferenceNo = isOnlineMethod
    ? resultData?.processor_reference ||
      attempt?.processor_reference ||
      resultData?.xendit_payout_id ||
      attempt?.xendit_payout_id ||
      attempt?.provider_reference ||
      reimb?.payment_reference_no ||
      resultData?.reference_id ||
      attempt?.reference_id ||
      "—"
    : resultData?.payment_reference_no ||
      reimb?.payment_reference_no ||
      cashReference ||
      "—";

  const xenditPayoutId = isOnlineMethod
    ? resultData?.xendit_payout_id || attempt?.xendit_payout_id || null
    : null;

  const paidBy =
    reimb?.paid_by_name ||
    attempt?.initiated_by_name ||
    payerInfo?.payer_name ||
    "Finance Staff";

  const fallbackNow = new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const paymentDateTime = isOnlineMethod
    ? attempt?.updated_at || reimb?.paid_date || attempt?.created_at || fallbackNow
    : reimb?.paid_date || fallbackNow;

  const businessName =
    reimb?.business_name ||
    reimbursement?.business_name ||
    payerInfo?.business_name ||
    "GrainRise Miller";

  const rawAddress =
    reimb?.business_address || reimbursement?.business_address || "";
  const businessAddress =
    rawAddress && rawAddress !== "Address Not Provided" ? rawAddress : "";

  const rawContact =
    reimb?.business_contact || reimbursement?.business_contact || "";
  const businessContact =
    rawContact && rawContact !== "Contact Not Provided" ? rawContact : "";

  const resolvedReimbId =
    reimb?.reimbursement_id ||
    reimb?.id ||
    reimbursement?.reimbursement_id ||
    reimbursement?.id;

  const attemptId = attempt?.payout_attempt_id || null;
  const receiptKey = isOnlineMethod
    ? `reimb-${resolvedReimbId}-xendit-${attemptId || xenditPayoutId || paymentReferenceNo}`
    : `reimb-${resolvedReimbId}-cash-${paymentReferenceNo}`;

  return {
    receipt_key: receiptKey,
    reimbursement_id: resolvedReimbId,
    payout_attempt_id: attemptId,
    business_name: businessName,
    business_address: businessAddress,
    business_contact: businessContact,
    request_reference_no:
      reimb?.request_reference_no ||
      reimbursement?.request_reference_no ||
      `REIMB-${reimb?.id || reimbursement?.id || ""}`,
    requested_by:
      reimb?.requester_name ||
      reimb?.requester ||
      reimbursement?.requester_name ||
      reimbursement?.requester ||
      "—",
    reimbursement_type:
      reimb?.types ||
      reimb?.category ||
      reimbursement?.types ||
      reimbursement?.category ||
      "—",
    title: reimb?.title || reimbursement?.title || "—",
    description: reimb?.description || reimbursement?.description || "—",
    amount_paid:
      reimb?.price ||
      reimb?.cost ||
      reimbursement?.price ||
      reimbursement?.cost ||
      "₱0.00",
    amount_raw:
      reimb?.price_raw ??
      reimbursement?.price_raw ??
      reimb?.price ??
      reimbursement?.price ??
      0,
    payment_method: methodRaw,
    payment_method_display: paymentMethodDisplay,
    is_online_method: isOnlineMethod,
    is_sandbox: isSandbox,
    recipient_account: recipientAccount,
    account_type: accountType,
    account_name: accountName,
    account_number: accountNumber,
    payment_reference_no: paymentReferenceNo,
    xendit_payout_id: xenditPayoutId,
    paid_by: paidBy,
    payment_date_time: paymentDateTime,
  };
}

export default function ReimbursementReceiptModal({
  isOpen,
  onClose,
  receipt: propReceipt,
  receiptData,
}) {
  const receipt = propReceipt || receiptData;

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

  const isSandbox = Boolean(receipt.is_sandbox);
  const isOnlineMethod = Boolean(
    receipt.is_online_method ||
      ["GCash", "Bank"].includes(receipt.payment_method)
  );

  const fallbackAccountFields = resolveOnlineAccountFields({
    isOnlineMethod,
    methodRaw: receipt.payment_method,
    selectedAccountObj: null,
    attempt: null,
    fallbackRecipientAccount: receipt.recipient_account,
  });

  const accountTypeDisplay =
    receipt.account_type || fallbackAccountFields.accountType || "—";
  const accountNameDisplay =
    receipt.account_name || fallbackAccountFields.accountName || "—";
  const accountNumberDisplay =
    receipt.account_number || fallbackAccountFields.accountNumber || "—";

  const paymentMethodPdfText = isOnlineMethod
    ? isSandbox
      ? `${receipt.payment_method || "GCash"} (Test Mode)`
      : receipt.payment_method || "—"
    : receipt.payment_method || "Cash";

  const receiptBadgeTitle = isSandbox
    ? "REIMBURSEMENT PAYMENT RECEIPT"
    : "OFFICIAL REIMBURSEMENT PAYMENT RECEIPT";

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
    doc.text(
      sanitizePdfText(receipt.business_name || "GrainRise Miller"),
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 6.5;

    // Header: Address & Contact (H2)
    const addressStr = sanitizePdfText(receipt.business_address || "");
    const contactStr = sanitizePdfText(receipt.business_contact || "");
    const subtext = [addressStr, contactStr]
      .filter((s) => s && s !== "—")
      .join(" | ");
    if (subtext) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const splitSubtext = doc.splitTextToSize(subtext, usableWidth);
      doc.text(splitSubtext, pageWidth / 2, y, { align: "center" });
      y += splitSubtext.length * 4.2 + 3.5;
    } else {
      y += 2;
    }

    // Separator line
    doc.setDrawColor(11, 93, 30);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6.5;

    // Receipt Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(receiptBadgeTitle, pageWidth / 2, y, { align: "center" });
    y += 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Payment Date & Time: ${sanitizePdfText(receipt.payment_date_time)}`,
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 8;

    const rows = [
      [
        "Request Reference No.",
        sanitizePdfText(receipt.request_reference_no),
        false,
      ],
      ["Requested By", sanitizePdfText(receipt.requested_by), false],
      [
        "Reimbursement Type",
        sanitizePdfText(receipt.reimbursement_type),
        false,
      ],
      ["Title", sanitizePdfText(receipt.title), false],
      [
        "Description",
        sanitizePdfText(receipt.description),
        false,
      ],
      [
        "Amount Paid",
        formatCurrencyForPdf(receipt.amount_raw ?? receipt.amount_paid),
        true,
      ],
      [
        "Payment Method",
        sanitizePdfText(paymentMethodPdfText),
        false,
      ],
    ];

    if (isOnlineMethod) {
      rows.push(
        ["Account Type", sanitizePdfText(accountTypeDisplay), false],
        ["Account Name", sanitizePdfText(accountNameDisplay), false],
        ["Account Number", sanitizePdfText(accountNumberDisplay), false]
      );
    }

    rows.push(
      [
        "Payment Reference No.",
        sanitizePdfText(receipt.payment_reference_no),
        false,
      ],
      ["Paid By", sanitizePdfText(receipt.paid_by), false],
      [
        "Payment Date & Time",
        sanitizePdfText(receipt.payment_date_time),
        false,
      ]
    );

    const boxStartY = y;
    const rowHeight = 9.2;
    const boxHeight = rows.length * rowHeight + 4;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, boxStartY, usableWidth, boxHeight, 3, 3, "FD");

    let rowY = boxStartY + 7.2;
    rows.forEach(([label, value, isAmount], idx) => {
      const displayVal = sanitizePdfText(value);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin + 8, rowY);

      if (isAmount) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(11, 93, 30);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
      }

      const maxValWidth = 92;
      let textFontSize = isAmount ? 10.5 : 9.5;
      doc.setFontSize(textFontSize);

      if (doc.getTextWidth(displayVal) > maxValWidth) {
        for (let s = 9.0; s >= 6.5; s -= 0.5) {
          doc.setFontSize(s);
          if (doc.getTextWidth(displayVal) <= maxValWidth) {
            textFontSize = s;
            break;
          }
        }
        if (doc.getTextWidth(displayVal) > maxValWidth) {
          const splitLines = doc.splitTextToSize(displayVal, maxValWidth);
          doc.text(
            splitLines,
            pageWidth - margin - 8,
            rowY - (splitLines.length > 1 ? (splitLines.length - 1) * 1.5 : 0),
            { align: "right" }
          );
        } else {
          doc.text(displayVal, pageWidth - margin - 8, rowY, { align: "right" });
        }
      } else {
        doc.text(displayVal, pageWidth - margin - 8, rowY, { align: "right" });
      }

      if (idx < rows.length - 1) {
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(margin + 8, rowY + 3.2, pageWidth - margin - 8, rowY + 3.2);
      }
      rowY += rowHeight;
    });

    y = boxStartY + boxHeight + 8;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "This document serves as proof of reimbursement payment in GrainRise.",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    const cleanRefNo = String(
      receipt.request_reference_no ||
        receipt.payment_reference_no ||
        "reimbursement_receipt"
    ).replace(/[^\w.-]/g, "_");
    doc.save(`${cleanRefNo}.pdf`);
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

    const subHeaderHtml = [receipt.business_address, receipt.business_contact]
      .filter(Boolean)
      .join(" • ");

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receipt.request_reference_no || ""}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 36px 32px; color: #0f172a; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 16px; margin-bottom: 20px; }
            .header h1 { font-size: 24px; font-weight: 800; color: #0B5D1E; margin-bottom: 4px; letter-spacing: -0.5px; }
            .header h2 { font-size: 13px; font-weight: 500; color: #64748b; line-height: 1.4; max-width: 500px; margin: 0 auto; }
            .badge-title { text-align: center; font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 16px; letter-spacing: 0.5px; text-transform: uppercase; }
            .receipt-box { border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; padding: 12px 20px; margin-bottom: 24px; }
            .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .row:last-child { border-bottom: none; }
            .row .label { color: #64748b; font-weight: 500; flex-shrink: 0; }
            .row .value { font-weight: 700; color: #0f172a; text-align: right; word-break: break-all; overflow-wrap: anywhere; }
            .amount-row .value { color: #0B5D1E; font-size: 16px; font-weight: 800; }
            .test-mode-tag { display: inline-block; font-size: 10px; font-weight: 600; color: #64748b; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px 6px; margin-left: 6px; vertical-align: middle; }
            .section-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; padding-top: 10px; padding-bottom: 4px; border-top: 1px solid #e2e8f0; margin-top: 4px; }
            .footer-note { text-align: center; font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 24px; }
            @page { size: auto; margin: 15mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${receipt.business_name || "GrainRise Miller"}</h1>
            ${subHeaderHtml ? `<h2>${subHeaderHtml}</h2>` : ""}
          </div>
          <div class="badge-title">${receiptBadgeTitle}</div>
          <div class="receipt-box">
            <div class="row"><span class="label">Request Reference No.:</span><span class="value">${receipt.request_reference_no || "—"}</span></div>
            <div class="row"><span class="label">Requested By:</span><span class="value">${receipt.requested_by || "—"}</span></div>
            <div class="row"><span class="label">Reimbursement Type:</span><span class="value">${receipt.reimbursement_type || "—"}</span></div>
            <div class="row"><span class="label">Title:</span><span class="value">${receipt.title || "—"}</span></div>
            <div class="row"><span class="label">Description:</span><span class="value">${receipt.description || "—"}</span></div>
            <div class="row amount-row"><span class="label">Amount Paid:</span><span class="value">${receipt.amount_paid || "—"}</span></div>
            <div class="section-label">Payment Details</div>
            <div class="row"><span class="label">Payment Method:</span><span class="value">${receipt.payment_method || "—"}${
      isSandbox ? `<span class="test-mode-tag">Test Mode</span>` : ""
    }</span></div>
            ${
              isOnlineMethod
                ? `
            <div class="row"><span class="label">Account Type:</span><span class="value">${accountTypeDisplay}</span></div>
            <div class="row"><span class="label">Account Name:</span><span class="value">${accountNameDisplay}</span></div>
            <div class="row"><span class="label">Account Number:</span><span class="value">${accountNumberDisplay}</span></div>
            `
                : ""
            }
            <div class="row"><span class="label">Payment Reference No.:</span><span class="value">${receipt.payment_reference_no || "—"}</span></div>
            <div class="row"><span class="label">Paid By:</span><span class="value">${receipt.paid_by || "—"}</span></div>
            <div class="row"><span class="label">Payment Date & Time:</span><span class="value">${receipt.payment_date_time || "—"}</span></div>
          </div>
          <div class="footer-note">This document serves as proof of reimbursement payment in GrainRise.</div>
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
        {/* Top-Right Single Exit Control: closes receipt and refreshes Reimbursements table */}
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

        {/* Modal Body — Exact layout, typography, and spacing of Payables / Expenses Receipts */}
        <div className="px-6 pt-7 pb-5 overflow-y-auto max-h-[calc(90vh-90px)] space-y-4">
          {/* Centered Header */}
          <div className="text-center pb-2 border-b border-slate-100">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {receipt.business_name || "GrainRise Miller"}
            </h1>
            {(receipt.business_address || receipt.business_contact) && (
              <h2 className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-md mx-auto leading-relaxed">
                {receipt.business_address}
                {receipt.business_address && receipt.business_contact && <br />}
                {receipt.business_contact}
              </h2>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
                {receiptBadgeTitle}
              </span>
            </div>
          </div>

          {/* Receipt Details Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-0.5">
            <ReceiptRow
              label="Request Reference No."
              value={receipt.request_reference_no}
            />
            <ReceiptRow label="Requested By" value={receipt.requested_by} />
            <ReceiptRow
              label="Reimbursement Type"
              value={receipt.reimbursement_type}
            />
            <ReceiptRow label="Title" value={receipt.title} />

            {/* Description multiline */}
            <div className="py-2 text-xs sm:text-sm border-b border-slate-100">
              <span className="text-slate-500 font-medium block mb-1">
                Description:
              </span>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                {receipt.description || "—"}
              </div>
            </div>

            <ReceiptRow
              label="Amount Paid"
              value={receipt.amount_paid}
              isAmount={true}
            />

            {/* Payment Details Section */}
            <div className="pt-2.5 pb-1 border-t border-slate-200/80 my-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Payment Details
              </span>
            </div>

            <ReceiptRow label="Payment Method">
              <span className="inline-flex items-center justify-end gap-1.5 font-semibold text-slate-800">
                <span>{receipt.payment_method || "—"}</span>
                {isSandbox && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-semibold tracking-normal">
                    Test Mode
                  </span>
                )}
              </span>
            </ReceiptRow>

            {isOnlineMethod && (
              <>
                <ReceiptRow label="Account Type" value={accountTypeDisplay} />
                <ReceiptRow label="Account Name" value={accountNameDisplay} />
                <ReceiptRow
                  label="Account Number"
                  value={accountNumberDisplay}
                />
              </>
            )}

            <ReceiptRow
              label="Payment Reference No."
              value={receipt.payment_reference_no}
            />
            <ReceiptRow label="Paid By" value={receipt.paid_by} />
            <ReceiptRow
              label="Payment Date & Time"
              value={receipt.payment_date_time}
            />
          </div>
        </div>

        {/* Footer Buttons: Blue Left (Download as PDF) & Green Right (Print) — Exact match to Payables */}
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

