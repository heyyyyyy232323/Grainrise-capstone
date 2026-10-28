import { useCallback, useState } from "react";

// ============================================================
// API BASE URL & AUTH HELPER
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

const getStoredToken = () => {
  return (
    localStorage.getItem("grainrise_token") ||
    localStorage.getItem("access_token") ||
    ""
  );
};

// ============================================================
// SAMPLE DATA FOR FORECASTING (GRACEFUL FALLBACK)
// ============================================================


const SAMPLE_DEMAND_PRODUCTS = [
  {
    product_id: 1,
    product_name: "RC 222 (Tubigan 18)",
    rice_variety: "RC 222 (Tubigan 18)",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 1",
  },
  {
    product_id: 2,
    product_name: "NSIC Rc 160",
    rice_variety: "NSIC Rc 160",
    product_type: "Dry Palay (14% MC)",
    product_grade: "Grade 2",
  },
  {
    product_id: 3,
    product_name: "Angelica Special",
    rice_variety: "Angelica Special",
    product_type: "Clean & Dry Palay",
    product_grade: "Premium Aromatic",
  },
];

const SAMPLE_CLIMATE_FORECAST = {
  climate_forecast_run_id: 101,
  location_name: "Cabanatuan City, Nueva Ecija",
  location: "Cabanatuan City, Nueva Ecija",
  latitude: 15.4859,
  longitude: 120.9673,
  summary:
    "Expected weather patterns show favorable rainfall and stable temperatures suitable for wet-season rice development.",
  optimal_planting_window: "Mid-November to Early December",
  forecast: {
    cache_hit: true,
    granularity: "monthly",
    chart_data: {
      precipitation_mm: [
        { period_start: "2026-11-01", value: 110.5, unit: "mm", label: "Nov 2026" },
        { period_start: "2026-12-01", value: 68.2, unit: "mm", label: "Dec 2026" },
        { period_start: "2027-01-01", value: 35.0, unit: "mm", label: "Jan 2027" },
        { period_start: "2027-02-01", value: 22.4, unit: "mm", label: "Feb 2027" },
        { period_start: "2027-03-01", value: 45.1, unit: "mm", label: "Mar 2027" },
        { period_start: "2027-04-01", value: 60.0, unit: "mm", label: "Apr 2027" },
      ],
      temperature_c: [
        { period_start: "2026-11-01", value: 27.8, unit: "°C", label: "Nov 2026" },
        { period_start: "2026-12-01", value: 26.5, unit: "°C", label: "Dec 2026" },
        { period_start: "2027-01-01", value: 25.8, unit: "°C", label: "Jan 2027" },
        { period_start: "2027-02-01", value: 27.2, unit: "°C", label: "Feb 2027" },
        { period_start: "2027-03-01", value: 29.5, unit: "°C", label: "Mar 2027" },
        { period_start: "2027-04-01", value: 31.0, unit: "°C", label: "Apr 2027" },
      ],
    },
  },
  historical: {
    cache_hit: true,
    chart_data: {
      precipitation_mm: [
        { period_start: "2025-11-01", value: 105.0, unit: "mm", label: "Nov 2025" },
        { period_start: "2025-12-01", value: 72.0, unit: "mm", label: "Dec 2025" },
        { period_start: "2026-01-01", value: 40.0, unit: "mm", label: "Jan 2026" },
        { period_start: "2026-02-01", value: 25.0, unit: "mm", label: "Feb 2026" },
        { period_start: "2026-03-01", value: 50.0, unit: "mm", label: "Mar 2026" },
        { period_start: "2026-04-01", value: 58.0, unit: "mm", label: "Apr 2026" },
      ],
      temperature_c: [
        { period_start: "2025-11-01", value: 27.5, unit: "°C", label: "Nov 2025" },
        { period_start: "2025-12-01", value: 26.2, unit: "°C", label: "Dec 2025" },
        { period_start: "2026-01-01", value: 25.5, unit: "°C", label: "Jan 2026" },
        { period_start: "2026-02-01", value: 27.0, unit: "°C", label: "Feb 2026" },
        { period_start: "2026-03-01", value: 29.2, unit: "°C", label: "Mar 2026" },
        { period_start: "2026-04-01", value: 30.8, unit: "°C", label: "Apr 2026" },
      ],
    },
  },
  soil_land_note:
    "GrainRise does not measure actual soil health. Possible land/soil implications are AI interpretations based on climate patterns and approved Learning Materials.",
};

