import {
  useCallback,
  useState,
} from "react";

import useApi from "../useApi";


// ============================================================
// DEFAULTS
// ============================================================

export const INVENTORY_STATUS_ACTIVE =
  "active";

export const INVENTORY_STATUS_ARCHIVED =
  "archived";


export const INVENTORY_SORT_NEWEST =
  "newest";

export const INVENTORY_SORT_OLDEST =
  "oldest";

export const INVENTORY_SORT_STOCK_HIGHEST =
  "stock_highest";

export const INVENTORY_SORT_STOCK_LOWEST =
  "stock_lowest";


const DEFAULT_FILTERS = {
  status: INVENTORY_STATUS_ACTIVE,
  search: "",
  sortBy: INVENTORY_SORT_NEWEST,
};


// ============================================================
// HELPERS
// ============================================================

const unwrapData = (
  response
) => {
  if (
    response &&
    typeof response === "object" &&
    Object.prototype.hasOwnProperty.call(
      response,
      "data"
    )
  ) {
    return response.data;
  }

  return response;
};


const getErrorMessage = (
  error,
  fallback
) => {
  return (
    error?.data?.message ||
    error?.message ||
    fallback
  );
};


const toNumberOrNull = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized = Number(
    value
  );

  return Number.isFinite(
    normalized
  )
    ? normalized
    : null;
};


const normalizeProduct = (
  product
) => {
  if (
    !product ||
    typeof product !== "object"
  ) {
    return null;
  }

  return {
    ...product,

    farm_product_id:
      product.farm_product_id,

    total_stock_quantity_kg:
      toNumberOrNull(
        product.total_stock_quantity_kg
      ),

    reserved_committed_quantity_kg:
      toNumberOrNull(
        product.reserved_committed_quantity_kg
      ),

    available_quantity_kg:
      toNumberOrNull(
        product.available_quantity_kg
      ),

    selling_price_per_kg:
      toNumberOrNull(
        product.selling_price_per_kg
      ),

    source_expected_yield_kg:
      toNumberOrNull(
        product.source_expected_yield_kg
      ),

    source_actual_yield_kg:
      toNumberOrNull(
        product.source_actual_yield_kg
      ),
  };
};


const normalizeProductList = (
  items
) => {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  return items
    .map(
      normalizeProduct
    )
    .filter(
      Boolean
    );
};


const normalizeFarmOptions = (
  items
) => {
  if (
    !Array.isArray(items)
  ) {
    return [];
  }

  return items.map(
    (
      farm
    ) => ({
      ...farm,

      farm_id:
        farm.farm_id,
    })
  );
};


const buildInventoryQuery = (
  filters = {}
) => {
  const merged = {
    ...DEFAULT_FILTERS,
    ...filters,
  };

  const params =
    new URLSearchParams();

  const status = String(
    merged.status ||
    INVENTORY_STATUS_ACTIVE
  ).trim();

  const search = String(
    merged.search || ""
  ).trim();

  const sortBy = String(
    merged.sortBy ||
    INVENTORY_SORT_NEWEST
  ).trim();


  if (status) {
    params.set(
      "status",
      status
    );
  }

  if (search) {
    params.set(
      "search",
      search
    );
  }

  if (sortBy) {
    params.set(
      "sort_by",
      sortBy
    );
  }


  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
};


// ============================================================
// HOOK
// ============================================================

