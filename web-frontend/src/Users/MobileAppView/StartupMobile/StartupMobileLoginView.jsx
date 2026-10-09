import React, { useState } from "react";
import { ChevronLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import logoMaskImg from "../../../assets/Logo mask.png";

/**
 * StartupMobileLoginView
 * 
 * Pixel-perfect implementation of the GrainRise Mobile Login Screen from Figma.
 * 
 * Features:
 * - Back chevron navigation
 * - GrainRise circular emblem + "Welcome" header & subtitle
 * - "EMAIL ADDRESS" input with envelope icon
 * - "PASSWORD" input with lock icon and show/hide toggle
 * - "Forgot Password?" link
 * - "Log In" green pill CTA button
 * - "Don't have an account? Register" footer
 * - Home gesture bar
 */
export default function StartupMobileLoginView({ onBack, onLoginSuccess, onForgotPassword, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }
    setErrorMessage("");
    if (onLoginSuccess) {
      onLoginSuccess({ email, password });
    }
  };

  return (
    <div className="relative flex flex-col justify-between w-full max-w-[420px] mx-auto min-h-screen bg-white text-gray-900 select-none overflow-hidden font-sans px-6 py-3">
      {/* ── Top Header with Back Navigation ──────────────────────────────── */}
      <header className="relative z-20 w-full flex items-center justify-between pt-1 shrink-0 h-10">
        <button
          onClick={onBack}
          type="button"
          aria-label="Go back"
          className="relative z-20 w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={24} strokeWidth={2.2} />
        </button>
        <div className="w-10" />
      </header>

      {/* ── Main Form Area ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center -mt-6 w-full max-w-[340px] mx-auto">
        {/* GrainRise Circular Emblem */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 flex items-center justify-center">
          <img
            src={logoMaskImg}
            alt="GrainRise Emblem"
            className="w-full h-full object-contain pointer-events-none drop-shadow-2xs select-none"
          />
        </div>

        {/* Header Titles */}
        <h1 className="text-[26px] sm:text-[28px] font-extrabold text-[#1e293b] tracking-tight text-center">
          Welcome
        </h1>
        <p className="mt-1 text-[13px] text-gray-500 text-center font-normal">
          Sign in to continue using GrainRise
        </p>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="w-full mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium text-center">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full mt-7 space-y-4">
          {/* Email Address Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-gray-400 pointer-events-none" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-[#f8fafc] border border-gray-200/90 rounded-2xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:border-[#15803d] transition-all"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-gray-400 pointer-events-none" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#f8fafc] border border-gray-200/90 rounded-2xl pl-10 pr-11 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:border-[#15803d] transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-bold text-[#15803d] hover:text-[#116b32] transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Log In CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#15803d] hover:bg-[#116b32] active:scale-98 text-white font-bold text-[15px] py-3.5 rounded-full shadow-[0_8px_20px_rgba(21,128,61,0.25)] transition-all cursor-pointer text-center"
            >
              Log In
            </button>
          </div>
        </form>
      </main>

      {/* ── Footer: Register Link & Home Indicator ───────────────────────── */}
      <footer className="w-full pb-2 pt-2 flex flex-col items-center shrink-0">
        <div className="text-xs text-gray-500 font-medium mb-3">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onRegister}
            className="font-bold text-[#15803d] hover:text-[#116b32] transition-colors cursor-pointer ml-1"
          >
            Register
          </button>
        </div>

        {/* Home Gesture Bar */}
        <div className="w-32 h-1 bg-gray-300 rounded-full" />
      </footer>
    </div>
  );
}
