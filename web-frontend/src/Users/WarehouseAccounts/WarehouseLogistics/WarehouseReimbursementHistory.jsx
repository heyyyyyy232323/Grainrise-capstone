import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* 71 records matching the data: first 4 Paid, next 3 Approved, rest Pending */
const sampleData = Array.from({ length: 71 }, (_, i) => ({
  id: `r-${i + 1}`,
  category: "Vehicle Repair",
  amount: `₱${(3500).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  numericAmount: 3500,
  requester: "Juan Dela Cruz",
  expense_date: new Date(2026, 3, (i % 28) + 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
  isoDate: `2026-04-${(i % 28 + 1).toString().padStart(2, "0")}`,
  status: i < 4 ? "Paid" : i < 7 ? "Approved" : "Pending",
}));

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "Paid", label: "Paid" },
  { value: "Approved", label: "Approved" },
  { value: "Pending", label: "Pending" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
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

export default function MillerReimbursementHistory() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleData.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.category} ${r.requester}`.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        r.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesStart = !dateRange.startDate || r.isoDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || r.isoDate <= dateRange.endDate;

      return matchesQuery && matchesStatus && matchesStart && matchesEnd;
    });

    if (sortBy === "amount-desc") result.sort((a, b) => b.numericAmount - a.numericAmount);
    else if (sortBy === "amount-asc") result.sort((a, b) => a.numericAmount - b.numericAmount);
    else if (sortBy === "date-asc") result.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    else if (sortBy === "date-desc") result.sort((a, b) => b.isoDate.localeCompare(a.isoDate));

    return result;
  }, [query, statusFilter, dateRange, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = [
    { key: "category", label: "Expense Category", width: "22%" },
    { key: "amount", label: "Amount", width: "16%" },
    { key: "requester", label: "Requested By", width: "20%" },
    { key: "expense_date", label: "Expense Date", width: "18%" },
    {
      key: "status",
      label: "Status",
      width: "12%",
      render: (row) => {
        const badgeStyles =
          row.status === "Paid"
            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
            : row.status === "Approved"
            ? "bg-blue-100 text-blue-800 border-blue-200"
            : "bg-amber-100 text-amber-800 border-amber-200";
        return (
          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Page Header ───────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Records", path: "/miller-logistics/assigned-history" },
          { label: "Reimbursement History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Reimbursement History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View submitted reimbursement requests and their payment status.
        </p>
      </div>

      {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 1. Search Filter */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search category, description, requester"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setCurrentPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 2. Date Range Picker */}
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

        {/* 3. Status Dropdown */}
        <CustomDropdown
          label="All Status"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
        />

        {/* 4. Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => { setSortBy(v); setCurrentPage(1); }}
        />
      </div>

      {/* ── Table Card ────────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setCurrentPage(p)}
        onViewDetails={(row) => console.log("View details:", row.id)}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} reimbursement requests`}
      />
    </div>
  );
}