const SAMPLE_DEMAND_FORECAST = {
  product_id: 1,
  product_name: "RC 222 (Tubigan 18)",
  rice_variety: "RC 222 (Tubigan 18)",
  demand_trend: "increasing",
  confidence_score: 92.4,
  projected_total_quantity_kg: 52000,
  feature_snapshot: {
    historical_periods: [
      { period: "Jun 2026", actual_demand_kg: 18000, average_price_per_kg: 21.8 },
      { period: "Jul 2026", actual_demand_kg: 22000, average_price_per_kg: 22.4 },
      { period: "Aug 2026", actual_demand_kg: 26000, average_price_per_kg: 23.0 },
      { period: "Sep 2026", actual_demand_kg: 24500, average_price_per_kg: 23.5 },
      { period: "Oct 2026", actual_demand_kg: 28000, average_price_per_kg: 24.0 },
    ],
  },
  forecast_output: {
    periods: [
      { period: "Nov 2026", projected_demand_kg: 32000, projected_price_per_kg: 24.5, confidence_interval: [29000, 35000] },
      { period: "Dec 2026", projected_demand_kg: 36000, projected_price_per_kg: 25.0, confidence_interval: [33000, 39000] },
      { period: "Jan 2027", projected_demand_kg: 28000, projected_price_per_kg: 24.2, confidence_interval: [25000, 31000] },
      { period: "Feb 2027", projected_demand_kg: 24000, projected_price_per_kg: 23.8, confidence_interval: [21000, 27000] },
    ],
  },
};

const SAMPLE_AI_INTERPRETATION = {
  water_and_irrigation:
    "Practice Alternate Wetting and Drying (AWD) across your paddies during moderate precipitation windows to conserve water while fostering deep root anchorage. For anticipated peak rainfall months exceeding 100 mm, keep paddy bund water levels shallow at 3–5 cm to cushion sudden storm inflows without dike breaches, and ensure primary drainage gates remain unclogged.",
  nutrient_management:
    "Schedule granular urea and complete fertilizer split applications strictly in alignment with 3-day dry weather windows. Avoid broadcasting fertilizer immediately prior to forecasted intense downpours to prevent extensive nutrient leaching and surface runoff beyond the root zone, maximizing nitrogen use efficiency during tillering and panicle development.",
  seasonal_recommendations:
    "Inspect and reinforce paddy bunds (pilapil) to prevent breaches and soil erosion during peak precipitation events, while establishing secondary drainage pathways. Regularly scout vegetative tillers for early symptoms of sheath blight, bacterial leaf streak, and stem borer presence, and choose certified climate-resilient seed varieties matched to your local cropping cycle.",
  explanation_text:
    "Climate Outlook: Regional projections indicate rainfall peaking moderately with average daily temperatures near 27.5°C. This outlook provides favorable conditions for field preparation and vegetative growth with proactive water management.",
  forecast_reason_text:
    "Projections are derived from seasonal Copernicus Climate Data Store models for the selected coordinates, indicating normal seasonal monsoon progression.",
  learning_guidance_text:
    "Agronomic guidance adheres to validated PhilRice recommendations for climate-resilient paddy cultivation and nutrient management.",
  recommended_actions_text:
    "• Practice Alternate Wetting and Drying (AWD) to optimize irrigation water.\n• Coordinate nitrogen top-dressing with 3-day dry weather forecasts to avoid leaching.\n• Inspect and reinforce paddy bunds (pilapil) to prevent overflow breaches.\n• Monitor vegetative tillers weekly for humidity-favored fungal pathogens.",
  response_text:
    "Regional projections indicate favorable seasonal conditions with moderate rainfall and steady temperatures across your selected farm lot.",
};

const DEFAULT_LOADING = {
  farms: false,
  products: false,
  climate: false,
  demand: false,
  ai: false,
};

