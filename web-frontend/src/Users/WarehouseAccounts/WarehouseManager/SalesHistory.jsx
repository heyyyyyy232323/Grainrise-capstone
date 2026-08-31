import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, Clock } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

/* ── Columns for In-Store Transactions ────────────────────────── */
const IN_STORE_COLUMNS = [
  { key: "time", label: "Transaction Time", width: "16%" },
  { key: "branch", label: "Branch", width: "16%" },
  { key: "variant", label: "Variant", width: "14%" },
  { key: "quantity", label: "Quantity", width: "12%" },
  { key: "totalPayment", label: "Total Payment", width: "14%" },
  { key: "amountPaid", label: "Amount Paid", width: "12%" },
  { key: "change", label: "Change", width: "10%" },
  { key: "action", label: "Action", width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "ist-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-001" },
      { id: "ist-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-002" },
      { id: "ist-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-003" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "isy-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-004" },
      { id: "isy-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-005" },
      { id: "isy-3", time: "11:45 AM", variant: "Dinorado", branch: "Warehouse ABC", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-006" },
      { id: "isy-4", time: "11:45 AM", variant: "Dinorado", branch: "Warehouse ABC", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-007" },
    ],
  },
  {
    label: "July 16, 2026",
    rows: [
      { id: "isj-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-008" },
      { id: "isj-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-009" },
      { id: "isj-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", amountPaid: "₱23k", change: "₱500", receiptNo: "REC-2026-010" },
    ],
  },
];

/* ── Columns for Online Orders Transactions ────────────────────── */
const ONLINE_COLUMNS = [
  { key: "retailer", label: "Retailer", width: "16%" },
  { key: "branch", label: "Branch", width: "16%" },
  { key: "batchNo", label: "Batch No.", width: "14%", render: (row) => <span className="font-mono text-xs text-gray-700">{row.batchNo}</span> },
  { key: "variant", label: "Variant", width: "14%" },
  { key: "totalPrice", label: "Total Price", width: "12%", render: (row) => <span className="font-bold text-gray-900">{row.totalPrice}</span> },
  {
    key: "paymentStatus",
    label: "Payment Status",
    width: "14%",
    render: (row) => (
      <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
        {row.paymentStatus}
      </span>
    ),
  },
  {
    key: "deliveryStatus",
    label: "Delivery Status",
    width: "14%",
    render: (row) => (
      <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-200">
        {row.deliveryStatus}
      </span>
    ),
  },
  { key: "action", label: "Action", width: "10%", headerClassName: "text-center", cellClassName: "text-center" },
];

const ONLINE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "ont-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "ont-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "ont-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "ony-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "ony-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "ony-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "ony-4", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
    ],
  },
  {
    label: "July 16, 2026",
    rows: [
      { id: "onj-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "onj-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
      { id: "onj-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", paymentStatus: "Paid", deliveryStatus: "Completed" },
    ],
  },
];

export default function WarehouseManagerSalesHistory() {
  const [activeTab, setActiveTab] = useState("in-store"); // "in-store" | "online"
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const rawSections = activeTab === "in-store" ? IN_STORE_SECTIONS : ONLINE_SECTIONS;
  const currentColumns = activeTab === "in-store" ? IN_STORE_COLUMNS : ONLINE_COLUMNS;
  const totalPages = activeTab === "in-store" ? 26 : 13;

  const filteredSections = rawSections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          row.variant?.toLowerCase().includes(q) ||
          row.branch?.toLowerCase().includes(q) ||
          row.retailer?.toLowerCase().includes(q) ||
          row.batchNo?.toLowerCase().includes(q) ||
          row.totalPayment?.toLowerCase().includes(q) ||
          row.totalPrice?.toLowerCase().includes(q)
        );
      }),
    }))
    .filter((section) => section.rows.length > 0);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Sales History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Sales History
        </h2>
        <p className="text-sm text-slate-500">
          View completed in-store and online sales transactions.
        </p>
      </div>

      {/* ── Tabs (In-Store Transactions / Online Orders Transactions) ────────── */}
      <div className="flex items-center gap-6 border-b border-gray-200 text-sm font-semibold">
        <button
          onClick={() => { setActiveTab("in-store"); setCurrentPage(1); }}
          className={`pb-3 transition relative cursor-pointer ${
            activeTab === "in-store"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          In-Store Transactions
        </button>

        <button
          onClick={() => { setActiveTab("online"); setCurrentPage(1); }}
          className={`pb-3 transition relative cursor-pointer ${
            activeTab === "online"
              ? "text-gray-900 border-b-2 border-emerald-700 font-bold"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          Online Orders Transactions
        </button>
      </div>

      {/* ── Filter Row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchFilter
            onSearch={setSearchQuery}
            placeholder="Search receipt no., variant, customer, or amount"
          />
        </div>
        <DateRangePicker onDateChange={() => {}} />
        <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>

      {/* ── Transactions Table ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={currentColumns}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onViewDetails={(row) => setSelectedTransaction(row)}
        viewDetailsLabel="View Details"
        footerLabel={`Showing 1-10 of ${activeTab === "in-store" ? "256" : "128"} transactions`}
      />

      {/* ── Transaction Details Modal (Portaled to document.body) ────────────── */}
      {selectedTransaction &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Transaction Details</h3>
                    <p className="text-xs text-gray-500">
                      {activeTab === "in-store" ? "In-Store Point of Sale" : "Online Marketplace Order"}
                    </p>
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
                  <span>Branch:</span>
                  <span className="font-semibold text-gray-900">{selectedTransaction.branch}</span>
                </div>
                {selectedTransaction.retailer && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Retailer Client:</span>
                    <span className="font-semibold text-gray-900">{selectedTransaction.retailer}</span>
                  </div>
                )}
                {selectedTransaction.batchNo && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Batch Number:</span>
                    <span className="font-mono text-xs font-semibold text-gray-900">
                      {selectedTransaction.batchNo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-gray-600">
                  <span>Rice Variant:</span>
                  <span className="font-semibold text-gray-900">{selectedTransaction.variant}</span>
                </div>
                {selectedTransaction.quantity && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Quantity:</span>
                    <span className="font-semibold text-gray-900">{selectedTransaction.quantity}</span>
                  </div>
                )}
                {selectedTransaction.time && (
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Transaction Time:</span>
                    <span className="font-semibold text-gray-900 flex items-center gap-1">
                      <Clock size={13} className="text-gray-400" /> {selectedTransaction.time}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-3 space-y-1.5">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Total Payment:</span>
                    <span className="font-bold text-gray-900 text-base">
                      {selectedTransaction.totalPayment || selectedTransaction.totalPrice}
                    </span>
                  </div>
                  {selectedTransaction.amountPaid && (
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Amount Paid:</span>
                      <span className="font-semibold text-gray-900">{selectedTransaction.amountPaid}</span>
                    </div>
                  )}
                  {selectedTransaction.change && (
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Change Given:</span>
                      <span className="font-semibold text-emerald-700">{selectedTransaction.change}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition"
              >
                Close Details
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}