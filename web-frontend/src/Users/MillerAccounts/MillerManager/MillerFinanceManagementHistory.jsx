import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, FileText, Download, X, CheckCircle2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";

const TABS = [
  { id: "procurement", label: "Procurement Payables" },
  { id: "tax", label: "Tax Compliance Record" },
  { id: "reimbursement", label: "Reimbursement" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "cost-high", label: "Cost (High to Low)" },
  { value: "cost-low", label: "Cost (Low to High)" },
];

/* ── Tab 1: Procurement Payables Mock Data ── */
const MOCK_PROCUREMENT_PAYABLES = Array.from({ length: 24 }).map((_, i) => {
  const day = (i % 28) + 1;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const cost = 9000 + i * 500;
  return {
    id: `pp-${i + 1}`,
    batchNo: `Batch 2026 - 00${(i % 5) + 1}`,
    branch: "Supplier ABC",
    supplier: "Supplier A",
    variant: "Dinorado",
    total: `₱${cost.toLocaleString()}.00`,
    numericCost: cost,
    isoDate: `2026-08-${formattedDay}`,
  };
});

/* ── Tab 2: Tax Compliance Record Mock Data ── */
const MOCK_TAX_RECORDS = Array.from({ length: 24 }).map((_, i) => {
  const isPercentage = i % 2 === 0;
  const day = (i % 28) + 1;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const cost = isPercentage ? 1.0 : 10310.2;
  return {
    id: `tax-${i + 1}`,
    nameOfTax: isPercentage ? "3% Percentage Tax" : "Local Business Tax",
    costValue: isPercentage ? "₱1.00" : "₱10,310.20",
    numericCost: cost,
    taxPeriod: isPercentage ? "Quarterly" : "Yearly",
    paidBy: "Finance A",
    dueDate: "Sep 30, 2026",
    isoDate: `2026-08-${formattedDay}`,
  };
});

/* ── Tab 3: Reimbursement Mock Data ── */
const MOCK_REIMBURSEMENTS = Array.from({ length: 24 }).map((_, i) => {
  const day = (i % 28) + 1;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  if (i < 3 || i % 3 === 0) {
    return {
      id: `reimb-${i + 1}`,
      category: "Logistic / Delivery Reimbursement",
      categoryType: "logistic",
      date: "Apr 12, 2026",
      cost: "₱2,500.00",
      numericCost: 2500,
      requestedBy: "Logistics A",
      paidBy: "Finance A",
      isoDate: `2026-08-${formattedDay}`,
    };
  } else if (i % 3 === 1) {
    return {
      id: `reimb-${i + 1}`,
      category: "Warehouse Operation",
      categoryType: "operation",
      date: "Apr 12, 2026",
      cost: "₱150.00",
      numericCost: 150,
      requestedBy: "Driver A",
      paidBy: "Finance A",
      isoDate: `2026-08-${formattedDay}`,
    };
  } else {
    return {
      id: `reimb-${i + 1}`,
      category: "Payroll",
      categoryType: "payroll",
      date: "Apr 12, 2026",
      cost: "₱150.00",
      numericCost: 150,
      requestedBy: "Finance A",
      paidBy: "Finance A",
      isoDate: `2026-08-${formattedDay}`,
    };
  }
});

const CATEGORY_STYLES = {
  logistic: "bg-blue-100/80 text-blue-700 border border-blue-200",
  operation: "bg-amber-100/80 text-amber-700 border border-amber-200",
  payroll: "bg-purple-100/80 text-purple-700 border border-purple-200",
};

const PERIOD_STYLES = {
  Quarterly: "bg-blue-100/80 text-blue-700 border border-blue-200",
  Yearly: "bg-purple-100/80 text-purple-700 border border-purple-200",
};

