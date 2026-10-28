import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
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
import Toast from "../../Components/Modals/Toast";
import useToast from "../../Components/hooks/useToast";
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

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "")
).replace(/\/$/, "") + "/api";

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
    farm?.street_address,
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
      className={`px-5 py-2 rounded-full text-sm font-semibold transition cursor-pointer ${
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

// Senior-Friendly Searchable Downward Dropdown Component
function SearchableDropdown({
  label,
  value,
  placeholder = "Select Option",
  options = [],
  onChange,
  disabled = false,
  loading = false,
  searchPlaceholder = "Type to search...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) => {
      const name = typeof opt === "string" ? opt : opt.name || opt.label || "";
      return name.toLowerCase().includes(term);
    });
  }, [options, searchTerm]);

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    const found = options.find((opt) => {
      const val = typeof opt === "string" ? opt : opt.name || opt.value;
      return val === value;
    });
    if (!found) return value;
    return typeof found === "string" ? found : found.name || found.label || found.value;
  }, [value, options, placeholder]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label ? (
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (!disabled && !loading) {
            setIsOpen((prev) => !prev);
            setSearchTerm("");
          }
        }}
        className={`w-full flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-sm font-medium transition cursor-pointer text-left ${
          disabled
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
            : isOpen
            ? "border-green-600 bg-white ring-2 ring-green-100 text-slate-800"
            : value
            ? "border-slate-300 bg-white text-slate-900"
            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
        }`}
      >
        <span className="truncate flex-1">
          {loading ? "Loading..." : displayValue}
        </span>
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {loading ? (
            <LoaderCircle size={15} className="animate-spin text-green-700" />
          ) : (
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-green-700" : ""}`}
            />
          )}
        </div>
      </button>

      {/* Strictly opens downward below the input */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden origin-top animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative flex items-center">
              <Search size={14} className="absolute left-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const optName = typeof opt === "string" ? opt : opt.name || opt.label || opt.value;
                const isSelected = optName === value;
                return (
                  <button
                    key={`${optName}-${idx}`}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition cursor-pointer ${
                      isSelected
                        ? "bg-green-100 text-green-900 font-bold"
                        : "text-slate-700 hover:bg-green-50 hover:text-green-800"
                    }`}
                  >
                    <span className="truncate">{optName}</span>
                    {isSelected ? <CheckCircle2 size={15} className="text-green-700 shrink-0 ml-2" /> : null}
                  </button>
                );
              })
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                No matching locations found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LocationCard({
  farm,
  selected,
  onClick,
}) {
  const address = farm?.geocoded_address || buildAddressLine(farm);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-4 transition cursor-pointer ${
        selected
          ? "border-green-600 bg-green-50/70 shadow-sm ring-1 ring-green-600"
          : "border-slate-200 bg-white hover:border-green-300 hover:bg-slate-50/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            selected
              ? "bg-green-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <Tractor size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-900 truncate">
              {farm?.farm_name || "Registered Farm"}
            </p>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700 shrink-0">
                <CheckCircle2 size={12} /> Active
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
            <MapPin
              size={14}
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <span className="line-clamp-2">
              {address || "Farm address not available"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-green-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-green-800">
              Registered Farm
            </span>
            {farm?.latitude &&
            farm?.longitude ? (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {formatCoordinate(farm.latitude)}, {formatCoordinate(farm.longitude)}
              </span>
            ) : null}
          </div>
        </div>
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
    <div className="rounded-[28px] border border-green-200/80 bg-white p-6 md:p-7 shadow-sm">
      <div className="flex items-center gap-3 font-bold text-slate-900">
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
          <Sprout size={22} />
        </div>
        <div>
          <span className="text-xl md:text-2xl">
            {t?.forecasting?.climate?.farmHelperTitle || "GrainRise Farm Helper"}
          </span>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Climate-Driven Agronomic Guidance
          </p>
        </div>
      </div>
      <p className="text-slate-600 text-center mt-7 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
        Want clear, practical agronomic guidance on what this 6-month climate forecast means for your rice crop, irrigation regulation, and fertilizer timing?
      </p>
      <div className="flex justify-center mt-6">
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl bg-green-700 px-6 py-3 text-white font-bold hover:bg-green-800 transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          {loading ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Sparkles size={18} />
          )}
          Explain it to me
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
  climateForecast,
  locationName,
  climateNote,
  onRefresh,
  loading,
  error,
  t,
}) {
  const [showReason, setShowReason] = useState(false);

  const waterParagraph = useMemo(() => {
    if (aiInterpretation?.water_and_irrigation) {
      return aiInterpretation.water_and_irrigation.trim();
    }
    const rainSeries = climateForecast?.forecast?.chart_data?.precipitation_mm || [];
    const maxRain = rainSeries.length ? Math.max(...rainSeries.map((p) => p.value || 0)) : 80;
    if (maxRain >= 150) {
      return `Given projected peak monthly precipitation reaching ${maxRain.toFixed(1)} mm across ${locationName || "your farm parcel"}, implement proactive paddy drainage management. Maintain water levels at a shallow 3–5 cm depth ahead of anticipated heavy rainfall windows to prevent complete canopy submergence and dike breaches. Clear secondary field ditches to ensure rapid drawdown of standing water, and avoid continuous deep flooding to minimize root zone anoxia.`;
    }
    if (maxRain >= 70) {
      return `Seasonal rainfall projections around ${locationName || "your farm parcel"} show moderate precipitation peaking at ${maxRain.toFixed(1)} mm. Practice Alternate Wetting and Drying (AWD) across your field by allowing ponded water to naturally subside to 15 cm below the soil surface before re-irrigating. This regime optimizes water utilization, promotes deep root anchorage, and prevents unnecessary irrigation pumping expenses.`;
    }
    return `Forecast indicators for ${locationName || "your farm parcel"} point toward a drier cropping window with light rainfall under 70 mm. Prioritize strict irrigation water conservation. Repair pilapil bunds to minimize seepage loss, coordinate irrigation rotation schedules with your local irrigators association, and maintain a consistent 2–3 cm shallow flood during critical panicle initiation and flowering stages.`;
  }, [aiInterpretation, climateForecast, locationName]);

  const nutrientParagraph = useMemo(() => {
    if (aiInterpretation?.nutrient_management) {
      return aiInterpretation.nutrient_management.trim();
    }
    const rainSeries = climateForecast?.forecast?.chart_data?.precipitation_mm || [];
    const maxRain = rainSeries.length ? Math.max(...rainSeries.map((p) => p.value || 0)) : 80;
    if (maxRain >= 120) {
      return "Coordinate split nitrogen and complete fertilizer top-dressing strictly alongside verified 3-day dry weather windows. Never broadcast granular fertilizer immediately prior to forecasted intense downpours to prevent heavy surface runoff and nitrate leaching losses beyond the root zone. Incorporate fertilizers into the mud layer during final weeding or drainage drawdown to maximize plant nutrient absorption.";
    }
    return "Calibrate fertilizer timing based on active vegetative tillering and panicle development stages. Apply nitrogen top-dressing when soil is moist but not excessively flooded to prevent volatile ammonia loss. Consider combining balanced NPK with zinc sulfate if prolonged cloud cover or reduced solar radiation is observed during mid-season.";
  }, [aiInterpretation, climateForecast]);

  const seasonalParagraph = useMemo(() => {
    if (aiInterpretation?.seasonal_recommendations) {
      return aiInterpretation.seasonal_recommendations.trim();
    }
    const rainSeries = climateForecast?.forecast?.chart_data?.precipitation_mm || [];
    const maxRain = rainSeries.length ? Math.max(...rainSeries.map((p) => p.value || 0)) : 80;
    if (maxRain >= 120) {
      return `With wet conditions prevailing in ${locationName || "your region"}, reinforce field dikes and inspect drainage spillways weekly to safeguard paddy structure against storm overflow. Regularly scout the canopy for sheath blight, bacterial leaf streak, and lodging risks favored by high humidity. If you are preparing for upcoming seeding, favor certified flood-tolerant or submergence-resistant varieties such as Submarino (NSIC Rc 682 / Rc 194).`;
    }
    return `Under the anticipated drier climate profile in ${locationName || "your region"}, prepare auxiliary water catchment basins and clear field canals of weeds to optimize irrigation delivery. Scout fields regularly for stem borer and green leafhopper activity, and select certified drought-tolerant or early-maturing varieties (such as Sahod Ulan / Katihan series) to ensure timely maturity within available water resources.`;
  }, [aiInterpretation, climateForecast, locationName]);

  const actions = splitRecommendationText(
    aiInterpretation?.recommended_actions_text
  );
  const reason = String(
    aiInterpretation?.forecast_reason_text || ""
  ).trim();
  const learningGuidance = String(
    aiInterpretation?.learning_guidance_text || ""
  ).trim();

  return (
    <div className="rounded-[28px] border border-green-200/80 bg-white p-6 md:p-7 shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sprout size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xl md:text-2xl font-bold text-slate-900">
                GrainRise Farm Helper
              </h4>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                AI Advisory
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Practical climate-driven agronomic guidance for {locationName || "your farm"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition disabled:opacity-60 cursor-pointer shadow-sm"
        >
          {loading ? (
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
          ) : (
            <RefreshCw size={16} />
          )}
          Explain again
        </button>
      </div>

      {/* Advisory Disclaimer Banner */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-900">
        <CircleAlert size={17} className="text-blue-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[12.5px]">
          <span className="font-bold">Agronomic Advisory Guidance:</span> Recommendations are projected based on seasonal Copernicus CDS weather conditions, historical patterns, and validated PhilRice rice production standards for {locationName || "the selected location"}. Adjust according to physical field inspection.
        </p>
      </div>

      {/* 3 Clearly Labeled Sections */}
      <div className="mt-6 space-y-4">
        {/* Section 1: Water & Irrigation */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5 text-blue-700 font-bold text-[16px]">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <Droplets size={16} />
              </div>
              <span>Water & Irrigation</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
              Paddy Water Regulation
            </span>
          </div>
          <p className="text-[14.5px] text-slate-700 leading-relaxed">
            {waterParagraph}
          </p>
        </div>

        {/* Section 2: Nutrient Management */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-[16px]">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Sprout size={16} />
              </div>
              <span>Nutrient Management</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
              Fertilizer Timing & Efficiency
            </span>
          </div>
          <p className="text-[14.5px] text-slate-700 leading-relaxed">
            {nutrientParagraph}
          </p>
        </div>

        {/* Section 3: Drought / Rainy Season Farming Recommendations */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5 text-amber-800 font-bold text-[16px]">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800">
                <ThermometerSun size={16} />
              </div>
              <span>Drought / Rainy Season Farming Recommendations</span>
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
              Resilience & Seed Varieties
            </span>
          </div>
          <p className="text-[14.5px] text-slate-700 leading-relaxed">
            {seasonalParagraph}
          </p>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Recommended Field Actions Checklist
        </p>
        <div className="space-y-2.5">
          {actions.length ? (
            actions.map((action, index) => (
              <div
                key={`${index}-${action}`}
                className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-slate-700"
              >
                <CheckCircle2
                  size={16}
                  className="text-emerald-600 mt-0.5 shrink-0"
                />
                <span className="text-[14px] leading-snug">
                  {action}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Scout paddy perimeter bunds and calibrate irrigation gates according to weekly weather updates.
            </div>
          )}
        </div>
      </div>

      {/* PhilRice Standards Note */}
      {learningGuidance ? (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-[#F8FCF8] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">
            PhilRice Agronomic Standards
          </p>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
            {learningGuidance}
          </p>
        </div>
      ) : null}

      {/* Technical Forecast Reasoning Toggle */}
      {reason ? (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() =>
              setShowReason(
                (previous) => !previous
              )
            }
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
          >
            <CircleAlert size={14} />
            {showReason
              ? "Hide technical reasoning"
              : "Why was this guidance generated?"}
          </button>
          {showReason ? (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
              {reason}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Soil Condition Disclaimer */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <CircleAlert
            size={18}
            className="text-amber-600 shrink-0 mt-0.5"
          />
          <p className="text-sm text-amber-700 leading-6 whitespace-pre-line break-words">
            {climateNote ||
              t?.forecasting?.climate?.climateNote ||
              "GrainRise does not directly measure sub-surface soil moisture in real-time. Guidance is synthesized from regional Copernicus CDS climate projections, seasonal monsoon models, and certified agronomic standards."}
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
    resolveLocationCoordinates,
    aiInterpretation,
    generateAIInterpretation,
    clearAIInterpretation,
    loading,
    errors,
  } = useFarmerForecasting();

  const [screenMode, setScreenMode] = useState("select");
  const [activeSource, setActiveSource] = useState(null); // "country_province_city" | "registered_farm" | "current_location"

  // Location Sources States
  const [selectedCountry] = useState("Philippines");
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState("");
  const [, setSelectedProvinceCode] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeSelection, setActiveSelection] = useState(null);
  const [historyYears, setHistoryYears] = useState(3);
  const [locationMessage, setLocationMessage] = useState("");
  const { toasts, showToast, removeToast } = useToast();

  // Load registered farms
  useEffect(() => {
    loadForecastingFarms().catch(() => {});
  }, [loadForecastingFarms]);

  // Load Philippine dynamic provinces on mount
  useEffect(() => {
    setLoadingProvinces(true);
    fetch(`${API_BASE_URL}/locations/provinces`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const list = Array.isArray(data?.results) ? data.results : [];
        const sorted = [...list].sort((a, b) =>
          String(a?.name || "").localeCompare(String(b?.name || ""))
        );
        setProvinces(sorted);
      })
      .catch(() => {
        setProvinces([]);
      })
      .finally(() => {
        setLoadingProvinces(false);
      });
  }, []);

  // Default to first registered farm if available and nothing selected yet
  useEffect(() => {
    if (!selectedLocation && !activeSource && farms?.length) {
      const first = farms[0];
      setActiveSource("registered_farm");
      setSelectedLocation({
        type: "registered_farm",
        farmId: first.farm_id,
        displayName: first.farm_name || "Registered Farm",
        subtitle: first.geocoded_address || buildAddressLine(first) || "Registered farm location",
        latitude: first.latitude ?? null,
        longitude: first.longitude ?? null,
        requestPayload: {
          location_source: "registered_farm",
          farm_id: first.farm_id,
          latitude: first.latitude,
          longitude: first.longitude,
          location_label: first.farm_name,
        },
      });
    }
  }, [farms, selectedLocation, activeSource]);

  // 1. Source A: Select Province
  const handleSelectProvince = useCallback((prov) => {
    const provName = typeof prov === "string" ? prov : prov.name;
    const provCode = typeof prov === "string" ? "" : prov.code;

    setActiveSource("country_province_city");
    setSelectedProvince(provName);
    setSelectedProvinceCode(provCode);
    setSelectedCity("");
    setCities([]);
    setSelectedLocation(null);
    setLocationMessage("");

    if (provCode) {
      setLoadingCities(true);
      fetch(`${API_BASE_URL}/locations/provinces/${encodeURIComponent(provCode)}/cities-municipalities`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const list = Array.isArray(data?.results) ? data.results : [];
          const sorted = [...list].sort((a, b) =>
            String(a?.name || "").localeCompare(String(b?.name || ""))
          );
          setCities(sorted);
        })
        .catch(() => {
          setCities([]);
        })
        .finally(() => {
          setLoadingCities(false);
        });
    }
  }, []);

  // 1. Source A: Select City
  const handleSelectCity = useCallback(
    async (cityObj) => {
      const cityName = typeof cityObj === "string" ? cityObj : cityObj.name;
      setActiveSource("country_province_city");
      setSelectedCity(cityName);
      setLocationMessage("");
      setLoadingCoords(true);

      try {
        const resolved = await resolveLocationCoordinates({
          province: selectedProvince,
          city: cityName,
        });

        const lat = resolved?.latitude ?? null;
        const lon = resolved?.longitude ?? null;

        setSelectedLocation({
          type: "country_province_city",
          displayName: `${cityName}, ${selectedProvince}`,
          subtitle: `${cityName}, ${selectedProvince}, Philippines`,
          latitude: lat,
          longitude: lon,
          requestPayload: {
            location_source: "cascading_location",
            latitude: lat,
            longitude: lon,
            location_label: `${cityName}, ${selectedProvince}`,
            province: selectedProvince,
            city: cityName,
          },
        });
      } catch {
        setSelectedLocation({
          type: "country_province_city",
          displayName: `${cityName}, ${selectedProvince}`,
          subtitle: `${cityName}, ${selectedProvince}, Philippines`,
          latitude: null,
          longitude: null,
          requestPayload: {
            location_source: "cascading_location",
            location_label: `${cityName}, ${selectedProvince}`,
            province: selectedProvince,
            city: cityName,
          },
        });
      } finally {
        setLoadingCoords(false);
      }
    },
    [resolveLocationCoordinates, selectedProvince]
  );

  // 2. Source B: Select Registered Farm
  const handleSelectFarm = useCallback((farm) => {
    setActiveSource("registered_farm");
    setSelectedProvince("");
    setSelectedProvinceCode("");
    setSelectedCity("");
    setCities([]);
    setLocationMessage("");

    setSelectedLocation({
      type: "registered_farm",
      farmId: farm.farm_id,
      displayName: farm.farm_name || "Registered Farm",
      subtitle: farm.geocoded_address || buildAddressLine(farm) || "Registered farm location",
      latitude: farm.latitude ?? null,
      longitude: farm.longitude ?? null,
      requestPayload: {
        location_source: "registered_farm",
        farm_id: farm.farm_id,
        latitude: farm.latitude,
        longitude: farm.longitude,
        location_label: farm.farm_name,
      },
    });
  }, []);

  // 3. Source C: Use Current Location
  const handleUseCurrentLocation = useCallback(() => {
    setLocationMessage("");
    setSelectedProvince("");
    setSelectedProvinceCode("");
    setSelectedCity("");
    setCities([]);

    if (!navigator?.geolocation) {
      setLocationMessage("This browser does not support current location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position?.coords?.latitude;
        const longitude = position?.coords?.longitude;

        setActiveSource("current_location");
        setSelectedLocation({
          type: "current_location",
          displayName: "Current Location",
          subtitle: `Device coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
          latitude,
          longitude,
          requestPayload: {
            location_source: "current_location",
            latitude,
            longitude,
            location_label: "Current Location",
          },
        });
        setLocationMessage("");
        showToast({
          type: "success",
          title: "Location Updated",
          message: "Current device location selected.",
          duration: 3500,
        });
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
  }, [showToast]);

  // Run Climate Forecast
  const runClimateForecast = useCallback(
    async (selection, yearsOverride = historyYears) => {
      if (!selection?.requestPayload) return null;
      clearAIInterpretation();
      const payload = {
        ...selection.requestPayload,
        historical_years: yearsOverride,
        display_granularity: "monthly",
      };
      const result = await generateClimateForecast(payload);
      if (result && !result.timeout) {
        setActiveSelection(selection);
        setScreenMode("forecast");
        return result;
      }
      return result;
    },
    [clearAIInterpretation, generateClimateForecast, historyYears]
  );

  // Confirm Location Button
  const handleConfirmLocation = useCallback(async () => {
    if (!selectedLocation) {
      setLocationMessage(
        "Please choose a farm, select a province and municipality, or use current location."
      );
      return;
    }
    setLocationMessage("");
    try {
      const result = await runClimateForecast(selectedLocation, historyYears);
      if (result && !result.timeout) {
        showToast({
          type: "success",
          title: "Location Confirmed",
          message: `Forecast loaded for ${selectedLocation.displayName}.`,
          duration: 4000,
        });
      }
    } catch {
      // Handled by hook errors
    }
  }, [historyYears, runClimateForecast, selectedLocation, showToast]);

  const handleChangeHistoryYears = useCallback(
    async (years) => {
      setHistoryYears(years);
      if (!activeSelection) return;
      try {
        await runClimateForecast(activeSelection, years);
      } catch {
        // Handled by hook
      }
    },
    [activeSelection, runClimateForecast]
  );

  const handleExplainForecast = useCallback(async () => {
    const runId = climateForecast?.climate_forecast_run_id;
    if (!runId) return;
    try {
      await generateAIInterpretation({
        scope: "climate",
        climate_forecast_run_id: runId,
        response_language: "en",
      });
    } catch {
      // Handled by hook
    }
  }, [climateForecast, generateAIInterpretation]);

  const forecastRain = useMemo(
    () =>
      normalizeSeries(
        climateForecast?.forecast?.chart_data?.precipitation_mm || []
      ),
    [climateForecast]
  );

  const forecastHeat = useMemo(
    () =>
      normalizeSeries(
        climateForecast?.forecast?.chart_data?.temperature_c || []
      ),
    [climateForecast]
  );

  const historyAnchorMonth =
    forecastRain[0]?.monthIndex ?? new Date().getMonth();

  const historicalRain = useMemo(
    () =>
      buildHistoricalMonthProfile(
        climateForecast?.historical?.chart_data?.precipitation_mm || [],
        historyAnchorMonth
      ),
    [climateForecast, historyAnchorMonth]
  );

  const historicalHeat = useMemo(
    () =>
      buildHistoricalMonthProfile(
        climateForecast?.historical?.chart_data?.temperature_c || [],
        historyAnchorMonth
      ),
    [climateForecast, historyAnchorMonth]
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
    t?.forecasting?.climate?.selectedLocation ||
    "Selected Location";

  const locationSubtitle =
    activeSelection?.subtitle ||
    selectedLocation?.subtitle ||
    t?.forecasting?.climate?.locationDetails ||
    "Location details";

  if (screenMode === "select") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="font-bold text-slate-900 text-2xl">
            {t?.forecasting?.climate?.selectLocationTitle || "Select Location"}
          </h3>
          <p className="text-slate-500 mt-2">
            {t?.forecasting?.climate?.selectLocationSubtitle ||
              "Choose the farm or location that GrainRise will use for the weather forecast."}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 flex flex-col gap-4">
            {/* SOURCE A: Country / Province / City Selection */}
            <div
              className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                activeSource === "country_province_city"
                  ? "border-green-600 ring-2 ring-green-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-green-700" />
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Select Location
                  </h4>
                </div>
                {activeSource === "country_province_city" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">
                    <CheckCircle2 size={12} /> Active Source
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Choose Country, Province, and City/Municipality across complete Philippine PSGC locations.
              </p>

              <div className="space-y-3">
                {/* 1. Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Country
                  </label>
                  <select
                    value={selectedCountry}
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-700 outline-none cursor-default"
                  >
                    <option value="Philippines">Philippines</option>
                  </select>
                </div>

                {/* 2. Province Dropdown */}
                <SearchableDropdown
                  label="Province"
                  value={selectedProvince}
                  placeholder="Select Province"
                  options={provinces}
                  onChange={handleSelectProvince}
                  loading={loadingProvinces}
                  searchPlaceholder="Search province..."
                />

                {/* 3. City / Municipality Dropdown */}
                <SearchableDropdown
                  label="City / Municipality"
                  value={selectedCity}
                  placeholder={
                    selectedProvince
                      ? "Select City / Municipality"
                      : "Choose a province first"
                  }
                  options={cities}
                  onChange={handleSelectCity}
                  disabled={!selectedProvince}
                  loading={loadingCities}
                  searchPlaceholder="Search city/municipality..."
                />
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t?.forecasting?.climate?.or || "or"}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* SOURCE C: Use Current Location */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-semibold transition cursor-pointer shadow-sm ${
                  activeSource === "current_location"
                    ? "bg-green-700 text-white border-green-700 ring-2 ring-green-200"
                    : "border-green-600 text-green-700 hover:bg-green-50"
                }`}
              >
                <Crosshair size={18} />
                {activeSource === "current_location"
                  ? "Current Device Location Active"
                  : t?.forecasting?.climate?.useCurrentLocation || "Use Current Location"}
              </button>

              {locationMessage ? (
                <div
                  className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                    locationMessage.toLowerCase().includes("unable") ||
                    locationMessage.toLowerCase().includes("please") ||
                    locationMessage.toLowerCase().includes("not support")
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-green-200 bg-green-50 text-green-700"
                  }`}
                >
                  {locationMessage}
                </div>
              ) : null}
            </div>

            {/* SOURCE B: Registered Farms */}
            <div
              className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                activeSource === "registered_farm"
                  ? "border-green-600 ring-2 ring-green-100"
                  : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tractor size={18} className="text-green-700" />
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-900">
                    {t?.forecasting?.climate?.registeredFarms || "Registered Farms"}
                  </p>
                </div>
                {loading.farms ? (
                  <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <LoaderCircle size={14} className="animate-spin text-green-700" />
                    {t?.forecasting?.climate?.loading || "Loading"}
                  </div>
                ) : activeSource === "registered_farm" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">
                    <CheckCircle2 size={12} /> Active Source
                  </span>
                ) : null}
              </div>

              <div className="mt-4 space-y-3 max-h-[470px] overflow-y-auto pr-1">
                {farms?.length ? (
                  farms.map((farm) => {
                    const isSelected =
                      activeSource === "registered_farm" &&
                      selectedLocation?.farmId === farm?.farm_id;
                    return (
                      <LocationCard
                        key={farm?.farm_id}
                        farm={farm}
                        selected={isSelected}
                        onClick={() => handleSelectFarm(farm)}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <Tractor size={28} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      {t?.forecasting?.climate?.noFarmsFound || "No registered farms found."}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Select a Philippine province and city/municipality above, or use your current location.
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

          {/* Right Column: Location Preview */}
          <div className="xl:col-span-7">
            <div className="rounded-[28px] border border-slate-200 bg-[#F8FBF7] p-6 md:p-7 shadow-sm min-h-[520px] flex flex-col">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    {t?.forecasting?.climate?.locationPreview || "Location Preview"}
                  </p>
                  {activeSource ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                      <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                      {activeSource === "country_province_city"
                        ? "Province & City Selected"
                        : activeSource === "registered_farm"
                        ? "Registered Farm Selected"
                        : "Current Device Location"}
                    </span>
                  ) : null}
                </div>
                <h4 className="text-2xl font-bold text-slate-900 mt-2">
                  {t?.forecasting?.climate?.previewTitle || "We’ll use this place for the climate forecast"}
                </h4>
                <p className="text-slate-500 mt-1 text-sm">
                  {t?.forecasting?.climate?.previewSubtitle ||
                    "This helps GrainRise know which weather data to check for your farm."}
                </p>
              </div>

              <div className="mt-6 flex-1 flex items-center">
                {selectedLocation ? (
                  <div className="w-full rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-start gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shrink-0 shadow-sm">
                        {selectedLocation.type === "registered_farm" ? (
                          <Tractor size={30} />
                        ) : selectedLocation.type === "current_location" ? (
                          <Crosshair size={30} />
                        ) : (
                          <MapPin size={30} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {selectedLocation.type === "registered_farm"
                              ? "Registered Farm"
                              : selectedLocation.type === "current_location"
                              ? "GPS Coordinates"
                              : "PSGC Locality"}
                          </span>
                        </div>
                        <h5 className="text-2xl font-bold text-slate-900 mt-1">
                          {selectedLocation.displayName}
                        </h5>
                        <p className="text-slate-500 mt-1.5 text-sm">
                          {selectedLocation.subtitle}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3.5 border border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              {t?.forecasting?.climate?.latitude || "Latitude"}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 mt-1">
                              {loadingCoords ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-400 text-sm">
                                  <LoaderCircle size={14} className="animate-spin text-green-700" /> Resolving...
                                </span>
                              ) : (
                                formatCoordinate(selectedLocation.latitude)
                              )}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3.5 border border-slate-100">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              {t?.forecasting?.climate?.longitude || "Longitude"}
                            </p>
                            <p className="text-lg font-semibold text-slate-900 mt-1">
                              {loadingCoords ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-400 text-sm">
                                  <LoaderCircle size={14} className="animate-spin text-green-700" /> Resolving...
                                </span>
                              ) : (
                                formatCoordinate(selectedLocation.longitude)
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-green-100 bg-green-50/70 px-4 py-3">
                          <p className="text-xs text-green-800 leading-relaxed">
                            <span className="font-bold">Verified Geocoding:</span> Weather grid cells and seasonal Copernicus models will be centered around these exact coordinates.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                      <MapPin size={26} />
                    </div>
                    <h5 className="text-xl font-bold text-slate-900">
                      {t?.forecasting?.climate?.noLocationSelected || "No location selected yet"}
                    </h5>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm">
                      {t?.forecasting?.climate?.noLocationSelectedSubtitle ||
                        "Choose one of your registered farms, select a province and municipality above, or use your current location."}
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
                  onClick={handleConfirmLocation}
                  disabled={!selectedLocation || loading.climate || loadingCoords}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-green-700 px-7 py-3.5 text-white font-bold hover:bg-green-800 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm text-base"
                >
                  {loading.climate ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  {t?.forecasting?.climate?.useThisLocation || "Use This Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // SCREEN MODE: "forecast"
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
          onClick={() => setScreenMode("select")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 cursor-pointer"
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
                  activeSelection?.latitude || selectedLocation?.latitude
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 px-4 py-3 bg-slate-50 min-w-[140px]">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Longitude
              </p>
              <p className="font-semibold text-slate-900 mt-1">
                {formatCoordinate(
                  activeSelection?.longitude || selectedLocation?.longitude
                )}
              </p>
            </div>
          </div>
        </div>

        {loading.climate && !climateForecast ? (
          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-14 text-center">
            <LoaderCircle
              size={36}
              className="animate-spin text-green-700 mx-auto mb-4"
            />
            <h5 className="font-bold text-slate-900 text-lg">
              Retrieving Copernicus CDS Climate Forecast
            </h5>
            <p className="text-slate-600 mt-2 max-w-lg mx-auto text-sm leading-relaxed">
              Gathering 6-month seasonal forecasts and historical ECMWF weather grids.
              Valid cached snapshots are automatically reused. Maximum foreground waiting time is 5 minutes.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-xs font-semibold text-green-800">
              <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
              ECMWF API Service Connected
            </div>
          </div>
        ) : null}

        {errors.climate && !climateForecast ? (
          <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50/80 p-6 md:p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <CircleAlert size={28} />
            </div>
            <h5 className="font-bold text-slate-900 text-xl">
              Copernicus CDS Service Status
            </h5>
            <p className="text-slate-700 mt-2 max-w-xl mx-auto text-sm leading-relaxed">
              {errors.climate}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              GrainRise never fabricates weather data. You may retry now or select another farm location.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeSelection || selectedLocation) {
                    runClimateForecast(activeSelection || selectedLocation, historyYears);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-800 transition cursor-pointer"
              >
                <RefreshCw size={15} />
                Retry Forecast
              </button>
              <button
                type="button"
                onClick={() => setScreenMode("select")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Select Another Location
              </button>
            </div>
          </div>
        ) : null}

        {climateForecast ? (
          <>
            {/* In Simple Words Summary */}
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

            {/* Forecast Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-8">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <ChartCardHeader
                  icon={Droplets}
                  title="How much rain, month by month"
                  subtitle="Taller bar = more rain that month"
                  iconColor="text-blue-700"
                />
                <RainBarChart data={forecastRain} />
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <ChartCardHeader
                  icon={ThermometerSun}
                  title="How hot it may get"
                  subtitle="Higher dot = hotter that month"
                  iconColor="text-orange-600"
                />
                <TemperatureLineChart data={forecastHeat} />
              </div>
            </div>

            {/* Historical Charts with Year Selector */}
            <div className="mt-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <h4 className="text-2xl font-bold text-slate-900">
                  How the weather has been
                </h4>
                <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
                  {HISTORY_YEAR_OPTIONS.map((year) => (
                    <YearPill
                      key={year}
                      active={historyYears === year}
                      onClick={() => handleChangeHistoryYears(year)}
                      disabled={loading.climate}
                    >
                      {year} year{year > 1 ? "s" : ""}
                    </YearPill>
                  ))}
                </div>
              </div>
              {loading.climate ? (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700">
                  <LoaderCircle size={14} className="animate-spin" />
                  Updating historical view...
                </div>
              ) : null}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    Past Rain
                  </p>
                  <RainBarChart data={historicalRain} />
                </div>
                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
                    Past Heat
                  </p>
                  <TemperatureLineChart data={historicalHeat} />
                </div>
              </div>
            </div>

            {/* GrainRise Farm Helper AI Advisory */}
            <div className="mt-8">
              {aiInterpretation ? (
                <ForecastHelperExpanded
                  aiInterpretation={aiInterpretation}
                  climateForecast={climateForecast}
                  locationName={locationTitle}
                  climateNote={climateForecast?.soil_land_note}
                  onRefresh={handleExplainForecast}
                  loading={loading.ai}
                  error={errors.ai}
                  t={t}
                />
              ) : (
                <ForecastHelperIntro
                  onClick={handleExplainForecast}
                  loading={loading.ai}
                  error={errors.ai}
                  t={t}
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

        {errors.climate && climateForecast ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 break-words">
            {errors.climate}
          </div>
        ) : null}
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
