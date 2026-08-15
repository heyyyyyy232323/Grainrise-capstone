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
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Highest Amount" },
  { value: "amount-asc", label: "Lowest Amount" },
];

const COLUMNS = [
  { key: "time", label: "Transaction Time" },
  { key: "variant", label: "Variant" },
  { key: "quantity", label: "Quantity" },
  { key: "totalPayment", label: "Total Payment" },
  { key: "amountPaid", label: "Amount Paid" },
  { key: "change", label: "Change" },
  { key: "action", label: "ACTION" },
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
      <div className="-mx-4 md:mx-0 mb-4">
        <div className="px-4 md:px-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-1/2">
              <div className="flex gap-3 items-center">
                <div className="flex-1 min-w-0 max-w-3xl">
                  <SearchFilter
                    onSearch={setSearchQuery}
                    placeholder="Search receipt no., variant, customer, or amount"
                  />
                </div>
                <div className="flex-none">
                  <DateRangePicker onDateChange={() => {}} />
                </div>
                <div className="flex-none">
                  <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
                </div>
              </div>
            </div>
          </div>
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
