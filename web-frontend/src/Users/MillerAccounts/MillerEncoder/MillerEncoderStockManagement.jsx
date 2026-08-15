import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import SearchFilter from "../../../Components/Minor-Components/SearchFilter";
import SortByDropdown from "../../../Components/Minor-Components/SortByDropdown";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import StatusBadge from "../../../Components/Minor-Components/StatusBadge";

// ─── Static Data ───────────────────────────────────────────────────────────────
const generateProducts = (count, archived = false) =>
  Array.from({ length: count }, (_, i) => {
    const stockOptions = [
      { qty: "0 kg",     level: "out"  },
      { qty: "100 kg",   level: "low"  },
      { qty: "150 kg",   level: "low"  },
      { qty: "2,500 kg", level: "in"   },
    ];
    const { qty, level } = stockOptions[i % stockOptions.length];
    const variantBadges = archived
      ? [null]
      : [null, "Incoming", "Active", "Retired", null, null];
    const expMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const expYear = 2026 + (i % 2);
    const expMonth = expMonths[i % 12];
    const expDay = ((i * 7) % 28) + 1;

    return {
      id: `prod-${archived ? "arch" : "act"}-${i + 1}`,
      productCode: "WR-001",
      variant: "Dinorado",
      expiry: `Exp ${expMonth} ${expDay}, ${expYear}`,
      variantBadge: variantBadges[i % variantBadges.length],
      stockQty: qty,
      stockLevel: level,
      description: "Premium rice, locally sourced specialty…",
      archived,
    };
  });

const ACTIVE_PRODUCTS   = generateProducts(50, false);
const ARCHIVED_PRODUCTS = generateProducts(10, true);

const TABS = [
  { id: "active",  label: "Active"  },
  { id: "archive", label: "Archive" },
];

const SORT_OPTIONS = [
  { value: "default",    label: "Sort By"       },
  { value: "code-asc",   label: "Code (A-Z)"    },
  { value: "qty-asc",    label: "Qty: Low → High"},
  { value: "qty-desc",   label: "Qty: High → Low"},
  { value: "level-out",  label: "Out of Stock First"},
];

const ROWS_PER_PAGE = 10;

// ─── Stock dot indicator ───────────────────────────────────────────────────────
const STOCK_DOT = {
  in:  "bg-emerald-500",
  low: "bg-amber-400",
  out: "bg-rose-500",
};

function StockDot({ level }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${STOCK_DOT[level] || "bg-slate-300"}`}
      aria-label={level}
    />
  );
}

// ─── Variant badge ─────────────────────────────────────────────────────────────
const VARIANT_BADGE_STYLES = {
  Incoming: "bg-blue-100 text-blue-700",
  Active:   "bg-emerald-100 text-emerald-700",
  Retired:  "bg-rose-100 text-rose-700",
};

function VariantBadge({ badge }) {
  if (!badge) return null;
  const style = VARIANT_BADGE_STYLES[badge] || "bg-slate-100 text-slate-600";
  return (
    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${style}`}>
      {badge}
    </span>
  );
}

// ─── Table header ──────────────────────────────────────────────────────────────
const COLUMNS = ["Product Code", "Variant", "Stock Qty (kg)", "Description", "Action"];

// ─── Sort helper ───────────────────────────────────────────────────────────────
const sortProducts = (products, sortBy) => {
  const arr = [...products];
  if (sortBy === "code-asc")  return arr.sort((a, b) => a.productCode.localeCompare(b.productCode));
  if (sortBy === "qty-desc")  return arr.sort((a, b) => parseFloat(b.stockQty) - parseFloat(a.stockQty));
  if (sortBy === "qty-asc")   return arr.sort((a, b) => parseFloat(a.stockQty) - parseFloat(b.stockQty));
  if (sortBy === "level-out") {
    const order = { out: 0, low: 1, in: 2 };
    return arr.sort((a, b) => (order[a.stockLevel] ?? 3) - (order[b.stockLevel] ?? 3));
  }
  return arr;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MillerEncoderStockManagement() {
  const [activeTab,   setActiveTab]   = useState("active");
  const [search,      setSearch]      = useState("");
  const [sortBy,      setSortBy]      = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  const handleTab    = (v) => { setActiveTab(v); setCurrentPage(1); };
  const handleSearch = (v) => { setSearch(v);    setCurrentPage(1); };
  const handleSort   = (v) => { setSortBy(v);    setCurrentPage(1); };

  const basePool = activeTab === "archive" ? ARCHIVED_PRODUCTS : ACTIVE_PRODUCTS;

  const filtered = useMemo(() => {
    let result = basePool;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.productCode.toLowerCase().includes(q) ||
          p.variant.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return sortProducts(result, sortBy);
  }, [basePool, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageSlice  = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const footerLabel =
    filtered.length === 0
      ? "No products found"
      : `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
          currentPage * ROWS_PER_PAGE,
          filtered.length
        )} of ${filtered.length} ${activeTab === "archive" ? "archived products" : "products"}`;

  return (
    <div className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Stock Management" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Stock Management
        </h1>
        <p className="text-sm text-slate-500">Manage warehouse inventory and product records.</p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTab} />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <SearchFilter
            onSearch={handleSearch}
            placeholder="Search product code, variant, or description"
          />
        </div>
        <SortByDropdown value={sortBy} onChange={handleSort} options={SORT_OPTIONS} />

        {/* Add Product — only on Active tab */}
        {activeTab === "active" && (
          <CustomGreenButton
            text={
              <span className="flex items-center gap-1.5">
                <Plus size={14} strokeWidth={2.5} />
                Add Product
              </span>
            }
            className="ml-auto whitespace-nowrap px-4 py-2 text-sm"
          />
        )}
      </div>

      {/* ── Legend (Active tab only) ─────────────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
          <span className="text-slate-400">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> In Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Low Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Out of Stock
          </span>
        </div>
      )}

      {/* ── Table Card ──────────────────────────────────────────────────────── */}
      <article className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-[#EDEDED] text-left text-[11px] font-extrabold uppercase tracking-[0.03em] text-slate-600">
                {COLUMNS.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-4 py-3 align-middle first:pl-5 last:pr-5"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {pageSlice.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-5 py-16 text-center text-sm text-slate-400">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                pageSlice.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Product Code */}
                    <td className="whitespace-nowrap px-4 py-3 pl-5 text-[13px] font-semibold text-slate-700">
                      {product.productCode}
                    </td>

                    {/* Variant + expiry + optional badge */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-800">
                          {product.variant}
                        </span>
                        <span className="text-[11px] text-slate-400">{product.expiry}</span>
                        <VariantBadge badge={product.variantBadge} />
                      </div>
                    </td>

                    {/* Stock Qty */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="flex items-center gap-2 text-[13px] text-slate-700">
                        <StockDot level={product.stockLevel} />
                        {product.stockQty}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 text-[13px] text-slate-500 max-w-[220px]">
                      <span className="line-clamp-2">{product.description}</span>
                    </td>

                    {/* Action */}
                    <td className="whitespace-nowrap px-4 py-3 pr-5">
                      {activeTab === "active" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
                          >
                            View Details
                          </button>
                          <CustomAmberButton
                            text="Archive"
                            className="px-3 py-1.5 text-[11px] rounded-full"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CustomGreenButton
                            text="Restore"
                            className="px-3 py-1.5 text-[11px] rounded-full"
                          />
                          <CustomRedButton
                            text="Delete Permanently"
                            className="px-3 py-1.5 text-[11px] rounded-full"
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageLabel={footerLabel}
          />
        )}
      </article>
    </div>
  );
}
