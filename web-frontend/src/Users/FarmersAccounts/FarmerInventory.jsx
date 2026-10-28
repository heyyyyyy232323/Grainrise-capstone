import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import CustomAmberButton from "../../Components/Minor-Components/CustomAmberButton";
import CustomGreenButton from "../../Components/Minor-Components/CustomGreenButton";
import PaginationControls from "../../Components/Minor-Components/PaginationControls";

import FarmerInventoryAddProductModal from "../../Components/Modals/FarmerInventoryAddProductModal";
import FarmerInventoryEditProductModal from "../../Components/Modals/FarmerInventoryEditProductModal";
import FarmerInventoryProductDetailsModal from "../../Components/Modals/FarmerInventoryProductDetailsModal";
import FarmerInventoryStatusConfirmModal, {
  INVENTORY_ARCHIVE_ACTION,
  INVENTORY_RESTORE_ACTION,
} from "../../Components/Modals/FarmerInventoryStatusConfirmModal";
import Toast from "../../Components/Modals/Toast";
import useToast from "../../Components/hooks/useToast";

import useFarmerInventory, {
  INVENTORY_SORT_NEWEST,
  INVENTORY_SORT_OLDEST,
  INVENTORY_SORT_STOCK_HIGHEST,
  INVENTORY_SORT_STOCK_LOWEST,
  INVENTORY_STATUS_ACTIVE,
  INVENTORY_STATUS_ARCHIVED,
} from "../../Components/hooks/Farmer/useFarmerInventory";

// ============================================================
// CONSTANTS & TABLE CONFIG
// ============================================================

const TABS = [
  { id: INVENTORY_STATUS_ACTIVE, label: "Active Stock" },
  { id: INVENTORY_STATUS_ARCHIVED, label: "Archive" },
];

const STOCK_DOT = {
  in_stock: "bg-emerald-500",
  low_stock: "bg-amber-400",
  out_of_stock: "bg-rose-500",
};

