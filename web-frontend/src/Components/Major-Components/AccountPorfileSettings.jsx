import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Edit3,
  CheckCircle2,
  KeyRound,
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  Save,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Breadcrumbs from "../Minor-Components/Breadcrumbs";
import Toast from "../Minor-Components/Toast";
import Dropdown from "../Minor-Components/Dropdown";
import useToast from "../hooks/useToast";
import useApi from "../hooks/useApi";
import useAuth from "../hooks/useAuth";
import usePhilippineAddress from "../hooks/usePhilippineAddress";
import ChangePasswordModal from "../Modals/ChangePasswordModal";

// ============================================================
// CONSTANTS & DROPDOWN OPTIONS
// ============================================================

const SUFFIX_OPTIONS = [
  { value: "", label: "None" },
  { value: "Jr.", label: "Jr." },
  { value: "Sr.", label: "Sr." },
  { value: "II", label: "II" },
  { value: "III", label: "III" },
  { value: "IV", label: "IV" },
  { value: "V", label: "V" },
  { value: "VI", label: "VI" },
  { value: "VII", label: "VII" },
  { value: "VIII", label: "VIII" },
  { value: "IX", label: "IX" },
  { value: "X", label: "X" },
];

const GENDER_OPTIONS = [
  { value: "", label: "Select Gender" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "Prefer not to say", label: "Prefer not to say" },
];

// ============================================================
// FORMATTING HELPERS
// ============================================================

const formatFullName = (first, middle, last, suffix) => {
  const parts = [];
  if (first) parts.push(first);
  if (middle) parts.push(middle.length === 1 ? `${middle}.` : middle);
  if (last) parts.push(last);
  if (suffix && suffix.toLowerCase() !== "none") parts.push(suffix);
  return parts.join(" ") || "User";
};

const formatLocation = (municipality, province) => {
  const parts = [municipality, province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Not specified";
};

const formatRoleTitle = (role, position) => {
  if (position) {
    return position
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const roleMap = {
    retailer: "Retailer Account",
    miller_manager: "Miller Manager Account",
    warehouse_manager: "Warehouse Manager Account",
    farmer: "Farmer Account",
    account_admin: "Account Administrator",
    system_admin: "System Administrator",
    admin: "Administrator",
    warehouse_employee: "Warehouse Employee",
    supplier_employee: "Supplier Employee",
  };
  const key = String(role || "").toLowerCase();
  if (roleMap[key]) {
    return roleMap[key];
  }
  if (!role) return "User Account";
  return (
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) + " Account"
  );
};

const getInitials = (name) => {
  if (!name) return "U";
  const clean = String(name).trim();
  const letters = clean
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]);
  if (letters.length === 0) return "U";
  if (letters.length === 1) return letters[0].toUpperCase();
  return (letters[0] + letters[letters.length - 1]).toUpperCase();
};

const parsePhoneDigits = (num) => {
  if (!num) return "";
  let clean = String(num).replace(/\D/g, "");
  if (clean.startsWith("63") && clean.length === 12) clean = clean.slice(2);
  if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
  if (clean.length > 10) clean = clean.slice(0, 10);
  return clean;
};

const formatPhoneNumberDisplay = (num) => {
  if (!num || num === "—" || num === "No contact number") return num || "No contact number";
  const digits = parsePhoneDigits(num);
  if (digits.length === 10) {
    return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return num;
};

// ============================================================
// KEYDOWN RESTRICTION HELPERS
// ============================================================

const isControlKey = (e) => {
  return (
    e.key === "Backspace" ||
    e.key === "Delete" ||
    e.key === "Tab" ||
    e.key === "Enter" ||
    e.key === "Escape" ||
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowUp" ||
    e.key === "ArrowDown" ||
    e.key === "Home" ||
    e.key === "End" ||
    e.ctrlKey ||
    e.metaKey
  );
};

// Allow letters and space only (First Name, Last Name)
const handleLettersOnlyKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (!/^[A-Za-zÀ-ÿÑñ\s]$/.test(e.key)) {
    e.preventDefault();
  }
};

// Letters only, no space (Middle Initial)
const handleLettersNoSpaceKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (!/^[A-Za-zÀ-ÿÑñ]$/.test(e.key)) {
    e.preventDefault();
  }
};

// Numbers only (Postal Code)
const handleNumbersOnlyKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

// Phone number: Digits only, first digit must be 9
const handlePhoneKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
    return;
  }
  const input = e.target;
  if ((input.selectionStart === 0 || !input.value) && e.key !== "9") {
    e.preventDefault();
  }
};

// Street Address: letters, numbers, spaces, punctuation
const handleStreetAddressKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (!/^[A-Za-z0-9À-ÿÑñ\s#.,\-/]$/.test(e.key)) {
    e.preventDefault();
  }
};

// Email: disallow spaces
const handleEmailKeyDown = (e) => {
  if (isControlKey(e)) return;
  if (e.key === " " || /[\s]/.test(e.key)) {
    e.preventDefault();
  }
};

