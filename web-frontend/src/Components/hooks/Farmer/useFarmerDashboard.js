import { useCallback, useEffect, useState } from "react";
import useAuth from "../useAuth";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "")
).replace(/\/$/, "") + "/api";

const getStoredToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
};

const INITIAL_KPIS = {
  available_millers: 0,
  contracted_millers: 0,
  registered_harvest_area_ha: 0,
  potential_cropping_area_ha: 0,
  total_farm_area_ha: 0,
};

const INITIAL_DASHBOARD = {
  kpis: INITIAL_KPIS,
  palay_market_price_trend: [],
  yield_history: [],
  climate_outlook: {
    available: false,
    location: "",
    source: "",
    series: [],
  },
  shelf_health: {
    risk_level: "LOW",
    explanation: "",
    recommended_actions: [],
  },
  farm_health: {
    risk_level: "LOW",
    crop_status: "Available for Planting",
    explanation: "",
    irrigation_advisory: "",
    fertilizer_advisory: "",
    recommended_actions: [],
  },
  farms: [],
  selected_farm: null,
  current_crop: null,
};

export default function useFarmerDashboard() {
  const { user, token: authToken } = useAuth();
  const farmerUserId = user?.id || user?.user_id || null;

  const [dashboard, setDashboard] = useState(INITIAL_DASHBOARD);
  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(
    async (farmIdToFetch = selectedFarmId, isForceRefresh = false) => {
      const activeToken = authToken || getStoredToken();
      if (!activeToken) {
        setIsLoading(false);
        return;
      }

      if (isForceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError("");

      try {
        const queryParams = new URLSearchParams();
        if (farmIdToFetch) {
          queryParams.append("farm_id", farmIdToFetch);
        }

        const endpoint = isForceRefresh
          ? `${API_BASE_URL}/farmer/dashboard/refresh/`
          : `${API_BASE_URL}/farmer/dashboard/?${queryParams.toString()}`;

        const method = isForceRefresh ? "POST" : "GET";
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
        };
        const body = isForceRefresh && farmIdToFetch ? JSON.stringify({ farm_id: farmIdToFetch }) : undefined;

        const response = await fetch(endpoint, {
          method,
          headers,
          body,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Server returned status ${response.status}`);
        }

        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          setDashboard(resJson.data);
          if (resJson.data.selected_farm?.farm_profile_id && !farmIdToFetch) {
            setSelectedFarmId(resJson.data.selected_farm.farm_profile_id);
          }
        } else {
          throw new Error(resJson.message || "Failed to load dashboard records.");
        }
      } catch (err) {
        console.error("Farmer Dashboard Load Error:", err);
        setError(err.message || "Unable to load dashboard data. Please try again.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authToken, selectedFarmId]
  );

  // Initial load or load when selectedFarmId changes
  useEffect(() => {
    loadDashboardData(selectedFarmId, false);
  }, [selectedFarmId]);

  const refreshDashboard = useCallback(
    async (options = {}) => {
      const force = options?.force === true;
      return loadDashboardData(selectedFarmId, force);
    },
    [loadDashboardData, selectedFarmId]
  );

  const handleSelectFarm = useCallback((newFarmId) => {
    const val = newFarmId ? Number(newFarmId) : null;
    setSelectedFarmId(val);
  }, []);

  return {
    dashboard,
    kpis: dashboard.kpis || INITIAL_KPIS,
    palayMarketPriceTrend: dashboard.palay_market_price_trend || [],
    yieldHistory: dashboard.yield_history || [],
    climateOutlook: dashboard.climate_outlook || INITIAL_DASHBOARD.climate_outlook,
    shelfHealth: dashboard.shelf_health || INITIAL_DASHBOARD.shelf_health,
    farmHealth: dashboard.farm_health || INITIAL_DASHBOARD.farm_health,
    farms: dashboard.farms || [],
    selectedFarm: dashboard.selected_farm || null,
    selectedFarmId,
    setSelectedFarmId: handleSelectFarm,
    currentCrop: dashboard.current_crop || null,
    isLoading,
    isRefreshing,
    error,
    refreshDashboard,
    user,
    farmerUser: user,
    farmerUserId,
  };
}
