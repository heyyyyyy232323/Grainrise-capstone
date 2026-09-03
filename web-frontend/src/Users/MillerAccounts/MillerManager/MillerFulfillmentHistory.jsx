import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Calendar, ChevronDown, X, PackageCheck, Eye } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* ── Table Column Configurations ────────────────────────────────────────────────── */
const TABLE_COLUMNS = [
  { key: "variant", label: "Variant", width: "22%" },
  { key: "branch", label: "Branch", width: "24%" },
  { key: "customerName", label: "Customer Name", width: "24%" },
  { key: "delivered", label: "Delivered (kg)", width: "20%" },
  { key: "action", label: "Action", width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

/* ── Filter & Sort Options ──────────────────────────────────────────────────────── */
const VARIANT_OPTIONS = ["Dinorado", "Sinandomeng"];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "delivered-desc", label: "Delivered Quantity (High to Low)" },
  { value: "delivered-asc", label: "Delivered Quantity (Low to High)" },
];

/* ── Mock Data ───────────────────────────────────────────────────────────────── */
const MOCK_RECORDS = Array.from({ length: 32 }).map((_, i) => ({
  id: `FL-${2026001 + i}`,
  variant: i % 2 === 0 ? "Dinorado" : "Sinandomeng",
  branch: i % 3 === 0 ? "Warehouse ABC" : i % 3 === 1 ? "Warehouse XYZ" : "Main Distribution Hub",
  customerName: `Retailer ${String.fromCharCode(65 + (i % 5))}`,
  delivered: `${(i + 1) * 100} kg`,
  passedQC: `${(i + 1) * 80} kg`,
  failedQC: `${(i + 1) * 20} kg`,
  batchNo: `Batch 2026-00${(i % 3) + 1}`,
  driver: `Driver ${String.fromCharCode(65 + (i % 3))}`,
  date: `2026-08-${String((i % 20) + 1).padStart(2, "0")}`,
  formattedDate: `Aug ${(i % 20) + 1}, 2026`,
}));

export default function FulfillmentHistory() {
  const [search, setSearch] = useState("");
  const [variantFilter, setVariantFilter] = useState("All Variants");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener for dropdowns
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

  // 1. Filter and sort all records
  const filteredAndSortedRecords = useMemo(() => {
    return MOCK_RECORDS.filter((r) => {
      // Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          r.variant.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.batchNo.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Variant Filter
      if (variantFilter !== "All Variants" && r.variant !== variantFilter) {
        return false;
      }

      // Date Range Filter
      if (dateRange.startDate && r.date < dateRange.startDate) return false;
      if (dateRange.endDate && r.date > dateRange.endDate) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === "variant-asc") return a.variant.localeCompare(b.variant);
      if (sortBy === "date-desc") return new Date(b.date) - new Date(a.date);
      if (sortBy === "date-asc") return new Date(a.date) - new Date(b.date);
      if (sortBy === "delivered-desc") {
        const numA = parseFloat(a.delivered.replace(/[^0-9.]/g, ""));
        const numB = parseFloat(b.delivered.replace(/[^0-9.]/g, ""));
        return numB - numA;
      }
      if (sortBy === "delivered-asc") {
        const numA = parseFloat(a.delivered.replace(/[^0-9.]/g, ""));
        const numB = parseFloat(b.delivered.replace(/[^0-9.]/g, ""));
        return numA - numB;
      }
      return 0;
    });
  }, [search, variantFilter, dateRange, sortBy]);

  // 2. Dynamic pagination variables
  const itemsPerPage = 10;
  const totalCount = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;

  // 3. Slice current page records & format custom JSX actions
  const tableSections = useMemo(() => {
    const pageItems = filteredAndSortedRecords.slice(startIndex, startIndex + itemsPerPage);

    const formattedRows = pageItems.map((row) => ({
      ...row,
      action: (
        <button
          type="button"
          onClick={() => setSelectedRecord(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer font-medium"
          title="View Details"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    }));

    return [{ rows: formattedRows }];
  }, [filteredAndSortedRecords, startIndex, itemsPerPage]);

  return (
    <div className="space-y-5">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Fulfillment History" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-slate-900">
          Fulfillment History
        </h1>
        <p className="text-sm text-slate-500">
          View completed fulfillment and delivery records.
        </p>
      </div>

      {/* ── Toolbar: Compact Search Bar + Filters Side-by-Side ──────────────── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        {/* Compact Fixed-Width Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search records..."
            className="block w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Product Variant Filter Dropdown */}
        <div className="relative w-full sm:w-auto">
          <select
            value={variantFilter}
            onChange={(e) => {
              setVariantFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="All Variants">All Variants</option>
            {VARIANT_OPTIONS.map((variant) => (
              <option key={variant} value={variant}>
                {variant}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </div>

        {/* Date Range Dropdown */}
        <div className="relative w-full sm:w-auto" ref={dateRef}>
          <button
            type="button"
            onClick={() => {
              setShowDatePicker((prev) => !prev);
              setShowSortDrop(false);
            }}
            className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center transition-colors cursor-pointer h-[38px] ${
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
            <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
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
            className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full justify-center transition-colors cursor-pointer h-[38px]"
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
            <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[210px]">
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

      {/* ── SectionedTableCard Component ────────────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing ${totalCount === 0 ? 0 : startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          totalCount
        )} of ${totalCount} fulfillment records`}
      />

      {/* ── Fulfillment Details Modal ────────────────────────────────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">Fulfillment Record</h3>
                    <p className="text-xs text-gray-500">{selectedRecord.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Facility Branch:</span>
                  <span className="font-medium text-gray-900">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Client:</span>
                  <span className="font-medium text-gray-900">{selectedRecord.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Number:</span>
                  <span className="font-medium text-gray-800">{selectedRecord.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rice Variant:</span>
                  <span className="font-medium text-gray-900">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dispatched Driver:</span>
                  <span className="font-medium text-gray-800">{selectedRecord.driver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Date:</span>
                  <span className="font-medium text-gray-700">
                    {selectedRecord.formattedDate || selectedRecord.date}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Total Delivered:</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedRecord.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-medium">Passed Quality Inspection:</span>
                    <span className="font-bold text-emerald-700">{selectedRecord.passedQC}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-medium">Failed QC (Rejected/Returned):</span>
                    <span className="font-bold text-rose-600">{selectedRecord.failedQC}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}