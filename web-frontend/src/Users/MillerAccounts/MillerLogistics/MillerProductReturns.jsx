import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

const VARIANT_OPTIONS = [
  { value: "all", label: "All Variants" },
  { value: "dinorado", label: "Dinorado" },
  { value: "sinandomeng", label: "Sinandomeng" },
  { value: "jasmine", label: "Jasmine" },
];

const SORT_OPTIONS = [
  { value: "variant-asc",  label: "Variant (A-Z)" },
  { value: "order-asc", label: "Order No. (A-Z)" },
  { value: "retailer-asc", label: "Retailer (A-Z)" },
  { value: "qty-desc", label: "Quantity (High to Low)" },
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
  const [sortBy, setSortBy] = useState("variant-asc");
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
    let result = sampleReturns.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.variant} ${r.orderNo} ${r.retailer}`.toLowerCase().includes(q);
      const matchesVariant =
        variantFilter === "all" ||
        r.variant.toLowerCase() === variantFilter;
      return matchesQuery && matchesVariant;
    });
    if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
    else if (sortBy === "retailer-asc") result.sort((a, b) => a.retailer.localeCompare(b.retailer));
    else if (sortBy === "order-asc") result.sort((a, b) => a.orderNo.localeCompare(b.orderNo));
    return result;
  }, [query, variantFilter, sortBy]);

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
          <div className="w-full max-w-sm">
            <SearchFilter
              onSearch={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search order no., batch no., product, or retailer"
            />
          </div>

          {/* All Variants dropdown */}
          <div className="w-36">
            <Dropdown
              options={VARIANT_OPTIONS}
              value={variantFilter}
              onChange={(v) => { setVariantFilter(v); setPage(1); }}
              placeholder="All Variants"
            />
          </div>

          <DateRangePicker onDateChange={() => {}} />

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
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

