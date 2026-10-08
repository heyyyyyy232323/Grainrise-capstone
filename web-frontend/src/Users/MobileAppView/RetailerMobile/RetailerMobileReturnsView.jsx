import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Eye,
  RotateCw,
  X,
  RotateCcw,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
} from "lucide-react";

// Mock data structured exactly to match both Figma screenshots ("All Records" and "Recent Updates")
const ALL_RETURNS = [
  // Group 1: 3 records (JUNE 10, 2026 for All Records / TODAY for Recent Updates)
  {
    id: "ret-1",
    returnCode: "RET-2026-0012",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 10, 2026",
    recentGroup: "TODAY",
    date: "June 10, 2026",
    time: "10:30 AM",
    issueType: "Packaging Tear / Spillage",
    reason: "Damaged outer sack during transit from warehouse",
    resolution: "Credit Memo & Full 500 kg Replacement Dispatched",
    resolvedBy: "Warehouse ABC Logistics Lead",
  },
  {
    id: "ret-2",
    returnCode: "RET-2026-0013",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 10, 2026",
    recentGroup: "TODAY",
    date: "June 10, 2026",
    time: "11:15 AM",
    issueType: "Moisture Content",
    reason: "Batch did not meet moisture quality threshold upon arrival",
    resolution: "Replaced with dry batch B-092",
    resolvedBy: "QA Inspection Officer",
  },
  {
    id: "ret-3",
    returnCode: "RET-2026-0014",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 10, 2026",
    recentGroup: "TODAY",
    date: "June 10, 2026",
    time: "02:45 PM",
    issueType: "Packaging Quality",
    reason: "Defective bag stitching on pallet shipment",
    resolution: "Account credited and repackaged delivery completed",
    resolvedBy: "Warehouse ABC Support",
  },

  // Group 2: 4 records (JUNE 18, 2026 for All Records / YESTERDAY for Recent Updates)
  {
    id: "ret-4",
    returnCode: "RET-2026-0015",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 18, 2026",
    recentGroup: "YESTERDAY",
    date: "June 18, 2026",
    time: "09:00 AM",
    issueType: "Transit Defect",
    reason: "Forklift puncture through bottom layer",
    resolution: "Replaced 500 kg from local buffer stock",
    resolvedBy: "Operations Supervisor",
  },
  {
    id: "ret-5",
    returnCode: "RET-2026-0016",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 18, 2026",
    recentGroup: "YESTERDAY",
    date: "June 18, 2026",
    time: "11:40 AM",
    issueType: "Foreign Material",
    reason: "Excessive husk particles found in sample",
    resolution: "Upgraded replacement with Premium Plus Dinorado",
    resolvedBy: "Quality Assurance",
  },
  {
    id: "ret-6",
    returnCode: "RET-2026-0017",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RESOLVED",
    warehouse: "North Caloocan Warehouse",
    quantity: "400 kg",
    numericQty: 400,
    allGroup: "JUNE 18, 2026",
    recentGroup: "YESTERDAY",
    date: "June 18, 2026",
    time: "01:20 PM",
    issueType: "Bag Damage",
    reason: "Wet exterior caused by rain cover leak",
    resolution: "Dry sacks supplied same day",
    resolvedBy: "Fleet Driver Manager",
  },
  {
    id: "ret-7",
    returnCode: "RET-2026-0018",
    variant: "Jasmine Fragrant",
    subtitle: "Aromatic white rice with tender texture...",
    status: "RESOLVED",
    warehouse: "Warehouse XYZ",
    quantity: "300 kg",
    numericQty: 300,
    allGroup: "JUNE 18, 2026",
    recentGroup: "YESTERDAY",
    date: "June 18, 2026",
    time: "03:50 PM",
    issueType: "Label Discrepancy",
    reason: "Mismatched barcode labels on delivery invoice",
    resolution: "Re-verified and correct barcodes reissued",
    resolvedBy: "Inventory Admin",
  },

  // Older records (totaling 15 mock records)
  {
    id: "ret-8",
    returnCode: "RET-2026-0019",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 25, 2026",
    recentGroup: "JUNE 25, 2026",
    date: "June 25, 2026",
    time: "08:15 AM",
    issueType: "Spillage",
    reason: "Damaged packaging during unloading",
    resolution: "Replacement sacks issued",
    resolvedBy: "Warehouse ABC Support",
  },
  {
    id: "ret-9",
    returnCode: "RET-2026-0020",
    variant: "Brown Rice",
    subtitle: "Whole grain rice rich in natural nutrients...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "250 kg",
    numericQty: 250,
    allGroup: "JUNE 25, 2026",
    recentGroup: "JUNE 25, 2026",
    date: "June 25, 2026",
    time: "10:30 AM",
    issueType: "Vacuum Seal Failure",
    reason: "Decompressed bags",
    resolution: "Full batch refund issued",
    resolvedBy: "Accounts Department",
  },
  {
    id: "ret-10",
    returnCode: "RET-2026-0021",
    variant: "Malagkit Sticky",
    subtitle: "High-grade glutinous rice for delicacies...",
    status: "RESOLVED",
    warehouse: "Warehouse XYZ",
    quantity: "200 kg",
    numericQty: 200,
    allGroup: "JUNE 25, 2026",
    recentGroup: "JUNE 25, 2026",
    date: "June 25, 2026",
    time: "02:10 PM",
    issueType: "Packaging Issue",
    reason: "Torn pallet wrap",
    resolution: "Inspected and cleared",
    resolvedBy: "Warehouse XYZ Logistics",
  },
  {
    id: "ret-11",
    returnCode: "RET-2026-0022",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 26, 2026",
    recentGroup: "JUNE 26, 2026",
    date: "June 26, 2026",
    time: "09:40 AM",
    issueType: "Quality Discrepancy",
    reason: "Color variation across sacks",
    resolution: "Replaced with standard lot",
    resolvedBy: "Quality Inspector",
  },
  {
    id: "ret-12",
    returnCode: "RET-2026-0023",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "450 kg",
    numericQty: 450,
    allGroup: "JUNE 26, 2026",
    recentGroup: "JUNE 26, 2026",
    date: "June 26, 2026",
    time: "11:20 AM",
    issueType: "Bag Damage",
    reason: "Surface puncture",
    resolution: "Immediate store replacement",
    resolvedBy: "Store Manager",
  },
  {
    id: "ret-13",
    returnCode: "RET-2026-0024",
    variant: "Jasmine Fragrant",
    subtitle: "Aromatic white rice with tender texture...",
    status: "RESOLVED",
    warehouse: "North Caloocan Warehouse",
    quantity: "350 kg",
    numericQty: 350,
    allGroup: "JUNE 27, 2026",
    recentGroup: "JUNE 27, 2026",
    date: "June 27, 2026",
    time: "03:00 PM",
    issueType: "Weight Variance",
    reason: "Weighed 5 kg below manifest total",
    resolution: "Reconciled with complimentary sack",
    resolvedBy: "Dispatch Team",
  },
  {
    id: "ret-14",
    returnCode: "RET-2026-0025",
    variant: "Dinorado",
    subtitle: "Premium rice, locally sourced specialty...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 28, 2026",
    recentGroup: "JUNE 28, 2026",
    date: "June 28, 2026",
    time: "10:50 AM",
    issueType: "Torn Outer Bag",
    reason: "Damaged during truck transit",
    resolution: "New sealed bag delivered",
    resolvedBy: "Logistics Team",
  },
  {
    id: "ret-15",
    returnCode: "RET-2026-0026",
    variant: "Sinandomeng",
    subtitle: "Everyday commercial staple rice variety...",
    status: "RESOLVED",
    warehouse: "Warehouse ABC",
    quantity: "500 kg",
    numericQty: 500,
    allGroup: "JUNE 28, 2026",
    recentGroup: "JUNE 28, 2026",
    date: "June 28, 2026",
    time: "04:15 PM",
    issueType: "Late Inspection Log",
    reason: "Delivery inspection sign-off delay",
    resolution: "Status updated and finalized",
    resolvedBy: "Warehouse ABC Support",
  },
];

