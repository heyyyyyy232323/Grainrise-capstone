import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, Clock, Calendar, ChevronDown, Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Sort By" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

/* ── Columns for In-Store Transactions (Matches Image 2) ── */
const IN_STORE_COLUMNS = [
  { key: "time", label: "Transaction Time", width: "25%" },
  { key: "branch", label: "Branch", width: "25%" },
  { key: "variant", label: "Variant", width: "20%" },
  { key: "quantity", label: "Quantity", width: "18%" },
  {
    key: "action",
    label: "Action",
    width: "12%",
    headerClassName: "text-center",
    cellClassName: "text-center",
    renderCell: (row) => (
      <button
        type="button"
        onClick={() => row.onView?.(row)}
        className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-slate-50 cursor-pointer"
      >
        View Details
      </button>
    ),
  },
];

const IN_STORE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "ist-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-001" },
      { id: "ist-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-002" },
      { id: "ist-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-003" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "isy-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-004" },
      { id: "isy-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-005" },
      { id: "isy-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-006" },
      { id: "isy-4", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-007" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "isj-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-008" },
      { id: "isj-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-009" },
      { id: "isj-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-010" },
    ],
  },
];

/* ── Columns for Online Orders Transactions (Matches Image 1) ── */
const ONLINE_COLUMNS = [
  { key: "retailer", label: "Retailer", width: "16%" },
  { key: "branch", label: "Branch", width: "18%" },
  { key: "batchNo", label: "Batch No.", width: "18%" },
  { key: "variant", label: "Variant", width: "16%" },
  { key: "totalPrice", label: "Total Price", width: "12%", renderCell: (row) => <span className="font-bold text-gray-900">{row.totalPrice}</span> },
  {
    key: "deliveryStatus",
    label: "Delivery Status",
    width: "12%",
    headerClassName: "text-center",
    cellClassName: "text-center",
    renderCell: (row) => (
      <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        {row.deliveryStatus}
      </span>
    ),
  },
  {
    key: "action",
    label: "Action",
    width: "8%",
    headerClassName: "text-center",
    cellClassName: "text-center",
    renderCell: (row) => (
      <button
        type="button"
        onClick={() => row.onView?.(row)}
        className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-slate-50 cursor-pointer"
      >
        View Details
      </button>
    ),
  },
];

const ONLINE_SECTIONS = [
  {
    label: "Today",
    rows: [
      { id: "ont-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "ont-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "ont-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "ony-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "ony-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "ony-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "ony-4", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "onj-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "onj-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
      { id: "onj-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed" },
    ],
  },
];

export default function MillerSalesHistory() {
  const [activeTab, setActiveTab] = useState("online");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const rawSections = activeTab === "in-store" ? IN_STORE_SECTIONS : ONLINE_SECTIONS;
  const currentColumns = activeTab === "in-store" ? IN_STORE_COLUMNS : ONLINE_COLUMNS;
  const totalPages = activeTab === "in-store" ? 26 : 13;

  const filteredSections = useMemo(() => {
    return rawSections
      .map((section) => ({
        ...section,
        rows: section.rows
          .filter((row) => {
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
          })
          .map((row) => ({
            ...row,
            onView: (r) => setSelectedTransaction(r),
          })),
      }))
      .filter((section) => section.rows.length > 0);
  }, [rawSections, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Sales History" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Sales History
        </h2>
        <p className="text-sm text-slate-500">
          View completed in-store and online sales transactions.
        </p>
      </div>

      {/* ── Tabs (In-Store Transactions / Online Orders Transactions) ────────── */}
      <div className="flex items-center gap-6 border-b border-gray-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => { setActiveTab("in-store"); setCurrentPage(1); }}
          className={`pb-2.5 transition relative cursor-pointer ${
            activeTab === "in-store"
              ? "text-slate-900 border-b-2 border-[#0B5D1E] font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          In-Store Transactions
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("online"); setCurrentPage(1); }}
          className={`pb-2.5 transition relative cursor-pointer ${
            activeTab === "online"
              ? "text-slate-900 border-b-2 border-[#0B5D1E] font-bold"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Online Orders Transactions
        </button>
      </div>

      {/* ── Filter Row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search receipt no., variant, customer, or amount"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <span>Date Range</span>
          <Calendar size={14} className="text-gray-500" />
        </button>

        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:ring-1 focus:ring-[#0B5D1E] outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Transactions Table ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={currentColumns}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing 1-10 of ${activeTab === "in-store" ? "256" : "128"} transactions`}
      />

      {/* ── Transaction Details Modal ────────────────────────────────────────── */}
      {selectedTransaction &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0B5D1E] flex items-center justify-center">
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
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl text-xs text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch Facility:</span>
                  <span className="font-bold">{selectedTransaction.branch}</span>
                </div>
                {selectedTransaction.retailer && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Retailer Client:</span>
                    <span className="font-bold">{selectedTransaction.retailer}</span>
                  </div>
                )}
                {selectedTransaction.batchNo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Batch Number:</span>
                    <span className="font-bold">{selectedTransaction.batchNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Rice Variant:</span>
                  <span className="font-bold">{selectedTransaction.variant}</span>
                </div>
                {selectedTransaction.quantity && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Quantity Sold:</span>
                    <span className="font-bold">{selectedTransaction.quantity}</span>
                  </div>
                )}
                {selectedTransaction.time && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Time:</span>
                    <span className="font-bold flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" /> {selectedTransaction.time}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between">
                  <span className="text-slate-600 font-bold">Total Payment:</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    {selectedTransaction.totalPayment || selectedTransaction.totalPrice}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white font-semibold text-xs rounded-xl transition cursor-pointer"
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