import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
];

const COLUMNS = [
  {
    key: "variant",
    label: "Variant",
    render: (row) => (
      <div>
        <p className="text-[13px] font-bold text-gray-900">{row.variantTitle}</p>
        <p className="text-[10px] text-gray-500">{row.batch}</p>
      </div>
    ),
  },
  { key: "warehouse", label: "Warehouse", render: (row) => <span className="text-gray-700 text-[13px]">{row.warehouse}</span> },
  { key: "quantity", label: "Quantity", render: (row) => <span className="font-medium text-gray-900 text-[13px]">{row.quantity}</span> },
  { key: "failed", label: "Failed", render: (row) => <span className="font-medium text-red-500 text-[13px]">{row.failed}</span> },
  { key: "passed", label: "Passed", render: (row) => <span className="font-medium text-green-600 text-[13px]">{row.passed}</span> },
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

const MOCK_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: 1, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 2, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 3, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: 4, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 5, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 6, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 7, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: 8, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 9, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
      { id: 10, variantTitle: "Dinorado", batch: "Batch 2026 - 001", warehouse: "Warehouse ABC", quantity: "500 kg", failed: "100 kg", passed: "400 kg" },
    ],
  },
];

export default function RetailerMyPurchases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 3;

  const filteredSections = MOCK_SECTIONS.map((section) => ({
    ...section,
    rows: section.rows.filter((row) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return row.variantTitle.toLowerCase().includes(q) || row.warehouse.toLowerCase().includes(q);
    }),
  })).filter((section) => section.rows.length > 0);

  const totalRecords = filteredSections.reduce((acc, sec) => acc + sec.rows.length, 0);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Orders" },
          { label: "My Purchases" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Purchases</h1>
        <p className="text-sm text-gray-500 mt-1">All items received from warehouse orders.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={setSearchQuery} placeholder="Search product, batch number, or warehouse" />
        </div>
        <DateRangePicker onDateChange={() => {}} />
        <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>

      <SectionedTableCard
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-${Math.min(10, totalRecords)} of 24 purchases`}
      />
    </>
  );
}