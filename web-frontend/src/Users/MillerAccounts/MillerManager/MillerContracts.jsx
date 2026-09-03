import { useState, useMemo } from "react";
import { Search, MapPin } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import PostingsTab from "./PostingTab";
import CurrentContractsTab from "./CurrentContactsTab";
import MessagesTab from "./MessagesTab";

const TABS = [
  { id: "bidding", label: "Bidding Offers" },
  { id: "postings", label: "Postings" },
  { id: "contracts", label: "Current Contracts" },
  { id: "messages", label: "Messages" },
];

// ── Mock Bidding Offers ─────────────────────────────────────────────────
const MOCK_BIDDING_OFFERS = Array.from({ length: 12 }, (_, i) => {
  const isEndingSoon = i % 4 === 2 || i % 4 === 3;
  return {
    id: `bid-${i + 1}`,
    farmer: "Juan Dela Cruz",
    farm: "Nueva Ecija Farm",
    productType: "Paddy Rice (Palay)",
    variety: "Dinorado, Grade A",
    quantity: "4,000 kg",
    askingPrice: "₱24.00",
    availability: "Oct 15 - Oct 30",
    deadline: isEndingSoon ? "Tomorrow, 5PM" : "Oct 10, 2024",
    urgent: isEndingSoon,
    status: isEndingSoon ? "Ending Soon" : "Open",
  };
});

const PRODUCT_TYPES = ["All Types", "Paddy Rice (Palay)"];
const VARIETIES = ["All Varieties", "Dinorado, Grade A"];
const BIDDING_STATUSES = ["All Statuses", "Open", "Ending Soon"];
const SORT_OPTIONS = ["Deadline: Soonest", "Asking Price: High to Low", "Asking Price: Low to High"];

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
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
    </div>
  );
}

function BiddingOfferCard({ offer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-gray-900">{offer.farmer}</h3>
        <span className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${STATUS_STYLES[offer.status]}`}>
          {offer.status}
        </span>
      </div>

      <p className="flex items-center gap-1 text-xs text-gray-500">
        <MapPin size={13} /> {offer.farm}
      </p>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{offer.productType}</p>
        <p className="text-base font-bold text-gray-900">{offer.variety}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
        <div>
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="text-sm font-bold text-gray-900">{offer.quantity}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Asking Price</p>
          <p className="text-sm font-bold text-gray-900">
            {offer.askingPrice}<span className="text-xs font-medium text-gray-500">/kg</span>
          </p>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Availability:</span>
          <span className="font-semibold text-gray-800">{offer.availability}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className={offer.urgent ? "font-semibold text-red-600" : "text-gray-500"}>Deadline:</span>
          <span className={`font-semibold ${offer.urgent ? "text-red-600" : "text-gray-800"}`}>{offer.deadline}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => alert(`Viewing bidding offer: ${offer.id} - ${offer.farmer}`)}
        className="w-full rounded-xl border border-[#0B5D1E] py-2 text-sm font-bold text-[#0B5D1E] transition hover:bg-emerald-50 cursor-pointer"
      >
        View Details
      </button>
    </div>
  );
}

function TabPlaceholder({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <p className="text-sm font-semibold text-gray-500">{label} content coming soon.</p>
    </div>
  );
}

export default function MillerContracts() {
  const [activeTab, setActiveTab] = useState("postings");
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState("All Types");
  const [variety, setVariety] = useState("All Varieties");
  const [biddingStatus, setBiddingStatus] = useState("All Statuses");
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

  const activeTabLabel = TABS.find((tab) => tab.id === activeTab)?.label ?? "Contracts";

  const filteredOffers = useMemo(() => {
    let result = MOCK_BIDDING_OFFERS.filter((o) => {
      const matchSearch =
        o.farmer.toLowerCase().includes(search.toLowerCase()) ||
        o.farm.toLowerCase().includes(search.toLowerCase()) ||
        o.variety.toLowerCase().includes(search.toLowerCase());
      const matchType = productType === "All Types" || o.productType === productType;
      const matchVariety = variety === "All Varieties" || o.variety === variety;
      const matchStatus = biddingStatus === "All Statuses" || o.status === biddingStatus;
      return matchSearch && matchType && matchVariety && matchStatus;
    });

    if (sortBy === "Asking Price: High to Low") {
      result = [...result].sort((a, b) => parseFloat(b.askingPrice.replace(/[^\d.]/g, "")) - parseFloat(a.askingPrice.replace(/[^\d.]/g, "")));
    } else if (sortBy === "Asking Price: Low to High") {
      result = [...result].sort((a, b) => parseFloat(a.askingPrice.replace(/[^\d.]/g, "")) - parseFloat(b.askingPrice.replace(/[^\d.]/g, "")));
    } else {
      result = [...result].sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1));
    }

    return result;
  }, [search, productType, variety, biddingStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: activeTabLabel }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          {activeTabLabel}
        </h2>
        <p className="text-sm text-slate-500">
          Manage your bidding offers and related activities in one place.
        </p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── Tab Views ────────────────────────────────────────────────────── */}
      {activeTab === "bidding" && (
        <div className="space-y-5">
          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search farmer, farm, or variety"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect value={productType} onChange={setProductType} options={PRODUCT_TYPES} />
              <FilterSelect value={variety} onChange={setVariety} options={VARIETIES} />
              <FilterSelect value={biddingStatus} onChange={setBiddingStatus} options={BIDDING_STATUSES} />
              <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
            </div>
          </div>

          {/* Bidding Offers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredOffers.map((offer) => (
              <BiddingOfferCard key={offer.id} offer={offer} />
            ))}
          </div>

          {filteredOffers.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <p className="text-sm font-semibold text-gray-500">No bidding offers matched your search or filters.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "postings" && <PostingsTab />}
      {activeTab === "contracts" && <CurrentContractsTab />}
      {activeTab === "messages" && <MessagesTab />}

      {activeTab !== "bidding" && activeTab !== "postings" && activeTab !== "contracts" && activeTab !== "messages" && (
        <TabPlaceholder label={TABS.find((t) => t.id === activeTab)?.label} />
      )}
    </div>
  );
}