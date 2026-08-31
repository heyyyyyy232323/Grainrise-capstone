import { useState } from "react";
import { createPortal } from "react-dom";
import { Search, X, PackageCheck } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";

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

  const filtered = MOCK_RECORDS.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.variant.toLowerCase().includes(q) ||
      r.branch.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.batchNo.toLowerCase().includes(q)
    );
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Fulfillment History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Fulfillment History
        </h2>
        <p className="text-sm text-slate-500">
          View completed fulfillment and delivery records.
        </p>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Search order no., batch no., product, or customer"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white placeholder-gray-400 text-gray-700"
        />
      </div>

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 text-left">Variant</th>
                <th className="px-6 py-4 text-left">Branch</th>
                <th className="px-6 py-4 text-left">Customer Name</th>
                <th className="px-6 py-4 text-left">Delivered (kg)</th>
                <th className="px-6 py-4 text-left">Passed QC (kg)</th>
                <th className="px-6 py-4 text-left">Failed QC (kg)</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{row.variant}</td>
                  <td className="px-6 py-4 text-gray-600">{row.branch}</td>
                  <td className="px-6 py-4 text-gray-800 font-medium">{row.customerName}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{row.delivered}</td>
                  <td className="px-6 py-4 font-bold text-emerald-700">{row.passedQC}</td>
                  <td className="px-6 py-4 font-bold text-rose-600">{row.failedQC}</td>
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

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-gray-400">
                    No fulfillment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3.5 bg-slate-50/40">
          <p className="text-xs text-gray-500">
            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} fulfillment records
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

      {/* ── Fulfillment Details Modal (Portaled to document.body) ──────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Fulfillment Record</h3>
                    <p className="text-xs text-gray-500">{selectedRecord.id}</p>
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
                  <span className="text-gray-500">Facility Branch:</span>
                  <span className="font-bold text-gray-900">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Client:</span>
                  <span className="font-semibold text-gray-900">{selectedRecord.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Number:</span>
                  <span className="font-mono text-gray-800">{selectedRecord.batchNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rice Variant:</span>
                  <span className="font-semibold text-gray-900">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dispatched Driver:</span>
                  <span className="font-semibold text-gray-800">{selectedRecord.driver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Date:</span>
                  <span className="text-gray-700">{selectedRecord.date}</span>
                </div>

                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-semibold">Total Delivered:</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedRecord.delivered}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700 font-semibold">Passed Quality Inspection:</span>
                    <span className="font-bold text-emerald-700">{selectedRecord.passedQC}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-semibold">Failed QC (Rejected/Returned):</span>
                    <span className="font-bold text-rose-600">{selectedRecord.failedQC}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-semibold text-xs rounded-xl transition"
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