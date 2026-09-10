import {
  useCallback,
  useEffect,
  useState,
} from "react";

import useApi from "../useApi";


const DEFAULT_DASHBOARD = {
  kpis: {
    available_millers: 0,
    contracted_millers: 0,
    registered_harvest_area_ha: 0,
    potential_cropping_area_ha: 0,
  },

  palay_market_price_trend: [],

  yield_history: [],

  climate_outlook: {
    available: false,
    climate_forecast_run_id: null,
    farm_id: null,
    location_source: null,
    location: null,
    latitude: null,
    longitude: null,
    forecast_generated_at: null,
    series: [],
  },
};


const toNumber = (
  value,
) => {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
};


const toNullableNumber = (
  value,
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
};


const unwrapPayload = (
  response,
) => {
  if (
    response?.data?.data?.kpis
  ) {
    return response.data.data;
  }

  if (
    response?.data?.kpis
  ) {
    return response.data;
  }

  if (
    response?.kpis
  ) {
    return response;
  }

  return {};
};


const normalizeDashboard = (
  response,
) => {
  const data =
    unwrapPayload(
      response
    );

  const kpis =
    data?.kpis || {};

  const climate =
    data?.climate_outlook || {};

  return {
    kpis: {
      available_millers:
        toNumber(
          kpis.available_millers
        ),

      contracted_millers:
        toNumber(
          kpis.contracted_millers
        ),

      registered_harvest_area_ha:
        toNumber(
          kpis.registered_harvest_area_ha
        ),

      potential_cropping_area_ha:
        toNumber(
          kpis.potential_cropping_area_ha
        ),
    },

    palay_market_price_trend:
      Array.isArray(
        data?.palay_market_price_trend
      )
        ? data.palay_market_price_trend.map(
            (item) => ({
              ...item,

              average_price_per_kg:
                toNullableNumber(
                  item?.average_price_per_kg
                ),

              minimum_price_per_kg:
                toNullableNumber(
                  item?.minimum_price_per_kg
                ),

              maximum_price_per_kg:
                toNullableNumber(
                  item?.maximum_price_per_kg
                ),

              record_count:
                toNumber(
                  item?.record_count
                ),
            })
          )
        : [],

    yield_history:
      Array.isArray(
        data?.yield_history
      )
        ? data.yield_history.map(
            (item) => ({
              ...item,

              crop_cycle_id:
                toNumber(
                  item?.crop_cycle_id
                ),

              farm_id:
                toNumber(
                  item?.farm_id
                ),

              actual_yield_kg:
                toNumber(
                  item?.actual_yield_kg
                ),
            })
          )
        : [],

    climate_outlook: {
      available:
        Boolean(
          climate?.available
        ),

      climate_forecast_run_id:
        climate?.climate_forecast_run_id
        ?? null,

      farm_id:
        climate?.farm_id
        ?? null,

      location_source:
        climate?.location_source
        ?? null,

      location:
        climate?.location
        ?? null,

      latitude:
        toNullableNumber(
          climate?.latitude
        ),

      longitude:
        toNullableNumber(
          climate?.longitude
        ),

      forecast_generated_at:
        climate?.forecast_generated_at
        ?? null,

      series:
        Array.isArray(
          climate?.series
        )
          ? climate.series.map(
              (item) => ({
                ...item,

                rainfall_mm:
                  toNullableNumber(
                    item?.rainfall_mm
                  ),

                temperature_c:
                  toNullableNumber(
                    item?.temperature_c
                  ),
              })
            )
          : [],
    },
  };
};


export default function useFarmerDashboard() {
  const {
    request,
  } = useApi();

  const [
    dashboard,
    setDashboard,
  ] = useState(
    DEFAULT_DASHBOARD
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  const loadDashboard =
    useCallback(
      async ({
        refresh = false,
      } = {}) => {
        if (refresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        setError("");

        try {
          const response =
            await request(
              "/farmer/dashboard/",
              {
                method: "GET",
                throwOnError: true,
              }
            );

          const normalized =
            normalizeDashboard(
              response
            );

          setDashboard(
            normalized
          );

          return normalized;

        } catch (err) {
          console.error(
            "Failed to load Farmer Dashboard:",
            err
          );

          setError(
            err?.message ||
            "Unable to load Farmer Dashboard."
          );

          return null;

        } finally {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      },
      [
        request,
      ]
    );


  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);


  const refreshDashboard =
    useCallback(
      () =>
        loadDashboard({
          refresh: true,
        }),
      [
        loadDashboard,
      ]
    );


  return {
    dashboard,

    kpis:
      dashboard.kpis,

    palayMarketPriceTrend:
      dashboard.palay_market_price_trend,

    yieldHistory:
      dashboard.yield_history,

    climateOutlook:
      dashboard.climate_outlook,

    isLoading,

    isRefreshing,

    error,

    refreshDashboard,
  };
}