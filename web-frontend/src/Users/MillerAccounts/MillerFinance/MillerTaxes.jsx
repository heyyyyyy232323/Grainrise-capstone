import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sampleTaxes = Array.from({ length: 24 }, (_, i) => ({
  id: `t-${i + 1}`,
  tax: "3% Percentage Tax",
  description: "Non-VAT percentage tax obligation",
  amount: "₱1,250.00",
  period: i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
}));

const SORT_OPTIONS = [
  { value: "tax-asc", label: "Tax Name (A-Z)" },
  { value: "period-asc", label: "Tax Period (A-Z)" },
  { value: "due-asc", label: "Due Date" },
];

export default function MillerTaxes() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [sortBy, setSortBy] = useState("tax-asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleTaxes.filter((r) => {
      if (q && !(`${r.tax} ${r.description}`.toLowerCase().includes(q))) return false;
      if (period && period !== "") return r.period === period;
      return true;
    });
    if (sortBy === "tax-asc") result.sort((a, b) => a.tax.localeCompare(b.tax));
    else if (sortBy === "period-asc") result.sort((a, b) => a.period.localeCompare(b.period));
    return result;
  }, [query, period, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = [
    { key: "tax", label: "Tax" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Amount" },
    { key: "period", label: "Tax Period" },
    { key: "dueDate", label: "Due Date" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => (
        <button
          type="button"
          onClick={() => alert(`Marking ${row.tax} as paid`) }
          className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-lg text-white text-xs font-semibold hover:bg-[#016b0f] transition cursor-pointer"
          style={{ backgroundColor: "#018311", minWidth: 80 }}
        >
          Mark as Paid
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/miller-finance/dashboard" }, { label: "Taxes" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Taxes</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage tax obligations and recurring business fees.</p>
      </div>

      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search tax name, description" />
          </div>

          <div className="w-36">
            <Dropdown
              options={[{ label: "All Periods", value: "" }, { label: "Quarterly", value: "Quarterly" }, { label: "Yearly", value: "Yearly" }]}
              value={period}
              onChange={(v) => { setPeriod(v); setPage(1); }}
              placeholder="Tax Period"
            />
          </div>

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
        </div>

        <div className="inline-block px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-sm font-semibold border border-rose-200">
          10 pending
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} tax records`}
      />
    </div>
  );
}
