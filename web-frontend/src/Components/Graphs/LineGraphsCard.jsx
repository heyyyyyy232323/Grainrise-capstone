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

const buildSmoothPath = (points) => {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` Q ${current.x} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`;
    path += ` T ${next.x} ${next.y}`;
  }

  return path;
};

const computeNiceMax = (maxVal) => {
  if (!maxVal || maxVal <= 0) return 100;

  const roughStep = maxVal / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const stepFraction = roughStep / magnitude;

  let niceStep;
  if (stepFraction <= 1) niceStep = 1;
  else if (stepFraction <= 2) niceStep = 2;
  else if (stepFraction <= 2.5) niceStep = 2.5;
  else if (stepFraction <= 5) niceStep = 5;
  else niceStep = 10;

  const step = niceStep * magnitude;
  let niceMax = Math.ceil(maxVal / step) * step;

  if (maxVal >= niceMax * 0.92) {
    niceMax += step;
  }

  return niceMax;
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
  const safeData = data.map((item) => {
    const rawVal = item?.value;
    const numVal = typeof rawVal === "number" ? rawVal : Number(rawVal);
    const hasData = Number.isFinite(numVal) && numVal > 0;
    return {
      ...item,
      value: hasData ? numVal : 0,
      hasData,
    };
  });
  const isEmpty = safeData.length === 0;

  // Filter to only periods with actual sales
  const activeData = safeData.filter((item) => item.hasData);
  const hasActiveSales = activeData.length > 0;

  // Auto-scale Y-axis based on actual values
  const maxActual = hasActiveSales
    ? Math.max(...activeData.map((item) => item.value))
    : 0;

  const chartMax = hasActiveSales
    ? computeNiceMax(maxActual)
    : typeof maxValue === "number" && maxValue > 0
    ? maxValue
    : 100;
  const chartMin = Math.max(minValue, 0);
  const chartRange = Math.max(chartMax - chartMin, 1);

  const N = activeData.length;
  const width = 100;
  // Distribute points evenly, even with only 1-2 values
  const paddingX = N === 1 ? 50 : N === 2 ? 25 : 8;
  const paddingY = 8;
  const ticks = 4;

  const points = activeData.map((item, index) => {
    const x =
      N === 1
        ? 50
        : paddingX + (index / (N - 1)) * (width - paddingX * 2);

    const normalized = clamp((item.value - chartMin) / chartRange, 0, 1);
    const y = paddingY + (1 - normalized) * (100 - paddingY * 2);

    return { ...item, x, y };
  });

  const linePath = points.length >= 2 ? buildSmoothPath(points) : "";
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`
      : "";

  const ticksList = Array.from(
    { length: ticks + 1 },
    (_, index) => chartMin + (chartRange * index) / ticks
  );

  return (
    <article
      className={`dark-readable-graph w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}
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
                  strokeWidth="1.2"
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

            <div className="absolute left-0 right-0 bottom-0 h-5">
              {hasActiveSales ? (
                points.map((point) => (
                  <div
                    key={point.label}
                    className="absolute -translate-x-1/2 text-center text-[11px] text-slate-500 sm:text-[12px] whitespace-nowrap"
                    style={{ left: `${point.x}%` }}
                  >
                    {point.label}
                  </div>
                ))
              ) : (
                <div className="flex h-full items-end justify-between px-1">
                  {safeData.map((item) => (
                    <div
                      key={item.label}
                      className="w-full text-center text-[11px] text-slate-500 sm:text-[12px]"
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
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