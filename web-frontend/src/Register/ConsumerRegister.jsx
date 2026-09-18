import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Upload,
  X,
  FileText,
  Check,
  Info,
  Clock,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Dropdown from "../Components/Minor-Components/Dropdown";
import Footer from "../Components/Minor-Components/CustomFooter";
import Toast from "../Components/Minor-Components/Toast";

import useToast from "../Components/hooks/useToast";
import useFormValidation from "../Components/hooks/useFormValidation";
import usePhilippineAddress from "../Components/hooks/usePhilippineAddress";
import useEmailOTP from "../Components/hooks/useEmailOTP";
import useDocumentUpload from "../Components/hooks/useDocumentUpload";
import useRegistration from "../Components/hooks/useRegistration";
import GoogleVerificationModal, { GoogleIcon } from "../Components/Modals/GoogleVerificationModal";

import logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";

const SUFFIXES = [
  "N/A",
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
];

const GENDERS = [
  "Male",
  "Female",
  "Others",
  "Preferred Not To Say",
];

const FieldWithError = ({ error, children, fieldRef }) => (
  <div ref={fieldRef}>
    {children}
    {error && (
      <span className="text-xs text-red-500 mt-1 block text-left">
        {error}
      </span>
    )}
  </div>
);

const maskEmail = (email) => {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  if (name.length <= 2) {
    return `${name.charAt(0)}***@${domain}`;
  }
  return `${name.charAt(0)}${"*".repeat(
    Math.max(name.length - 2, 3)
  )}${name.charAt(name.length - 1)}@${domain}`;
};

