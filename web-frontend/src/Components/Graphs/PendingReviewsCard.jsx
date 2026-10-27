import { ChevronRight } from "lucide-react";

const defaultPalette = ["#0B7A2A", "#E0AC1C", "#2563EB", "#F97316", "#7C3AED"];

const getAccent = (item, index, accentColor) => item.color || accentColor || defaultPalette[index % defaultPalette.length];

const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
};

export default function PendingReviewsCard({
  title = "Pending Reviews",
  items = [],
  className = "",
  onViewAll,
  viewAllLabel = "View All",
  accentColor,
  emptyMessage = "Add items to render the pending reviews list.",
}) {
  return (
    <article
      className={`dark-readable-graph w-full overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.06)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
        <h3 className="text-[18px] font-bold leading-tight tracking-[-0.02em] text-slate-900 sm:text-[20px]">
          {title}
        </h3>

        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 transition hover:text-emerald-800"
          >
            <span>{viewAllLabel}</span>
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        ) : null}
      </header>

      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item, index) => {
              const toneColor = getAccent(item, index, accentColor);
              const initials = item.initials || getInitials(item.name || item.title || "U");

              return (
                <div
                  key={item.id || `${item.name || item.title || "review"}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2 shadow-[0_3px_8px_rgba(15,23,42,0.03)] sm:px-3.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[12px] font-bold text-white shadow-[0_4px_10px_rgba(11,122,42,0.16)]"
                      style={{ backgroundColor: toneColor }}
                      aria-hidden="true"
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500 sm:text-[12px]">
                        {item.category || item.subtitle || "Review Item"}
                      </p>
                      <h4 className="truncate text-[13px] font-bold leading-tight text-slate-800 sm:text-[14px]">
                        {item.name || item.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    {item.date ? (
                      <span className="text-[11px] font-semibold uppercase tracking-[0.02em] text-slate-500 sm:text-[12px]">
                        {item.date}
                      </span>
                    ) : null}

                    {item.onDetails || item.detailsLabel !== null ? (
                      <button
                        type="button"
                        onClick={() => item.onDetails?.(item)}
                        className="text-[11px] font-bold text-emerald-700 transition hover:text-emerald-800 sm:text-[12px]"
                      >
                        {item.detailsLabel || "Details"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400">
              {emptyMessage}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