const DEFAULT_ERRORS = {
  farms: "",
  products: "",
  climate: "",
  demand: "",
  ai: "",
};

// ============================================================
// HOOK
// ============================================================

const useFarmerForecasting = () => {
  const [farms, setFarms] = useState([]);
  const [demandProducts, setDemandProducts] = useState(SAMPLE_DEMAND_PRODUCTS);
  const [climateForecast, setClimateForecast] = useState(SAMPLE_CLIMATE_FORECAST);
  const [demandForecast, setDemandForecast] = useState(SAMPLE_DEMAND_FORECAST);
  const [aiInterpretation, setAiInterpretation] = useState(SAMPLE_AI_INTERPRETATION);

  const [loading, setLoading] = useState(DEFAULT_LOADING);
  const [errors, setErrors] = useState(DEFAULT_ERRORS);

  // 1. Load Farmer Farms from backend
  const loadForecastingFarms = useCallback(async () => {
    setLoading((prev) => ({ ...prev, farms: true }));
    setErrors((prev) => ({ ...prev, farms: "" }));

    const token = getStoredToken();
    if (!token) {
      setFarms([]);
      setLoading((prev) => ({ ...prev, farms: false }));
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/farmer/forecasting/farms/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const resJson = await response.json();
        const farmList = resJson?.data?.farms || [];
        setFarms(farmList);
        setLoading((prev) => ({ ...prev, farms: false }));
        return farmList;
      } else {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson?.detail || "Unable to load registered farms.";
        setErrors((prev) => ({ ...prev, farms: msg }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, farms: err?.message || "Failed to load registered farms." }));
    }

    setFarms([]);
    setLoading((prev) => ({ ...prev, farms: false }));
    return [];
  }, []);

  // 2. Load Demand Products
  const loadDemandProducts = useCallback(async () => {
    return SAMPLE_DEMAND_PRODUCTS;
  }, []);

  // 3. Generate Climate Forecast (Backend with instant snapshot reuse & max 5m timeout)
  const generateClimateForecast = useCallback(async (options = {}) => {
    setLoading((prev) => ({ ...prev, climate: true }));
    setErrors((prev) => ({ ...prev, climate: "" }));

    const token = getStoredToken();
    const payload = {
      location_source: options.location_source || (options.farm_id ? "registered_farm" : "cascading_location"),
      farm_id: options.farm_id || undefined,
      latitude: options.latitude,
      longitude: options.longitude,
      location_label: options.location_label || options.displayName,
      province: options.province,
      city: options.city,
      historical_years: options.historical_years || 3,
      display_granularity: options.display_granularity || "monthly",
    };

    if (!token) {
      const authMsg = "Please log in to generate climate forecasts.";
      setClimateForecast(null);
      setLoading((prev) => ({ ...prev, climate: false }));
      setErrors((prev) => ({ ...prev, climate: authMsg }));
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5-minute maximum foreground waiting period

    try {
      const response = await fetch(`${API_BASE_URL}/farmer/forecasting/climate/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const resJson = await response.json().catch(() => ({}));

      if (response.status === 504 || resJson?.code === "copernicus_processing_timeout") {
        const timeoutResult = {
          timeout: true,
          status: "queued",
          message:
            resJson?.detail ||
            "Copernicus Climate Data Store is currently processing your request in queue. The request exceeded the 5-minute limit. Please check back shortly.",
        };
        setClimateForecast(null);
        setLoading((prev) => ({ ...prev, climate: false }));
        setErrors((prev) => ({
          ...prev,
          climate: timeoutResult.message,
        }));
        return timeoutResult;
      }

      if (response.ok && resJson?.success && resJson?.data) {
        const forecastData = resJson.data;
        setClimateForecast(forecastData);
        setLoading((prev) => ({ ...prev, climate: false }));
        return forecastData;
      }

      const errMsg =
        resJson?.detail ||
        resJson?.message ||
        "Copernicus Climate Data Store request could not be processed. Please try again.";
      setClimateForecast(null);
      setLoading((prev) => ({ ...prev, climate: false }));
      setErrors((prev) => ({ ...prev, climate: errMsg }));
      return null;
    } catch (err) {
      clearTimeout(timeoutId);
      const timeoutMsg =
        err?.name === "AbortError"
          ? "Copernicus CDS request exceeded the 5-minute foreground waiting limit. Please try again shortly."
          : (err?.message || "Copernicus Climate Data Store request could not be processed. Please check your network and try again.");
      setClimateForecast(null);
      setLoading((prev) => ({ ...prev, climate: false }));
      setErrors((prev) => ({ ...prev, climate: timeoutMsg }));
      return null;
    }
  }, []);

  // 3b. Resolve location coordinates dynamically
  const resolveLocationCoordinates = useCallback(async ({ province, city }) => {
    const token = getStoredToken();
    if (!token || !province || !city) return null;
    try {
      const url = `${API_BASE_URL}/farmer/forecasting/resolve-location/?province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const resJson = await response.json();
        if (resJson?.success && resJson?.data) {
          return resJson.data;
        }
      }
    } catch {
      // Ignore network errors
    }
    return null;
  }, []);

  const clearClimateForecast = useCallback(() => {
    setClimateForecast(null);
  }, []);

  // 4. Generate Demand Forecast
  const generateDemandForecast = useCallback(async (productId, horizon = 3) => {
    setLoading((prev) => ({ ...prev, demand: true }));
    const prod = SAMPLE_DEMAND_PRODUCTS.find((p) => p.product_id === Number(productId)) || SAMPLE_DEMAND_PRODUCTS[0];
    const result = {
      ...SAMPLE_DEMAND_FORECAST,
      product_id: prod.product_id,
      product_name: prod.product_name,
      rice_variety: prod.rice_variety,
    };
    setDemandForecast(result);
    setLoading((prev) => ({ ...prev, demand: false }));
    return result;
  }, []);

  const clearDemandForecast = useCallback(() => {
    setDemandForecast(null);
  }, []);

  // 5. Generate AI Interpretation (returns 3 clearly labeled sections)
  const generateAIInterpretation = useCallback(async (options = {}) => {
    setLoading((prev) => ({ ...prev, ai: true }));
    setErrors((prev) => ({ ...prev, ai: "" }));

    const token = getStoredToken();
    const payload = {
      scope: options.scope || "climate",
      climate_forecast_run_id: options.climate_forecast_run_id,
      demand_forecast_run_id: options.demand_forecast_run_id,
      question_text: options.question_text,
      response_language: options.response_language || "en",
    };

    if (token && payload.climate_forecast_run_id) {
      try {
        const response = await fetch(`${API_BASE_URL}/farmer/forecasting/ai/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const resJson = await response.json().catch(() => ({}));
          if (resJson?.success && resJson?.data) {
            const aiData = resJson.data;
            setAiInterpretation(aiData);
            setLoading((prev) => ({ ...prev, ai: false }));
            return aiData;
          }
        }
      } catch {
        // Fall through to graceful fallback
      }
    }

    setAiInterpretation(SAMPLE_AI_INTERPRETATION);
    setLoading((prev) => ({ ...prev, ai: false }));
    return SAMPLE_AI_INTERPRETATION;
  }, []);

  const clearAIInterpretation = useCallback(() => {
    setAiInterpretation(null);
  }, []);

  const resetForecasting = useCallback(() => {
    setClimateForecast(SAMPLE_CLIMATE_FORECAST);
    setDemandForecast(SAMPLE_DEMAND_FORECAST);
    setAiInterpretation(SAMPLE_AI_INTERPRETATION);
    setLoading(DEFAULT_LOADING);
    setErrors(DEFAULT_ERRORS);
  }, []);

  return {
    farms,
    loadForecastingFarms,

    demandProducts,
    loadDemandProducts,

    climateForecast,
    generateClimateForecast,
    clearClimateForecast,
    resolveLocationCoordinates,

    demandForecast,
    generateDemandForecast,
    clearDemandForecast,

    aiInterpretation,
    generateAIInterpretation,
    clearAIInterpretation,

    loading,
    errors,

    resetForecasting,
  };
};

export default useFarmerForecasting;
