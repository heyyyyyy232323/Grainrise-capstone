import { CircleUserRound } from "lucide-react";

const defaultPalette = ["#0B7A2A", "#E0AC1C", "#2563EB", "#F97316", "#7C3AED"];

const getItemColor = (item, index, accentColor) => item.color || accentColor || defaultPalette[index % defaultPalette.length];

const ActivityIcon = ({ icon: Icon }) => {
  if (Icon) {
    return <Icon size={13} strokeWidth={2.2} />;
  }

  return <CircleUserRound size={13} strokeWidth={2.2} />;
};

export default function RecentActivityCard({
  title,
  items = [],
  className = "",
  accentColor,
  showConnector = true,
}) {
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
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, index) => {
              const toneColor = getItemColor(item, index, accentColor);

              return (
                <div key={item.id || `${item.title}-${index}`} className="relative">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-[0_4px_10px_rgba(11,122,42,0.2)]"
                      style={{ backgroundColor: toneColor }}
                      aria-hidden="true"
                    >
                      <ActivityIcon icon={item.icon} color={toneColor} />
                    </div>

                    <div className="min-w-0 flex-1 pb-0.5">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0">
                          <h4 className="truncate text-[13px] font-bold leading-tight text-slate-800 sm:text-[14px]">
                            {item.title}
                          </h4>
                          {item.description ? (
                            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-[12px]">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        {item.time ? (
                          <span className="whitespace-nowrap pt-0.5 text-[11px] font-semibold text-emerald-700 sm:text-[12px]">
                            {item.time}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {showConnector && index < items.length - 1 ? (
                    <div className="ml-[13px] mt-2.5 h-5 border-l-2 border-emerald-700/70 sm:ml-[14px]" aria-hidden="true" />
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-400">
              Add items to render the recent activity feed.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}