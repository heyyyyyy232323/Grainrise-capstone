import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

// Clean string and strip non-ASCII / problematic glyphs like ₱ or ± for jsPDF standard fonts
const sanitizePdfText = (val) => {
  if (val === null || val === undefined || val === "") return "N/A";
  let s = String(val).trim();
  s = s.replace(/[₱\u20B1±\u00B1]/g, "").trim();
  return s || "N/A";
};

// Formats currency as clean standard 'PHP X,XXX.XX'
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

export default function MillerPaymentHistoryReport() {
  const navigate = useNavigate();
  const { request } = useApi();

  const [records, setRecords] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({
    business_name: "GrainRise Miller",
    business_address: "Address Not Provided",
    business_contact: "Contact Not Provided",
    official_contact_number: "",
    official_email: "",
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'requested' | 'paid'

  // Calculate day after From date (so To date must strictly be later than From date)
  const getMinEndDate = useCallback((fromStr) => {
    if (!fromStr) return "";
    const [year, month, day] = fromStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate) {
      const minEnd = getMinEndDate(val);
      if (endDate < minEnd) {
        setEndDate("");
      }
    }
  };

  const handleEndDateChange = (val) => {
    if (!val) {
      setEndDate("");
      return;
    }
    if (startDate) {
      const minEnd = getMinEndDate(startDate);
      if (val < minEnd) {
        return;
      }
    }
    setEndDate(val);
  };

  // Fetch full dataset for report
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append("start_date", startDate);
      if (endDate) queryParams.append("end_date", endDate);
      if (supplierFilter !== "all") queryParams.append("supplier", supplierFilter);
      if (statusFilter !== "all") queryParams.append("status", statusFilter);

      const qs = queryParams.toString();
      const url = `/miller-employees/procurement/payment-history/${qs ? `?${qs}` : ""}`;

      const res = await request(url, {
        method: "GET",
        throwOnError: true,
      });

      const list = Array.isArray(res?.data) ? res.data : [];
      setRecords(list);

      if (Array.isArray(res?.suppliers)) {
        setSuppliersList(res.suppliers);
      }
      if (res?.business_info && typeof res.business_info === "object") {
        setBusinessInfo(res.business_info);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
    }
  }, [request, startDate, endDate, supplierFilter, statusFilter]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Client-side filtering ensures instant interactivity and consistency
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Status filter
      if (statusFilter === "requested") {
        if (r.is_paid || String(r.status || "").toLowerCase() === "paid") return false;
      } else if (statusFilter === "paid") {
        if (!r.is_paid && String(r.status || "").toLowerCase() !== "paid") return false;
      }

      // Supplier filter
      if (supplierFilter !== "all") {
        if (
          String(r.farmer_contact_id) !== String(supplierFilter) &&
          String(r.supplier) !== String(supplierFilter)
        ) {
          return false;
        }
      }

      // Date range filter
      if (startDate || endDate) {
        const rawDate = r.requested_at || r.received_at;
        if (rawDate) {
          const recDate = String(rawDate).split("T")[0].split(" ")[0];
          if (startDate && recDate < startDate) return false;
          if (endDate && recDate > endDate) return false;
        }
      }

      return true;
    });
  }, [records, statusFilter, supplierFilter, startDate, endDate]);

  // Total payable sum, paid sum, and unpaid sum across filtered records
  const { totalPayable, totalPaid, totalUnpaid } = useMemo(() => {
    let payable = 0;
    let paid = 0;
    let unpaid = 0;
    filteredRecords.forEach((r) => {
      const amt = Number(r.total_price) || 0;
      payable += amt;
      const isPaid = Boolean(
        r.is_paid || String(r.status || "").toLowerCase() === "paid"
      );
      if (isPaid) {
        paid += amt;
      } else {
        unpaid += amt;
      }
    });
    return { totalPayable: payable, totalPaid: paid, totalUnpaid: unpaid };
  }, [filteredRecords]);

  const businessName = businessInfo.business_name || "GrainRise Miller";
  const businessAddress = businessInfo.business_address || "Address Not Provided";
  const businessContact = businessInfo.business_contact || "";

  // Centered single horizontal line for address, contact number, and email
  const businessHeaderLine = useMemo(() => {
    const addr =
      businessAddress &&
      businessAddress !== "—" &&
      businessAddress !== "Address Not Provided"
        ? businessAddress
        : "";
    const phone = businessInfo.official_contact_number || "";
    const email = businessInfo.official_email || "";

    const parts = [];
    if (addr) parts.push(addr);
    if (phone) parts.push(phone);
    if (email) parts.push(email);

    if (parts.length > 0) {
      return parts.join(" • ");
    }
    return (
      [businessAddress, businessContact].filter(Boolean).join(" • ") ||
      "Address & Contact Not Provided"
    );
  }, [businessAddress, businessContact, businessInfo]);

  const exportFilename = `${businessName.replace(/[^\w.-]/g, "_")}_Procurement_Payable_Report`;

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
                <x:Name>Procurement Payable Report</x:Name>
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
          .metadata { font-size: 9pt; color: #64748b; text-align: center; font-style: italic; }
          table { border-collapse: collapse; width: 100%; margin-top: 15px; }
          th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; border: 1px solid #084b18; padding: 8px 6px; font-size: 10pt; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 6px; font-size: 9.5pt; color: #0f172a; }
          .num { text-align: right; }
          .center { text-align: center; }
          .total-row { background-color: #f1f5f9; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">${businessName}</div>
        <div class="header-subtitle">${businessHeaderLine}</div>
        <div class="report-heading">PROCUREMENT PAYABLE REPORT</div>
        <div class="metadata">Generated on: ${generatedDate}</div>
        <br/>
        <table border="1">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Variant</th>
              <th>Supplier</th>
              <th>Original Order Qty</th>
              <th>Receiving Reference</th>
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

    filteredRecords.forEach((r) => {
      const isPaid = r.is_paid || String(r.status || "").toLowerCase() === "paid";
      html += `
        <tr>
          <td>${r.batch_no || "N/A"}</td>
          <td>${r.variant || r.product_name || "N/A"}</td>
          <td>${r.supplier || "N/A"}</td>
          <td class="num">${r.original_order_quantity || `${r.ordered_quantity || 0} kg`}</td>
          <td>${r.receiving_reference_no || r.reference_no || "N/A"}</td>
          <td class="num">${r.total_received || "N/A"}</td>
          <td class="num">${r.received_good || "N/A"}</td>
          <td class="num">${r.price_per_kg || "N/A"}</td>
          <td class="num">${r.total_amount || `₱ ${Number(r.total_price || 0).toFixed(2)}`}</td>
          <td>${r.received_by || "Warehouse Staff"}</td>
          <td class="center">${isPaid ? "Paid" : "Requested"}</td>
          <td class="center">${isPaid ? (r.payment_method || "N/A") : "N/A"}</td>
          <td class="center">${isPaid ? (r.paid_date || r.paid_at_formatted || "N/A") : "N/A"}</td>
          <td>${isPaid ? (r.paid_by || "N/A") : "N/A"}</td>
        </tr>
      `;
    });

    html += `
          <tr class="total-row">
            <td colspan="8" style="text-align: right; font-weight: bold;">Total Payable:</td>
            <td class="num" style="font-weight: bold; color: #0B5D1E;">₱ ${totalPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td colspan="5"></td>
          </tr>
          <tr class="total-row" style="background-color: #f8fafc; font-size: 8.5pt;">
            <td colspan="8" style="text-align: right; vertical-align: top; color: #475569; line-height: 1.5;">
              <b>BREAKDOWN:</b><br/>
              Paid:<br/>
              Unpaid:
            </td>
            <td class="num" style="font-weight: bold; text-align: right; vertical-align: top; line-height: 1.5; white-space: nowrap;">
              &nbsp;<br/>
              ₱ ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br/>
              ₱ ${totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td colspan="5"></td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${exportFilename}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── 2. DOWNLOAD PDF (Landscape Multi-page jsPDF Table) ──────────────────────
  const handleDownloadPdf = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
    const margin = 7;
    const usableWidth = pageWidth - margin * 2; // 283mm
    let y = 12;

    const generatedDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const printHeader = (pageNum) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(11, 93, 30);
      doc.text(sanitizePdfText(businessName), pageWidth / 2, y, { align: "center" });
      y += 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(sanitizePdfText(businessHeaderLine), pageWidth / 2, y, { align: "center" });
      y += 4.5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("PROCUREMENT PAYABLE REPORT", pageWidth / 2, y, { align: "center" });
      y += 3.8;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Generated on: ${generatedDate} | Page ${pageNum}`,
        pageWidth / 2,
        y,
        { align: "center" }
      );
      y += 5;
    };

    let currentPage = 1;
    printHeader(currentPage);

    // Optimized Columns config spanning 283mm landscape width:
    // Batch, Receiving Ref, and Received By are allocated ample width so they never truncate
    const cols = [
      { header: "Batch", width: 26, key: "batch" },
      { header: "Variant", width: 20, key: "variant" },
      { header: "Supplier", width: 24, key: "supplier" },
      { header: "Order Qty", width: 15, key: "orderQty", align: "right" },
      { header: "Receiving Ref", width: 30, key: "ref" },
      { header: "Received", width: 15, key: "received", align: "right" },
      { header: "Good", width: 14, key: "good", align: "right" },
      { header: "Price/kg", width: 15, key: "price", align: "right" },
      { header: "Payable", width: 22, key: "payable", align: "right" },
      { header: "Received By", width: 28, key: "receivedBy" },
      { header: "Status", width: 14, key: "status", align: "center" },
      { header: "Method", width: 16, key: "method", align: "center" },
      { header: "Paid Date", width: 19, key: "paidDate", align: "center" },
      { header: "Paid By", width: 25, key: "paidBy" },
    ];

    const drawTableHeader = () => {
      doc.setFillColor(11, 93, 30);
      doc.rect(margin, y, usableWidth, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);

      let curX = margin;
      cols.forEach((col) => {
        const textX =
          col.align === "right"
            ? curX + col.width - 1.5
            : col.align === "center"
            ? curX + col.width / 2
            : curX + 1.5;
        doc.text(col.header, textX, y + 4.2, {
          align: col.align || "left",
        });
        curX += col.width;
      });
      y += 6;
    };

    drawTableHeader();

    const rowHeight = 5.2;
    filteredRecords.forEach((r, idx) => {
      if (y + rowHeight > pageHeight - 14) {
        doc.addPage();
        currentPage += 1;
        y = 12;
        printHeader(currentPage);
        drawTableHeader();
      }

      // Alternating background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, usableWidth, rowHeight, "F");
      }

      const isPaid = r.is_paid || String(r.status || "").toLowerCase() === "paid";
      const rowValues = [
        sanitizePdfText(r.batch_no),
        sanitizePdfText(r.variant || r.product_name),
        sanitizePdfText(r.supplier),
        sanitizePdfText(r.original_order_quantity || `${r.ordered_quantity || 0} kg`),
        sanitizePdfText(r.receiving_reference_no || r.reference_no),
        sanitizePdfText(r.total_received),
        sanitizePdfText(r.received_good),
        formatCurrencyForPdf(r.price_per_kg || r.price_per_kg_raw),
        formatCurrencyForPdf(r.total_amount || r.total_price),
        sanitizePdfText(r.received_by || "Warehouse Staff"),
        isPaid ? "Paid" : "Requested",
        isPaid ? sanitizePdfText(r.payment_method) : "N/A",
        isPaid ? sanitizePdfText(r.paid_date || r.paid_at_formatted) : "N/A",
        isPaid ? sanitizePdfText(r.paid_by) : "N/A",
      ];

      let curX = margin;
      rowValues.forEach((val, cIdx) => {
        const col = cols[cIdx];
        const textX =
          col.align === "right"
            ? curX + col.width - 1.5
            : col.align === "center"
            ? curX + col.width / 2
            : curX + 1.5;

        // Dynamic auto-scale font size if needed so values never truncate
        let fontSize = 5.8;
        doc.setFont("helvetica", cIdx === 8 ? "bold" : "normal");
        doc.setFontSize(fontSize);

        let displayVal = val;
        const maxW = col.width - 2;
        if (doc.getTextWidth(displayVal) > maxW) {
          fontSize = 5.2;
          doc.setFontSize(fontSize);
          if (doc.getTextWidth(displayVal) > maxW) {
            fontSize = 4.8;
            doc.setFontSize(fontSize);
            if (doc.getTextWidth(displayVal) > maxW) {
              while (doc.getTextWidth(displayVal + "...") > maxW && displayVal.length > 0) {
                displayVal = displayVal.slice(0, -1);
              }
              displayVal = displayVal + "...";
            }
          }
        }

        if (cIdx === 8) {
          // Payable
          doc.setTextColor(11, 93, 30);
        } else {
          doc.setTextColor(15, 23, 42);
        }

        doc.text(displayVal, textX, y + 3.7, {
          align: col.align || "left",
        });
        curX += col.width;
      });

      y += rowHeight;
    });

    // Total & Breakdown Box
    if (y + 11 > pageHeight - 12) {
      doc.addPage();
      currentPage += 1;
      y = 12;
      printHeader(currentPage);
      drawTableHeader();
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, usableWidth, 10, "F");

    // Line 1: Total Payable
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(11, 93, 30);
    doc.text(
      `Total Payable: ${formatCurrencyForPdf(totalPayable)}`,
      pageWidth - margin - 3,
      y + 4.2,
      { align: "right" }
    );

    // Line 2: Paid and Unpaid Breakdown
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Paid: ${formatCurrencyForPdf(totalPaid)}    |    Unpaid: ${formatCurrencyForPdf(totalUnpaid)}`,
      pageWidth - margin - 3,
      y + 8.2,
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

    let tableRowsHtml = "";
    filteredRecords.forEach((r, idx) => {
      const isPaid = r.is_paid || String(r.status || "").toLowerCase() === "paid";
      tableRowsHtml += `
        <tr style="background-color: ${idx % 2 === 1 ? "#f8fafc" : "#ffffff"};">
          <td>${r.batch_no || "N/A"}</td>
          <td>${r.variant || r.product_name || "N/A"}</td>
          <td>${r.supplier || "N/A"}</td>
          <td style="text-align: right;">${r.original_order_quantity || `${r.ordered_quantity || 0} kg`}</td>
          <td>${r.receiving_reference_no || r.reference_no || "N/A"}</td>
          <td style="text-align: right;">${r.total_received || "N/A"}</td>
          <td style="text-align: right;">${r.received_good || "N/A"}</td>
          <td style="text-align: right;">${r.price_per_kg || "N/A"}</td>
          <td style="text-align: right; font-weight: bold; color: #0B5D1E;">${r.total_amount || `₱ ${Number(r.total_price || 0).toFixed(2)}`}</td>
          <td>${r.received_by || "Warehouse Staff"}</td>
          <td style="text-align: center; color: #0f172a;">${isPaid ? "Paid" : "Requested"}</td>
          <td style="text-align: center;">${isPaid ? (r.payment_method || "N/A") : "N/A"}</td>
          <td style="text-align: center;">${isPaid ? (r.paid_date || r.paid_at_formatted || "N/A") : "N/A"}</td>
          <td>${isPaid ? (r.paid_by || "N/A") : "N/A"}</td>
        </tr>
      `;
    });

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${exportFilename}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 20px; color: #0f172a; line-height: 1.4; font-size: 11px; }
            .header { text-align: center; border-bottom: 2px solid #0B5D1E; padding-bottom: 12px; margin-bottom: 14px; }
            .header h1 { font-size: 20px; font-weight: 800; color: #0B5D1E; margin-bottom: 4px; }
            .header h2 { font-size: 11px; font-weight: 500; color: #64748b; }
            .report-title { text-align: center; font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; }
            .metadata { text-align: center; font-size: 10px; color: #94a3b8; margin-bottom: 14px; font-style: italic; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background-color: #0B5D1E; color: #ffffff; font-weight: bold; text-align: left; padding: 6px 4px; border: 1px solid #084b18; }
            td { padding: 5px 4px; border: 1px solid #e2e8f0; }
            .total-row td { background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1; }
            .breakdown-row td { background-color: #f8fafc; font-size: 9.5px; border-top: 1px solid #e2e8f0; }
            @page { size: landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${businessName}</h1>
            <h2>${businessHeaderLine}</h2>
          </div>
          <div class="report-title">PROCUREMENT PAYABLE REPORT</div>
          <div class="metadata">Generated on: ${generatedDate}</div>
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Variant</th>
                <th>Supplier</th>
                <th style="text-align: right;">Order Qty</th>
                <th>Receiving Ref</th>
                <th style="text-align: right;">Received</th>
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
            <tbody>
              ${tableRowsHtml}
              <tr class="total-row">
                <td colspan="8" style="text-align: right; font-weight: bold;">Total Payable:</td>
                <td style="text-align: right; font-weight: bold; color: #0B5D1E;">₱ ${totalPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colspan="5"></td>
              </tr>
              <tr class="breakdown-row" style="background-color: #f8fafc; font-size: 10px;">
                <td colspan="8" style="text-align: right; vertical-align: top; padding: 6px 8px; line-height: 1.6;">
                  <div style="font-weight: bold; color: #475569; font-size: 10px; text-transform: uppercase;">Breakdown:</div>
                  <div style="color: #64748b; font-weight: 500;">Paid:</div>
                  <div style="color: #64748b; font-weight: 500;">Unpaid:</div>
                </td>
                <td style="text-align: right; vertical-align: top; padding: 6px 8px; line-height: 1.6; white-space: nowrap;">
                  <div style="font-size: 10px; text-transform: uppercase; visibility: hidden;">&nbsp;</div>
                  <div style="font-weight: bold; color: #0f172a;">₱ ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style="font-weight: bold; color: #0f172a;">₱ ${totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </td>
                <td colspan="5" style="padding: 6px 8px;"></td>
              </tr>
            </tbody>
          </table>
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
          { label: "Payment", path: "/miller-procurement/payment-history" },
          { label: "Payment History", path: "/miller-procurement/payment-history" },
          { label: "Payment History Report" },
        ]}
      />

      {/* ── Page Header Navigation & Title ─────────────────────────────────── */}
      <div className="mt-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/miller-procurement/payment-history")}
            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
              Payment History Report
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Document preview and official statement export.
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters Bar (Matching other Procurement modules) ───────────────── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        {/* Date Range: Start Date & End Date */}
        <div className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 h-[38px]">
          <Calendar size={15} className="text-gray-400 shrink-0" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer"
            title="From Date"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            min={startDate ? getMinEndDate(startDate) : undefined}
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="To Date (Must be later than From date)"
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

        {/* Supplier Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
          >
            <option value="all">All Suppliers</option>
            {suppliersList.map((sup) => (
              <option key={sup.id || sup.name} value={sup.id || sup.name}>
                {sup.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto"
          >
            <option value="all">All Status</option>
            <option value="requested">Requested to Pay</option>
            <option value="paid">Paid</option>
          </select>
          <ChevronDown
            size={16}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>
      </div>

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
            Procurement Payable Report
          </div>
        </div>

        {/* Table Container (Horizontal scroll for 14 columns) */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Loader2 size={32} className="animate-spin text-emerald-700" />
            <p className="text-sm font-semibold text-slate-600">Generating report preview...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <p className="text-sm font-semibold text-slate-700">No payment records match criteria</p>
            <p className="text-xs text-slate-400">Try adjusting your filters above to view report data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
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
                {filteredRecords.map((r, idx) => {
                  const isPaid = r.is_paid || String(r.status || "").toLowerCase() === "paid";
                  return (
                    <tr key={r.receiving_id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {r.batch_no || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {r.variant || r.product_name || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {r.supplier || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {r.original_order_quantity || `${r.ordered_quantity || 0} kg`}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {r.receiving_reference_no || r.reference_no || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {r.total_received || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {r.received_good || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        {r.price_per_kg || "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-bold text-[#0B5D1E]">
                        {r.total_amount || `₱ ${Number(r.total_price || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {r.received_by || "Warehouse Staff"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-800">
                        {isPaid ? "Paid" : "Requested"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                        {isPaid ? (r.payment_method || "N/A") : "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap text-slate-600">
                        {isPaid ? (r.paid_date || r.paid_at_formatted || "N/A") : "N/A"}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                        {isPaid ? (r.paid_by || "N/A") : "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {/* Line 1: Total Payable on one line */}
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs">
                  <td colSpan={8} className="px-3.5 py-3 text-right uppercase text-slate-700 tracking-wider">
                    Total Payable Amount:
                  </td>
                  <td className="px-3.5 py-3 text-right text-sm font-extrabold text-[#0B5D1E] whitespace-nowrap">
                    ₱ {totalPayable.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={5} className="px-3.5 py-3" />
                </tr>
                {/* Line 2: Breakdown, Paid, and Unpaid labels in ONE table cell, amounts in adjacent cell */}
                <tr className="bg-slate-50/70 border-t border-slate-200 text-xs">
                  <td colSpan={8} className="px-3.5 py-3 text-right align-top">
                    <div className="flex flex-col items-end gap-1.5 text-xs">
                      <span className="font-bold text-slate-600 text-[11px] uppercase tracking-wider leading-5">
                        Breakdown:
                      </span>
                      <span className="text-slate-500 font-medium text-xs leading-5">
                        Paid:
                      </span>
                      <span className="text-slate-500 font-medium text-xs leading-5">
                        Unpaid:
                      </span>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 whitespace-nowrap text-right align-top">
                    <div className="flex flex-col items-end gap-1.5 text-xs text-right">
                      <span className="text-transparent text-[11px] uppercase tracking-wider leading-5 select-none" aria-hidden="true">
                        &nbsp;
                      </span>
                      <span className="font-bold text-slate-900 text-xs leading-5 whitespace-nowrap">
                        ₱ {totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="font-bold text-slate-900 text-xs leading-5 whitespace-nowrap">
                        ₱ {totalUnpaid.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  <td colSpan={5} className="px-3.5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── Action Buttons Below Report Preview (Gray: Excel, Blue: PDF, Green: Print) ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 pb-6">
        {/* Gray: Download Excel */}
        <button
          type="button"
          onClick={handleDownloadExcel}
          disabled={loading || filteredRecords.length === 0}
          className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={16} />
          <span>Download Excel</span>
        </button>

        {/* Blue: Download PDF */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading || filteredRecords.length === 0}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={16} />
          <span>Download PDF</span>
        </button>

        {/* Green: Print */}
        <button
          type="button"
          onClick={handlePrint}
          disabled={loading || filteredRecords.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size={16} />
          <span>Print</span>
        </button>
      </div>
    </>
  );
}
