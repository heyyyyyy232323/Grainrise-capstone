import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  Archive,
  Loader2,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
} from "lucide-react";

import useFarmerInventory, {
  INVENTORY_STATUS_ACTIVE,
  INVENTORY_STATUS_ARCHIVED,
  INVENTORY_SORT_NEWEST,
  INVENTORY_SORT_OLDEST,
  INVENTORY_SORT_STOCK_HIGHEST,
  INVENTORY_SORT_STOCK_LOWEST,
} from "../../Components/hooks/Farmer/useFarmerInventory";
import SortByDropdown from "../../Components/Minor-Components/SortByDropdown";


// ============================================================
// LAZY-LOADED MODALS
// ============================================================

const FarmerInventoryAddProductModal =
  lazy(
    () =>
      import(
        "../../Components/Modals/FarmerInventoryAddProductModal"
      )
  );


const FarmerInventoryProductDetailsModal =
  lazy(
    () =>
      import(
        "../../Components/Modals/FarmerInventoryProductDetailsModal"
      )
  );


const FarmerInventoryEditProductModal =
  lazy(
    () =>
      import(
        "../../Components/Modals/FarmerInventoryEditProductModal"
      )
  );


const FarmerInventoryStatusConfirmModal =
  lazy(
    () =>
      import(
        "../../Components/Modals/FarmerInventoryStatusConfirmModal"
      )
  );


// ============================================================
// ACTIONS
// ============================================================

const INVENTORY_ARCHIVE_ACTION =
  "archive";

const INVENTORY_RESTORE_ACTION =
  "restore";


// ============================================================
// SORT OPTIONS
// ============================================================

const SORT_OPTIONS = [
  {
    value:
      INVENTORY_SORT_NEWEST,

    label:
      "Newest",
  },

  {
    value:
      INVENTORY_SORT_OLDEST,

    label:
      "Oldest",
  },

  {
    value:
      INVENTORY_SORT_STOCK_HIGHEST,

    label:
      "Stock: Highest to Lowest",
  },

  {
    value:
      INVENTORY_SORT_STOCK_LOWEST,

    label:
      "Stock: Lowest to Highest",
  },
];


// ============================================================
// HELPERS
// ============================================================

const displayValue = (
  value,
  fallback = "—"
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const normalized =
    String(
      value
    ).trim();

  return (
    normalized ||
    fallback
  );
};


const formatNumber = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const number =
    Number(
      value
    );

  if (
    !Number.isFinite(
      number
    )
  ) {
    return displayValue(
      value
    );
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    number
  );
};


const formatProductType = (
  value
) => {
  if (
    value ===
    "milled_rice"
  ) {
    return "MILLED";
  }

  if (
    value ===
    "unmilled_palay"
  ) {
    return "NONMILLED";
  }

  return "—";
};


// ============================================================
// STOCK BADGE
// ============================================================

