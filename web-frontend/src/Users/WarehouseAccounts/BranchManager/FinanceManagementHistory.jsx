import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, FileText, Download, X, CheckCircle2, Eye, Calendar, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* ── Tab Constants ───────────────────────────────────────────────────────────── */
const TABS = [
  { id: "procurement", label: "Procurement Payables" },
  { id: "tax",         label: "Tax Compliance Record" },
  { id: "reimbursement", label: "Reimbursement" },
];

/* ── Sort Options ─────────────────────────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Cost (High to Low)" },
  { value: "amount-asc", label: "Cost (Low to High)" },
];

/* ── Branch Options ───────────────────────────────────────────────────────────── */
const BRANCH_OPTIONS = [
  "Warehouse ABC",
  "Warehouse XYZ",
  "Main Distribution Hub",
];

/* ── Mock Data Generators ────────────────────────────────────────────────────── */
const MOCK_PROCUREMENT_PAYABLES = Array.from({ length: 24 }).map((_, i) => ({
  id: `pp-${i + 1}`,
  batchNo: "Batch 2026 - 001",
  branch: BRANCH_OPTIONS[i % BRANCH_OPTIONS.length],
  supplier: `Supplier ${String.fromCharCode(65 + (i % 3))}`,
  variant: "Dinorado",
  total: "₱9,000.00",
  date: `2026-08-${10 + (i % 15)}`,
}));

const MOCK_TAX_RECORDS = Array.from({ length: 24 }).map((_, i) => {
  const isPercentage = i % 2 === 0;
  return {
    id: `tax-${i + 1}`,
    branch: BRANCH_OPTIONS[i % BRANCH_OPTIONS.length],
    nameOfTax: isPercentage ? "3% Percentage Tax" : "Local Business Tax",
    description: isPercentage
      ? "Tax imposed by BIR on non-VAT registered businesses..."
      : "Local tax imposed by the LGU on commercial warehouse operations...",
    costValue: isPercentage ? "₱1.00" : "₱10,310.20",
    taxPeriod: isPercentage ? "Quarterly" : "Yearly",
    dueDate: "Sep 30, 2026",
    date: `2026-08-${10 + (i % 15)}`,
  };
});

const MOCK_REIMBURSEMENTS = Array.from({ length: 24 }).map((_, i) => {
  const branch = BRANCH_OPTIONS[i % BRANCH_OPTIONS.length];
  if (i % 3 === 0) {
    return {
      id: `reimb-${i + 1}`,
      branch,
      category: "Logistic / Delivery Reimbursement",
      categoryType: "logistic",
      date: "Apr 12, 2026",
      isoDate: "2026-04-12",
      description: "Fuel reimbursement for delivery truck",
      cost: "₱2,300.00",
      requestedBy: "Logistics A",
    };
  } else if (i % 3 === 1) {
    return {
      id: `reimb-${i + 1}`,
      branch,
      category: "Warehouse Operation",
      categoryType: "operation",
      date: "Apr 12, 2026",
      isoDate: "2026-04-12",
      description: "Warehouse supply expense",
      cost: "₱150.00",
      requestedBy: "Driver A",
    };
  } else {
    return {
      id: `reimb-${i + 1}`,
      branch,
      category: "Payroll",
      categoryType: "payroll",
      date: "Apr 12, 2026",
      isoDate: "2026-04-12",
      description: "Weekly salary payout",
      cost: "₱150.00",
      requestedBy: "Finance A",
    };
  }
});

/* ── Style Mappings ──────────────────────────────────────────────────────────── */
const CATEGORY_STYLES = {
  logistic: "bg-sky-100/90 text-sky-700 border border-sky-200",
  operation: "bg-amber-100/90 text-amber-700 border border-amber-200",
  payroll: "bg-purple-100/90 text-purple-700 border border-purple-200",
};

const PERIOD_STYLES = {
  Quarterly: "bg-sky-100/90 text-sky-700 border border-sky-200",
  Yearly: "bg-purple-100/90 text-purple-700 border border-purple-200",
};

