import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sample = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  category: "Logistic / Delivery Reimbursement",
  date: "Apr 12, 2026",
  description: "Use for toll fee",
  cost: "₱150.00",
  requester: "Logistics A",
}));

const SORT_OPTIONS = [
  { value: "category-asc", label: "Category (A-Z)" },
  { value: "requester-asc", label: "Requester (A-Z)" },
  { value: "cost-desc", label: "Cost (High to Low)" },
  { value: "cost-asc", label: "Cost (Low to High)" },
];

export default function MillerReimburse() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("category-asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sample.filter((r) => {
      if (q && !(`${r.category} ${r.description} ${r.requester}`.toLowerCase().includes(q))) return false;
      if (category && category !== "") return r.category === category;
      return true;
    });
    if (sortBy === "category-asc") result.sort((a, b) => a.category.localeCompare(b.category));
    else if (sortBy === "requester-asc") result.sort((a, b) => a.requester.localeCompare(b.requester));
    else if (sortBy === "cost-desc") result.sort((a, b) => parseFloat(b.cost.replace(/[^\d.]/g, "")) - parseFloat(a.cost.replace(/[^\d.]/g, "")));
    else if (sortBy === "cost-asc") result.sort((a, b) => parseFloat(a.cost.replace(/[^\d.]/g, "")) - parseFloat(b.cost.replace(/[^\d.]/g, "")));
    return result;
  }, [query, category, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = [
    {
      key: "category",
      label: "Expense Category",
      render: (row) => (
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="inline-block rounded-full bg-sky-100 text-sky-700 px-3 py-1 text-xs font-semibold">{row.category}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">{row.date}</div>
        </div>
      ),
    },
    { key: "description", label: "Description" },
    { key: "cost", label: "Cost" },
    { key: "requester", label: "Requested By" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => (
        <button
          type="button"
          onClick={() => alert(`Marking ${row.id} as paid`) }
          className="inline-flex items-center justify-center px-3 py-1 h-7 rounded-lg text-white text-xs font-semibold hover:bg-[#016b0f] transition cursor-pointer"
          style={{ backgroundColor: "#018311", minWidth: 88 }}
        >
          Mark as Paid
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/miller-finance/dashboard" }, { label: "Reimburse" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Reimburse</h1>
        <p className="text-sm text-slate-500 mt-1">Pending expense requests awaiting payment approval.</p>
      </div>

      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search description or category" />
          </div>

          <div className="w-full sm:w-60">
            <Dropdown
              options={[{ label: "All Categories", value: "" }, { label: "Logistic / Delivery Reimbursement", value: "Logistic / Delivery Reimbursement" }]}
              value={category}
              onChange={(v) => { setCategory(v); setPage(1); }}
              placeholder="All Categories"
            />
          </div>

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
        </div>

        <div className="inline-block px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200">
          10 pending
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} reimbursement requests`}
      />
    </div>
  );
}
