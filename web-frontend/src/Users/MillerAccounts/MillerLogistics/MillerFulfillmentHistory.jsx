import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";

const sampleFulfill = Array.from({ length: 52 }, (_, i) => ({
  id: `f-${i + 1}`,
  variant: "Dinorado",
  customer: "Retailer A",
  delivered: "400 kg",
  passed: "300 kg",
  failed: "100 kg",
}));

export default function MillerFulfillmentHistory() {
  const [query, setQuery] = useState("");
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
    return sampleFulfill.filter((r) => q === "" || `${r.variant} ${r.customer}`.toLowerCase().includes(q));
  }, [query]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Records", path: "/miller-logistics/dashboard" }, { label: "Fulfillment History" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Fulfillment History</h1>
        <p className="text-sm text-slate-500 mt-1">View completed fulfillment and delivery records.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0">
          <div className="w-full md:w-1/2">
            <div className="max-w-3xl">
              <SearchFilter
                onSearch={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search order no., batch no., product, or customer"
              />
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
