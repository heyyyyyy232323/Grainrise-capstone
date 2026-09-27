import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Building2,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import CustomGreenButton from "../Components/Minor-Components/CustomGreenButton";
import Footer from "../Components/Minor-Components/CustomFooter";
import Logo from "../assets/Logo.png";
import useApi from "../Components/hooks/useApi";
import useAuth from "../Components/hooks/useAuth";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { request } = useApi();
  const { user, login } = useAuth();

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Personal Info State
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  // Personal Address State
  const [province, setProvince] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [barangay, setBarangay] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Business / Warehouse State
  const [businessName, setBusinessName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [officialContact, setOfficialContact] = useState("");
  const [sameAsPersonal, setSameAsPersonal] = useState(true);
  const [businessProvince, setBusinessProvince] = useState("");
  const [businessMunicipality, setBusinessMunicipality] = useState("");
  const [businessBarangay, setBusinessBarangay] = useState("");
  const [businessStreet, setBusinessStreet] = useState("");
  const [businessPostal, setBusinessPostal] = useState("");

  // Existing documents
  const [existingDocs, setExistingDocs] = useState({});

  // New File Uploads
  const [govIdFile, setGovIdFile] = useState(null);
  const [bizPermitFile, setBizPermitFile] = useState(null);
  const [bizRegFile, setBizRegFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [validIdFile, setValidIdFile] = useState(null);
  const [brgyPermitFile, setBrgyPermitFile] = useState(null);

  const role = user?.role || "";
  const isMiller = role === "miller_manager" || role === "supplier";
  const isWarehouse = role === "warehouse_manager";
  const isRetailer = role === "retailer";

  const roleTitle = isMiller
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

        setFirstName(u.first_name || "");
        setMiddleInitial(u.middle_initial || "");
        setLastName(u.last_name || "");
        setSuffix(u.suffix || "");
        setGender(u.gender || "");
        setContactNumber(u.contact_number || "");

        setProvince(u.province || "");
        setMunicipality(u.municipality || "");
        setBarangay(u.barangay || "");
        setStreetAddress(u.street_address || "");
        setPostalCode(u.postal_code || "");

        if (p) {
          setBusinessName(p.business_name || "");
          setOrganizationName(p.organization_name || "");
          setOfficialEmail(p.official_email || u.email || "");
          setOfficialContact(p.official_contact_number || u.contact_number || "");
          setBusinessProvince(p.province || "");
          setBusinessMunicipality(p.municipality || "");
          setBusinessBarangay(p.barangay || "");
          setBusinessStreet(p.street_address || "");
          setBusinessPostal(p.postal_code || "");
        }

        if (d) {
          setExistingDocs(d);
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!gender) {
      setErrorMessage("Please select your gender.");
      return;
    }

    if (!province || !municipality || !barangay || !streetAddress) {
      setErrorMessage("Please complete all personal address fields (Province, Municipality, Barangay, Street Address).");
      return;
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
      formData.append("contact_number", contactNumber);

      formData.append("province", province);
      formData.append("municipality", municipality);
      formData.append("barangay", barangay);
      formData.append("street_address", streetAddress);
      formData.append("postal_code", postalCode);

      if (isMiller || isWarehouse) {
        formData.append("business_name", businessName);
        formData.append("organization_name", organizationName);
        formData.append("official_email", officialEmail || user?.email || "");
        formData.append("official_contact_number", officialContact || contactNumber);

        if (sameAsPersonal) {
          formData.append("business_province", province);
          formData.append("business_municipality", municipality);
          formData.append("business_barangay", barangay);
          formData.append("business_street_address", streetAddress);
          formData.append("business_postal_code", postalCode);
        } else {
          formData.append("business_province", businessProvince);
          formData.append("business_municipality", businessMunicipality);
          formData.append("business_barangay", businessBarangay);
          formData.append("business_street_address", businessStreet);
          formData.append("business_postal_code", businessPostal);
        }

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

      setSuccessMessage("Profile completed successfully! Redirecting to your dashboard...");

      // Update local storage session
      if (user) {
        const updatedUser = {
          ...user,
          profile_incomplete: false,
          must_change_password: false,
          province,
          gender,
        };
        const tokenVal = localStorage.getItem("grainrise_token");
        if (tokenVal) {
          login(tokenVal, updatedUser);
        }
      }

      setTimeout(() => {
        const dest = roleRoutes[role] || "/dashboard-preview";
        navigate(dest, { replace: true });
      }, 1000);
    } catch (err) {
      setErrorMessage(err?.message || "Failed to update profile. Please check the provided information.");
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
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={Logo} alt="GrainRise" className="h-9 w-auto" />
            <span className="text-lg font-bold tracking-tight text-slate-800">GrainRise</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-[#08511f] border border-emerald-200">
              {roleTitle}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#08511f] to-emerald-700 p-6 sm:p-8 text-white mb-8 shadow-sm">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-emerald-100 mb-3 backdrop-blur-sm">
              <ShieldCheck size={14} />
              Setup Verification &bull; Final Step
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Complete Your Partner Profile</h1>
            <p className="mt-2 text-sm sm:text-base text-emerald-100 leading-relaxed max-w-xl">
              Please review and complete your personal, address, and role-specific details before accessing your full dashboard.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700 flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Personal Information */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#08511f]">
                  <User size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-500">Your legal identification details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Middle Initial
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={middleInitial}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    placeholder="e.g. M."
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Suffix
                  </label>
                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    placeholder="e.g. Jr., III"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none bg-white"
                  >
                    <option value="">Select Gender</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Address Information */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#08511f]">
                  <MapPin size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Personal Address</h2>
                  <p className="text-xs text-slate-500">Your permanent or residential location</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    required
                    placeholder="e.g. Isabela, Nueva Ecija"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Municipality / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    required
                    placeholder="e.g. Santiago, Cabanatuan"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Barangay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    required
                    placeholder="e.g. San Roque, Poblacion"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 3311"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    required
                    placeholder="House/Unit #, Street name, Subdivision"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Business Information (For Miller & Warehouse) */}
            {(isMiller || isWarehouse) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#08511f]">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {isMiller ? "Milling Company Details" : "Warehouse Facility Details"}
                    </h2>
                    <p className="text-xs text-slate-500">Official business registration details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Organization / Parent Entity
                    </label>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={officialEmail}
                      onChange={(e) => setOfficialEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Official Contact Number
                    </label>
                    <input
                      type="text"
                      value={officialContact}
                      onChange={(e) => setOfficialContact(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] focus:ring-1 focus:ring-[#08511f] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={sameAsPersonal}
                        onChange={(e) => setSameAsPersonal(e.target.checked)}
                        className="rounded border-slate-300 text-[#08511f] focus:ring-[#08511f]"
                      />
                      <span>Business address is the same as my personal address</span>
                    </label>
                  </div>

                  {!sameAsPersonal && (
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Business Province
                        </label>
                        <input
                          type="text"
                          value={businessProvince}
                          onChange={(e) => setBusinessProvince(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Business City / Municipality
                        </label>
                        <input
                          type="text"
                          value={businessMunicipality}
                          onChange={(e) => setBusinessMunicipality(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Business Barangay
                        </label>
                        <input
                          type="text"
                          value={businessBarangay}
                          onChange={(e) => setBusinessBarangay(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Business Street Address
                        </label>
                        <input
                          type="text"
                          value={businessStreet}
                          onChange={(e) => setBusinessStreet(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#08511f] outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 4: Document Verification */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4 mb-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-[#08511f]">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Verification Documents</h2>
                  <p className="text-xs text-slate-500">Upload any remaining required business documents</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(isMiller || isWarehouse) && (
                  <>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Government-Issued ID</p>
                      <p className="text-[11px] text-slate-400 mb-3">Passport, Driver's License, or UMID</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setGovIdFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {existingDocs?.government_issued_id && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Previously uploaded
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Mayor's / Business Permit</p>
                      <p className="text-[11px] text-slate-400 mb-3">Current year municipal permit</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBizPermitFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {existingDocs?.business_permit && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Previously uploaded
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Business Registration (DTI/SEC)</p>
                      <p className="text-[11px] text-slate-400 mb-3">Certificate of Registration</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBizRegFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {existingDocs?.business_registration && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Registered from inquiry verification
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">
                        {isMiller ? "Milling License / Accreditation" : "Warehouse License / Permit"}
                      </p>
                      <p className="text-[11px] text-slate-400 mb-3">Industry license or permit</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setLicenseFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {(existingDocs?.milling_license || existingDocs?.warehouse_license) && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Previously uploaded
                        </p>
                      )}
                    </div>
                  </>
                )}

                {isRetailer && (
                  <>
                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Valid Identification Document</p>
                      <p className="text-[11px] text-slate-400 mb-3">Government issued ID or Passport</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setValidIdFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {existingDocs?.valid_id && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Registered from inquiry verification
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <p className="text-xs font-bold text-slate-700 mb-1">Barangay Permit / Clearances</p>
                      <p className="text-[11px] text-slate-400 mb-3">Barangay Business Clearance</p>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setBrgyPermitFile(e.target.files[0])}
                        className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#08511f] hover:file:bg-emerald-100"
                      />
                      {existingDocs?.barangay_permit && (
                        <p className="mt-2 text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                          <Check size={12} /> Previously uploaded
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Submission */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <CustomGreenButton
                text={isSubmitting ? "Saving & Finalizing..." : "Complete Setup & Access Dashboard"}
                disabled={isSubmitting}
                className="px-6 py-2.5 !rounded-xl"
                onClick={handleSubmit}
              />
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CompleteProfile;
