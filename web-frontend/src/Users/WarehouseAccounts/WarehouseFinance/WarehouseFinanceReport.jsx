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

export default function WarehouseFinanceReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const { request } = useApi();

  const [payables, setPayables] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "GrainRise Warehouse",
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
        "/warehouse/finance/payment-history/reports/",
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
      setError(err?.message || "Failed to load warehouse financial report data.");
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
        const rowDate = row.date_iso;
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

  // Dynamic Summary calculations based on current filter results
  const { totalExpenses, totalPaid, totalPending } = useMemo(() => {
    let paidSum = 0;
    let pendingSum = 0;

    filteredPayables.forEach((r) => {
      const amt = Number(r.total_payable_amount) || 0;
      if (r.is_paid) paidSum += amt;
      else pendingSum += amt;
    });

    filteredExpenses.forEach((r) => {
      const amt = Number(r.price) || 0;
      if (r.is_paid) paidSum += amt;
      else pendingSum += amt;
    });

    filteredReimbursements.forEach((r) => {
      const amt = Number(r.price) || 0;
      if (r.is_paid) {
        if (!r.is_sandbox) paidSum += amt;
      } else {
        pendingSum += amt;
      }
    });

    return {
      totalExpenses: paidSum + pendingSum,
      totalPaid: paidSum,
      totalPending: pendingSum,
    };
  }, [filteredPayables, filteredExpenses, filteredReimbursements]);

  const totalRecordCount =
    filteredPayables.length +
    filteredExpenses.length +
    filteredReimbursements.length;

  const businessName = (businessInfo?.business_name || "").trim() || "GrainRise Warehouse";
  const businessAddress = (businessInfo?.business_address || "").trim() || "N/A";
  const businessContact = (businessInfo?.business_contact || "").trim() || "N/A";
  const businessEmail = (businessInfo?.business_email || "").trim() || "N/A";

  const businessHeaderLine = useMemo(() => {
    const parts = [];
    if (businessAddress && businessAddress !== "N/A") parts.push(businessAddress);
    const comms = [];
    if (businessContact && businessContact !== "N/A") comms.push(businessContact);
    if (businessEmail && businessEmail !== "N/A") comms.push(businessEmail);
    if (comms.length > 0) parts.push(comms.join(" • "));
    return parts.join(" • ") || "Philippine Agricultural Grain & Warehouse Network";
  }, [businessAddress, businessContact, businessEmail]);

  const exportFilename = `${(businessName !== "N/A"
    ? businessName
    : "Warehouse_Finance"
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
          .text-ref { mso-number-format: "\\@"; word-break: break-all; white-space: normal; }
          .text-desc { word-wrap: break-word; white-space: normal; }
          .summary-box { background-color: #f8fafc; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">${businessName}</div>
        <div class="header-subtitle">${businessHeaderLine}</div>
        <div class="report-heading">WAREHOUSE FINANCIAL REPORT</div>
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
              <th>Payment Ref</th>
              <th>Paid At</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredPayables.length === 0) {
      html += `<tr><td colspan="15" class="center" style="color: #64748b; font-style: italic;">No procurement payables found matching current filters.</td></tr>`;
    } else {
      filteredPayables.forEach((r) => {
        html += `
          <tr>
            <td class="text-ref">${valueOrNa(r.batch_code)}</td>
            <td>${valueOrNa(r.rice_variant)}</td>
            <td>${valueOrNa(r.supplier_name)}</td>
            <td class="num">${formatQtyKgOrNa(r.ordered_quantity)}</td>
            <td class="text-ref">${valueOrNa(r.receiving_reference_id)}</td>
            <td class="num">${formatQtyKgOrNa(r.received_quantity)}</td>
            <td class="num">${formatQtyKgOrNa(r.good_quantity)}</td>
            <td class="num">${formatPesoDisplay(r.price_per_kg)}</td>
            <td class="num" style="font-weight: bold;">${formatPesoDisplay(r.total_payable_amount)}</td>
            <td>${valueOrNa(r.received_by)}</td>
            <td class="center" style="font-weight: bold; color: ${r.is_paid ? "#0B5D1E" : "#d97706"};">${r.status || "Pending"}</td>
            <td>${valueOrNa(r.payment_method)}</td>
            <td class="text-ref">${valueOrNa(r.payment_reference_id)}</td>
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
              <th>Setting Ref</th>
              <th>Set By</th>
              <th>Type</th>
              <th>Description</th>
              <th>Price</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Payment Ref</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredExpenses.length === 0) {
      html += `<tr><td colspan="10" class="center" style="color: #64748b; font-style: italic;">No expenses found matching current filters.</td></tr>`;
    } else {
      filteredExpenses.forEach((r) => {
        html += `
          <tr>
            <td class="text-ref">${valueOrNa(r.setting_reference_no)}</td>
            <td>${valueOrNa(r.set_by)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold;">${formatPesoDisplay(r.price)}</td>
            <td class="center" style="font-weight: bold; color: ${r.is_paid ? "#0B5D1E" : "#d97706"};">${r.status || "Pending"}</td>
            <td>${valueOrNa(r.payment_method)}</td>
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
              <th>Request Ref</th>
              <th>Requested By</th>
              <th>Category</th>
              <th>Type / Title</th>
              <th>Description</th>
              <th>Price</th>
              <th>Status</th>
              <th>Payment Method</th>
              <th>Payment Ref</th>
              <th>Payment Date</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (filteredReimbursements.length === 0) {
      html += `<tr><td colspan="11" class="center" style="color: #64748b; font-style: italic;">No reimbursements found matching current filters.</td></tr>`;
    } else {
      filteredReimbursements.forEach((r) => {
        html += `
          <tr>
            <td class="text-ref">${valueOrNa(r.request_reference_no)}</td>
            <td>${valueOrNa(r.requested_by)}</td>
            <td>${valueOrNa(r.category)}</td>
            <td>${valueOrNa(r.type)}</td>
            <td class="text-desc">${valueOrNa(r.description)}</td>
            <td class="num" style="font-weight: bold;">${formatPesoDisplay(r.price)}</td>
            <td class="center" style="font-weight: bold; color: ${r.is_paid ? "#0B5D1E" : "#d97706"};">${r.status || "Pending"}</td>
            <td>${valueOrNa(r.payment_method)}</td>
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

        <br/>
        <table border="1" style="width: 380px; margin-left: auto; margin-right: 0;">
          <tr class="summary-box">
            <td style="font-weight: bold; padding: 8px;">TOTAL EXPENSES:</td>
            <td class="num" style="font-size: 11pt; color: #0B5D1E; font-weight: bold; padding: 8px;">${formatPesoDisplay(totalExpenses)}</td>
          </tr>
          <tr>
            <td style="padding: 6px; color: #555555;">BREAKDOWN - PENDING:</td>
            <td class="num" style="padding: 6px; font-weight: bold;">${formatPesoDisplay(totalPending)}</td>
          </tr>
          <tr>
            <td style="padding: 6px; color: #555555;">BREAKDOWN - PAID:</td>
            <td class="num" style="padding: 6px; font-weight: bold;">${formatPesoDisplay(totalPaid)}</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── 2. DOWNLOAD PDF (jsPDF Landscape with dynamic wrapping & page breaks) ─────
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pageWidth - margin * 2;
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
      doc.text("WAREHOUSE FINANCIAL REPORT", pageWidth / 2, y, {
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

      rowsData.forEach((rowItem, rIdx) => {
        const cells = buildRowCells(rowItem);

        // Pre-calculate line wrapping for text cells to prevent truncation
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        let maxLines = 1;
        const cellSplits = cells.map((cellText, cIdx) => {
          const colDef = cols[cIdx];
          const textStr = sanitizePdfText(cellText);
          const lines = doc.splitTextToSize(textStr, colDef.width - 2);
          if (lines.length > maxLines) maxLines = lines.length;
          return lines;
        });

        const calculatedRowH = Math.max(rowHeight, maxLines * 3 + 2.5);

        if (y + calculatedRowH > pageHeight - 12) {
          doc.addPage();
          currentPage += 1;
          y = 12;
          printDocumentHeader(currentPage);
          drawHeaderRow();
        }

        // Alternating row background
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, usableWidth, calculatedRowH, "F");
        }

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.15);
        doc.line(margin, y + calculatedRowH, margin + usableWidth, y + calculatedRowH);

        let cellX = margin;
        cols.forEach((colDef, cIdx) => {
          const lines = cellSplits[cIdx];
          const isStatus = colDef.key === "status";
          const isPaid = rowItem.is_paid;

          if (isStatus) {
            doc.setFont("helvetica", "bold");
            if (isPaid) doc.setTextColor(11, 93, 30);
            else doc.setTextColor(217, 119, 6);
          } else {
            doc.setFont("helvetica", colDef.isBold ? "bold" : "normal");
            doc.setTextColor(15, 23, 42);
          }

          const printX =
            colDef.align === "right"
              ? cellX + colDef.width - 1.5
              : colDef.align === "center"
              ? cellX + colDef.width / 2
              : cellX + 1.5;

          lines.forEach((lineText, lineIdx) => {
            doc.text(lineText, printX, y + 3.4 + lineIdx * 3, {
              align: colDef.align || "left",
            });
          });

          cellX += colDef.width;
        });

        y += calculatedRowH;
      });

      y += 6;
    };

    // Initialize Page 1
    printDocumentHeader(currentPage);

    // ── Table 1: Procurement Payables ──
    const payablesCols = [
      { key: "batch_code", label: "Batch", width: 20 },
      { key: "rice_variant", label: "Variant", width: 22 },
      { key: "supplier_name", label: "Supplier", width: 24 },
      { key: "ordered_quantity", label: "Order Qty", width: 15, align: "right" },
      { key: "receiving_reference_id", label: "Receiving Ref", width: 22 },
      { key: "received_quantity", label: "Total Rec", width: 15, align: "right" },
      { key: "good_quantity", label: "Good", width: 14, align: "right" },
      { key: "price_per_kg", label: "Price/kg", width: 16, align: "right" },
      { key: "total_payable_amount", label: "Payable", width: 18, align: "right", isBold: true },
      { key: "received_by", label: "Received By", width: 18 },
      { key: "status", label: "Status", width: 13, align: "center" },
      { key: "payment_method", label: "Method", width: 16 },
      { key: "payment_reference_id", label: "Payment Ref", width: 26 },
      { key: "paid_at", label: "Paid At", width: 18, align: "center" },
      { key: "paid_by", label: "Paid By", width: 20 },
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
        formatCurrencyForPdf(r.price_per_kg),
        formatCurrencyForPdf(r.total_payable_amount),
        valueOrNa(r.received_by),
        r.status || "Pending",
        valueOrNa(r.payment_method),
        valueOrNa(r.payment_reference_id),
        valueOrNa(r.paid_at),
        valueOrNa(r.paid_by),
      ]
    );

    // ── Table 2: Expenses ──
    const expensesCols = [
      { key: "setting_reference_no", label: "Setting Ref No.", width: 28 },
      { key: "set_by", label: "Set By", width: 26 },
      { key: "type", label: "Type", width: 26 },
      { key: "description", label: "Description", width: 44 },
      { key: "price", label: "Price", width: 22, align: "right", isBold: true },
      { key: "status", label: "Status", width: 16, align: "center" },
      { key: "payment_method", label: "Payment Method", width: 24 },
      { key: "payment_reference_no", label: "Payment Reference No.", width: 35 },
      { key: "payment_date", label: "Payment Date", width: 26, align: "center" },
      { key: "paid_by", label: "Paid By", width: 30 },
    ];

    drawSectionTable("EXPENSES", expensesCols, filteredExpenses, (r) => [
      valueOrNa(r.setting_reference_no),
      valueOrNa(r.set_by),
      valueOrNa(r.type),
      valueOrNa(r.description),
      formatCurrencyForPdf(r.price),
      r.status || "Pending",
      valueOrNa(r.payment_method),
      valueOrNa(r.payment_reference_no),
      valueOrNa(r.payment_date),
      valueOrNa(r.paid_by),
    ]);

    // ── Table 3: Reimbursement ──
    const reimbCols = [
      { key: "request_reference_no", label: "Request Ref No.", width: 26 },
      { key: "requested_by", label: "Requested By", width: 26 },
      { key: "category", label: "Category", width: 24 },
      { key: "type", label: "Type / Title", width: 26 },
      { key: "description", label: "Description", width: 40 },
      { key: "price", label: "Price", width: 20, align: "right", isBold: true },
      { key: "status", label: "Status", width: 15, align: "center" },
      { key: "payment_method", label: "Payment Method", width: 24 },
      { key: "payment_reference_no", label: "Payment Reference No.", width: 33 },
      { key: "payment_date", label: "Payment Date", width: 21, align: "center" },
      { key: "paid_by", label: "Paid By", width: 22 },
    ];

    drawSectionTable(
      "REIMBURSEMENT",
      reimbCols,
      filteredReimbursements,
      (r) => [
        valueOrNa(r.request_reference_no),
        valueOrNa(r.requested_by),
        valueOrNa(r.category),
        valueOrNa(r.type),
        valueOrNa(r.description),
        formatCurrencyForPdf(r.price),
        r.status || "Pending",
        valueOrNa(r.payment_method),
        valueOrNa(r.payment_reference_no),
        valueOrNa(r.payment_date),
        valueOrNa(r.paid_by),
      ]
    );

    // ── Bottom Summary Box ──
    ensureSpace(26);
    y += 2;
    const summaryBoxW = 105;
    const summaryBoxX = pageWidth - margin - summaryBoxW;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(summaryBoxX, y, summaryBoxW, 22, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("TOTAL EXPENSES:", summaryBoxX + 4, y + 6);
    doc.setTextColor(11, 93, 30);
    doc.setFontSize(9);
    doc.text(
      formatCurrencyForPdf(totalExpenses),
      summaryBoxX + summaryBoxW - 4,
      y + 6,
      { align: "right" }
    );

    doc.setDrawColor(226, 232, 240);
    doc.line(summaryBoxX + 4, y + 8.5, summaryBoxX + summaryBoxW - 4, y + 8.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("BREAKDOWN - PENDING:", summaryBoxX + 4, y + 13.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      formatCurrencyForPdf(totalPending),
      summaryBoxX + summaryBoxW - 4,
      y + 13.5,
      { align: "right" }
    );

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("BREAKDOWN - PAID:", summaryBoxX + 4, y + 18.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(
      formatCurrencyForPdf(totalPaid),
      summaryBoxX + summaryBoxW - 4,
      y + 18.5,
      { align: "right" }
    );

    doc.save(`${exportFilename}.pdf`);
  };

  // ── 3. PRINT REPORT ─────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* ── Screen-only controls: Breadcrumbs, Title, Return link ── */}
      <div className="print:hidden">
        <Breadcrumbs
          items={[
            { label: "Finance", path: "/warehouse-finance/dashboard" },
            { label: "Payment History", path: "/warehouse-finance/payment-history" },
            { label: "Financial Reports" },
          ]}
        />

        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 mb-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/warehouse-finance/payment-history")}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Back to Payment History"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Generate Financial Reports
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive overview of all paid and pending Warehouse transactions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={loading || totalRecordCount === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={15} />
              <span>Download Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || totalRecordCount === 0}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDown size={15} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || totalRecordCount === 0}
              className="px-3.5 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ── Report Filter Controls (Status: All/Paid/Pending & Validated Date Range) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-2xs flex flex-wrap items-center gap-4">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Status:
            </span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-xs rounded-xl px-3.5 py-2 pr-8 hover:bg-slate-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0B5D1E]/20"
              >
                <option value="all">All Records</option>
                <option value="paid">Paid Only</option>
                <option value="pending">Pending Only</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Validated Date Range Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold uppercase tracking-wider">
              <Calendar size={14} className="text-slate-400" />
              <span>Date Range:</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B5D1E]/20 cursor-pointer"
                title="From Date"
              />
              <span className="text-xs text-slate-400 font-medium">to</span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0B5D1E]/20 cursor-pointer"
                title="To Date"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Clear Date Range"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Active Record Counter */}
          <div className="ml-auto text-xs font-semibold text-slate-500">
            Showing{" "}
            <span className="text-slate-900 font-bold">{totalRecordCount}</span>{" "}
            records
          </div>
        </div>
      </div>

      {/* ── PRINT & PREVIEW CONTAINER ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 md:p-8 print:border-none print:shadow-none print:p-0">
        {/* Business Header */}
        <div className="text-center pb-5 mb-6 border-b border-slate-200">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B5D1E] tracking-tight">
            {businessName}
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {businessHeaderLine}
          </p>
          <div className="inline-block mt-3 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">
              WAREHOUSE FINANCIAL REPORT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 italic mt-2">
            Generated on:{" "}
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-[#0B5D1E]" />
            <p className="text-xs font-medium">
              Generating warehouse financial report data...
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── SECTION 1 — PROCUREMENT PAYABLES ── */}
            <div>
              <div className="text-center mb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0B5D1E] inline-block pb-1 border-b-2 border-[#0B5D1E]">
                  PROCUREMENT PAYABLES
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B5D1E] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="px-3.5 py-3 whitespace-nowrap">Batch</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Variant</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Supplier</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Order Qty
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Receiving Ref</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Total Rec
                      </th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">Good</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Price/kg
                      </th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Payable
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Received By</th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Method</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Payment Ref</th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Paid At
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayables.length === 0 ? (
                      <tr>
                        <td
                          colSpan={15}
                          className="px-4 py-8 text-center text-slate-400 italic font-medium"
                        >
                          No procurement payables found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredPayables.map((r, i) => (
                        <tr
                          key={r.id || i}
                          className={i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                        >
                          <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                            {valueOrNa(r.batch_code)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {valueOrNa(r.rice_variant)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {valueOrNa(r.supplier_name)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatQtyKgOrNa(r.ordered_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {valueOrNa(r.receiving_reference_id)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatQtyKgOrNa(r.received_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatQtyKgOrNa(r.good_quantity)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                            {formatPesoDisplay(r.price_per_kg)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatPesoDisplay(r.total_payable_amount)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                            {valueOrNa(r.received_by)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                r.is_paid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                            {valueOrNa(r.payment_method)}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600 break-all whitespace-normal min-w-[120px] max-w-[200px]">
                            {valueOrNa(r.payment_reference_id)}
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

            {/* ── SECTION 2 — EXPENSES ── */}
            <div>
              <div className="text-center mb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0B5D1E] inline-block pb-1 border-b-2 border-[#0B5D1E]">
                  EXPENSES
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B5D1E] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Setting Ref No.
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Set By</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Type</th>
                      <th className="px-3.5 py-3">Description</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Payment Method
                      </th>
                      <th className="px-3.5 py-3">Payment Reference No.</th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Payment Date
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-4 py-8 text-center text-slate-400 italic font-medium"
                        >
                          No expenses found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((r, i) => (
                        <tr
                          key={r.id || i}
                          className={i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                        >
                          <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                            {valueOrNa(r.setting_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {valueOrNa(r.set_by)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {valueOrNa(r.type)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 break-words whitespace-normal min-w-[180px] max-w-[280px]">
                            {valueOrNa(r.description)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatPesoDisplay(r.price)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                r.is_paid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
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

            {/* ── SECTION 3 — REIMBURSEMENT ── */}
            <div>
              <div className="text-center mb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#0B5D1E] inline-block pb-1 border-b-2 border-[#0B5D1E]">
                  REIMBURSEMENT
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B5D1E] text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Request Ref No.
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Requested By
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Category</th>
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Type / Title
                      </th>
                      <th className="px-3.5 py-3">Description</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap">
                        Price
                      </th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Status
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">
                        Payment Method
                      </th>
                      <th className="px-3.5 py-3">Payment Reference No.</th>
                      <th className="px-3.5 py-3 text-center whitespace-nowrap">
                        Payment Date
                      </th>
                      <th className="px-3.5 py-3 whitespace-nowrap">Paid By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReimbursements.length === 0 ? (
                      <tr>
                        <td
                          colSpan={11}
                          className="px-4 py-8 text-center text-slate-400 italic font-medium"
                        >
                          No reimbursements found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredReimbursements.map((r, i) => (
                        <tr
                          key={r.id || i}
                          className={i % 2 === 1 ? "bg-slate-50/60" : "bg-white"}
                        >
                          <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-slate-900 whitespace-nowrap">
                            {valueOrNa(r.request_reference_no)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">
                            {valueOrNa(r.requested_by)}
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-semibold text-[11px]">
                              {valueOrNa(r.category)}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                            {valueOrNa(r.type)}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 break-words whitespace-normal min-w-[180px] max-w-[280px]">
                            {valueOrNa(r.description)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatPesoDisplay(r.price)}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                r.is_paid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.status || "Pending"}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
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
