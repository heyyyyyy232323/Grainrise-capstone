import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Archive,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function ArchiveReasonModal({
  isOpen,
  onClose,
  account,
  accountType = "branch", // 'branch' | 'employee'
  authToken,
  onConfirmArchive,
}) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setIsLoading(false);
      setErrorMessage("");
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen || !account) return null;

  const handleClear = () => {
    setReason("");
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!reason.trim()) {
      setErrorMessage("Please provide a reason for archiving this payment account.");
      return;
    }
    if (reason.trim().length < 3) {
      setErrorMessage("Archive reason must be at least 3 characters long.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    try {
      if (onConfirmArchive) {
        const result = await onConfirmArchive({
          reason: reason.trim(),
          auth_token: authToken,
        });
        if (result && result.success === false) {
          setErrorMessage(result.error || result.message || "Failed to archive account.");
        }
      }
    } catch (err) {
      console.error("Archive failed:", err);
      const msg = err?.data?.message || err?.message || "Failed to archive account.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const accountDisplayName =
    accountType === "employee"
      ? account.employee_name || account.account_name
      : account.account_name || account.branch_name;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Archive size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Archive Payment Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
            title="Return to details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 leading-relaxed">
            Are you sure you want to archive{" "}
            <strong>{accountDisplayName}</strong>? Archiving will disable this account
            from active transaction choices.
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-3 rounded-xl flex items-start gap-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-800">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Archiving <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrorMessage("");
              }}
              placeholder="State why this payment account is being archived..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
              autoFocus
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || !reason}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isLoading}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Archiving...</span>
                </>
              ) : (
                <span>Archive Account</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

