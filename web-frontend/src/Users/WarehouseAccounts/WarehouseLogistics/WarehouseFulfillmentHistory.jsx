import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

const SORT_OPTIONS = [
  { value: "variant-asc",  label: "Variant (A-Z)"                },
  { value: "code-asc",     label: "Product Code (A-Z)"           },
  { value: "qty-asc",      label: "Stock Quantity (Low to High)" },
  { value: "exp-asc",      label: "Expiration Date (Nearest)"    },
];

const sampleFulfill = Array.from({ length: 52 }, (_, i) => ({
  id: `f-${i + 1}`,
  variant: "Dinorado",
  customer: "Retailer A",
  delivered: "400 kg",
  passed: "300 kg",
  failed: "100 kg",
}));

export default function FulfillmentHistory() {
  const [query, setQuery] = useState("");
  const [qcStatusFilter, setQcStatusFilter] = useState("QC Status");
  const [sortBy, setSortBy] = useState("date-desc");
  const [page, setPage] = useState(1);

  const columns = [
    { key: "variant", label: "Variant" },
    { key: "customer", label: "Customer" },
    { key: "delivered", label: "Delivered (kg)" },
    { key: "passed", label: "Passed QC (kg)" },
    { key: "failed", label: "Failed QC (kg)" },
    { key: "action", label: "Action", headerClassName: "text-center", cellClassName: "!text-center !pr-3" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleFulfill.filter((r) => {
      if (q !== "" && !`${r.variant} ${r.customer}`.toLowerCase().includes(q)) return false;
      if (qcStatusFilter === "QC Status" || qcStatusFilter === "All") return true;

      const status = r.passed === "0 kg" ? "Failed" : r.failed === "0 kg" ? "Passed" : "Partial";
      return status === qcStatusFilter;
    });
  }, [query, qcStatusFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Records", path: "/warehouse-logistics/dashboard" }, { label: "Fulfillment History" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fulfillment History</h1>
        <p className="text-sm text-slate-500 mt-1">View completed fulfillment and delivery records.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] max-w-xl">
              <SearchFilter
                onSearch={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search order no., batch no., product, or customer"
              />
            </div>
            <div className="flex-none">
              <select
                value={qcStatusFilter}
                onChange={(e) => { setQcStatusFilter(e.target.value); setPage(1); }}
                className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-emerald-500 outline-none min-w-[120px] h-[38px]"
              >
                <option value="QC Status">QC Status</option>
                <option value="All">All Statuses</option>
                <option value="Partial">Partial</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div className="flex-none">
              <DateRangePicker onDateChange={() => {}} />
            </div>
            <div className="flex-none">
              <SortByDropdown value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
            </div>
          </div>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} fulfillment records`}
      />
    </div>
  );
}