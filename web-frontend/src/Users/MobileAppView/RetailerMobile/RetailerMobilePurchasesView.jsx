import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  RotateCw,
  X,
  Package,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

// Mock purchases data structured exactly to match Figma screenshot
const ALL_PURCHASES = [
  // TODAY purchases (3 transactions as shown in Figma)
  {
    id: "pur-1",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "TODAY",
    batch: "Batch 2026 - 001",
    date: "July 19, 2026",
    time: "09:30 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Damaged outer packaging & torn sack during transit",
  },
  {
    id: "pur-2",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "TODAY",
    batch: "Batch 2026 - 002",
    date: "July 19, 2026",
    time: "10:15 AM",
    unitCost: 42.0,
    totalCost: 21000,
    defectReason: "Moisture detected in 2 sacks (100 kg)",
  },
  {
    id: "pur-3",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "TODAY",
    batch: "Batch 2026 - 003",
    date: "July 19, 2026",
    time: "11:45 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Minor tear in batch packaging",
  },

  // YESTERDAY purchases (4 transactions as shown in Figma)
  {
    id: "pur-4",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "YESTERDAY",
    batch: "Batch 2026 - 004",
    date: "July 18, 2026",
    time: "08:45 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Inspection sample failed grain purity test",
  },
  {
    id: "pur-5",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "YESTERDAY",
    batch: "Batch 2026 - 005",
    date: "July 18, 2026",
    time: "11:20 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Transit puncture on 4 sacks",
  },
  {
    id: "pur-6",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RECEIVED",
    warehouse: "North Caloocan Warehouse",
    totalQuantity: "400 kg",
    numericTotal: 400,
    failedQuantity: "50",
    passedQuantity: "350",
    dateGroup: "YESTERDAY",
    batch: "Batch 2026 - 006",
    date: "July 18, 2026",
    time: "02:15 PM",
    unitCost: 42.0,
    totalCost: 16800,
    defectReason: "Outer moisture stain",
  },
  {
    id: "pur-7",
    variant: "Jasmine Fragrant",
    subtitle: "Aromatic white rice with tender texture...",
    status: "RECEIVED",
    warehouse: "Warehouse XYZ",
    totalQuantity: "300 kg",
    numericTotal: 300,
    failedQuantity: "0",
    passedQuantity: "300",
    dateGroup: "YESTERDAY",
    batch: "Batch 2026 - 007",
    date: "July 18, 2026",
    time: "04:30 PM",
    unitCost: 55.0,
    totalCost: 16500,
    defectReason: "None - all passed inspection",
  },

  // Older purchases (up to 15 total)
  {
    id: "pur-8",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "JULY 17, 2026",
    batch: "Batch 2026 - 008",
    date: "July 17, 2026",
    time: "09:00 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Torn sacks",
  },
  {
    id: "pur-9",
    variant: "Brown Rice",
    subtitle: "Whole grain rice rich in natural nutrients...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "250 kg",
    numericTotal: 250,
    failedQuantity: "50",
    passedQuantity: "200",
    dateGroup: "JULY 17, 2026",
    batch: "Batch 2026 - 009",
    date: "July 17, 2026",
    time: "01:45 PM",
    unitCost: 52.0,
    totalCost: 13000,
    defectReason: "Seal failure",
  },
  {
    id: "pur-10",
    variant: "Malagkit Sticky",
    subtitle: "High-grade glutinous rice for delicacies...",
    status: "RECEIVED",
    warehouse: "Warehouse XYZ",
    totalQuantity: "200 kg",
    numericTotal: 200,
    failedQuantity: "20",
    passedQuantity: "180",
    dateGroup: "JULY 16, 2026",
    batch: "Batch 2026 - 010",
    date: "July 16, 2026",
    time: "10:30 AM",
    unitCost: 48.0,
    totalCost: 9600,
    defectReason: "Minor spillage",
  },
  {
    id: "pur-11",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "JULY 16, 2026",
    batch: "Batch 2026 - 011",
    date: "July 16, 2026",
    time: "03:15 PM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Puncture on 2 bags",
  },
  {
    id: "pur-12",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "450 kg",
    numericTotal: 450,
    failedQuantity: "50",
    passedQuantity: "400",
    dateGroup: "JULY 15, 2026",
    batch: "Batch 2026 - 012",
    date: "July 15, 2026",
    time: "11:00 AM",
    unitCost: 42.0,
    totalCost: 18900,
    defectReason: "Dust ingress",
  },
  {
    id: "pur-13",
    variant: "Jasmine Fragrant",
    subtitle: "Aromatic white rice with tender texture...",
    status: "RECEIVED",
    warehouse: "North Caloocan Warehouse",
    totalQuantity: "350 kg",
    numericTotal: 350,
    failedQuantity: "0",
    passedQuantity: "350",
    dateGroup: "JULY 15, 2026",
    batch: "Batch 2026 - 013",
    date: "July 15, 2026",
    time: "02:40 PM",
    unitCost: 55.0,
    totalCost: 19250,
    defectReason: "None - all passed",
  },
  {
    id: "pur-14",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "JULY 14, 2026",
    batch: "Batch 2026 - 014",
    date: "July 14, 2026",
    time: "10:15 AM",
    unitCost: 45.0,
    totalCost: 22500,
    defectReason: "Damage during unloading",
  },
  {
    id: "pur-15",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RECEIVED",
    warehouse: "Warehouse ABC",
    totalQuantity: "500 kg",
    numericTotal: 500,
    failedQuantity: "100",
    passedQuantity: "400",
    dateGroup: "JULY 14, 2026",
    batch: "Batch 2026 - 015",
    date: "July 14, 2026",
    time: "04:10 PM",
    unitCost: 42.0,
    totalCost: 21000,
    defectReason: "Defective stitching",
  },
];

