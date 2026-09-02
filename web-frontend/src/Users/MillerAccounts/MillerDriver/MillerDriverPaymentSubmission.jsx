import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
    retailer: "Dinorado Rice",
    qty: "500 kg",
    paymentMethod: i % 2 === 0 ? "Online Payment" : "Cash on Delivery",
    amount: "₱25,000.00",
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

const STATUS_BADGE = {
  Paid:    "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
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

export default function MillerDriverPaymentSubmission() {
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
      width: "24%",
      renderCell: (r) => (
        <div>
          <p className="font-bold text-gray-900 text-xs">{r.batchNo}</p>
          <p className="text-[11px] text-gray-500 font-medium">{r.retailer}</p>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Qty (kg)",
      width: "12%",
      renderCell: (r) => <span className="text-xs text-gray-700 font-medium">{r.qty}</span>,
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      width: "18%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${METHOD_BADGE[r.paymentMethod] || "bg-gray-100 text-gray-600"}`}>
          {r.paymentMethod}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "14%",
      renderCell: (r) => <span className="font-bold text-gray-900 text-xs">{r.amount}</span>,
    },
    {
      key: "status",
      label: "Status",
      width: "10%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: "paidAt",
      label: "Paid At",
      width: "10%",
      renderCell: (r) => <span className="text-xs text-gray-500 font-medium">{r.paidAt}</span>,
    },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <button
          type="button"
          onClick={() => alert(`${r.actionLabel}: ${r.id}`)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-semibold transition cursor-pointer ${
            r.actionLabel === "Submit Receipt"
              ? "bg-[#0B5D1E] hover:bg-[#094d19] text-white"
              : "border border-slate-200 bg-white text-gray-700 hover:bg-slate-50"
          }`}
        >
          {r.actionLabel}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Finance" }, { label: "Payment Submission" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Payment Submission
        </h2>
        <p className="text-sm text-slate-500">
          Submit and review payments collected from retailer deliveries.
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
            placeholder="Search batch, retailer, or destination"
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
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { label: "Payment Status", value: "" },
            { label: "Paid",           value: "Paid" },
            { label: "Pending",        value: "Pending" },
          ]}
        />
      </div>

      {/* ── Payment Submission Table ────────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, filtered.length)} of ${filtered.length} payment records`}
      />
    </div>
  );
}