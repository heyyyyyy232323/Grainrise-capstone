import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Receipt, Clock, Calendar, ChevronDown, Search, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import Tabs from "../../../Components/Minor-Components/Tabs";

const SALES_TABS = [
  { id: "in-store", label: "In-Store Transactions" },
  { id: "online", label: "Online Orders Transactions" },
];

const SORT_OPTIONS = [
  { value: "date-desc", label: "Sort By" },
  { value: "date-asc", label: "Oldest First" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
];

/* ── Columns for In-Store Transactions ── */
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
      { id: "ist-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-001", isoDate: "2026-09-04" },
      { id: "ist-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-002", isoDate: "2026-09-04" },
      { id: "ist-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-003", isoDate: "2026-09-04" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "isy-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-004", isoDate: "2026-09-03" },
      { id: "isy-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-005", isoDate: "2026-09-03" },
      { id: "isy-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-006", isoDate: "2026-09-03" },
      { id: "isy-4", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-007", isoDate: "2026-09-03" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "isj-1", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-008", isoDate: "2026-07-18" },
      { id: "isj-2", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-009", isoDate: "2026-07-18" },
      { id: "isj-3", time: "11:45 AM", branch: "Warehouse ABC", variant: "Dinorado", quantity: "480 kg", totalPayment: "₱22.5k", receiptNo: "REC-2026-010", isoDate: "2026-07-18" },
    ],
  },
];

/* ── Columns for Online Orders Transactions ── */
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
      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
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
      { id: "ont-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-04" },
      { id: "ont-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-04" },
      { id: "ont-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-04" },
    ],
  },
  {
    label: "Yesterday",
    rows: [
      { id: "ony-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-03" },
      { id: "ony-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-03" },
      { id: "ony-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-03" },
      { id: "ony-4", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-09-03" },
    ],
  },
  {
    label: "July 18, 2026",
    rows: [
      { id: "onj-1", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-07-18" },
      { id: "onj-2", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-07-18" },
      { id: "onj-3", retailer: "Retailer A", branch: "Warehouse ABC", batchNo: "Batch 2026-001", variant: "Dinorado", totalPrice: "₱1,500", deliveryStatus: "Completed", isoDate: "2026-07-18" },
    ],
  },
];

export default function MillerSalesHistory() {
  const [activeTab, setActiveTab] = useState("in-store");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

  // Popover dismissal handling for Date Picker
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dateRef.current && !dateRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDateApply = () => {
    setDateRange(tempDateRange);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
  };

  const rawSections = activeTab === "in-store" ? IN_STORE_SECTIONS : ONLINE_SECTIONS;
  const currentColumns = activeTab === "in-store" ? IN_STORE_COLUMNS : ONLINE_COLUMNS;

  const filteredSections = useMemo(() => {
    return rawSections
      .map((section) => ({
        ...section,
        rows: section.rows
          .filter((row) => {
            // Search Filter
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const match =
                row.variant?.toLowerCase().includes(q) ||
                row.branch?.toLowerCase().includes(q) ||
                row.retailer?.toLowerCase().includes(q) ||
                row.batchNo?.toLowerCase().includes(q) ||
                row.receiptNo?.toLowerCase().includes(q) ||
                row.totalPayment?.toLowerCase().includes(q) ||
                row.totalPrice?.toLowerCase().includes(q);
              if (!match) return false;
            }

            // Date Range Filter
            if (dateRange.startDate && row.isoDate < dateRange.startDate) return false;
            if (dateRange.endDate && row.isoDate > dateRange.endDate) return false;

            return true;
          })
          .map((row) => ({
            ...row,
            onView: (r) => setSelectedTransaction(r),
          })),
      }))
      .filter((section) => section.rows.length > 0);
  }, [rawSections, searchQuery, dateRange]);

  const totalPages = Math.max(1, Math.ceil((filteredSections[0]?.rows.length || 0) / 10));

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Sales History" }]} />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Sales History
        </h2>
        <p className="text-sm text-slate-500">
          View completed in-store and online sales transactions.
        </p>
      </div>

      {/* ── Tabs Component ──────────────────────────────────────────────────── */}
      <Tabs tabs={SALES_TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {/* ── Toolbar Controls ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search receipt no., variant, customer, or amount"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Date Range Picker Dropdown */}
          <div className="relative w-full sm:w-auto" ref={dateRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
                dateRange.startDate ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
              }`}
            >
              <span>
                {dateRange.startDate
                  ? `${dateRange.startDate} - ${dateRange.endDate || "..."}`
                  : "Date Range"}
              </span>
              <Calendar size={16} className={dateRange.startDate ? "text-emerald-600" : "text-gray-500"} />
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 left-0 sm:left-auto bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-20 w-64">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.startDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.endDate}
                      onChange={(e) =>
                        setTempDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleDateReset}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDateApply}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="relative w-full sm:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── Transactions Table ──────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={currentColumns}
        sections={filteredSections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={`Showing sales records — Page ${currentPage} of ${totalPages}`}
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