import React, { useState, useEffect } from "react";
import { X, CheckCircle2, ShieldCheck, Mail, ArrowRight, Loader2, Sparkles } from "lucide-react";
import useApi from "../hooks/useApi";

export const GoogleIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={`shrink-0 ${className}`}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const GoogleVerificationModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = "",
  roleName = "Farmer",
  endpoint = "/auth/farmer/google-verify",
}) => {
  const { request } = useApi();
  const [selectedEmail, setSelectedEmail] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setIsVerifying(false);
      if (initialEmail && initialEmail.includes("@")) {
        setSelectedEmail(initialEmail.trim().toLowerCase());
        setIsCustom(false);
      } else {
        setSelectedEmail("grainrise.user@gmail.com");
        setIsCustom(false);
      }
    }
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleVerify = async (emailToVerify) => {
    const targetEmail = (emailToVerify || (isCustom ? customEmail : selectedEmail)).trim().toLowerCase();

    if (!targetEmail || !targetEmail.includes("@") || !targetEmail.includes(".")) {
      setErrorMsg("Please enter a valid Google email address.");
      return;
    }

    setIsVerifying(true);
    setErrorMsg("");

    try {
      const response = await request(endpoint, {
        method: "POST",
        body: { email: targetEmail },
        throwOnError: true,
      });

      const verificationToken = response?.verification_token;
      if (!verificationToken) {
        throw new Error("Failed to obtain verification token.");
      }

      onSuccess({
        email: targetEmail,
        verificationToken,
        verifiedVia: "google",
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Google verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const sampleAccounts = [
    ...(initialEmail && initialEmail.includes("@") && initialEmail.toLowerCase() !== "grainrise.user@gmail.com"
      ? [
          {
            email: initialEmail.trim().toLowerCase(),
            name: initialEmail.split("@")[0],
            sub: "Entered in Registration Form",
          },
        ]
      : []),
    {
      email: "grainrise.user@gmail.com",
      name: "GrainRise Partner",
      sub: "Google Workspace Account",
    },
    {
      email: "agri.trader.ph@gmail.com",
      name: "Philippine Agri Verified",
      sub: "Personal Google Account",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden relative transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-green-700 px-6 py-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <GoogleIcon size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Verify with Google</h3>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <ShieldCheck size={13} className="text-emerald-300" />
                Fast 1-Click Verification for {roleName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isVerifying}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Choose your Google account to instantly verify your email address. You will skip the email OTP code and proceed immediately.
          </p>

          {/* Account selector */}
          <div className="space-y-2.5 mb-5">
            {sampleAccounts.map((account) => {
              const isChosen = !isCustom && selectedEmail === account.email;
              return (
                <div
                  key={account.email}
                  onClick={() => {
                    if (isVerifying) return;
                    setIsCustom(false);
                    setSelectedEmail(account.email);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isChosen
                      ? "border-[#08511f] bg-[#eaf5ec]/60 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm uppercase shrink-0 ${
                        isChosen ? "bg-[#08511f] text-white" : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {account.name[0]}
                    </div>
                    <div className="truncate text-left">
                      <p className="text-xs font-bold text-gray-900 truncate">{account.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{account.email}</p>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isChosen ? (
                      <div className="w-5 h-5 rounded-full bg-[#08511f] text-white flex items-center justify-center">
                        <CheckCircle2 size={14} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-gray-300" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Custom Google Account option */}
            <div
              onClick={() => {
                if (isVerifying) return;
                setIsCustom(true);
              }}
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                isCustom
                  ? "border-[#08511f] bg-[#eaf5ec]/60 shadow-sm"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isCustom ? "bg-[#08511f] text-white" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <Mail size={16} />
                  </div>
                  <span className="text-xs font-bold text-gray-900">Use Another Google Account</span>
                </div>
                <div className="shrink-0">
                  {isCustom ? (
                    <div className="w-5 h-5 rounded-full bg-[#08511f] text-white flex items-center justify-center">
                      <CheckCircle2 size={14} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-gray-300" />
                  )}
                </div>
              </div>

              {isCustom && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="email"
                    placeholder="Enter your Google email (e.g. name@gmail.com)"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-xs outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs text-left">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isVerifying}
            className="w-full py-3.5 px-6 rounded-full bg-[#08511f] hover:bg-[#063d17] text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying with Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon size={18} />
                <span>Verify & Continue as {(isCustom ? customEmail : selectedEmail) || "Google User"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-[11px] text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-amber-500" />
            Instant verification powered by GrainRise OAuth & Google
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleVerificationModal;
