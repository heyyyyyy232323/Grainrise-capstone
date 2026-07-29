const defaultPalette = ["#0F9D2A", "#E0AC1C", "#4F7DF3", "#E25E3E", "#7C3AED", "#14B8A6"];

const formatPercent = (value) => {
  if (Number.isInteger(value)) return `${value}%`;
  return `${value.toFixed(1)}%`;
};

const buildSegments = (items) => {
  const total = items.reduce((sum, item) => sum + Math.max(Number(item.value) || 0, 0), 0);
  let cursor = 0;

  return {
    total,
    segments: items.map((item, index) => {
      const value = Math.max(Number(item.value) || 0, 0);
      const percent = total > 0 ? (value / total) * 100 : 0;
      const start = cursor;
      const end = cursor + percent;
      cursor = end;

      return {
        ...item,
        color: item.color || defaultPalette[index % defaultPalette.length],
        value,
        percent,
        start,
        end,
      };
    }),
  };
};

export default function DistributionCard({
  title,
  totalLabel = "100% Total",
  items = [],
  className = "",
  donutSize = 184,
  holeSize = 72,
}) {
  const { total, segments } = buildSegments(items);
  const background =
    segments.length > 0
      ? `conic-gradient(${segments
          .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
          .join(", ")})`
      : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <article
      className={`w-full rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] ${className}`}
    >
      <header className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-[18px] font-bold leading-tight text-slate-900">{title}</h3>
      </header>

      <div className="flex flex-col gap-8 px-5 py-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="flex flex-1 flex-col items-center gap-3">
          <p className="text-[15px] font-semibold text-slate-500">{totalLabel}</p>

          <div
            className="relative grid place-items-center"
            style={{ width: donutSize, height: donutSize }}
          >
            <div
              className="rounded-full"
              style={{
                width: donutSize,
                height: donutSize,
                background,
                padding: 0,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
              }}
            />
            <div
              className="absolute rounded-full bg-white"
              style={{ width: holeSize, height: holeSize }}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-[300px]">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-semibold text-slate-500">
                  {segment.label}
                </span>
              </div>

              <span className="text-sm font-bold text-slate-700">{formatPercent(segment.percent)}</span>
            </div>
          ))}

          {segments.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-400">
              Add items to render the distribution chart.
            </div>
          )}
        </div>
      </div>

      <footer className="px-5 pb-5 text-sm text-slate-400">
        Total value: <span className="font-semibold text-slate-700">{total}</span>
      </footer>
    </article>
  );
}