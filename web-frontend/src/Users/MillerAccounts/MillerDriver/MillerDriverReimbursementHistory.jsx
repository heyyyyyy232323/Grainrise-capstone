import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(TODAY.getDate() - 1);
const OLDER = new Date("2026-07-19");

const makeRows = (dateObj, count, idPrefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    category: "Miller Operations",
    amount: 10370.20,
    paidBy: "Finance A",
    expense_date: dateObj.toISOString(),
    status: "Paid",
    actionLabel: "View Details",
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
    else label = d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(r);
  });
  return Object.entries(buckets).map(([label, rows]) => ({ label, rows }));
}

export default function MillerDriverReimbursementHistory() {
  const [query,  setQuery]  = useState("");
  const [status, setStatus] = useState("");
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
    { key: "category", label: "Expense Category" },
    { key: "amount",   label: "Amount",
      render: (r) => <span>₱{r.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</span> },
    { key: "paidBy",   label: "Paid By" },
    { key: "status",   label: "Status" },
    { key: "action",   label: "Action" },
  ];

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "History" }, { label: "Reimbursement History" }]} />
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimbursement History</h1>
        <p className="text-sm text-slate-500 mt-1">Submit and review payments collected from miller deliveries.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-sm">
          <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search batch, vehicle, or name" />
        </div>
        <DateRangePicker />
        <Dropdown
          options={[
            { label: "All Statuses", value: "" },
            { label: "Paid",         value: "Paid" },
            { label: "Approved",     value: "Approved" },
            { label: "Pending",      value: "Pending" },
          ]}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          placeholder="All Statuses"
        />
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${start + 1}–${Math.min(start + paginated.length, filtered.length)} of ${filtered.length} reimbursement records`}
        onViewDetails={() => {}}
      />
    </div>
  );
}
