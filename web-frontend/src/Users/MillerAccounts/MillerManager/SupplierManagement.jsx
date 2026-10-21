import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Truck, X, CheckCircle2, AlertCircle, ChevronDown, Star } from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";

const statusStyleMap = {
  active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border border-slate-200",
};

const INITIAL_SUPPLIER_FORM = {
  supplier_profile_id: "",
  supplier_farm: "",
  organization: "",
  contact_person: "",
  contact_number: "",
  email: "",
  street_address: "",
  status: "active",
};

export default function SupplierManagement() {
  const navigate = useNavigate();
  const { request } = useApi();
  const address = usePhilippineAddress();

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [formData, setFormData] = useState(INITIAL_SUPPLIER_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fetch branches owned by Miller
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/miller/branches/", { method: "GET" });
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setBranches(list);
        if (list.length > 0) {
          setFormData((prev) => ({
            ...prev,
            supplier_profile_id: prev.supplier_profile_id || String(list[0].supplier_profile_id),
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load miller branches:", err);
    }
  }, [request]);

  // Fetch suppliers owned by Miller
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request("/miller/suppliers/", { method: "GET" });
      const raw = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(raw)) {
        setSuppliers(raw);
      }
    } catch (err) {
      console.error("Failed to load miller suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchBranches();
    fetchSuppliers();
  }, [fetchBranches, fetchSuppliers]);

  // Ensure provinces are loaded when modal is opened or if options are empty
  useEffect(() => {
    if (showAddModal && (!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
      address.reloadProvinces?.();
    }
  }, [showAddModal, address.provinceOptions, address.loading.provinces, address.reloadProvinces]);

  // Form input change handlers
  const handleInputChange = (field, value) => {
    let cleanVal = value;
    if (field === "contact_person") {
      // Letters and spaces only, max 20 characters
      cleanVal = cleanVal.replace(/[^a-zA-Z\s]/g, "").slice(0, 20);
    } else if (field === "contact_number") {
      // Digits only, max 12 digits
      cleanVal = cleanVal.replace(/\D/g, "").slice(0, 12);
    } else if (field === "supplier_farm" || field === "organization") {
      cleanVal = cleanVal.slice(0, 20);
    }

    setFormData((prev) => ({ ...prev, [field]: cleanVal }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Address selection handlers (matching MillerCreatePostingModal / CompleteProfile)
  const handleProvinceChange = async (provinceName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.province;
      delete next.municipality;
      delete next.barangay;
      return next;
    });
    await address.selectProvince(provinceName);
  };

  const handleMunicipalityChange = async (munName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.municipality;
      delete next.barangay;
      return next;
    });
    await address.selectMunicipality(munName);
  };

  const handleBarangayChange = (brgyName) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.barangay;
      return next;
    });
    address.selectBarangay(brgyName);
  };

  const handleOpenAddModal = () => {
    setFormData({
      ...INITIAL_SUPPLIER_FORM,
      supplier_profile_id: branches[0]?.supplier_profile_id
        ? String(branches[0].supplier_profile_id)
        : "",
    });
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    if (!address.provinceOptions || address.provinceOptions.length === 0) {
      address.reloadProvinces?.();
    }
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setShowClearConfirm(false);
    setFormData(INITIAL_SUPPLIER_FORM);
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
  };

  const handleConfirmClear = () => {
    setFormData({
      ...INITIAL_SUPPLIER_FORM,
      supplier_profile_id: branches[0]?.supplier_profile_id
        ? String(branches[0].supplier_profile_id)
        : "",
    });
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    setShowClearConfirm(false);
  };

  // Change & Required completion detection for Add Supplier
  const hasAddChanged = useMemo(() => {
    const defaultBranch = branches[0]?.supplier_profile_id
      ? String(branches[0].supplier_profile_id)
      : "";
    return (
      String(formData.supplier_profile_id || "") !== defaultBranch ||
      (formData.supplier_farm || "").trim() !== "" ||
      (formData.organization || "").trim() !== "" ||
      (formData.contact_person || "").trim() !== "" ||
      (formData.contact_number || "").trim() !== "" ||
      (formData.email || "").trim() !== "" ||
      (formData.status || "active") !== "active" ||
      (formData.street_address || "").trim() !== "" ||
      (address.province || "").trim() !== "" ||
      (address.municipality || "").trim() !== "" ||
      (address.barangay || "").trim() !== "" ||
      (address.postalCode || "").trim() !== ""
    );
  }, [formData, address.province, address.municipality, address.barangay, address.postalCode, branches]);

  const isAddValid = useMemo(() => {
    if (!formData.supplier_profile_id) return false;
    const cp = (formData.contact_person || "").trim();
    const cn = (formData.contact_number || "").trim();
    if (!cp || cp.length > 20 || !/^[a-zA-Z\s]+$/.test(cp)) return false;
    if (!cn || !/^(09\d{9}|639\d{9})$/.test(cn)) return false;
    if (!(address.province || "").trim()) return false;
    if (!(address.municipality || "").trim()) return false;
    if (formData.supplier_farm && formData.supplier_farm.trim().length > 20) return false;
    if (formData.organization && formData.organization.trim().length > 20) return false;
    return true;
  }, [
    formData.supplier_profile_id,
    formData.contact_person,
    formData.contact_number,
    formData.supplier_farm,
    formData.organization,
    address.province,
    address.municipality,
  ]);

  const canClearAdd = hasAddChanged && isAddValid;
  const canSaveAdd = hasAddChanged && isAddValid && !submitting;

  // Submit new supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = {};
    if (!formData.supplier_profile_id) {
      errors.supplier_profile_id = "Please select a branch.";
    }

    if (formData.supplier_farm && formData.supplier_farm.trim().length > 20) {
      errors.supplier_farm = "Supplier / Farm Name cannot exceed 20 characters.";
    }

    if (formData.organization && formData.organization.trim().length > 20) {
      errors.organization = "Organization / Co-op cannot exceed 20 characters.";
    }

    const cp = formData.contact_person.trim();
    if (!cp) {
      errors.contact_person = "Contact person is required.";
    } else if (cp.length > 20) {
      errors.contact_person = "Contact person cannot exceed 20 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(cp)) {
      errors.contact_person = "Contact person must contain letters and spaces only.";
    }

    const cn = formData.contact_number.trim();
    if (!cn) {
      errors.contact_number = "Contact number is required.";
    } else if (!/^\d+$/.test(cn)) {
      errors.contact_number = "Contact number must contain digits only.";
    } else if (!/^(09\d{9}|639\d{9})$/.test(cn)) {
      errors.contact_number = "Must be a valid Philippine mobile number (09XXXXXXXXX or 639XXXXXXXXX).";
    }

    if (!address.province) {
      errors.province = "Province is required.";
    }
    if (!address.municipality) {
      errors.municipality = "City / Municipality is required.";
    }

    const addressParts = [
      formData.street_address?.trim(),
      address.barangay?.trim(),
      address.municipality?.trim(),
      address.province?.trim(),
      address.postalCode?.trim(),
    ].filter(Boolean);

    const combinedAddress = addressParts.join(", ");
    if (!combinedAddress) {
      errors.address = "Address is required.";
    }

    // Branch duplicate validation: prevent duplicate Farm Name, Organization, or Contact Person within the same branch
    const targetBranch = String(formData.supplier_profile_id);
    const farmTrimmed = (formData.supplier_farm || "").trim().toLowerCase();
    const orgTrimmed = (formData.organization || "").trim().toLowerCase();
    const cpTrimmed = (formData.contact_person || "").trim().toLowerCase();

    const dupSupplier = suppliers.find((s) => {
      if (String(s.supplier_profile_id) !== targetBranch) return false;
      if (farmTrimmed && (s.supplier_farm || "").trim().toLowerCase() === farmTrimmed) return true;
      if (orgTrimmed && (s.organization || "").trim().toLowerCase() === orgTrimmed) return true;
      if (cpTrimmed && (s.contact_person || "").trim().toLowerCase() === cpTrimmed) return true;
      return false;
    });

    if (dupSupplier) {
      if (farmTrimmed && (dupSupplier.supplier_farm || "").trim().toLowerCase() === farmTrimmed) {
        errors.supplier_farm = "A supplier with this Farm Name already exists in this branch.";
      } else if (orgTrimmed && (dupSupplier.organization || "").trim().toLowerCase() === orgTrimmed) {
        errors.organization = "A supplier with this Organization / Co-op already exists in this branch.";
      } else if (cpTrimmed && (dupSupplier.contact_person || "").trim().toLowerCase() === cpTrimmed) {
        errors.contact_person = "A supplier with this Contact Person already exists in this branch.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(Object.values(errors)[0] || "Please correct the errors in the form.");
      return;
    }
    setFieldErrors({});

    try {
      setSubmitting(true);
      const payload = {
        supplier_profile_id: Number(formData.supplier_profile_id),
        supplier_farm: formData.supplier_farm.trim() || null,
        organization: formData.organization.trim() || null,
        contact_person: formData.contact_person.trim(),
        contact_number: formData.contact_number.trim(),
        email: formData.email.trim() || null,
        address: combinedAddress,
        status: formData.status || "active",
      };

      await request("/miller/suppliers/", {
        method: "POST",
        body: payload,
        throwOnError: true,
      });

      const displaySupplier =
        formData.supplier_farm.trim() || formData.contact_person.trim();
      handleCloseAddModal();
      showToast(`Supplier "${displaySupplier}" added successfully!`);
      fetchSuppliers();
    } catch (err) {
      console.error("Failed to add supplier:", err);
      const errMsg = err.message || "Failed to add supplier. Please try again.";
      setFormError(errMsg);
      if (errMsg.toLowerCase().includes("farm name")) {
        setFieldErrors((prev) => ({ ...prev, supplier_farm: errMsg }));
      } else if (errMsg.toLowerCase().includes("organization")) {
        setFieldErrors((prev) => ({ ...prev, organization: errMsg }));
      } else if (errMsg.toLowerCase().includes("contact person")) {
        setFieldErrors((prev) => ({ ...prev, contact_person: errMsg }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered suppliers
  const filtered = useMemo(() => {
    return suppliers.filter((item) => {
      if (statusFilter !== "all") {
        const itemStatus = (item.status || "active").toLowerCase();
        if (itemStatus !== statusFilter.toLowerCase()) return false;
      }

      if (selectedBranch !== "all") {
        if (String(item.supplier_profile_id) !== String(selectedBranch)) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const farmMatch = (item.supplier_farm || "").toLowerCase().includes(q);
        const orgMatch = (item.organization || "").toLowerCase().includes(q);
        const personMatch = (item.contact_person || "").toLowerCase().includes(q);
        const phoneMatch = (item.contact_number || "").toLowerCase().includes(q);
        const emailMatch = (item.email || "").toLowerCase().includes(q);
        const addressMatch = (item.address || "").toLowerCase().includes(q);
        return farmMatch || orgMatch || personMatch || phoneMatch || emailMatch || addressMatch;
      }

      return true;
    });
  }, [suppliers, statusFilter, selectedBranch, search]);

  const itemsPerPage = 10;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  const columns = useMemo(
    () => [
      {
        key: "supplier_farm",
        label: "Supplier / Farm",
        width: "24%",
        render: (row) => (
          <div>
            <div className="text-[13px] font-medium text-slate-700">
              {row.supplier_farm || "Independent Supplier"}
            </div>
            {row.address && (
              <div className="text-xs text-slate-400 truncate max-w-xs" title={row.address}>
                {row.address}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "organization",
        label: "Organization",
        width: "18%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.organization || "Independent"}
          </span>
        ),
      },
      {
        key: "contact_person",
        label: "Contact Person",
        width: "22%",
        render: (row) => (
          <div>
            <div className="text-[13px] font-medium text-slate-700">{row.contact_person}</div>
            <div className="text-xs text-slate-400">
              {row.contact_number}
              {row.email && ` • ${row.email}`}
            </div>
          </div>
        ),
      },
      {
        key: "performance",
        label: "Performance",
        width: "16%",
        render: (row) =>
          row.performance_rating != null && !isNaN(Number(row.performance_rating)) ? (
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={13}
                    fill={
                      star <= Math.round(Number(row.performance_rating))
                        ? "currentColor"
                        : "none"
                    }
                    className={
                      star <= Math.round(Number(row.performance_rating))
                        ? "text-amber-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {Number(row.performance_rating).toFixed(1)}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-medium text-xs">N/A</span>
          ),
      },
      {
        key: "status",
        label: "Status",
        width: "10%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusStyleMap[(row.status || "active").toLowerCase()] || "bg-gray-100 text-gray-700"
            }`}
          >
            {row.status || "active"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Actions",
        width: "10%",
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs & Title ──────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Supplier Management" },
          ]}
        />
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Supplier Management
        </h2>
        <p className="text-sm text-slate-500">
          Manage and monitor suppliers across your registered branches.
        </p>
      </div>

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} /> {toastMsg}
        </div>
      )}

      {/* ── Filter Controls (Matching MillerOrderApproval.jsx) ────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-2 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search supplier, organization, contact person"
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white placeholder-gray-400 text-gray-700 h-[38px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Status Select Filter */}
          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
          </div>

          {/* Branch Select Filter (if multiple branches exist) */}
          {branches.length > 1 && (
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.supplier_profile_id} value={b.supplier_profile_id}>
                    {b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          )}
        </div>

        {/* Total Badge & Add Supplier Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 h-[38px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            <span>{totalCount} suppliers</span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 bg-[#0B5D1E] hover:bg-[#084b18] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap h-[38px]"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
      </div>

      {/* ── SectionedTableCard ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-[0_6px_18px_rgba(15,23,42,0.06)]">
          <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
            <span>Loading suppliers...</span>
          </div>
        </div>
      ) : (
        <SectionedTableCard
          columns={columns}
          sections={tableSections}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onViewDetails={(row) =>
            navigate(`/miller-manager/suppliers/${row.farmer_contact_id || row.id}`)
          }
          viewDetailsLabel="View Details"
          footerLabel={
            totalCount === 0
              ? "Showing 0 suppliers"
              : `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} suppliers`
          }
          emptyStateTitle="No suppliers found"
          emptyStateDescription="No matching records were found. Try adjusting your search or filters, or add a new supplier."
        />
      )}

      {/* ── Add Supplier Modal ───────────────────────────────────────────────── */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            {showClearConfirm ? (
              /* Clear Form Confirmation Modal (temporarily replaces Add modal) */
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Clear Form</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Are you sure you want to clear all fields?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClear}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Add New Supplier</h3>
                    <p className="text-xs text-gray-500">Register a farmer or supplier contact</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSupplier} className="space-y-3.5">
                {formError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Branch Selection */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Associated Branch <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.supplier_profile_id}
                    onChange={(e) => handleInputChange("supplier_profile_id", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white text-gray-700 transition ${
                      fieldErrors.supplier_profile_id
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  >
                    {branches.length === 0 && (
                      <option value="">No branches found</option>
                    )}
                    {branches.map((b) => (
                      <option key={b.supplier_profile_id} value={b.supplier_profile_id}>
                        {b.business_name || b.organization_name || `Branch #${b.supplier_profile_id}`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.supplier_profile_id && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.supplier_profile_id}</p>
                  )}
                </div>

                {/* Supplier / Farm Name */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Supplier / Farm Name
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {(formData.supplier_farm || "").length}/20
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Green Valley Farm"
                    value={formData.supplier_farm}
                    onChange={(e) => handleInputChange("supplier_farm", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.supplier_farm
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.supplier_farm && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.supplier_farm}</p>
                  )}
                </div>

                {/* Organization / Co-op */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Organization / Co-op
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {(formData.organization || "").length}/20
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="e.g. Farmers Association"
                    value={formData.organization}
                    onChange={(e) => handleInputChange("organization", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.organization
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.organization && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.organization}</p>
                  )}
                </div>

                {/* Contact Person */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700">
                      Contact Person <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {(formData.contact_person || "").length}/20
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={20}
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange("contact_person", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.contact_person
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.contact_person && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.contact_person}</p>
                  )}
                </div>

                {/* Contact Number */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    required
                    placeholder="e.g. 09123456789 or 639123456789"
                    value={formData.contact_number}
                    onChange={(e) => handleInputChange("contact_number", e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                      fieldErrors.contact_number
                        ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                        : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                    }`}
                  />
                  {fieldErrors.contact_number && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.contact_number}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Email Address <span className="text-xs text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. supplier@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none bg-white text-gray-700"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Province */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Province <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={address.province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      onFocus={() => {
                        if ((!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
                          address.reloadProvinces?.();
                        }
                      }}
                      className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer ${
                        fieldErrors.province
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200"
                      }`}
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
                    <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {fieldErrors.province && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.province}</p>
                  )}
                  {address.errors.provinces && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                      <span>{address.errors.provinces}</span>
                      <button
                        type="button"
                        onClick={() => address.reloadProvinces?.()}
                        className="underline font-bold text-emerald-700 ml-1 cursor-pointer"
                      >
                        Retry
                      </button>
                    </p>
                  )}
                </div>

                {/* City / Municipality */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    City / Municipality <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={address.municipality}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      disabled={!address.province || address.loading.municipalities}
                      className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 ${
                        fieldErrors.municipality
                          ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                          : "border-gray-200"
                      }`}
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
                    <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {fieldErrors.municipality && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.municipality}</p>
                  )}
                  {address.errors.municipalities && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{address.errors.municipalities}</p>
                  )}
                </div>

                {/* Barangay */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Barangay
                  </label>
                  <div className="relative">
                    <select
                      value={address.barangay}
                      onChange={(e) => handleBarangayChange(e.target.value)}
                      disabled={!address.municipality || address.loading.barangays}
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
                    <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {address.errors.barangays && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{address.errors.barangays}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Postal Code <span className="text-gray-400 font-normal">(auto-filled)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={address.loading.postalCode ? "Loading..." : "e.g. 2300"}
                    value={address.postalCode}
                    onChange={(e) => address.updatePostalCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                {/* Street Address */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Agri Valley Road, Gate 2"
                    value={formData.street_address}
                    onChange={(e) => handleInputChange("street_address", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                  {fieldErrors.address && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.address}</p>
                  )}
                </div>

                {/* Modal Footer Buttons */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    disabled={!canClearAdd || submitting}
                    onClick={() => setShowClearConfirm(true)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={!canSaveAdd}
                    className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Supplier"
                    )}
                  </button>
                </div>
              </form>
            </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
