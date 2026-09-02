import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(TODAY.getDate() - 1);
const OLDER = new Date("2026-07-18");

const makeRows = (dateObj, count, idPrefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    category: "Miller Operations",
    amount: 10370.20,
    paidBy: "Finance A",
    expense_date: dateObj.toISOString(),
    status: "Paid",
  }));

const ALL_DATA = [
  ...makeRows(TODAY,     3, "t"),
  ...makeRows(YESTERDAY, 3, "y"),
  ...makeRows(OLDER,     3, "o"),
];

function groupByDate(rows) {
  const buckets = {};
  rows.forEach((r) => {
    const d = new Date(r.expense_date);
    const today    = new Date(); today.setHours(0,0,0,0);
    const yest     = new Date(today); yest.setDate(today.getDate()-1);
    const dMid     = new Date(d); dMid.setHours(0,0,0,0);
    let label;
    if (dMid.getTime() === today.getTime()) label = "Today";
    else if (dMid.getTime() === yest.getTime()) label = "Yesterday";
    else label = "July 18, 2026";
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(r);
  });
  return Object.entries(buckets).map(([label, rows]) => ({ label, rows }));
}

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

export default function MillerDriverReimbursementHistory() {
  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState("");
  const [sort,   setSort]   = useState("");
  const [page,   setPage]   = useState(1);

  const ITEMS = 10;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_DATA.filter((r) => {
      if (q && !(`${r.category} ${r.paidBy}`.toLowerCase().includes(q))) return false;
      if (status && r.status.toLowerCase() !== status.toLowerCase()) return false;
      return true;
    });
  }, [query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS));
  const start = (page - 1) * ITEMS;
  const paginated = filtered.slice(start, start + ITEMS);
  const sections = groupByDate(paginated);

  const columns = [
    {
      key: "category",
      label: "Expense Category",
      width: "30%",
      renderCell: (r) => (
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-100/80 text-amber-700">
            {r.category}
          </span>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {new Date(r.expense_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Amount",
      width: "20%",
      renderCell: (r) => (
        <span className="font-bold text-gray-900 text-xs">
          ₱{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "paidBy",
      label: "Paid By",
      width: "20%",
      renderCell: (r) => (
        <span className="text-xs font-semibold text-gray-700">{r.paidBy}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "15%",
      headerClassName: "text-center",
      cellClassName: "text-center",
      renderCell: (r) => (
        <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
          {r.status}
        </span>
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
          onClick={() => alert(`Viewing details for reimbursement: ${r.id}`)}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-slate-50 cursor-pointer"
        >
          View Details
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "History" }, { label: "Reimbursement History" }]} />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-tight text-slate-900">
          Reimbursement History
        </h2>
        <p className="text-sm text-slate-500">
          Submit and review payments collected from miller deliveries.
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
            placeholder="Search category or paid by..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700"
          />
        </div>

        <DateRangePicker />

        <FilterSelect
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={[
            { label: "All Statuses", value: "" },
            { label: "Paid",         value: "Paid" },
            { label: "Approved",     value: "Approved" },
            { label: "Pending",      value: "Pending" },
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

      {/* ── Reimbursement History Table ────────────────────────────────────── */}
      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, filtered.length)} of ${filtered.length} reimbursement records`}
      />
    </div>
  );
}