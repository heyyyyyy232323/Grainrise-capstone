import React, { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, Store, MapPin, RotateCw, Check } from "lucide-react";

export default function WarehouseDriverDutiesView({
  dutiesData,
  onStartTracking,
  onSelectDuty,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Grouped duties from mock data
  const groups = dutiesData?.groups || [];
  const totalCount = dutiesData?.totalCount || 75;

  // Flatten for filtering and display control
  const allDutiesWithGroup = groups.flatMap((group) =>
    (group.duties || []).map((duty) => ({
      ...duty,
      groupId: group.id,
      groupLabel: group.label,
    }))
  );

  // Filter based on search and selected filter
  const filteredDuties = allDutiesWithGroup.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.retailer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.commodity.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === "All") return true;
    if (filterType === "Online Payment") return item.paymentBadgeType === "online";
    if (filterType === "Cash on Delivery") return item.paymentBadgeType === "cod";
    if (filterType === "Today") return item.groupId === "today";
    if (filterType === "Yesterday") return item.groupId === "yesterday";
    return true;
  });

  // Limit displayed to visibleCount
  const displayedDuties = filteredDuties.slice(0, visibleCount);

  // Regroup displayed duties by groupId (TODAY, YESTERDAY)
  const displayedGroups = groups
    .map((group) => {
      const dutiesInGroup = displayedDuties.filter((d) => d.groupId === group.id);
      return {
        ...group,
        duties: dutiesInGroup,
      };
    })
    .filter((g) => g.duties.length > 0);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 4, allDutiesWithGroup.length));
      setIsLoadingMore(false);
    }, 400);
  };

  const filterOptions = [
    "All",
    "Online Payment",
    "Cash on Delivery",
    "Today",
    "Yesterday",
  ];

  return (
    <div className="space-y-4">
      {/* ── Title Row: "My Duties" & "75 total" badge ───────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          My Duties
        </h1>
        <span className="bg-slate-100/90 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200/60 shadow-2xs">
          {totalCount} total
        </span>
      </div>

      {/* ── Search & Filter Controls ─────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Search input field */}
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order....."
            className="w-full bg-white border border-slate-200/90 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5921]/20 focus:border-[#0d5921] shadow-2xs transition-all"
          />
        </div>

        {/* Filter dropdown button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-white border border-slate-200/90 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
          >
            <SlidersHorizontal size={15} className="text-slate-600" />
            <span>{filterType}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Filter options menu */}
          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-1.5 animate-in fade-in zoom-in-95 duration-150">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setFilterType(opt);
                    setIsFilterDropdownOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                    filterType === opt
                      ? "text-[#0d5921] bg-emerald-50"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{opt}</span>
                  {filterType === opt && <Check size={14} className="text-[#0d5921]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grouped Duty Cards (TODAY & YESTERDAY) ──────────────────── */}
      <div className="space-y-4">
        {displayedGroups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-2 shadow-2xs">
            <p className="text-xs font-bold text-slate-700">No matching duties found</p>
            <p className="text-[11px] text-slate-400">
              Try adjusting your search query or reset the filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterType("All");
              }}
              className="mt-2 text-xs font-bold text-[#0d5921] hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          displayedGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              {/* Group Header Banner matching Figma */}
              <div className="bg-[#eef8f1] rounded-xl px-3.5 py-2 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#0d5921]">
                  {group.label}
                </span>
                <span className="text-xs font-bold text-[#0d5921]">
                  {group.countText || `${group.duties.length} duties`}
                </span>
              </div>

              {/* Duty Cards in Group */}
              <div className="space-y-3">
                {group.duties.map((duty) => (
                  <article
                    key={duty.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                  >
                    {/* Top Row: Batch Number & Payment Badge */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                        {duty.batchNo}
                      </h3>

                      {duty.paymentBadgeType === "cod" ? (
                        <span className="bg-[#fef9c3] text-[#a16207] border border-[#fef08a] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {duty.paymentType}
                        </span>
                      ) : (
                        <span className="bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {duty.paymentType}
                        </span>
                      )}
                    </div>

                    {/* Commodity & Quantity */}
                    <p className="text-xs text-slate-500 font-medium">
                      {duty.commodity} &bull; Qty:{" "}
                      <strong className="text-slate-900 font-extrabold">{duty.quantity}</strong>
                    </p>

                    {/* Store & Location */}
                    <div className="space-y-1 pt-0.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-700">{duty.retailer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="font-normal text-slate-500">{duty.location}</span>
                      </div>
                    </div>

                    {/* Bottom Row: ETA & Start Tracking Button */}
                    <div className="flex items-end justify-between pt-1 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          ETA
                        </p>
                        <p className="text-xs font-black text-slate-900 mt-0.5">
                          {duty.etaLabel}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onStartTracking) onStartTracking(duty);
                          else if (onSelectDuty) onSelectDuty(duty);
                        }}
                        className="bg-white hover:bg-emerald-50 active:scale-95 border border-[#0d5921] text-[#0d5921] font-bold text-xs py-2 px-4 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        Start Tracking
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Footer: "Showing X of 75 duties" & "Load More" ──────────── */}
      {displayedDuties.length > 0 && (
        <div className="pt-2 pb-4 text-center space-y-2">
          <p className="text-xs text-slate-500 font-medium">
            Showing {displayedDuties.length} of {totalCount} duties
          </p>

          {displayedDuties.length < allDutiesWithGroup.length && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="inline-flex items-center justify-center gap-2 text-slate-700 hover:text-slate-900 font-extrabold text-sm py-2 px-4 rounded-xl transition-all cursor-pointer hover:bg-slate-100 active:scale-95"
            >
              <RotateCw
                size={16}
                className={`text-slate-600 ${isLoadingMore ? "animate-spin" : ""}`}
              />
              <span>{isLoadingMore ? "Loading..." : "Load More"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
