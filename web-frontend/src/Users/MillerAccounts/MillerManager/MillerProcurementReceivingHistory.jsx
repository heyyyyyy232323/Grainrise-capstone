import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const QC_STATUS_PILLS = {
  Partial: "bg-amber-100/90 text-amber-700",
  Passed: "bg-emerald-100/90 text-emerald-700",
  Failed: "bg-rose-100/90 text-rose-700",
};

const TABLE_COLUMNS = [
  { key: "batchNo", label: "Batch No.", width: "16%" },
  { key: "branch", label: "Branch", width: "16%" },
  { key: "supplier", label: "Supplier", width: "16%" },
  { key: "variant", label: "Variant", width: "14%" },
  { key: "qty", label: "Received Qty (kg)", width: "14%" },
  {
    key: "qcStatus",
    label: "QC Status",
    width: "10%",
    headerClassName: "text-center",
    cellClassName: "text-center",
    render: (row) => (
      <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${QC_STATUS_PILLS[row.qcStatus] || "bg-gray-100 text-gray-700"}`}>
        {row.qcStatus}
      </span>
    ),
  },
  {
    key: "action",
    label: "Action",
    width: "14%", // Increased from 10% to prevent text wrapping
    headerClassName: "text-center",
    cellClassName: "text-center",
    render: (row) => (
      <button
        type="button"
        onClick={() => row.onView?.(row)}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
      >
        View Details
      </button>
    ),
  },
];

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

export default function MillerProcurementReceivingHistory() {
  const [search, setSearch] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const filteredSections = useMemo(() => {
    return MOCK_SECTIONS.map((sec) => {
      const filteredRows = sec.rows.filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          const matchB = r.batchNo.toLowerCase().includes(q);
          const matchS = r.supplier.toLowerCase().includes(q);
          const matchV = r.variant.toLowerCase().includes(q);
          const matchBr = r.branch.toLowerCase().includes(q);
          if (!matchB && !matchS && !matchV && !matchBr) return false;
        }
        if (qcStatusFilter !== "all") {
          if (r.qcStatus.toLowerCase() !== qcStatusFilter.toLowerCase()) return false;
        }
        return true;
      });

      const formattedRows = filteredRows.map((row) => ({
        ...row,
        onView: (r) => setSelectedRecord(r),
      }));

      return {
        label: sec.label,
        rows: formattedRows,
      };
    }).filter((sec) => sec.rows.length > 0);
  }, [search, qcStatusFilter]);

  const TOTAL_PAGES = 4;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Procurement Receiving History" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Procurement Receiving History
        </h2>
        <p className="text-sm text-slate-500">
          Complete history of received deliveries after quality inspection.
        </p>
      </div>

      {/* ── Search Bar & Filter Controls ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch no., supplier, or product"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <div className="relative">
          <select
            value={qcStatusFilter}
            onChange={(e) => setQcStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
          >
            <option value="all">QC Status</option>
            <option value="Partial">Partial</option>
            <option value="Passed">Passed</option>
            <option value="Failed">Failed</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
          >
            <option value="newest">Sort By</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── SectionedTableCard Component ─────────────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-10 of 38 receiving records`}
      />

      {/* ── Inspection Detail Modal ─────────────────────────────────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Quality Inspection Report</h3>
                    <p className="text-xs text-gray-500">{selectedRecord.batchNo}</p>
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

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Warehouse Facility:</span>
                  <span className="font-bold">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grain Supplier:</span>
                  <span className="font-bold">{selectedRecord.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rice Variant:</span>
                  <span className="font-bold">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Storage Bay:</span>
                  <span className="font-bold">{selectedRecord.bay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">QC Inspector:</span>
                  <span className="font-bold">{selectedRecord.inspector}</span>
                </div>

                <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Intake Volume:</span>
                    <span className="font-bold text-slate-900">{selectedRecord.qty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-semibold">Passed Inspection:</span>
                    <span className="font-bold text-emerald-700">{selectedRecord.passedQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-semibold">Failed Inspection:</span>
                    <span className="font-bold text-rose-600">{selectedRecord.failedQty}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Final QC Status:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold ${QC_STATUS_PILLS[selectedRecord.qcStatus]}`}>
                      {selectedRecord.qcStatus}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Close Inspection Details
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
