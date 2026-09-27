import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import userBackgroundImage from "../assets/UserloginBG.png";
import useApi from "../Components/hooks/useApi";
import useAuth from "../Components/hooks/useAuth";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { request } = useApi();
  const { user, token, login } = useAuth();

  const roleRoutes = {
    retailer: "/retailer/point-of-sale",
    warehouse_manager: "/warehouse-manager/dashboard",
    miller_manager: "/miller-manager/dashboard",
    farmer: "/farmer/dashboard",
  };

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword && newPassword === confirmPassword;

  const isFormValid =
    currentPassword &&
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!isFormValid) {
      setErrorMessage("Please fulfill all password requirements before proceeding.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await request("/auth/change-temporary-password", {
        method: "POST",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
          identifier: user?.email || "",
        },
        throwOnError: true,
      });

      if (response.access_token && response.user) {
        login(response.access_token, response.user);
      }

      if (response.profile_incomplete) {
        navigate("/complete-profile", { replace: true });
      } else {
        const dest = roleRoutes[response.user?.role || user?.role] || "/dashboard-preview";
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setErrorMessage(
        err?.message || "Unable to change password. Please check your current password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 animate-page-fade">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Left Hero */}
        <div
          className="
            relative
            w-full
            md:w-1/2
            bg-gradient-to-b
            from-emerald-900
            to-emerald-700
            px-8
            sm:px-12
            py-12
            flex
            flex-col
            justify-between
            overflow-hidden
          "
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${userBackgroundImage})` }}
          />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center gap-3">
              <img src={Logo} alt="GrainRise" className="h-10 w-auto" />
              <span className="text-xl font-bold tracking-tight text-white">GrainRise</span>
            </div>

            <div className="my-auto py-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 border border-emerald-400/30 mb-4">
                <ShieldAlert size={14} />
                First-Time Login Security
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                Secure Your GrainRise Partner Account
              </h1>
              <p className="mt-4 text-emerald-100 text-sm sm:text-base leading-relaxed max-w-md">
                You have logged in with a system-generated temporary password. For security purposes, please set your permanent password before proceeding to your dashboard.
              </p>
            </div>

            <div className="text-xs text-emerald-200/70">
              GrainRise Partner Management &bull; Secure Authentication
            </div>
          </div>
        </div>

        {/* Right Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Change Temporary Password</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your current temporary password and create a strong new password.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Temporary Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Temporary Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter the password from your email"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-2 focus:ring-[#08511f]/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new strong password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-2 focus:ring-[#08511f]/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-2 focus:ring-[#08511f]/20 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5 text-xs text-slate-600">
                <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <span className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                    <CheckCircle2 size={13} className={hasMinLength ? "text-emerald-600" : "text-slate-300"} />
                    At least 8 characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasUpperCase ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                    <CheckCircle2 size={13} className={hasUpperCase ? "text-emerald-600" : "text-slate-300"} />
                    One uppercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasLowerCase ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                    <CheckCircle2 size={13} className={hasLowerCase ? "text-emerald-600" : "text-slate-300"} />
                    One lowercase letter
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasNumber ? "text-emerald-700 font-medium" : "text-slate-400"}`}>
                    <CheckCircle2 size={13} className={hasNumber ? "text-emerald-600" : "text-slate-300"} />
                    At least one number
                  </span>
                  <span className={`flex items-center gap-1.5 ${passwordsMatch ? "text-emerald-700 font-medium" : "text-slate-400"} sm:col-span-2`}>
                    <CheckCircle2 size={13} className={passwordsMatch ? "text-emerald-600" : "text-slate-300"} />
                    Passwords match
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <CustomGreenButton
                  text={isSubmitting ? "Updating Password..." : "Update Password & Continue"}
                  disabled={!isFormValid || isSubmitting}
                  className="w-full justify-center !rounded-xl"
                  onClick={handleSubmit}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ChangePassword;
