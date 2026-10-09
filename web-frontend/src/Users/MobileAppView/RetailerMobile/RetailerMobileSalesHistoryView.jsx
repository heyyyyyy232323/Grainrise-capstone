import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  RotateCw,
  X,
  Receipt,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowLeft,
} from "lucide-react";

// Mock data structured to match Figma designs exactly
const ALL_TRANSACTIONS = [
  // Today's transactions (3 transactions shown in Figma)
  {
    id: "tx-1",
    posId: "POS-2026-0184",
    variant: "Dinorado",
    dateGroup: "TODAY",
    time: "11:45 AM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 23000,
    change: 500,
  },
  {
    id: "tx-2",
    posId: "POS-2026-0183",
    variant: "Dinorado",
    dateGroup: "TODAY",
    time: "11:45 AM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 23000,
    change: 500,
  },
  {
    id: "tx-3",
    posId: "POS-2026-0182",
    variant: "Dinorado",
    dateGroup: "TODAY",
    time: "11:45 AM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "GCash",
    amountPaid: 22500,
    change: 0,
  },

  // Yesterday's transactions (4 transactions total)
  {
    id: "tx-4",
    posId: "POS-2026-0181",
    variant: "Dinorado",
    dateGroup: "YESTERDAY",
    time: "11:45 AM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 23000,
    change: 500,
  },
  {
    id: "tx-5",
    posId: "POS-2026-0180",
    variant: "Dinorado",
    dateGroup: "YESTERDAY",
    time: "11:45 AM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 23000,
    change: 500,
  },
  {
    id: "tx-6",
    posId: "POS-2026-0179",
    variant: "Sinandomeng Regular",
    dateGroup: "YESTERDAY",
    time: "02:30 PM",
    status: "PAID",
    quantity: "350 kg",
    numericQty: 350,
    totalPayment: "₱16.8k",
    numericAmount: 16800,
    unitPrice: 48.0,
    paymentMethod: "Cash",
    amountPaid: 17000,
    change: 200,
  },
  {
    id: "tx-7",
    posId: "POS-2026-0178",
    variant: "Jasmine Fragrant",
    dateGroup: "YESTERDAY",
    time: "04:15 PM",
    status: "PAID",
    quantity: "200 kg",
    numericQty: 200,
    totalPayment: "₱12.4k",
    numericAmount: 12400,
    unitPrice: 62.0,
    paymentMethod: "GCash",
    amountPaid: 12400,
    change: 0,
  },

  // Older transactions (up to 15 total)
  {
    id: "tx-8",
    posId: "POS-2026-0177",
    variant: "Dinorado",
    dateGroup: "AUG 22, 2026",
    time: "10:15 AM",
    status: "PAID",
    quantity: "400 kg",
    numericQty: 400,
    totalPayment: "₱18.7k",
    numericAmount: 18750,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 19000,
    change: 250,
  },
  {
    id: "tx-9",
    posId: "POS-2026-0176",
    variant: "Brown Rice",
    dateGroup: "AUG 22, 2026",
    time: "01:20 PM",
    status: "PAID",
    quantity: "150 kg",
    numericQty: 150,
    totalPayment: "₱9.7k",
    numericAmount: 9750,
    unitPrice: 65.0,
    paymentMethod: "Cash",
    amountPaid: 10000,
    change: 250,
  },
  {
    id: "tx-10",
    posId: "POS-2026-0175",
    variant: "Malagkit Sticky",
    dateGroup: "AUG 21, 2026",
    time: "11:00 AM",
    status: "PAID",
    quantity: "120 kg",
    numericQty: 120,
    totalPayment: "₱6.9k",
    numericAmount: 6960,
    unitPrice: 58.0,
    paymentMethod: "Cash",
    amountPaid: 7000,
    change: 40,
  },
  {
    id: "tx-11",
    posId: "POS-2026-0174",
    variant: "Dinorado",
    dateGroup: "AUG 21, 2026",
    time: "03:40 PM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "GCash",
    amountPaid: 22500,
    change: 0,
  },
  {
    id: "tx-12",
    posId: "POS-2026-0173",
    variant: "Sinandomeng Regular",
    dateGroup: "AUG 20, 2026",
    time: "09:30 AM",
    status: "PAID",
    quantity: "250 kg",
    numericQty: 250,
    totalPayment: "₱12.0k",
    numericAmount: 12000,
    unitPrice: 48.0,
    paymentMethod: "Cash",
    amountPaid: 12000,
    change: 0,
  },
  {
    id: "tx-13",
    posId: "POS-2026-0172",
    variant: "Jasmine Fragrant",
    dateGroup: "AUG 20, 2026",
    time: "11:15 AM",
    status: "PAID",
    quantity: "300 kg",
    numericQty: 300,
    totalPayment: "₱18.6k",
    numericAmount: 18600,
    unitPrice: 62.0,
    paymentMethod: "Cash",
    amountPaid: 19000,
    change: 400,
  },
  {
    id: "tx-14",
    posId: "POS-2026-0171",
    variant: "Dinorado",
    dateGroup: "AUG 19, 2026",
    time: "02:10 PM",
    status: "PAID",
    quantity: "480 kg",
    numericQty: 480,
    totalPayment: "₱22.5k",
    numericAmount: 22500,
    unitPrice: 46.88,
    paymentMethod: "Cash",
    amountPaid: 23000,
    change: 500,
  },
  {
    id: "tx-15",
    posId: "POS-2026-0170",
    variant: "Sinandomeng Regular",
    dateGroup: "AUG 19, 2026",
    time: "04:50 PM",
    status: "PAID",
    quantity: "500 kg",
    numericQty: 500,
    totalPayment: "₱24.0k",
    numericAmount: 24000,
    unitPrice: 48.0,
    paymentMethod: "GCash",
    amountPaid: 24000,
    change: 0,
  },
];

