import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileDown,
  Printer,
  Calendar,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { jsPDF } from "jspdf";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useApi from "../../../Components/hooks/useApi";

const sanitizePdfText = (val) => {
  if (val === null || val === undefined || val === "") return "N/A";
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").trim();
  return s || "N/A";
};

const formatCurrencyForPdf = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "PHP 0.00";
  }
  if (typeof val === "number" && !isNaN(val)) {
    return `PHP ${val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").replace(/\bPHP\b/gi, "").trim();
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

const formatPesoDisplay = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "N/A";
  }
  const num = Number(val);
  if (isNaN(num)) return "N/A";
  return `₱ ${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatQtyKgOrNa = (val) => {
  if (val === null || val === undefined || val === "" || val === "N/A") {
    return "N/A";
  }
  const num = Number(val);
  if (isNaN(num)) return "N/A";
  const formatted = Number.isInteger(num)
    ? num.toLocaleString("en-US")
    : num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  return `${formatted} kg`;
};

const valueOrNa = (val) => {
  if (val === null || val === undefined) return "N/A";
  const trimmed = String(val).trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return "N/A";
  return trimmed;
};

export default function MillerFinanceReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { request } = useApi();

  const [payables, setPayables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "N/A",
    business_address: "N/A",
    business_contact: "N/A",
    business_email: "N/A",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters: Status (All / Paid / Pending) and Date Range (From <= To)
  const getInitialStatus = () => {
    const raw =
      location.state?.statusFilter ||
      new URLSearchParams(location.search).get("status") ||
      "all";
    const clean = String(raw).toLowerCase().trim();
    return ["all", "paid", "pending"].includes(clean) ? clean : "all";
  };

  const [statusFilter, setStatusFilter] = useState(getInitialStatus);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const navStatus =
      location.state?.statusFilter ||
      new URLSearchParams(location.search).get("status");
    if (navStatus) {
      const clean = String(navStatus).toLowerCase().trim();
      if (["all", "paid", "pending"].includes(clean)) {
        setStatusFilter(clean);
      }
    }
  }, [location.state, location.search]);

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate && endDate < val) {
      setEndDate(val);
    }
  };

  const handleEndDateChange = (val) => {
    if (!val) {
      setEndDate("");
      return;
    }
    if (startDate && val < startDate) {
      return;
    }
    setEndDate(val);
  };

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await request(
        "/miller-employees/finance/payment-history/reports/",
        {
          method: "GET",
          throwOnError: true,
        }
      );
      const payload = res?.data ?? res ?? {};
      setPayables(Array.isArray(payload.payables) ? payload.payables : []);
      setExpenses(Array.isArray(payload.expenses) ? payload.expenses : []);
      setReimbursements(
        Array.isArray(payload.reimbursements) ? payload.reimbursements : []
      );
      if (payload.business_info && typeof payload.business_info === "object") {
        setBusinessInfo(payload.business_info);
      }
    } catch (err) {
      setError(err?.message || "Failed to load financial report data.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const filterRow = useCallback(
    (row) => {
      const isPaid = Boolean(row.is_paid);
      if (statusFilter === "paid" && !isPaid) return false;
      if (statusFilter === "pending" && isPaid) return false;

      if (startDate || endDate) {
        if (startDate && endDate && endDate < startDate) return true;
        const rowDate = row.date_iso || "";
        if (!rowDate) return false;
        if (startDate && rowDate < startDate) return false;
        if (endDate && rowDate > endDate) return false;
      }

      return true;
    },
    [statusFilter, startDate, endDate]
  );

  const filteredPayables = useMemo(
    () => payables.filter(filterRow),
    [payables, filterRow]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter(filterRow),
    [expenses, filterRow]
  );
  const filteredReimbursements = useMemo(
    () => reimbursements.filter(filterRow),
    [reimbursements, filterRow]
  );

  const totalRecordCount =
    filteredPayables.length +
    filteredExpenses.length +
    filteredReimbursements.length;

  // Compute TOTAL EXPENSES and BREAKDOWN (PENDING, PAID) from actual live statuses
  // Simulated Xendit Test Mode transactions (is_sandbox === true) are excluded from live financial totals
  const { totalExpenses, totalPending, totalPaid } = useMemo(() => {
    let total = 0;
    let pending = 0;
    let paid = 0;

    const accumulate = (rows, amountKey) => {
      rows.forEach((row) => {
        if (row.is_sandbox) return;
        const amt = Number(row[amountKey] || 0);
        if (isNaN(amt)) return;
        total += amt;
        if (row.is_paid) {
          paid += amt;
        } else {
          pending += amt;
        }
      });
    };

    accumulate(filteredPayables, "total_payable_amount");
    accumulate(filteredExpenses, "price");
    accumulate(filteredReimbursements, "price");

    return {
      totalExpenses: total,
      totalPending: pending,
      totalPaid: paid,
    };
  }, [filteredPayables, filteredExpenses, filteredReimbursements]);

  const businessName = valueOrNa(businessInfo.business_name);
  const businessHeaderLine = useMemo(() => {
    const parts = [
      valueOrNa(businessInfo.business_address),
      valueOrNa(businessInfo.business_contact),
      valueOrNa(businessInfo.business_email),
    ].filter((p) => p !== "N/A");
    return parts.length > 0 ? parts.join(" • ") : "N/A";
  }, [businessInfo]);

  const exportFilename = `${(businessName !== "N/A"
    ? businessName
    : "Miller_Finance"
  ).replace(/[^\w.-]/g, "_")}_Financial_Report`;

  // ── 1. DOWNLOAD EXCEL (.XLS HTML Workbook) ───────────────────────────────────
  const handleDownloadExcel = () => {
    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Financial Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; }
          .header-title { font-size: 18pt; font-weight: bold; color: #0B5D1E; text-align: center; }
          .header-subtitle { font-size: 10pt; color: #555555; text-align: center; }
          .report-heading { font-size: 14pt; font-weight: bold; color: #1e293b; text-align: center; margin-top: 10px; }
          .section-heading { font-size: 12pt; font-weight: bold; color: #0B5D1E; text-align: center; margin-top: 18px; margin-bottom: 6px; }
          .metadata { font-size: 9pt; color: #64748b; text-align: center; font-style: italic; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; margin-bottom: 16px; }
          th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; border: 1px solid #084b18; padding: 7px 6px; font-size: 9.5pt; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px; font-size: 9pt; color: #0f172a; vertical-align: top; white-space: normal; }
          .num { text-align: right; }
          .center { text-align: center; }
          .text-ref { mso-number-format: "\@"; word-break: break-all; white-space: normal; }
          .text-desc { word-wrap: break-word; white-space: normal; }
          .summary-box { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">${businessName}</div>
        <div class="header-subtitle">${businessHeaderLine}</div>
        <div class="report-heading">MILLER FINANCIAL REPORT</div>
        <div class="metadata">Generated on: ${generatedDate}</div>
        <br/>

        <div class="section-heading">PROCUREMENT PAYABLES</div>
        <table border="1">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Variant</th>
              <th>Supplier</th>
              <th>Order Qty</th>
              <th>Receiving Ref</th>
              <th>Total Received</th>
              <th>Good</th>
              <th>Price/kg</th>
              <th>Payable</th>
              <th>Received By</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Paid Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredPayables.length === 0) {
      html += `<tr><td colspan="14" class="center">N/A</td></tr>`;
    } else {
      filteredPayables.forEach((r) => {
        html += `
          <tr>
            <td>${valueOrNa(r.batch_code)}</td>
            <td>${valueOrNa(r.rice_variant)}</td>
            <td>${valueOrNa(r.supplier_name)}</td>
            <td class="num">${formatQtyKgOrNa(r.ordered_quantity)}</td>
            <td class="text-ref">${valueOrNa(r.receiving_reference_id)}</td>
            <td class="num">${formatQtyKgOrNa(r.received_quantity)}</td>
            <td class="num">${formatQtyKgOrNa(r.good_quantity)}</td>
            <td class="num">${formatPesoDisplay(r.price_per_kg)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.total_payable_amount)}</td>
            <td>${valueOrNa(r.received_by)}</td>
            <td class="center">${valueOrNa(r.status)}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="center">${valueOrNa(r.paid_at)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <div class="section-heading">EXPENSES</div>
        <table border="1">
          <thead>
            <tr>
              <th>Setting Reference No.</th>
              <th>Set By</th>
              <th>Type</th>
              <th>Description</th>
              <th>Price</th>
              <th>Payment Method</th>
              <th>Payment Reference No.</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredExpenses.length === 0) {
      html += `<tr><td colspan="9" class="center">N/A</td></tr>`;
    } else {
      filteredExpenses.forEach((r) => {
        html += `
          <tr>
            <td class="text-ref">${valueOrNa(r.setting_reference_no)}</td>
            <td>${valueOrNa(r.set_by)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.price)}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="text-ref">${valueOrNa(r.payment_reference_no)}</td>
            <td class="center">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <div class="section-heading">REIMBURSEMENT</div>
        <table border="1">
          <thead>
            <tr>
              <th>Request Reference No.</th>
              <th>Requested By</th>
              <th>Category</th>
              <th>Type</th>
              <th>Description</th>
              <th>Price</th>
              <th>Payment Method</th>
              <th>Payment Reference No.</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredReimbursements.length === 0) {
      html += `<tr><td colspan="10" class="center">N/A</td></tr>`;
    } else {
      filteredReimbursements.forEach((r) => {
        html += `
          <tr>
            <td class="text-ref">${valueOrNa(r.request_reference_no)}</td>
            <td>${valueOrNa(r.requested_by)}</td>
            <td>${valueOrNa(r.category)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.price)}</td>
            <td class="center">${valueOrNa(r.payment_method)}</td>
            <td class="text-ref">${valueOrNa(r.payment_reference_no)}</td>
            <td class="center">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `;
      });
    }

    html += `
          </tbody>
        </table>

        <table border="1">
          <tbody>
            <tr class="summary-box">
              <td colspan="8" style="text-align: right; font-weight: bold;">TOTAL EXPENSES:</td>
              <td class="num" style="font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(totalExpenses)}</td>
            </tr>
            <tr class="summary-box">
              <td colspan="8" style="text-align: right; vertical-align: top;">
                <b>BREAKDOWN:</b><br/>
                PENDING:<br/>
                PAID:
              </td>
              <td class="num" style="vertical-align: top;">
                &nbsp;<br/>
                ${formatPesoDisplay(totalPending)}<br/>
                ${formatPesoDisplay(totalPaid)}
              </td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── 2. DOWNLOAD PDF (Landscape Multi-page jsPDF Document) ────────────────────
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 8;
    const usableWidth = pageWidth - margin * 2; // 281mm
    let y = 12;
    let currentPage = 1;

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const printDocumentHeader = (pageNum) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(11, 93, 30);
      doc.text(sanitizePdfText(businessName), pageWidth / 2, y, {
        align: "center",
      });
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        sanitizePdfText(businessHeaderLine.replace(/•/g, " | ")),
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text("MILLER FINANCIAL REPORT", pageWidth / 2, y, {
        align: "center",
      });
      y += 4;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${generatedDate}   |   Page ${pageNum}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 3;

      doc.setDrawColor(11, 93, 30);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    const ensureSpace = (neededMm) => {
      if (y + neededMm > pageHeight - 10) {
        doc.addPage();
        currentPage += 1;
        y = 12;
        printDocumentHeader(currentPage);
      }
    };

    const drawSectionTable = (sectionTitle, cols, rowsData, buildRowCells) => {
      ensureSpace(18);

      // Centered Section Heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(11, 93, 30);
      doc.text(sectionTitle, pageWidth / 2, y, { align: "center" });
      y += 3;

      const drawHeaderRow = () => {
        doc.setFillColor(11, 93, 30);
        doc.rect(margin, y, usableWidth, 6.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(255, 255, 255);

        let curX = margin;
        cols.forEach((col) => {
          const textX =
            col.align === "right"
              ? curX + col.width - 1.5
              : col.align === "center"
              ? curX + col.width / 2
              : curX + 1.5;
          doc.text(col.label, textX, y + 4.3, {
            align: col.align || "left",
          });
          curX += col.width;
        });
        y += 6.5;
      };

      drawHeaderRow();
      const rowHeight = 5.5;

      if (rowsData.length === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, usableWidth, rowHeight, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text("N/A", pageWidth / 2, y + 3.8, { align: "center" });
        y += rowHeight + 5;
        return;
      }

      rowsData.forEach((row, idx) => {
        const rowValues = buildRowCells(row);
        const baseFontSize = 5.6;
        doc.setFontSize(baseFontSize);

        const cellRenderData = rowValues.map((val, cIdx) => {
          const col = cols[cIdx];
          const maxW = Math.max(col.width - 2.5, 4);
          const rawText = sanitizePdfText(val);
          doc.setFont("helvetica", col.bold ? "bold" : "normal");
          const lines = doc.splitTextToSize(rawText, maxW);
          return { lines, col, rawText };
        });

        const maxLines = Math.max(...cellRenderData.map((c) => c.lines.length), 1);
        const lineHeight = 2.6;
        const dynamicRowHeight = Math.max(5.5, maxLines * lineHeight + 2.0);

        if (y + dynamicRowHeight > pageHeight - 10) {
          doc.addPage();
          currentPage += 1;
          y = 12;
          printDocumentHeader(currentPage);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(11, 93, 30);
          doc.text(`${sectionTitle} (Continued)`, pageWidth / 2, y, {
            align: "center",
          });
          y += 3;
          drawHeaderRow();
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, usableWidth, dynamicRowHeight, "F");
        }

        let curX = margin;
        cellRenderData.forEach(({ lines, col }) => {
          doc.setFont("helvetica", col.bold ? "bold" : "normal");
          doc.setFontSize(baseFontSize);
          if (col.highlightGreen) {
            doc.setTextColor(11, 93, 30);
          } else {
            doc.setTextColor(15, 23, 42);
          }

          const textX =
            col.align === "right"
              ? curX + col.width - 1.5
              : col.align === "center"
              ? curX + col.width / 2
              : curX + 1.5;

          lines.forEach((lineText, lineIdx) => {
            const lineY = y + 3.2 + lineIdx * lineHeight;
            doc.text(lineText, textX, lineY, {
              align: col.align || "left",
            });
          });

          curX += col.width;
        });

        y += dynamicRowHeight;
      });

      y += 5;
    };

    printDocumentHeader(currentPage);

    // Section 1: PROCUREMENT PAYABLES (281mm total)
    const payablesCols = [
      { label: "Batch", width: 22, align: "left" },
      { label: "Variant", width: 17, align: "left" },
      { label: "Supplier", width: 24, align: "left" },
      { label: "Order Qty", width: 16, align: "right" },
      { label: "Receiving Ref", width: 25, align: "left" },
      { label: "Received", width: 16, align: "right" },
      { label: "Good", width: 15, align: "right" },
      { label: "Price/kg", width: 18, align: "right" },
      { label: "Payable", width: 24, align: "right", bold: true, highlightGreen: true },
      { label: "Received By", width: 24, align: "left" },
      { label: "Status", width: 15, align: "center" },
      { label: "Payment Method", width: 21, align: "center" },
      { label: "Paid Date", width: 20, align: "center" },
      { label: "Paid By", width: 24, align: "left" },
    ];

    drawSectionTable(
      "PROCUREMENT PAYABLES",
      payablesCols,
      filteredPayables,
      (r) => [
        valueOrNa(r.batch_code),
        valueOrNa(r.rice_variant),
        valueOrNa(r.supplier_name),
        formatQtyKgOrNa(r.ordered_quantity),
        valueOrNa(r.receiving_reference_id),
        formatQtyKgOrNa(r.received_quantity),
        formatQtyKgOrNa(r.good_quantity),
        r.price_per_kg !== null && r.price_per_kg !== undefined
          ? formatCurrencyForPdf(r.price_per_kg)
          : "N/A",
        formatCurrencyForPdf(r.total_payable_amount),
        valueOrNa(r.received_by),
        valueOrNa(r.status),
        valueOrNa(r.payment_method),
        valueOrNa(r.paid_at),
        valueOrNa(r.paid_by),
      ]
    );

    // Section 2: EXPENSES (281mm total)
    const expensesCols = [
      { label: "Setting Reference No.", width: 36, align: "left" },
      { label: "Set By", width: 32, align: "left" },
      { label: "Type", width: 26, align: "left" },
      { label: "Description", width: 52, align: "left" },
      { label: "Price", width: 27, align: "right", bold: true, highlightGreen: true },
      { label: "Payment Method", width: 24, align: "center" },
      { label: "Payment Reference No.", width: 34, align: "left" },
      { label: "Payment Date", width: 22, align: "center" },
      { label: "Paid By", width: 28, align: "left" },
    ];

    drawSectionTable("EXPENSES", expensesCols, filteredExpenses, (r) => [
      valueOrNa(r.setting_reference_no),
      valueOrNa(r.set_by),
      valueOrNa(r.type),
      valueOrNa(r.description),
      formatCurrencyForPdf(r.price),
      valueOrNa(r.payment_method),
      valueOrNa(r.payment_reference_no),
      valueOrNa(r.payment_date),
      valueOrNa(r.paid_by),
    ]);

    // Section 3: REIMBURSEMENT (281mm total)
    const reimbursementCols = [
      { label: "Request Reference No.", width: 32, align: "left" },
      { label: "Requested By", width: 28, align: "left" },
      { label: "Category", width: 24, align: "left" },
      { label: "Type", width: 28, align: "left" },
      { label: "Description", width: 42, align: "left" },
      { label: "Price", width: 25, align: "right", bold: true, highlightGreen: true },
      { label: "Payment Method", width: 22, align: "center" },
      { label: "Payment Reference No.", width: 32, align: "left" },
      { label: "Payment Date", width: 22, align: "center" },
      { label: "Paid By", width: 26, align: "left" },
    ];

    drawSectionTable(
      "REIMBURSEMENT",
      reimbursementCols,
      filteredReimbursements,
      (r) => [
        valueOrNa(r.request_reference_no),
        valueOrNa(r.requested_by),
        valueOrNa(r.category),
        valueOrNa(r.type),
        valueOrNa(r.description),
        formatCurrencyForPdf(r.price),
        valueOrNa(r.payment_method),
        valueOrNa(r.payment_reference_no),
        valueOrNa(r.payment_date),
        valueOrNa(r.paid_by),
      ]
    );

    // Bottom Summary Box: TOTAL EXPENSES & BREAKDOWN (PENDING, PAID)
    ensureSpace(16);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableWidth, 14, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(11, 93, 30);
    doc.text(
      `TOTAL EXPENSES: ${formatCurrencyForPdf(totalExpenses)}`,
      pageWidth - margin - 3,
      y + 5,
      { align: "right" }
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `BREAKDOWN   —   PENDING: ${formatCurrencyForPdf(
        totalPending
      )}   |   PAID: ${formatCurrencyForPdf(totalPaid)}`,
      pageWidth - margin - 3,
      y + 10.5,
      { align: "right" }
    );

    doc.save(`${exportFilename}.pdf`);
  };

  // ── 3. PRINT (Isolated Iframe Document Print) ──────────────────────────────
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

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const payablesRowsHtml =
      filteredPayables.length === 0
        ? `<tr><td colspan="14" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredPayables
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td>${valueOrNa(r.batch_code)}</td>
            <td>${valueOrNa(r.rice_variant)}</td>
            <td>${valueOrNa(r.supplier_name)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.ordered_quantity)}</td>
            <td class="ref-cell">${valueOrNa(r.receiving_reference_id)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.received_quantity)}</td>
            <td style="text-align: right;">${formatQtyKgOrNa(r.good_quantity)}</td>
            <td style="text-align: right;">${formatPesoDisplay(r.price_per_kg)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.total_payable_amount)}</td>
            <td>${valueOrNa(r.received_by)}</td>
            <td style="text-align: center;">${valueOrNa(r.status)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td style="text-align: center;">${valueOrNa(r.paid_at)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    const expensesRowsHtml =
      filteredExpenses.length === 0
        ? `<tr><td colspan="9" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredExpenses
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td class="ref-cell">${valueOrNa(r.setting_reference_no)}</td>
            <td>${valueOrNa(r.set_by)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="desc-cell">${valueOrNa(r.description)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.price)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td class="ref-cell">${valueOrNa(r.payment_reference_no)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    const reimbursementRowsHtml =
      filteredReimbursements.length === 0
        ? `<tr><td colspan="10" style="text-align: center; color: #64748b;">N/A</td></tr>`
        : filteredReimbursements
            .map(
              (r, idx) => `
          <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
            <td class="ref-cell">${valueOrNa(r.request_reference_no)}</td>
            <td>${valueOrNa(r.requested_by)}</td>
            <td>${valueOrNa(r.category)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="desc-cell">${valueOrNa(r.description)}</td>
            <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${formatPesoDisplay(r.price)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_method)}</td>
            <td class="ref-cell">${valueOrNa(r.payment_reference_no)}</td>
            <td style="text-align: center;">${valueOrNa(r.payment_date)}</td>
            <td>${valueOrNa(r.paid_by)}</td>
          </tr>
        `
            )
            .join("");

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportFilename}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 18px; color: #0f172a; line-height: 1.4; font-size: 10.5px; }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 10px; margin-bottom: 12px; }
            .header h1 { font-size: 19px; font-weight: 800; color: #0B5D1E; margin-bottom: 3px; }
            .header h2 { font-size: 11px; font-weight: 500; color: #64748b; }
            .report-title { text-align: center; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 3px; text-transform: uppercase; }
            .metadata { text-align: center; font-size: 9.5px; color: #94a3b8; margin-bottom: 12px; font-style: italic; }
            .section-title { text-align: center; font-size: 11.5px; font-weight: 800; color: #0B5D1E; margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
            th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; text-align: left; padding: 5px 4px; border: 1px solid #084b18; vertical-align: bottom; }
            td { padding: 4.5px 4px; border: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; white-space: normal; }
            .ref-cell { word-break: break-all; font-family: monospace; font-size: 8.5px; white-space: normal; }
            .desc-cell { word-break: break-word; white-space: normal; }
            .summary-box { margin-top: 14px; border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 10px 14px; text-align: right; }
            @page { size: landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${businessName}</h1>
            <h2>${businessHeaderLine}</h2>
          </div>
          <div class="report-title">MILLER FINANCIAL REPORT</div>
          <div class="metadata">Generated on: ${generatedDate}</div>

          <div class="section-title">PROCUREMENT PAYABLES</div>
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Variant</th>
                <th>Supplier</th>
                <th style="text-align: right;">Order Qty</th>
                <th>Receiving Ref</th>
                <th style="text-align: right;">Total Received</th>
                <th style="text-align: right;">Good</th>
                <th style="text-align: right;">Price/kg</th>
                <th style="text-align: right;">Payable</th>
                <th>Received By</th>
                <th style="text-align: center;">Status</th>
                <th style="text-align: center;">Payment Method</th>
                <th style="text-align: center;">Paid Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${payablesRowsHtml}</tbody>
          </table>

          <div class="section-title">EXPENSES</div>
          <table>
            <thead>
              <tr>
                <th>Setting Reference No.</th>
                <th>Set By</th>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Payment Method</th>
                <th>Payment Reference No.</th>
                <th style="text-align: center;">Payment Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${expensesRowsHtml}</tbody>
          </table>

          <div class="section-title">REIMBURSEMENT</div>
          <table>
            <thead>
              <tr>
                <th>Request Reference No.</th>
                <th>Requested By</th>
                <th>Category</th>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: center;">Payment Method</th>
                <th>Payment Reference No.</th>
                <th style="text-align: center;">Payment Date</th>
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>${reimbursementRowsHtml}</tbody>
          </table>

          <div class="summary-box">
            <div style="font-size: 12px; font-weight: 800; color: #0B5D1E; margin-bottom: 6px;">
              TOTAL EXPENSES: ${formatPesoDisplay(totalExpenses)}
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase;">
              BREAKDOWN:
            </div>
            <div style="font-size: 10.5px; color: #0f172a; margin-top: 2px;">
              <b>PENDING:</b> ${formatPesoDisplay(totalPending)}
            </div>
            <div style="font-size: 10.5px; color: #0f172a; margin-top: 2px;">
              <b>PAID:</b> ${formatPesoDisplay(totalPaid)}
            </div>
          </div>
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

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/miller-finance/dashboard" },
          { label: "Payment History", path: "/miller-finance/payment-history" },
          { label: "Financial Report" },
        ]}
      />

      {/* ── Page Header Navigation & Title ─────────────────────────────────── */}
      <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/miller-finance/payment-history")}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Financial Report
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Document preview and official statement export.
            </p>
          </div>
        </div>
      </div>

      {/* ── Report Filters Bar (Status: All / Paid / Pending & Validated Date Range) ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        {/* Status Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown
            size={16}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>

        {/* Date Range: From Date <= To Date */}
        <div className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 h-[38px]">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer"
            title="From Date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer"
            title="To Date (Must be on or after From Date)"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-gray-400 hover:text-gray-600 ml-1 cursor-pointer"
              title="Clear Date Range"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {/* ── Scrollable Document Preview Sheet ──────────────────────────────── */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        {/* Centered Business Name, Address, Contact & Email Header */}
        <div className="text-center pb-4 border-b-2 border-[#0B5D1E]">
          <h1 className="text-xl sm:text-2xl font-black text-[#0B5D1E] tracking-tight">
            {businessName}
          </h1>
          <h2 className="text-xs sm:text-sm text-slate-500 font-medium mt-1 text-center whitespace-normal">
            {businessHeaderLine}
          </h2>
          <div className="mt-2.5 inline-flex items-center px-4 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold tracking-wider uppercase">
            Miller Financial Report
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 size={32} className="animate-spin text-emerald-700" />
            <p className="text-sm font-semibold text-slate-600">
              Generating financial report preview...
            </p>
          </div>
        ) : (
          <div className="space-y-8 mt-6">
            {/* ── SECTION 1: PROCUREMENT PAYABLES ────────────────────────── */}
            <div>
              <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                PROCUREMENT PAYABLES
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1250px]">
                  <thead>
                    <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <th className="px-3.5 py-3">Batch</th>
                      <th className="px-3.5 py-3">Variant</th>
                      <th className="px-3.5 py-3">Supplier</th>
                      <th className="px-3.5 py-3 text-right">Order Qty</th>
                      <th className="px-3.5 py-3">Receiving Ref</th>
                      <th className="px-3.5 py-3 text-right">Total Received</th>
                      <th className="px-3.5 py-3 text-right">Good</th>
                      <th className="px-3.5 py-3 text-right">Price/kg</th>
                      <th className="px-3.5 py-3 text-right">Payable</th>
                      <th className="px-3.5 py-3">Received By</th>
                      <th className="px-3.5 py-3 text-center">Status</th>
                      <th className="px-3.5 py-3 text-center">Payment Method</th>
                      <th className="px-3.5 py-3 text-center">Paid Date</th>
                      <th className="px-3.5 py-3">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td
                          colSpan={14}
                          className="px-3.5 py-6 text-center text-xs text-slate-400"
                        >
                          No procurement payable records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPayables.map((r, idx) => (
                        <tr
                          key={r.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                            {valueOrNa(r.batch_code)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.rice_variant)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.supplier_name)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {formatQtyKgOrNa(r.ordered_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[140px] max-w-[200px]">
                            {valueOrNa(r.receiving_reference_id)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {formatQtyKgOrNa(r.received_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {formatQtyKgOrNa(r.good_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {formatPesoDisplay(r.price_per_kg)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                            {formatPesoDisplay(r.total_payable_amount)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.received_by)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-800">
                            {valueOrNa(r.status)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.payment_method)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.paid_at)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {valueOrNa(r.paid_by)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION 2: EXPENSES ────────────────────────────────────── */}
            <div>
              <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                EXPENSES
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <th className="px-3.5 py-3">Setting Reference No.</th>
                      <th className="px-3.5 py-3">Set By</th>
                      <th className="px-3.5 py-3">Type</th>
                      <th className="px-3.5 py-3">Description</th>
                      <th className="px-3.5 py-3 text-right">Price</th>
                      <th className="px-3.5 py-3 text-center">Payment Method</th>
                      <th className="px-3.5 py-3">Payment Reference No.</th>
                      <th className="px-3.5 py-3 text-center">Payment Date</th>
                      <th className="px-3.5 py-3">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3.5 py-6 text-center text-xs text-slate-400"
                        >
                          No expense records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((r, idx) => (
                        <tr
                          key={r.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 break-all whitespace-normal font-mono text-[11px] min-w-[140px] max-w-[200px]">
                            {valueOrNa(r.setting_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.set_by)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.type)}
                          </td>
                          <td className="px-3.5 py-2.5 break-words whitespace-normal min-w-[180px] max-w-[320px]">
                            {valueOrNa(r.description)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                            {formatPesoDisplay(r.price)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.payment_method)}
                          </td>
                          <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[160px] max-w-[260px]">
                            {valueOrNa(r.payment_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.payment_date)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {valueOrNa(r.paid_by)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── SECTION 3: REIMBURSEMENT ───────────────────────────────── */}
            <div>
              <h3 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-[#0B5D1E] mb-3">
                REIMBURSEMENT
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[1100px]">
                  <thead>
                    <tr className="bg-[#EDEDED] text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-200">
                      <th className="px-3.5 py-3">Request Reference No.</th>
                      <th className="px-3.5 py-3">Requested By</th>
                      <th className="px-3.5 py-3">Category</th>
                      <th className="px-3.5 py-3">Type</th>
                      <th className="px-3.5 py-3">Description</th>
                      <th className="px-3.5 py-3 text-right">Price</th>
                      <th className="px-3.5 py-3 text-center">Payment Method</th>
                      <th className="px-3.5 py-3">Payment Reference No.</th>
                      <th className="px-3.5 py-3 text-center">Payment Date</th>
                      <th className="px-3.5 py-3">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                    {filteredReimbursements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-3.5 py-6 text-center text-xs text-slate-400"
                        >
                          No reimbursement records match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReimbursements.map((r, idx) => (
                        <tr
                          key={r.id || idx}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 break-all whitespace-normal font-mono text-[11px] min-w-[140px] max-w-[200px]">
                            {valueOrNa(r.request_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.requested_by)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.category)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            {valueOrNa(r.type)}
                          </td>
                          <td className="px-3.5 py-2.5 break-words whitespace-normal min-w-[180px] max-w-[320px]">
                            {valueOrNa(r.description)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                            {formatPesoDisplay(r.price)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.payment_method)}
                          </td>
                          <td className="px-3.5 py-2.5 break-all whitespace-normal font-mono text-[11px] text-slate-600 min-w-[160px] max-w-[260px]">
                            {valueOrNa(r.payment_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                            {valueOrNa(r.payment_date)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {valueOrNa(r.paid_by)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── BOTTOM SUMMARY: TOTAL EXPENSES & BREAKDOWN (PENDING, PAID) ── */}
            <div className="border-t-2 border-slate-200 bg-slate-50 rounded-xl p-5 flex flex-col items-end gap-2">
              <div className="flex items-center justify-end gap-4">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-700">
                  TOTAL EXPENSES:
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#0B5D1E] whitespace-nowrap">
                  ₱{" "}
                  {totalExpenses.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 mt-1 flex items-start justify-end gap-6 text-xs">
                <div className="flex flex-col items-end gap-1">
                  <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">
                    BREAKDOWN:
                  </span>
                  <span className="text-slate-500 font-semibold">PENDING:</span>
                  <span className="text-slate-500 font-semibold">PAID:</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="text-transparent text-[11px] uppercase tracking-wider select-none"
                    aria-hidden="true"
                  >
                    &nbsp;
                  </span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    ₱{" "}
                    {totalPending.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="font-bold text-slate-900 whitespace-nowrap">
                    ₱{" "}
                    {totalPaid.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Action Buttons Below Report Preview (Gray: Excel, Blue: PDF, Green: Print) ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 pb-6">
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={loading || totalRecordCount === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={16} />
          <span>Download Excel</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading || totalRecordCount === 0}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={16} />
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          disabled={loading || totalRecordCount === 0}
          className="px-4 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          <span>Print</span>
        </button>
      </div>
    </>
  );
}