const StockBadge = ({
  value,
}) => {
  let label =
    "In Stock";

  let classes =
    "border-green-200 bg-green-50 text-green-700";


  if (
    value ===
    "low_stock"
  ) {
    label =
      "Low Stock";

    classes =
      "border-amber-200 bg-amber-50 text-amber-700";
  }


  if (
    value ===
    "out_of_stock"
  ) {
    label =
      "Out of Stock";

    classes =
      "border-red-200 bg-red-50 text-red-700";
  }


  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        rounded-full
        border
        px-2.5
        py-1
        text-xs
        font-semibold
        ${classes}
      `}
    >
      {label}
    </span>
  );
};


// ============================================================
// PRODUCT TYPE BADGE
// ============================================================

const ProductTypeBadge = ({
  value,
}) => {
  const milled =
    value ===
    "milled_rice";


  return (
    <span
      className={`
        inline-flex
        rounded-md
        px-2
        py-1
        text-[11px]
        font-bold

        ${
          milled
            ? (
              "bg-emerald-50 " +
              "text-emerald-700"
            )
            : (
              "bg-amber-50 " +
              "text-amber-700"
            )
        }
      `}
    >
      {
        formatProductType(
          value
        )
      }
    </span>
  );
};


// ============================================================
// MODAL LOADING
// ============================================================

const ModalLoadingFallback = () => {
  return (
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-4
      "
    >
      <div
        className="
          flex
          min-w-[240px]
          flex-col
          items-center
          justify-center
          gap-3
          rounded-2xl
          bg-white
          px-8
          py-8
          shadow-2xl
        "
      >
        <Loader2
          size={28}
          className="
            animate-spin
            text-green-700
          "
        />

        <p
          className="
            text-sm
            font-semibold
            text-slate-600
          "
        >
          Loading...
        </p>
      </div>
    </div>
  );
};


// ============================================================
// MODAL ERROR BOUNDARY
// ============================================================

class InventoryModalErrorBoundary extends Component {
  constructor(
    props
  ) {
    super(
      props
    );

    this.state = {
      hasError:
        false,
    };
  }


  static getDerivedStateFromError() {
    return {
      hasError:
        true,
    };
  }


  componentDidCatch(
    error
  ) {
    console.error(
      "Farmer Inventory modal error:",
      error
    );
  }


  render() {
    if (
      this.state.hasError
    ) {
      return (
        <div
          className="
            fixed
            inset-0
            z-[100000]
            flex
            items-center
            justify-center
            bg-slate-950/55
            p-4
          "
        >
          <div
            className="
              w-full
              max-w-md
              rounded-2xl
              border
              border-red-200
              bg-white
              p-6
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-50
                  text-red-600
                "
              >
                <AlertCircle
                  size={20}
                />
              </div>

              <div>
                <h3
                  className="
                    text-base
                    font-bold
                    text-slate-900
                  "
                >
                  Unable to Open Window
                </h3>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  This Inventory window could not be loaded.
                  The main Inventory page is still available.
                </p>
              </div>
            </div>

            <div
              className="
                mt-5
                flex
                justify-end
              "
            >
              <button
                type="button"
                onClick={
                  this.props.onClose
                }
                className="
                  rounded-lg
                  bg-green-700
                  px-5
                  py-2.5
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-green-800
                "
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


// ============================================================
// COMPONENT
// ============================================================

export default function FarmerInventory() {

  // =========================================================
  // INVENTORY HOOK
  // =========================================================

  const {
    products,
    selectedProduct,
    farmOptions,

    isLoadingProducts,
    isLoadingProductDetails,
    isLoadingFarmOptions,
    isSavingProduct,
    isChangingProductStatus,

    error,

    loadProducts,
    loadProductDetails,
    loadFarmOptions,

    addProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,

    clearError,
    clearSelectedProduct,
  } =
    useFarmerInventory();


  // =========================================================
  // FILTERS
  // =========================================================

  const [
    activeTab,
    setActiveTab,
  ] =
    useState(
      INVENTORY_STATUS_ACTIVE
    );


  const [
    searchInput,
    setSearchInput,
  ] =
    useState(
      ""
    );


  const [
    appliedSearch,
    setAppliedSearch,
  ] =
    useState(
      ""
    );


  const [
    sortBy,
    setSortBy,
  ] =
    useState(
      INVENTORY_SORT_NEWEST
    );


  // =========================================================
  // MODALS
  // =========================================================

  const [
    addModalOpen,
    setAddModalOpen,
  ] =
    useState(
      false
    );


  const [
    detailsModalOpen,
    setDetailsModalOpen,
  ] =
    useState(
      false
    );


  const [
    editModalOpen,
    setEditModalOpen,
  ] =
    useState(
      false
    );


  const [
    statusConfirmOpen,
    setStatusConfirmOpen,
  ] =
    useState(
      false
    );


  const [
    statusAction,
    setStatusAction,
  ] =
    useState(
      null
    );


  const [
    statusProduct,
    setStatusProduct,
  ] =
    useState(
      null
    );


  // =========================================================
  // FEEDBACK
  // =========================================================

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ""
    );


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(
    () => {
      loadProducts({
        status:
          INVENTORY_STATUS_ACTIVE,

        search:
          "",

        sortBy:
          INVENTORY_SORT_NEWEST,
      }).catch(
        () => {}
      );

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  // =========================================================
  // SUCCESS TIMER
  // =========================================================

  useEffect(
    () => {
      if (
        !successMessage
      ) {
        return undefined;
      }

      const timer =
        window.setTimeout(
          () => {
            setSuccessMessage(
              ""
            );
          },
          4000
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      successMessage,
    ]
  );


  // =========================================================
  // CURRENT FILTERS
  // =========================================================

  const buildCurrentFilters = (
    overrides = {}
  ) => {
    return {
      status:
        activeTab,

      search:
        appliedSearch,

      sortBy,

      ...overrides,
    };
  };


  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh =
    async () => {
      clearError();

      try {
        await loadProducts(
          buildCurrentFilters()
        );
      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // ACTIVE / ARCHIVE
  // =========================================================

  const handleTabChange =
    async (
      nextStatus
    ) => {
      if (
        nextStatus ===
        activeTab
      ) {
        return;
      }

      clearError();

      setActiveTab(
        nextStatus
      );

      try {
        await loadProducts({
          status:
            nextStatus,

          search:
            appliedSearch,

          sortBy,
        });
      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // SEARCH
  // =========================================================

  const handleSearchSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      const normalized =
        String(
          searchInput ||
          ""
        ).trim();

      setAppliedSearch(
        normalized
      );

      clearError();

      try {
        await loadProducts({
          status:
            activeTab,

          search:
            normalized,

          sortBy,
        });
      } catch {
        // Hook handles error.
      }
    };


  const handleClearSearch =
    async () => {
      setSearchInput(
        ""
      );

      setAppliedSearch(
        ""
      );

      clearError();

      try {
        await loadProducts({
          status:
            activeTab,

          search:
            "",

          sortBy,
        });
      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // SORT
  // =========================================================

  const handleSortChange =
    async (
      valueOrEvent
    ) => {
      const nextSort =
        valueOrEvent?.target
          ? valueOrEvent.target.value
          : valueOrEvent;

      setSortBy(
        nextSort
      );

      clearError();

      try {
        await loadProducts({
          status:
            activeTab,

          search:
            appliedSearch,

          sortBy:
            nextSort,
        });
      } catch {
        // Hook handles error.
      }
    };


  // =========================================================
  // ADD PRODUCT
  // =========================================================

  const handleOpenAddProduct =
    async () => {
      clearError();

      setAddModalOpen(
        true
      );

      try {
        await loadFarmOptions();
      } catch {
        // Modal shows error.
      }
    };


  const handleCloseAddProduct =
    () => {
      if (
        isSavingProduct
      ) {
        return;
      }

      clearError();

      setAddModalOpen(
        false
      );
    };


  const handleAddProduct =
    async (
      data
    ) => {
      try {
        await addProduct(
          data
        );

        setAddModalOpen(
          false
        );

        setSuccessMessage(
          "Product added to Inventory successfully."
        );

        if (
          activeTab !==
          INVENTORY_STATUS_ACTIVE
        ) {
          setActiveTab(
            INVENTORY_STATUS_ACTIVE
          );

          await loadProducts({
            status:
              INVENTORY_STATUS_ACTIVE,

            search:
              appliedSearch,

            sortBy,
          });
        }
      } catch {
        // Keep modal open.
      }
    };


  // =========================================================
  // VIEW DETAILS
  // =========================================================

  const handleViewDetails =
    async (
      product
    ) => {
      if (
        !product?.farm_product_id
      ) {
        return;
      }

      clearError();

      clearSelectedProduct();

      setDetailsModalOpen(
        true
      );

      try {
        await loadProductDetails(
          product.farm_product_id
        );
      } catch {
        // Modal displays error.
      }
    };


  const handleCloseDetails =
    () => {
      if (
        isChangingProductStatus
      ) {
        return;
      }

      clearError();

      setDetailsModalOpen(
        false
      );

      clearSelectedProduct();
    };


  // =========================================================
  // EDIT PRODUCT
  // =========================================================

  const handleOpenEditProduct =
    (
      product
    ) => {
      if (!product) {
        return;
      }

      clearError();

      setDetailsModalOpen(
        false
      );

      setEditModalOpen(
        true
      );
    };


  const handleCloseEdit =
    () => {
      if (
        isSavingProduct
      ) {
        return;
      }

      clearError();

      setEditModalOpen(
        false
      );

      if (
        selectedProduct
      ) {
        setDetailsModalOpen(
          true
        );
      }
    };


  const handleEditProduct =
    async (
      farmProductId,
      data
    ) => {
      try {
        await updateProduct(
          farmProductId,
          data
        );

        setEditModalOpen(
          false
        );

        setDetailsModalOpen(
          true
        );

        setSuccessMessage(
          "Inventory product updated successfully."
        );
      } catch {
        // Keep modal open.
      }
    };


  // =========================================================
  // ARCHIVE
  // =========================================================

  const handleOpenArchive =
    (
      product
    ) => {
      if (!product) {
        return;
      }

      clearError();

      setDetailsModalOpen(
        false
      );

      setStatusProduct(
        product
      );

      setStatusAction(
        INVENTORY_ARCHIVE_ACTION
      );

      setStatusConfirmOpen(
        true
      );
    };


  // =========================================================
  // RESTORE
  // =========================================================

  const handleOpenRestore =
    (
      product
    ) => {
      if (!product) {
        return;
      }

      clearError();

      setDetailsModalOpen(
        false
      );

      setStatusProduct(
        product
      );

      setStatusAction(
        INVENTORY_RESTORE_ACTION
      );

      setStatusConfirmOpen(
        true
      );
    };


  const handleCloseStatusConfirm =
    () => {
      if (
        isChangingProductStatus
      ) {
        return;
      }

      clearError();

      setStatusConfirmOpen(
        false
      );

      setStatusAction(
        null
      );

      setStatusProduct(
        null
      );
    };


  // =========================================================
  // CONFIRM STATUS
  // =========================================================

  const handleConfirmStatus =
    async (
      product,
      action
    ) => {
      if (
        !product?.farm_product_id
      ) {
        return;
      }

      try {
        if (
          action ===
          INVENTORY_ARCHIVE_ACTION
        ) {
          await archiveProduct(
            product.farm_product_id
          );

          setSuccessMessage(
            "Product archived successfully."
          );
        }

        else if (
          action ===
          INVENTORY_RESTORE_ACTION
        ) {
          await restoreProduct(
            product.farm_product_id
          );

          setSuccessMessage(
            "Product restored successfully."
          );
        }

        setStatusConfirmOpen(
          false
        );

        setStatusAction(
          null
        );

        setStatusProduct(
          null
        );

        clearSelectedProduct();
      } catch {
        // Keep confirmation open.
      }
    };


  // =========================================================
  // EMPTY STATE
  // =========================================================

  const isArchive =
    activeTab ===
    INVENTORY_STATUS_ARCHIVED;


  const emptyTitle =
    appliedSearch
      ? "No matching products found"
      : isArchive
        ? "No archived products"
        : "No active inventory products";


  const emptyDescription =
    appliedSearch
      ? (
        "Try a different Product Code, Rice Variety, or description."
      )
      : isArchive
        ? (
          "Products you archive will appear here."
        )
        : (
          "Record a successful harvest or add a product manually to start your Inventory."
        );


  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div
      className="
        space-y-5
      "
    >

      {/* ====================================================
          SUCCESS
      ==================================================== */}

      {successMessage && (
        <div
          className="
            rounded-xl
            border
            border-green-200
            bg-green-50
            px-4
            py-3
            text-sm
            font-medium
            text-green-700
          "
        >
          {successMessage}
        </div>
      )}


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error &&
        !addModalOpen &&
        !detailsModalOpen &&
        !editModalOpen &&
        !statusConfirmOpen && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-sm
              text-red-700
            "
          >
            <AlertCircle
              size={18}
              className="
                mt-0.5
                shrink-0
              "
            />

            <span>
              {error}
            </span>
          </div>
        )}


      {/* ====================================================
          INVENTORY CARD
      ==================================================== */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >

        {/* ==================================================
            TOP ROW
            ACTIVE / ARCHIVE + REFRESH / ADD PRODUCT
        ================================================== */}

        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-200
            px-5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >

          {/* ACTIVE / ARCHIVE */}

          <div
            className="
              flex
              items-center
              gap-7
            "
          >
            <button
              type="button"
              onClick={
                () =>
                  handleTabChange(
                    INVENTORY_STATUS_ACTIVE
                  )
              }
              disabled={
                isLoadingProducts
              }
              className={`
                border-b-2
                py-4
                text-sm
                font-semibold
                transition

                ${
                  activeTab ===
                  INVENTORY_STATUS_ACTIVE
                    ? (
                      "border-green-700 " +
                      "text-green-700"
                    )
                    : (
                      "border-transparent " +
                      "text-slate-500 " +
                      "hover:text-slate-700"
                    )
                }
              `}
            >
              Active
            </button>


            <button
              type="button"
              onClick={
                () =>
                  handleTabChange(
                    INVENTORY_STATUS_ARCHIVED
                  )
              }
              disabled={
                isLoadingProducts
              }
              className={`
                border-b-2
                py-4
                text-sm
                font-semibold
                transition

                ${
                  activeTab ===
                  INVENTORY_STATUS_ARCHIVED
                    ? (
                      "border-green-700 " +
                      "text-green-700"
                    )
                    : (
                      "border-transparent " +
                      "text-slate-500 " +
                      "hover:text-slate-700"
                    )
                }
              `}
            >
              Archive
            </button>
          </div>


          {/* REFRESH + ADD PRODUCT */}

          <div
            className="
              flex
              items-center
              gap-2
              pb-3
              sm:pb-0
            "
          >
            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={
                isLoadingProducts
              }
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-slate-300
                bg-white
                px-3.5
                py-2
                text-sm
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={15}
                className={
                  isLoadingProducts
                    ? "animate-spin"
                    : ""
                }
              />

              <span
                className="
                  hidden
                  xs:inline
                "
              >
                Refresh
              </span>
            </button>


            {!isArchive && (
              <button
                type="button"
                onClick={
                  handleOpenAddProduct
                }
                disabled={
                  isSavingProduct
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-green-700
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-green-800
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                <PackagePlus
                  size={16}
                />

                Add Product
              </button>
            )}
          </div>

        </div>


        {/* ==================================================
            SEARCH + SORT
        ================================================== */}

        <div
          className="
            grid
            gap-3
            border-b
            border-slate-200
            bg-slate-50/40
            px-5
            py-4
            lg:grid-cols-[minmax(0,1fr)_280px]
          "
        >
          <form
            onSubmit={
              handleSearchSubmit
            }
            className="
              flex
              min-w-0
              gap-2
            "
          >
            <div
              className="
                relative
                min-w-0
                flex-1
              "
            >
              <Search
                size={17}
                className="
                  pointer-events-none
                  absolute
                  left-3.5
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="search"
                value={
                  searchInput
                }
                onChange={
                  (
                    event
                  ) =>
                    setSearchInput(
                      event.target.value
                    )
                }
                placeholder="Search Product Code, Rice Variety, or Description"
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  py-2.5
                  pl-10
                  pr-3
                  text-sm
                  outline-none
                  placeholder:text-slate-400
                  focus:border-green-600
                  focus:ring-1
                  focus:ring-green-600
                "
              />
            </div>


            <button
              type="submit"
              disabled={
                isLoadingProducts
              }
              className="
                rounded-xl
                bg-green-700
                px-4
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-green-800
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              Search
            </button>


            {appliedSearch && (
              <button
                type="button"
                onClick={
                  handleClearSearch
                }
                disabled={
                  isLoadingProducts
                }
                className="
                  hidden
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-3.5
                  py-2.5
                  text-sm
                  font-semibold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                  sm:block
                "
              >
                Clear
              </button>
            )}
          </form>


          <div className="w-full">
            <SortByDropdown
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={handleSortChange}
              disabled={isLoadingProducts}
            />
          </div>
        </div>


        {/* ==================================================
            STOCK LEGEND
        ================================================== */}

        <div
          className="
            hidden
            flex-wrap
            items-center
            gap-x-5
            gap-y-2
            border-b
            border-slate-100
            px-5
            py-3
            text-xs
            text-slate-500
            sm:flex
          "
        >
          <span
            className="
              font-semibold
              text-slate-600
            "
          >
            Stock Legend:
          </span>

          <div
            className="
              flex
              items-center
              gap-1.5
            "
          >
            <span
              className="
                h-2.5
                w-2.5
                rounded-full
                bg-green-500
              "
            />

            In Stock
          </div>

          <div
            className="
              flex
              items-center
              gap-1.5
            "
          >
            <span
              className="
                h-2.5
                w-2.5
                rounded-full
                bg-amber-400
              "
            />

            Low Stock
          </div>

          <div
            className="
              flex
              items-center
              gap-1.5
            "
          >
            <span
              className="
                h-2.5
                w-2.5
                rounded-full
                bg-red-500
              "
            />

            Out of Stock
          </div>
        </div>


        {/* ==================================================
            INVENTORY CONTENT
        ================================================== */}

        {isLoadingProducts &&
        products.length === 0 ? (
          <div
            className="
              flex
              min-h-[260px]
              items-center
              justify-center
            "
          >
            <div
              className="
                flex
                flex-col
                items-center
                gap-3
                text-slate-500
              "
            >
              <Loader2
                size={27}
                className="
                  animate-spin
                  text-green-700
                "
              />

              <p
                className="
                  text-sm
                  font-medium
                "
              >
                Loading Inventory...
              </p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div
            className="
              flex
              min-h-[300px]
              flex-col
              items-center
              justify-center
              px-5
              py-10
              text-center
            "
          >
            <div
              className="
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-slate-100
                text-slate-400
              "
            >
              {isArchive ? (
                <Archive
                  size={25}
                />
              ) : (
                <Package
                  size={25}
                />
              )}
            </div>

            <h4
              className="
                mt-4
                text-base
                font-bold
                text-slate-800
              "
            >
              {emptyTitle}
            </h4>

            <p
              className="
                mt-1
                max-w-md
                text-sm
                leading-6
                text-slate-500
              "
            >
              {emptyDescription}
            </p>

            {!isArchive &&
              !appliedSearch && (
                <button
                  type="button"
                  onClick={
                    handleOpenAddProduct
                  }
                  className="
                    mt-5
                    rounded-lg
                    bg-green-700
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-green-800
                  "
                >
                  Add Product
                </button>
              )}
          </div>
        ) : (

          /* ==================================================
              TABLE
          ================================================== */

          <div
            className="
              w-full
              overflow-x-auto
            "
          >
            <table
              className="
                w-full
                text-sm
              "
            >
              <thead
                className="
                  border-b
                  border-slate-200
                  bg-slate-50
                "
              >
                <tr
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                  "
                >

                  {/* DESKTOP ONLY */}

                  <th
                    className="
                      hidden
                      px-5
                      py-3.5
                      text-left
                      md:table-cell
                    "
                  >
                    Product Code
                  </th>


                  {/* MOBILE + DESKTOP */}

                  <th
                    className="
                      px-3
                      py-3.5
                      text-left
                      sm:px-5
                    "
                  >
                    <span
                      className="
                        sm:hidden
                      "
                    >
                      Name
                    </span>

                    <span
                      className="
                        hidden
                        sm:inline
                      "
                    >
                      Variant / Rice Variety
                    </span>
                  </th>


                  {/* MOBILE + DESKTOP */}

                  <th
                    className="
                      px-3
                      py-3.5
                      text-left
                      sm:px-5
                    "
                  >
                    <span
                      className="
                        sm:hidden
                      "
                    >
                      Stock
                    </span>

                    <span
                      className="
                        hidden
                        sm:inline
                      "
                    >
                      Available Stock Qty
                    </span>
                  </th>


                  {/* DESKTOP ONLY */}

                  <th
                    className="
                      hidden
                      px-5
                      py-3.5
                      text-left
                      md:table-cell
                    "
                  >
                    Type
                  </th>


                  {/* MOBILE + DESKTOP */}

                  <th
                    className="
                      px-3
                      py-3.5
                      text-center
                      sm:px-5
                    "
                  >
                    Action
                  </th>

                </tr>
              </thead>


              <tbody
                className="
                  divide-y
                  divide-slate-100
                "
              >
                {products.map(
                  (
                    product
                  ) => (
                    <tr
                      key={
                        product.farm_product_id
                      }
                      className="
                        transition
                        hover:bg-slate-50/70
                      "
                    >

                      {/* ======================================
                          PRODUCT CODE — DESKTOP ONLY
                      ====================================== */}

                      <td
                        className="
                          hidden
                          px-5
                          py-4
                          align-middle
                          md:table-cell
                        "
                      >
                        <p
                          className="
                            font-semibold
                            text-slate-800
                          "
                        >
                          {
                            displayValue(
                              product.product_code
                            )
                          }
                        </p>

                        <div
                          className="
                            mt-1.5
                          "
                        >
                          <StockBadge
                            value={
                              product.stock_level
                            }
                          />
                        </div>
                      </td>


                      {/* ======================================
                          NAME / RICE VARIETY
                      ====================================== */}

                      <td
                        className="
                          px-3
                          py-4
                          align-middle
                          sm:px-5
                        "
                      >
                        <p
                          className="
                            max-w-[130px]
                            truncate
                            font-semibold
                            text-slate-800
                            sm:max-w-none
                            sm:font-medium
                            sm:text-slate-700
                          "
                        >
                          {
                            displayValue(
                              product.rice_variety
                            )
                          }
                        </p>


                        {/* STOCK STATUS MOBILE */}

                        <div
                          className="
                            mt-1.5
                            md:hidden
                          "
                        >
                          <StockBadge
                            value={
                              product.stock_level
                            }
                          />
                        </div>
                      </td>


                      {/* ======================================
                          AVAILABLE STOCK
                      ====================================== */}

                      <td
                        className="
                          whitespace-nowrap
                          px-3
                          py-4
                          align-middle
                          sm:px-5
                        "
                      >
                        <span
                          className="
                            font-bold
                            text-slate-800
                          "
                        >
                          {
                            formatNumber(
                              product.available_quantity_kg
                            )
                          }
                        </span>

                        <span
                          className="
                            ml-1
                            text-xs
                            text-slate-400
                          "
                        >
                          kg
                        </span>
                      </td>


                      {/* ======================================
                          TYPE — DESKTOP ONLY
                      ====================================== */}

                      <td
                        className="
                          hidden
                          px-5
                          py-4
                          align-middle
                          md:table-cell
                        "
                      >
                        <ProductTypeBadge
                          value={
                            product.product_type
                          }
                        />
                      </td>


                      {/* ======================================
                          ACTION
                          VIEW DETAILS ONLY
                      ====================================== */}

                      <td
                        className="
                          px-3
                          py-4
                          text-center
                          align-middle
                          sm:px-5
                        "
                      >
                        <button
                          type="button"
                          onClick={
                            () =>
                              handleViewDetails(
                                product
                              )
                          }
                          className="
                            whitespace-nowrap
                            rounded-md
                            border
                            border-green-200
                            bg-white
                            px-2.5
                            py-1.5
                            text-xs
                            font-semibold
                            text-green-700
                            transition
                            hover:bg-green-50
                            sm:px-3
                          "
                        >
                          <span
                            className="
                              hidden
                              sm:inline
                            "
                          >
                            View Details
                          </span>

                          <span
                            className="
                              sm:hidden
                            "
                          >
                            View
                          </span>
                        </button>
                      </td>

                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}


        {/* ==================================================
            TABLE FOOTER
        ================================================== */}

        {products.length > 0 && (
          <div
            className="
              flex
              flex-col
              gap-2
              border-t
              border-slate-200
              bg-white
              px-5
              py-3.5
              text-xs
              text-slate-500
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <span>
              Showing{" "}
              <strong
                className="
                  text-slate-700
                "
              >
                {products.length}
              </strong>{" "}
              {
                products.length ===
                1
                  ? "product"
                  : "products"
              }
            </span>

            {isLoadingProducts && (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  font-medium
                  text-green-700
                "
              >
                <Loader2
                  size={13}
                  className="
                    animate-spin
                  "
                />

                Updating Inventory...
              </span>
            )}
          </div>
        )}

      </section>


      {/* ====================================================
          ADD PRODUCT MODAL
      ==================================================== */}

      {addModalOpen && (
        <InventoryModalErrorBoundary
          onClose={
            handleCloseAddProduct
          }
        >
          <Suspense
            fallback={
              <ModalLoadingFallback />
            }
          >
            <FarmerInventoryAddProductModal
              open
              farmOptions={
                farmOptions
              }
              isLoadingFarmOptions={
                isLoadingFarmOptions
              }
              isSaving={
                isSavingProduct
              }
              error={
                error
              }
              onClose={
                handleCloseAddProduct
              }
              onSubmit={
                handleAddProduct
              }
            />
          </Suspense>
        </InventoryModalErrorBoundary>
      )}


      {/* ====================================================
          DETAILS MODAL
      ==================================================== */}

      {detailsModalOpen && (
        <InventoryModalErrorBoundary
          onClose={
            handleCloseDetails
          }
        >
          <Suspense
            fallback={
              <ModalLoadingFallback />
            }
          >
            <FarmerInventoryProductDetailsModal
              open
              product={
                selectedProduct
              }
              isLoading={
                isLoadingProductDetails
              }
              isChangingStatus={
                isChangingProductStatus
              }
              error={
                error
              }
              onClose={
                handleCloseDetails
              }
              onEdit={
                handleOpenEditProduct
              }
              onArchive={
                handleOpenArchive
              }
              onRestore={
                handleOpenRestore
              }
            />
          </Suspense>
        </InventoryModalErrorBoundary>
      )}


      {/* ====================================================
          EDIT MODAL
      ==================================================== */}

      {editModalOpen && (
        <InventoryModalErrorBoundary
          onClose={
            handleCloseEdit
          }
        >
          <Suspense
            fallback={
              <ModalLoadingFallback />
            }
          >
            <FarmerInventoryEditProductModal
              open
              product={
                selectedProduct
              }
              isSaving={
                isSavingProduct
              }
              error={
                error
              }
              onClose={
                handleCloseEdit
              }
              onSubmit={
                handleEditProduct
              }
            />
          </Suspense>
        </InventoryModalErrorBoundary>
      )}


      {/* ====================================================
          ARCHIVE / RESTORE CONFIRMATION
      ==================================================== */}

      {statusConfirmOpen && (
        <InventoryModalErrorBoundary
          onClose={
            handleCloseStatusConfirm
          }
        >
          <Suspense
            fallback={
              <ModalLoadingFallback />
            }
          >
            <FarmerInventoryStatusConfirmModal
              open
              action={
                statusAction
              }
              product={
                statusProduct
              }
              isSaving={
                isChangingProductStatus
              }
              error={
                error
              }
              onClose={
                handleCloseStatusConfirm
              }
              onConfirm={
                handleConfirmStatus
              }
            />
          </Suspense>
        </InventoryModalErrorBoundary>
      )}

    </div>
  );
}