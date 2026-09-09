import { BadgeDollarSign } from "lucide-react";

const toneStyles = {
  success: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    caption: "text-emerald-600",
  },
  warning: {
    badge: "border-amber-200 bg-amber-50 text-amber-600",
    caption: "text-amber-600",
  },
  danger: {
    badge: "border-rose-200 bg-rose-50 text-rose-600",
    caption: "text-rose-600",
  },
  neutral: {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    caption: "text-slate-600",
  },
};

export default function KPICard({
  title,
  value,
  trend,
  footer,
  icon,
  tone = "success",
  variant = "surface",
  className = "",
  onClick,
  ariaLabel,
}) {
  const styles = toneStyles[tone] || toneStyles.success;
  const badgeIcon = icon || <BadgeDollarSign size={18} strokeWidth={2.2} />;
  const caption = trend || footer;
  const isSolid = variant === "solid";
  const isClickable = typeof onClick === "function";
  const CardElement = isClickable ? "button" : "article";

  return (
    <CardElement
      {...(isClickable
        ? {
            type: "button",
            onClick,
            "aria-label": ariaLabel || `${title}: ${value}`,
          }
        : {})}
      className={`w-full rounded-[22px] border p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.1)] ${
        isClickable
          ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A2A] focus-visible:ring-offset-2"
          : ""
      } ${
        isSolid
          ? "border-[#065416] bg-[#0B5D1E] text-white"
          : "border-slate-200 bg-white"
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
            isSolid ? "text-white/80" : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            isSolid ? "border-white/20 bg-white/10 text-white" : styles.badge
          }`}
        >
          {badgeIcon}
        </div>
      </div>

      <div
        className={`mt-4 text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold leading-none tracking-[-0.02em] ${
          isSolid ? "text-white" : "text-slate-900"
        }`}
      >
        {value}
      </div>

      {caption ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            isSolid ? "text-white/80" : styles.caption
          }`}
        >
          {caption}
        </p>
      ) : null}
    </CardElement>
  );
}
