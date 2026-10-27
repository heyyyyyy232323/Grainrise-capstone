import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Building2,
  X,
  CheckCircle2,
  MapPin,
  Mail,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";

const INITIAL_FORM = {
  business_name: "",
  organization_name: "",
  street_address: "",
  official_email: "",
  official_contact_number: "",
};

const INITIAL_MANUAL_ADDRESS = {
  province: "",
  municipality: "",
  barangay: "",
  postal_code: "",
};

export default function BranchManagement() {
  const navigate = useNavigate();
  const { request } = useApi();
  const address = usePhilippineAddress();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Form State for Register Modal
  const [form, setForm] = useState(INITIAL_FORM);
  const [isManualAddress, setIsManualAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState(INITIAL_MANUAL_ADDRESS);
  const [businessDocumentFile, setBusinessDocumentFile] = useState(null);
  const [mayorsPermitFile, setMayorsPermitFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request("/warehouse/branches/", { method: "GET" });
      const rawList = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(rawList)) {
        const mapped = rawList.map((item) => {
          const addressParts = [
            item.street_address,
            item.barangay,
            item.municipality,
            item.province,
            item.postal_code,
          ].filter(Boolean);

          return {
            id: item.warehouse_profile_id,
            warehouse_profile_id: item.warehouse_profile_id,
            name: item.business_name || item.organization_name || "Warehouse Branch",
            business_name: item.business_name,
            organization_name: item.organization_name,
            address:
              addressParts.length > 0
                ? addressParts.join(", ")
                : "No address specified",
            street_address: item.street_address,
            barangay: item.barangay,
            municipality: item.municipality,
            province: item.province,
            postal_code: item.postal_code,
            email: item.official_email || "",
            official_email: item.official_email,
            phone: item.official_contact_number || "",
            official_contact_number: item.official_contact_number,
            employees: item.employee_count ?? 0,
            employee_count: item.employee_count ?? 0,
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
        });
        setBranches(mapped);
      }
    } catch (err) {
      console.error("Failed to load warehouse branches:", err);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Filter logic for search
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesSearch =
          (b.name && b.name.toLowerCase().includes(q)) ||
          (b.address && b.address.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      return true;
    });
  }, [branches, search]);

  const handleOpenModal = () => {
    setForm(INITIAL_FORM);
    setIsManualAddress(false);
    setManualAddress(INITIAL_MANUAL_ADDRESS);
    setBusinessDocumentFile(null);
    setMayorsPermitFile(null);
    setFormError("");
    address.resetAddress();
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setFormError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.business_name.trim()) {
      setFormError("Business / Branch Name is required.");
      return;
    }
    if (!form.official_email.trim()) {
      setFormError("Official Email is required.");
      return;
    }
    if (!form.official_contact_number.trim()) {
      setFormError("Official Contact Number is required.");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("business_name", form.business_name.trim());
      if (form.organization_name.trim()) {
        formData.append("organization_name", form.organization_name.trim());
      }

      // Address resolution (manual or dropdown)
      if (isManualAddress) {
        if (manualAddress.province.trim()) {
          formData.append("province", manualAddress.province.trim());
        }
        if (manualAddress.municipality.trim()) {
          formData.append("municipality", manualAddress.municipality.trim());
        }
        if (manualAddress.barangay.trim()) {
          formData.append("barangay", manualAddress.barangay.trim());
        }
        if (manualAddress.postal_code.trim()) {
          formData.append("postal_code", manualAddress.postal_code.trim());
        }
      } else {
        if (address.province) {
          formData.append("province", address.province);
        }
        if (address.municipality) {
          formData.append("municipality", address.municipality);
        }
        if (address.barangay) {
          formData.append("barangay", address.barangay);
        }
        if (address.postalCode) {
          formData.append("postal_code", address.postalCode);
        }
      }

      if (form.street_address.trim()) {
        formData.append("street_address", form.street_address.trim());
      }
      formData.append("official_email", form.official_email.trim());
      formData.append(
        "official_contact_number",
        form.official_contact_number.trim()
      );

      if (businessDocumentFile) {
        formData.append("business_document", businessDocumentFile);
      }
      if (mayorsPermitFile) {
        formData.append("mayors_permit", mayorsPermitFile);
      }

      const res = await request("/warehouse/branches/", {
        method: "POST",
        body: formData,
      });

      if (res?.ok === false || res?.success === false) {
        setFormError(
          res?.error || res?.message || "Failed to register new branch."
        );
        return;
      }

      // Close modal and reset
      setShowModal(false);
      setForm(INITIAL_FORM);
      setIsManualAddress(false);
      setManualAddress(INITIAL_MANUAL_ADDRESS);
      setBusinessDocumentFile(null);
      setMayorsPermitFile(null);
      address.resetAddress();

      // Refresh list
      await fetchBranches();

      // Show success notification
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      console.error("Error registering warehouse branch:", err);
      setFormError(err.message || "Failed to register new branch.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Branch Management" },
          ]}
        />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-[-0.02em] text-gray-900">
          Branch Management
        </h2>
        <p className="text-sm text-gray-500">
          Manage your registered branches.
        </p>
      </div>

      {/* ── Search Bar & Register Button ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative min-w-[240px] max-w-sm flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch name, address, or email"
            className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Register Button */}
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap self-start sm:self-auto h-[38px]"
        >
          <Plus size={16} /> Register New Branch
        </button>
      </div>

      {/* ── Toast Alert ────────────────────────────────────────────────────── */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> New warehouse branch successfully registered!
        </div>
      )}

      {/* ── Branch Cards Grid ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 border border-gray-200 rounded-xl bg-white">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B5D1E] mb-3"></div>
          <p className="text-sm font-semibold text-gray-700">Loading branches...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="p-12 text-center text-gray-500 border border-gray-200 rounded-xl bg-white">
          <p className="text-base font-semibold text-gray-800 mb-1">
            {branches.length === 0 ? "No branches registered" : "No branches found"}
          </p>
          <p className="text-xs text-gray-500">
            {branches.length === 0
              ? "Click 'Register New Branch' to add your first warehouse facility."
              : "No branches matched your search. Try adjusting your filter terms."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white border border-[#D8D8D8] rounded-xl p-5 flex flex-col justify-between shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:border-emerald-300 hover:shadow-md transition-all"
            >
              {/* Header: Branch Name */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h3 className="font-bold text-gray-900 text-base leading-tight">
                    {branch.name}
                  </h3>
                </div>

                {/* Info List */}
                <div className="space-y-2 text-xs text-gray-500 mb-6">
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="shrink-0 mt-0.5 text-gray-400" />
                    <span className="leading-snug">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="shrink-0 text-gray-400" />
                    <span className="truncate">{branch.email}</span>
                  </div>
                </div>
              </div>

              {/* View Details Button */}
              <button
                type="button"
                onClick={() =>
                  navigate(`/warehouse-manager/branches/${branch.id}/employees`)
                }
                className="w-full py-2 border border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Register New Branch Modal (Portaled to document.body) ─────────────── */}
      {showModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in duration-200 overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">
                      Register New Branch
                    </h3>
                    <p className="text-xs text-gray-500">
                      Add a new warehouse storage facility
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body & Form */}
              <form
                onSubmit={handleRegister}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                  {formError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs font-semibold">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Business/Branch Name & Organization Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Business / Branch Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. North Region Warehouse"
                        value={form.business_name}
                        onChange={(e) =>
                          setForm({ ...form, business_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GrainRise Storage Corp"
                        value={form.organization_name}
                        onChange={(e) =>
                          setForm({ ...form, organization_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Address Mode Switcher */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-gray-700">
                      Branch Location
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsManualAddress((prev) => !prev)}
                      className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      {isManualAddress
                        ? "Use location dropdowns"
                        : "Can't find location? Enter manually"}
                    </button>
                  </div>

                  {/* Cascading Dropdowns vs Manual Address Inputs */}
                  {isManualAddress ? (
                    <div className="space-y-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Province
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Tarlac"
                            value={manualAddress.province}
                            onChange={(e) =>
                              setManualAddress({
                                ...manualAddress,
                                province: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            City / Municipality
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Tarlac City"
                            value={manualAddress.municipality}
                            onChange={(e) =>
                              setManualAddress({
                                ...manualAddress,
                                municipality: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Barangay
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. San Sebastian"
                            value={manualAddress.barangay}
                            onChange={(e) =>
                              setManualAddress({
                                ...manualAddress,
                                barangay: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 2300"
                            value={manualAddress.postal_code}
                            onChange={(e) =>
                              setManualAddress({
                                ...manualAddress,
                                postal_code: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Province & City/Municipality Dropdowns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Province
                          </label>
                          <div className="relative">
                            <select
                              value={address.province}
                              onChange={(e) =>
                                address.selectProvince(e.target.value)
                              }
                              className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                            >
                              <option value="">
                                {address.loading.provinces
                                  ? "Loading Provinces..."
                                  : "Select Province"}
                              </option>
                              {address.provinceOptions.map((prov) => (
                                <option key={prov} value={prov}>
                                  {prov}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={15}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            City / Municipality
                          </label>
                          <div className="relative">
                            <select
                              value={address.municipality}
                              onChange={(e) =>
                                address.selectMunicipality(e.target.value)
                              }
                              disabled={
                                !address.province ||
                                address.loading.municipalities
                              }
                              className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                            >
                              <option value="">
                                {address.loading.municipalities
                                  ? "Loading Cities/Municipalities..."
                                  : !address.province
                                  ? "Select Province First"
                                  : "Select City / Municipality"}
                              </option>
                              {address.municipalityOptions.map((mun) => (
                                <option key={mun} value={mun}>
                                  {mun}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={15}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Barangay & Postal Code */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Barangay
                          </label>
                          <div className="relative">
                            <select
                              value={address.barangay}
                              onChange={(e) =>
                                address.selectBarangay(e.target.value)
                              }
                              disabled={
                                !address.municipality ||
                                address.loading.barangays
                              }
                              className="w-full appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400"
                            >
                              <option value="">
                                {address.loading.barangays
                                  ? "Loading Barangays..."
                                  : !address.municipality
                                  ? "Select Municipality First"
                                  : "Select Barangay"}
                              </option>
                              {address.barangayOptions.map((brgy) => (
                                <option key={brgy} value={brgy}>
                                  {brgy}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={15}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-gray-700 block mb-1">
                            Postal Code{" "}
                            <span className="text-gray-400 font-normal">
                              (auto-filled)
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder={
                              address.loading.postalCode
                                ? "Loading..."
                                : "e.g. 2300"
                            }
                            value={address.postalCode}
                            onChange={(e) =>
                              address.updatePostalCode(e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Street Address */}
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123 Agri Valley Road, Gate 2"
                      value={form.street_address}
                      onChange={(e) =>
                        setForm({ ...form, street_address: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  {/* Official Email & Official Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Official Email Address{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. north.wh@grainrise.com"
                        value={form.official_email}
                        onChange={(e) =>
                          setForm({ ...form, official_email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Official Contact Number{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 09123456789"
                        value={form.official_contact_number}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            official_contact_number: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>
                  </div>

                  {/* Document Uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Business Document
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          setBusinessDocumentFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-gray-200 rounded-xl p-1 cursor-pointer bg-white"
                      />
                      {businessDocumentFile && (
                        <p className="mt-1 text-[11px] text-emerald-600 truncate">
                          Selected: {businessDocumentFile.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">
                        Mayor’s Permit
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) =>
                          setMayorsPermitFile(e.target.files?.[0] || null)
                        }
                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-gray-200 rounded-xl p-1 cursor-pointer bg-white"
                      />
                      {mayorsPermitFile && (
                        <p className="mt-1 text-[11px] text-emerald-600 truncate">
                          Selected: {mayorsPermitFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex gap-3 p-4 bg-gray-50/70 border-t border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={submitting}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {submitting ? "Registering..." : "Save & Register"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
