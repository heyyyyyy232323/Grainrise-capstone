import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "in-store", label: "In-Store Transactions" },
  { id: "online",   label: "Online Orders Transactions" },
];

const SORT_OPTIONS = [
  { value: "date-desc",   label: "Newest First" },
  { value: "date-asc",    label: "Oldest First" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "qty-desc",    label: "Quantity (High to Low)" },
  { value: "qty-asc",     label: "Quantity (Low to High)" },
  { value: "total-desc",  label: "Total Payment (High to Low)" },
];

const COLUMNS = [
  { key: "time",         label: "Transaction Time", width: "16%" },
  { key: "variant",      label: "Variant",          width: "16%" },
  { key: "quantity",     label: "Quantity",         width: "14%" },
  { key: "totalPayment", label: "Total Payment",    width: "16%" },
  { key: "amountPaid",   label: "Amount Paid",      width: "14%" },
  { key: "change",       label: "Change",           width: "12%" },
  { key: "action",       label: "ACTION",           width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "t1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "t2", time: "11:45 AM", variant: "Sinandomeng", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "t3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "y1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "y2", time: "11:45 AM", variant: "Sinandomeng", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "y3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "y4", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "j1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "j2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
      { id: "j3", time: "11:45 AM", variant: "Sinandomeng", quantity: "480 kg", totalPayment: "₱22,500.00", amountPaid: "₱23,000.00", change: "₱500.00" },
    ],
  },
];

const ONLINE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "o1", time: "10:05 AM", variant: "Sinandomeng", quantity: "320 kg", totalPayment: "₱18,500.00", amountPaid: "₱20,000.00", change: "₱1,500.00" },
      { id: "o2", time: "09:30 AM", variant: "Sinandomeng", quantity: "160 kg", totalPayment: "₱9,200.00", amountPaid: "₱10,000.00", change: "₱800.00" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "o3", time: "03:00 PM", variant: "Dinorado", quantity: "200 kg", totalPayment: "₱11,500.00", amountPaid: "₱12,000.00", change: "₱500.00" },
    ],
  },
];

const MillerSalesHistory = () => {
  const [activeTab,      setActiveTab]      = useState("in-store");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [dateRange,      setDateRange]      = useState({ startDate: "", endDate: "" });
  const [tempDateRange,  setTempDateRange]  = useState({ startDate: "", endDate: "" });
  const [sortBy,         setSortBy]         = useState("date-desc");
  const [currentPage,    setCurrentPage]    = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop,   setShowSortDrop]   = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  const TOTAL_PAGES = 26;

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

  const sections = activeTab === "in-store" ? IN_STORE_SECTIONS : ONLINE_SECTIONS;

  const filteredSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        rows: section.rows
          .filter((row) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              row.variant.toLowerCase().includes(q) ||
              row.quantity.toLowerCase().includes(q) ||
              row.totalPayment.toLowerCase().includes(q) ||
              row.time.toLowerCase().includes(q)
            );
          })
          .sort((a, b) => {
            if (sortBy === "variant-asc") return a.variant.localeCompare(b.variant);
            if (sortBy === "qty-desc") return parseFloat(b.quantity) - parseFloat(a.quantity);
            if (sortBy === "qty-asc") return parseFloat(a.quantity) - parseFloat(b.quantity);
            if (sortBy === "total-desc") {
              const numA = parseFloat(a.totalPayment.replace(/[^0-9.]/g, ""));
              const numB = parseFloat(b.totalPayment.replace(/[^0-9.]/g, ""));
              return numB - numA;
            }
            return 0;
          }),
      }))
      .filter((section) => section.rows.length > 0);
  }, [sections, searchQuery, sortBy]);

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Sales", path: "/miller-sales/dashboard" },
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

      {/* ── Toolbar (Procurement Design) ────────────────────────────────────── */}
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
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => console.log("View details:", row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing transactions — Page ${currentPage} of ${TOTAL_PAGES}`}
      />
    </div>
  );
};

export default MillerSalesHistory;
