import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";

const sampleReturns = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  variant: "Dinorado",
  orderNo: `Batch A2026 - 00${(i % 9) + 1}`,
  retailer: "Retailer A",
  qty: "10 kg",
}));

export default function ProductReturns() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const columns = [
    { key: "variant", label: "Variant" },
    { key: "orderNo", label: "Order No." },
    { key: "retailer", label: "Retailer" },
    { key: "qty", label: "Quantity" },
    { key: "action", label: "Action", headerClassName: "text-center", cellClassName: "!text-center !pr-3" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleReturns.filter((r) => q === "" || `${r.variant} ${r.orderNo} ${r.retailer}`.toLowerCase().includes(q));
  }, [query]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Delivery Operations", path: "/warehouse-logistics/dashboard" }, { label: "Product Returns" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Product Return Issues</h1>
        <p className="text-sm text-slate-500 mt-1">Review product return requests and reported issues from retailers.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0">
          <div className="w-full md:w-1/2">
            <div className="max-w-3xl">
              <SearchFilter
                onSearch={(v) => { setQuery(v); setPage(1); }}
                placeholder="Search order no., batch no., product, or retailer"
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
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} return requests`}
      />
    </div>
  );
}