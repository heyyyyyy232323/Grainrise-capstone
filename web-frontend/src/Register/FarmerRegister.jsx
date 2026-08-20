import React, { useState, useEffect, useRef, useCallback } from "react";
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
  AlertCircle,
  Shield,
  CloudUpload,
  Smartphone,
  Mail,
  FileCheck
} from "lucide-react";
import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Dropdown from "../Components/Minor-Components/Dropdown";
import Footer from "../Components/Minor-Components/CustomFooter";
import Toast from "../Components/Minor-Components/Toast";
import useToast from "../Components/hooks/useToast";
import logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";
import useFormValidation from "../Components/hooks/useFormValidation";

const PROVINCES = ["Bulacan", "Metro Manila (NCR)"];
const MUNICIPALITIES_MAP = {
  "Bulacan": ["Baliuag", "Balagtas", "Bocaue", "Bulakan", "Bustos", "Calumpit", "Doña Remedios Trinidad", "Guiguinto", "Hagonoy", "Malolos City", "Marilao"],
  "Metro Manila (NCR)": ["Valenzuela City", "Quezon City", "Manila", "Makati", "Pasig", "Taguig"]
};
const BARANGAYS_MAP = {
  "Baliuag": ["Bagong Nayon", "Barangca", "Calantipay", "Catulinan", "Concepcion", "Hinukay", "Makinabang", "Matangtubig", "Pagala", "Paitan", "Piel"]
};
const SUFFIXES = ["N/A", "Jr.", "Sr.", "II", "III", "IV", "V"];
const GENDERS = ["Male", "Female", "Others", "Preferred Not To Say"];
const LAND_OWNERSHIP_OPTIONS = ["Owner", "Tenant", "Lessee", "Agricultural Worker", "Cooperative Member"];
const RICE_VARIETIES = [
  "Inbred (NSIC Rc 222)",
  "Inbred (NSIC Rc 160)",
  "Hybrid (Mestiso 20)",
  "Hybrid (SL-8H)",
  "Organic / Traditional Rice",
  "Other Variety"
];

// Helper: Wraps CustomTextbox to show field-level error message underneath
const FieldWithError = ({ error, children, fieldRef }) => (
  <div ref={fieldRef}>
    {children}
    {error && <span className="text-xs text-red-500 mt-1 block text-left">{error}</span>}
  </div>
);

