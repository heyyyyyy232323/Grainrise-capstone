import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";

/**
 * Toast component — renders a single toast notification.
 * Controlled externally via the useToast hook.
 */
const ICONS = {
  error:   { icon: AlertCircle,   bg: "bg-red-50",    border: "border-red-200",   icon_color: "text-red-500",   text_color: "text-red-800"   },
  success: { icon: CheckCircle,   bg: "bg-green-50",  border: "border-green-200", icon_color: "text-green-600", text_color: "text-green-800" },
  info:    { icon: Info,          bg: "bg-blue-50",   border: "border-blue-200",  icon_color: "text-blue-500",  text_color: "text-blue-800"  },
  warning: { icon: AlertTriangle, bg: "bg-amber-50",  border: "border-amber-200", icon_color: "text-amber-500", text_color: "text-amber-800" },
};

const Toast = ({ toasts, removeToast }) => {
  return (
    <div
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const config = ICONS[toast.type] || ICONS.info;
        const Icon = config.icon;
        return (
          <ToastItem
            key={toast.id}
            toast={toast}
            config={config}
            Icon={Icon}
            removeToast={removeToast}
          />
        );
      })}
    </div>
  );
};

const ToastItem = ({ toast, config, Icon, removeToast }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Trigger enter animation on mount
    const enterTimer = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(enterTimer);
  }, []);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => removeToast(toast.id), 300);
  };

  return (
    <div
      className={`
        pointer-events-auto
        flex items-start gap-3
        max-w-sm w-full
        px-4 py-3.5
        rounded-2xl
        border shadow-lg shadow-black/10
        backdrop-blur-sm
        transition-all duration-300 ease-out
        ${config.bg} ${config.border}
        ${visible && !exiting
          ? "opacity-100 translate-x-0 scale-100"
          : "opacity-0 translate-x-8 scale-95"}
      `}
      role="alert"
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${config.icon_color}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-bold leading-snug ${config.text_color}`}>
            {toast.title}
          </p>
        )}
        <p className={`text-xs leading-relaxed mt-0.5 ${config.text_color} opacity-90`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className={`shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition ${config.text_color}`}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  );
};

export default Toast;