const useFarmerInventory = () => {
  const {
    request,
  } = useApi();


  // =========================================================
  // DATA
  // =========================================================

  const [
    products,
    setProducts,
  ] = useState(
    []
  );


  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(
    null
  );


  const [
    farmOptions,
    setFarmOptions,
  ] = useState(
    []
  );


  const [
    filters,
    setFilters,
  ] = useState(
    DEFAULT_FILTERS
  );


  // =========================================================
  // LOADING STATES
  // =========================================================

  const [
    isLoadingProducts,
    setIsLoadingProducts,
  ] = useState(
    false
  );


  const [
    isLoadingProductDetails,
    setIsLoadingProductDetails,
  ] = useState(
    false
  );


  const [
    isLoadingFarmOptions,
    setIsLoadingFarmOptions,
  ] = useState(
    false
  );


  const [
    isSavingProduct,
    setIsSavingProduct,
  ] = useState(
    false
  );


  const [
    isChangingProductStatus,
    setIsChangingProductStatus,
  ] = useState(
    false
  );


  const [
    error,
    setError,
  ] = useState(
    ""
  );


  // =========================================================
  // LOAD INVENTORY PRODUCTS
  // =========================================================

  const loadProducts =
    useCallback(
      async (
        nextFilters = filters
      ) => {
        const mergedFilters = {
          ...DEFAULT_FILTERS,
          ...nextFilters,
        };

        setIsLoadingProducts(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              (
                "/farmer/farm-management/inventory/" +
                buildInventoryQuery(
                  mergedFilters
                )
              ),
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const payload =
            unwrapData(
              response
            );

          const normalized =
            normalizeProductList(
              payload?.items
            );

          setProducts(
            normalized
          );

          setFilters(
            mergedFilters
          );

          return normalized;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load Farmer Inventory."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingProducts(
            false
          );
        }
      },
      [
        filters,
        request,
      ]
    );


  // =========================================================
  // LOAD PRODUCT DETAILS
  // =========================================================

  const loadProductDetails =
    useCallback(
      async (
        farmProductId
      ) => {
        if (!farmProductId) {
          throw new Error(
            "Inventory product ID is required."
          );
        }

        setIsLoadingProductDetails(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/inventory/${farmProductId}/`,
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const product =
            normalizeProduct(
              unwrapData(
                response
              )
            );

          setSelectedProduct(
            product
          );

          return product;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load product details."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingProductDetails(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // LOAD FARM OPTIONS
  // =========================================================

  const loadFarmOptions =
    useCallback(
      async () => {
        setIsLoadingFarmOptions(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              "/farmer/farm-management/inventory/farm-options/",
              {
                method:
                  "GET",

                throwOnError:
                  true,
              }
            );

          const payload =
            unwrapData(
              response
            );

          const normalized =
            normalizeFarmOptions(
              payload?.items
            );

          setFarmOptions(
            normalized
          );

          return normalized;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to load Source Farm options."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsLoadingFarmOptions(
            false
          );
        }
      },
      [
        request,
      ]
    );


  // =========================================================
  // ADD PRODUCT
  // =========================================================

  const addProduct =
    useCallback(
      async (
        productData
      ) => {
        setIsSavingProduct(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              "/farmer/farm-management/inventory/",
              {
                method:
                  "POST",

                body:
                  productData,

                throwOnError:
                  true,
              }
            );

          const product =
            normalizeProduct(
              unwrapData(
                response
              )
            );

          await loadProducts(
            filters
          );

          if (product) {
            setSelectedProduct(
              product
            );
          }

          return product;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to add product to Inventory."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingProduct(
            false
          );
        }
      },
      [
        filters,
        loadProducts,
        request,
      ]
    );


  // =========================================================
  // EDIT PRODUCT
  // =========================================================

  const updateProduct =
    useCallback(
      async (
        farmProductId,
        productData
      ) => {
        if (!farmProductId) {
          throw new Error(
            "Inventory product ID is required."
          );
        }

        setIsSavingProduct(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/inventory/${farmProductId}/`,
              {
                method:
                  "PATCH",

                body:
                  productData,

                throwOnError:
                  true,
              }
            );

          const product =
            normalizeProduct(
              unwrapData(
                response
              )
            );

          setSelectedProduct(
            product
          );

          await loadProducts(
            filters
          );

          return product;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to update Inventory product."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsSavingProduct(
            false
          );
        }
      },
      [
        filters,
        loadProducts,
        request,
      ]
    );


  // =========================================================
  // ARCHIVE PRODUCT
  // =========================================================

  const archiveProduct =
    useCallback(
      async (
        farmProductId
      ) => {
        if (!farmProductId) {
          throw new Error(
            "Inventory product ID is required."
          );
        }

        setIsChangingProductStatus(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/inventory/${farmProductId}/archive/`,
              {
                method:
                  "PATCH",

                body: {},

                throwOnError:
                  true,
              }
            );

          const product =
            normalizeProduct(
              unwrapData(
                response
              )
            );

          if (
            selectedProduct?.farm_product_id ===
            product?.farm_product_id
          ) {
            setSelectedProduct(
              product
            );
          }

          await loadProducts(
            filters
          );

          return product;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to archive Inventory product."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsChangingProductStatus(
            false
          );
        }
      },
      [
        filters,
        loadProducts,
        request,
        selectedProduct,
      ]
    );


  // =========================================================
  // RESTORE PRODUCT
  // =========================================================

  const restoreProduct =
    useCallback(
      async (
        farmProductId
      ) => {
        if (!farmProductId) {
          throw new Error(
            "Inventory product ID is required."
          );
        }

        setIsChangingProductStatus(
          true
        );

        setError(
          ""
        );

        try {
          const response =
            await request(
              `/farmer/farm-management/inventory/${farmProductId}/restore/`,
              {
                method:
                  "PATCH",

                body: {},

                throwOnError:
                  true,
              }
            );

          const product =
            normalizeProduct(
              unwrapData(
                response
              )
            );

          if (
            selectedProduct?.farm_product_id ===
            product?.farm_product_id
          ) {
            setSelectedProduct(
              product
            );
          }

          await loadProducts(
            filters
          );

          return product;

        } catch (err) {
          const message =
            getErrorMessage(
              err,
              "Unable to restore Inventory product."
            );

          setError(
            message
          );

          throw err;

        } finally {
          setIsChangingProductStatus(
            false
          );
        }
      },
      [
        filters,
        loadProducts,
        request,
        selectedProduct,
      ]
    );


  // =========================================================
  // FILTER HELPERS
  // =========================================================

  const setInventoryStatus =
    useCallback(
      (
        status
      ) => {
        setFilters(
          (
            current
          ) => ({
            ...current,
            status,
          })
        );
      },
      []
    );


  const setSearch =
    useCallback(
      (
        search
      ) => {
        setFilters(
          (
            current
          ) => ({
            ...current,
            search,
          })
        );
      },
      []
    );


  const setSortBy =
    useCallback(
      (
        sortBy
      ) => {
        setFilters(
          (
            current
          ) => ({
            ...current,
            sortBy,
          })
        );
      },
      []
    );


  // =========================================================
  // LOCAL STATE HELPERS
  // =========================================================

  const clearError =
    useCallback(
      () => {
        setError(
          ""
        );
      },
      []
    );


  const clearSelectedProduct =
    useCallback(
      () => {
        setSelectedProduct(
          null
        );
      },
      []
    );


  const resetFilters =
    useCallback(
      () => {
        setFilters({
          ...DEFAULT_FILTERS,
        });
      },
      []
    );


  // =========================================================
  // RETURN
  // =========================================================

  return {
    // data
    products,
    selectedProduct,
    farmOptions,
    filters,

    // loading
    isLoadingProducts,
    isLoadingProductDetails,
    isLoadingFarmOptions,
    isSavingProduct,
    isChangingProductStatus,

    // error
    error,

    // reads
    loadProducts,
    loadProductDetails,
    loadFarmOptions,

    // writes
    addProduct,
    updateProduct,
    archiveProduct,
    restoreProduct,

    // filters
    setFilters,
    setInventoryStatus,
    setSearch,
    setSortBy,
    resetFilters,

    // local state
    clearError,
    clearSelectedProduct,
  };
};


export default useFarmerInventory;