import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

export default function PaymentSecurityPasswordModal({
  isOpen,
  onClose,
  title = "Payment Security Authorization",
  description = "Enter your 12+ character payment security password to proceed.",
  confirmText = "Authorize",
  onAuthorize,
  onConfirm,
  onForgotPassword,
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setShowPassword(false);
      setIsLoading(false);
      setErrorMessage("");
      setAttemptsLeft(null);
      setIsLocked(false);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!password.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage("");
    const authorizeFn = onAuthorize || onConfirm;
    try {
      if (authorizeFn) {
        const result = await authorizeFn(password);
        if (result && result.success === false) {
          setErrorMessage(result.error || result.message || "Invalid security password.");
          if (result.attempts_left !== undefined) {
            setAttemptsLeft(result.attempts_left);
          }
          if (result.locked || result.locked_until) {
            setIsLocked(true);
          }
        }
      }
    } catch (err) {
      console.error("Authorization error:", err);
      const msg = err?.data?.message || err?.message || "Invalid payment security password.";
      setErrorMessage(msg);
      if (err?.data?.attempts_left !== undefined) {
        setAttemptsLeft(err.data.attempts_left);
      }
      if (err?.data?.locked) {
        setIsLocked(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {title}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>

          {/* Error / Lockout Alert */}
          {errorMessage && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                isLocked
                  ? "bg-rose-50 border border-rose-200 text-rose-800"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}
            >
              {isLocked ? (
                <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold block">{errorMessage}</span>
                {attemptsLeft !== null && attemptsLeft > 0 && !isLocked && (
                  <span className="text-[11px] block mt-0.5 text-amber-700">
                    Remaining attempts before temporary lockout: <b>{attemptsLeft}</b>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Security Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                disabled={isLoading || isLocked}
                placeholder="Enter your security password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:bg-slate-50 disabled:opacity-70"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                if (onForgotPassword) onForgotPassword();
              }}
              className="text-xs font-semibold text-[#0B5D1E] hover:text-[#084b18] hover:underline cursor-pointer transition"
            >
              Forgot Payment Security Password?
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!password.trim() || isLoading || isLocked}
              className="px-5 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>{confirmText}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

