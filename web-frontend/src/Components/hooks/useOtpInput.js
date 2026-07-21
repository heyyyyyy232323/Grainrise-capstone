import { useState, useEffect, useRef } from "react";

/**
 * useOtpInput
 * Manages all OTP input logic:
 *  - 6 individual digit inputs
 *  - Auto-focus to next input on entry
 *  - Backspace moves focus to previous input
 *  - Countdown timer for resend
 *  - Resend resets digits and timer
 *
 * @param {number} length       - Number of OTP digits (default: 6)
 * @param {number} timerSeconds - Countdown duration in seconds (default: 60)
 *
 * Usage:
 *   const { otp, otpRefs, otpTimer, handleOtpChange, handleOtpKeyDown, handleResendOtp, isOtpComplete } = useOtpInput();
 */
const useOtpInput = (length = 6, timerSeconds = 60) => {
  const [otp, setOtp] = useState(Array(length).fill(""));
  const [otpTimer, setOtpTimer] = useState(timerSeconds);
  const [isActive, setIsActive] = useState(false); // controls when timer runs
  const otpRefs = useRef([]);

  /** Start the countdown (call this when the OTP step becomes active) */
  const startTimer = () => {
    setIsActive(true);
    setOtpTimer(timerSeconds);
  };

  useEffect(() => {
    if (!isActive) return;
    if (otpTimer <= 0) {
      setIsActive(false);
      return;
    }
    const timer = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isActive, otpTimer]);

  /** Handle digit entry — only allows 0-9, auto-advances focus */
  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  /** Handle backspace — moves focus to previous input if current is empty */
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  /** Resend OTP — resets digits and restarts countdown */
  const handleResendOtp = () => {
    if (otpTimer === 0) {
      setOtp(Array(length).fill(""));
      setOtpTimer(timerSeconds);
      setIsActive(true);
      // Focus the first input
      otpRefs.current[0]?.focus();
    }
  };

  /** Formats the timer as MM:SS (e.g. "00:45") */
  const formattedTimer = `00:${otpTimer.toString().padStart(2, "0")}`;

  /** True when all OTP digits are filled */
  const isOtpComplete = otp.every((digit) => digit !== "");

  /** Returns the OTP as a single string (e.g. "123456") */
  const otpValue = otp.join("");

  /** Reset everything */
  const resetOtp = () => {
    setOtp(Array(length).fill(""));
    setOtpTimer(timerSeconds);
    setIsActive(false);
  };

  return {
    otp,
    otpRefs,
    otpTimer,
    formattedTimer,
    isOtpComplete,
    otpValue,
    handleOtpChange,
    handleOtpKeyDown,
    handleResendOtp,
    startTimer,
    resetOtp,
  };
};

export default useOtpInput;
