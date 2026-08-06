import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const WarehouseGoodsReceipt = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  // Mock Data
  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "qty", label: "Stock Qty (kg)" },
    { key: "price", label: "Unit Price" },
    { key: "total", label: "Total Amount" },
    { key: "status", label: "Status" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          type="button"
          className="rounded-full bg-[#1a7a3a] px-4 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#125c2a]"
        >
          Generate
        </button>
      ),
    },
  ];

  const rawRows = Array(10).fill({
    batchNo: "Batch 2026 - 001",
    supplier: "Supplier A",
    variant: "Dinorado",
    qty: "2,500 kg",
    price: "₱100",
    total: "₱250k",
    status: "Verified",
  });

  const rows = rawRows.map((r, i) => ({ id: i, ...r }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/warehouse-procurement/goods-receipt" },
          { label: "Goods Receipt" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Goods Receipt</h1>
        <p className="text-sm text-gray-500 mt-1">
          Verify received deliveries and generate payment requests.
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
            Status
            <ChevronDown size={16} className="text-gray-500" />
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
        footerLabel="Showing 1-10 of 96 verified deliveries"
      />
    </>
  );
};

export default WarehouseGoodsReceipt;
