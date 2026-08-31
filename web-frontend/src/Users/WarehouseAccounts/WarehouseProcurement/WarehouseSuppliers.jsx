import { useState } from "react";
import { Search, ChevronDown, Star } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const WarehouseSuppliers = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 5;

  // Mock Data
  const columns = [
    { key: "supplier", label: "Supplier" },
    { key: "productType", label: "Product Type" },
    { key: "lastDelivery", label: "Last Delivery" },
    {
      key: "rating",
      label: "Avg Rating",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Star size={14} className="fill-amber-400 text-amber-400" />
          <span className="text-sm font-medium text-gray-700">{row.rating}</span>
        </div>
      ),
    },
    { key: "status", label: "Status" },
    {
      key: "action",
      label: "Action",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-[11px] font-bold text-gray-600 transition hover:bg-gray-50 cursor-pointer"
          >
            View Details
          </button>
        </div>
      ),
    },
  ];

  const rawRows = Array(10).fill({
    supplier: "Supplier A",
    productType: "Well-Milled Rice",
    lastDelivery: "Apr 06, 2026",
    rating: "4.8 (23)",
    status: "Active",
  });

  const rows = rawRows.map((r, i) => ({ id: i, ...r }));

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Master Data", path: "/warehouse-procurement/suppliers" },
          { label: "Suppliers" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Supplier Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse and evaluate registered suppliers for procurement transactions.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center">
        <div className="relative flex-1 max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search supplier, company, or product"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors">
            Status
            <ChevronDown size={16} className="text-gray-500" />
          </button>
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors">
            Product Type
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
        footerLabel="Showing 1-10 of 42 suppliers"
      />
    </>
  );
};

export default WarehouseSuppliers;