/* ── Table Column Configurations for SectionedTableCard ───────────────────────── */
const PROCUREMENT_COLUMNS = [
  { key: "batchNo",   label: "Batch No.",     width: "20%" },
  { key: "branch",    label: "Branch",        width: "20%" },
  { key: "supplier",  label: "Supplier",      width: "20%" },
  { key: "variant",   label: "Variant",       width: "18%" },
  { key: "total",     label: "Total",         width: "12%" },
  { key: "action",    label: "Action",        width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

const TAX_COLUMNS = [
  { key: "nameOfTax",   label: "Name of Tax",     width: "22%" },
  { key: "description", label: "Description",     width: "32%" },
  { key: "costValue",   label: "Cost Value",      width: "16%" },
  { key: "taxPeriod",   label: "Tax Period",      width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
  { key: "dueDate",     label: "Due Date",        width: "10%" },
  { key: "action",      label: "Action",          width: "8%", headerClassName: "text-center", cellClassName: "text-center" },
];

const REIMBURSEMENT_COLUMNS = [
  { key: "category",    label: "Expense Category", width: "25%" },
  { key: "description", label: "Description",      width: "32%" },
  { key: "cost",        label: "Cost",             width: "18%" },
  { key: "requestedBy", label: "Requested By",     width: "15%" },
  { key: "action",      label: "Action",          width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

export default function FinanceManagementHistory() {
  const [activeTab, setActiveTab] = useState("procurement");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("Branch");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Click outside listener for dropdown popovers
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

  const handleViewDetails = (item) => {
    console.log("Viewing record details:", item);
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case "procurement":
        return "Search batch ID, supplier, product";
      case "tax":
        return "Search tax name, description";
      case "reimbursement":
        return "Search category, description, recipient";
      default:
        return "Search...";
    }
  };

  const getRawData = () => {
    switch (activeTab) {
      case "procurement":
        return MOCK_PROCUREMENT_PAYABLES;
      case "tax":
        return MOCK_TAX_RECORDS;
      case "reimbursement":
        return MOCK_REIMBURSEMENTS;
      default:
        return [];
    }
  };

  const activeColumns = useMemo(() => {
    switch (activeTab) {
      case "procurement":
        return PROCUREMENT_COLUMNS;
      case "tax":
        return TAX_COLUMNS;
      case "reimbursement":
        return REIMBURSEMENT_COLUMNS;
      default:
        return [];
    }
  }, [activeTab]);

  // Format and filter data for SectionedTableCard
  const filteredSections = useMemo(() => {
    const list = getRawData().filter((item) => {
      // Search Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches = Object.values(item).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }

      // Date Range Filter
      const itemDate = item.isoDate || item.date;
      if (dateRange.startDate && itemDate < dateRange.startDate) return false;
      if (dateRange.endDate && itemDate > dateRange.endDate) return false;

      // Branch Filter
      if (branchFilter !== "Branch" && branchFilter !== "All") {
        if (item.branch !== branchFilter) return false;
      }

      return true;
    });

    if (list.length === 0) return [];

    const actionButton = (item) => (
      <button
        type="button"
        onClick={() => handleViewDetails(item)}
        className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer"
        title="View Details"
      >
        <Eye size={15} />
        <span>View</span>
      </button>
    );

    const formattedRows = list.map((item) => {
      if (activeTab === "procurement") {
        return {
          ...item,
          batchNo: item.batchNo,
          branch: item.branch,
          supplier: item.supplier,
          total: item.total,
          action: actionButton(item),
        };
      }
      if (activeTab === "tax") {
        return {
          ...item,
          nameOfTax: item.nameOfTax,
          description: <span className="max-w-sm truncate block">{item.description}</span>,
          costValue: item.costValue,
          taxPeriod: (
            <span className={`inline-block px-3 py-0.5 rounded-full text-xs ${PERIOD_STYLES[item.taxPeriod]}`}>
              {item.taxPeriod}
            </span>
          ),
          dueDate: item.dueDate,
          action: actionButton(item),
        };
      }
      if (activeTab === "reimbursement") {
        return {
          ...item,
          category: (
            <div>
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs ${CATEGORY_STYLES[item.categoryType] || "bg-gray-100 text-gray-700"}`}>
                {item.category}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">{item.date}</p>
            </div>
          ),
          description: item.description,
          cost: item.cost,
          action: actionButton(item),
        };
      }
      return item;
    });

    return [{ rows: formattedRows }];
  }, [activeTab, search, dateRange, branchFilter]);

  const rawCount = getRawData().length;
  const TOTAL_PAGES = Math.ceil(rawCount / 10) || 1;

  return (
    <div className="space-y-5">
      {/* ── Breadcrumb & Page Header ────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Finance Management History" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-bold tracking-[-0.03em] text-slate-900">
          Finance Management History
        </h1>
        <p className="text-sm text-slate-500">
          All paid records across procurement, taxes, and reimbursements.
        </p>
      </div>

      {/* ── Shared Tabs Component ───────────────────────────────────────────── */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => {
          setActiveTab(id);
          setCurrentPage(1);
        }}
      />

      {/* ── Unified Toolbar (Search + Filters + Action Button) ───────────────── */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4 items-stretch lg:items-center justify-between">
        
        {/* Search & Filter Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          
          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
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
              placeholder={getPlaceholder()}
              className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => {
                setShowDatePicker((prev) => !prev);
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
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
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
              className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px]"
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
              <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[180px]">
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

          {/* Branch Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="Branch">All Branches</option>
              {BRANCH_OPTIONS.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>

        {/* Generate Financial Reports Button */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="rounded-lg bg-[#0B5D1E] px-4 py-2 text-xs font-normal text-white transition hover:bg-[#084b18] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap h-[38px]"
        >
          <FileText size={15} strokeWidth={2.5} />
          Generate Financial Reports
        </button>
      </div>

      {/* ── Shared SectionedTableCard Component ─────────────────────────────── */}
      <SectionedTableCard
        columns={activeColumns}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing financial records — Page ${currentPage} of ${TOTAL_PAGES}`}
      />

      {/* ── Generate Financial Reports Modal ─────────────────────────────────── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="font-normal text-gray-900 text-base">Generate Financial Statement</h3>
                  <p className="text-xs text-gray-500">Export audited warehouse finance summaries</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-normal text-gray-700 block mb-1">Select Report Category</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white">
                  <option>Procurement Payables &amp; Supplier Invoices</option>
                  <option>Tax Compliance &amp; LGU Withholdings</option>
                  <option>Staff Reimbursements &amp; Payroll</option>
                  <option>Full Comprehensive Financial Statement</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-normal text-gray-700 block mb-1">Fiscal Reporting Period</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white">
                  <option>Current Fiscal Month (August 2026)</option>
                  <option>Q3 2026 (July - September)</option>
                  <option>Year-to-Date (YTD 2026)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-normal text-gray-700 block mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="py-2 border border-emerald-600 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-normal">
                    PDF Statement
                  </button>
                  <button type="button" className="py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-normal hover:bg-gray-50">
                    CSV / Excel
                  </button>
                </div>
              </div>
            </div>

            {reportGenerated ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-normal flex items-center gap-2">
                <CheckCircle2 size={16} /> Financial statement generated! Download initiated.
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-normal text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportGenerated(true);
                  setTimeout(() => {
                    setShowReportModal(false);
                    setReportGenerated(false);
                  }, 1500);
                }}
                className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-normal transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Export Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}