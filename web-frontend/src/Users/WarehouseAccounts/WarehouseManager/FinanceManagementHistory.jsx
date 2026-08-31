import { useState } from "react";
import { Search, FileText, Download, X, CheckCircle2, Calendar, DollarSign } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

/* ── Tab 1: Procurement Payables (Screenshot 3) ────────────────────────────── */
const MOCK_PROCUREMENT_PAYABLES = Array.from({ length: 24 }).map((_, i) => ({
  id: `pp-${i + 1}`,
  batchNo: "Batch 2026 - 001",
  branch: "Warehouse ABC",
  supplier: "Supplier A",
  variant: "Dinorado",
  stockQty: "200 kg",
  unitPrice: "₱45.00",
  total: "₱9,000.00",
  paidBy: "Finance A",
  paidAt: "Sep 30, 2026",
}));

/* ── Tab 2: Tax Compliance Record (Screenshot 2) ───────────────────────────── */
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
    paidBy: "Finance A",
    dueDate: "Sep 30, 2026",
  };
});

/* ── Tab 3: Reimbursement (Screenshot 1) ───────────────────────────────────── */
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
      paidBy: "Finance A",
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
      paidBy: "Finance A",
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
      paidBy: "Finance A",
    };
  }
});

const CATEGORY_STYLES = {
  logistic: "bg-sky-100/90 text-sky-700 border border-sky-200",
  operation: "bg-amber-100/90 text-amber-700 border border-amber-200",
  payroll: "bg-purple-100/90 text-purple-700 border border-purple-200",
};

const PERIOD_STYLES = {
  Quarterly: "bg-sky-100/90 text-sky-700 border border-sky-200",
  Yearly: "bg-purple-100/90 text-purple-700 border border-purple-200",
};

export default function FinanceManagementHistory() {
  const [activeTab, setActiveTab] = useState("procurement"); // "procurement" | "tax" | "reimbursement"
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

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

  const filteredData = getRawData().filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(item).some(
      (val) => typeof val === "string" && val.toLowerCase().includes(q)
    );
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Finance Management History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Finance Management History
        </h2>
        <p className="text-sm text-slate-500">
          All paid records across procurement, taxes, and reimbursements.
        </p>
      </div>

      {/* ── Tabs (Procurement Payables / Tax Compliance Record / Reimbursement) ─ */}
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-semibold">
        <button
          onClick={() => { setActiveTab("procurement"); setCurrentPage(1); }}
          className={`pb-3 transition relative cursor-pointer ${
            activeTab === "procurement"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Procurement Payables
        </button>

        <button
          onClick={() => { setActiveTab("tax"); setCurrentPage(1); }}
          className={`pb-3 transition relative cursor-pointer ${
            activeTab === "tax"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Tax Compliance Record
        </button>

        <button
          onClick={() => { setActiveTab("reimbursement"); setCurrentPage(1); }}
          className={`pb-3 transition relative cursor-pointer ${
            activeTab === "reimbursement"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Reimbursement
        </button>
      </div>

      {/* ── Search Bar & Generate Financial Reports Action ───────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder={getPlaceholder()}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center justify-center gap-2 bg-[#0B5D1E] hover:bg-[#094d19] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <FileText size={15} /> Generate Financial Reports
        </button>
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {/* TAB 1: Procurement Payables Table (Screenshot 3) */}
          {activeTab === "procurement" && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Batch No.</th>
                  <th className="px-5 py-4 text-left">Branch</th>
                  <th className="px-5 py-4 text-left">Supplier</th>
                  <th className="px-5 py-4 text-left">Variant</th>
                  <th className="px-5 py-4 text-left">Stock Qty (KG)</th>
                  <th className="px-5 py-4 text-left">Unit Price</th>
                  <th className="px-5 py-4 text-left">Total</th>
                  <th className="px-5 py-4 text-left">Paid By</th>
                  <th className="px-5 py-4 text-left">Paid At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-gray-700">{row.batchNo}</td>
                    <td className="px-5 py-4 text-gray-700">{row.branch}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{row.supplier}</td>
                    <td className="px-5 py-4 text-gray-800">{row.variant}</td>
                    <td className="px-5 py-4 text-gray-700">{row.stockQty}</td>
                    <td className="px-5 py-4 text-gray-700">{row.unitPrice}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{row.total}</td>
                    <td className="px-5 py-4 text-gray-600">{row.paidBy}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{row.paidAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 2: Tax Compliance Record Table (Screenshot 2) */}
          {activeTab === "tax" && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Name of Tax</th>
                  <th className="px-5 py-4 text-left">Description</th>
                  <th className="px-5 py-4 text-left">Cost Value</th>
                  <th className="px-5 py-4 text-center">Tax Period</th>
                  <th className="px-5 py-4 text-left">Paid By</th>
                  <th className="px-5 py-4 text-left">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-bold text-gray-900">{row.nameOfTax}</td>
                    <td className="px-5 py-4 text-gray-600 max-w-sm truncate">{row.description}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{row.costValue}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${PERIOD_STYLES[row.taxPeriod]}`}>
                        {row.taxPeriod}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{row.paidBy}</td>
                    <td className="px-5 py-4 text-gray-500 text-xs">{row.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB 3: Reimbursement Table (Screenshot 1) */}
          {activeTab === "reimbursement" && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4 text-left">Expense Category</th>
                  <th className="px-5 py-4 text-left">Description</th>
                  <th className="px-5 py-4 text-left">Cost</th>
                  <th className="px-5 py-4 text-left">Requested By</th>
                  <th className="px-5 py-4 text-left">Paid By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold ${CATEGORY_STYLES[row.categoryType] || "bg-gray-100 text-gray-700"}`}>
                        {row.category}
                      </span>
                      <p className="text-[11px] text-gray-400 mt-1">{row.date}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-700 font-medium">{row.description}</td>
                    <td className="px-5 py-4 font-bold text-gray-900">{row.cost}</td>
                    <td className="px-5 py-4 text-gray-700">{row.requestedBy}</td>
                    <td className="px-5 py-4 text-gray-600">{row.paidBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {paginatedData.length === 0 && (
            <div className="text-center py-12 text-sm text-gray-400">
              No financial records found matching your query.
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-slate-50/40">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} {activeTab === "tax" ? "tax" : "payment"} records
          </p>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 text-gray-400 rounded-lg text-xs disabled:opacity-40"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  currentPage === i + 1
                    ? "bg-[#0B5D1E] text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

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
                  <h3 className="font-bold text-gray-900 text-base">Generate Financial Statement</h3>
                  <p className="text-xs text-gray-500">Export audited warehouse finance summaries</p>
                </div>
              </div>
              <button
                onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Select Report Category</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white">
                  <option>Procurement Payables &amp; Supplier Invoices</option>
                  <option>Tax Compliance &amp; LGU Withholdings</option>
                  <option>Staff Reimbursements &amp; Payroll</option>
                  <option>Full Comprehensive Financial Statement</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Fiscal Reporting Period</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white">
                  <option>Current Fiscal Month (August 2026)</option>
                  <option>Q3 2026 (July - September)</option>
                  <option>Year-to-Date (YTD 2026)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="py-2 border border-emerald-600 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
                    PDF Statement
                  </button>
                  <button type="button" className="py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50">
                    CSV / Excel
                  </button>
                </div>
              </div>
            </div>

            {reportGenerated ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} /> Financial statement generated! Download initiated.
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowReportModal(false); setReportGenerated(false); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
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
                className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
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
