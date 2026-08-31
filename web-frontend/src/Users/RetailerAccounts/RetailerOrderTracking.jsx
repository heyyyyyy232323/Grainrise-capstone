import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../Components/Minor-Components/Dropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "preparing", label: "Preparing for Delivery" },
  { value: "transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
];

const WAREHOUSE_OPTIONS = [
  { value: "all", label: "All Warehouses" },
  { value: "warehouse-abc", label: "Warehouse ABC" },
];

const COLUMNS = [
  {
    key: "variant",
    label: "Variant",
    render: (row) => (
      <div>
        <p className="text-[13px] font-bold text-gray-900">{row.variant}</p>
        <p className="text-[10px] text-gray-500">{row.batch}</p>
      </div>
    ),
  },
  { key: "warehouse", label: "Warehouse", render: (row) => <span className="text-gray-700 text-[13px]">{row.warehouse}</span> },
  { key: "orderNo", label: "Order No.", render: (row) => <span className="text-gray-900 font-medium text-[13px]">{row.orderNo}</span> },
  { key: "quantity", label: "Quantity", render: (row) => <span className="font-medium text-gray-900 text-[13px]">{row.quantity}</span> },
  { key: "totalPrice", label: "Total Price", render: (row) => <span className="font-medium text-gray-900 text-[13px]">{row.totalPrice}</span> },
  {
    key: "status",
    label: "Status",
    render: (row) => (
      <span className="inline-flex rounded-full px-3 py-1 text-[10px] font-bold capitalize bg-orange-100 text-orange-700">
        {row.status}
      </span>
    ),
  },
  {
    key: "action",
    label: "Action",
    headerClassName: "text-center",
    cellClassName: "text-center",
    render: (row) => (
      <div className="flex items-center justify-center">
        <button
          onClick={() => console.log("View Details", row)}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
        >
          View Details
        </button>
      </div>
    ),
  },
];

const MOCK_ROWS = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  variant: "Dinorado",
  batch: "Batch 2026 - 001",
  warehouse: "Warehouse ABC",
  orderNo: "WR - 001",
  quantity: "100 kg",
  totalPrice: "₱1,500.00",
  status: "Preparing for Delivery",
}));

export default function RetailerOrderTracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 2;

  const filteredRows = MOCK_ROWS.filter((row) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!row.orderNo.toLowerCase().includes(q) && !row.variant.toLowerCase().includes(q) && !row.warehouse.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const sections = [{ rows: filteredRows }];

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Orders" },
          { label: "Order Tracking" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Tracking</h1>
        <p className="text-sm text-gray-500 mt-1">Track every marketplace order from placement to delivery.</p>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="flex-1 min-w-0 max-w-sm">
            <SearchFilter onSearch={setSearchQuery} placeholder="Search order number, product, or warehouse" />
          </div>
          <div className="flex-none w-32">
            <Dropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} placeholder="Status" />
          </div>
          <div className="flex-none w-40">
            <Dropdown value={warehouseFilter} onChange={setWarehouseFilter} options={WAREHOUSE_OPTIONS} placeholder="Warehouses" />
          </div>
        </div>
      </div>

      <SectionedTableCard
        columns={COLUMNS}
        sections={sections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-10 of 20 orders`}
      />
    </>
  );
}
