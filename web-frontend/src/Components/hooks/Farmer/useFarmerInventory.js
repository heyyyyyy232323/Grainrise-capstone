import { useCallback, useState } from "react";

export const INVENTORY_STATUS_ACTIVE = "active";
export const INVENTORY_STATUS_ARCHIVED = "archived";

export const INVENTORY_SORT_NEWEST = "newest";
export const INVENTORY_SORT_OLDEST = "oldest";
export const INVENTORY_SORT_STOCK_HIGHEST = "stock_highest";
export const INVENTORY_SORT_STOCK_LOWEST = "stock_lowest";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "")
).replace(/\/$/, "") + "/api";

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const DEFAULT_FILTERS = {
  status: INVENTORY_STATUS_ACTIVE,
  search: "",
  sortBy: INVENTORY_SORT_NEWEST,
};

export const useFarmerInventory = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [farmOptions, setFarmOptions] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false);
  const [isLoadingFarmOptions, setIsLoadingFarmOptions] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isChangingProductStatus, setIsChangingProductStatus] = useState(false);
  const [error, setError] = useState("");

  const clearError = useCallback(() => setError(""), []);
  const clearSelectedProduct = useCallback(() => setSelectedProduct(null), []);

  // =========================================================
  // LOAD PRODUCTS (ACTIVE / ARCHIVE)
  // =========================================================
  const loadProducts = useCallback(
    async (customFilters = {}) => {
      setIsLoadingProducts(true);
      setError("");

      try {
        const activeFilters = {
          ...filters,
          ...customFilters,
        };

        const params = new URLSearchParams();
        if (activeFilters.status) {
          params.append("status", activeFilters.status);
        }
        if (activeFilters.search) {
          params.append("search", activeFilters.search.trim());
        }
        if (activeFilters.sortBy) {
          params.append("sort_by", activeFilters.sortBy);
        }

        const res = await fetch(
          `${API_BASE_URL}/farmer/farm-management/inventory/?${params.toString()}`,
          {
            method: "GET",
            headers: getAuthHeaders(),
          }
        );

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json.message || "Failed to load inventory products."
          );
        }

        const items = json.data?.items || [];
        setProducts(items);
        return items;
      } catch (err) {
        console.error("useFarmerInventory loadProducts error:", err);
        setError(err.message || "Failed to load inventory products.");
        setProducts([]);
        return [];
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [filters]
  );

  // =========================================================
  // LOAD PRODUCT DETAILS
  // =========================================================
  const loadProductDetails = useCallback(async (productId) => {
    if (!productId) return null;
    setIsLoadingProductDetails(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/farmer/farm-management/inventory/${productId}/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(
          json.message || "Failed to load product details."
        );
      }

      const product = json.data;
      setSelectedProduct(product);
      return product;
    } catch (err) {
      console.error("useFarmerInventory loadProductDetails error:", err);
      setError(err.message || "Failed to load product details.");
      return null;
    } finally {
      setIsLoadingProductDetails(false);
    }
  }, []);

  // =========================================================
  // LOAD FARM OPTIONS
  // =========================================================
  const loadFarmOptions = useCallback(async () => {
    setIsLoadingFarmOptions(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/farmer/farm-management/inventory/farm-options/`,
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      );

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(
          json.message || "Failed to load farm options."
        );
      }

      const items = json.data?.items || [];
      setFarmOptions(items);
      return items;
    } catch (err) {
      console.error("useFarmerInventory loadFarmOptions error:", err);
      setFarmOptions([]);
      return [];
    } finally {
      setIsLoadingFarmOptions(false);
    }
  }, []);

  // =========================================================
  // ADD PRODUCT
  // =========================================================
  const addProduct = useCallback(
    async (formData) => {
      setIsSavingProduct(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/farmer/farm-management/inventory/`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(formData),
          }
        );

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json.message || "Failed to add inventory product."
          );
        }

        // Refresh products list
        await loadProducts({ status: INVENTORY_STATUS_ACTIVE });

        return { success: true, data: json.data };
      } catch (err) {
        console.error("useFarmerInventory addProduct error:", err);
        setError(err.message || "Failed to add inventory product.");
        throw err;
      } finally {
        setIsSavingProduct(false);
      }
    },
    [loadProducts]
  );

  // =========================================================
  // UPDATE PRODUCT
  // =========================================================
  const updateProduct = useCallback(
    async (productId, formData) => {
      setIsSavingProduct(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/farmer/farm-management/inventory/${productId}/`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(formData),
          }
        );

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json.message || "Failed to update product."
          );
        }

        const updated = json.data;
        setSelectedProduct(updated);

        // Refresh products list
        await loadProducts();

        return { success: true, data: updated };
      } catch (err) {
        console.error("useFarmerInventory updateProduct error:", err);
        setError(err.message || "Failed to update product.");
        throw err;
      } finally {
        setIsSavingProduct(false);
      }
    },
    [loadProducts]
  );

  // =========================================================
  // ARCHIVE PRODUCT
  // =========================================================
  const archiveProduct = useCallback(
    async (productId, reason) => {
      setIsChangingProductStatus(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/farmer/farm-management/inventory/${productId}/archive/`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              reason: reason || "Archived by farmer",
            }),
          }
        );

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json.message || "Failed to archive product."
          );
        }

        // Refresh products
        await loadProducts();

        return { success: true, data: json.data };
      } catch (err) {
        console.error("useFarmerInventory archiveProduct error:", err);
        setError(err.message || "Failed to archive product.");
        throw err;
      } finally {
        setIsChangingProductStatus(false);
      }
    },
    [loadProducts]
  );

  // =========================================================
  // RESTORE PRODUCT
  // =========================================================
  const restoreProduct = useCallback(
    async (productId) => {
      setIsChangingProductStatus(true);
      setError("");

      try {
        const res = await fetch(
          `${API_BASE_URL}/farmer/farm-management/inventory/${productId}/restore/`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
          }
        );

        const json = await res.json();
        if (!res.ok || json.success === false) {
          throw new Error(
            json.message || "Failed to restore product."
          );
        }

        // Refresh products
        await loadProducts();

        return { success: true, data: json.data };
      } catch (err) {
        console.error("useFarmerInventory restoreProduct error:", err);
        setError(err.message || "Failed to restore product.");
        throw err;
      } finally {
        setIsChangingProductStatus(false);
      }
    },
    [loadProducts]
  );

  const setInventoryStatus = useCallback((status) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSearch = useCallback((search) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setSortBy = useCallback((sortBy) => {
    setFilters((prev) => ({ ...prev, sortBy }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    products,
    selectedProduct,
    farmOptions,
    filters,

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

    setFilters,
    setInventoryStatus,
    setSearch,
    setSortBy,
    resetFilters,

    clearError,
    clearSelectedProduct,
  };
};

export default useFarmerInventory;
