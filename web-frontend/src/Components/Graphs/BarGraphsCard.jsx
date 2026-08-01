const defaultGridColor = "rgba(148, 163, 184, 0.16)";

const defaultPalette = ["#2E7D32", "#E0AC1C", "#3B82F6", "#F97316", "#8B5CF6"];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatValue = (value) => {
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
};

const getMaxValue = (items, explicitMax) => {
  if (typeof explicitMax === "number" && explicitMax > 0) return explicitMax;
  const max = items.reduce((highest, item) => Math.max(highest, Number(item.value) || 0), 0);
  return max > 0 ? max : 100;
};

export default function CategoryBarCard({
  title,
  items = [],
  seriesLabel,
  className = "",
  maxValue,
  gridSteps = 5,
  barColor,
  showLegend = true,
  height = 160,
}) {
  const safeItems = items.map((item, index) => ({
    ...item,
    value: Math.max(Number(item.value) || 0, 0),
    color: item.color || defaultPalette[index % defaultPalette.length],
  }));
  const chartMax = getMaxValue(safeItems, maxValue);
  const tickCount = Math.max(gridSteps, 2);
  const tickValues = Array.from({ length: tickCount + 1 }, (_, index) => (chartMax * index) / tickCount);

  return (
    <article
      className={`w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}
    >
      <header className="border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
          {title}
        </h3>
      </header>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div>
          <div className="relative rounded-[10px]" style={{ height }}>
            <div className="absolute inset-0" aria-hidden="true">
              {tickValues.map((tickValue, index) => {
                const top = (index / tickCount) * 100;
                return (
                  <div key={tickValue} className="absolute left-0 right-0" style={{ top: `${top}%` }}>
                    <div
                      className="absolute inset-x-0 border-t"
                      style={{ borderColor: defaultGridColor }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="relative z-10 flex h-full items-end justify-between gap-2.5 overflow-hidden pl-8 pr-1 pb-5 pt-2 sm:gap-3">
              {safeItems.map((item) => {
                const barHeight = chartMax > 0 ? clamp((item.value / chartMax) * 100, 0, 100) : 0;
                const resolvedBarColor = barColor || item.color;

                return (
                  <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 min-w-0">
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div className="relative h-full w-full max-w-[52px] rounded-t-[4px] bg-slate-100/80">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-t-[4px]"
                          style={{
                            height: `${barHeight}%`,
                            minHeight: item.value > 0 ? 8 : 0,
                            backgroundColor: resolvedBarColor,
                            boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.18)",
                          }}
                        />
                      </div>
                    </div>

                    <span className="max-w-full truncate text-center text-[11px] leading-tight text-slate-500">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {tickValues.slice().reverse().map((tickValue, index) => (
              <div
                key={tickValue}
                className="pointer-events-none absolute left-0 -translate-y-1/2 text-[10px] font-medium text-slate-400"
                style={{ top: `${(index / tickCount) * 100}%` }}
              >
                {formatValue(tickValue)}
              </div>
            ))}
          </div>

          {showLegend && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: barColor || safeItems[0]?.color || defaultPalette[0] }}
                aria-hidden="true"
              />
              <span className="text-[12px] font-medium text-slate-600">
                {seriesLabel || "Series"}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}