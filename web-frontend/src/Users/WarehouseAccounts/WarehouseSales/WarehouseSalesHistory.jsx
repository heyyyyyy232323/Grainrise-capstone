import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Calendar, ChevronDown, X, Loader2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import WarehouseSalesHistoryDetailsModal from "../../../Components/Modals/WarehouseSales/WarehouseSalesHistoryDetailsModal";
import WarehousePOSSalesReceiptModal from "../../../Components/Modals/WarehouseSales/WarehousePOSSalesReceiptModal";
import Toast from "../../../Components/Modals/Toast";
import useToast from "../../../Components/hooks/useToast";
import useApi from "../../../Components/hooks/useApi";

const TABS = [
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

// ─── Column Definitions ────────────────────────────────────────────────────────
const IN_STORE_COLUMNS = [
  { key: "time",         label: "Transaction Time", width: "24%" },
  { key: "variant",      label: "Variant",          width: "24%" },
  { key: "quantity",     label: "Quantity",         width: "20%" },
  { key: "totalPayment", label: "Total Payment",    width: "20%" },
  { key: "action",       label: "Action",           width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const ONLINE_COLUMNS = [
  { key: "batchNo",        label: "Batch No.",       width: "18%" },
  { key: "retailer",       label: "Retailer",        width: "15%" },
  { key: "variant",        label: "Variant",         width: "15%" },
  { key: "totalPrice",     label: "Total Price",     width: "15%" },
  { key: "paymentStatus",  label: "Payment Status",  width: "15%" },
  { key: "deliveryStatus", label: "Delivery Status", width: "15%" },
  { key: "action",         label: "Action",          width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

// ─── Status Badge Helpers ─────────────────────────────────────────────────────
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
  "In transit":             "bg-blue-100 text-blue-700",
  "in transit":             "bg-blue-100 text-blue-700",
  "Assigned to driver":     "bg-blue-100 text-blue-700",
  "assigned to driver":     "bg-blue-100 text-blue-700",
  Processing:               "bg-amber-100 text-amber-700",
  processing:               "bg-amber-100 text-amber-700",
  Requested:                "bg-amber-100 text-amber-700",
  requested:                "bg-amber-100 text-amber-700",
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

const WarehouseSalesHistory = () => {
  const { request } = useApi();
  const { toasts, showToast, removeToast } = useToast();

  const [activeTab, setActiveTab] = useState("in-store");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [dateError, setDateError] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Live Records State
  const [inStoreSales, setInStoreSales] = useState([]);
  const [onlineSales, setOnlineSales] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptLoading, setIsReceiptLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
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

  // Fetch sales records based on active tab
  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "in-store") {
        const payload = await request("/warehouse/sales/history/in-store/");
        const fetched = Array.isArray(payload?.sales) ? payload.sales : [];
        setInStoreSales(fetched);
      } else {
        const payload = await request("/warehouse/sales/history/online/");
        const fetched = Array.isArray(payload?.sales) ? payload.sales : [];
        setOnlineSales(fetched);
      }
    } catch (err) {
      console.error("Failed to load warehouse sales history:", err);
      showToast({
        type: "error",
        message: err?.message || "Failed to load sales transactions.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab, request, showToast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Date Range Pickers Handlers
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

  // Filter and Sort Raw Records
  const filteredRows = useMemo(() => {
    return rawList
      .filter((row) => {
        // Date range filter
        if (dateRange.startDate || dateRange.endDate) {
          const rowDate = (row.date || "").split("T")[0];
          if (rowDate) {
            if (dateRange.startDate && rowDate < dateRange.startDate) return false;
            if (dateRange.endDate && rowDate > dateRange.endDate) return false;
          }
        }

        // Search query filter
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        if (isOnline) {
          return (
            (row.batchNo && row.batchNo.toLowerCase().includes(q)) ||
            (row.retailer && row.retailer.toLowerCase().includes(q)) ||
            (row.buyerName && row.buyerName.toLowerCase().includes(q)) ||
            (row.variant && row.variant.toLowerCase().includes(q)) ||
            (row.productName && row.productName.toLowerCase().includes(q)) ||
            (row.totalPrice && row.totalPrice.toLowerCase().includes(q)) ||
            (row.paymentStatus && row.paymentStatus.toLowerCase().includes(q)) ||
            (row.deliveryStatus && row.deliveryStatus.toLowerCase().includes(q))
          );
        }
        return (
          (row.transactionId && row.transactionId.toLowerCase().includes(q)) ||
          (row.referenceNo && row.referenceNo.toLowerCase().includes(q)) ||
          (row.variant && row.variant.toLowerCase().includes(q)) ||
          (row.productName && row.productName.toLowerCase().includes(q)) ||
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
  }, [rawList, searchQuery, dateRange, sortBy, isOnline]);

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
      const payload = await request(`/warehouse/sales/pos/receipt/${encodeURIComponent(cleanRef)}/`);
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
    <div className="space-y-5">
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Sales", path: "/warehouse-sales/dashboard" },
            { label: "Sales History" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Sales History
        </h1>
        <p className="text-sm text-slate-500">View completed in-store and online sales transactions.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setCurrentPage(1);
        }}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search receipt no., variant, customer, or amount"
            className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter and Sort Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          {/* Date Range Dropdown with Strict To >= From Validation */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker((prev) => !prev);
                setShowSortDrop(false);
              }}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>{dateRange.startDate ? `${dateRange.startDate} - ${dateRange.endDate || "..."}` : "Date Range"}</span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
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
                setShowDatePicker(false);
              }}
              className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer"
            >
              <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort By"}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform duration-200 ${showSortDrop ? "rotate-180" : ""}`}
              />
            </button>

            {showSortDrop && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[210px]">
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
      <WarehouseSalesHistoryDetailsModal
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

      {/* ── Centered Blue Get Receipt -> POS Sales Receipt Modal ───────────── */}
      <WarehousePOSSalesReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedReceipt(null);
        }}
        receiptData={selectedReceipt}
      />
    </div>
  );
};

export default WarehouseSalesHistory;