import {
  CalendarDays,
  Warehouse,
  FileText,
  Leaf,
  Map,
} from "lucide-react";

import {
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import Breadcrumbs
  from "../../Components/Minor-Components/Breadcrumbs";

import KPICard
  from "../../Components/Graphs/KPICard";

import useFarmerDashboard
  from "../../Components/hooks/Farmer/useFarmerDashboard";


// ============================================================
// DATE / NUMBER HELPERS
// ============================================================

const formatDashboardDate = (date) =>
  date.toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );


const formatDashboardTime = (date) =>
  date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );


const formatMonth = (
  dateValue,
  format = "short"
) => {

  if (!dateValue) {
    return "";
  }


  const date = new Date(
    `${dateValue}T00:00:00`
  );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }


  return date.toLocaleDateString(
    "en-US",
    {
      month: format,
    }
  );
};


const formatArea = (value) => {

  const number =
    Number(value) || 0;


  return `${number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )} ha`;
};


const formatPeso = (value) => {

  const number =
    Number(value) || 0;


  return `₱${number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
};


const formatQuantity = (value) => {

  const number =
    Number(value) || 0;


  return number.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};


// ============================================================
// MARKET PRICE CHART HELPER
// ============================================================

const createMarketChart = (
  records
) => {

  const width = 400;
  const height = 150;

  const left = 42;
  const right = 18;
  const top = 15;
  const bottom = 28;


  const values =
    records
      .map(
        (record) =>
          record.average_price_per_kg
      )
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(
            Number(value)
          )
      )
      .map(Number);


  if (values.length === 0) {

    return {
      available: false,
      points: [],
      polyline: "",
      area: "",
      min: 0,
      middle: 0,
      max: 0,
    };

  }


  const rawMin =
    Math.min(...values);

  const rawMax =
    Math.max(...values);


  const padding =
    rawMax === rawMin
      ? Math.max(
          rawMax * 0.1,
          1
        )
      : Math.max(
          (
            rawMax -
            rawMin
          ) * 0.15,
          0.5
        );


  const min =
    Math.max(
      0,
      rawMin - padding
    );

  const max =
    rawMax + padding;


  const range =
    Math.max(
      max - min,
      1
    );


  const totalRecords =
    Math.max(
      records.length,
      1
    );


  const points =
    records
      .map(
        (
          record,
          index
        ) => {

          const value =
            record.average_price_per_kg;


          if (
            value === null ||
            value === undefined ||
            !Number.isFinite(
              Number(value)
            )
          ) {
            return null;
          }


          const x =
            totalRecords === 1
              ? (
                  left +
                  (
                    width -
                    left -
                    right
                  ) /
                    2
                )
              : (
                  left +
                  (
                    index /
                    (
                      totalRecords -
                      1
                    )
                  ) *
                    (
                      width -
                      left -
                      right
                    )
                );


          const y =
            top +
            (
              (
                max -
                Number(value)
              ) /
              range
            ) *
              (
                height -
                top -
                bottom
              );


          return {
            x,
            y,
            value:
              Number(value),
            record,
          };

        }
      )
      .filter(Boolean);


  const polyline =
    points
      .map(
        (point) =>
          `${point.x},${point.y}`
      )
      .join(" ");


  const baseline =
    height - bottom;


  const area =
    points.length > 1
      ? [
          `${points[0].x},${baseline}`,
          ...points.map(
            (point) =>
              `${point.x},${point.y}`
          ),
          `${
            points[
              points.length - 1
            ].x
          },${baseline}`,
        ].join(" ")
      : "";


  return {
    available: true,
    points,
    polyline,
    area,
    min,
    middle:
      (
        min +
        max
      ) / 2,
    max,
  };

};


// ============================================================
// HARVEST CHART HELPER
// ============================================================

const createYieldChart = (
  records
) => {

  const width = 400;
  const height = 150;

  const left = 42;
  const right = 12;
  const top = 12;
  const bottom = 30;


  const values =
    records
      .map(
        (record) =>
          Number(
            record.actual_yield_kg
          ) || 0
      )
      .filter(
        (value) =>
          value > 0
      );


  if (values.length === 0) {

    return {
      available: false,
      bars: [],
      max: 0,
    };

  }


  const rawMax =
    Math.max(...values);


  const max =
    Math.max(
      rawMax * 1.15,
      1
    );


  const drawableWidth =
    width -
    left -
    right;


  const drawableHeight =
    height -
    top -
    bottom;


  const slotWidth =
    drawableWidth /
    Math.max(
      records.length,
      1
    );


  const barWidth =
    Math.min(
      slotWidth * 0.55,
      42
    );


  const bars =
    records.map(
      (
        record,
        index
      ) => {

        const value =
          Number(
            record.actual_yield_kg
          ) || 0;


        const barHeight =
          (
            value /
            max
          ) *
          drawableHeight;


        const centerX =
          left +
          (
            slotWidth *
            index
          ) +
          (
            slotWidth /
            2
          );


        return {
          ...record,

          value,

          x:
            centerX -
            (
              barWidth /
              2
            ),

          centerX,

          y:
            top +
            drawableHeight -
            barHeight,

          height:
            barHeight,

          width:
            barWidth,

          label:
            `Cycle ${
              index + 1
            }`,
        };

      }
    );


  return {
    available: true,
    bars,
    max,
  };

};


// ============================================================
// CLIMATE CHART HELPER
// ============================================================

const createClimateChart = (
  records
) => {

  const width = 800;
  const height = 200;

  const left = 28;
  const right = 28;
  const top = 18;
  const bottom = 28;


  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {

    return {
      available: false,
      bars: [],
      temperaturePoints: [],
      temperaturePolyline: "",
      rainfallMax: 0,
      temperatureMin: 0,
      temperatureMax: 0,
    };

  }


  const rainfallValues =
    records
      .map(
        (record) =>
          Number(
            record.rainfall_mm
          ) || 0
      );


  const temperatureValues =
    records
      .map(
        (record) =>
          record.temperature_c
      )
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          Number.isFinite(
            Number(value)
          )
      )
      .map(Number);


  const rawRainfallMax =
    rainfallValues.length > 0
      ? Math.max(
          ...rainfallValues
        )
      : 0;


  const rainfallMax =
    Math.max(
      rawRainfallMax * 1.15,
      1
    );


  let temperatureMin = 0;
  let temperatureMax = 1;


  if (
    temperatureValues.length > 0
  ) {

    const rawMin =
      Math.min(
        ...temperatureValues
      );

    const rawMax =
      Math.max(
        ...temperatureValues
      );


    const padding =
      rawMax === rawMin
        ? 1
        : Math.max(
            (
              rawMax -
              rawMin
            ) * 0.2,
            0.5
          );


    temperatureMin =
      rawMin -
      padding;

    temperatureMax =
      rawMax +
      padding;

  }


  const temperatureRange =
    Math.max(
      temperatureMax -
      temperatureMin,
      1
    );


  const drawableWidth =
    width -
    left -
    right;


  const drawableHeight =
    height -
    top -
    bottom;


  const slotWidth =
    drawableWidth /
    Math.max(
      records.length,
      1
    );


  const barWidth =
    Math.min(
      slotWidth * 0.48,
      62
    );


  const bars =
    records.map(
      (
        record,
        index
      ) => {

        const rainfall =
          Number(
            record.rainfall_mm
          ) || 0;


        const centerX =
          left +
          slotWidth * index +
          slotWidth / 2;


        const barHeight =
          (
            rainfall /
            rainfallMax
          ) *
          drawableHeight;


        return {
          ...record,

          rainfall,

          centerX,

          x:
            centerX -
            barWidth / 2,

          y:
            top +
            drawableHeight -
            barHeight,

          width:
            barWidth,

          height:
            barHeight,
        };

      }
    );


  const temperaturePoints =
    records
      .map(
        (
          record,
          index
        ) => {

          const value =
            record.temperature_c;


          if (
            value === null ||
            value === undefined ||
            !Number.isFinite(
              Number(value)
            )
          ) {
            return null;
          }


          const centerX =
            left +
            slotWidth * index +
            slotWidth / 2;


          const y =
            top +
            (
              (
                temperatureMax -
                Number(value)
              ) /
              temperatureRange
            ) *
            drawableHeight;


          return {
            x: centerX,
            y,
            value:
              Number(value),
            record,
          };

        }
      )
      .filter(Boolean);


  return {
    available: true,

    bars,

    temperaturePoints,

    temperaturePolyline:
      temperaturePoints
        .map(
          (point) =>
            `${point.x},${point.y}`
        )
        .join(" "),

    rainfallMax,

    temperatureMin,

    temperatureMax,
  };

};


// ============================================================
// EMPTY CHART
// ============================================================

function EmptyChartState({
  message,
}) {

  return (
    <div className="flex h-full min-h-[170px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <p className="max-w-sm text-sm text-slate-500">
        {message}
      </p>
    </div>
  );

}


// ============================================================
// FARMER DASHBOARD
// ============================================================

export default function FarmerDashboard() {

  const navigate =
    useNavigate();


  const {
    kpis,

    palayMarketPriceTrend,

    yieldHistory,

    climateOutlook,

    isLoading,

    error,

    refreshDashboard,

    farmerUser,
  } =
    useFarmerDashboard();


  const now =
    new Date();


  const formattedDate =
    formatDashboardDate(
      now
    );


  const formattedTime =
    formatDashboardTime(
      now
    );


  // ==========================================================
  // KPI
  // ==========================================================

  const kpiMetrics =
    useMemo(
      () => [

        {
          title:
            "AVAILABLE MILLERS",

          value:
            isLoading
              ? "—"
              : kpis.available_millers,

          footer:
            "Millers available in the system",

          tone:
            "success",

          icon:
            (
              <Warehouse
                size={18}
                strokeWidth={2.2}
              />
            ),

          shortcutPath:
            "/farmer/contracts?tab=opportunities",

          shortcutLabel:
            "View available miller opportunities",
        },


        {
          title:
            "CONTRACTED MILLERS",

          value:
            isLoading
              ? "—"
              : kpis.contracted_millers,

          footer:
            "Millers with active contracts",

          tone:
            "neutral",

          icon:
            (
              <FileText
                size={18}
                strokeWidth={2.2}
              />
            ),

          shortcutPath:
            "/farmer/contracts?tab=current",

          shortcutLabel:
            "View current contracts with millers",
        },


        {
          title:
            "REGISTERED HARVEST AREA",

          value:
            isLoading
              ? "—"
              : formatArea(
                  kpis.registered_harvest_area_ha
                ),

          footer:
            "Registered area currently planted",

          tone:
            "success",

          icon:
            (
              <Leaf
                size={18}
                strokeWidth={2.2}
              />
            ),

          shortcutPath:
            "/farmer/farm-management?segment=my-farms&crop_status=planted_and_growing",

          shortcutLabel:
            "View farms with planted and growing crops",
        },


        {
          title:
            "POTENTIAL CROPPING AREA",

          value:
            isLoading
              ? "—"
              : formatArea(
                  kpis.potential_cropping_area_ha
                ),

          footer:
            "Total area available for cropping",

          tone:
            "warning",

          icon:
            (
              <Map
                size={18}
                strokeWidth={2.2}
              />
            ),

          shortcutPath:
            "/farmer/farm-management?segment=my-farms&crop_status=available_for_planting",

          shortcutLabel:
            "View farms available for cropping",
        },

      ],
      [
        isLoading,
        kpis,
      ]
    );


  // ==========================================================
  // CHART DATA
  // ==========================================================

  const marketChart =
    useMemo(
      () =>
        createMarketChart(
          palayMarketPriceTrend
        ),
      [
        palayMarketPriceTrend,
      ]
    );


  const yieldChart =
    useMemo(
      () =>
        createYieldChart(
          yieldHistory
        ),
      [
        yieldHistory,
      ]
    );


  const climateChart =
    useMemo(
      () =>
        createClimateChart(
          climateOutlook?.series ||
            []
        ),
      [
        climateOutlook,
      ]
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="space-y-5">


      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div className="space-y-1">

          <Breadcrumbs
            items={[
              {
                label:
                  "Main",
              },
              {
                label:
                  "Dashboard",
              },
            ]}
          />


          <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-slate-900">
            {farmerUser?.first_name ? `Welcome, ${farmerUser.first_name}` : "Farmer Dashboard"}
          </h2>


          <p className="text-sm text-slate-500">

            {isLoading
              ? "Loading dashboard data..."
              : `Last Updated: Today · ${formattedTime}`
            }

          </p>

        </div>


        <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm">

          <CalendarDays
            size={16}
            className="text-slate-500"
          />

          <span>
            {formattedDate}
          </span>

        </div>

      </div>


      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="flex flex-col gap-3 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="text-sm font-semibold text-red-700">
              Unable to load some dashboard information.
            </p>

            <p className="mt-0.5 text-xs text-red-600">
              {error}
            </p>

          </div>


          <button
            type="button"
            onClick={
              refreshDashboard
            }
            className="self-start rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>

        </div>

      )}


      {/* =====================================================
          KPI ROW
      ====================================================== */}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

        {kpiMetrics.map(
          ({
            shortcutPath,
            shortcutLabel,
            ...metric
          }) => (

            <KPICard
              key={
                metric.title
              }

              {...metric}

              ariaLabel={
                shortcutLabel
              }

              onClick={
                () =>
                  navigate(
                    shortcutPath
                  )
              }
            />

          )
        )}

      </div>


      {/* =====================================================
          CHARTS ROW 1
      ====================================================== */}

      <div className="grid gap-4 lg:grid-cols-2">


        {/* ===================================================
            PALAY MARKET PRICE
        ==================================================== */}

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">

          <h3 className="text-lg font-bold text-gray-900">
            Palay Market Price Trend
          </h3>


          <p className="mb-6 text-xs text-gray-500">
            Historical GrainRise buying price records (₱/kg)
          </p>


          <div className="relative h-48 w-full">

            {isLoading ? (

              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />

            ) : !marketChart.available ? (

              <EmptyChartState
                message="No Palay buying price records are available yet."
              />

            ) : (

              <svg
                viewBox="0 0 400 150"
                className="h-full w-full overflow-visible"
              >

                <defs>

                  <linearGradient
                    id="farmerMarketPriceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >

                    <stop
                      offset="0%"
                      stopColor="#0F9D2A"
                      stopOpacity="0.20"
                    />

                    <stop
                      offset="100%"
                      stopColor="#0F9D2A"
                      stopOpacity="0"
                    />

                  </linearGradient>

                </defs>


                {/* GRID */}

                <line
                  x1="42"
                  y1="15"
                  x2="382"
                  y2="15"
                  stroke="#f1f5f9"
                />

                <line
                  x1="42"
                  y1="68"
                  x2="382"
                  y2="68"
                  stroke="#f1f5f9"
                />

                <line
                  x1="42"
                  y1="122"
                  x2="382"
                  y2="122"
                  stroke="#f1f5f9"
                />


                {/* Y AXIS */}

                <text
                  x="0"
                  y="19"
                  className="fill-gray-400 text-[9px]"
                >
                  {formatPeso(
                    marketChart.max
                  )}
                </text>


                <text
                  x="0"
                  y="72"
                  className="fill-gray-400 text-[9px]"
                >
                  {formatPeso(
                    marketChart.middle
                  )}
                </text>


                <text
                  x="0"
                  y="126"
                  className="fill-gray-400 text-[9px]"
                >
                  {formatPeso(
                    marketChart.min
                  )}
                </text>


                {/* AREA */}

                {marketChart.area && (

                  <polygon
                    points={
                      marketChart.area
                    }
                    fill="url(#farmerMarketPriceGradient)"
                  />

                )}


                {/* LINE */}

                {marketChart.points.length > 1 && (

                  <polyline
                    points={
                      marketChart.polyline
                    }
                    fill="none"
                    stroke="#0F9D2A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                )}


                {/* POINTS */}

                {marketChart.points.map(
                  (
                    point,
                    index
                  ) => (

                    <circle
                      key={
                        `${
                          point.record.period_start
                        }-${index}`
                      }

                      cx={
                        point.x
                      }

                      cy={
                        point.y
                      }

                      r="4"

                      fill="white"

                      stroke="#0F9D2A"

                      strokeWidth="2"
                    >

                      <title>

                        {`${formatMonth(
                          point.record.period_start,
                          "long"
                        )}: ${formatPeso(
                          point.value
                        )}/kg`}

                      </title>

                    </circle>

                  )
                )}


                {/* X AXIS */}

                {palayMarketPriceTrend.map(
                  (
                    record,
                    index
                  ) => {

                    const total =
                      Math.max(
                        palayMarketPriceTrend.length -
                          1,
                        1
                      );


                    const x =
                      42 +
                      (
                        index /
                        total
                      ) *
                        340;


                    return (

                      <text
                        key={
                          record.period_start ||
                          index
                        }

                        x={
                          x
                        }

                        y="146"

                        className="fill-gray-400 text-[9px]"

                        textAnchor="middle"
                      >

                        {formatMonth(
                          record.period_start
                        )}

                      </text>

                    );

                  }
                )}

              </svg>

            )}

          </div>

        </div>


        {/* ===================================================
            HARVEST & YIELD HISTORY
        ==================================================== */}

        <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">

          <h3 className="text-lg font-bold text-gray-900">
            Harvest & Yield History
          </h3>


          <p className="mb-6 text-xs text-gray-500">
            Actual yield (kg) per cropping cycle
          </p>


          <div className="relative h-48 w-full">

            {isLoading ? (

              <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />

            ) : !yieldChart.available ? (

              <EmptyChartState
                message="No completed harvest records with actual yield are available yet."
              />

            ) : (

              <svg
                viewBox="0 0 400 150"
                className="h-full w-full overflow-visible"
              >

                {/* GRID */}

                <line
                  x1="42"
                  y1="12"
                  x2="388"
                  y2="12"
                  stroke="#f1f5f9"
                />

                <line
                  x1="42"
                  y1="66"
                  x2="388"
                  y2="66"
                  stroke="#f1f5f9"
                />

                <line
                  x1="42"
                  y1="120"
                  x2="388"
                  y2="120"
                  stroke="#f1f5f9"
                />


                {/* Y AXIS */}

                <text
                  x="0"
                  y="16"
                  className="fill-gray-400 text-[9px]"
                >
                  {`${formatQuantity(
                    yieldChart.max
                  )} kg`}
                </text>


                <text
                  x="0"
                  y="70"
                  className="fill-gray-400 text-[9px]"
                >
                  {`${formatQuantity(
                    yieldChart.max /
                      2
                  )} kg`}
                </text>


                <text
                  x="0"
                  y="124"
                  className="fill-gray-400 text-[9px]"
                >
                  0 kg
                </text>


                {/* BARS */}

                {yieldChart.bars.map(
                  (
                    bar,
                    index
                  ) => (

                    <g
                      key={
                        bar.crop_cycle_id ||
                        index
                      }
                    >

                      <rect
                        x={
                          bar.x
                        }

                        y="12"

                        width={
                          bar.width
                        }

                        height="108"

                        rx="3"

                        fill="#F8FAFC"
                      />


                      <rect
                        x={
                          bar.x
                        }

                        y={
                          bar.y
                        }

                        width={
                          bar.width
                        }

                        height={
                          bar.height
                        }

                        rx="3"

                        fill="#166534"
                      >

                        <title>

                          {[
                            bar.farm_name ||
                              "Farm",

                            bar.rice_variety ||
                              "Rice",

                            `${formatQuantity(
                              bar.value
                            )} kg`,
                          ].join(
                            " • "
                          )}

                        </title>

                      </rect>


                      <text
                        x={
                          bar.centerX
                        }

                        y="145"

                        className="fill-gray-400 text-[9px]"

                        textAnchor="middle"
                      >

                        {bar.label}

                      </text>

                    </g>

                  )
                )}

              </svg>

            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          6-MONTH CLIMATE OUTLOOK
      ====================================================== */}

      <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h3 className="text-lg font-bold text-gray-900">
              6-Month Climate Outlook
            </h3>


            <p className="mt-1 text-xs text-gray-500">
              Projected rainfall and temperature for your registered farm location.
            </p>

          </div>


          <div className="flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600">

            <Map
              size={12}
              className="shrink-0"
            />


            <span className="truncate">

              {climateOutlook?.location
                ? `Farm Location: ${climateOutlook.location}`
                : "No forecast location"
              }

            </span>

          </div>

        </div>


        {!isLoading &&
          climateChart.available && (

            <div className="mb-2 flex justify-end gap-4 pr-4 text-[10px] font-medium text-gray-600">

              <span className="flex items-center gap-1">

                <span className="block h-2 w-2 bg-green-700" />

                Rainfall (mm)

              </span>


              <span className="flex items-center gap-1">

                <span className="block h-0.5 w-2 bg-yellow-500" />

                Temp (°C)

              </span>

            </div>

          )}


        <div className="relative h-56 w-full px-4">

          {isLoading ? (

            <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />

          ) : !climateChart.available ? (

            <EmptyChartState
              message="No completed 6-month climate forecast is stored yet. Generate a climate forecast first to display the outlook here."
            />

          ) : (

            <svg
              viewBox="0 0 800 200"
              className="h-full w-full overflow-visible"
            >

              {/* GRID */}

              <line
                x1="28"
                y1="18"
                x2="772"
                y2="18"
                stroke="#f1f5f9"
              />

              <line
                x1="28"
                y1="69"
                x2="772"
                y2="69"
                stroke="#f1f5f9"
              />

              <line
                x1="28"
                y1="120"
                x2="772"
                y2="120"
                stroke="#f1f5f9"
              />

              <line
                x1="28"
                y1="172"
                x2="772"
                y2="172"
                stroke="#f1f5f9"
              />


              {/* LEFT Y AXIS */}

              <text
                x="20"
                y="22"
                className="fill-gray-400 text-[9px]"
                textAnchor="end"
              >
                {`${formatQuantity(
                  climateChart.rainfallMax
                )}mm`}
              </text>


              <text
                x="20"
                y="73"
                className="fill-gray-400 text-[9px]"
                textAnchor="end"
              >
                {`${formatQuantity(
                  climateChart.rainfallMax *
                    0.67
                )}mm`}
              </text>


              <text
                x="20"
                y="124"
                className="fill-gray-400 text-[9px]"
                textAnchor="end"
              >
                {`${formatQuantity(
                  climateChart.rainfallMax *
                    0.33
                )}mm`}
              </text>


              <text
                x="20"
                y="176"
                className="fill-gray-400 text-[9px]"
                textAnchor="end"
              >
                0mm
              </text>


              {/* RIGHT Y AXIS */}

              <text
                x="780"
                y="22"
                className="fill-gray-400 text-[9px]"
              >
                {`${climateChart.temperatureMax.toFixed(
                  1
                )}°C`}
              </text>


              <text
                x="780"
                y="98"
                className="fill-gray-400 text-[9px]"
              >
                {`${(
                  (
                    climateChart.temperatureMax +
                    climateChart.temperatureMin
                  ) /
                  2
                ).toFixed(
                  1
                )}°C`}
              </text>


              <text
                x="780"
                y="176"
                className="fill-gray-400 text-[9px]"
              >
                {`${climateChart.temperatureMin.toFixed(
                  1
                )}°C`}
              </text>


              {/* RAINFALL BARS */}

              {climateChart.bars.map(
                (
                  bar,
                  index
                ) => (

                  <g
                    key={
                      bar.period_start ||
                      index
                    }
                  >

                    <rect
                      x={
                        bar.x
                      }

                      y={
                        bar.y
                      }

                      width={
                        bar.width
                      }

                      height={
                        bar.height
                      }

                      rx="2"

                      fill="#0B7A2A"
                    >

                      <title>

                        {`${formatMonth(
                          bar.period_start,
                          "long"
                        )}: ${formatQuantity(
                          bar.rainfall
                        )} mm rainfall`}

                      </title>

                    </rect>


                    <text
                      x={
                        bar.centerX
                      }

                      y="194"

                      className="fill-gray-500 text-[10px] font-medium"

                      textAnchor="middle"
                    >

                      {formatMonth(
                        bar.period_start
                      )}

                    </text>

                  </g>

                )
              )}


              {/* TEMPERATURE LINE */}

              {climateChart.temperaturePoints.length >
                1 && (

                  <polyline
                    points={
                      climateChart.temperaturePolyline
                    }

                    fill="none"

                    stroke="#EAB308"

                    strokeWidth="2.5"

                    strokeLinecap="round"

                    strokeLinejoin="round"
                  />

                )}


              {/* TEMPERATURE POINTS */}

              {climateChart.temperaturePoints.map(
                (
                  point,
                  index
                ) => (

                  <circle
                    key={
                      `temperature-${index}`
                    }

                    cx={
                      point.x
                    }

                    cy={
                      point.y
                    }

                    r="3.5"

                    fill="#EAB308"
                  >

                    <title>

                      {`${formatMonth(
                        point.record.period_start,
                        "long"
                      )}: ${point.value.toFixed(
                        1
                      )}°C`}

                    </title>

                  </circle>

                )
              )}

            </svg>

          )}

        </div>

      </div>

    </div>

  );

}