import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  Lightbulb,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

import useFarmerForecasting
  from "../../Components/hooks/Farmer/useFarmerForecasting";


// ============================================================
// GRAINRISE
// FARMER > FORECASTING > FORECAST INSIGHTS
// ============================================================
//
// Combines:
//
// 1. Demand Forecast
// 2. Climate Forecast
// 3. Grounded GrainRise AI interpretation
//
// IMPORTANT:
//
// - Demand numerical forecast remains Time Series + MLR.
// - Climate numerical values come from Copernicus.
// - AI only explains/interprets the already-computed forecasts.
// - Farmer is identified by JWT/session on backend.
// - No frontend user_id is submitted.
// ============================================================


// ============================================================
// CONSTANTS
// ============================================================

const PERIOD_OPTIONS = [
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
];


const CURRENT_LOCATION_VALUE =
  "current_location";


// ============================================================
// GENERIC HELPERS
// ============================================================

const text = (
  value
) =>
  String(
    value ?? ""
  ).trim();


const numberValue = (
  value
) => {
  const parsed =
    Number(
      value
    );

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
};


const formatNumber = (
  value,
  maximumFractionDigits = 2
) => {
  const parsed =
    numberValue(
      value
    );

  if (
    parsed === null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-PH",
    {
      maximumFractionDigits,
    }
  ).format(
    parsed
  );
};


const formatKg = (
  value
) => {
  const formatted =
    formatNumber(
      value,
      2
    );

  return (
    formatted === "—"
      ? "—"
      : `${formatted} kg`
  );
};


const titleCase = (
  value
) => {
  const normalized =
    text(
      value
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /-/g,
        " "
      );

  if (!normalized) {
    return "—";
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (
        word
      ) =>
        word
          .charAt(0)
          .toUpperCase() +
        word
          .slice(1)
          .toLowerCase()
    )
    .join(" ");
};


// ============================================================
// API PAYLOAD NORMALIZATION
// ============================================================

const unwrapPayload = (
  payload
) => {
  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  if (
    payload.data &&
    typeof payload.data ===
      "object"
  ) {
    return payload.data;
  }

  if (
    payload.result &&
    typeof payload.result ===
      "object"
  ) {
    return payload.result;
  }

  return payload;
};


const normalizeList = (
  payload,
  possibleKeys = []
) => {
  if (
    Array.isArray(
      payload
    )
  ) {
    return payload;
  }

  const root =
    unwrapPayload(
      payload
    );

  if (
    Array.isArray(
      root
    )
  ) {
    return root;
  }

  if (
    !root ||
    typeof root !==
      "object"
  ) {
    return [];
  }

  for (
    const key
    of possibleKeys
  ) {
    if (
      Array.isArray(
        root[key]
      )
    ) {
      return root[key];
    }
  }

  return [];
};


const normalizeAIResult = (
  payload
) => {
  const root =
    unwrapPayload(
      payload
    ) || {};

  return (
    root.interpretation ||
    root.ai_interpretation ||
    root.forecast_interpretation ||
    root
  );
};


// ============================================================
// PRODUCT HELPERS
// ============================================================

const getProductType = (
  product
) =>
  text(
    product?.product_type ??
    product?.productType
  );


const getRiceVariety = (
  product
) =>
  text(
    product?.rice_variety ??
    product?.riceVariety
  );


const productKey = (
  product
) =>
  `${getProductType(
    product
  )}|||${getRiceVariety(
    product
  )}`;


const productLabel = (
  product
) => {
  const type =
    titleCase(
      getProductType(
        product
      )
    );

  const variety =
    getRiceVariety(
      product
    );

  if (
    type !== "—" &&
    variety
  ) {
    return `${variety} — ${type}`;
  }

  return (
    variety ||
    type ||
    "Unnamed Product"
  );
};


// ============================================================
// FARM HELPERS
// ============================================================

const getFarmId = (
  farm
) =>
  farm?.farm_id ??
  farm?.id ??
  null;


const getFarmName = (
  farm
) =>
  text(
    farm?.farm_name ??
    farm?.name
  ) ||
  "Registered Farm";


const farmAddress = (
  farm
) => {
  const values = [
    farm?.barangay,
    farm?.municipality,
    farm?.province,
  ]
    .map(text)
    .filter(Boolean);

  return values.join(
    ", "
  );
};


const farmSelectLabel = (
  farm
) => {
  const name =
    getFarmName(
      farm
    );

  const address =
    farmAddress(
      farm
    );

  return (
    address
      ? `${name} — ${address}`
      : name
  );
};


// ============================================================
// DATE HELPERS
// ============================================================

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const parsed =
    new Date(
      `${String(value).slice(
        0,
        10
      )}T00:00:00`
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return text(
      value
    ) || "—";
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        "numeric",
    }
  ).format(
    parsed
  );
};


const formatDateRange = (
  start,
  end
) => {
  if (
    !start &&
    !end
  ) {
    return "—";
  }

  if (
    start &&
    !end
  ) {
    return formatDate(
      start
    );
  }

  if (
    !start &&
    end
  ) {
    return formatDate(
      end
    );
  }

  return `${formatDate(
    start
  )} – ${formatDate(
    end
  )}`;
};


// ============================================================
// CLIMATE HELPERS
// ============================================================

const getForecastChartData = (
  climateResult
) =>
  climateResult
    ?.forecast
    ?.chart_data ||
  climateResult
    ?.forecast
    ?.chartData ||
  {};


const getHistoricalChartData = (
  climateResult
) =>
  climateResult
    ?.historical
    ?.chart_data ||
  climateResult
    ?.historical
    ?.chartData ||
  {};


const averageSeries = (
  rows
) => {
  if (
    !Array.isArray(
      rows
    ) ||
    !rows.length
  ) {
    return null;
  }

  const values =
    rows
      .map(
        (
          row
        ) =>
          numberValue(
            row?.value
          )
      )
      .filter(
        (
          value
        ) =>
          value !== null
      );

  if (
    !values.length
  ) {
    return null;
  }

  return (
    values.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    values.length
  );
};


const sumSeries = (
  rows
) => {
  if (
    !Array.isArray(
      rows
    ) ||
    !rows.length
  ) {
    return null;
  }

  const values =
    rows
      .map(
        (
          row
        ) =>
          numberValue(
            row?.value
          )
      )
      .filter(
        (
          value
        ) =>
          value !== null
      );

  if (
    !values.length
  ) {
    return null;
  }

  return values.reduce(
    (
      total,
      value
    ) =>
      total +
      value,
    0
  );
};


// ============================================================
// SHORT TEXT
// ============================================================

const firstSentence = (
  value,
  fallback = "—"
) => {
  const cleaned =
    text(
      value
    );

  if (!cleaned) {
    return fallback;
  }

  const match =
    cleaned.match(
      /^.*?[.!?](?:\s|$)/
    );

  if (
    match?.[0]
  ) {
    return match[0].trim();
  }

  return cleaned;
};


// ============================================================
// AI ACTION PARSING
// ============================================================

const parseActions = (
  value
) => {
  const cleaned =
    text(
      value
    );

  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/\n+/)
    .map(
      (
        item
      ) =>
        item
          .replace(
            /^[•●▪\-*]\s*/,
            ""
          )
          .trim()
    )
    .filter(Boolean);
};


