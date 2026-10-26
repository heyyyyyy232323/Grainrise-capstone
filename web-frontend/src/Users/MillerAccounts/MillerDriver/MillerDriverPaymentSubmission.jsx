import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, RefreshCw } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Toast from "../../../Components/Minor-Components/Toast";
import useToast from "../../../Components/hooks/useToast";
import DriverSubmitPaymentModal from "../../../Components/Modals/MillerDriver/DriverSubmitPaymentModal";
import DriverPOSReceiptModal from "../../../Components/Modals/MillerDriver/DriverPOSReceiptModal";

const API_BASE = "http://127.0.0.1:8000";

const getAuthToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    sessionStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};

const METHOD_BADGE = {
  Cash: "bg-amber-100 text-amber-800 border border-amber-300/70",
  "Cash on Delivery": "bg-amber-100 text-amber-800 border border-amber-300/70",
  GCash: "bg-blue-100 text-blue-700 border border-blue-200",
  Bank: "bg-purple-100 text-purple-700 border border-purple-200",
  "Online Payment": "bg-blue-100 text-blue-700 border border-blue-200",
};

const STATUS_BADGE = {
  Handled: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
  Submitted: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold",
  Paid: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold",
  Pending: "bg-amber-100 text-amber-900 border border-amber-300 font-bold",
};

const PAYMENT_METHOD_OPTIONS = [
  { label: "Payment Method", value: "" },
  { label: "Cash on Delivery", value: "Cash" },
  { label: "GCash", value: "GCash" },
  { label: "Bank Transfer", value: "Bank" },
];

const STATUS_OPTIONS = [
  { label: "Payment Status", value: "" },
  { label: "Handled", value: "Handled" },
  { label: "Submitted", value: "Submitted" },
];

