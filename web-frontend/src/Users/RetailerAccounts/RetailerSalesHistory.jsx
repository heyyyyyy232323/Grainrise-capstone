import { useState } from "react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Highest Amount" },
  { value: "amount-asc", label: "Lowest Amount" },
];

const COLUMNS = [
  { key: "time", label: "Transaction Time", width: "16%" },
  { key: "variant", label: "Variant", width: "16%" },
  { key: "quantity", label: "Quantity", width: "14%" },
  { key: "totalPayment", label: "Total Payment", width: "16%" },
  { key: "amountPaid", label: "Amount Paid", width: "14%" },
  { key: "change", label: "Change", width: "12%" },
  { key: "action", label: "Action", width: "12%", headerClassName: "text-center", cellClassName: "text-center" },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "t1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "t2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "t3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "y1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "y2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "y3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "y4", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
    ],
  },
  {
    label: "July 16, 2026",
    rows: [
      { id: "j1", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "j2", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
      { id: "j3", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500" },
    ],
  },
];

const RetailerSalesHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const TOTAL_PAGES = 26;

  const filteredSections = IN_STORE_SECTIONS
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
          { label: "Sales", path: "/retailer/point-of-sale" },
          { label: "Sales History" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sales History</h1>
        <p className="text-sm text-gray-500 mt-1">View completed in-store transactions.</p>
      </div>

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
        footerLabel={`Showing 1-10 of 256 transactions`}
      />
    </>
  );
};

export default RetailerSalesHistory;
