import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Calendar, ChevronDown, ChevronUp, X } from "lucide-react";

// ── Mock Contracts Data ──────────────────────────────────────────────────
const STATUS_TYPES = ["Due Soon", "Active", "Completed", "Cancelled"];

const MOCK_CONTRACTS = Array.from({ length: 12 }, (_, i) => {
  const status = STATUS_TYPES[i % 4];
  return {
    id: `CON-2026-88${32 + i}`,
    buyerName: "ABC Rice Mill",
    buyerId: "BYR-772",
    product: "Milled Palay",
    variety: "Dinorado",
    quantity: "2,500 kg",
    pricePerKg: "₱20.00",
    totalValue: "₱50,000.00",
    fulfillmentDate: "Oct 15, 2026",
    isoDate: "2026-10-15",
    status: status,
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  };
});

const CONTRACT_STATUSES = [
  { value: "all", label: "Contract Status" },
  { value: "Due Soon", label: "Due Soon" },
  { value: "Active", label: "Active" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

const PRODUCT_TYPES = [
  { value: "all", label: "Product Type" },
  { value: "Milled Palay", label: "Milled Palay" },
];

const RICE_VARIETIES = [
  { value: "all", label: "Rice Variety" },
  { value: "Dinorado", label: "Dinorado" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Date: Newest" },
  { value: "oldest", label: "Date: Oldest" },
  { value: "high-low", label: "Value: High to Low" },
  { value: "low-high", label: "Value: Low to High" },
];

const STATUS_STYLES = {
  "Due Soon": "bg-amber-100 text-amber-700 border border-amber-200",
  Active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  Completed: "bg-blue-100 text-blue-600 border border-blue-200",
  Cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
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

function ContractCard({ contract }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm space-y-0 flex flex-col justify-between">
      {/* Top Banner Image with Contract ID badge */}
      <div className="relative h-28 w-full bg-slate-100">
        <img
          src={contract.imageUrl}
          alt={contract.product}
          className="h-full w-full object-cover"
        />
        <span className="absolute top-2.5 right-2.5 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white backdrop-blur-xs">
          {contract.id}
        </span>
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Header: Buyer Info & Status */}
          <div className="flex items-start justify-between gap-1">
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{contract.buyerName}</h3>
              <p className="text-[11px] font-medium text-gray-400">Buyer ID: {contract.buyerId}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${STATUS_STYLES[contract.status]}`}>
              {contract.status === "Due Soon" && "⚠️ "}
              {contract.status === "Completed" && "✓ "}
              {contract.status}
            </span>
          </div>

          {/* Details Table-style Grid */}
          <div className="rounded-xl bg-slate-50 p-2.5 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] uppercase font-semibold text-gray-400">Product</p>
                <p className="font-bold text-gray-800">{contract.product}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-gray-400">Variety</p>
                <p className="font-bold text-gray-800">{contract.variety}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[10px] uppercase font-semibold text-gray-400">Quantity</p>
                <p className="font-bold text-gray-800">{contract.quantity}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-gray-400">Price/kg</p>
                <p className="font-bold text-gray-800">{contract.pricePerKg}</p>
              </div>
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <p className="text-[10px] uppercase font-semibold text-gray-400">Total Value</p>
              <p className="text-sm font-bold text-emerald-700">{contract.totalValue}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-semibold text-gray-400">Fulfillment Date</p>
              <p className="flex items-center gap-1 font-semibold text-red-600 text-xs">
                <Calendar size={12} />
                <span>{contract.fulfillmentDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => alert(`Viewing details for ${contract.id}`)}
          className="w-full mt-2 rounded-xl border border-emerald-600 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

export default function CurrentContractsTab() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productType, setProductType] = useState("all");
  const [riceVariety, setRiceVariety] = useState("all");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [tempDateRange, setTempDateRange] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortBy] = useState("newest");

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
    setShowDatePicker(false);
  };

  const handleDateReset = () => {
    setTempDateRange({ startDate: "", endDate: "" });
    setDateRange({ startDate: "", endDate: "" });
    setShowDatePicker(false);
  };

  const filteredContracts = useMemo(() => {
    return MOCK_CONTRACTS.filter((c) => {
      const matchSearch =
        search === "" ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "all" || c.status === status;
      const matchType = productType === "all" || c.product === productType;
      const matchVariety = riceVariety === "all" || c.variety === riceVariety;

      const matchStart = !dateRange.startDate || c.isoDate >= dateRange.startDate;
      const matchEnd = !dateRange.endDate || c.isoDate <= dateRange.endDate;

      return matchSearch && matchStatus && matchType && matchVariety && matchStart && matchEnd;
    });
  }, [search, status, productType, riceVariety, dateRange]);

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contracts"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
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

          <CustomDropdown label="Contract Status" options={CONTRACT_STATUSES} value={status} onChange={setStatus} />
          <CustomDropdown label="Product Type" options={PRODUCT_TYPES} value={productType} onChange={setProductType} />
          <CustomDropdown label="Rice Variety" options={RICE_VARIETIES} value={riceVariety} onChange={setRiceVariety} />
          <CustomDropdown label="Sort By" options={SORT_OPTIONS} value={sortBy} onChange={setSortBy} />
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredContracts.map((contract, index) => (
          <ContractCard key={`${contract.id}-${index}`} contract={contract} />
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-gray-500">No contracts found matching your filters.</p>
        </div>
      )}
    </div>
  );
}