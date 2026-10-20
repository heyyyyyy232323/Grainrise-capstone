import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const WarehouseGoodsReceipt = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 10;

  // Mock Data matching Figma design
  const columns = [
    {
      key: "batchNo",
      label: "Batch No.",
      width: "16%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.batchNo}
        </span>
      ),
    },
    {
      key: "supplier",
      label: "Supplier",
      width: "16%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.supplier}
        </span>
      ),
    },
    {
      key: "variant",
      label: "Variant",
      width: "14%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.variant}
        </span>
      ),
    },
    {
      key: "qty",
      label: "Stock Qty (kg)",
      width: "14%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.qty}
        </span>
      ),
    },
    {
      key: "price",
      label: "Unit Price",
      width: "12%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.price}
        </span>
      ),
    },
    {
      key: "total",
      label: "Total Amount",
      width: "12%",
      render: (row) => (
        <span className="text-[13px] font-normal text-slate-800">
          {row.total}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "8%",
      cellClassName: "text-center",
      render: (row) => (
        <div className="flex justify-center">
          <span className="inline-flex items-center justify-center min-w-[68px] px-3 py-0.5 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
            {row.status}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "8%",
      cellClassName: "text-center",
      render: () => (
        <div className="flex items-center justify-center">
          <button
            type="button"
            className="rounded-full bg-[#15803D] hover:bg-[#166534] text-white px-4 py-1 text-xs font-medium shadow-none transition cursor-pointer"
          >
            Generate
          </button>
        </div>
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
          { label: "Operations" },
          { label: "Goods Receipt" },
        ]}
      />

      <div className="mt-2 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Goods Receipt
        </h1>
        <p className="mt-1 text-xs text-gray-500 font-normal">
          Verify received deliveries and generate payment requests.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative w-full max-w-sm">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search batch no., supplier, or product"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-xs text-gray-700 placeholder-gray-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 cursor-pointer"
          >
            Status
            <ChevronDown size={14} className="text-gray-500" />
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 cursor-pointer"
          >
            Sort By
            <ChevronDown size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={[{ rows }]}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(page) => setCurrentPage(page)}
        footerLabel="Showing 1–10 of 96 verified deliveries"
      />
    </>
  );
};

export default WarehouseGoodsReceipt;
