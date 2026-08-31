import { useState } from "react";
import { Search, X, CheckCircle2, AlertTriangle, ShieldCheck, Download, Clock } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

const QC_STATUS_PILLS = {
  Partial: "bg-amber-100/90 text-amber-700 border border-amber-200",
  Passed: "bg-emerald-100/90 text-emerald-700 border border-emerald-200",
  Failed: "bg-rose-100/90 text-rose-700 border border-rose-200",
};

const MOCK_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "rcv-t1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "15,000 kg", failedQty: "5,000 kg", bay: "Bay A-1", inspector: "Inspector Cruz" },
      { id: "rcv-t2", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay A-2", inspector: "Inspector Cruz" },
      { id: "rcv-t3", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "rcv-y1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "16,000 kg", failedQty: "4,000 kg", bay: "Bay B-1", inspector: "Inspector Cruz" },
      { id: "rcv-y2", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay B-2", inspector: "Inspector Cruz" },
      { id: "rcv-y3", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos" },
      { id: "rcv-y4", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay B-3", inspector: "Inspector Cruz" },
    ],
  },
  {
    label: "July 16, 2026",
    rows: [
      { id: "rcv-j1", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Partial", passedQty: "14,000 kg", failedQty: "6,000 kg", bay: "Bay C-1", inspector: "Inspector Cruz" },
      { id: "rcv-j2", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Passed", passedQty: "20,000 kg", failedQty: "0 kg", bay: "Bay C-2", inspector: "Inspector Santos" },
      { id: "rcv-j3", batchNo: "Batch 2026 - 001", branch: "Warehouse ABC", supplier: "Supplier A", variant: "Dinorado", qty: "20,000 kg", qcStatus: "Failed", passedQty: "0 kg", failedQty: "20,000 kg", bay: "Rejection Bay", inspector: "Inspector Santos" },
    ],
  },
];

export default function ProcurementReceivingHistory() {
  const [search, setSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState("QC Status");
  const [sortBy, setSortBy] = useState("Sort By");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredSections = MOCK_SECTIONS.map((sec) => ({
    ...sec,
    rows: sec.rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matchB = r.batchNo.toLowerCase().includes(q);
        const matchS = r.supplier.toLowerCase().includes(q);
        const matchV = r.variant.toLowerCase().includes(q);
        const matchBr = r.branch.toLowerCase().includes(q);
        if (!matchB && !matchS && !matchV && !matchBr) return false;
      }
      if (qcStatusFilter !== "QC Status" && qcStatusFilter !== "All") {
        if (r.qcStatus !== qcStatusFilter) return false;
      }
      return true;
    }),
  })).filter((sec) => sec.rows.length > 0);

  const totalFilteredRows = filteredSections.reduce((sum, s) => sum + s.rows.length, 0);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Procurement Receiving History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Procurement Receiving History
        </h2>
        <p className="text-sm text-slate-500">
          Complete history of received deliveries after quality inspection.
        </p>
      </div>

      {/* ── Search Bar & Filter Controls ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch no., supplier, or product"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <select
          value={qcStatusFilter}
          onChange={(e) => setQcStatusFilter(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 outline-none min-w-[120px]"
        >
          <option value="QC Status">QC Status</option>
          <option value="All">All Statuses</option>
          <option value="Partial">Partial</option>
          <option value="Passed">Passed</option>
          <option value="Failed">Failed</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3.5 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-600 outline-none min-w-[110px]"
        >
          <option value="Sort By">Sort By</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* ── Sectioned Table Card ─────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Batch No.</th>
                <th className="px-6 py-4 text-left">Branch</th>
                <th className="px-6 py-4 text-left">Supplier</th>
                <th className="px-6 py-4 text-left">Variant</th>
                <th className="px-6 py-4 text-left">Received Qty (kg)</th>
                <th className="px-6 py-4 text-center">QC Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSections.map((section, sIdx) => (
                <div key={sIdx} className="contents">
                  {/* Date Section Header */}
                  <tr className="bg-emerald-50/40 border-y border-emerald-100">
                    <td colSpan={7} className="px-6 py-2 text-xs font-bold text-emerald-800">
                      {section.label}
                    </td>
                  </tr>

                  {/* Section Rows */}
                  {section.rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60 border-b border-gray-100 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-700">{row.batchNo}</td>
                      <td className="px-6 py-4 text-gray-700">{row.branch}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{row.supplier}</td>
                      <td className="px-6 py-4 text-gray-800">{row.variant}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{row.qty}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold ${QC_STATUS_PILLS[row.qcStatus]}`}>
                          {row.qcStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedRecord(row)}
                          className="px-4 py-1.5 rounded-full border border-gray-300 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs font-semibold text-gray-600 transition cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </div>
              ))}

              {filteredSections.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                    No procurement receiving records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-slate-50/40">
          <p className="text-xs text-gray-500">
            Showing 1-10 of 38 receiving records
          </p>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 text-gray-400 rounded-lg text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${currentPage === 1 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 text-gray-700"}`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${currentPage === 2 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 text-gray-700"}`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${currentPage === 3 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 text-gray-700"}`}
            >
              3
            </button>
            <button
              onClick={() => setCurrentPage(4)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${currentPage === 4 ? "bg-[#0B5D1E] text-white" : "border border-gray-200 text-gray-700"}`}
            >
              4
            </button>
            <button
              disabled={currentPage === 4}
              onClick={() => setCurrentPage((p) => Math.min(4, p + 1))}
              className="px-3 py-1 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg text-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Receiving & QC Inspection Detail Modal ───────────────────────────── */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Quality Inspection Report</h3>
                  <p className="text-xs text-gray-500">{selectedRecord.batchNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Warehouse Facility:</span>
                <span className="font-bold text-gray-900">{selectedRecord.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Grain Supplier:</span>
                <span className="font-semibold text-gray-900">{selectedRecord.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rice Variant:</span>
                <span className="font-semibold text-gray-900">{selectedRecord.variant}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned Storage Bay:</span>
                <span className="font-semibold text-gray-800">{selectedRecord.bay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">QC Inspector:</span>
                <span className="font-medium text-gray-800">{selectedRecord.inspector}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-semibold">Total Intake Quantity:</span>
                  <span className="font-bold text-gray-900 text-sm">{selectedRecord.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-semibold">Passed Inspection (Accepted):</span>
                  <span className="font-bold text-emerald-700">{selectedRecord.passedQty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-600 font-semibold">Failed Inspection (Rejected):</span>
                  <span className="font-bold text-rose-600">{selectedRecord.failedQty}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500">Final QC Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold ${QC_STATUS_PILLS[selectedRecord.qcStatus]}`}>
                    {selectedRecord.qcStatus}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Close Inspection Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
