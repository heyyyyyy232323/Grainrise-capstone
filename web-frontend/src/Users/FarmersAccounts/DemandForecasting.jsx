import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Search,
  Lightbulb,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  LoaderCircle,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

import Dropdown from "../../Components/Minor-Components/Dropdown";

import useFarmerForecasting
  from "../../Components/hooks/Farmer/useFarmerForecasting";
import Toast from "../../Components/Modals/Toast";
import useToast from "../../Components/hooks/useToast";


// ============================================================
// OPTIONS
// ============================================================


const FORECAST_VIEW_OPTIONS = [
  {
    label: "Weekly",
    value: "Weekly",
  },
  {
    label: "Monthly",
    value: "Monthly",
  },
];


// ============================================================
// HELPERS
// ============================================================


const numberValue = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};


const formatKg = (value) => {
  return numberValue(value).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};


const formatProductType = (value) => {
  const normalized = String(
    value || ""
  )
    .trim()
    .toLowerCase();


  switch (normalized) {

    case "milled_rice":
    case "milled rice":
      return "Milled Rice";


    case "unmilled_palay":
    case "unmilled palay":
    case "palay":
      return "Palay";


    default:
      return String(
        value || "—"
      )
        .replaceAll(
          "_",
          " "
        )
        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );

  }
};


const getProductName = (product) => {

  const variety = String(
    product?.rice_variety || ""
  ).trim();


  if (variety) {
    return variety;
  }


  return formatProductType(
    product?.product_type
  );

};


const getProductKey = (product) => {

  return [
    product?.product_type || "",
    product?.rice_variety || "",
  ].join("::");

};


const getPeriodStart = (item) => {

  return (
    item?.period_start
    ||
    item?.start_date
    ||
    item?.date
    ||
    null
  );

};


const getHistoricalValue = (item) => {

  return numberValue(
    item?.realized_demand_kg
    ??
    item?.demand_kg
    ??
    item?.quantity_kg
    ??
    item?.value
  );

};


const getForecastValue = (item) => {

  return numberValue(
    item?.forecast_quantity_kg
    ??
    item?.predicted_demand_kg
    ??
    item?.forecasted_demand_kg
    ??
    item?.quantity_kg
    ??
    item?.value
  );

};


const formatMonth = (value) => {

  if (!value) {
    return "";
  }


  const date = new Date(
    `${value}T00:00:00`
  );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
    }
  );

};


const formatWeek = (value) => {

  if (!value) {
    return "";
  }


  const date = new Date(
    `${value}T00:00:00`
  );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
    }
  );

};


const formatMonthYear = (value) => {

  if (!value) {
    return "—";
  }


  const date = new Date(
    `${value}T00:00:00`
  );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }


  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",
      year: "numeric",
    }
  );

};


const formatWeekRange = (
  start,
  end
) => {

  if (
    !start
    ||
    !end
  ) {
    return "—";
  }


  const startDate = new Date(
    `${start}T00:00:00`
  );

  const endDate = new Date(
    `${end}T00:00:00`
  );


  if (
    Number.isNaN(
      startDate.getTime()
    )
    ||
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    return "—";
  }


  const first =
    startDate.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
      }
    );


  const last =
    endDate.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );


  return `${first} - ${last}`;

};


const formatForecastPeriod = (
  start,
  end,
  forecastView
) => {

  if (
    !start
    ||
    !end
  ) {
    return "—";
  }


  if (
    forecastView
    ===
    "Weekly"
  ) {
    return formatWeekRange(
      start,
      end
    );
  }


  const startDate = new Date(
    `${start}T00:00:00`
  );

  const endDate = new Date(
    `${end}T00:00:00`
  );


  if (
    Number.isNaN(
      startDate.getTime()
    )
    ||
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    return "—";
  }


  const first =
    startDate.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        year: "numeric",
      }
    );


  const last =
    endDate.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        year: "numeric",
      }
    );


  return `${first} - ${last}`;

};


// ============================================================
// READ-ONLY PRODUCT TYPE FIELD
// ============================================================


