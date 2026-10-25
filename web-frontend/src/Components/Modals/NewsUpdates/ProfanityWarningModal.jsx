import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertOctagon, ShieldAlert } from "lucide-react";

export default function ProfanityWarningModal({
  isOpen,
  onClose,
  message = "Your comment contains prohibited or inappropriate language that violates GrainRise community guidelines.",
  matches = [],
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-red-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertOctagon size={28} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Prohibited Content Detected
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>

          {matches && matches.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 mb-1.5">
                <ShieldAlert size={14} />
                <span>Flagged keywords:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {matches.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-block rounded-md bg-red-200/80 px-2 py-0.5 text-[11px] font-semibold text-red-900"
                  >
                    {m.prohibited_text || m}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-[11px] text-slate-500 text-left">
            Please edit your comment to remove inappropriate language before submitting. Repeated violations may result in commenting restrictions.
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer shadow-sm"
            >
              I Understand, Let Me Edit
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

