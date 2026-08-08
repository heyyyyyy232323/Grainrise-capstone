import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sampleTaxes = Array.from({ length: 24 }, (_, i) => ({
  id: `t-${i + 1}`,
  tax: "3% Percentage Tax",
  description: "Non-VAT percentage tax obligation",
  amount: "₱1,250.00",
  period: i % 2 === 0 ? "Quarterly" : "Yearly",
  dueDate: "Sep 30, 2026",
}));

export default function WarehouseTaxes() {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleTaxes.filter((r) => {
      if (q && !(`${r.tax} ${r.description}`.toLowerCase().includes(q))) return false;
      if (period && period !== "") return r.period === period;
      return true;
    });
  }, [query, period]);

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
          className="inline-flex items-center justify-center px-3 py-0.5 h-7 rounded-full text-white text-xs font-semibold hover:bg-[#016b0f]"
          style={{ backgroundColor: "#018311", minWidth: 80 }}
        >
          Mark as Paid
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/warehouse-finance/dashboard" }, { label: "Taxes" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Taxes</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage tax obligations and recurring business fees.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0 flex items-center justify-between">
          <div className="w-full md:w-1/2">
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-0 max-w-3xl">
                <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search tax name, description" />
              </div>
              <div className="w-44 flex-none">
                <Dropdown
                  options={[{ label: "All", value: "" }, { label: "Quarterly", value: "Quarterly" }, { label: "Yearly", value: "Yearly" }]}
                  value={period}
                  onChange={(v) => { setPeriod(v); setPage(1); }}
                  placeholder="Tax Period"
                />
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-3">
            <div className="inline-block px-3 py-1 rounded-md bg-rose-50 text-rose-700 text-sm font-semibold">10 pending</div>
          </div>
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
