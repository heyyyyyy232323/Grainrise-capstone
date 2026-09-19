import { useState } from "react";
import { Search, Calendar, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const MillerReceivingOrders = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 6;

  // Mock Data
  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "qty", label: "Qty (kg)" },
    { key: "eta", label: "Expected Arrival" },
    { key: "status", label: "Status" },
    {
      key: "action",
      label: "Action",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            className="rounded-lg bg-[#1a7a3a] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#125c2a] sm:px-4 cursor-pointer"
          >
            Mark as Received
          </button>
        </div>
      ),
    },
  ];

  const rawRows = [
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "In Transit" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "Ready to Receive" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "In Transit" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "Ready to Receive" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "In Transit" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "Ready to Receive" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "In Transit" },
    { batchNo: "Batch 2026 - 001", supplier: "Supplier A", variant: "Dinorado", qty: "2,500 kg", eta: "Aug 2, 2026", status: "Ready to Receive" },
  ];

  const rows = rawRows.map((r, i) => ({ id: i, ...r }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/miller-procurement/receiving-orders" },
          { label: "Receiving Orders" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Receiving Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and manage incoming supplier deliveries awaiting miller receiving.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search batch no., supplier, or product"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors">
            Date Range
            <Calendar size={16} className="text-gray-500" />
          </button>
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors">
            Sort By
            <ChevronDown size={16} className="text-gray-500" />
          </button>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={[{ rows }]}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel="Showing 1-10 of 56 receiving orders"
      />
    </>
  );
};

export default MillerReceivingOrders;

