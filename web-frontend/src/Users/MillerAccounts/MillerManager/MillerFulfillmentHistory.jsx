import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Search, X, CheckCircle2, AlertTriangle, PackageCheck } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MOCK_FULFILLMENTS = Array.from({ length: 32 }, (_, i) => ({
  id: `ful-${i + 1}`,
  variant: "Dinorado",
  branch: "Warehouse ABC",
  customerName: "Retailer A",
  passedQc: "300 kg",
  failedQc: "100 kg",
  orderNo: `ORD-2026-00${i + 1}`,
  batchNo: `Batch 2026 - 00${(i % 9) + 1}`,
  deliveryDate: "Apr 22, 2026",
  driverName: "Juan Santos",
  truckPlate: "NBC-1234",
}));

export default function MillerFulfillmentHistory() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const columns = [
    { key: "variant", label: "Variant", width: "18%" },
    { key: "branch", label: "Branch", width: "22%" },
    { key: "customerName", label: "Customer Name", width: "20%" },
    { key: "passedQc", label: "Passed QC (kg)", width: "15%" },
    { key: "failedQc", label: "Failed QC (kg)", width: "10%" },
    {
      key: "action",
      label: "Action",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      render: (row) => (
        <button
          type="button"
          onClick={() => setSelectedRecord(row)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-[#0B5D1E] hover:bg-emerald-50/30 hover:text-[#0B5D1E] cursor-pointer"
        >
          View Details
        </button>
      ),
    },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_FULFILLMENTS.filter(
      (f) =>
        q === "" ||
        f.variant.toLowerCase().includes(q) ||
        f.branch.toLowerCase().includes(q) ||
        f.customerName.toLowerCase().includes(q) ||
        f.orderNo.toLowerCase().includes(q) ||
        f.batchNo.toLowerCase().includes(q)
    );
  }, [search]);

  const itemsPerPage = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Fulfillment History" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Fulfillment History
        </h2>
        <p className="text-sm text-slate-500">
          View completed fulfillment and delivery records.
        </p>
      </div>

      {/* ── Search Filter ────────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Search order no., batch no., product, or customer"
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
        />
      </div>

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={tableSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing ${totalCount === 0 ? 0 : startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} fulfillment records`}
      />

      {/* ── View Details Modal ──────────────────────────────────────────────── */}
      {selectedRecord &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
                    <PackageCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{selectedRecord.orderNo}</h3>
                    <p className="text-xs text-gray-500">Delivery Fulfillment Summary</p>
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

              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Product Variant</span>
                  <span className="font-bold">{selectedRecord.variant}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Dispatch Branch</span>
                  <span className="font-bold">{selectedRecord.branch}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Recipient Customer</span>
                  <span className="font-bold">{selectedRecord.customerName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Batch Code</span>
                  <span className="font-bold">{selectedRecord.batchNo}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Passed Quality Check</span>
                  <span className="font-bold text-emerald-700">{selectedRecord.passedQc}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Failed / Rejected QC</span>
                  <span className="font-bold text-rose-600">{selectedRecord.failedQc}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Assigned Driver</span>
                  <span className="font-bold">{selectedRecord.driverName} ({selectedRecord.truckPlate})</span>
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
    </div>
  );
}
