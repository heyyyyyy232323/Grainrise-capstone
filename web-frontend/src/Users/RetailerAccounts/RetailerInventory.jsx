import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../Components/Minor-Components/Tabs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";
import CustomGreenButton from "../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../Components/Minor-Components/CustomRedButton";
import ProductPlaceholder from "../../assets/Logo.png"; // Using logo as a placeholder image

const TABS = [
  { id: "active", label: "Active" },
  { id: "archive", label: "Archive" },
];

const SORT_OPTIONS = [
  { value: "name-asc", label: "Variant (A-Z)" },
  { value: "name-desc", label: "Variant (Z-A)" },
  { value: "stock-desc", label: "Highest Stock" },
  { value: "stock-asc", label: "Lowest Stock" },
];

const getStatusStyle = (status) => {
  switch (status) {
    case "In Stock":
      return "bg-green-100 text-green-700";
    case "Low Stock":
      return "bg-amber-100 text-amber-700";
    case "Out of Stock":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const StatusPill = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold ${getStatusStyle(status)}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${status === 'In Stock' ? 'bg-green-500' : status === 'Low Stock' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
    {status}
  </span>
);

const MOCK_DATA = [
  { id: 1, variant: "Dinorado", code: "WR-001", expiration: "Oct 17, 2026", stock: 0, price: 1500, status: "Out of Stock", isArchived: false },
  { id: 2, variant: "Dinorado", code: "WR-001", expiration: "Oct 17, 2026", stock: 100, price: 1500, status: "Low Stock", isArchived: false },
  { id: 3, variant: "Dinorado", code: "WR-001", expiration: "Jul 24, 2026", stock: 100, price: 1500, status: "Low Stock", isArchived: false },
  { id: 4, variant: "Dinorado", code: "WR-001", expiration: "May 20, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: false },
  { id: 5, variant: "Dinorado", code: "WR-001", expiration: "May 25, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: false },
  { id: 6, variant: "Dinorado", code: "WR-001", expiration: "May 20, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: false },
  { id: 7, variant: "Dinorado", code: "WR-001", expiration: "May 20, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: false },
  { id: 8, variant: "Dinorado", code: "WR-001", expiration: "May 20, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: true },
  { id: 9, variant: "Dinorado", code: "WR-001", expiration: "May 20, 2027", stock: 2500, price: 1500, status: "In Stock", isArchived: true },
];

const RetailerInventory = () => {
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 3;

  const handleAction = (action, row) => {
    console.log(`${action} clicked for:`, row);
  };

  const COLUMNS = [
    {
      key: "variant",
      label: "Variant",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-md bg-gray-100 border border-gray-200">
            <img src={ProductPlaceholder} alt={row.variant} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{row.variant}</p>
            <p className="text-[10px] text-gray-400 max-w-[120px] truncate">Premium rice, locally sourced specialty...</p>
          </div>
        </div>
      ),
    },
    { key: "code", label: "Product Code", render: (row) => <span className="font-semibold text-gray-700">{row.code}</span> },
    {
      key: "expiration",
      label: "Expiration",
      render: (row) => (
        <span className={row.status === "Out of Stock" || row.status === "Low Stock" ? "text-gray-400" : "text-gray-600"}>
          Exp: {row.expiration}
        </span>
      ),
    },
    { key: "stock", label: "Stock Qty (kg)", render: (row) => <span className="font-medium text-gray-900">{row.stock} kg</span> },
    { key: "price", label: "Price", render: (row) => <span className="font-medium text-gray-900">₱{row.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span> },
    { key: "status", label: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {activeTab === "active" ? (
            <>
              <button onClick={() => handleAction("View Details", row)} className="rounded-lg border border-gray-300 px-4 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                View Details
              </button>
              <CustomAmberButton text="Archive" onClick={() => handleAction("Archive", row)} className="!rounded-lg !px-4 !py-1 !text-xs cursor-pointer" />
            </>
          ) : (
            <>
              <CustomGreenButton text="Restore" onClick={() => handleAction("Restore", row)} className="!rounded-lg !px-4 !py-1 !text-xs cursor-pointer" />
              <CustomRedButton text="Delete Permanently" onClick={() => handleAction("Delete Permanently", row)} className="!rounded-lg !px-4 !py-1 !text-xs cursor-pointer" />
            </>
          )}
        </div>
      ),
    },
  ];

  const filteredData = MOCK_DATA.filter((item) => {
    const matchesTab = activeTab === "active" ? !item.isArchived : item.isArchived;
    if (!matchesTab) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.variant.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Inventory", path: "/retailer/inventory" },
          { label: "Inventory" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your inventory and monitor stock levels.</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(id) => { setActiveTab(id); setCurrentPage(1); }} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={setSearchQuery} placeholder="Search product code, variant, or description" />
        </div>
        <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>

      {activeTab === "active" && (
        <div className="mb-4 flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-700">Legend:</span>
          <StatusPill status="In Stock" />
          <StatusPill status="Low Stock" />
          <StatusPill status="Out of Stock" />
        </div>
      )}

      <SectionedTableCard
        columns={COLUMNS}
        sections={[{ rows: filteredData }]}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-${Math.min(10, filteredData.length)} of ${filteredData.length} ${activeTab === "archive" ? "archived " : ""}products`}
      />
    </>
  );
};

export default RetailerInventory;
