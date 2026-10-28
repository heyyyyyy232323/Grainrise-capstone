import { useCallback, useState } from "react";

// ============================================================
// API BASE URL & AUTH HELPERS
// ============================================================

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
  search: "",
  cropStatus: "",
  farmStatus: "",
  sortBy: "newest",
};

const DEFAULT_ACTIVITY = {
  items: [],
  pagination: {
    page: 1,
    page_size: 10,
    total_items: 0,
    total_pages: 0,
  },
};


// ============================================================
// HOOK
// ============================================================

export const useFarmManagement = () => {
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmActivity, setFarmActivity] = useState(DEFAULT_ACTIVITY);

  const [isLoadingFarms, setIsLoadingFarms] = useState(false);
  const [isLoadingFarmDetails, setIsLoadingFarmDetails] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [isSavingFarm, setIsSavingFarm] = useState(false);
  const [isSavingCrop, setIsSavingCrop] = useState(false);
  const [error, setError] = useState("");

  const clearError = useCallback(() => {
    setError("");
  }, []);

  const clearSelectedFarm = useCallback(() => {
    setSelectedFarm(null);
  }, []);

  // =========================================================
  // READS: LIST FARMS
  // =========================================================

  const loadFarms = useCallback(async (customFilters = {}) => {
    setIsLoadingFarms(true);
    setError("");

    try {
      const activeFilters = {
        ...DEFAULT_FILTERS,
        ...customFilters,
      };

      const params = new URLSearchParams();
      if (activeFilters.search) {
        params.append("search", activeFilters.search.trim());
      }
      if (activeFilters.cropStatus) {
        params.append("crop_status", activeFilters.cropStatus);
      }
      if (activeFilters.farmStatus) {
        params.append("farm_status", activeFilters.farmStatus);
      }
      if (activeFilters.sortBy) {
        params.append("sort_by", activeFilters.sortBy);
      }

      const queryString = params.toString();
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${
        queryString ? `?${queryString}` : ""
      }`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to load farm records."
        );
      }

      const items = resJson.data?.items || [];
      setFarms(items);
      return items;
    } catch (err) {
      const errMsg = err.message || "Failed to load farm records.";
      setError(errMsg);
      throw err;
    } finally {
      setIsLoadingFarms(false);
    }
  }, []);

  // =========================================================
  // READS: SPECIFIC FARM DETAILS
  // =========================================================

  const loadFarmDetails = useCallback(async (farmId) => {
    if (!farmId) return null;

    setIsLoadingFarmDetails(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to load farm details."
        );
      }

      const farmData = resJson.data || null;
      setSelectedFarm(farmData);
      return farmData;
    } catch (err) {
      const errMsg = err.message || "Failed to load farm details.";
      setError(errMsg);
      throw err;
    } finally {
      setIsLoadingFarmDetails(false);
    }
  }, []);

  // =========================================================
  // READS: FARM ACTIVITY LOG
  // =========================================================

  const loadFarmActivity = useCallback(async (farmId, params = {}) => {
    if (!farmId) return DEFAULT_ACTIVITY;

    setIsLoadingActivity(true);

    try {
      const queryParams = new URLSearchParams();
      if (params.page) {
        queryParams.append("page", params.page);
      }
      if (params.pageSize || params.page_size) {
        queryParams.append("page_size", params.pageSize || params.page_size);
      }

      const queryStr = queryParams.toString();
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/activity/${
        queryStr ? `?${queryStr}` : ""
      }`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        setFarmActivity(DEFAULT_ACTIVITY);
        return DEFAULT_ACTIVITY;
      }

      const activityData = resJson.data || DEFAULT_ACTIVITY;
      setFarmActivity(activityData);
      return activityData;
    } catch {
      setFarmActivity(DEFAULT_ACTIVITY);
      return DEFAULT_ACTIVITY;
    } finally {
      setIsLoadingActivity(false);
    }
  }, []);

  // =========================================================
  // MUTATIONS: ADD NEW FARM
  // =========================================================

  const addFarm = useCallback(async (payload) => {
    setIsSavingFarm(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to register farm. Please try again."
        );
      }

      const newFarm = resJson.data;
      setFarms((prev) => [newFarm, ...prev.filter((f) => f.farm_id !== newFarm.farm_id)]);
      return { success: true, data: newFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to register farm.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingFarm(false);
    }
  }, []);

  // =========================================================
  // MUTATIONS: UPDATE FARM INFORMATION
  // =========================================================

  const updateFarm = useCallback(async (farmId, payload) => {
    if (!farmId) return { success: false };

    setIsSavingFarm(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to update farm details."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to update farm.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingFarm(false);
    }
  }, []);

  // =========================================================
  // MUTATIONS: UPDATE FARM STATUS
  // =========================================================

  const updateFarmStatus = useCallback(async (farmId, status, reason = "") => {
    if (!farmId) return { success: false };

    setIsSavingFarm(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/status/`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          reason,
        }),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to update farm status."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to update farm status.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingFarm(false);
    }
  }, []);

  // =========================================================
  // MUTATIONS: CROP ACTIONS
  // =========================================================

  const startLandPreparation = useCallback(async (farmId, payload = {}) => {
    if (!farmId) return { success: false };

    setIsSavingCrop(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/crop/start-land-preparation/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to start land preparation."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to start land preparation.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingCrop(false);
    }
  }, []);

  const recordPlanting = useCallback(async (farmId, payload = {}) => {
    if (!farmId) return { success: false };

    setIsSavingCrop(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/crop/record-planting/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to record planting."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to record planting.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingCrop(false);
    }
  }, []);

  const updateCurrentCrop = useCallback(async (farmId, payload = {}) => {
    if (!farmId) return { success: false };

    setIsSavingCrop(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/crop/`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to update current crop."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to update current crop.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingCrop(false);
    }
  }, []);

  const recordHarvest = useCallback(async (farmId, payload = {}) => {
    if (!farmId) return { success: false };

    setIsSavingCrop(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/crop/record-harvest/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to record harvest."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to record harvest.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingCrop(false);
    }
  }, []);

  const recordFailedCrop = useCallback(async (farmId, payload = {}) => {
    if (!farmId) return { success: false };

    setIsSavingCrop(true);
    setError("");

    try {
      const endpoint = `${API_BASE_URL}/farmer/farm-management/farms/${farmId}/crop/record-failed/`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const resJson = await response.json().catch(() => ({}));

      if (!response.ok || !resJson.success) {
        throw new Error(
          resJson.message || "Failed to record failed crop."
        );
      }

      const updatedFarm = resJson.data;
      setSelectedFarm(updatedFarm);
      setFarms((prev) =>
        prev.map((f) => (f.farm_id === updatedFarm.farm_id ? updatedFarm : f))
      );
      return { success: true, data: updatedFarm };
    } catch (err) {
      const errMsg = err.message || "Failed to record failed crop.";
      setError(errMsg);
      throw err;
    } finally {
      setIsSavingCrop(false);
    }
  }, []);

  return {
    farms,
    selectedFarm,
    farmActivity,

    isLoadingFarms,
    isLoadingFarmDetails,
    isLoadingActivity,
    isSavingFarm,
    isSavingCrop,

    error,

    loadFarms,
    loadFarmDetails,
    loadFarmActivity,

    addFarm,
    updateFarm,
    updateFarmStatus,

    startLandPreparation,
    recordPlanting,
    updateCurrentCrop,
    recordHarvest,
    recordFailedCrop,

    clearError,
    clearSelectedFarm,
  };
};

export default useFarmManagement;
