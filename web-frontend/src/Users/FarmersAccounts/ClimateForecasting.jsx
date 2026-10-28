import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Crosshair,
  Droplets,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  Sprout,
  ThermometerSun,
  Tractor,
} from "lucide-react";
import useFarmerForecasting from "../../Components/hooks/Farmer/useFarmerForecasting";
import { translations, useLanguagePreference } from "../../lib/translations";
const HISTORY_YEAR_OPTIONS = [1, 3, 5];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
function shortMonthLabel(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
  });
}
function buildAddressLine(farm) {
  return [
    farm?.barangay,
    farm?.municipality,
    farm?.province,
  ]
    .filter(Boolean)
    .join(", ");
}
function formatCoordinate(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? parsed.toFixed(5)
    : "—";
}
function normalizeSeries(points) {
  if (!Array.isArray(points)) return [];
  return points
    .map((item) => {
      const periodStart = item?.period_start;
      const date = new Date(periodStart);
      if (
        !periodStart ||
        Number.isNaN(date.getTime())
      ) {
        return null;
      }
      return {
        label: shortMonthLabel(periodStart),
        monthIndex: date.getMonth(),
        timestamp: date.getTime(),
        value: safeNumber(item?.value),
        unit: item?.unit || item?.unit_code || "",
        raw: item,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp);
}
function buildHistoricalMonthProfile(
  points,
  anchorMonthIndex = 0
) {
  const normalized = normalizeSeries(points);
  if (!normalized.length) return [];
  const bucket = normalized.reduce(
    (result, item) => {
      if (!result[item.monthIndex]) {
        result[item.monthIndex] = {
          monthIndex: item.monthIndex,
          total: 0,
          count: 0,
          unit: item.unit,
        };
      }
      result[item.monthIndex].total += item.value;
      result[item.monthIndex].count += 1;
      return result;
    },
    {}
  );
  const orderedMonths = Array.from(
    { length: 12 },
    (_, index) =>
      (anchorMonthIndex + index) % 12
  );
  return orderedMonths
    .map((monthIndex) => {
      const item = bucket[monthIndex];
      if (!item?.count) return null;
      return {
        label: MONTH_LABELS[monthIndex],
        monthIndex,
        value: item.total / item.count,
        unit: item.unit,
      };
    })
    .filter(Boolean);
}
function mapFarmToSelection(farm) {
  const name =
    farm?.farm_name ||
    "Registered Farm";
  const address = buildAddressLine(farm);
  return {
    type: "registered_farm",
    displayName: name,
    subtitle:
      address ||
      "Registered farm location",
    latitude: farm?.latitude ?? null,
    longitude: farm?.longitude ?? null,
    requestPayload: {
      location_source: "registered_farm",
      farm_id: farm?.farm_id,
    },
  };
}
function pickHighest(data) {
  if (!data?.length) return null;
  return data.reduce((highest, current) =>
    current.value > highest.value
      ? current
      : highest
  );
}
function pickLowest(data) {
  if (!data?.length) return null;
  return data.reduce((lowest, current) =>
    current.value < lowest.value
      ? current
      : lowest
  );
}
function buildRainPlainText(data) {
  if (!data.length) {
    return "Walang sapat na rainfall forecast data pa.";
  }
  const highest = pickHighest(data);
  const lowest = pickLowest(data);
  return (
    `Mas maraming ulan ang posibleng maranasan sa ${highest?.label}. ` +
    `Pinaka-kaunti naman ang forecast na ulan sa ${lowest?.label}.`
  );
}
function buildHeatPlainText(data) {
  if (!data.length) {
    return "Walang sapat na temperature forecast data pa.";
  }
  const highest = pickHighest(data);
  const lowest = pickLowest(data);
  return (
    `Pinaka-mainit ang posibleng buwan sa ${highest?.label}. ` +
    `Mas malamig naman ang forecast sa ${lowest?.label}.`
  );
}
function cleanRecommendationLine(value) {
  return String(value || "")
    .replace(/^\s*[•▪◦*-]\s*/, "")
    .replace(/^\s*\d+[.)]\s+/, "")
    .trim();
}
function splitRecommendationText(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const bulletParts = normalized
    .split(/(?:^|\n|\s)•\s+/g)
    .map(cleanRecommendationLine)
    .filter(Boolean);
  if (bulletParts.length > 1) {
    return bulletParts;
  }
  const lineParts = normalized
    .split(/\n+/)
    .map(cleanRecommendationLine)
    .filter(Boolean);
  if (lineParts.length > 1) {
    return lineParts;
  }
  return [cleanRecommendationLine(normalized)].filter(Boolean);
}
function EmptyChartState({ message }) {
  return (
    <div className="h-[180px] flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center px-6">
      <p className="text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}
function ChartCardHeader({
  icon,
  title,
  subtitle,
  iconColor = "text-blue-600",
}) {
  const Icon = icon;
  return (
    <div className="mb-4">
      <div
        className={`flex items-center gap-2 font-bold text-lg ${iconColor}`}
      >
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <p className="text-sm text-slate-500 mt-1">
        {subtitle}
      </p>
    </div>
  );
}
function RainBarChart({ data, emptyMessage }) {
  if (!data?.length) {
    return (
      <EmptyChartState message={emptyMessage || "No rainfall data available yet."} />
    );
  }
  const maxValue = Math.max(
    ...data.map((item) => item.value),
    0
  );
  const highest = pickHighest(data);
  const lowest = pickLowest(data);
  const barWidth = 34;
  const barGap = 20;
  const leftPadding = 18;
  const baselineY = 132;
  const chartHeight = 86;
  const svgWidth = Math.max(
    420,
    data.length * (barWidth + barGap) + 30
  );
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} 170`}
        className="w-full min-w-[340px] h-[170px]"
      >
        {data.map((item, index) => {
          const x =
            leftPadding +
            index * (barWidth + barGap);
          const height =
            maxValue > 0
              ? Math.max(
                  12,
                  (item.value / maxValue) * chartHeight
                )
              : 12;
          const y = baselineY - height;
          let fill = "#38BDF8";
          if (
            highest &&
            item.label === highest.label &&
            item.value === highest.value
          ) {
            fill = "#4F7DF3";
          } else if (
            lowest &&
            item.label === lowest.label &&
            item.value === lowest.value
          ) {
            fill = "#F59E0B";
          }
          return (
            <g key={`${item.label}-${index}`}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="8"
                fill={fill}
              />
              <text
                x={x + barWidth / 2}
                y={154}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-medium"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
function TemperatureLineChart({ data, emptyMessage }) {
  if (!data?.length) {
    return (
      <EmptyChartState message={emptyMessage || "No temperature data available yet."} />
    );
  }
  const values = data.map(
    (item) => item.value
  );
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const leftPadding = 24;
  const rightPadding = 24;
  const bottomY = 118;
  const graphHeight = 56;
  const svgWidth = Math.max(
    460,
    data.length * 66
  );
  const step =
    data.length > 1
      ? (svgWidth - leftPadding - rightPadding) /
        (data.length - 1)
      : 0;
  const points = data.map(
    (item, index) => {
      const x = leftPadding + step * index;
      const normalized =
        (item.value - minValue) / range;
      const y =
        bottomY -
        normalized * graphHeight;
      return {
        ...item,
        x,
        y,
        displayValue:
          `${Math.round(item.value)}°`,
      };
    }
  );
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} 170`}
        className="w-full min-w-[340px] h-[170px]"
      >
        <line
          x1={leftPadding}
          y1={bottomY}
          x2={svgWidth - rightPadding}
          y2={bottomY}
          stroke="#E2E8F0"
          strokeWidth="1"
        />
        <path
          d={path}
          fill="none"
          stroke="#F97316"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-semibold"
            >
              {point.displayValue}
            </text>
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              fill="#F97316"
            />
            <text
              x={point.x}
              y={148}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-medium"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
function YearPill({
  active,
  children,
  onClick,
  disabled,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
        active
          ? "bg-green-700 text-white shadow-sm"
          : "bg-transparent text-slate-500 hover:text-slate-700"
      } ${
        disabled
          ? "opacity-60 cursor-not-allowed"
          : ""
      }`}
    >
      {children}
    </button>
  );
}
function LocationCard({
  farm,
  selected,
  onClick,
}) {
  const address = buildAddressLine(farm);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition ${
        selected
          ? "border-green-600 bg-green-50"
          : "border-slate-200 bg-white hover:border-green-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            selected
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Tractor size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 truncate">
            {farm?.farm_name ||
              "Registered Farm"}
          </p>
          <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
            <MapPin
              size={14}
              className="mt-0.5 shrink-0"
            />
            <span>
              {address ||
                "Farm address not available"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold text-green-700">
              Farm Location
            </span>
            {farm?.latitude &&
            farm?.longitude ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {formatCoordinate(
                  farm.latitude
                )}
                , {formatCoordinate(
                  farm.longitude
                )}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                Coordinates will be resolved by GrainRise
              </span>
            )}
          </div>
        </div>
        {selected ? (
          <CheckCircle2
            size={18}
            className="text-green-600 mt-1"
          />
        ) : null}
      </div>
    </button>
  );
}
function ForecastHelperIntro({
  onClick,
  loading,
  error,
  t,
}) {
  return (
    <div className="rounded-[28px] border border-green-100 bg-white p-6 md:p-7 shadow-sm">
      <div className="flex items-center gap-3 font-bold text-slate-900">
        <div className="w-11 h-11 rounded-full bg-green-600 text-white flex items-center justify-center">
          <Sprout size={20} />
        </div>
        <span className="text-xl md:text-2xl">
          {t?.forecasting?.climate?.farmHelperTitle || "GrainRise Farm Helper"}
        </span>
      </div>
      <p className="text-slate-500 text-center mt-8 text-lg max-w-2xl mx-auto leading-relaxed">
        {t?.forecasting?.climate?.farmHelperIntro || "Want a simple explanation of what this weather means for your farm, and what to do about it?"}
      </p>
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-green-700 px-6 py-3 text-white font-bold hover:bg-green-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Sparkles size={18} />
          )}
          {t?.forecasting?.climate?.farmHelperButton || "Explain it to me"}
        </button>
      </div>
      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
          {error}
        </div>
      ) : null}
    </div>
  );
}
function ForecastHelperExpanded({
  aiInterpretation,
  climateNote,
  onRefresh,
  loading,
  error,
  t,
}) {
  const [showReason, setShowReason] =
    useState(false);
  const actions = splitRecommendationText(
    aiInterpretation?.recommended_actions_text
  );
  const explanation = String(
    aiInterpretation?.explanation_text || ""
  ).trim();
  const reason = String(
    aiInterpretation?.forecast_reason_text || ""
  ).trim();
  const learningGuidance = String(
    aiInterpretation?.learning_guidance_text || ""
  ).trim();
  return (
    <div className="rounded-[28px] border border-green-100 bg-white p-6 md:p-7 shadow-sm overflow-visible">
      {}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0">
            <Sprout size={20} />
          </div>
          <div>
            <h4 className="text-xl md:text-2xl font-bold text-slate-900">
              {t?.forecasting?.climate?.farmHelperTitle || "GrainRise Farm Helper"}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {t?.forecasting?.climate?.helperSubtitle || "Simpleng paliwanag para sa iyong sakahan"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 transition disabled:opacity-60"
        >
          {loading ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <RefreshCw size={16} />
          )}
          {t?.forecasting?.climate?.explainAgain || "Explain again"}
        </button>
      </div>
      {}
      <div className="mt-6 rounded-2xl bg-slate-50 px-5 py-5 border border-slate-100">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {t?.forecasting?.climate?.meaningTitle || "What does this mean?"}
        </p>
        <p className="mt-3 text-[16px] md:text-[17px] text-slate-700 leading-8 whitespace-pre-line break-words">
          {explanation ||
            t?.forecasting?.climate?.noExplanation || "Wala pang available na simpleng paliwanag."}
        </p>
      </div>
      {}
      <div className="mt-7">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
          {t?.forecasting?.climate?.actionsTitle || "What can you do?"}
        </p>
        <div className="mt-4 space-y-3">
          {actions.length ? (
            actions.map((action, index) => (
              <div
                key={`${index}-${action}`}
                className="w-full min-h-fit flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 overflow-visible"
              >
                <CheckCircle2
                  size={19}
                  className="text-green-600 mt-1 shrink-0"
                />
                <p className="min-w-0 flex-1 text-[15px] md:text-[16px] text-slate-700 leading-7 whitespace-pre-line break-words overflow-visible">
                  {action}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-slate-500 leading-7 whitespace-pre-line break-words">
                {t?.forecasting?.climate?.noAction || "Walang hiwalay na recommended action na ibinalik ang Farm Helper para sa request na ito."}
              </p>
            </div>
          )}
        </div>
      </div>
      {}
      {learningGuidance ? (
        <div className="mt-6 rounded-2xl border border-green-100 bg-[#F8FCF8] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            {t?.forecasting?.climate?.extraGuidance || "Dagdag na gabay"}
          </p>
          <p className="mt-2 text-sm md:text-[15px] text-slate-700 leading-7 whitespace-pre-line break-words">
            {learningGuidance}
          </p>
        </div>
      ) : null}
      {}
      {reason ? (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() =>
              setShowReason(
                (previous) => !previous
              )
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
          >
            <CircleAlert size={16} />
            {showReason
              ? t?.forecasting?.climate?.hideExplanation || "Itago ang paliwanag"
              : t?.forecasting?.climate?.whyForecast || "Bakit ganito ang forecast?"}
          </button>
          {showReason ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
              <p className="text-sm md:text-[15px] text-slate-600 leading-7 whitespace-pre-line break-words">
                {reason}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      {}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <CircleAlert
            size={18}
            className="text-amber-600 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-700 leading-6 whitespace-pre-line break-words">
            {climateNote ||
              t?.forecasting?.climate?.climateNote || "Hindi direktang sinusukat ng GrainRise ang kondisyon ng lupa. Ang payo ay batay sa weather at climate patterns."}
          </p>
        </div>
      </div>
      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
          {error}
        </div>
      ) : null}
    </div>
  );
}
export default function ClimateForecasting() {
  const [language] = useLanguagePreference();
  const t = translations[language]?.farmer ?? translations.en.farmer;

  const {
    farms,
    loadForecastingFarms,
    climateForecast,
    generateClimateForecast,
    aiInterpretation,
    generateAIInterpretation,
    clearAIInterpretation,
    loading,
    errors,
  } = useFarmerForecasting();
  const [screenMode, setScreenMode] =
    useState("select");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [selectedLocation, setSelectedLocation] =
    useState(null);
  const [activeSelection, setActiveSelection] =
    useState(null);
  const [historyYears, setHistoryYears] =
    useState(3);
  const [locationMessage, setLocationMessage] =
    useState("");
  useEffect(() => {
    loadForecastingFarms().catch(() => {});
  }, [loadForecastingFarms]);
  useEffect(() => {
    if (
      !selectedLocation &&
      farms?.length
    ) {
      setSelectedLocation(
        mapFarmToSelection(farms[0])
      );
    }
  }, [farms, selectedLocation]);
  const filteredFarms = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();
    if (!query) return farms || [];
    return (farms || []).filter(
      (farm) => {
        const haystack = [
          farm?.farm_name,
          farm?.barangay,
          farm?.municipality,
          farm?.province,
          farm?.geocoded_address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      }
    );
  }, [farms, searchTerm]);
  const handleUseCurrentLocation =
    useCallback(() => {
      setLocationMessage("");
      if (!navigator?.geolocation) {
        setLocationMessage(
          "This browser does not support current location."
        );
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude =
            position?.coords?.latitude;
          const longitude =
            position?.coords?.longitude;
          setSelectedLocation({
            type: "current_location",
            displayName: "Current Location",
            subtitle:
              "Your device's current coordinates",
            latitude,
            longitude,
            requestPayload: {
              location_source:
                "current_location",
              latitude,
              longitude,
              location_label:
                "Current Location",
            },
          });
          setLocationMessage(
            "Current location selected successfully."
          );
        },
        () => {
          setLocationMessage(
            "Unable to get your current location. Please allow location access."
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }, []);
  const runClimateForecast =
    useCallback(
      async (
        selection,
        yearsOverride = historyYears
      ) => {
        if (!selection?.requestPayload) {
          return;
        }
        clearAIInterpretation();
        const payload = {
          ...selection.requestPayload,
          historical_years:
            yearsOverride,
          display_granularity:
            "monthly",
        };
        const result =
          await generateClimateForecast(
            payload
          );
        if (result) {
          setActiveSelection(selection);
          setScreenMode("forecast");
        }
      },
      [
        clearAIInterpretation,
        generateClimateForecast,
        historyYears,
      ]
    );
  const handleConfirmLocation =
    useCallback(async () => {
      if (!selectedLocation) {
        setLocationMessage(
          "Please choose a farm or use your current location first."
        );
        return;
      }
      setLocationMessage("");
      try {
        await runClimateForecast(
          selectedLocation,
          historyYears
        );
      } catch {
      }
    }, [
      historyYears,
      runClimateForecast,
      selectedLocation,
    ]);
  const handleChangeHistoryYears =
    useCallback(
      async (years) => {
        setHistoryYears(years);
        if (!activeSelection) return;
        try {
          await runClimateForecast(
            activeSelection,
            years
          );
        } catch {
        }
      },
      [activeSelection, runClimateForecast]
    );
  const handleExplainForecast =
    useCallback(async () => {
      const runId =
        climateForecast
          ?.climate_forecast_run_id;
      if (!runId) return;
      try {
        await generateAIInterpretation({
          scope: "climate",
          climate_forecast_run_id:
            runId,
          response_language:
            "taglish",
        });
      } catch {
      }
    }, [
      climateForecast,
      generateAIInterpretation,
    ]);
  const forecastRain = useMemo(
    () =>
      normalizeSeries(
        climateForecast
          ?.forecast
          ?.chart_data
          ?.precipitation_mm || []
      ),
    [climateForecast]
  );
  const forecastHeat = useMemo(
    () =>
      normalizeSeries(
        climateForecast
          ?.forecast
          ?.chart_data
          ?.temperature_c || []
      ),
    [climateForecast]
  );
  const historyAnchorMonth =
    forecastRain[0]?.monthIndex ??
    new Date().getMonth();
  const historicalRain = useMemo(
    () =>
      buildHistoricalMonthProfile(
        climateForecast
          ?.historical
          ?.chart_data
          ?.precipitation_mm || [],
        historyAnchorMonth
      ),
    [
      climateForecast,
      historyAnchorMonth,
    ]
  );
  const historicalHeat = useMemo(
    () =>
      buildHistoricalMonthProfile(
        climateForecast
          ?.historical
          ?.chart_data
          ?.temperature_c || [],
        historyAnchorMonth
      ),
    [
      climateForecast,
      historyAnchorMonth,
    ]
  );
  const plainRainText = useMemo(
    () => buildRainPlainText(forecastRain),
    [forecastRain]
  );
  const plainHeatText = useMemo(
    () => buildHeatPlainText(forecastHeat),
    [forecastHeat]
  );
  const locationTitle =
    activeSelection?.displayName ||
    selectedLocation?.displayName ||
    t?.forecasting?.climate?.selectedLocation || "Selected Location";
  const locationSubtitle =
    activeSelection?.subtitle ||
    selectedLocation?.subtitle ||
    t?.forecasting?.climate?.locationDetails || "Location details";
  if (screenMode === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="font-bold text-slate-900 text-2xl">
            {t?.forecasting?.climate?.selectLocationTitle || "Select Location"}
          </h3>
          <p className="text-slate-500 mt-2">
            {t?.forecasting?.climate?.selectLocationSubtitle || "Choose the farm or location that GrainRise will use for the weather forecast."}
          </p>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder={t?.forecasting?.climate?.searchFarms || "Search registered farms"}
                  className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500"
                />
              </div>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t?.forecasting?.climate?.or || "or"}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button"
                onClick={
                  handleUseCurrentLocation
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-green-600 px-4 py-3 font-semibold text-green-700 hover:bg-green-50 transition"
              >
                <Crosshair size={18} />
                {t?.forecasting?.climate?.useCurrentLocation || "Use Current Location"}
              </button>
              {locationMessage ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    locationMessage
                      .toLowerCase()
                      .includes("unable") ||
                    locationMessage
                      .toLowerCase()
                      .includes("please") ||
                    locationMessage
                      .toLowerCase()
                      .includes("does not support")
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {locationMessage}
                </div>
              ) : null}
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t?.forecasting?.climate?.registeredFarms || "Registered Farms"}
                </p>
                {loading.farms ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle
                      size={14}
                      className="animate-spin"
                    />
                    {t?.forecasting?.climate?.loading || "Loading"}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 space-y-3 max-h-[470px] overflow-y-auto pr-1">
                {filteredFarms.length ? (
                  filteredFarms.map((farm) => {
                    const isSelected =
                      selectedLocation?.type ===
                        "registered_farm" &&
                      selectedLocation
                        ?.requestPayload
                        ?.farm_id ===
                        farm?.farm_id;
                    return (
                      <LocationCard
                        key={farm?.farm_id}
                        farm={farm}
                        selected={isSelected}
                        onClick={() =>
                          setSelectedLocation(
                            mapFarmToSelection(
                              farm
                            )
                          )
                        }
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
                    <p className="text-sm text-slate-500">
                      {t?.forecasting?.climate?.noFarmsFound || "No farms found for your search."}
                    </p>
                  </div>
                )}
              </div>
              {errors.farms ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
                  {errors.farms}
                </div>
              ) : null}
            </div>
          </div>
          <div className="xl:col-span-7">
            <div className="rounded-[28px] border border-slate-200 bg-[#F8FBF7] p-6 md:p-7 shadow-sm min-h-[520px] flex flex-col">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t?.forecasting?.climate?.locationPreview || "Location Preview"}
                </p>
                <h4 className="text-2xl font-bold text-slate-900 mt-2">
                  {t?.forecasting?.climate?.previewTitle || "We’ll use this place for the climate forecast"}
                </h4>
                <p className="text-slate-500 mt-2">
                  {t?.forecasting?.climate?.previewSubtitle || "This helps GrainRise know which weather data to check for your farm."}
                </p>
              </div>
              <div className="mt-6 flex-1 flex items-center">
                {selectedLocation ? (
                  <div className="w-full rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                        <MapPin size={28} />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          {t?.forecasting?.climate?.selectedLocation || "Selected Location"}
                        </p>
                        <h5 className="text-2xl font-bold text-slate-900 mt-1">
                          {selectedLocation.displayName}
                        </h5>
                        <p className="text-slate-500 mt-2">
                          {selectedLocation.subtitle}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                          <div className="rounded-2xl bg-slate-50 px-4 py-4 border border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              {t?.forecasting?.climate?.latitude || "Latitude"}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 mt-1">
                              {formatCoordinate(
                                selectedLocation.latitude
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-4 border border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              {t?.forecasting?.climate?.longitude || "Longitude"}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 mt-1">
                              {formatCoordinate(
                                selectedLocation.longitude
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-4">
                          <p className="text-sm text-green-700 leading-6">
                            {t?.forecasting?.climate?.previewSubtitle || "This helps GrainRise know which weather data to check for your farm."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                      <MapPin size={26} />
                    </div>
                    <h5 className="text-xl font-bold text-slate-900 mt-4">
                      {t?.forecasting?.climate?.noLocationSelected || "No location selected yet"}
                    </h5>
                    <p className="text-slate-500 mt-2 max-w-lg mx-auto">
                      {t?.forecasting?.climate?.noLocationSelectedSubtitle || "Choose one of your registered farms or use your current location."}
                    </p>
                  </div>
                )}
              </div>
              {errors.climate ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
                  {errors.climate}
                </div>
              ) : null}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={
                    handleConfirmLocation
                  }
                  disabled={
                    !selectedLocation ||
                    loading.climate
                  }
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-6 py-3 text-white font-bold hover:bg-green-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading.climate ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : null}
                  {t?.forecasting?.climate?.confirmLocation || "Confirm Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-2xl">
            Climate Forecast
          </h3>
          <p className="text-slate-500 mt-2">
            A simpler view of the forecast so farmers can understand it faster.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            setScreenMode("select")
          }
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800"
        >
          Change Location
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 md:p-7 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Forecast Location
            </p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1">
              {locationTitle}
            </h4>
            <p className="text-slate-500 mt-1">
              {locationSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50 min-w-[140px]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Latitude
              </p>
              <p className="font-semibold text-slate-900 mt-1">
                {formatCoordinate(
                  activeSelection?.latitude ||
                    selectedLocation?.latitude
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50 min-w-[140px]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Longitude
              </p>
              <p className="font-semibold text-slate-900 mt-1">
                {formatCoordinate(
                  activeSelection?.longitude ||
                    selectedLocation?.longitude
                )}
              </p>
            </div>
          </div>
        </div>
        {loading.climate &&
        !climateForecast ? (
          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <LoaderCircle
              size={28}
              className="animate-spin text-green-700 mx-auto mb-4"
            />
            <h5 className="font-bold text-slate-900 text-lg">
              GrainRise is preparing your climate forecast
            </h5>
            <p className="text-slate-500 mt-2">
              Please wait while we gather and summarize the weather data.
            </p>
          </div>
        ) : null}
        {climateForecast ? (
          <>
            {}
            <div className="mt-8 rounded-[24px] border border-green-100 bg-[#F8FCF8] p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-green-700">
                In simple words
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <Droplets size={18} />
                    <span>Rain</span>
                  </div>
                  <p className="text-slate-700 mt-3 leading-7">
                    {plainRainText}
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2 text-orange-600 font-bold">
                    <ThermometerSun size={18} />
                    <span>Heat</span>
                  </div>
                  <p className="text-slate-700 mt-3 leading-7">
                    {plainHeatText}
                  </p>
                </div>
              </div>
            </div>
            {}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <ChartCardHeader
                  icon={Droplets}
                  title="How much rain, month by month"
                  subtitle="Taller bar = more rain that month"
                  iconColor="text-blue-700"
                />
                <RainBarChart
                  data={forecastRain}
                />
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <ChartCardHeader
                  icon={ThermometerSun}
                  title="How hot it may get"
                  subtitle="Higher dot = hotter that month"
                  iconColor="text-orange-600"
                />
                <TemperatureLineChart
                  data={forecastHeat}
                />
              </div>
            </div>
            {}
            <div className="mt-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <h4 className="text-2xl font-bold text-slate-900">
                  How the weather has been
                </h4>
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                  {HISTORY_YEAR_OPTIONS.map(
                    (year) => (
                      <YearPill
                        key={year}
                        active={
                          historyYears === year
                        }
                        onClick={() =>
                          handleChangeHistoryYears(
                            year
                          )
                        }
                        disabled={
                          loading.climate
                        }
                      >
                        {year} year
                        {year > 1 ? "s" : ""}
                      </YearPill>
                    )
                  )}
                </div>
              </div>
              {loading.climate ? (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700">
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                  />
                  Updating historical view...
                </div>
              ) : null}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    Past Rain
                  </p>
                  <RainBarChart
                    data={historicalRain}
                  />
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    Past Heat
                  </p>
                  <TemperatureLineChart
                    data={historicalHeat}
                  />
                </div>
              </div>
            </div>
            {}
            <div className="mt-8">
              {aiInterpretation ? (
                <ForecastHelperExpanded
                  aiInterpretation={
                    aiInterpretation
                  }
                  climateNote={
                    climateForecast
                      ?.soil_land_note
                  }
                  onRefresh={
                    handleExplainForecast
                  }
                  loading={loading.ai}
                  error={errors.ai}
                />
              ) : (
                <ForecastHelperIntro
                  onClick={
                    handleExplainForecast
                  }
                  loading={loading.ai}
                  error={errors.ai}
                />
              )}
            </div>
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-start gap-3">
                <CircleAlert
                  size={18}
                  className="text-slate-500 mt-1 shrink-0"
                />
                <p className="text-sm text-slate-600 leading-7">
                  These charts show a simplified view of the climate forecast. The AI helper explains the result in easier words, but it does not create the forecast numbers itself.
                </p>
              </div>
            </div>
          </>
        ) : null}
        {errors.climate &&
        climateForecast ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
            {errors.climate}
          </div>
        ) : null}
      </div>
    </div>
  );
}