function CustomDropdown({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption && selectedOption.value !== "" ? selectedOption.label : label;
  const isSelected = value && value !== "" && value !== "all";

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
          isSelected ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
        }`}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                value === opt.value
                  ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function buildPaymentSections(submissions) {
  if (!submissions || submissions.length === 0) return [];

  // 1. Group by handled_at date
  const dateBuckets = {};
  submissions.forEach((item) => {
    const rawDate = item.handled_at || item.date;
    const d = rawDate ? new Date(rawDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    const dMid = new Date(d);
    dMid.setHours(0, 0, 0, 0);

    let label;
    if (dMid.getTime() === today.getTime()) label = "Today";
    else if (dMid.getTime() === yest.getTime()) label = "Yesterday";
    else {
      label = d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

    if (!dateBuckets[label]) dateBuckets[label] = [];
    dateBuckets[label].push(item);
  });

  const sections = [];

  // 2. In each date bucket, cluster consecutive rows by cod_transaction_key
  Object.entries(dateBuckets).forEach(([dateLabel, rows]) => {
    const clusters = [];
    let currentCluster = [];

    rows.forEach((row) => {
      if (currentCluster.length === 0) {
        currentCluster.push(row);
      } else {
        const lastInCluster = currentCluster[currentCluster.length - 1];
        if (lastInCluster.cod_transaction_key === row.cod_transaction_key) {
          currentCluster.push(row);
        } else {
          clusters.push(currentCluster);
          currentCluster = [row];
        }
      }
    });
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // 3. Convert clusters into sections
    let shownDateHeaderForSingle = false;
    clusters.forEach((cluster) => {
      const isMultiOrder = cluster.length > 1;

      // Tag items for single action button and group layout
      const taggedRows = cluster.map((item, idx) => ({
        ...item,
        isLastInGroup: idx === cluster.length - 1,
        isGroupMember: isMultiOrder,
        groupOrderCount: cluster.length,
        groupOrderIndex: idx,
      }));

      if (isMultiOrder) {
        // Multi-order group gets its own dedicated divider without double-stacking date header
        sections.push({
          label: "These Orders Belong to the Same Payment Transaction",
          className:
            "bg-[#F0FDF4] border-y border-emerald-200/80 px-4 py-2 text-center text-[11px] font-bold tracking-wide uppercase text-emerald-800",
          rows: taggedRows,
        });
      } else {
        // Standalone orders get the Date divider (e.g. Yesterday, Today)
        const label = !shownDateHeaderForSingle ? dateLabel : "";
        shownDateHeaderForSingle = true;
        sections.push({
          label,
          className:
            "bg-[#F0FDF4] border-y border-emerald-100/70 px-4 py-1.5 text-center text-[12px] font-semibold text-emerald-700",
          rows: taggedRows,
        });
      }
    });
  });

  return sections;
}

export default function MillerDriverPaymentSubmission() {
  const { toasts, showToast, removeToast } = useToast();

  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  // Modal States
  const [selectedSubmissionForSubmit, setSelectedSubmissionForSubmit] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // ── 1. Fetch Payment Submissions from Server ──────────────────────────────
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (query.trim()) params.append("search", query.trim());
      if (method) params.append("payment_method", method);
      if (status) params.append("status", status);
      if (dateRange.startDate) params.append("start_date", dateRange.startDate);
      if (dateRange.endDate) params.append("end_date", dateRange.endDate);

      const res = await fetch(`${API_BASE}/api/miller-employees/driver/payments/submissions/?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load payment submissions.");
      }

      setSubmissions(data.submissions || []);
    } catch (err) {
      showToast({
        type: "error",
        title: "Load Error",
        message: err.message || "Could not retrieve payment submissions.",
      });
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [query, method, status, dateRange, showToast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // ── 2. Date Range Validation ─────────────────────────────────────────────
  const handleDateChange = (range) => {
    if (range.startDate && range.endDate && range.startDate > range.endDate) {
      showToast({
        type: "error",
        title: "Invalid Date Range",
        message: "Start date cannot be after end date.",
      });
      return;
    }
    setDateRange(range);
    setPage(1);
  };

  // ── 3. Grouping by Transaction for Safe Pagination ─────────────────────────
  // Preserves complete transaction groups on the same page
  const transactionGroups = useMemo(() => {
    const map = new Map();
    submissions.forEach((item) => {
      const k = item.cod_transaction_key;
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k).push(item);
    });
    return Array.from(map.values());
  }, [submissions]);

  const GROUPS_PER_PAGE = 8;
  const totalPages = Math.max(1, Math.ceil(transactionGroups.length / GROUPS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paginatedGroups = useMemo(() => {
    const startIdx = (safePage - 1) * GROUPS_PER_PAGE;
    return transactionGroups.slice(startIdx, startIdx + GROUPS_PER_PAGE);
  }, [transactionGroups, safePage]);

  const paginatedRows = useMemo(() => {
    return paginatedGroups.flat();
  }, [paginatedGroups]);

  const sections = useMemo(() => {
    return buildPaymentSections(paginatedRows);
  }, [paginatedRows]);

  // ── 4. Submit Payment Action ─────────────────────────────────────────────
  const handleOpenSubmitModal = (row) => {
    setSelectedSubmissionForSubmit(row);
    setIsSubmitModalOpen(true);
  };

  const handleConfirmSubmitPayment = async (transaction) => {
    if (!transaction || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/miller-employees/driver/payments/submit/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cod_transaction_key: transaction.cod_transaction_key,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit payment.");
      }

      // Close Submit Payment modal
      setIsSubmitModalOpen(false);
      setSelectedSubmissionForSubmit(null);

      // Automatically open POS receipt modal
      const receiptPayload = data.receipt_data || transaction.receipt_data;
      setSelectedReceiptData(receiptPayload);
      setIsReceiptModalOpen(true);

      // Refresh list
      fetchSubmissions();

      showToast({
        type: "success",
        title: "Payment Submitted",
        message: "COD payment has been submitted successfully.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Submission Failed",
        message: err.message || "Failed to submit payment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 5. View Details (Submitted Receipts) ──────────────────────────────────
  const handleOpenReceiptModal = (row) => {
    const payload = row.receipt_data || {
      business_name: row.business_name,
      reference_no: row.payment_reference_no,
      transaction_date_formatted: row.handled_at ? row.handled_at.slice(0, 19).replace("T", " ") : "",
      driver_name: row.driver_name,
      customer_name: row.retailer,
      buyer_type: "Retailer",
      batch_no: row.transaction_batches_str || row.batch_no,
      payment_method: row.payment_method,
      external_payment_reference_no: row.external_payment_reference_no,
      receipt_photo: row.receipt_photo,
      items: row.transaction_items || [],
      total_amount: row.transaction_total || row.order_total,
      amount_paid: row.amount_paid,
      change_amount: row.change,
      status: row.status,
    };
    setSelectedReceiptData(payload);
    setIsReceiptModalOpen(true);
  };

  // ── 6. Table Columns Definition ──────────────────────────────────────────
  const columns = [
    {
      key: "batchNo",
      label: "Delivery / Retailer",
      width: "24%",
      renderCell: (r) => (
        <div>
          <p className="font-bold text-gray-900 text-xs tracking-tight">{r.batch_no || r.batchNo}</p>
          <p className="text-[11px] text-gray-500 font-medium truncate max-w-[200px]" title={r.retailer}>
            {r.retailer}
          </p>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Qty (kg)",
      width: "12%",
      renderCell: (r) => <span className="text-xs text-gray-700 font-medium">{r.qty}</span>,
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      width: "18%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span
          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
            METHOD_BADGE[r.payment_method] || "bg-gray-100 text-gray-600"
          }`}
        >
          {r.payment_method === "Cash" ? "Cash on Delivery" : r.payment_method}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "14%",
      renderCell: (r) => <span className="font-bold text-gray-900 text-xs">{r.amount}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span
          className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${
            STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    {
      key: "paidAt",
      label: "Paid At",
      width: "10%",
      renderCell: (r) => <span className="text-xs text-gray-500 font-medium">{r.paid_at || r.paidAt}</span>,
    },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => {
        // Display only one action button, positioned on the last row of the group
        if (!r.isLastInGroup) {
          return <span className="text-gray-300 text-xs">—</span>;
        }

        const isSubmitted = r.status === "Submitted";
        return (
          <button
            type="button"
            onClick={() => {
              if (isSubmitted) {
                handleOpenReceiptModal(r);
              } else {
                handleOpenSubmitModal(r);
              }
            }}
            className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer shadow-2xs ${
              isSubmitted
                ? "border border-slate-200 bg-white text-gray-700 hover:bg-slate-50"
                : "bg-[#0B5D1E] hover:bg-[#094d19] text-white"
            }`}
          >
            {isSubmitted ? "View Details" : "Submit Payment"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Finance" }, { label: "Payment Submission" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Payment Submission
        </h2>
        <p className="text-sm text-slate-500">
          Submit and review payments collected from retailer deliveries.
        </p>
      </div>

      {/* ── Toolbar Layout (Search + Filter Selectors) ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search batch, retailer, or destination"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
        </div>

        <DateRangePicker onDateChange={handleDateChange} />

        <CustomDropdown
          label="Payment Method"
          value={method}
          onChange={(v) => {
            setMethod(v);
            setPage(1);
          }}
          options={PAYMENT_METHOD_OPTIONS}
        />

        <CustomDropdown
          label="Payment Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />

        <button
          type="button"
          onClick={fetchSubmissions}
          disabled={isLoading}
          className="p-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition cursor-pointer flex items-center justify-center shrink-0 h-[38px] disabled:opacity-50"
          title="Refresh payment records"
        >
          <RefreshCw size={15} className={isLoading ? "animate-spin text-[#0B5D1E]" : ""} />
        </button>
      </div>

      {/* ── Payment Submission Table ────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyStateTitle={isLoading ? "Loading payment records..." : "No payment records found"}
        emptyStateDescription={
          isLoading
            ? "Fetching collected COD payment records from server..."
            : "No COD payments match your selected search or filter criteria."
        }
        footerLabel={`Showing ${paginatedRows.length} of ${submissions.length} collected COD orders`}
      />

      {/* ── Submit Payment Modal (Miller Manager Fulfillment History style) ── */}
      <DriverSubmitPaymentModal
        isOpen={isSubmitModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsSubmitModalOpen(false);
            setSelectedSubmissionForSubmit(null);
          }
        }}
        transaction={selectedSubmissionForSubmit}
        onSubmit={handleConfirmSubmitPayment}
        isSubmitting={isSubmitting}
      />

      {/* ── POS Receipt Modal (View Details / After Submission) ─────────────── */}
      <DriverPOSReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceiptData(null);
        }}
        receiptData={selectedReceiptData}
      />

      {/* ── Toast Notifications ────────────────────────────────────────────── */}
      <Toast toasts={toasts} removeToast={removeToast} onRemoveToast={removeToast} />
    </div>
  );
}