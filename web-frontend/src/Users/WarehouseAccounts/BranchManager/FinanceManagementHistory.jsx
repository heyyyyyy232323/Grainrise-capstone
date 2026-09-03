import { useState, useMemo } from "react";
import { Search, FileText, Download, X, CheckCircle2, Eye } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* ── Tab Constants ───────────────────────────────────────────────────────────── */
const TABS = [
  { id: "procurement", label: "Procurement Payables" },
  { id: "tax",         label: "Tax Compliance Record" },
  { id: "reimbursement", label: "Reimbursement" },
];

/* ── Mock Data Generators ────────────────────────────────────────────────────── */
const MOCK_PROCUREMENT_PAYABLES = Array.from({ length: 24 }).map((_, i) => ({
  id: `pp-${i + 1}`,
  batchNo: "Batch 2026 - 001",
  branch: "Warehouse ABC",
  supplier: "Supplier A",
  variant: "Dinorado",
  total: "₱9,000.00",
}));

const MOCK_TAX_RECORDS = Array.from({ length: 24 }).map((_, i) => {
  const isPercentage = i % 2 === 0;
  return {
    id: `tax-${i + 1}`,
    nameOfTax: isPercentage ? "3% Percentage Tax" : "Local Business Tax",
    description: isPercentage
      ? "Tax imposed by BIR on non-VAT registered businesses..."
      : "Local tax imposed by the LGU on commercial warehouse operations...",
    costValue: isPercentage ? "₱1.00" : "₱10,310.20",
    taxPeriod: isPercentage ? "Quarterly" : "Yearly",
    dueDate: "Sep 30, 2026",
  };
});

const MOCK_REIMBURSEMENTS = Array.from({ length: 24 }).map((_, i) => {
  if (i % 3 === 0) {
    return {
      id: `reimb-${i + 1}`,
      category: "Logistic / Delivery Reimbursement",
      categoryType: "logistic",
      date: "Apr 12, 2026",
      description: "Fuel reimbursement for delivery truck",
      cost: "₱2,300.00",
      requestedBy: "Logistics A",
    };
  } else if (i % 3 === 1) {
    return {
      id: `reimb-${i + 1}`,
      category: "Warehouse Operation",
      categoryType: "operation",
      date: "Apr 12, 2026",
      description: "Warehouse supply expense",
      cost: "₱150.00",
      requestedBy: "Driver A",
    };
  } else {
    return {
      id: `reimb-${i + 1}`,
      category: "Payroll",
      categoryType: "payroll",
      date: "Apr 12, 2026",
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
  { key: "action",      label: "Action",           width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

export default function FinanceManagementHistory() {
  const [activeTab, setActiveTab] = useState("procurement");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  const handleViewDetails = (item) => {
    // Replace with your view modal or navigation logic
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

  // Select column schemas dynamically based on the active tab
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

  // Format data for SectionedTableCard
  const filteredSections = useMemo(() => {
    const list = getRawData().filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return Object.values(item).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(q)
      );
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
  }, [activeTab, search]);

  const rawCount = getRawData().length;
  const TOTAL_PAGES = Math.max(1, Math.ceil(rawCount / 10));

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

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        {/* Search */}
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
            placeholder={getPlaceholder()}
            className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
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

        {/* Generate Financial Reports Button */}
        <button
          type="button"
          onClick={() => setShowReportModal(true)}
          className="rounded-lg bg-[#0B5D1E] px-4 py-2 text-xs font-normal text-white transition hover:bg-[#084b18] flex items-center gap-1.5 cursor-pointer whitespace-nowrap ml-auto"
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