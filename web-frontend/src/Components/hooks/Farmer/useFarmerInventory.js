import { useCallback, useState } from "react";

export const INVENTORY_STATUS_ACTIVE = "active";
export const INVENTORY_STATUS_ARCHIVED = "archived";

export const INVENTORY_SORT_NEWEST = "newest";
export const INVENTORY_SORT_OLDEST = "oldest";
export const INVENTORY_SORT_STOCK_HIGHEST = "stock_highest";
export const INVENTORY_SORT_STOCK_LOWEST = "stock_lowest";

const DEFAULT_FILTERS = {
  status: INVENTORY_STATUS_ACTIVE,
  search: "",
  sortBy: INVENTORY_SORT_NEWEST,
};

const INITIAL_PRODUCTS = [
  {
    farm_product_id: 1,
    product_code: "PRD-2026-001",
    rice_variety: "RC 222 (Tubigan 18)",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 1 (Premium)",
    available_quantity_kg: 8500,
    reserved_committed_quantity_kg: 4000,
    total_stock_quantity_kg: 12500,
    stock_level: "normal",
    selling_price_per_kg: 23.5,
    acquisition_source_type: "Harvest",
    record_source_type: "farm_harvest",
    source_farm_name: "Green Valley Rice Field",
    source_farm_location: "Cabanatuan City, Nueva Ecija",
    harvest_acquisition_date: "2026-09-22",
    description: "Well-dried premium RC 222 palay harvested from Green Valley Farm.",
    status: INVENTORY_STATUS_ACTIVE,
    created_at: "2026-09-23T08:00:00Z",
    updated_at: "2026-10-15T10:00:00Z",
  },
  {
    farm_product_id: 2,
    product_code: "PRD-2026-002",
    rice_variety: "NSIC Rc 160",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 2 (Standard)",
    available_quantity_kg: 14000,
    reserved_committed_quantity_kg: 0,
    total_stock_quantity_kg: 14000,
    stock_level: "normal",
    selling_price_per_kg: 22.0,
    acquisition_source_type: "Harvest",
    record_source_type: "farm_harvest",
    source_farm_name: "Central Isabela Agri Lot",
    source_farm_location: "Cauayan City, Isabela",
    harvest_acquisition_date: "2026-09-28",
    description: "Clean dry palay stored in ventilated warehouse sacks.",
    status: INVENTORY_STATUS_ACTIVE,
    created_at: "2026-09-29T11:00:00Z",
    updated_at: "2026-10-10T14:30:00Z",
  },
  {
    farm_product_id: 3,
    product_code: "PRD-2026-003",
    rice_variety: "Angelica Special",
    product_type: "Clean & Dry Palay",
    product_grade: "Premium Aromatic",
    available_quantity_kg: 600,
    reserved_committed_quantity_kg: 0,
    total_stock_quantity_kg: 600,
    stock_level: "low",
    selling_price_per_kg: 25.5,
    acquisition_source_type: "Harvest",
    record_source_type: "farm_harvest",
    source_farm_name: "Tarlac Plains Paddy 4",
    source_farm_location: "Concepcion, Tarlac",
    harvest_acquisition_date: "2026-09-20",
    description: "Aromatic long-grain palay.",
    status: INVENTORY_STATUS_ACTIVE,
    created_at: "2026-09-21T09:00:00Z",
    updated_at: "2026-10-05T16:00:00Z",
  },
  {
    farm_product_id: 4,
    product_code: "PRD-2026-000",
    rice_variety: "Sinandomeng Special",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 2",
    available_quantity_kg: 0,
    reserved_committed_quantity_kg: 0,
    total_stock_quantity_kg: 0,
    stock_level: "out_of_stock",
    selling_price_per_kg: 21.0,
    acquisition_source_type: "Harvest",
    record_source_type: "farm_harvest",
    source_farm_name: "Green Valley Rice Field",
    source_farm_location: "Cabanatuan City, Nueva Ecija",
    harvest_acquisition_date: "2026-04-15",
    description: "Previous crop cycle batch sold out.",
    status: INVENTORY_STATUS_ARCHIVED,
    created_at: "2026-04-16T08:00:00Z",
    updated_at: "2026-07-01T12:00:00Z",
  },
];

const SAMPLE_FARM_OPTIONS = [
  { farm_id: 1, farm_name: "Green Valley Rice Field", location: "Cabanatuan City, Nueva Ecija" },
  { farm_id: 2, farm_name: "Central Isabela Agri Lot", location: "Cauayan City, Isabela" },
  { farm_id: 3, farm_name: "Tarlac Plains Paddy 4", location: "Concepcion, Tarlac" },
];

