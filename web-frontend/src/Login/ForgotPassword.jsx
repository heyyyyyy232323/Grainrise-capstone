import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";

import Logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";
import useApi from "../Components/hooks/useApi";
import useFormValidation from "../Components/hooks/useFormValidation";
import TermsModal from "../Components/Modals/TermsModal";
import PrivacyModal from "../Components/Modals/PrivacyModal";

import "./ForgotPassword.css";

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
  if (score <= 2) return { label: "Weak", cls: "fp-strength-weak" };
  if (score <= 4) return { label: "Medium", cls: "fp-strength-medium" };
  return { label: "Strong", cls: "fp-strength-strong" };
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
  const { label: strengthLabel, cls: strengthCls } =
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
    <div className="fp-root">
      {/* Background */}
      <div
        className="fp-bg"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      {/* Main card area */}
      <div className="fp-content">
        <div className="fp-card">

          {/* Logo */}
          <div className="fp-logo-wrap">
            <img src={Logo} alt="GrainRise" className="fp-logo" />
          </div>

          {/* ── STEP 1: ENTER EMAIL ────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="fp-title">
                <span className="fp-title-highlight">Forgot Password</span>
              </h1>

              <p className="fp-subtitle">
                Enter your registered email address and we&apos;ll send you a
                verification code to reset your password.
              </p>

              <form onSubmit={handleSendOtp} className="fp-form">
                <div className="fp-field">
                  <label className="fp-label" htmlFor="fp-email">
                    Email Address <span className="fp-required">*</span>
                  </label>
                  <input
                    id="fp-email"
                    type="email"
                    className={`fp-input ${emailError ? "fp-input-error" : ""}`}
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
                    <p className="fp-error-msg">{emailError}</p>
                  )}
                </div>

                <button
                  id="fp-send-otp-btn"
                  type="submit"
                  className="fp-btn-green"
                  disabled={isSending}
                >
                  {isSending ? "Sending..." : "Send Verification Code"}
                </button>
              </form>

              <p className="fp-back-link">
                Remember your password?{" "}
                <Link to="/login" className="fp-link">
                  Back to Login
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2: VERIFY OTP ─────────────────────────── */}
          {step === 2 && (
            <>
              <h1 className="fp-title fp-title-plain">Verify Your Email</h1>

              <p className="fp-subtitle">
                Enter the 6-digit verification code sent to your registered email address.
              </p>

              {/* Email pill */}
              <div className="fp-email-pill">
                Code sent to{" "}
                <strong>{maskEmail(email.trim().toLowerCase())}</strong>
              </div>

              <form onSubmit={handleVerifyOtp} className="fp-form">
                {/* OTP boxes */}
                <div className="fp-otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      id={`fp-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`fp-otp-box ${otpError ? "fp-otp-box-error" : ""}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    />
                  ))}
                </div>

                {otpError && (
                  <p className="fp-error-msg fp-error-center">{otpError}</p>
                )}

                {/* Timer / resend */}
                <div className="fp-resend-row">
                  {timer > 0 ? (
                    <p className="fp-timer-text">
                      Resend available in{" "}
                      <span className="fp-timer-value">{formattedTimer}</span>
                    </p>
                  ) : null}

                  <p className="fp-resend-text">
                    Don&apos;t have the code?{" "}
                    <button
                      type="button"
                      className={`fp-resend-btn ${timer > 0 ? "fp-resend-disabled" : ""}`}
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
                  className="fp-btn-green"
                  disabled={isVerifying}
                >
                  {isVerifying ? "Verifying..." : "Send Verification Code"}
                </button>

                <button
                  type="button"
                  className="fp-back-btn"
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
              <h1 className="fp-title fp-title-plain">Create New Password</h1>

              <p className="fp-subtitle">
                Create a strong new password for your GrainRise account.
              </p>

              <form onSubmit={handleResetPassword} className="fp-form">
                {/* New Password */}
                <div className="fp-field">
                  <label className="fp-label" htmlFor="fp-new-pw">
                    New Password <span className="fp-required">*</span>
                  </label>
                  <div className="fp-input-wrap">
                    <input
                      id="fp-new-pw"
                      type={showNewPassword ? "text" : "password"}
                      className="fp-input"
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
                      className="fp-eye-btn"
                      onClick={() => setShowNewPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {newPassword && (
                    <>
                      <div className="fp-strength-bar-wrap">
                        <div
                          className={`fp-strength-bar ${strengthCls}`}
                          style={{ width: `${(strengthScore / 5) * 100}%` }}
                        />
                      </div>
                      <p className={`fp-strength-label ${strengthCls}-text`}>
                        {strengthLabel}
                      </p>
                    </>
                  )}

                  {/* Criteria checklist */}
                  <ul className="fp-criteria-list">
                    {criteria.map((c) => (
                      <li key={c.label} className="fp-criteria-item">
                        {c.met ? (
                          <CheckCircle2
                            size={14}
                            className="fp-criteria-icon fp-criteria-met"
                          />
                        ) : (
                          <Circle
                            size={14}
                            className="fp-criteria-icon fp-criteria-unmet"
                          />
                        )}
                        <span className={c.met ? "fp-criteria-met-text" : "fp-criteria-unmet-text"}>
                          {c.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Confirm Password */}
                <div className="fp-field">
                  <label className="fp-label" htmlFor="fp-confirm-pw">
                    Confirm New Password <span className="fp-required">*</span>
                  </label>
                  <div className="fp-input-wrap">
                    <input
                      id="fp-confirm-pw"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`fp-input ${
                        confirmPassword && confirmPassword !== newPassword
                          ? "fp-input-error"
                          : ""
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
                      className="fp-eye-btn"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="fp-error-msg">Passwords do not match.</p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="fp-match-text">Password Match</p>
                  )}
                </div>

                {passwordError && (
                  <p className="fp-error-msg">{passwordError}</p>
                )}

                <button
                  id="fp-reset-btn"
                  type="submit"
                  className="fp-btn-green"
                  disabled={isResetting}
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </>
          )}

          {/* ── SUCCESS ─────────────────────────────────────── */}
          {resetSuccess && (
            <div className="fp-success-wrap">
              <CheckCircle2 size={52} className="fp-success-icon" />
              <h2 className="fp-success-title">Password Reset!</h2>
              <p className="fp-success-msg">
                Your password has been reset successfully. Redirecting to login…
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="fp-footer">
        <span>© 2026 GrainRise. All rights reserved.</span>

        <div className="fp-footer-links">
          <button
            className="fp-footer-link"
            onClick={() => setIsPrivacyOpen(true)}
          >
            Privacy Policy
          </button>
          <span className="fp-footer-sep">|</span>
          <button
            className="fp-footer-link"
            onClick={() => setIsTermsOpen(true)}
          >
            Terms of Service
          </button>
          <span className="fp-footer-sep">|</span>
          <a href="/contact-support" className="fp-footer-link">
            Contact Support
          </a>
        </div>
      </footer>

      {/* Modals */}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
};

export default ForgotPassword;