const ReadOnlyDropdownField = ({
  label,
  value,
}) => {

  return (

    <div>

      <label
        className="
          text-xs
          font-semibold
          text-gray-500
          mb-1.5
          block
        "
      >
        {label}
      </label>


      <div
        aria-disabled="true"
        className="
          relative
          flex
          h-[38px]
          w-full
          cursor-not-allowed
          items-center
          rounded-lg
          border
          border-gray-200
          bg-gray-50
          px-3
          pr-9
          text-sm
          text-gray-600
          select-none
        "
      >

        <span
          className="
            truncate
          "
        >
          {value || "—"}
        </span>


        <ChevronDown
          size={15}
          className="
            absolute
            right-3
            text-gray-300
          "
        />

      </div>

    </div>

  );

};


// ============================================================
// DEMAND CHART
// ============================================================


const DemandChart = ({
  historicalPeriods,
  forecastPeriods,
  forecastView,
}) => {

  const historicalLimit =
    forecastView === "Weekly"
      ? 8
      : 6;


  const forecastLimit =
    forecastView === "Weekly"
      ? 12
      : 6;


  const historical =
    historicalPeriods
      .slice(
        -historicalLimit
      )
      .map(
        (item) => ({
          date:
            getPeriodStart(
              item
            ),

          value:
            getHistoricalValue(
              item
            ),

          type:
            "history",
        })
      );


  const forecast =
    forecastPeriods
      .slice(
        0,
        forecastLimit
      )
      .map(
        (item) => ({
          date:
            getPeriodStart(
              item
            ),

          value:
            getForecastValue(
              item
            ),

          type:
            "forecast",
        })
      );


  const allValues = [
    ...historical,
    ...forecast,
  ].map(
    (item) =>
      item.value
  );


  const maximum = Math.max(
    ...allValues,
    1
  );


  const historicalPoints =
    historical.map(
      (
        item,
        index
      ) => {

        const x =
          historical.length <= 1
            ? 160
            : 50
              +
              (
                index
                /
                (
                  historical.length - 1
                )
              )
              *
              220;


        const y =
          160
          -
          (
            item.value
            /
            maximum
          )
          *
          100;


        return {
          ...item,
          x,
          y,
        };

      }
    );


  const forecastPoints =
    forecast.map(
      (
        item,
        index
      ) => {

        const x =
          forecast.length <= 1
            ? 440
            : 320
              +
              (
                index
                /
                (
                  forecast.length - 1
                )
              )
              *
              240;


        const y =
          160
          -
          (
            item.value
            /
            maximum
          )
          *
          100;


        return {
          ...item,
          x,
          y,
        };

      }
    );


  const historicalPath =
    historicalPoints
      .map(
        (
          point,
          index
        ) =>
          `${
            index === 0
              ? "M"
              : "L"
          } ${point.x},${point.y}`
      )
      .join(" ");


  let forecastPath = "";


  if (
    forecastPoints.length
  ) {

    const pathPoints =
      historicalPoints.length
        ? [
            historicalPoints[
              historicalPoints.length - 1
            ],
            ...forecastPoints,
          ]
        : forecastPoints;


    forecastPath =
      pathPoints
        .map(
          (
            point,
            index
          ) =>
            `${
              index === 0
                ? "M"
                : "L"
            } ${point.x},${point.y}`
        )
        .join(" ");

  }


  const labelFormatter =
    forecastView === "Weekly"
      ? formatWeek
      : formatMonth;


  return (

    <div
      className="
        w-full
        h-64
        relative
      "
    >

      <svg
        viewBox="0 0 600 200"
        className="
          w-full
          h-full
          overflow-visible
        "
      >

        {/* TODAY */}

        <line
          x1="300"
          y1="10"
          x2="300"
          y2="170"
          stroke="#CBD5E1"
          strokeWidth="1"
          strokeDasharray="4 4"
        />


        <text
          x="300"
          y="5"
          className="
            text-[10px]
            fill-gray-400
            font-medium
          "
          textAnchor="middle"
        >
          Today
        </text>


        {/* HISTORICAL */}

        {historicalPath && (

          <path
            d={
              historicalPath
            }
            fill="none"
            stroke="#0B7A2A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        )}


        {historicalPoints.map(
          (
            point,
            index
          ) => (

            <circle
              key={
                `historical-${index}`
              }
              cx={
                point.x
              }
              cy={
                point.y
              }
              r="3.5"
              fill="#0B7A2A"
            />

          )
        )}


        {/* FORECAST */}

        {forecastPath && (

          <path
            d={
              forecastPath
            }
            fill="none"
            stroke="#D6A62D"
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

        )}


        {forecastPoints.map(
          (
            point,
            index
          ) => (

            <circle
              key={
                `forecast-${index}`
              }
              cx={
                point.x
              }
              cy={
                point.y
              }
              r="3.5"
              fill="#D6A62D"
            />

          )
        )}


        {/* HISTORICAL LABELS */}

        {historicalPoints.map(
          (
            point,
            index
          ) => (

            <text
              key={
                `historical-label-${index}`
              }
              x={
                point.x
              }
              y="195"
              className="
                text-[10px]
                fill-gray-500
              "
              textAnchor="middle"
            >
              {
                labelFormatter(
                  point.date
                )
              }
            </text>

          )
        )}


        {/* FORECAST LABELS */}

        {forecastPoints.map(
          (
            point,
            index
          ) => (

            <text
              key={
                `forecast-label-${index}`
              }
              x={
                point.x
              }
              y="195"
              className="
                text-[10px]
                fill-green-700
                font-semibold
              "
              textAnchor="middle"
            >

              {
                index === 0
                  ? `${
                      labelFormatter(
                        point.date
                      )
                    } (Forecast)`
                  : labelFormatter(
                      point.date
                    )
              }

            </text>

          )
        )}

      </svg>

    </div>

  );

};


// ============================================================
// MAIN COMPONENT
// ============================================================


export default function DemandForecasting() {

  const {

    demandProducts,
    loadDemandProducts,

    demandForecast,
    generateDemandForecast,

    loading,
    errors,

  } = useFarmerForecasting();

  const { toasts, showToast, removeToast } = useToast();


  const [
    selectedProductKey,
    setSelectedProductKey,
  ] = useState("");


  const [
    forecastView,
    setForecastView,
  ] = useState(
    "Monthly"
  );


  const lastRequestKeyRef =
    useRef("");


  // =========================================================
  // LOAD AVAILABLE PRODUCTS
  // =========================================================

  useEffect(
    () => {

      loadDemandProducts()
        .catch(
          () => {}
        );

    },
    [
      loadDemandProducts,
    ]
  );


  // =========================================================
  // AUTO-SELECT FIRST PRODUCT
  // =========================================================

  useEffect(
    () => {

      if (
        selectedProductKey
        ||
        !demandProducts.length
      ) {
        return;
      }


      setSelectedProductKey(
        getProductKey(
          demandProducts[0]
        )
      );

    },
    [
      demandProducts,
      selectedProductKey,
    ]
  );


  // =========================================================
  // CURRENT PRODUCT
  // =========================================================

  const selectedProduct =
    useMemo(
      () => {

        return (
          demandProducts.find(
            (product) =>
              getProductKey(
                product
              )
              ===
              selectedProductKey
          )
          ||
          null
        );

      },
      [
        demandProducts,
        selectedProductKey,
      ]
    );


  // =========================================================
  // GRANULARITY / HORIZON
  // =========================================================

  const forecastConfig =
    useMemo(
      () => {

        if (
          forecastView
          ===
          "Weekly"
        ) {

          return {
            granularity:
              "weekly",

            horizonPeriods:
              12,
          };

        }


        return {
          granularity:
            "monthly",

          horizonPeriods:
            6,
        };

      },
      [
        forecastView,
      ]
    );


  // =========================================================
  // AUTO FORECAST
  //
  // Product + Forecast View are selectable.
  // Product Type is fetched automatically from selected product.
  // =========================================================

  const runForecast =
    useCallback(
      async ({
        force = false,
      } = {}) => {

        if (
          !selectedProduct
        ) {
          return;
        }


        const requestKey = [
          selectedProduct
            ?.product_type
            ||
            "",

          selectedProduct
            ?.rice_variety
            ||
            "",

          forecastConfig
            .granularity,

          forecastConfig
            .horizonPeriods,
        ].join("::");


        if (
          !force
          &&
          lastRequestKeyRef.current
          ===
          requestKey
        ) {
          return;
        }


        lastRequestKeyRef.current =
          requestKey;


        try {

          await generateDemandForecast({

            product_type:
              selectedProduct
                .product_type,

            rice_variety:
              selectedProduct
                .rice_variety,

            granularity:
              forecastConfig
                .granularity,

            horizon_periods:
              forecastConfig
                .horizonPeriods,

          });

        }

        catch (error) {

          /*
           * Allow retry after a failed request.
           */

          lastRequestKeyRef.current =
            "";

          throw error;

        }

      },
      [
        selectedProduct,
        forecastConfig,
        generateDemandForecast,
      ]
    );


  useEffect(
    () => {

      if (
        !selectedProduct
      ) {
        return;
      }


      const timer =
        window.setTimeout(
          () => {

            runForecast()
              .catch(
                () => {}
              );

          },
          250
        );


      return () => {

        window.clearTimeout(
          timer
        );

      };

    },
    [
      selectedProduct,
      forecastView,
      runForecast,
    ]
  );


  // =========================================================
  // FORECAST DATA
  // =========================================================

  const historicalPeriods =
    Array.isArray(
      demandForecast
        ?.feature_snapshot
        ?.historical_periods
    )
      ? demandForecast
          .feature_snapshot
          .historical_periods
      : [];


  const forecastPeriods =
    Array.isArray(
      demandForecast
        ?.forecast_output
        ?.periods
    )
      ? demandForecast
          .forecast_output
          .periods
      : [];


  const forecastedDemand =
    numberValue(
      demandForecast
        ?.projected_total_quantity_kg
    )
    ||
    forecastPeriods.reduce(
      (
        total,
        item
      ) =>
        total
        +
        getForecastValue(
          item
        ),
      0
    );


  const trend = String(
    demandForecast
      ?.demand_trend
      ||
      ""
  ).toLowerCase();


  const peakPeriod =
    forecastPeriods.reduce(
      (
        currentPeak,
        current
      ) => {

        if (
          !currentPeak
        ) {
          return current;
        }


        return (
          getForecastValue(
            current
          )
          >
          getForecastValue(
            currentPeak
          )
            ? current
            : currentPeak
        );

      },
      null
    );


  // =========================================================
  // EXPECTED LEVEL
  // =========================================================

  const historicalAverage =
    historicalPeriods.length
      ? (
          historicalPeriods.reduce(
            (
              total,
              item
            ) =>
              total
              +
              getHistoricalValue(
                item
              ),
            0
          )
          /
          historicalPeriods.length
        )
      : 0;


  const forecastAverage =
    forecastPeriods.length
      ? (
          forecastPeriods.reduce(
            (
              total,
              item
            ) =>
              total
              +
              getForecastValue(
                item
              ),
            0
          )
          /
          forecastPeriods.length
        )
      : 0;


  const expectedLevel =
    useMemo(
      () => {

        if (
          !forecastPeriods.length
        ) {

          return {
            label:
              "No Forecast",

            classes:
              "bg-gray-100 text-gray-600",
          };

        }


        if (
          historicalAverage
          >
          0
        ) {

          const ratio =
            forecastAverage
            /
            historicalAverage;


          if (
            ratio >= 1.15
          ) {

            return {
              label:
                "High Demand",

              classes:
                "bg-red-100 text-red-700",
            };

          }


          if (
            ratio <= 0.85
          ) {

            return {
              label:
                "Low Demand",

              classes:
                "bg-blue-100 text-blue-700",
            };

          }

        }


        return {
          label:
            "Moderate Demand",

          classes:
            "bg-yellow-100 text-yellow-700",
        };

      },
      [
        forecastPeriods,
        historicalAverage,
        forecastAverage,
      ]
    );


  // =========================================================
  // TREND PRESENTATION
  // =========================================================

  const trendPresentation =
    useMemo(
      () => {

        switch (trend) {

          case "increasing":

            return {
              label:
                "Increasing",

              Icon:
                TrendingUp,

              classes:
                "text-yellow-600",
            };


          case "decreasing":

            return {
              label:
                "Decreasing",

              Icon:
                TrendingDown,

              classes:
                "text-orange-600",
            };


          default:

            return {
              label:
                forecastPeriods.length
                  ? "Stable"
                  : "—",

              Icon:
                Minus,

              classes:
                "text-gray-600",
            };

        }

      },
      [
        trend,
        forecastPeriods,
      ]
    );


  const TrendIcon =
    trendPresentation.Icon;


  // =========================================================
  // SUMMARY
  // =========================================================

  const productDemandSummary =
    useMemo(
      () => {

        if (
          loading?.demand
        ) {
          return (
            "GrainRise is currently analyzing the selected product's demand data."
          );
        }


        if (
          !forecastPeriods.length
        ) {
          return (
            "Wala pang sapat na forecast result para sa napiling produkto."
          );
        }


        const name =
          getProductName(
            selectedProduct
          );


        const peak =
          forecastView === "Weekly"
            ? formatWeek(
                getPeriodStart(
                  peakPeriod
                )
              )
            : formatMonthYear(
                getPeriodStart(
                  peakPeriod
                )
              );


        if (
          trend
          ===
          "increasing"
        ) {

          return (
            `Demand for ${name} is projected to increase during the forecast period, `
            +
            `with the highest expected demand occurring around ${peak}.`
          );

        }


        if (
          trend
          ===
          "decreasing"
        ) {

          return (
            `Demand for ${name} is projected to decrease during the forecast period. `
            +
            `The highest projected demand occurs around ${peak}.`
          );

        }


        return (
          `Demand for ${name} is projected to remain relatively stable during the forecast period. `
          +
          `The highest projected demand occurs around ${peak}.`
        );

      },
      [
        loading,
        forecastPeriods,
        selectedProduct,
        peakPeriod,
        trend,
        forecastView,
      ]
    );


  const productionConsideration =
    useMemo(
      () => {

        if (
          !forecastPeriods.length
        ) {
          return (
            "More historical demand data may be needed before GrainRise can provide a reliable production consideration."
          );
        }


        if (
          trend
          ===
          "increasing"
        ) {
          return (
            "Consider preparing sufficient supply ahead of the projected peak-demand period."
          );
        }


        if (
          trend
          ===
          "decreasing"
        ) {
          return (
            "Consider reviewing planned supply before increasing production because projected demand is lower."
          );
        }


        return (
          "Consider maintaining enough available supply while continuing to monitor actual sales and Contracts."
        );

      },
      [
        forecastPeriods,
        trend,
      ]
    );


  // =========================================================
  // FORECAST DATES
  // =========================================================

  const forecastStart =
    demandForecast
      ?.forecast_period
      ?.start_date
    ||
    getPeriodStart(
      forecastPeriods[0]
    );


  const forecastEnd =
    demandForecast
      ?.forecast_period
      ?.end_date
    ||
    getPeriodStart(
      forecastPeriods[
        forecastPeriods.length - 1
      ]
    );


  // =========================================================
  // DOWNLOAD
  // =========================================================

  const handleDownloadReport =
    useCallback(
      () => {

        if (
          !demandForecast
          ||
          !selectedProduct
        ) {
          return;
        }


        const content = [

          "GRAINRISE DEMAND FORECAST",

          "",

          `Product: ${
            getProductName(
              selectedProduct
            )
          }`,

          `Product Type: ${
            formatProductType(
              selectedProduct
                ?.product_type
            )
          }`,

          `Forecast View: ${
            forecastView
          }`,

          `Forecast Period: ${
            formatForecastPeriod(
              forecastStart,
              forecastEnd,
              forecastView
            )
          }`,

          "",

          `Forecasted Demand: ${
            formatKg(
              forecastedDemand
            )
          } kg`,

          `Demand Trend: ${
            trendPresentation
              .label
          }`,

          `Peak Period: ${
            forecastView === "Weekly"
              ? formatWeek(
                  getPeriodStart(
                    peakPeriod
                  )
                )
              : formatMonthYear(
                  getPeriodStart(
                    peakPeriod
                  )
                )
          }`,

          `Expected Level: ${
            expectedLevel
              .label
          }`,

          "",

          "Product Demand Summary:",

          productDemandSummary,

          "",

          "Production Consideration:",

          productionConsideration,

          "",

          "Forecast Method:",
          "Time Series + Multiple Linear Regression",

        ].join(
          "\n"
        );


        const blob =
          new Blob(
            [
              content,
            ],
            {
              type:
                "text/plain;charset=utf-8",
            }
          );


        const url =
          URL.createObjectURL(
            blob
          );


        const link =
          document.createElement(
            "a"
          );


        link.href =
          url;


        link.download =
          "grainrise-demand-forecast.txt";


        document.body.appendChild(
          link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
          url
        );

        showToast({
          type: "success",
          title: "Report Downloaded",
          message: "Demand forecast summary report downloaded successfully.",
          duration: 4000,
        });

      },
      [
        demandForecast,
        selectedProduct,
        forecastView,
        forecastStart,
        forecastEnd,
        forecastedDemand,
        trendPresentation,
        peakPeriod,
        expectedLevel,
        productDemandSummary,
        productionConsideration,
      ]
    );


  // =========================================================
  // RENDER
  // =========================================================

  return (

    <div
      className="
        flex
        flex-col
        gap-6
      "
    >

      <div>

        <h3
          className="
            font-bold
            text-gray-900
            text-lg
            mb-4
          "
        >
          Demand Forecasting
        </h3>


        {/* =================================================
            FILTERS
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            md:grid-cols-12
            gap-4
            items-end
          "
        >


          {/* PRODUCT / VARIETY DROPDOWN */}

          <div
            className="
              md:col-span-6
            "
          >

            <label
              className="
                text-xs
                font-semibold
                text-gray-500
                mb-1.5
                block
              "
            >
              Search Product / Variety
            </label>


            <div
              className="
                relative
              "
            >

              <Search
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  pointer-events-none
                  z-10
                "
                size={16}
              />


              <select
                value={
                  selectedProductKey
                }
                onChange={
                  (
                    event
                  ) => {

                    lastRequestKeyRef.current =
                      "";


                    setSelectedProductKey(
                      event.target.value
                    );

                  }
                }
                disabled={
                  loading?.products
                  ||
                  !demandProducts.length
                }
                className="
                  w-full
                  h-[38px]
                  appearance-none
                  pl-9
                  pr-10
                  border
                  border-gray-200
                  rounded-lg
                  bg-white
                  text-sm
                  text-gray-800
                  outline-none
                  focus:ring-1
                  focus:ring-green-600
                  focus:border-green-600
                  disabled:bg-gray-50
                  disabled:text-gray-400
                "
              >

                {
                  !demandProducts.length
                  &&
                  (
                    <option
                      value=""
                    >
                      No products available
                    </option>
                  )
                }


                {
                  demandProducts.map(
                    (
                      product
                    ) => {

                      const key =
                        getProductKey(
                          product
                        );


                      return (

                        <option
                          key={
                            key
                          }
                          value={
                            key
                          }
                        >

                          {
                            getProductName(
                              product
                            )
                          }

                          {" — "}

                          {
                            formatProductType(
                              product
                                ?.product_type
                            )
                          }

                        </option>

                      );

                    }
                  )
                }

              </select>


              <ChevronDown
                size={15}
                className="
                  absolute
                  right-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                  pointer-events-none
                "
              />

            </div>

          </div>


          {/* AUTO PRODUCT TYPE */}

          <div
            className="
              md:col-span-3
            "
          >

            <ReadOnlyDropdownField
              label="Product Type"
              value={
                selectedProduct
                  ? formatProductType(
                      selectedProduct
                        ?.product_type
                    )
                  : "—"
              }
            />

          </div>


          {/* WEEKLY / MONTHLY */}

          <div
            className="
              md:col-span-3
            "
          >

            <Dropdown
              label="Forecast View"
              options={
                FORECAST_VIEW_OPTIONS
              }
              value={
                forecastView
              }
              onChange={
                (
                  nextValue
                ) => {

                  lastRequestKeyRef.current =
                    "";


                  setForecastView(
                    nextValue
                  );

                }
              }
            />

          </div>

        </div>

      </div>


      {/* ===================================================
          ERRORS
      ==================================================== */}

      {
        errors?.products
        &&
        (
          <div
            className="
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-xs
              text-red-700
            "
          >
            {errors.products}
          </div>
        )
      }


      {
        errors?.demand
        &&
        (
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-4
              py-3
            "
          >

            <span
              className="
                text-xs
                text-red-700
              "
            >
              {errors.demand}
            </span>


            <button
              type="button"
              onClick={
                () => {

                  runForecast({
                    force:
                      true,
                  }).catch(
                    () => {}
                  );

                }
              }
              disabled={
                loading?.demand
              }
              className="
                shrink-0
                inline-flex
                items-center
                gap-1.5
                text-xs
                font-semibold
                text-red-700
                hover:text-red-800
                disabled:opacity-50
              "
            >

              <RefreshCw
                size={13}
              />

              Retry

            </button>

          </div>
        )
      }


      <div
        className="
          grid
          grid-cols-1
          xl:grid-cols-3
          gap-6
        "
      >


        {/* =================================================
            LEFT SIDE
        ================================================== */}

        <div
          className="
            xl:col-span-2
            flex
            flex-col
            gap-6
          "
        >


          {/* CHART */}

          <div
            className="
              border
              border-slate-200
              rounded-xl
              bg-white
              p-6
              shadow-sm
            "
          >

            <div
              className="
                flex
                justify-between
                items-center
                mb-8
              "
            >

              <h4
                className="
                  font-bold
                  text-gray-900
                  text-md
                "
              >
                Historical & Forecasted Demand
              </h4>


              <span
                className="
                  text-xs
                  font-medium
                  text-gray-500
                  bg-gray-100
                  px-3
                  py-1
                  rounded-md
                "
              >
                Unit: kg
              </span>

            </div>


            {
              loading?.demand
                ? (

                  <div
                    className="
                      w-full
                      h-64
                      flex
                      flex-col
                      items-center
                      justify-center
                    "
                  >

                    <LoaderCircle
                      size={28}
                      className="
                        animate-spin
                        text-green-700
                      "
                    />


                    <p
                      className="
                        mt-3
                        text-xs
                        text-gray-500
                      "
                    >
                      Generating {forecastView} Demand Forecast...
                    </p>

                  </div>

                )
                : (

                  <DemandChart
                    historicalPeriods={
                      historicalPeriods
                    }
                    forecastPeriods={
                      forecastPeriods
                    }
                    forecastView={
                      forecastView
                    }
                  />

                )
            }

          </div>


          {/* KPI CARDS */}

          <div
            className="
              grid
              grid-cols-2
              md:grid-cols-4
              gap-4
            "
          >


            <div
              className="
                border
                border-slate-200
                rounded-xl
                bg-white
                p-4
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  text-gray-500
                  font-medium
                  mb-1
                "
              >
                Forecasted Demand
              </p>


              <p
                className="
                  text-lg
                  font-bold
                  text-green-700
                "
              >

                {
                  formatKg(
                    forecastedDemand
                  )
                }

                {" "}

                <span
                  className="
                    text-xs
                    font-normal
                    text-gray-900
                  "
                >
                  kg
                </span>

              </p>

            </div>


            <div
              className="
                border
                border-slate-200
                rounded-xl
                bg-white
                p-4
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  text-gray-500
                  font-medium
                  mb-1
                "
              >
                Demand Trend
              </p>


              <p
                className={`
                  text-md
                  font-bold
                  flex
                  items-center
                  gap-1
                  ${
                    trendPresentation
                      .classes
                  }
                `}
              >

                <TrendIcon
                  size={16}
                />

                {
                  trendPresentation
                    .label
                }

              </p>

            </div>


            <div
              className="
                border
                border-slate-200
                rounded-xl
                bg-white
                p-4
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  text-gray-500
                  font-medium
                  mb-1
                "
              >
                Peak Period
              </p>


              <p
                className="
                  text-md
                  font-bold
                  text-gray-900
                "
              >

                {
                  peakPeriod
                    ? (
                        forecastView
                        ===
                        "Weekly"
                          ? formatWeek(
                              getPeriodStart(
                                peakPeriod
                              )
                            )
                          : formatMonthYear(
                              getPeriodStart(
                                peakPeriod
                              )
                            )
                      )
                    : "—"
                }

              </p>

            </div>


            <div
              className="
                border
                border-slate-200
                rounded-xl
                bg-white
                p-4
                shadow-sm
              "
            >

              <p
                className="
                  text-xs
                  text-gray-500
                  font-medium
                  mb-1
                "
              >
                Expected Level
              </p>


              <div
                className={`
                  mt-1
                  inline-flex
                  items-center
                  justify-center
                  px-3
                  py-1
                  rounded-md
                  text-xs
                  font-bold
                  w-full
                  ${
                    expectedLevel
                      .classes
                  }
                `}
              >

                {
                  expectedLevel
                    .label
                }

              </div>

            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT SIDE
        ================================================== */}

        <div
          className="
            flex
            flex-col
            gap-4
          "
        >


          {/* INSIGHTS */}

          <div
            className="
              border
              border-slate-200
              rounded-xl
              bg-white
              p-6
              shadow-sm
              flex
              flex-col
              gap-5
            "
          >

            <h4
              className="
                font-bold
                text-gray-900
                text-md
                flex
                items-center
                gap-2
              "
            >

              <Lightbulb
                className="
                  text-yellow-500
                "
                size={18}
              />

              Insights & Considerations

            </h4>


            <div>

              <h5
                className="
                  text-sm
                  font-semibold
                  text-green-700
                  mb-1
                "
              >
                Product Demand Summary
              </h5>


              <p
                className="
                  text-xs
                  text-gray-600
                  leading-relaxed
                "
              >
                {
                  productDemandSummary
                }
              </p>

            </div>


            <hr
              className="
                border-gray-100
              "
            />


            <div>

              <h5
                className="
                  text-sm
                  font-semibold
                  text-yellow-600
                  mb-1
                "
              >
                Production Consideration
              </h5>


              <p
                className="
                  text-xs
                  text-gray-600
                  leading-relaxed
                "
              >
                {
                  productionConsideration
                }
              </p>

            </div>

          </div>


          {/* DOWNLOAD */}

          <button
            type="button"
            onClick={
              handleDownloadReport
            }
            disabled={
              !demandForecast
              ||
              loading?.demand
            }
            className="
              w-full
              flex
              items-center
              justify-center
              gap-2
              bg-green-700
              text-white
              py-3
              rounded-lg
              font-medium
              hover:bg-green-800
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >

            <Download
              size={18}
            />

            Download Report

          </button>


          {/* FORECAST INFO */}

          <div
            className="
              border
              border-slate-200
              rounded-xl
              bg-white
              p-5
              shadow-sm
              mt-2
            "
          >

            <h5
              className="
                text-xs
                font-bold
                text-gray-900
                mb-3
              "
            >
              Forecast Information
            </h5>


            <div
              className="
                flex
                justify-between
                items-center
                gap-4
                py-2
                border-b
                border-gray-100
              "
            >

              <span
                className="
                  text-xs
                  text-gray-500
                "
              >
                Selected Product
              </span>


              <span
                className="
                  text-xs
                  font-medium
                  text-gray-900
                  text-right
                "
              >

                {
                  selectedProduct
                    ? getProductName(
                        selectedProduct
                      )
                    : "—"
                }

              </span>

            </div>


            <div
              className="
                flex
                justify-between
                items-center
                gap-4
                py-2
                border-b
                border-gray-100
              "
            >

              <span
                className="
                  text-xs
                  text-gray-500
                "
              >
                Product Type
              </span>


              <span
                className="
                  text-xs
                  font-medium
                  text-gray-900
                  text-right
                "
              >

                {
                  selectedProduct
                    ? formatProductType(
                        selectedProduct
                          ?.product_type
                      )
                    : "—"
                }

              </span>

            </div>


            <div
              className="
                flex
                justify-between
                items-center
                gap-4
                py-2
                border-b
                border-gray-100
              "
            >

              <span
                className="
                  text-xs
                  text-gray-500
                "
              >
                Forecast View
              </span>


              <span
                className="
                  text-xs
                  font-medium
                  text-gray-900
                  text-right
                "
              >
                {forecastView}
              </span>

            </div>


            <div
              className="
                flex
                justify-between
                items-center
                gap-4
                py-2
              "
            >

              <span
                className="
                  text-xs
                  text-gray-500
                "
              >
                Forecast
                <br />
                Period
              </span>


              <span
                className="
                  text-xs
                  font-medium
                  text-gray-900
                  text-right
                "
              >

                {
                  formatForecastPeriod(
                    forecastStart,
                    forecastEnd,
                    forecastView
                  )
                }

              </span>

            </div>

          </div>

        </div>

      </div>

      <Toast toasts={toasts} removeToast={removeToast} />

    </div>

  );

}
