import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";

import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";
import useApi from "../Components/hooks/useApi";
import useFormValidation from "../Components/hooks/useFormValidation";
import TermsModal from "../Components/Modals/TermsModal";
import PrivacyModal from "../Components/Modals/PrivacyModal";

// ============================================================
// CONSTANTS
// ============================================================

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

// ============================================================
// PASSWORD STRENGTH CRITERIA
// ============================================================

const getStrengthCriteria = (pw) => [
  { label: "At least 8 characters", met: pw.length >= 8 },
  { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(pw) },
  { label: "One lowercase letter (a-z)", met: /[a-z]/.test(pw) },
  { label: "One number (0-9)", met: /[0-9]/.test(pw) },
  { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

const getStrengthLevel = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++;
  return score;
};

const getStrengthLabel = (score) => {
  if (score <= 2) return { label: "Weak", barCls: "bg-red-500", textCls: "text-red-500" };
  if (score <= 4) return { label: "Medium", barCls: "bg-amber-500", textCls: "text-amber-600" };
  return { label: "Strong", barCls: "bg-emerald-600", textCls: "text-emerald-600" };
};

// ============================================================
// MASK EMAIL  e.g.  j***e@gmail.com
// ============================================================

const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const masked =
    local.length <= 2
      ? local[0] + "***"
      : local[0] + "***" + local[local.length - 1];
  return `${masked}@${domain}`;
};

