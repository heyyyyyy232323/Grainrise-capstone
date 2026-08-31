import { useState } from "react";
import { X, Receipt, CheckCircle, Clock, CreditCard, Banknote } from "lucide-react";
import Breadcrumbs from "../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../Components/Minor-Components/SectionedTableCard";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

const COLUMNS = [
  { key: "time", label: "Transaction Time", width: "22%" },
  { key: "variant", label: "Variant", width: "22%" },
  { key: "quantity", label: "Quantity", width: "20%" },
  { key: "totalPayment", label: "Total Payment", width: "20%" },
  { key: "action", label: "Action", width: "16%", headerClassName: "text-center", cellClassName: "text-center" },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "t1", receiptNo: "REC-2026-0831", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 01" },
      { id: "t2", receiptNo: "REC-2026-0830", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 02" },
      { id: "t3", receiptNo: "REC-2026-0829", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Card", status: "Completed", cashier: "Cashier 01" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "y1", receiptNo: "REC-2026-0828", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 01" },
      { id: "y2", receiptNo: "REC-2026-0827", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 03" },
      { id: "y3", receiptNo: "REC-2026-0826", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Card", status: "Completed", cashier: "Cashier 01" },
      { id: "y4", receiptNo: "REC-2026-0825", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 02" },
    ],
  },
  {
    label: "July 16, 2026",
    rows: [
      { id: "j1", receiptNo: "REC-2026-0716", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 01" },
      { id: "j2", receiptNo: "REC-2026-0715", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Cash", status: "Completed", cashier: "Cashier 02" },
      { id: "j3", receiptNo: "REC-2026-0714", time: "11:45 AM", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", paymentMethod: "Card", status: "Completed", cashier: "Cashier 01" },
    ],
  },
];

const RetailerSalesHistory = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
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
          row.totalPayment.toLowerCase().includes(q) ||
          (row.receiptNo && row.receiptNo.toLowerCase().includes(q))
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
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-full max-w-sm">
          <SearchFilter
            onSearch={setSearchQuery}
            placeholder="Search receipt no., variant, customer, or amount"
          />
        </div>
        <DateRangePicker onDateChange={() => {}} />
        <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>

      {/* Transactions Table */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={TOTAL_PAGES}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => setSelectedTransaction(row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing 1-10 of 256 transactions`}
      />

      {/* Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Transaction Details</h3>
                  <p className="text-xs text-gray-500">{selectedTransaction.receiptNo || "REC-2026-0831"}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl text-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span>Time:</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  <Clock size={13} className="text-gray-400" /> {selectedTransaction.time}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Rice Variant:</span>
                <span className="font-semibold text-gray-900">{selectedTransaction.variant}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Quantity Sold:</span>
                <span className="font-semibold text-gray-900">{selectedTransaction.quantity}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Payment Method:</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  {selectedTransaction.paymentMethod === "Cash" ? <Banknote size={14} className="text-green-600" /> : <CreditCard size={14} className="text-blue-600" />}
                  {selectedTransaction.paymentMethod || "Cash"}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle size={12} /> {selectedTransaction.status || "Completed"}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Total Payment:</span>
                  <span className="font-bold text-gray-900 text-base">{selectedTransaction.totalPayment}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTransaction(null)}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default RetailerSalesHistory;