export const useFarmerInventory = () => {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState(INITIAL_PRODUCTS[0]);
  const [farmOptions, setFarmOptions] = useState(SAMPLE_FARM_OPTIONS);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingProductDetails, setIsLoadingProductDetails] = useState(false);
  const [isLoadingFarmOptions, setIsLoadingFarmOptions] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isChangingProductStatus, setIsChangingProductStatus] = useState(false);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(false);
    return products;
  }, [products]);

  const loadProductDetails = useCallback(
    async (productId) => {
      setIsLoadingProductDetails(false);
      const prod = products.find((p) => Number(p.farm_product_id) === Number(productId)) || products[0];
      if (prod) setSelectedProduct(prod);
      return prod;
    },
    [products]
  );

  const loadFarmOptions = useCallback(async () => {
    setIsLoadingFarmOptions(false);
    return SAMPLE_FARM_OPTIONS;
  }, []);

  const addProduct = useCallback(async (formData) => {
    setIsSavingProduct(true);
    const newId = Date.now();
    const qty = Number(formData.total_stock_quantity_kg || formData.available_quantity_kg || 5000);
    const newProd = {
      farm_product_id: newId,
      product_code: `PRD-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      rice_variety: formData.rice_variety || "RC 222 (Tubigan 18)",
      product_type: formData.product_type || "Dry Palay (14% MC)",
      product_grade: formData.product_grade || "Grade 1 (Premium)",
      available_quantity_kg: qty,
      reserved_committed_quantity_kg: 0,
      total_stock_quantity_kg: qty,
      stock_level: qty > 1000 ? "normal" : qty > 0 ? "low" : "out_of_stock",
      selling_price_per_kg: Number(formData.selling_price_per_kg || 23.5),
      acquisition_source_type: formData.acquisition_source_type || "Harvest",
      record_source_type: "farm_harvest",
      source_farm_name: formData.source_farm_name || "Green Valley Rice Field",
      source_farm_location: formData.source_farm_location || "Cabanatuan City, Nueva Ecija",
      harvest_acquisition_date: formData.harvest_acquisition_date || new Date().toISOString().split("T")[0],
      description: formData.description || "Newly added harvest inventory.",
      status: INVENTORY_STATUS_ACTIVE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProducts((prev) => [newProd, ...prev]);
    setIsSavingProduct(false);
    return { success: true, data: newProd };
  }, []);

  const updateProduct = useCallback(async (productId, formData) => {
    setIsSavingProduct(true);
    const targetId = Number(productId);
    let updatedObj = null;

    setProducts((prev) =>
      prev.map((p) => {
        if (Number(p.farm_product_id) === targetId) {
          const qty = Number(formData.available_quantity_kg ?? p.available_quantity_kg);
          updatedObj = {
            ...p,
            ...formData,
            available_quantity_kg: qty,
            total_stock_quantity_kg: qty + Number(p.reserved_committed_quantity_kg || 0),
            stock_level: qty > 1000 ? "normal" : qty > 0 ? "low" : "out_of_stock",
            updated_at: new Date().toISOString(),
          };
          return updatedObj;
        }
        return p;
      })
    );

    if (updatedObj) {
      setSelectedProduct(updatedObj);
    }
    setIsSavingProduct(false);
    return { success: true, data: updatedObj };
  }, []);

  const archiveProduct = useCallback(async (productId) => {
    setIsChangingProductStatus(true);
    const targetId = Number(productId);
    setProducts((prev) =>
      prev.map((p) =>
        Number(p.farm_product_id) === targetId ? { ...p, status: INVENTORY_STATUS_ARCHIVED } : p
      )
    );
    setIsChangingProductStatus(false);
    return { success: true };
  }, []);

  const restoreProduct = useCallback(async (productId) => {
    setIsChangingProductStatus(true);
    const targetId = Number(productId);
    setProducts((prev) =>
      prev.map((p) =>
        Number(p.farm_product_id) === targetId ? { ...p, status: INVENTORY_STATUS_ACTIVE } : p
      )
    );
    setIsChangingProductStatus(false);
    return { success: true };
  }, []);

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

  const clearError = useCallback(() => setError(""), []);
  const clearSelectedProduct = useCallback(() => setSelectedProduct(null), []);

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
