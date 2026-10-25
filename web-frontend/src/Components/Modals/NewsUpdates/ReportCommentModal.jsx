import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flag, AlertTriangle } from "lucide-react";

const PRESET_REASONS = [
  "Inappropriate language or profanity",
  "Harassment or personal attack",
  "Spam or unsolicited promotion",
  "False or misleading information",
  "Hate speech or discrimination",
  "Impersonation or deceptive account",
  "Threatening or violent content",
  "Other violation of community guidelines",
];

export default function ReportCommentModal({
  isOpen,
  onClose,
  comment,
  articleTitle = "",
  onSubmitReport,
}) {
  const [selectedReason, setSelectedReason] = useState(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(PRESET_REASONS[0]);
      setCustomReason("");
      setError("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !comment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedReason === "Other violation of community guidelines" && !customReason.trim()) {
      setError("Please provide details explaining the guideline violation.");
      return;
    }

    const finalReason =
      selectedReason === "Other violation of community guidelines"
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      setError("Please select or enter a reason for reporting.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      if (onSubmitReport) {
        await onSubmitReport(finalReason);
      }
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to submit comment report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const commentText = comment.text || comment.comment_text || comment.comment_content || "";
  const authorName = comment.author || comment.author_name || "User";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - No X button */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Flag size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Report Comment</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Help GrainRise maintain a safe and respectful community.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Comment Preview */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reported Comment
            </label>
            <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>{authorName}</span>
                {articleTitle && (
                  <span className="text-[11px] text-slate-400 max-w-[200px] truncate">
                    on: {articleTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 line-clamp-3 italic">
                "{commentText}"
              </p>
            </div>
          </div>

          {/* Preset Reasons (8 approved) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Reason for Report
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 text-xs font-medium cursor-pointer transition ${
                    selectedReason === r
                      ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 font-semibold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-[#08511f]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Details for Others */}
          {selectedReason === "Other violation of community guidelines" && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Additional Details <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Explain why this comment violates community guidelines (required)..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>
          )}

          {/* Footer with Cancel and Submit */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#08511f] px-5 py-2 text-xs font-bold text-white hover:bg-[#063f18] transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Flag size={13} />
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
