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

function ChartEmptyState({ title = "No data available", description = "There isn't enough data to display this chart. Check back later or adjust your filters." }) {
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

export default function DistributionCard({
  title,
  totalLabel = "100% Total",
  items = [],
  className = "",
  donutSize = 184,
  holeSize = 72,
  emptyStateTitle,
  emptyStateDescription,
}) {
  const { total, segments } = buildSegments(items);
  const isEmpty = segments.length === 0 || total === 0;

  const background =
    segments.length > 0
      ? `conic-gradient(${segments
          .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
          .join(", ")})`
      : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <article
      className={`dark-readable-graph w-full rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] ${className}`}
    >
      <header className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-[18px] font-bold leading-tight text-slate-900">{title}</h3>
      </header>

      {isEmpty ? (
        <ChartEmptyState title={emptyStateTitle} description={emptyStateDescription} />
      ) : (
        <>
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

            <div className="flex w-full min-w-0 flex-col gap-3 lg:max-w-[300px]">
              {segments.map((segment) => (
                <div
                  key={segment.label}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 shadow-[0_6px_14px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                      aria-hidden="true"
                    />
                    <span
                      className="min-w-0 truncate text-sm font-semibold text-slate-500"
                      title={segment.label}
                    >
                      {segment.label}
                    </span>
                  </div>

                  <span className="shrink-0 text-sm font-bold text-slate-700">
                    {formatPercent(segment.percent)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <footer className="px-5 pb-5 text-sm text-slate-400">
            Total value: <span className="font-semibold text-slate-700">{total}</span>
          </footer>
        </>
      )}
    </article>
  );
}