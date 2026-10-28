import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import useApi from "../../../../Components/hooks/useApi";

export default function PaymentSecuritySetupModal({
  isOpen,
  onClose,
  userInfo,
  onSetupSuccess,
  apiBase = "/miller/payment-accounts",
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

  // Send initial or resend OTP
  const handleSendOtp = useCallback(async () => {
    if (inFlightRef.current || resendCooldown > 0) return;
    inFlightRef.current = true;
    setIsSendingOtp(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const res = await request(
        `${apiBase}/security/send-setup-otp/`,
        { method: "POST" }
      );
      if (res && (res.success || res.ok)) {
        const payload = res.data || res;
        const emailDisplay = payload.masked_email || userInfo?.masked_email || "";
        if (emailDisplay) setResolvedMaskedEmail(emailDisplay);
        setSuccessMessage(payload.message || "Verification code sent to your registered email.");
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
      console.error("Failed to send setup OTP:", err);
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

  // Automatically trigger OTP send on modal open once (guarded against React StrictMode double execution)
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

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage("");

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMessage("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage("Verification code must be exactly 6 digits.");
      return;
    }
    if (!newPassword) {
      setErrorMessage("Please enter a new Payment Security Password.");
      return;
    }
    if (newPassword.length < 12) {
      setErrorMessage("Payment Security Password must be at least 12 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation password do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await request(
        `${apiBase}/security/setup-password/`,
        {
          method: "POST",
          body: {
            otp: cleanOtp,
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
        }
      );

      if (res && (res.success || res.ok)) {
        if (onSetupSuccess) onSetupSuccess();
        onClose();
      } else {
        const errorMsg =
          res?.error ||
          res?.data?.message ||
          res?.message ||
          "Failed to configure payment security password.";
        setErrorMessage(errorMsg);
      }
    } catch (err) {
      console.error("Setup password failed:", err);
      const errorMsg =
        err?.data?.message ||
        err?.message ||
        "Failed to set up payment security password.";
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
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Set Up Payment Security
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Mandatory first-time security configuration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto space-y-4">
          {/* Important Security Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-950 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900">
              <Lock size={14} className="text-[#0B5D1E]" />
              <span>One Password For All Your Branches</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              This Payment Security Password authorizes editing, archiving, restoring, and revealing payout accounts across all branches you own. It is completely separate from your login password.
            </p>
          </div>

          {/* Masked Email Info */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <span>Registered Email:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {displayMaskedEmail}
              </span>
            </div>
            <button
              type="button"
              disabled={resendCooldown > 0 || isSendingOtp}
              onClick={handleSendOtp}
              className={`text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                resendCooldown > 0 || isSendingOtp
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-[#0B5D1E] hover:underline"
              }`}
            >
              <RefreshCw size={12} className={isSendingOtp ? "animate-spin" : ""} />
              {isSendingOtp
                ? "Sending..."
                : resendCooldown > 0
                ? `Resend (${resendCooldown}s)`
                : "Resend Code"}
            </button>
          </div>

          {/* Alerts */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && !errorMessage && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-[#0B5D1E]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* OTP Field */}
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

          {/* New Password Field */}
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
              Minimum 12 characters. Must not be identical to your login password.
            </p>
          </div>

          {/* Confirm Password Field */}
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
                placeholder="Re-enter payment security password"
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0B5D1E] hover:bg-[#084b18] text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Securing Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Complete Security Setup</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
