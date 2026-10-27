import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, ShieldCheck } from "lucide-react";

export default function DriverExitTrackingModal({
  isOpen,
  onClose,
  onConfirmExit,
  isLoading = false,
}) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Stop Live Tracking?
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Concise Body */}
        <div className="p-6 space-y-3.5">
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>GPS Streaming Paused:</strong> Exiting will stop live tracking. Your last known coordinates will be saved as a static checkpoint.
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Delivery status remains <strong>In transit</strong> and tracking can be resumed anytime from My Duties.
            </span>
          </div>
        </div>

        {/* Buttons (Exact Payment Accounts modal footer style) */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
          >
            Stay on Tracking
          </button>

          <button
            type="button"
            onClick={onConfirmExit}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            {isLoading ? "Saving..." : "Stop & Exit"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
