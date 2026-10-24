import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import useApi from "../hooks/useApi";

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const { request } = useApi();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;
  const isDifferentFromCurrent = !currentPassword || !newPassword || currentPassword !== newPassword;

  const isFormValid =
    currentPassword.trim().length > 0 &&
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    passwordsMatch &&
    isDifferentFromCurrent;

  const handleReset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMessage("");
    setTouched({});
  };

  const handleClose = () => {
    if (isSubmitting) return;
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setTouched({
      current: true,
      new: true,
      confirm: true,
    });

    if (!currentPassword.trim()) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (!hasMinLength || !hasUpperCase || !hasLowerCase || !hasNumber) {
      setErrorMessage("Please fulfill all password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    if (!isDifferentFromCurrent) {
      setErrorMessage("New password cannot be the same as your current password.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await request("/auth/change-password/", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        throwOnError: true,
      });

      handleReset();
      if (onSuccess) {
        onSuccess(response?.message || "Password updated successfully.");
      }
      onClose();
    } catch (err) {
      setErrorMessage(
        err?.message || err?.detail || "Unable to change password. Please check your current password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-200 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Change Password</h3>
              <p className="text-xs text-gray-500">Update your account credentials</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Current Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={15} />
              </div>
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                onBlur={() => setTouched((p) => ({ ...p, current: true }))}
                disabled={isSubmitting}
                placeholder="Enter current password"
                className="w-full pl-9 pr-10 py-2.5 text-xs font-medium rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:bg-gray-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {touched.current && !currentPassword.trim() && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">Current password is required.</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={15} />
              </div>
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                onBlur={() => setTouched((p) => ({ ...p, new: true }))}
                disabled={isSubmitting}
                placeholder="Enter new password (min. 8 characters)"
                className="w-full pl-9 pr-10 py-2.5 text-xs font-medium rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition disabled:bg-gray-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {currentPassword && newPassword && currentPassword === newPassword && (
              <p className="mt-1 text-[11px] text-amber-600 font-medium">
                New password cannot be identical to current password.
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock size={15} />
              </div>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                onBlur={() => setTouched((p) => ({ ...p, confirm: true }))}
                disabled={isSubmitting}
                placeholder="Re-enter new password"
                className={`w-full pl-9 pr-10 py-2.5 text-xs font-medium rounded-xl border outline-none transition disabled:bg-gray-50 ${
                  confirmPassword && !passwordsMatch
                    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    : "border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                }`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {touched.confirm && confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-[11px] text-red-600 font-medium">Passwords do not match.</p>
            )}
          </div>

          {/* Password Requirements Checklist */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700 text-[11px] mb-1">Password Requirements:</p>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                <CheckCircle2 size={12} className={hasMinLength ? "text-emerald-600" : "text-slate-300"} />
                8+ characters
              </span>
              <span className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                <CheckCircle2 size={12} className={hasUpperCase ? "text-emerald-600" : "text-slate-300"} />
                1 uppercase (A-Z)
              </span>
              <span className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                <CheckCircle2 size={12} className={hasLowerCase ? "text-emerald-600" : "text-slate-300"} />
                1 lowercase (a-z)
              </span>
              <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-semibold" : "text-slate-400"}`}>
                <CheckCircle2 size={12} className={hasNumber ? "text-emerald-600" : "text-slate-300"} />
                1 number (0-9)
              </span>
              <span className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-700 font-semibold" : "text-slate-400"} col-span-2`}>
                <CheckCircle2 size={12} className={passwordsMatch ? "text-emerald-600" : "text-slate-300"} />
                Passwords match
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <ShieldCheck size={14} /> Update Password
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