const FILTER_OPTIONS = [
  "All",
  "Dinorado",
  "Sinandomeng",
  "Jasmine",
  "Warehouse ABC",
];

export default function RetailerMobileReturnsView({ onBack }) {
  // Initialize to "recent" tab matching user request
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const sub = params.get("subtab");
      if (sub === "all") return "all";
      if (sub === "recent") return "recent";
    }
    return "recent";
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(5); // 5 items as in Figma screenshot
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Filter returns based on search query and filter dropdown
  const filteredReturns = ALL_RETURNS.filter((item) => {
    const matchesSearch =
      item.variant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.warehouse.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.returnCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === "All" ||
      item.variant.toLowerCase().includes(selectedFilter.toLowerCase()) ||
      item.warehouse.toLowerCase().includes(selectedFilter.toLowerCase());

    return matchesSearch && matchesFilter;
  });

  const visibleReturns = filteredReturns.slice(0, visibleLimit);

  // Dynamic group label depending on active tab
  const getGroupKey = (item) => {
    return activeTab === "recent" ? item.recentGroup : item.allGroup;
  };

  // Group visible returns by date group key
  const groupedReturns = visibleReturns.reduce((acc, item) => {
    const key = getGroupKey(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  // Full count for badge in each group
  const fullGroupCounts = filteredReturns.reduce((acc, item) => {
    const key = getGroupKey(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const handleLoadMore = () => {
    setVisibleLimit((prev) => Math.min(prev + 5, filteredReturns.length));
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
            Product Returns &amp; Issues
          </h1>
        </div>
      </div>

      {/* ── Pill Tabs Row matching Figma ───────────────────────────────── */}
      <div className="flex items-center gap-2.5 pt-0.5">
        {/* All Records Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("all");
            setVisibleLimit(5);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-[#00580C] text-white shadow-xs"
              : "bg-transparent text-gray-600 hover:bg-gray-100/70"
          }`}
        >
          <span>All Records</span>
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === "all"
                ? "bg-white text-[#00580C]"
                : "bg-gray-100 text-gray-500 border border-gray-200/50"
            }`}
          >
            56
          </span>
        </button>

        {/* Recent Updates Tab */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("recent");
            setVisibleLimit(5);
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "recent"
              ? "bg-[#00580C] text-white shadow-xs"
              : "bg-transparent text-gray-600 hover:bg-gray-100/70"
          }`}
        >
          <span>Recent Updates</span>
          <span
            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              activeTab === "recent"
                ? "bg-white text-[#00580C]"
                : "bg-gray-100 text-gray-500 border border-gray-200/50"
            }`}
          >
            12
          </span>
        </button>
      </div>

      {/* ── Search & Filter Controls matching Figma ───────────────────── */}
      <div className="flex items-center gap-2.5">
        {/* Search input with exact placeholder: "Search variant....." */}
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

      {/* ── Grouped Return Record Cards ───────────────────────────────── */}
      <div className="space-y-5">
        {Object.keys(groupedReturns).length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
            <p className="text-sm font-bold text-gray-700">No return records found</p>
            <p className="text-xs text-gray-400">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          Object.entries(groupedReturns).map(([dateGroup, items]) => {
            const totalCount = fullGroupCounts[dateGroup] || items.length;

            return (
              <div key={dateGroup} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                  <h2 className="text-xs font-black tracking-wider uppercase text-[#334155]">
                    {dateGroup}
                  </h2>
                  <span className="bg-[#EEF2F6] text-[#64748B] text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {totalCount} records
                  </span>
                </div>

                {/* Cards under this date group */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs space-y-3 hover:border-gray-200 transition-all"
                    >
                      {/* Top Row: Variant Name, Subtitle & RESOLVED Badge */}
                      <div className="flex items-start justify-between">
                        <div className="pr-2">
                          <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                            {item.variant}
                          </h3>
                          <p className="text-xs font-medium text-gray-400 mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                            {item.subtitle}
                          </p>
                        </div>

                        <span className="bg-[#E8F8EE] text-[#00875A] border border-[#C6EFD2] text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          {item.status}
                        </span>
                      </div>

                      {/* Middle Row: WAREHOUSE & QUANTITY */}
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
                            QUANTITY
                          </span>
                          <span className="text-sm font-black text-gray-900 block mt-0.5">
                            {item.quantity}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Button: View Details */}
                      <button
                        onClick={() => setSelectedReturn(item)}
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

      {/* ── Bottom Section: Showing X of 15 recent updates / records & Load More ── */}
      {filteredReturns.length > 0 && (
        <div className="pt-2 pb-4 text-center space-y-3">
          <p className="text-sm font-medium text-gray-600">
            {activeTab === "recent"
              ? `Showing ${Math.min(visibleLimit, filteredReturns.length)} of 15 recent updates`
              : `Showing ${Math.min(visibleLimit, filteredReturns.length)} of ${filteredReturns.length} records`}
          </p>

          {visibleLimit < filteredReturns.length && (
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

      {/* ── Return Issue Details Modal ─────────────────────────────────── */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00580C] flex items-center justify-center">
                  <RotateCcw size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Return Issue Details
                  </h3>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {selectedReturn.returnCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReturn(null)}
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
                    {selectedReturn.variant}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Warehouse Origin</span>
                  <span className="font-bold text-gray-800">
                    {selectedReturn.warehouse}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Returned Quantity</span>
                  <span className="font-extrabold text-gray-900">
                    {selectedReturn.quantity}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Status</span>
                  <span className="bg-[#E8F8EE] text-[#00875A] border border-[#C6EFD2] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full">
                    {selectedReturn.status}
                  </span>
                </div>
              </div>

              {/* Defect & Resolution Card */}
              <div className="bg-[#F8FAFC] rounded-xl p-3.5 space-y-2.5 border border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">
                    Issue Category:
                  </span>
                  <span className="font-bold text-gray-900 mt-0.5 block">
                    {selectedReturn.issueType}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">
                    Defect Description:
                  </span>
                  <p className="text-[11px] text-gray-700 bg-white border border-gray-200/70 p-2 rounded-lg mt-0.5">
                    {selectedReturn.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200/80">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                    Resolution Applied:
                  </span>
                  <p className="text-[11px] text-[#00580C] bg-emerald-50 border border-emerald-100 p-2 rounded-lg mt-0.5 font-medium">
                    {selectedReturn.resolution}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                <span>Resolved By</span>
                <span className="font-medium text-gray-600">
                  {selectedReturn.resolvedBy}
                </span>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-gray-400">
                <span>Date &amp; Time</span>
                <span>
                  {selectedReturn.date} · {selectedReturn.time}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-1">
              <button
                onClick={() => setSelectedReturn(null)}
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
