import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(TODAY.getDate() - 1);
const OLDER = new Date("2026-07-19");

const makeRows = (dateObj, count, prefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    batchNo: "BATCH 2026 - 001",
    product: "Dinorado Rice · 10kg",
    retailer: "Retailer A",
    deliveryAddress: "Retailer Outlet #1, City Hub",
    paymentMethod: i % 2 === 0 ? "Online Payment" : "Cash on Delivery",
    eta: dateObj.getTime() === TODAY.setHours(0,0,0,0) ? "Today" : dateObj.getTime() === YESTERDAY.setHours(0,0,0,0) ? "Yesterday" : "July 19, 2026",
    etaTime: "10:00 AM",
    status: "Completed",
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
    else label = d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(r);
  });
  return Object.entries(buckets).map(([label, rows]) => ({ label, rows }));
}

const METHOD_BADGE = {
  "Online Payment":   "bg-emerald-100 text-emerald-700",
  "Cash on Delivery": "bg-amber-100 text-amber-700",
};

export default function MillerDriverAssignedHistory() {
  const [query,  setQuery]  = useState("");
  const [method, setMethod] = useState("");
  const [sort,   setSort]   = useState("");
  const [page,   setPage]   = useState(1);

  const ITEMS = 10;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_DATA.filter((r) => {
      if (q && !(`${r.batchNo} ${r.retailer} ${r.deliveryAddress}`.toLowerCase().includes(q))) return false;
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
      label: "Order / Delivery",
      render: (r) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800 text-xs">{r.batchNo}</p>
          <p className="text-[11px] text-slate-500">{r.product}</p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500 opacity-70" />
            {r.retailer}
          </p>
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-slate-300" />
            {r.deliveryAddress}
          </p>
        </div>
      ),
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (r) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${METHOD_BADGE[r.paymentMethod] || "bg-slate-100 text-slate-600"}`}>
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700">
          {r.status}
        </span>
      ),
    },
    {
      key: "eta",
      label: "Completed Date",
      render: (r) => (
        <div>
          <p className="text-xs font-semibold text-slate-700">{r.eta}</p>
          <p className="text-[11px] text-slate-400">{r.etaTime}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "History" }, { label: "Assigned History" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Assigned History</h1>
        <p className="text-sm text-slate-500 mt-1">Review past delivery assignments and completed runs.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search order, batch, recipient, or destination" />
        </div>
        <DateRangePicker />
        <Dropdown
          options={[
            { label: "Payment Method",   value: "" },
            { label: "Online Payment",   value: "Online Payment" },
            { label: "Cash on Delivery", value: "Cash on Delivery" },
          ]}
          value={method}
          onChange={(v) => { setMethod(v); setPage(1); }}
          placeholder="Payment Method"
        />
        <Dropdown
          options={[
            { label: "Sort By",    value: "" },
            { label: "Newest",     value: "newest" },
            { label: "Oldest",     value: "oldest" },
          ]}
          value={sort}
          onChange={(v) => setSort(v)}
          placeholder="Sort By"
        />
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, filtered.length)} of ${filtered.length} duties`}
        onViewDetails={() => {}}
      />
    </div>
  );
}