const findAction = (
  actions,
  keywords
) =>
  actions.find(
    (
      action
    ) => {
      const lower =
        action.toLowerCase();

      return keywords.some(
        (
          keyword
        ) =>
          lower.includes(
            keyword
          )
      );
    }
  ) || "";


// ============================================================
// ERROR MESSAGE
// ============================================================

const errorMessage = (
  error,
  fallback
) =>
  text(
    error?.message ??
    error?.detail ??
    error?.error?.message ??
    error?.error
  ) ||
  fallback;


// ============================================================
// GEOLOCATION
// ============================================================

const getCurrentPosition =
  () =>
    new Promise(
      (
        resolve,
        reject
      ) => {

        if (
          !navigator
            ?.geolocation
        ) {
          reject(
            new Error(
              "Current location is not supported by this browser."
            )
          );

          return;
        }


        navigator
          .geolocation
          .getCurrentPosition(
            (
              position
            ) => {
              resolve({
                latitude:
                  position
                    .coords
                    .latitude,

                longitude:
                  position
                    .coords
                    .longitude,
              });
            },

            (
              error
            ) => {
              let message =
                "Unable to access your current location.";

              if (
                error?.code ===
                1
              ) {
                message =
                  "Location permission was denied. Please allow location access or select a registered farm.";
              }

              else if (
                error?.code ===
                2
              ) {
                message =
                  "Your current location is temporarily unavailable.";
              }

              else if (
                error?.code ===
                3
              ) {
                message =
                  "Getting your current location took too long. Please try again.";
              }

              reject(
                new Error(
                  message
                )
              );
            },

            {
              enableHighAccuracy:
                true,

              timeout:
                15000,

              maximumAge:
                300000,
            }
          );
      }
    );


// ============================================================
// SELECT CONTROL
// ============================================================

const SelectField = ({
  label,
  value,
  onChange,
  disabled = false,
  children,
}) => (
  <div
    className="
      min-w-0
    "
  >
    <label
      className="
        mb-1.5
        block
        text-xs
        font-semibold
        text-gray-500
      "
    >
      {label}
    </label>

    <div
      className="
        relative
      "
    >
      <select
        value={
          value
        }
        onChange={
          onChange
        }
        disabled={
          disabled
        }
        className="
          h-[38px]
          w-full
          appearance-none
          rounded-lg
          border
          border-gray-200
          bg-white
          px-3
          pr-9
          text-sm
          font-medium
          text-gray-700
          outline-none
          transition
          focus:border-green-600
          focus:ring-1
          focus:ring-green-600
          disabled:cursor-not-allowed
          disabled:bg-gray-50
          disabled:text-gray-400
        "
      >
        {children}
      </select>

      <ChevronDown
        size={15}
        className="
          pointer-events-none
          absolute
          right-3
          top-1/2
          -translate-y-1/2
          text-gray-400
        "
      />
    </div>
  </div>
);


// ============================================================
// SUMMARY ITEM
// ============================================================

const SummaryItem = ({
  label,
  value,
  children,
}) => (
  <div
    className="
      min-w-0
      py-3
    "
  >
    <p
      className="
        text-[11px]
        font-semibold
        text-gray-400
      "
    >
      {label}
    </p>

    {
      children || (
        <p
          className="
            mt-1
            text-sm
            font-semibold
            leading-5
            text-gray-800
          "
        >
          {value || "—"}
        </p>
      )
    }
  </div>
);


// ============================================================
// INSIGHT BLOCK
// ============================================================

const InsightBlock = ({
  title,
  children,
}) => (
  <div
    className="
      border-b
      border-gray-100
      py-4
      first:pt-0
      last:border-b-0
      last:pb-0
    "
  >
    <p
      className="
        text-sm
        font-bold
        text-gray-900
      "
    >
      {title}
    </p>

    <div
      className="
        mt-1.5
        text-sm
        leading-6
        text-gray-600
      "
    >
      {children}
    </div>
  </div>
);


// ============================================================
// HTML ESCAPE FOR REPORT
// ============================================================

const escapeHTML = (
  value
) =>
  text(
    value
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );


// ============================================================
// MAIN PAGE
// ============================================================

