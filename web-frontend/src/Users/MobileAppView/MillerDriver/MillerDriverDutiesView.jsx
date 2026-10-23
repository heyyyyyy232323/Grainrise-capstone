import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Store,
  MapPin,
  RotateCw,
} from "lucide-react";

export default function MillerDriverDutiesView({
  dutiesData,
  onSelectDuty,
  onStartTracking,
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);

  const todayGroup = dutiesData?.groups?.find((g) => g.id === "today") || {
    label: "TODAY",
    countText: "3 duties",
    duties: [],
  };

  const yesterdayGroup = dutiesData?.groups?.find((g) => g.id === "yesterday") || {
    label: "YESTERDAY",
    countText: "4 duties",
    duties: [],
  };

  const filterDuty = (d) => {
    const matchesKeyword =
      d.batchNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.retailer.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.location.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      d.commodity.toLowerCase().includes(searchKeyword.toLowerCase());

    if (!matchesKeyword) return false;

    if (filterType === "All") return true;
    if (filterType === "Online Payment") return d.paymentType === "Online Payment";
    if (filterType === "Cash on Delivery") return d.paymentType === "Cash on Delivery";
    return true;
  };

  const filteredTodayDuties = todayGroup.duties.filter(filterDuty);
  const filteredYesterdayDuties = yesterdayGroup.duties.filter(filterDuty);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 5, dutiesData?.totalCount || 75));
  };

  const renderDutyCard = (duty) => (
    <div
      key={duty.id}
      className="bg-white rounded-2xl border border-slate-200/80 p-3.5 space-y-2 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-xs transition-all"
    >
      {/* Row 1: Batch & Payment Method Badge */}
      <div className="flex items-center justify-between">
        <span className="font-extrabold text-[15px] text-slate-900 tracking-tight">
          {duty.batchNo}
        </span>

        <span
          className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-md ${
            duty.paymentType === "Cash on Delivery"
              ? "bg-[#fef3c7] text-[#b45309]"
              : "bg-[#e0f2fe] text-[#0284c7]"
          }`}
        >
          {duty.paymentType}
        </span>
      </div>

      {/* Row 2: Commodity & Qty with bold weight */}
      <p className="text-xs text-slate-500 font-medium">
        {duty.commodity} - Qty:{" "}
        <span className="font-extrabold text-slate-900">{duty.quantity}</span>
      </p>

      {/* Divider */}
      <div className="border-t border-slate-100 my-1.5" />

      {/* Middle rows: Retailer & Location */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Store size={14} className="text-slate-400 shrink-0" strokeWidth={1.8} />
          <span>{duty.retailer}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-normal">
          <MapPin size={14} className="text-slate-400 shrink-0" strokeWidth={1.8} />
          <span>{duty.location}</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-1.5" />

      {/* Bottom Row: ETA on Left & Outlined Start Tracking Button on Right */}
      <div className="flex items-end justify-between pt-0.5">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            ETA
          </span>
          <p className="text-xs font-black text-slate-900 mt-0.5">
            {duty.etaLabel || "Today, 10:00 AM"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onStartTracking && onStartTracking(duty)}
          className="bg-white hover:bg-[#ebf8ee] active:scale-95 text-[#0d5921] border border-[#0d5921] font-semibold text-xs px-4 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
        >
          Start Tracking
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3.5 pb-4">
      {/* ── Title & Total Counter ─────────────────────────────────── */}
      <div className="flex items-center justify-between pt-0.5">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          My Duties
        </h1>
        <span className="bg-slate-100 text-slate-500 font-semibold text-xs px-2.5 py-0.5 rounded-md shadow-2xs">
          {dutiesData?.totalCount || 75} total
        </span>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────── */}
      <div className="flex items-center gap-2 relative">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search order....."
            className="w-full bg-white border border-slate-200/90 rounded-xl py-2 pl-9 pr-3 text-xs placeholder:text-slate-400 font-medium text-slate-900 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#0d5921]/40"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="bg-white border border-slate-200/90 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-2xs text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer active:scale-95 transition-all"
          >
            <SlidersHorizontal size={14} className="text-slate-700" strokeWidth={2} />
            <span>{filterType}</span>
            <ChevronDown size={13} className="text-slate-500" />
          </button>

          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-40 text-xs font-semibold text-slate-700 space-y-0.5">
              {["All", "Online Payment", "Cash on Delivery"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setFilterType(type);
                    setShowFilterMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    filterType === type
                      ? "bg-[#eef8f1] text-[#0d5921] font-bold"
                      : "hover:bg-slate-100"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TODAY Group Section ───────────────────────────────────── */}
      <div className="space-y-3">
        {/* Mint Banner */}
        <div className="bg-[#ebf8ee] rounded-xl px-3.5 py-1.5 flex items-center justify-between">
          <span className="font-extrabold text-xs text-[#0d5921] uppercase tracking-wider">
            {todayGroup.label}
          </span>
          <span className="font-semibold text-xs text-[#0d5921]">
            {filteredTodayDuties.length} duties
          </span>
        </div>

        {/* Today Duty Cards */}
        {filteredTodayDuties.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
            No duties found for today.
          </div>
        ) : (
          filteredTodayDuties.map(renderDutyCard)
        )}
      </div>

      {/* ── YESTERDAY Group Section ───────────────────────────────── */}
      <div className="space-y-3 pt-1">
        {/* Mint Banner */}
        <div className="bg-[#ebf8ee] rounded-xl px-3.5 py-1.5 flex items-center justify-between">
          <span className="font-extrabold text-xs text-[#0d5921] uppercase tracking-wider">
            {yesterdayGroup.label}
          </span>
          <span className="font-semibold text-xs text-[#0d5921]">
            {filteredYesterdayDuties.length} duties
          </span>
        </div>

        {/* Yesterday Duty Cards */}
        {filteredYesterdayDuties.length === 0 ? (
          <div className="bg-white rounded-2xl p-4 text-center text-xs text-slate-400 border border-slate-200/80">
            No duties found for yesterday.
          </div>
        ) : (
          filteredYesterdayDuties.map(renderDutyCard)
        )}
      </div>

      {/* ── Footer: Showing Count & Load More ─────────────────────── */}
      <div className="pt-2 text-center space-y-2">
        <p className="text-xs text-slate-500 font-medium">
          Showing 5 of {dutiesData?.totalCount || 75} duties
        </p>

        <button
          type="button"
          onClick={handleLoadMore}
          className="inline-flex items-center justify-center gap-1.5 text-slate-700 hover:text-[#0d5921] font-semibold text-xs py-1.5 px-3 rounded-full hover:bg-slate-100 cursor-pointer active:scale-95 transition-all"
        >
          <RotateCw size={14} strokeWidth={2.2} />
          <span>Load More</span>
        </button>
      </div>
    </div>
  );
}
