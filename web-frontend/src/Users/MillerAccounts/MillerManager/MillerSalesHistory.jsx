import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Calendar, ChevronDown, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import MillerSalesHistoryDetailsModal from "../../../Components/Modals/MillerSales/MillerSalesHistoryDetailsModal";
import POSSalesReceiptModal from "../../../Components/Modals/MillerSales/POSSalesReceiptModal";
import Toast from "../../../Components/Modals/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

const SALES_TABS = [
  { id: "in-store", label: "In-Store Transactions" },
  { id: "online",   label: "Online Orders Transactions" },
];

const SORT_OPTIONS = [
  { value: "date-desc",   label: "Newest First" },
  { value: "date-asc",    label: "Oldest First" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "qty-desc",    label: "Quantity / Price (High to Low)" },
  { value: "qty-asc",     label: "Quantity / Price (Low to High)" },
];

const ITEMS_PER_PAGE = 10;

/* ── Columns for In-Store Transactions ── */
const IN_STORE_COLUMNS = [
  { key: "time",         label: "Transaction Time", width: "18%" },
  { key: "branchName",   label: "Branch Name",      width: "20%", renderCell: (row) => row.branchName || row.branch || "—" },
  { key: "variant",      label: "Variant",          width: "20%" },
  { key: "quantity",     label: "Quantity",         width: "15%" },
  { key: "totalPayment", label: "Total Payment",    width: "15%" },
  {
    key: "action",
    label: "Action",
    width: "12%",
    headerClassName: "text-center",
    cellClassName: "text-center",
  },
];

/* ── Columns for Online Orders Transactions ── */
const ONLINE_COLUMNS = [
  { key: "batchNo",        label: "Batch No.",       width: "14%" },
  { key: "retailer",       label: "Retailer",        width: "14%" },
  { key: "branchName",     label: "Branch Name",      width: "15%", renderCell: (row) => row.branchName || row.branch || "—" },
  { key: "variant",        label: "Variant",         width: "14%" },
  { key: "totalPrice",     label: "Total Price",     width: "13%" },
  { key: "paymentStatus",  label: "Payment Status",  width: "11%" },
  { key: "deliveryStatus", label: "Delivery Status", width: "11%" },
  {
    key: "action",
    label: "Action",
    width: "8%",
    headerClassName: "text-center",
    cellClassName: "text-center",
  },
];

/* ── Status Badge Helpers ── */
const PAYMENT_STATUS_STYLES = {
  Paid:                  "bg-emerald-100 text-emerald-700",
  paid:                  "bg-emerald-100 text-emerald-700",
  Pending:               "bg-amber-100 text-amber-700",
  pending:               "bg-amber-100 text-amber-700",
  "Submitted to Driver": "bg-blue-100 text-blue-700",
  "submitted to driver": "bg-blue-100 text-blue-700",
  Failed:                "bg-rose-100 text-rose-700",
  failed:                "bg-rose-100 text-rose-700",
};

const DELIVERY_STATUS_STYLES = {
  Completed:                "bg-emerald-100 text-emerald-700",
  completed:                "bg-emerald-100 text-emerald-700",
  "Forwarded to Logistics": "bg-blue-100 text-blue-700",
  "forwarded to logistics": "bg-blue-100 text-blue-700",
  Preparing:                "bg-amber-100 text-amber-700",
  preparing:                "bg-amber-100 text-amber-700",
  Cancelled:                "bg-rose-100 text-rose-700",
  cancelled:                "bg-rose-100 text-rose-700",
  Declined:                 "bg-rose-100 text-rose-700",
  declined:                 "bg-rose-100 text-rose-700",
  Ordered:                  "bg-amber-100 text-amber-700",
  ordered:                  "bg-amber-100 text-amber-700",
  Delivered:                "bg-emerald-100 text-emerald-700",
  delivered:                "bg-emerald-100 text-emerald-700",
  "Ready for Pickup":       "bg-blue-100 text-blue-700",
  "ready for pickup":       "bg-blue-100 text-blue-700",
};

function StatusBadge({ status, styleMap }) {
  if (!status) return null;
  const style = styleMap[status] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}

function getLocalDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function MillerSalesHistory() {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState("in-store");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [dateError, setDateError] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Live Records State
  const [inStoreSales, setInStoreSales] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const [showBranchDrop, setShowBranchDrop] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const branchRef = useRef(null);
  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (branchRef.current && !branchRef.current.contains(e.target)) {
        setShowBranchDrop(false);
      }
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch ALL branches owned by the authenticated Miller Manager using GET /miller/branches/
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      const rawList = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(rawList)) {
        setBranches(rawList);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Fetch sales records for both in-store and online
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const [inStorePayload, onlinePayload] = await Promise.all([
        request("/miller/sales-history/in-store/"),
        request("/miller/sales-history/online/"),
      ]);
      const fetchedInStore = Array.isArray(inStorePayload?.sales) ? inStorePayload.sales : [];
      const fetchedOnline = Array.isArray(onlinePayload?.sales) ? onlinePayload.sales : [];
      setInStoreSales(fetchedInStore);
      setOnlineSales(fetchedOnline);
    } catch (err) {
      console.error("Failed to load sales history:", err);
      showToast({
        type: "error",
        message: err?.message || "Failed to load sales transactions.",
      });
    } finally {
      setLoading(false);
    }
  }, [request, showToast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Populate branch options using GET /miller/branches/ (response.data)
  // supplier_profile_id = filter value, business_name = displayed Branch Name
  // Includes branches with zero sales transactions, with "All Branches" as default.
  const branchOptions = useMemo(() => {
    const map = new Map();

    // 1. Add ALL owned branches from GET /miller/branches/
    for (const b of branches) {
      if (b && b.supplier_profile_id != null) {
        map.set(
          String(b.supplier_profile_id),
          b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`
        );
      }
    }

    // 2. Also ensure any branch present in sales records is covered
    const combined = [...inStoreSales, ...onlineSales];
    for (const item of combined) {
      const id = item.supplierProfileId;
      const name = item.branchName || item.branch;
      if (id !== undefined && id !== null && name && !map.has(String(id))) {
        map.set(String(id), name);
      }
    }

    const list = Array.from(map.entries())
      .map(([id, name]) => ({ value: String(id), label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "all", label: "All Branches" }, ...list];
  }, [branches, inStoreSales, onlineSales]);

  // Display label for current branch selection
  const selectedBranchLabel = useMemo(() => {
    if (selectedBranch === "all") return "All Branches";
    const found = branchOptions.find((b) => String(b.value) === String(selectedBranch));
    return found ? found.label : "All Branches";
  }, [selectedBranch, branchOptions]);

  // Handle branch filter change
  const handleBranchSelect = (branchValue) => {
    setSelectedBranch(branchValue);
    setCurrentPage(1);
    setShowBranchDrop(false);
  };

  // Date Range Pickers Handlers with Strict To >= From Validation
  const handleStartDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, startDate: val };
      if (next.startDate && next.endDate && next.endDate < next.startDate) {
        setDateError("End date must not precede start date.");
      } else {
        setDateError("");
      }
      return next;
    });
  };

  const handleEndDateChange = (val) => {
    setTempDateRange((prev) => {
      const next = { ...prev, endDate: val };
      if (next.startDate && next.endDate && next.endDate < next.startDate) {
        setDateError("End date must not precede start date.");
      } else {
        setDateError("");
      }
      return next;
    });
  };

  const handleDateApply = () => {
    if (tempDateRange.startDate && tempDateRange.endDate && tempDateRange.endDate < tempDateRange.startDate) {
      setDateError("End date must not precede start date.");
      return;
    }
    setDateError("");
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setDateError("");
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const isOnline = activeTab === "online";
  const columns = isOnline ? ONLINE_COLUMNS : IN_STORE_COLUMNS;
  const rawList = isOnline ? onlineSales : inStoreSales;

  // Filter and Sort Raw Records (Branch, Date Range, Search, Sort)
  const filteredRows = useMemo(() => {
    return rawList
      .filter((row) => {
        // Branch Filter: filter by supplierProfileId
        if (selectedBranch !== "all") {
          const rowBranchId =
            row.supplierProfileId !== undefined && row.supplierProfileId !== null
              ? String(row.supplierProfileId)
              : "";
          if (rowBranchId !== String(selectedBranch)) {
            return false;
          }
        }

        // Date range filter
        if (dateRange.startDate || dateRange.endDate) {
          const rowDate = (row.date || "").split("T")[0];
          if (rowDate) {
            if (dateRange.startDate && rowDate < dateRange.startDate) return false;
            if (dateRange.endDate && rowDate > dateRange.endDate) return false;
          }
        }

        // Search query filter: includes reference, branch name, variant, customer, amount
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        if (isOnline) {
          return (
            (row.batchNo && row.batchNo.toLowerCase().includes(q)) ||
            (row.retailer && row.retailer.toLowerCase().includes(q)) ||
            (row.buyerName && row.buyerName.toLowerCase().includes(q)) ||
            (row.branchName && row.branchName.toLowerCase().includes(q)) ||
            (row.branch && row.branch.toLowerCase().includes(q)) ||
            (row.variant && row.variant.toLowerCase().includes(q)) ||
            (row.totalPrice && row.totalPrice.toLowerCase().includes(q)) ||
            (row.paymentStatus && row.paymentStatus.toLowerCase().includes(q)) ||
            (row.deliveryStatus && row.deliveryStatus.toLowerCase().includes(q))
          );
        }
        return (
          (row.transactionId && row.transactionId.toLowerCase().includes(q)) ||
          (row.referenceNo && row.referenceNo.toLowerCase().includes(q)) ||
          (row.branchName && row.branchName.toLowerCase().includes(q)) ||
          (row.branch && row.branch.toLowerCase().includes(q)) ||
          (row.variant && row.variant.toLowerCase().includes(q)) ||
          (row.quantity && row.quantity.toLowerCase().includes(q)) ||
          (row.totalPayment && row.totalPayment.toLowerCase().includes(q)) ||
          (row.paymentMethod && row.paymentMethod.toLowerCase().includes(q)) ||
          (row.time && row.time.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return (b.sortTimestamp || 0) - (a.sortTimestamp || 0);
        }
        if (sortBy === "date-asc") {
          return (a.sortTimestamp || 0) - (b.sortTimestamp || 0);
        }
        if (sortBy === "variant-asc") {
          return (a.variant || "").localeCompare(b.variant || "");
        }
        if (sortBy === "qty-desc") {
          const numA = isOnline
            ? (a.totalPriceNum ?? parseFloat((a.totalPrice || "0").replace(/[^0-9.]/g, "")))
            : (a.quantityNum ?? parseFloat((a.quantity || "0").replace(/[^0-9.]/g, "")));
          const numB = isOnline
            ? (b.totalPriceNum ?? parseFloat((b.totalPrice || "0").replace(/[^0-9.]/g, "")))
            : (b.quantityNum ?? parseFloat((b.quantity || "0").replace(/[^0-9.]/g, "")));
          return numB - numA;
        }
        if (sortBy === "qty-asc") {
          const numA = isOnline
            ? (a.totalPriceNum ?? parseFloat((a.totalPrice || "0").replace(/[^0-9.]/g, "")))
            : (a.quantityNum ?? parseFloat((a.quantity || "0").replace(/[^0-9.]/g, "")));
          const numB = isOnline
            ? (b.totalPriceNum ?? parseFloat((b.totalPrice || "0").replace(/[^0-9.]/g, "")))
            : (b.quantityNum ?? parseFloat((b.quantity || "0").replace(/[^0-9.]/g, "")));
          return numA - numB;
        }
        return 0;
      });
  }, [rawList, selectedBranch, searchQuery, dateRange, sortBy, isOnline]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredRows, startIndex]);

  // Group paginated rows into sections with date labels (Today, Yesterday, Date)
  const sections = useMemo(() => {
    if (paginatedRows.length === 0) return [];

    const today = new Date();
    const todayStr = getLocalDateString(today);

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const groups = new Map();

    for (const r of paginatedRows) {
      const rowDateStr = (r.date || "").split("T")[0];
      let label = r.dateFormatted || rowDateStr || "Transactions";
      if (rowDateStr === todayStr) {
        label = "Today";
      } else if (rowDateStr === yesterdayStr) {
        label = "Yesterday";
      }

      // Format row badges if online
      const processedRow = isOnline
        ? {
            ...r,
            paymentStatus: (
              <StatusBadge status={r.paymentStatus} styleMap={PAYMENT_STATUS_STYLES} />
            ),
            deliveryStatus: (
              <StatusBadge status={r.deliveryStatus} styleMap={DELIVERY_STATUS_STYLES} />
            ),
            _rawPaymentStatus: r.paymentStatus,
            _rawDeliveryStatus: r.deliveryStatus,
          }
        : r;

      if (!groups.has(label)) {
        groups.set(label, []);
      }
      groups.get(label).push(processedRow);
    }

    const result = [];
    for (const [label, rows] of groups.entries()) {
      result.push({ label, rows });
    }
    return result;
  }, [paginatedRows, isOnline]);

  // Get Receipt Action Handler for In-Store Transactions
  const handleGetReceipt = async (referenceNo) => {
    const cleanRef = (referenceNo || "").trim();
    if (!cleanRef) {
      showToast({ type: "error", message: "Transaction reference number is missing." });
      return;
    }

    setIsReceiptLoading(true);
    try {
      const payload = await request(`/miller/sales-history/receipt/${encodeURIComponent(cleanRef)}/`);
      const receipt = payload?.receipt;
      if (!receipt) {
        throw new Error("Sales receipt data could not be retrieved.");
      }
      setSelectedReceipt(receipt);
      setIsReceiptModalOpen(true);
    } catch (err) {
      console.error("Failed to load receipt:", err);
      showToast({
        type: "error",
        message: err?.message || "Failed to load checkout receipt.",
      });
    } finally {
      setIsReceiptLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Toast Notifications ────────────────────────────────────────────── */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              type={toast.type}
              message={toast.message}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>

      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Sales History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Sales History
        </h2>
        <p className="text-sm text-slate-500">
          View completed in-store and online sales transactions.
        </p>
      </div>

      {/* ── Tabs Component (Preserves Selected Branch) ───────────────────────── */}
      <Tabs
        tabs={SALES_TABS}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setCurrentPage(1);
        }}
      />

      {/* ── Toolbar Controls ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search receipt no., branch, variant, customer, or amount"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Branch Filter Dropdown */}
          <div className="relative w-full sm:w-auto" ref={branchRef}>
            <button
              type="button"
              onClick={() => {
                setShowBranchDrop((prev) => !prev);
                setShowDatePicker(false);
                setShowSortDrop(false);
              }}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                selectedBranch !== "all"
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                  : ""
              }`}
            >
              <span>{selectedBranchLabel}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform duration-200 ${showBranchDrop ? "rotate-180" : ""}`}
              />
            </button>

            {showBranchDrop && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[200px] max-h-60 overflow-y-auto">
                {branchOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleBranchSelect(opt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      String(selectedBranch) === String(opt.value)
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

          {/* Date Range Picker Dropdown with Strict To >= From Validation */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker((prev) => !prev);
                setShowBranchDrop(false);
                setShowSortDrop(false);
              }}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>
                {dateRange.startDate
                  ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                  : "Date Range"}
              </span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.startDate}
                      max={tempDateRange.endDate || undefined}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.endDate}
                      min={tempDateRange.startDate || undefined}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {dateError && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {dateError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDateReset}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDateApply}
                      disabled={Boolean(dateError)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative w-full sm:w-auto" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setShowSortDrop((prev) => !prev);
                setShowBranchDrop(false);
                setShowDatePicker(false);
              }}
              className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px]"
            >
              <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort By"}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform duration-200 ${showSortDrop ? "rotate-180" : ""}`}
              />
            </button>

            {showSortDrop && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[210px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDrop(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      sortBy === opt.value
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
        </div>
      </div>

      {/* ── Transactions Table ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => {
          setSelectedSale(row);
          setIsDetailsModalOpen(true);
        }}
        viewDetailsLabel="View Details"
        emptyStateTitle={
          isOnline ? "No online transactions found" : "No in-store transactions found"
        }
        emptyStateDescription={
          loading
            ? "Please wait while we fetch sales transactions from the database."
            : "No matching sales records were found. Try adjusting your search or filters."
        }
        footerLabel={`Showing transactions — Page ${safePage} of ${totalPages}`}
      />

      {/* ── View Details Modal ──────────────────────────────────────────────── */}
      <MillerSalesHistoryDetailsModal
        isOpen={isDetailsModalOpen}
        sale={selectedSale}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedSale(null);
        }}
        type={activeTab}
        onGetReceipt={handleGetReceipt}
        isReceiptLoading={isReceiptLoading}
      />

      {/* ── Centered POS Sales Receipt Modal (Print & Download PDF) ──────────── */}
      <POSSalesReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceipt(null);
        }}
        receiptData={selectedReceipt}
      />
    </div>
  );
}