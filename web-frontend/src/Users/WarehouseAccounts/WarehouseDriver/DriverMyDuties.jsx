import { useMemo, useState } from "react";
import { Store, MapPin, Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(TODAY.getDate() - 1);
const OLDER = new Date("2026-07-18");

const makeRows = (dateObj, count, prefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    batchNo: "BATCH 2026 - 001",
    product: "Premium Rice · Qty: 200 kg",
    retailer: "Central Market",
    deliveryAddress: "Sampaloc, Manila",
    paymentMethod: i % 2 === 0 ? "Online Payment" : "Cash on Delivery",
    eta: dateObj.getTime() === TODAY.setHours(0,0,0,0) ? "Today" : dateObj.getTime() === YESTERDAY.setHours(0,0,0,0) ? "Yesterday" : "July 18, 2026",
    etaTime: "10:00 AM",
    duty_date: dateObj.toISOString(),
  }));

const ALL_DATA = [
  ...makeRows(new Date(), 3, "t"),
  ...makeRows(YESTERDAY, 4, "y"),
  ...makeRows(OLDER,     3, "o"),
];

function groupByDate(rows) {
  const buckets = {};
  rows.forEach((r) => {
    const d = new Date(r.duty_date);
    const today = new Date(); today.setHours(0,0,0,0);
    const yest  = new Date(today); yest.setDate(today.getDate()-1);
    const dMid  = new Date(d); dMid.setHours(0,0,0,0);
    let label;
    if (dMid.getTime() === today.getTime()) label = "Today";
    else if (dMid.getTime() === yest.getTime()) label = "Yesterday";
    else label = "July 18, 2026";
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(r);
  });
  return Object.entries(buckets).map(([label, rows]) => ({ label, rows }));
}

const METHOD_BADGE = {
  "Online Payment":   "bg-blue-100 text-blue-600",
  "Cash on Delivery": "bg-amber-100 text-amber-700",
};

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
    </div>
  );
}

export default function DriverMyDuties() {
  const [query,  setQuery]  = useState("");
  const [method, setMethod] = useState("");
  const [sort,   setSort]   = useState("");
  const [page,   setPage]   = useState(1);

  const ITEMS = 10;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_DATA.filter((r) => {
      if (q && !(`${r.batchNo} ${r.retailer} ${r.deliveryAddress} ${r.product}`.toLowerCase().includes(q))) return false;
      if (method && r.paymentMethod !== method) return false;
      return true;
    });
  }, [query, method]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const start = (page - 1) * ITEMS;
  const paginated = filtered.slice(start, start + ITEMS);
  const sections = groupByDate(paginated);

  const columns = [
    {
      key: "batchNo",
      label: "Order/Delivery",
      width: "35%",
      renderCell: (r) => (
        <div className="space-y-1 py-0.5">
          <p className="font-bold text-gray-900 text-xs">{r.batchNo}</p>
          <p className="text-[11px] text-gray-500 font-medium">{r.product}</p>
          <div className="space-y-0.5 text-[10px] text-gray-400 font-medium pt-0.5">
            <p className="flex items-center gap-1.5">
              <Store size={12} className="text-gray-400 shrink-0" />
              <span>{r.retailer}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin size={12} className="text-gray-400 shrink-0" />
              <span>{r.deliveryAddress}</span>
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      width: "25%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${METHOD_BADGE[r.paymentMethod] || "bg-gray-100 text-gray-600"}`}>
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: "eta",
      label: "ETA",
      width: "25%",
      renderCell: (r) => (
        <div>
          <p className="text-xs font-bold text-gray-800">{r.eta}</p>
          <p className="text-[11px] text-gray-400 font-medium">{r.etaTime}</p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <button
          type="button"
          onClick={() => alert(`Start tracking duty: ${r.id}`)}
          className="rounded-full bg-[#0B5D1E] hover:bg-emerald-800 text-white text-[11px] font-bold px-4 py-1.5 transition cursor-pointer whitespace-nowrap shadow-2xs"
        >
          Start Tracking
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Operations" }, { label: "My Duties" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          My Duties
        </h2>
        <p className="text-sm text-slate-500">
          View and manage your assigned warehouse deliveries.
        </p>
      </div>

      {/* ── Toolbar Layout (Search + Filter Selectors) ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search order, batch, recipient, or destination"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <DateRangePicker />

        <FilterSelect
          value={method}
          onChange={(v) => { setMethod(v); setPage(1); }}
          options={[
            { label: "Payment Method",   value: "" },
            { label: "Online Payment",   value: "Online Payment" },
            { label: "Cash on Delivery", value: "Cash on Delivery" },
          ]}
        />

        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v)}
          options={[
            { label: "Sort By", value: "" },
            { label: "Newest",  value: "newest" },
            { label: "Oldest",  value: "oldest" },
          ]}
        />
      </div>

      {/* ── Duties Table ────────────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing 1-10 of 56 duties`}
      />
    </div>
  );
}