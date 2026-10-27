import Toast from "../../../Components/Modals/Toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Truck,
  X,
  Star,
  ChevronDown,
  Building2,
  AlertCircle,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";

const INITIAL_ADD_FORM = {
  warehouse_profile_id: "",
  business_name: "",
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

  // Segment Tab State: "grainrise" | "nongrainrise"
  const [activeSegment, setActiveSegment] = useState("grainrise");

  // Data lists
  const [branches, setBranches] = useState([]);
  const [grainriseMillers, setGrainriseMillers] = useState([]);
  const [nonGrainriseMillers, setNonGrainriseMillers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Shared Search & Sorting Filter State
  const [grainriseSearch, setGrainriseSearch] = useState("");
  const [grainriseRatingSort, setGrainriseRatingSort] = useState("all");
  const [grainrisePage, setGrainrisePage] = useState(1);

  const [nonGrainriseSearch, setNonGrainriseSearch] = useState("");
  const [nonGrainriseRatingSort, setNonGrainriseRatingSort] = useState("all");
  const [nonGrainrisePage, setNonGrainrisePage] = useState(1);

  const itemsPerPage = 10;

  // Add Non-GRAINRISE Miller Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddressText, setManualAddressText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // 1. Fetch Manager Owned Branches
  const fetchBranches = useCallback(async () => {
    try {
      const res = await request("/warehouse/suppliers/branches/", { method: "GET" });
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setBranches(list);
        if (list.length > 0) {
          setAddForm((prev) => ({
            ...prev,
            warehouse_profile_id: prev.warehouse_profile_id || String(list[0].warehouse_profile_id),
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load warehouse branches:", err);
    }
  }, [request]);

  // 2. Fetch GRAINRISE Millers
  const fetchGrainriseMillers = useCallback(async () => {
    try {
      const res = await request("/warehouse/suppliers/grainrise/", { method: "GET" });
      const raw = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(raw)) {
        setGrainriseMillers(raw);
      }
    } catch (err) {
      console.error("Failed to load Grainrise millers:", err);
    }
  }, [request]);

  // 3. Fetch Non-GRAINRISE Millers
  const fetchNonGrainriseMillers = useCallback(async () => {
    try {
      const res = await request("/warehouse/suppliers/non-grainrise/", { method: "GET" });
      const raw = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(raw)) {
        setNonGrainriseMillers(raw);
      }
    } catch (err) {
      console.error("Failed to load Non-Grainrise millers:", err);
    }
  }, [request]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchBranches(),
      fetchGrainriseMillers(),
      fetchNonGrainriseMillers(),
    ]);
    setLoading(false);
  }, [fetchBranches, fetchGrainriseMillers, fetchNonGrainriseMillers]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Ensure provinces are loaded when modal is opened
  useEffect(() => {
    if (showAddModal && (!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
      address.reloadProvinces?.();
    }
  }, [showAddModal, address.provinceOptions, address.loading.provinces, address.reloadProvinces]);

  // Helper sort function: Ratings (high-to-low / low-to-high) and Name (A-Z / Z-A)
  const applySupplierSort = (list, sortKey) => {
    if (sortKey === "all") return list;

    if (sortKey === "name_asc") {
      return [...list].sort((a, b) =>
        (a.business_name || "").localeCompare(b.business_name || "", undefined, {
          sensitivity: "base",
        })
      );
    }

    if (sortKey === "name_desc") {
      return [...list].sort((a, b) =>
        (b.business_name || "").localeCompare(a.business_name || "", undefined, {
          sensitivity: "base",
        })
      );
    }

    // Ratings sort: Unrated suppliers appear AFTER rated suppliers in both directions
    return [...list].sort((a, b) => {
      const aVal = a.avg_rating != null ? Number(a.avg_rating) : null;
      const bVal = b.avg_rating != null ? Number(b.avg_rating) : null;

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1; // unrated goes to the bottom
      if (bVal === null) return -1; // unrated goes to the bottom

      if (sortKey === "high_to_low") {
        return bVal - aVal;
      } else if (sortKey === "low_to_high") {
        return aVal - bVal;
      }
      return 0;
    });
  };

  // Filter & Sort GRAINRISE Millers
  const filteredGrainrise = useMemo(() => {
    let result = grainriseMillers;
    const q = grainriseSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          (m.business_name || "").toLowerCase().includes(q) ||
          (m.organization_name || "").toLowerCase().includes(q) ||
          (m.address || "").toLowerCase().includes(q) ||
          (m.owner_name || "").toLowerCase().includes(q) ||
          (m.official_email || "").toLowerCase().includes(q) ||
          (m.official_contact_number || "").toLowerCase().includes(q)
      );
    }
    return applySupplierSort(result, grainriseRatingSort);
  }, [grainriseMillers, grainriseSearch, grainriseRatingSort]);

  const totalGrainriseCount = filteredGrainrise.length;
  const totalGrainrisePages = Math.max(1, Math.ceil(totalGrainriseCount / itemsPerPage));
  const paginatedGrainrise = useMemo(() => {
    const start = (grainrisePage - 1) * itemsPerPage;
    return filteredGrainrise.slice(start, start + itemsPerPage);
  }, [filteredGrainrise, grainrisePage]);

  // Filter & Sort Non-GRAINRISE Millers
  const filteredNonGrainrise = useMemo(() => {
    let result = nonGrainriseMillers;
    const q = nonGrainriseSearch.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (m) =>
          (m.business_name || "").toLowerCase().includes(q) ||
          (m.business_address || "").toLowerCase().includes(q) ||
          (m.contact_person || "").toLowerCase().includes(q) ||
          (m.contact_number || "").toLowerCase().includes(q) ||
          (m.email || "").toLowerCase().includes(q)
      );
    }
    return applySupplierSort(result, nonGrainriseRatingSort);
  }, [nonGrainriseMillers, nonGrainriseSearch, nonGrainriseRatingSort]);

  const totalNonGrainriseCount = filteredNonGrainrise.length;
  const totalNonGrainrisePages = Math.max(1, Math.ceil(totalNonGrainriseCount / itemsPerPage));
  const paginatedNonGrainrise = useMemo(() => {
    const start = (nonGrainrisePage - 1) * itemsPerPage;
    return filteredNonGrainrise.slice(start, start + itemsPerPage);
  }, [filteredNonGrainrise, nonGrainrisePage]);

  // Modal Handlers for Add Miller
  const handleOpenAddModal = () => {
    setAddForm({
      ...INITIAL_ADD_FORM,
      warehouse_profile_id: branches.length > 0 ? String(branches[0].warehouse_profile_id) : "",
    });
    setManualAddressText("");
    setUseManualAddress(false);
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
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
  };

  const handleAddInputChange = (field, value) => {
    let cleanVal = value;
    if (field === "contact_person") {
      cleanVal = cleanVal.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
    } else if (field === "contact_number") {
      cleanVal = cleanVal.replace(/[^\d+]/g, "").slice(0, 13);
    } else if (field === "business_name") {
      cleanVal = cleanVal.slice(0, 100);
    }

    setAddForm((prev) => ({ ...prev, [field]: cleanVal }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleClearForm = () => {
    setAddForm({
      ...INITIAL_ADD_FORM,
      warehouse_profile_id: branches.length > 0 ? String(branches[0].warehouse_profile_id) : "",
    });
    setManualAddressText("");
    setUseManualAddress(false);
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    setShowClearConfirm(false);
  };

  const handleSaveAddSupplier = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = {};
    if (!addForm.warehouse_profile_id) {
      errors.warehouse_profile_id = "Please select a warehouse branch.";
    }

    const bName = addForm.business_name.trim();
    if (!bName) {
      errors.business_name = "Business / Branch Name is required.";
    }

    const cp = addForm.contact_person.trim();
    if (!cp) {
      errors.contact_person = "Contact Person is required.";
    } else if (!/^[a-zA-Z\s]+$/.test(cp)) {
      errors.contact_person = "Contact Person must contain letters and spaces only.";
    }

    const cn = addForm.contact_number.trim();
    if (!cn) {
      errors.contact_number = "Contact Number is required.";
    } else {
      const cleanPhone = cn.replace(/[\s-]/g, "");
      if (!/^(\+639\d{9}|639\d{9}|09\d{9})$/.test(cleanPhone)) {
        errors.contact_number = "Enter a valid Philippine number (09XXXXXXXXX or +639XXXXXXXXX).";
      }
    }

    if (addForm.email && addForm.email.trim()) {
      const emailTrim = addForm.email.trim();
      if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(emailTrim)) {
        errors.email = "Enter a valid email address.";
      }
    }

    let finalAddress = "";
    if (useManualAddress) {
      finalAddress = manualAddressText.trim();
      if (!finalAddress) {
        errors.address = "Business Address is required.";
      }
    } else {
      if (!address.province) {
        errors.province = "Province is required.";
      }
      if (!address.municipality) {
        errors.municipality = "City / Municipality is required.";
      }
      const parts = [
        addForm.street_address?.trim(),
        address.barangay?.trim(),
        address.municipality?.trim(),
        address.province?.trim(),
        address.postalCode?.trim(),
      ].filter(Boolean);
      finalAddress = parts.join(", ");
      if (!finalAddress) {
        errors.address = "Business Address is required.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(Object.values(errors)[0] || "Please correct the errors in the form.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        warehouse_profile_id: Number(addForm.warehouse_profile_id),
        business_name: bName,
        business_address: finalAddress,
        contact_person: cp,
        contact_number: cn.replace(/[\s-]/g, ""),
        email: addForm.email.trim() || null,
        status: addForm.status || "active",
      };

      await request("/warehouse/suppliers/non-grainrise/", {
        method: "POST",
        body: payload,
        throwOnError: true,
      });

      handleCloseAddModal();
      showToast(`Supplier "${bName}" registered successfully!`);
      fetchNonGrainriseMillers();
    } catch (err) {
      console.error("Failed to add Non-Grainrise miller:", err);
      setFormError(err.message || "Failed to register supplier. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // GRAINRISE Columns — displays ONLY Branch Name, with standard outlined Action button
  const grainriseColumns = useMemo(
    () => [
      {
        key: "business_name",
        label: "Branch Name",
        width: "36%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.business_name || "—"}
          </span>
        ),
      },
      {
        key: "ratings",
        label: "Ratings",
        width: "28%",
        render: (row) =>
          row.avg_rating != null && !isNaN(Number(row.avg_rating)) ? (
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={13}
                    fill={star <= Math.round(Number(row.avg_rating)) ? "currentColor" : "none"}
                    className={
                      star <= Math.round(Number(row.avg_rating))
                        ? "text-amber-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {Number(row.avg_rating).toFixed(1)}
              </span>
              {row.rating_count ? (
                <span className="text-[11px] text-slate-400">({row.rating_count})</span>
              ) : null}
            </div>
          ) : (
            <span className="text-slate-400 font-medium text-xs">No ratings yet</span>
          ),
      },
      {
        key: "last_receiving_date",
        label: "Last Receiving Date",
        width: "24%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.last_receiving_date || "No receiving history"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/warehouse-manager/suppliers/grainrise/${row.supplier_profile_id || row.id}`
              )
            }
            className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
          >
            View Details
          </button>
        ),
      },
    ],
    [navigate]
  );

  // Non-GRAINRISE Columns — displays ONLY Business Name, with standard outlined Action button
  const nonGrainriseColumns = useMemo(
    () => [
      {
        key: "business_name",
        label: "Business Name",
        width: "36%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.business_name || "—"}
          </span>
        ),
      },
      {
        key: "ratings",
        label: "Ratings",
        width: "28%",
        render: (row) =>
          row.avg_rating != null && !isNaN(Number(row.avg_rating)) ? (
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={13}
                    fill={star <= Math.round(Number(row.avg_rating)) ? "currentColor" : "none"}
                    className={
                      star <= Math.round(Number(row.avg_rating))
                        ? "text-amber-400"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {Number(row.avg_rating).toFixed(1)}
              </span>
              {row.rating_count ? (
                <span className="text-[11px] text-slate-400">({row.rating_count})</span>
              ) : null}
            </div>
          ) : (
            <span className="text-slate-400 font-medium text-xs">No ratings yet</span>
          ),
      },
      {
        key: "last_receiving_date",
        label: "Last Receiving Date",
        width: "24%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.last_receiving_date || "No receiving history"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (row) => (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/warehouse-manager/suppliers/non-grainrise/${row.warehouse_nongrainrise_supplier_contact_id || row.id}`
              )
            }
            className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
          >
            View Details
          </button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <Breadcrumbs
          items={[
            { label: "Management" },
            { label: "Supplier Management" },
          ]}
        />
        <h2 className="text-[clamp(1.75rem,2.5vw,2.25rem)] font-bold tracking-[-0.02em] text-gray-900">
          Supplier Management
        </h2>
        <p className="text-sm text-gray-500">
          Monitor registered GRAINRISE millers and external supply partnerships.
        </p>
      </div>

      {/* ── Segmented Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveSegment("grainrise")}
            className={`pb-3 px-5 text-sm font-semibold transition border-b-2 cursor-pointer ${
              activeSegment === "grainrise"
                ? "border-[#0B5D1E] text-[#0B5D1E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            GRAINRISE Millers ({filteredGrainrise.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSegment("nongrainrise")}
            className={`pb-3 px-5 text-sm font-semibold transition border-b-2 cursor-pointer ${
              activeSegment === "nongrainrise"
                ? "border-[#0B5D1E] text-[#0B5D1E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Non-GRAINRISE Millers ({filteredNonGrainrise.length})
          </button>
        </div>

        {/* Top Right Action: Add Miller (Only on Non-GRAINRISE tab) */}
        {activeSegment === "nongrainrise" && (
          <div className="pb-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 bg-[#0B5D1E] text-white hover:bg-[#094d19] px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus size={15} />
              Add Miller
            </button>
          </div>
        )}
      </div>

      {/* ── Segment 1: GRAINRISE Millers ─────────────────────────────────────── */}
      {activeSegment === "grainrise" && (
        <div className="space-y-4">
          {/* Controls: Search Bar & Sorting Dropdown aligned together matching Miller Procurement History */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full max-w-sm">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search registered millers by branch, organization, or address..."
                value={grainriseSearch}
                onChange={(e) => {
                  setGrainriseSearch(e.target.value);
                  setGrainrisePage(1);
                }}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-xs text-gray-700 placeholder-gray-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {grainriseSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGrainriseSearch("");
                    setGrainrisePage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Ratings & Name Sorting Dropdown */}
            <div className="relative">
              <select
                value={grainriseRatingSort}
                onChange={(e) => {
                  setGrainriseRatingSort(e.target.value);
                  setGrainrisePage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Ratings (All)</option>
                <option value="high_to_low">Highest Ratings to Lowest Ratings</option>
                <option value="low_to_high">Lowest Ratings to Highest Ratings</option>
                <option value="name_asc">Branch Name A–Z</option>
                <option value="name_desc">Branch Name Z–A</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading registered millers...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={grainriseColumns}
              sections={[{ rows: paginatedGrainrise }]}
              currentPage={grainrisePage}
              totalPages={totalGrainrisePages}
              onPageChange={setGrainrisePage}
              footerLabel={
                totalGrainriseCount === 0
                  ? "Showing 0 millers"
                  : `Showing ${(grainrisePage - 1) * itemsPerPage + 1}-${Math.min(
                      grainrisePage * itemsPerPage,
                      totalGrainriseCount
                    )} of ${totalGrainriseCount} millers`
              }
              emptyStateTitle={
                grainriseSearch
                  ? "No matching millers found"
                  : "No registered millers found"
              }
              emptyStateDescription={
                grainriseSearch
                  ? "No registered millers match your search criteria. Try a different search term."
                  : "No active registered GRAINRISE millers were found in the system."
              }
            />
          )}
        </div>
      )}

      {/* ── Segment 2: Non-GRAINRISE Millers ─────────────────────────────────── */}
      {activeSegment === "nongrainrise" && (
        <div className="space-y-4">
          {/* Controls: Search Bar & Sorting Dropdown aligned together matching Miller Procurement History */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative w-full max-w-sm">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search external millers by business name, contact, address..."
                value={nonGrainriseSearch}
                onChange={(e) => {
                  setNonGrainriseSearch(e.target.value);
                  setNonGrainrisePage(1);
                }}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-8 text-xs text-gray-700 placeholder-gray-400 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {nonGrainriseSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setNonGrainriseSearch("");
                    setNonGrainrisePage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Ratings & Name Sorting Dropdown */}
            <div className="relative">
              <select
                value={nonGrainriseRatingSort}
                onChange={(e) => {
                  setNonGrainriseRatingSort(e.target.value);
                  setNonGrainrisePage(1);
                }}
                className="h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:bg-gray-50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Ratings (All)</option>
                <option value="high_to_low">Highest Ratings to Lowest Ratings</option>
                <option value="low_to_high">Lowest Ratings to Highest Ratings</option>
                <option value="name_asc">Business Name A–Z</option>
                <option value="name_desc">Business Name Z–A</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading external millers...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={nonGrainriseColumns}
              sections={[{ rows: paginatedNonGrainrise }]}
              currentPage={nonGrainrisePage}
              totalPages={totalNonGrainrisePages}
              onPageChange={setNonGrainrisePage}
              footerLabel={
                totalNonGrainriseCount === 0
                  ? "Showing 0 external millers"
                  : `Showing ${(nonGrainrisePage - 1) * itemsPerPage + 1}-${Math.min(
                      nonGrainrisePage * itemsPerPage,
                      totalNonGrainriseCount
                    )} of ${totalNonGrainriseCount} external millers`
              }
              emptyStateTitle={
                nonGrainriseSearch
                  ? "No matching external millers found"
                  : "No external millers registered"
              }
              emptyStateDescription={
                nonGrainriseSearch
                  ? "No external suppliers match your search criteria. Try a different search term."
                  : "No external suppliers registered yet. Click \"Add Miller\" to register one."
              }
            />
          )}
        </div>
      )}

      {/* ── Add Non-GRAINRISE Miller Modal ───────────────────────────────────── */}
      {showAddModal &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            {showClearConfirm ? (
              /* Clear Form Confirmation Modal (Natural height, matches Miller Manager reference exactly) */
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
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
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition cursor-pointer"
                  >
                    Confirm Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#0B5D1E]">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Register External Miller Supplier
                      </h3>
                      <p className="text-xs text-slate-500">
                        Add a Non-GRAINRISE supplier for procurement and delivery tracking.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAddModal}
                    disabled={submitting}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSaveAddSupplier} className="p-6 space-y-4">
                  {formError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Warehouse Branch Selector */}
                  {branches.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Warehouse Branch <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={addForm.warehouse_profile_id}
                        onChange={(e) => handleAddInputChange("warehouse_profile_id", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                      >
                        {branches.map((b) => (
                          <option key={b.warehouse_profile_id} value={b.warehouse_profile_id}>
                            {b.business_name} ({b.municipality || ""}, {b.province || ""})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business / Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addForm.business_name}
                      onChange={(e) => handleAddInputChange("business_name", e.target.value)}
                      placeholder="e.g. San Jose Milling Supply"
                      className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                        fieldErrors.business_name
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                          : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                      }`}
                    />
                    {fieldErrors.business_name && (
                      <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.business_name}</p>
                    )}
                  </div>

                  {/* Contact Person & Contact Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Person <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addForm.contact_person}
                        onChange={(e) => handleAddInputChange("contact_person", e.target.value)}
                        placeholder="e.g. Juan Dela Cruz"
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                          fieldErrors.contact_person
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                            : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.contact_person && (
                        <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.contact_person}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addForm.contact_number}
                        onChange={(e) => handleAddInputChange("contact_number", e.target.value)}
                        placeholder="09XXXXXXXXX"
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                          fieldErrors.contact_number
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                            : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.contact_number && (
                        <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.contact_number}</p>
                      )}
                    </div>
                  </div>

                  {/* Email Address & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Official Email <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={addForm.email}
                        onChange={(e) => handleAddInputChange("email", e.target.value)}
                        placeholder="miller@example.com"
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                          fieldErrors.email
                            ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                            : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={addForm.status}
                        onChange={(e) => handleAddInputChange("status", e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Address Section with Cascading Dropdowns + Manual Entry Fallback */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Business Address <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseManualAddress(!useManualAddress)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline transition cursor-pointer"
                      >
                        {useManualAddress ? "Use Philippine Dropdowns" : "Switch to Freeform / Manual Entry"}
                      </button>
                    </div>

                    {useManualAddress ? (
                      <div>
                        <textarea
                          rows={3}
                          required
                          value={manualAddressText}
                          onChange={(e) => {
                            setManualAddressText(e.target.value);
                            if (fieldErrors.address) {
                              setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.address;
                                return next;
                              });
                            }
                          }}
                          placeholder="Enter complete business address..."
                          className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                            fieldErrors.address
                              ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                              : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                          }`}
                        />
                        {fieldErrors.address && (
                          <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.address}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Province */}
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">Province</label>
                            <select
                              value={address.province}
                              onChange={(e) => address.selectProvince(e.target.value)}
                              disabled={address.loading.provinces}
                              className={`w-full px-3 py-1.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                                fieldErrors.province
                                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                                  : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                              }`}
                            >
                              <option value="">Select Province</option>
                              {(address.provinceOptions || []).map((prov) => (
                                <option key={prov} value={prov}>
                                  {prov}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Municipality */}
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">City / Municipality</label>
                            <select
                              value={address.municipality}
                              onChange={(e) => address.selectMunicipality(e.target.value)}
                              disabled={!address.province || address.loading.municipalities}
                              className={`w-full px-3 py-1.5 text-xs rounded-xl border bg-white focus:outline-none focus:ring-1 transition ${
                                fieldErrors.municipality
                                  ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500"
                                  : "border-slate-200 focus:border-emerald-600 focus:ring-emerald-600"
                              }`}
                            >
                              <option value="">Select Municipality</option>
                              {(address.municipalityOptions || []).map((mun) => (
                                <option key={mun} value={mun}>
                                  {mun}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Barangay */}
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">Barangay</label>
                            <select
                              value={address.barangay}
                              onChange={(e) => address.selectBarangay(e.target.value)}
                              disabled={!address.municipality || address.loading.barangays}
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                            >
                              <option value="">Select Barangay</option>
                              {(address.barangayOptions || []).map((bgy) => (
                                <option key={bgy} value={bgy}>
                                  {bgy}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Postal Code */}
                          <div>
                            <label className="block text-[11px] text-slate-500 mb-0.5">Postal Code</label>
                            <input
                              type="text"
                              value={address.postalCode}
                              onChange={(e) => address.updatePostalCode(e.target.value)}
                              placeholder="e.g. 1000"
                              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                            />
                          </div>
                        </div>

                        {/* Street Address */}
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">Street Address / Landmark</label>
                          <input
                            type="text"
                            value={addForm.street_address}
                            onChange={(e) => handleAddInputChange("street_address", e.target.value)}
                            placeholder="e.g. 123 Rizal Street"
                            className="w-full px-3.5 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer Buttons — Clean layout matching Miller Manager without redundant Cancel button */}
                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(true)}
                      disabled={submitting}
                      className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer disabled:opacity-50"
                    >
                      Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 bg-[#0B5D1E] hover:bg-[#094d19] text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        "Save Miller"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>,
          document.body
        )}

      {/* ── Toast Notification ───────────────────────────────────────────────── */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}
    </div>
  );
}