const ConsumerRegister = () => {
  const navigate = useNavigate();

  const {
    toasts,
    showToast,
    removeToast,
  } = useToast();

  const {
    errors,
    setErrors,
    validators,
    validate,
    getPasswordStrength,
  } = useFormValidation();

  // =========================================================
  // PAGE STATE
  // =========================================================
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [agreeCertify, setAgreeCertify] = useState(false);

  // =========================================================
  // FORM STATE
  // =========================================================
  const [form, setForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    gender: "",
    streetAddress: "",
    email: "",
    contactNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // =========================================================
  // ADDRESS HOOK
  // =========================================================
  const address = usePhilippineAddress();

  // =========================================================
  // EMAIL OTP HOOK
  // =========================================================
  const emailOtp = useEmailOTP({
    email: form.email,
    sendEndpoint: "/auth/consumer/send-otp",
    verifyEndpoint: "/auth/consumer/verify-otp",
  });

  // =========================================================
  // CONSUMER DOCUMENT CONFIGURATION
  // =========================================================
  const consumerDocumentRequirements = useMemo(
    () => [
      {
        key: "validId",
        fieldName: "valid_id",
        label: "Valid Government ID",
        required: true,
      },
      {
        key: "secondaryId",
        fieldName: "secondary_id",
        label: "Secondary ID / Proof of Address (Optional)",
        required: false,
      },
    ],
    []
  );

  const documents = useDocumentUpload({
    requirements: consumerDocumentRequirements,
    maxSizeMB: 5,
  });

  // =========================================================
  // REGISTRATION SUBMITTER
  // =========================================================
  const registration = useRegistration({
    endpoint: "/auth/consumer/register",
  });

  // =========================================================
  // REFERENCES
  // =========================================================
  const fieldRefs = useRef({});
  const otpRefs = useRef([]);

  const setFieldRef = (fieldName) => (element) => {
    if (element) {
      fieldRefs.current[fieldName] = element;
    }
  };

  const FIELD_ORDER = [
    "email",
    "contactNumber",
    "username",
    "password",
    "confirmPassword",
    "agreeTerms",
    "firstName",
    "lastName",
    "gender",
    "province",
    "municipality",
    "barangay",
    "postalCode",
    "streetAddress",
  ];

  const scrollToFirstError = useCallback(
    (errorMap) => {
      for (const field of FIELD_ORDER) {
        if (errorMap[field] && fieldRefs.current[field]) {
          fieldRefs.current[field].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          const focusable = fieldRefs.current[field].querySelector(
            "input, select, textarea"
          );

          if (focusable) {
            focusable.focus({
              preventScroll: true,
            });
          }
          break;
        }
      }
    },
    []
  );

  // =========================================================
  // INPUT CHANGE HANDLER
  // =========================================================
  const handleInputChange = (field, value) => {
    let processedValue = value;

    if (field === "firstName" || field === "lastName") {
      processedValue = value.replace(/[^a-zA-ZÀ-ÿÑñ\s.'-]/g, "");
    }

    if (field === "middleInitial") {
      processedValue = value
        .replace(/[^a-zA-Z]/g, "")
        .toUpperCase()
        .slice(0, 2);
    }

    if (field === "contactNumber") {
      processedValue = value.replace(/[^0-9+\s]/g, "").slice(0, 13);
    }

    setForm((previous) => ({
      ...previous,
      [field]: processedValue,
    }));

    validateField(field, processedValue);
  };

  // =========================================================
  // SINGLE FIELD VALIDATION
  // =========================================================
  const validateField = (field, value) => {
    let errorMsg = "";

    switch (field) {
      case "firstName":
        errorMsg = validators.firstName(value);
        break;
      case "middleInitial":
        errorMsg = validators.middleInitial(value);
        break;
      case "lastName":
        errorMsg = validators.lastName(value);
        break;
      case "streetAddress":
        errorMsg = validators.streetAddress(value);
        break;
      case "email":
        errorMsg = validators.email(value);
        break;
      case "contactNumber":
        errorMsg = validators.contactNumber(value);
        break;
      case "username":
        errorMsg = validators.username(value);
        break;
      case "password":
        errorMsg = validators.password(value);
        if (form.confirmPassword) {
          setErrors((previous) => ({
            ...previous,
            password: errorMsg,
            confirmPassword: validators.confirmPassword(
              value,
              form.confirmPassword
            ),
          }));
          return;
        }
        break;
      case "confirmPassword":
        errorMsg = validators.confirmPassword(form.password, value);
        break;
      case "gender":
        errorMsg = value ? "" : "Gender is required";
        break;
      default:
        break;
    }

    setErrors((previous) => ({
      ...previous,
      [field]: errorMsg,
    }));
  };

  // =========================================================
  // ADDRESS SELECTION WRAPPERS
  // =========================================================
  const handleProvinceChange = async (value) => {
    setErrors((previous) => ({
      ...previous,
      province: value ? "" : "Province is required",
      municipality: "",
      barangay: "",
      postalCode: "",
    }));
    setValidationMsg("");
    await address.selectProvince(value);
  };

  const handleMunicipalityChange = async (value) => {
    setErrors((previous) => ({
      ...previous,
      municipality: value ? "" : "Municipality/City is required",
      barangay: "",
      postalCode: "",
    }));
    setValidationMsg("");
    await address.selectMunicipality(value);
  };

  const handleBarangayChange = (value) => {
    setErrors((previous) => ({
      ...previous,
      barangay: value ? "" : "Barangay is required",
    }));
    address.selectBarangay(value);
  };

  const handlePostalCodeChange = (event) => {
    address.updatePostalCode(event.target.value);
    setErrors((previous) => ({
      ...previous,
      postalCode: "",
    }));
  };

  // =========================================================
  // STEP 1 VALIDATION — ACCOUNT INFORMATION
  // =========================================================
  const validateStep1 = () => {
    const rules = {
      email: validators.email(form.email),
      contactNumber: validators.contactNumber(form.contactNumber),
      username: validators.username(form.username),
      password: validators.password(form.password),
      confirmPassword: validators.confirmPassword(
        form.password,
        form.confirmPassword
      ),
      agreeTerms: validators.checkbox(
        form.agreeTerms,
        "You must agree to the Privacy Policy and Terms of Service"
      ),
    };

    const passed = validate(rules);

    if (!passed) {
      setValidationMsg(
        "Please correct the highlighted fields before proceeding."
      );
      scrollToFirstError(rules);
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted fields before proceeding.",
        duration: 4000,
      });
    } else {
      setValidationMsg("");
    }

    return passed;
  };

  // =========================================================
  // STEP 3 VALIDATION — PERSONAL INFORMATION
  // =========================================================
  const validateStep3 = () => {
    const rules = {
      firstName: validators.firstName(form.firstName),
      middleInitial: validators.middleInitial(form.middleInitial),
      lastName: validators.lastName(form.lastName),
      gender: form.gender ? "" : "Gender is required",
      province: address.province ? "" : "Province is required",
      municipality: address.municipality ? "" : "Municipality/City is required",
      barangay: address.barangay ? "" : "Barangay is required",
      postalCode: /^\d{4}$/.test(address.postalCode)
        ? ""
        : "Please enter a valid 4-digit postal code",
      streetAddress: validators.streetAddress(form.streetAddress),
    };

    const passed = validate(rules);

    if (!passed) {
      setValidationMsg(
        "Please correct the highlighted fields before proceeding."
      );
      scrollToFirstError(rules);
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted fields before proceeding.",
        duration: 4000,
      });
    } else {
      setValidationMsg("");
    }

    return passed;
  };

  const handleNextStep3 = (event) => {
    event.preventDefault();
    if (!validateStep3()) {
      return;
    }
    setValidationMsg("");
    setStep(4);
  };

  // =========================================================
  // STEP 1 → SEND OTP / GOOGLE VERIFY
  // =========================================================
  const handleGoogleVerifySuccess = ({ email, verificationToken }) => {
    setForm((prev) => ({
      ...prev,
      email: email,
      username: prev.username.trim()
        ? prev.username
        : email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""),
    }));
    emailOtp.setVerificationToken(verificationToken);
    emailOtp.setIsVerified(true);
    setErrors((prev) => ({ ...prev, email: "", otp: "" }));
    setValidationMsg("");
    setStep(3);
    showToast({
      type: "success",
      title: "Google Account Verified",
      message:
        "Your Google account has been verified. Please continue with your personal details.",
      duration: 4000,
    });
  };

  const handleNextStep1 = async (event) => {
    event.preventDefault();

    if (!validateStep1() || emailOtp.isSending) {
      return;
    }

    try {
      await emailOtp.sendOtp({
        username: form.username.trim(),
      });

      setStep(2);
      setValidationMsg("");
      showToast({
        type: "success",
        title: "OTP Sent",
        message: "A 6-digit verification code was sent to your email.",
        duration: 3500,
      });
    } catch (error) {
      setValidationMsg(error?.message || "Unable to send OTP.");
      showToast({
        type: "error",
        title: "Unable to Send OTP",
        message: error?.message || "Unable to send OTP.",
        duration: 5000,
      });
    }
  };

  // =========================================================
  // OTP INPUT HANDLERS
  // =========================================================
  const handleOtpChange = (index, value) => {
    emailOtp.updateOtpDigit(index, value);

    if (value && index < emailOtp.otpLength - 1) {
      otpRefs.current[index + 1]?.focus();
    }

    setErrors((previous) => ({
      ...previous,
      otp: "",
    }));
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !emailOtp.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (!emailOtp.canResend) {
      return;
    }

    try {
      await emailOtp.resendOtp({
        username: form.username.trim(),
      });

      setValidationMsg("");
      showToast({
        type: "success",
        title: "OTP Resent",
        message: "A new verification code was sent to your email.",
        duration: 3500,
      });
    } catch (error) {
      setValidationMsg(error?.message || "Unable to resend OTP.");
      showToast({
        type: "error",
        title: "Unable to Resend OTP",
        message: error?.message || "Unable to resend OTP.",
        duration: 5000,
      });
    }
  };

  const handleVerifyOtp = async () => {
    if (!emailOtp.isOtpComplete) {
      const message = "Please enter the complete 6-digit verification code.";
      setErrors((previous) => ({
        ...previous,
        otp: message,
      }));
      setValidationMsg(message);
      return;
    }

    try {
      await emailOtp.verifyOtp();
      setErrors((previous) => ({
        ...previous,
        otp: "",
      }));
      setValidationMsg("");
      setStep(3);
      showToast({
        type: "success",
        title: "Email Verified",
        message: "Your email address has been verified.",
        duration: 3000,
      });
    } catch (error) {
      const message = error?.message || "Unable to verify OTP.";
      setErrors((previous) => ({
        ...previous,
        otp: message,
      }));
      setValidationMsg(message);
    }
  };

  // =========================================================
  // DOCUMENT HANDLERS
  // =========================================================
  const handleFileChange = (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const result = documents.addFile(key, file);
    if (!result.success) {
      setValidationMsg(result.error);
      showToast({
        type: "error",
        title: "Invalid File",
        message: result.error,
        duration: 4000,
      });
      return;
    }
    setValidationMsg("");
  };

  const handleFileDrop = (event, key) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    const result = documents.addFile(key, file);
    if (!result.success) {
      setValidationMsg(result.error);
      showToast({
        type: "error",
        title: "Invalid File",
        message: result.error,
        duration: 4000,
      });
      return;
    }
    setValidationMsg("");
  };

  // =========================================================
  // FINAL SUBMISSION
  // =========================================================
  const handleSubmitRegistration = async () => {
    if (!documents.validateRequired()) {
      setValidationMsg("Please upload your Valid Government ID to proceed.");
      return;
    }

    if (!agreeCertify) {
      setErrors((previous) => ({
        ...previous,
        certify:
          "You must certify that the information and documents provided are true and accurate.",
      }));
      setValidationMsg(
        "Please certify that the information and identification provided are true and accurate."
      );
      return;
    }

    if (!emailOtp.verificationToken) {
      setValidationMsg(
        "Your email verification has expired. Please verify your email again."
      );
      setStep(2);
      return;
    }

    const fields = {
      first_name: form.firstName.trim(),
      middle_initial: form.middleInitial.trim(),
      last_name: form.lastName.trim(),
      suffix: form.suffix === "N/A" ? "" : form.suffix,
      gender: form.gender,
      province: address.province,
      municipality: address.municipality,
      postal_code: address.postalCode,
      barangay: address.barangay,
      street_address: form.streetAddress.trim(),
      email: form.email.trim().toLowerCase(),
      contact_number: form.contactNumber.trim(),
      username: form.username.trim(),
      password: form.password,
      confirm_password: form.confirmPassword,
      agree_terms: String(form.agreeTerms),
      agree_certify: String(agreeCertify),
      verification_token: emailOtp.verificationToken,
      user_role: "consumer",
    };

    try {
      await registration.submitRegistration({
        fields,
        documents,
      });

      setValidationMsg("");
      setIsSuccess(true);
      showToast({
        type: "success",
        title: "Registration Submitted",
        message:
          "Your consumer account was created successfully.",
        duration: 5000,
      });
    } catch (error) {
      const message = error?.message || "Registration failed.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Registration Failed",
        message,
        duration: 6000,
      });
    }
  };

  // =========================================================
  // STEPPER COMPONENT
  // =========================================================
  const renderStepper = () => {
    const steps = [
      "Account Information",
      "Account Verification",
      "Personal Information",
      "Identity Verification",
    ];

    return (
      <div className="mt-8 mb-10 bg-[#f3f9f4] border border-green-50/50 rounded-2xl p-4 md:py-6 md:px-8 flex items-start justify-between relative overflow-hidden">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = step >= stepNumber;
          const isComplete = step > stepNumber;

          return (
            <React.Fragment key={label}>
              {index > 0 && (
                <div
                  className={`h-0.5 flex-1 mx-1 md:mx-3 relative top-5 ${
                    step >= stepNumber ? "bg-[#08511f]" : "bg-gray-300"
                  }`}
                />
              )}

              <div className="flex flex-col items-center z-10 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${
                    isActive
                      ? "bg-[#08511f] text-white shadow-md"
                      : "bg-gray-300 text-white"
                  }`}
                >
                  {isComplete ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    stepNumber
                  )}
                </div>

                <span
                  className={`text-[10px] md:text-xs font-semibold mt-2 text-center leading-tight ${
                    isActive ? "text-[#08511f]" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // =========================================================
  // SUCCESS SCREEN
  // =========================================================
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #e8f5e9 0%, #f5faf5 35%, #ffffff 65%, #bcead1 100%)",
          }}
        />

        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            opacity: 0.42,
            mixBlendMode: "multiply",
          }}
        />

        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-[32px] shadow-2xl p-8 md:p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-[#08511f] rounded-full flex items-center justify-center text-white mb-5 shadow-md">
              <Check size={32} strokeWidth={3.5} />
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#08511f] mb-3">
              Consumer Registration Complete!
            </h2>

            <p className="text-gray-600 text-sm md:text-base mt-1 mb-6 max-w-md leading-relaxed">
              Your consumer account has been created successfully. You can now log in to discover verified rice retailers, compare prices, and order fresh rice directly.
            </p>

            <div className="flex items-center gap-2 px-4 py-3 bg-[#eaf5ec] border border-[#bce8c4] rounded-xl mb-8">
              <ShoppingBag size={18} className="text-[#08511f]" />
              <span className="text-sm font-semibold text-[#08511f]">
                Ready to explore the GrainRise Marketplace
              </span>
            </div>

            <div className="w-full max-w-md flex flex-col sm:flex-row gap-3">
              <CustomWhiteButton
                text="Return to Home"
                onClick={() => navigate("/")}
                className="flex-1 !rounded-xl !py-3.5 font-bold shadow-sm"
              />
              <CustomGreenButton
                text="Login to Account"
                onClick={() => navigate("/login")}
                className="flex-1 !rounded-xl !py-3.5 font-bold shadow-md"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN REGISTRATION VIEW
  // =========================================================
  return (
    <div className="dark-readable-registration-form animate-page-fade min-h-screen flex flex-col relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #e8f5e9 0%, #f5faf5 35%, #ffffff 65%, #bcead1 100%)",
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 80% 10%, rgba(134,197,148,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(76,175,80,0.25) 0%, transparent 60%)",
        }}
      />

      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: 0.42,
          mixBlendMode: "multiply",
        }}
      />

      {/* HEADER NAVIGATION */}
      <div className="relative z-10 w-full px-6 sm:px-10 pt-6 flex items-center justify-between">
        <CustomWhiteButton
          onClick={() => {
            if (step === 1) {
              navigate("/register");
              return;
            }
            setStep(step - 1);
          }}
          className="!rounded-full w-auto !p-2 !px-5 shadow-sm"
          icon={
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
              <ArrowLeft size={16} />
              {step === 1 ? "Back to Role Selection" : "Previous Step"}
            </span>
          }
        />

        <span className="text-xs md:text-sm font-bold text-emerald-800 tracking-wider uppercase">
          {step === 1 && "Step 1 of 4: Account Information"}
          {step === 2 && "Step 2 of 4: Account Verification"}
          {step === 3 && "Step 3 of 4: Personal Information"}
          {step === 4 && "Step 4 of 4: Identity Verification"}
        </span>
      </div>

      {/* MAIN REGISTRATION CARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-10">
        <div className="w-full max-w-4xl bg-white border border-gray-100 rounded-3xl shadow-2xl p-6 md:p-12">
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt="GrainRise Logo"
              className="h-12 object-contain mb-4"
            />

            <h1 className="text-2xl md:text-[32px] font-extrabold text-gray-900 leading-tight">
              {step === 1 && "Create Your Consumer Account"}
              {step === 2 && "Verify Your Account"}
              {step === 3 && "Personal & Delivery Information"}
              {step === 4 && "Identity Verification"}
            </h1>

            <p className="text-gray-500 text-sm md:text-base mt-2 max-w-lg">
              {step === 1 &&
                "Enter your account details to start shopping for fresh rice on GrainRise."}
              {step === 2 &&
                "Enter the verification code sent to your registered email."}
              {step === 3 &&
                "Provide your personal name and complete delivery address details."}
              {step === 4 &&
                "Upload a valid government ID to verify your consumer account identity."}
            </p>
          </div>

          {renderStepper()}

          <Toast toasts={toasts} removeToast={removeToast} />

          {/* Google Verification Modal */}
          <GoogleVerificationModal
            isOpen={isGoogleModalOpen}
            onClose={() => setIsGoogleModalOpen(false)}
            onSuccess={handleGoogleVerifySuccess}
            initialEmail={form.email}
            roleName="Consumer"
            endpoint="/auth/consumer/google-verify"
          />

          {/* =================================================
              STEP 1 — ACCOUNT INFORMATION
          ================================================= */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-8">
              {/* ACCOUNT DETAILS */}
              <div>
                <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                  Account Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FieldWithError
                    error={errors.email}
                    fieldRef={setFieldRef("email")}
                  >
                    <CustomTextbox
                      label="Email Address *"
                      placeholder="youremail@example.com"
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        handleInputChange("email", event.target.value)
                      }
                    />
                  </FieldWithError>

                  <FieldWithError
                    error={errors.contactNumber}
                    fieldRef={setFieldRef("contactNumber")}
                  >
                    <CustomTextbox
                      label="Contact Number *"
                      placeholder="+63 9XX XXX XXXX"
                      value={form.contactNumber}
                      onChange={(event) =>
                        handleInputChange("contactNumber", event.target.value)
                      }
                    />
                  </FieldWithError>

                  <FieldWithError
                    error={errors.username}
                    fieldRef={setFieldRef("username")}
                  >
                    <CustomTextbox
                      label="Username *"
                      placeholder="username"
                      value={form.username}
                      onChange={(event) =>
                        handleInputChange("username", event.target.value)
                      }
                    />
                  </FieldWithError>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div ref={setFieldRef("password")}>
                    <FieldWithError error={errors.password}>
                      <div className="relative">
                        <CustomTextbox
                          label="Password *"
                          placeholder="••••••••••••"
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(event) =>
                            handleInputChange("password", event.target.value)
                          }
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-[42px] text-gray-500"
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </FieldWithError>

                    {form.password &&
                      (() => {
                        const strength = getPasswordStrength(form.password);
                        const strengthData = {
                          weak: {
                            width: "33%",
                            color: "bg-red-400",
                            text: "text-red-500",
                            label: "Weak",
                          },
                          medium: {
                            width: "66%",
                            color: "bg-yellow-400",
                            text: "text-yellow-600",
                            label: "Medium",
                          },
                          strong: {
                            width: "100%",
                            color: "bg-green-500",
                            text: "text-green-600",
                            label: "Strong",
                          },
                        }[strength];

                        const password = form.password;
                        const requirements = [
                          {
                            label: "At least 8 characters",
                            met: password.length >= 8,
                          },
                          {
                            label: "One uppercase letter (A–Z)",
                            met: /[A-Z]/.test(password),
                          },
                          {
                            label: "One lowercase letter (a–z)",
                            met: /[a-z]/.test(password),
                          },
                          {
                            label: "One number (0–9)",
                            met: /[0-9]/.test(password),
                          },
                          {
                            label: "One special character",
                            met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                          },
                        ];

                        return (
                          <div className="mt-2 px-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${strengthData.color}`}
                                  style={{
                                    width: strengthData.width,
                                  }}
                                />
                              </div>

                              <span
                                className={`text-xs font-semibold ${strengthData.text}`}
                              >
                                {strengthData.label}
                              </span>
                            </div>

                            <ul className="space-y-1">
                              {requirements.map((requirement) => (
                                <li
                                  key={requirement.label}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                      requirement.met
                                        ? "bg-green-500"
                                        : "bg-gray-200"
                                    }`}
                                  >
                                    {requirement.met && (
                                      <Check
                                        size={10}
                                        className="text-white"
                                      />
                                    )}
                                  </span>

                                  <span
                                    className={`text-xs ${
                                      requirement.met
                                        ? "text-green-700"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {requirement.label}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                  </div>

                  <div ref={setFieldRef("confirmPassword")}>
                    <FieldWithError error={errors.confirmPassword}>
                      <div className="relative">
                        <CustomTextbox
                          label="Confirm Password *"
                          placeholder="••••••••••••"
                          type={showConfirmPassword ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(event) =>
                            handleInputChange(
                              "confirmPassword",
                              event.target.value
                            )
                          }
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-[42px] text-gray-500"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>
                    </FieldWithError>

                    {form.confirmPassword &&
                      form.password === form.confirmPassword &&
                      !errors.confirmPassword && (
                        <p className="mt-2 text-xs font-semibold text-green-600 flex items-center gap-1">
                          <Check size={12} />
                          Password Match
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* TERMS */}
              <div
                className="pt-2 flex items-start gap-3"
                ref={setFieldRef("agreeTerms")}
              >
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(event) =>
                    handleInputChange("agreeTerms", event.target.checked)
                  }
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer mt-0.5"
                />

                <label
                  htmlFor="agreeTerms"
                  className="text-sm font-medium text-gray-700"
                >
                  I agree to the{" "}
                  <span className="text-[#08511f] font-semibold underline">
                    Privacy Policy
                  </span>{" "}
                  and{" "}
                  <span className="text-[#08511f] font-semibold underline">
                    Terms of Service
                  </span>.
                </label>
              </div>

              {errors.agreeTerms && (
                <span className="text-xs text-red-500">
                  {errors.agreeTerms}
                </span>
              )}

              {validationMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{validationMsg}</p>
                </div>
              )}

              {/* Centered Google Verification Option */}
              <div className="pt-2 flex flex-col items-center">
                <div className="w-full flex items-center justify-center my-4">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    or continue with
                  </span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(true)}
                  className="w-full max-w-md px-6 py-3.5 rounded-full border border-gray-300 hover:border-[#08511f] bg-white hover:bg-emerald-50/60 text-gray-800 font-semibold text-sm shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
                >
                  <GoogleIcon size={20} />
                  <span>Continue with Google</span>
                </button>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <CustomGreenButton
                  type="submit"
                  disabled={emailOtp.isSending}
                  text={
                    <span className="flex items-center gap-2">
                      {emailOtp.isSending ? "Sending OTP..." : "Next Step"}
                      {!emailOtp.isSending && <ArrowRight size={18} />}
                    </span>
                  }
                  className="!rounded-full !px-8 !py-3 shadow-lg"
                />
              </div>
            </form>
          )}

          {/* =================================================
              STEP 2 — OTP
          ================================================= */}
          {step === 2 && (
            <div className="flex flex-col items-center pb-8">
              <h3 className="text-[#08511f] font-bold text-lg mb-2 uppercase tracking-wider">
                Verification Code Sent
              </h3>

              <p className="text-gray-600 text-sm mb-8 font-medium">
                {maskEmail(form.email)}
              </p>

              <div className="flex gap-3 md:gap-4 mb-6">
                {emailOtp.otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) =>
                      handleOtpChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    className={`w-12 h-14 md:w-16 md:h-16 text-center text-2xl font-bold bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 ${
                      errors.otp ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                ))}
              </div>

              {errors.otp && (
                <p className="text-sm text-red-600 mb-5">{errors.otp}</p>
              )}

              <div className="flex flex-col items-center mb-10">
                <span className="text-sm text-gray-500 font-medium">
                  Resend available in{" "}
                  <strong className="text-gray-800">
                    00:{emailOtp.timer.toString().padStart(2, "0")}
                  </strong>
                </span>

                <p className="text-sm mt-3 font-medium text-gray-600">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!emailOtp.canResend}
                    className={
                      emailOtp.canResend
                        ? "text-[#08511f] hover:underline font-bold cursor-pointer"
                        : "text-gray-400 cursor-not-allowed"
                    }
                  >
                    {emailOtp.isSending ? "Sending..." : "Resend OTP"}
                  </button>
                </p>

                <div className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-col items-center">
                  <p className="text-xs text-gray-500 mb-2 font-medium">
                    Or prefer instant verification?
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsGoogleModalOpen(true)}
                    className="px-5 py-2 rounded-full border border-gray-300 hover:border-[#08511f] bg-white hover:bg-emerald-50 text-gray-700 font-semibold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <GoogleIcon size={15} />
                    <span>Verify with Google instead</span>
                  </button>
                </div>
              </div>

              {validationMsg && (
                <div className="w-full mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{validationMsg}</p>
                </div>
              )}

              <div className="w-full pt-6 border-t border-gray-100 flex justify-between">
                <CustomWhiteButton
                  onClick={() => setStep(1)}
                  className="!rounded-full w-auto !p-2 !px-6"
                  icon={
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowLeft size={16} />
                      Previous
                    </span>
                  }
                />

                <CustomGreenButton
                  text={
                    emailOtp.isVerifying ? "Verifying..." : "Verify OTP"
                  }
                  onClick={handleVerifyOtp}
                  disabled={emailOtp.isVerifying}
                  className="!rounded-full !px-8 !py-3 shadow-lg"
                />
              </div>
            </div>
          )}

          {/* =================================================
              STEP 3 — PERSONAL INFORMATION
          ================================================= */}
          {step === 3 && (
            <form onSubmit={handleNextStep3} className="space-y-8">
              {/* PERSONAL INFORMATION */}
              <div>
                <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                  Personal Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <FieldWithError
                    error={errors.firstName}
                    fieldRef={setFieldRef("firstName")}
                  >
                    <CustomTextbox
                      label={
                        <>
                          First Name <span className="text-red-500">*</span>
                        </>
                      }
                      placeholder="e.g. Juan"
                      value={form.firstName}
                      onChange={(event) =>
                        handleInputChange("firstName", event.target.value)
                      }
                    />
                  </FieldWithError>

                  <CustomTextbox
                    label={
                      <>
                        Middle Initial{" "}
                        <span className="text-gray-400 font-normal text-xs">
                          (Optional)
                        </span>
                      </>
                    }
                    placeholder="M.I."
                    value={form.middleInitial}
                    onChange={(event) =>
                      handleInputChange("middleInitial", event.target.value)
                    }
                  />

                  <FieldWithError
                    error={errors.lastName}
                    fieldRef={setFieldRef("lastName")}
                  >
                    <CustomTextbox
                      label={
                        <>
                          Last Name <span className="text-red-500">*</span>
                        </>
                      }
                      placeholder="e.g. Dela Cruz"
                      value={form.lastName}
                      onChange={(event) =>
                        handleInputChange("lastName", event.target.value)
                      }
                    />
                  </FieldWithError>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Dropdown
                    label="Suffix (Optional)"
                    placeholder="Select suffix"
                    options={SUFFIXES}
                    value={form.suffix}
                    onChange={(value) => handleInputChange("suffix", value)}
                  />

                  <div
                    className="md:col-span-2"
                    ref={setFieldRef("gender")}
                  >
                    <Dropdown
                      label="Gender *"
                      placeholder="Select Gender"
                      options={GENDERS}
                      value={form.gender}
                      onChange={(value) => handleInputChange("gender", value)}
                      error={errors.gender}
                    />
                  </div>
                </div>
              </div>

              {/* ADDRESS INFORMATION */}
              <div>
                <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                  Delivery Address Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div ref={setFieldRef("province")}>
                    <Dropdown
                      label="Province *"
                      placeholder={
                        address.loading.provinces
                          ? "Loading provinces..."
                          : "Select Province"
                      }
                      options={address.provinceOptions}
                      value={address.province}
                      onChange={handleProvinceChange}
                      error={errors.province || address.errors.provinces}
                    />
                  </div>

                  <div ref={setFieldRef("municipality")}>
                    <Dropdown
                      label="Municipality/City *"
                      placeholder={
                        address.loading.municipalities
                          ? "Loading cities/municipalities..."
                          : !address.province
                          ? "Select Province First"
                          : "Select City/Municipality"
                      }
                      options={address.municipalityOptions}
                      value={address.municipality}
                      onChange={handleMunicipalityChange}
                      error={
                        errors.municipality || address.errors.municipalities
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div ref={setFieldRef("barangay")}>
                    <Dropdown
                      label="Barangay *"
                      placeholder={
                        address.loading.barangays
                          ? "Loading barangays..."
                          : !address.municipality
                          ? "Select Municipality First"
                          : "Select Barangay"
                      }
                      options={address.barangayOptions}
                      value={address.barangay}
                      onChange={handleBarangayChange}
                      error={errors.barangay || address.errors.barangays}
                    />
                  </div>

                  {/* POSTAL CODE — AUTO + EDITABLE */}
                  <div ref={setFieldRef("postalCode")}>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Postal Code{" "}
                      <span className="text-gray-400 font-normal text-xs">
                        (Auto Generated — Editable)
                      </span>
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={address.postalCode}
                      onChange={handlePostalCodeChange}
                      placeholder={
                        address.loading.postalCode
                          ? "Loading..."
                          : !address.municipality
                          ? "Select Municipality First"
                          : "Enter Postal Code"
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-white text-gray-700 border outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
                        errors.postalCode
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />

                    {errors.postalCode && (
                      <span className="text-xs text-red-500 mt-1 block">
                        {errors.postalCode}
                      </span>
                    )}

                    {address.postalStatus === "unavailable" &&
                      !errors.postalCode && (
                        <span className="text-xs text-amber-600 mt-1 block">
                          Automatic postal lookup was unavailable. You may enter it manually.
                        </span>
                      )}
                  </div>

                  <FieldWithError
                    error={errors.streetAddress}
                    fieldRef={setFieldRef("streetAddress")}
                  >
                    <CustomTextbox
                      label={
                        <>
                          Street Address <span className="text-red-500">*</span>
                        </>
                      }
                      placeholder="Unit/House No., Street Name"
                      value={form.streetAddress}
                      onChange={(event) =>
                        handleInputChange("streetAddress", event.target.value)
                      }
                    />
                  </FieldWithError>
                </div>
              </div>

              {validationMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{validationMsg}</p>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 flex justify-between">
                <CustomWhiteButton
                  type="button"
                  onClick={() => setStep(2)}
                  className="!rounded-full w-auto !p-2 !px-6"
                  icon={
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowLeft size={16} />
                      Previous
                    </span>
                  }
                />

                <CustomGreenButton
                  type="submit"
                  text={
                    <span className="flex items-center gap-2">
                      Next Step
                      <ArrowRight size={18} />
                    </span>
                  }
                  className="!rounded-full !px-8 !py-3 shadow-lg"
                />
              </div>
            </form>
          )}

          {/* =================================================
              STEP 4 — IDENTITY VERIFICATION
          ================================================= */}
          {step === 4 && (
            <div className="flex flex-col text-left">
              <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-6">
                Identification Documents
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* VALID GOVERNMENT ID */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-green-50/50 hover:border-green-400 transition-colors relative"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleFileDrop(event, "validId")}
                >
                  <label className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-gray-600">
                    Valid Government ID <span className="text-red-500">*</span>
                  </label>

                  {!documents.files.validId ? (
                    <>
                      <Upload size={25} className="text-[#08511f] mb-4" />

                      <label
                        htmlFor="validId"
                        className="text-sm font-bold text-[#08511f] cursor-pointer hover:underline"
                      >
                        Upload Government ID
                      </label>

                      <p className="text-xs text-gray-500 mt-2">
                        PhilID, Driver's License, Passport, UMID (Max 5MB)
                      </p>

                      <input
                        id="validId"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        className="hidden"
                        onChange={(event) =>
                          handleFileChange(event, "validId")
                        }
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full relative">
                      <button
                        type="button"
                        onClick={() => documents.removeFile("validId")}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>

                      <FileText size={32} className="text-[#08511f] mb-2" />

                      <span className="text-sm font-semibold text-gray-800 truncate w-full">
                        {documents.files.validId.name}
                      </span>

                      <span className="text-xs text-gray-500 mt-1">
                        {documents.files.validId.sizeMB} MB
                      </span>
                    </div>
                  )}

                  {documents.errors.validId && (
                    <p className="text-xs text-red-500 mt-3">
                      {documents.errors.validId}
                    </p>
                  )}
                </div>

                {/* SECONDARY ID / PROOF OF ADDRESS (OPTIONAL) */}
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-green-50/50 hover:border-green-400 transition-colors relative"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleFileDrop(event, "secondaryId")}
                >
                  <label className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-gray-600">
                    Secondary ID / Proof of Address (Optional)
                  </label>

                  {!documents.files.secondaryId ? (
                    <>
                      <Upload size={25} className="text-[#08511f] mb-4" />

                      <label
                        htmlFor="secondaryId"
                        className="text-sm font-bold text-[#08511f] cursor-pointer hover:underline"
                      >
                        Upload Supporting Document
                      </label>

                      <p className="text-xs text-gray-500 mt-2">
                        Utility Bill, Student ID, Postal ID (Max 5MB)
                      </p>

                      <input
                        id="secondaryId"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        className="hidden"
                        onChange={(event) =>
                          handleFileChange(event, "secondaryId")
                        }
                      />
                    </>
                  ) : (
                    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full relative">
                      <button
                        type="button"
                        onClick={() => documents.removeFile("secondaryId")}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>

                      <FileText size={32} className="text-[#08511f] mb-2" />

                      <span className="text-sm font-semibold text-gray-800 truncate w-full">
                        {documents.files.secondaryId.name}
                      </span>

                      <span className="text-xs text-gray-500 mt-1">
                        {documents.files.secondaryId.sizeMB} MB
                      </span>
                    </div>
                  )}

                  {documents.errors.secondaryId && (
                    <p className="text-xs text-red-500 mt-3">
                      {documents.errors.secondaryId}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[#eaf5ec] border border-[#bce8c4] rounded-xl p-4 flex items-start gap-3 mb-6">
                <ShieldCheck className="text-[#08511f] shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">
                    Trusted Consumer Community
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    GrainRise verifies identities to ensure secure transactions, accurate delivery coordination, and protection for both consumers and local farmers & retailers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                <input
                  id="agreeCertify"
                  type="checkbox"
                  checked={agreeCertify}
                  onChange={(event) => {
                    setAgreeCertify(event.target.checked);
                    if (event.target.checked) {
                      setErrors((previous) => ({
                        ...previous,
                        certify: "",
                      }));
                    }
                  }}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                />

                <label
                  htmlFor="agreeCertify"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  I certify that the information and identification provided are true, accurate, and belong to me.
                </label>
              </div>

              {errors.certify && (
                <p className="text-xs text-red-500 mb-5">{errors.certify}</p>
              )}

              {validationMsg && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-700">{validationMsg}</p>
                </div>
              )}

              <div className="w-full flex justify-between">
                <CustomWhiteButton
                  onClick={() => setStep(3)}
                  className="!rounded-full w-auto !p-2 !px-6"
                  icon={
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <ArrowLeft size={16} />
                      Previous
                    </span>
                  }
                />

                <CustomGreenButton
                  text={
                    registration.isSubmitting
                      ? "Submitting..."
                      : "Submit Registration"
                  }
                  onClick={handleSubmitRegistration}
                  disabled={registration.isSubmitting}
                  className="!rounded-full !px-8 !py-3 shadow-lg"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default ConsumerRegister;
