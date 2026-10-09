import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X, Plus, Loader2 } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import Tabs from "../../../Components/Minor-Components/Tabs";
import PaginationControls from "../../../Components/Minor-Components/PaginationControls";
import CustomGreenButton from "../../../Components/Minor-Components/CustomGreenButton";
import CustomAmberButton from "../../../Components/Minor-Components/CustomAmberButton";
import CustomRedButton from "../../../Components/Minor-Components/CustomRedButton";
import Toast from "../../../Components/Modals/Toast";
import RestoreProductModal from "../../../Components/Modals/RestoreProductModal";
import DeleteProductModal from "../../../Components/Modals/DeleteProductModal";

// Encoder-specific modals
import EncoderAddProductModal from "../../../Components/Modals/MillerEncoder/EncoderAddProductModal";
import EncoderViewProductModal from "../../../Components/Modals/MillerEncoder/EncoderViewProductModal";
import EncoderUpdateUnmilledModal from "../../../Components/Modals/MillerEncoder/EncoderUpdateUnmilledModal";
import EncoderArchiveProductModal from "../../../Components/Modals/MillerEncoder/EncoderArchiveProductModal";

// Hook
import useStockManagement from "../../../Components/hooks/MillerEncoder/useStockManagement";

// ─── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "unmilled", label: "Unmilled" },
  { id: "active",   label: "Active"   },
  { id: "archive",  label: "Archive"  },
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

// ─── Stock Level Helpers (Derived Only) ─────────────────────────────────────────
export function getStockLevel(qty) {
  const num =
    typeof qty === "number"
      ? qty
      : parseFloat(String(qty ?? "").replace(/[^0-9.-]/g, "")) || 0;
  if (num >= 200) return "in";
  if (num > 0) return "low";
  return "out";
}

export function formatQty(qty) {
  const num =
    typeof qty === "number"
      ? qty
      : parseFloat(String(qty ?? "").replace(/[^0-9.-]/g, "")) || 0;
  return `${num.toLocaleString("en-US")} kg`;
}

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

// ─── Expiry Badge Helpers (Derived Only) ───────────────────────────────────────
export function getExpiryBadge(expiryDateStr) {
  if (!expiryDateStr) return null;
  const match = String(expiryDateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const expDate = new Date(year, month, day);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: "Expired",
      style: "bg-rose-100 text-rose-700 border border-rose-200",
    };
  }
  if (diffDays <= 45) {
    return {
      label: "Near Expiry",
      style: "bg-amber-100 text-amber-700 border border-amber-200",
    };
  }
  if (diffDays <= 90) {
    return {
      label: "Incoming",
      style: "bg-blue-100 text-blue-700 border border-blue-200",
    };
  }
  return null;
}

export function formatExpiryDate(dateStr) {
  if (!dateStr) return "No Expiration";
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return `Exp ${dateStr}`;

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const year = match[1];
  const month = months[parseInt(match[2], 10) - 1] || match[2];
  const day = parseInt(match[3], 10);

  return `Exp ${month} ${day}, ${year}`;
}

