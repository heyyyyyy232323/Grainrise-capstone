import Toast from "../../../Components/Modals/Toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  ChevronDown,
  Star,
  X,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";

const statusStyleMap = {
  active: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  inactive: "bg-slate-100 text-slate-700 border border-slate-200",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const cleanStr = String(dateStr).split("T")[0].split(" ")[0].trim();
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const monthNames = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
      ];
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${monthNames[monthIndex]} ${day}, ${year}`;
      }
    }
  } catch {}
  return String(dateStr);
};

const parseAddressString = (fullAddress = "") => {
  if (!fullAddress) {
    return { street: "", barangay: "", municipality: "", province: "", postalCode: "" };
  }
  const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 5) {
    const postalCode = parts[parts.length - 1];
    const province = parts[parts.length - 2];
    const municipality = parts[parts.length - 3];
    const barangay = parts[parts.length - 4];
    const street = parts.slice(0, parts.length - 4).join(", ");
    return { street, barangay, municipality, province, postalCode };
  } else if (parts.length === 4) {
    const province = parts[3];
    const municipality = parts[2];
    const barangay = parts[1];
    const street = parts[0];
    return { street, barangay, municipality, province, postalCode: "" };
  }
  return { street: fullAddress, barangay: "", municipality: "", province: "", postalCode: "" };
};

const getSupplierDisplayName = (s) => {
  if (!s) return "Unknown Supplier";
  return s.supplier_farm || s.organization || s.contact_person || "Unknown Supplier";
};

// Modal Detail Row Sub-Component matching MillerOrderApproval.jsx
function ModalDetailRow({ label, value, isBadge = false, badgeStyle = "", children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-slate-500 font-medium shrink-0">{label}:</span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : isBadge ? (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${badgeStyle}`}
        >
          {value}
        </span>
      ) : (
        <span className="font-semibold text-slate-800 text-right break-words max-w-[60%]">
          {value}
        </span>
      )}
    </div>
  );
}

const INITIAL_EDIT_FORM = {
  supplier_farm: "",
  organization: "",
  contact_person: "",
  contact_number: "",
  email: "",
  street_address: "",
  status: "active",
};

