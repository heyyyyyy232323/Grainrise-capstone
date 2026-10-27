import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertOctagon, X } from "lucide-react";

export default function ProfanityWarningModal({
  isOpen,
  open,
  onClose,
  title = "Prohibited Word Detected",
  message,
  detectedWords = [],
  matches = [],
  type = "message",
}) {
  const visible = Boolean(isOpen ?? open);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose?.();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [visible, onClose]);

  const wordsList = useMemo(() => {
    const raw =
      detectedWords && detectedWords.length > 0
        ? detectedWords
        : matches || [];
    if (!Array.isArray(raw)) return [];
    const extracted = raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        return (item?.prohibited_text || item?.word || item?.text || "").trim();
      })
      .filter(Boolean);
    return Array.from(new Set(extracted));
  }, [detectedWords, matches]);

  if (!visible) return null;

  const headerLabel =
    wordsList.length === 1 ? "DETECTED WORD" : "DETECTED WORDS";

  const defaultDesc =
    type === "comment"
      ? "Your comment contains a prohibited word. Please remove it before submitting."
      : "Your message contains a prohibited word. Please remove it before submitting.";

  const displayMessage = message || defaultDesc;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profanity-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl border border-red-100 transition-all zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top-right close X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <AlertOctagon size={24} />
          </div>
          <div className="pr-6">
            <h3
              id="profanity-modal-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              {displayMessage}
            </p>
          </div>
        </div>

        {/* Visually Separated Detected Words Section */}
        {wordsList.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3.5">
            <div className="text-[11px] font-bold tracking-wider text-red-800 uppercase mb-2">
              {headerLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              {wordsList.map((word, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-lg bg-red-100 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 text-[11px] text-slate-500">
          Please remove the prohibited word{wordsList.length > 1 ? "s" : ""} before submitting.
        </div>

        {/* Action: Single green OK button at lower-right */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl bg-[#0B5D1E] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#084b18] focus:outline-none focus:ring-2 focus:ring-[#0B5D1E] focus:ring-offset-2 cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
