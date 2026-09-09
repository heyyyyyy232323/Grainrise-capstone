import { useCallback, useState } from "react";
import useApi from "../useApi";

const normalizeResponseData = (payload) => {
  if (
    payload &&
    typeof payload === "object" &&
    payload.data !== undefined
  ) {
    return payload.data;
  }

  return payload;
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

const useFarmerForecasting = () => {
  const { request } = useApi();

  const [farms, setFarms] = useState([]);
  const [demandProducts, setDemandProducts] = useState([]);
  const [climateForecast, setClimateForecast] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [aiInterpretation, setAiInterpretation] = useState(null);

  const [loading, setLoading] = useState(DEFAULT_LOADING);
  const [errors, setErrors] = useState(DEFAULT_ERRORS);

  const setLoadingKey = useCallback((key, value) => {
    setLoading((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const setErrorKey = useCallback((key, value) => {
    setErrors((previous) => ({
      ...previous,
      [key]: value || "",
    }));
  }, []);

  const loadForecastingFarms = useCallback(async () => {
    setLoadingKey("farms", true);
    setErrorKey("farms", "");

    try {
      const response = await request(
        "/farmer/forecasting/farms/",
        {
          method: "GET",
          throwOnError: true,
        }
      );

      const data = normalizeResponseData(response) || {};

      const results = Array.isArray(data?.farms)
        ? data.farms
        : [];

      setFarms(results);

      return results;
    } catch (error) {
      setFarms([]);

      setErrorKey(
        "farms",
        error?.message ||
          "Unable to load your farms for Forecasting."
      );

      throw error;
    } finally {
      setLoadingKey("farms", false);
    }
  }, [request, setErrorKey, setLoadingKey]);

  const loadDemandProducts = useCallback(async () => {
    setLoadingKey("products", true);
    setErrorKey("products", "");

    try {
      const response = await request(
        "/farmer/forecasting/demand/products/",
        {
          method: "GET",
          throwOnError: true,
        }
      );

      const data = normalizeResponseData(response) || {};

      const results = Array.isArray(data?.products)
        ? data.products
        : [];

      setDemandProducts(results);

      return results;
    } catch (error) {
      setDemandProducts([]);

      setErrorKey(
        "products",
        error?.message ||
          "Unable to load products for Demand Forecasting."
      );

      throw error;
    } finally {
      setLoadingKey("products", false);
    }
  }, [request, setErrorKey, setLoadingKey]);

  const generateClimateForecast = useCallback(
    async (options = {}) => {
      setLoadingKey("climate", true);
      setErrorKey("climate", "");

      try {
        const response = await request(
          "/farmer/forecasting/climate/",
          {
            method: "POST",
            body: options,
            throwOnError: true,
          }
        );

        const data = normalizeResponseData(response);

        setClimateForecast(data || null);

        return data;
      } catch (error) {
        setErrorKey(
          "climate",
          error?.message ||
            "Unable to generate Climate Forecast."
        );

        throw error;
      } finally {
        setLoadingKey("climate", false);
      }
    },
    [request, setErrorKey, setLoadingKey]
  );

  const generateDemandForecast = useCallback(
    async (options = {}) => {
      setLoadingKey("demand", true);
      setErrorKey("demand", "");

      try {
        const response = await request(
          "/farmer/forecasting/demand/",
          {
            method: "POST",
            body: options,
            throwOnError: true,
          }
        );

        const data = normalizeResponseData(response);

        setDemandForecast(data || null);

        return data;
      } catch (error) {
        setErrorKey(
          "demand",
          error?.message ||
            "Unable to generate Demand Forecast."
        );

        throw error;
      } finally {
        setLoadingKey("demand", false);
      }
    },
    [request, setErrorKey, setLoadingKey]
  );

  const generateAIInterpretation = useCallback(
    async (options = {}) => {
      setLoadingKey("ai", true);
      setErrorKey("ai", "");

      try {
        const response = await request(
          "/farmer/forecasting/ai/",
          {
            method: "POST",
            body: options,
            throwOnError: true,
          }
        );

        const data = normalizeResponseData(response);

        setAiInterpretation(data || null);

        return data;
      } catch (error) {
        setErrorKey(
          "ai",
          error?.message ||
            "Unable to generate Forecast explanation."
        );

        throw error;
      } finally {
        setLoadingKey("ai", false);
      }
    },
    [request, setErrorKey, setLoadingKey]
  );

  const clearClimateForecast = useCallback(() => {
    setClimateForecast(null);
    setErrorKey("climate", "");
  }, [setErrorKey]);

  const clearDemandForecast = useCallback(() => {
    setDemandForecast(null);
    setErrorKey("demand", "");
  }, [setErrorKey]);

  const clearAIInterpretation = useCallback(() => {
    setAiInterpretation(null);
    setErrorKey("ai", "");
  }, [setErrorKey]);

  const resetForecasting = useCallback(() => {
    setFarms([]);
    setDemandProducts([]);
    setClimateForecast(null);
    setDemandForecast(null);
    setAiInterpretation(null);

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