// ============================================================
// VALIDATION HELPERS
// ============================================================

const validatePersonal = (data) => {
  const errors = {};
  const fn = String(data.firstName || "").trim();
  const ln = String(data.lastName || "").trim();
  const mi = String(data.middleInitial || "").trim();

  if (!fn) {
    errors.firstName = "First name is required.";
  } else if (fn.length < 2) {
    errors.firstName = "First name must contain at least 2 characters.";
  } else if (!/^[A-Za-zÀ-ÿÑñ\s]+$/.test(fn)) {
    errors.firstName = "Numbers and special characters are not accepted.";
  }

  if (!ln) {
    errors.lastName = "Last name is required.";
  } else if (ln.length < 2) {
    errors.lastName = "Last name must contain at least 2 characters.";
  } else if (!/^[A-Za-zÀ-ÿÑñ\s]+$/.test(ln)) {
    errors.lastName = "Numbers and special characters are not accepted.";
  }

  if (mi && !/^[A-Za-zÀ-ÿÑñ]{1,2}$/.test(mi)) {
    errors.middleInitial = "Middle initial must be 1-2 letters.";
  }

  return errors;
};

const validateAddress = (data) => {
  const errors = {};
  const prov = String(data.province || "").trim();
  const mun = String(data.municipality || "").trim();
  const pc = String(data.postalCode || "").replace(/\D/g, "");
  const brgy = String(data.barangay || "").trim();
  const street = String(data.streetAddress || "").trim();

  if (!prov) {
    errors.province = "Province is required.";
  } else if (prov.length < 2) {
    errors.province = "Province must contain at least 2 characters.";
  }

  if (!mun) {
    errors.municipality = "Municipality / City is required.";
  } else if (mun.length < 2) {
    errors.municipality = "Municipality / City must contain at least 2 characters.";
  }

  if (!pc) {
    errors.postalCode = "Postal code is required.";
  } else if (pc.length < 4) {
    errors.postalCode = `${4 - pc.length} more digit${4 - pc.length !== 1 ? "s" : ""} needed (4 digits required).`;
  }

  if (!brgy) {
    errors.barangay = "Barangay is required.";
  } else if (brgy.length < 2) {
    errors.barangay = "Barangay must contain at least 2 characters.";
  }

  if (!street) {
    errors.streetAddress = "Street address is required.";
  } else if (street.length < 5) {
    errors.streetAddress = "Street address must contain at least 5 characters.";
  }

  return errors;
};

const validateEmail = (val) => {
  const trimmed = String(val || "").trim();
  if (!trimmed) {
    return "Email address is required.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address (e.g. user@example.com).";
  }
  return "";
};

