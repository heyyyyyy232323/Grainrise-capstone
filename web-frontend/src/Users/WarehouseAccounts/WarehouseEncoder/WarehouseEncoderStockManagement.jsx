import { useMemo, useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Plus } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import ArchiveProductModal from "../../../Components/Modals/ArchiveProductModal";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";
import AddProductModal from "../../../Components/Modals/AddProductModal";
import ViewProductModal from "../../../Components/Modals/ViewProductModal";

// ─── Static Data ───────────────────────────────────────────────────────────────
const generateProducts = (count, archived = false) =>
  Array.from({ length: count }, (_, i) => {
    const stockOptions = [
      { qty: "0 kg",     level: "out"  },
      { qty: "100 kg",   level: "low"  },
      { qty: "150 kg",   level: "low"  },
      { qty: "2,500 kg", level: "in"   },
    ];
    const suppliers = [
      "AgriGrain Co.",
      "Golden Harvest Inc.",
      "Valley Farms Ltd.",
      "SunRipe Produce",
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
      supplier: suppliers[i % suppliers.length],
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
  { value: "variant-asc", label: "Variant (A-Z)" },
  { value: "variant-desc", label: "Variant (Z-A)" },
  { value: "code-asc",    label: "Product Code (A-Z)" },
  { value: "qty-desc",    label: "Stock Quantity (High to Low)" },
  { value: "qty-asc",     label: "Stock Quantity (Low to High)" },
];

const STOCK_FILTER_OPTIONS = [
  { value: "all", label: "All Stock Levels" },
  { value: "in",  label: "In Stock" },
  { value: "low", label: "Low Stock" },
  { value: "out", label: "Out of Stock" },
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

// Adjusted column percentages to minimize unwanted gaps
const COLUMNS = [
  { label: "Product Code",   width: "20%" },
  { label: "Variant",        width: "22%" },
  { label: "Stock Qty (kg)", width: "18%" },
  { label: "Supplier",       width: "22%" },
  { label: "Action",         width: "18%", align: "center" },
];

// ─── Sort helper ───────────────────────────────────────────────────────────────
const sortProducts = (products, sortBy, stockFilter) => {
  let arr = [...products];

  if (stockFilter && stockFilter !== "all") {
    arr = arr.filter((p) => p.stockLevel === stockFilter);
  }

  if (sortBy === "code-asc")  return arr.sort((a, b) => a.productCode.localeCompare(b.productCode));
  if (sortBy === "variant-desc") return arr.sort((a, b) => b.variant.localeCompare(a.variant));
  if (sortBy === "qty-desc")  return arr.sort((a, b) => parseFloat(b.stockQty.replace(/[^0-9.]/g, "")) - parseFloat(a.stockQty.replace(/[^0-9.]/g, "")));
  if (sortBy === "qty-asc")   return arr.sort((a, b) => parseFloat(a.stockQty.replace(/[^0-9.]/g, "")) - parseFloat(b.stockQty.replace(/[^0-9.]/g, "")));
  return arr.sort((a, b) => a.variant.localeCompare(b.variant));
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WarehouseEncoderStockManagement() {
  const [activeTab,     setActiveTab]     = useState("active");
  const [search,        setSearch]        = useState("");
  const [stockFilter,   setStockFilter]   = useState("all");
  const [sortBy,        setSortBy]        = useState("variant-asc");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [modalState,    setModalState]    = useState({ type: null, product: null });

  const [showStockDrop, setShowStockDrop] = useState(false);
  const [showSortDrop,  setShowSortDrop]  = useState(false);

  const stockRef = useRef(null);
  const sortRef  = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stockRef.current && !stockRef.current.contains(e.target)) {
        setShowStockDrop(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTab    = (v) => { setActiveTab(v); setCurrentPage(1); };
  const handleSearch = (v) => { setSearch(v);    setCurrentPage(1); };
  const handleSort   = (v) => { setSortBy(v);    setCurrentPage(1); };

  const handleSaveProduct = (formData) => {
    console.log("Product Saved:", formData);
    setModalState({ type: null, product: null });
  };

  const basePool = activeTab === "archive" ? ARCHIVED_PRODUCTS : ACTIVE_PRODUCTS;

  const filtered = useMemo(() => {
    let result = basePool;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.productCode.toLowerCase().includes(q) ||
          p.variant.toLowerCase().includes(q) ||
          p.supplier.toLowerCase().includes(q)
      );
    }
    return sortProducts(result, sortBy, stockFilter);
  }, [basePool, search, sortBy, stockFilter]);

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
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Management" }, { label: "Stock Management" }]} />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Stock Management
        </h1>
        <p className="text-sm text-slate-500">Manage warehouse inventory and product records.</p>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={handleTab} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search product code, variant, or supplier"
              className="block w-full pl-10 pr-9 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white placeholder-gray-400 text-gray-700"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            {/* Stock Level Dropdown */}
            <div className="relative w-full sm:w-auto" ref={stockRef}>
              <button
                type="button"
                onClick={() => {
                  setShowStockDrop((prev) => !prev);
                  setShowSortDrop(false);
                }}
                className={`flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer ${
                  stockFilter !== "all" ? "border-emerald-500 text-emerald-700 bg-emerald-50/40" : ""
                }`}
              >
                <span>{STOCK_FILTER_OPTIONS.find((o) => o.value === stockFilter)?.label || "Stock Level"}</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${showStockDrop ? "rotate-180" : ""}`}
                />
              </button>

              {showStockDrop && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[170px]">
                  {STOCK_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStockFilter(opt.value);
                        setCurrentPage(1);
                        setShowStockDrop(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        stockFilter === opt.value
                          ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative w-full sm:w-auto" ref={sortRef}>
              <button
                type="button"
                onClick={() => {
                  setShowSortDrop((prev) => !prev);
                  setShowStockDrop(false);
                }}
                className="flex items-center gap-2 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto justify-center transition-colors cursor-pointer"
              >
                <span>{SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort By"}</span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${showSortDrop ? "rotate-180" : ""}`}
                />
              </button>

              {showSortDrop && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 z-20 min-w-[210px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        handleSort(opt.value);
                        setShowSortDrop(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        sortBy === opt.value
                          ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Product Button */}
        {activeTab === "active" && (
          <button
            type="button"
            onClick={() => setModalState({ type: "add", product: null })}
            className="rounded-lg bg-[#0B5D1E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#084b18] flex items-center gap-1.5 cursor-pointer whitespace-nowrap ml-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Product
          </button>
        )}
      </div>

      {/* Legend */}
      {activeTab === "active" && (
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
          <span className="text-slate-400">Legend:</span>
          <span className="flex items-center gap-1.5 rounded-md bg-emerald-100 px-2 py-1 text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> In Stock
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-1 text-amber-700">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Low Stock
          </span>
          <span className="flex items-center gap-1.5 rounded-md bg-rose-100 px-2 py-1 text-rose-700">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Out of Stock
          </span>
        </div>
      )}

      {/* Table Card */}
      <article className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-[#EDEDED] text-[13px] font-bold text-slate-700">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className={`whitespace-nowrap px-4 py-3.5 align-middle first:pl-6 last:pr-6 ${col.align === "center" ? "text-center" : "text-left"}`}
                    style={{ width: col.width }}
                  >
                    {col.label}
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
                    <td className="whitespace-nowrap px-4 py-3 pl-6 text-[13px] font-bold text-slate-800">
                      {product.productCode}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start">
                        <span className="text-[13px] font-semibold text-slate-800">
                          {product.variant}
                        </span>
                        <span className="text-[11px] text-slate-400">{product.expiry}</span>
                        <VariantBadge badge={product.variantBadge} />
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                        <StockDot level={product.stockLevel} />
                        {product.stockQty}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                      <span className="font-medium">{product.supplier}</span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 pr-6">
                      {activeTab === "active" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalState({ type: "view", product })}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                          >
                            View Details
                          </button>
                          <CustomAmberButton
                            text="Archive"
                            className="px-3 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "archive", product })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CustomGreenButton
                            text="Restore"
                            className="px-3 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "restore", product })}
                          />
                          <CustomRedButton
                            text="Delete"
                            className="px-4 py-1.5 text-[11px] rounded-lg"
                            onClick={() => setModalState({ type: "delete", product })}
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

      {/* Modals */}
      <AddProductModal
        isOpen={modalState.type === "add"}
        onClose={() => setModalState({ type: null, product: null })}
        onSave={handleSaveProduct}
      />
      <ViewProductModal
        isOpen={modalState.type === "view"}
        onClose={() => setModalState({ type: null, product: null })}
        product={modalState.product}
        onSave={handleSaveProduct}
      />
      <ArchiveProductModal
        isOpen={modalState.type === "archive"}
        onClose={() => setModalState({ type: null, product: null })}
        productName={modalState.product?.variant || "Product"}
        onArchive={() => setModalState({ type: null, product: null })}
      />
      <RestoreProductModal
        isOpen={modalState.type === "restore"}
        onClose={() => setModalState({ type: null, product: null })}
        productName={modalState.product?.variant || "Product"}
        onRestore={() => setModalState({ type: null, product: null })}
      />
      <DeleteProductModal
        isOpen={modalState.type === "delete"}
        onClose={() => setModalState({ type: null, product: null })}
        productName={modalState.product?.variant || "Product"}
        onDelete={() => setModalState({ type: null, product: null })}
      />
    </div>
  );
}