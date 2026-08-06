import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const WarehouseReturns = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 3;

  // Mock Data
  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "issue", label: "Issue Reported" },
    { key: "qty", label: "Quantity" },
    { key: "status", label: "Status" },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <button
          type="button"
          className="rounded-full border border-gray-300 px-4 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-50"
        >
          Process Return
        </button>
      ),
    },
  ];

  const rawRows = Array(6).fill({
    batchNo: "Batch 2026 - 002",
    supplier: "Supplier B",
    issue: "Damaged Packaging",
    qty: "50 kg",
    status: "Pending",
  });

  const rows = rawRows.map((r, i) => ({ id: i, ...r }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Operations", path: "/warehouse-procurement/returns" },
          { label: "Returns" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Returns</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage damaged or rejected goods returned to suppliers.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search batch no. or supplier"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors">
            Status
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
      />
    </>
  );
};

export default WarehouseReturns;