const validatePhone = (val) => {
  const digits = parsePhoneDigits(val);
  if (!digits) {
    return "Phone number is required.";
  }
  if (!digits.startsWith("9")) {
    return "Phone number must start with 9.";
  }
  if (digits.length < 10) {
    return `${10 - digits.length} more digit${10 - digits.length !== 1 ? "s" : ""} needed (10 digits required).`;
  }
  return "";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function UserAccountProfile() {
  const navigate = useNavigate();
  const { request } = useApi();
  const { user: authUser } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  // Philippine Address Hook (from Complete Profile)
  const address = usePhilippineAddress();
  const [addressSeed, setAddressSeed] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Left Card State
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "",
    location: "",
    verified: true,
  });

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    middleInitial: "",
    lastName: "",
    suffix: "",
    gender: "",
  });
  const [tempPersonal, setTempPersonal] = useState({ ...personalInfo });
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalErrors, setPersonalErrors] = useState({});
  const [personalTouched, setPersonalTouched] = useState({});

  // Address Info State
  const [addressInfo, setAddressInfo] = useState({
    province: "",
    municipality: "",
    postalCode: "",
    barangay: "",
    streetAddress: "",
  });
  const [tempStreetAddress, setTempStreetAddress] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressErrors, setAddressErrors] = useState({});
  const [addressTouched, setAddressTouched] = useState({});

  // Account & Security State
  const [accountSecurity, setAccountSecurity] = useState({
    email: "",
    username: "",
    contactNumber: "",
    password: "••••••••••••",
  });

  // Inline editing states for Account & Security
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // ============================================================
  // ADDRESS SEED HYDRATION (MATCHING COMPLETE PROFILE)
  // ============================================================

  // Province hydration
  useEffect(() => {
    if (!addressSeed?.province || address.province) return;
    if (address.provinceOptions.length === 0 && address.loading.provinces) return;

    if (address.provinceOptions.includes(addressSeed.province)) {
      address.selectProvince(addressSeed.province);
    }
  }, [addressSeed, address.province, address.provinceOptions, address.loading.provinces]);

  // Municipality hydration
  useEffect(() => {
    if (!addressSeed?.municipality || !address.province || address.municipality) return;
    if (address.municipalityOptions.length === 0 && address.loading.municipalities) return;

    if (address.municipalityOptions.includes(addressSeed.municipality)) {
      address.selectMunicipality(addressSeed.municipality);
    }
  }, [addressSeed, address.province, address.municipality, address.municipalityOptions, address.loading.municipalities]);

  // Barangay & Postal Code hydration
  useEffect(() => {
    if (!addressSeed?.barangay || !address.municipality || address.barangay) return;
    if (address.barangayOptions.length === 0 && address.loading.barangays) return;

    if (address.barangayOptions.includes(addressSeed.barangay)) {
      address.selectBarangay(addressSeed.barangay);
      if (addressSeed.postalCode) {
        address.updatePostalCode(addressSeed.postalCode);
      }
    }
  }, [addressSeed, address.municipality, address.barangay, address.barangayOptions, address.loading.barangays]);

  // ============================================================
  // POPULATE USER DATA
  // ============================================================

  const populateUserData = useCallback((userData) => {
    if (!userData) return;

    const firstName = userData.first_name || "";
    const middleInitial = userData.middle_initial || "";
    const lastName = userData.last_name || "";
    const suffix = userData.suffix || "";
    const gender = userData.gender || "";

    const province = userData.province || "";
    const municipality = userData.municipality || "";
    const postalCode = userData.postal_code || "";
    const barangay = userData.barangay || "";
    const streetAddress = userData.street_address || "";

    const email = userData.email || "";
    const username = userData.username || "";
    const contactNumber = userData.contact_number || "";
    const role = userData.role || authUser?.role || "";
    const position = userData.position || authUser?.position || "";
    const fullName = formatFullName(firstName, middleInitial, lastName, suffix);
    const location = formatLocation(municipality, province);

    setProfile({
      fullName,
      email: email || "No email provided",
      phone: contactNumber || "No contact number",
      role: formatRoleTitle(role, position),
      location,
      verified: String(userData.status || "active").toLowerCase() === "active",
    });

    setPersonalInfo({
      firstName,
      middleInitial,
      lastName,
      suffix,
      gender,
    });
    setTempPersonal({
      firstName,
      middleInitial,
      lastName,
      suffix,
      gender,
    });

    setAddressInfo({
      province,
      municipality,
      postalCode,
      barangay,
      streetAddress,
    });
    setTempStreetAddress(streetAddress);

    // Seed address hook
    if (province) {
      setAddressSeed({
        province,
        municipality,
        barangay,
        postalCode,
      });
      setManualProvince(province);
      setManualMunicipality(municipality);
      setManualBarangay(barangay);
      setManualPostalCode(postalCode);
    }

    setAccountSecurity({
      email: email || "—",
      username: username || "—",
      contactNumber: contactNumber || "—",
      password: "••••••••••••",
    });
  }, [authUser]);

  // ============================================================
  // FETCH USER PROFILE FROM BACKEND
  // ============================================================

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await request("/auth/profile");
      if (res && res.user) {
        populateUserData(res.user);
      } else if (res && res.ok === false) {
        throw new Error(res.error || "Failed to load user profile.");
      } else if (authUser) {
        populateUserData(authUser);
      } else {
        throw new Error("User account information is unavailable.");
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      if (authUser) {
        populateUserData(authUser);
        setFetchError(null);
      } else {
        setFetchError(err.message || "Unable to load profile data. Please check your connection.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [request, populateUserData, authUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ============================================================
  // PERSONAL INFO HANDLERS WITH REAL-TIME VALIDATION
  // ============================================================

  const handleStartEditPersonal = () => {
    setTempPersonal({ ...personalInfo });
    setPersonalErrors(validatePersonal(personalInfo));
    setPersonalTouched({});
    setIsEditingPersonal(true);
  };

  const handleCancelPersonal = () => {
    setTempPersonal({ ...personalInfo });
    setPersonalErrors({});
    setPersonalTouched({});
    setIsEditingPersonal(false);
  };

  const handlePersonalChange = (field, value) => {
    const updated = { ...tempPersonal, [field]: value };
    setTempPersonal(updated);
    setPersonalTouched((prev) => ({ ...prev, [field]: true }));
    setPersonalErrors(validatePersonal(updated));
  };

  const handleSavePersonal = async () => {
    const errors = validatePersonal(tempPersonal);
    setPersonalErrors(errors);
    setPersonalTouched({
      firstName: true,
      middleInitial: true,
      lastName: true,
      suffix: true,
      gender: true,
    });

    if (Object.keys(errors).length > 0) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please correct the highlighted errors before saving.",
      });
      return;
    }

    setIsSavingPersonal(true);
    try {
      const payload = {
        firstName: tempPersonal.firstName.trim(),
        middleInitial: tempPersonal.middleInitial.trim(),
        lastName: tempPersonal.lastName.trim(),
        suffix: tempPersonal.suffix.trim(),
        gender: tempPersonal.gender.trim(),
      };

      const res = await request("/auth/profile", {
        method: "PATCH",
        body: payload,
      });

      if (res && res.ok === false) {
        throw new Error(res.error || "Failed to update personal information.");
      }

      const updatedUser = res?.user || {
        ...authUser,
        first_name: payload.firstName,
        middle_initial: payload.middleInitial,
        last_name: payload.lastName,
        suffix: payload.suffix,
        gender: payload.gender,
      };

      setPersonalInfo({ ...tempPersonal });
      setProfile((prev) => ({
        ...prev,
        fullName: formatFullName(
          payload.firstName,
          payload.middleInitial,
          payload.lastName,
          payload.suffix
        ),
      }));

      // Update localStorage session cache
      try {
        const storedUser = JSON.parse(localStorage.getItem("grainrise_user") || "{}");
        localStorage.setItem(
          "grainrise_user",
          JSON.stringify({
            ...storedUser,
            first_name: updatedUser.first_name,
            middle_initial: updatedUser.middle_initial,
            last_name: updatedUser.last_name,
            suffix: updatedUser.suffix,
            gender: updatedUser.gender,
          })
        );
      } catch { }

      showToast({
        type: "success",
        title: "Profile Updated",
        message: "Personal information saved successfully.",
      });
      setIsEditingPersonal(false);
    } catch (err) {
      console.error("Failed to save personal info:", err);
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to save personal information.",
      });
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // ============================================================
  // ADDRESS INFO HANDLERS WITH PHILIPPINE ADDRESS API
  // ============================================================

  const currentProvince = address.province;
  const currentMunicipality = address.municipality;
  const currentBarangay = address.barangay;
  const currentPostalCode = address.postalCode;

  const handleStartEditAddress = () => {
    if (addressInfo.province) {
      setAddressSeed({
        province: addressInfo.province,
        municipality: addressInfo.municipality,
        barangay: addressInfo.barangay,
        postalCode: addressInfo.postalCode,
      });
      if (!address.province && addressInfo.province) {
        address.selectProvince(addressInfo.province);
      }
    }
    setTempStreetAddress(addressInfo.streetAddress || "");
    setAddressTouched({});
    setIsEditingAddress(true);
  };

  const handleCancelAddress = () => {
    setAddressErrors({});
    setAddressTouched({});
    setIsEditingAddress(false);
  };

  const handleProvinceChange = async (val) => {
    setAddressTouched((prev) => ({ ...prev, province: true }));
    await address.selectProvince(val);
  };

  const handleMunicipalityChange = async (val) => {
    setAddressTouched((prev) => ({ ...prev, municipality: true }));
    await address.selectMunicipality(val);
  };

  const handleBarangayChange = (val) => {
    setAddressTouched((prev) => ({ ...prev, barangay: true }));
    address.selectBarangay(val);
  };

  const handlePostalCodeChange = (e) => {
    setAddressTouched((prev) => ({ ...prev, postalCode: true }));
    const val = String(e.target.value || "").replace(/\D/g, "").slice(0, 4);
    address.updatePostalCode(val);
  };

  const handleSaveAddress = async () => {
    const provVal = currentProvince.trim();
    const munVal = currentMunicipality.trim();
    const brgyVal = currentBarangay.trim();
    const pcVal = currentPostalCode.trim();
    const streetVal = tempStreetAddress.trim();

    const dataToValidate = {
      province: provVal,
      municipality: munVal,
      postalCode: pcVal,
      barangay: brgyVal,
      streetAddress: streetVal,
    };

    const errors = validateAddress(dataToValidate);
    setAddressErrors(errors);
    setAddressTouched({
      province: true,
      municipality: true,
      postalCode: true,
      barangay: true,
      streetAddress: true,
    });

    if (Object.keys(errors).length > 0) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: "Please complete all required address fields before saving.",
      });
      return;
    }

    setIsSavingAddress(true);
    try {
      const payload = {
        province: provVal,
        municipality: munVal,
        postalCode: pcVal,
        barangay: brgyVal,
        streetAddress: streetVal,
      };

      const res = await request("/auth/profile", {
        method: "PATCH",
        body: payload,
      });

      if (res && res.ok === false) {
        throw new Error(res.error || "Failed to update address information.");
      }

      setAddressInfo({
        province: provVal,
        municipality: munVal,
        postalCode: pcVal,
        barangay: brgyVal,
        streetAddress: streetVal,
      });

      setProfile((prev) => ({
        ...prev,
        location: formatLocation(munVal, provVal),
      }));

      // Update localStorage session cache
      try {
        const storedUser = JSON.parse(localStorage.getItem("grainrise_user") || "{}");
        localStorage.setItem(
          "grainrise_user",
          JSON.stringify({
            ...storedUser,
            province: provVal,
            municipality: munVal,
            postal_code: pcVal,
            barangay: brgyVal,
            street_address: streetVal,
          })
        );
      } catch { }

      showToast({
        type: "success",
        title: "Address Updated",
        message: "Address information saved successfully.",
      });
      setIsEditingAddress(false);
    } catch (err) {
      console.error("Failed to save address:", err);
      showToast({
        type: "error",
        title: "Update Failed",
        message: err.message || "Failed to save address information.",
      });
    } finally {
      setIsSavingAddress(false);
    }
  };

  // ============================================================
  // EMAIL HANDLERS WITH REAL-TIME VALIDATION
  // ============================================================

  const handleStartEditEmail = () => {
    const current = accountSecurity.email === "—" ? "" : accountSecurity.email;
    setTempEmail(current);
    setEmailError(validateEmail(current));
    setIsEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setTempEmail("");
    setEmailError("");
    setIsEditingEmail(false);
  };

  const handleEmailChangeInternal = (val) => {
    const clean = val.replace(/\s/g, "").slice(0, 100);
    setTempEmail(clean);
    setEmailError(validateEmail(clean));
  };

  const handleSaveEmail = () => {
    const err = validateEmail(tempEmail);
    setEmailError(err);
    if (err) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: err,
      });
      return;
    }

    setAccountSecurity((prev) => ({ ...prev, email: tempEmail.trim() }));
    setProfile((prev) => ({ ...prev, email: tempEmail.trim() }));

    try {
      const stored = JSON.parse(localStorage.getItem("grainrise_user") || "{}");
      localStorage.setItem("grainrise_user", JSON.stringify({ ...stored, email: tempEmail.trim() }));
    } catch { }

    showToast({
      type: "success",
      title: "Email Updated",
      message: "Email address updated successfully.",
    });
    setIsEditingEmail(false);
  };

  // ============================================================
  // PHONE HANDLERS WITH REAL-TIME VALIDATION
  // ============================================================

  const handleStartEditPhone = () => {
    const currentDigits = parsePhoneDigits(accountSecurity.contactNumber);
    setTempPhone(currentDigits);
    setPhoneError(validatePhone(currentDigits));
    setIsEditingPhone(true);
  };

  const handleCancelEditPhone = () => {
    setTempPhone("");
    setPhoneError("");
    setIsEditingPhone(false);
  };

  const handlePhoneChangeInternal = (val) => {
    let digits = val.replace(/\D/g, "");
    while (digits.length > 0 && digits[0] !== "9") {
      digits = digits.slice(1);
    }
    digits = digits.slice(0, 10);
    setTempPhone(digits);
    setPhoneError(validatePhone(digits));
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
    setTempPhone(pasted);
    setPhoneError(validatePhone(pasted));
  };

  const handleSavePhone = () => {
    const err = validatePhone(tempPhone);
    setPhoneError(err);
    if (err) {
      showToast({
        type: "error",
        title: "Validation Error",
        message: err,
      });
      return;
    }

    const formatted = `+63 ${tempPhone.slice(0, 3)} ${tempPhone.slice(3, 6)} ${tempPhone.slice(6)}`;
    setAccountSecurity((prev) => ({ ...prev, contactNumber: formatted }));
    setProfile((prev) => ({ ...prev, phone: formatted }));

    try {
      const stored = JSON.parse(localStorage.getItem("grainrise_user") || "{}");
      localStorage.setItem(
        "grainrise_user",
        JSON.stringify({ ...stored, contact_number: `0${tempPhone}` })
      );
    } catch { }

    showToast({
      type: "success",
      title: "Phone Number Updated",
      message: "Phone number updated successfully.",
    });
    setIsEditingPhone(false);
  };

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Account" }, { label: "Profile & Settings" }]} />
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Profile
          </h2>
          <p className="text-sm text-slate-500">
            Manage your personal details, address information, and account credentials.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-16 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading your profile details...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (fetchError && !profile.fullName) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <Toast toasts={toasts} removeToast={removeToast} />
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Account" }, { label: "Profile & Settings" }]} />
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            User Profile
          </h2>
          <p className="text-sm text-slate-500">
            Manage your personal details, address information, and account credentials.
          </p>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-10 shadow-sm text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Unable to Load Profile</h3>
            <p className="text-xs text-slate-500 mt-1">{fetchError}</p>
          </div>
          <button
            onClick={fetchProfile}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow transition cursor-pointer"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN COMPONENT RENDER
  // ============================================================

  const hasPersonalErrors = Object.keys(personalErrors).length > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Account" }, { label: "Profile & Settings" }]} />
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          User Profile
        </h2>
        <p className="text-sm text-slate-500">
          Manage your personal details, address information, and account credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── 1ST COLUMN: Left Profile Summary Card ─────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-3xl border-2 border-emerald-500">
              {getInitials(profile.fullName)}
            </div>
            <button
              type="button"
              onClick={() =>
                showToast({
                  type: "info",
                  title: "Profile Picture",
                  message: "Profile picture upload will be available in an upcoming release.",
                })
              }
              title="Change profile picture"
              className="absolute bottom-0 right-0 p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow transition cursor-pointer"
            >
              <Camera size={14} />
            </button>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-lg">{profile.fullName || "User"}</h3>
            <p className="text-xs text-gray-500 font-medium">{profile.role}</p>
          </div>

          <div className="w-full pt-4 border-t border-gray-100 space-y-2.5 text-xs text-gray-600 text-left">
            <div className="flex items-center gap-2.5">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <span>{formatPhoneNumberDisplay(profile.phone)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span>{profile.location}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Shield size={14} className="text-gray-400 shrink-0" />
              <span className="text-emerald-700 font-semibold">
                {profile.verified ? "Account Verified" : "Account Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2ND COLUMN: Right Side Form Sections ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* ── Personal Information Section ───────────────────────────────── */}
          <div
            className={`border rounded-xl p-6 shadow-sm space-y-4 transition-all duration-200 ${isEditingPersonal
                ? "bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200"
              }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Personal Information</h3>
                  <p className="text-xs text-gray-500">Review and update your personal details.</p>
                </div>
                {isEditingPersonal && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Editing Mode
                  </span>
                )}
              </div>

              {isEditingPersonal ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSavingPersonal}
                    onClick={handleCancelPersonal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingPersonal || hasPersonalErrors}
                    onClick={handleSavePersonal}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingPersonal ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditPersonal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Edit3 size={14} /> Edit Information
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* First Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className={`block text-xs font-semibold ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"
                      }`}
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  {isEditingPersonal && (
                    <span className="text-[10px] text-gray-400">
                      {tempPersonal.firstName.length}/50
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={50}
                  disabled={!isEditingPersonal || isSavingPersonal}
                  value={isEditingPersonal ? tempPersonal.firstName : personalInfo.firstName}
                  onKeyDown={handleLettersOnlyKeyDown}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^A-Za-zÀ-ÿÑñ\s]/g, "").slice(0, 50);
                    handlePersonalChange("firstName", clean);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const clean = e.clipboardData
                      .getData("text/plain")
                      .replace(/[^A-Za-zÀ-ÿÑñ\s]/g, "")
                      .slice(0, 50);
                    handlePersonalChange("firstName", clean);
                  }}
                  placeholder="Letters only"
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${isEditingPersonal
                      ? personalTouched.firstName && personalErrors.firstName
                        ? "bg-white border-2 border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                        : "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                    }`}
                />
                {isEditingPersonal && personalTouched.firstName && personalErrors.firstName && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                    <AlertCircle size={12} className="shrink-0" /> {personalErrors.firstName}
                  </p>
                )}
                {isEditingPersonal &&
                  personalTouched.firstName &&
                  !personalErrors.firstName &&
                  tempPersonal.firstName && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid
                    </p>
                  )}
              </div>

              {/* Middle Initial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className={`block text-xs font-semibold ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"
                      }`}
                  >
                    Middle Initial
                  </label>
                  {isEditingPersonal && (
                    <span className="text-[10px] text-gray-400">
                      {tempPersonal.middleInitial.length}/2
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={2}
                  disabled={!isEditingPersonal || isSavingPersonal}
                  value={isEditingPersonal ? tempPersonal.middleInitial : personalInfo.middleInitial}
                  onKeyDown={handleLettersNoSpaceKeyDown}
                  onChange={(e) => {
                    const clean = e.target.value
                      .replace(/[^A-Za-zÀ-ÿÑñ]/g, "")
                      .toUpperCase()
                      .slice(0, 2);
                    handlePersonalChange("middleInitial", clean);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const clean = e.clipboardData
                      .getData("text/plain")
                      .replace(/[^A-Za-zÀ-ÿÑñ]/g, "")
                      .toUpperCase()
                      .slice(0, 2);
                    handlePersonalChange("middleInitial", clean);
                  }}
                  placeholder="M.I."
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${isEditingPersonal
                      ? personalTouched.middleInitial && personalErrors.middleInitial
                        ? "bg-white border-2 border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                        : "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                    }`}
                />
                {isEditingPersonal &&
                  personalTouched.middleInitial &&
                  personalErrors.middleInitial && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {personalErrors.middleInitial}
                    </p>
                  )}
              </div>

              {/* Last Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    className={`block text-xs font-semibold ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"
                      }`}
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  {isEditingPersonal && (
                    <span className="text-[10px] text-gray-400">
                      {tempPersonal.lastName.length}/50
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={50}
                  disabled={!isEditingPersonal || isSavingPersonal}
                  value={isEditingPersonal ? tempPersonal.lastName : personalInfo.lastName}
                  onKeyDown={handleLettersOnlyKeyDown}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^A-Za-zÀ-ÿÑñ\s]/g, "").slice(0, 50);
                    handlePersonalChange("lastName", clean);
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const clean = e.clipboardData
                      .getData("text/plain")
                      .replace(/[^A-Za-zÀ-ÿÑñ\s]/g, "")
                      .slice(0, 50);
                    handlePersonalChange("lastName", clean);
                  }}
                  placeholder="Letters only"
                  className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${isEditingPersonal
                      ? personalTouched.lastName && personalErrors.lastName
                        ? "bg-white border-2 border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                        : "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      : "bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                    }`}
                />
                {isEditingPersonal && personalTouched.lastName && personalErrors.lastName && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                    <AlertCircle size={12} className="shrink-0" /> {personalErrors.lastName}
                  </p>
                )}
                {isEditingPersonal &&
                  personalTouched.lastName &&
                  !personalErrors.lastName &&
                  tempPersonal.lastName && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Check size={12} className="shrink-0" /> Valid
                    </p>
                  )}
              </div>

              {/* Suffix (Dropdown) */}
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"
                    }`}
                >
                  Suffix
                </label>
                {isEditingPersonal ? (
                  <div className="relative">
                    <select
                      disabled={isSavingPersonal}
                      value={tempPersonal.suffix || ""}
                      onChange={(e) => handlePersonalChange("suffix", e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200 pr-9 cursor-pointer"
                    >
                      {SUFFIX_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={personalInfo.suffix || "None"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                )}
              </div>

              {/* Gender (Dropdown) */}
              <div>
                <label
                  className={`block text-xs font-semibold mb-1 ${isEditingPersonal ? "text-emerald-900" : "text-gray-500"
                    }`}
                >
                  Gender
                </label>
                {isEditingPersonal ? (
                  <div className="relative">
                    <select
                      disabled={isSavingPersonal}
                      value={tempPersonal.gender || ""}
                      onChange={(e) => handlePersonalChange("gender", e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200 pr-9 cursor-pointer"
                    >
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={personalInfo.gender || "Not specified"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Address Information Section (Philippine PSGC Location API) ─── */}
          <div
            className={`border rounded-xl p-6 shadow-sm space-y-4 transition-all duration-200 ${isEditingAddress
                ? "bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200"
              }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Address Information</h3>
                  <p className="text-xs text-gray-500">
                    Review and update your address.
                  </p>
                </div>
                {isEditingAddress && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Editing Mode
                  </span>
                )}
              </div>

              {isEditingAddress ? (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={isSavingAddress}
                    onClick={handleCancelAddress}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <X size={14} /> Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingAddress}
                    onClick={handleSaveAddress}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingAddress ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditAddress}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                >
                  <Edit3 size={14} /> Edit Address
                </button>
              )}
            </div>

            {/* View Mode */}
            {!isEditingAddress ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Province</label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.province || "—"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Municipality / City</label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.municipality || "—"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Postal Code</label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.postalCode || "—"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Barangay</label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.barangay || "—"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Street Address</label>
                  <input
                    type="text"
                    disabled
                    value={addressInfo.streetAddress || "—"}
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none bg-gray-100/80 border border-transparent text-gray-800 disabled:opacity-90"
                  />
                </div>
              </div>
            ) : (
              /* Edit Mode: PSGC Address API Dropdowns */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Province Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <Dropdown
                    label=""
                    placeholder={
                      address.loading.provinces ? "Loading provinces..." : "Select Province"
                    }
                    options={address.provinceOptions}
                    value={address.province}
                    onChange={handleProvinceChange}
                    disabled={address.loading.provinces || isSavingAddress}
                    error={
                      addressTouched.province && addressErrors.province
                        ? addressErrors.province
                        : ""
                    }
                  />
                  {addressTouched.province && addressErrors.province && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {addressErrors.province}
                    </p>
                  )}
                  {address.errors.provinces && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {address.errors.provinces}
                    </p>
                  )}
                </div>

                {/* Municipality / City Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
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
                    disabled={
                      !address.province || address.loading.municipalities || isSavingAddress
                    }
                    error={
                      addressTouched.municipality && addressErrors.municipality
                        ? addressErrors.municipality
                        : ""
                    }
                  />
                  {addressTouched.municipality && addressErrors.municipality && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {addressErrors.municipality}
                    </p>
                  )}
                  {address.errors.municipalities && (
                    <p className="mt-1 text-[11px] text-amber-600">
                      {address.errors.municipalities}
                    </p>
                  )}
                </div>

                {/* Barangay Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
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
                    disabled={
                      !address.municipality || address.loading.barangays || isSavingAddress
                    }
                    error={
                      addressTouched.barangay && addressErrors.barangay
                        ? addressErrors.barangay
                        : ""
                    }
                  />
                  {addressTouched.barangay && addressErrors.barangay && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {addressErrors.barangay}
                    </p>
                  )}
                </div>

                {/* Postal Code (Auto-filled from PSGC, editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-emerald-900">
                      Postal Code <span className="text-red-500">*</span>{" "}
                      <span className="text-gray-400 font-normal lowercase">(auto-filled)</span>
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {address.postalCode.length}/4 digits
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    disabled={isSavingAddress}
                    value={address.postalCode}
                    onKeyDown={handleNumbersOnlyKeyDown}
                    onChange={handlePostalCodeChange}
                    placeholder="4 digits"
                    className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${addressTouched.postalCode && addressErrors.postalCode
                        ? "bg-white border-2 border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                        : "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      }`}
                  />
                  {addressTouched.postalCode && addressErrors.postalCode && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {addressErrors.postalCode}
                    </p>
                  )}
                </div>

                {/* Street Address */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-emerald-900">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {tempStreetAddress.length}/100
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    disabled={isSavingAddress}
                    value={tempStreetAddress}
                    onKeyDown={handleStreetAddressKeyDown}
                    onChange={(e) => {
                      const clean = e.target.value
                        .replace(/[^A-Za-z0-9À-ÿÑñ\s#.,\-/]/g, "")
                        .slice(0, 100);
                      setTempStreetAddress(clean);
                      setAddressTouched((prev) => ({ ...prev, streetAddress: true }));
                    }}
                    placeholder="Street Address, Building, House No."
                    className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition ${addressTouched.streetAddress && addressErrors.streetAddress
                        ? "bg-white border-2 border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                        : "bg-white border-2 border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                      }`}
                  />
                  {addressTouched.streetAddress && addressErrors.streetAddress && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-red-600 font-medium">
                      <AlertCircle size={12} className="shrink-0" /> {addressErrors.streetAddress}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Account & Security Section ───────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
            <div className="pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Account &amp; Security</h3>
              <p className="text-xs text-gray-500">Manage your contact information and credentials.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-1">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                {isEditingEmail ? (
                  <div className="space-y-1.5">
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        maxLength={100}
                        autoFocus
                        value={tempEmail}
                        onKeyDown={handleEmailKeyDown}
                        onChange={(e) => handleEmailChangeInternal(e.target.value)}
                        placeholder="user@example.com"
                        className={`w-full px-3.5 py-2.5 rounded-lg text-sm font-semibold outline-none transition bg-white border-2 ${emailError
                            ? "border-red-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-red-200"
                            : "border-emerald-500 text-gray-900 shadow-sm focus:ring-2 focus:ring-emerald-200"
                          }`}
                      />
                    </div>
                    {emailError ? (
                      <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertCircle size={12} className="shrink-0" /> {emailError}
                      </p>
                    ) : tempEmail ? (
                      <p className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <Check size={12} className="shrink-0" /> Valid email format
                      </p>
                    ) : null}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEditEmail}
                        className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 bg-white rounded-md transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(emailError) || !tempEmail}
                        onClick={handleSaveEmail}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Email
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={accountSecurity.email}
                      className="w-full pl-3.5 pr-28 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                    />
                    <div className="absolute right-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                      <button
                        type="button"
                        onClick={handleStartEditEmail}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Username</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={accountSecurity.username}
                    className="w-full pl-3.5 pr-20 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                  />
                  <span className="absolute right-3 text-[11px] font-semibold text-gray-400">
                    Read-only
                  </span>
                </div>
              </div>

              {/* Contact Number (Phone Number) */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                {isEditingPhone ? (
                  <div className="space-y-1.5">
                    <div
                      className={`flex items-center rounded-lg border-2 overflow-hidden transition bg-white shadow-sm ${phoneError
                          ? "border-red-500 focus-within:ring-2 focus-within:ring-red-200"
                          : "border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200"
                        }`}
                    >
                      <span className="px-3 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 border-r border-slate-300 select-none whitespace-nowrap">
                        +63
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        autoFocus
                        value={tempPhone}
                        onKeyDown={handlePhoneKeyDown}
                        onChange={(e) => handlePhoneChangeInternal(e.target.value)}
                        onPaste={handlePhonePaste}
                        placeholder="9XXXXXXXXX"
                        className="w-full px-3 py-2.5 text-sm font-semibold outline-none bg-transparent text-slate-800 placeholder:text-slate-400"
                      />
                      <div className="pr-3 pointer-events-none">
                        {phoneError ? (
                          <AlertCircle size={16} className="text-red-500 shrink-0" />
                        ) : tempPhone.length === 10 ? (
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        ) : null}
                      </div>
                    </div>
                    {phoneError ? (
                      <p className="flex items-center gap-1 text-[11px] text-red-600 font-medium">
                        <AlertCircle size={12} className="shrink-0" /> {phoneError}
                      </p>
                    ) : tempPhone.length === 10 ? (
                      <p className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <Check size={12} className="shrink-0" /> Valid Philippine mobile number (+63{" "}
                        {tempPhone})
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400">
                        10 digits starting with 9 (e.g. 9171234567)
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEditPhone}
                        className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-gray-800 border border-gray-300 bg-white rounded-md transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(phoneError) || tempPhone.length !== 10}
                        onClick={handleSavePhone}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save Phone
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={formatPhoneNumberDisplay(accountSecurity.contactNumber)}
                      className="w-full pl-3.5 pr-28 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none"
                    />
                    <div className="absolute right-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                      <button
                        type="button"
                        onClick={handleStartEditPhone}
                        className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={accountSecurity.password}
                    className="w-full px-3.5 py-2.5 bg-gray-100/80 border border-transparent rounded-lg text-sm font-semibold text-gray-800 outline-none select-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer"
                  >
                    <KeyRound size={14} /> Change Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={(msg) => {
          showToast({
            type: "success",
            title: "Password Updated",
            message: msg || "Your password has been changed successfully.",
          });
        }}
      />
    </div>
  );
}