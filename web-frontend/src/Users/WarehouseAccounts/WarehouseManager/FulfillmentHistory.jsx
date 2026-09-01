import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, PackageCheck, Eye } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

/* ── Table Column Configurations for SectionedTableCard ───────────────────────── */
const TABLE_COLUMNS = [
  { key: "variant", label: "Variant", width: "22%" },
  { key: "branch", label: "Branch", width: "24%" },
  { key: "customerName", label: "Customer Name", width: "24%" },
  { key: "delivered", label: "Delivered (kg)", width: "20%" },
  { key: "action", label: "Action", width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

/* ── Mock Data ───────────────────────────────────────────────────────────────── */
const MOCK_RECORDS = Array.from({ length: 12 }).map((_, i) => ({
  id: `FL-${2026001 + i}`,
  variant: "Dinorado",
  branch: "Warehouse ABC",
  customerName: "Retailer A",
  delivered: "400 kg",
  passedQC: "300 kg",
  failedQC: "100 kg",
  batchNo: "Batch 2026-001",
  driver: "Driver A",
  date: "Aug 29, 2026",
}));

export default function FulfillmentHistory() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Format and filter sectioned data for SectionedTableCard
  const filteredSections = useMemo(() => {
    const list = MOCK_RECORDS.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.variant.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.batchNo.toLowerCase().includes(q)
      );
    });

    const formattedRows = list.map((row) => ({
      ...row,
      variant: row.variant,
      branch: row.branch,
      customerName: row.customerName,
      delivered: row.delivered,
      action: (
        <button
          type="button"
          onClick={() => setSelectedRecord(row)}
          className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition inline-flex items-center gap-1 text-xs cursor-pointer"
          title="View Details"
        >
          <Eye size={15} />
          <span>View</span>
        </button>
      ),
    }));

    return [{ rows: formattedRows }];
  }, [search]);

  const TOTAL_PAGES = Math.max(1, Math.ceil(MOCK_RECORDS.length / 10));

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

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search order no., batch no., product, or customer"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Shared SectionedTableCard Component ─────────────────────────────── */}
      <SectionedTableCard
        columns={TABLE_COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing fulfillment records — Page ${currentPage} of ${TOTAL_PAGES}`}
      />

      {/* ── Fulfillment Details Modal (Portaled to document.body) ──────────────── */}
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
                    <h3 className="font-normal text-gray-900 text-base">Fulfillment Record</h3>
                    <p className="text-xs text-gray-500">{selectedRecord.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Facility Branch:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Client:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Number:</span>
                  <span className="font-normal text-gray-800">{selectedRecord.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rice Variant:</span>
                  <span className="font-normal text-gray-900">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dispatched Driver:</span>
                  <span className="font-normal text-gray-800">{selectedRecord.driver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Date:</span>
                  <span className="font-normal text-gray-700">{selectedRecord.date}</span>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-normal">Total Delivered:</span>
                    <span className="font-normal text-gray-900 text-sm">{selectedRecord.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-normal">Passed Quality Inspection:</span>
                    <span className="font-normal text-emerald-700">{selectedRecord.passedQC}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-normal">Failed QC (Rejected/Returned):</span>
                    <span className="font-normal text-rose-600">{selectedRecord.failedQC}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-normal text-xs rounded-xl transition cursor-pointer"
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