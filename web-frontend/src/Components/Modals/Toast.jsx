import React, { useEffect } from "react";
import {
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  RotateCw,
  UserX,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Figma-accurate Toast Notification Component for GrainRise
 *
 * Supports 6 distinct variants matching the Figma design system:
 * 1. success: Green outline & accent, Checkmark icon
 * 2. error / save_failed: Red outline & accent, Alert icon, optional Retry button
 * 3. warning / low_stock: Amber/Yellow outline & accent, AlertTriangle icon, optional text action
 * 4. info / data_refreshed: Blue outline & accent, Info icon
 * 5. processing / loading: Slate outline & accent, rotating Sync icon
 * 6. deactivated / account_deactivated: Charcoal outline & accent, UserX icon, optional Undo link
 */

const TOAST_VARIANTS = {
  success: {
    title: "Success",
    borderColor: "border-[#16a34a]",
    accentBorder: "border-l-[#16a34a]",
    iconBg: "bg-[#16a34a]",
    iconColor: "text-white",
    Icon: () => (
      <div className="w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 shadow-2xs">
        <Check size={12} strokeWidth={3} className="text-white" />
      </div>
    ),
  },
  error: {
    title: "Error",
    borderColor: "border-[#ef4444]",
    accentBorder: "border-l-[#ef4444]",
    iconBg: "bg-[#ef4444]",
    iconColor: "text-white",
    defaultActionType: "button",
    Icon: () => (
      <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0 shadow-2xs">
        <span className="text-white text-xs font-black leading-none">!</span>
      </div>
    ),
  },
  save_failed: {
    title: "Save Failed",
    borderColor: "border-[#ef4444]",
    accentBorder: "border-l-[#ef4444]",
    iconBg: "bg-[#ef4444]",
    iconColor: "text-white",
    defaultActionType: "button",
    Icon: () => (
      <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0 shadow-2xs">
        <span className="text-white text-xs font-black leading-none">!</span>
      </div>
    ),
  },
  warning: {
    title: "Low Stock Alert",
    borderColor: "border-[#eab308]",
    accentBorder: "border-l-[#eab308]",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-[#eab308] fill-[#eab308]/20" />
      </div>
    ),
  },
  low_stock: {
    title: "Low Stock Alert",
    borderColor: "border-[#eab308]",
    accentBorder: "border-l-[#eab308]",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-[#eab308] fill-[#eab308]/20" />
      </div>
    ),
  },
  info: {
    title: "Data Refreshed",
    borderColor: "border-[#3b82f6]",
    accentBorder: "border-l-[#3b82f6]",
    Icon: () => (
      <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs">
        <span className="text-white text-xs font-bold leading-none italic font-serif">i</span>
      </div>
    ),
  },
  data_refreshed: {
    title: "Data Refreshed",
    borderColor: "border-[#3b82f6]",
    accentBorder: "border-l-[#3b82f6]",
    Icon: () => (
      <div className="w-5 h-5 rounded-full bg-[#3b82f6] flex items-center justify-center shrink-0 shadow-2xs">
        <span className="text-white text-xs font-bold leading-none italic font-serif">i</span>
      </div>
    ),
  },
  processing: {
    title: "Processing",
    borderColor: "border-[#4b5563]",
    accentBorder: "border-l-[#4b5563]",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <RotateCw size={17} className="text-[#374151] animate-spin" />
      </div>
    ),
  },
  loading: {
    title: "Processing",
    borderColor: "border-[#4b5563]",
    accentBorder: "border-l-[#4b5563]",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <RotateCw size={17} className="text-[#374151] animate-spin" />
      </div>
    ),
  },
  deactivated: {
    title: "Account Deactivated",
    borderColor: "border-[#374151]",
    accentBorder: "border-l-[#374151]",
    defaultActionType: "link-right",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <UserX size={18} className="text-[#374151]" />
      </div>
    ),
  },
  account_deactivated: {
    title: "Account Deactivated",
    borderColor: "border-[#374151]",
    accentBorder: "border-l-[#374151]",
    defaultActionType: "link-right",
    Icon: () => (
      <div className="w-5 h-5 flex items-center justify-center shrink-0">
        <UserX size={18} className="text-[#374151]" />
      </div>
    ),
  },
};

