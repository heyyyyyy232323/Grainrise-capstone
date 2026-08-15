import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sample = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  category: "Logistic / Delivery Reimbursement",
  date: "Apr 12, 2026",
  description: "Use for toll fee",
  cost: "₱150.00",
  requester: "Logistics A",
}));

export default function MillerReimburse() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sample.filter((r) => {
      if (q && !(`${r.category} ${r.description} ${r.requester}`.toLowerCase().includes(q))) return false;
      if (category && category !== "") return r.category === category;
      return true;
    });
  }, [query, category]);

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
          className="inline-flex items-center justify-center px-3 py-0.5 h-7 rounded-full text-white text-xs font-semibold hover:bg-[#016b0f]"
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

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0 flex items-center justify-between">
          <div className="w-full md:w-1/2">
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-0 max-w-3xl">
                <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search description or category" />
              </div>
              <div className="w-44 flex-none">
                <Dropdown
                  options={[{ label: "All Categories", value: "" }, { label: "Logistic / Delivery Reimbursement", value: "Logistic / Delivery Reimbursement" }]}
                  value={category}
                  onChange={(v) => { setCategory(v); setPage(1); }}
                  placeholder="All Categories"
                />
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-3">
            <div className="inline-block px-3 py-1 rounded-md bg-amber-50 text-amber-700 text-sm font-semibold">10 pending</div>
          </div>
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
