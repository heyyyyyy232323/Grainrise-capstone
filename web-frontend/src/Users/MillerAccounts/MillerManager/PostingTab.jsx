import { useState, useMemo } from "react";
import { Search, MapPin, Users, Plus } from "lucide-react";

// ── Mock Postings Data ──────────────────────────────────────────────────
const MOCK_POSTINGS = Array.from({ length: 12 }, (_, i) => {
  const isEndingSoon = i % 3 !== 0;
  return {
    id: `POST-2026-00${i + 1}`,
    productType: "Palay",
    variety: "NSIC Rc 222",
    grade: "Premium Grade",
    requiredQty: "5,000 kg",
    buyingPrice: "₱25.00/kg",
    warehouse: "San Miguel Warehouse",
    status: isEndingSoon ? "Ending Soon" : "Open",
    closesInfo: isEndingSoon ? "2 days remaining" : "Closes: Oct 15, 2026",
    applicationsCount: 8,
  };
});

const PRODUCT_TYPES = ["Product Type", "Palay"];
const VARIETIES = ["Variety", "NSIC Rc 222"];
const BIDDING_STATUSES = ["Bidding Status", "Open", "Ending Soon"];
const SORT_OPTIONS = ["Sort By", "Deadline: Soonest", "Price: High to Low", "Price: Low to High"];

const STATUS_STYLES = {
  Open: "bg-emerald-100 text-emerald-700",
  "Ending Soon": "bg-amber-100 text-amber-700",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 pr-8 text-sm font-medium text-gray-700 outline-none focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
    </div>
  );
}

function PostingCard({ posting }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header: ID & Status */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{posting.id}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLES[posting.status]}`}>
            {posting.status}
          </span>
        </div>

        {/* Variety & Grade */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500">{posting.productType}</p>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{posting.variety}</h3>
          <p className="text-xs text-gray-400 font-medium">{posting.grade}</p>
        </div>

        {/* Specs Box */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
          <div>
            <p className="text-[11px] font-medium text-gray-500">Required Qty</p>
            <p className="text-sm font-bold text-emerald-700">{posting.requiredQty}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500">Buying Price</p>
            <p className="text-sm font-bold text-gray-900">{posting.buyingPrice}</p>
          </div>
        </div>

        {/* Meta Info */}
        <div className="space-y-1 text-xs text-gray-500 font-medium">
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="text-gray-400" />
            <span>{posting.warehouse}</span>
          </p>
          <p className={`pl-5 ${posting.status === "Ending Soon" ? "text-amber-600 font-semibold" : "text-gray-500"}`}>
            {posting.status === "Ending Soon" ? `⏱ ${posting.closesInfo}` : `📅 ${posting.closesInfo}`}
          </p>
        </div>

        {/* Applications Tag */}
        <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <Users size={14} />
          <span>{posting.applicationsCount} Applications Received</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="button"
        onClick={() => alert(`Viewing applications for ${posting.id}`)}
        className="w-full rounded-xl border border-emerald-600 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
      >
        Application Details
      </button>
    </div>
  );
}

export default function PostingsTab() {
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [variety, setVariety] = useState(VARIETIES[0]);
  const [biddingStatus, setBiddingStatus] = useState(BIDDING_STATUSES[0]);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

  const filteredPostings = useMemo(() => {
    return MOCK_POSTINGS.filter((p) => {
      const matchSearch =
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.variety.toLowerCase().includes(search.toLowerCase()) ||
        p.warehouse.toLowerCase().includes(search.toLowerCase());
      const matchType = productType === "Product Type" || p.productType === productType;
      const matchVariety = variety === "Variety" || p.variety === variety;
      const matchStatus = biddingStatus === "Bidding Status" || p.status === biddingStatus;

      return matchSearch && matchType && matchVariety && matchStatus;
    });
  }, [search, productType, variety, biddingStatus]);

  return (
    <div className="space-y-5">
      {/* Search, Filters, & Create Action */}
      <div className="flex flex-col xl:flex-row gap-3 xl:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer, farm, or variety"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect value={productType} onChange={setProductType} options={PRODUCT_TYPES} />
            <FilterSelect value={variety} onChange={setVariety} options={VARIETIES} />
            <FilterSelect value={biddingStatus} onChange={setBiddingStatus} options={BIDDING_STATUSES} />
            <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert("Open Create Posting Modal")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B5D1E] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 transition cursor-pointer whitespace-nowrap"
        >
          <Plus size={16} />
          Create Posting
        </button>
      </div>

      {/* Postings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filteredPostings.map((posting) => (
          <PostingCard key={posting.id} posting={posting} />
        ))}
      </div>

      {filteredPostings.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-sm font-semibold text-gray-500">No postings found matching your filter criteria.</p>
        </div>
      )}
    </div>
  );
}