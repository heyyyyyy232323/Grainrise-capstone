import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, CheckCircle, Upload, X, FileText, Check, Info, Clock, AlertCircle } from "lucide-react";
import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Dropdown from "../Components/Minor-Components/Dropdown";
import Footer from "../Components/Minor-Components/CustomFooter";
import logo from "../assets/Logo.png";
import backgroundImage from "../assets/UserloginBG.png";
import useFormValidation from "../Components/hooks/useFormValidation";

const PROVINCES = ["Bulacan", "Metro Manila (NCR)"];
const MUNICIPALITIES_MAP = {
  "Bulacan": ["Baliuag", "Balagtas", "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad", "Guiguinto", "Hagonoy", "Malolos City", "Marilao"],
  "Metro Manila (NCR)": ["Valenzuela City", "Quezon City", "Manila", "Makati", "Pasig", "Taguig"]
};
const BARANGAYS_MAP = {
  "Baliuag": ["Bagong Nayon", "Barangca", "Calantipay", "Catulinan", "Concepcion", "Hinukay", "Makinabang", "Matangtubig", "Pagala", "Paitan", "Piel"]
};
const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
const GENDERS = ["Male", "Female", "Others", "Preferred Not To Say"];

// Small helper: wraps CustomTextbox so we can show a field-level error message
// underneath it, since CustomTextbox itself has no built-in error state.
const FieldWithError = ({ error, children }) => (
  <div>
    {children}
    {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
  </div>
);

const FarmerRegister = () => {
  const navigate = useNavigate();

  // Wizard State
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form Field States (Step 1 & Step 4)
  const [form, setForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    gender: "",
    province: "",
    municipality: "",
    postalCode: "1423",
    barangay: "",
    streetAddress: "",
    email: "",
    contactNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,

    // Step 4 Business Information (Read-only prefilled)
    businessName: "ABC Farm Trading",
    organizationName: "ABC Farmer Cooperative",
    businessProvince: "Bulacan",
    businessMunicipality: "Baliuag",
    businessPostalCode: "1423",
    businessBarangay: "Bagong Nayon",
    businessStreetAddress: "123 Lot 4 Santolan",

    // Step 4 Official Contact Information (User editable)
    officialEmail: "",
    officialContactNumber: "",
    certifyBusinessInfo: false,
  });

  // Step 2 States (OTP)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(60);
  const otpRefs = useRef([]);

  // Step 3 States (Documents)
  const [files, setFiles] = useState({ doc1: null, doc2: null });
  const [agreeCertify, setAgreeCertify] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { errors, setErrors, validators, validate, getPasswordStrength } = useFormValidation();
  const [validationMsg, setValidationMsg] = useState("");

  const activeMunicipalities = form.province ? (MUNICIPALITIES_MAP[form.province] || []) : [];
  const activeBarangays = form.municipality ? (BARANGAYS_MAP[form.municipality] || ["Barangay 1", "Barangay 2", "Barangay 3"]) : [];

  const handleInputChange = (field, value) => {
    // Auto-uppercase and cap to 1 char for middle initial
    const processedValue =
      field === "middleInitial" ? value.toUpperCase().slice(0, 1) : value;
    setForm((prev) => ({ ...prev, [field]: processedValue }));
    validateField(field, processedValue);
  };

  // Real-time per-field validation — maps each field to its validator
  const validateField = (field, value) => {
    let errorMsg = "";
    switch (field) {
      case "firstName":       errorMsg = validators.firstName(value);                               break;
      case "middleInitial":   errorMsg = validators.middleInitial(value);                          break;
      case "lastName":        errorMsg = validators.lastName(value);                               break;
      case "streetAddress":   errorMsg = validators.streetAddress(value);                          break;
      case "email":           errorMsg = validators.email(value);                                  break;
      case "contactNumber":   errorMsg = validators.contactNumber(value);                          break;
      case "username":        errorMsg = validators.username(value);                               break;
      case "confirmPassword": errorMsg = validators.confirmPassword(form.password, value);         break;
      case "password":
        errorMsg = validators.password(value);
        // Also re-check confirm password when password changes
        if (form.confirmPassword) {
          setErrors((prev) => ({
            ...prev,
            password: errorMsg,
            confirmPassword: validators.confirmPassword(value, form.confirmPassword),
          }));
          return;
        }
        break;
      case "gender":        errorMsg = value ? "" : "Gender is required";         break;
      case "province":      errorMsg = value ? "" : "Province is required";       break;
      case "municipality":
        errorMsg = value ? "" : form.province ? "Municipality is required" : "Please select a province first";
        break;
      case "barangay":
        errorMsg = value ? "" : form.municipality ? "Barangay is required" : "Please select a municipality first";
        break;
      case "officialEmail":   errorMsg = validators.email(value);                                  break;
      case "officialContactNumber": errorMsg = validators.contactNumber(value);                      break;
      default: break;
    }
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleProvinceChange = (provinceValue) => {
    setForm((prev) => ({
      ...prev,
      province: provinceValue,
      municipality: "",
      barangay: "",
      postalCode: provinceValue === "Bulacan" ? "3006" : "1423",
    }));
    setErrors((prev) => ({
      ...prev,
      province: provinceValue ? "" : "Province is required",
      municipality: "",
      barangay: "",
    }));
  };

  const handleMunicipalityChange = (municipalityValue) => {
    setForm((prev) => ({ ...prev, municipality: municipalityValue, barangay: "" }));
    setErrors((prev) => ({
      ...prev,
      municipality: municipalityValue ? "" : "Municipality is required",
      barangay: "",
    }));
  };

  // Step 1 Validation — uses useFormValidation hook's validate()
  const validateStep1 = () => {
    const passed = validate({
      firstName:       validators.firstName(form.firstName),
      middleInitial:   validators.middleInitial(form.middleInitial),
      lastName:        validators.lastName(form.lastName),
      gender:          form.gender ? "" : "Gender is required",
      province:        form.province ? "" : "Province is required",
      municipality:    form.municipality
                         ? ""
                         : form.province
                         ? "Municipality is required"
                         : "Please select a province first",
      barangay:        form.barangay
                         ? ""
                         : form.municipality
                         ? "Barangay is required"
                         : "Please select a municipality first",
      streetAddress:   validators.streetAddress(form.streetAddress),
      email:           validators.email(form.email),
      contactNumber:   validators.contactNumber(form.contactNumber),
      username:        validators.username(form.username),
      password:        validators.password(form.password),
      confirmPassword: validators.confirmPassword(form.password, form.confirmPassword),
      agreeTerms:      validators.checkbox(
                         form.agreeTerms,
                         "You must agree to the Privacy Policy and Terms of Service"
                       ),
    });

    if (!passed) {
      setValidationMsg("Please correct the errors in the form before proceeding.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setValidationMsg("");
    }
    return passed;
  };

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (validateStep1()) setStep(2);
  };

  // Step 2 Logic (OTP Timer & Input)
  useEffect(() => {
    let timer;
    if (step === 2 && otpTimer > 0) {
      timer = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1].focus();
    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleResendOtp = () => {
    if (otpTimer === 0) {
      setOtpTimer(60);
      setOtp(["", "", "", "", "", ""]);
      setValidationMsg("");
    }
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const maskedName = name[0] + "*".repeat(Math.max(name.length - 2, 3)) + (name.length > 1 ? name[name.length - 1] : "");
    return `${maskedName}@${domain}`;
  };

  const handleVerifyOtp = () => {
    if (otp.some(digit => digit === "")) {
      setErrors({ otp: "Please enter the complete 6-digit code." });
      setValidationMsg("Please enter the complete 6-digit code.");
      return;
    }
    setErrors({});
    setValidationMsg("");
    setStep(3);
  };

  // Step 3 Logic (File Uploads)
  const handleFileDrop = (e, docId) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    validateAndProcessFile(droppedFile, docId);
  };

  const handleFileChange = (e, docId) => {
    const selectedFile = e.target.files[0];
    validateAndProcessFile(selectedFile, docId);
  };

  const validateAndProcessFile = (file, docId) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setValidationMsg('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setValidationMsg('File is too large. Maximum size is 5MB.');
      return;
    }
    setValidationMsg("");

    // Optional: read as base64 for later submission
    const reader = new FileReader();
    reader.onload = () => {
      setFiles((prev) => ({
        ...prev,
        [docId]: {
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          type: file.type,
          base64: reader.result
        }
      }));
    };
    reader.readAsDataURL(file);
    if (errors.files) setErrors((prev) => ({ ...prev, files: "" }));
  };

  const removeFile = (docId) => {
    setFiles((prev) => ({ ...prev, [docId]: null }));
  };

  const handleNextStep3 = () => {
    if (!files.doc1) {
      setValidationMsg("Required Document 1 is missing.");
      setErrors({ files: "Missing document" });
      return;
    }
    if (!agreeCertify) {
      setValidationMsg("You must certify that the given information is true and accurate.");
      setErrors({ certify: "Required" });
      return;
    }
    setErrors({});
    setValidationMsg("");
    setStep(4);
  };

  const handleSubmitRegistration = (e) => {
    if (e) e.preventDefault();
    const passed = validate({
      officialEmail: validators.email(form.officialEmail),
      officialContactNumber: validators.contactNumber(form.officialContactNumber),
      certifyBusinessInfo: validators.checkbox(
        form.certifyBusinessInfo,
        "You must certify that the provided business details are correct"
      )
    });

    if (!passed) {
      setValidationMsg("Please correct the errors in the form before proceeding.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setValidationMsg("");
      setIsSuccess(true);
    }
  };

  // --- Sub-components for Stepper ---
  const renderStepper = () => (
    <div className="mt-8 mb-10 bg-[#f3f9f4] border border-green-50/50 rounded-2xl p-4 md:py-6 md:px-12 flex items-center justify-between relative overflow-hidden">
      {/* Step 1 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-white ${step >= 1 ? 'bg-[#08511f] text-white' : 'bg-gray-300 text-white'}`}>
          {step > 1 ? <Check size={18} strokeWidth={3} /> : "1"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 1 ? 'text-[#08511f]' : 'text-gray-400'}`}>
          Personal Information
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 2 ? 'bg-[#08511f]' : 'bg-gray-300'}`} />

      {/* Step 2 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 2 ? 'bg-[#08511f] text-white shadow-md' : 'bg-gray-300 text-white'}`}>
          {step > 2 ? <Check size={18} strokeWidth={3} /> : "2"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 2 ? 'text-[#08511f]' : 'text-gray-400'}`}>
          Account Verification
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 3 ? 'bg-[#08511f]' : 'bg-gray-300'}`} />

      {/* Step 3 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 3 ? 'bg-[#08511f] text-white shadow-md' : 'bg-gray-300 text-white'}`}>
          {step > 3 ? <Check size={18} strokeWidth={3} /> : "3"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 3 ? 'text-[#08511f]' : 'text-gray-400'}`}>
          Document Verification
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 4 ? 'bg-[#08511f]' : 'bg-gray-300'}`} />

      {/* Step 4 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 4 ? 'bg-[#08511f] text-white shadow-md' : 'bg-gray-300 text-white'}`}>
          {step > 4 ? <Check size={18} strokeWidth={3} /> : "4"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 4 ? 'text-[#08511f]' : 'text-gray-400'}`}>
          Business Information
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }} />
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px]" />

      {/* Top Header */}
      <div className="relative z-10 w-full px-6 sm:px-10 pt-6 flex items-center justify-between">
        <CustomWhiteButton
          onClick={() => step === 1 ? navigate("/register/supplier-warehouse") : setStep(step - 1)}
          className="!rounded-full w-auto !p-2 !px-5 shadow-sm"
          icon={
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
              <ArrowLeft size={16} />
              {step === 1 ? "Back to Role Selection" : "Previous Step"}
            </span>
          }
        />
        <span className="text-xs md:text-sm font-bold text-emerald-800 tracking-wider uppercase">
          {step === 1 && "Step 1 of 4: Personal Information"}
          {step === 2 && "Step 2 of 4: Account Verification"}
          {step === 3 && "Step 3 of 4: Document Verification"}
          {step === 4 && "Step 4 of 4: Business Information"}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-10">
        {isSuccess ? (
          <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-[32px] shadow-2xl p-8 md:p-12 text-center animate-fade-in-up flex flex-col items-center">
            {/* Green Badge Check Icon */}
            <div className="w-14 h-14 bg-[#08511f] rounded-full flex items-center justify-center text-white mb-5 shadow-sm">
              <Check size={28} strokeWidth={3.5} />
            </div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#08511f] mb-3">
              Registration Submitted
            </h2>

            {/* Subtitle */}
            <p className="text-gray-500 text-sm md:text-base mt-1 mb-6 max-w-md">
              Your farmer registration is under review. We'll email you once it's approved.
            </p>

            {/* Application Status Badge / Container */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-[#f8faf7] border border-green-50/50 rounded-2xl p-4 w-full max-w-md mx-auto mb-8 shadow-sm">
              <div className="flex items-center gap-2 px-3.5 py-1.5 bg-[#eaf5ec] rounded-lg">
                <span className="text-[#08511f] text-xs font-bold whitespace-nowrap">
                  Application Status
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm">
                <Clock size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-600 text-xs font-semibold whitespace-nowrap">
                  Pending Administrator Review
                </span>
              </div>
            </div>

            {/* Trust Quote */}
            <p className="text-[11px] md:text-xs text-gray-500 italic max-w-sm mb-8 leading-relaxed">
              "Thank you for choosing GrainRise. We appreciate your interest in becoming one of our verified retail partners."
            </p>

            {/* Button */}
            <CustomGreenButton
              text="Return to Home"
              onClick={() => navigate("/")}
              className="w-full max-w-md !rounded-xl !py-3.5 font-bold shadow-md mb-6"
            />

            {/* Need Help Footer */}
            <p className="text-xs text-gray-400 font-medium">
              Need assistance?{" "}
              <a
                href="mailto:support@grainrise.com"
                className="text-[#08511f] hover:underline font-bold"
              >
                Contact the GrainRise Support Team.
              </a>
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl bg-white border border-gray-100 rounded-3xl shadow-2xl p-6 md:p-12">
            <div className="flex flex-col items-center text-center">
              <img src={logo} alt="GrainRise Logo" className="h-12 object-contain mb-4" />
              <h1 className="text-2xl md:text-[32px] font-extrabold text-gray-900 leading-tight">
                {step === 1 && "Create Your Farmer Account"}
                {step === 2 && "Verify Your Account"}
                {step === 3 && "Document Verification"}
                {step === 4 && "Business Information"}
              </h1>
              <p className="text-gray-500 text-sm md:text-base mt-2 max-w-lg">
                {step === 1 && "Complete your personal information to begin your registration."}
                {step === 2 && "Enter the verification code sent to your registered email to continue your registration."}
                {step === 3 && "Upload the required document(s) to complete your registration. Your application will be reviewed before approval."}
                {step === 4 && "Provide the details of your farming operation."}
              </p>
            </div>

            {renderStepper()}

            {validationMsg && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium text-left">
                {validationMsg}
              </div>
            )}

            {/* STEP 1 FORM */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-8 animate-fade-in">
                {/* Personal Information */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <FieldWithError error={errors.firstName}>
                      <CustomTextbox
                        label={<>First Name <span className="text-red-500">*</span></>}
                        placeholder="e.g. Juan"
                        value={form.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                      />
                    </FieldWithError>

                    <CustomTextbox
                      label={<>Middle Initial <span className="text-gray-400 font-normal text-xs">(Optional)</span></>}
                      placeholder="M.I."
                      value={form.middleInitial}
                      onChange={(e) => handleInputChange("middleInitial", e.target.value)}
                    />

                    <FieldWithError error={errors.lastName}>
                      <CustomTextbox
                        label={<>Last Name <span className="text-red-500">*</span></>}
                        placeholder="e.g. Dela Cruz"
                        value={form.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                      />
                    </FieldWithError>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                      <Dropdown label="Suffix (Optional)" placeholder="Select suffix" options={SUFFIXES} value={form.suffix} onChange={(val) => handleInputChange("suffix", val)} />
                    </div>
                    <div className="md:col-span-2">
                      <Dropdown label="Gender *" placeholder="Select Gender" options={GENDERS} value={form.gender} onChange={(val) => handleInputChange("gender", val)} error={errors.gender} />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <Dropdown label="Province *" placeholder="Select Province" options={PROVINCES} value={form.province} onChange={handleProvinceChange} error={errors.province} />
                    <Dropdown label="Municipality *" placeholder="Select City" options={activeMunicipalities} value={form.municipality} onChange={handleMunicipalityChange} error={errors.municipality} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Postal Code <span className="text-gray-400 font-normal text-xs">(Auto Generated)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.postalCode}
                        className="w-full px-4 py-3 rounded-xl bg-gray-200 text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>

                    <Dropdown label="Barangay *" placeholder="Select Barangay" options={activeBarangays} value={form.barangay} onChange={(val) => handleInputChange("barangay", val)} error={errors.barangay} />

                    <FieldWithError error={errors.streetAddress}>
                      <CustomTextbox
                        label={<>Street Address <span className="text-red-500">*</span></>}
                        placeholder="Unit/Bldg, Street Name"
                        value={form.streetAddress}
                        onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                      />
                    </FieldWithError>
                  </div>
                </div>

                {/* Account Details */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Account Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FieldWithError error={errors.email}>
                        <CustomTextbox
                          label={<>Email Address <span className="text-red-500">*</span></>}
                          placeholder="youremail@example.com"
                          type="email"
                          value={form.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                        />
                      </FieldWithError>

                      <FieldWithError error={errors.contactNumber}>
                        <CustomTextbox
                          label={<>Contact Number <span className="text-red-500">*</span></>}
                          placeholder="63+ 9XX XXX XXXX"
                          value={form.contactNumber}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                        />
                      </FieldWithError>

                      <CustomTextbox
                        label={<>Username <span className="text-gray-400 font-normal text-xs">(Optional)</span></>}
                        placeholder="yourusername"
                        value={form.username}
                        onChange={(e) => handleInputChange("username", e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* ── Password Column ── */}
                      <div>
                        <FieldWithError error={errors.password}>
                          <div className="relative">
                            <CustomTextbox
                              label={<>Password <span className="text-red-500">*</span></>}
                              placeholder="••••••••••••"
                              type={showPassword ? "text" : "password"}
                              value={form.password}
                              onChange={(e) => handleInputChange("password", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-[42px] text-gray-500 hover:text-gray-700 transition focus:outline-none"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FieldWithError>

                        {/* Password Strength Bar + Requirements */}
                        {form.password && (() => {
                          const strength = getPasswordStrength(form.password);
                          const bar = {
                            weak:   { width: "33%",  color: "bg-red-400",    text: "text-red-500",    label: "Weak" },
                            medium: { width: "66%",  color: "bg-yellow-400", text: "text-yellow-600", label: "Medium" },
                            strong: { width: "100%", color: "bg-green-500",  text: "text-green-600",  label: "Strong" },
                          }[strength];
                          const pw = form.password;
                          const reqs = [
                            { label: "At least 8 characters",          met: pw.length >= 8 },
                            { label: "One uppercase letter (A–Z)",      met: /[A-Z]/.test(pw) },
                            { label: "One lowercase letter (a–z)",      met: /[a-z]/.test(pw) },
                            { label: "One number (0–9)",                met: /[0-9]/.test(pw) },
                            { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
                          ];
                          return (
                            <div className="mt-2 px-1 space-y-2">
                              {/* Bar */}
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${bar.color}`}
                                    style={{ width: bar.width }}
                                  />
                                </div>
                                <span className={`text-xs font-semibold shrink-0 ${bar.text}`}>{bar.label}</span>
                              </div>
                              {/* Requirements checklist */}
                              <ul className="space-y-1 mt-1">
                                {reqs.map((r) => (
                                  <li key={r.label} className="flex items-center gap-2">
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${r.met ? "bg-green-500" : "bg-gray-200"}`}>
                                      {r.met && <Check size={10} strokeWidth={3} className="text-white" />}
                                    </span>
                                    <span className={`text-xs ${r.met ? "text-green-700 font-medium" : "text-gray-400"}`}>
                                      {r.label}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Confirm Password Column ── */}
                      <div>
                        <FieldWithError error={errors.confirmPassword}>
                          <div className="relative">
                            <CustomTextbox
                              label={<>Confirm Password <span className="text-red-500">*</span></>}
                              placeholder="••••••••••••"
                              type={showConfirmPassword ? "text" : "password"}
                              value={form.confirmPassword}
                              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-4 top-[42px] text-gray-500 hover:text-gray-700 transition focus:outline-none"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </FieldWithError>

                        {/* Password Match indicator */}
                        {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                          <p className="mt-2 px-1 text-xs font-semibold text-green-600 flex items-center gap-1">
                            <Check size={12} strokeWidth={3} /> Password Match
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-start gap-3">
                  <input id="agreeTerms" type="checkbox" checked={form.agreeTerms} onChange={(e) => handleInputChange("agreeTerms", e.target.checked)} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer mt-0.5" />
                  <label htmlFor="agreeTerms" className="text-sm font-medium text-gray-700 text-left cursor-pointer select-none leading-relaxed">
                    I agree to the <span className="text-[#08511f] font-semibold underline">Privacy Policy</span> and <span className="text-[#08511f] font-semibold underline">Terms of Service</span>.
                  </label>
                </div>
                {errors.agreeTerms && <span className="text-xs text-red-500 block -mt-6">{errors.agreeTerms}</span>}

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <CustomGreenButton
                    text={
                      <span className="flex items-center gap-2">
                        Next Step <ArrowRight size={18} />
                      </span>
                    }
                    type="submit"
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </form>
            )}

            {/* STEP 2 FORM */}
            {step === 2 && (
              <div className="animate-fade-in flex flex-col items-center pb-8">
                <h3 className="text-[#08511f] font-bold text-lg mb-2 uppercase tracking-wider">Verification Code Sent</h3>
                <p className="text-gray-600 text-sm mb-8 font-medium">{maskEmail(form.email)}</p>

                <div className="flex gap-3 md:gap-4 mb-6">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-12 h-14 md:w-16 md:h-16 text-center text-2xl font-bold bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition-all ${errors.otp ? "border-red-500" : "border-gray-200"}`}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center mb-10">
                  <span className="text-sm text-gray-500 font-medium">
                    Resend available in <strong className="text-gray-800">00:{otpTimer.toString().padStart(2, '0')}</strong>
                  </span>
                  <p className="text-sm mt-3 font-medium text-gray-600">
                    Didn't receive the code?{" "}
                    <button
                      onClick={handleResendOtp}
                      disabled={otpTimer > 0}
                      className={`${otpTimer > 0 ? "text-gray-400 cursor-not-allowed" : "text-[#08511f] hover:underline cursor-pointer font-bold"}`}
                    >
                      Resend OTP
                    </button>
                  </p>
                  <p className="text-xs text-gray-400 max-w-sm text-center mt-4">
                    Upon resending, you may choose to receive the verification code through your registered Email Address or Contact Number.
                  </p>
                </div>

                <div className="w-full pt-6 border-t border-gray-100 flex justify-between">
                  <CustomWhiteButton
                    onClick={() => setStep(1)}
                    className="!rounded-full w-auto !p-2 !px-6"
                    icon={
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <ArrowLeft size={16} /> Previous
                      </span>
                    }
                  />
                  <CustomGreenButton
                    text="Verify OTP"
                    onClick={handleVerifyOtp}
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* STEP 3 FORM */}
            {step === 3 && (
              <div className="animate-fade-in flex flex-col text-left">
                <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-6 text-left">
                  Required Documents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Document 1 (Required) */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-green-50/50 hover:border-green-400 transition-colors relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFileDrop(e, 'doc1')}
                  >
                    <label className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-gray-600 z-10">
                      Required Document 1 <span className="text-red-500">*</span>
                    </label>

                    {!files.doc1 ? (
                      <>
                        <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-4 cursor-pointer text-[#08511f]">
                          <label htmlFor="file-doc1" className="cursor-pointer">
                            <Upload size={20} />
                          </label>
                        </div>
                        <label htmlFor="file-doc1" className="text-sm font-bold text-[#08511f] cursor-pointer hover:underline mb-2">Upload File</label>
                        <p className="text-xs text-gray-500">JPG, PNG, WEBP, PDF (Max 5MB)</p>
                        <input id="file-doc1" type="file" accept=".jpg, .jpeg, .png, .webp, .pdf" className="hidden" onChange={(e) => handleFileChange(e, 'doc1')} />
                      </>
                    ) : (
                      <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full relative">
                        <button onClick={() => removeFile('doc1')} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={16} /></button>
                        <FileText size={32} className="text-[#08511f] mb-2" />
                        <span className="text-sm font-semibold text-gray-800 truncate w-full px-2" title={files.doc1.name}>{files.doc1.name}</span>
                        <span className="text-xs text-gray-500 mt-1">{files.doc1.size}</span>
                      </div>
                    )}
                  </div>

                  {/* Document 2 (Optional) */}
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-green-50/50 hover:border-green-400 transition-colors relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleFileDrop(e, 'doc2')}
                  >
                    <label className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-gray-600 z-10">
                      Required Document 2 <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>

                    {!files.doc2 ? (
                      <>
                        <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-4 cursor-pointer text-[#08511f]">
                          <label htmlFor="file-doc2" className="cursor-pointer">
                            <Upload size={20} />
                          </label>
                        </div>
                        <label htmlFor="file-doc2" className="text-sm font-bold text-[#08511f] cursor-pointer hover:underline mb-2">Upload File</label>
                        <p className="text-xs text-gray-500">JPG, PNG, WEBP, PDF (Max 5MB)</p>
                        <input id="file-doc2" type="file" accept=".jpg, .jpeg, .png, .webp, .pdf" className="hidden" onChange={(e) => handleFileChange(e, 'doc2')} />
                      </>
                    ) : (
                      <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full relative">
                        <button onClick={() => removeFile('doc2')} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X size={16} /></button>
                        <FileText size={32} className="text-[#08511f] mb-2" />
                        <span className="text-sm font-semibold text-gray-800 truncate w-full px-2" title={files.doc2.name}>{files.doc2.name}</span>
                        <span className="text-xs text-gray-500 mt-1">{files.doc2.size}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#eaf5ec] border border-[#bce8c4] rounded-xl p-4 flex items-start gap-3 mb-6">
                  <Info className="text-[#08511f] shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">Administrator Review</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Your registration will be reviewed by a GrainRise administrator after submission. You will receive a notification once your application has been reviewed.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100">
                  <input
                    id="agreeCertify"
                    type="checkbox"
                    checked={agreeCertify}
                    onChange={(e) => setAgreeCertify(e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor="agreeCertify" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                    I certify that the information and uploaded documents provided are true and accurate.
                  </label>
                </div>

                <div className="w-full flex justify-between">
                  <CustomWhiteButton
                    onClick={() => setStep(2)}
                    className="!rounded-full w-auto !p-2 !px-6"
                    icon={
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <ArrowLeft size={16} /> Previous
                      </span>
                    }
                  />
                  <CustomGreenButton
                    text={
                      <span className="flex items-center gap-2">
                        Next Step <ArrowRight size={18} />
                      </span>
                    }
                    onClick={handleNextStep3}
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* STEP 4 FORM */}
            {step === 4 && (
              <form onSubmit={handleSubmitRegistration} className="space-y-8 animate-fade-in">
                {/* Auto-filled banner */}
                <div className="bg-[#eaf5ec] border border-[#bce8c4] rounded-xl p-4 flex items-center gap-3 text-left">
                  <FileText className="text-[#08511f] shrink-0" size={20} />
                  <span className="text-sm font-semibold text-gray-700">
                    Some fields have been automatically filled from your uploaded documents.
                  </span>
                </div>

                {/* Business Information Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Business Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Business Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessName}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.organizationName}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Province
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessProvince}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Municipality
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessMunicipality}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Postal Code <span className="text-gray-400 font-normal text-xs">(Auto Generated)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessPostalCode}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Barangay
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessBarangay}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-bold text-gray-700 text-left">
                        Street Address
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.businessStreetAddress}
                        className="w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-500 font-semibold border border-gray-200 outline-none cursor-not-allowed text-left"
                      />
                    </div>
                  </div>
                </div>

                {/* Official Contact Information Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Official Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWithError error={errors.officialEmail}>
                      <CustomTextbox
                        label={<>Official Email Address <span className="text-red-500">*</span></>}
                        placeholder="company@gmail.com"
                        type="email"
                        value={form.officialEmail}
                        onChange={(e) => handleInputChange("officialEmail", e.target.value)}
                      />
                    </FieldWithError>

                    <FieldWithError error={errors.officialContactNumber}>
                      <CustomTextbox
                        label={<>Official Contact Number <span className="text-red-500">*</span></>}
                        placeholder="+63 9XX XXX XXXX"
                        value={form.officialContactNumber}
                        onChange={(e) => handleInputChange("officialContactNumber", e.target.value)}
                      />
                    </FieldWithError>
                  </div>
                </div>

                {/* Review Carefully Message and Checkbox */}
                <div className="bg-[#eaf5ec] border border-[#bce8c4] rounded-xl p-5 text-left space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                    <AlertCircle className="text-[#08511f] shrink-0" size={20} />
                    <span>Review Carefully</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-7">
                    Please ensure all business details match your official registration documents exactly to avoid delays in verification.
                  </p>
                  <div className="flex items-center gap-3 pl-7 pt-1">
                    <input
                      id="certifyBusinessInfo"
                      type="checkbox"
                      checked={form.certifyBusinessInfo}
                      onChange={(e) => handleInputChange("certifyBusinessInfo", e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="certifyBusinessInfo" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                      I certify that the information provided is correct.
                    </label>
                  </div>
                  {errors.certifyBusinessInfo && (
                    <span className="text-xs text-red-500 block pl-7">{errors.certifyBusinessInfo}</span>
                  )}
                </div>

                {/* Step 4 Navigation buttons */}
                <div className="pt-6 border-t border-gray-100 flex justify-between">
                  <CustomWhiteButton
                    onClick={() => setStep(3)}
                    className="!rounded-full w-auto !p-2 !px-6"
                    icon={
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <ArrowLeft size={16} /> Previous
                      </span>
                    }
                  />
                  <CustomGreenButton
                    text="Submit Registration"
                    type="submit"
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

export default FarmerRegister;
