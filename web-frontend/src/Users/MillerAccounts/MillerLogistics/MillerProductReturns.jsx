import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";

const VARIANT_OPTIONS = [
  { value: "all", label: "All Variants" },
  { value: "dinorado", label: "Dinorado" },
  { value: "sinandomeng", label: "Sinandomeng" },
  { value: "jasmine", label: "Jasmine" },
];

const sampleReturns = Array.from({ length: 24 }, (_, i) => ({
  id: `r-${i + 1}`,
  variant: "Dinorado",
  orderNo: `Batch A2026 - 001`,
  retailer: "Retailer A",
  qty: "10 kg",
}));

export default function MillerProductReturns() {
  const [query, setQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [page, setPage] = useState(1);

  const columns = [
    { key: "variant",  label: "Variant",  width: "22%" },
    { key: "orderNo",  label: "Order No.", width: "28%" },
    { key: "retailer", label: "Retailer",  width: "22%" },
    { key: "qty",      label: "Quantity",  width: "16%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName: "!text-center",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sampleReturns.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.variant} ${r.orderNo} ${r.retailer}`.toLowerCase().includes(q);
      const matchesVariant =
        variantFilter === "all" ||
        r.variant.toLowerCase() === variantFilter;
      return matchesQuery && matchesVariant;
    });
  }, [query, variantFilter]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Delivery Operations", path: "/miller-logistics/dashboard" },
          { label: "Product Returns" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Product Return Issues
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review product return requests and reported issues from retailers.
        </p>
      </div>

      {/* Search + Variant filter row */}
      <div className="mt-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-xl">
            <SearchFilter
              onSearch={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search order no., batch no., product, or retailer"
            />
          </div>

          {/* All Variants dropdown */}
          <div className="flex-none">
            <select
              value={variantFilter}
              onChange={(e) => { setVariantFilter(e.target.value); setPage(1); }}
              className="rounded-[8px] border border-slate-200 bg-white px-2 py-2 text-[13px] text-slate-600 cursor-pointer focus:outline-none focus:border-[#0B5D1E] hover:border-slate-400 transition-colors"
            >
              {VARIANT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onViewDetails={(row) => console.log("View details:", row.id)}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(
          startIndex + itemsPerPage,
          filtered.length
        )} of ${filtered.length} return requests`}
      />
    </div>
  );
}

