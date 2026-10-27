import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export default function EditProfanityModal({
  open,
  wordRecord,
  supportedStatuses = ["active", "inactive"],
  onClose,
  onSave,
  onDelete,
}) {
  const [word, setWord] = useState("");
  const [status, setStatus] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open && wordRecord) {
      setWord(wordRecord.prohibited_text || "");
      setStatus(wordRecord.status || "active");
      setValidationError("");
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setIsDeleting(false);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open, wordRecord]);

  if (!open || !wordRecord) return null;

  const handleWordChange = (e) => {
    const val = e.target.value;
    if (val.length <= 20) {
      setWord(val);
      if (validationError && val.trim().length > 0) {
        setValidationError("");
      }
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const trimmed = word.trim();
    if (!trimmed) {
      setValidationError("Please enter a prohibited word.");
      return;
    }

    if (trimmed.length > 20) {
      setValidationError("Prohibited word cannot exceed 20 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError("");
      await onSave({
        profanityId: wordRecord.profanity_id,
        prohibited_text: trimmed,
        status,
      });
    } catch (err) {
      const message = err?.message || "Failed to update prohibited word.";
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete(wordRecord.profanity_id);
    } catch (err) {
      const message = err?.message || "Failed to delete prohibited word.";
      setValidationError(message);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profanity-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2
              id="edit-profanity-title"
              className="text-base font-bold text-gray-900"
            >
              Edit Prohibited Word
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Update word or moderation status.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Delete Confirmation Overlay inside modal */}
        {showDeleteConfirm ? (
          <div className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-rose-900">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Delete Prohibited Word?</p>
                <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong>"{wordRecord.prohibited_text}"</strong>? This word will
                  no longer be restricted.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="px-6 py-5 space-y-4">
              {/* Word Input */}
              <div>
                <label
                  htmlFor="edit-prohibited-word-input"
                  className="mb-1.5 block text-xs font-semibold text-gray-700"
                >
                  Word <span className="text-red-500">*</span>
                </label>
                <input
                  id="edit-prohibited-word-input"
                  type="text"
                  value={word}
                  onChange={handleWordChange}
                  maxLength={20}
                  placeholder="Enter prohibited word"
                  disabled={isSubmitting}
                  className={`h-10 w-full rounded-xl border px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 ${
                    validationError
                      ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                      : "border-gray-200 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                  }`}
                />

                {/* Live counter & validation error */}
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-rose-500 font-medium">
                    {validationError || ""}
                  </span>
                  <span className="text-gray-400 tabular-nums">
                    {word.length}/20
                  </span>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label
                  htmlFor="edit-status-select"
                  className="mb-1.5 block text-xs font-semibold text-gray-700"
                >
                  Status
                </label>
                <select
                  id="edit-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={isSubmitting}
                  className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                >
                  {supportedStatuses.map((st) => (
                    <option key={st} value={st}>
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer with Delete on left and Save on right */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-95 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !word.trim()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#018311] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#016b0f] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                <span>Save</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

