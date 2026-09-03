import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, X, FileText } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "payables",  label: "Procurement Payables"  },
  { id: "taxes",     label: "Tax Compliance Record"  },
  { id: "reimburse", label: "Reimbursement"          },
];

const VARIANT_OPTIONS = [
  { value: "all", label: "All Variants" },
  { value: "Dinorado", label: "Dinorado" },
  { value: "Sinandomeng", label: "Sinandomeng" },
  { value: "Jasmine", label: "Jasmine" },
];

const SUPPLIER_OPTIONS = [
  { value: "all", label: "All Suppliers" },
  { value: "Supplier A", label: "Supplier A" },
];

const TAX_PERIOD_OPTIONS = [
  { value: "all", label: "All Periods" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Yearly", label: "Yearly" },
];

const REIMBURSE_CAT_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "Logistics / Delivery Reimbursement", label: "Logistics Reimbursement" },
  { value: "Warehouse Operation", label: "Warehouse Operation" },
  { value: "Payroll", label: "Payroll" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "cost-desc", label: "Cost/Total (High to Low)" },
  { value: "cost-asc", label: "Cost/Total (Low to High)" },
];

const samplePayables = Array.from({ length: 24 }, (_, i) => ({
  id: `p-${i + 1}`,
  batchNo: `Paid Batch 2026 - 00${(i % 12) + 1}`,
  supplier: "Supplier A",
  variant: i % 3 === 0 ? "Dinorado" : i % 3 === 1 ? "Sinandomeng" : "Jasmine",
  stockQty: "200 kg",
  unitPrice: "₱45.00",
  total: "₱9,000.00",
  paidAt: "Sep 30, 2026",
  isoDate: `2026-09-${((i % 28) + 1).toString().padStart(2, "0")}`,
}));

const sampleTaxes = Array.from({ length: 24 }, (_, i) => ({
  id: `t-${i + 1}`,
  name: i % 2 === 0 ? "3% Percentage Tax" : "Local Business Tax",
  desc: i % 2 === 0 ? "Tax imposed by BIR on non-VAT registered businesses..." : "Local tax imposed by the LGU...",
  cost: i % 2 === 0 ? "₱1,250.00" : "₱10,310.20",
  period: i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
  isoDate: `2026-09-30`,
}));

const sampleReimburse = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  category:
    i % 3 === 0
      ? "Logistics / Delivery Reimbursement"
      : i % 3 === 1
      ? "Warehouse Operation"
      : "Payroll",
  description:
    i % 3 === 0
      ? "Fuel reimbursement for delivery truck"
      : i % 3 === 1
      ? "Warehouse supply expense"
      : "Weekly salary payout",
  cost: i % 3 === 0 ? "₱2,500.00" : "₱150.00",
  requester: i % 3 === 0 ? "Logistics A" : i % 3 === 1 ? "Driver A" : "Finance A",
  date: `Apr ${(i % 12) + 1}, 2026`,
  isoDate: `2026-04-${((i % 12) + 1).toString().padStart(2, "0")}`,
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

