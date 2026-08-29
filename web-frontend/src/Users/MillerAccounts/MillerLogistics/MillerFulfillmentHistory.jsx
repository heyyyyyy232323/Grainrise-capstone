import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";

const VARIANT_OPTIONS = [
  { value: "all",         label: "All Variants"  },
  { value: "dinorado",    label: "Dinorado"       },
  { value: "sinandomeng", label: "Sinandomeng"    },
  { value: "jasmine",     label: "Jasmine"        },
];

const SORT_OPTIONS = [
  { value: "variant-asc",  label: "Variant (A-Z)" },
  { value: "customer-asc", label: "Customer Name (A-Z)" },
  { value: "delivered-desc", label: "Delivered Qty (High to Low)" },
  { value: "passed-desc", label: "Passed QC (High to Low)" },
];

const sampleFulfill = Array.from({ length: 52 }, (_, i) => ({
  id: `f-${i + 1}`,
  variant:   "Dinorado",
  customer:  "Retailer A",
  delivered: "400 kg",
  passed:    "300 kg",
  failed:    "100 kg",
}));

export default function MillerFulfillmentHistory() {
  const [query,         setQuery]         = useState("");
  const [variantFilter, setVariantFilter] = useState("all");
  const [sortBy,        setSortBy]        = useState("variant-asc");
  const [page,          setPage]          = useState(1);

  const columns = [
    { key: "variant",   label: "Variant",         width: "18%" },
    { key: "customer",  label: "Customer Name",   width: "22%" },
    { key: "delivered", label: "Delivered (kg)",  width: "16%" },
    { key: "passed",    label: "Passed QC (kg)",  width: "16%" },
    { key: "failed",    label: "Failed QC (kg)",  width: "16%" },
    {
      key: "action",
      label: "Action",
      width: "12%",
      headerClassName: "text-center",
      cellClassName:   "!text-center",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sampleFulfill.filter((r) => {
      const matchesQuery =
        q === "" ||
        `${r.variant} ${r.customer}`.toLowerCase().includes(q);
      const matchesVariant =
        variantFilter === "all" ||
        r.variant.toLowerCase() === variantFilter;
      return matchesQuery && matchesVariant;
    });
    if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
    else if (sortBy === "customer-asc") result.sort((a, b) => a.customer.localeCompare(b.customer));
    return result;
  }, [query, variantFilter, sortBy]);

  const itemsPerPage = 10;
  const totalPages   = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex   = (page - 1) * itemsPerPage;
  const paginated    = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections     = useMemo(() => [{ rows: paginated }], [paginated]);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Records", path: "/miller-logistics/dashboard" },
          { label: "Fulfillment History" },
        ]}
      />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Fulfillment History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View completed fulfillment and delivery records.
        </p>
      </div>

      {/* Search + All Variants filter row */}
      <div className="mt-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="w-full max-w-sm">
            <SearchFilter
              onSearch={(v) => { setQuery(v); setPage(1); }}
              placeholder="Search order no., batch no., product, or customer"
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
        )} of ${filtered.length} fulfillment records`}
      />
    </div>
  );
}

