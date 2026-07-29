import { BadgeDollarSign, TrendingDown, TrendingUp, Minus } from "lucide-react";

const toneStyles = {
  success: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    trend: "bg-emerald-50 text-emerald-700 border-emerald-100",
    footer: "text-emerald-600",
  },
  warning: {
    badge: "border-amber-200 bg-amber-50 text-amber-600",
    trend: "bg-amber-50 text-amber-700 border-amber-100",
    footer: "text-amber-600",
  },
  danger: {
    badge: "border-rose-200 bg-rose-50 text-rose-600",
    trend: "bg-rose-50 text-rose-700 border-rose-100",
    footer: "text-rose-600",
  },
  neutral: {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    trend: "bg-slate-50 text-slate-700 border-slate-100",
    footer: "text-slate-600",
  },
};

const trendIcons = {
  success: TrendingUp,
  warning: Minus,
  danger: TrendingDown,
  neutral: Minus,
};

export default function KPICard({
  title,
  value,
  trend,
  footer,
  icon,
  tone = "success",
  className = "",
}) {
  const styles = toneStyles[tone] || toneStyles.success;
  const TrendIcon = trendIcons[tone] || trendIcons.success;
  const badgeIcon = icon || <BadgeDollarSign size={18} strokeWidth={2.2} />;

  return (
    <article
      className={`w-full rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {title}
        </p>

        <div className="flex items-center gap-2">
          {trend ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none ${styles.trend}`}
            >
              <TrendIcon size={11} strokeWidth={2.5} />
              <span>{trend}</span>
            </div>
          ) : null}

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles.badge}`}
          >
            {badgeIcon}
          </div>
        </div>
      </div>

      <div className="mt-3 text-[clamp(1.5rem,3vw,2rem)] font-extrabold leading-none tracking-[-0.04em] text-slate-900">
        {value}
      </div>

      {footer ? (
        <p className={`mt-3 text-sm font-semibold ${styles.footer}`}>{footer}</p>
      ) : null}
    </article>
  );
}