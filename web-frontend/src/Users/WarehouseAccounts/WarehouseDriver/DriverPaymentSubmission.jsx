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
    retailer: "Dinorado",
    qty: "500 kg",
    paymentMethod: i % 2 === 0 ? "Online Payment" : "Cash on Delivery",
    amount: "500 kg",
    status: i % 3 === 0 ? "Pending" : "Paid",
    paidAt: "10:25 AM",
    delivery_date: dateObj.toISOString(),
    actionLabel: i % 3 === 0 ? "Submit Receipt" : "View Details",
  }));

const ALL_DATA = [
  ...makeRows(TODAY,     3, "t"),
  ...makeRows(YESTERDAY, 4, "y"),
  ...makeRows(OLDER,     3, "o"),
];

function groupByDate(rows) {
  const buckets = {};
  rows.forEach((r) => {
    const d = new Date(r.delivery_date);
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

export default function DriverPaymentSubmission() {
  const [query,   setQuery]   = useState("");
  const [method,  setMethod]  = useState("");
  const [status,  setStatus]  = useState("");
  const [page,    setPage]    = useState(1);

  const ITEMS = 10;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_DATA.filter((r) => {
      if (q && !(`${r.batchNo} ${r.retailer}`.toLowerCase().includes(q))) return false;
      if (method && r.paymentMethod !== method) return false;
      if (status && r.status.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [query, method, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const start = (page - 1) * ITEMS;
  const paginated = filtered.slice(start, start + ITEMS);
  const sections = groupByDate(paginated);

  const columns = [
    {
      key: "batchNo",
      label: "Delivery / Retailer",
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{r.batchNo}</p>
          <p className="text-[11px] text-slate-500">{r.retailer}</p>
        </div>
      ),
    },
    { key: "qty", label: "Qty (kg)" },
    {
      key: "paymentMethod",
      label: "Payment Method",
      render: (r) => (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${METHOD_BADGE[r.paymentMethod] || "bg-slate-100 text-slate-600"}`}>
          {r.paymentMethod}
        </span>
      ),
    },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "paidAt", label: "Paid At" },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            r.actionLabel === "Submit Receipt"
              ? "bg-[#0B5D1E] hover:bg-[#094d19] text-white"
              : "border border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
          }`}
          onClick={() => alert(`${r.actionLabel}: ${r.id}`)}
        >
          {r.actionLabel}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "Finance" }, { label: "Payment Submission" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payment Submission</h1>
        <p className="text-sm text-slate-500 mt-1">Submit and review payments collected from retailer deliveries.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search batch, retailer, or destination" />
        </div>
        <DateRangePicker />
        <Dropdown
          options={[
            { label: "Payment Method",     value: "" },
            { label: "Online Payment",     value: "Online Payment" },
            { label: "Cash on Delivery",   value: "Cash on Delivery" },
          ]}
          value={method}
          onChange={(v) => { setMethod(v); setPage(1); }}
          placeholder="Payment Method"
        />
        <Dropdown
          options={[
            { label: "Payment Status", value: "" },
            { label: "Paid",           value: "Paid" },
            { label: "Pending",        value: "Pending" },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          placeholder="Payment Status"
        />
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, filtered.length)} of ${filtered.length} payment records`}
        onViewDetails={() => {}}
      />
    </div>
  );
}
