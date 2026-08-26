import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import Dropdown from "../../../Components/Minor-Components/Dropdown";
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

export default function WarehousePayables() {
  const [query, setQuery] = useState("");
  const [supplier, setSupplier] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sample.filter((r) => {
      if (q && !(`${r.batchNo} ${r.supplier} ${r.variant}`.toLowerCase().includes(q))) return false;
      if (supplier && supplier !== "") {
        return r.supplier === supplier;
      }
      return true;
    });
  }, [query, supplier]);

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
          className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-white text-[11px] font-bold transition hover:opacity-90"
          style={{ backgroundColor: "#00A516", minWidth: 72 }}
        >
          Pay Now
        </button>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Finance", path: "/warehouse-finance/dashboard" }, { label: "Payables" }]} />

      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payables</h1>
        <p className="text-sm text-slate-500 mt-1">Review goods receipts requested for payment by procurement staff.</p>
      </div>

      <div className="mt-4 mb-4 -mx-4 md:mx-0">
        <div className="px-4 md:px-0 flex items-center justify-between">
          <div className="w-full md:w-1/2">
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-0 max-w-3xl">
                <SearchFilter onSearch={(v) => { setQuery(v); setPage(1); }} placeholder="Search batch no., supplier, product" />
              </div>
              <div className="w-44 flex-none">
                <Dropdown
                  options={[{ label: "All", value: "" }, { label: "Supplier A", value: "Supplier A" }]}
                  value={supplier}
                  onChange={(v) => { setSupplier(v); setPage(1); }}
                  placeholder="Supplier"
                />
              </div>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF8E6] text-[#F59E0B] text-[12px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]"></span>
              10 for payment
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
        footerLabel={`Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, filtered.length)} of ${filtered.length} payable requests`}
      />
    </div>
  );
}
