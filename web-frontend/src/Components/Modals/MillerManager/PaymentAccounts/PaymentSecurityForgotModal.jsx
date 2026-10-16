import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import useApi from "../../../../Components/hooks/useApi";

export default function PaymentSecurityForgotModal({
  isOpen,
  onClose,
  userInfo,
  onResetSuccess,
}) {
  const { request } = useApi();

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [resolvedMaskedEmail, setResolvedMaskedEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiry, setOtpExpiry] = useState(0); // Starts at 0, only runs after successful send!

  const inFlightRef = useRef(false);
  const initialSendTriggeredRef = useRef(false);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage("");
      setSuccessMessage("");
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // OTP expiry countdown
  useEffect(() => {
    if (otpExpiry <= 0) return;
    const timer = setInterval(() => {
      setOtpExpiry((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpExpiry]);

  // Send OTP
  const handleSendOtp = useCallback(async () => {
    if (inFlightRef.current || resendCooldown > 0) return;
    inFlightRef.current = true;
    setIsSendingOtp(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await request(
        "/miller/payment-accounts/security/forgot-password/request-otp/",
        { method: "POST" }
      );
      if (res && (res.success || res.ok)) {
        const payload = res.data || res;
        const emailDisplay = payload.masked_email || userInfo?.masked_email || "";
        if (emailDisplay) setResolvedMaskedEmail(emailDisplay);
        setSuccessMessage(payload.message || "Reset verification code sent to your email.");
        setResendCooldown(payload.retry_after || 60);
        setOtpExpiry(payload.expires_in || 300);
      } else {
        const errorMsg =
          res?.error ||
          res?.data?.message ||
          res?.message ||
          "Failed to send verification code. Please try again.";
        setErrorMessage(errorMsg);
        setOtpExpiry(0);
        setResendCooldown(0);
      }
    } catch (err) {
      console.error("Failed to send forgot password OTP:", err);
      const errorMsg =
        err?.data?.message ||
        err?.message ||
        "Failed to send verification code. Please try again.";
      setErrorMessage(errorMsg);
      setOtpExpiry(0);
      setResendCooldown(0);
    } finally {
      setIsSendingOtp(false);
      inFlightRef.current = false;
    }
  }, [request, resendCooldown, userInfo?.masked_email]);

  // Trigger initial OTP send on open once (guarded against React StrictMode double execution)
  useEffect(() => {
    if (isOpen) {
      if (!initialSendTriggeredRef.current) {
        initialSendTriggeredRef.current = true;
        handleSendOtp();
      }
    } else {
      initialSendTriggeredRef.current = false;
    }
  }, [isOpen, handleSendOtp]);

  // Handle Submit
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setErrorMessage("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }

    if (!newPassword || newPassword.length < 12) {
      setErrorMessage("New security password must be at least 12 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match. Please re-enter.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await request(
        "/miller/payment-accounts/security/forgot-password/reset/",
        {
          method: "POST",
          body: {
            otp: otp.trim(),
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
        }
      );

      if (res && (res.success || res.ok)) {
        const payload = res.data || res;
        setSuccessMessage(payload.message || "Payment security password reset successfully.");
        setTimeout(() => {
          if (onResetSuccess) onResetSuccess();
          onClose();
        }, 1200);
      } else {
        const errorMsg =
          res?.error ||
          res?.data?.message ||
          res?.message ||
          "Failed to reset password. Please verify the code.";
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error("Reset password failed:", err);
      const errorMsg =
        err?.data?.message ||
        err?.message ||
        "Failed to reset payment security password.";
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const minutesLeft = Math.floor(otpExpiry / 60);
  const secondsLeft = otpExpiry % 60;
  const formattedExpiry = `${minutesLeft}:${secondsLeft < 10 ? "0" : ""}${secondsLeft}`;
  const displayMaskedEmail = resolvedMaskedEmail || userInfo?.masked_email || "your registered email";

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Reset Payment Security Password
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Email Info Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
            <Mail size={18} className="text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed flex-1">
              <span>We've sent a 6-digit verification code to </span>
              <strong className="text-slate-900 font-semibold">{displayMaskedEmail}</strong>.
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isSendingOtp}
                  onClick={handleSendOtp}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw size={11} className={isSendingOtp ? "animate-spin" : ""} />
                  {isSendingOtp
                    ? "Sending..."
                    : resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </button>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {successMessage && !errorMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 text-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* OTP Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Six-Digit Verification Code <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {otpExpiry > 0 ? `Expires in ${formattedExpiry}` : isSendingOtp ? "Sending code..." : ""}
              </span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setErrorMessage("");
              }}
              placeholder="000000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-lg font-bold tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              autoFocus
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Payment Security Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="At least 12 characters"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum 12 characters. Cannot be identical to your login password.
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Re-enter new security password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                aria-label="Toggle password visibility"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
