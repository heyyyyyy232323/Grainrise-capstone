const defaultGridColor = "rgba(148, 163, 184, 0.16)";

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

function computeSeriesPoints(seriesData, chartMin, chartRange, paddingX, paddingY, width) {
  return seriesData.map((item, index) => {
    const x =
      seriesData.length === 1
        ? 50
        : paddingX + (index / (seriesData.length - 1)) * (width - paddingX * 2);
    const value = Math.max(Number(item.value) || 0, 0);
    const normalized = clamp((value - chartMin) / chartRange, 0, 1);
    const y = paddingY + (1 - normalized) * (100 - paddingY * 2);
    return { ...item, value, x, y };
  });
}

export default function RevenueExpenseTrendChart({
  title,
  subtitle,
  series = [],
  selectedRange,
  rangeOptions = [],
  onRangeChange,
  className = "",
  height = 240,
  maxValue,
  minValue = 0,
  axisFormatter,
  valueFormatter,
  emptyStateTitle,
  emptyStateDescription,
}) {
  const hasSeries = series.length > 0 && series.some((serie) => (serie.data || []).length > 0);

  const width = 100;
  const paddingX = 6;
  const paddingY = 8;
  const ticks = 4;

  const allValues = series.flatMap((serie) =>
    (serie.data || []).map((item) => Math.max(Number(item.value) || 0, 0))
  );

  const chartMax =
    typeof maxValue === "number" && maxValue > 0 ? maxValue : Math.max(...allValues, 100);
  const chartMin = Math.max(minValue, 0);
  const chartRange = Math.max(chartMax - chartMin, 1);

  const seriesWithPoints = series.map((serie) => ({
    ...serie,
    points: computeSeriesPoints(serie.data || [], chartMin, chartRange, paddingX, paddingY, width),
  }));

  const xAxisLabels = seriesWithPoints[0]?.points ?? [];

  const ticksList = Array.from(
    { length: ticks + 1 },
    (_, index) => chartMin + (chartRange * index) / ticks
  );

  return (
    <article
      className={`dark-readable-graph w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}
    >
      <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
            {title}
          </h3>
          {subtitle ? <p className="mt-0.5 text-[13px] text-slate-400">{subtitle}</p> : null}
        </div>

        {hasSeries && rangeOptions.length > 0 ? (
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
            {rangeOptions.map((option) => {
              const isActive = (selectedRange ?? rangeOptions[0]?.value) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onRangeChange?.(option.value)}
                  className={`rounded-full px-3 py-1 text-[13px] font-semibold transition ${
                    isActive
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      {!hasSeries ? (
        <ChartEmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <div className="px-4 py-4 sm:px-5 sm:py-5">
          {series.length > 1 ? (
            <div className="mb-3 flex items-center justify-end gap-4">
              {series.map((serie) => (
                <div key={serie.key ?? serie.label} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full border-2 bg-white"
                    style={{ borderColor: serie.lineColor }}
                  />
                  <span className="text-[13px] font-semibold text-slate-600">{serie.label}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="relative" style={{ height, marginLeft: 48 }}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
            >
              {ticksList.map((tickValue) => {
                const tickRatio = chartRange > 0 ? (tickValue - chartMin) / chartRange : 0;
                const y = paddingY + (1 - tickRatio) * (100 - paddingY * 2);
                return (
                  <line
                    key={tickValue}
                    x1="0"
                    x2="100"
                    y1={y}
                    y2={y}
                    stroke={defaultGridColor}
                    strokeWidth="0.25"
                  />
                );
              })}

              {seriesWithPoints.map((serie) => {
                const linePath = buildSmoothPath(serie.points);
                const areaPath =
                  serie.points.length > 0
                    ? `${linePath} L ${serie.points[serie.points.length - 1].x} 100 L ${serie.points[0].x} 100 Z`
                    : "";
                return (
                  <g key={serie.key ?? serie.label}>
                    {areaPath ? <path d={areaPath} fill={serie.fillColor} /> : null}
                    {linePath ? (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={serie.lineColor}
                        strokeWidth={serie.strokeWidth ?? 1.2}
                        strokeDasharray={serie.strokeDasharray || (serie.dashed ? "4,4" : undefined)}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ) : null}
                  </g>
                );
              })}
            </svg>

            {seriesWithPoints.map((serie) =>
              serie.points.map((point) => (
                <div
                  key={`${serie.key ?? serie.label}-${point.label}`}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <div
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100"
                    style={{ bottom: 12, borderColor: serie.lineColor }}
                  >
                    {formatAxisValue(point.value, valueFormatter)}
                  </div>
                  <div
                    className="h-2.5 w-2.5 rounded-full bg-white"
                    style={{ border: `2px solid ${serie.lineColor}` }}
                  />
                </div>
              ))
            )}

            <div className="absolute left-0 right-0 bottom-0 flex items-end justify-between px-1">
              {xAxisLabels.map((point) => (
                <div
                  key={point.label}
                  className="w-full text-center text-[11px] text-slate-500 sm:text-[12px]"
                >
                  {point.label}
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
                    <div key={tickValue} className="absolute right-1 -translate-y-1/2" style={{ top }}>
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