function StockDot({ level }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        STOCK_DOT[level] || "bg-slate-300"
      }`}
      aria-label={level}
    />
  );
}

const SORT_OPTIONS = [
  { value: INVENTORY_SORT_NEWEST, label: "Newest First" },
  { value: INVENTORY_SORT_OLDEST, label: "Oldest First" },
  { value: INVENTORY_SORT_STOCK_HIGHEST, label: "Stock: High to Low" },
  { value: INVENTORY_SORT_STOCK_LOWEST, label: "Stock: Low to High" },
];

const STOCK_FILTER_OPTIONS = [
  { value: "all", label: "All Stock Levels" },
  { value: "in_stock", label: "In Stock (≥200 kg)" },
  { value: "low_stock", label: "Low Stock (<200 kg)" },
  { value: "out_of_stock", label: "Out of Stock (0 kg)" },
];

// Table headers: "PRODUCT / VARIETY" renamed to "VARIETY"
const ACTIVE_COLUMNS = [
  { label: "Product Code", width: "17%" },
  { label: "Variety", width: "22%" },
  { label: "Total Stock", width: "15%" },
  { label: "Available Stock", width: "15%" },
  { label: "Selling Price", width: "12%" },
  { label: "Source", width: "14%" },
  { label: "Action", width: "15%", align: "center" },
];

const ARCHIVE_COLUMNS = [
  { label: "Product Code", width: "18%" },
  { label: "Variety", width: "26%" },
  { label: "Archived Stock", width: "18%" },
  { label: "Archive Reason", width: "26%" },
  { label: "Action", width: "12%", align: "center" },
];

const ROWS_PER_PAGE = 10;

export default function FarmerInventory() {
  const {
    products,
    farmOptions,
    isLoadingProducts,
    isSavingProduct,
    isChangingProductStatus,
    error: apiError,
    loadProducts,
    loadProductDetails,
    loadFarmOptions,
    addProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,
  } = useFarmerInventory();

  // Tab state
  const [activeTab, setActiveTab] = useState(INVENTORY_STATUS_ACTIVE);

  // Filters state
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState(INVENTORY_SORT_NEWEST);
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown menus
  const [showStockDrop, setShowStockDrop] = useState(false);
  const [showSortDrop, setShowSortDrop] = useState(false);
  const stockRef = useRef(null);
  const sortRef = useRef(null);

  // Modals state: { type: 'add' | 'view' | 'edit' | 'archive' | 'restore' | null, product: null }
  const [modalState, setModalState] = useState({ type: null, product: null });
  const { toasts, showToast, removeToast } = useToast();

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

  // Fetch initial farm options
  useEffect(() => {
    loadFarmOptions();
  }, [loadFarmOptions]);

  // Load products when tab or server filters change
  const fetchCurrentTabProducts = useCallback(() => {
    loadProducts({
      status: activeTab,
      search,
      sortBy,
    });
  }, [activeTab, search, sortBy, loadProducts]);

  useEffect(() => {
    fetchCurrentTabProducts();
    setCurrentPage(1);
  }, [activeTab, sortBy]);

  // Handle Search submit / debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts({
        status: activeTab,
        search,
        sortBy,
      });
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, activeTab, sortBy, loadProducts]);

  // Client-side Stock Level filtering & pagination
  const filteredProducts = useMemo(() => {
    if (!stockFilter || stockFilter === "all") return products;
    return products.filter((p) => {
      const level =
        p.stock_level ||
        (parseFloat(p.available_quantity_kg || 0) >= 200
          ? "in_stock"
          : parseFloat(p.available_quantity_kg || 0) > 0
          ? "low_stock"
          : "out_of_stock");
      return level === stockFilter;
    });
  }, [products, stockFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ROWS_PER_PAGE));
  const pageSlice = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredProducts.slice(start, start + ROWS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // ─── Modal Actions ──────────────────────────────────────────

  const handleOpenAddModal = () => {
    setModalState({ type: "add", product: null });
  };

  const handleOpenViewModal = async (product) => {
    setModalState({ type: "view", product });
    const detailed = await loadProductDetails(product.farm_product_id);
    if (detailed) {
      setModalState((prev) => {
        if (
          prev.type === "view" &&
          prev.product?.farm_product_id === product.farm_product_id
        ) {
          return { type: "view", product: detailed };
        }
        return prev;
      });
    }
  };

  const handleOpenEditFromView = (product) => {
    setModalState({ type: "edit", product });
  };

  const handleCloseModal = () => {
    setModalState({ type: null, product: null });
  };

  // When clicking X on Edit modal: return to the same product's View Details
  const handleCloseEdit = () => {
    if (modalState.product) {
      handleOpenViewModal(modalState.product);
    } else {
      handleCloseModal();
    }
  };

  // Submit Add
  const handleSaveAdd = async (payload) => {
    try {
      await addProduct(payload);
      handleCloseModal();
      showToast({
        type: "success",
        title: "Product Added",
        message: "New product was successfully added to your inventory.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Add Failed",
        message: err.message || "Failed to add inventory product.",
      });
    }
  };

  // Submit Edit
  const handleSaveEdit = async (productId, payload) => {
    try {
      await updateProduct(productId, payload);
      handleCloseModal();
      showToast({
        type: "success",
        title: "Product Updated",
        message: "Product details were updated successfully.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to update product.",
      });
    }
  };

  // Confirm Archive
  const handleConfirmArchive = async (productId, reason) => {
    try {
      await archiveProduct(productId, reason);
      handleCloseModal();
      showToast({
        type: "success",
        title: "Product Archived",
        message: "The product was archived and moved to the Archive tab.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Archive Failed",
        message: err.message || "Failed to archive product.",
      });
    }
  };

  // Confirm Restore
  const handleConfirmRestore = async (productId) => {
    try {
      await restoreProduct(productId);
      handleCloseModal();
      showToast({
        type: "success",
        title: "Product Restored",
        message: "The product was restored to Active Inventory.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Restore Failed",
        message: err.message || "Failed to restore product.",
      });
    }
  };

  const currentColumns =
    activeTab === INVENTORY_STATUS_ACTIVE ? ACTIVE_COLUMNS : ARCHIVE_COLUMNS;

  return (
    <div className="w-full space-y-4 pt-1">
      {/* Toast Notification */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Tabs & Refresh Row (Redundant breadcrumbs and titles removed; controls moved upward) */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setStockFilter("all");
                }}
                className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? "border-[#0B5D1E] text-[#0B5D1E]"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={fetchCurrentTabProducts}
          disabled={isLoadingProducts}
          className="flex items-center gap-1.5 px-3 py-1.5 mb-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            size={13}
            className={
              isLoadingProducts ? "animate-spin text-emerald-600" : "text-slate-500"
            }
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Controls Bar: Search, Stock Level Filter, Sort, Add Product */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2.5 flex-1 items-stretch sm:items-center">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, variety, or description..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stock Level Dropdown */}
          <div className="relative" ref={stockRef}>
            <button
              type="button"
              onClick={() => {
                setShowStockDrop((prev) => !prev);
                setShowSortDrop(false);
              }}
              className={`flex items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-w-[150px] shadow-xs ${
                stockFilter !== "all"
                  ? "border-emerald-500 text-emerald-800 bg-emerald-50/50"
                  : ""
              }`}
            >
              <span className="truncate">
                {STOCK_FILTER_OPTIONS.find((o) => o.value === stockFilter)?.label ||
                  "Stock Level"}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${
                  showStockDrop ? "rotate-180" : ""
                }`}
              />
            </button>

            {showStockDrop && (
              <div className="absolute top-full mt-1.5 left-0 z-30 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                {STOCK_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setStockFilter(opt.value);
                      setCurrentPage(1);
                      setShowStockDrop(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      stockFilter === opt.value
                        ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setShowSortDrop((prev) => !prev);
                setShowStockDrop(false);
              }}
              className="flex items-center justify-between gap-2 border border-slate-200 bg-white px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-w-[150px] shadow-xs"
            >
              <span className="truncate">
                {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort"}
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${
                  showSortDrop ? "rotate-180" : ""
                }`}
              />
            </button>

            {showSortDrop && (
              <div className="absolute top-full mt-1.5 left-0 z-30 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.value);
                      setShowSortDrop(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                      sortBy === opt.value
                        ? "bg-[#EAF7E8] text-[#0B5D1E] font-bold"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Product Button (Active Tab Only) */}
        {activeTab === INVENTORY_STATUS_ACTIVE && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Stock Legend (Active Tab Only) */}
      {activeTab === INVENTORY_STATUS_ACTIVE && (
        <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-semibold text-slate-600">
          <span className="text-slate-400">Legend:</span>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            In Stock (≥200 kg)
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Low Stock (&lt;200 kg)
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Out of Stock (0 kg)
          </span>
        </div>
      )}

      {/* Table Card (Matches MillerEncoderStockManagement) */}
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
              {isLoadingProducts ? (
                <tr>
                  <td
                    colSpan={currentColumns.length}
                    className="px-5 py-16 text-center text-xs text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="animate-spin text-emerald-600" size={18} />
                      <span>Loading inventory records...</span>
                    </div>
                  </td>
                </tr>
              ) : pageSlice.length === 0 ? (
                <tr>
                  <td
                    colSpan={currentColumns.length}
                    className="px-5 py-16 text-center text-xs text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Package size={28} className="text-slate-300" />
                      <p className="font-semibold text-slate-600 text-sm">
                        {activeTab === INVENTORY_STATUS_ARCHIVED
                          ? "No archived products found."
                          : "No active products found."}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs">
                        {search || stockFilter !== "all"
                          ? "Try adjusting your search query or stock level filter."
                          : activeTab === INVENTORY_STATUS_ARCHIVED
                          ? "Products you archive will appear here."
                          : "Click 'Add Product' or record a harvest to add rice inventory."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageSlice.map((product) => {
                  const pid = product.farm_product_id;
                  const totalKg = parseFloat(
                    product.total_stock_quantity_kg || product.stock_quantity_kg || 0
                  );
                  const reservedKg = parseFloat(
                    product.reserved_committed_quantity_kg || 0
                  );
                  const availableKg = parseFloat(
                    product.available_quantity_kg !== undefined &&
                      product.available_quantity_kg !== null
                      ? product.available_quantity_kg
                      : Math.max(totalKg - reservedKg, 0)
                  );
                  const stockLevel =
                    product.stock_level ||
                    (availableKg >= 200
                      ? "in_stock"
                      : availableKg > 0
                      ? "low_stock"
                      : "out_of_stock");

                  return (
                    <tr
                      key={pid}
                      className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Product Code */}
                      <td className="whitespace-nowrap px-4 py-3 pl-6 text-[13px] font-medium text-slate-700">
                        {product.product_code || "—"}
                      </td>

                      {/* Variety Column (Shows ONLY the rice variety name, no secondary badges/text) */}
                      <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">
                        {product.rice_variety || "—"}
                      </td>

                      {/* Total Stock (Active Tab Only) */}
                      {activeTab === INVENTORY_STATUS_ACTIVE && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                            <StockDot level={stockLevel} />
                            {totalKg.toLocaleString()} kg
                          </span>
                        </td>
                      )}

                      {/* Available Stock (Active Tab Only) */}
                      {activeTab === INVENTORY_STATUS_ACTIVE && (
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[13px] font-semibold text-emerald-700">
                              {availableKg.toLocaleString()} kg
                            </span>
                            {reservedKg > 0 && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                ({reservedKg.toLocaleString()} kg reserved)
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Selling Price (Active Tab Only) */}
                      {activeTab === INVENTORY_STATUS_ACTIVE && (
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] font-medium text-slate-700">
                          {product.selling_price_per_kg !== null &&
                          product.selling_price_per_kg !== undefined
                            ? `₱${Number(product.selling_price_per_kg).toFixed(2)}`
                            : "—"}
                        </td>
                      )}

                      {/* Source: Shows ONLY the farm name (no address underneath) */}
                      {activeTab === INVENTORY_STATUS_ACTIVE && (
                        <td className="px-4 py-3 text-[13px] font-medium text-slate-700">
                          {product.source_farm_name ||
                            (product.acquisition_source_type === "Other Source"
                              ? "Other Source"
                              : "—")}
                        </td>
                      )}

                      {/* Archived Stock Column (Archive Tab Only) */}
                      {activeTab === INVENTORY_STATUS_ARCHIVED && (
                        <td className="px-4 py-3 text-[12px] text-slate-600">
                          <div>
                            <span className="font-semibold text-slate-700">
                              {totalKg.toLocaleString()} kg
                            </span>
                            {product.archived_at && (
                              <span className="block text-[10px] text-slate-400">
                                {new Date(product.archived_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Archive Reason (Archive Tab Only) */}
                      {activeTab === INVENTORY_STATUS_ARCHIVED && (
                        <td className="px-4 py-3 text-[12px] text-slate-600">
                          <p className="line-clamp-2 max-w-sm font-normal">
                            {product.archive_reason || "Archived by farmer"}
                          </p>
                        </td>
                      )}

                      {/* Action Column */}
                      <td className="whitespace-nowrap px-4 py-3 pr-6 text-center">
                        {activeTab === INVENTORY_STATUS_ACTIVE ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenViewModal(product)}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                            >
                              View Details
                            </button>
                            <CustomAmberButton
                              text="Archive"
                              className="px-3 py-1.5 text-[11px] rounded-lg"
                              onClick={() =>
                                setModalState({
                                  type: "archive",
                                  product,
                                })
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <CustomGreenButton
                              text="Restore"
                              className="px-3.5 py-1.5 text-[11px] rounded-lg"
                              onClick={() =>
                                setModalState({
                                  type: "restore",
                                  product,
                                })
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

        {/* Table Footer: Results count & pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing {filteredProducts.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1}{" "}
            to {Math.min(currentPage * ROWS_PER_PAGE, filteredProducts.length)} of{" "}
            {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}
          </span>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </article>

      {/* ========================================================
          MODALS
      ======================================================== */}

      {/* Add Product Modal */}
      <FarmerInventoryAddProductModal
        open={modalState.type === "add"}
        onClose={handleCloseModal}
        onSave={handleSaveAdd}
        farmOptions={farmOptions}
        isSaving={isSavingProduct}
        apiError={apiError}
      />

      {/* View Product Details Modal */}
      <FarmerInventoryProductDetailsModal
        open={modalState.type === "view"}
        product={modalState.product}
        onClose={handleCloseModal}
        onEdit={handleOpenEditFromView}
      />

      {/* Edit Product Modal */}
      <FarmerInventoryEditProductModal
        open={modalState.type === "edit"}
        product={modalState.product}
        onClose={handleCloseEdit}
        onSave={handleSaveEdit}
        isSaving={isSavingProduct}
        apiError={apiError}
      />

      {/* Archive / Restore Confirmation Modal */}
      <FarmerInventoryStatusConfirmModal
        open={modalState.type === "archive" || modalState.type === "restore"}
        action={
          modalState.type === "archive"
            ? INVENTORY_ARCHIVE_ACTION
            : INVENTORY_RESTORE_ACTION
        }
        product={modalState.product}
        isSaving={isChangingProductStatus}
        error={apiError}
        onClose={handleCloseModal}
        onConfirm={(productId, reason) => {
          if (modalState.type === "archive") {
            handleConfirmArchive(productId, reason);
          } else {
            handleConfirmRestore(productId);
          }
        }}
      />
    </div>
  );
}