const FarmerRegister = () => {
  const navigate = useNavigate();

  // Wizard State (1 to 4)
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Main Form Data
  const [form, setForm] = useState({
    // Step 1: Personal Info
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

    // Step 2: OTP Delivery Option
    otpDelivery: "contact", // "contact" | "email"

    // Step 3: Farm Information
    farmName: "",
    farmProvince: "",
    farmMunicipality: "",
    farmPostalCode: "1423",
    farmBarangay: "",
    farmStreetAddress: "",
    totalFarmArea: "",
    landOwnership: "",
    riceVariety: "",
    croppingCycles: "",

    // Step 4: Compliance (RSBSA)
    rsbsaMethod: "upload", // "upload" | "manual"
    rsbsaNumber: "RSBSA-12-345-67890",
    certifyCompliance: false,
  });

  // Step 2 (OTP Verification)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(60);
  const otpRefs = useRef([]);

  // Step 4 Uploaded File State
  const [rsbsaFile, setRsbsaFile] = useState({
    name: "rsbsa_id_front.jpg",
    size: "2.4 MB",
    uploadedAt: "Uploaded successfully",
  });

  // UI / Validation
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { errors, setErrors, validators, validate, getPasswordStrength } = useFormValidation();
  const [validationMsg, setValidationMsg] = useState("");
  const { toasts, showToast, removeToast } = useToast();

  // Field refs for scroll-to-error
  const fieldRefs = useRef({});
  const setFieldRef = (fieldName) => (el) => { if (el) fieldRefs.current[fieldName] = el; };

  const STEP1_FIELD_ORDER = [
    "firstName", "lastName", "gender",
    "province", "municipality", "barangay", "streetAddress",
    "email", "contactNumber", "password", "confirmPassword", "agreeTerms",
  ];
  const STEP3_FIELD_ORDER = [
    "farmProvince", "farmMunicipality", "farmBarangay", "farmStreetAddress",
    "totalFarmArea", "landOwnership", "riceVariety", "croppingCycles",
  ];

  const scrollToFirstError = useCallback((errorMap, fieldOrder) => {
    for (const field of fieldOrder) {
      if (errorMap[field] && fieldRefs.current[field]) {
        fieldRefs.current[field].scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = fieldRefs.current[field].querySelector("input, select, textarea");
        if (focusable) focusable.focus({ preventScroll: true });
        break;
      }
    }
  }, []);

  // Dynamic dropdowns for Step 1 Address
  const activeMunicipalitiesStep1 = form.province ? (MUNICIPALITIES_MAP[form.province] || []) : [];
  const activeBarangaysStep1 = form.municipality ? (BARANGAYS_MAP[form.municipality] || ["Barangay 1", "Barangay 2", "Barangay 3"]) : [];

  // Dynamic dropdowns for Step 3 Farm Address
  const activeMunicipalitiesStep3 = form.farmProvince ? (MUNICIPALITIES_MAP[form.farmProvince] || []) : [];
  const activeBarangaysStep3 = form.farmMunicipality ? (BARANGAYS_MAP[form.farmMunicipality] || ["Barangay 1", "Barangay 2", "Barangay 3"]) : [];

  const handleInputChange = (field, value) => {
    let processedValue = value;
    if (field === "firstName") {
      processedValue = value.replace(/[^a-zA-Z\s]/g, "");
    } else if (field === "lastName") {
      processedValue = value.replace(/[^a-zA-Z\s\-]/g, "");
    } else if (field === "middleInitial") {
      // Auto-uppercase and cap to 2 chars for middle initial
      processedValue = value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
    } else if (field === "contactNumber" || field === "officialContactNumber") {
      // Allow digits, spaces, and a leading + for +63 format, max 13 chars
      processedValue = value.replace(/[^0-9+\s]/g, "").slice(0, 13);
    }
    setForm((prev) => ({ ...prev, [field]: processedValue }));
    validateField(field, processedValue);
  };

  const validateField = (field, value) => {
    let errorMsg = "";
    switch (field) {
      case "firstName": errorMsg = validators.firstName(value); break;
      case "middleInitial": errorMsg = validators.middleInitial(value); break;
      case "lastName": errorMsg = validators.lastName(value); break;
      case "streetAddress": errorMsg = validators.streetAddress(value); break;
      case "email": errorMsg = validators.email(value); break;
      case "contactNumber": errorMsg = validators.contactNumber(value); break;
      case "username": errorMsg = validators.username(value); break;
      case "confirmPassword": errorMsg = validators.confirmPassword(form.password, value); break;
      case "password":
        errorMsg = validators.password(value);
        if (form.confirmPassword) {
          setErrors((prev) => ({
            ...prev,
            password: errorMsg,
            confirmPassword: validators.confirmPassword(value, form.confirmPassword),
          }));
          return;
        }
        break;
      case "gender": errorMsg = value ? "" : "Gender is required"; break;
      case "province": errorMsg = value ? "" : "Province is required"; break;
      case "municipality": errorMsg = value ? "" : "Municipality is required"; break;
      case "barangay": errorMsg = value ? "" : "Barangay is required"; break;
      case "farmProvince": errorMsg = value ? "" : "Farm Province is required"; break;
      case "farmMunicipality": errorMsg = value ? "" : "Farm Municipality is required"; break;
      case "farmBarangay": errorMsg = value ? "" : "Farm Barangay is required"; break;
      case "farmStreetAddress": errorMsg = value ? "" : "Farm Street Address is required"; break;
      case "totalFarmArea": errorMsg = value ? "" : "Total Farm Area is required"; break;
      case "landOwnership": errorMsg = value ? "" : "Land Ownership Status is required"; break;
      case "riceVariety": errorMsg = value ? "" : "Rice Variety is required"; break;
      case "croppingCycles":
        if (!value) errorMsg = "Cropping cycles per year is required";
        else if (!/^\d+$/.test(value)) errorMsg = "Accepts whole numbers only";
        break;
      case "rsbsaNumber": errorMsg = value ? "" : "RSBSA Registration Number is required"; break;
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
    setErrors((prev) => ({ ...prev, province: "", municipality: "", barangay: "" }));
  };

  const handleMunicipalityChange = (municipalityValue) => {
    setForm((prev) => ({ ...prev, municipality: municipalityValue, barangay: "" }));
    setErrors((prev) => ({ ...prev, municipality: "", barangay: "" }));
  };

  const handleFarmProvinceChange = (provinceValue) => {
    setForm((prev) => ({
      ...prev,
      farmProvince: provinceValue,
      farmMunicipality: "",
      farmBarangay: "",
      farmPostalCode: provinceValue === "Bulacan" ? "3006" : "1423",
    }));
    setErrors((prev) => ({ ...prev, farmProvince: "", farmMunicipality: "", farmBarangay: "" }));
  };

  const handleFarmMunicipalityChange = (municipalityValue) => {
    setForm((prev) => ({ ...prev, farmMunicipality: municipalityValue, farmBarangay: "" }));
    setErrors((prev) => ({ ...prev, farmMunicipality: "", farmBarangay: "" }));
  };

  // Step 1 Submit handler
  const handleNextStep1 = (e) => {
    e.preventDefault();
    const rules = {
      firstName: validators.firstName(form.firstName),
      middleInitial: validators.middleInitial(form.middleInitial),
      lastName: validators.lastName(form.lastName),
      gender: form.gender ? "" : "Gender is required",
      province: form.province ? "" : "Province is required",
      municipality: form.municipality ? "" : "Municipality is required",
      barangay: form.barangay ? "" : "Barangay is required",
      streetAddress: validators.streetAddress(form.streetAddress),
      email: validators.email(form.email),
      contactNumber: validators.contactNumber(form.contactNumber),
      username: validators.username(form.username),
      password: validators.password(form.password),
      confirmPassword: validators.confirmPassword(form.password, form.confirmPassword),
      agreeTerms: validators.checkbox(
        form.agreeTerms,
        "You must agree to the Privacy Policy and Terms of Service"
      ),
    };
    const passed = validate(rules);

    if (!passed) {
      setValidationMsg("Please correct the errors in the form before proceeding.");
      scrollToFirstError(rules, STEP1_FIELD_ORDER);
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted fields before proceeding.",
        duration: 4000,
      });
    } else {
      setValidationMsg("");
      setStep(2);
    }
  };

  // Step 2 OTP Timer
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

  const maskContact = (contact) => {
    if (!contact) return "09*******45";
    if (contact.length >= 10) {
      return contact.slice(0, 2) + "*".repeat(contact.length - 4) + contact.slice(-2);
    }
    return contact;
  };

  const maskEmail = (email) => {
    if (!email) return "j**********@gmail.com";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const maskedName = name[0] + "*".repeat(Math.max(name.length - 2, 3)) + (name.length > 1 ? name[name.length - 1] : "");
    return `${maskedName}@${domain}`;
  };

  const handleVerifyOtp = () => {
    if (otp.some((digit) => digit === "")) {
      setErrors({ otp: "Please enter the complete 6-digit code." });
      setValidationMsg("Please enter the complete 6-digit code.");
      return;
    }
    setErrors({});
    setValidationMsg("");
    setStep(3);
  };

  // Step 3 Submit handler
  const handleNextStep3 = (e) => {
    e.preventDefault();
    const rules = {
      farmProvince: form.farmProvince ? "" : "Farm Province is required",
      farmMunicipality: form.farmMunicipality ? "" : "Farm Municipality is required",
      farmBarangay: form.farmBarangay ? "" : "Farm Barangay is required",
      farmStreetAddress: form.farmStreetAddress ? "" : "Farm Street Address is required",
      totalFarmArea: form.totalFarmArea ? "" : "Total Farm Area is required",
      landOwnership: form.landOwnership ? "" : "Land Ownership Status is required",
      riceVariety: form.riceVariety ? "" : "Rice Variety is required",
      croppingCycles: !form.croppingCycles
        ? "Cropping cycles per year is required"
        : !/^\d+$/.test(form.croppingCycles)
        ? "Accepts whole numbers only"
        : "",
    };
    const passed = validate(rules);

    if (!passed) {
      setValidationMsg("Please fill in all required farm information fields.");
      scrollToFirstError(rules, STEP3_FIELD_ORDER);
      showToast({
        type: "error",
        title: "Missing Farm Information",
        message: "Please fill in all required farm information fields.",
        duration: 4000,
      });
    } else {
      setValidationMsg("");
      setStep(4);
    }
  };

  // Step 4 RSBSA file upload handler
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    processRsbsaFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    processRsbsaFile(file);
  };

  const processRsbsaFile = (file) => {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setValidationMsg("Invalid file type. Only PNG, JPG, WEBP, and PDF are allowed.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setValidationMsg("File exceeds maximum allowed size of 10MB.");
      return;
    }
    setValidationMsg("");
    setRsbsaFile({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      uploadedAt: "Uploaded successfully",
    });
  };

  const removeRsbsaFile = () => {
    setRsbsaFile(null);
  };

  // Step 4 Submit Registration
  const handleSubmitRegistration = (e) => {
    e.preventDefault();
    if (form.rsbsaMethod === "upload" && !rsbsaFile) {
      setValidationMsg("Please upload your RSBSA ID or switch to manual entry.");
      return;
    }
    if (form.rsbsaMethod === "manual" && !form.rsbsaNumber) {
      setErrors((prev) => ({ ...prev, rsbsaNumber: "RSBSA Registration Number is required" }));
      setValidationMsg("Please enter your RSBSA Registration Number.");
      return;
    }
    if (!form.certifyCompliance) {
      setErrors((prev) => ({ ...prev, certifyCompliance: "Certification required" }));
      setValidationMsg("You must certify that the information provided is correct.");
      return;
    }

    setValidationMsg("");
    setIsSuccess(true);
  };

  // --- Render Stepper Bar ---
  const renderStepper = () => (
    <div className="mt-8 mb-10 bg-[#f3f9f4] border border-green-50/50 rounded-2xl p-4 md:py-6 md:px-12 flex items-center justify-between relative overflow-hidden">
      {/* Step 1 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md border-4 border-white ${step >= 1 ? "bg-[#08511f] text-white" : "bg-gray-300 text-white"}`}>
          {step > 1 ? <Check size={18} strokeWidth={3} /> : "1"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 1 ? "text-[#08511f]" : "text-gray-400"}`}>
          Personal Information
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 2 ? "bg-[#08511f]" : "bg-gray-300"}`} />

      {/* Step 2 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 2 ? "bg-[#08511f] text-white shadow-md" : "bg-gray-300 text-white"}`}>
          {step > 2 ? <Check size={18} strokeWidth={3} /> : "2"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 2 ? "text-[#08511f]" : "text-gray-400"}`}>
          Account Verification
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 3 ? "bg-[#08511f]" : "bg-gray-300"}`} />

      {/* Step 3 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 3 ? "bg-[#08511f] text-white shadow-md" : "bg-gray-300 text-white"}`}>
          {step > 3 ? <Check size={18} strokeWidth={3} /> : "3"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 3 ? "text-[#08511f]" : "text-gray-400"}`}>
          Farm Information
        </span>
      </div>
      <div className={`h-0.5 flex-1 mx-2 md:mx-4 relative top-[-10px] ${step >= 4 ? "bg-[#08511f]" : "bg-gray-300"}`} />

      {/* Step 4 */}
      <div className="flex flex-col items-center z-10 flex-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 4 ? "bg-[#08511f] text-white shadow-md" : "bg-gray-300 text-white"}`}>
          {step > 4 ? <Check size={18} strokeWidth={3} /> : "4"}
        </div>
        <span className={`text-[11px] md:text-xs font-semibold mt-2 whitespace-nowrap ${step >= 4 ? "text-[#08511f]" : "text-gray-400"}`}>
          Compliance
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Gradient background matching Figma design */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(135deg, #e8f5e9 0%, #f5faf5 35%, #ffffff 65%, #bcead1 100%)"
      }} />
      {/* Subtle decorative radial glow */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 80% 10%, rgba(134,197,148,0.3) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(76,175,80,0.25) 0%, transparent 60%)"
      }} />
      {/* Background image overlay matching CTA style */}
      <div className="absolute inset-0 bg-cover bg-center pointer-events-none" style={{
        backgroundImage: `url(${backgroundImage})`,
        opacity: 0.42,
        mixBlendMode: "multiply"
      }} />

      {/* Top Header Navigation */}
      <div className="relative z-10 w-full px-6 sm:px-10 pt-6 flex items-center justify-between">
        <CustomWhiteButton
          onClick={() => (step === 1 ? navigate("/register/supplier-warehouse") : setStep(step - 1))}
          className="!rounded-full w-auto !p-2 !px-5 shadow-sm"
          icon={
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
              <ArrowLeft size={16} />
              {step === 1 ? "Back to Role Selection" : "Back to Role Selection"}
            </span>
          }
        />
        <span className="text-xs md:text-sm font-bold text-emerald-800 tracking-wider uppercase">
          {step === 1 && "STEP 1 OF 4: PERSONAL INFORMATION"}
          {step === 2 && "STEP 2 OF 4: ACCOUNT VERIFICATION"}
          {step === 3 && "STEP 3 OF 4: FARM INFORMATION"}
          {step === 4 && "STEP 4 OF 4: COMPLIANCE"}
        </span>
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-10">
        {isSuccess ? (
          <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-[32px] shadow-2xl p-8 md:p-12 text-center animate-fade-in-up flex flex-col items-center">
            <div className="w-14 h-14 bg-[#08511f] rounded-full flex items-center justify-center text-white mb-5 shadow-sm">
              <Check size={28} strokeWidth={3.5} />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#08511f] mb-3">
              Registration Submitted
            </h2>
            <p className="text-gray-500 text-sm md:text-base mt-1 mb-6 max-w-md">
              Your farmer registration is under review. We'll email you once it's approved.
            </p>
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
            <CustomGreenButton
              text="Return to Home"
              onClick={() => navigate("/")}
              className="w-full max-w-md !rounded-xl !py-3.5 font-bold shadow-md mb-6"
            />
            <p className="text-xs text-gray-400 font-medium">
              Need assistance?{" "}
              <a href="mailto:support@grainrise.com" className="text-[#08511f] hover:underline font-bold">
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
                {step === 3 && "Farm Information"}
                {step === 4 && "Compliance"}
              </h1>
              <p className="text-gray-500 text-sm md:text-base mt-2 max-w-lg">
                {step === 1 && "Complete your personal information to begin your registration."}
                {step === 2 && "Enter the verification code sent to your registered email to continue your registration."}
                {step === 3 && "Provide your farm information to support monitoring, planning, and other system functions."}
                {step === 4 && "Provide your RSBSA Information for verification."}
              </p>
            </div>

            {renderStepper()}

            {/* Toast notifications */}
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* STEP 1: PERSONAL INFORMATION */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-8 animate-fade-in">
                {/* Personal Information Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <FieldWithError error={errors.firstName} fieldRef={setFieldRef("firstName")}>
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

                    <FieldWithError error={errors.lastName} fieldRef={setFieldRef("lastName")}>
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
                    <div className="md:col-span-2" ref={setFieldRef("gender")}>
                      <Dropdown label="Gender *" placeholder="Select Gender" options={GENDERS} value={form.gender} onChange={(val) => handleInputChange("gender", val)} error={errors.gender} />
                    </div>
                  </div>
                </div>

                {/* Address Information Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div ref={setFieldRef("province")}>
                      <Dropdown label="Province *" placeholder="Select Province" options={PROVINCES} value={form.province} onChange={handleProvinceChange} error={errors.province} />
                    </div>
                    <div ref={setFieldRef("municipality")}>
                      <Dropdown label="Municipality *" placeholder="Select City" options={activeMunicipalitiesStep1} value={form.municipality} onChange={handleMunicipalityChange} error={errors.municipality} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700 text-left">
                        Postal Code <span className="text-gray-400 font-normal text-xs">(Auto Generated)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.postalCode}
                        className="w-full px-4 py-3 rounded-xl bg-gray-200 text-gray-500 outline-none cursor-not-allowed text-left"
                      />
                    </div>

                    <div ref={setFieldRef("barangay")}>
                      <Dropdown label="Barangay *" placeholder="Select Barangay" options={activeBarangaysStep1} value={form.barangay} onChange={(val) => handleInputChange("barangay", val)} error={errors.barangay} />
                    </div>

                    <FieldWithError error={errors.streetAddress} fieldRef={setFieldRef("streetAddress")}>
                      <CustomTextbox
                        label={<>Street Address <span className="text-red-500">*</span></>}
                        placeholder="Unit/Bldg, Street Name"
                        value={form.streetAddress}
                        onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                      />
                    </FieldWithError>
                  </div>
                </div>

                {/* Account Details Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Account Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FieldWithError error={errors.email} fieldRef={setFieldRef("email")}>
                        <CustomTextbox
                          label={<>Email Address <span className="text-red-500">*</span></>}
                          placeholder="youremail@example.com"
                          type="email"
                          value={form.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                        />
                      </FieldWithError>

                      <FieldWithError error={errors.contactNumber} fieldRef={setFieldRef("contactNumber")}>
                        <CustomTextbox
                          label={<>Contact Number <span className="text-red-500">*</span></>}
                          placeholder="63+ 9XX XXX XXXX"
                          value={form.contactNumber}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                        />
                      </FieldWithError>

                      <FieldWithError error={errors.username} fieldRef={setFieldRef("username")}>
                        <CustomTextbox
                          label={<>Username <span className="text-gray-400 font-normal text-xs">(Optional)</span></>}
                          placeholder="username"
                          value={form.username}
                          onChange={(e) => handleInputChange("username", e.target.value)}
                        />
                      </FieldWithError>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div ref={setFieldRef("password")}>
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

                        {form.password && (() => {
                          const strength = getPasswordStrength(form.password);
                          const bar = {
                            weak: { width: "33%", color: "bg-red-400", text: "text-red-500", label: "Weak" },
                            medium: { width: "66%", color: "bg-yellow-400", text: "text-yellow-600", label: "Medium" },
                            strong: { width: "100%", color: "bg-green-500", text: "text-green-600", label: "Strong" },
                          }[strength];
                          const pw = form.password;
                          const reqs = [
                            { label: "At least 8 characters", met: pw.length >= 8 },
                            { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(pw) },
                            { label: "One lowercase letter (a–z)", met: /[a-z]/.test(pw) },
                            { label: "One number (0–9)", met: /[0-9]/.test(pw) },
                            { label: "One special character (!@#$%^&*)", met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
                          ];
                          return (
                            <div className="mt-2 px-1 space-y-2 text-left">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-300 ${bar.color}`} style={{ width: bar.width }} />
                                </div>
                                <span className={`text-xs font-semibold shrink-0 ${bar.text}`}>{bar.label}</span>
                              </div>
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

                      <div ref={setFieldRef("confirmPassword")}>
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
                        {form.confirmPassword && !errors.confirmPassword && form.password === form.confirmPassword && (
                          <p className="mt-2 px-1 text-xs font-semibold text-green-600 flex items-center gap-1 text-left">
                            <Check size={12} strokeWidth={3} /> Password Match
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-start gap-3" ref={setFieldRef("agreeTerms")}>
                  <input
                    id="agreeTerms"
                    type="checkbox"
                    checked={form.agreeTerms}
                    onChange={(e) => handleInputChange("agreeTerms", e.target.checked)}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer mt-0.5"
                  />
                  <label htmlFor="agreeTerms" className="text-sm font-medium text-gray-700 text-left cursor-pointer select-none leading-relaxed">
                    I agree to the <span className="text-[#08511f] font-semibold underline">Privacy Policy</span> and <span className="text-[#08511f] font-semibold underline">Terms of Service</span>.
                  </label>
                </div>
                {errors.agreeTerms && <span className="text-xs text-red-500 block -mt-6 text-left">{errors.agreeTerms}</span>}

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                  <CustomGreenButton
                    text={
                      <span className="flex items-center gap-2 font-bold px-4">
                        Next Step <ArrowRight size={18} />
                      </span>
                    }
                    type="submit"
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </form>
            )}

            {/* STEP 2: ACCOUNT VERIFICATION */}
            {step === 2 && (
              <div className="animate-fade-in flex flex-col items-center pb-6">
                <h3 className="text-[#08511f] font-bold text-sm md:text-base mb-6 uppercase tracking-wider">
                  VERIFICATION CODE SENT
                </h3>

                {/* Delivery Method Selector Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl mb-3">
                  <div
                    onClick={() => handleInputChange("otpDelivery", "contact")}
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                      form.otpDelivery === "contact"
                        ? "border-[#08511f] bg-[#eaf5ec]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-gray-500">Contact Number</span>
                      <span className="text-sm font-bold text-gray-900">{maskContact(form.contactNumber)}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      form.otpDelivery === "contact" ? "border-[#08511f] bg-[#08511f]" : "border-gray-300"
                    }`}>
                      {form.otpDelivery === "contact" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  <div
                    onClick={() => handleInputChange("otpDelivery", "email")}
                    className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                      form.otpDelivery === "email"
                        ? "border-[#08511f] bg-[#eaf5ec]"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-semibold text-gray-500">Email Address</span>
                      <span className="text-sm font-bold text-gray-900 truncate max-w-[180px]">{maskEmail(form.email)}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      form.otpDelivery === "email" ? "border-[#08511f] bg-[#08511f]" : "border-gray-300"
                    }`}>
                      {form.otpDelivery === "email" && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-8 font-medium">
                  Your verification code will be sent to your selected Email Address or Contact Number.
                </p>

                {/* 6 OTP Input Boxes */}
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
                      className={`w-12 h-14 md:w-16 md:h-16 text-center text-2xl font-bold bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-600 transition-all ${
                        errors.otp ? "border-red-500" : "border-gray-200"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center mb-8">
                  <span className="text-xs text-gray-500 font-medium">
                    Resend available in <strong className="text-gray-800">00:{otpTimer.toString().padStart(2, "0")}</strong>
                  </span>
                  <p className="text-xs mt-3 font-medium text-gray-600">
                    Didn't receive the code?{" "}
                    <button
                      onClick={handleResendOtp}
                      disabled={otpTimer > 0}
                      className={`${
                        otpTimer > 0
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-[#08511f] hover:underline cursor-pointer font-bold"
                      }`}
                    >
                      Resend OTP
                    </button>
                  </p>
                  <p className="text-[11px] text-gray-400 max-w-md text-center mt-3">
                    Your verification code will be sent to your selected Contact Number or Email Address.
                  </p>
                </div>

                <div className="w-full pt-6 border-t border-gray-100 flex justify-between items-center">
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
                    className="!rounded-full !px-8 !py-3 font-bold shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* STEP 3: FARM INFORMATION */}
            {step === 3 && (
              <form onSubmit={handleNextStep3} className="space-y-8 animate-fade-in text-left">
                {/* Optional Farm Name */}
                <CustomTextbox
                  label={<>Farm/Farm Lot Name <span className="text-gray-400 font-normal text-xs">(Optional)</span></>}
                  placeholder="Enter Farm Name"
                  value={form.farmName}
                  onChange={(e) => handleInputChange("farmName", e.target.value)}
                />

                {/* Location Details Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5">
                    LOCATION DETAILS
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <Dropdown
                      label="Province *"
                      placeholder="Select Province"
                      options={PROVINCES}
                      value={form.farmProvince}
                      onChange={handleFarmProvinceChange}
                      error={errors.farmProvince}
                    />
                    <Dropdown
                      label="Municipality *"
                      placeholder="Select City"
                      options={activeMunicipalitiesStep3}
                      value={form.farmMunicipality}
                      onChange={handleFarmMunicipalityChange}
                      error={errors.farmMunicipality}
                    />
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Postal Code <span className="text-gray-400 font-normal text-xs">(Auto Generated)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={form.farmPostalCode}
                        className="w-full px-4 py-3 rounded-xl bg-gray-200 text-gray-500 outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Dropdown
                      label="Barangay *"
                      placeholder="Select Barangay"
                      options={activeBarangaysStep3}
                      value={form.farmBarangay}
                      onChange={(val) => handleInputChange("farmBarangay", val)}
                      error={errors.farmBarangay}
                    />

                    <FieldWithError error={errors.farmStreetAddress}>
                      <CustomTextbox
                        label={<>Street Address <span className="text-red-500">*</span></>}
                        placeholder="Unit/Bldg, Street Name"
                        value={form.farmStreetAddress}
                        onChange={(e) => handleInputChange("farmStreetAddress", e.target.value)}
                      />
                    </FieldWithError>

                    {/* Total Farm Area with Hectares badge */}
                    <FieldWithError error={errors.totalFarmArea}>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Total Farm Area <span className="text-red-500">*</span>
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Unit/Bldg, Street Name"
                            value={form.totalFarmArea}
                            onChange={(e) => handleInputChange("totalFarmArea", e.target.value)}
                            className="w-full pl-4 pr-24 py-3 border border-gray-200 rounded-xl outline-none focus:border-green-600 transition"
                          />
                          <span className="absolute right-2 px-3 py-1 bg-emerald-100 text-[#08511f] font-semibold text-xs rounded-lg">
                            Hectares
                          </span>
                        </div>
                      </div>
                    </FieldWithError>
                  </div>
                </div>

                {/* Operational Details Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5">
                    OPERATIONAL DETAILS
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <Dropdown
                      label="Land Ownership Status *"
                      placeholder="Select Ownership Status"
                      options={LAND_OWNERSHIP_OPTIONS}
                      value={form.landOwnership}
                      onChange={(val) => handleInputChange("landOwnership", val)}
                      error={errors.landOwnership}
                    />
                    <Dropdown
                      label="Rice Variety Currently Planted *"
                      placeholder="Select Rice Variety"
                      options={RICE_VARIETIES}
                      value={form.riceVariety}
                      onChange={(val) => handleInputChange("riceVariety", val)}
                      error={errors.riceVariety}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWithError error={errors.croppingCycles}>
                      <div>
                        <CustomTextbox
                          label={<>No. of Cropping Cycles per Year <span className="text-red-500">*</span></>}
                          placeholder="e.g. 2"
                          value={form.croppingCycles}
                          onChange={(e) => handleInputChange("croppingCycles", e.target.value)}
                        />
                        <span className="text-[11px] text-gray-400 mt-1 block">accepts whole numbers only</span>
                      </div>
                    </FieldWithError>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
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
                      <span className="flex items-center gap-2 font-bold px-4">
                        Next Step <ArrowRight size={18} />
                      </span>
                    }
                    type="submit"
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </form>
            )}

            {/* STEP 4: COMPLIANCE */}
            {step === 4 && (
              <form onSubmit={handleSubmitRegistration} className="space-y-8 animate-fade-in text-left">
                {/* Method selector */}
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 text-center">
                    How would you like to provide your RSBSA Information?
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                    {/* Option 1: Upload RSBSA ID */}
                    <div
                      onClick={() => handleInputChange("rsbsaMethod", "upload")}
                      className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                        form.rsbsaMethod === "upload"
                          ? "border-[#08511f] bg-[#eaf5ec]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#08511f] flex items-center justify-center">
                          <FileText size={20} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">Upload RSBSA ID</span>
                            <span className="px-2 py-0.5 bg-emerald-200 text-[#08511f] text-[10px] font-bold rounded-md">
                              Recommended
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        form.rsbsaMethod === "upload" ? "border-[#08511f] bg-[#08511f]" : "border-gray-300"
                      }`}>
                        {form.rsbsaMethod === "upload" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>

                    {/* Option 2: Enter Manually */}
                    <div
                      onClick={() => handleInputChange("rsbsaMethod", "manual")}
                      className={`p-4 rounded-xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                        form.rsbsaMethod === "manual"
                          ? "border-[#08511f] bg-[#eaf5ec]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
                          <Shield size={20} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">Enter Manually</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        form.rsbsaMethod === "manual" ? "border-[#08511f] bg-[#08511f]" : "border-gray-300"
                      }`}>
                        {form.rsbsaMethod === "manual" && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload Section */}
                {form.rsbsaMethod === "upload" && (
                  <div className="space-y-6">
                    {/* Drag and Drop Zone */}
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 hover:bg-emerald-50/30 transition relative cursor-pointer"
                      onClick={() => document.getElementById('rsbsa-upload-input').click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#08511f] flex items-center justify-center mb-3">
                        <CloudUpload size={24} />
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-3">
                        Drag and drop files here or click to select
                      </p>
                      <label htmlFor="rsbsa-upload-input">
                        <input
                          id="rsbsa-upload-input"
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                        <span className="inline-block px-5 py-2.5 bg-[#08511f] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-emerald-800 transition">
                          Browse Files
                        </span>
                      </label>
                    </div>

                    <p className="text-[11px] text-gray-400 text-center">
                      Accepted: PNG, JPG, JPEG, WEBP, PDF. Max: 10MB.
                    </p>

                    {/* File Uploaded Card */}
                    {rsbsaFile && (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                              <Check size={14} strokeWidth={3} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-gray-800">{rsbsaFile.name}</span>
                              <span className="text-[11px] text-gray-400">{rsbsaFile.size} • {rsbsaFile.uploadedAt}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeRsbsaFile}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* RSBSA Field below preview */}
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                            <FileText size={16} className="text-[#08511f]" />
                            <span>{rsbsaFile.name}</span>
                          </div>
                          <span className="text-[11px] text-gray-400 block">RSBSA Number</span>
                          <input
                            type="text"
                            value={form.rsbsaNumber}
                            onChange={(e) => handleInputChange("rsbsaNumber", e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-bold text-gray-800 text-sm focus:border-green-600 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Section */}
                {form.rsbsaMethod === "manual" && (
                  <div className="max-w-xl mx-auto space-y-4">
                    <FieldWithError error={errors.rsbsaNumber}>
                      <CustomTextbox
                        label={<>RSBSA Registration Number <span className="text-red-500">*</span></>}
                        placeholder="e.g. RSBSA-12-345-67890"
                        value={form.rsbsaNumber}
                        onChange={(e) => handleInputChange("rsbsaNumber", e.target.value)}
                      />
                    </FieldWithError>
                  </div>
                )}

                {/* Review Carefully Alert Box */}
                <div className="bg-[#eaf5ec] border border-[#bce8c4] rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
                    <AlertCircle className="text-[#08511f] shrink-0" size={20} />
                    <span>Review Carefully</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-7">
                    Please ensure all business details match your official registration documents exactly to avoid delays in verification.
                  </p>
                  <div className="flex items-center gap-3 pl-7 pt-1">
                    <input
                      id="certifyCompliance"
                      type="checkbox"
                      checked={form.certifyCompliance}
                      onChange={(e) => handleInputChange("certifyCompliance", e.target.checked)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="certifyCompliance" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                      I certify that the information provided is correct.
                    </label>
                  </div>
                  {errors.certifyCompliance && (
                    <span className="text-xs text-red-500 block pl-7">{errors.certifyCompliance}</span>
                  )}
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
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
                    className="!rounded-full !px-8 !py-3 font-bold shadow-lg"
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