// ============================================================
// COMPONENT
// ============================================================

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const { getPasswordStrength } = useFormValidation();

  // ── Steps: 1 = email, 2 = otp, 3 = new-password ──────────
  const [step, setStep] = useState(1);

  // ── Step 1 ────────────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ── Step 2 ────────────────────────────────────────────────
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const otpRefs = useRef([]);

  // ── Step 3 ────────────────────────────────────────────────
  const [verificationToken, setVerificationToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // ── Modals ────────────────────────────────────────────────
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // ── Timer countdown ────────────────────────────────────────
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formattedTimer = `00:${String(timer).padStart(2, "0")}`;

  // ── Strength ─────────────────────────────────────────────
  const strengthScore = getStrengthLevel(newPassword);
  const { label: strengthLabel, barCls: strengthBarCls, textCls: strengthTextCls } =
    getStrengthLabel(strengthScore);
  const criteria = getStrengthCriteria(newPassword);

  // ────────────────────────────────────────────────────────────
  // STEP 1 — Send OTP
  // ────────────────────────────────────────────────────────────

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailError("");
    setIsSending(true);

    try {
      const res = await request("/auth/forgot-password/send-otp", {
        method: "POST",
        body: { email: trimmed },
        throwOnError: true,
      });

      setTimer(Number(res?.retry_after) || RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setStep(2);

      // Focus first OTP box after step change
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);

    } catch (err) {
      setEmailError(err?.message || "Unable to send verification code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // STEP 2 — OTP input helpers
  // ────────────────────────────────────────────────────────────

  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const updated = [...otp];
    updated[index] = digit;
    setOtp(updated);
    setOtpError("");

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length > 0) {
      const updated = Array(OTP_LENGTH).fill("");
      pasted.split("").forEach((ch, i) => {
        updated[i] = ch;
      });
      setOtp(updated);
      otpRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
      e.preventDefault();
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0 || isResending) return;
    setIsResending(true);
    try {
      const res = await request("/auth/forgot-password/send-otp", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
        throwOnError: true,
      });
      setTimer(Number(res?.retry_after) || RESEND_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setOtpError(err?.message || "Unable to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  // STEP 2 — Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const otpValue = otp.join("");

    if (otpValue.length < OTP_LENGTH || otp.some((d) => d === "")) {
      setOtpError(`Please enter all ${OTP_LENGTH} digits.`);
      return;
    }

    setOtpError("");
    setIsVerifying(true);

    try {
      const res = await request("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          otp: otpValue,
        },
        throwOnError: true,
      });

      setVerificationToken(res?.verification_token || "");
      setStep(3);

    } catch (err) {
      setOtpError(err?.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // STEP 3 — Reset Password
  // ────────────────────────────────────────────────────────────

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordError("");
    setIsResetting(true);

    try {
      await request("/auth/forgot-password/reset", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          verification_token: verificationToken,
          new_password: newPassword,
        },
        throwOnError: true,
      });

      setResetSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 2500);

    } catch (err) {
      setPasswordError(err?.message || "Unable to reset password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-gradient-to-br from-[#e8f5e9] via-[#f5faf5] to-[#bcead1] dark:from-[#07150d] dark:via-[#0c2416] dark:to-[#0f2d1c]">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-multiply dark:opacity-20 pointer-events-none z-0"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Main card area */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-10">
        <div className="w-full max-w-[440px] bg-white dark:bg-[#111c18] rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 p-6 sm:p-9 flex flex-col items-center">

          {/* Logo */}
          <div className="flex items-center justify-center mb-5">
            <img src={Logo} alt="GrainRise" className="h-12 w-auto object-contain" />
          </div>

          {/* ── STEP 1: ENTER EMAIL ────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white text-center mb-2 leading-tight font-['Outfit']">
                Forgot Password
              </h1>

              <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed max-w-[360px]">
                Enter your registered email address and we&apos;ll send you a
                verification code to reset your password.
              </p>

              <form onSubmit={handleSendOtp} className="w-full flex flex-col gap-4">
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300" htmlFor="fp-email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    className={`w-full px-3.5 py-2.5 text-sm border rounded-lg bg-white dark:bg-[#182820] text-gray-900 dark:text-white outline-none transition-all ${
                      emailError
                        ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                        : "border-gray-300 dark:border-white/20 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                    }`}
                    placeholder="youremail@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError("");
                    }}
                    disabled={isSending}
                    autoComplete="email"
                  />
                  {emailError && (
                    <p className="text-xs text-red-500 mt-0.5">{emailError}</p>
                  )}
                </div>

                <button
                  id="fp-send-otp-btn"
                  type="submit"
                  className="w-full bg-[#0d6e38] hover:bg-[#0b592d] text-white text-sm font-semibold rounded-full py-3 px-5 transition-colors shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : "Send Verification Code"}
                </button>
              </form>

              <p className="text-[13px] text-gray-500 dark:text-gray-400 text-center mt-5 mb-0">
                Remember your password?{" "}
                <Link to="/login" className="text-emerald-700 dark:text-emerald-400 font-semibold underline hover:text-emerald-800">
                  Back to Login
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: VERIFY OTP ─────────────────────────── */}
          {step === 2 && (
            <>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white text-center mb-2 leading-tight font-['Outfit']">
                Verify Your Email
              </h1>

              <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-4 leading-relaxed max-w-[360px]">
                Enter the 6-digit verification code sent to your registered email address.
              </p>

              {/* Email pill */}
              <div className="w-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg py-2.5 px-3.5 text-xs sm:text-[13px] text-center mb-4">
                Code sent to{" "}
                <strong>{maskEmail(email.trim().toLowerCase())}</strong>
              </div>

              <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-4">
                {/* OTP boxes */}
                <div className="flex justify-between gap-2 w-full my-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      id={`fp-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-bold rounded-xl border-2 outline-none transition-all bg-white dark:bg-[#182820] text-gray-900 dark:text-white ${
                        otpError
                          ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-gray-300 dark:border-white/20 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                      }`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="text-xs text-red-500 text-center">{otpError}</p>
                )}

                {/* Timer / resend */}
                <div className="flex flex-col items-center gap-1 my-1">
                  {timer > 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Resend available in{" "}
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formattedTimer}</span>
                    </p>
                  ) : null}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Don&apos;t have the code?{" "}
                    <button
                      type="button"
                      className={`font-semibold ml-1 underline cursor-pointer ${
                        timer > 0 ? "text-gray-400 cursor-not-allowed no-underline" : "text-emerald-700 dark:text-emerald-400 hover:text-emerald-800"
                      }`}
                      onClick={handleResendOtp}
                      disabled={timer > 0 || isResending}
                    >
                      {isResending ? "Sending..." : "Request OTP"}
                    </button>
                  </p>
                </div>

                <button
                  id="fp-verify-otp-btn"
                  type="submit"
                  className="w-full bg-[#0d6e38] hover:bg-[#0b592d] text-white text-sm font-semibold rounded-full py-3 px-5 transition-colors shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Send Verification Code"}
                </button>

                <button
                  type="button"
                  className="w-full bg-white dark:bg-[#182820] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium border border-gray-300 dark:border-white/20 rounded-full py-2.5 px-5 transition-colors cursor-pointer"
                  onClick={() => setStep(1)}
                >
                  ← Back
                </button>
              </form>
            </>
          )}

          {/* ── STEP 3: CREATE NEW PASSWORD ─────────────────── */}
          {step === 3 && !resetSuccess && (
            <>
              <h1 className="text-[22px] font-bold text-gray-900 dark:text-white text-center mb-2 leading-tight font-['Outfit']">
                Create New Password
              </h1>

              <p className="text-xs sm:text-[13px] text-gray-500 dark:text-gray-400 text-center mb-5 leading-relaxed max-w-[360px]">
                Create a strong new password for your GrainRise account.
              </p>

              <form onSubmit={handleResetPassword} className="w-full flex flex-col gap-4">
                {/* New Password */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300" htmlFor="fp-new-pw">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <input
                      id="fp-new-pw"
                      type={showNewPassword ? "text" : "password"}
                      className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-[#182820] text-gray-900 dark:text-white outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 transition-all"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      onClick={() => setShowNewPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {newPassword && (
                    <>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthBarCls}`}
                          style={{ width: `${(strengthScore / 5) * 100}%` }}
                        />
                      </div>
                      <p className={`text-[11px] font-semibold text-right mt-0.5 ${strengthTextCls}`}>
                        {strengthLabel}
                      </p>
                    </>
                  )}

                  {/* Criteria checklist */}
                  <ul className="flex flex-col gap-1 my-1">
                    {criteria.map((c) => (
                      <li key={c.label} className="flex items-center gap-1.5 text-xs">
                        {c.met ? (
                          <CheckCircle2
                            size={14}
                            className="text-emerald-600 shrink-0"
                          />
                        ) : (
                          <Circle
                            size={14}
                            className="text-gray-300 dark:text-gray-600 shrink-0"
                          />
                        )}
                        <span className={c.met ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5 w-full">
                  <label className="text-[13px] font-medium text-gray-700 dark:text-gray-300" htmlFor="fp-confirm-pw">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full">
                    <input
                      id="fp-confirm-pw"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`w-full px-3.5 py-2.5 pr-10 text-sm border rounded-lg bg-white dark:bg-[#182820] text-gray-900 dark:text-white outline-none transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "border-red-500 focus:ring-2 focus:ring-red-500/20"
                          : "border-gray-300 dark:border-white/20 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                      }`}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (passwordError) setPasswordError("");
                      }}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500">Passwords do not match.</p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-xs text-emerald-600 font-medium">Password Match</p>
                  )}
                </div>

                {passwordError && (
                  <p className="text-xs text-red-500">{passwordError}</p>
                )}

                <button
                  id="fp-reset-btn"
                  type="submit"
                  className="w-full bg-[#0d6e38] hover:bg-[#0b592d] text-white text-sm font-semibold rounded-full py-3 px-5 transition-colors shadow-sm disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          {/* ── SUCCESS ─────────────────────────────────────── */}
          {resetSuccess && (
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 size={52} className="text-emerald-600 mb-4" />
              <h2 className="text-[22px] font-bold text-gray-900 dark:text-white mb-2 font-['Outfit']">Password Reset!</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[320px] leading-relaxed">
                Your password has been reset successfully. Redirecting to login…
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full flex flex-col sm:flex-row items-center justify-between px-6 sm:px-8 py-4 text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-[#0f1c14]/80 backdrop-blur-md border-t border-gray-200/80 dark:border-white/10 gap-3">
        <span>© 2026 GrainRise. All rights reserved.</span>

        <div className="flex items-center gap-2">
          <button
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            onClick={() => setIsPrivacyOpen(true)}
          >
            Privacy Policy
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
            onClick={() => setIsTermsOpen(true)}
          >
            Terms of Service
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <Link to="/contact-support" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
            Contact Support
          </Link>
        </div>
      </footer>

      {/* Modals */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};

export default ForgotPassword;