const POSITION_STYLES = {
  "top-right": "top-20 right-5",
  "top-left": "top-20 left-5",
  "top-center": "top-20 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-5 right-5",
  "bottom-left": "bottom-5 left-5",
  "bottom-center": "bottom-5 left-1/2 -translate-x-1/2",
};

export const ToastNotification = ({
  isOpen = true,
  type = "success",
  title,
  message,
  description,
  actionLabel,
  onAction,
  actionType, // "button" | "link" | "link-right"
  duration = 4000,
  onClose,
  position = "top-right",
  className = "",
  containerClassName = "",
  zIndex = 20,
}) => {
  useEffect(() => {
    if (isOpen && duration && duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const normalizedType = String(type || "success").toLowerCase();
  const variant = TOAST_VARIANTS[normalizedType] || TOAST_VARIANTS.success;

  const displayTitle = title || variant.title;
  const displayMessage = message || description || "";
  const resolvedActionType = actionType || variant.defaultActionType || "link";

  return (
    <div
      className={`fixed ${POSITION_STYLES[position] || POSITION_STYLES["top-right"]} ${containerClassName} max-w-xs w-[calc(100vw-2rem)] pointer-events-none transition-all duration-300 ease-out`}
      style={{ zIndex }}
    >
      <div
        role="alert"
        aria-live="polite"
        className={`pointer-events-auto bg-white dark:bg-slate-800 rounded-lg border ${variant.borderColor} border-l-[3px] ${variant.accentBorder} shadow-[0_3px_12px_rgba(0,0,0,0.08)] p-2.5 animate-toast-slide-in relative select-none ${className}`}
      >
        {/* Top Header Row with Icon, Title, and Close Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <variant.Icon />
            <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug tracking-tight">
              {displayTitle}
            </h4>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notification"
              className="text-gray-300 dark:text-slate-400 hover:text-gray-500 dark:hover:text-slate-200 rounded-md p-0.5 transition cursor-pointer shrink-0 ml-1"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Message Body */}
        {displayMessage && (
          <div className="pl-7.5 pr-2 mt-1">
            <p className="text-[11px] text-gray-500 dark:text-slate-300 font-normal leading-snug whitespace-pre-line">
              {displayMessage}
            </p>
          </div>
        )}

        {/* Action Button or Links */}
        {actionLabel && onAction && (
          <div
            className={`pl-7.5 pr-2 ${
              resolvedActionType === "link-right"
                ? "flex justify-end mt-1.5"
                : "mt-2.5"
            }`}
          >
            {resolvedActionType === "button" && (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center px-2.5 py-0.5 text-[11px] font-semibold text-gray-700 dark:text-slate-100 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 transition shadow-2xs cursor-pointer"
              >
                {actionLabel}
              </button>
            )}

            {resolvedActionType === "link" && (
              <button
                type="button"
                onClick={onAction}
                className="text-xs font-semibold text-gray-700 dark:text-slate-100 hover:text-gray-900 dark:hover:text-white hover:underline transition cursor-pointer text-left"
              >
                {actionLabel}
              </button>
            )}

            {resolvedActionType === "link-right" && (
              <button
                type="button"
                onClick={onAction}
                className="text-xs font-semibold text-gray-600 dark:text-slate-200 hover:text-gray-900 dark:hover:text-white hover:underline transition cursor-pointer text-right"
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-toast-slide-in {
          animation: toast-slide-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};

const ToastCollection = ({ toasts = [], removeToast }) => {
  const toastContainer = (
    <div className="fixed top-20 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => removeToast?.(toast.id)}
        />
      ))}
    </div>
  );

  return typeof document === "undefined"
    ? toastContainer
    : createPortal(toastContainer, document.body);
};

const Toast = (props) => {
  if (Array.isArray(props.toasts)) {
    return <ToastCollection {...props} />;
  }

  const toast = <ToastNotification {...props} />;
  return typeof document === "undefined"
    ? toast
    : createPortal(toast, document.body);
};

export default Toast;
