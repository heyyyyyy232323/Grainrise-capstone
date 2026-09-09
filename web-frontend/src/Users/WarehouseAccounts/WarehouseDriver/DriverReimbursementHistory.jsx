import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const TODAY = new Date();
const YESTERDAY = new Date(TODAY); YESTERDAY.setDate(TODAY.getDate() - 1);
const OLDER = new Date("2026-07-18");

const makeRows = (dateObj, count, idPrefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${idPrefix}-${i}`,
    category: "Warehouse Operations",
    categoryType: "operation",
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

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "" },
  { label: "Paid",         value: "Paid" },
  { label: "Approved",     value: "Approved" },
  { label: "Pending",      value: "Pending" },
];

const SORT_OPTIONS = [
  { label: "Sort By", value: "" },
  { label: "Newest",  value: "newest" },
  { label: "Oldest",  value: "oldest" },
];

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
  const displayLabel = selectedOption && selectedOption.value !== "" ? selectedOption.label : label;
  const isSelected = value && value !== "" && value !== "all";

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer h-[38px] ${
          isSelected ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
        }`}
      >
        <span>{displayLabel}</span>
        <ChevronDown
          size={16}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 sm:left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[160px] animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                value === opt.value
                  ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DriverReimbursementHistory() {
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
    }).sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.expense_date) - new Date(b.expense_date);
      }
      return new Date(b.expense_date) - new Date(a.expense_date);
    });
  }, [query, status, sort]);

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
          Submit and review payments collected from retailer deliveries.
        </p>
      </div>

      {/* ── Toolbar Layout (Search + Date Range + Filters) ──────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search category or paid by..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-[#0B5D1E] focus:border-[#0B5D1E] outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
        </div>

        <DateRangePicker />

        <CustomDropdown
          label="All Statuses"
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={STATUS_OPTIONS}
        />

        <CustomDropdown
          label="Sort By"
          value={sort}
          onChange={(v) => setSort(v)}
          options={SORT_OPTIONS}
        />
      </div>

      {/* ── Table Card Container ────────────────────────────────────────────── */}
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