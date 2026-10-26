import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";

export default function DriverDeliverySuccessModal({
  isOpen,
  onClose,
  title = "Order Delivered Successfully",
  message = "Proof of delivery has been saved to your assignment.",
  buttonLabel = "Continue Delivery",
  onAction,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 px-4 py-6"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        )}

        <div className="px-7 pb-7 pt-8">
          {/* Success Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={28} className="text-green-700" />
          </div>

          {/* Title & Message */}
          <div className="mt-4 text-center">
            <h2 className="text-xl font-extrabold tracking-[-0.02em] text-slate-900">
              {title}
            </h2>
            {message && (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {message}
              </p>
            )}
          </div>

          {/* Status Box */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Delivery Status</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-[#0B5D1E]">
              <CheckCircle2 size={13} />
              Delivered
            </span>
          </div>

          {/* Confirm / Continue Button */}
          <button
            type="button"
            onClick={handleAction}
            className="mt-6 w-full rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 cursor-pointer shadow-sm hover:shadow active:scale-98"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

