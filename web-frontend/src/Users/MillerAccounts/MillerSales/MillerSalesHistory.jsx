import { useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TABS = [
  { id: "in-store", label: "In-Store Transactions" },
  { id: "online", label: "Online Orders Transactions" },
];

const SORT_OPTIONS = [
  { value: "variant-asc",  label: "Variant (A-Z)"                },
  { value: "code-asc",     label: "Product Code (A-Z)"           },
  { value: "qty-asc",      label: "Stock Quantity (Low to High)" },
  { value: "exp-asc",      label: "Expiration Date (Nearest)"    },
];

const COLUMNS = [
  { key: "time", label: "Transaction Time", width: "16%" },
  { key: "variant", label: "Variant", width: "16%" },
  { key: "quantity", label: "Quantity", width: "14%" },
  { key: "totalPayment", label: "Total Payment", width: "16%" },
  { key: "amountPaid", label: "Amount Paid", width: "14%" },
  { key: "change", label: "Change", width: "12%" },
  { key: "action", label: "ACTION", width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "t1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "t2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "t3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "y1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "y2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "y3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "y4", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "j1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "j2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
      { id: "j3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5K", amountPaid: "₱23K", change: "₱500" },
    ],
  },
];

const ONLINE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "o1", time: "10:05 AM", variant: "Sinandomeng", quantity: "320 kg", totalPayment: "₱18.5K", amountPaid: "₱20K", change: "₱1.5K" },
      { id: "o2", time: "09:30 AM", variant: "Sinandomeng", quantity: "160 kg", totalPayment: "₱9.2K", amountPaid: "₱10K", change: "₱800" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "o3", time: "03:00 PM", variant: "Dinorado", quantity: "200 kg", totalPayment: "₱11.5K", amountPaid: "₱12K", change: "₱500" },
    ],
  },
];

const MillerSalesHistory = () => {
  const [activeTab, setActiveTab] = useState("in-store");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 26;

  const sections = activeTab === "in-store" ? IN_STORE_SECTIONS : ONLINE_SECTIONS;

  const filteredSections = sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          row.variant.toLowerCase().includes(q) ||
          row.quantity.toLowerCase().includes(q) ||
          row.totalPayment.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Sales", path: "/miller-sales/dashboard" },
          { label: "Sales History" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales History</h1>
        <p className="text-sm text-gray-500 mt-1">View completed in-store and online sales transactions.</p>
      </div>

      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={(id) => { setActiveTab(id); setCurrentPage(1); }} />

      {/* Filter Row */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <SearchFilter
              onSearch={setSearchQuery}
              placeholder="Search receipt no., variant, customer, or amount"
            />
          </div>
          <DateRangePicker onDateChange={() => {}} />
          <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
        </div>
      </div>

      {/* Transactions Table */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => console.log("View details:", row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing transactions — Page ${currentPage} of ${TOTAL_PAGES}`}
      />
    </>
  );
};

export default MillerSalesHistory;
