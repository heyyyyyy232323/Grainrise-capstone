import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  KeyRound,
  User,
  MapPin,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  FileCheck,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  Plus,
  Trash2,
  Sprout,
  ExternalLink,
} from "lucide-react";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import useApi from "../Components/hooks/useApi";
import useAuth from "../Components/hooks/useAuth";
import usePhilippineAddress from "../Components/hooks/usePhilippineAddress";
import Dropdown from "../Components/Minor-Components/Dropdown";

const LAND_OWNERSHIP_OPTIONS = [
  "Owned",
  "Rented/Leased",
  "Tenant",
  "Other",
];

const RICE_VARIETY_OPTIONS = [
  "Dinorado",
  "Sinandomeng",
  "Jasmine Rice",
  "Malagkit",
  "Other",
];

const CROPPING_CYCLES_OPTIONS = [
  "1",
  "2",
  "3",
  "4",
];

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const SUFFIX_OPTIONS = [
  { value: "", label: "None" },
  { value: "Jr.", label: "Jr." },
  { value: "Sr.", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
  { value: "V", label: "V" },
  { value: "VI", label: "VI" },
];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const parsePhoneNumber = (num) => {
  if (!num) return "";
  let clean = String(num).replace(/\D/g, "");
  if (clean.startsWith("63") && clean.length === 12) clean = clean.slice(2);
  if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
  if (clean.length > 10) clean = clean.slice(0, 10);
  return clean;
};

const formatPhoneForBackend = (num) => {
  if (!num) return "";
  let clean = String(num).replace(/\D/g, "");
  if (clean.startsWith("63") && clean.length === 12) clean = clean.slice(2);
  if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
  if (clean.length === 10 && clean.startsWith("9")) {
    return "0" + clean;
  }
  return clean;
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const { user, login } = useAuth();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Account Security state
  const [mustChangePassword, setMustChangePassword] = useState(
    Boolean(user?.must_change_password)
  );
  const [hasSecurityStep, setHasSecurityStep] = useState(
    Boolean(user?.must_change_password)
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Stepper state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Touch tracking for real-time validation error display
  const [touched, setTouched] = useState({});

  // Personal Info State
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [gender, setGender] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Personal Info input restriction & formatting handlers
  const handleNameKeyDown = (e) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Block numbers and special characters. Letters and spaces only.
    if (!/^[A-Za-zÑñ\s]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleFirstNameChange = (e) => {
    const clean = e.target.value.replace(/[^A-Za-zÑñ\s]/g, "").slice(0, 50);
    setFirstName(clean);
    markTouched("firstName");
  };

  const handleFirstNamePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain");
    const clean = pasted.replace(/[^A-Za-zÑñ\s]/g, "");
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nextVal = (firstName.slice(0, start) + clean + firstName.slice(end)).slice(0, 50);
    setFirstName(nextVal);
    markTouched("firstName");
  };

  const handleMiddleInitialKeyDown = (e) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (!/^[A-Za-zÑñ]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleMiddleInitialChange = (e) => {
    const clean = e.target.value.replace(/[^A-Za-zÑñ]/g, "").toUpperCase().slice(0, 2);
    setMiddleInitial(clean);
    markTouched("middleInitial");
  };

  const handleMiddleInitialPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain");
    const clean = pasted.replace(/[^A-Za-zÑñ]/g, "").toUpperCase().slice(0, 2);
    setMiddleInitial(clean);
    markTouched("middleInitial");
  };

  const handleLastNameChange = (e) => {
    const clean = e.target.value.replace(/[^A-Za-zÑñ\s]/g, "").slice(0, 50);
    setLastName(clean);
    markTouched("lastName");
  };

  const handleLastNamePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain");
    const clean = pasted.replace(/[^A-Za-zÑñ\s]/g, "");
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nextVal = (lastName.slice(0, start) + clean + lastName.slice(end)).slice(0, 50);
    setLastName(nextVal);
    markTouched("lastName");
  };

  const handlePhoneKeyDown = (e) => {
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Tab" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Home" ||
      e.key === "End" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    // Block non-digits
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }
    // First digit must be 9
    const input = e.target;
    if (input.selectionStart === 0 && e.key !== "9") {
      e.preventDefault();
    }
  };

  const handlePhoneChange = (e) => {
    let digits = e.target.value.replace(/\D/g, "");
    while (digits.length > 0 && digits[0] !== "9") {
      digits = digits.slice(1);
    }
    digits = digits.slice(0, 10);
    setContactNumber(digits);
    markTouched("contactNumber");
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    let pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "");
    if (pasted.startsWith("63")) pasted = pasted.slice(2);
    if (pasted.startsWith("0")) pasted = pasted.slice(1);
    while (pasted.length > 0 && pasted[0] !== "9") {
      pasted = pasted.slice(1);
    }
    pasted = pasted.slice(0, 10);
    setContactNumber(pasted);
    markTouched("contactNumber");
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === " ") {
      e.preventDefault();
    }
  };

  const handleEmailChange = (e) => {
    const clean = e.target.value.replace(/\s/g, "").slice(0, 100);
    setPersonalEmail(clean);
    markTouched("personalEmail");
  };

  const handleEmailPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\s/g, "").slice(0, 100);
    const input = e.target;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const nextVal = (personalEmail.slice(0, start) + pasted + personalEmail.slice(end)).slice(0, 100);
    setPersonalEmail(nextVal);
    markTouched("personalEmail");
  };

  // Company Address State (autofetched PSGC address with manual fallback)
  const address = usePhilippineAddress();
  const [manualAddress, setManualAddress] = useState(false);
  const [manualProvince, setManualProvince] = useState("");
  const [manualMunicipality, setManualMunicipality] = useState("");
  const [manualBarangay, setManualBarangay] = useState("");
  const [manualPostalCode, setManualPostalCode] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressSeed, setAddressSeed] = useState(null);

  const province = manualAddress ? manualProvince : address.province;
  const municipality = manualAddress ? manualMunicipality : address.municipality;
  const barangay = manualAddress ? manualBarangay : address.barangay;
  const postalCode = manualAddress ? manualPostalCode : address.postalCode;

  // Business Details State
  const [businessName, setBusinessName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialContact, setOfficialContact] = useState("");

  // Documents State
  const [existingDocs, setExistingDocs] = useState({});
  const [govIdFile, setGovIdFile] = useState(null);
  const [bizPermitFile, setBizPermitFile] = useState(null);
  const [bizRegFile, setBizRegFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [validIdFile, setValidIdFile] = useState(null);
  const [brgyPermitFile, setBrgyPermitFile] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({});

  const role = user?.role || "";
  const isMiller = role === "miller_manager" || role === "supplier";
  const isWarehouse = role === "warehouse_manager";
  const isRetailer = role === "retailer";
  const isFarmer = role === "farmer";

  const roleTitle = isFarmer
    ? "Farmer"
    : isMiller
    ? "Miller / Supplier"
    : isWarehouse
      ? "Warehouse Manager"
      : isRetailer
        ? "Retailer"
        : "Partner";

  const roleRoutes = {
    retailer: "/retailer/point-of-sale",
    warehouse_manager: "/warehouse-manager/dashboard",
    miller_manager: "/miller-manager/dashboard",
    farmer: "/farmer/dashboard",
  };

  // Farm Lots State for Farmer
  const createEmptyLot = (id = 1) => ({
    id: id || Date.now(),
    farm_profile_id: null,
    farm_lot_name: "",
    street_address: "",
    province: "",
    municipality: "",
    postal_code: "",
    manual_address: false,
    municipalitiesList: [],
    loadingMunicipalities: false,
    total_farm_area_hectares: "",
    land_ownership_status: "",
    rice_variety_currently_planted: "",
    cropping_cycles_per_year: "",
    rsbsa_number: "",
    rsbsa_id_document_file: null,
    rsbsa_id_document_path: "",
    rsbsa_id_document_url: "",
  });

  const [farmLots, setFarmLots] = useState([createEmptyLot(1)]);
  const [reusableRsbsaDoc, setReusableRsbsaDoc] = useState(null);
  const [farmLotTouched, setFarmLotTouched] = useState({});

  const markFarmLotTouched = (idx, field) => {
    setFarmLotTouched((prev) => ({ ...prev, [`${idx}_${field}`]: true }));
  };

  // Build steps list conditionally
  const steps = useMemo(() => {
    const list = [];
    if (hasSecurityStep) {
      list.push({
        key: "security",
        title: "Account Security",
        shortTitle: "Password",
        icon: KeyRound,
      });
    }
    list.push(
      {
        key: "personal",
        title: "Personal Information",
        shortTitle: "Personal",
        icon: User,
      },
      {
        key: "address",
        title: isFarmer ? "Residential Address" : "Company Address",
        shortTitle: "Address",
        icon: MapPin,
      }
    );
    if (isFarmer) {
      list.push({
        key: "farm",
        title: "Farm Information",
        shortTitle: "Farm Lots",
        icon: Sprout,
      });
    } else {
      list.push(
        {
          key: "business",
          title: isWarehouse
            ? "Warehouse Facility Details"
            : isMiller
            ? "Milling Facility Details"
            : "Business Details",
          shortTitle: "Business",
          icon: Building2,
        },
        {
          key: "documents",
          title: "Verification Documents",
          shortTitle: "Documents",
          icon: FileText,
        }
      );
    }
    return list;
  }, [hasSecurityStep, isWarehouse, isMiller, isFarmer]);

  const currentStep = steps[currentStepIndex] || steps[0];
  const totalSteps = steps.length;

  const markTouched = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Password rules validation
  const pwCriteria = useMemo(() => {
    const hasMinLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
    const allPassed = hasMinLength && hasUpper && hasLower && hasNumber && matches;
    return { hasMinLength, hasUpper, hasLower, hasNumber, matches, allPassed };
  }, [newPassword, confirmPassword]);

  // Real-time Validation Errors for profile fields
  const validationErrors = useMemo(() => {
    const errors = {};

    // Password step errors
    if (currentStep?.key === "security") {
      if (passwordSaved && !newPassword && !confirmPassword) {
        // Password already established; fields left empty
      } else {
        if (!newPassword) {
          errors.newPassword = "New password is required.";
        } else if (!pwCriteria.hasMinLength) {
          errors.newPassword = "Password must be at least 8 characters.";
        } else if (!pwCriteria.hasUpper || !pwCriteria.hasLower || !pwCriteria.hasNumber) {
          errors.newPassword = "Password must include uppercase, lowercase, and a number.";
        }
        if (!confirmPassword) {
          errors.confirmPassword = "Confirm password is required.";
        } else if (!pwCriteria.matches) {
          errors.confirmPassword = "Passwords do not match.";
        }
      }
    }

    // Personal step
    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      errors.firstName = "First name is required.";
    } else if (trimmedFirst.length < 2) {
      errors.firstName = "First name must be at least 2 characters.";
    } else if (trimmedFirst.length > 50) {
      errors.firstName = "First name must not exceed 50 characters.";
    } else if (!/^[A-Za-zÑñ\s]+$/.test(trimmedFirst)) {
      errors.firstName = "First name may only contain letters.";
    }

    if (middleInitial.trim()) {
      if (!/^[A-Za-zÑñ]{1,2}$/.test(middleInitial.trim())) {
        errors.middleInitial = "Middle initial must be 1-2 letters.";
      }
    }

    const trimmedLast = lastName.trim();
    if (!trimmedLast) {
      errors.lastName = "Last name is required.";
    } else if (trimmedLast.length < 2) {
      errors.lastName = "Last name must be at least 2 characters.";
    } else if (trimmedLast.length > 50) {
      errors.lastName = "Last name must not exceed 50 characters.";
    } else if (!/^[A-Za-zÑñ\s]+$/.test(trimmedLast)) {
      errors.lastName = "Last name may only contain letters.";
    }

    if (!gender) {
      errors.gender = "Please select your gender.";
    }

    const trimmedPersonalEmail = personalEmail.trim();
    if (!trimmedPersonalEmail) {
      if (!isFarmer) {
        errors.personalEmail = "Email address is required.";
      }
    } else if (trimmedPersonalEmail.length > 100) {
      errors.personalEmail = "Email must not exceed 100 characters.";
    } else if (!trimmedPersonalEmail.includes("@")) {
      errors.personalEmail = "Email must include '@' (e.g. name@domain.com).";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPersonalEmail)) {
      errors.personalEmail = "Please enter a valid email address (e.g. name@domain.com).";
    }

    const cleanContact = contactNumber.replace(/\D/g, "");
    if (!cleanContact) {
      errors.contactNumber = "Contact number is required.";
    } else if (!cleanContact.startsWith("9")) {
      errors.contactNumber = "Mobile number must start with 9.";
    } else if (cleanContact.length < 10) {
      errors.contactNumber = `${10 - cleanContact.length} more digit${10 - cleanContact.length !== 1 ? "s" : ""} needed (10 digits required).`;
    } else if (cleanContact.length > 10) {
      errors.contactNumber = "Contact number must be exactly 10 digits.";
    }

    // Company Address
    if (!province.trim()) errors.province = "Province is required.";
    if (!municipality.trim()) errors.municipality = "Municipality or City is required.";
    if (!barangay.trim()) errors.barangay = "Barangay is required.";
    if (!streetAddress.trim()) errors.streetAddress = "Street address is required.";
    const trimmedPostal = postalCode.trim();
    if (!trimmedPostal) {
      errors.postalCode = "Postal code is required.";
    } else if (!/^\d{4}$/.test(trimmedPostal)) {
      errors.postalCode = "Postal code must be exactly 4 digits.";
    }

    // Business Details
    if ((isMiller || isWarehouse) && !businessName.trim()) {
      errors.businessName = "Business name is required.";
    }
    if (officialEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail.trim())) {
      errors.officialEmail = "Please enter a valid email address.";
    }
    if (officialContact.trim()) {
      const cleanBizContact = officialContact.trim().replace(/[\s\-]/g, "");
      if (!/^(09|\+639|02|\+632)\d{7,9}$/.test(cleanBizContact)) {
        errors.officialContact = "Invalid contact number format.";
      }
    }

    return errors;
  }, [
    currentStep,
    newPassword,
    confirmPassword,
    pwCriteria,
    firstName,
    middleInitial,
    lastName,
    gender,
    personalEmail,
    contactNumber,
    province,
    municipality,
    barangay,
    streetAddress,
    postalCode,
    businessName,
    officialEmail,
    officialContact,
    isMiller,
    isWarehouse,
    isFarmer,
  ]);

  // Real-time Validation Errors for farm lots
  const farmLotErrors = useMemo(() => {
    if (!isFarmer) return [];
    return farmLots.map((lot) => {
      const errs = {};
      if (!lot.province?.trim()) {
        errs.province = "Province is required.";
      }
      if (!lot.municipality?.trim()) {
        errs.municipality = "Municipality or City is required.";
      }
      const cleanPostal = String(lot.postal_code || "").trim();
      if (!cleanPostal) {
        errs.postal_code = "Postal code is required.";
      } else if (!/^\d{4}$/.test(cleanPostal)) {
        errs.postal_code = "Postal code must be exactly 4 digits.";
      }

      if (
        lot.total_farm_area_hectares !== "" &&
        lot.total_farm_area_hectares !== null &&
        lot.total_farm_area_hectares !== undefined
      ) {
        const areaStr = String(lot.total_farm_area_hectares).trim();
        if (areaStr) {
          const num = Number(areaStr);
          if (isNaN(num) || num <= 0) {
            errs.total_farm_area_hectares = "Total farm area must be a positive number.";
          }
        }
      }

      if (
        lot.cropping_cycles_per_year !== "" &&
        lot.cropping_cycles_per_year !== null &&
        lot.cropping_cycles_per_year !== undefined
      ) {
        const cycleStr = String(lot.cropping_cycles_per_year).trim();
        if (cycleStr) {
          const cycles = Number(cycleStr);
          if (isNaN(cycles) || cycles < 1 || cycles > 255 || !Number.isInteger(cycles)) {
            errs.cropping_cycles_per_year = "Cropping cycles must be a whole number (1 or more).";
          }
        }
      }

      return errs;
    });
  }, [isFarmer, farmLots]);

  const isCurrentStepValid = useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.key === "security") {
      if (passwordSaved && !newPassword && !confirmPassword) {
        return true;
      }
      return pwCriteria.allPassed;
    }
    if (currentStep.key === "personal") {
      return (
        !validationErrors.firstName &&
        !validationErrors.lastName &&
        !validationErrors.gender &&
        !validationErrors.personalEmail &&
        !validationErrors.contactNumber &&
        !validationErrors.middleInitial
      );
    }
    if (currentStep.key === "address") {
      return (
        !validationErrors.province &&
        !validationErrors.municipality &&
        !validationErrors.barangay &&
        !validationErrors.streetAddress &&
        !validationErrors.postalCode
      );
    }
    if (currentStep.key === "farm") {
      return (
        farmLots.length > 0 &&
        farmLotErrors.every((errs) => Object.keys(errs).length === 0)
      );
    }
    if (currentStep.key === "business") {
      return (
        !validationErrors.businessName &&
        !validationErrors.officialEmail &&
        !validationErrors.officialContact
      );
    }
    if (currentStep.key === "documents") {
      return true;
    }
    return true;
  }, [
    currentStep,
    pwCriteria,
    validationErrors,
    passwordSaved,
    newPassword,
    confirmPassword,
    farmLots,
    farmLotErrors,
  ]);

  // Load initial profile data from backend
  useEffect(() => {
    let isMounted = true;
    const loadProfileStatus = async () => {
      try {
        const response = await request("/auth/profile-status", {
          method: "GET",
          throwOnError: true,
        });

        if (!isMounted) return;

        const u = response.user || {};
        const p = response.profile || {};
        const d = response.documents || {};

        if (u.must_change_password !== undefined) {
          const mustChange = Boolean(u.must_change_password);
          setMustChangePassword(mustChange);
          if (mustChange) {
            setHasSecurityStep(true);
          }
        }

        setFirstName(u.first_name || "");
        setMiddleInitial(u.middle_initial || "");
        setLastName(u.last_name || "");
        setSuffix(u.suffix || "");
        setGender(u.gender || "");
        const rawEmail = u.email || user?.email || "";
        const cleanEmail = rawEmail.endsWith("@grainrise.local") ? "" : rawEmail;
        setPersonalEmail(cleanEmail);
        setContactNumber(parsePhoneNumber(u.contact_number || ""));

        // Company Address fields
        const addrProv = p.province || u.province || "";
        const addrMuni = p.municipality || u.municipality || "";
        const addrBrgy = p.barangay || u.barangay || "";
        const addrStreet = p.street_address || u.street_address || "";
        const addrPostal = p.postal_code || u.postal_code || "";

        setStreetAddress(addrStreet);
        if (addrProv) {
          setAddressSeed({
            province: addrProv,
            municipality: addrMuni,
            barangay: addrBrgy,
            postalCode: addrPostal,
          });
        }

        if (p) {
          setBusinessName(p.business_name || "");
          setOrganizationName(p.organization_name || "");
          setOfficialEmail(p.official_email || u.email || "");
          setOfficialContact(p.official_contact_number || u.contact_number || "");
        }

        if (d) {
          setExistingDocs(d);
        }

        if (response.reusable_documents) {
          setReusableRsbsaDoc(response.reusable_documents);
        }

        if (Array.isArray(response.farms) && response.farms.length > 0) {
          const loadedLots = response.farms.map((f, i) => ({
            ...createEmptyLot(i + 1),
            farm_profile_id: f.farm_profile_id,
            farm_lot_name: f.farm_lot_name || "",
            street_address: f.street_address || "",
            province: f.province || "",
            municipality: f.municipality || "",
            postal_code: f.postal_code || "",
            manual_address: true,
            total_farm_area_hectares: f.total_farm_area_hectares || "",
            land_ownership_status: f.land_ownership_status || "",
            rice_variety_currently_planted: f.rice_variety_currently_planted || "",
            cropping_cycles_per_year: f.cropping_cycles_per_year || "",
            rsbsa_number: f.rsbsa_number || "",
            rsbsa_id_document_path: f.rsbsa_id_document || "",
            rsbsa_id_document_url: f.rsbsa_id_document_url || "",
          }));
          setFarmLots(loadedLots);
        } else if (response.reusable_documents?.rsbsa_document) {
          setFarmLots([
            {
              ...createEmptyLot(1),
              rsbsa_id_document_path: response.reusable_documents.rsbsa_document,
              rsbsa_id_document_url: response.reusable_documents.rsbsa_document_url || "",
            },
          ]);
        }

        // Restore draft from localStorage if available
        try {
          const draftRaw = localStorage.getItem("grainrise_profile_draft");
          if (draftRaw) {
            const draft = JSON.parse(draftRaw);
            if (draft.firstName !== undefined) setFirstName(draft.firstName);
            if (draft.middleInitial !== undefined) setMiddleInitial(draft.middleInitial);
            if (draft.lastName !== undefined) setLastName(draft.lastName);
            if (draft.suffix !== undefined) setSuffix(draft.suffix);
            if (draft.gender !== undefined) setGender(draft.gender);
            if (draft.personalEmail !== undefined) setPersonalEmail(draft.personalEmail);
            if (draft.contactNumber !== undefined) setContactNumber(parsePhoneNumber(draft.contactNumber));
            if (draft.streetAddress !== undefined) setStreetAddress(draft.streetAddress);
            if (draft.province) {
              setAddressSeed((prev) => ({
                province: draft.province,
                municipality: draft.municipality || prev?.municipality || "",
                barangay: draft.barangay || prev?.barangay || "",
                postalCode: draft.postalCode || prev?.postalCode || "",
              }));
            }
            if (draft.businessName !== undefined) setBusinessName(draft.businessName);
            if (draft.organizationName !== undefined) setOrganizationName(draft.organizationName);
            if (draft.officialEmail !== undefined) setOfficialEmail(draft.officialEmail);
            if (draft.officialContact !== undefined) setOfficialContact(draft.officialContact);

            if (Array.isArray(draft.farmLots) && draft.farmLots.length > 0) {
              setFarmLots(
                draft.farmLots.map((dlot, di) => ({
                  ...createEmptyLot(di + 1),
                  ...dlot,
                  rsbsa_id_document_file: null,
                }))
              );
            }
          }
        } catch (e) { }
      } catch (err) {
        console.error("Failed to load profile status:", err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };

    loadProfileStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  // Address Seed Hydration: Province
  useEffect(() => {
    if (!addressSeed?.province || address.province) return;
    if (address.provinceOptions.length === 0 && address.loading.provinces) return;

    if (address.provinceOptions.includes(addressSeed.province)) {
      address.selectProvince(addressSeed.province);
    } else if (address.provinceOptions.length > 0 && !address.loading.provinces) {
      setManualAddress(true);
      setManualProvince(addressSeed.province);
      setManualMunicipality(addressSeed.municipality || "");
      setManualBarangay(addressSeed.barangay || "");
      setManualPostalCode(addressSeed.postalCode || "");
    }
  }, [addressSeed, address.province, address.provinceOptions, address.loading.provinces]);

  // Address Seed Hydration: Municipality
  useEffect(() => {
    if (manualAddress || !addressSeed?.municipality || !address.province || address.municipality) return;
    if (address.municipalityOptions.length === 0 && address.loading.municipalities) return;

    if (address.municipalityOptions.includes(addressSeed.municipality)) {
      address.selectMunicipality(addressSeed.municipality);
    }
  }, [manualAddress, addressSeed, address.province, address.municipality, address.municipalityOptions, address.loading.municipalities]);

  // Address Seed Hydration: Barangay & Postal Code
  useEffect(() => {
    if (manualAddress || !addressSeed?.barangay || !address.municipality || address.barangay) return;
    if (address.barangayOptions.length === 0 && address.loading.barangays) return;

    if (address.barangayOptions.includes(addressSeed.barangay)) {
      address.selectBarangay(addressSeed.barangay);
      if (addressSeed.postalCode) {
        address.updatePostalCode(addressSeed.postalCode);
      }
    }
  }, [manualAddress, addressSeed, address.municipality, address.barangay, address.barangayOptions, address.loading.barangays]);

  // Handlers for Address Fields
  const handleProvinceChange = async (val) => {
    markTouched("province");
    await address.selectProvince(val);
  };

  const handleMunicipalityChange = async (val) => {
    markTouched("municipality");
    await address.selectMunicipality(val);
  };

  const handleBarangayChange = (val) => {
    markTouched("barangay");
    address.selectBarangay(val);
  };

  const handlePostalCodeChange = (e) => {
    markTouched("postalCode");
    const val = String(e.target.value || "").replace(/\D/g, "").slice(0, 4);
    if (manualAddress) {
      setManualPostalCode(val);
    } else {
      address.updatePostalCode(val);
    }
  };

  const toggleManualAddress = () => {
    if (!manualAddress) {
      setManualProvince(address.province);
      setManualMunicipality(address.municipality);
      setManualBarangay(address.barangay);
      setManualPostalCode(address.postalCode);
      setManualAddress(true);
    } else {
      setManualAddress(false);
    }
  };

  // Farm Lot Handlers for Farmer
  const handleAddFarmLot = () => {
    setFarmLots((prev) => [
      ...prev,
      {
        ...createEmptyLot(Date.now()),
        rsbsa_id_document_path: reusableRsbsaDoc?.rsbsa_document || "",
        rsbsa_id_document_url: reusableRsbsaDoc?.rsbsa_document_url || "",
      },
    ]);
  };

  const handleRemoveFarmLot = (idxToRemove) => {
    if (farmLots.length <= 1) return;
    setFarmLots((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const updateFarmLot = (idx, field, value) => {
    setFarmLots((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const handleFarmProvinceChange = async (lotIndex, provinceName) => {
    markFarmLotTouched(lotIndex, "province");
    setFarmLots((prev) => {
      const updated = [...prev];
      if (updated[lotIndex]) {
        updated[lotIndex] = {
          ...updated[lotIndex],
          province: provinceName,
          municipality: "",
          postal_code: "",
          municipalitiesList: [],
          loadingMunicipalities: Boolean(provinceName),
        };
      }
      return updated;
    });

    if (!provinceName) return;

    const provObj = (address.provinces || []).find((p) => p.name === provinceName);
    if (!provObj?.code) {
      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = { ...updated[lotIndex], loadingMunicipalities: false };
        }
        return updated;
      });
      return;
    }

    try {
      const response = await request(
        `/locations/provinces/${encodeURIComponent(provObj.code)}/cities-municipalities`,
        { method: "GET" }
      );
      const results = Array.isArray(response?.results) ? response.results : [];
      results.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = {
            ...updated[lotIndex],
            municipalitiesList: results,
            loadingMunicipalities: false,
          };
        }
        return updated;
      });
    } catch (err) {
      console.error("Failed to load cities for farm lot:", err);
      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = {
            ...updated[lotIndex],
            municipalitiesList: [],
            loadingMunicipalities: false,
          };
        }
        return updated;
      });
    }
  };

  const handleFarmMunicipalityChange = async (lotIndex, muniName) => {
    markFarmLotTouched(lotIndex, "municipality");
    let lotMuniObj = null;

    setFarmLots((prev) => {
      const updated = [...prev];
      const lot = updated[lotIndex];
      if (lot) {
        lotMuniObj = (lot.municipalitiesList || []).find((m) => (m.name || m) === muniName);
        const zip = lotMuniObj?.zip_code ? String(lotMuniObj.zip_code) : "";
        updated[lotIndex] = {
          ...lot,
          municipality: muniName,
          postal_code: zip || lot.postal_code || "",
        };
      }
      return updated;
    });

    if (lotMuniObj?.code && !lotMuniObj?.zip_code) {
      try {
        const response = await request(
          `/locations/cities-municipalities/${encodeURIComponent(lotMuniObj.code)}`,
          { method: "GET" }
        );
        if (response?.postal_code) {
          setFarmLots((prev) => {
            const updated = [...prev];
            if (updated[lotIndex]) {
              updated[lotIndex] = {
                ...updated[lotIndex],
                postal_code: String(response.postal_code),
              };
            }
            return updated;
          });
        }
      } catch (err) {
        console.warn("Could not auto-fetch postal code for lot:", err);
      }
    }
  };

  const toggleFarmLotManualAddress = async (lotIndex) => {
    const lot = farmLots[lotIndex];
    if (!lot) return;

    const willBeManual = !lot.manual_address;
    setFarmLots((prev) => {
      const updated = [...prev];
      if (updated[lotIndex]) {
        updated[lotIndex] = {
          ...updated[lotIndex],
          manual_address: willBeManual,
        };
      }
      return updated;
    });

    if (!willBeManual && lot.province && (!lot.municipalitiesList || lot.municipalitiesList.length === 0)) {
      const provObj = (address.provinces || []).find((p) => p.name === lot.province);
      if (provObj?.code) {
        try {
          const response = await request(
            `/locations/provinces/${encodeURIComponent(provObj.code)}/cities-municipalities`,
            { method: "GET" }
          );
          const results = Array.isArray(response?.results) ? response.results : [];
          results.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
          setFarmLots((prev) => {
            const updated = [...prev];
            if (updated[lotIndex]) {
              updated[lotIndex] = {
                ...updated[lotIndex],
                municipalitiesList: results,
              };
            }
            return updated;
          });
        } catch (e) {}
      }
    }
  };

  const handleFarmLotFileChange = (lotIndex, file) => {
    if (!file) {
      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = {
            ...updated[lotIndex],
            rsbsa_id_document_file: null,
            fileError: null,
          };
        }
        return updated;
      });
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = {
            ...updated[lotIndex],
            fileError: "Unsupported file format. Please upload JPG, PNG, WEBP, or PDF.",
          };
        }
        return updated;
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFarmLots((prev) => {
        const updated = [...prev];
        if (updated[lotIndex]) {
          updated[lotIndex] = {
            ...updated[lotIndex],
            fileError: "File size exceeds 10MB limit.",
          };
        }
        return updated;
      });
      return;
    }

    setFarmLots((prev) => {
      const updated = [...prev];
      if (updated[lotIndex]) {
        updated[lotIndex] = {
          ...updated[lotIndex],
          rsbsa_id_document_file: file,
          fileError: null,
        };
      }
      return updated;
    });
  };

  const handleUseReusableDocForLot = (lotIndex) => {
    if (!reusableRsbsaDoc?.rsbsa_document) return;
    setFarmLots((prev) => {
      const updated = [...prev];
      if (updated[lotIndex]) {
        updated[lotIndex] = {
          ...updated[lotIndex],
          rsbsa_id_document_path: reusableRsbsaDoc.rsbsa_document,
          rsbsa_id_document_url: reusableRsbsaDoc.rsbsa_document_url || "",
          rsbsa_id_document_file: null,
          fileError: null,
        };
      }
      return updated;
    });
  };

  // Save current step data to localStorage draft and background partial save to backend
  const persistStepData = async () => {
    const draftData = {
      firstName,
      middleInitial,
      lastName,
      suffix,
      gender,
      personalEmail,
      contactNumber,
      province,
      municipality,
      barangay,
      streetAddress,
      postalCode,
      businessName,
      organizationName,
      officialEmail,
      officialContact,
    };

    if (isFarmer) {
      draftData.farmLots = farmLots.map((lot) => ({
        farm_profile_id: lot.farm_profile_id,
        farm_lot_name: lot.farm_lot_name,
        street_address: lot.street_address,
        province: lot.province,
        municipality: lot.municipality,
        postal_code: lot.postal_code,
        manual_address: lot.manual_address,
        total_farm_area_hectares: lot.total_farm_area_hectares,
        land_ownership_status: lot.land_ownership_status,
        rice_variety_currently_planted: lot.rice_variety_currently_planted,
        cropping_cycles_per_year: lot.cropping_cycles_per_year,
        rsbsa_number: lot.rsbsa_number,
        rsbsa_id_document_path: lot.rsbsa_id_document_path,
        rsbsa_id_document_url: lot.rsbsa_id_document_url,
      }));
    }

    try {
      localStorage.setItem("grainrise_profile_draft", JSON.stringify(draftData));
    } catch (e) { }

    // Send partial save to server silently
    try {
      setIsSavingStep(true);
      const fd = new FormData();
      fd.append("is_partial", "true");
      fd.append("first_name", firstName);
      fd.append("middle_initial", middleInitial);
      fd.append("last_name", lastName);
      fd.append("suffix", suffix);
      fd.append("gender", gender);
      fd.append("email", personalEmail.trim());
      fd.append("contact_number", formatPhoneForBackend(contactNumber));
      fd.append("province", province);
      fd.append("municipality", municipality);
      fd.append("barangay", barangay);
      fd.append("street_address", streetAddress);
      fd.append("postal_code", postalCode);
      fd.append("business_name", businessName);
      fd.append("organization_name", organizationName);
      fd.append("official_email", officialEmail);
      fd.append("official_contact_number", officialContact);

      if (isFarmer) {
        const serializedLots = farmLots.map((lot) => ({
          farm_profile_id: lot.farm_profile_id,
          farm_lot_name: lot.farm_lot_name?.trim() || "",
          street_address: lot.street_address?.trim() || "",
          province: lot.province?.trim() || "",
          municipality: lot.municipality?.trim() || "",
          postal_code: lot.postal_code?.trim() || "",
          total_farm_area_hectares: lot.total_farm_area_hectares ? String(lot.total_farm_area_hectares).trim() : null,
          land_ownership_status: lot.land_ownership_status || null,
          rice_variety_currently_planted: lot.rice_variety_currently_planted || null,
          cropping_cycles_per_year: lot.cropping_cycles_per_year ? String(lot.cropping_cycles_per_year).trim() : null,
          rsbsa_number: lot.rsbsa_number?.trim() || null,
          rsbsa_id_document: lot.rsbsa_id_document_path || null,
        }));
        fd.append("farm_lots", JSON.stringify(serializedLots));
      }

      await request("/auth/complete-profile", {
        method: "POST",
        body: fd,
      });
    } catch (err) {
      console.warn("Partial save note:", err);
    } finally {
      setIsSavingStep(false);
    }
  };

  const handleNextStep = async () => {
    setErrorMessage("");

    // Step: Security
    if (currentStep.key === "security") {
      if (passwordSaved && !newPassword && !confirmPassword) {
        setCurrentStepIndex(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setTouched((prev) => ({ ...prev, newPassword: true, confirmPassword: true }));
      if (!pwCriteria.allPassed) {
        setErrorMessage("Please ensure your password meets all requirements and matches.");
        return;
      }

      setIsSavingStep(true);
      try {
        const pwRes = await request("/auth/change-temporary-password", {
          method: "POST",
          body: {
            new_password: newPassword,
            confirm_password: confirmPassword,
          },
          throwOnError: true,
        });

        setPasswordSaved(true);
        setMustChangePassword(false);

        // Update local session
        const activeToken =
          pwRes.token ||
          localStorage.getItem("grainrise_token") ||
          localStorage.getItem("access_token");
        if (user && activeToken) {
          login(activeToken, {
            ...user,
            must_change_password: false,
          });
        }

        // Advance to Personal step (Step 2)
        setCurrentStepIndex(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err) {
        setErrorMessage(
          err?.message || "Failed to update temporary password. Please try again."
        );
      } finally {
        setIsSavingStep(false);
      }
      return;
    }

    // Step: Personal
    if (currentStep.key === "personal") {
      setTouched((prev) => ({
        ...prev,
        firstName: true,
        middleInitial: true,
        lastName: true,
        gender: true,
        personalEmail: true,
        contactNumber: true,
      }));
      if (
        validationErrors.firstName ||
        validationErrors.lastName ||
        validationErrors.gender ||
        validationErrors.personalEmail ||
        validationErrors.contactNumber ||
        validationErrors.middleInitial
      ) {
        setErrorMessage("Please complete all required fields in Personal Information correctly.");
        return;
      }
    }

    // Step: Address
    if (currentStep.key === "address") {
      setTouched((prev) => ({
        ...prev,
        province: true,
        municipality: true,
        barangay: true,
        streetAddress: true,
        postalCode: true,
      }));
      if (
        validationErrors.province ||
        validationErrors.municipality ||
        validationErrors.barangay ||
        validationErrors.streetAddress ||
        validationErrors.postalCode
      ) {
        setErrorMessage(
          isFarmer
            ? "Please complete all required fields in Residential Address."
            : "Please complete all required fields in Company Address."
        );
        return;
      }
    }

    // Step: Farm Information (for Farmer)
    if (currentStep.key === "farm") {
      const newFarmTouched = {};
      farmLots.forEach((_, idx) => {
        newFarmTouched[`${idx}_province`] = true;
        newFarmTouched[`${idx}_municipality`] = true;
        newFarmTouched[`${idx}_postal_code`] = true;
        newFarmTouched[`${idx}_total_farm_area_hectares`] = true;
        newFarmTouched[`${idx}_cropping_cycles_per_year`] = true;
      });
      setFarmLotTouched((prev) => ({ ...prev, ...newFarmTouched }));

      const hasFarmErrors = farmLotErrors.some((errs) => Object.keys(errs).length > 0);
      if (farmLots.length === 0 || hasFarmErrors) {
        setErrorMessage("Please complete all required fields for each farm lot.");
        return;
      }
    }

    // Step: Business
    if (currentStep.key === "business") {
      setTouched((prev) => ({
        ...prev,
        businessName: true,
        officialEmail: true,
        officialContact: true,
      }));
      if (validationErrors.businessName) {
        setErrorMessage("Please enter your registered Business Name.");
        return;
      }
    }

    await persistStepData();
    setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setErrorMessage("");
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Document file selection with client-side validation
  const handleFileChange = (fieldKey, file) => {
    if (!file) {
      setUploadErrors((prev) => ({ ...prev, [fieldKey]: null }));
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: "Unsupported file format. Please upload JPG, PNG, WEBP, or PDF.",
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: "File size exceeds the 10MB limit. Please upload a smaller file.",
      }));
      return;
    }

    setUploadErrors((prev) => ({ ...prev, [fieldKey]: null }));

    if (fieldKey === "govId") setGovIdFile(file);
    if (fieldKey === "bizPermit") setBizPermitFile(file);
    if (fieldKey === "bizReg") setBizRegFile(file);
    if (fieldKey === "license") setLicenseFile(file);
    if (fieldKey === "validId") setValidIdFile(file);
    if (fieldKey === "brgyPermit") setBrgyPermitFile(file);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  // Final Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    if (
      validationErrors.firstName ||
      validationErrors.lastName ||
      validationErrors.gender ||
      validationErrors.personalEmail ||
      validationErrors.middleInitial ||
      validationErrors.contactNumber ||
      validationErrors.province ||
      validationErrors.municipality ||
      validationErrors.barangay ||
      validationErrors.streetAddress ||
      validationErrors.postalCode ||
      (!isFarmer && validationErrors.businessName)
    ) {
      setErrorMessage("Some required profile fields are incomplete. Please review your previous steps.");
      return;
    }

    if (isFarmer) {
      const newFarmTouched = {};
      farmLots.forEach((_, idx) => {
        newFarmTouched[`${idx}_province`] = true;
        newFarmTouched[`${idx}_municipality`] = true;
        newFarmTouched[`${idx}_postal_code`] = true;
        newFarmTouched[`${idx}_total_farm_area_hectares`] = true;
        newFarmTouched[`${idx}_cropping_cycles_per_year`] = true;
      });
      setFarmLotTouched((prev) => ({ ...prev, ...newFarmTouched }));

      const hasFarmErrors = farmLotErrors.some((errs) => Object.keys(errs).length > 0);
      if (farmLots.length === 0 || hasFarmErrors) {
        setErrorMessage("Please complete all required fields for each farm lot.");
        return;
      }
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("first_name", firstName);
      formData.append("middle_initial", middleInitial);
      formData.append("last_name", lastName);
      formData.append("suffix", suffix);
      formData.append("gender", gender);
      formData.append("email", personalEmail.trim());
      formData.append("contact_number", formatPhoneForBackend(contactNumber));

      formData.append("province", province);
      formData.append("municipality", municipality);
      formData.append("barangay", barangay);
      formData.append("street_address", streetAddress);
      formData.append("postal_code", postalCode);

      if (isFarmer) {
        const serializedLots = farmLots.map((lot) => ({
          farm_profile_id: lot.farm_profile_id,
          farm_lot_name: lot.farm_lot_name?.trim() || "",
          street_address: lot.street_address?.trim() || "",
          province: lot.province?.trim() || "",
          municipality: lot.municipality?.trim() || "",
          postal_code: lot.postal_code?.trim() || "",
          total_farm_area_hectares: lot.total_farm_area_hectares ? String(lot.total_farm_area_hectares).trim() : null,
          land_ownership_status: lot.land_ownership_status || null,
          rice_variety_currently_planted: lot.rice_variety_currently_planted || null,
          cropping_cycles_per_year: lot.cropping_cycles_per_year ? String(lot.cropping_cycles_per_year).trim() : null,
          rsbsa_number: lot.rsbsa_number?.trim() || null,
          rsbsa_id_document: lot.rsbsa_id_document_path || null,
        }));
        formData.append("farm_lots", JSON.stringify(serializedLots));

        farmLots.forEach((lot, idx) => {
          if (lot.rsbsa_id_document_file) {
            formData.append(`farm_rsbsa_document_${idx}`, lot.rsbsa_id_document_file);
          }
        });
      }

      if (isMiller || isWarehouse) {
        formData.append("business_name", businessName);
        formData.append("organization_name", organizationName);
        formData.append("official_email", officialEmail || user?.email || "");
        formData.append("official_contact_number", officialContact || contactNumber);

        // Address is explicitly company address
        formData.append("business_province", province);
        formData.append("business_municipality", municipality);
        formData.append("business_barangay", barangay);
        formData.append("business_street_address", streetAddress);
        formData.append("business_postal_code", postalCode);

        if (govIdFile) formData.append("government_issued_id", govIdFile);
        if (bizPermitFile) formData.append("business_permit", bizPermitFile);
        if (bizRegFile) formData.append("business_registration", bizRegFile);

        if (isMiller && licenseFile) {
          formData.append("milling_license", licenseFile);
        } else if (isWarehouse && licenseFile) {
          formData.append("warehouse_license", licenseFile);
        }
      }

      if (isRetailer) {
        if (validIdFile) formData.append("valid_id", validIdFile);
        if (brgyPermitFile) formData.append("barangay_permit", brgyPermitFile);
      }

      const response = await request("/auth/complete-profile", {
        method: "POST",
        body: formData,
        throwOnError: true,
      });

      if (response?.profile_incomplete !== false) {
        setErrorMessage(
          response?.detail ||
          "Profile is still incomplete. Please review your provided details and try again."
        );
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Profile setup completed successfully! Redirecting to your dashboard...");
      localStorage.removeItem("grainrise_profile_draft");

      // Update local storage session
      if (user) {
        const updatedUser = {
          ...user,
          profile_incomplete: false,
          must_change_password: false,
          first_name: firstName,
          last_name: lastName,
          province,
          gender,
        };
        const tokenVal =
          localStorage.getItem("grainrise_token") ||
          localStorage.getItem("access_token");
        if (tokenVal) {
          login(tokenVal, updatedUser);
        }
      }

      setTimeout(() => {
        const dest = roleRoutes[role] || "/dashboard-preview";
        navigate(dest, { replace: true });
      }, 1000);
    } catch (err) {
      setErrorMessage(
        err?.message ||
        "Failed to complete profile. Please review the provided details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#08511f]" />
          <p className="text-sm font-semibold text-slate-700">Loading your profile details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 animate-page-fade">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="GrainRise" className="h-9 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-[#08511f] border border-emerald-200">
              {roleTitle}
            </span>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#08511f] to-emerald-700 p-6 sm:p-7 text-white shadow-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-emerald-100 mb-2.5 backdrop-blur-sm">
              <ShieldCheck size={14} />
              Partner Profile Setup
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Complete Your Partner Profile</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
              Complete your profile step by step to finish your account setup and access your dashboard.
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between relative">
              {/* Horizontal Connecting Progress Line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 z-0">
                <div
                  className="h-full bg-[#08511f] transition-all duration-300 ease-in-out"
                  style={{
                    width: `${(currentStepIndex / (totalSteps - 1 || 1)) * 100}%`,
                  }}
                />
              </div>

              {steps.map((s, idx) => {
                const isCompleted = currentStepIndex > idx;
                const isActive = currentStepIndex === idx;

                return (
                  <div key={s.key} className="relative z-10 flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted) {
                          setCurrentStepIndex(idx);
                        }
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isCompleted
                          ? "bg-[#08511f] text-white cursor-pointer hover:bg-emerald-800 shadow-xs"
                          : isActive
                            ? "bg-white border-2 border-[#08511f] text-[#08511f] ring-4 ring-emerald-100 shadow-xs"
                            : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                    >
                      {isCompleted ? <Check size={16} className="stroke-[2.5]" /> : idx + 1}
                    </button>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 text-center hidden sm:block ${isActive
                          ? "text-[#08511f] font-bold"
                          : isCompleted
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                    >
                      {s.shortTitle}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center sm:hidden">
              <span className="text-xs font-bold text-[#08511f]">
                Step {currentStepIndex + 1} of {totalSteps}: {currentStep?.title}
              </span>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ── STEP: ACCOUNT SECURITY (CREATE NEW PASSWORD) ── */}
          {currentStep?.key === "security" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Account Security</h2>
                  <p className="text-xs text-slate-500">Create a secure personal password for your account</p>
                </div>
              </div>

              <div className="space-y-4 max-w-lg">
                {passwordSaved ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Your new permanent password has already been saved. You may click &quot;Next Step&quot; to proceed, or enter a new password below if you wish to change it again.
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-50/80 border border-amber-200 text-amber-800 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
                    <Lock size={15} className="text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      You are logging in with a temporary password. Please establish a strong permanent password before continuing.
                    </span>
                  </div>
                )}

                {/* New Password Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onBlur={() => markTouched("newPassword")}
                      placeholder="Enter your new password"
                      className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border outline-none transition ${touched.newPassword && validationErrors.newPassword
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {touched.newPassword && validationErrors.newPassword && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.newPassword}</p>
                  )}
                </div>

                {/* Password Strength Checklist */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <p className="font-bold text-slate-600 text-[11px] uppercase tracking-wider mb-1">
                    Password Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${pwCriteria.hasMinLength ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                      <Check size={13} className={pwCriteria.hasMinLength ? "text-emerald-600" : "text-slate-300"} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwCriteria.hasUpper ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                      <Check size={13} className={pwCriteria.hasUpper ? "text-emerald-600" : "text-slate-300"} />
                      <span>At least 1 uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwCriteria.hasLower ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                      <Check size={13} className={pwCriteria.hasLower ? "text-emerald-600" : "text-slate-300"} />
                      <span>At least 1 lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwCriteria.hasNumber ? "text-emerald-700 font-semibold" : "text-slate-500"}`}>
                      <Check size={13} className={pwCriteria.hasNumber ? "text-emerald-600" : "text-slate-300"} />
                      <span>At least 1 number</span>
                    </div>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => markTouched("confirmPassword")}
                      placeholder="Re-enter your new password"
                      className={`w-full pl-3.5 pr-10 py-2.5 text-sm rounded-xl border outline-none transition ${touched.confirmPassword && validationErrors.confirmPassword
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p
                      className={`mt-1 text-xs font-medium ${pwCriteria.matches ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                      {pwCriteria.matches ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: PERSONAL INFORMATION ── */}
          {currentStep?.key === "personal" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-500">Your legal identity and primary contact number</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {firstName.length}/50
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={50}
                      value={firstName}
                      onKeyDown={handleNameKeyDown}
                      onChange={handleFirstNameChange}
                      onPaste={handleFirstNamePaste}
                      onBlur={() => markTouched("firstName")}
                      placeholder="e.g. Carl"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none pr-9 transition ${(touched.firstName || firstName) && validationErrors.firstName
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : firstName && !validationErrors.firstName
                            ? "border-emerald-400 bg-emerald-50/20 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {(touched.firstName || firstName) && validationErrors.firstName ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : firstName && !validationErrors.firstName ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : null}
                    </div>
                  </div>
                  {(touched.firstName || firstName) && validationErrors.firstName ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.firstName}
                    </p>
                  ) : firstName && !validationErrors.firstName ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid first name
                    </p>
                  ) : null}
                </div>

                {/* Middle Initial */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Middle Initial <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {middleInitial.length}/2
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={2}
                      value={middleInitial}
                      onKeyDown={handleMiddleInitialKeyDown}
                      onChange={handleMiddleInitialChange}
                      onPaste={handleMiddleInitialPaste}
                      onBlur={() => markTouched("middleInitial")}
                      placeholder="e.g. R"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none pr-9 transition uppercase ${(touched.middleInitial || middleInitial) && validationErrors.middleInitial
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : middleInitial && !validationErrors.middleInitial
                            ? "border-emerald-400 bg-emerald-50/20 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {(touched.middleInitial || middleInitial) && validationErrors.middleInitial ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : middleInitial && !validationErrors.middleInitial ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : null}
                    </div>
                  </div>
                  {(touched.middleInitial || middleInitial) && validationErrors.middleInitial ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.middleInitial}
                    </p>
                  ) : middleInitial && !validationErrors.middleInitial ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid initial
                    </p>
                  ) : null}
                </div>

                {/* Last Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {lastName.length}/50
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={50}
                      value={lastName}
                      onKeyDown={handleNameKeyDown}
                      onChange={handleLastNameChange}
                      onPaste={handleLastNamePaste}
                      onBlur={() => markTouched("lastName")}
                      placeholder="e.g. Gamilla"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none pr-9 transition ${(touched.lastName || lastName) && validationErrors.lastName
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : lastName && !validationErrors.lastName
                            ? "border-emerald-400 bg-emerald-50/20 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {(touched.lastName || lastName) && validationErrors.lastName ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : lastName && !validationErrors.lastName ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : null}
                    </div>
                  </div>
                  {(touched.lastName || lastName) && validationErrors.lastName ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.lastName}
                    </p>
                  ) : lastName && !validationErrors.lastName ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid last name
                    </p>
                  ) : null}
                </div>

                {/* Suffix (Dropdown) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Suffix <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={suffix}
                      onChange={(e) => {
                        setSuffix(e.target.value);
                        markTouched("suffix");
                      }}
                      className="w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white pr-9 outline-none transition focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] cursor-pointer"
                    >
                      {SUFFIX_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Select standard name extension if applicable</p>
                </div>

                {/* Gender (Dropdown) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => {
                        setGender(e.target.value);
                        markTouched("gender");
                      }}
                      onBlur={() => markTouched("gender")}
                      className={`w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border bg-white pr-9 outline-none transition cursor-pointer ${touched.gender && validationErrors.gender
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : gender && !validationErrors.gender
                            ? "border-emerald-400 bg-emerald-50/20 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    >
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                  {touched.gender && validationErrors.gender ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.gender}
                    </p>
                  ) : gender && !validationErrors.gender ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Gender selected
                    </p>
                  ) : null}
                </div>

                {/* Email Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Email Address {isFarmer ? <span className="text-slate-400 font-normal normal-case">(Optional)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {personalEmail.length}/100
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      maxLength={100}
                      value={personalEmail}
                      onKeyDown={handleEmailKeyDown}
                      onChange={handleEmailChange}
                      onPaste={handleEmailPaste}
                      onBlur={() => markTouched("personalEmail")}
                      placeholder="e.g. name@domain.com"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none pr-9 transition ${(touched.personalEmail || personalEmail) && validationErrors.personalEmail
                          ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-1 focus:ring-red-400"
                          : personalEmail && !validationErrors.personalEmail
                            ? "border-emerald-400 bg-emerald-50/20 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {(touched.personalEmail || personalEmail) && validationErrors.personalEmail ? (
                        <AlertCircle size={16} className="text-red-500" />
                      ) : personalEmail && !validationErrors.personalEmail ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : null}
                    </div>
                  </div>
                  {(touched.personalEmail || personalEmail) && validationErrors.personalEmail ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.personalEmail}
                    </p>
                  ) : personalEmail && !validationErrors.personalEmail ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid email format
                    </p>
                  ) : null}
                </div>

                {/* Contact Number (Standard Philippine Phone format) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {contactNumber.length}/10 digits
                    </span>
                  </div>
                  <div
                    className={`flex items-center rounded-xl border overflow-hidden transition bg-white ${(touched.contactNumber || contactNumber) && validationErrors.contactNumber
                        ? "border-red-400 ring-1 ring-red-400 bg-red-50/10"
                        : contactNumber && !validationErrors.contactNumber
                          ? "border-emerald-400 ring-1 ring-emerald-400 bg-emerald-50/10"
                          : "border-slate-300 focus-within:border-[#08511f] focus-within:ring-1 focus-within:ring-[#08511f]"
                      }`}
                  >
                    <span className="px-3.5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-50 border-r border-slate-200 select-none whitespace-nowrap">
                      +63
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={contactNumber}
                      onKeyDown={handlePhoneKeyDown}
                      onChange={handlePhoneChange}
                      onPaste={handlePhonePaste}
                      onBlur={() => markTouched("contactNumber")}
                      placeholder="9XXXXXXXXX"
                      className="w-full px-3.5 py-2.5 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                    />
                    <div className="pr-3 pointer-events-none">
                      {(touched.contactNumber || contactNumber) && validationErrors.contactNumber ? (
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                      ) : contactNumber && !validationErrors.contactNumber ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      ) : null}
                    </div>
                  </div>
                  {(touched.contactNumber || contactNumber) && validationErrors.contactNumber ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {validationErrors.contactNumber}
                    </p>
                  ) : contactNumber && !validationErrors.contactNumber ? (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid Philippine mobile number (+63 {contactNumber})
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Standard 10-digit mobile number starting with 9 (e.g. 9171234567)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: COMPANY / RESIDENTIAL ADDRESS ── */}
          {currentStep?.key === "address" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isFarmer ? "Residential Address" : "Company Address"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isFarmer
                        ? "Your residential or home address."
                        : "Your registered company or business location."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleManualAddress}
                  className="text-xs font-semibold text-[#08511f] hover:underline cursor-pointer self-start sm:self-auto"
                >
                  {manualAddress ? "Use Address Dropdowns" : "Can't find location? Enter manually"}
                </button>
              </div>

              {!manualAddress ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Province Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      label=""
                      placeholder={
                        address.loading.provinces
                          ? "Loading provinces..."
                          : "Select Province"
                      }
                      options={address.provinceOptions}
                      value={address.province}
                      onChange={handleProvinceChange}
                      disabled={address.loading.provinces}
                      error={touched.province ? (validationErrors.province || address.errors.provinces) : ""}
                    />
                    {touched.province && validationErrors.province && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.province}</p>
                    )}
                    {address.errors.provinces && (
                      <p className="mt-1 text-xs text-amber-600">
                        {address.errors.provinces} (You can{" "}
                        <button
                          type="button"
                          onClick={() => setManualAddress(true)}
                          className="underline font-bold text-[#08511f]"
                        >
                          enter manually
                        </button>
                        )
                      </p>
                    )}
                  </div>

                  {/* Municipality / City Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Municipality / City <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      label=""
                      placeholder={
                        address.loading.municipalities
                          ? "Loading cities/municipalities..."
                          : !address.province
                            ? "Select Province First"
                            : "Select Municipality/City"
                      }
                      options={address.municipalityOptions}
                      value={address.municipality}
                      onChange={handleMunicipalityChange}
                      disabled={!address.province || address.loading.municipalities}
                      error={touched.municipality ? (validationErrors.municipality || address.errors.municipalities) : ""}
                    />
                    {touched.municipality && validationErrors.municipality && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.municipality}</p>
                    )}
                    {address.errors.municipalities && (
                      <p className="mt-1 text-xs text-amber-600">
                        {address.errors.municipalities} (You can{" "}
                        <button
                          type="button"
                          onClick={() => setManualAddress(true)}
                          className="underline font-bold text-[#08511f]"
                        >
                          enter manually
                        </button>
                        )
                      </p>
                    )}
                  </div>

                  {/* Barangay Dropdown */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <Dropdown
                      label=""
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
                      disabled={!address.municipality || address.loading.barangays}
                      error={touched.barangay ? (validationErrors.barangay || address.errors.barangays) : ""}
                    />
                    {touched.barangay && validationErrors.barangay && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.barangay}</p>
                    )}
                    {address.errors.barangays && (
                      <p className="mt-1 text-xs text-amber-600">
                        {address.errors.barangays} (You can{" "}
                        <button
                          type="button"
                          onClick={() => setManualAddress(true)}
                          className="underline font-bold text-[#08511f]"
                        >
                          enter manually
                        </button>
                        )
                      </p>
                    )}
                  </div>

                  {/* Postal Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Postal Code <span className="text-red-500">*</span>{" "}
                      <span className="text-slate-400 font-normal lowercase">(auto-filled, editable)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={postalCode}
                      onChange={handlePostalCodeChange}
                      onBlur={() => markTouched("postalCode")}
                      placeholder={
                        address.loading.postalCode
                          ? "Loading..."
                          : !address.municipality
                            ? "Select Municipality First"
                            : "4-digit postal code"
                      }
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.postalCode && validationErrors.postalCode
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.postalCode && validationErrors.postalCode && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.postalCode}</p>
                    )}
                    {address.postalStatus === "unavailable" && !validationErrors.postalCode && (
                      <p className="mt-1 text-xs text-amber-600 font-medium">
                        Automatic postal lookup was unavailable. Please enter it manually.
                      </p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      onBlur={() => markTouched("streetAddress")}
                      placeholder={
                        isFarmer
                          ? "House #, Street name, Purok / Sitio"
                          : "Building #, Street name, Industrial park / Compound"
                      }
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                        touched.streetAddress && validationErrors.streetAddress
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.streetAddress && validationErrors.streetAddress && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.streetAddress}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Manual Province */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualProvince}
                      onChange={(e) => {
                        setManualProvince(e.target.value);
                        markTouched("province");
                      }}
                      onBlur={() => markTouched("province")}
                      placeholder="e.g. Isabela, Bulacan"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.province && validationErrors.province
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.province && validationErrors.province && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.province}</p>
                    )}
                  </div>

                  {/* Manual Municipality */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Municipality / City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualMunicipality}
                      onChange={(e) => {
                        setManualMunicipality(e.target.value);
                        markTouched("municipality");
                      }}
                      onBlur={() => markTouched("municipality")}
                      placeholder="e.g. Santiago City"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.municipality && validationErrors.municipality
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.municipality && validationErrors.municipality && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.municipality}</p>
                    )}
                  </div>

                  {/* Manual Barangay */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualBarangay}
                      onChange={(e) => {
                        setManualBarangay(e.target.value);
                        markTouched("barangay");
                      }}
                      onBlur={() => markTouched("barangay")}
                      placeholder="e.g. San Roque"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.barangay && validationErrors.barangay
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.barangay && validationErrors.barangay && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.barangay}</p>
                    )}
                  </div>

                  {/* Manual Postal Code */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={manualPostalCode}
                      onChange={handlePostalCodeChange}
                      onBlur={() => markTouched("postalCode")}
                      placeholder="e.g. 3311"
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.postalCode && validationErrors.postalCode
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.postalCode && validationErrors.postalCode && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.postalCode}</p>
                    )}
                  </div>

                  {/* Street Address */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      onBlur={() => markTouched("streetAddress")}
                      placeholder={
                        isFarmer
                          ? "House #, Street name, Purok / Sitio"
                          : "Building #, Street name, Industrial park / Compound"
                      }
                      className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                        touched.streetAddress && validationErrors.streetAddress
                          ? "border-red-400 bg-red-50/30 focus:border-red-500"
                          : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                        }`}
                    />
                    {touched.streetAddress && validationErrors.streetAddress && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.streetAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP: FARM INFORMATION (FOR FARMER) ── */}
          {currentStep?.key === "farm" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                      <Sprout size={22} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Farm Information</h2>
                      <p className="text-xs text-slate-500">
                        Register your farm lot(s), location, land ownership, and planting details.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFarmLot}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#08511f] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition cursor-pointer self-start sm:self-auto shadow-2xs"
                  >
                    <Plus size={15} />
                    <span>Add Another Farm Lot</span>
                  </button>
                </div>

                {/* Reusable RSBSA Banner if verified during inquiry */}
                {reusableRsbsaDoc?.rsbsa_document && (
                  <div className="mt-4 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-900">
                    <div className="flex items-start sm:items-center gap-2">
                      <FileCheck size={18} className="text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
                      <div>
                        <span className="font-bold">Verified RSBSA Document Available: </span>
                        <span>Your RSBSA verification document from partner inquiry is securely on file.</span>
                      </div>
                    </div>
                    {reusableRsbsaDoc.rsbsa_document_url && (
                      <a
                        href={reusableRsbsaDoc.rsbsa_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-[#08511f] hover:underline self-end sm:self-auto shrink-0"
                      >
                        <span>View Document</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Farm Lots List */}
              <div className="space-y-5">
                {farmLots.map((lot, idx) => {
                  const lotErrors = farmLotErrors[idx] || {};
                  const isSingle = farmLots.length === 1;

                  return (
                    <div
                      key={lot.id || idx}
                      className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5 relative"
                    >
                      {/* Lot Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#08511f] text-white text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-800">
                              {lot.farm_lot_name ? lot.farm_lot_name : `Farm Lot #${idx + 1}`}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              Farm profile &amp; cultivation specifications
                            </p>
                          </div>
                        </div>

                        {!isSingle && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFarmLot(idx)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Remove Lot</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Farm Lot Name */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Farm / Lot Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={200}
                            value={lot.farm_lot_name}
                            onChange={(e) => updateFarmLot(idx, "farm_lot_name", e.target.value)}
                            placeholder="e.g. Lot 1 - North Paddy, Sitio Maligaya"
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none transition"
                          />
                        </div>

                        {/* Location Header & Toggle */}
                        <div className="sm:col-span-2 flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Farm Location Details
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleFarmLotManualAddress(idx)}
                            className="text-xs font-semibold text-[#08511f] hover:underline cursor-pointer"
                          >
                            {lot.manual_address ? "Use Address Dropdowns" : "Can't find location? Enter manually"}
                          </button>
                        </div>

                        {!lot.manual_address ? (
                          <>
                            {/* Province Dropdown */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Province <span className="text-red-500">*</span>
                              </label>
                              <Dropdown
                                label=""
                                placeholder={
                                  address.loading.provinces
                                    ? "Loading provinces..."
                                    : "Select Province"
                                }
                                options={address.provinceOptions}
                                value={lot.province}
                                onChange={(val) => handleFarmProvinceChange(idx, val)}
                                disabled={address.loading.provinces}
                                error={farmLotTouched[`${idx}_province`] ? lotErrors.province : ""}
                              />
                              {farmLotTouched[`${idx}_province`] && lotErrors.province && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.province}</p>
                              )}
                            </div>

                            {/* Municipality Dropdown */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Municipality / City <span className="text-red-500">*</span>
                              </label>
                              <Dropdown
                                label=""
                                placeholder={
                                  lot.loadingMunicipalities
                                    ? "Loading cities/municipalities..."
                                    : !lot.province
                                    ? "Select Province First"
                                    : "Select Municipality/City"
                                }
                                options={(lot.municipalitiesList || []).map((m) => m.name || m)}
                                value={lot.municipality}
                                onChange={(val) => handleFarmMunicipalityChange(idx, val)}
                                disabled={!lot.province || lot.loadingMunicipalities}
                                error={farmLotTouched[`${idx}_municipality`] ? lotErrors.municipality : ""}
                              />
                              {farmLotTouched[`${idx}_municipality`] && lotErrors.municipality && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.municipality}</p>
                              )}
                            </div>

                            {/* Postal Code */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Postal Code <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={lot.postal_code}
                                onChange={(e) => {
                                  markFarmLotTouched(idx, "postal_code");
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  updateFarmLot(idx, "postal_code", val);
                                }}
                                onBlur={() => markFarmLotTouched(idx, "postal_code")}
                                placeholder="4-digit postal code"
                                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                                  farmLotTouched[`${idx}_postal_code`] && lotErrors.postal_code
                                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                                    : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                                }`}
                              />
                              {farmLotTouched[`${idx}_postal_code`] && lotErrors.postal_code && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.postal_code}</p>
                              )}
                            </div>

                            {/* Street / Sitio Address */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Street Address / Sitio <span className="text-slate-400 font-normal lowercase">(optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={255}
                                value={lot.street_address}
                                onChange={(e) => updateFarmLot(idx, "street_address", e.target.value)}
                                placeholder="e.g. Purok 3, Sitio Riverside"
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none transition"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Manual Province */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Province <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                maxLength={100}
                                value={lot.province}
                                onChange={(e) => {
                                  markFarmLotTouched(idx, "province");
                                  updateFarmLot(idx, "province", e.target.value);
                                }}
                                onBlur={() => markFarmLotTouched(idx, "province")}
                                placeholder="e.g. Isabela"
                                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                                  farmLotTouched[`${idx}_province`] && lotErrors.province
                                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                                    : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                                }`}
                              />
                              {farmLotTouched[`${idx}_province`] && lotErrors.province && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.province}</p>
                              )}
                            </div>

                            {/* Manual Municipality */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Municipality / City <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                maxLength={100}
                                value={lot.municipality}
                                onChange={(e) => {
                                  markFarmLotTouched(idx, "municipality");
                                  updateFarmLot(idx, "municipality", e.target.value);
                                }}
                                onBlur={() => markFarmLotTouched(idx, "municipality")}
                                placeholder="e.g. Santiago City"
                                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                                  farmLotTouched[`${idx}_municipality`] && lotErrors.municipality
                                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                                    : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                                }`}
                              />
                              {farmLotTouched[`${idx}_municipality`] && lotErrors.municipality && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.municipality}</p>
                              )}
                            </div>

                            {/* Manual Postal Code */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Postal Code <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={4}
                                value={lot.postal_code}
                                onChange={(e) => {
                                  markFarmLotTouched(idx, "postal_code");
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                  updateFarmLot(idx, "postal_code", val);
                                }}
                                onBlur={() => markFarmLotTouched(idx, "postal_code")}
                                placeholder="4-digit postal code (e.g. 3311)"
                                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                                  farmLotTouched[`${idx}_postal_code`] && lotErrors.postal_code
                                    ? "border-red-400 bg-red-50/30 focus:border-red-500"
                                    : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                                }`}
                              />
                              {farmLotTouched[`${idx}_postal_code`] && lotErrors.postal_code && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.postal_code}</p>
                              )}
                            </div>

                            {/* Manual Street Address */}
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Street Address / Sitio <span className="text-slate-400 font-normal lowercase">(optional)</span>
                              </label>
                              <input
                                type="text"
                                maxLength={255}
                                value={lot.street_address}
                                onChange={(e) => updateFarmLot(idx, "street_address", e.target.value)}
                                placeholder="e.g. Purok 3, Sitio Riverside"
                                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none transition"
                              />
                            </div>
                          </>
                        )}

                        {/* Section Divider */}
                        <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Cultivation &amp; Specifications
                          </span>
                        </div>

                        {/* Total Farm Area (hectares) */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Total Farm Area (Hectares) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={lot.total_farm_area_hectares}
                            onChange={(e) => {
                              markFarmLotTouched(idx, "total_farm_area_hectares");
                              updateFarmLot(idx, "total_farm_area_hectares", e.target.value);
                            }}
                            onBlur={() => markFarmLotTouched(idx, "total_farm_area_hectares")}
                            placeholder="e.g. 1.50"
                            className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${
                              farmLotTouched[`${idx}_total_farm_area_hectares`] && lotErrors.total_farm_area_hectares
                                ? "border-red-400 bg-red-50/30 focus:border-red-500"
                                : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                            }`}
                          />
                          {farmLotTouched[`${idx}_total_farm_area_hectares`] && lotErrors.total_farm_area_hectares && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{lotErrors.total_farm_area_hectares}</p>
                          )}
                        </div>

                        {/* Land Ownership Status */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Land Ownership Status <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={lot.land_ownership_status}
                              onChange={(e) => updateFarmLot(idx, "land_ownership_status", e.target.value)}
                              className="w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white pr-9 outline-none transition focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] cursor-pointer"
                            >
                              <option value="">Select Ownership Status</option>
                              {LAND_OWNERSHIP_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={16}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        {/* Rice Variety Currently Planted */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Rice Variety Currently Planted <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={lot.rice_variety_currently_planted}
                              onChange={(e) => updateFarmLot(idx, "rice_variety_currently_planted", e.target.value)}
                              className="w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white pr-9 outline-none transition focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] cursor-pointer"
                            >
                              <option value="">Select Rice Variety</option>
                              {RICE_VARIETY_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={16}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        {/* Cropping Cycles Per Year */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            Cropping Cycles Per Year <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <div className="relative">
                            <select
                              value={lot.cropping_cycles_per_year}
                              onChange={(e) => updateFarmLot(idx, "cropping_cycles_per_year", e.target.value)}
                              className="w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white pr-9 outline-none transition focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] cursor-pointer"
                            >
                              <option value="">Select Cycles</option>
                              {CROPPING_CYCLES_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt} cycle{opt !== "1" ? "s" : ""} / year
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={16}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        {/* Section Divider */}
                        <div className="sm:col-span-2 pt-1 border-t border-slate-100">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            RSBSA Registration &amp; Accreditation
                          </span>
                        </div>

                        {/* RSBSA Number */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                            RSBSA Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                          </label>
                          <input
                            type="text"
                            maxLength={50}
                            value={lot.rsbsa_number}
                            onChange={(e) => updateFarmLot(idx, "rsbsa_number", e.target.value)}
                            placeholder="e.g. 01-23-45-678-000001"
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none transition"
                          />
                          <p className="mt-1 text-[11px] text-slate-400">
                            Registry System for Basic Sectors in Agriculture ID
                          </p>
                        </div>

                        {/* RSBSA Document Upload / Attachment */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                              RSBSA ID Document <span className="text-slate-400 font-normal lowercase">(optional)</span>
                            </label>
                            {reusableRsbsaDoc?.rsbsa_document && lot.rsbsa_id_document_path !== reusableRsbsaDoc.rsbsa_document && (
                              <button
                                type="button"
                                onClick={() => handleUseReusableDocForLot(idx)}
                                className="text-[11px] font-bold text-[#08511f] hover:underline cursor-pointer"
                              >
                                Link Inquiry RSBSA
                              </button>
                            )}
                          </div>

                          {/* Existing / Linked document indicator */}
                          {lot.rsbsa_id_document_path && !lot.rsbsa_id_document_file && (
                            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                              <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                                <FileCheck size={14} className="shrink-0 text-emerald-600" />
                                <span>RSBSA document linked</span>
                              </span>
                              {lot.rsbsa_id_document_url && (
                                <a
                                  href={lot.rsbsa_id_document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold text-[#08511f] hover:underline flex items-center gap-0.5 ml-2 shrink-0"
                                >
                                  <span>View</span>
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Newly selected file indicator */}
                          {lot.rsbsa_id_document_file && (
                            <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                              <span className="truncate max-w-[200px]">{lot.rsbsa_id_document_file.name}</span>
                              <span className="text-[10px] text-emerald-600 ml-2">
                                {formatFileSize(lot.rsbsa_id_document_file.size)}
                              </span>
                            </div>
                          )}

                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                            <Upload size={13} />
                            <span>
                              {lot.rsbsa_id_document_file || lot.rsbsa_id_document_path
                                ? "Change File"
                                : "Upload File"}
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFarmLotFileChange(idx, e.target.files[0])}
                              className="hidden"
                            />
                          </label>

                          {lot.fileError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{lot.fileError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Lot Button at Bottom */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddFarmLot}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 flex items-center justify-center gap-2 text-sm font-bold text-[#08511f] transition cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Add Another Farm Lot</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: BUSINESS DETAILS ── */}
          {currentStep?.key === "business" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{currentStep.title}</h2>
                  <p className="text-xs text-slate-500">Official business and organization information.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    onBlur={() => markTouched("businessName")}
                    placeholder="e.g. Golden Grains Warehouse Inc."
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.businessName && validationErrors.businessName
                        ? "border-red-400 bg-red-50/30 focus:border-red-500"
                        : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                      }`}
                  />
                  {touched.businessName && validationErrors.businessName && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.businessName}</p>
                  )}
                </div>

                {/* Organization / Parent Entity */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Organization / Parent Entity
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. AgriCorp Holdings (optional)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    onBlur={() => markTouched("officialEmail")}
                    placeholder="e.g. contact@goldengrains.ph"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.officialEmail && validationErrors.officialEmail
                        ? "border-red-400 bg-red-50/30 focus:border-red-500"
                        : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                      }`}
                  />
                  {touched.officialEmail && validationErrors.officialEmail && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.officialEmail}</p>
                  )}
                </div>

                {/* Official Contact Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Official Contact Number
                  </label>
                  <input
                    type="text"
                    value={officialContact}
                    onChange={(e) => setOfficialContact(e.target.value)}
                    onBlur={() => markTouched("officialContact")}
                    placeholder="e.g. 09171234567 or landline"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition ${touched.officialContact && validationErrors.officialContact
                        ? "border-red-400 bg-red-50/30 focus:border-red-500"
                        : "border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f]"
                      }`}
                  />
                  {touched.officialContact && validationErrors.officialContact && (
                    <p className="mt-1 text-xs text-red-600 font-medium">{validationErrors.officialContact}</p>
                  )}
                </div>

                {/* Company Address summary banner */}
                <div className="sm:col-span-2 mt-2 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Company Address: </span>
                    <span className="text-slate-600">
                      {[streetAddress, barangay, municipality, province].filter(Boolean).join(", ") ||
                        "Address not set yet"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const addrIdx = steps.findIndex((s) => s.key === "address");
                      if (addrIdx !== -1) setCurrentStepIndex(addrIdx);
                    }}
                    className="text-[#08511f] font-bold hover:underline cursor-pointer ml-3 shrink-0"
                  >
                    Edit Address
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: VERIFICATION DOCUMENTS ── */}
          {currentStep?.key === "documents" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#08511f]">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Verification Documents</h2>
                  <p className="text-xs text-slate-500">
                    Review and upload your verification documents (Images or PDF, max 10MB each).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isMiller || isWarehouse) && (
                  <>
                    {/* Document 1: Government-Issued ID */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:border-slate-300 transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">Government-Issued ID</p>
                        {existingDocs?.government_issued_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Passport, Driver&apos;s License, or UMID</p>

                      {existingDocs?.government_issued_id && !govIdFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Previously submitted and safely archived on file.</span>
                        </p>
                      )}

                      {govIdFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{govIdFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(govIdFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>{govIdFile || existingDocs?.government_issued_id ? "Change File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("govId", e.target.files[0])}
                          className="hidden"
                        />
                      </label>

                      {uploadErrors.govId && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.govId}</p>
                      )}
                    </div>

                    {/* Document 2: Mayor's / Business Permit */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:border-slate-300 transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">Mayor&apos;s / Business Permit</p>
                        {existingDocs?.business_permit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Current-year municipal permit</p>

                      {existingDocs?.business_permit && !bizPermitFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Previously submitted and safely archived on file.</span>
                        </p>
                      )}

                      {bizPermitFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{bizPermitFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(bizPermitFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>{bizPermitFile || existingDocs?.business_permit ? "Change File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("bizPermit", e.target.files[0])}
                          className="hidden"
                        />
                      </label>

                      {uploadErrors.bizPermit && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.bizPermit}</p>
                      )}
                    </div>

                    {/* Document 3: Business Registration (DTI/SEC) */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:border-slate-300 transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">Business Registration (DTI/SEC)</p>
                        {existingDocs?.business_registration && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Certificate of Registration</p>

                      {existingDocs?.business_registration && !bizRegFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Registered &amp; verified from your partnership application.</span>
                        </p>
                      )}

                      {bizRegFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{bizRegFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(bizRegFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>{bizRegFile || existingDocs?.business_registration ? "Change File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("bizReg", e.target.files[0])}
                          className="hidden"
                        />
                      </label>

                      {uploadErrors.bizReg && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.bizReg}</p>
                      )}
                    </div>

                    {/* Document 4: License / Permit */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 hover:border-slate-300 transition">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">
                          {isWarehouse ? "Warehouse License / Permit" : "Milling License / Accreditation"}
                        </p>
                        {(existingDocs?.warehouse_license || existingDocs?.milling_license) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Industry license or permit</p>

                      {(existingDocs?.warehouse_license || existingDocs?.milling_license) && !licenseFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Previously submitted and safely archived on file.</span>
                        </p>
                      )}

                      {licenseFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{licenseFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(licenseFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>
                          {licenseFile || existingDocs?.warehouse_license || existingDocs?.milling_license
                            ? "Change File"
                            : "Choose File"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("license", e.target.files[0])}
                          className="hidden"
                        />
                      </label>

                      {uploadErrors.license && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.license}</p>
                      )}
                    </div>
                  </>
                )}

                {isRetailer && (
                  <>
                    {/* Retailer: Valid Identification */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">Valid Identification Document</p>
                        {existingDocs?.valid_id && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Government issued ID or Passport</p>

                      {existingDocs?.valid_id && !validIdFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Registered from inquiry verification</span>
                        </p>
                      )}

                      {validIdFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{validIdFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(validIdFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>{validIdFile || existingDocs?.valid_id ? "Change File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("validId", e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      {uploadErrors.validId && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.validId}</p>
                      )}
                    </div>

                    {/* Retailer: Barangay Permit */}
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-slate-800">Barangay Permit / Clearances</p>
                        {existingDocs?.barangay_permit && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3">Barangay Business Clearance</p>

                      {existingDocs?.barangay_permit && !brgyPermitFile && (
                        <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2 font-medium flex items-center gap-1.5">
                          <FileCheck size={14} className="shrink-0 text-emerald-600" />
                          <span>Previously submitted and on file</span>
                        </p>
                      )}

                      {brgyPermitFile && (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800 font-medium">
                          <span className="truncate max-w-[200px]">{brgyPermitFile.name}</span>
                          <span className="text-[10px] text-emerald-600 ml-2">
                            {formatFileSize(brgyPermitFile.size)}
                          </span>
                        </div>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs">
                        <Upload size={13} />
                        <span>{brgyPermitFile || existingDocs?.barangay_permit ? "Change File" : "Choose File"}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("brgyPermit", e.target.files[0])}
                          className="hidden"
                        />
                      </label>
                      {uploadErrors.brgyPermit && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{uploadErrors.brgyPermit}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {currentStepIndex > 0 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isSubmitting || isSavingStep}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStepIndex < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSavingStep || !isCurrentStepValid}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#08511f] hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-xs transition active:scale-[0.99] cursor-pointer"
                >
                  <span>{isSavingStep ? "Saving..." : "Next Step"}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#08511f] hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold shadow-md transition active:scale-[0.99] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving &amp; Finalizing...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup &amp; Access Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompleteProfile;
