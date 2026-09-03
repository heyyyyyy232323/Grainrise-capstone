import { useState, useMemo } from "react";
import { Search, Calendar } from "lucide-react";

// ── Mock Contracts Data ──────────────────────────────────────────────────
const STATUS_TYPES = ["Due Soon", "Active", "Completed", "Cancelled"];

const MOCK_CONTRACTS = Array.from({ length: 12 }, (_, i) => {
  const status = STATUS_TYPES[i % 4];
  return {
    id: `CON-2024-8832`,
    buyerName: "ABC Rice Mill",
    buyerId: "BYR-772",
    product: "Milled Palay",
    variety: "Dinorado",
    quantity: "2,500 kg",
    pricePerKg: "₱20.00",
    totalValue: "₱50,000.00", // Adjusted to reflect accurate 2,500 kg * ₱20 calculation
    fulfillmentDate: "Oct 15, 2024",
    status: status,
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  };
});

const CONTRACT_STATUSES = ["Contract Status", "Due Soon", "Active", "Completed", "Cancelled"];
const PRODUCT_TYPES = ["Product Type", "Milled Palay"];
const RICE_VARIETIES = ["Rice Variety", "Dinorado"];
const YEARS = ["Year", "2024", "2025", "2026"];
const MONTHS = ["Month", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SORT_OPTIONS = ["Sort By", "Date: Newest", "Date: Oldest", "Value: High to Low", "Value: Low to High"];

const STATUS_STYLES = {
  "Due Soon": "bg-amber-100 text-amber-700",
  Active: "bg-emerald-100 text-emerald-700",
  Completed: "bg-blue-100 text-blue-600",
  Cancelled: "bg-gray-100 text-gray-500",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2 pr-7 text-xs font-medium text-gray-700 outline-none focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
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
  const [status, setStatus] = useState(CONTRACT_STATUSES[0]);
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [riceVariety, setRiceVariety] = useState(RICE_VARIETIES[0]);
  const [year, setYear] = useState(YEARS[0]);
  const [month, setMonth] = useState(MONTHS[0]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

  const filteredContracts = useMemo(() => {
    return MOCK_CONTRACTS.filter((c) => {
      const matchSearch =
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        c.buyerId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = status === "Contract Status" || c.status === status;
      const matchType = productType === "Product Type" || c.product === productType;
      const matchVariety = riceVariety === "Rice Variety" || c.variety === riceVariety;

      return matchSearch && matchStatus && matchType && matchVariety;
    });
  }, [search, status, productType, riceVariety]);

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts"
            className="w-full pl-9 pr-4 py-1.5 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterSelect value={status} onChange={setStatus} options={CONTRACT_STATUSES} />
          <FilterSelect value={productType} onChange={setProductType} options={PRODUCT_TYPES} />
          <FilterSelect value={riceVariety} onChange={setRiceVariety} options={RICE_VARIETIES} />
          <FilterSelect value={year} onChange={setYear} options={YEARS} />
          <FilterSelect value={month} onChange={setMonth} options={MONTHS} />
          <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
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