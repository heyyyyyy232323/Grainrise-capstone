import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Upload, X, FileText, Check, Info, Clock, AlertCircle } from "lucide-react";
import CustomTextbox from "../Components/Minor-Components/CustomTextbox";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import CustomWhiteButton from "../Components/Minor-Components/CustomWhiteButton";
import Dropdown from "../Components/Minor-Components/Dropdown";
import Footer from "../Components/Minor-Components/CustomFooter";
import Toast from "../Components/Modals/Toast";
import useToast from "../Components/hooks/useToast";
import useApi from "../Components/hooks/useApi";
import GoogleVerificationModal, { GoogleIcon } from "../Components/Modals/GoogleVerificationModal";
import TermsModal from "../Components/Modals/TermsModal";
import PrivacyModal from "../Components/Modals/PrivacyModal";
import logo from "../assets/Logo.png";
import backgroundImage from "../assets/smudge.jpg";
import useFormValidation from "../Components/hooks/useFormValidation";

const SUFFIXES = ["N/A", "Jr.", "Sr.", "II", "III", "IV", "V"];
const GENDERS = ["Male", "Female", "Others", "Preferred Not To Say"];

const normalizeApiResults = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

// Small helper: wraps CustomTextbox so we can show a field-level error message
// underneath it, since CustomTextbox itself has no built-in error state.
const FieldWithError = ({ error, children, fieldRef }) => (
  <div ref={fieldRef}>
    {children}
    {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
  </div>
);

const WarehouseManagerRegister = () => {
  const navigate = useNavigate();
  const { request } = useApi();

  // Wizard State
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form Field States (Account, Personal, and Step 5 Business Information)
  const [form, setForm] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    gender: "",
    province: "",
    municipality: "",
    postalCode: "",
    barangay: "",
    streetAddress: "",
    email: "",
    contactNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,

    // Step 5 Business Information (OCR suggestions, always editable)
    businessName: "",
    organizationName: "",
    businessProvince: "",
    businessMunicipality: "",
    businessPostalCode: "",
    businessBarangay: "",
    businessStreetAddress: "",

    // Step 5 Official Contact Information (OCR may suggest; user can edit)
    officialEmail: "",
    officialContactNumber: "",
    certifyBusinessInfo: false,
  });

  // Step 2 States (OTP)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpRefs = useRef([]);

  // Step 4 States (Documents)
  const [files, setFiles] = useState({
    governmentIssuedId: null,
    businessPermit: null,
    businessRegistration: null,
    warehouseLicense: null,
  });
  const [agreeCertify, setAgreeCertify] = useState(false);
  const [isExtractingDocuments, setIsExtractingDocuments] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Shared PSGC/location state from the GrainRise backend
  const [provinceOptions, setProvinceOptions] = useState([]);
  const [municipalityOptions, setMunicipalityOptions] = useState([]);
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [provinceRecords, setProvinceRecords] = useState({});
  const [municipalityRecords, setMunicipalityRecords] = useState({});
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  // Step 5 business-address PSGC state.
  // Separate from Step 1 so the home address is preserved.
  const [businessMunicipalityOptions, setBusinessMunicipalityOptions] = useState([]);
  const [businessBarangayOptions, setBusinessBarangayOptions] = useState([]);
  const [businessMunicipalityRecords, setBusinessMunicipalityRecords] = useState({});
  const [isBusinessAddressLoading, setIsBusinessAddressLoading] = useState(false);
  const [isBusinessPostalCodeEditable, setIsBusinessPostalCodeEditable] = useState(false);
  const [isBusinessBarangayEditable, setIsBusinessBarangayEditable] = useState(false);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const { errors, setErrors, validators, validate, getPasswordStrength } = useFormValidation();
  const [validationMsg, setValidationMsg] = useState("");
  const { toasts, showToast, removeToast } = useToast();

  // Field refs for scroll-to-error
  const fieldRefs = useRef({});
  const setFieldRef = (fieldName) => (el) => { if (el) fieldRefs.current[fieldName] = el; };

  const STEP1_FIELD_ORDER = [
    "email",
    "contactNumber",
    "username",
    "password",
    "confirmPassword",
    "agreeTerms",
  ];

  const STEP3_FIELD_ORDER = [
    "firstName",
    "lastName",
    "gender",
    "province",
    "municipality",
    "postalCode",
    "barangay",
    "streetAddress",
  ];

  const STEP5_FIELD_ORDER = [
    "businessName",
    "businessProvince",
    "businessMunicipality",
    "businessPostalCode",
    "businessBarangay",
    "businessStreetAddress",
    "officialEmail",
    "officialContactNumber",
    "certifyBusinessInfo",
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

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      setIsAddressLoading(true);

      try {
        const payload = await request("/locations/provinces", {
          throwOnError: true,
        });

        if (cancelled) return;

        const rows = normalizeApiResults(payload);
        const records = {};
        const options = rows
          .filter((row) => row?.name && row?.code)
          .map((row) => {
            records[row.name] = row;
            return row.name;
          })
          .sort((a, b) => a.localeCompare(b));

        setProvinceRecords(records);
        setProvinceOptions(options);
      } catch (error) {
        if (!cancelled) {
          const message = error.message || "Unable to load Philippine address data.";
          setValidationMsg(message);
          showToast({
            type: "error",
            title: "Address Data Error",
            message,
            duration: 5000,
          });
        }
      } finally {
        if (!cancelled) setIsAddressLoading(false);
      }
    };

    loadProvinces();

    return () => {
      cancelled = true;
    };
  }, [request, showToast]);

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
      processedValue = value.replace(/[^0-9+\s-]/g, "").slice(0, 16);
    } else if (field === "postalCode" || field === "businessPostalCode") {
      processedValue = value.replace(/\D/g, "").slice(0, 4);
    }
    setForm((prev) => ({ ...prev, [field]: processedValue }));

    if (field === "email") {
      setVerificationToken("");
      setOtp(["", "", "", "", "", ""]);
      setOtpTimer(0);
    }

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
      case "postalCode":
        errorMsg = value && !/^\d{4}$/.test(value) ? "Postal code must contain exactly 4 digits" : "";
        break;
      case "businessName": errorMsg = value.trim() ? "" : "Business Name is required"; break;
      case "businessProvince": errorMsg = value.trim() ? "" : "Province is required"; break;
      case "businessMunicipality": errorMsg = value.trim() ? "" : "Municipality/City is required"; break;
      case "businessPostalCode":
        errorMsg = value && !/^\d{4}$/.test(value) ? "Postal code must contain exactly 4 digits" : "";
        break;
      case "businessBarangay": errorMsg = value.trim() ? "" : "Barangay is required"; break;
      case "businessStreetAddress": errorMsg = value.trim() ? "" : "Street Address is required"; break;
      case "officialEmail": errorMsg = validators.email(value); break;
      case "officialContactNumber": errorMsg = validators.contactNumber(value); break;
      default: break;
    }
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleProvinceChange = async (provinceValue) => {
    setForm((prev) => ({
      ...prev,
      province: provinceValue,
      municipality: "",
      barangay: "",
      postalCode: "",
    }));
    setMunicipalityOptions([]);
    setMunicipalityRecords({});
    setBarangayOptions([]);
    setErrors((prev) => ({
      ...prev,
      province: provinceValue ? "" : "Province is required",
      municipality: "",
      barangay: "",
    }));
    setValidationMsg("");

    if (!provinceValue) return;

    const record = provinceRecords[provinceValue];
    if (!record?.code) return;

    setIsAddressLoading(true);

    try {
      const payload = await request(
        `/locations/provinces/${encodeURIComponent(record.code)}/cities-municipalities`,
        { throwOnError: true },
      );

      const rows = normalizeApiResults(payload);
      const records = {};
      const options = rows
        .filter((row) => row?.name && row?.code)
        .map((row) => {
          records[row.name] = row;
          return row.name;
        })
        .sort((a, b) => a.localeCompare(b));

      setMunicipalityRecords(records);
      setMunicipalityOptions(options);
    } catch (error) {
      const message = error.message || "Unable to load cities and municipalities.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Address Data Error",
        message,
        duration: 5000,
      });
    } finally {
      setIsAddressLoading(false);
    }
  };

  const handleMunicipalityChange = async (municipalityValue) => {
    setForm((prev) => ({
      ...prev,
      municipality: municipalityValue,
      barangay: "",
      postalCode: "",
    }));
    setBarangayOptions([]);
    setErrors((prev) => ({
      ...prev,
      municipality: municipalityValue ? "" : "Municipality is required",
      barangay: "",
    }));
    setValidationMsg("");

    if (!municipalityValue) return;

    const record = municipalityRecords[municipalityValue];
    if (!record?.code) return;

    setIsAddressLoading(true);

    try {
      const [barangayPayload, localityPayload] = await Promise.all([
        request(
          `/locations/cities-municipalities/${encodeURIComponent(record.code)}/barangays`,
          { throwOnError: true },
        ),
        request(
          `/locations/cities-municipalities/${encodeURIComponent(record.code)}`,
          { throwOnError: true },
        ),
      ]);

      const barangays = normalizeApiResults(barangayPayload)
        .filter((row) => row?.name)
        .map((row) => row.name)
        .sort((a, b) => a.localeCompare(b));

      setBarangayOptions(barangays);

      const postalCode = String(localityPayload?.postal_code || "");
      setForm((prev) => (
        prev.municipality === municipalityValue
          ? { ...prev, postalCode }
          : prev
      ));
    } catch (error) {
      const message = error.message || "Unable to load barangays or postal code.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Address Data Error",
        message,
        duration: 5000,
      });
    } finally {
      setIsAddressLoading(false);
    }
  };

  const normalizeAddressName = (value) => (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^city\s+of\s+/, "")
      .replace(/\s+city$/, "")
      .replace(/\s+/g, " ")
  );

  const findAddressOption = (options, value) => {
    const target = normalizeAddressName(value);
    if (!target) return "";

    return options.find(
      (option) => normalizeAddressName(option) === target
    ) || "";
  };

  const loadBusinessMunicipalities = async (provinceValue) => {
    const record = provinceRecords[provinceValue];

    if (!record?.code) {
      setBusinessMunicipalityOptions([]);
      setBusinessMunicipalityRecords({});
      return { options: [], records: {} };
    }

    const payload = await request(
      `/locations/provinces/${encodeURIComponent(record.code)}/cities-municipalities`,
      { throwOnError: true },
    );

    const rows = normalizeApiResults(payload);
    const records = {};
    const options = rows
      .filter((row) => row?.name && row?.code)
      .map((row) => {
        records[row.name] = row;
        return row.name;
      })
      .sort((a, b) => a.localeCompare(b));

    setBusinessMunicipalityRecords(records);
    setBusinessMunicipalityOptions(options);

    return { options, records };
  };

  const loadBusinessLocality = async (
    municipalityValue,
    records = businessMunicipalityRecords,
  ) => {
    const record = records[municipalityValue];

    if (!record?.code) {
      setBusinessBarangayOptions([]);
      setIsBusinessBarangayEditable(true);
      return { barangays: [], postalCode: "" };
    }

    // IMPORTANT:
    // Barangay is required, while postal code has a manual fallback.
    // Fetch them independently so a failed postal-code lookup does NOT
    // discard a successful barangay response.
    let barangays = [];
    let postalCode = "";

    try {
      const barangayPayload = await request(
        `/locations/cities-municipalities/${encodeURIComponent(record.code)}/barangays`,
        { throwOnError: true },
      );

      barangays = normalizeApiResults(barangayPayload)
        .filter((row) => row?.name)
        .map((row) => row.name)
        .sort((a, b) => a.localeCompare(b));

      setBusinessBarangayOptions(barangays);
      setIsBusinessBarangayEditable(barangays.length === 0);
    } catch (barangayError) {
      // Barangay remains required, but the user must not be blocked
      // when PSGC cannot return the list. Fall back to manual entry.
      setBusinessBarangayOptions([]);
      setIsBusinessBarangayEditable(true);
    }

    // Postal code is intentionally non-blocking.
    // If PSGC cannot return one, Step 5 switches to manual entry.
    try {
      const localityPayload = await request(
        `/locations/cities-municipalities/${encodeURIComponent(record.code)}`,
        { throwOnError: true },
      );

      postalCode = String(localityPayload?.postal_code || "").trim();
    } catch {
      postalCode = "";
    }

    return { barangays, postalCode };
  };

  const handleBusinessProvinceChange = async (provinceValue) => {
    setForm((prev) => ({
      ...prev,
      businessProvince: provinceValue,
      businessMunicipality: "",
      businessPostalCode: "",
      businessBarangay: "",
    }));

    setBusinessMunicipalityOptions([]);
    setBusinessMunicipalityRecords({});
    setBusinessBarangayOptions([]);
    setIsBusinessPostalCodeEditable(false);
    setIsBusinessBarangayEditable(false);

    setErrors((prev) => ({
      ...prev,
      businessProvince: provinceValue ? "" : "Province is required",
      businessMunicipality: "",
      businessPostalCode: "",
      businessBarangay: "",
    }));

    setValidationMsg("");

    if (!provinceValue) return;

    setIsBusinessAddressLoading(true);

    try {
      await loadBusinessMunicipalities(provinceValue);
    } catch (error) {
      const message = error.message || "Unable to load business cities and municipalities.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Address Data Error",
        message,
        duration: 5000,
      });
    } finally {
      setIsBusinessAddressLoading(false);
    }
  };

  const handleBusinessMunicipalityChange = async (municipalityValue) => {
    setForm((prev) => ({
      ...prev,
      businessMunicipality: municipalityValue,
      businessPostalCode: "",
      businessBarangay: "",
    }));

    setBusinessBarangayOptions([]);
    setIsBusinessPostalCodeEditable(false);
    setIsBusinessBarangayEditable(false);

    setErrors((prev) => ({
      ...prev,
      businessMunicipality: municipalityValue ? "" : "Municipality/City is required",
      businessPostalCode: "",
      businessBarangay: "",
    }));

    setValidationMsg("");

    if (!municipalityValue) return;

    setIsBusinessAddressLoading(true);

    try {
      const { postalCode } = await loadBusinessLocality(municipalityValue);

      setForm((prev) => (
        prev.businessMunicipality === municipalityValue
          ? { ...prev, businessPostalCode: postalCode }
          : prev
      ));

      // PSGC can legitimately return an empty ZIP for some localities.
      // Only then do we allow manual entry.
      setIsBusinessPostalCodeEditable(!postalCode);
    } catch (error) {
      // Reaching this block now means the required barangay list failed.
      // Postal-code failures are handled inside loadBusinessLocality()
      // and simply enable manual ZIP entry.
      setIsBusinessPostalCodeEditable(true);

      const message = error.message || "Unable to load barangays for the selected municipality/city.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Barangay Data Error",
        message,
        duration: 5000,
      });
    } finally {
      setIsBusinessAddressLoading(false);
    }
  };

  // Step 1 Validation — Account Information only
  const validateStep1 = () => {
    const rules = {
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
    }

    return passed;
  };

  // Step 3 Validation — Personal and home address information
  const validateStep3 = () => {
    const rules = {
      firstName: validators.firstName(form.firstName),
      middleInitial: validators.middleInitial(form.middleInitial),
      lastName: validators.lastName(form.lastName),
      gender: form.gender ? "" : "Gender is required",
      province: form.province ? "" : "Province is required",
      municipality: form.municipality
        ? ""
        : form.province
        ? "Municipality is required"
        : "Please select a province first",
      barangay: form.barangay
        ? ""
        : form.municipality
        ? "Barangay is required"
        : "Please select a municipality first",
      postalCode:
        form.postalCode && !/^\d{4}$/.test(form.postalCode)
          ? "Postal code must contain exactly 4 digits"
          : "",
      streetAddress: validators.streetAddress(form.streetAddress),
    };

    const passed = validate(rules);

    if (!passed) {
      setValidationMsg("Please correct the errors in the form before proceeding.");
      scrollToFirstError(rules, STEP3_FIELD_ORDER);
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

  const handleNextStep3 = (e) => {
    e.preventDefault();

    if (!validateStep3()) return;

    setValidationMsg("");
    setStep(4);
  };

  const handleGoogleVerifySuccess = ({ email, verificationToken }) => {
    setForm((prev) => ({
      ...prev,
      email: email,
      username: prev.username.trim() ? prev.username : email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""),
    }));
    setVerificationToken(verificationToken);
    setErrors((prev) => ({ ...prev, email: "", otp: "" }));
    setValidationMsg("");
    setStep(3);
    showToast({
      type: "success",
      title: "Google Account Verified",
      message: "Your Google account has been verified. Please continue with your personal details.",
      duration: 4000,
    });
  };

  const handleNextStep1 = async (e) => {
    e.preventDefault();

    if (!validateStep1() || isSendingOtp) return;

    setIsSendingOtp(true);

    try {
      const response = await request("/auth/warehouse-manager/send-otp", {
        method: "POST",
        body: {
          email: form.email.trim(),
          username: form.username.trim(),
        },
        throwOnError: true,
      });

      setOtp(["", "", "", "", "", ""]);
      setVerificationToken("");
      setOtpTimer(response?.retry_after ?? 60);
      setStep(2);
      setValidationMsg("");

      showToast({
        type: "success",
        title: "OTP Sent",
        message: "A 6-digit verification code was sent to your email.",
        duration: 3500,
      });
    } catch (error) {
      const message = error.message || "Unable to send OTP.";
      setValidationMsg(message);

      showToast({
        type: "error",
        title: "Unable to Send OTP",
        message,
        duration: 5000,
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Step 2 Logic (OTP Timer & Input)
  useEffect(() => {
    let timer;
    if (step === 2 && otpTimer > 0) {
      timer = setInterval(() => setOtpTimer((prev) => Math.max(prev - 1, 0)), 1000);
    }
    return () => clearInterval(timer);
  }, [step, otpTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (errors.otp) setErrors((prev) => ({ ...prev, otp: "" }));
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || isSendingOtp) return;

    setIsSendingOtp(true);

    try {
      const response = await request("/auth/warehouse-manager/send-otp", {
        method: "POST",
        body: {
          email: form.email.trim(),
          username: form.username.trim(),
        },
        throwOnError: true,
      });

      setOtp(["", "", "", "", "", ""]);
      setVerificationToken("");
      setOtpTimer(response?.retry_after ?? 60);
      setValidationMsg("");

      showToast({
        type: "success",
        title: "OTP Resent",
        message: "A new verification code was sent to your email.",
        duration: 3500,
      });
    } catch (error) {
      const message = error.message || "Unable to resend OTP.";
      setValidationMsg(message);

      showToast({
        type: "error",
        title: "Unable to Resend OTP",
        message,
        duration: 5000,
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const maskEmail = (email) => {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const maskedName = name[0] + "*".repeat(Math.max(name.length - 2, 3)) + (name.length > 1 ? name[name.length - 1] : "");
    return `${maskedName}@${domain}`;
  };

  const handleVerifyOtp = async () => {
    if (verificationToken) {
      setStep(3);
      setValidationMsg("");
      return;
    }

    if (otp.some((digit) => digit === "")) {
      setErrors((prev) => ({
        ...prev,
        otp: "Please enter the complete 6-digit code.",
      }));
      setValidationMsg("Please enter the complete 6-digit code.");
      return;
    }

    if (isVerifyingOtp) return;

    setIsVerifyingOtp(true);

    try {
      const response = await request("/auth/warehouse-manager/verify-otp", {
        method: "POST",
        body: {
          email: form.email.trim(),
          otp: otp.join(""),
        },
        throwOnError: true,
      });

      setVerificationToken(response.verification_token);
      setErrors((prev) => ({ ...prev, otp: "" }));
      setValidationMsg("");
      setStep(3);

      showToast({
        type: "success",
        title: "Email Verified",
        message: "Your email address has been verified.",
        duration: 3000,
      });
    } catch (error) {
      const message = error.message || "Unable to verify OTP.";
      setErrors((prev) => ({ ...prev, otp: message }));
      setValidationMsg(message);
    } finally {
      setIsVerifyingOtp(false);
    }
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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      const message = "Invalid file type. Only JPG, JPEG, PNG, WEBP, and PDF are allowed.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "Invalid Document",
        message,
        duration: 4500,
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      const message = "File is too large. Maximum size is 5MB.";
      setValidationMsg(message);
      showToast({
        type: "error",
        title: "File Too Large",
        message,
        duration: 4500,
      });
      return;
    }

    setValidationMsg("");
    setFiles((prev) => ({
      ...prev,
      [docId]: {
        file,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        type: file.type,
      },
    }));

    if (errors.files) {
      setErrors((prev) => ({ ...prev, files: "" }));
    }
  };

  const removeFile = (docId) => {
    setFiles((prev) => ({ ...prev, [docId]: null }));
  };

  const getMissingDocumentLabels = () => {
    const requiredDocuments = [
      ["governmentIssuedId", "Valid Government-Issued ID"],
      ["businessPermit", "Mayor's / Business Permit"],
      ["businessRegistration", "DTI / SEC / CDA Registration"],
      ["warehouseLicense", "BPI License to Operate / Warehouse License"],
    ];

    return requiredDocuments
      .filter(([key]) => !files[key])
      .map(([, label]) => label);
  };

  const handleNextStep4 = async () => {
    const missingDocuments = getMissingDocumentLabels();

    if (missingDocuments.length > 0) {
      const message = `Please upload all required documents: ${missingDocuments.join(", ")}.`;
      setValidationMsg(message);
      setErrors((prev) => ({ ...prev, files: "All four documents are required." }));

      showToast({
        type: "error",
        title: "Missing Documents",
        message,
        duration: 5500,
      });
      return;
    }

    if (!agreeCertify) {
      const message = "You must certify that the uploaded documents are true and accurate.";
      setValidationMsg(message);
      setErrors((prev) => ({ ...prev, certify: "Required" }));

      showToast({
        type: "error",
        title: "Certification Required",
        message,
        duration: 4500,
      });
      return;
    }

    if (!verificationToken) {
      const message = "Please verify your email again before continuing.";
      setValidationMsg(message);
      setStep(2);
      return;
    }

    if (isExtractingDocuments) return;

    const payload = new FormData();
    payload.append(
      "government_issued_id",
      files.governmentIssuedId.file,
      files.governmentIssuedId.name,
    );
    payload.append(
      "business_permit",
      files.businessPermit.file,
      files.businessPermit.name,
    );
    payload.append(
      "business_registration",
      files.businessRegistration.file,
      files.businessRegistration.name,
    );
    payload.append(
      "warehouse_license",
      files.warehouseLicense.file,
      files.warehouseLicense.name,
    );
    payload.append("agree_documents_certify", String(agreeCertify));

    setIsExtractingDocuments(true);

    try {
      const response = await request("/auth/warehouse-manager/extract-documents", {
        method: "POST",
        body: payload,
        throwOnError: true,
      });

      const autofill = response?.autofill || {};

      const matchedProvince = (
        findAddressOption(provinceOptions, autofill.province)
        || autofill.province
        || ""
      );

      let matchedMunicipality = autofill.municipality || "";
      let matchedBarangay = autofill.barangay || "";
      let resolvedPostalCode = String(autofill.postal_code || "").replace(/\D/g, "").slice(0, 4);

      // Step 5 address follows the same PSGC flow as the personal-information address flow.
      if (matchedProvince && provinceRecords[matchedProvince]) {
        setIsBusinessAddressLoading(true);

        try {
          const municipalityResult = await loadBusinessMunicipalities(matchedProvince);

          matchedMunicipality = (
            findAddressOption(municipalityResult.options, autofill.municipality)
            || ""
          );

          if (matchedMunicipality) {
            const localityResult = await loadBusinessLocality(
              matchedMunicipality,
              municipalityResult.records,
            );

            resolvedPostalCode = localityResult.postalCode || resolvedPostalCode;
            setIsBusinessPostalCodeEditable(!resolvedPostalCode);
            matchedBarangay = (
              findAddressOption(localityResult.barangays, autofill.barangay)
              || autofill.barangay
              || ""
            );

            setIsBusinessBarangayEditable(
              localityResult.barangays.length === 0
              || (
                Boolean(autofill.barangay)
                && !findAddressOption(localityResult.barangays, autofill.barangay)
              )
            );
          } else {
            setBusinessBarangayOptions([]);
            setIsBusinessPostalCodeEditable(!resolvedPostalCode);
            setIsBusinessBarangayEditable(true);
          }
        } finally {
          setIsBusinessAddressLoading(false);
        }
      } else {
        setBusinessMunicipalityOptions([]);
        setBusinessMunicipalityRecords({});
        setBusinessBarangayOptions([]);
        setIsBusinessPostalCodeEditable(!resolvedPostalCode);
        setIsBusinessBarangayEditable(true);
      }

      setForm((prev) => ({
        ...prev,
        businessName: autofill.business_name || "",
        organizationName: autofill.organization_name || "",
        businessProvince: matchedProvince,
        businessMunicipality: matchedMunicipality,
        businessPostalCode: resolvedPostalCode,
        businessBarangay: matchedBarangay,
        businessStreetAddress: autofill.street_address || "",
        officialEmail: autofill.official_email || prev.officialEmail || "",
        officialContactNumber: autofill.official_contact_number || prev.officialContactNumber || "",
      }));

      setErrors({});
      setValidationMsg("");
      setStep(5);

      showToast({
        type: "success",
        title: "Documents Processed",
        message: "OCR suggestions are ready. Please review and edit the business information before submitting.",
        duration: 5000,
      });
    } catch (error) {
      const message = error.message || "Unable to process the uploaded documents.";
      setValidationMsg(message);

      showToast({
        type: "error",
        title: "Document Processing Failed",
        message,
        duration: 6000,
      });
    } finally {
      setIsExtractingDocuments(false);
    }
  };

  const handleSubmitRegistration = async (e) => {
    if (e) e.preventDefault();

    const rules = {
      businessName: form.businessName.trim() ? "" : "Business Name is required",
      businessProvince: form.businessProvince.trim() ? "" : "Province is required",
      businessMunicipality: form.businessMunicipality.trim() ? "" : "Municipality/City is required",
      businessPostalCode: form.businessPostalCode && !/^\d{4}$/.test(form.businessPostalCode) ? "Postal code must contain exactly 4 digits" : "",
      businessBarangay: form.businessBarangay.trim() ? "" : "Barangay is required",
      businessStreetAddress: form.businessStreetAddress.trim() ? "" : "Street Address is required",
      officialEmail: validators.email(form.officialEmail),
      officialContactNumber: validators.contactNumber(form.officialContactNumber),
      certifyBusinessInfo: validators.checkbox(
        form.certifyBusinessInfo,
        "You must certify that the provided business details are correct",
      ),
    };

    const passed = validate(rules);

    if (!passed) {
      setValidationMsg("Please correct the errors in the form before proceeding.");
      scrollToFirstError(rules, STEP5_FIELD_ORDER);

      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted fields before proceeding.",
        duration: 4000,
      });
      return;
    }

    const missingDocuments = getMissingDocumentLabels();

    if (missingDocuments.length > 0) {
      setStep(4);
      setValidationMsg("All four verification documents are required.");
      return;
    }

    if (!verificationToken) {
      setStep(2);
      setValidationMsg("Please verify your email again before submitting.");
      return;
    }

    if (isSubmitting) return;

    const payload = new FormData();

    const fields = {
      first_name: form.firstName.trim(),
      middle_initial: form.middleInitial.trim(),
      last_name: form.lastName.trim(),
      suffix: form.suffix === "N/A" ? "" : form.suffix,
      gender: form.gender,

      province: form.province,
      municipality: form.municipality,
      postal_code: form.postalCode,
      barangay: form.barangay,
      street_address: form.streetAddress.trim(),

      email: form.email.trim(),
      contact_number: form.contactNumber.trim(),
      username: form.username.trim(),
      password: form.password,
      confirm_password: form.confirmPassword,
      agree_terms: String(form.agreeTerms),

      verification_token: verificationToken,

      agree_documents_certify: String(agreeCertify),

      business_name: form.businessName.trim(),
      organization_name: form.organizationName.trim(),
      business_province: form.businessProvince.trim(),
      business_municipality: form.businessMunicipality.trim(),
      business_postal_code: form.businessPostalCode.trim(),
      business_barangay: form.businessBarangay.trim(),
      business_street_address: form.businessStreetAddress.trim(),
      official_email: form.officialEmail.trim(),
      official_contact_number: form.officialContactNumber.trim(),
      agree_business_certify: String(form.certifyBusinessInfo),
    };

    Object.entries(fields).forEach(([key, value]) => {
      payload.append(key, value);
    });

    payload.append(
      "government_issued_id",
      files.governmentIssuedId.file,
      files.governmentIssuedId.name,
    );
    payload.append(
      "business_permit",
      files.businessPermit.file,
      files.businessPermit.name,
    );
    payload.append(
      "business_registration",
      files.businessRegistration.file,
      files.businessRegistration.name,
    );
    payload.append(
      "warehouse_license",
      files.warehouseLicense.file,
      files.warehouseLicense.name,
    );

    setIsSubmitting(true);

    try {
      await request("/auth/warehouse-manager/register", {
        method: "POST",
        body: payload,
        throwOnError: true,
      });

      setValidationMsg("");
      setIsSuccess(true);

      showToast({
        type: "success",
        title: "Registration Submitted",
        message: "Your Warehouse Manager registration has been submitted for administrator review.",
        duration: 4500,
      });
    } catch (error) {
      const message = error.message || "Registration could not be submitted.";
      setValidationMsg(message);

      showToast({
        type: "error",
        title: "Registration Failed",
        message,
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDocumentUpload = (docId, label) => {
    const uploaded = files[docId];
    const inputId = `warehouse-document-${docId}`;

    return (
      <div
        className={`border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50 hover:bg-green-50/50 hover:border-green-400 transition-colors relative ${!uploaded ? "cursor-pointer" : ""}`}
        onClick={() => !uploaded && document.getElementById(inputId)?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleFileDrop(event, docId)}
      >
        <label className="absolute top-[-10px] left-4 bg-white px-2 text-xs font-semibold text-gray-600 z-10">
          {label} <span className="text-red-500">*</span>
        </label>

        {!uploaded ? (
          <>
            <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-4 text-[#08511f]">
              <Upload size={20} />
            </div>
            <span className="text-sm font-bold text-[#08511f] mb-2">
              Upload File
            </span>
            <p className="text-xs text-gray-500">
              JPG, JPEG, PNG, WEBP, PDF (Max 5MB)
            </p>
            <input
              id={inputId}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={(event) => handleFileChange(event, docId)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeFile(docId);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
            >
              <X size={16} />
            </button>

            <FileText size={32} className="text-[#08511f] mb-2" />
            <span
              className="text-sm font-semibold text-gray-800 truncate w-full px-2"
              title={uploaded.name}
            >
              {uploaded.name}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {uploaded.size}
            </span>
          </div>
        )}
      </div>
    );
  };

  // --- Sub-components for Stepper ---
  const renderStepper = () => {
    const steps = [
      "Account Information",
      "Account Verification",
      "Personal Information",
      "Document Verification",
      "Business Information",
    ];

    return (
      <div className="mt-8 mb-10 bg-[#f3f9f4] border border-green-50/50 rounded-2xl p-4 md:py-6 md:px-8 flex items-center justify-between relative overflow-hidden">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = step >= stepNumber;
          const isCompleted = step > stepNumber;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center z-10 flex-1 min-w-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${
                    isActive
                      ? "bg-[#08511f] text-white shadow-md"
                      : "bg-gray-300 text-white"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={18} strokeWidth={3} />
                  ) : (
                    stepNumber
                  )}
                </div>

                <span
                  className={`text-[10px] md:text-xs font-semibold mt-2 text-center ${
                    isActive ? "text-[#08511f]" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>

              {stepNumber < steps.length && (
                <div
                  className={`h-0.5 flex-1 mx-1 md:mx-3 relative top-[-10px] ${
                    step >= stepNumber + 1
                      ? "bg-[#08511f]"
                      : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="dark-readable-registration-form min-h-screen flex flex-col relative overflow-hidden">
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

      {/* Top Header */}
      <div className="relative z-10 w-full px-6 sm:px-10 pt-6 flex items-center justify-between">
        <CustomWhiteButton
          onClick={() => step === 1 ? navigate("/register") : setStep(step - 1)}
          className="!rounded-full w-auto !p-2 !px-5 shadow-sm"
          icon={
            <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
              <ArrowLeft size={16} />
              {step === 1 ? "Back to Role Selection" : "Previous Step"}
            </span>
          }
        />
        <span className="text-xs md:text-sm font-bold text-emerald-800 tracking-wider uppercase">
          {step === 1 && "Step 1 of 5: Account Information"}
          {step === 2 && "Step 2 of 5: Account Verification"}
          {step === 3 && "Step 3 of 5: Personal Information"}
          {step === 4 && "Step 4 of 5: Document Verification"}
          {step === 5 && "Step 5 of 5: Business Information"}
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
              Your warehouse manager registration is under review. We'll email you once it's approved.
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
              "Thank you for choosing GrainRise. We appreciate your interest in becoming one of our verified warehouse distribution partners."
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
                {step === 1 && "Create Your Warehouse Manager Account"}
                {step === 2 && "Verify Your Account"}
                {step === 3 && "Personal Information"}
                {step === 4 && "Document Verification"}
                {step === 5 && "Business Information"}
              </h1>
              <p className="text-gray-500 text-sm md:text-base mt-2 max-w-lg">
                {step === 1 && "Create your login credentials to begin your registration."}
                {step === 2 && "Enter the verification code sent to your registered email to continue your registration."}
                {step === 3 && "Provide your personal and home address information."}
                {step === 4 && "Upload all four required verification documents. GrainRise will use OCR to suggest your business information."}
                {step === 5 && "Provide the details of your warehouse operation."}
              </p>
            </div>

            {renderStepper()}

            {/* Toast notifications rendered at page level */}
            <Toast toasts={toasts} removeToast={removeToast} />

            {/* Google Verification Modal */}
            <GoogleVerificationModal
              isOpen={isGoogleModalOpen}
              onClose={() => setIsGoogleModalOpen(false)}
              onSuccess={handleGoogleVerifySuccess}
              initialEmail={form.email}
              roleName="Warehouse Manager"
              endpoint="/auth/warehouse-manager/google-verify"
            />

            {/* STEP 1 — ACCOUNT INFORMATION */}
            {step === 1 && (
              <form onSubmit={handleNextStep1} className="space-y-8 animate-fade-in">
                {/* Account Details */}
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
                          label={<>Username <span className="text-red-500">*</span></>}
                          placeholder="username"
                          value={form.username}
                          onChange={(e) => handleInputChange("username", e.target.value)}
                        />
                      </FieldWithError>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* ── Password Column ── */}
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

                        {/* Password Strength Bar + Requirements — inside the column, not a grid item */}
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

                <div className="pt-2 flex items-start gap-3" ref={setFieldRef("agreeTerms")}>
                  <input id="agreeTerms" type="checkbox" checked={form.agreeTerms} onChange={(e) => handleInputChange("agreeTerms", e.target.checked)} className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer mt-0.5" />
                  <label htmlFor="agreeTerms" className="text-sm font-medium text-gray-700 text-left cursor-pointer select-none leading-relaxed">
                    I agree to the{" "}
                    <span
                      className="text-[#08511f] font-semibold underline cursor-pointer"
                      onClick={(e) => { e.preventDefault(); setIsPrivacyModalOpen(true); }}
                    >
                      Privacy Policy
                    </span>{" "}
                    and{" "}
                    <span
                      className="text-[#08511f] font-semibold underline cursor-pointer"
                      onClick={(e) => { e.preventDefault(); setIsTermsModalOpen(true); }}
                    >
                      Terms of Service
                    </span>.
                  </label>
                </div>
                {errors.agreeTerms && <span className="text-xs text-red-500 block -mt-6">{errors.agreeTerms}</span>}

                
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
                    text={
                      <span className="flex items-center gap-2">
                        {isSendingOtp ? "Sending OTP..." : "Next Step"}
                        {!isSendingOtp && <ArrowRight size={18} />}
                      </span>
                    }
                    type="submit"
                    disabled={isSendingOtp}
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

                {errors.otp && (
                  <p className="text-xs text-red-500 -mt-2 mb-5 text-center">
                    {errors.otp}
                  </p>
                )}

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

                  <div className="mt-4 pt-4 border-t border-gray-100 w-full flex flex-col items-center">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Or prefer instant verification?</p>
                    <button
                      type="button"
                      onClick={() => setIsGoogleModalOpen(true)}
                      className="px-5 py-2 rounded-full border border-gray-300 hover:border-[#08511f] bg-white hover:bg-emerald-50 text-gray-700 font-semibold text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <GoogleIcon size={15} />
                      <span>Verify with Google instead</span>
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 max-w-sm text-center mt-4">
                    The new verification code will be sent to your registered email address.
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
                    text={verificationToken ? "Continue" : isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                    onClick={handleVerifyOtp}
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* STEP 3 — PERSONAL INFORMATION */}
            {step === 3 && (
              <form onSubmit={handleNextStep3} className="space-y-8 animate-fade-in">
                {/* Personal Information */}
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

                {/* Address Information */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Address Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div ref={setFieldRef("province")}>
                      <Dropdown label="Province *" placeholder={isAddressLoading && provinceOptions.length === 0 ? "Loading provinces..." : "Select Province"} options={provinceOptions} value={form.province} onChange={handleProvinceChange} error={errors.province} />
                    </div>
                    <div ref={setFieldRef("municipality")}>
                      <Dropdown label="Municipality *" placeholder={isAddressLoading && form.province && municipalityOptions.length === 0 ? "Loading cities/municipalities..." : "Select City/Municipality"} options={municipalityOptions} value={form.municipality} onChange={handleMunicipalityChange} error={errors.municipality} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div ref={setFieldRef("postalCode")}>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Postal Code <span className="text-gray-400 font-normal text-xs">(Auto Generated / Editable)</span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={form.postalCode}
                        onChange={(e) => handleInputChange("postalCode", e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border bg-white text-gray-700 outline-none focus:border-green-600 ${errors.postalCode ? "border-red-500" : "border-gray-200"}`}
                      />
                      {errors.postalCode && (
                        <span className="text-xs text-red-500 mt-1 block">
                          {errors.postalCode}
                        </span>
                      )}
                    </div>

                    <div ref={setFieldRef("barangay")}>
                      <Dropdown label="Barangay *" placeholder={isAddressLoading && form.municipality && barangayOptions.length === 0 ? "Loading barangays..." : "Select Barangay"} options={barangayOptions} value={form.barangay} onChange={(val) => handleInputChange("barangay", val)} error={errors.barangay} />
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

                
                <div className="pt-6 border-t border-gray-100 flex justify-between">
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
                    type="submit"
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </form>
            )}

            {/* STEP 4 — DOCUMENT VERIFICATION */}
            {step === 4 && (
              <div className="animate-fade-in flex flex-col text-left">
                <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-6 text-left">
                  Required Documents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {renderDocumentUpload(
                    "governmentIssuedId",
                    "Valid Government-Issued ID",
                  )}
                  {renderDocumentUpload(
                    "businessPermit",
                    "Mayor's / Business Permit",
                  )}
                  {renderDocumentUpload(
                    "businessRegistration",
                    "DTI / SEC / CDA Registration",
                  )}
                  {renderDocumentUpload(
                    "warehouseLicense",
                    "BPI License to Operate / Warehouse License",
                  )}
                </div>

                {errors.files && (
                  <p className="text-xs text-red-500 -mt-5 mb-6">
                    {errors.files}
                  </p>
                )}

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

                {errors.certify && (
                  <p className="text-xs text-red-500 -mt-5 mb-6">
                    You must certify that the uploaded documents are true and accurate.
                  </p>
                )}

                <div className="w-full flex justify-between">
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
                    text={
                      <span className="flex items-center gap-2">
                        {isExtractingDocuments ? "Processing Documents..." : "Next Step"}
                        {!isExtractingDocuments && <ArrowRight size={18} />}
                      </span>
                    }
                    onClick={handleNextStep4}
                    className="!rounded-full !px-8 !py-3 shadow-lg"
                  />
                </div>
              </div>
            )}

            {/* STEP 5 — BUSINESS INFORMATION */}
            {step === 5 && (
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
                    <FieldWithError
                      error={errors.businessName}
                      fieldRef={setFieldRef("businessName")}
                    >
                      <CustomTextbox
                        label={<>Business Name <span className="text-red-500">*</span></>}
                        placeholder="Enter registered business or warehouse name"
                        value={form.businessName}
                        onChange={(e) => handleInputChange("businessName", e.target.value)}
                      />
                    </FieldWithError>

                    <FieldWithError error={errors.organizationName}>
                      <CustomTextbox
                        label={<>Organization Name <span className="text-gray-400 font-normal text-xs">(Optional)</span></>}
                        placeholder="Enter organization / registered entity name"
                        value={form.organizationName}
                        onChange={(e) => handleInputChange("organizationName", e.target.value)}
                      />
                    </FieldWithError>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div ref={setFieldRef("businessProvince")}>
                      <Dropdown
                        label="Province *"
                        placeholder={isBusinessAddressLoading && provinceOptions.length === 0 ? "Loading provinces..." : "Select Province"}
                        options={provinceOptions}
                        value={form.businessProvince}
                        onChange={handleBusinessProvinceChange}
                        error={errors.businessProvince}
                      />
                    </div>

                    <div ref={setFieldRef("businessMunicipality")}>
                      <Dropdown
                        label="Municipality / City *"
                        placeholder={
                          isBusinessAddressLoading
                          && form.businessProvince
                          && businessMunicipalityOptions.length === 0
                            ? "Loading cities/municipalities..."
                            : "Select City/Municipality"
                        }
                        options={businessMunicipalityOptions}
                        value={form.businessMunicipality}
                        onChange={handleBusinessMunicipalityChange}
                        error={errors.businessMunicipality}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div ref={setFieldRef("businessPostalCode")}>
                      <label className="block mb-2 text-sm font-medium text-gray-700 text-left">
                        Postal Code{" "}
                        <span className="text-gray-400 font-normal text-xs">
                          {isBusinessPostalCodeEditable ? "(Enter Manually)" : "(Auto Generated)"}
                        </span>
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        disabled={!isBusinessPostalCodeEditable}
                        value={form.businessPostalCode}
                        onChange={(e) => handleInputChange("businessPostalCode", e.target.value)}
                        placeholder={isBusinessPostalCodeEditable ? "Enter 4-digit postal code" : ""}
                        className={`w-full px-4 py-3 rounded-xl outline-none ${
                          isBusinessPostalCodeEditable
                            ? "bg-white text-gray-700 border border-gray-200 focus:border-green-600"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        } ${errors.businessPostalCode ? "border border-red-500" : ""}`}
                      />
                      {isBusinessPostalCodeEditable && !errors.businessPostalCode && (
                        <span className="text-[11px] text-gray-400 mt-1 block">
                          Postal code could not be fetched automatically. Please enter the correct code.
                        </span>
                      )}
                      {errors.businessPostalCode && (
                        <span className="text-xs text-red-500 mt-1 block">
                          {errors.businessPostalCode}
                        </span>
                      )}
                    </div>

                    <div ref={setFieldRef("businessBarangay")}>
                      {isBusinessBarangayEditable ? (
                        <FieldWithError error={errors.businessBarangay}>
                          <CustomTextbox
                            label={<>Barangay <span className="text-red-500">*</span> <span className="text-gray-400 font-normal text-xs">(Enter Manually)</span></>}
                            placeholder="Enter barangay"
                            value={form.businessBarangay}
                            onChange={(e) => handleInputChange("businessBarangay", e.target.value)}
                          />
                        </FieldWithError>
                      ) : (
                        <Dropdown
                          label="Barangay *"
                          placeholder={
                            isBusinessAddressLoading
                            && form.businessMunicipality
                            && businessBarangayOptions.length === 0
                              ? "Loading barangays..."
                              : "Select Barangay"
                          }
                          options={businessBarangayOptions}
                          value={form.businessBarangay}
                          onChange={(val) => handleInputChange("businessBarangay", val)}
                          error={errors.businessBarangay}
                        />
                      )}

                      {isBusinessBarangayEditable && (
                        <span className="text-[11px] text-gray-400 mt-1 block">
                          Barangay list could not be fetched automatically. Please enter the correct barangay.
                        </span>
                      )}
                    </div>

                    <FieldWithError
                      error={errors.businessStreetAddress}
                      fieldRef={setFieldRef("businessStreetAddress")}
                    >
                      <CustomTextbox
                        label={<>Street Address <span className="text-red-500">*</span></>}
                        placeholder="Unit/Bldg, Street Name"
                        value={form.businessStreetAddress}
                        onChange={(e) => handleInputChange("businessStreetAddress", e.target.value)}
                      />
                    </FieldWithError>
                  </div>
                </div>

                {/* Official Contact Information Section */}
                <div>
                  <h3 className="text-[#08511f] font-bold text-[15px] tracking-wider uppercase border-b border-gray-100 pb-2 mb-5 text-left">
                    Official Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWithError error={errors.officialEmail} fieldRef={setFieldRef("officialEmail")}>
                      <CustomTextbox
                        label={<>Official Email Address <span className="text-red-500">*</span></>}
                        placeholder="company@gmail.com"
                        type="email"
                        value={form.officialEmail}
                        onChange={(e) => handleInputChange("officialEmail", e.target.value)}
                      />
                    </FieldWithError>

                    <FieldWithError error={errors.officialContactNumber} fieldRef={setFieldRef("officialContactNumber")}>
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
                      onChange={(e) => {
                        handleInputChange("certifyBusinessInfo", e.target.checked);
                        if (e.target.checked) {
                          setErrors((prev) => ({ ...prev, certifyBusinessInfo: "" }));
                        }
                      }}
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

                {/* Step 5 Navigation buttons */}
                <div className="pt-6 border-t border-gray-100 flex justify-between">
                  <CustomWhiteButton
                    onClick={() => setStep(4)}
                    className="!rounded-full w-auto !p-2 !px-6"
                    icon={
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <ArrowLeft size={16} /> Previous
                      </span>
                    }
                  />
                  <CustomGreenButton
                    text={isSubmitting ? "Submitting..." : "Submit Registration"}
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

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
      />
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
      />
    </div>
  );
};

export default WarehouseManagerRegister;