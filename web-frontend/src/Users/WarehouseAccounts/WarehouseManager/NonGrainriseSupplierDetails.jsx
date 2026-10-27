import Toast from "../../../Components/Modals/Toast";
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Mail,
  Phone,
  User,
  Star,
  Pencil,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import Breadcrumbs from "../../../Components/Minor-Components/Breadcrumbs";
import SectionedTableCard from "../../../Components/Minor-Components/SectionedTableCard";
import useApi from "../../../Components/hooks/useApi";
import usePhilippineAddress from "../../../Components/hooks/usePhilippineAddress";
import InboundOrderDetailsModal from "../../../Components/Modals/WarehouseSupplier/InboundOrderDetailsModal";
import WarehouseReceivingHistoryDetailsModal from "../../../Components/Modals/WarehouseSupplier/WarehouseReceivingHistoryDetailsModal";

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

export default function NonGrainriseSupplierDetails() {
  const navigate = useNavigate();
  const { contactId } = useParams();
  const { request } = useApi();
  const address = usePhilippineAddress();

  const [supplier, setSupplier] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Tab State: "active" | "history"
  const [activeTab, setActiveTab] = useState("active");

  // Search & Pagination State
  const [activeSearch, setActiveSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;

  // Modals for Inbound / Receiving History
  const [selectedActiveOrder, setSelectedActiveOrder] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    business_name: "",
    contact_person: "",
    contact_number: "",
    email: "",
    street_address: "",
    status: "active",
  });
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [manualAddressText, setManualAddressText] = useState("");
  const [initialEditValues, setInitialEditValues] = useState(null);
  const [pendingPrefill, setPendingPrefill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const fetchSupplierDetails = useCallback(async () => {
    if (!contactId) return;
    try {
      setLoading(true);
      const res = await request(
        `/warehouse/suppliers/non-grainrise/${contactId}/`,
        { method: "GET" }
      );
      const data = res?.data ?? res;
      if (data && typeof data === "object") {
        setSupplier(data);
        setActiveOrders(Array.isArray(data.active_orders) ? data.active_orders : []);
        setPurchaseHistory(Array.isArray(data.purchase_history) ? data.purchase_history : []);
      }
    } catch (err) {
      console.error("Failed to load Non-Grainrise miller details:", err);
    } finally {
      setLoading(false);
    }
  }, [request, contactId]);

  useEffect(() => {
    fetchSupplierDetails();
  }, [fetchSupplierDetails]);

  // Ensure provinces are loaded when edit modal is opened
  useEffect(() => {
    if (showEditModal && (!address.provinceOptions || address.provinceOptions.length === 0) && !address.loading.provinces) {
      address.reloadProvinces?.();
    }
  }, [showEditModal, address.provinceOptions, address.loading.provinces, address.reloadProvinces]);

  // Open Edit Modal with prefilled supplier information
  const handleOpenEditModal = () => {
    if (!supplier) return;
    const parsed = parseAddressString(supplier.business_address);
    const initialData = {
      business_name: supplier.business_name || "",
      contact_person: supplier.contact_person || "",
      contact_number: supplier.contact_number || "",
      email: supplier.email || "",
      street_address: parsed.street || "",
      status: supplier.status || "active",
      province: parsed.province || "",
      municipality: parsed.municipality || "",
      barangay: parsed.barangay || "",
      postalCode: parsed.postalCode || "",
      rawAddress: supplier.business_address || "",
    };
    setInitialEditValues(initialData);
    setEditForm({
      business_name: initialData.business_name,
      contact_person: initialData.contact_person,
      contact_number: initialData.contact_number,
      email: initialData.email,
      street_address: initialData.street_address,
      status: initialData.status,
    });
    setManualAddressText(initialData.rawAddress);
    setUseManualAddress(false);
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
    if (!address.provinceOptions || address.provinceOptions.length === 0) {
      address.reloadProvinces?.();
    }
    setPendingPrefill(parsed);
    setShowClearConfirm(false);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setShowClearConfirm(false);
    setInitialEditValues(null);
    setPendingPrefill(null);
    setFormError("");
    setFieldErrors({});
    address.resetAddress();
  };

  const handleConfirmRestore = () => {
    if (!initialEditValues) {
      setShowClearConfirm(false);
      return;
    }
    setEditForm({
      business_name: initialEditValues.business_name,
      contact_person: initialEditValues.contact_person,
      contact_number: initialEditValues.contact_number,
      email: initialEditValues.email,
      street_address: initialEditValues.street_address,
      status: initialEditValues.status,
    });
    setManualAddressText(initialEditValues.rawAddress);
    setUseManualAddress(false);
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

  // Sequential prefill handler for cascading address dropdowns
  useEffect(() => {
    if (!showEditModal || !pendingPrefill || useManualAddress) return;

    const runPrefill = async () => {
      // 1. Match Province
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

      // 2. Match Municipality
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

      // 3. Match Barangay & Postal Code
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
    showEditModal,
    pendingPrefill,
    useManualAddress,
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

  const handleEditInputChange = (field, value) => {
    let cleanVal = value;
    if (field === "contact_person") {
      cleanVal = cleanVal.replace(/[^a-zA-Z\s]/g, "").slice(0, 50);
    } else if (field === "contact_number") {
      cleanVal = cleanVal.replace(/[^\d+]/g, "").slice(0, 13);
    } else if (field === "business_name") {
      cleanVal = cleanVal.slice(0, 100);
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

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setFormError("");

    const errors = {};
    const bName = editForm.business_name.trim();
    if (!bName) {
      errors.business_name = "Business / Branch Name is required.";
    }

    const cp = editForm.contact_person.trim();
    if (!cp) {
      errors.contact_person = "Contact Person is required.";
    } else if (!/^[a-zA-Z\s]+$/.test(cp)) {
      errors.contact_person = "Contact Person must contain letters and spaces only.";
    }

    const cn = editForm.contact_number.trim();
    if (!cn) {
      errors.contact_number = "Contact Number is required.";
    } else {
      const cleanPhone = cn.replace(/[\s-]/g, "");
      if (!/^(\+639\d{9}|639\d{9}|09\d{9})$/.test(cleanPhone)) {
        errors.contact_number = "Enter a valid Philippine number (09XXXXXXXXX or +639XXXXXXXXX).";
      }
    }

    if (editForm.email && editForm.email.trim()) {
      const emailTrim = editForm.email.trim();
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
        editForm.street_address?.trim(),
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
        business_name: bName,
        business_address: finalAddress,
        contact_person: cp,
        contact_number: cn.replace(/[\s-]/g, ""),
        email: editForm.email.trim() || null,
        status: editForm.status || "active",
      };

      const res = await request(`/warehouse/suppliers/non-grainrise/${contactId}/`, {
        method: "PUT",
        body: payload,
        throwOnError: true,
      });

      const updated = res?.data ?? res;
      setSupplier((prev) => ({
        ...prev,
        ...payload,
        business_address: finalAddress,
      }));
      handleCloseEditModal();
      showToast("Supplier information updated successfully!");
      fetchSupplierDetails();
    } catch (err) {
      console.error("Failed to update Non-Grainrise miller:", err);
      setFormError(err.message || "Failed to update supplier details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistoryDetails = async (row) => {
    setIsHistoryModalOpen(true);
    setSelectedHistoryDetail(null);
    setHistoryDetailLoading(true);
    try {
      const recId = row.receiving_id || row.id;
      const res = await request(
        `/warehouse/suppliers/non-grainrise/receiving-history/${recId}/`,
        { method: "GET", throwOnError: true }
      );
      const data = res?.data ?? res;
      if (data && typeof data === "object") {
        setSelectedHistoryDetail(data);
      }
    } catch (err) {
      console.warn("Failed to retrieve external receiving detail:", err);
      setSelectedHistoryDetail(row);
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedHistoryDetail(null);
  };

  // Filters for Active Orders
  const filteredActiveOrders = useMemo(() => {
    const q = activeSearch.trim().toLowerCase();
    if (!q) return activeOrders;
    return activeOrders.filter(
      (o) =>
        (o.batch_no || "").toLowerCase().includes(q) ||
        (o.product_name || "").toLowerCase().includes(q)
    );
  }, [activeOrders, activeSearch]);

  const totalActiveCount = filteredActiveOrders.length;
  const totalActivePages = Math.max(1, Math.ceil(totalActiveCount / itemsPerPage));
  const paginatedActiveOrders = useMemo(() => {
    const start = (activePage - 1) * itemsPerPage;
    return filteredActiveOrders.slice(start, start + itemsPerPage);
  }, [filteredActiveOrders, activePage]);

  // Filters for Purchase History
  const filteredPurchaseHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return purchaseHistory;
    return purchaseHistory.filter(
      (h) =>
        (h.receiving_reference_no || "").toLowerCase().includes(q) ||
        (h.product_name || "").toLowerCase().includes(q)
    );
  }, [purchaseHistory, historySearch]);

  const totalHistoryCount = filteredPurchaseHistory.length;
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryCount / itemsPerPage));
  const paginatedPurchaseHistory = useMemo(() => {
    const start = (historyPage - 1) * itemsPerPage;
    return filteredPurchaseHistory.slice(start, start + itemsPerPage);
  }, [filteredPurchaseHistory, historyPage]);

  const activeColumns = useMemo(
    () => [
      {
        key: "batch_no",
        label: "Batch Number",
        width: "20%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.batch_no || "Not yet available"}
          </span>
        ),
      },
      {
        key: "product_name",
        label: "Product",
        width: "24%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.product_name || "—"}
          </span>
        ),
      },
      {
        key: "unit_cost",
        label: "Unit Cost",
        width: "15%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.unit_cost != null ? `₱${Number(row.unit_cost).toFixed(2)} / kg` : "Not yet available"}
          </span>
        ),
      },
      {
        key: "ordered_quantity",
        label: "Ordered Quantity",
        width: "15%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.ordered_quantity != null ? `${Number(row.ordered_quantity).toLocaleString()} kg` : "—"}
          </span>
        ),
      },
      {
        key: "total_price",
        label: "Total Price",
        width: "14%",
        render: (row) => (
          <span className="text-[13px] font-bold text-emerald-800">
            {row.total_price != null ? `₱${Number(row.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Not yet available"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    ],
    []
  );

  const historyColumns = useMemo(
    () => [
      {
        key: "receiving_reference_no",
        label: "Receiving Reference No.",
        width: "22%",
        render: (row) => (
          <span className="text-[13px] font-semibold text-slate-800">
            {row.receiving_reference_no || "—"}
          </span>
        ),
      },
      {
        key: "product_name",
        label: "Product",
        width: "22%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.product_name || "—"}
          </span>
        ),
      },
      {
        key: "received_date",
        label: "Received Date",
        width: "16%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.received_date || "—"}
          </span>
        ),
      },
      {
        key: "total_received",
        label: "Total Received",
        width: "14%",
        render: (row) => (
          <span className="text-[13px] font-medium text-slate-700">
            {row.total_received != null ? `${Number(row.total_received).toLocaleString()} kg` : "—"}
          </span>
        ),
      },
      {
        key: "total_price",
        label: "Total Payable",
        width: "14%",
        render: (row) => (
          <span className="text-[13px] font-bold text-emerald-800">
            {row.total_price != null ? `₱${Number(row.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
          </span>
        ),
      },
      {
        key: "action",
        label: "Action",
        width: "12%",
        headerClassName: "text-center",
        cellClassName: "text-center",
      },
    ],
    []
  );

  const businessName = supplier?.business_name || "External Miller Details";
  const addressDisplay = supplier?.business_address || "No address specified";
  const contactPerson = supplier?.contact_person || "—";
  const phone = supplier?.contact_number || "—";
  const email = supplier?.email || "";
  const avgRating = supplier?.avg_rating != null ? Number(supplier.avg_rating) : null;

  return (
    <div className="space-y-6">
      {/* ── Breadcrumbs ──────────────────────────────────────────────────────── */}
      <Breadcrumbs
        items={[
          { label: "Management" },
          { label: "Supplier Management", path: "/warehouse-manager/suppliers" },
          { label: "Miller Details" },
        ]}
      />

      {/* ── Back Navigation ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => navigate("/warehouse-manager/suppliers")}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-emerald-700 transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to Supplier Management
      </button>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-[clamp(2rem,3vw,2.5rem)] font-bold tracking-[-0.03em] text-slate-900">
          Miller Details
        </h2>
        <p className="text-sm text-slate-500">
          View external Non-GRAINRISE supplier profile, active procurement requests, and receiving history.
        </p>
      </div>

      {/* ── Green Hero Strip ─────────────────────────────────────────────────── */}
      <div className="bg-[#0B5D1E] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-2xl font-extrabold tracking-tight">
              {businessName}
            </h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
              Non-GRAINRISE Miller
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/90 font-medium">
            <span className="flex items-center gap-1.5" title="Contact Person">
              <User size={14} className="text-amber-400 shrink-0" />
              <span>Contact: {contactPerson}</span>
            </span>

            {phone && phone !== "—" && (
              <span className="flex items-center gap-1.5" title="Contact Number">
                <Phone size={14} className="text-amber-400 shrink-0" />
                <span>{phone}</span>
              </span>
            )}

            <span className="flex items-center gap-1.5" title="Official Email">
              <Mail size={14} className="text-amber-400 shrink-0" />
              <span>{email || "Not provided"}</span>
            </span>

            <span className="flex items-center gap-1.5" title="Average Rating">
              <Star size={14} className="text-amber-400 shrink-0 fill-amber-400" />
              <span>
                {avgRating != null ? `${avgRating.toFixed(1)} / 5.0 (${supplier?.rating_count || 0})` : "No ratings yet"}
              </span>
            </span>

            <span className="flex items-center gap-1.5 w-full sm:w-auto" title="Address">
              <MapPin size={14} className="text-amber-400 shrink-0" />
              <span className="truncate max-w-xl">{addressDisplay}</span>
            </span>
          </div>
        </div>

        {/* Action Button: Edit Info (NO Message Them button) */}
        <button
          type="button"
          onClick={handleOpenEditModal}
          className="flex items-center justify-center gap-2 bg-[#D6A62D] hover:bg-[#b88c22] text-slate-900 text-xs font-bold px-5 py-2.5 rounded-full shadow-sm transition cursor-pointer self-start md:self-auto whitespace-nowrap"
        >
          <Pencil size={15} /> Edit Info
        </button>
      </div>

      {/* ── Segmented Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`pb-3 px-5 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "active"
              ? "border-[#0B5D1E] text-[#0B5D1E]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Active Purchases ({activeOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`pb-3 px-5 text-sm font-semibold transition border-b-2 cursor-pointer ${
            activeTab === "history"
              ? "border-[#0B5D1E] text-[#0B5D1E]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Purchase History ({purchaseHistory.length})
        </button>
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────────── */}
      {activeTab === "active" ? (
        <div className="space-y-4">
          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by batch number or product name..."
                value={activeSearch}
                onChange={(e) => {
                  setActiveSearch(e.target.value);
                  setActivePage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              {activeSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveSearch("");
                    setActivePage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Active Purchases Table */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading active purchases...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={activeColumns}
              sections={[{ rows: paginatedActiveOrders }]}
              currentPage={activePage}
              totalPages={totalActivePages}
              onPageChange={setActivePage}
              onViewDetails={setSelectedActiveOrder}
              viewDetailsLabel="View Details"
              footerLabel={
                totalActiveCount === 0
                  ? "Showing 0 orders"
                  : `Showing ${(activePage - 1) * itemsPerPage + 1}-${Math.min(
                      activePage * itemsPerPage,
                      totalActiveCount
                    )} of ${totalActiveCount} orders`
              }
              emptyStateTitle="No active purchases"
              emptyStateDescription={
                activeSearch
                  ? "No active purchase orders match your search criteria."
                  : "No active inbound purchase orders from this external miller."
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* History Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search by reference no. or product..."
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearch("");
                    setHistoryPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* History Table */}
          {loading ? (
            <div className="w-full rounded-[14px] border border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="flex justify-center items-center gap-2 text-slate-500 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-700" />
                <span>Loading purchase history...</span>
              </div>
            </div>
          ) : (
            <SectionedTableCard
              columns={historyColumns}
              sections={[{ rows: paginatedPurchaseHistory }]}
              currentPage={historyPage}
              totalPages={totalHistoryPages}
              onPageChange={setHistoryPage}
              onViewDetails={handleOpenHistoryDetails}
              viewDetailsLabel="View Details"
              footerLabel={
                totalHistoryCount === 0
                  ? "Showing 0 records"
                  : `Showing ${(historyPage - 1) * itemsPerPage + 1}-${Math.min(
                      historyPage * itemsPerPage,
                      totalHistoryCount
                    )} of ${totalHistoryCount} records`
              }
              emptyStateTitle="No purchase history"
              emptyStateDescription={
                historySearch
                  ? "No receiving records match your search criteria."
                  : "No procurement receiving history records from this external miller."
              }
            />
          )}
        </div>
      )}

      {/* ── Active Order Details Modal ───────────────────────────────────────── */}
      {selectedActiveOrder && (
        <InboundOrderDetailsModal
          isOpen={Boolean(selectedActiveOrder)}
          onClose={() => setSelectedActiveOrder(null)}
          order={selectedActiveOrder}
          isGrainrise={false}
        />
      )}

      {/* ── Receiving History Details Modal ──────────────────────────────────── */}
      {isHistoryModalOpen && (
        <WarehouseReceivingHistoryDetailsModal
          isOpen={isHistoryModalOpen}
          onClose={handleCloseHistoryModal}
          detail={selectedHistoryDetail}
          isLoading={historyDetailLoading}
        />
      )}

      {/* ── Edit Supplier Information Modal ──────────────────────────────────── */}
      {showEditModal &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            {showClearConfirm ? (
              <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Restore Original Values</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Are you sure you want to discard your edits and restore the original supplier information?
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition cursor-pointer"
                  >
                    Keep Editing
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition cursor-pointer shadow-xs"
                  >
                    Confirm Restore
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-[#0B5D1E]">
                      <Pencil size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Edit Non-GRAINRISE Miller Info
                      </h3>
                      <p className="text-xs text-slate-500">
                        Update external contact details and address information.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    disabled={submitting}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span>{formError}</span>
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
                    value={editForm.business_name}
                    onChange={(e) => handleEditInputChange("business_name", e.target.value)}
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
                      value={editForm.contact_person}
                      onChange={(e) => handleEditInputChange("contact_person", e.target.value)}
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
                      value={editForm.contact_number}
                      onChange={(e) => handleEditInputChange("contact_number", e.target.value)}
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
                      value={editForm.email}
                      onChange={(e) => handleEditInputChange("email", e.target.value)}
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
                      value={editForm.status}
                      onChange={(e) => handleEditInputChange("status", e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Address Section */}
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
                          value={editForm.street_address}
                          onChange={(e) => handleEditInputChange("street_address", e.target.value)}
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
                    Clear / Restore
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
                      "Save Changes"
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