export default function ForecastInsights() {

  // =========================================================
  // FORECASTING HOOK
  // =========================================================

  const forecasting =
    useFarmerForecasting();


  const {
    loadForecastingFarms,
    loadDemandProducts,
    generateClimateForecast,
    generateDemandForecast,
    generateAIInterpretation,
  } =
    forecasting;


  // =========================================================
  // SOURCE DATA
  // =========================================================

  const [
    loadedFarms,
    setLoadedFarms,
  ] =
    useState([]);


  const [
    loadedProducts,
    setLoadedProducts,
  ] =
    useState([]);


  const [
    isLoadingSelections,
    setIsLoadingSelections,
  ] =
    useState(true);


  const [
    selectionError,
    setSelectionError,
  ] =
    useState("");


  // =========================================================
  // SELECTED VALUES
  // =========================================================

  const [
    selectedProductKey,
    setSelectedProductKey,
  ] =
    useState("");


  const [
    selectedLocationKey,
    setSelectedLocationKey,
  ] =
    useState("");


  const [
    selectedPeriod,
    setSelectedPeriod,
  ] =
    useState(
      "monthly"
    );


  // =========================================================
  // GENERATED RESULTS
  // =========================================================

  const [
    climateResult,
    setClimateResult,
  ] =
    useState(null);


  const [
    demandResult,
    setDemandResult,
  ] =
    useState(null);


  const [
    aiResult,
    setAiResult,
  ] =
    useState(null);


  const [
    currentCoordinates,
    setCurrentCoordinates,
  ] =
    useState(null);


  // =========================================================
  // GENERATION STATE
  // =========================================================

  const [
    isGenerating,
    setIsGenerating,
  ] =
    useState(false);


  const [
    generationStage,
    setGenerationStage,
  ] =
    useState("");


  const [
    generationError,
    setGenerationError,
  ] =
    useState("");


  const [
    aiWarning,
    setAiWarning,
  ] =
    useState("");


  // =========================================================
  // HOOK FALLBACK LISTS
  // =========================================================

  const hookFarms =
    normalizeList(
      forecasting?.farms ??
      forecasting?.forecastingFarms,
      [
        "farms",
        "results",
        "items",
      ]
    );


  const hookProducts =
    normalizeList(
      forecasting?.demandProducts ??
      forecasting?.products,
      [
        "products",
        "demand_products",
        "results",
        "items",
      ]
    );


  const farms =
    loadedFarms.length
      ? loadedFarms
      : hookFarms;


  const products =
    loadedProducts.length
      ? loadedProducts
      : hookProducts;


  // =========================================================
  // LOAD FARM + PRODUCT OPTIONS
  // =========================================================

  useEffect(
    () => {
      let cancelled =
        false;


      const loadSelections =
        async () => {

          setIsLoadingSelections(
            true
          );

          setSelectionError(
            ""
          );


          try {

            const [
              farmPayload,
              productPayload,
            ] =
              await Promise.all([
                typeof loadForecastingFarms ===
                "function"
                  ? loadForecastingFarms()
                  : Promise.resolve(
                      null
                    ),

                typeof loadDemandProducts ===
                "function"
                  ? loadDemandProducts()
                  : Promise.resolve(
                      null
                    ),
              ]);


            if (
              cancelled
            ) {
              return;
            }


            const farmRows =
              normalizeList(
                farmPayload,
                [
                  "farms",
                  "results",
                  "items",
                ]
              );


            const productRows =
              normalizeList(
                productPayload,
                [
                  "products",
                  "demand_products",
                  "results",
                  "items",
                ]
              );


            if (
              farmRows.length
            ) {
              setLoadedFarms(
                farmRows
              );
            }


            if (
              productRows.length
            ) {
              setLoadedProducts(
                productRows
              );
            }

          }

          catch (
            error
          ) {

            if (
              !cancelled
            ) {
              setSelectionError(
                errorMessage(
                  error,
                  "Unable to load Forecast Insights selections."
                )
              );
            }

          }

          finally {

            if (
              !cancelled
            ) {
              setIsLoadingSelections(
                false
              );
            }

          }

        };


      loadSelections();


      return () => {
        cancelled =
          true;
      };
    },
    [
      loadForecastingFarms,
      loadDemandProducts,
    ]
  );


  // =========================================================
  // AUTO-SELECT FIRST AVAILABLE PRODUCT
  // =========================================================

  useEffect(
    () => {

      if (
        selectedProductKey ||
        !products.length
      ) {
        return;
      }


      setSelectedProductKey(
        productKey(
          products[0]
        )
      );

    },
    [
      products,
      selectedProductKey,
    ]
  );


  // =========================================================
  // AUTO-SELECT FIRST REGISTERED FARM
  // =========================================================

  useEffect(
    () => {

      if (
        selectedLocationKey
      ) {
        return;
      }


      const firstFarm =
        farms.find(
          (
            farm
          ) =>
            getFarmId(
              farm
            )
        );


      if (
        firstFarm
      ) {
        setSelectedLocationKey(
          `farm:${getFarmId(
            firstFarm
          )}`
        );
      }

    },
    [
      farms,
      selectedLocationKey,
    ]
  );


  // =========================================================
  // SELECTED PRODUCT
  // =========================================================

  const selectedProduct =
    useMemo(
      () =>
        products.find(
          (
            product
          ) =>
            productKey(
              product
            ) ===
            selectedProductKey
        ) ||
        null,
      [
        products,
        selectedProductKey,
      ]
    );


  // =========================================================
  // SELECTED FARM
  // =========================================================

  const selectedFarm =
    useMemo(
      () => {

        if (
          !selectedLocationKey.startsWith(
            "farm:"
          )
        ) {
          return null;
        }


        const farmId =
          selectedLocationKey.slice(
            5
          );


        return (
          farms.find(
            (
              farm
            ) =>
              String(
                getFarmId(
                  farm
                )
              ) ===
              farmId
          ) ||
          null
        );

      },
      [
        farms,
        selectedLocationKey,
      ]
    );


  // =========================================================
  // SELECTED LOCATION DISPLAY
  // =========================================================

  const selectedLocationLabel =
    useMemo(
      () => {

        if (
          selectedLocationKey ===
          CURRENT_LOCATION_VALUE
        ) {

          if (
            currentCoordinates
          ) {
            return (
              `Current Location ` +
              `(${Number(
                currentCoordinates.latitude
              ).toFixed(
                5
              )}, ` +
              `${Number(
                currentCoordinates.longitude
              ).toFixed(
                5
              )})`
            );
          }

          return "Current Location";
        }


        if (
          selectedFarm
        ) {
          return farmSelectLabel(
            selectedFarm
          );
        }


        return "—";

      },
      [
        selectedLocationKey,
        selectedFarm,
        currentCoordinates,
      ]
    );


  // =========================================================
  // CLEAR STALE RESULTS WHEN SELECTION CHANGES
  // =========================================================

  const clearGeneratedResults =
    () => {
      setClimateResult(
        null
      );

      setDemandResult(
        null
      );

      setAiResult(
        null
      );

      setGenerationError(
        ""
      );

      setAiWarning(
        ""
      );
    };


  // =========================================================
  // PRODUCT CHANGE
  // =========================================================

  const handleProductChange =
    (
      event
    ) => {

      setSelectedProductKey(
        event.target.value
      );

      clearGeneratedResults();
    };


  // =========================================================
  // LOCATION CHANGE
  // =========================================================

  const handleLocationChange =
    (
      event
    ) => {

      const value =
        event.target.value;


      setSelectedLocationKey(
        value
      );


      if (
        value !==
        CURRENT_LOCATION_VALUE
      ) {
        setCurrentCoordinates(
          null
        );
      }


      clearGeneratedResults();
    };


  // =========================================================
  // PERIOD CHANGE
  // =========================================================

  const handlePeriodChange =
    (
      event
    ) => {

      setSelectedPeriod(
        event.target.value
      );

      clearGeneratedResults();
    };


  // =========================================================
  // GENERATE COMBINED INSIGHTS
  // =========================================================

  const handleGenerate =
    async () => {

      if (
        isGenerating
      ) {
        return;
      }


      setGenerationError(
        ""
      );

      setAiWarning(
        ""
      );


      if (
        !selectedProduct
      ) {
        setGenerationError(
          "Please select a Product / Rice Variety."
        );

        return;
      }


      if (
        !selectedLocationKey
      ) {
        setGenerationError(
          "Please select a registered farm or use your current location."
        );

        return;
      }


      if (
        typeof generateClimateForecast !==
          "function" ||
        typeof generateDemandForecast !==
          "function"
      ) {
        setGenerationError(
          "Forecasting service is not available."
        );

        return;
      }


      setIsGenerating(
        true
      );


      try {

        // ====================================================
        // LOCATION PAYLOAD
        // ====================================================

        let climateLocationPayload =
          null;


        if (
          selectedLocationKey ===
          CURRENT_LOCATION_VALUE
        ) {

          setGenerationStage(
            "Getting your current location..."
          );


          const coordinates =
            await getCurrentPosition();


          setCurrentCoordinates(
            coordinates
          );


          climateLocationPayload = {
            location_source:
              "current_location",

            latitude:
              coordinates.latitude,

            longitude:
              coordinates.longitude,

            location_label:
              "Current Location",
          };

        }

        else {

          const farmId =
            getFarmId(
              selectedFarm
            );


          if (
            !farmId
          ) {
            throw new Error(
              "The selected registered farm could not be found."
            );
          }


          climateLocationPayload = {
            location_source:
              "registered_farm",

            farm_id:
              Number(
                farmId
              ),
          };

        }


        // ====================================================
        // DEMAND PAYLOAD
        // ====================================================

        const demandPayload = {
          product_type:
            getProductType(
              selectedProduct
            ),

          rice_variety:
            getRiceVariety(
              selectedProduct
            ),

          granularity:
            selectedPeriod,

          horizon_periods:
            selectedPeriod ===
            "weekly"
              ? 12
              : 6,
        };


        // ====================================================
        // CLIMATE PAYLOAD
        //
        // 1-year history is enough for the Combined Insights
        // screen. Forecast horizon remains the backend's
        // six-month Copernicus outlook.
        // ====================================================

        const climatePayload = {
          ...climateLocationPayload,

          historical_years:
            1,

          display_granularity:
            selectedPeriod,
        };


        // ====================================================
        // RUN BOTH FORECASTS
        // ====================================================

        setGenerationStage(
          "Generating climate and demand forecasts..."
        );


        const [
          rawClimate,
          rawDemand,
        ] =
          await Promise.all([
            generateClimateForecast(
              climatePayload
            ),

            generateDemandForecast(
              demandPayload
            ),
          ]);


        const climate =
          unwrapPayload(
            rawClimate
          ) || {};


        const demand =
          unwrapPayload(
            rawDemand
          ) || {};


        setClimateResult(
          climate
        );

        setDemandResult(
          demand
        );


        // ====================================================
        // INSUFFICIENT DEMAND DATA
        //
        // Do not ask AI to invent a demand forecast.
        // ====================================================

        if (
          String(
            demand?.data_status ||
            ""
          ).toLowerCase() ===
          "insufficient"
        ) {

          setAiResult(
            null
          );


          setAiWarning(
            demand
              ?.insufficient_data_reason ||
            (
              "There is not enough historical demand data " +
              "to generate a supported combined forecast."
            )
          );


          return;
        }


        // ====================================================
        // COMBINED AI INTERPRETATION
        // ====================================================

        const climateRunId =
          climate
            ?.climate_forecast_run_id ??
          climate
            ?.forecast_run_id;


        const demandRunId =
          demand
            ?.demand_forecast_run_id ??
          demand
            ?.forecast_run_id;


        if (
          !climateRunId ||
          !demandRunId
        ) {

          setAiWarning(
            "The numerical forecasts were generated, but the combined AI interpretation could not be linked to the forecast runs."
          );

          return;
        }


        if (
          typeof generateAIInterpretation !==
          "function"
        ) {

          setAiWarning(
            "The numerical forecasts were generated, but the GrainRise Farm Helper is not currently available."
          );

          return;
        }


        setGenerationStage(
          "Preparing farmer-focused insights..."
        );


        try {

          const rawAI =
            await generateAIInterpretation({
              scope:
                "combined",

              interaction_type:
                "automatic",

              climate_forecast_run_id:
                climateRunId,

              demand_forecast_run_id:
                demandRunId,

              response_language:
                "taglish",
            });


          setAiResult(
            normalizeAIResult(
              rawAI
            )
          );

        }

        catch (
          error
        ) {

          // Numerical forecasts stay visible even when
          // Gemini/AI is temporarily busy.
          setAiResult(
            null
          );


          setAiWarning(
            errorMessage(
              error,
              (
                "Climate and demand forecasts were generated, " +
                "but the GrainRise Farm Helper is temporarily unavailable."
              )
            )
          );

        }

      }

      catch (
        error
      ) {

        setClimateResult(
          null
        );

        setDemandResult(
          null
        );

        setAiResult(
          null
        );


        setGenerationError(
          errorMessage(
            error,
            "Unable to generate Forecast Insights."
          )
        );

      }

      finally {

        setGenerationStage(
          ""
        );

        setIsGenerating(
          false
        );

      }

    };


  // =========================================================
  // RESULT VALUES
  // =========================================================

  const demandTrend =
    titleCase(
      demandResult
        ?.demand_trend ??
      demandResult
        ?.forecast_output
        ?.demand_trend
    );


  const forecastedDemand =
    demandResult
      ?.projected_total_quantity_kg ??
    demandResult
      ?.forecast_output
      ?.projected_total_quantity_kg;


  const peakPeriodStart =
    demandResult
      ?.peak_period_start ??
    demandResult
      ?.forecast_output
      ?.peak_period_start;


  const peakPeriodEnd =
    demandResult
      ?.peak_period_end ??
    demandResult
      ?.forecast_output
      ?.peak_period_end;


  const climateChart =
    getForecastChartData(
      climateResult
    );


  const rainfallRows =
    climateChart
      ?.precipitation_mm ||
    [];


  const temperatureRows =
    climateChart
      ?.temperature_c ||
    [];


  const rainfallTotal =
    sumSeries(
      rainfallRows
    );


  const temperatureAverage =
    averageSeries(
      temperatureRows
    );


  // =========================================================
  // AI VALUES
  // =========================================================

  const overallSummary =
    text(
      aiResult
        ?.explanation_text ??
      aiResult
        ?.response_text
    );


  const forecastReason =
    text(
      aiResult
        ?.forecast_reason_text
    );


  const learningGuidance =
    text(
      aiResult
        ?.learning_guidance_text
    );


  const actionItems =
    useMemo(
      () =>
        parseActions(
          aiResult
            ?.recommended_actions_text
        ),
      [
        aiResult,
      ]
    );


  // =========================================================
  // DERIVED FARMER-FOCUSED TEXT
  // =========================================================

  const demandOpportunity =
    useMemo(
      () => {

        if (
          !demandResult
        ) {
          return "—";
        }


        if (
          String(
            demandResult
              ?.data_status ||
            ""
          ).toLowerCase() ===
          "insufficient"
        ) {
          return (
            demandResult
              ?.insufficient_data_reason ||
            "Insufficient historical demand data."
          );
        }


        const quantity =
          formatKg(
            forecastedDemand
          );


        const peak =
          formatDateRange(
            peakPeriodStart,
            peakPeriodEnd
          );


        return (
          `GrainRise projects ${quantity} of demand ` +
          `for the selected forecast horizon. ` +
          `The current demand outlook is ${demandTrend.toLowerCase()}. ` +
          (
            peak !== "—"
              ? `The expected peak period is ${peak}.`
              : ""
          )
        ).trim();

      },
      [
        demandResult,
        forecastedDemand,
        peakPeriodStart,
        peakPeriodEnd,
        demandTrend,
      ]
    );


  const climateGrowingConsideration =
    useMemo(
      () => {

        if (
          forecastReason
        ) {
          return forecastReason;
        }


        if (
          rainfallTotal === null &&
          temperatureAverage === null
        ) {
          return "—";
        }


        const parts =
          [];


        if (
          rainfallTotal !==
          null
        ) {
          parts.push(
            (
              `The six-month climate outlook contains approximately ` +
              `${formatNumber(
                rainfallTotal,
                2
              )} mm of forecast rainfall.`
            )
          );
        }


        if (
          temperatureAverage !==
          null
        ) {
          parts.push(
            (
              `Average forecast temperature is approximately ` +
              `${formatNumber(
                temperatureAverage,
                2
              )} °C.`
            )
          );
        }


        parts.push(
          (
            "Use these climate values together with actual field conditions " +
            "when planning farm activities."
          )
        );


        return parts.join(
          " "
        );

      },
      [
        forecastReason,
        rainfallTotal,
        temperatureAverage,
      ]
    );


  const plantingAction =
    findAction(
      actionItems,
      [
        "plant",
        "tanim",
        "seed",
        "punla",
      ]
    );


  const productionAction =
    findAction(
      actionItems,
      [
        "production",
        "produce",
        "yield",
        "ani",
        "dami",
        "stock",
        "quantity",
      ]
    );


  const harvestAction =
    findAction(
      actionItems,
      [
        "harvest",
        "anihin",
        "pag-ani",
        "aani",
      ]
    );


  const plantingConsideration =
    plantingAction ||
    learningGuidance ||
    (
      climateResult
        ? (
          "Review the rainfall and temperature outlook before fixing the planting schedule. Actual field and water conditions should still be checked."
        )
        : "—"
    );


  const productionConsideration =
    productionAction ||
    (
      demandResult &&
      forecastedDemand !==
        null &&
      forecastedDemand !==
        undefined
        ? (
          `Use the ${formatKg(
            forecastedDemand
          )} demand forecast as a planning reference when deciding how much product to prepare. Avoid treating the forecast as a guaranteed sale.`
        )
        : "—"
    );


  const harvestConsideration =
    harvestAction ||
    (
      peakPeriodStart ||
      peakPeriodEnd
        ? (
          `Compare the expected demand peak (${formatDateRange(
            peakPeriodStart,
            peakPeriodEnd
          )}) with the farm's actual crop maturity and climate conditions before adjusting harvest timing.`
        )
        : (
          climateResult
            ? (
              "Base harvest timing primarily on actual crop maturity and field conditions while using the climate outlook as supporting information."
            )
            : "—"
        )
    );


  const riskWarning =
    useMemo(
      () => {

        if (
          aiWarning
        ) {
          return aiWarning;
        }


        if (
          String(
            demandResult
              ?.data_status ||
            ""
          ).toLowerCase() ===
          "insufficient"
        ) {
          return (
            demandResult
              ?.insufficient_data_reason ||
            "Insufficient historical demand data."
          );
        }


        if (
          climateResult &&
          demandResult
        ) {
          return (
            "Forecasts are decision-support estimates, not guarantees. " +
            "Copernicus climate values represent modeled climate information, " +
            "while demand projections are based on GrainRise historical demand data. " +
            "Always compare the results with actual farm and market conditions."
          );
        }


        return "—";

      },
      [
        aiWarning,
        climateResult,
        demandResult,
      ]
    );


  // =========================================================
  // CLIMATE SUITABILITY DISPLAY
  //
  // We intentionally do NOT invent a numeric "soil health" or
  // agronomic suitability score.
  // =========================================================

  const growingCondition =
    aiResult
      ? firstSentence(
          forecastReason ||
          overallSummary,
          "Combined climate interpretation available below."
        )
      : (
          climateResult
            ? "Climate outlook available — see Farmer-Focused Insights."
            : "—"
        );


  // =========================================================
  // TREND ICON
  // =========================================================

  const TrendIcon =
    () => {

      const normalized =
        text(
          demandResult
            ?.demand_trend
        ).toLowerCase();


      if (
        normalized.includes(
          "increase"
        ) ||
        normalized.includes(
          "up"
        )
      ) {
        return (
          <TrendingUp
            size={16}
            className="text-green-700"
          />
        );
      }


      if (
        normalized.includes(
          "decrease"
        ) ||
        normalized.includes(
          "down"
        )
      ) {
        return (
          <TrendingDown
            size={16}
            className="text-red-600"
          />
        );
      }


      return (
        <Minus
          size={16}
          className="text-gray-500"
        />
      );
    };


  // =========================================================
  // HAS RESULT
  // =========================================================

  const hasForecastResult =
    Boolean(
      climateResult &&
      demandResult
    );


  // =========================================================
  // DOWNLOAD / PRINT REPORT
  // =========================================================

  const handleDownloadReport =
    () => {

      if (
        !hasForecastResult
      ) {
        return;
      }


      const reportWindow =
        window.open(
          "",
          "_blank",
          "width=1000,height=760"
        );


      if (
        !reportWindow
      ) {
        setGenerationError(
          "The report window was blocked by the browser. Please allow pop-ups and try again."
        );

        return;
      }


      const generatedAt =
        new Intl.DateTimeFormat(
          "en-PH",
          {
            year:
              "numeric",

            month:
              "long",

            day:
              "numeric",

            hour:
              "numeric",

            minute:
              "2-digit",
          }
        ).format(
          new Date()
        );


      const actionHTML =
        (
          actionItems.length
            ? actionItems
            : [
                "No additional AI-generated farmer actions are currently available.",
              ]
        )
          .map(
            (
              action
            ) =>
              `<li>${escapeHTML(
                action
              )}</li>`
          )
          .join("");


      reportWindow
        .document
        .write(`
          <!doctype html>

          <html>
            <head>
              <meta charset="utf-8" />

              <title>
                GrainRise Forecast Insights Report
              </title>

              <style>
                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  padding: 36px;
                  font-family: Arial, Helvetica, sans-serif;
                  color: #1f2937;
                  background: #ffffff;
                  font-size: 13px;
                  line-height: 1.55;
                }

                h1 {
                  margin: 0;
                  color: #086b2c;
                  font-size: 25px;
                }

                h2 {
                  margin: 26px 0 10px;
                  padding-bottom: 7px;
                  border-bottom: 1px solid #e5e7eb;
                  font-size: 16px;
                  color: #111827;
                }

                h3 {
                  margin: 18px 0 5px;
                  font-size: 13px;
                  color: #111827;
                }

                p {
                  margin: 0;
                }

                .subtitle {
                  margin-top: 4px;
                  color: #6b7280;
                }

                .meta {
                  margin-top: 22px;
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 8px 24px;
                  padding: 15px;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                }

                .label {
                  color: #6b7280;
                  font-size: 11px;
                }

                .value {
                  margin-top: 2px;
                  font-weight: 700;
                }

                .summary {
                  display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 8px 24px;
                }

                .summary > div {
                  padding: 8px 0;
                  border-bottom: 1px solid #f3f4f6;
                }

                .warning {
                  margin-top: 8px;
                  padding: 12px;
                  border: 1px solid #fde68a;
                  background: #fffbeb;
                  border-radius: 8px;
                }

                .actions {
                  padding: 14px 18px;
                  border: 1px solid #bbf7d0;
                  background: #f0fdf4;
                  border-radius: 8px;
                }

                .actions li {
                  margin-bottom: 6px;
                }

                .footer {
                  margin-top: 30px;
                  padding-top: 12px;
                  border-top: 1px solid #e5e7eb;
                  color: #6b7280;
                  font-size: 10px;
                }

                @media print {
                  body {
                    padding: 14mm;
                  }
                }
              </style>
            </head>

            <body>

              <h1>
                GrainRise Forecast Insights Report
              </h1>

              <p class="subtitle">
                Combined Climate and Demand Forecast
              </p>


              <div class="meta">

                <div>
                  <div class="label">
                    Product / Rice Variety
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      productLabel(
                        selectedProduct
                      )
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Location
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      selectedLocationLabel
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Forecast Period
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      titleCase(
                        selectedPeriod
                      )
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Generated
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      generatedAt
                    )}
                  </div>
                </div>

              </div>


              <h2>
                Combined Forecast Summary
              </h2>


              <div class="summary">

                <div>
                  <div class="label">
                    Demand Outlook
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      demandTrend
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Forecasted Demand
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      formatKg(
                        forecastedDemand
                      )
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Peak Demand Period
                  </div>

                  <div class="value">
                    ${escapeHTML(
                      formatDateRange(
                        peakPeriodStart,
                        peakPeriodEnd
                      )
                    )}
                  </div>
                </div>


                <div>
                  <div class="label">
                    Rainfall Outlook
                  </div>

                  <div class="value">
                    ${
                      rainfallTotal === null
                        ? "—"
                        : escapeHTML(
                            `${formatNumber(
                              rainfallTotal,
                              2
                            )} mm total`
                          )
                    }
                  </div>
                </div>


                <div>
                  <div class="label">
                    Temperature Outlook
                  </div>

                  <div class="value">
                    ${
                      temperatureAverage === null
                        ? "—"
                        : escapeHTML(
                            `${formatNumber(
                              temperatureAverage,
                              2
                            )} °C average`
                          )
                    }
                  </div>
                </div>

              </div>


              <h2>
                Farmer-Focused Insights
              </h2>


              <h3>
                Overall Forecast Summary
              </h3>

              <p>
                ${escapeHTML(
                  overallSummary ||
                  (
                    "Combined climate and demand forecast " +
                    "was generated successfully."
                  )
                )}
              </p>


              <h3>
                Demand Opportunity
              </h3>

              <p>
                ${escapeHTML(
                  demandOpportunity
                )}
              </p>


              <h3>
                Climate / Growing Consideration
              </h3>

              <p>
                ${escapeHTML(
                  climateGrowingConsideration
                )}
              </p>


              <h3>
                Suggested Planting Consideration
              </h3>

              <p>
                ${escapeHTML(
                  plantingConsideration
                )}
              </p>


              <h3>
                Suggested Production / Yield Consideration
              </h3>

              <p>
                ${escapeHTML(
                  productionConsideration
                )}
              </p>


              <h3>
                Suggested Harvest Timing Consideration
              </h3>

              <p>
                ${escapeHTML(
                  harvestConsideration
                )}
              </p>


              <h3>
                Risk / Warning
              </h3>

              <div class="warning">
                ${escapeHTML(
                  riskWarning
                )}
              </div>


              <h3>
                Recommended Farmer Actions
              </h3>

              <div class="actions">
                <ul>
                  ${actionHTML}
                </ul>
              </div>


              <div class="footer">
                GrainRise uses Copernicus climate information
                for climate-informed farming support and GrainRise
                Time Series–Multiple Linear Regression for numerical
                demand forecasting. Forecasts are decision-support
                information and are not guarantees.
              </div>

            </body>
          </html>
        `);


      reportWindow
        .document
        .close();


      reportWindow
        .focus();


      window.setTimeout(
        () => {
          reportWindow.print();
        },
        300
      );

    };


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className="
        flex
        flex-col
        gap-5
      "
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div>
        <h3
          className="
            text-lg
            font-bold
            text-gray-900
          "
        >
          Forecast Insights
        </h3>

        <p
          className="
            mt-1
            text-sm
            text-gray-500
          "
        >
          Combine climate and demand forecasts to support
          farming, production, and selling decisions.
        </p>
      </div>


      {/* =====================================================
          SELECTIONS
      ====================================================== */}

      <section
        className="
          rounded-xl
          border
          border-gray-200
          bg-white
          p-5
          shadow-sm
        "
      >

        <div
          className="
            mb-4
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div>
            <h4
              className="
                text-sm
                font-bold
                text-gray-900
              "
            >
              Forecast Selection
            </h4>

            <p
              className="
                mt-0.5
                text-xs
                text-gray-500
              "
            >
              Select the product, location, and forecast period.
            </p>
          </div>

          {
            isLoadingSelections && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-medium
                  text-gray-500
                "
              >
                <Loader2
                  size={14}
                  className="
                    animate-spin
                    text-green-700
                  "
                />

                Loading options...
              </div>
            )
          }
        </div>


        <div
          className="
            grid
            grid-cols-1
            gap-4
            md:grid-cols-2
            xl:grid-cols-[1.25fr_1.5fr_0.75fr_auto]
            xl:items-end
          "
        >

          {/* PRODUCT */}

          <SelectField
            label="Selected Product / Variety"
            value={
              selectedProductKey
            }
            onChange={
              handleProductChange
            }
            disabled={
              isLoadingSelections ||
              !products.length
            }
          >
            <option value="">
              {
                products.length
                  ? "Select Product / Variety"
                  : "No products available"
              }
            </option>

            {
              products.map(
                (
                  product
                ) => (
                  <option
                    key={
                      productKey(
                        product
                      )
                    }
                    value={
                      productKey(
                        product
                      )
                    }
                  >
                    {
                      productLabel(
                        product
                      )
                    }
                  </option>
                )
              )
            }
          </SelectField>


          {/* LOCATION */}

          <SelectField
            label="Selected Location"
            value={
              selectedLocationKey
            }
            onChange={
              handleLocationChange
            }
            disabled={
              isLoadingSelections
            }
          >
            <option value="">
              Select Farm / Location
            </option>

            <option
              value={
                CURRENT_LOCATION_VALUE
              }
            >
              Use Current Location
            </option>

            {
              farms.length > 0 && (
                <optgroup
                  label="Registered Farms"
                >
                  {
                    farms
                      .filter(
                        (
                          farm
                        ) =>
                          getFarmId(
                            farm
                          )
                      )
                      .map(
                        (
                          farm
                        ) => (
                          <option
                            key={
                              getFarmId(
                                farm
                              )
                            }
                            value={
                              `farm:${getFarmId(
                                farm
                              )}`
                            }
                          >
                            {
                              farmSelectLabel(
                                farm
                              )
                            }
                          </option>
                        )
                      )
                  }
                </optgroup>
              )
            }
          </SelectField>


          {/* PERIOD */}

          <SelectField
            label="Forecast Period"
            value={
              selectedPeriod
            }
            onChange={
              handlePeriodChange
            }
          >
            {
              PERIOD_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )
            }
          </SelectField>


          {/* GENERATE */}

          <button
            type="button"
            onClick={
              handleGenerate
            }
            disabled={
              isGenerating ||
              !selectedProduct ||
              !selectedLocationKey
            }
            className="
              inline-flex
              h-[38px]
              items-center
              justify-center
              gap-2
              whitespace-nowrap
              rounded-lg
              bg-green-700
              px-4
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-green-800
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {
              isGenerating
                ? (
                  <>
                    <Loader2
                      size={16}
                      className="
                        animate-spin
                      "
                    />

                    Generating...
                  </>
                )
                : (
                  <>
                    <Sparkles
                      size={16}
                    />

                    Generate Insights
                  </>
                )
            }
          </button>

        </div>


        {/* SELECTED LOCATION DETAILS */}

        {
          selectedLocationKey && (
            <div
              className="
                mt-4
                flex
                flex-wrap
                items-center
                gap-x-5
                gap-y-2
                border-t
                border-gray-100
                pt-4
                text-xs
                text-gray-500
              "
            >
              <span
                className="
                  flex
                  items-center
                  gap-1.5
                "
              >
                {
                  selectedLocationKey ===
                  CURRENT_LOCATION_VALUE
                    ? (
                      <Navigation
                        size={13}
                        className="
                          text-green-700
                        "
                      />
                    )
                    : (
                      <MapPin
                        size={13}
                        className="
                          text-green-700
                        "
                      />
                    )
                }

                <span
                  className="
                    font-semibold
                    text-gray-700
                  "
                >
                  {
                    selectedLocationLabel
                  }
                </span>
              </span>

              {
                selectedProduct && (
                  <span>
                    Product:
                    {" "}

                    <span
                      className="
                        font-semibold
                        text-gray-700
                      "
                    >
                      {
                        productLabel(
                          selectedProduct
                        )
                      }
                    </span>
                  </span>
                )
              }

              <span>
                View:
                {" "}

                <span
                  className="
                    font-semibold
                    text-gray-700
                  "
                >
                  {
                    titleCase(
                      selectedPeriod
                    )
                  }
                </span>
              </span>
            </div>
          )
        }

      </section>


      {/* =====================================================
          SELECTION LOAD ERROR
      ====================================================== */}

      {
        selectionError && (
          <div
            className="
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-amber-200
              bg-amber-50
              px-4
              py-3
            "
          >
            <AlertCircle
              size={17}
              className="
                mt-0.5
                shrink-0
                text-amber-600
              "
            />

            <p
              className="
                text-sm
                text-amber-700
              "
            >
              {
                selectionError
              }
            </p>
          </div>
        )
      }


      {/* =====================================================
          GENERATION ERROR
      ====================================================== */}

      {
        generationError && (
          <div
            className="
              flex
              items-start
              justify-between
              gap-4
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
            "
          >
            <div
              className="
                flex
                items-start
                gap-3
              "
            >
              <AlertCircle
                size={17}
                className="
                  mt-0.5
                  shrink-0
                  text-red-600
                "
              />

              <p
                className="
                  text-sm
                  text-red-700
                "
              >
                {
                  generationError
                }
              </p>
            </div>

            <button
              type="button"
              onClick={
                handleGenerate
              }
              disabled={
                isGenerating
              }
              className="
                flex
                shrink-0
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


      {/* =====================================================
          GENERATING STATE
      ====================================================== */}

      {
        isGenerating && (
          <div
            className="
              flex
              min-h-[120px]
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-gray-300
              bg-white
            "
          >
            <div
              className="
                text-center
              "
            >
              <Loader2
                size={28}
                className="
                  mx-auto
                  animate-spin
                  text-green-700
                "
              />

              <p
                className="
                  mt-3
                  text-sm
                  font-semibold
                  text-gray-700
                "
              >
                {
                  generationStage ||
                  "Generating Forecast Insights..."
                }
              </p>

              <p
                className="
                  mt-1
                  max-w-md
                  text-xs
                  text-gray-500
                "
              >
                Copernicus climate retrieval may take longer
                when the location is not yet cached.
              </p>
            </div>
          </div>
        )
      }


      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {
        !isGenerating &&
        !hasForecastResult && (
          <div
            className="
              flex
              min-h-[150px]
              flex-col
              items-center
              justify-center
              rounded-xl
              border
              border-dashed
              border-gray-300
              bg-white
              px-6
              text-center
            "
          >
            <Lightbulb
              size={25}
              className="
                text-green-700
              "
            />

            <p
              className="
                mt-3
                text-sm
                font-semibold
                text-gray-800
              "
            >
              Select your forecast information
            </p>

            <p
              className="
                mt-1
                max-w-lg
                text-xs
                leading-5
                text-gray-500
              "
            >
              Choose a Product / Variety, your registered farm
              or current location, and a forecast period.
              Then click Generate Insights.
            </p>
          </div>
        )
      }


      {/* =====================================================
          RESULTS
      ====================================================== */}

      {
        !isGenerating &&
        hasForecastResult && (
          <>

            {/* =================================================
                AI WARNING
            ================================================== */}

            {
              aiWarning && (
                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-amber-200
                    bg-amber-50
                    px-4
                    py-3
                  "
                >
                  <AlertCircle
                    size={17}
                    className="
                      mt-0.5
                      shrink-0
                      text-amber-600
                    "
                  />

                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        text-amber-800
                      "
                    >
                      Forecast Notice
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-sm
                        text-amber-700
                      "
                    >
                      {
                        aiWarning
                      }
                    </p>
                  </div>
                </div>
              )
            }


            {/* =================================================
                COMBINED FORECAST SUMMARY
            ================================================== */}

            <section
              className="
                overflow-hidden
                rounded-xl
                border
                border-gray-200
                bg-white
                shadow-sm
              "
            >

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-3
                  border-b
                  border-gray-100
                  px-5
                  py-4
                "
              >
                <div>
                  <h4
                    className="
                      text-sm
                      font-bold
                      text-gray-900
                    "
                  >
                    Combined Forecast Summary
                  </h4>

                  <p
                    className="
                      mt-0.5
                      text-xs
                      text-gray-500
                    "
                  >
                    Climate and demand information for the
                    selected product and location.
                  </p>
                </div>

                <span
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-green-200
                    bg-green-50
                    px-2.5
                    py-1
                    text-[11px]
                    font-semibold
                    text-green-700
                  "
                >
                  <CheckCircle2
                    size={12}
                  />

                  Forecast Generated
                </span>
              </div>


              <div
                className="
                  px-5
                "
              >

                {/* ROW 1 */}

                <div
                  className="
                    grid
                    grid-cols-1
                    divide-y
                    divide-gray-100
                    border-b
                    border-gray-100
                    sm:grid-cols-2
                    sm:divide-x
                    sm:divide-y-0
                    xl:grid-cols-4
                  "
                >

                  <div
                    className="
                      sm:pr-5
                    "
                  >
                    <SummaryItem
                      label="Selected Rice Variety / Product"
                      value={
                        productLabel(
                          selectedProduct
                        )
                      }
                    />
                  </div>


                  <div
                    className="
                      sm:px-5
                    "
                  >
                    <SummaryItem
                      label="Demand Outlook"
                    >
                      <div
                        className="
                          mt-1
                          flex
                          items-center
                          gap-1.5
                        "
                      >
                        <TrendIcon />

                        <p
                          className="
                            text-sm
                            font-semibold
                            text-gray-800
                          "
                        >
                          {
                            demandTrend
                          }
                        </p>
                      </div>
                    </SummaryItem>
                  </div>


                  <div
                    className="
                      sm:pr-5
                      xl:px-5
                    "
                  >
                    <SummaryItem
                      label="Forecasted Demand Quantity"
                      value={
                        formatKg(
                          forecastedDemand
                        )
                      }
                    />
                  </div>


                  <div
                    className="
                      sm:pl-5
                    "
                  >
                    <SummaryItem
                      label="Peak Demand Period"
                      value={
                        formatDateRange(
                          peakPeriodStart,
                          peakPeriodEnd
                        )
                      }
                    />
                  </div>

                </div>


                {/* ROW 2 */}

                <div
                  className="
                    grid
                    grid-cols-1
                    divide-y
                    divide-gray-100
                    sm:grid-cols-3
                    sm:divide-x
                    sm:divide-y-0
                  "
                >

                  <div
                    className="
                      sm:pr-5
                    "
                  >
                    <SummaryItem
                      label="Rainfall Outlook"
                      value={
                        rainfallTotal ===
                        null
                          ? "—"
                          : (
                            `${formatNumber(
                              rainfallTotal,
                              2
                            )} mm total / 6 months`
                          )
                      }
                    />
                  </div>


                  <div
                    className="
                      sm:px-5
                    "
                  >
                    <SummaryItem
                      label="Temperature Outlook"
                      value={
                        temperatureAverage ===
                        null
                          ? "—"
                          : (
                            `${formatNumber(
                              temperatureAverage,
                              2
                            )} °C average`
                          )
                      }
                    />
                  </div>


                  <div
                    className="
                      sm:pl-5
                    "
                  >
                    <SummaryItem
                      label="Climate Suitability / Growing Condition"
                      value={
                        growingCondition
                      }
                    />
                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                FARMER-FOCUSED INSIGHTS
            ================================================== */}

            <section>

              <div
                className="
                  mb-3
                "
              >
                <h4
                  className="
                    text-sm
                    font-bold
                    text-gray-900
                  "
                >
                  Farmer-Focused Insights
                </h4>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-gray-500
                  "
                >
                  Simple interpretation of the combined forecast
                  to support practical farmer decisions.
                </p>
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-5
                  xl:grid-cols-3
                "
              >

                {/* =============================================
                    MAIN INSIGHTS
                ============================================== */}

                <div
                  className="
                    rounded-xl
                    border
                    border-gray-200
                    bg-white
                    p-5
                    shadow-sm
                    xl:col-span-2
                  "
                >

                  <InsightBlock
                    title="Overall Forecast Summary"
                  >
                    {
                      overallSummary ||
                      (
                        "The climate and demand forecasts were generated successfully. " +
                        "The GrainRise Farm Helper interpretation is not currently available."
                      )
                    }
                  </InsightBlock>


                  <InsightBlock
                    title="Demand Opportunity"
                  >
                    {
                      demandOpportunity
                    }
                  </InsightBlock>


                  <InsightBlock
                    title="Climate / Growing Consideration"
                  >
                    {
                      climateGrowingConsideration
                    }
                  </InsightBlock>


                  <div
                    className="
                      grid
                      grid-cols-1
                      gap-4
                      border-b
                      border-gray-100
                      py-4
                      md:grid-cols-3
                    "
                  >

                    <div
                      className="
                        rounded-lg
                        border
                        border-gray-100
                        bg-gray-50/70
                        p-3.5
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-bold
                          text-gray-900
                        "
                      >
                        Suggested Planting Consideration
                      </p>

                      <p
                        className="
                          mt-1.5
                          text-xs
                          leading-5
                          text-gray-600
                        "
                      >
                        {
                          plantingConsideration
                        }
                      </p>
                    </div>


                    <div
                      className="
                        rounded-lg
                        border
                        border-gray-100
                        bg-gray-50/70
                        p-3.5
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-bold
                          text-gray-900
                        "
                      >
                        Suggested Production / Yield Consideration
                      </p>

                      <p
                        className="
                          mt-1.5
                          text-xs
                          leading-5
                          text-gray-600
                        "
                      >
                        {
                          productionConsideration
                        }
                      </p>
                    </div>


                    <div
                      className="
                        rounded-lg
                        border
                        border-gray-100
                        bg-gray-50/70
                        p-3.5
                      "
                    >
                      <p
                        className="
                          text-xs
                          font-bold
                          text-gray-900
                        "
                      >
                        Suggested Harvest Timing Consideration
                      </p>

                      <p
                        className="
                          mt-1.5
                          text-xs
                          leading-5
                          text-gray-600
                        "
                      >
                        {
                          harvestConsideration
                        }
                      </p>
                    </div>

                  </div>


                  {
                    learningGuidance && (
                      <InsightBlock
                        title="Learning Guidance"
                      >
                        {
                          learningGuidance
                        }
                      </InsightBlock>
                    )
                  }

                </div>


                {/* =============================================
                    ACTIONS + WARNING
                ============================================== */}

                <div
                  className="
                    flex
                    flex-col
                    gap-4
                  "
                >

                  {/* RECOMMENDED ACTIONS */}

                  <div
                    className="
                      rounded-xl
                      border
                      border-green-200
                      bg-green-50
                      p-5
                      shadow-sm
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <CheckCircle2
                        size={18}
                        className="
                          text-green-700
                        "
                      />

                      <h5
                        className="
                          text-sm
                          font-bold
                          text-green-900
                        "
                      >
                        Recommended Farmer Actions
                      </h5>
                    </div>


                    {
                      actionItems.length
                        ? (
                          <div
                            className="
                              mt-4
                              space-y-3
                            "
                          >
                            {
                              actionItems.map(
                                (
                                  action,
                                  index
                                ) => (
                                  <div
                                    key={
                                      `${action}-${index}`
                                    }
                                    className="
                                      flex
                                      items-start
                                      gap-2
                                    "
                                  >
                                    <div
                                      className="
                                        mt-1
                                        shrink-0
                                        rounded-full
                                        bg-green-200
                                        p-0.5
                                      "
                                    >
                                      <CheckCircle2
                                        size={11}
                                        className="
                                          text-green-700
                                        "
                                      />
                                    </div>

                                    <p
                                      className="
                                        text-xs
                                        leading-5
                                        text-green-900
                                      "
                                    >
                                      {
                                        action
                                      }
                                    </p>
                                  </div>
                                )
                              )
                            }
                          </div>
                        )
                        : (
                          <p
                            className="
                              mt-3
                              text-xs
                              leading-5
                              text-green-800
                            "
                          >
                            No additional AI-generated actions
                            are currently available. Review the
                            climate and demand information before
                            making farm decisions.
                          </p>
                        )
                    }
                  </div>


                  {/* RISK / WARNING */}

                  <div
                    className="
                      rounded-xl
                      border
                      border-amber-200
                      bg-amber-50
                      p-5
                      shadow-sm
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >
                      <AlertCircle
                        size={18}
                        className="
                          text-amber-600
                        "
                      />

                      <h5
                        className="
                          text-sm
                          font-bold
                          text-amber-900
                        "
                      >
                        Risk / Warning
                      </h5>
                    </div>

                    <p
                      className="
                        mt-3
                        text-xs
                        leading-5
                        text-amber-800
                      "
                    >
                      {
                        riskWarning
                      }
                    </p>
                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                FORECAST INFORMATION + DOWNLOAD
            ================================================== */}

            <section
              className="
                flex
                flex-col
                gap-4
                rounded-xl
                border
                border-gray-200
                bg-white
                px-5
                py-4
                shadow-sm
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >

              <div
                className="
                  grid
                  flex-1
                  grid-cols-1
                  gap-x-8
                  gap-y-3
                  sm:grid-cols-2
                  xl:grid-cols-4
                "
              >
                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Product
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      productLabel(
                        selectedProduct
                      )
                    }
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Location
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      selectedLocationLabel
                    }
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Forecast Period
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      titleCase(
                        selectedPeriod
                      )
                    }
                  </p>
                </div>


                <div>
                  <p
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-gray-400
                    "
                  >
                    Climate Data Date
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      font-semibold
                      text-gray-700
                    "
                  >
                    {
                      climateResult
                        ?.forecast_issue_date
                        ? formatDate(
                            climateResult
                              .forecast_issue_date
                          )
                        : "—"
                    }
                  </p>
                </div>
              </div>


              <button
                type="button"
                onClick={
                  handleDownloadReport
                }
                className="
                  inline-flex
                  h-[38px]
                  shrink-0
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-green-700
                  bg-white
                  px-4
                  text-sm
                  font-semibold
                  text-green-700
                  transition
                  hover:bg-green-50
                "
              >
                <Download
                  size={16}
                />

                Download Forecast Insights Report
              </button>

            </section>

          </>
        )
      }

    </div>
  );
}