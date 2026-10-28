import { useCallback, useState } from "react";
import useAuth from "../useAuth";

const SAMPLE_DASHBOARD = {
  kpis: {
    available_millers: 8,
    contracted_millers: 2,
    registered_harvest_area_ha: 10.5,
    potential_cropping_area_ha: 12.0,
  },

  palay_market_price_trend: [
    { period_start: "2026-05-01", average_price_per_kg: 21.5, minimum_price_per_kg: 20.0, maximum_price_per_kg: 22.5, record_count: 14 },
    { period_start: "2026-06-01", average_price_per_kg: 22.0, minimum_price_per_kg: 21.0, maximum_price_per_kg: 23.0, record_count: 18 },
    { period_start: "2026-07-01", average_price_per_kg: 22.8, minimum_price_per_kg: 21.5, maximum_price_per_kg: 23.5, record_count: 22 },
    { period_start: "2026-08-01", average_price_per_kg: 23.4, minimum_price_per_kg: 22.0, maximum_price_per_kg: 24.2, record_count: 25 },
    { period_start: "2026-09-01", average_price_per_kg: 24.1, minimum_price_per_kg: 23.0, maximum_price_per_kg: 25.0, record_count: 30 },
    { period_start: "2026-10-01", average_price_per_kg: 23.8, minimum_price_per_kg: 22.5, maximum_price_per_kg: 24.5, record_count: 28 },
  ],

  yield_history: [
    { crop_cycle_id: 1, farm_id: 1, actual_yield_kg: 9200, crop_cycle_name: "2025 Dry Season" },
    { crop_cycle_id: 2, farm_id: 1, actual_yield_kg: 10500, crop_cycle_name: "2025 Wet Season" },
    { crop_cycle_id: 3, farm_id: 1, actual_yield_kg: 9800, crop_cycle_name: "2026 Dry Season" },
    { crop_cycle_id: 4, farm_id: 1, actual_yield_kg: 11200, crop_cycle_name: "2026 Wet Season" },
  ],

  climate_outlook: {
    available: true,
    climate_forecast_run_id: 1,
    farm_id: 1,
    location_source: "farm",
    location: "Cabanatuan City, Nueva Ecija",
    latitude: 15.4859,
    longitude: 120.9673,
    forecast_generated_at: "2026-10-27T08:00:00Z",
    series: [
      { label: "Jun", rainfall_mm: 180, temperature_c: 28.5 },
      { label: "Jul", rainfall_mm: 240, temperature_c: 28.0 },
      { label: "Aug", rainfall_mm: 260, temperature_c: 27.5 },
      { label: "Sep", rainfall_mm: 195, temperature_c: 27.8 },
      { label: "Oct", rainfall_mm: 140, temperature_c: 28.2 },
      { label: "Nov", rainfall_mm: 75, temperature_c: 27.0 },
    ],
  },
};

export default function useFarmerDashboard() {
  const { user } = useAuth();
  const farmerUserId = user?.id || user?.user_id || null;

  const [dashboard, setDashboard] = useState(SAMPLE_DASHBOARD);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 300);
    return SAMPLE_DASHBOARD;
  }, []);

  return {
    dashboard,
    kpis: dashboard.kpis,
    palayMarketPriceTrend: dashboard.palay_market_price_trend,
    yieldHistory: dashboard.yield_history,
    climateOutlook: dashboard.climate_outlook,
    isLoading,
    isRefreshing,
    error,
    refreshDashboard,
    user,
    farmerUser: user,
    farmerUserId,
  };
}