export default function MillerFinanceManagementHistory() {
  const [activeTab, setActiveTab] = useState("procurement");
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("newest");

  const [currentPage, setCurrentPage] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const dateRef = useRef(null);
  const sortRef = useRef(null);

  // Popover dismissal handling for Date Picker & Sort Dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
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

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
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

  const getColumns = () => {
    if (activeTab === "procurement") {
      return [
        { key: "batchNo", label: "Batch No.", width: "18%" },
        { key: "branch", label: "Branch", width: "18%" },
        { key: "supplier", label: "Supplier", width: "18%" },
        { key: "variant", label: "Variant", width: "18%" },
        { key: "total", label: "Total", width: "14%" },
        {
          key: "action",
          label: "Status",
          width: "14%",
          headerClassName: "text-center",
          cellClassName: "text-center",
          render: (row) => (
            <button
              type="button"
              onClick={() => setSelectedRecord({ ...row, type: "procurement" })}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
            >
              View Details
            </button>
          ),
        },
      ];
    }

    if (activeTab === "tax") {
      return [
        { key: "nameOfTax", label: "Name of Tax", width: "22%" },
        { key: "costValue", label: "Cost Value", width: "16%" },
        {
          key: "taxPeriod",
          label: "Tax Period",
          width: "14%",
          headerClassName: "text-center",
          cellClassName: "text-center",
          render: (row) => (
            <span className={`inline-block px-3 py-0.5 rounded-md text-xs font-semibold ${PERIOD_STYLES[row.taxPeriod] || "bg-gray-100 text-gray-700"}`}>
              {row.taxPeriod}
            </span>
          ),
        },
        { key: "paidBy", label: "Paid By", width: "16%" },
        { key: "dueDate", label: "Due Date", width: "18%" },
        {
          key: "action",
          label: "Status",
          width: "14%",
          headerClassName: "text-center",
          cellClassName: "text-center",
          render: (row) => (
            <button
              type="button"
              onClick={() => setSelectedRecord({ ...row, type: "tax" })}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
            >
              View Details
            </button>
          ),
        },
      ];
    }

    return [
      {
        key: "category",
        label: "Expense Category",
        width: "26%",
        render: (row) => (
          <div>
            <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${CATEGORY_STYLES[row.categoryType] || "bg-gray-100 text-gray-700"}`}>
              {row.category}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">{row.date}</p>
          </div>
        ),
      },
      { key: "cost", label: "Cost", width: "16%" },
      { key: "requestedBy", label: "Requested By", width: "21%" },
      { key: "paidBy", label: "Paid By", width: "21%" },
      {
        key: "action",
        label: "Status",
        width: "16%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() => setSelectedRecord({ ...row, type: "reimbursement" })}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
          >
            View Details
          </button>
        ),
      },
    ];
  };

  const currentRawData = useMemo(() => {
    if (activeTab === "procurement") return MOCK_PROCUREMENT_PAYABLES;
    if (activeTab === "tax") return MOCK_TAX_RECORDS;
    return MOCK_REIMBURSEMENTS;
  }, [activeTab]);

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = currentRawData.filter((item) => {
      // Search Filter
      if (q) {
        const match = Object.values(item).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q)
        );
        if (!match) return false;
      }

      // Date Range Filter
      if (dateRange.startDate && item.isoDate < dateRange.startDate) return false;
      if (dateRange.endDate && item.isoDate > dateRange.endDate) return false;

      return true;
    });

    // Sorting Logic
    if (sortBy === "newest") {
      result.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    } else if (sortBy === "cost-high") {
      result.sort((a, b) => (b.numericCost || 0) - (a.numericCost || 0));
    } else if (sortBy === "cost-low") {
      result.sort((a, b) => (a.numericCost || 0) - (b.numericCost || 0));
    }

    return result;
  }, [currentRawData, search, dateRange, sortBy]);

  const itemsPerPage = 10;
  const totalCount = filteredData.length;
  const TOTAL_PAGES = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredData.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginatedRows }], [paginatedRows]);

  const currentSortLabel = SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label || "Sort By";

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Finance Management History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Finance Management History
        </h2>
        <p className="text-sm text-slate-500">
          All paid records across procurement, taxes, and reimbursements.
        </p>
      </div>

      {/* ── Tabs Component ─────────────────────────────────────────────────── */}
      <Tabs
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setCurrentPage(1);
          setSearch("");
        }}
      />

      {/* ── Toolbar Controls & Actions ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={getPlaceholder()}
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* 1. Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
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

          {/* 2. Custom Styled Sort Dropdown */}
          <div className="relative w-full sm:w-auto" ref={sortRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown((prev) => !prev)}
              className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-2xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] min-w-[150px] justify-between shadow-2xs"
            >
              <span>{currentSortLabel}</span>
              {showSortDropdown ? (
                <ChevronUp size={16} className="text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-500" />
              )}
            </button>

            {showSortDropdown && (
              <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-52 animate-in fade-in zoom-in-95 duration-100">
                <div className="space-y-0.5">
                  {SORT_OPTIONS.map((opt) => {
                    const isSelected = sortBy === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.value);
                          setShowSortDropdown(false);
                          setCurrentPage(1);
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
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="flex items-center justify-center gap-2 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto h-[38px]"
        >
          <FileText size={15} /> Generate Financial Reports
        </button>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={getColumns()}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing financial records — Page ${currentPage} of ${TOTAL_PAGES}`}
      />

      {/* ── View Details Modal ──────────────────────────────────────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Payment Record Details</h3>
                    <p className="text-xs text-gray-500">Verified disbursement transaction</p>
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

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl">
                {selectedRecord.batchNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batch Code:</span>
                    <span className="font-bold">{selectedRecord.batchNo}</span>
                  </div>
                )}
                {selectedRecord.branch && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facility / Branch:</span>
                    <span className="font-bold">{selectedRecord.branch}</span>
                  </div>
                )}
                {selectedRecord.supplier && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-bold">{selectedRecord.supplier}</span>
                  </div>
                )}
                {selectedRecord.nameOfTax && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax Type:</span>
                    <span className="font-bold">{selectedRecord.nameOfTax}</span>
                  </div>
                )}
                {selectedRecord.category && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-bold">{selectedRecord.category}</span>
                  </div>
                )}
                {selectedRecord.requestedBy && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Requested By:</span>
                    <span className="font-bold">{selectedRecord.requestedBy}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Disbursed / Paid By:</span>
                  <span className="font-bold">{selectedRecord.paidBy || "Finance A"}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-slate-600 font-bold">Total Disbursed:</span>
                  <span className="font-bold text-emerald-700 text-sm">{selectedRecord.total || selectedRecord.cost || selectedRecord.costValue}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Generate Financial Reports Modal ─────────────────────────────────── */}
      {showReportModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Generate Financial Statement</h3>
                    <p className="text-xs text-gray-500">Export audited milling finance summaries</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Select Report Category</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white">
                    <option>Procurement Payables &amp; Supplier Invoices</option>
                    <option>Tax Compliance &amp; LGU Withholdings</option>
                    <option>Staff Reimbursements &amp; Operations</option>
                    <option>Full Comprehensive Financial Statement</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Fiscal Reporting Period</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white">
                    <option>Current Fiscal Month (September 2026)</option>
                    <option>Q3 2026 (July - September)</option>
                    <option>Year-to-Date (YTD 2026)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Export Format</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className="py-2 border border-[#0B5D1E] bg-emerald-50 text-[#0B5D1E] font-bold rounded-xl text-xs">
                      PDF Statement
                    </button>
                    <button type="button" className="py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">
                      CSV / Excel
                    </button>
                  </div>
                </div>
              </div>

              {reportGenerated && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Financial statement generated! Download initiated.
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportGenerated(true);
                    showToast("Financial statement generated successfully!");
                    setTimeout(() => {
                      setShowReportModal(false);
                      setReportGenerated(false);
                    }, 1500);
                  }}
                  className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} /> Export Report
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}