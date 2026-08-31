import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";
import ProductPlaceholder from "../../assets/Logo.png";

const TABS = [
  { id: "all", label: "All Records" },
  { id: "recent", label: "Recent Updates" },
];

const SORT_OPTIONS = [
  { value: "status-desc", label: "Status (Resolved first)" },
  { value: "status-asc", label: "Status (Pending first)" },
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
];

const COLUMNS = [
  {
    key: "variant",
    label: "Variant",
    render: (row) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 overflow-hidden rounded bg-gray-100 border border-gray-200">
          <img src={ProductPlaceholder} alt={row.variantTitle} className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900">{row.variantTitle}</p>
          <p className="text-[9px] text-gray-400 max-w-[120px] truncate">Premium rice, locally sourced specialty...</p>
        </div>
      </div>
    ),
  },
  { key: "warehouse", label: "Warehouse", render: (row) => <span className="text-gray-700 text-xs">{row.warehouse}</span> },
  { key: "quantity", label: "Quantity", render: (row) => <span className="font-medium text-gray-900 text-xs">{row.quantity}</span> },
  { key: "status", label: "Status", render: (row) => <span className="font-medium text-gray-700 text-xs">{row.status}</span> },
  {
    key: "action",
    label: "Action",
    render: (row) => (
      <div className="flex justify-end">
        <button
          onClick={() => console.log("View Details", row)}
          className="rounded-lg border border-gray-300 px-4 py-1 text-[10px] font-semibold text-gray-600 hover:bg-gray-50 transition"
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
      { id: 1, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 2, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 3, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: 4, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 5, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 6, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 7, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: 8, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 9, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
      { id: 10, variantTitle: "Dinorado", warehouse: "Warehouse ABC", quantity: "500 kg", status: "Resolved" },
    ],
  },
];

export default function RetailerProductReturns() {
  const [activeTab, setActiveTab] = useState("all");
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
          { label: "Support" },
          { label: "Product Returns Issue" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Product Returns & Issues</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your product return requests and reported issues.</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(id) => { setActiveTab(id); setCurrentPage(1); }} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={setSearchQuery} placeholder="Search variant, warehouse, or issue" />
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
        footerLabel={`Showing 1-${Math.min(10, totalRecords)} of 26 recent updates`}
      />
    </>
  );
}
