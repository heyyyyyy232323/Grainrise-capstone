import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

// ─── Static Data ──────────────────────────────────────────────────────────────
const ALL_ORDERS = [
  // June 10, 2026
  { id: "r1",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-06-10" },
  { id: "r2",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-06-10" },
  { id: "r3",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-06-10" },
  // June 18, 2026
  { id: "r4",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-06-18" },
  { id: "r5",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-06-18" },
  { id: "r6",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-06-18" },
  { id: "r7",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-06-18" },
  // June 28, 2026
  { id: "r8",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-06-28" },
  { id: "r9",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-06-28" },
  { id: "r10", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-06-28" },
  // July 10, 2026
  { id: "r11", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-07-10" },
  { id: "r12", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-07-10" },
  { id: "r13", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-07-10" },
  // July 18, 2026
  { id: "r14", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-07-18" },
  { id: "r15", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-07-18" },
  // Recent (today / yesterday)
  { id: "r16", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-08-10", recent: true },
  { id: "r17", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-08-10", recent: true },
  { id: "r18", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-08-10", recent: true },
  { id: "r19", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-08-09", recent: true },
  { id: "r20", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-08-09", recent: true },
  { id: "r21", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-08-09", recent: true },
  { id: "r22", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-08-09", recent: true },
  // July 18 recent
  { id: "r23", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-07-18", recent: true },
  { id: "r24", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-07-18", recent: true },
  { id: "r25", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-07-18", recent: true },
];

const COLUMNS = [
  { key: "batchId",     label: "Batch ID" },
  { key: "productCode", label: "Product Code" },
  { key: "variant",     label: "Variant" },
  { key: "stockQty",    label: "Stock Qty (kg)" },
  { key: "supplier",    label: "Supplier" },
  { key: "status",      label: "Status" },
];

const SORT_OPTIONS = [
  { value: "date-desc",   label: "Newest First" },
  { value: "date-asc",    label: "Oldest First" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "code-asc",    label: "Product Code (A-Z)" },
  { value: "qty-asc",     label: "Stock Quantity (Low to High)" },
];

const STATUS_OPTIONS = [
  { value: "all",        label: "All Status" },
  { value: "Approved",   label: "Approved" },
  { value: "Requested",  label: "Requested" },
  { value: "Received",   label: "Received" },
  { value: "In Transit", label: "In Transit" },
  { value: "Declined",   label: "Declined" },
];

const ROWS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSectionLabel = (dateStr) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(dateStr + "T00:00:00");
  const toDay = (dt) => dt.toISOString().slice(0, 10);

  if (dateStr === toDay(today))     return "Today";
  if (dateStr === toDay(yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const groupByDate = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.date)) map.set(row.date, []);
    map.get(row.date).push(row);
  });
  // Sort dates descending (newest first)
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sectionRows]) => ({
      label: formatSectionLabel(date),
      rows: sectionRows,
    }));
};

const applyFilters = (rows, { search, dateRange, statusFilter, sortBy }) => {
  let result = [...rows];

  // Search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.batchId.toLowerCase().includes(q) ||
        r.productCode.toLowerCase().includes(q) ||
        r.variant.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q)
    );
  }

  // Status Filter
  if (statusFilter && statusFilter !== "all") {
    result = result.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase());
  }

  // Date range
  if (dateRange.startDate) {
    result = result.filter((r) => r.date >= dateRange.startDate);
  }
  if (dateRange.endDate) {
    result = result.filter((r) => r.date <= dateRange.endDate);
  }

  // Sort
  if (sortBy === "date-asc") result.sort((a, b) => a.date.localeCompare(b.date));
  else if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
  else if (sortBy === "code-asc") result.sort((a, b) => a.productCode.localeCompare(b.productCode));
  else if (sortBy === "qty-asc") result.sort((a, b) => parseFloat(a.stockQty) - parseFloat(b.stockQty));
  else result.sort((a, b) => b.date.localeCompare(a.date)); // default: newest first

  return result;
};

export default function WarehouseEncoderOrderHistory() {
  const [search,         setSearch]         = useState("");
  const [dateRange,      setDateRange]      = useState({ startDate: "", endDate: "" });
  const [tempDateRange,  setTempDateRange]  = useState({ startDate: "", endDate: "" });
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [sortBy,         setSortBy]         = useState("date-desc");
  const [currentPage,    setCurrentPage]    = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [showSortDrop,   setShowSortDrop]   = useState(false);

  const dateRef   = useRef(null);
  const statusRef = useRef(null);
  const sortRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setShowStatusDrop(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 whenever filters change
  const handleSearch = (v) => { setSearch(v); setCurrentPage(1); };
  const handleSort   = (v) => { setSortBy(v); setCurrentPage(1); };

  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  // Base pool
  const baseRows = ALL_ORDERS;

  // Filtered + sorted flat list
  const filtered = useMemo(() =>
    applyFilters(baseRows, { search, dateRange, statusFilter, sortBy }),
  [baseRows, search, dateRange, statusFilter, sortBy]);

  // Paginate flat list first, then group by date so section headers stay meaningful
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageSlice  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const sections   = groupByDate(pageSlice);

  const footerLabel = `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of ${filtered.length} records`;

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Order History" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Order History
        </h1>
        <p className="text-sm text-slate-500">Review warehouse transaction history.</p>
      </div>

      {/* ── Toolbar (Procurement Design) ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search batch ID, product code, variant, or supplier"
            className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
          />
          {search && (
            <button
              type="button"
              onClick={() => handleSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter and Sort Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
          {/* Date Range Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker((prev) => !prev);
                setShowStatusDrop(false);
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
                      onChange={(e) => setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
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
                      onChange={(e) => setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
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
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative w-full sm:w-auto" ref={statusRef}>
            <button
              type="button"
              onClick={() => {
                setShowStatusDrop((prev) => !prev);
                setShowDatePicker(false);
                setShowSortDrop(false);
              }}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
                statusFilter !== "all" ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>{statusFilter === "all" ? "Status" : statusFilter}</span>
              <ChevronDown
                size={16}
                className={`text-gray-500 transition-transform duration-200 ${showStatusDrop ? "rotate-180" : ""}`}
              />
            </button>

            {showStatusDrop && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[150px]">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setCurrentPage(1);
                      setShowStatusDrop(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      statusFilter === opt.value
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

          {/* Sort By Dropdown */}
          <div className="relative w-full sm:w-auto" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setShowSortDrop((prev) => !prev);
                setShowDatePicker(false);
                setShowStatusDrop(false);
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
              <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[190px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      handleSort(opt.value);
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

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={footerLabel}
        emptyStateTitle="No orders found"
        emptyStateDescription="No matching orders were found. Try adjusting your search or date filters."
      />
    </div>
  );
}