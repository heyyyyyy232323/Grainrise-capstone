import { useCallback, useState } from "react";

// ============================================================
// SAMPLE DATA FOR FORECASTING
// ============================================================

const SAMPLE_FARMS = [
  {
    farm_id: 1,
    farm_name: "Green Valley Rice Field",
    total_farm_area: 3.5,
    farm_location: "Barangay San Jose, Cabanatuan City, Nueva Ecija",
    municipality: "Cabanatuan City",
    province: "Nueva Ecija",
    registered_rice_variety: "RC 222 (Tubigan 18)",
    latitude: 15.4859,
    longitude: 120.9673,
  },
  {
    farm_id: 2,
    farm_name: "Central Isabela Agri Lot",
    total_farm_area: 5.0,
    farm_location: "Barangay Maligaya, Cauayan City, Isabela",
    municipality: "Cauayan City",
    province: "Isabela",
    registered_rice_variety: "NSIC Rc 160",
    latitude: 16.9248,
    longitude: 121.7744,
  },
  {
    farm_id: 3,
    farm_name: "Tarlac Plains Paddy 4",
    total_farm_area: 2.0,
    farm_location: "Barangay Poblacion, Concepcion, Tarlac",
    municipality: "Concepcion",
    province: "Tarlac",
    registered_rice_variety: "Angelica Special",
    latitude: 15.3242,
    longitude: 120.6558,
  },
];

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
  summary: "Expected weather patterns show favorable rainfall and stable temperatures suitable for wet-season rice development.",
  optimal_planting_window: "Mid-November to Early December",
  forecast: [
    {
      monthIndex: 0,
      month_name: "November 2026",
      label: "Nov 2026",
      rainfall_mm: 110.5,
      rainfall_status: "Normal",
      temperature_c: 27.8,
      temperature_status: "Moderate",
      risk_level: "Low",
    },
    {
      monthIndex: 1,
      month_name: "December 2026",
      label: "Dec 2026",
      rainfall_mm: 68.2,
      rainfall_status: "Below Normal",
      temperature_c: 26.5,
      temperature_status: "Cool",
      risk_level: "Low",
    },
    {
      monthIndex: 2,
      month_name: "January 2027",
      label: "Jan 2027",
      rainfall_mm: 35.0,
      rainfall_status: "Low",
      temperature_c: 25.8,
      temperature_status: "Cool",
      risk_level: "Moderate",
    },
    {
      monthIndex: 3,
      month_name: "February 2027",
      label: "Feb 2027",
      rainfall_mm: 22.4,
      rainfall_status: "Dry",
      temperature_c: 27.2,
      temperature_status: "Warm",
      risk_level: "Moderate",
    },
    {
      monthIndex: 4,
      month_name: "March 2027",
      label: "Mar 2027",
      rainfall_mm: 45.1,
      rainfall_status: "Light Rain",
      temperature_c: 29.5,
      temperature_status: "Warm",
      risk_level: "Low",
    },
  ],
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
  explanation_text:
    "Demand for RC 222 (Tubigan 18) in Nueva Ecija and Central Luzon is projected to rise steadily over the next two months as commercial millers build up holiday inventory. Concurrently, climate outlook indicates favorable mild conditions with minimal typhoon disruption risk.",
  response_text:
    "Demand for RC 222 (Tubigan 18) in Nueva Ecija and Central Luzon is projected to rise steadily over the next two months as commercial millers build up holiday inventory. Concurrently, climate outlook indicates favorable mild conditions with minimal typhoon disruption risk.",
  forecast_reason_text:
    "Historical mill procurement patterns show a 20-25% volume uptick leading into year-end milling schedules. Local weather sensors indicate moderate rainfall through early December.",
  learning_guidance_text:
    "Farmers with available or upcoming harvest within November and December have a strong bargaining position to lock in forward contracts above P23.50/kg.",
  recommended_actions_text:
    "- Review open Miller Contract Opportunities early to lock in favorable farmgate prices.\n- Ensure grain moisture content is kept strictly between 13% and 14% to qualify for Grade 1 premiums.\n- Clean farm storage areas and inspect tarpaulins ahead of the December harvest cycle.",
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
  const [farms, setFarms] = useState(SAMPLE_FARMS);
  const [demandProducts, setDemandProducts] = useState(SAMPLE_DEMAND_PRODUCTS);
  const [climateForecast, setClimateForecast] = useState(SAMPLE_CLIMATE_FORECAST);
  const [demandForecast, setDemandForecast] = useState(SAMPLE_DEMAND_FORECAST);
  const [aiInterpretation, setAiInterpretation] = useState(SAMPLE_AI_INTERPRETATION);

  const [loading, setLoading] = useState(DEFAULT_LOADING);
  const [errors, setErrors] = useState(DEFAULT_ERRORS);

  const loadForecastingFarms = useCallback(async () => {
    return SAMPLE_FARMS;
  }, []);

  const loadDemandProducts = useCallback(async () => {
    return SAMPLE_DEMAND_PRODUCTS;
  }, []);

  const generateClimateForecast = useCallback(async (options = {}) => {
    setLoading((prev) => ({ ...prev, climate: true }));
    const result = {
      ...SAMPLE_CLIMATE_FORECAST,
      location_name: options.location_name || options.municipality || SAMPLE_CLIMATE_FORECAST.location_name,
    };
    setClimateForecast(result);
    setLoading((prev) => ({ ...prev, climate: false }));
    return result;
  }, []);

  const clearClimateForecast = useCallback(() => {
    setClimateForecast(null);
  }, []);

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

  const generateAIInterpretation = useCallback(async (options = {}) => {
    setLoading((prev) => ({ ...prev, ai: true }));
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
