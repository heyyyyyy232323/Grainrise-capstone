import { useMemo, useState } from "react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import DateRangePicker from "../../../Components/Minor-Components/DateRangePicker";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";

// ─── Static Data ──────────────────────────────────────────────────────────────
const ALL_ORDERS = [
  // June 10, 2026
  { id: "r1",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-06-10" },
  { id: "r2",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-06-10" },
  { id: "r3",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-06-10" },
  // June 18, 2026
  { id: "r4",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-06-18" },
  { id: "r5",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-06-18" },
  { id: "r6",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-06-18" },
  { id: "r7",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-06-18" },
  // June 28, 2026
  { id: "r8",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-06-28" },
  { id: "r9",  batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-06-28" },
  { id: "r10", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-06-28" },
  // July 10, 2026
  { id: "r11", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-07-10" },
  { id: "r12", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-07-10" },
  { id: "r13", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-07-10" },
  // July 18, 2026
  { id: "r14", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-07-18" },
  { id: "r15", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-07-18" },
  // Recent (today / yesterday)
  { id: "r16", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-08-10", recent: true },
  { id: "r17", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-08-10", recent: true },
  { id: "r18", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-08-10", recent: true },
  { id: "r19", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-08-09", recent: true },
  { id: "r20", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-08-09", recent: true },
  { id: "r21", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Declined",   date: "2026-08-09", recent: true },
  { id: "r22", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Approved",   date: "2026-08-09", recent: true },
  // July 18 recent
  { id: "r23", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Received",   date: "2026-07-18", recent: true },
  { id: "r24", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "In Transit", date: "2026-07-18", recent: true },
  { id: "r25", batchId: "BATCH 2026 - 001", productCode: "WR-001", variant: "Dinorado", stockQty: "2,500 kg", supplier: "Supplier A", status: "Requested",  date: "2026-07-18", recent: true },
];



const COLUMNS = [
  { key: "batchId",     label: "Batch ID" },
  { key: "productCode", label: "Product Code" },
  { key: "variant",     label: "Variant" },
  { key: "stockQty",    label: "Stock Qty (kg)" },
  { key: "supplier",    label: "Supplier" },
  { key: "status",      label: "Status" },
  { key: "action",      label: "Action", headerClassName: "text-center", cellClassName: "text-center" },
];

const SORT_OPTIONS = [
  { value: "variant-asc",  label: "Variant (A-Z)"                },
  { value: "code-asc",     label: "Product Code (A-Z)"           },
  { value: "qty-asc",      label: "Stock Quantity (Low to High)" },
  { value: "exp-asc",      label: "Expiration Date (Nearest)"    },
];

const ROWS_PER_PAGE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatSectionLabel = (dateStr) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const d = new Date(dateStr + "T00:00:00");
  const toDay = (dt) => dt.toISOString().slice(0, 10);

  if (dateStr === toDay(today))     return "Today";
  if (dateStr === toDay(yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const groupByDate = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.date)) map.set(row.date, []);
    map.get(row.date).push(row);
  });
  // Sort dates descending (newest first)
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sectionRows]) => ({
      label: formatSectionLabel(date),
      rows: sectionRows,
    }));
};

const applyFilters = (rows, { search, dateRange, sortBy }) => {
  let result = [...rows];

  // Search
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.batchId.toLowerCase().includes(q) ||
        r.productCode.toLowerCase().includes(q) ||
        r.variant.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q)
    );
  }

  // Date range
  if (dateRange.startDate) {
    result = result.filter((r) => r.date >= dateRange.startDate);
  }
  if (dateRange.endDate) {
    result = result.filter((r) => r.date <= dateRange.endDate);
  }

  // Sort
  if (sortBy === "date-asc")   result.sort((a, b) => a.date.localeCompare(b.date));
  else if (sortBy === "date-desc") result.sort((a, b) => b.date.localeCompare(a.date));
  else if (sortBy === "batch-asc") result.sort((a, b) => a.batchId.localeCompare(b.batchId));
  else if (sortBy === "status") result.sort((a, b) => a.status.localeCompare(b.status));
  else result.sort((a, b) => b.date.localeCompare(a.date)); // default: newest first

  return result;
};

export default function WarehouseEncoderOrderHistory() {
  const [search,     setSearch]     = useState("");
  const [dateRange,  setDateRange]  = useState({ startDate: "", endDate: "" });
  const [sortBy,     setSortBy]     = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  const handleSearch    = (v) => { setSearch(v);     setCurrentPage(1); };
  const handleDate      = (v) => { setDateRange(v);  setCurrentPage(1); };
  const handleSort      = (v) => { setSortBy(v);     setCurrentPage(1); };

  // Base pool
  const baseRows = ALL_ORDERS;

  const totalCount = baseRows.length;

  // Filtered + sorted flat list
  const filtered = useMemo(() =>
    applyFilters(baseRows, { search, dateRange, sortBy }),
  [baseRows, search, dateRange, sortBy]);

  // Paginate flat list first, then group by date so section headers stay meaningful
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageSlice  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const sections   = groupByDate(pageSlice);

  const footerLabel = `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of ${filtered.length} records`;

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Order History" },
          ]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Order History
        </h1>
        <p className="text-sm text-slate-500">Review warehouse transaction history.</p>
      </div>



      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <SearchFilter
            onSearch={handleSearch}
            placeholder="Search batch ID, product code, variant, or supplier"
          />
        </div>
        <DateRangePicker onDateChange={handleDate} />
        <SortByDropdown value={sortBy} onChange={handleSort} options={SORT_OPTIONS} />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <SectionedTableCard
        columns={COLUMNS}
        sections={sections}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        footerLabel={footerLabel}
        onViewDetails={(row) => console.log("View details:", row)}
        viewDetailsLabel="View Details"
        emptyStateTitle="No orders found"
        emptyStateDescription="No matching orders were found. Try adjusting your search or date filters."
      />
    </div>
  );
}