function VariantBadge({ badgeInfo }) {
  if (!badgeInfo) return null;
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeInfo.style}`}
    >
      {badgeInfo.label}
    </span>
  );
}

// ─── Table Columns ─────────────────────────────────────────────────────────────
const STANDARD_COLUMNS = [
  { label: "Product Code",   width: "20%" },
  { label: "Variant",        width: "22%" },
  { label: "Stock Qty (kg)", width: "18%" },
  { label: "Supplier",       width: "22%" },
  { label: "Action",         width: "18%", align: "center" },
];

const ARCHIVE_COLUMNS = [
  { label: "Product Code",   width: "20%" },
  { label: "Variant",        width: "30%" },
  { label: "Archive Reason", width: "32%" },
  { label: "Action",         width: "18%", align: "center" },
];

// ─── Sort Helper ───────────────────────────────────────────────────────────────
const sortProducts = (products, sortBy, stockFilter) => {
  let arr = [...products];

  if (stockFilter && stockFilter !== "all") {
    arr = arr.filter((p) => getStockLevel(p.stock_quantity) === stockFilter);
  }

  if (sortBy === "code-asc") {
    return arr.sort((a, b) =>
      String(a.product_code || "").localeCompare(String(b.product_code || ""))
    );
  }
  if (sortBy === "variant-desc") {
    return arr.sort((a, b) =>
      String(b.product_name || "").localeCompare(String(a.product_name || ""))
    );
  }
  if (sortBy === "qty-desc") {
    return arr.sort(
      (a, b) => Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0)
    );
  }
  if (sortBy === "qty-asc") {
    return arr.sort(
      (a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0)
    );
  }
  return arr.sort((a, b) =>
    String(a.product_name || "").localeCompare(String(b.product_name || ""))
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MillerEncoderStockManagement() {
  const {
    fetchProducts,
    fetchSuppliers,
    addProduct,
    updateProduct,
    processUnmilled,
    archiveProduct,
    restoreProduct,
    deleteProduct,
    loading: actionLoading,
  } = useStockManagement();

  const [activeTab, setActiveTab] = useState("active");
  const [productsMap, setProductsMap] = useState({
    unmilled: [],
    active: [],
    archived: [],
  });
  const [suppliers, setSuppliers] = useState([]);
  const [fetching, setFetching] = useState(false);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("variant-asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [modalState, setModalState] = useState({ type: null, product: null });
  const [toast, setToast] = useState(null);

  const [showStockDrop, setShowStockDrop] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);

  const stockRef = useRef(null);
  const sortRef = useRef(null);

  // Outside click for filter dropdowns
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

  // Load suppliers once
  useEffect(() => {
    fetchSuppliers()
      .then((data) => setSuppliers(data))
      .catch((err) => {
        console.error("Failed to load suppliers:", err);
      });
  }, [fetchSuppliers]);

  // Support URL filters: ?filter=low-stock, ?filter=no-stock
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = (params.get("filter") || "").trim().toLowerCase();
    if (filterParam === "low-stock" || filterParam === "low") {
      setStockFilter("low");
      setActiveTab("active");
    } else if (
      filterParam === "no-stock" ||
      filterParam === "out" ||
      filterParam === "out-of-stock"
    ) {
      setStockFilter("out");
      setActiveTab("active");
    }
  }, []);

  // Load products for status
  const loadTabProducts = useCallback(
    async (statusKey) => {
      setFetching(true);
      try {
        const backendStatus =
          statusKey === "archive" ? "archived" : statusKey;
        const data = await fetchProducts(backendStatus);
        setProductsMap((prev) => ({
          ...prev,
          [backendStatus]: data,
        }));
      } catch (err) {
        setToast({
          type: "error",
          title: "Data Error",
          message:
            err?.message || `Failed to retrieve ${statusKey} stock records.`,
        });
      } finally {
        setFetching(false);
      }
    },
    [fetchProducts]
  );

  // Fetch when active tab changes
  useEffect(() => {
    loadTabProducts(activeTab);
  }, [activeTab, loadTabProducts]);

  const handleTab = (v) => {
    setActiveTab(v);
    setCurrentPage(1);
    setSearch("");
  };

  const handleSearch = (v) => {
    setSearch(v);
    setCurrentPage(1);
  };

  const handleSort = (v) => {
    setSortBy(v);
    setCurrentPage(1);
  };

  // ─── Actions ─────────────────────────────────────────────────────────────────
  const handleAddProduct = async (payload) => {
    try {
      const created = await addProduct(payload);
      setModalState({ type: null, product: null });
      setToast({
        type: "success",
        title: "Product Added",
        message: `Product ${created.product_name || "item"} (${created.product_code || ""}) was created successfully.`,
      });
      // Refresh active products
      await loadTabProducts("active");
      if (activeTab !== "active") {
        setActiveTab("active");
      }
    } catch (err) {
      setToast({
        type: "error",
        title: "Add Failed",
        message: err?.message || "Failed to add product. Please verify fields.",
      });
    }
  };

  const handleEditProduct = async (productId, payload, onSuccess) => {
    try {
      const updated = await updateProduct(productId, payload);
      setToast({
        type: "success",
        title: "Product Updated",
        message: `Product ${updated.product_name || "details"} was updated successfully.`,
      });
      // Update modal product state if still open
      setModalState((prev) =>
        prev.product?.product_id === productId || prev.product?.id === productId
          ? { ...prev, product: updated }
          : prev
      );
      onSuccess?.();
      await loadTabProducts("active");
    } catch (err) {
      setToast({
        type: "error",
        title: "Update Failed",
        message: err?.message || "Failed to save product changes.",
      });
    }
  };

  const handleProcessUnmilled = async (productId, payload) => {
    try {
      const processed = await processUnmilled(productId, payload);
      setModalState({ type: null, product: null });
      setToast({
        type: "success",
        title: "Stock Activated",
        message: `Unmilled product ${processed.product_name || ""} (${processed.product_code || ""}) has been processed into active stock.`,
      });
      // Refresh both unmilled and active
      await Promise.all([
        loadTabProducts("unmilled"),
        loadTabProducts("active"),
      ]);
    } catch (err) {
      setToast({
        type: "error",
        title: "Processing Failed",
        message: err?.message || "Failed to process unmilled product.",
      });
    }
  };

  const handleArchiveProduct = async (reason) => {
    const target = modalState.product;
    if (!target) return;
    const targetId = target.product_id || target.id;

    try {
      await archiveProduct(targetId, reason);
      setModalState({ type: null, product: null });
      setToast({
        type: "deactivated",
        title: "Product Archived",
        message: `Product ${target.product_name || "item"} (${target.product_code || ""}) has been moved to archive.`,
      });
      await Promise.all([
        loadTabProducts("active"),
        loadTabProducts("archive"),
      ]);
    } catch (err) {
      setToast({
        type: "error",
        title: "Archive Failed",
        message: err?.message || "Failed to archive product.",
      });
    }
  };

  const handleRestoreProduct = async (product) => {
    if (!product) return;
    const targetId = product.product_id || product.id;

    try {
      await restoreProduct(targetId);
      setModalState({ type: null, product: null });
      setToast({
        type: "info",
        title: "Product Restored",
        message: `Product ${product.product_name || ""} (${product.product_code || ""}) has been restored to active stock.`,
      });
      await Promise.all([
        loadTabProducts("archive"),
        loadTabProducts("active"),
      ]);
    } catch (err) {
      setToast({
        type: "error",
        title: "Restore Failed",
        message: err?.message || "Failed to restore product.",
      });
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product) return;
    const targetId = product.product_id || product.id;

    try {
      await deleteProduct(targetId);
      setModalState({ type: null, product: null });
      setToast({
        type: "error",
        title: "Product Deleted",
        message: `Product ${product.product_name || ""} (${product.product_code || ""}) has been permanently deleted.`,
      });
      await loadTabProducts("archive");
    } catch (err) {
      setToast({
        type: "error",
        title: "Delete Failed",
        message: err?.message || "Failed to delete archived product.",
      });
    }
  };

  // ─── Filter & Search ─────────────────────────────────────────────────────────
  const currentKey = activeTab === "archive" ? "archived" : activeTab;
  const basePool = productsMap[currentKey] || [];

  const filtered = useMemo(() => {
    let result = basePool;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const code = String(p.product_code || "").toLowerCase();
        const name = String(p.product_name || "").toLowerCase();
        const supplier = String(p.supplier_display_name || "").toLowerCase();
        const shelf = String(p.shelf_location || "").toLowerCase();
        const reason = String(p.archive_reason || "").toLowerCase();

        return (
          code.includes(q) ||
          name.includes(q) ||
          supplier.includes(q) ||
          shelf.includes(q) ||
          (activeTab === "archive" && reason.includes(q))
        );
      });
    }
    return sortProducts(result, sortBy, stockFilter);
  }, [basePool, search, sortBy, stockFilter, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const pageSlice = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const tabNoun =
    activeTab === "unmilled"
      ? "unmilled products"
      : activeTab === "archive"
      ? "archived products"
      : "products";

  const footerLabel =
    filtered.length === 0
      ? `No ${tabNoun} found`
      : `Showing ${(currentPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
          currentPage * ROWS_PER_PAGE,
          filtered.length
        )} of ${filtered.length} ${tabNoun}`;

  const currentColumns =
    activeTab === "archive" ? ARCHIVE_COLUMNS : STANDARD_COLUMNS;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[{ label: "Management" }, { label: "Stock Management" }]}
        />
        <h1 className="text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold tracking-[-0.03em] text-slate-900">
          Stock Management
        </h1>
        <p className="text-sm text-slate-500">
          Manage warehouse inventory and product records.
        </p>
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
              placeholder="Search product code, variant, supplier, or location"
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
                  stockFilter !== "all"
                    ? "border-emerald-500 text-emerald-700 bg-emerald-50/40"
                    : ""
                }`}
              >
                <span>
                  {STOCK_FILTER_OPTIONS.find((o) => o.value === stockFilter)
                    ?.label || "Stock Level"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${
                    showStockDrop ? "rotate-180" : ""
                  }`}
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
                <span>
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label ||
                    "Sort By"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 transition-transform duration-200 ${
                    showSortDrop ? "rotate-180" : ""
                  }`}
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

        {/* Add Product Button (Active Tab Only) */}
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
      {activeTab !== "archive" && (
        <div className="flex flex-wrap items-center gap-3 text-[12px] font-semibold">
          <span className="text-slate-500">Legend:</span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> In Stock (≥200 kg)
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Low Stock (&lt;200 kg)
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Out of Stock (0 kg)
          </span>
        </div>
      )}

      {/* Table Card */}
      <article className="w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead>
              <tr className="bg-[#EDEDED] text-left text-[11px] font-extrabold uppercase tracking-[0.03em] text-slate-600">
                {currentColumns.map((col) => (
                  <th
                    key={col.label}
                    className={`whitespace-nowrap px-4 py-3.5 align-middle first:pl-6 last:pr-6 ${
                      col.align === "center" ? "text-center" : "text-left"
                    }`}
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {fetching ? (
                <tr>
                  <td
                    colSpan={currentColumns.length}
                    className="px-5 py-16 text-center text-sm text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="animate-spin text-emerald-600" size={18} />
                      Loading inventory records...
                    </div>
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentColumns.length}
                    className="px-5 py-16 text-center text-sm text-slate-400"
                  >
                    {activeTab === "unmilled"
                      ? "No unmilled products found."
                      : activeTab === "archive"
                      ? "No archived products found."
                      : "No active products found."}
                  </td>
                </tr>
              ) : (
                pageSlice.map((product) => {
                  const pid = product.product_id || product.id;
                  const stockLevel = getStockLevel(product.stock_quantity);
                  const expiryBadge = getExpiryBadge(product.expiry_date);

                  return (
                    <tr
                      key={pid}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Product Code */}
                      <td className="whitespace-nowrap px-4 py-3 pl-6 text-[13px] font-semibold text-slate-700">
                        {product.product_code || "—"}
                      </td>

                      {/* Variant Column */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start">
                          <span className="text-[13px] font-semibold text-slate-800">
                            {product.product_name || "—"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatExpiryDate(product.expiry_date)}
                          </span>
                          <VariantBadge badgeInfo={expiryBadge} />

                          {/* For Archive tab: Stock Quantity & Dot inside Variant */}
                          {activeTab === "archive" && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 mt-1">
                              <StockDot level={stockLevel} />
                              {formatQty(product.stock_quantity)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Qty (Standard tabs only) */}
                      {activeTab !== "archive" && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[13px] text-slate-700">
                            <StockDot level={stockLevel} />
                            {formatQty(product.stock_quantity)}
                          </span>
                        </td>
                      )}

                      {/* Supplier (Standard tabs only) */}
                      {activeTab !== "archive" && (
                        <td className="px-4 py-3 text-[13px] text-slate-600 whitespace-nowrap">
                          <span className="font-medium">
                            {product.supplier_display_name || "—"}
                          </span>
                        </td>
                      )}

                      {/* Archive Reason (Archive tab only) */}
                      {activeTab === "archive" && (
                        <td className="px-4 py-3 text-[12px] text-slate-600">
                          <p className="line-clamp-2 max-w-sm">
                            {product.archive_reason || "No reason specified."}
                          </p>
                        </td>
                      )}

                      {/* Action Column */}
                      <td className="whitespace-nowrap px-4 py-3 pr-6">
                        {activeTab === "unmilled" ? (
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() =>
                                setModalState({
                                  type: "update-unmilled",
                                  product,
                                })
                              }
                              className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Update
                            </button>
                          </div>
                        ) : activeTab === "active" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setModalState({ type: "view", product })
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                            >
                              View Details
                            </button>
                            <CustomAmberButton
                              text="Archive"
                              className="px-3 py-1.5 text-[11px] rounded-lg"
                              onClick={() =>
                                setModalState({ type: "archive", product })
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CustomGreenButton
                              text="Restore"
                              className="px-3 py-1.5 text-[11px] rounded-lg"
                              onClick={() =>
                                setModalState({ type: "restore", product })
                              }
                            />
                            <CustomRedButton
                              text="Delete"
                              className="px-4 py-1.5 text-[11px] rounded-lg"
                              onClick={() =>
                                setModalState({ type: "delete", product })
                              }
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
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
      <EncoderAddProductModal
        isOpen={modalState.type === "add"}
        onClose={() => setModalState({ type: null, product: null })}
        onSave={handleAddProduct}
        suppliers={suppliers}
        isLoading={actionLoading}
      />

      <EncoderViewProductModal
        isOpen={modalState.type === "view"}
        onClose={() => setModalState({ type: null, product: null })}
        product={modalState.product}
        onSave={handleEditProduct}
        suppliers={suppliers}
        isLoading={actionLoading}
      />

      <EncoderUpdateUnmilledModal
        isOpen={modalState.type === "update-unmilled"}
        onClose={() => setModalState({ type: null, product: null })}
        product={modalState.product}
        onSave={handleProcessUnmilled}
        isLoading={actionLoading}
      />

      <EncoderArchiveProductModal
        isOpen={modalState.type === "archive"}
        onClose={() => setModalState({ type: null, product: null })}
        product={modalState.product}
        onArchive={handleArchiveProduct}
        isLoading={actionLoading}
      />

      <RestoreProductModal
        isOpen={modalState.type === "restore"}
        onClose={() => setModalState({ type: null, product: null })}
        productName={
          modalState.product?.product_name ||
          modalState.product?.variant ||
          "Product"
        }
        onRestore={() => handleRestoreProduct(modalState.product)}
        isLoading={actionLoading}
      />

      <DeleteProductModal
        isOpen={modalState.type === "delete"}
        onClose={() => setModalState({ type: null, product: null })}
        productName={
          modalState.product?.product_name ||
          modalState.product?.variant ||
          "Product"
        }
        onDelete={() => handleDeleteProduct(modalState.product)}
        isLoading={actionLoading}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          isOpen={Boolean(toast)}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          actionLabel={toast.actionLabel}
          actionType={toast.actionType}
          onAction={toast.onAction}
          duration={toast.duration || 4000}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}