const MillerSuppliers = () => {
  const { request } = useApi();
  const address = usePhilippineAddress();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Edit Form State
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);
  const [initialEditValues, setInitialEditValues] = useState(null);
  const [pendingPrefill, setPendingPrefill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Fetch suppliers strictly scoped to procurement employee's branch
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await request("/miller-employees/procurement/suppliers/", {
        method: "GET",
      });
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setSuppliers(list);
      }
    } catch (err) {
      console.error("Failed to load procurement suppliers:", err);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Ensure provinces are loaded when entering edit mode
  useEffect(() => {
    if (isEditMode && (!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
      address.reloadProvinces?.();
    }
  }, [isEditMode, address.provinceOptions, address.loading.provinces, address.reloadProvinces]);

  // Sequential prefill handler for Philippine address dropdowns
  useEffect(() => {
    if (!isEditMode || !pendingPrefill) return;

    const runPrefill = async () => {
      // 1. Province
      if (pendingPrefill.province && address.province !== pendingPrefill.province) {
        if (!address.provinceOptions || address.provinceOptions.length === 0) return;
        const match = address.provinceOptions.find(
          (p) => p.toLowerCase() === pendingPrefill.province.toLowerCase()
        );
        if (match) {
          await address.selectProvince(match);
        } else {
          setPendingPrefill(null);
        }
        return;
      }

      // 2. Municipality
      if (
        pendingPrefill.municipality &&
        address.province &&
        address.municipality !== pendingPrefill.municipality
      ) {
        if (!address.municipalityOptions || address.municipalityOptions.length === 0) return;
        const match = address.municipalityOptions.find(
          (m) => m.toLowerCase() === pendingPrefill.municipality.toLowerCase()
        );
        if (match) {
          await address.selectMunicipality(match);
        } else {
          setPendingPrefill(null);
        }
        return;
      }

      // 3. Barangay & Postal Code
      if (
        pendingPrefill.barangay &&
        address.municipality &&
        address.barangay !== pendingPrefill.barangay
      ) {
        if (!address.barangayOptions || address.barangayOptions.length === 0) return;
        const match = address.barangayOptions.find(
          (b) => b.toLowerCase() === pendingPrefill.barangay.toLowerCase()
        );
        if (match) {
          address.selectBarangay(match);
        }
        if (pendingPrefill.postalCode) {
          address.updatePostalCode(pendingPrefill.postalCode);
        }
        setPendingPrefill(null);
        return;
      }

      if (
        address.province &&
        address.municipality &&
        !address.loading.municipalities &&
        !address.loading.barangays
      ) {
        if (pendingPrefill.postalCode && !address.postalCode) {
          address.updatePostalCode(pendingPrefill.postalCode);
        }
        setPendingPrefill(null);
      }
    };

    runPrefill();
  }, [
    isEditMode,
    pendingPrefill,
    address.province,
    address.municipality,
    address.barangay,
    address.provinceOptions,
    address.municipalityOptions,
    address.barangayOptions,
    address.loading.municipalities,
    address.loading.barangays,
    address.postalCode,
  ]);

  // Open Details Modal (View mode)
  const handleOpenDetails = async (row) => {
    setSelectedSupplier(row);
    setSelectedSupplierDetail(row);
    setIsEditMode(false);
    setInitialEditValues(null);
    setShowClearConfirm(false);
    setIsModalOpen(true);
    setDetailLoading(true);

    try {
      const supplierId = row.farmer_contact_id || row.id;
      const res = await request(`/miller-employees/procurement/suppliers/${supplierId}/`, {
        method: "GET",
      });
      const data = res?.data || res;
      if (data) {
        setSelectedSupplierDetail(data);
      }
    } catch (err) {
      console.error("Failed to load supplier detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Close Modal: if in edit mode, returns to View Details without stacking; otherwise closes modal
  const handleCloseModal = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setShowClearConfirm(false);
      return;
    }
    setIsModalOpen(false);
    setSelectedSupplier(null);
    setSelectedSupplierDetail(null);
    setIsEditMode(false);
    setInitialEditValues(null);
    setShowClearConfirm(false);
  };

  // Start Edit Mode (replaces View Details in-place)
  const handleStartEdit = () => {
    const target = selectedSupplierDetail || selectedSupplier;
    if (!target) return;

    const parsed = parseAddressString(target.address);
    const initialData = {
      supplier_farm: target.supplier_farm || "",
      organization: target.organization || "",
      contact_person: target.contact_person || "",
      contact_number: target.contact_number || "",
      email: target.email || "",
      street_address: parsed.street || "",
      status: target.status || "active",
      province: parsed.province || "",
      municipality: parsed.municipality || "",
      barangay: parsed.barangay || "",
      postalCode: parsed.postalCode || "",
    };
    setInitialEditValues(initialData);
    setEditForm({
      supplier_farm: initialData.supplier_farm,
      organization: initialData.organization,
      contact_person: initialData.contact_person,
      contact_number: initialData.contact_number,
      email: initialData.email,
      street_address: initialData.street_address,
      status: initialData.status,
    });
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    if (!address.provinceOptions || address.provinceOptions.length === 0) {
      address.reloadProvinces?.();
    }
    setPendingPrefill(parsed);
    setShowClearConfirm(false);
    setIsEditMode(true);
  };

  // Clear / Restore action in Edit Mode
  const handleConfirmRestore = () => {
    if (!initialEditValues) {
      setShowClearConfirm(false);
      return;
    }
    setEditForm({
      supplier_farm: initialEditValues.supplier_farm,
      organization: initialEditValues.organization,
      contact_person: initialEditValues.contact_person,
      contact_number: initialEditValues.contact_number,
      email: initialEditValues.email,
      street_address: initialEditValues.street_address,
      status: initialEditValues.status,
    });
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    if (!address.provinceOptions || address.provinceOptions.length === 0) {
      address.reloadProvinces?.();
    }
    setPendingPrefill({
      province: initialEditValues.province,
      municipality: initialEditValues.municipality,
      barangay: initialEditValues.barangay,
      postalCode: initialEditValues.postalCode,
      street: initialEditValues.street_address,
    });
    setShowClearConfirm(false);
  };

  const handleEditInputChange = (field, value) => {
    let cleanVal = value;
    if (field === "contact_person") {
      cleanVal = cleanVal.replace(/[^a-zA-Z\s]/g, "").slice(0, 20);
    } else if (field === "contact_number") {
      cleanVal = cleanVal.replace(/\D/g, "").slice(0, 12);
    } else if (field === "supplier_farm" || field === "organization") {
      cleanVal = cleanVal.slice(0, 20);
    }

    setEditForm((prev) => ({ ...prev, [field]: cleanVal }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Submit Edit Supplier Form
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = {};
    if (editForm.supplier_farm && editForm.supplier_farm.trim().length > 20) {
      errors.supplier_farm = "Supplier / Farm Name cannot exceed 20 characters.";
    }

    if (editForm.organization && editForm.organization.trim().length > 20) {
      errors.organization = "Organization / Co-op cannot exceed 20 characters.";
    }

    const cp = editForm.contact_person.trim();
    if (!cp) {
      errors.contact_person = "Contact person is required.";
    } else if (cp.length > 20) {
      errors.contact_person = "Contact person cannot exceed 20 characters.";
    } else if (!/^[a-zA-Z\s]+$/.test(cp)) {
      errors.contact_person = "Contact person must contain letters and spaces only.";
    }

    const cn = editForm.contact_number.trim();
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
      editForm.street_address?.trim(),
      address.barangay?.trim(),
      address.municipality?.trim(),
      address.province?.trim(),
      address.postalCode?.trim(),
    ].filter(Boolean);

    let combinedAddress = addressParts.join(", ");
    if (!combinedAddress) {
      combinedAddress = (selectedSupplierDetail || selectedSupplier)?.address || "";
    }
    if (!combinedAddress) {
      errors.address = "Address is required.";
    }

    // Branch duplicate validation: prevent duplicate Farm Name, Organization, or Contact Person within branch
    const currentId = selectedSupplier?.farmer_contact_id || selectedSupplier?.id;
    const farmTrimmed = (editForm.supplier_farm || "").trim().toLowerCase();
    const orgTrimmed = (editForm.organization || "").trim().toLowerCase();
    const cpTrimmed = (editForm.contact_person || "").trim().toLowerCase();

    const dup = suppliers.find((s) => {
      const sId = s.farmer_contact_id || s.id;
      if (sId === currentId) return false;
      if (farmTrimmed && (s.supplier_farm || "").trim().toLowerCase() === farmTrimmed) return true;
      if (orgTrimmed && (s.organization || "").trim().toLowerCase() === orgTrimmed) return true;
      if (cpTrimmed && (s.contact_person || "").trim().toLowerCase() === cpTrimmed) return true;
      return false;
    });

    if (dup) {
      if (farmTrimmed && (dup.supplier_farm || "").trim().toLowerCase() === farmTrimmed) {
        errors.supplier_farm = "A supplier with this Farm Name already exists in this branch.";
      } else if (orgTrimmed && (dup.organization || "").trim().toLowerCase() === orgTrimmed) {
        errors.organization = "A supplier with this Organization / Co-op already exists in this branch.";
      } else if (cpTrimmed && (dup.contact_person || "").trim().toLowerCase() === cpTrimmed) {
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
        supplier_farm: editForm.supplier_farm.trim() || null,
        organization: editForm.organization.trim() || null,
        contact_person: editForm.contact_person.trim(),
        contact_number: editForm.contact_number.trim(),
        email: editForm.email.trim() || null,
        address: combinedAddress,
        status: editForm.status || "active",
      };

      const res = await request(`/miller-employees/procurement/suppliers/${currentId}/`, {
        method: "PUT",
        body: payload,
        throwOnError: true,
      });

      const updated = res?.data || res;
      setSelectedSupplierDetail(updated);
      setSuppliers((prev) =>
        prev.map((s) => ((s.farmer_contact_id || s.id) === currentId ? { ...s, ...updated } : s))
      );
      setIsEditMode(false);
      showToast("Supplier details updated successfully!");
    } catch (err) {
      console.error("Failed to update supplier:", err);
      const errMsg = err.message || "Failed to update supplier. Please try again.";
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

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    let list = [...suppliers];

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter(
        (item) => (item.status || "active").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Functional case-insensitive search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => {
        const farmMatch = (item.supplier_farm || "").toLowerCase().includes(q);
        const orgMatch = (item.organization || "").toLowerCase().includes(q);
        const cpMatch = (item.contact_person || "").toLowerCase().includes(q);
        const phoneMatch = (item.contact_number || "").toLowerCase().includes(q);
        const emailMatch = (item.email || "").toLowerCase().includes(q);
        const addressMatch = (item.address || "").toLowerCase().includes(q);
        return farmMatch || orgMatch || cpMatch || phoneMatch || emailMatch || addressMatch;
      });
    }

    // Sort options
    if (sortBy === "name_asc") {
      list.sort((a, b) => getSupplierDisplayName(a).localeCompare(getSupplierDisplayName(b)));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => getSupplierDisplayName(b).localeCompare(getSupplierDisplayName(a)));
    } else if (sortBy === "delivery_latest") {
      list.sort((a, b) => {
        const timeA = a.latest_delivery ? new Date(a.latest_delivery).getTime() : 0;
        const timeB = b.latest_delivery ? new Date(b.latest_delivery).getTime() : 0;
        return timeB - timeA;
      });
    } else if (sortBy === "delivery_oldest") {
      list.sort((a, b) => {
        const timeA = a.latest_delivery ? new Date(a.latest_delivery).getTime() : Infinity;
        const timeB = b.latest_delivery ? new Date(b.latest_delivery).getTime() : Infinity;
        return timeA - timeB;
      });
    } else if (sortBy === "rating_highest") {
      list.sort((a, b) => {
        const rA = a.avg_rating != null ? Number(a.avg_rating) : -1;
        const rB = b.avg_rating != null ? Number(b.avg_rating) : -1;
        return rB - rA;
      });
    } else if (sortBy === "rating_lowest") {
      list.sort((a, b) => {
        const rA = a.avg_rating != null ? Number(a.avg_rating) : Infinity;
        const rB = b.avg_rating != null ? Number(b.avg_rating) : Infinity;
        return rA - rB;
      });
    }

    return list;
  }, [suppliers, statusFilter, search, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy]);

  const itemsPerPage = 10;
  const totalCount = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);
  const tableSections = useMemo(() => [{ rows: paginated }], [paginated]);

  // Form change and validity detection for Edit Supplier
  const hasFormChanged = useMemo(() => {
    if (!initialEditValues) return false;
    return (
      (editForm.supplier_farm || "").trim() !== (initialEditValues.supplier_farm || "").trim() ||
      (editForm.organization || "").trim() !== (initialEditValues.organization || "").trim() ||
      (editForm.contact_person || "").trim() !== (initialEditValues.contact_person || "").trim() ||
      (editForm.contact_number || "").trim() !== (initialEditValues.contact_number || "").trim() ||
      (editForm.email || "").trim() !== (initialEditValues.email || "").trim() ||
      (editForm.street_address || "").trim() !== (initialEditValues.street_address || "").trim() ||
      (editForm.status || "active").toLowerCase() !== (initialEditValues.status || "active").toLowerCase() ||
      (address.province || "").trim().toLowerCase() !== (initialEditValues.province || "").trim().toLowerCase() ||
      (address.municipality || "").trim().toLowerCase() !== (initialEditValues.municipality || "").trim().toLowerCase() ||
      (address.barangay || "").trim().toLowerCase() !== (initialEditValues.barangay || "").trim().toLowerCase() ||
      (address.postalCode || "").trim() !== (initialEditValues.postalCode || "").trim()
    );
  }, [editForm, initialEditValues, address.province, address.municipality, address.barangay, address.postalCode]);

  const isFormValid = useMemo(() => {
    const cp = (editForm.contact_person || "").trim();
    const cn = (editForm.contact_number || "").trim();
    if (!cp || cp.length > 20 || !/^[a-zA-Z\s]+$/.test(cp)) return false;
    if (!cn || !/^(09\d{9}|639\d{9})$/.test(cn)) return false;
    if (!address.province || !address.municipality) return false;
    if (editForm.supplier_farm && editForm.supplier_farm.trim().length > 20) return false;
    if (editForm.organization && editForm.organization.trim().length > 20) return false;
    return true;
  }, [editForm, address.province, address.municipality]);

  const canSave = hasFormChanged && isFormValid && !submitting;

  // Table Columns (no Product Type column, no address under supplier)
  const columns = useMemo(
    () => [
      {
        key: "supplier",
        label: "Supplier",
        width: "32%",
        render: (row) => {
          const primary = getSupplierDisplayName(row);
          const sub = row.supplier_farm
            ? (row.organization || row.contact_person)
            : (row.organization ? row.contact_person : null);

          return (
            <div>
              <div className="text-[13px] font-medium text-slate-700">{primary}</div>
              {sub && (
                <div className="text-xs text-slate-400 truncate max-w-sm" title={sub}>
                  {sub}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "lastDelivery",
        label: "Last Delivery",
        width: "20%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.latest_delivery_formatted || (row.latest_delivery ? formatDate(row.latest_delivery) : "—")}
          </span>
        ),
      },
      {
        key: "rating",
        label: "Avg Rating",
        width: "18%",
        render: (row) => {
          const avg = row.avg_rating ?? row.performance_rating;
          const count = row.rating_count ?? 0;
          if (avg != null && count > 0) {
            return (
              <div className="flex items-center gap-1.5">
                <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                <span className="text-[13px] font-medium text-slate-700">
                  {Number(avg).toFixed(1)} <span className="text-xs text-slate-400">({count})</span>
                </span>
              </div>
            );
          }
          return <span className="text-[13px] font-medium text-slate-400">N/A</span>;
        },
      },
      {
        key: "status",
        label: "Status",
        width: "15%",
        render: (row) => {
          const st = (row.status || "active").toLowerCase();
          const badgeStyle = statusStyleMap[st] || "bg-slate-100 text-slate-700 border border-slate-200";
          return (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badgeStyle}`}>
              {row.status || "Active"}
            </span>
          );
        },
      },
      {
        key: "action",
        label: "Action",
        width: "15%",
        cellClassName: "text-center",
      },
    ],
    []
  );

  const activeSupplierData = selectedSupplierDetail || selectedSupplier;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Master Data", path: "/miller-procurement/suppliers" },
          { label: "Suppliers" },
        ]}
      />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Supplier Directory</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse and evaluate registered suppliers for your branch procurement operations.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1 max-w-2xl">
          {/* Functional Search */}
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search supplier, organization, contact person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>

            {/* Sort By Filter */}
            <div className="relative flex-1 sm:flex-none">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none border border-gray-200 bg-white pl-3 pr-8 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 w-full transition-colors cursor-pointer h-[38px] focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Sort By</option>
                <option value="name_asc">Supplier (A–Z)</option>
                <option value="name_desc">Supplier (Z–A)</option>
                <option value="delivery_latest">Latest Delivery</option>
                <option value="delivery_oldest">Oldest Delivery</option>
                <option value="rating_highest">Highest Rating</option>
                <option value="rating_lowest">Lowest Rating</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Total Count Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 h-[38px] self-start sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          <span>{totalCount} suppliers</span>
        </div>
      </div>

      {/* Table Card */}
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
          onViewDetails={handleOpenDetails}
          viewDetailsLabel="View Details"
          footerLabel={
            totalCount === 0
              ? "Showing 0 suppliers"
              : `Showing ${startIndex + 1}-${Math.min(startIndex + itemsPerPage, totalCount)} of ${totalCount} suppliers`
          }
          emptyStateTitle="No suppliers found"
          emptyStateDescription="No registered suppliers matched your filter criteria."
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <Toast
          isOpen
          type="success"
          message={toastMsg}
          duration={3000}
          onClose={() => setToastMsg("")}
        />
      )}

      {/* ── View / Edit Details Modal (Matching MillerOrderApproval.jsx) ── */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            {showClearConfirm ? (
              /* Clear Form / Restore Confirmation Modal (temporarily replaces modal card) */
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Restore Original Values</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Are you sure you want to discard your changes and restore original values?
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
                    onClick={handleConfirmRestore}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-lg transition cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="relative w-full max-w-md sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {getSupplierDisplayName(activeSupplierData)}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isEditMode ? "Edit Supplier Details" : "Supplier Information & Performance"}
                  </p>
                </div>

                {/* X Button: Only Exit Control */}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  aria-label="Close"
                  title={isEditMode ? "Back to View Details" : "Close"}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-75px)] space-y-4">
                {detailLoading && !activeSupplierData ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Loading supplier details...</p>
                  </div>
                ) : isEditMode ? (
                  /* ── EDIT MODE (Single-column layout, live counters, Clear confirmation) ── */
                  <form onSubmit={handleSaveEdit} className="space-y-3.5">
                    {formError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Supplier / Farm Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">
                          Supplier / Farm Name
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {(editForm.supplier_farm || "").length}/20
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="e.g. Green Valley Farm"
                        value={editForm.supplier_farm}
                        onChange={(e) => handleEditInputChange("supplier_farm", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.supplier_farm
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.supplier_farm && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                          {fieldErrors.supplier_farm}
                        </p>
                      )}
                    </div>

                    {/* Organization / Co-op */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">
                          Organization / Co-op
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {(editForm.organization || "").length}/20
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={20}
                        placeholder="e.g. Farmers Association"
                        value={editForm.organization}
                        onChange={(e) => handleEditInputChange("organization", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.organization
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.organization && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                          {fieldErrors.organization}
                        </p>
                      )}
                    </div>

                    {/* Contact Person */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">
                          Contact Person <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {(editForm.contact_person || "").length}/20
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={20}
                        required
                        placeholder="e.g. Juan Dela Cruz"
                        value={editForm.contact_person}
                        onChange={(e) => handleEditInputChange("contact_person", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.contact_person
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.contact_person && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                          {fieldErrors.contact_person}
                        </p>
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
                        value={editForm.contact_number}
                        onChange={(e) => handleEditInputChange("contact_number", e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-sm outline-none transition ${
                          fieldErrors.contact_number
                            ? "border-rose-400 focus:ring-1 focus:ring-rose-500 bg-rose-50/20"
                            : "border-gray-200 focus:ring-1 focus:ring-emerald-600"
                        }`}
                      />
                      {fieldErrors.contact_number && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                          {fieldErrors.contact_number}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Email Address <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. supplier@example.com"
                        value={editForm.email}
                        onChange={(e) => handleEditInputChange("email", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Status
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(e) => handleEditInputChange("status", e.target.value)}
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
                          onChange={async (e) => {
                            setFieldErrors((prev) => {
                              const n = { ...prev };
                              delete n.province;
                              delete n.municipality;
                              return n;
                            });
                            await address.selectProvince(e.target.value);
                          }}
                          className={`w-full appearance-none pl-3 pr-8 py-2 border rounded-xl text-sm bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer ${
                            fieldErrors.province
                              ? "border-rose-400 focus:ring-rose-500 bg-rose-50/20"
                              : "border-gray-200"
                          }`}
                        >
                          <option value="">
                            {address.loading.provinces ? "Loading Provinces..." : "Select Province"}
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
                    </div>

                    {/* City / Municipality */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        City / Municipality <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={address.municipality}
                          onChange={async (e) => {
                            setFieldErrors((prev) => {
                              const n = { ...prev };
                              delete n.municipality;
                              return n;
                            });
                            await address.selectMunicipality(e.target.value);
                          }}
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
                    </div>

                    {/* Barangay */}
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Barangay
                      </label>
                      <div className="relative">
                        <select
                          value={address.barangay}
                          onChange={(e) => address.selectBarangay(e.target.value)}
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
                        value={editForm.street_address}
                        onChange={(e) => handleEditInputChange("street_address", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-emerald-600 outline-none"
                      />
                      {fieldErrors.address && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.address}</p>
                      )}
                    </div>

                    {/* Modal Footer Buttons */}
                    <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        disabled={!hasFormChanged || submitting}
                        onClick={() => setShowClearConfirm(true)}
                        className="flex-1 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={!canSave}
                        className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-[#0B5D1E] hover:bg-[#084b18] rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {submitting ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* ── VIEW MODE (Matching MillerOrderApproval.jsx) ── */
                  <>
                    {/* ── SECTION 1 — SUPPLIER INFO ─────────────────────────── */}
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                        Supplier Info
                      </div>

                      <ModalDetailRow
                        label="Farm Name"
                        value={activeSupplierData?.supplier_farm || "—"}
                      />

                      <ModalDetailRow
                        label="Organization"
                        value={activeSupplierData?.organization || "Independent"}
                      />

                      <ModalDetailRow
                        label="Contact Person"
                        value={activeSupplierData?.contact_person || "—"}
                      />

                      <ModalDetailRow
                        label="Contact Number"
                        value={activeSupplierData?.contact_number || "—"}
                      />

                      <ModalDetailRow
                        label="Email"
                        value={activeSupplierData?.email || "—"}
                      />

                      <ModalDetailRow
                        label="Status"
                        value={activeSupplierData?.status || "Active"}
                        isBadge={true}
                        badgeStyle={statusStyleMap[(activeSupplierData?.status || "active").toLowerCase()] || "bg-gray-100 text-gray-700"}
                      />

                      <ModalDetailRow
                        label="Address"
                        value={activeSupplierData?.address || "—"}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 pt-2" />

                    {/* ── SECTION 2 — DELIVERY & RATINGS ─────────────────────── */}
                    <div className="space-y-2">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                        Delivery & Ratings
                      </div>

                      {activeSupplierData?.deliveries_and_ratings &&
                      activeSupplierData.deliveries_and_ratings.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-2">Receiving Ref No.</th>
                                <th className="px-3 py-2">Received Date</th>
                                <th className="px-3 py-2 text-center">Rating</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {activeSupplierData.deliveries_and_ratings.map((dr, idx) => (
                                <tr key={dr.receiving_id || idx} className="hover:bg-slate-50/50">
                                  <td className="px-3 py-2 font-medium text-slate-800">
                                    {dr.receiving_reference_no || `REC-${dr.receiving_id}`}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {dr.received_date || formatDate(dr.received_at)}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {dr.rating != null ? (
                                      <div className="inline-flex items-center justify-center gap-1.5 text-xs font-normal text-slate-700">
                                        <Star size={14} className="fill-amber-400 text-amber-400 shrink-0" />
                                        <span>{Number(dr.rating).toFixed(1)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-normal">Not Rated</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                          No delivery or performance ratings recorded yet.
                        </div>
                      )}
                    </div>

                    {/* ── FOOTER ACTIONS (Edit Details) ───────────────────────── */}
                    <div className="border-t border-slate-100 pt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={14} /> Edit Details
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default MillerSuppliers;