const FILTER_OPTIONS = [
  "All",
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "Warehouse ABC",
];

export default function RetailerMobilePurchasesView({ onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(5); // 5 items as in Figma screenshot
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Filter purchases by search query and filter selection
  const filteredPurchases = ALL_PURCHASES.filter((p) => {
    const matchesSearch =
      p.variant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.warehouse.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === "All" ||
      p.variant.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      p.warehouse.toLowerCase().includes(selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const visiblePurchases = filteredPurchases.slice(0, visibleLimit);

  // Group visible purchases by dateGroup
  const groupedPurchases = visiblePurchases.reduce((acc, p) => {
    if (!acc[p.dateGroup]) {
      acc[p.dateGroup] = [];
    }
    acc[p.dateGroup].push(p);
    return acc;
  }, {});

  // Group counts for badge display
  const fullGroupCounts = filteredPurchases.reduce((acc, p) => {
    acc[p.dateGroup] = (acc[p.dateGroup] || 0) + 1;
    return acc;
  }, {});

  const handleLoadMore = () => {
    setVisibleLimit((prev) => Math.min(prev + 5, filteredPurchases.length));
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
            My Purchases
          </h1>
        </div>
      </div>

      {/* ── Search & Filter Controls matching Figma ───────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Search input with exact placeholder: "Search product....." */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product....."
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
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-30 animate-fadeIn">
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

      {/* ── Grouped Purchase Cards ────────────────────────────────────── */}
      <div className="space-y-5">
        {Object.keys(groupedPurchases).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-gray-700">No purchases found</p>
            <p className="text-xs text-gray-400">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          Object.entries(groupedPurchases).map(([dateGroup, items]) => {
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

                {/* Purchase Cards */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-gray-200 transition-all"
                    >
                      {/* Top Row: Variant Name, Subtitle & RECEIVED Badge */}
                      <div className="flex items-start justify-between">
                        <div className="pr-2">
                          <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                            {item.variant}
                          </h3>
                          <p className="text-xs font-medium text-gray-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                            {item.subtitle}
                          </p>
                        </div>

                        <span className="bg-[#EBF7EE] text-[#00875A] border border-[#C6EFD2] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md whitespace-nowrap">
                          {item.status}
                        </span>
                      </div>

                      {/* Middle Row: WAREHOUSE & TOTAL QUANTITY */}
                      <div className="flex items-center justify-between pt-0.5">
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            WAREHOUSE
                          </span>
                          <span className="text-xs font-bold text-gray-800 block mt-0.5">
                            {item.warehouse}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                            TOTAL QUANTITY
                          </span>
                          <span className="text-sm font-black text-gray-900 block mt-0.5">
                            {item.totalQuantity}
                          </span>
                        </div>
                      </div>

                      {/* Two Colored Metric Boxes: FAILED & PASSED */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* FAILED Box */}
                        <div className="bg-[#FEF2F2] border border-rose-100/60 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wider block">
                            FAILED
                          </span>
                          <div className="mt-1 flex items-baseline">
                            <span className="text-base font-black text-[#DC2626]">
                              {item.failedQuantity}
                            </span>
                            <span className="text-xs font-bold text-[#DC2626] ml-1">
                              kg
                            </span>
                          </div>
                        </div>

                        {/* PASSED Box */}
                        <div className="bg-[#F0FDF4] border border-emerald-100/60 rounded-xl p-3">
                          <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider block">
                            PASSED
                          </span>
                          <div className="mt-1 flex items-baseline">
                            <span className="text-base font-black text-[#16A34A]">
                              {item.passedQuantity}
                            </span>
                            <span className="text-xs font-bold text-[#16A34A] ml-1">
                              kg
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Button: View Details */}
                      <button
                        onClick={() => setSelectedPurchase(item)}
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

      {/* ── Bottom Section: Showing X of 15 purchases & Load More ─────── */}
      {filteredPurchases.length > 0 && (
        <div className="pt-2 pb-4 text-center space-y-3">
          <p className="text-sm font-medium text-gray-600">
            Showing {Math.min(visibleLimit, filteredPurchases.length)} of{" "}
            {filteredPurchases.length} purchases
          </p>

          {visibleLimit < filteredPurchases.length && (
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

      {/* ── Purchase Details Modal ────────────────────────────────────── */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00580C] flex items-center justify-center">
                  <Package size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Purchase Delivery Details
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {selectedPurchase.batch}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content Details */}
            <div className="py-4 space-y-3 text-xs">
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Product Variant</span>
                  <span className="font-bold text-gray-900">
                    {selectedPurchase.variant}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Warehouse Origin</span>
                  <span className="font-bold text-gray-800">
                    {selectedPurchase.warehouse}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Total Delivered</span>
                  <span className="font-extrabold text-gray-900">
                    {selectedPurchase.totalQuantity}
                  </span>
                </div>
              </div>

              {/* Inspection Breakdown */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-[#FEF2F2] border border-rose-100 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">
                    Failed Inspection
                  </span>
                  <p className="text-sm font-black text-rose-600 mt-1">
                    {selectedPurchase.failedQuantity} kg
                  </p>
                </div>

                <div className="p-3 bg-[#F0FDF4] border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">
                    Passed / Accepted
                  </span>
                  <p className="text-sm font-black text-emerald-600 mt-1">
                    {selectedPurchase.passedQuantity} kg
                  </p>
                </div>
              </div>

              {/* Quality & Cost Remarks */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Unit Price</span>
                  <span className="font-semibold text-gray-800">
                    ₱{selectedPurchase.unitCost.toFixed(2)} / kg
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Total Cost Value</span>
                  <span className="text-sm font-black text-[#00580C]">
                    ₱{selectedPurchase.totalCost.toLocaleString()}
                  </span>
                </div>
                {selectedPurchase.failedQuantity !== "0" && (
                  <div className="pt-2 border-t border-gray-200/80">
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                      Quality Inspection Notes:
                    </span>
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg">
                      {selectedPurchase.defectReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                <span>Received Date</span>
                <span>
                  {selectedPurchase.date} · {selectedPurchase.time}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-1">
              <button
                onClick={() => setSelectedPurchase(null)}
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
