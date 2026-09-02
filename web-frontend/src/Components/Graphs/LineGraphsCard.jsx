import { Star, ChevronDown } from "lucide-react";

const defaultGridColor = "rgba(148, 163, 184, 0.16)";
const defaultLineColor = "#0B7A2A";
const defaultFillColor = "rgba(34, 197, 94, 0.12)";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatCurrency = (value) => {
  if (typeof value === "number") {
    return `₱${value.toLocaleString("en-PH")}`;
  }

  return String(value);
};

const formatAxisValue = (value, formatter) => {
  if (typeof formatter === "function") return formatter(value);
  return formatCurrency(value);
};

/**
 * Builds a smooth, continuous cubic Bezier path through a list of points.
 */
const buildSmoothPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    // Smooth control points calculated based on neighboring points
    const prev = points[i - 1] || current;
    const afterNext = points[i + 2] || next;

    const tension = 0.2; // Adjust tension for curvature aggressiveness (0.15 - 0.25 works best)

    const cp1x = current.x + (next.x - prev.x) * tension;
    const cp1y = current.y + (next.y - prev.y) * tension;

    const cp2x = next.x - (afterNext.x - current.x) * tension;
    const cp2y = next.y - (afterNext.y - current.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
};

function ChartEmptyState({
  title = "No data available",
  description = "There isn't enough data to display this chart. Check back later or adjust your filters.",
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7 text-emerald-500"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M8 16v-3" />
          <path d="M12 16v-6" />
          <path d="M16 16v-2" />
        </svg>
      </div>
      <h4 className="text-[16px] font-bold text-slate-900 sm:text-[17px]">{title}</h4>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-400 sm:text-[13.5px]">
        {description}
      </p>
    </div>
  );
}

export default function SalesTrendCard({
  title,
  data = [],
  selectedRange,
  rangeOptions = [],
  onRangeChange,
  className = "",
  height = 240,
  maxValue,
  minValue = 0,
  lineColor = defaultLineColor,
  fillColor = defaultFillColor,
  axisFormatter,
  valueFormatter,
  selectedValue = "Week",
  emptyStateTitle,
  emptyStateDescription,
}) {
  const safeData = data.map((item) => ({
    ...item,
    value: Math.max(Number(item.value) || 0, 0),
  }));
  const isEmpty = safeData.length === 0;

  const chartMax =
    typeof maxValue === "number" && maxValue > 0
      ? maxValue
      : Math.max(...safeData.map((item) => item.value), 100);
  const chartMin = Math.max(minValue, 0);
  const chartRange = Math.max(chartMax - chartMin, 1);
  const ticks = 4;
  const width = 100;
  const paddingX = 6;
  const paddingY = 8;

  const points = safeData.map((item, index) => {
    const x =
      safeData.length === 1 ? 50 : paddingX + (index / (safeData.length - 1)) * (width - paddingX * 2);
    const normalized = clamp((item.value - chartMin) / chartRange, 0, 1);
    const y = paddingY + (1 - normalized) * (100 - paddingY * 2);
    return { ...item, x, y };
  });

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
      : "";

  const ticksList = Array.from({ length: ticks + 1 }, (_, index) => chartMin + (chartRange * index) / ticks);

  return (
    <article
      className={`w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 sm:px-5">
        <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
          {title}
        </h3>

        {!isEmpty && (
          <div className="relative shrink-0">
            {onRangeChange ? (
              <select
                value={selectedRange ?? selectedValue}
                onChange={(event) => onRangeChange?.(event.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-1.5 pr-8 text-sm font-semibold text-slate-600 outline-none transition focus:border-emerald-500 cursor-pointer"
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600">
                {selectedRange ?? selectedValue}
              </div>
            )}

            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              ▾
            </span>
          </div>
        )}
      </header>

      {isEmpty ? (
        <ChartEmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          <div className="relative" style={{ height, marginLeft: 48 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {ticksList.map((tickValue) => {
                const tickRatio = chartRange > 0 ? (tickValue - chartMin) / chartRange : 0;
                const y = paddingY + (1 - tickRatio) * (100 - paddingY * 2);

                return (
                  <g key={tickValue}>
                    <line x1="0" x2="100" y1={y} y2={y} stroke={defaultGridColor} strokeWidth="0.25" />
                  </g>
                );
              })}

              {areaPath ? <path d={areaPath} fill={fillColor} /> : null}
              {linePath ? (
                <path
                  d={linePath}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
            </svg>

            {points.map((point) => (
              <div
                key={point.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-sm"
                  style={{ bottom: 10, borderColor: lineColor }}
                >
                  {formatAxisValue(point.value, valueFormatter)}
                </div>
                <div
                  className="h-2.5 w-2.5 rounded-full bg-white"
                  style={{ border: `2px solid ${lineColor}` }}
                />
              </div>
            ))}

            <div className="absolute left-0 right-0 bottom-0 flex items-end justify-between px-1">
              {safeData.map((item) => (
                <div key={item.label} className="w-full text-center text-[11px] text-slate-500 sm:text-[12px]">
                  {item.label}
                </div>
              ))}
            </div>

            <div className="absolute -left-12 top-0 h-full w-[42px] pr-2 text-right text-[10px] font-medium text-slate-400 sm:w-[48px] sm:text-[11px]">
              {ticksList
                .slice()
                .reverse()
                .map((tickValue, index) => {
                  const tickRatio = ticks > 0 ? index / ticks : 0;
                  const top = `${paddingY + tickRatio * (100 - paddingY * 2)}%`;

                  return (
                    <div
                      key={tickValue}
                      className="absolute right-1 -translate-y-1/2"
                      style={{ top }}
                    >
                      {formatAxisValue(tickValue, axisFormatter)}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}