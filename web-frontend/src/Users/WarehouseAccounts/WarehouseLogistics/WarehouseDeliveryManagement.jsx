import { useMemo, useState, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sampleOrders = Array.from({ length: 10 }, (_, i) => ({
  id: `o-${i + 1}`,
  batch: `Batch 2026 - 00${(i % 9) + 1}`,
  retailer: `Retailer A`,
  variant: "Dinorado",
  qty: "2,500 kg",
  arrival: "Apr 22, 2026",
  isoDate: "2026-04-22",
  priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "standard" : "low",
  sector: i % 4 === 0 ? "north" : i % 4 === 1 ? "south" : i % 4 === 2 ? "east" : "west",
}));

const drivers = [
  { id: "d-1", name: "Driver Unknown A", status: "Available", capacity: 340, max: 10000 },
  { id: "d-2", name: "Driver Unknown A", status: "Available", capacity: 340, max: 10000 },
  { id: "d-3", name: "Driver Unknown A", status: "Available", capacity: 340, max: 10000 },
  { id: "d-4", name: "Driver Unknown A", status: "Available", capacity: 340, max: 10000 },
  { id: "d-5", name: "Driver Unknown A", status: "Limited Capacity", capacity: 7800, max: 10000 },
  { id: "d-6", name: "Driver Unknown A", status: "Full", capacity: 10000, max: 10000 },
];

const AREA_OPTIONS = [
  { value: "all", label: "Delivery Area" },
  { value: "north", label: "North Sector" },
  { value: "south", label: "South Sector" },
  { value: "east", label: "East Sector" },
  { value: "west", label: "West Sector" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "Priority" },
  { value: "high", label: "High" },
  { value: "standard", label: "Standard" },
  { value: "low", label: "Low" },
];

const SORT_OPTIONS = [
  { value: "batch-asc", label: "Batch No. (A-Z)" },
  { value: "retailer-asc", label: "Retailer (A-Z)" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "arrival-asc", label: "Target Arrival" },
];

const driverStatusStyles = {
  Available: {
    cardBorder: "border-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
  },
  "Limited Capacity": {
    cardBorder: "border-amber-500",
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  Full: {
    cardBorder: "border-rose-500",
    badge: "bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
  },
};

function CustomDropdown({ label, options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : label;

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 border border-gray-200 bg-white px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-gray-50 transition-colors cursor-pointer h-[38px] justify-between w-full sm:w-auto min-w-[130px]"
      >
        <span>{displayLabel}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 left-0 bg-white border border-gray-100 rounded-2xl shadow-xl p-1.5 z-30 w-52 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#EAF5ED] text-[#0B5D1E] font-semibold"
                      : "text-slate-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryManagement() {
  const [query, setQuery] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState("batch-asc");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRef = useRef(null);

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

  const columns = [
    { key: "batch", label: "Batch No." },
    { key: "retailer", label: "Retailer" },
    { key: "variant", label: "Variant" },
    { key: "qty", label: "Qty (kg)" },
    { key: "arrival", label: "Target Arrival" },
    { key: "action", label: "Action" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleOrders.filter((o) => {
      const matchSearch =
        q === "" || `${o.batch} ${o.retailer} ${o.variant}`.toLowerCase().includes(q);
      const matchArea = deliveryArea === "all" || o.sector === deliveryArea;
      const matchPriority = priority === "all" || o.priority === priority;

      const matchStart = !dateRange.startDate || o.isoDate >= dateRange.startDate;
      const matchEnd = !dateRange.endDate || o.isoDate <= dateRange.endDate;

      return matchSearch && matchArea && matchPriority && matchStart && matchEnd;
    });

    if (sortBy === "batch-asc") result.sort((a, b) => a.batch.localeCompare(b.batch));
    else if (sortBy === "retailer-asc") result.sort((a, b) => a.retailer.localeCompare(b.retailer));
    else if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
    else if (sortBy === "arrival-asc") result.sort((a, b) => a.arrival.localeCompare(b.arrival));

    return result;
  }, [query, deliveryArea, priority, dateRange, sortBy]);

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    return drivers.filter((d) => q === "" || d.name.toLowerCase().includes(q));
  }, [driverQuery]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          {
            label: "Delivery Operations",
            path: "/warehouse-logistics/dashboard",
          },
          { label: "Delivery Management" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Delivery Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Assign drivers to forwarded marketplace orders.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-6">
            {/* ── Filter Toolbar ────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {/* Search Bar */}
              <div className="relative min-w-[220px] max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search batch no., retailer, or product"
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); setCurrentPage(1); }}
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

              <CustomDropdown label="Delivery Area" options={AREA_OPTIONS} value={deliveryArea} onChange={(v) => { setDeliveryArea(v); setCurrentPage(1); }} />
              <CustomDropdown label="Priority" options={PRIORITY_OPTIONS} value={priority} onChange={(v) => { setPriority(v); setCurrentPage(1); }} />
            </div>

            <SectionedTableCard
              columns={columns}
              sections={tableSections}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onViewDetails={(row) => console.log("View details for", row.id)}
              footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} orders`}
            />
          </div>
        </div>

        {/* ── Driver Capacity Sidebar ────────────────────────────────────────── */}
        <aside className="w-full lg:w-[360px] shrink-0">
          <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="font-bold text-slate-900">Driver Capacity</h4>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={driverQuery}
                onChange={(e) => setDriverQuery(e.target.value)}
                placeholder="Search driver..."
                className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700"
              />
              {driverQuery && (
                <button
                  type="button"
                  onClick={() => setDriverQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {filteredDrivers.map((d) => {
                const pct = Math.min(
                  100,
                  Math.round((d.capacity / d.max) * 100),
                );
                const style =
                  driverStatusStyles[d.status] ?? driverStatusStyles.Available;

                return (
                  <div
                    key={d.id}
                    className={`rounded-md border p-2 ${style.cardBorder}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {d.name}
                        </div>
                        <span
                          className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <button type="button" className="text-[11px] font-semibold text-slate-900 bg-white border border-slate-900 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-50 transition">
                        ASSIGN
                      </button>
                    </div>

                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`${style.bar} h-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-500">
                        Current Capacity
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                        <span>
                          {d.capacity.toLocaleString()} /{" "}
                          {d.max.toLocaleString()} kg
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}