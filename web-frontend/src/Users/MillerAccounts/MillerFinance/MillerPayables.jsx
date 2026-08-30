import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

const sample = Array.from({ length: 27 }, (_, i) => ({
  id: `p-${i + 1}`,
  batchNo: `Batch 2026 - 00${(i % 12) + 1}`,
  supplier: "Supplier A",
  variant: "Dinorado",
  stockQty: "200 kg",
  unitPrice: "₱45.00",
  total: "₱9,000.00",
  requestedBy: "Procurement A",
}));

const SORT_OPTIONS = [
  { value: "batch-asc", label: "Batch No. (A-Z)" },
  { value: "supplier-asc", label: "Supplier (A-Z)" },
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "total-desc", label: "Total (High to Low)" },
];

export default function MillerPayables() {
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sortBy, setSortBy] = useState("batch-asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = sample.filter((r) => {
      if (q && !(`${r.batchNo} ${r.supplier} ${r.variant}`.toLowerCase().includes(q))) return false;
      if (supplier && supplier !== "") {
        return r.supplier === supplier;
      }
      return true;
    });
    if (sortBy === "batch-asc") result.sort((a, b) => a.batchNo.localeCompare(b.batchNo));
    else if (sortBy === "supplier-asc") result.sort((a, b) => a.supplier.localeCompare(b.supplier));
    else if (sortBy === "variant-asc") result.sort((a, b) => a.variant.localeCompare(b.variant));
    return result;
  }, [query, supplier, sortBy]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const sections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = [
    { key: "batchNo", label: "Batch No." },
    { key: "supplier", label: "Supplier" },
    { key: "variant", label: "Variant" },
    { key: "stockQty", label: "Stock Qty (KG)" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "total", label: "Total" },
    { key: "requestedBy", label: "Requested By" },
    {
      key: "action",
      label: "Action",
      headerClassName: "text-center",
      cellClassName: "!text-center !pr-3",
      render: (row) => (
        <button
          type="button"
          onClick={() => alert(`Paying ${row.batchNo}`)}
          className="inline-flex items-center justify-center px-3 py-0.5 h-7 rounded-full text-white text-xs font-semibold hover:bg-[#016b0f] cursor-pointer"
          style={{ backgroundColor: "#018311", minWidth: 72 }}
        >
          Pay Now
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/miller-finance/dashboard" }, { label: "Payables" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payables</h1>
        <p className="text-sm text-slate-500 mt-1">Review goods receipts requested for payment by procurement staff.</p>
      </div>

      <div className="mt-4 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="w-full max-w-xs sm:w-72">
            <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search batch no., supplier, product" />
          </div>

          <div className="w-36">
            <Dropdown
              options={[{ label: "All Suppliers", value: "" }, { label: "Supplier A", value: "Supplier A" }]}
              value={supplier}
              onChange={(v) => { setSupplier(v); setPage(1); }}
              placeholder="Supplier"
            />
          </div>

          <SortByDropdown
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
          />
        </div>

        <div className="inline-block px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold border border-amber-200">
          10 for payment
        </div>
      </div>

      <SectionedTableCard
        columns={columns}
        sections={sections}
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} payable requests`}
      />
    </div>
  );
}
