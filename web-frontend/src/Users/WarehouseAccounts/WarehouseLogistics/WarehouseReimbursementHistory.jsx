import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, X, ShoppingCart } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

// ─── Constants ───────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "date-desc",    label: "Newest First" },
  { value: "date-asc",     label: "Oldest First" },
  { value: "variant-asc",  label: "Variant (A-Z)" },
  { value: "retailer-asc", label: "Retailer (A-Z)" },
  { value: "amount-desc",  label: "Highest Amount" },
  { value: "amount-asc",   label: "Lowest Amount" },
];

// 1st column: Batch No. | Standardized key aliases for SectionedTableCard rendering
const COLUMNS = [
  { key: "batchNo",      label: "Batch No.",       width: "18%" },
  { key: "retailerName", label: "Retailer Name",   width: "20%" },
  { key: "variant",      label: "Variant",         width: "18%" },
  { key: "productCode",  label: "Product Code",    width: "18%" },
  { key: "totalPrice",   label: "Total Price",     width: "14%" },
  { key: "action",       label: "Action",          width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const PENDING_ORDERS = Array.from({ length: 14 }, (_, i) => ({
  id:           `order-${i + 1}`,
  batchNo:      `Batch 2026-00${(i % 3) + 1}`,
  retailerName: `Retailer ${String.fromCharCode(65 + (i % 5))}`,
  variant:      i % 2 === 0 ? "Dinorado" : "Sinandomeng",
  productCode:  i % 2 === 0 ? "WR-001" : "WR-002",
  totalPrice:   `₱${(1500 + i * 250).toLocaleString()}`,
  status:       "pending",
}));

// ─── Component ───────────────────────────────────────────────────────────────

const MillerOnlineOrders = () => {
  const [searchQuery,   setSearchQuery]   = useState("");
  const [dateRange,     setDateRange]     = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy,        setSortBy]        = useState("date-desc");
  const [currentPage,   setCurrentPage]   = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop,   setShowSortDrop]   = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  const TOTAL_PAGES = 2;

  // Click outside listener
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

  // Format dataset with custom styled text nodes matching Sales History
  const filteredSections = useMemo(() => {
    const rows = PENDING_ORDERS.filter((row) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.batchNo.toLowerCase().includes(q) ||
        row.retailerName.toLowerCase().includes(q) ||
        row.variant.toLowerCase().includes(q) ||
        row.productCode.toLowerCase().includes(q)
      );
    })
      .sort((a, b) => {
        if (sortBy === "variant-asc") return a.variant.localeCompare(b.variant);
        if (sortBy === "retailer-asc") return a.retailerName.localeCompare(b.retailerName);
        if (sortBy === "amount-desc") {
          return parseFloat(b.totalPrice.replace(/[^0-9.]/g, "")) - parseFloat(a.totalPrice.replace(/[^0-9.]/g, ""));
        }
        if (sortBy === "amount-asc") {
          return parseFloat(a.totalPrice.replace(/[^0-9.]/g, "")) - parseFloat(a.totalPrice.replace(/[^0-9.]/g, ""));
        }
        return 0;
      })
      .map((row) => ({
        ...row,
        // Font & text styling identical to Sales History rows
        batchNo: <span className="font-bold text-slate-800">{row.batchNo}</span>,
        retailerName: <span className="font-semibold text-slate-800">{row.retailerName}</span>,
        variant: <span className="text-slate-700">{row.variant}</span>,
        productCode: <span className="text-slate-600">{row.productCode}</span>,
        totalPrice: <span className="font-semibold text-slate-900">{row.totalPrice}</span>,
      }));

    if (rows.length === 0) return [];

    return [{ rows }];
  }, [searchQuery, sortBy]);

  const pendingCount = PENDING_ORDERS.length;

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Orders", path: "/miller-sales/dashboard" },
            { label: "Online Orders" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Online Orders
        </h1>
        <p className="text-sm text-slate-500">
          Review and process pending retailer online orders.
        </p>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        {/* Left: Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
          {/* Search Bar */}
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
              placeholder="Search retailer, batch number, product code, or variant"
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

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {/* Date Range Dropdown */}
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
                <span>
                  {dateRange.startDate
                    ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                    : "Date Range"}
                </span>
                <Calendar
                  size={16}
                  className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"}
                />
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
                        onChange={(e) =>
                          setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                        }
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
                        onChange={(e) =>
                          setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                        }
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
                  className={`text-gray-500 transition-transform duration-200 ${
                    showSortDrop ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showSortDrop && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[190px]">
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

        {/* Pending Badge */}
        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-300 px-4 py-2 text-xs font-semibold text-amber-700 shadow-sm ml-auto whitespace-nowrap">
            <ShoppingCart size={15} className="shrink-0" />
            Pending Orders ({pendingCount})
          </div>
        )}
      </div>

      {/* ── Table (SectionedTableCard Minor Component) ────────────────────────── */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => console.log("View order:", row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing orders — Page ${currentPage} of ${TOTAL_PAGES}`}
      />
    </div>
  );
};

export default MillerOnlineOrders;