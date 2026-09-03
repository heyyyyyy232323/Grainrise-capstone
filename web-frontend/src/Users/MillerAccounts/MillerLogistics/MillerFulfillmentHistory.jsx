import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const VARIANT_OPTIONS = [
  { value: "all", label: "All Variants" },
  { value: "dinorado", label: "Dinorado" },
  { value: "sinandomeng", label: "Sinandomeng" },
  { value: "jasmine", label: "Jasmine" },
];

const SORT_OPTIONS = [
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "customer-asc", label: "Customer Name (A-Z)" },
  { value: "delivered-desc", label: "Delivered Qty (High to Low)" },
  { value: "passed-desc", label: "Passed QC (High to Low)" },
];

const sampleFulfill = Array.from({ length: 52 }, (_, i) => ({
  id: `f-${i + 1}`,
  variant: i % 3 === 0 ? "Dinorado" : i % 3 === 1 ? "Sinandomeng" : "Jasmine",
  customer: `Retailer ${String.fromCharCode(65 + (i % 5))}`,
  delivered: `${(i + 1) * 100} kg`,
  numericDelivered: (i + 1) * 100,
  passed: `${(i + 1) * 80} kg`,
  numericPassed: (i + 1) * 80,
  failed: `${(i + 1) * 20} kg`,
  isoDate: `2026-08-${(i % 28 + 1).toString().padStart(2, "0")}`,
}));

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
  const displayLabel = selectedOption ? selectedOption.label : label;

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between w-full sm:w-auto min-w-[140px]"
      >
        <span>{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-52 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                      : "text-slate-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MillerFulfillmentHistory() {
  const [query, setQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [sortBy, setSortBy] = useState("variant-asc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [page, setPage] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setPage(1);
    setShowDatePicker(false);
  };

  const columns = [
    { key: "variant", label: "Variant", width: "18%" },
    { key: "customer", label: "Customer Name", width: "22%" },
    { key: "delivered", label: "Delivered (kg)", width: "16%" },
    { key: "passed", label: "Passed QC (kg)", width: "16%" },
    { key: "failed", label: "Failed QC (kg)", width: "16%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleFulfill.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.variant} ${r.customer}`.toLowerCase().includes(q);
      const matchesVariant =
        variantFilter === "all" ||
        r.variant.toLowerCase() === variantFilter;
      const matchesStart = !dateRange.startDate || r.isoDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || r.isoDate <= dateRange.endDate;

      return matchesQuery && matchesVariant && matchesStart && matchesEnd;
    });

    if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
    else if (sortBy === "customer-asc") result.sort((a, b) => a.customer.localeCompare(b.customer));
    else if (sortBy === "delivered-desc") result.sort((a, b) => b.numericDelivered - a.numericDelivered);
    else if (sortBy === "passed-desc") result.sort((a, b) => b.numericPassed - a.numericPassed);

    return result;
  }, [query, variantFilter, dateRange, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Records", path: "/miller-logistics/dashboard" },
          { label: "Fulfillment History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Fulfillment History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View completed fulfillment and delivery records.
        </p>
      </div>

      {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 1. Search Filter (First) */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search order no., batch no., product, or customer"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 2. Date Range Picker (First among dropdowns) */}
        <div className="relative w-full sm:w-auto" ref={dateRef}>
          <button
            type="button"
            onClick={() => setShowDatePicker((prev) => !prev)}
            className={`flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 w-full sm:w-auto justify-between transition-colors cursor-pointer h-[38px] ${
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

        {/* 3. All Variants Dropdown */}
        <CustomDropdown
          label="All Variants"
          options={VARIANT_OPTIONS}
          value={variantFilter}
          onChange={(v) => { setVariantFilter(v); setPage(1); }}
        />

        {/* 4. Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => { setSortBy(v); setPage(1); }}
        />
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onViewDetails={(row) => console.log("View details:", row.id)}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} fulfillment records`}
      />
    </div>
  );
}