const FILTER_OPTIONS = [
  "All",
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "Specialty",
];

export default function RetailerMobileSalesHistoryView({ onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(5); // Default 5 items as in Figma screenshot
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Filter transactions based on search query and filter selection
  const filteredTransactions = ALL_TRANSACTIONS.filter((tx) => {
    const matchesSearch =
      tx.variant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.posId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === "All" ||
      tx.variant.toLowerCase().includes(selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  // Apply visible limit
  const visibleTransactions = filteredTransactions.slice(0, visibleLimit);

  // Group visible transactions by dateGroup
  const groupedTransactions = visibleTransactions.reduce((acc, tx) => {
    if (!acc[tx.dateGroup]) {
      acc[tx.dateGroup] = [];
    }
    acc[tx.dateGroup].push(tx);
    return acc;
  }, {});

  // Group counts for all matching transactions (to show badges accurately)
  const fullGroupCounts = filteredTransactions.reduce((acc, tx) => {
    acc[tx.dateGroup] = (acc[tx.dateGroup] || 0) + 1;
    return acc;
  }, {});

  const handleLoadMore = () => {
    setVisibleLimit((prev) => Math.min(prev + 5, filteredTransactions.length));
  };

  return (
    <div className="space-y-4 pb-6 font-sans">
      {/* ── Page Header / Title ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Sales History
          </h1>
        </div>
      </div>

      {/* ── Search & Filter Row matching Figma ────────────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variant....."
            className="w-full bg-white border border-gray-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#00580C] focus:ring-1 focus:ring-[#00580C] transition-all shadow-2xs"
          />
        </div>

        {/* Filter Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-1.5 bg-white border border-gray-300 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 active:scale-98 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal size={14} className="text-gray-700" />
            <span>{selectedFilter}</span>
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fadeIn">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSelectedFilter(opt);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                    selectedFilter === opt
                      ? "bg-emerald-50 text-[#00580C] font-bold"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grouped Transaction Cards List ────────────────────────────── */}
      <div className="space-y-5">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-gray-700">No transactions found</p>
            <p className="text-xs text-gray-400">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateGroup, items]) => {
            const isToday = dateGroup === "TODAY";
            const totalCount = fullGroupCounts[dateGroup] || items.length;

            return (
              <div key={dateGroup} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                  <h2
                    className={`text-xs font-black tracking-wider uppercase ${
                      isToday ? "text-[#00580C]" : "text-[#64748B]"
                    }`}
                  >
                    {dateGroup}
                  </h2>
                  <span className="bg-[#EEF2F6] text-[#64748B] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {totalCount} transactions
                  </span>
                </div>

                {/* Cards under this Date Group */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-gray-200 transition-all"
                    >
                      {/* Top Header: Variant name, POS ID, Time & PAID badge */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                            {item.variant}
                          </h3>
                          <p className="text-xs font-medium text-gray-400 tracking-wide mt-0.5">
                            {item.posId}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-xs font-medium text-gray-400">
                            {item.time}
                          </span>
                          <span className="bg-[#EBF7EE] text-[#00875A] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Middle Info Box: QUANTITY & TOTAL PAYMENT */}
                      <div className="bg-[#F8FAFC] rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            QUANTITY
                          </span>
                          <span className="text-base font-black text-gray-900 mt-0.5 block">
                            {item.quantity}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            TOTAL PAYMENT
                          </span>
                          <span className="text-base font-black text-[#00580C] mt-0.5 block">
                            {item.totalPayment}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Button: View Details */}
                      <button
                        onClick={() => setSelectedTransaction(item)}
                        className="w-full bg-white border border-gray-200 hover:bg-gray-50/80 active:scale-[0.99] rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs font-bold text-[#334155] transition-all cursor-pointer shadow-2xs"
                      >
                        <Eye size={15} strokeWidth={2} className="text-gray-500" />
                        <span>View Details</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Section: Showing X of Y & Load More ────────────────── */}
      {filteredTransactions.length > 0 && (
        <div className="pt-2 pb-4 text-center space-y-3">
          <p className="text-sm font-medium text-gray-600">
            Showing {Math.min(visibleLimit, filteredTransactions.length)} of{" "}
            {filteredTransactions.length} transactions
          </p>

          {visibleLimit < filteredTransactions.length && (
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-gray-800 hover:text-[#00580C] active:scale-98 transition-all cursor-pointer py-1"
            >
              <RotateCw size={15} strokeWidth={2.4} className="text-gray-800" />
              <span>Load More Products</span>
            </button>
          )}
        </div>
      )}

      {/* ── Transaction Details Modal ──────────────────────────────────── */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00580C] flex items-center justify-center">
                  <Receipt size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Transaction Details
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {selectedTransaction.posId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Details */}
            <div className="py-4 space-y-3 text-xs">
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Rice Variant</span>
                  <span className="font-bold text-gray-900">
                    {selectedTransaction.variant}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Quantity Sold</span>
                  <span className="font-extrabold text-gray-900">
                    {selectedTransaction.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Unit Price</span>
                  <span className="font-semibold text-gray-700">
                    ₱{selectedTransaction.unitPrice.toFixed(2)} / kg
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Payment Status</span>
                  <span className="bg-[#EBF7EE] text-[#00875A] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                    {selectedTransaction.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Payment Method</span>
                  <span className="font-semibold text-gray-800">
                    {selectedTransaction.paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Amount Tendered</span>
                  <span className="font-semibold text-gray-800">
                    ₱{selectedTransaction.amountPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Change (Sukli)</span>
                  <span className="font-semibold text-gray-800">
                    ₱{selectedTransaction.change.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 uppercase">
                    Total Amount
                  </span>
                  <span className="text-base font-black text-[#00580C]">
                    ₱{selectedTransaction.numericAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                <span>Date &amp; Time</span>
                <span>
                  {selectedTransaction.dateGroup === "TODAY"
                    ? "Today"
                    : selectedTransaction.dateGroup === "YESTERDAY"
                    ? "Yesterday"
                    : selectedTransaction.dateGroup}{" "}
                  · {selectedTransaction.time}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-1">
              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-2.5 bg-[#00580C] hover:bg-[#004709] text-white text-xs font-bold rounded-xl text-center cursor-pointer transition-colors shadow-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