export default function WarehousePaymentHistory() {
  const [activeTab, setActiveTab] = useState("payables");
  const [query, setQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [variantFilter, setVariantFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
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

  const data = useMemo(() => {
    if (activeTab === "payables") return samplePayables;
    if (activeTab === "taxes") return sampleTaxes;
    return sampleReimburse;
  }, [activeTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((r) => {
      const matchesQuery = !q || Object.values(r).some((v) => String(v).toLowerCase().includes(q));
      const matchesStart = !dateRange.startDate || r.isoDate >= dateRange.startDate;
      const matchesEnd = !dateRange.endDate || r.isoDate <= dateRange.endDate;

      let matchesSpecific = true;
      if (activeTab === "payables") {
        const matchesVariant = variantFilter === "all" || r.variant === variantFilter;
        const matchesSupplier = supplierFilter === "all" || r.supplier === supplierFilter;
        matchesSpecific = matchesVariant && matchesSupplier;
      } else if (activeTab === "taxes") {
        matchesSpecific = periodFilter === "all" || r.period === periodFilter;
      } else if (activeTab === "reimburse") {
        matchesSpecific = categoryFilter === "all" || r.category === categoryFilter;
      }

      return matchesQuery && matchesStart && matchesEnd && matchesSpecific;
    });
  }, [data, query, dateRange, activeTab, variantFilter, supplierFilter, periodFilter, categoryFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  const columns = activeTab === "payables" ? [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "stockQty", label: "Stock Qty (KG)" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "total", label: "Total" },
    { key: "paidAt", label: "Paid At" },
  ] : activeTab === "taxes" ? [
    { key: "name", label: "Name of Tax" },
    {
      key: "desc",
      label: "Description",
      render: (row) => (
        <span className="text-[13px] text-slate-600">
          {row.desc}
        </span>
      ),
    },
    { key: "cost", label: "Cost Value" },
    {
      key: "period",
      label: "Tax Period",
      render: (row) => {
        const isYearly = row.period === "Yearly";
        return (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold ${
              isYearly
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {row.period}
          </span>
        );
      },
    },
    { key: "dueDate", label: "Due Date" },
  ] : [
    {
      key: "category",
      label: "Expense Category",
      render: (row) => {
        const colorMap = {
          "Logistics / Delivery Reimbursement": "bg-blue-100 text-blue-700",
          "Warehouse Operation": "bg-amber-100 text-amber-700",
          "Payroll": "bg-purple-100 text-purple-700",
        };
        const colorClass = colorMap[row.category] || "bg-slate-100 text-slate-600";
        return (
          <div>
            <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${colorClass}`}>
              {row.category}
            </span>
            <div className="text-[11px] text-slate-400 mt-1">{row.date}</div>
          </div>
        );
      },
    },
    { key: "description", label: "Description" },
    { key: "cost", label: "Cost" },
    { key: "requester", label: "Requested By" },
  ];

  const sections = [{ rows: paginated }];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Finance", path: "/warehouse-finance/dashboard" },
          { label: "Payment History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment History</h1>
        <p className="text-sm text-slate-500 mt-1">
          All paid records across procurement, taxes, and reimbursements.
        </p>
      </div>

      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t);
          setPage(1);
          setQuery("");
          setVariantFilter("all");
          setSupplierFilter("all");
          setCategoryFilter("all");
          setPeriodFilter("all");
        }}
      />

      {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* 1. Search Filter */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={
              activeTab === "taxes"
                ? "Search tax name, description"
                : activeTab === "payables"
                ? "Search batch ID, supplier, product"
                : "Search category, description, recipient"
            }
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
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
            <Calendar
              size={16}
              className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"}
            />
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

        {/* Tab-Specific Context Filters */}
        {activeTab === "payables" && (
          <>
            <CustomDropdown
              label="All Variants"
              options={VARIANT_OPTIONS}
              value={variantFilter}
              onChange={(v) => {
                setVariantFilter(v);
                setPage(1);
              }}
            />
            <CustomDropdown
              label="All Suppliers"
              options={SUPPLIER_OPTIONS}
              value={supplierFilter}
              onChange={(v) => {
                setSupplierFilter(v);
                setPage(1);
              }}
            />
          </>
        )}

        {activeTab === "taxes" && (
          <CustomDropdown
            label="All Periods"
            options={TAX_PERIOD_OPTIONS}
            value={periodFilter}
            onChange={(v) => {
              setPeriodFilter(v);
              setPage(1);
            }}
          />
        )}

        {activeTab === "reimburse" && (
          <CustomDropdown
            label="All Categories"
            options={REIMBURSE_CAT_OPTIONS}
            value={categoryFilter}
            onChange={(v) => {
              setCategoryFilter(v);
              setPage(1);
            }}
          />
        )}

        {/* Sort Dropdown */}
        <CustomDropdown
          label="Sort By"
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => {
            setSortBy(v);
            setPage(1);
          }}
        />

        {/* Action Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-[#0B5D1E] hover:bg-[#084b18] transition-colors text-white px-4 py-2 rounded-xl text-sm font-medium cursor-pointer h-[38px] ml-auto"
        >
          <FileText size={16} />
          <span>Generate Financial Reports</span>
        </button>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} payment records`}
      />
    </div>
  );
}