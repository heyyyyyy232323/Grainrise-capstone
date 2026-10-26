import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

export default function AddProfanityModal({
  open,
  onClose,
  onSave,
}) {
  const [word, setWord] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (open) {
      setWord("");
      setValidationError("");
      setIsSubmitting(false);

      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    const val = e.target.value;
    if (val.length <= 20) {
      setWord(val);
      if (validationError && val.trim().length > 0) {
        setValidationError("");
      }
    }
  };

  const handleSubmit = async (e) => {
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
      await onSave({ prohibited_text: trimmed });
    } catch (err) {
      const message = err?.message || "Failed to save prohibited word.";
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-profanity-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2
              id="add-profanity-title"
              className="text-base font-bold text-gray-900"
            >
              Add Prohibited Word
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Prohibit words from being used in chat and user content.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <label
              htmlFor="prohibited-word-input"
              className="mb-1.5 block text-xs font-semibold text-gray-700"
            >
              Word <span className="text-red-500">*</span>
            </label>
            <input
              id="prohibited-word-input"
              type="text"
              value={word}
              onChange={handleChange}
              maxLength={20}
              placeholder="Enter prohibited word"
              autoFocus
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

          {/* Footer: Lower-right green Save button only */}
          <div className="flex items-center justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-4">
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
      </div>
    </div>,
    document.body
  );
}

